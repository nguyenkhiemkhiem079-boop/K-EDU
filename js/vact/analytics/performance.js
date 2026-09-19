/**
 * K-EDU V-ACT Core Architecture - Student Performance Analytics Module
 * Provides competency tracking, section/skill breakdowns, attempt history,
 * trend calculation, weakness/strength identification with evidence thresholds,
 * and wrong question review.
 *
 * Adheres strictly to factual data:
 * - NO fabricated or guessed official V-ACT scores (uses raw counts, percentages, section accuracy).
 * - NO guessed skills (only verified taxonomy skills are counted).
 * - NO weaknesses declared on insufficient evidence (configurable threshold).
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    const taxonomy = require('../taxonomy');
    module.exports = factory(taxonomy);
  } else {
    root.KEDUVACT = root.KEDUVACT || {};
    root.KEDUVACT.analytics = root.KEDUVACT.analytics || {};
    const analyticsModule = factory(root.KEDUVACT);
    Object.assign(root.KEDUVACT.analytics, analyticsModule);
    root.KEDUVACT.performanceAnalytics = analyticsModule;
  }
})(typeof window !== 'undefined' ? window : globalThis, function (taxonomyModule) {
  'use strict';

  const VACT_SECTIONS = taxonomyModule?.VACT_SECTIONS || {
    VIETNAMESE: 'vietnamese',
    ENGLISH: 'english',
    MATH: 'math',
    LOGIC_DATA: 'logic_data',
    SCIENTIFIC_REASONING: 'scientific_reasoning'
  };

  const VACT_SECTION_META = taxonomyModule?.VACT_SECTION_META || {};
  const VACT_TAXONOMY = taxonomyModule?.VACT_TAXONOMY || {};
  const isValidSection = taxonomyModule?.isValidSection || (s => Object.values(VACT_SECTIONS).includes(s));
  const isValidSectionSkill = taxonomyModule?.isValidSectionSkill || ((sec, sk) => {
    return Array.isArray(VACT_TAXONOMY[sec]) && VACT_TAXONOMY[sec].includes(sk);
  });

  const SKILL_NAMES_VI = Object.freeze({
    // Math
    algebra: 'Đại số',
    functions: 'Hàm số & Giải tích',
    geometry: 'Hình học & Đo lường',
    probability_statistics: 'Xác suất & Thống kê',
    real_world_math: 'Toán thực tế',
    data_reading: 'Đọc số liệu toán học',
    // Scientific Reasoning
    physics: 'Vật lý',
    chemistry: 'Hóa học',
    biology: 'Sinh học',
    history: 'Lịch sử',
    geography: 'Địa lí',
    economics_law: 'Kinh tế & Pháp luật',
    technology: 'Công nghệ',
    economics: 'Kinh tế',
    society: 'Xã hội',
    interdisciplinary: 'Liên môn',
    // Logic & Data
    logical_reasoning: 'Tư duy logic',
    conditional_reasoning: 'Suy luận điều kiện',
    pattern_reasoning: 'Quy luật chuỗi',
    table_analysis: 'Phân tích bảng số liệu',
    chart_analysis: 'Phân tích biểu đồ',
    data_interpretation: 'Xử lý & Giải thích số liệu',
    // Vietnamese
    reading_comprehension: 'Đọc hiểu văn bản',
    vocabulary: 'Từ vựng & Ngữ nghĩa',
    grammar: 'Ngữ pháp',
    language_usage: 'Sử dụng ngôn ngữ',
    literary_analysis: 'Phân tích văn học',
    inference: 'Suy luận',
    // English
    communication: 'Giao tiếp'
  });

  // Memory store for standalone/unit test execution
  const _memoryAttempts = new Map(); // studentKey -> Array<attempt>
  let _customStorage = null;

  /**
   * Generates a normalized student identifier key for grouping attempts.
   */
  function getStudentKey(query = {}) {
    if (typeof query === 'string') return query.trim().toLowerCase();
    const studentId = query.studentId || query.studentUid || query.uid;
    if (studentId) return `id_${studentId}`.toLowerCase();
    const name = (query.studentName || query.name || 'default').trim().toLowerCase();
    const cls = (query.studentClass || query.className || 'default').trim().toLowerCase();
    return `${cls}_${name}`;
  }

  /**
   * Sets custom storage provider for testing or persistence redirection.
   * @param {object} storage
   */
  function setStorageEngine(storage) {
    _customStorage = storage;
  }

  /**
   * Clears attempts from memory and local storage for a student or globally.
   * @param {object|string} [studentQuery]
   */
  function clearAttempts(studentQuery) {
    if (studentQuery) {
      const key = getStudentKey(studentQuery);
      _memoryAttempts.delete(key);
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.removeItem(`vact_attempts_${key}`);
        } catch (e) {}
      }
    } else {
      _memoryAttempts.clear();
      if (typeof localStorage !== 'undefined') {
        try {
          const toRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('vact_attempts_')) toRemove.push(k);
          }
          toRemove.forEach(k => localStorage.removeItem(k));
        } catch (e) {}
      }
    }
  }

  /**
   * Retrieves stored attempts for a student.
   * @param {object|string} studentQuery
   * @returns {Array<object>}
   */
  function getAttempts(studentQuery = {}) {
    const key = getStudentKey(studentQuery);

    if (_customStorage && typeof _customStorage.getAttempts === 'function') {
      return _customStorage.getAttempts(key) || [];
    }

    if (_memoryAttempts.has(key)) {
      return [..._memoryAttempts.get(key)];
    }

    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(`vact_attempts_${key}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            _memoryAttempts.set(key, parsed);
            return [...parsed];
          }
        }
      } catch (e) {
        console.warn('[VACTAnalytics] Error reading attempts from localStorage:', e);
      }
    }

    return [];
  }

  /**
   * Stores a completed V-ACT practice or simulation attempt.
   *
   * @param {object} params
   * @returns {Promise<object>|object} Recorded attempt record
   */
  function recordAttempt(params = {}) {
    if (!params || typeof params !== 'object') {
      throw new TypeError('recordAttempt expects a parameter object');
    }

    const testId = String(params.testId || `vact_test_${Date.now()}`);
    const studentName = String(params.studentName || params.name || 'Học Sinh');
    const studentClass = String(params.studentClass || params.className || 'V-ACT');
    const studentId = params.studentId || params.studentUid || null;
    const studentKey = getStudentKey({ studentId, studentName, studentClass });

    const requestedCount = Number.isInteger(params.requestedCount) ? params.requestedCount : (params.generatedCount || 0);
    const generatedCount = Number.isInteger(params.generatedCount) ? params.generatedCount : requestedCount;
    const correct = Number(params.correct) || 0;
    const incorrect = Number(params.incorrect) || 0;
    const unanswered = Number(params.unanswered) || 0;
    const scoreRaw = Number(params.scoreRaw !== undefined ? params.scoreRaw : correct);
    const accuracy = Number.isFinite(params.accuracy)
      ? params.accuracy
      : (generatedCount > 0 ? Math.round((correct / generatedCount) * 100) : 0);

    const duration = Number(params.duration) || 0;
    const startedAt = params.startedAt || new Date(Date.now() - duration * 1000).toISOString();
    const submittedAt = params.submittedAt || new Date().toISOString();

    const review = Array.isArray(params.review) ? params.review.map(r => ({
      num: r.num,
      id: r.id || `q_${r.num}`,
      signature: r.signature || `${r.num}`,
      section: r.section || null,
      skill: r.skill || null,
      difficulty: r.difficulty || r.level || 'medium',
      question: r.question || r.content || '',
      options: Array.isArray(r.options) ? r.options : [],
      correctAnswer: r.correctAnswer || r.correct || '',
      given: r.given || '(chưa điền)',
      isCorrect: Boolean(r.isCorrect),
      explanation: r.explanation || ''
    })) : [];

    const attempt = {
      id: `vact_att_${testId}_${Date.now()}`,
      testId,
      mode: params.mode || (params.profile === 'vact_full' ? 'full_120' : (params.profile === 'vact_mini_100' ? 'mini_100' : 'section_mini')),
      profile: params.profile || null,
      section: params.section || (params.profile ? 'composite' : (review[0]?.section || 'composite')),
      skill: params.skill || null,
      requestedCount,
      generatedCount,
      questionIds: Array.isArray(params.questionIds) && params.questionIds.length ? params.questionIds : review.map(r => r.id),
      questionSignatures: Array.isArray(params.questionSignatures) && params.questionSignatures.length ? params.questionSignatures : review.map(r => r.signature),
      answers: typeof params.answers === 'object' && params.answers !== null ? { ...params.answers } : {},
      correct,
      incorrect,
      unanswered,
      scoreRaw,
      accuracy,
      startedAt,
      submittedAt,
      duration,
      studentName,
      studentClass,
      studentId,
      studentUid: params.studentUid || null,
      review
    };

    // Save to memory
    const list = getAttempts(studentKey);
    list.push(attempt);
    _memoryAttempts.set(studentKey, list);

    // Save to custom storage or localStorage
    if (_customStorage && typeof _customStorage.saveAttempt === 'function') {
      _customStorage.saveAttempt(attempt);
    } else if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(`vact_attempts_${studentKey}`, JSON.stringify(list));
      } catch (e) {
        console.warn('[VACTAnalytics] Error persisting attempt to localStorage:', e);
      }
    }

    // Connect to K-EDU StorageEngine if available in browser
    if (typeof window !== 'undefined' && window.StorageEngine && typeof window.StorageEngine.set === 'function') {
      window.StorageEngine.set(`vact_attempt:${studentKey}:${attempt.id}`, attempt).catch(e => {
        console.warn('[VACTAnalytics] StorageEngine save attempt notice:', e);
      });
    }

    return attempt;
  }

  /**
   * Retrieves a single attempt by ID.
   * @param {string} attemptId
   * @param {object|string} [studentQuery]
   * @returns {object|null}
   */
  function getAttemptById(attemptId, studentQuery) {
    if (!attemptId) return null;
    const attempts = studentQuery ? getAttempts(studentQuery) : Array.from(_memoryAttempts.values()).flat();
    return attempts.find(a => a.id === attemptId || a.testId === attemptId) || null;
  }

  /**
   * Computes section-by-section analytics from one or multiple attempts.
   * Only returns sections that are present in the evaluated attempts.
   *
   * @param {object|Array<object>} attemptsOrAttempt
   * @returns {object} Map of sectionKey -> { name, total, correct, incorrect, unanswered, accuracy }
   */
  function computeSectionAnalytics(attemptsOrAttempt) {
    const list = Array.isArray(attemptsOrAttempt)
      ? attemptsOrAttempt
      : (attemptsOrAttempt && typeof attemptsOrAttempt === 'object' ? [attemptsOrAttempt] : []);

    const sectionStats = {};

    for (const att of list) {
      const review = Array.isArray(att.review) ? att.review : [];
      if (review.length > 0) {
        for (const item of review) {
          const sec = item.section;
          if (!sec || !isValidSection(sec)) continue;

          if (!sectionStats[sec]) {
            const meta = VACT_SECTION_META[sec] || {};
            sectionStats[sec] = {
              section: sec,
              name: meta.nameVi || sec,
              total: 0,
              correct: 0,
              incorrect: 0,
              unanswered: 0,
              accuracy: 0
            };
          }

          sectionStats[sec].total++;
          if (item.isCorrect) {
            sectionStats[sec].correct++;
          } else {
            sectionStats[sec].incorrect++;
          }

          if (!item.given || item.given === '(chưa điền)') {
            sectionStats[sec].unanswered++;
          }
        }
      } else if (att.section && isValidSection(att.section)) {
        const sec = att.section;
        if (!sectionStats[sec]) {
          const meta = VACT_SECTION_META[sec] || {};
          sectionStats[sec] = {
            section: sec,
            name: meta.nameVi || sec,
            total: 0,
            correct: 0,
            incorrect: 0,
            unanswered: 0,
            accuracy: 0
          };
        }
        const tot = att.generatedCount || (att.correct + att.incorrect + (att.unanswered || 0)) || 0;
        sectionStats[sec].total += tot;
        sectionStats[sec].correct += (att.correct || 0);
        sectionStats[sec].incorrect += (att.incorrect || 0);
        sectionStats[sec].unanswered += (att.unanswered || 0);
      }
    }

    // Compute accuracy percentages
    for (const s of Object.values(sectionStats)) {
      s.accuracy = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
    }

    return sectionStats;
  }

  /**
   * Computes skill-by-skill competency analytics from one or multiple attempts.
   * Does NOT assign performance to guessed skills.
   *
   * @param {object|Array<object>} attemptsOrAttempt
   * @returns {object} Map of `${section}.${skill}` -> { section, skill, name, total, correct, incorrect, unanswered, accuracy }
   */
  function computeSkillAnalytics(attemptsOrAttempt) {
    const list = Array.isArray(attemptsOrAttempt)
      ? attemptsOrAttempt
      : (attemptsOrAttempt && typeof attemptsOrAttempt === 'object' ? [attemptsOrAttempt] : []);

    const skillStats = {};

    for (const att of list) {
      const review = Array.isArray(att.review) ? att.review : [];
      for (const item of review) {
        const sec = item.section;
        const sk = item.skill;

        // Strictly verify skill against section taxonomy - NO GUESSING
        if (!sec || !sk || !isValidSectionSkill(sec, sk)) {
          continue;
        }

        const skillKey = `${sec}.${sk}`;
        if (!skillStats[skillKey]) {
          skillStats[skillKey] = {
            section: sec,
            skill: sk,
            name: SKILL_NAMES_VI[sk] || sk,
            total: 0,
            correct: 0,
            incorrect: 0,
            unanswered: 0,
            accuracy: 0
          };
        }

        skillStats[skillKey].total++;
        if (item.isCorrect) {
          skillStats[skillKey].correct++;
        } else {
          skillStats[skillKey].incorrect++;
        }

        if (!item.given || item.given === '(chưa điền)') {
          skillStats[skillKey].unanswered++;
        }
      }
    }

    // Compute accuracy percentages
    for (const sk of Object.values(skillStats)) {
      sk.accuracy = sk.total > 0 ? Math.round((sk.correct / sk.total) * 100) : 0;
    }

    return skillStats;
  }

  /**
   * Retrieves clean, formatted recent attempt history for display.
   *
   * @param {object|string} studentQuery
   * @param {number} [limit=10]
   * @returns {Array<object>}
   */
  function getAttemptHistory(studentQuery, limit = 10) {
    const attempts = getAttempts(studentQuery);
    const SECTION_SHORT_NAMES = {
      math: 'Math',
      vietnamese: 'Vietnamese',
      english: 'English',
      logic_data: 'Logic/Data',
      scientific_reasoning: 'Science'
    };

    // Sort reverse chronological for display
    const sortedDesc = [...attempts].sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    // Sort chronological for numbering attempts (#1, #2, ...)
    const sortedAsc = [...attempts].sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));

    const slice = sortedDesc.slice(0, limit);

    return slice.map((att) => {
      let label = 'V-ACT Practice';
      if (att.profile === 'vact_full' || att.mode === 'full_120') {
        label = 'Full V-ACT';
      } else if (att.profile === 'vact_mini_100' || att.mode === 'mini_100') {
        label = 'Mini 100';
      } else if (att.section && att.section !== 'composite') {
        const secLabel = SECTION_SHORT_NAMES[att.section] || att.section;
        // Find chronological index among tests of same section
        const sameSecTests = sortedAsc.filter(a => a.section === att.section);
        const seqIndex = sameSecTests.findIndex(a => a.id === att.id);
        const seqNum = seqIndex >= 0 ? seqIndex + 1 : 1;
        label = `${secLabel} Mini #${seqNum}`;
      }

      return {
        id: att.id,
        testId: att.testId,
        label,
        mode: att.mode,
        profile: att.profile,
        section: att.section,
        scoreText: `${att.correct}/${att.generatedCount}`,
        correct: att.correct,
        total: att.generatedCount,
        accuracy: att.accuracy,
        durationSeconds: att.duration,
        durationText: `${Math.floor(att.duration / 60)}p ${att.duration % 60}s`,
        submittedAt: att.submittedAt,
        unanswered: att.unanswered,
        incorrect: att.incorrect
      };
    });
  }

  /**
   * Calculates accuracy progression trends across sequential attempts.
   * Does NOT overclaim statistical significance; requires at least 2 attempts.
   *
   * @param {Array<object>} attempts
   * @returns {object} Trend summary with overall and per-section progression
   */
  function computeTrends(attempts = []) {
    if (!Array.isArray(attempts) || attempts.length < 2) {
      return {
        hasEnoughData: false,
        message: 'Cần ít nhất 2 bài thi để phân tích xu hướng tiến bộ.'
      };
    }

    // Sort chronologically
    const sorted = [...attempts].sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));

    // Overall accuracy trend
    const overallAccuracies = sorted.map(a => a.accuracy);
    const firstAcc = overallAccuracies[0];
    const latestAcc = overallAccuracies[overallAccuracies.length - 1];
    const overallDelta = latestAcc - firstAcc;

    // Per-section accuracy progression
    const sectionTrends = {};
    for (const secKey of Object.values(VACT_SECTIONS)) {
      const secPoints = [];
      for (const att of sorted) {
        const secStats = computeSectionAnalytics(att);
        if (secStats[secKey] && secStats[secKey].total > 0) {
          secPoints.push(secStats[secKey].accuracy);
        }
      }

      if (secPoints.length >= 2) {
        const first = secPoints[0];
        const latest = secPoints[secPoints.length - 1];
        const delta = latest - first;
        const meta = VACT_SECTION_META[secKey] || {};

        sectionTrends[secKey] = {
          section: secKey,
          name: meta.nameVi || secKey,
          points: secPoints,
          progressionText: secPoints.map(p => `${p}%`).join(' → '),
          delta,
          direction: delta > 2 ? 'improving' : (delta < -2 ? 'declining' : 'stable')
        };
      }
    }

    return {
      hasEnoughData: true,
      attemptsCount: sorted.length,
      overall: {
        points: overallAccuracies,
        progressionText: overallAccuracies.map(p => `${p}%`).join(' → '),
        delta: overallDelta,
        direction: overallDelta > 2 ? 'improving' : (overallDelta < -2 ? 'declining' : 'stable')
      },
      sections: sectionTrends
    };
  }

  /**
   * Identifies strengths and weaknesses with evidence thresholds.
   * Never declares a weakness based on 1 question.
   *
   * @param {Array<object>} attempts
   * @param {object} [options]
   * @param {number} [options.minQuestions=5] Minimum questions answered in that topic to constitute valid evidence
   * @param {number} [options.weaknessThreshold=60] Accuracy % below which item is flagged as a weakness
   * @param {number} [options.strengthThreshold=80] Accuracy % at or above which item is flagged as a strength
   * @returns {object} { strengths: Array, weaknesses: Array, insufficientEvidence: Array }
   */
  function detectStrengthsAndWeaknesses(attempts = [], options = {}) {
    const minQuestions = Number.isInteger(options.minQuestions) ? options.minQuestions : 5;
    const weaknessThreshold = Number.isInteger(options.weaknessThreshold) ? options.weaknessThreshold : 60;
    const strengthThreshold = Number.isInteger(options.strengthThreshold) ? options.strengthThreshold : 80;

    const secAnalytics = computeSectionAnalytics(attempts);
    const skAnalytics = computeSkillAnalytics(attempts);

    const strengths = [];
    const weaknesses = [];
    const insufficientEvidence = [];

    // Evaluate sections
    for (const [secKey, stats] of Object.entries(secAnalytics)) {
      if (stats.total < minQuestions) {
        insufficientEvidence.push({
          type: 'section',
          key: secKey,
          name: stats.name,
          total: stats.total,
          accuracy: stats.accuracy,
          reason: `Chưa đủ bằng chứng (mới làm ${stats.total}/${minQuestions} câu)`
        });
        continue;
      }

      if (stats.accuracy >= strengthThreshold) {
        strengths.push({
          type: 'section',
          key: secKey,
          name: stats.name,
          total: stats.total,
          correct: stats.correct,
          accuracy: stats.accuracy
        });
      } else if (stats.accuracy < weaknessThreshold) {
        weaknesses.push({
          type: 'section',
          key: secKey,
          name: stats.name,
          total: stats.total,
          correct: stats.correct,
          accuracy: stats.accuracy
        });
      }
    }

    // Evaluate skills
    for (const [skillKey, stats] of Object.entries(skAnalytics)) {
      if (stats.total < minQuestions) {
        insufficientEvidence.push({
          type: 'skill',
          key: skillKey,
          name: stats.name,
          total: stats.total,
          accuracy: stats.accuracy,
          reason: `Chưa đủ bằng chứng (mới làm ${stats.total}/${minQuestions} câu)`
        });
        continue;
      }

      if (stats.accuracy >= strengthThreshold) {
        strengths.push({
          type: 'skill',
          key: skillKey,
          section: stats.section,
          name: stats.name,
          total: stats.total,
          correct: stats.correct,
          accuracy: stats.accuracy
        });
      } else if (stats.accuracy < weaknessThreshold) {
        weaknesses.push({
          type: 'skill',
          key: skillKey,
          section: stats.section,
          name: stats.name,
          total: stats.total,
          correct: stats.correct,
          accuracy: stats.accuracy
        });
      }
    }

    return {
      minQuestionsThreshold: minQuestions,
      weaknessThreshold,
      strengthThreshold,
      strengths,
      weaknesses,
      insufficientEvidence
    };
  }

  /**
   * Retrieves all incorrect or unanswered questions from past attempts for review.
   *
   * @param {object|string} studentQuery
   * @param {object} [options]
   * @param {string} [options.attemptId] Filter to a specific attempt
   * @param {string} [options.section] Filter to a specific section
   * @param {number} [options.limit=50]
   * @returns {Array<object>}
   */
  function getWrongQuestions(studentQuery, options = {}) {
    let attempts = getAttempts(studentQuery);
    if (options.attemptId) {
      attempts = attempts.filter(a => a.id === options.attemptId || a.testId === options.attemptId);
    }

    const wrongList = [];

    for (const att of attempts) {
      const review = Array.isArray(att.review) ? att.review : [];
      for (const item of review) {
        if (item.isCorrect) continue;
        if (options.section && item.section !== options.section) continue;

        wrongList.push({
          attemptId: att.id,
          attemptDate: att.submittedAt,
          attemptMode: att.mode,
          num: item.num,
          id: item.id,
          section: item.section,
          skill: item.skill,
          skillName: item.skill ? (SKILL_NAMES_VI[item.skill] || item.skill) : null,
          question: item.question,
          options: item.options,
          given: item.given,
          correctAnswer: item.correctAnswer,
          explanation: item.explanation,
          isUnanswered: !item.given || item.given === '(chưa điền)'
        });
      }
    }

    const limit = Number.isInteger(options.limit) ? options.limit : 50;
    return wrongList.slice(0, limit);
  }

  /**
   * Generates compact HTML markup for the Student V-ACT Performance Dashboard.
   * Renders: Tiến độ, Tỷ lệ chính xác, Điểm mạnh, Cần cải thiện, Lịch sử.
   *
   * @param {object|string} studentQuery
   * @returns {string} HTML string
   */
  function renderDashboardHtml(studentQuery) {
    const attempts = getAttempts(studentQuery);
    if (!attempts.length) {
      return `
        <div class="vact-dashboard-empty" style="padding:1.5rem;text-align:center;background:var(--bg-tertiary);border-radius:var(--radius-lg);border:1px dashed var(--border-color);">
          <div style="font-size:2.5rem;margin-bottom:0.5rem;">📊</div>
          <h3 style="margin:0 0 0.35rem;font-size:1.1rem;color:var(--text-primary);">Chưa có dữ liệu phân tích V-ACT</h3>
          <p style="font-size:0.88rem;color:var(--text-secondary);margin:0 0 1rem;">
            Hãy hoàn thành bài luyện tập Mini Test hoặc Full V-ACT để hệ thống đánh giá năng lực của bạn!
          </p>
        </div>
      `;
    }

    const totalAttempts = attempts.length;
    const totalQuestions = attempts.reduce((acc, a) => acc + (a.generatedCount || 0), 0);
    const totalCorrect = attempts.reduce((acc, a) => acc + (a.correct || 0), 0);
    const overallAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
    const totalDurationSeconds = attempts.reduce((acc, a) => acc + (a.duration || 0), 0);

    const sectionAnalytics = computeSectionAnalytics(attempts);
    const evaluation = detectStrengthsAndWeaknesses(attempts, { minQuestions: 5 });
    const history = getAttemptHistory(studentQuery, 6);
    const trends = computeTrends(attempts);

    return `
      <div class="vact-analytics-dashboard" style="background:var(--bg-card);border:2px solid var(--indigo);border-radius:var(--radius-lg);padding:1.25rem;box-shadow:0 8px 24px rgba(99,102,241,0.12);">
        <!-- Dashboard Header -->
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.75rem;margin-bottom:1rem;border-bottom:1px solid var(--border-color);padding-bottom:0.75rem;">
          <h3 style="margin:0;font-size:1.2rem;color:var(--indigo);display:flex;align-items:center;gap:0.5rem;">
            <span>📊</span> <span>BÁO CÁO NĂNG LỰC & TIẾN ĐỘ V-ACT</span>
          </h3>
          <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
            <span style="font-size:0.8rem;font-weight:700;color:var(--text-secondary);background:var(--bg-tertiary);padding:3px 10px;border-radius:999px;">
              ${totalAttempts} bài thi đã hoàn thành
            </span>
            <button type="button" class="btn btn-sm btn-primary" onclick="handleStartWeaknessPracticeClick()" style="font-size:0.75rem;padding:3px 10px;font-weight:800;background:var(--rose);border:none;border-radius:999px;box-shadow:0 2px 6px rgba(244,63,94,0.25);cursor:pointer;">
              🎯 Luyện điểm yếu
            </button>
          </div>
        </div>

        <!-- 1. TIẾN ĐỘ (Progress Summary) -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:0.6rem;margin-bottom:1.25rem;">
          <div style="background:var(--bg-tertiary);padding:0.75rem;border-radius:var(--radius-md);text-align:center;">
            <div style="font-size:1.4rem;font-weight:900;color:var(--indigo);">${totalAttempts}</div>
            <div style="font-size:0.75rem;font-weight:800;color:var(--text-secondary);">Đề đã luyện</div>
          </div>
          <div style="background:var(--bg-tertiary);padding:0.75rem;border-radius:var(--radius-md);text-align:center;">
            <div style="font-size:1.4rem;font-weight:900;color:var(--text-primary);">${totalQuestions}</div>
            <div style="font-size:0.75rem;font-weight:800;color:var(--text-secondary);">Câu đã giải</div>
          </div>
          <div style="background:var(--bg-tertiary);padding:0.75rem;border-radius:var(--radius-md);text-align:center;">
            <div style="font-size:1.4rem;font-weight:900;color:var(--emerald);">${overallAccuracy}%</div>
            <div style="font-size:0.75rem;font-weight:800;color:var(--text-secondary);">Độ chính xác TB</div>
          </div>
          <div style="background:var(--bg-tertiary);padding:0.75rem;border-radius:var(--radius-md);text-align:center;">
            <div style="font-size:1.4rem;font-weight:900;color:var(--text-secondary);">${Math.floor(totalDurationSeconds / 60)}p</div>
            <div style="font-size:0.75rem;font-weight:800;color:var(--text-secondary);">Thời gian luyện</div>
          </div>
        </div>

        <!-- 2. TỶ LỆ CHÍNH XÁC THEO TỪNG PHẦN (Section Accuracy Breakdown) -->
        <div style="margin-bottom:1.25rem;">
          <div style="font-size:0.88rem;font-weight:800;color:var(--text-primary);margin-bottom:0.6rem;">🎯 Tỷ Lệ Chính Xác Theo Từng Phần:</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:0.6rem;">
            ${Object.values(sectionAnalytics).map(s => {
              const color = s.accuracy >= 75 ? 'var(--emerald)' : (s.accuracy >= 50 ? 'var(--indigo)' : 'var(--rose)');
              return `
                <div style="background:var(--bg-tertiary);border-left:4px solid ${color};padding:0.6rem 0.85rem;border-radius:var(--radius-sm);">
                  <div style="font-size:0.76rem;font-weight:800;color:var(--text-secondary);">${s.name}</div>
                  <div style="display:flex;justify-content:space-between;align-items:baseline;margin-top:0.25rem;">
                    <span style="font-size:1.1rem;font-weight:900;color:var(--text-primary);">${s.correct}/${s.total}</span>
                    <span style="font-size:0.85rem;font-weight:900;color:${color};">${s.accuracy}%</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- 3. ĐIỂM MẠNH & CẦN CẢI THIỆN (Strengths & Weaknesses) -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:0.85rem;margin-bottom:1.25rem;">
          <!-- Strengths -->
          <div style="background:rgba(16,185,129,0.06);border:1.5px solid var(--emerald);border-radius:var(--radius-md);padding:0.85rem;">
            <div style="font-size:0.85rem;font-weight:900;color:var(--emerald);margin-bottom:0.45rem;display:flex;align-items:center;gap:0.35rem;">
              <span>🌟</span> <span>ĐIỂM MẠNH (≥ 80%):</span>
            </div>
            ${evaluation.strengths.length ? `
              <ul style="margin:0;padding-left:1.2rem;font-size:0.82rem;font-weight:700;color:var(--text-primary);line-height:1.6;">
                ${evaluation.strengths.map(st => `<li>${st.name}: <strong style="color:var(--emerald);">${st.accuracy}%</strong> (${st.correct}/${st.total} câu)</li>`).join('')}
              </ul>
            ` : `<div style="font-size:0.8rem;color:var(--text-secondary);font-style:italic;">Chưa có phần/kỹ năng đạt mốc điểm mạnh (cần tối thiểu 5 câu và ≥ 80%).</div>`}
          </div>

          <!-- Weaknesses -->
          <div style="background:rgba(244,63,94,0.06);border:1.5px solid var(--rose);border-radius:var(--radius-md);padding:0.85rem;display:flex;flex-direction:column;justify-content:space-between;">
            <div>
              <div style="font-size:0.85rem;font-weight:900;color:var(--rose);margin-bottom:0.45rem;display:flex;align-items:center;gap:0.35rem;">
                <span>⚠️</span> <span>CẦN CẢI THIỆN (< 60%):</span>
              </div>
              ${evaluation.weaknesses.length ? `
                <ul style="margin:0 0 0.5rem;padding-left:1.2rem;font-size:0.82rem;font-weight:700;color:var(--text-primary);line-height:1.6;">
                  ${evaluation.weaknesses.map(w => `<li>${w.name}: <strong style="color:var(--rose);">${w.accuracy}%</strong> (${w.correct}/${w.total} câu)</li>`).join('')}
                </ul>
              ` : `<div style="font-size:0.8rem;color:var(--text-secondary);font-style:italic;margin-bottom:0.5rem;">Không có điểm yếu rõ rệt hoặc chưa đủ bằng chứng (cần tối thiểu 5 câu để đánh giá).</div>`}
            </div>
            <button type="button" class="btn btn-sm btn-primary" onclick="handleStartWeaknessPracticeClick()" style="margin-top:0.4rem;width:100%;font-weight:900;background:var(--rose);border:none;border-radius:var(--radius-sm);box-shadow:0 3px 8px rgba(244,63,94,0.3);cursor:pointer;padding:6px 10px;display:flex;align-items:center;justify-content:center;gap:0.4rem;">
              <span>🎯</span> <span>Luyện Điểm Yếu (${evaluation.weaknesses.length ? evaluation.weaknesses.length + ' chủ đề' : 'Thích ứng'})</span>
            </button>
          </div>
        </div>

        ${trends.hasEnoughData && trends.overall ? `
          <!-- Trends -->
          <div style="background:var(--bg-tertiary);border-radius:var(--radius-md);padding:0.75rem 1rem;margin-bottom:1.25rem;font-size:0.84rem;">
            <div style="font-weight:800;color:var(--indigo);margin-bottom:0.25rem;">📈 Xu Hướng Điểm Số Qua Các Lần Thi:</div>
            <div style="font-weight:700;color:var(--text-primary);">
              Độ chính xác: <strong>${trends.overall.progressionText}</strong>
              <span style="margin-left:0.5rem;font-size:0.8rem;color:${trends.overall.delta >= 0 ? 'var(--emerald)' : 'var(--rose)'};">
                (${trends.overall.delta >= 0 ? '+' : ''}${trends.overall.delta}%)
              </span>
            </div>
          </div>
        ` : ''}

        <!-- 4. LỊCH SỬ CÁC BÀI THI GẦN NHẤT (Recent Attempts History) -->
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
            <div style="font-size:0.88rem;font-weight:800;color:var(--text-primary);">📝 Lịch Sử Các Bài Thi Gần Nhất:</div>
            <button type="button" class="btn btn-secondary btn-sm" onclick="handleOpenWrongQuestionsModal()" style="font-size:0.75rem;padding:2px 8px;font-weight:800;border-radius:var(--radius-sm);">
              🔍 Xem Lại Câu Sai
            </button>
          </div>
          <div style="display:flex;flex-direction:column;gap:0.45rem;">
            ${history.map(h => `
              <div style="display:flex;justify-content:space-between;align-items:center;background:var(--bg-tertiary);padding:0.55rem 0.85rem;border-radius:var(--radius-sm);font-size:0.84rem;flex-wrap:wrap;gap:0.5rem;">
                <div style="display:flex;align-items:center;gap:0.5rem;">
                  <strong style="color:var(--text-primary);">${h.label}</strong>
                  <span style="color:var(--text-secondary);font-size:0.76rem;">${new Date(h.submittedAt).toLocaleDateString('vi-VN')}</span>
                </div>
                <div style="display:flex;align-items:center;gap:0.75rem;">
                  <span style="font-weight:800;color:var(--indigo);">${h.scoreText}</span>
                  <span style="font-size:0.78rem;font-weight:800;background:rgba(99,102,241,0.15);color:var(--indigo);padding:1px 6px;border-radius:4px;">${h.accuracy}%</span>
                  <button type="button" class="btn btn-sm btn-secondary" onclick="handleOpenWrongQuestionsModal('${h.id}')" style="font-size:0.72rem;padding:2px 6px;">Xem lỗi</button>
                  <button type="button" class="btn btn-sm btn-primary" onclick="openVactAttemptReview('${h.id}')" style="font-size:0.72rem;padding:2px 6px;background:var(--indigo);border-color:var(--indigo);">Xem lại bài</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  const VACTPerformanceAnalytics = {
    SKILL_NAMES_VI,
    recordAttempt,
    getAttempts,
    getAttemptById,
    clearAttempts,
    setStorageEngine,
    computeSectionAnalytics,
    computeSkillAnalytics,
    getAttemptHistory,
    computeTrends,
    detectStrengthsAndWeaknesses,
    getWrongQuestions,
    renderDashboardHtml
  };

  return VACTPerformanceAnalytics;
});
