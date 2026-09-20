/**
 * Canonical V-ACT topic practice service.
 * UI code delegates coverage, generation, and result normalization here.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    const taxonomy = require('./taxonomy');
    const coverage = require('./bank/coverage');
    const sectionGenerator = require('./generator/sectionTestGenerator');
    const analytics = require('./analytics/performance');
    module.exports = factory(taxonomy, coverage, sectionGenerator, analytics);
  } else {
    root.KEDUVACT = root.KEDUVACT || {};
    const api = factory(root.KEDUVACT, root.KEDUVACT, root.KEDUVACT.generator || root.KEDUVACT, root.KEDUVACT.performanceAnalytics);
    Object.assign(root.KEDUVACT, api);
    root.KEDUVACT.practiceCenter = api.VACTPracticeCenter;
  }
})(typeof window !== 'undefined' ? window : globalThis, function (taxonomyModule, coverageModule, generatorModule, analyticsModule) {
  'use strict';

  const VACT_SECTIONS = taxonomyModule?.VACT_SECTIONS || {};
  const VACT_SECTION_META = taxonomyModule?.VACT_SECTION_META || {};
  const VACT_TAXONOMY = taxonomyModule?.VACT_TAXONOMY || {};
  const VACTCoverage = coverageModule?.VACTCoverage || coverageModule;
  const VACTSectionTestGenerator = generatorModule?.VACTSectionTestGenerator || generatorModule;

  const SECTION_ORDER = Object.freeze([
    VACT_SECTIONS.VIETNAMESE || 'vietnamese',
    VACT_SECTIONS.ENGLISH || 'english',
    VACT_SECTIONS.MATH || 'math',
    VACT_SECTIONS.LOGIC_DATA || 'logic_data',
    VACT_SECTIONS.SCIENTIFIC_REASONING || 'scientific_reasoning'
  ]);
  const DIFFICULTIES = Object.freeze(['mixed', 'balanced', 'easy', 'medium', 'hard']);
  const ECONOMICS_ALIAS = 'economics';
  const canonicalSkill = skill => skill === ECONOMICS_ALIAS ? 'economics_law' : skill;

  function getSkillCoverage(section, skill) {
    const canonical = canonicalSkill(skill);
    const questions = VACTCoverage?.getUniqueUsableQuestions?.() || [];
    const pool = questions.filter(q => q.section === section && (!skill || q.skill === skill || q.skill === canonical));
    const difficulty = { easy: 0, medium: 0, hard: 0, unclassified: 0 };
    pool.forEach(q => { difficulty[q.difficulty] !== undefined ? difficulty[q.difficulty]++ : difficulty.unclassified++; });
    const classified = difficulty.easy + difficulty.medium + difficulty.hard;
    return {
      section,
      skill: skill || null,
      canonicalSkill: canonical,
      available: pool.length,
      usable: pool.length,
      difficulty,
      classified,
      hasProductionQuestions: pool.length > 0,
      supportedDifficulties: classified > 0 ? DIFFICULTIES : Object.freeze(['mixed']),
      ready: pool.length > 0
    };
  }

  function getSectionCoverage(section) {
    return getSkillCoverage(section, null);
  }

  function getTopicCoverage() {
    const result = {};
    SECTION_ORDER.forEach(section => {
      result[section] = (VACT_TAXONOMY[section] || []).map(skill => ({
        ...getSkillCoverage(section, skill),
        name: skill
      }));
    });
    return result;
  }

  function getPracticeRequestStatus(options = {}) {
    const section = options.section;
    const skill = options.skill || null;
    const count = Number(options.count);
    const coverage = getSkillCoverage(section, skill);
    const requestedDifficulty = options.difficulty || 'mixed';
    const difficultyAvailable = requestedDifficulty === 'mixed' || requestedDifficulty === 'balanced'
      ? coverage.available
      : coverage.difficulty[requestedDifficulty] || 0;
    const validCount = Number.isInteger(count) && count > 0;
    const complete = validCount && coverage.available >= count && difficultyAvailable >= count;
    return {
      section,
      skill,
      count,
      difficulty: requestedDifficulty,
      coverage,
      difficultyAvailable,
      complete,
      disabledReason: !coverage.available ? 'NO_PRODUCTION_DATA'
        : !validCount ? 'INVALID_COUNT'
          : difficultyAvailable < count ? 'DIFFICULTY_SHORTAGE'
            : coverage.available < count ? 'POOL_SHORTAGE' : null,
      difficultyFallback: (requestedDifficulty === 'balanced' && coverage.classified === 0)
    };
  }

  function generatePractice(options = {}) {
    const section = options.section;
    const skill = options.skill || null;
    const count = Number(options.count);
    const request = getPracticeRequestStatus(options);
    if (!section || !SECTION_ORDER.includes(section)) throw new Error('INVALID_PRACTICE_SECTION');
    if (skill && !(VACT_TAXONOMY[section] || []).includes(skill)) throw new Error('INVALID_PRACTICE_SKILL');
    if (!request.coverage.available) throw new Error('NO_PRODUCTION_DATA');
    if (!Number.isInteger(count) || count < 1) throw new Error('INVALID_PRACTICE_COUNT');
    if (request.coverage.available < count) throw new Error('POOL_SHORTAGE');
    if (['easy', 'medium', 'hard'].includes(request.difficulty) && request.difficultyAvailable < count) {
      throw new Error('DIFFICULTY_SHORTAGE');
    }
    const generated = VACTSectionTestGenerator.generate({
      section,
      skill,
      count,
      difficulty: request.difficulty,
      seed: options.seed
    });
    if (!generated || generated.generatedCount !== count || generated.questions.length !== count || generated.missingCount > 0) {
      throw new Error('PRACTICE_INCOMPLETE');
    }
    return {
      ...generated,
      questionCount: count,
      coverage: request.coverage,
      difficultyFallback: request.difficultyFallback,
      generatedBy: 'VACTSectionTestGenerator'
    };
  }

  function normalizePracticeResult(result = {}) {
    const review = Array.isArray(result.review) ? result.review : [];
    const questionCount = Number(result.questionCount ?? result.generatedCount ?? review.length) || 0;
    const correct = Number(result.correct) || 0;
    const wrong = Number(result.wrong ?? result.incorrect) || 0;
    const accuracy = Number.isFinite(Number(result.accuracy))
      ? Number(result.accuracy)
      : questionCount > 0 ? Math.round((correct / questionCount) * 100) : 0;
    return {
      section: result.section || null,
      skill: result.skill || null,
      questionCount,
      correct,
      wrong,
      incorrect: wrong,
      accuracy,
      timeSpent: Number(result.timeSpent ?? result.duration) || 0,
      questionSignatures: Array.isArray(result.questionSignatures) ? [...result.questionSignatures] : [],
      createdAt: result.createdAt || new Date().toISOString(),
      review: review.map(item => ({ ...item }))
    };
  }

  function savePracticeResult(result, student = {}) {
    const normalized = normalizePracticeResult(result);
    const analytics = analyticsModule || (typeof root !== 'undefined' ? root.KEDUVACT?.performanceAnalytics : null);
    if (analytics?.recordAttempt) {
      return analytics.recordAttempt({
        ...normalized,
        mode: 'topic_practice',
        studentName: student.studentName || student.name,
        studentClass: student.studentClass || student.className,
        studentId: student.studentId,
        generatedCount: normalized.questionCount,
        requestedCount: normalized.questionCount,
        incorrect: normalized.wrong,
        duration: normalized.timeSpent
      });
    }
    return normalized;
  }

  const VACTPracticeCenter = Object.freeze({
    SECTION_ORDER,
    DIFFICULTIES,
    getSkillCoverage,
    getSectionCoverage,
    getTopicCoverage,
    getPracticeRequestStatus,
    generatePractice,
    normalizePracticeResult,
    savePracticeResult,
    sectionMeta: VACT_SECTION_META
  });

  return { VACTPracticeCenter, ...VACTPracticeCenter };
});
