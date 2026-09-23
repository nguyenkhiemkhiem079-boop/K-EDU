/**
 * K-EDU V-ACT Exam Generator Engine
 * Generates multi-section V-ACT exams from profiles (e.g. Mini V-ACT 100, Full V-ACT 120).
 * Features:
 * - Strict section isolation (never compensates language shortages with extra math)
 * - Complete vs Partial test status (isComplete flag with shortage diagnostics)
 * - Anti-duplication across entire exam
 * - Sequential question numbering with section boundary markers
 * - HTML exam paper formatter and section score analytics
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    const taxonomy = require('../taxonomy');
    const profiles = require('../profiles');
    const signature = require('../quality/signature');
    const sectionGen = require('./sectionTestGenerator');
    const coverage = require('../bank/coverage');
    module.exports = factory(taxonomy, profiles, signature, sectionGen, coverage);
  } else {
    root.KEDUVACT = root.KEDUVACT || {};
    root.KEDUVACT.generator = root.KEDUVACT.generator || {};
    const examGen = factory(
      root.KEDUVACT,
      root.KEDUVACT,
      root.KEDUVACT,
      root.KEDUVACT.generator || root.KEDUVACT,
      root.KEDUVACT.bank || root.KEDUVACT
    );
    Object.assign(root.KEDUVACT.generator, examGen);
    Object.assign(root.KEDUVACT, examGen);
  }
})(typeof window !== 'undefined' ? window : globalThis, function (taxonomyModule, profilesModule, signatureModule, sectionGenModule, coverageModule) {
  'use strict';

  const VACT_SECTIONS = taxonomyModule?.VACT_SECTIONS || {
    VIETNAMESE: 'vietnamese',
    ENGLISH: 'english',
    MATH: 'math',
    LOGIC_DATA: 'logic_data',
    SCIENTIFIC_REASONING: 'scientific_reasoning'
  };

  const VACT_SECTION_META = taxonomyModule?.VACT_SECTION_META || {};
  const VACT_PROFILES = profilesModule?.VACT_PROFILES || {};
  const VACT_MINI_30_PROFILE = profilesModule?.VACT_MINI_30_PROFILE;
  const VACT_MINI_60_PROFILE = profilesModule?.VACT_MINI_60_PROFILE;
  const VACT_MINI_100_PROFILE = profilesModule?.VACT_MINI_100_PROFILE;
  const VACT_FULL_PROFILE = profilesModule?.VACT_FULL_PROFILE;
  const resolveVACTProfile = profilesModule?.resolveVACTProfile || (profileOrId => {
    if (typeof profileOrId === 'string') return VACT_PROFILES[profileOrId] || null;
    return profileOrId?.id ? VACT_PROFILES[profileOrId.id] || null : null;
  });
  const validateVACTProfile = profilesModule?.validateVACTProfile || (() => ({ valid: true, errors: [] }));

  const computeVACTQuestionSignature = signatureModule?.computeVACTQuestionSignature || (q => q.id);
  const VACTSectionTestGenerator = sectionGenModule?.VACTSectionTestGenerator;

  function seededIdFragment(seed) {
    let hash = 2166136261;
    const value = String(seed);
    for (let i = 0; i < value.length; i++) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function isProductionVACTQuestion(q) {
    const optionSignatures = Array.isArray(q?.options) ? q.options.map(option => String(option || '').replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim().toLowerCase()) : [];
    return Boolean(
      q && typeof q === 'object' &&
      q.status === 'production' &&
      typeof q.question === 'string' && q.question.trim() &&
      Array.isArray(q.options) && q.options.length === 4 &&
      q.options.every(option => typeof option === 'string' && option.trim()) &&
      new Set(optionSignatures).size === optionSignatures.length &&
      ['A', 'B', 'C', 'D'].includes(q.correctAnswer) &&
      q.source && q.source.extractedFromSource === true &&
      typeof q.source.sourceId === 'string' && q.source.sourceId.trim() &&
      typeof q.source.sourceFile === 'string' && q.source.sourceFile.trim() &&
      q.quality && q.quality.answerVerified === true
    );
  }

  function copyQuestionProvenance(q) {
    const source = q?.source && typeof q.source === 'object' ? q.source : null;
    return {
      source: source ? { ...source } : q?.source || null,
      sourceId: q?.sourceId ?? source?.sourceId ?? null,
      sourceFile: q?.sourceFile ?? source?.sourceFile ?? null,
      sourcePage: q?.sourcePage ?? source?.sourcePage ?? null,
      questionSourceId: q?.questionSourceId ?? source?.questionSourceId ?? source?.sourceId ?? null,
      questionSourceFile: q?.questionSourceFile ?? source?.questionSourceFile ?? source?.sourceFile ?? null,
      questionSourcePage: q?.questionSourcePage ?? source?.questionSourcePage ?? source?.sourcePage ?? null,
      solutionSourceId: q?.solutionSourceId ?? source?.solutionSourceId ?? null,
      solutionSourceFile: q?.solutionSourceFile ?? source?.solutionSourceFile ?? null,
      solutionSourcePage: q?.solutionSourcePage ?? source?.solutionSourcePage ?? null,
      examSetId: q?.examSetId ?? source?.examSetId ?? null,
      quality: q?.quality ? { ...q.quality } : null,
      stimulus: q?.stimulus ?? null,
      assets: q?.assets ?? null,
      answerVerified: q?.quality?.answerVerified === true
    };
  }

  const ORDERED_SECTION_KEYS = Object.freeze([
    VACT_SECTIONS.VIETNAMESE,
    VACT_SECTIONS.ENGLISH,
    VACT_SECTIONS.MATH,
    VACT_SECTIONS.LOGIC_DATA,
    VACT_SECTIONS.SCIENTIFIC_REASONING
  ]);

  /**
   * Generates a multi-section exam based on a V-ACT exam profile.
   *
   * @param {object|string} profileOrId Canonical profile object or explicit profile ID
   * @param {object} [options]
   * @param {string} [options.difficulty='balanced'] 'easy' | 'medium' | 'hard' | 'balanced'
   * @param {Array<string>} [options.excludeSignatures=[]]
   * @param {*} [options.seed]
   * @param {number} [options.timeLimitMinutes] Overrides default profile time limit
   * @returns {object} Generated exam object
   */
  function generateFromProfile(profileOrId, options = {}) {
    const profile = resolveVACTProfile(profileOrId);
    if (!profile || !profile.sections) {
      throw new Error(`Invalid exam profile provided: ${JSON.stringify(profileOrId)}`);
    }
    const profileValidation = validateVACTProfile(profile);
    if (!profileValidation.valid) {
      throw new Error(`Invalid exam profile "${profile.id}": ${profileValidation.errors.join(', ')}`);
    }

    const difficulty = options.difficulty || 'balanced';
    const baseSeed = options.seed !== undefined ? String(options.seed) : null;
    const examId = baseSeed === null
      ? `vact_exam_${profile.id}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
      : `vact_exam_${profile.id}_seed_${seededIdFragment(baseSeed)}`;

    // Track seen signatures to guarantee zero intra-exam duplicate questions
    const seenSignatures = new Set(
      Array.isArray(options.excludeSignatures) ? options.excludeSignatures : []
    );

    const sectionsOutput = {};
    const allQuestions = [];
    const shortages = [];

    let requestedTotal = 0;
    let generatedTotal = 0;
    let missingTotal = 0;

    const requestedDistribution = {};
    const actualDistribution = { easy: 0, medium: 0, hard: 0, unclassified: 0 };
    let classifiedCount = 0;
    let unclassifiedCount = 0;
    let redistributionUsed = false;

    let questionGlobalIndex = 1;

    // Iterate through sections in standard V-ACT order
    for (let i = 0; i < ORDERED_SECTION_KEYS.length; i++) {
      const secKey = ORDERED_SECTION_KEYS[i];
      const targetCount = profile.sections[secKey];
      if (targetCount === undefined || targetCount === null) continue;

      requestedTotal += targetCount;
      const secMeta = VACT_SECTION_META[secKey] || { nameVi: secKey, nameEn: secKey };
      const sectionSeed = baseSeed ? `${baseSeed}_${secKey}_${i}` : undefined;

      requestedDistribution[secKey] = targetCount;

      // Section Isolation: generate strictly for this section
      let secResult;
      try {
        secResult = VACTSectionTestGenerator.generate({
          section: secKey,
          count: targetCount,
          difficulty,
          excludeSignatures: Array.from(seenSignatures),
          seed: sectionSeed
        });
      } catch (err) {
        secResult = {
          section: secKey,
          requestedCount: targetCount,
          generatedCount: 0,
          missingCount: targetCount,
          questions: [],
          shortages: [{
            scope: 'section',
            section: secKey,
            requested: targetCount,
            available: 0,
            generated: 0,
            missing: targetCount,
            reason: 'GENERATION_ERROR'
          }]
        };
      }

      const sectionQuestions = [];
      let invalidProductionCount = 0;
      let duplicateCount = 0;
      for (const rawQ of secResult.questions || []) {
        if (!isProductionVACTQuestion(rawQ)) {
          invalidProductionCount++;
          continue;
        }
        const sig = computeVACTQuestionSignature(rawQ);
        if (seenSignatures.has(sig)) {
          duplicateCount++;
          continue;
        }
        seenSignatures.add(sig);

        const numberedQ = {
          ...rawQ,
          ...copyQuestionProvenance(rawQ),
          examIndex: questionGlobalIndex,
          sectionKey: secKey,
          sectionName: secMeta.nameVi,
          sectionPartNumber: i + 1
        };
        questionGlobalIndex++;
        sectionQuestions.push(numberedQ);
        allQuestions.push(numberedQ);

        const difficultyKey = ['easy', 'medium', 'hard'].includes(rawQ.difficulty) ? rawQ.difficulty : 'unclassified';
        actualDistribution[difficultyKey]++;
        if (difficultyKey === 'unclassified') unclassifiedCount++;
        else classifiedCount++;
      }

      const secGen = sectionQuestions.length;
      const secMissing = Math.max(0, targetCount - secGen);
      const isSecComplete = secMissing === 0;

      generatedTotal += secGen;
      missingTotal += secMissing;

      if (secResult.shortages && secResult.shortages.length > 0) {
        shortages.push(...secResult.shortages);
      }
      if (invalidProductionCount > 0) {
        shortages.push({
          scope: 'section',
          section: secKey,
          requested: targetCount,
          generated: secGen,
          missing: Math.max(0, targetCount - secGen),
          invalid: invalidProductionCount,
          reason: 'INVALID_PRODUCTION_RECORD'
        });
      }
      if (duplicateCount > 0) {
        shortages.push({
          scope: 'section',
          section: secKey,
          requested: targetCount,
          generated: secGen,
          missing: Math.max(0, targetCount - secGen),
          duplicates: duplicateCount,
          reason: 'DUPLICATE_EXHAUSTION'
        });
      }

      if (secResult.diagnostics?.difficultyDistribution) {
        redistributionUsed = redistributionUsed || secResult.diagnostics.difficultyDistribution.redistributed === true;
      }

      sectionsOutput[secKey] = {
        sectionKey: secKey,
        partNumber: i + 1,
        nameVi: secMeta.nameVi,
        nameEn: secMeta.nameEn,
        requested: targetCount,
        generated: secGen,
        missing: secMissing,
        isComplete: isSecComplete,
      questions: sectionQuestions
      };
    }

    const isComplete = (missingTotal === 0 && generatedTotal === requestedTotal);
    const timeLimitMinutes = options.timeLimitMinutes || profile.timeLimitMinutes || 90;

    return {
      id: examId,
      profileId: profile.id,
      title: profile.name || 'Mini V-ACT 100 Luyện Tập',
      timeLimitMinutes,
      difficulty,
      requestedTotal,
      generatedTotal,
      missingTotal,
      isComplete,
      sections: sectionsOutput,
      questions: allQuestions,
      shortages,
      diagnostics: {
        profileId: profile.id,
        requestedDistribution,
        actualDistribution,
        classifiedCount,
        unclassifiedCount,
        redistributed: redistributionUsed,
        fallbackUsed: unclassifiedCount > 0
      },
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Generates multiple V-ACT exams from the same profile with ZERO question
   * overlap ACROSS the whole batch (not just within each individual exam).
   *
   * Without this, calling generateFromProfile() repeatedly for, say, 5 exams
   * gives each exam its own fresh signature set, so different exams draw
   * from the same pool independently and end up sharing most of their
   * questions — unsafe if those exams are handed to different students/
   * classes sitting at the same time.
   *
   * @param {object|string} profileOrId Canonical profile object or explicit profile ID
   * @param {number} count Number of exams to generate (>= 1)
   * @param {object} [options] Same options as generateFromProfile, applied to
   *   every exam in the batch.
   *   - options.seed, if given, is combined with the exam index so each exam
   *     stays individually reproducible while remaining distinct from the rest.
   *   - options.excludeSignatures, if given, seeds the shared exclusion set
   *     before the first exam (e.g. to also avoid questions already used in
   *     a previous, earlier batch/session).
   * @returns {{ exams: object[], usedSignatures: string[], isBatchComplete: boolean }}
   *   isBatchComplete is false if ANY exam in the batch came up short
   *   (bank exhausted partway through) — check each exam's own
   *   `isComplete`/`shortages` fields to see which one(s).
   */
  function generateBatch(profileOrId, count, options = {}) {
    const n = Math.max(1, parseInt(count, 10) || 1);
    const sharedSignatures = new Set(
      Array.isArray(options.excludeSignatures) ? options.excludeSignatures : []
    );
    const exams = [];
    let isBatchComplete = true;

    for (let i = 0; i < n; i++) {
      const examOptions = {
        ...options,
        excludeSignatures: Array.from(sharedSignatures),
        seed: options.seed !== undefined ? `${options.seed}_batch${i + 1}` : undefined
      };
      const exam = generateFromProfile(profileOrId, examOptions);
      exam.questions.forEach(q => {
        sharedSignatures.add(computeVACTQuestionSignature(q));
      });
      if (!exam.isComplete) isBatchComplete = false;
      exams.push(exam);
    }

    return {
      exams,
      usedSignatures: Array.from(sharedSignatures),
      isBatchComplete
    };
  }

  /**
   * Convenience entry point to generate a Mini V-ACT 100 practice exam.
   * @param {object} [options]
   * @returns {object}
   */
  function generateMini100(options = {}) {
    return generateFromProfile(VACT_MINI_100_PROFILE, options);
  }

  function generateMini30(options = {}) {
    return generateFromProfile(VACT_MINI_30_PROFILE, options);
  }

  function generateMini60(options = {}) {
    return generateFromProfile(VACT_MINI_60_PROFILE, options);
  }

  /**
   * Convenience entry point to generate a Full V-ACT 120 simulation exam.
   * @param {object} [options]
   * @returns {object}
   */
  function generateFull120(options = {}) {
    return generateFromProfile(VACT_FULL_PROFILE, options);
  }

  /**
   * Convenience entry point to generate a batch of Full V-ACT 120 exams
   * with zero overlap across the batch. See generateBatch() for details.
   * @param {number} count
   * @param {object} [options]
   * @returns {{ exams: object[], usedSignatures: string[], isBatchComplete: boolean }}
   */
  function generateFull120Batch(count, options = {}) {
    return generateBatch(VACT_FULL_PROFILE, count, options);
  }

  /**
   * Formats a generated V-ACT exam object into HTML for display and printable papers.
   * Clearly renders section boundaries (Phần 1 - Tiếng Việt, Phần 2 - Tiếng Anh, etc.).
   *
   * @param {object} exam
   * @returns {string} HTML string
   */
  function renderExamPaperHtml(exam) {
    if (!exam || !Array.isArray(exam.questions)) return '<p>Đề thi rỗng.</p>';

    let html = `
      <div class="vact-paper-wrapper" style="font-family:'Inter',system-ui,sans-serif;max-width:860px;margin:0 auto;padding:24px;color:#1e293b;line-height:1.6;">
        <div style="text-align:center;border-bottom:2px solid #3b82f6;padding-bottom:16px;margin-bottom:24px;">
          <div style="font-size:12px;font-weight:700;color:#64748b;letter-spacing:1px;text-transform:uppercase;">K-EDU V-ACT EXAMINATION SYSTEM</div>
          <h1 style="font-size:22px;color:#1e3a8a;margin:8px 0 4px;">${exam.title}</h1>
          <div style="font-size:14px;color:#475569;font-weight:600;">
            Thời gian làm bài: <strong>${exam.timeLimitMinutes} phút</strong> | Số lượng câu hỏi: <strong>${exam.generatedTotal}/${exam.requestedTotal} câu</strong>
          </div>
          ${!exam.isComplete ? `
            <div style="margin-top:8px;display:inline-block;padding:4px 12px;background:#fef3c7;border:1px solid #f59e0b;border-radius:999px;font-size:12px;font-weight:700;color:#92400e;">
              ⚠️ Bản rút gọn (${exam.generatedTotal}/${exam.requestedTotal} câu do giới hạn ngân hàng)
            </div>
          ` : ''}
        </div>
    `;

    let currentSection = null;

    for (let i = 0; i < exam.questions.length; i++) {
      const q = exam.questions[i];

      // Section boundary banner
      if (q.sectionKey !== currentSection) {
        currentSection = q.sectionKey;
        const secData = exam.sections[currentSection];
        html += `
          <div class="vact-section-header" style="margin:28px 0 16px;padding:10px 16px;background:#f1f5f9;border-left:5px solid #3b82f6;border-radius:4px;">
            <div style="font-weight:800;font-size:15px;color:#1e3a8a;text-transform:uppercase;">
              PHẦN ${q.sectionPartNumber} — ${q.sectionName}
            </div>
            <div style="font-size:12px;color:#64748b;margin-top:2px;">
              Số lượng câu hỏi trong phần này: ${secData ? secData.generated : ''} câu
            </div>
          </div>
        `;
      }

      // Question item
      const num = q.examIndex || (i + 1);
      html += `
        <div class="vact-question-box" id="q_box_${num}" style="margin-bottom:20px;padding:12px 16px;border:1px solid #e2e8f0;border-radius:8px;background:#ffffff;">
          <div style="font-weight:700;margin-bottom:8px;color:#0f172a;">
            <span style="color:#2563eb;margin-right:6px;">Câu ${num}:</span>
            <span>${q.question}</span>
          </div>
      `;

      if (Array.isArray(q.options) && q.options.length > 0) {
        html += `<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:8px;margin-top:8px;">`;
        const letters = ['A', 'B', 'C', 'D', 'E'];
        for (let o = 0; o < q.options.length; o++) {
          const letter = letters[o] || String.fromCharCode(65 + o);
          html += `
            <div style="font-size:14px;color:#334155;padding:4px 8px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;">
              <strong style="color:#475569;margin-right:4px;">${letter}.</strong> ${q.options[o]}
            </div>
          `;
        }
        html += `</div>`;
      }

      html += `</div>`;
    }

    html += `</div>`;
    return html;
  }

  /**
   * Converts a generated V-ACT exam object into a K-EDU Quiz record for the exam taking engine.
   *
   * @param {object} exam
   * @returns {object} K-EDU Quiz format
   */
  function formatExamAsQuiz(exam) {
    if (!exam || !Array.isArray(exam.questions)) {
      throw new Error('Invalid exam object provided to formatExamAsQuiz');
    }

    const answerKeys = [];
    const questionsList = [];

    for (let i = 0; i < exam.questions.length; i++) {
      const q = exam.questions[i];
      const num = q.examIndex || (i + 1);

      answerKeys.push({
        num,
        id: q.id,
        questionId: q.id,
        type: 'mcq',
        score: 1, // Normalized per-question score
        correct: q.correctAnswer,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || '',
        section: q.sectionKey,
        topic: q.skill || q.sectionKey,
        content: q.question,
        options: q.options || [],
        level: q.difficulty || null,
        source: q.source || null,
        questionSourceId: q.source?.questionSourceId || q.source?.sourceId || null,
        questionSourceFile: q.source?.questionSourceFile || q.source?.sourceFile || null,
        questionSourcePage: q.source?.questionSourcePage || q.source?.sourcePage || null,
        solutionSourceId: q.source?.solutionSourceId || null,
        solutionSourceFile: q.source?.solutionSourceFile || null,
        solutionSourcePage: q.source?.solutionSourcePage || null,
        examSetId: q.source?.examSetId || null,
        answerVerified: q.quality?.answerVerified === true,
        quality: q.quality || null,
        stimulus: q.stimulus || null,
        assets: q.assets || null,
        ...copyQuestionProvenance(q)
      });

      questionsList.push({
        id: q.id,
        questionId: q.id,
        num,
        question: q.question,
        options: q.options || [],
        section: q.sectionKey,
        skill: q.skill || null,
        difficulty: q.difficulty,
        stimulus: q.stimulus || null,
        source: q.source || null,
        questionSourceId: q.source?.questionSourceId || q.source?.sourceId || null,
        questionSourceFile: q.source?.questionSourceFile || q.source?.sourceFile || null,
        questionSourcePage: q.source?.questionSourcePage || q.source?.sourcePage || null,
        solutionSourceId: q.source?.solutionSourceId || null,
        solutionSourceFile: q.source?.solutionSourceFile || null,
        solutionSourcePage: q.source?.solutionSourcePage || null,
        examSetId: q.source?.examSetId || null,
        answerVerified: q.quality?.answerVerified === true,
        quality: q.quality || null,
        assets: q.assets || null,
        ...copyQuestionProvenance(q)
      });
    }

    const examHtml = renderExamPaperHtml(exam);

    return {
      id: exam.id,
      title: exam.title,
      subject: 'vact',
      profileId: exam.profileId,
      sourceType: exam.profileId === 'vact_full' ? 'vact_full_120' : exam.profileId,
      subjectLabel: {
        vact_mini_30: 'Mini V-ACT 30',
        vact_mini_60: 'Mini V-ACT 60',
        vact_mini_100: 'Mini V-ACT 100',
        vact_full: 'Full V-ACT 120'
      }[exam.profileId] || 'V-ACT',
      timeLimit: exam.timeLimitMinutes,
      totalQuestions: exam.generatedTotal,
      mcqCount: answerKeys.length,
      essayCount: 0,
      isComplete: exam.isComplete,
      examHtml,
      pdfDataUrl: 'data:text/html;charset=utf-8,' + encodeURIComponent(examHtml),
      answerKeys,
      questions: questionsList,
      questionsCount: exam.generatedTotal,
      createdAt: exam.createdAt,
      vactMeta: {
        profileId: exam.profileId,
        profileName: VACT_PROFILES[exam.profileId]?.name || exam.title,
        timeLimitMinutes: exam.timeLimitMinutes,
        isComplete: exam.isComplete,
        requestedTotal: exam.requestedTotal,
        generatedTotal: exam.generatedTotal,
        missingTotal: exam.missingTotal,
        sections: exam.sections,
        shortages: exam.shortages,
        diagnostics: exam.diagnostics || null
      }
    };
  }

  /**
   * Computes section-by-section breakdown from exam review data.
   *
   * @param {Array<object>} reviewData Array of graded question items from ExamVault.grade
   * @returns {object} Breakdown per section (correct, wrong, total, pct)
   */
  function computeSectionBreakdown(reviewData) {
    if (!Array.isArray(reviewData)) return {};

    const breakdown = {
      [VACT_SECTIONS.VIETNAMESE]: { name: 'Tiếng Việt', total: 0, correct: 0, wrong: 0, unanswered: 0, pct: 0 },
      [VACT_SECTIONS.ENGLISH]: { name: 'Tiếng Anh', total: 0, correct: 0, wrong: 0, unanswered: 0, pct: 0 },
      [VACT_SECTIONS.MATH]: { name: 'Toán học', total: 0, correct: 0, wrong: 0, unanswered: 0, pct: 0 },
      [VACT_SECTIONS.LOGIC_DATA]: { name: 'Tư duy logic & Phân tích số liệu', total: 0, correct: 0, wrong: 0, unanswered: 0, pct: 0 },
      [VACT_SECTIONS.SCIENTIFIC_REASONING]: { name: 'Suy luận khoa học', total: 0, correct: 0, wrong: 0, unanswered: 0, pct: 0 }
    };

    for (const item of reviewData) {
      const sec = item.section || null;
      const target = breakdown[sec];
      if (!target) continue;

      target.total++;
      if (item.isCorrect) {
        target.correct++;
      } else {
        target.wrong++;
      }

      if (!item.given || item.given === '(chưa điền)') {
        target.unanswered++;
      }
    }

    for (const secKey of Object.keys(breakdown)) {
      const s = breakdown[secKey];
      s.pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
    }

    return breakdown;
  }

  const VACTExamGenerator = {
    ORDERED_SECTION_KEYS,
    VACT_PROFILES,
    generateFromProfile,
    generateBatch,
    generateMini30,
    generateMini60,
    generateMini100,
    generateFull120,
    generateFull120Batch,
    renderExamPaperHtml,
    formatExamAsQuiz,
    computeSectionBreakdown
  };

  return {
    VACTExamGenerator,
    ORDERED_SECTION_KEYS,
    VACT_PROFILES,
    generateFromProfile,
    generateBatch,
    generateMini30,
    generateMini60,
    generateMini100,
    generateFull120,
    generateFull120Batch,
    renderExamPaperHtml,
    formatExamAsQuiz,
    computeSectionBreakdown
  };
});

