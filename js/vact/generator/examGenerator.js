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
  const VACT_MINI_100_PROFILE = profilesModule?.VACT_MINI_100_PROFILE;
  const VACT_FULL_PROFILE = profilesModule?.VACT_FULL_PROFILE;

  const computeVACTQuestionSignature = signatureModule?.computeVACTQuestionSignature || (q => q.id);
  const VACTSectionTestGenerator = sectionGenModule?.VACTSectionTestGenerator;

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
   * @param {object|string} profileOrId Exam profile object or ID ('vact_mini_100' | 'vact_full')
   * @param {object} [options]
   * @param {string} [options.difficulty='balanced'] 'easy' | 'medium' | 'hard' | 'balanced'
   * @param {Array<string>} [options.excludeSignatures=[]]
   * @param {*} [options.seed]
   * @param {number} [options.timeLimitMinutes] Overrides default profile time limit
   * @returns {object} Generated exam object
   */
  function generateFromProfile(profileOrId, options = {}) {
    let profile = profileOrId;
    if (typeof profileOrId === 'string') {
      if (profileOrId === 'vact_mini_100' || profileOrId === 'mini100') {
        profile = VACT_MINI_100_PROFILE;
      } else if (profileOrId === 'vact_full' || profileOrId === 'full120') {
        profile = VACT_FULL_PROFILE;
      }
    }

    if (!profile || !profile.sections) {
      throw new Error(`Invalid exam profile provided: ${JSON.stringify(profileOrId)}`);
    }

    const examId = `vact_exam_${profile.id}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const difficulty = options.difficulty || 'balanced';
    const baseSeed = options.seed !== undefined ? String(options.seed) : null;

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

    let questionGlobalIndex = 1;

    // Iterate through sections in standard V-ACT order
    for (let i = 0; i < ORDERED_SECTION_KEYS.length; i++) {
      const secKey = ORDERED_SECTION_KEYS[i];
      const targetCount = profile.sections[secKey];
      if (targetCount === undefined || targetCount === null) continue;

      requestedTotal += targetCount;
      const secMeta = VACT_SECTION_META[secKey] || { nameVi: secKey, nameEn: secKey };
      const sectionSeed = baseSeed ? `${baseSeed}_${secKey}_${i}` : undefined;

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

      const secGen = secResult.generatedCount;
      const secMissing = Math.max(0, targetCount - secGen);
      const isSecComplete = secMissing === 0;

      generatedTotal += secGen;
      missingTotal += secMissing;

      // Tag and number each question with section boundary info
      const sectionQuestions = [];
      for (const rawQ of secResult.questions) {
        const sig = computeVACTQuestionSignature(rawQ);
        seenSignatures.add(sig);

        const numberedQ = {
          ...rawQ,
          examIndex: questionGlobalIndex,
          sectionKey: secKey,
          sectionName: secMeta.nameVi,
          sectionPartNumber: i + 1
        };
        questionGlobalIndex++;
        sectionQuestions.push(numberedQ);
        allQuestions.push(numberedQ);
      }

      if (secResult.shortages && secResult.shortages.length > 0) {
        shortages.push(...secResult.shortages);
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
      createdAt: new Date().toISOString()
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

  /**
   * Convenience entry point to generate a Full V-ACT 120 simulation exam.
   * @param {object} [options]
   * @returns {object}
   */
  function generateFull120(options = {}) {
    return generateFromProfile(VACT_FULL_PROFILE, options);
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
        type: 'mcq',
        score: 1, // Normalized per-question score
        correct: q.correctAnswer,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || '',
        section: q.sectionKey,
        topic: q.skill || q.sectionKey,
        content: q.question,
        options: q.options || [],
        level: q.difficulty || 'medium'
      });

      questionsList.push({
        id: q.id,
        num,
        question: q.question,
        options: q.options || [],
        section: q.sectionKey,
        skill: q.skill || null,
        difficulty: q.difficulty
      });
    }

    const examHtml = renderExamPaperHtml(exam);

    return {
      id: exam.id,
      title: exam.title,
      subject: 'vact',
      subjectLabel: exam.profileId === 'vact_full' ? 'Full V-ACT 120' : (exam.profileId === 'vact_mini_100' ? 'Mini V-ACT 100' : 'V-ACT'),
      timeLimit: exam.timeLimitMinutes,
      examHtml,
      pdfDataUrl: 'data:text/html;charset=utf-8,' + encodeURIComponent(examHtml),
      answerKeys,
      questionsCount: exam.generatedTotal,
      createdAt: exam.createdAt,
      vactMeta: {
        profileId: exam.profileId,
        isComplete: exam.isComplete,
        requestedTotal: exam.requestedTotal,
        generatedTotal: exam.generatedTotal,
        missingTotal: exam.missingTotal,
        sections: exam.sections,
        shortages: exam.shortages
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
      const sec = item.section || item.category || 'math';
      const target = breakdown[sec] || breakdown[VACT_SECTIONS.MATH];

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
    generateFromProfile,
    generateMini100,
    generateFull120,
    renderExamPaperHtml,
    formatExamAsQuiz,
    computeSectionBreakdown
  };

  return {
    VACTExamGenerator,
    ORDERED_SECTION_KEYS,
    generateFromProfile,
    generateMini100,
    generateFull120,
    renderExamPaperHtml,
    formatExamAsQuiz,
    computeSectionBreakdown
  };
});

