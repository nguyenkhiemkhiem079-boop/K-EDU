/**
 * K-EDU V-ACT Core Architecture - Exam Profiles & Validation
 * Target Profiles:
 * 1. VACT_FULL_PROFILE: Official 120-question, 150-minute ĐHQG-HCM exam simulation.
 * 2. VACT_MINI_100_PROFILE: 100-question practice mode for school sessions.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    const taxonomy = require('./taxonomy');
    module.exports = factory(taxonomy);
  } else {
    root.KEDUVACT = root.KEDUVACT || {};
    Object.assign(root.KEDUVACT, factory(root.KEDUVACT));
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

  const isValidSection = taxonomyModule?.isValidSection || (sec => Object.values(VACT_SECTIONS).includes(sec));

  /**
   * Official Full V-ACT 120 Profile
   * 150 minutes, 120 questions across 5 sections.
   */
  const VACT_FULL_PROFILE = Object.freeze({
    id: 'vact_full',
    name: 'V-ACT ĐHQG-HCM Chính Thức',
    totalQuestions: 120,
    timeLimitMinutes: 150,
    sections: Object.freeze({
      [VACT_SECTIONS.VIETNAMESE]: 30,
      [VACT_SECTIONS.ENGLISH]: 30,
      [VACT_SECTIONS.MATH]: 30,
      [VACT_SECTIONS.LOGIC_DATA]: 12,
      [VACT_SECTIONS.SCIENTIFIC_REASONING]: 18
    })
  });

  /**
   * Mini V-ACT 100 Practice Profile
   * Balanced 100-question practice mode.
   */
  const VACT_MINI_100_PROFILE = Object.freeze({
    id: 'vact_mini_100',
    name: 'Mini V-ACT 100 Luyện Tập',
    totalQuestions: 100,
    timeLimitMinutes: 90,
    sections: Object.freeze({
      [VACT_SECTIONS.VIETNAMESE]: 25,
      [VACT_SECTIONS.ENGLISH]: 25,
      [VACT_SECTIONS.MATH]: 25,
      [VACT_SECTIONS.LOGIC_DATA]: 10,
      [VACT_SECTIONS.SCIENTIFIC_REASONING]: 15
    })
  });

  /**
   * Validates an exam profile structure and arithmetic consistency.
   * Ensures sum(sections) === totalQuestions and all section keys are valid.
   * 
   * @param {object} profile
   * @throws {Error} If throwOnError is true and validation fails
   * @returns {{ valid: boolean, sum: number, expected: number, errors: string[] }}
   */
  function validateVACTProfile(profile, throwOnError = false) {
    const errors = [];
    if (!profile || typeof profile !== 'object') {
      errors.push('Profile must be a non-null object');
      if (throwOnError) throw new Error(errors[0]);
      return { valid: false, sum: 0, expected: 0, errors };
    }

    if (!profile.id || typeof profile.id !== 'string') {
      errors.push('Profile "id" must be a non-empty string');
    }

    if (!Number.isInteger(profile.totalQuestions) || profile.totalQuestions <= 0) {
      errors.push(`Profile "totalQuestions" must be a positive integer, got ${profile.totalQuestions}`);
    }

    if (!profile.sections || typeof profile.sections !== 'object') {
      errors.push('Profile "sections" must be an object');
      if (throwOnError) throw new Error(errors.join('; '));
      return { valid: false, sum: 0, expected: profile.totalQuestions || 0, errors };
    }

    let sum = 0;
    for (const [secKey, count] of Object.entries(profile.sections)) {
      if (!isValidSection(secKey)) {
        errors.push(`Unrecognized section key in profile: "${secKey}"`);
      }
      if (!Number.isInteger(count) || count < 0) {
        errors.push(`Section count for "${secKey}" must be a non-negative integer, got ${count}`);
      } else {
        sum += count;
      }
    }

    if (sum !== profile.totalQuestions) {
      errors.push(`Section sum mismatch: sum(${sum}) !== totalQuestions(${profile.totalQuestions})`);
    }

    const valid = errors.length === 0;
    if (!valid && throwOnError) {
      throw new Error(`Profile validation failed for "${profile.id}": ${errors.join(', ')}`);
    }

    return {
      valid,
      sum,
      expected: profile.totalQuestions,
      errors
    };
  }

  // Development assert: Fail loudly if built-in profiles are mathematically inconsistent
  validateVACTProfile(VACT_FULL_PROFILE, true);
  validateVACTProfile(VACT_MINI_100_PROFILE, true);

  return {
    VACT_FULL_PROFILE,
    VACT_MINI_100_PROFILE,
    validateVACTProfile
  };
});
