/**
 * K-EDU V-ACT Core Architecture - Internal Question Source
 * Wraps VACTInternalBank in the unified V-ACT Question Source Interface.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    const config = require('./config');
    const taxonomy = require('../taxonomy');
    const internalBank = require('../bank/internalBank');
    module.exports = factory(config, taxonomy, internalBank);
  } else {
    root.KEDUVACT = root.KEDUVACT || {};
    root.KEDUVACT.sources = root.KEDUVACT.sources || {};
    const mod = factory(root.KEDUVACT.sourceConfig || root.KEDUVACT.sources, root.KEDUVACT, root.KEDUVACT.bank || root.KEDUVACT);
    Object.assign(root.KEDUVACT.sources, mod);
    root.KEDUVACT.internalSource = mod.internalSource;
  }
})(typeof window !== 'undefined' ? window : globalThis, function (configModule, taxonomyModule, bankModule) {
  'use strict';

  const SOURCE_PRIORITIES = configModule?.SOURCE_PRIORITIES || { INTERNAL: 10 };
  const isValidSection = taxonomyModule?.isValidSection || (() => true);
  const isValidSectionSkill = taxonomyModule?.isValidSectionSkill || (() => true);
  const VACTInternalBank = bankModule?.VACTInternalBank;

  /**
   * Internal V-ACT question source implementation.
   */
  class VACTInternalSource {
    /**
     * @param {object} [options]
     * @param {string} [options.id='internal']
     * @param {number} [options.priority]
     * @param {boolean} [options.enabled=true]
     */
    constructor(options = {}) {
      this.id = String(options.id || 'internal');
      this.type = 'internal';
      this.enabled = options.enabled !== undefined ? Boolean(options.enabled) : true;
      this.priority = Number.isInteger(options.priority) ? options.priority : SOURCE_PRIORITIES.INTERNAL;
      this.name = options.name || 'Kho câu hỏi nội bộ K-EDU';
    }

    /**
     * Checks if this source can serve the requested query criteria.
     * @param {object} query
     * @returns {boolean}
     */
    supports(query = {}) {
      if (!this.enabled) return false;
      if (query.section && !isValidSection(query.section)) return false;
      if (query.section && query.skill && !isValidSectionSkill(query.section, query.skill)) return false;
      return true;
    }

    /**
     * Queries questions from the internal bank.
     * @param {object} [filter={}]
     * @returns {Promise<object>} Result container with questions and metadata
     */
    async query(filter = {}) {
      if (!this.enabled) {
        return {
          sourceId: this.id,
          sourceType: this.type,
          questions: [],
          count: 0,
          diagnostics: { skipped: true, reason: 'Source is disabled' }
        };
      }

      const questions = VACTInternalBank ? VACTInternalBank.query(filter) : [];
      return {
        sourceId: this.id,
        sourceType: this.type,
        questions: [...questions],
        count: questions.length,
        diagnostics: {
          inspected: questions.length,
          delivered: questions.length
        }
      };
    }

    /**
     * Returns diagnostics from internal bank.
     */
    getDiagnostics() {
      return VACTInternalBank ? VACTInternalBank.getDiagnostics() : null;
    }

    /**
     * Returns availability coverage for internal questions.
     */
    getCoverage() {
      return VACTInternalBank ? VACTInternalBank.getCoverage() : null;
    }
  }

  // Singleton instance
  const defaultInternalSource = new VACTInternalSource();

  return {
    VACTInternalSource,
    internalSource: defaultInternalSource
  };
});
