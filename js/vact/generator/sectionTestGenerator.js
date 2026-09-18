/**
 * K-EDU V-ACT Section Mini Test Generator
 * Generates targeted practice exams for a single section or single skill.
 * Features:
 * - Anti-duplication by signature
 * - Recent question exclusion with graceful fallback
 * - Configurable balanced difficulty weighting with demand redistribution
 * - Explicit shortage reporting (never throws generic errors or fabricates questions)
 * - Optional reproducible seed support
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    const taxonomy = require('../taxonomy');
    const signature = require('../quality/signature');
    const coverage = require('../bank/coverage');
    module.exports = factory(taxonomy, signature, coverage);
  } else {
    root.KEDUVACT = root.KEDUVACT || {};
    root.KEDUVACT.generator = root.KEDUVACT.generator || {};
    const gen = factory(root.KEDUVACT, root.KEDUVACT, root.KEDUVACT.bank || root.KEDUVACT);
    Object.assign(root.KEDUVACT.generator, gen);
    Object.assign(root.KEDUVACT, gen);
  }
})(typeof window !== 'undefined' ? window : globalThis, function (taxonomyModule, signatureModule, coverageModule) {
  'use strict';

  const isValidSection = taxonomyModule?.isValidSection || (() => true);
  const isValidSectionSkill = taxonomyModule?.isValidSectionSkill || (() => true);
  const computeVACTQuestionSignature = signatureModule?.computeVACTQuestionSignature || (q => q.id);
  const VACTCoverage = coverageModule?.VACTCoverage;

  /**
   * Centralized balanced difficulty target weights (K-EDU practice heuristic).
   */
  const DEFAULT_BALANCED_WEIGHTS = Object.freeze({
    easy: 0.30,
    medium: 0.50,
    hard: 0.20
  });

  /**
   * Deterministic PRNG (Mulberry32) for reproducible test generation.
   * @param {*} seed
   * @returns {() => number}
   */
  function createPRNG(seed) {
    if (seed === undefined || seed === null) {
      return Math.random;
    }
    let s = 0;
    if (typeof seed === 'number') {
      s = seed >>> 0;
    } else {
      const str = String(seed);
      for (let i = 0; i < str.length; i++) {
        s = (Math.imul(31, s) + str.charCodeAt(i)) >>> 0;
      }
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
   * Shuffles an array in-place using Fisher-Yates with provided PRNG.
   * @param {Array} arr
   * @param {() => number} rng
   * @returns {Array}
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
   * Generates a V-ACT Section Mini Test.
   *
   * @param {object} config
   * @param {string} config.section Target section ID (e.g. 'math', 'scientific_reasoning')
   * @param {string} [config.skill] Optional target skill (e.g. 'physics')
   * @param {number} [config.count=30] Number of questions requested (integer >= 1, no arbitrary cap)
   * @param {string} [config.difficulty='balanced'] 'easy' | 'medium' | 'hard' | 'balanced'
   * @param {Array<string>|Set<string>} [config.excludeSignatures=[]] Signatures of recently seen questions
   * @param {*} [config.seed] Optional seed for reproducible generation
   * @returns {object} Generated test object with questions, shortage diagnostics, and metadata
   */
  function generate(config = {}) {
    if (!config || typeof config !== 'object') {
      throw new TypeError('VACTSectionTestGenerator.generate expects a configuration object');
    }

    const { section, skill, difficulty = 'balanced', seed } = config;
    const requestedCount = config.count !== undefined ? config.count : 30;

    // 1. Validate Section
    if (!section || !isValidSection(section)) {
      throw new Error(`Invalid or unrecognized V-ACT section: "${section}"`);
    }

    // 2. Validate Skill (if provided)
    if (skill && !isValidSectionSkill(section, skill)) {
      throw new Error(`Skill "${skill}" is not valid for section "${section}" in V-ACT taxonomy`);
    }

    // 3. Validate Count: must be integer >= 1, no arbitrary cap
    if (!Number.isInteger(requestedCount) || requestedCount < 1) {
      throw new Error(`Question count must be an integer >= 1, got ${requestedCount}`);
    }

    // 4. Validate Difficulty
    const validDifficulties = ['easy', 'medium', 'hard', 'balanced'];
    if (!validDifficulties.includes(difficulty)) {
      throw new Error(`Difficulty must be one of: ${validDifficulties.join(', ')}`);
    }

    const rng = createPRNG(seed);

    // 5. Query Unique Usable Questions from V-ACT Coverage / Bank layer
    const allUnique = VACTCoverage ? VACTCoverage.getUniqueUsableQuestions() : [];
    const pool = allUnique.filter(q => {
      if (q.section !== section) return false;
      if (skill && q.skill !== skill) return false;
      return true;
    });

    // 6. Handle Recent Questions Exclusion & Graceful Fallback
    const excludeSet = new Set(
      Array.isArray(config.excludeSignatures)
        ? config.excludeSignatures
        : (config.excludeSignatures instanceof Set ? Array.from(config.excludeSignatures) : [])
    );

    const unseenCandidates = [];
    const recentCandidates = [];

    for (let i = 0; i < pool.length; i++) {
      const q = pool[i];
      const sig = computeVACTQuestionSignature(q);
      if (excludeSet.has(sig)) {
        recentCandidates.push(q);
      } else {
        unseenCandidates.push(q);
      }
    }

    let activePool = [];
    let recentFallbackUsed = false;

    if (unseenCandidates.length >= requestedCount) {
      activePool = unseenCandidates;
    } else {
      activePool = [...unseenCandidates];
      if (recentCandidates.length > 0) {
        recentFallbackUsed = true;
        activePool.push(...recentCandidates);
      }
    }

    // 7. Partition active pool by difficulty
    const byDifficulty = {
      easy: [],
      medium: [],
      hard: []
    };

    for (let i = 0; i < activePool.length; i++) {
      const q = activePool[i];
      const diff = q.difficulty || 'medium';
      if (byDifficulty[diff]) {
        byDifficulty[diff].push(q);
      } else {
        byDifficulty.medium.push(q);
      }
    }

    // Shuffle difficulty buckets for randomized selection
    shuffle(byDifficulty.easy, rng);
    shuffle(byDifficulty.medium, rng);
    shuffle(byDifficulty.hard, rng);

    // 8. Difficulty Selection & Balanced Redistribution
    const selected = [];
    const selectedSigs = new Set();

    const targetDistribution = { easy: 0, medium: 0, hard: 0 };
    const actualDistribution = { easy: 0, medium: 0, hard: 0 };
    let redistributed = false;

    if (difficulty === 'balanced') {
      // Calculate target quotas based on balanced weights
      const tEasy = Math.round(requestedCount * DEFAULT_BALANCED_WEIGHTS.easy);
      const tHard = Math.round(requestedCount * DEFAULT_BALANCED_WEIGHTS.hard);
      const tMed = requestedCount - tEasy - tHard;

      targetDistribution.easy = tEasy;
      targetDistribution.medium = tMed;
      targetDistribution.hard = tHard;

      // First pass: collect up to quota from each group
      const pickFromBucket = (diff, needed) => {
        let picked = 0;
        const bucket = byDifficulty[diff];
        for (let i = 0; i < bucket.length && picked < needed; i++) {
          const q = bucket[i];
          const sig = computeVACTQuestionSignature(q);
          if (!selectedSigs.has(sig)) {
            selectedSigs.add(sig);
            selected.push(q);
            actualDistribution[diff]++;
            picked++;
          }
        }
        return picked;
      };

      const pickedEasy = pickFromBucket('easy', tEasy);
      const pickedMed = pickFromBucket('medium', tMed);
      const pickedHard = pickFromBucket('hard', tHard);

      const totalPicked = pickedEasy + pickedMed + pickedHard;
      let remainingNeeded = requestedCount - totalPicked;

      // Second pass: demand redistribution if any group was short
      if (remainingNeeded > 0) {
        redistributed = true;
        // Priority order for surplus filling: medium -> easy -> hard
        const priorityOrder = ['medium', 'easy', 'hard'];
        for (const diff of priorityOrder) {
          if (remainingNeeded <= 0) break;
          const bucket = byDifficulty[diff];
          for (let i = 0; i < bucket.length && remainingNeeded > 0; i++) {
            const q = bucket[i];
            const sig = computeVACTQuestionSignature(q);
            if (!selectedSigs.has(sig)) {
              selectedSigs.add(sig);
              selected.push(q);
              actualDistribution[diff]++;
              remainingNeeded--;
            }
          }
        }
      }
    } else {
      // Exact difficulty mode (easy | medium | hard)
      targetDistribution[difficulty] = requestedCount;
      const bucket = byDifficulty[difficulty];
      for (let i = 0; i < bucket.length && selected.length < requestedCount; i++) {
        const q = bucket[i];
        const sig = computeVACTQuestionSignature(q);
        if (!selectedSigs.has(sig)) {
          selectedSigs.add(sig);
          selected.push(q);
          actualDistribution[difficulty]++;
        }
      }
    }

    // 9. Final Shuffle of chosen questions
    shuffle(selected, rng);

    // 10. Shortage Diagnostics
    const generatedCount = selected.length;
    const missingCount = Math.max(0, requestedCount - generatedCount);
    const shortages = [];

    if (missingCount > 0) {
      let reason = 'POOL_SHORTAGE';
      if (difficulty !== 'balanced') {
        reason = byDifficulty[difficulty].length < requestedCount ? 'DIFFICULTY_SHORTAGE' : 'POOL_SHORTAGE';
      }
      shortages.push({
        scope: skill ? 'skill' : 'section',
        section,
        skill: skill || null,
        difficulty,
        requested: requestedCount,
        available: pool.length,
        generated: generatedCount,
        missing: missingCount,
        reason
      });
    }

    // 11. Return Canonical Generated Test Object
    const testId = `vact_mini_${section}_${Date.now()}_${Math.floor(rng() * 100000).toString(36)}`;

    return {
      id: testId,
      mode: 'section_mini',
      section,
      skill: skill || null,
      requestedCount,
      generatedCount,
      missingCount,
      difficulty,
      questions: selected,
      questionSignatures: selected.map(q => computeVACTQuestionSignature(q)),
      shortages,
      diagnostics: {
        recentFallbackUsed,
        availablePoolSize: pool.length,
        difficultyDistribution: {
          requested: targetDistribution,
          actual: actualDistribution,
          redistributed
        }
      },
      createdAt: new Date().toISOString()
    };
  }

  const SECTION_LABELS_VI = Object.freeze({
    vietnamese: 'Tiếng Việt',
    english: 'Tiếng Anh',
    math: 'Toán học',
    logic_data: 'Tư duy logic & Phân tích số liệu',
    scientific_reasoning: 'Suy luận khoa học'
  });

  /**
   * Converts a generated V-ACT section mini test into a K-EDU Quiz object.
   * Preserves full source provenance, quality metadata, and verified answer keys.
   *
   * @param {object} sectionTest Generated section test object
   * @returns {object} K-EDU Quiz format
   */
  function formatSectionTestAsQuiz(sectionTest) {
    if (!sectionTest || !Array.isArray(sectionTest.questions)) {
      throw new TypeError('formatSectionTestAsQuiz expects a valid section test object');
    }

    const secLabel = SECTION_LABELS_VI[sectionTest.section] || sectionTest.section;
    const title = `V-ACT ${secLabel} Mini ${sectionTest.generatedCount}`;

    const answerKeys = [];
    const questionsList = [];

    for (let i = 0; i < sectionTest.questions.length; i++) {
      const q = sectionTest.questions[i];
      const num = i + 1;

      answerKeys.push({
        num,
        id: q.id,
        type: 'mcq',
        score: 1,
        correct: q.correctAnswer,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || '',
        section: sectionTest.section,
        topic: q.skill || sectionTest.section,
        content: q.question,
        options: q.options || [],
        level: q.difficulty || 'medium',
        source: q.source || null,
        quality: q.quality || null,
        stimulus: q.stimulus || null
      });

      questionsList.push({
        id: q.id,
        num,
        question: q.question,
        options: q.options || [],
        section: sectionTest.section,
        skill: q.skill || null,
        difficulty: q.difficulty,
        stimulus: q.stimulus || null,
        source: q.source || null
      });
    }

    return {
      id: sectionTest.id,
      title,
      subject: 'vact',
      subjectLabel: `V-ACT ${secLabel}`,
      mode: 'section_mini',
      timeLimit: Math.round(sectionTest.generatedCount * 1.5),
      timeLimitMinutes: Math.round(sectionTest.generatedCount * 1.5),
      answerKeys,
      questions: questionsList,
      questionsCount: sectionTest.generatedCount,
      createdAt: sectionTest.createdAt || new Date().toISOString(),
      vactMeta: {
        mode: 'section_mini',
        section: sectionTest.section,
        skill: sectionTest.skill,
        requestedTotal: sectionTest.requestedCount,
        generatedTotal: sectionTest.generatedCount,
        missingTotal: sectionTest.missingCount,
        shortages: sectionTest.shortages
      }
    };
  }

  const VACTSectionTestGenerator = {
    DEFAULT_BALANCED_WEIGHTS,
    generate,
    formatSectionTestAsQuiz
  };

  return {
    VACTSectionTestGenerator,
    generate,
    formatSectionTestAsQuiz
  };
});
