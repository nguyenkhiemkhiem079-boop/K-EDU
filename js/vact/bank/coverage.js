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

  const VACT_BANK_TARGETS = Object.freeze({
    [VACT_SECTIONS.VIETNAMESE]: 600,
    [VACT_SECTIONS.ENGLISH]: 600,
    [VACT_SECTIONS.MATH]: 600,
    [VACT_SECTIONS.LOGIC_DATA]: 240,
    [VACT_SECTIONS.SCIENTIFIC_REASONING]: 360,
    TOTAL: 2400
  });

  const VACT_SCIENTIFIC_TARGETS = Object.freeze({
    physics: 40,
    chemistry: 40,
    biology: 40,
    history: 40,
    geography: 40,
    economics_law: 40,
    technology: 40,
    society: 40,
    interdisciplinary: 40
  });

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
          history: 0,
          geography: 0,
          economics_law: 0,
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

    const debugReport = {
      vietnamese: `${sectionResults[VACT_SECTIONS.VIETNAMESE]?.available ?? 0}/${sectionResults[VACT_SECTIONS.VIETNAMESE]?.required ?? 0}`,
      english: `${sectionResults[VACT_SECTIONS.ENGLISH]?.available ?? 0}/${sectionResults[VACT_SECTIONS.ENGLISH]?.required ?? 0}`,
      math: `${sectionResults[VACT_SECTIONS.MATH]?.available ?? 0}/${sectionResults[VACT_SECTIONS.MATH]?.required ?? 0}`,
      logic_data: `${sectionResults[VACT_SECTIONS.LOGIC_DATA]?.available ?? 0}/${sectionResults[VACT_SECTIONS.LOGIC_DATA]?.required ?? 0}`,
      scientific_reasoning: `${sectionResults[VACT_SECTIONS.SCIENTIFIC_REASONING]?.available ?? 0}/${sectionResults[VACT_SECTIONS.SCIENTIFIC_REASONING]?.required ?? 0}`
    };

    return {
      profileId: profile.id,
      profileName: profile.name,
      ready: allReady,
      totalRequired,
      totalAvailable,
      totalMissing,
      sections: sectionResults,
      shortages,
      debugReport
    };
  }

  /**
   * Computes multi-tier coverage matrix across Internal and Remote sources.
   * Reports Internal, Remote, and Combined unique question counts per section and skill.
   *
   * @param {object} [options={}]
   * @returns {Promise<object>}
   */
  async function getCombinedCoverage(options = {}) {
    let sm = null;
    if (typeof require === 'function') {
      try {
        const sourcesMod = require('../sources/sourceManager');
        sm = sourcesMod?.sourceManager;
      } catch (_) {}
    }
    if (!sm && typeof window !== 'undefined' && window.KEDUVACT?.sourceManager) {
      sm = window.KEDUVACT.sourceManager;
    }
    if (!sm && typeof globalThis !== 'undefined' && globalThis.KEDUVACT?.sourceManager) {
      sm = globalThis.KEDUVACT.sourceManager;
    }

    if (sm && typeof sm.getCombinedCoverage === 'function') {
      return await sm.getCombinedCoverage(options);
    }

    // Fallback if source manager is not yet initialized
    const internalSummary = getSummary(options);
    return {
      summary: {
        internalTotal: internalSummary.totalUniqueUsable,
        remoteTotal: 0,
        combinedRawTotal: internalSummary.totalUniqueUsable,
        combinedUniqueTotal: internalSummary.totalUniqueUsable,
        crossSourceDuplicatesRemoved: 0
      },
      sections: internalSummary.sections
    };
  }

  /**
   * Generates a deep multi-tier breakdown of the active bank:
   * section -> skill -> subSkill -> difficulty.
   *
   * @param {object} [options={}]
   * @returns {object}
   */
  function getDeepCoverage(options = {}) {
    const list = getUniqueUsableQuestions();
    const deep = {};

    for (let i = 0; i < list.length; i++) {
      const q = list[i];
      const sec = q.section || 'unclassified';
      const sk = q.skill || 'unclassified';
      const sub = q.subSkill || 'general';
      const diff = q.difficulty || 'unclassified';

      if (!deep[sec]) deep[sec] = {};
      if (!deep[sec][sk]) deep[sec][sk] = {};
      if (!deep[sec][sk][sub]) {
        deep[sec][sk][sub] = { easy: 0, medium: 0, hard: 0, unclassified: 0, total: 0 };
      }

      if (deep[sec][sk][sub][diff] !== undefined) {
        deep[sec][sk][sub][diff]++;
      } else {
        deep[sec][sk][sub].unclassified++;
      }
      deep[sec][sk][sub].total++;
    }

    return deep;
  }

  /**
   * Computes bank coverage gaps against standard bank-health targets (2,400 total).
   * Identifies section deficits and scientific skill deficits.
   *
   * @param {object} [options={}]
   * @param {object} [options.bankTargets]
   * @param {object} [options.scientificTargets]
   * @returns {Array<{ section: string, skill?: string, target: number, available: number, missing: number, deficitPct: number }>}
   */
  function getGaps(options = {}) {
    const summary = getSummary(options);
    const bankTargets = options.bankTargets || VACT_BANK_TARGETS;
    const sciTargets = options.scientificTargets || VACT_SCIENTIFIC_TARGETS;

    const gaps = [];

    // 1. Section-level gaps
    for (const [sec, target] of Object.entries(bankTargets)) {
      if (sec === 'TOTAL') continue;
      const available = summary.sections[sec] ? summary.sections[sec].total : 0;
      const missing = Math.max(0, target - available);
      const deficitPct = target > 0 ? Math.round((missing / target) * 1000) / 10 : 0;
      gaps.push({
        section: sec,
        target,
        available,
        missing,
        deficitPct
      });
    }

    // 2. Scientific skill-level gaps
    const sciSkills = summary.sections[VACT_SECTIONS.SCIENTIFIC_REASONING]?.skills || {};
    for (const [skill, target] of Object.entries(sciTargets)) {
      const available = sciSkills[skill] || 0;
      const missing = Math.max(0, target - available);
      const deficitPct = target > 0 ? Math.round((missing / target) * 1000) / 10 : 0;
      gaps.push({
        section: VACT_SECTIONS.SCIENTIFIC_REASONING,
        skill,
        target,
        available,
        missing,
        deficitPct
      });
    }

    // Sort descending by missing count
    gaps.sort((a, b) => b.missing - a.missing);

    return gaps;
  }

  /**
   * Prioritizes question sources or sections based on active bank deficits.
   * Deprioritizes surplus sections (e.g. Math when target is exceeded)
   * and highlights sections/skills with the highest deficit.
   *
   * @param {Array<object>} [candidateSources=null]
   * @param {object} [options={}]
   * @returns {object|Array<object>}
   */
  function getImportPriorities(candidateSources = null, options = {}) {
    const gaps = getGaps(options);
    const sectionGaps = gaps.filter(g => !g.skill);
    const skillGaps = gaps.filter(g => g.skill);

    if (Array.isArray(candidateSources) && candidateSources.length > 0) {
      return candidateSources.map(src => {
        let score = 0;
        const reasons = [];

        const targetSections = Array.isArray(src.targetSections) ? src.targetSections : (
          src.section ? [src.section] : Object.values(VACT_SECTIONS)
        );

        for (const sec of targetSections) {
          const secGap = sectionGaps.find(g => g.section === sec);
          if (secGap && secGap.missing > 0) {
            score += Math.min(secGap.missing, 100) * (secGap.deficitPct / 100);
            reasons.push(`${sec}: missing ${secGap.missing} (${secGap.deficitPct}%)`);
          } else {
            reasons.push(`${sec}: surplus / target met`);
          }
        }

        return {
          sourceId: src.sourceId || src.id,
          provider: src.provider || 'unknown',
          sourceType: src.sourceType || 'unknown',
          priorityScore: Math.round(score * 10) / 10,
          recommendation: score > 50 ? 'HIGH_PRIORITY' : (score > 10 ? 'MEDIUM_PRIORITY' : 'DEPRIORITIZED'),
          reasons
        };
      }).sort((a, b) => b.priorityScore - a.priorityScore);
    }

    return {
      topSectionDeficits: sectionGaps.filter(g => g.missing > 0),
      topSkillDeficits: skillGaps.filter(g => g.missing > 0),
      deprioritizedSections: sectionGaps.filter(g => g.missing === 0).map(g => g.section)
    };
  }

  const VACTCoverage = {
    VACT_BANK_TARGETS,
    VACT_SCIENTIFIC_TARGETS,
    clearCoverageCache,
    getUniqueUsableQuestions,
    getSummary,
    getCapacity,
    checkShortage,
    getProfileReadiness,
    getCombinedCoverage,
    getDeepCoverage,
    getGaps,
    getImportPriorities
  };

  return {
    VACT_BANK_TARGETS,
    VACT_SCIENTIFIC_TARGETS,
    VACTCoverage
  };
});
