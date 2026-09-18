/**
 * K-EDU V-ACT Core Architecture - Bank Coverage & Capacity Engine
 * Computes exact unique usable question availability, shortage models, and profile readiness.
 * Pure data integrity: Strictly no inflated numbers, no fake records.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    const taxonomy = require('../taxonomy');
    const profiles = require('../profiles');
    const internalBank = require('./internalBank');
    const deduplicator = require('../quality/deduplicator');
    module.exports = factory(taxonomy, profiles, internalBank, deduplicator);
  } else {
    root.KEDUVACT = root.KEDUVACT || {};
    root.KEDUVACT.bank = root.KEDUVACT.bank || {};
    const coverageModule = factory(root.KEDUVACT, root.KEDUVACT, root.KEDUVACT.bank, root.KEDUVACT.quality);
    Object.assign(root.KEDUVACT.bank, coverageModule);
    Object.assign(root.KEDUVACT, coverageModule);
  }
})(typeof window !== 'undefined' ? window : globalThis, function (taxonomyModule, profilesModule, bankModule, deduplicatorModule) {
  'use strict';

  const VACT_SECTIONS = taxonomyModule?.VACT_SECTIONS || {
    VIETNAMESE: 'vietnamese',
    ENGLISH: 'english',
    MATH: 'math',
    LOGIC_DATA: 'logic_data',
    SCIENTIFIC_REASONING: 'scientific_reasoning'
  };

  const VACT_TAXONOMY = taxonomyModule?.VACT_TAXONOMY || {};
  const VACT_FULL_PROFILE = profilesModule?.VACT_FULL_PROFILE;
  const VACT_MINI_100_PROFILE = profilesModule?.VACT_MINI_100_PROFILE;

  const VACTInternalBank = bankModule?.VACTInternalBank;
  const deduplicateVACTQuestions = deduplicatorModule?.deduplicateVACTQuestions;

  let _cachedSummary = null;
  let _cachedUniqueQuestions = null;

  /**
   * Resets internal coverage cache.
   */
  function clearCoverageCache() {
    _cachedSummary = null;
    _cachedUniqueQuestions = null;
  }

  /**
   * Retrieves or builds the unique usable question array.
   * @returns {Array<object>}
   */
  function getUniqueUsableQuestions() {
    if (_cachedUniqueQuestions) {
      return _cachedUniqueQuestions;
    }

    const allMapped = VACTInternalBank ? VACTInternalBank.query() : [];
    const dedupResult = deduplicateVACTQuestions ? deduplicateVACTQuestions(allMapped) : { uniqueQuestions: allMapped };

    _cachedUniqueQuestions = dedupResult.uniqueQuestions;
    return _cachedUniqueQuestions;
  }

  /**
   * Generates a complete, audited coverage summary of the active question bank.
   * Based strictly on VALID + UNIQUE + USABLE questions.
   *
   * @param {object} [options]
   * @param {boolean} [options.refresh=false]
   * @returns {object}
   */
  function getSummary(options = {}) {
    if (_cachedSummary && !options.refresh) {
      return JSON.parse(JSON.stringify(_cachedSummary));
    }

    const rawBankDiagnostics = VACTInternalBank ? VACTInternalBank.getDiagnostics() : {
      inspected: 0,
      mapped: 0,
      invalid: 0,
      unsupported: 0,
      missingAnswer: 0
    };

    const allMapped = VACTInternalBank ? VACTInternalBank.query() : [];
    const dedup = deduplicateVACTQuestions ? deduplicateVACTQuestions(allMapped) : {
      uniqueQuestions: allMapped,
      duplicateGroups: [],
      totalDuplicatesRemoved: 0
    };

    const uniqueList = dedup.uniqueQuestions;
    _cachedUniqueQuestions = uniqueList;

    // Build section structures
    const sections = {
      [VACT_SECTIONS.VIETNAMESE]: {
        total: 0,
        difficulty: { easy: 0, medium: 0, hard: 0, unclassified: 0 }
      },
      [VACT_SECTIONS.ENGLISH]: {
        total: 0,
        difficulty: { easy: 0, medium: 0, hard: 0, unclassified: 0 }
      },
      [VACT_SECTIONS.MATH]: {
        total: 0,
        difficulty: { easy: 0, medium: 0, hard: 0, unclassified: 0 }
      },
      [VACT_SECTIONS.LOGIC_DATA]: {
        total: 0,
        difficulty: { easy: 0, medium: 0, hard: 0, unclassified: 0 }
      },
      [VACT_SECTIONS.SCIENTIFIC_REASONING]: {
        total: 0,
        difficulty: { easy: 0, medium: 0, hard: 0, unclassified: 0 },
        skills: {
          physics: 0,
          chemistry: 0,
          biology: 0,
          technology: 0,
          economics: 0,
          society: 0,
          interdisciplinary: 0
        }
      }
    };

    let unverifiedSource = 0;
    let unverifiedAnswer = 0;

    for (let i = 0; i < uniqueList.length; i++) {
      const q = uniqueList[i];
      const sec = q.section;

      if (!sections[sec]) {
        continue;
      }

      sections[sec].total++;

      // Difficulty distribution
      const diff = q.difficulty;
      if (['easy', 'medium', 'hard'].includes(diff)) {
        sections[sec].difficulty[diff]++;
      } else {
        sections[sec].difficulty.unclassified++;
      }

      // Scientific Reasoning skill breakdown
      if (sec === VACT_SECTIONS.SCIENTIFIC_REASONING && q.skill) {
        if (sections[sec].skills[q.skill] !== undefined) {
          sections[sec].skills[q.skill]++;
        }
      }

      // Quality flags audit
      if (!q.quality?.sourceVerified) unverifiedSource++;
      if (!q.quality?.answerVerified) unverifiedAnswer++;
    }

    const summary = {
      totalRaw: rawBankDiagnostics.inspected,
      totalMapped: rawBankDiagnostics.mapped,
      totalUniqueUsable: uniqueList.length,
      duplicatesCount: dedup.totalDuplicatesRemoved,
      duplicateGroupsCount: dedup.duplicateGroups.length,
      invalidCount: rawBankDiagnostics.invalid,
      unsupportedCount: rawBankDiagnostics.unsupported,
      sections,
      qualityStatus: {
        usable: uniqueList.length,
        invalid: rawBankDiagnostics.invalid,
        duplicate: dedup.totalDuplicatesRemoved,
        unsupported: rawBankDiagnostics.unsupported,
        unverifiedSource,
        unverifiedAnswer
      },
      duplicateGroups: dedup.duplicateGroups.map(g => ({
        signature: g.signature.slice(0, 80) + '...',
        canonicalId: g.canonicalId,
        duplicateIds: g.duplicateIds,
        count: g.totalCount
      }))
    };

    _cachedSummary = summary;
    return JSON.parse(JSON.stringify(summary));
  }

  /**
   * Looks up available unique usable questions matching given criteria.
   * Never hardcodes arbitrary limits.
   *
   * @param {object} criteria
   * @param {string} [criteria.section]
   * @param {string} [criteria.skill]
   * @param {string} [criteria.difficulty]
   * @returns {{ available: number, section: string|null, skill: string|null, difficulty: string|null }}
   */
  function getCapacity(criteria = {}) {
    const list = getUniqueUsableQuestions();
    const { section, skill, difficulty } = criteria;

    let available = 0;
    for (let i = 0; i < list.length; i++) {
      const q = list[i];
      if (section && q.section !== section) continue;
      if (skill && q.skill !== skill) continue;
      if (difficulty && q.difficulty !== difficulty) continue;
      available++;
    }

    return {
      available,
      section: section || null,
      skill: skill || null,
      difficulty: difficulty || null
    };
  }

  /**
   * Evaluates shortage for a given request against bank capacity.
   *
   * @param {object} params
   * @param {string} [params.scope] "section" | "skill" | "difficulty" | "global"
   * @param {string} [params.section]
   * @param {string} [params.skill]
   * @param {string} [params.difficulty]
   * @param {number} params.requested Number of questions requested
   * @returns {object} Structured shortage object
   */
  function checkShortage(params = {}) {
    const requested = Number.isInteger(params.requested) && params.requested > 0 ? params.requested : 0;
    const capacity = getCapacity({
      section: params.section,
      skill: params.skill,
      difficulty: params.difficulty
    });

    const available = capacity.available;
    const missing = Math.max(0, requested - available);
    const fulfilled = available >= requested;

    let reason = null;
    if (!fulfilled) {
      if (available === 0) {
        reason = 'POOL_SHORTAGE';
      } else if (params.difficulty) {
        reason = 'DIFFICULTY_SHORTAGE';
      } else {
        reason = 'POOL_SHORTAGE';
      }
    }

    return {
      scope: params.scope || (params.skill ? 'skill' : (params.section ? 'section' : 'global')),
      section: params.section || null,
      skill: params.skill || null,
      difficulty: params.difficulty || null,
      requested,
      available,
      missing,
      fulfilled,
      reason
    };
  }

  /**
   * Evaluates readiness of the bank against a specific V-ACT exam profile.
   * Never fills one section using another section.
   *
   * @param {object|string} profileOrId Exam profile object or profile ID ('vact_full' | 'vact_mini_100')
   * @returns {object} Readiness analysis with section shortages
   */
  function getProfileReadiness(profileOrId) {
    let profile = profileOrId;
    if (typeof profileOrId === 'string') {
      if (profileOrId === 'vact_full' || profileOrId === 'full120') {
        profile = VACT_FULL_PROFILE;
      } else if (profileOrId === 'vact_mini_100' || profileOrId === 'mini100') {
        profile = VACT_MINI_100_PROFILE;
      }
    }

    if (!profile || !profile.sections) {
      throw new Error(`Invalid exam profile provided for readiness check: ${JSON.stringify(profileOrId)}`);
    }

    const summary = getSummary();
    const sectionResults = {};
    const shortages = [];
    let allReady = true;
    let totalRequired = 0;
    let totalAvailable = 0;
    let totalMissing = 0;

    for (const [secKey, reqCount] of Object.entries(profile.sections)) {
      totalRequired += reqCount;
      const secSummary = summary.sections[secKey];
      const available = secSummary ? secSummary.total : 0;
      const missing = Math.max(0, reqCount - available);
      const isSecReady = missing === 0;

      if (!isSecReady) {
        allReady = false;
      }

      totalAvailable += Math.min(available, reqCount);
      totalMissing += missing;

      const secShortage = checkShortage({
        scope: 'section',
        section: secKey,
        requested: reqCount
      });

      sectionResults[secKey] = {
        required: reqCount,
        available,
        missing,
        ready: isSecReady,
        reason: secShortage.reason
      };

      if (!isSecReady) {
        shortages.push(secShortage);
      }
    }

    return {
      profileId: profile.id,
      profileName: profile.name,
      ready: allReady,
      totalRequired,
      totalAvailable,
      totalMissing,
      sections: sectionResults,
      shortages
    };
  }

  const VACTCoverage = {
    clearCoverageCache,
    getUniqueUsableQuestions,
    getSummary,
    getCapacity,
    checkShortage,
    getProfileReadiness
  };

  return {
    VACTCoverage
  };
});
