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

  let _mode = 'source_backed'; // Default: strict source-backed mode
  let _sourcePriority = ['OFFICIAL', 'FULL_TEST', 'SUBJECT_BANK', 'LEGACY'];
  let _customRawBank = null;
  let _customSourceBackedBank = null;
  let _cachedIndexedQuestions = null;
  let _cachedDiagnostics = null;

  /**
   * Resolves the active raw question bank array based on mode.
   *
   * @returns {Array<object>}
   */
  function getRawQuestions() {
    if (_mode === 'source_backed') {
      if (Array.isArray(_customSourceBackedBank)) {
        return _customSourceBackedBank;
      }
      if (Array.isArray(_customRawBank)) {
        return _customRawBank;
      }
      if (typeof window !== 'undefined' && Array.isArray(window.VACTSourceBank)) {
        return window.VACTSourceBank;
      }
      if (typeof globalThis !== 'undefined' && Array.isArray(globalThis.VACTSourceBank)) {
        return globalThis.VACTSourceBank;
      }
      if (typeof require === 'function') {
        try {
          const fs = require('node:fs');
          const path = require('node:path');
          const dataFilePath = path.resolve(__dirname, '../../../data/vact/questions.json');
          if (fs.existsSync(dataFilePath)) {
            const data = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
            if (Array.isArray(data)) return data;
          }
        } catch (_) {}
      }
      return [];
    }

    // Legacy mode
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
   * Sets custom source-backed bank array.
   * @param {Array<object>|null} bankArray
   */
  function setSourceBackedBank(bankArray) {
    _customSourceBackedBank = Array.isArray(bankArray) ? bankArray : null;
    clearCache();
  }

  /**
   * Sets the bank operating mode: 'source_backed' (default) or 'legacy'.
   * @param {'source_backed'|'legacy'} mode
   */
  function setMode(mode) {
    if (mode !== 'source_backed' && mode !== 'legacy') {
      throw new Error(`Invalid mode "${mode}". Must be "source_backed" or "legacy".`);
    }
    _mode = mode;
    clearCache();
  }

  /**
   * Returns current operating mode.
   * @returns {'source_backed'|'legacy'}
   */
  function getMode() {
    return _mode;
  }

  /**
   * Returns true if bank is operating in strict source-backed mode.
   * @returns {boolean}
   */
  function isSourceBacked() {
    return _mode === 'source_backed';
  }

  /**
   * Sets generator source priority.
   * @param {Array<string>} priorityList
   */
  function setSourcePriority(priorityList) {
    if (Array.isArray(priorityList)) {
      _sourcePriority = [...priorityList];
      clearCache();
    }
  }

  /**
   * Returns current source priority array.
   * @returns {Array<string>}
   */
  function getSourcePriority() {
    return [..._sourcePriority];
  }

  /**
   * Clears internal query index cache.
   */
  function clearCache() {
    _cachedIndexedQuestions = null;
    _cachedDiagnostics = null;
  }

  /**
   * Checks if question has strict production source provenance.
   * @param {object} q
   * @returns {boolean}
   */
  function isProductionSourceBacked(q) {
    if (!q || typeof q !== 'object') return false;
    if (q.status !== 'production') return false;
    if (!q.source || q.source.extractedFromSource !== true) return false;
    if (!q.source.sourceId || !q.source.sourceFile) return false;
    if (!q.quality || q.quality.answerVerified !== true) return false;
    if (!Array.isArray(q.options) || q.options.length !== 4) return false;
    const normalizedOptions = q.options.map(option => String(option || '').replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim().toLowerCase());
    if (new Set(normalizedOptions).size !== normalizedOptions.length) return false;
    for (let i = 0; i < q.options.length; i++) {
      if (typeof q.options[i] !== 'string' || !q.options[i].trim()) return false;
    }
    if (!['A', 'B', 'C', 'D'].includes(q.correctAnswer)) return false;
    return true;
  }

  /**
   * Scores question source category based on priority ranking.
   * Higher score = higher priority.
   * @param {object} q
   * @returns {number}
   */
  function getQuestionPriorityScore(q) {
    const category = (q?.source?.category || (q?.source?.official ? 'OFFICIAL' : 'SUBJECT_BANK')).toUpperCase();
    const index = _sourcePriority.indexOf(category);
    return index >= 0 ? (_sourcePriority.length - index) : 0;
  }

  /**
   * Indexes and adapts all eligible questions on-demand.
   * In 'source_backed' mode: strictly returns authenticated questions with provenance.
   */
  function buildIndex() {
    if (_cachedIndexedQuestions) {
      return _cachedIndexedQuestions;
    }

    const rawList = getRawQuestions();
    const mappedQuestions = [];
    const diagnostics = {
      mode: _mode,
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

    if (_mode === 'source_backed') {
      for (let i = 0; i < rawList.length; i++) {
        const q = rawList[i];
        if (!q || typeof q !== 'object') {
          diagnostics.invalid++;
          continue;
        }

        const sec = q.section;
        if (!sec || !diagnostics.bySection[sec]) {
          diagnostics.missingSection++;
          diagnostics.invalid++;
          continue;
        }

        diagnostics.bySection[sec].inspected++;

        if (!isProductionSourceBacked(q)) {
          diagnostics.invalid++;
          diagnostics.bySection[sec].invalid++;
          continue;
        }

        mappedQuestions.push(q);
        diagnostics.mapped++;
        diagnostics.bySection[sec].mapped++;

        if (sec === VACT_SECTIONS.SCIENTIFIC_REASONING && q.skill) {
          const disc = q.skill;
          if (diagnostics.bySection[sec].byDiscipline[disc]) {
            diagnostics.bySection[sec].byDiscipline[disc].mapped++;
          }
        }
      }

      // Sort by source priority score descending
      mappedQuestions.sort((a, b) => getQuestionPriorityScore(b) - getQuestionPriorityScore(a));

      _cachedIndexedQuestions = mappedQuestions;
      _cachedDiagnostics = diagnostics;
      return _cachedIndexedQuestions;
    }

    // Legacy mode execution
    for (let i = 0; i < rawList.length; i++) {
      const raw = rawList[i];
      if (!raw || typeof raw !== 'object') {
        diagnostics.invalid++;
        continue;
      }

      const hasAnswer = raw.correctAnswer !== undefined || raw.answer !== undefined || raw.correct !== undefined;
      if (!hasAnswer || raw.correctAnswer === null || raw.correctAnswer === '') {
        diagnostics.missingAnswer++;
      }

      const mapping = mapLegacySectionAndSkill ? mapLegacySectionAndSkill(raw) : { section: raw.section, skill: raw.skill, status: 'mapped' };
      if (!mapping.section) {
        if (mapping.status && mapping.status.startsWith('unsupported')) {
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

      const res = adaptLegacyQuestion ? adaptLegacyQuestion(raw) : { success: true, question: raw };
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
   * @param {string} [filter.sourceId] Specific source ID
   * @param {number} [filter.limit] Maximum number of questions to return
   * @returns {Array<object>} Array of validated V-ACT question objects
   */
  function query(filter = {}) {
    const list = buildIndex();
    const { section, skill, difficulty, sourceId, limit } = filter;

    const filtered = list.filter(q => {
      if (section && q.section !== section) return false;
      if (skill && q.skill !== skill) return false;
      if (difficulty && q.difficulty !== difficulty) return false;
      if (sourceId && q.source?.sourceId !== sourceId) return false;
      return true;
    });

    if (typeof limit === 'number' && limit > 0) {
      return filtered.slice(0, limit);
    }
    return filtered;
  }

  /**
   * Returns comprehensive diagnostic statistics for question bank.
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
      mode: _mode,
      total: list.length,
      sections: {
        [VACT_SECTIONS.VIETNAMESE]: { total: 0, easy: 0, medium: 0, hard: 0, unclassified: 0 },
        [VACT_SECTIONS.ENGLISH]: { total: 0, easy: 0, medium: 0, hard: 0, unclassified: 0 },
        [VACT_SECTIONS.MATH]: { total: 0, easy: 0, medium: 0, hard: 0, unclassified: 0 },
        [VACT_SECTIONS.LOGIC_DATA]: { total: 0, easy: 0, medium: 0, hard: 0, unclassified: 0 },
        [VACT_SECTIONS.SCIENTIFIC_REASONING]: {
          total: 0,
          easy: 0,
          medium: 0,
          hard: 0,
          unclassified: 0,
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
        const diff = q.difficulty;
        if (['easy', 'medium', 'hard'].includes(diff)) {
          coverage.sections[sec][diff]++;
        } else {
          coverage.sections[sec].unclassified++;
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
    setSourceBackedBank,
    setMode,
    getMode,
    isSourceBacked,
    setSourcePriority,
    getSourcePriority,
    clearCache,
    query,
    getDiagnostics,
    getCoverage
  };

  return {
    VACTInternalBank
  };
});
