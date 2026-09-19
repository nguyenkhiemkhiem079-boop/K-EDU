/**
 * K-EDU V-ACT Core Architecture - Adaptive Practice & Weakness Generator
 * Integrates Performance Analytics (Phase 8) with Section/Exam generation to:
 * - Generate targeted practice focusing on verified student weaknesses
 * - Enforce minimum evidence thresholds (never classify on 1-2 questions)
 * - Dynamically adjust difficulty based on competency (reinforce fundamentals or elevate challenge)
 * - Implement recent-question intelligence (unseen -> seen long ago -> recently seen fallback)
 * - Preserve student autonomy and transparent recommendations
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    const taxonomy = require('../taxonomy');
    const signature = require('../quality/signature');
    const coverage = require('../bank/coverage');
    const analytics = require('../analytics/performance');
    module.exports = factory(taxonomy, signature, coverage, analytics);
  } else {
    root.KEDUVACT = root.KEDUVACT || {};
    root.KEDUVACT.adaptive = root.KEDUVACT.adaptive || {};
    const mod = factory(
      root.KEDUVACT,
      root.KEDUVACT.quality || root.KEDUVACT,
      root.KEDUVACT.bank || root.KEDUVACT,
      root.KEDUVACT.performanceAnalytics || root.KEDUVACT.analytics?.performance
    );
    Object.assign(root.KEDUVACT.adaptive, mod);
    root.KEDUVACT.generateWeaknessTest = mod.generateWeaknessTest;
    root.KEDUVACT.formatWeaknessExamAsQuiz = mod.formatWeaknessExamAsQuiz;
    root.KEDUVACT.adaptivePractice = mod;
  }
})(typeof window !== 'undefined' ? window : globalThis, function (taxonomyModule, signatureModule, coverageModule, analyticsModule) {
  'use strict';

  const VACT_SECTIONS = taxonomyModule?.VACT_SECTIONS || {
    VIETNAMESE: 'vietnamese',
    ENGLISH: 'english',
    MATH: 'math',
    LOGIC_DATA: 'logic_data',
    SCIENTIFIC_REASONING: 'scientific_reasoning'
  };

  const VACT_SECTION_META = taxonomyModule?.VACT_SECTION_META || {};
  const computeVACTQuestionSignature = signatureModule?.computeVACTQuestionSignature || (q => q.id);
  const VACTCoverage = coverageModule?.VACTCoverage;

  /**
   * Deterministic PRNG for reproducible test generation.
   */
  function createPRNG(seed) {
    if (seed === undefined || seed === null) return Math.random;
    let s = 0;
    if (typeof seed === 'number') s = seed >>> 0;
    else {
      const str = String(seed);
      for (let i = 0; i < str.length; i++) s = (Math.imul(31, s) + str.charCodeAt(i)) >>> 0;
    }
    return function mulberry32() {
      s |= 0;
      s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * Shuffles an array in-place.
   */
  function shuffle(arr, rng = Math.random) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const temp = arr[i];
      arr[i] = arr[j];
      arr[j] = temp;
    }
    return arr;
  }

  /**
   * Computes adaptive difficulty profile based on student's overall accuracy.
   * Transparent, configurable heuristics:
   * - High competency (> 75% accuracy): elevate challenge (20% easy, 50% medium, 30% hard)
   * - Low competency (< 50% accuracy): reinforce fundamentals (50% easy, 40% medium, 10% hard)
   * - Standard competency: balanced (30% easy, 50% medium, 20% hard)
   *
   * @param {number} accuracy
   * @returns {object} { easy: number, medium: number, hard: number, profileName: string }
   */
  function computeAdaptiveDifficultyWeights(accuracy) {
    if (typeof accuracy === 'number' && accuracy >= 75) {
      return {
        easy: 0.20,
        medium: 0.50,
        hard: 0.30,
        profileName: 'Nâng cao thử thách (Khá - Giỏi)'
      };
    }
    if (typeof accuracy === 'number' && accuracy < 50) {
      return {
        easy: 0.50,
        medium: 0.40,
        hard: 0.10,
        profileName: 'Củng cố nền tảng (Cần bồi dưỡng)'
      };
    }
    return {
      easy: 0.30,
      medium: 0.50,
      hard: 0.20,
      profileName: 'Cân bằng tiêu chuẩn'
    };
  }

  /**
   * Recent-Question Intelligence:
   * Tiers questions into:
   * 1. Unseen: never seen in past attempts
   * 2. Seen long ago: seen in earlier attempts (> 24 hours ago or > 2 attempts back)
   * 3. Recently seen: seen in the most recent attempt
   *
   * Selects tier 1 first, then tier 2, and falls back to tier 3 only if necessary.
   *
   * @param {Array<object>} pool Candidate questions
   * @param {Array<object>} attempts Past attempts
   * @param {number} count Required count
   * @param {Function} rng PRNG
   * @returns {Array<object>} Selected questions
   */
  function selectQuestionsWithRecentIntelligence(pool, attempts = [], count = 30, rng = Math.random) {
    if (!pool.length || count <= 0) return [];

    // Chronologically sorted attempts
    const sortedAttempts = [...attempts].sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));
    const recentAttempt = sortedAttempts[sortedAttempts.length - 1];
    const recentSignatures = new Set(recentAttempt?.questionSignatures || []);

    const allSeenSignatures = new Set();
    const seenLongAgoSignatures = new Set();

    for (let i = 0; i < sortedAttempts.length; i++) {
      const att = sortedAttempts[i];
      const isLatest = (i === sortedAttempts.length - 1);
      const sigs = att.questionSignatures || [];
      sigs.forEach(s => {
        allSeenSignatures.add(s);
        if (!isLatest) {
          seenLongAgoSignatures.add(s);
        }
      });
    }

    const tier1Unseen = [];
    const tier2SeenLongAgo = [];
    const tier3RecentlySeen = [];

    for (const q of pool) {
      // Attempt history stores the ingestion signature; use it only for recency
      // bookkeeping. Fuzzy duplicate comparison always derives content directly.
      const sig = q.signature || computeVACTQuestionSignature(q);
      if (!allSeenSignatures.has(sig)) {
        tier1Unseen.push(q);
      } else if (seenLongAgoSignatures.has(sig) && !recentSignatures.has(sig)) {
        tier2SeenLongAgo.push(q);
      } else {
        tier3RecentlySeen.push(q);
      }
    }

    shuffle(tier1Unseen, rng);
    shuffle(tier2SeenLongAgo, rng);
    shuffle(tier3RecentlySeen, rng);

    const selected = [];

    // 1. Take from Unseen
    for (const q of tier1Unseen) {
      if (selected.length < count) selected.push(q);
      else break;
    }

    // 2. Take from Seen Long Ago
    if (selected.length < count) {
      for (const q of tier2SeenLongAgo) {
        if (selected.length < count) selected.push(q);
        else break;
      }
    }

    // 3. Fallback to Recently Seen only when necessary
    if (selected.length < count) {
      for (const q of tier3RecentlySeen) {
        if (selected.length < count) selected.push(q);
        else break;
      }
    }

    return selected;
  }

  /**
   * Generates an adaptive weakness practice test targeting identified areas of improvement.
   *
   * @param {object} options
   * @param {object|string} options.studentId Student identifier or query object
   * @param {number} [options.count=30] Total question count requested
   * @param {number} [options.minimumQuestions=5] Minimum questions required to declare a weakness
   * @param {number} [options.minimumAttempts=1] Minimum attempts required
   * @param {number} [options.weaknessThreshold=60] Accuracy percentage threshold
   * @param {boolean} [options.adaptiveDifficulty=true] Whether to adapt difficulty
   * @param {*} [options.seed] Seed for reproducible PRNG
   * @returns {object} Weakness test generation result
   */
  function generateWeaknessTest(options = {}) {
    if (!options || typeof options !== 'object') {
      throw new TypeError('generateWeaknessTest expects an options object');
    }

    const studentQuery = options.studentId || options.studentQuery || {};
    const requestedCount = Number.isInteger(options.count) && options.count > 0 ? options.count : 30;
    const minimumQuestions = Number.isInteger(options.minimumQuestions) ? options.minimumQuestions : 5;
    const minimumAttempts = Number.isInteger(options.minimumAttempts) ? options.minimumAttempts : 1;
    const weaknessThreshold = Number.isInteger(options.weaknessThreshold) ? options.weaknessThreshold : 60;
    const useAdaptiveDiff = options.adaptiveDifficulty !== undefined ? Boolean(options.adaptiveDifficulty) : true;
    const seed = options.seed;
    const rng = createPRNG(seed);

    // 1. Fetch student attempts from performance analytics
    const attempts = analyticsModule ? analyticsModule.getAttempts(studentQuery) : [];

    // Guard: minimum attempts threshold
    if (attempts.length < minimumAttempts) {
      return {
        success: false,
        hasWeaknesses: false,
        reason: 'INSUFFICIENT_ATTEMPTS',
        message: `Cần hoàn thành tối thiểu ${minimumAttempts} bài luyện tập để hệ thống có đủ dữ liệu nhận diện điểm yếu.`,
        attemptsCompleted: attempts.length,
        minimumAttemptsRequired: minimumAttempts,
        questions: []
      };
    }

    // 2. Detect strengths and weaknesses with strict evidence threshold
    const evalResult = analyticsModule ? analyticsModule.detectStrengthsAndWeaknesses(attempts, {
      minQuestions: minimumQuestions,
      weaknessThreshold: weaknessThreshold
    }) : { strengths: [], weaknesses: [], insufficientEvidence: [] };

    // Filter to actionable weaknesses
    const weakTopics = evalResult.weaknesses || [];

    if (!weakTopics.length) {
      return {
        success: false,
        hasWeaknesses: false,
        reason: 'NO_VERIFIED_WEAKNESSES',
        message: 'Hiện tại bạn chưa có điểm yếu rõ rệt nào cần cải thiện! Bạn đang làm rất tốt hoặc chưa đủ số lượng câu để đánh giá.',
        strengths: evalResult.strengths,
        insufficientEvidence: evalResult.insufficientEvidence,
        attemptsCompleted: attempts.length,
        questions: []
      };
    }

    // 3. Compute adaptive difficulty weights
    const totalQuestions = attempts.reduce((acc, a) => acc + (a.generatedCount || 0), 0);
    const totalCorrect = attempts.reduce((acc, a) => acc + (a.correct || 0), 0);
    const overallAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 60;
    const difficultyWeights = useAdaptiveDiff
      ? computeAdaptiveDifficultyWeights(overallAccuracy)
      : { easy: 0.30, medium: 0.50, hard: 0.20, profileName: 'Cân bằng tiêu chuẩn' };

    // 4. Allocate quotas per weak topic
    const quotaPerTopic = Math.max(1, Math.floor(requestedCount / weakTopics.length));
    const allBankQuestions = VACTCoverage ? VACTCoverage.getUniqueUsableQuestions() : [];

    const targetedQuestions = [];
    const topicBreakdown = [];

    for (let i = 0; i < weakTopics.length; i++) {
      const topic = weakTopics[i];
      const isLast = (i === weakTopics.length - 1);
      const needed = isLast ? Math.max(1, requestedCount - targetedQuestions.length) : quotaPerTopic;

      // Filter bank candidates matching topic
      const topicCandidates = allBankQuestions.filter(q => {
        if (topic.type === 'skill') {
          return q.section === topic.section && q.skill === topic.key.split('.')[1];
        }
        return q.section === topic.key;
      });

      // Filter by recent question intelligence
      const chosen = selectQuestionsWithRecentIntelligence(topicCandidates, attempts, needed, rng);

      topicBreakdown.push({
        name: topic.name,
        type: topic.type,
        key: topic.key,
        currentAccuracy: topic.accuracy,
        requestedQuota: needed,
        delivered: chosen.length
      });

      for (const q of chosen) {
        if (targetedQuestions.length < requestedCount) {
          targetedQuestions.push(q);
        }
      }
    }

    // If still short of requested count, pull general reinforcements from weak sections
    if (targetedQuestions.length < requestedCount) {
      const weakSectionKeys = new Set(weakTopics.map(t => t.section || t.key));
      const reinforcementPool = allBankQuestions.filter(q => weakSectionKeys.has(q.section));
      const alreadyChosenSignatures = new Set(targetedQuestions.map(q => computeVACTQuestionSignature(q)));
      const candidates = reinforcementPool.filter(q => !alreadyChosenSignatures.has(computeVACTQuestionSignature(q)));

      const extraNeeded = requestedCount - targetedQuestions.length;
      const extraChosen = selectQuestionsWithRecentIntelligence(candidates, attempts, extraNeeded, rng);
      targetedQuestions.push(...extraChosen);
    }

    // Assign sequential numbers
    const numberedQuestions = targetedQuestions.map((q, idx) => ({
      ...q,
      num: idx + 1
    }));

    const testId = `vact_weakness_${Date.now()}_${Math.floor(rng() * 9000 + 1000)}`;

    return {
      success: true,
      hasWeaknesses: true,
      testId,
      mode: 'weakness_practice',
      name: 'Luyện Tập Điểm Yếu V-ACT',
      requestedCount,
      generatedCount: numberedQuestions.length,
      isComplete: numberedQuestions.length >= requestedCount,
      overallStudentAccuracy: overallAccuracy,
      difficultyProfile: difficultyWeights,
      targetedWeaknesses: weakTopics,
      topicBreakdown,
      questions: numberedQuestions,
      timeLimitMinutes: Math.round(numberedQuestions.length * 1.25), // ~75s per question
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Converts a generated weakness test into K-EDU's standard quiz session format.
   * Enables direct execution in startStudentExamSession().
   *
   * @param {object} weaknessTest Result from generateWeaknessTest
   * @returns {object} Quiz object compatible with K-EDU exam runner
   */
  function formatWeaknessExamAsQuiz(weaknessTest) {
    if (!weaknessTest || !Array.isArray(weaknessTest.questions)) {
      throw new TypeError('formatWeaknessExamAsQuiz expects a valid weaknessTest object');
    }

    const weakNames = weaknessTest.targetedWeaknesses.map(w => w.name).join(', ');
    const title = `🎯 Luyện Điểm Yếu: ${weakNames || 'Tổng Hợp'}`;

    return {
      id: weaknessTest.testId,
      examId: weaknessTest.testId,
      examKey: weaknessTest.testId,
      title,
      mode: 'weakness_practice',
      subjectLabel: 'V-ACT Luyện Điểm Yếu',
      isVactSectionMini: true,
      isVactWeakness: true,
      timeLimitMinutes: weaknessTest.timeLimitMinutes || Math.round(weaknessTest.questions.length * 1.25),
      totalQuestions: weaknessTest.generatedCount,
      targetedWeaknesses: weaknessTest.targetedWeaknesses,
      questions: weaknessTest.questions.map(q => ({
        num: q.num,
        id: q.id,
        signature: q.signature || computeVACTQuestionSignature(q),
        section: q.section,
        skill: q.skill,
        difficulty: q.difficulty,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || ''
      }))
    };
  }

  return {
    generateWeaknessTest,
    formatWeaknessExamAsQuiz,
    computeAdaptiveDifficultyWeights,
    selectQuestionsWithRecentIntelligence
  };
});
