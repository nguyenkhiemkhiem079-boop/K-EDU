/**
 * K-EDU V-ACT Core Architecture - Internal Bank Query & Diagnostics Engine
 * Provides filtered access to adapted V-ACT questions without duplicating physical bank files.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    const taxonomy = require('../taxonomy');
    const adapter = require('./adapter');
    module.exports = factory(taxonomy, adapter);
  } else {
    root.KEDUVACT = root.KEDUVACT || {};
    root.KEDUVACT.bank = root.KEDUVACT.bank || {};
    const internalBank = factory(root.KEDUVACT, root.KEDUVACT.bank);
    Object.assign(root.KEDUVACT.bank, internalBank);
    Object.assign(root.KEDUVACT, internalBank);
  }
})(typeof window !== 'undefined' ? window : globalThis, function (taxonomyModule, adapterModule) {
  'use strict';

  const VACT_SECTIONS = taxonomyModule?.VACT_SECTIONS || {
    VIETNAMESE: 'vietnamese',
    ENGLISH: 'english',
    MATH: 'math',
    LOGIC_DATA: 'logic_data',
    SCIENTIFIC_REASONING: 'scientific_reasoning'
  };

  const adaptLegacyQuestion = adapterModule?.adaptLegacyQuestion;
  const mapLegacySectionAndSkill = adapterModule?.mapLegacySectionAndSkill;

  let _customRawBank = null;
  let _cachedIndexedQuestions = null;
  let _cachedDiagnostics = null;

  /**
   * Resolves the active raw question bank array.
   * Checks custom registered bank, window.DocumentQuestionBank, or Node require.
   *
   * @returns {Array<object>}
   */
  function getRawQuestions() {
    if (Array.isArray(_customRawBank)) {
      return _customRawBank;
    }
    if (typeof window !== 'undefined' && window.DocumentQuestionBank && Array.isArray(window.DocumentQuestionBank.questions)) {
      return window.DocumentQuestionBank.questions;
    }
    if (typeof globalThis !== 'undefined' && globalThis.DocumentQuestionBank && Array.isArray(globalThis.DocumentQuestionBank.questions)) {
      return globalThis.DocumentQuestionBank.questions;
    }
    if (typeof require === 'function') {
      try {
        const docBank = require('../../documentQuestionBank');
        if (docBank && Array.isArray(docBank.questions)) {
          return docBank.questions;
        }
      } catch (_) {}
    }
    return [];
  }

  /**
   * Sets or overrides the raw question array (useful for isolated testing).
   * Automatically clears cache.
   *
   * @param {Array<object>|null} rawArray
   */
  function setRawBank(rawArray) {
    _customRawBank = Array.isArray(rawArray) ? rawArray : null;
    clearCache();
  }

  /**
   * Clears internal query index cache.
   */
  function clearCache() {
    _cachedIndexedQuestions = null;
    _cachedDiagnostics = null;
  }

  /**
   * Indexes and adapts all eligible raw questions once on-demand.
   * Guarantees 0 raw mutation and returns only validated questions.
   */
  function buildIndex() {
    if (_cachedIndexedQuestions) {
      return _cachedIndexedQuestions;
    }

    const rawList = getRawQuestions();
    const mappedQuestions = [];
    const diagnostics = {
      inspected: rawList.length,
      mapped: 0,
      invalid: 0,
      unsupported: 0,
      missingAnswer: 0,
      missingSection: 0,
      bySection: {
        [VACT_SECTIONS.VIETNAMESE]: { inspected: 0, mapped: 0, invalid: 0 },
        [VACT_SECTIONS.ENGLISH]: { inspected: 0, mapped: 0, invalid: 0 },
        [VACT_SECTIONS.MATH]: { inspected: 0, mapped: 0, invalid: 0 },
        [VACT_SECTIONS.LOGIC_DATA]: { inspected: 0, mapped: 0, invalid: 0 },
        [VACT_SECTIONS.SCIENTIFIC_REASONING]: {
          inspected: 0,
          mapped: 0,
          invalid: 0,
          byDiscipline: {
            physics: { mapped: 0, invalid: 0 },
            chemistry: { mapped: 0, invalid: 0 },
            biology: { mapped: 0, invalid: 0 }
          }
        }
      }
    };

    for (let i = 0; i < rawList.length; i++) {
      const raw = rawList[i];
      if (!raw || typeof raw !== 'object') {
        diagnostics.invalid++;
        continue;
      }

      // Check answer existence
      const hasAnswer = raw.correctAnswer !== undefined || raw.answer !== undefined || raw.correct !== undefined;
      if (!hasAnswer || raw.correctAnswer === null || raw.correctAnswer === '') {
        diagnostics.missingAnswer++;
      }

      // Track section mapping
      const mapping = mapLegacySectionAndSkill(raw);
      if (!mapping.section) {
        if (mapping.status.startsWith('unsupported')) {
          diagnostics.unsupported++;
        } else {
          diagnostics.missingSection++;
        }
        continue;
      }

      const sec = mapping.section;
      if (diagnostics.bySection[sec]) {
        diagnostics.bySection[sec].inspected++;
      }

      const res = adaptLegacyQuestion(raw);
      if (res.success && res.question) {
        mappedQuestions.push(res.question);
        diagnostics.mapped++;
        if (diagnostics.bySection[sec]) {
          diagnostics.bySection[sec].mapped++;
          if (sec === VACT_SECTIONS.SCIENTIFIC_REASONING && res.question.skill) {
            const disc = res.question.skill;
            if (diagnostics.bySection[sec].byDiscipline[disc]) {
              diagnostics.bySection[sec].byDiscipline[disc].mapped++;
            }
          }
        }
      } else {
        diagnostics.invalid++;
        if (diagnostics.bySection[sec]) {
          diagnostics.bySection[sec].invalid++;
          if (sec === VACT_SECTIONS.SCIENTIFIC_REASONING && mapping.skill) {
            const disc = mapping.skill;
            if (diagnostics.bySection[sec].byDiscipline[disc]) {
              diagnostics.bySection[sec].byDiscipline[disc].invalid++;
            }
          }
        }
      }
    }

    _cachedIndexedQuestions = mappedQuestions;
    _cachedDiagnostics = diagnostics;
    return _cachedIndexedQuestions;
  }

  /**
   * Queries V-ACT questions matching specified section, skill, and difficulty.
   *
   * @param {object} filter
   * @param {string} [filter.section] V-ACT section ID
   * @param {string} [filter.skill] Specific taxonomy skill
   * @param {string} [filter.difficulty] "easy" | "medium" | "hard"
   * @param {number} [filter.limit] Maximum number of questions to return
   * @returns {Array<object>} Array of validated V-ACT question objects
   */
  function query(filter = {}) {
    const list = buildIndex();
    const { section, skill, difficulty, limit } = filter;

    const filtered = list.filter(q => {
      if (section && q.section !== section) return false;
      if (skill && q.skill !== skill) return false;
      if (difficulty && q.difficulty !== difficulty) return false;
      return true;
    });

    if (typeof limit === 'number' && limit > 0) {
      return filtered.slice(0, limit);
    }
    return filtered;
  }

  /**
   * Returns comprehensive diagnostic statistics for the legacy bank adaptation.
   * @returns {object}
   */
  function getDiagnostics() {
    buildIndex();
    return JSON.parse(JSON.stringify(_cachedDiagnostics));
  }

  /**
   * Returns question availability counts per section and difficulty.
   * @returns {object}
   */
  function getCoverage() {
    const list = buildIndex();
    const coverage = {
      total: list.length,
      sections: {
        [VACT_SECTIONS.VIETNAMESE]: { total: 0, easy: 0, medium: 0, hard: 0 },
        [VACT_SECTIONS.ENGLISH]: { total: 0, easy: 0, medium: 0, hard: 0 },
        [VACT_SECTIONS.MATH]: { total: 0, easy: 0, medium: 0, hard: 0 },
        [VACT_SECTIONS.LOGIC_DATA]: { total: 0, easy: 0, medium: 0, hard: 0 },
        [VACT_SECTIONS.SCIENTIFIC_REASONING]: {
          total: 0,
          easy: 0,
          medium: 0,
          hard: 0,
          disciplines: {
            physics: 0,
            chemistry: 0,
            biology: 0
          }
        }
      }
    };

    for (const q of list) {
      const sec = q.section;
      if (coverage.sections[sec]) {
        coverage.sections[sec].total++;
        if (coverage.sections[sec][q.difficulty] !== undefined) {
          coverage.sections[sec][q.difficulty]++;
        }
        if (sec === VACT_SECTIONS.SCIENTIFIC_REASONING && q.skill) {
          if (coverage.sections[sec].disciplines[q.skill] !== undefined) {
            coverage.sections[sec].disciplines[q.skill]++;
          }
        }
      }
    }

    return coverage;
  }

  const VACTInternalBank = {
    getRawQuestions,
    setRawBank,
    clearCache,
    query,
    getDiagnostics,
    getCoverage
  };

  return {
    VACTInternalBank
  };
});
