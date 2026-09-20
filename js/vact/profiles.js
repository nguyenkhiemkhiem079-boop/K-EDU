/**
 * K-EDU V-ACT Core Architecture - Exam Profiles & Validation
 * Target Profiles:
 * 1. VACT_MINI_30_PROFILE: K-EDU quick practice mode.
 * 2. VACT_MINI_60_PROFILE: K-EDU practice mode.
 * 3. VACT_MINI_100_PROFILE: 100-question practice mode for school sessions.
 * 4. VACT_FULL_PROFILE: Official 120-question, 150-minute ĐHQG-HCM exam simulation.
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
   * Mini V-ACT 30 K-EDU quick practice profile.
   * This is a K-EDU practice profile, not an official V-ACT structure.
   */
  const VACT_MINI_30_PROFILE = Object.freeze({
    id: 'vact_mini_30',
    name: 'Mini V-ACT 30 Luyện Tập Nhanh',
    totalQuestions: 30,
    timeLimitMinutes: 40,
    sections: Object.freeze({
      [VACT_SECTIONS.VIETNAMESE]: 8,
      [VACT_SECTIONS.ENGLISH]: 8,
      [VACT_SECTIONS.MATH]: 7,
      [VACT_SECTIONS.LOGIC_DATA]: 3,
      [VACT_SECTIONS.SCIENTIFIC_REASONING]: 4
    })
  });

  /**
   * Mini V-ACT 60 K-EDU practice profile.
   */
  const VACT_MINI_60_PROFILE = Object.freeze({
    id: 'vact_mini_60',
    name: 'Mini V-ACT 60 Luyện Tập',
    totalQuestions: 60,
    timeLimitMinutes: 75,
    sections: Object.freeze({
      [VACT_SECTIONS.VIETNAMESE]: 15,
      [VACT_SECTIONS.ENGLISH]: 15,
      [VACT_SECTIONS.MATH]: 15,
      [VACT_SECTIONS.LOGIC_DATA]: 6,
      [VACT_SECTIONS.SCIENTIFIC_REASONING]: 9
    })
  });

  const VACT_PROFILES = Object.freeze({
    vact_mini_30: VACT_MINI_30_PROFILE,
    vact_mini_60: VACT_MINI_60_PROFILE,
    vact_mini_100: VACT_MINI_100_PROFILE,
    vact_full: VACT_FULL_PROFILE
  });

  const VACT_PROFILE_ALIASES = Object.freeze({
    mini30: 'vact_mini_30',
    mini60: 'vact_mini_60',
    mini100: 'vact_mini_100',
    full120: 'vact_full',
    vact_full_120: 'vact_full'
  });

  function resolveVACTProfile(profileOrId) {
    if (typeof profileOrId === 'string') {
      const canonicalId = VACT_PROFILE_ALIASES[profileOrId] || profileOrId;
      return VACT_PROFILES[canonicalId] || null;
    }
    if (profileOrId && typeof profileOrId === 'object' && profileOrId.id) {
      return VACT_PROFILES[profileOrId.id] || null;
    }
    return null;
  }

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
  Object.values(VACT_PROFILES).forEach(profile => validateVACTProfile(profile, true));

  return {
    VACT_PROFILES,
    VACT_PROFILE_ALIASES,
    VACT_MINI_30_PROFILE,
    VACT_MINI_60_PROFILE,
    VACT_FULL_PROFILE,
    VACT_MINI_100_PROFILE,
    resolveVACTProfile,
    validateVACTProfile
  };
});
