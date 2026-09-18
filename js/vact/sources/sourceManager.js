/**
 * K-EDU V-ACT Core Architecture - Unified Question Source Manager
 * Coordinates multi-source querying across internal bank and authorized remote feeds.
 *
 * Core Capabilities:
 * - Priority-based question discovery & waterfall/proportional merge
 * - Cross-source cryptographic deduplication (identical questions count once)
 * - Non-fatal fault tolerance: captures REMOTE_SOURCE_UNAVAILABLE without crashing K-EDU
 * - Multi-tier coverage matrix (Internal, Remote, Combined unique)
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    const config = require('./config');
    const internalSourceModule = require('./internalSource');
    const remoteSourceModule = require('./remoteJsonSource');
    const deduplicator = require('../quality/deduplicator');
    const taxonomy = require('../taxonomy');
    module.exports = factory(config, internalSourceModule, remoteSourceModule, deduplicator, taxonomy);
  } else {
    root.KEDUVACT = root.KEDUVACT || {};
    root.KEDUVACT.sources = root.KEDUVACT.sources || {};
    const sm = factory(
      root.KEDUVACT.sourceConfig || root.KEDUVACT.sources,
      root.KEDUVACT.sources,
      root.KEDUVACT.sources,
      root.KEDUVACT.quality || root.KEDUVACT,
      root.KEDUVACT
    );
    Object.assign(root.KEDUVACT.sources, sm);
    root.KEDUVACT.sourceManager = sm.sourceManager;
    root.KEDUVACT.SourceManager = sm.VACTSourceManager;
  }
})(typeof window !== 'undefined' ? window : globalThis, function (configModule, internalModule, remoteModule, deduplicatorModule, taxonomyModule) {
  'use strict';

  const SOURCE_PRIORITIES = configModule?.SOURCE_PRIORITIES || { INTERNAL: 10, AUTHORIZED_REMOTE: 100 };
  const VACTInternalSource = internalModule?.VACTInternalSource;
  const internalSourceInstance = internalModule?.internalSource;
  const VACTRemoteJsonSource = remoteModule?.VACTRemoteJsonSource;
  const deduplicateVACTQuestions = deduplicatorModule?.deduplicateVACTQuestions;
  const VACT_SECTIONS = taxonomyModule?.VACT_SECTIONS || {
    VIETNAMESE: 'vietnamese',
    ENGLISH: 'english',
    MATH: 'math',
    LOGIC_DATA: 'logic_data',
    SCIENTIFIC_REASONING: 'scientific_reasoning'
  };

  /**
   * Source Manager Class
   */
  class VACTSourceManager {
    constructor() {
      this._sources = new Map(); // id -> source instance

      // Register default internal bank source
      if (internalSourceInstance) {
        this.registerSource(internalSourceInstance);
      } else if (VACTInternalSource) {
        this.registerSource(new VACTInternalSource());
      }
    }

    /**
     * Registers a new question source.
     * @param {object} source Instance implementing the Unified Source Interface
     * @returns {VACTSourceManager} this
     */
    registerSource(source) {
      if (!source || typeof source !== 'object') {
        throw new TypeError('registerSource requires a valid source object');
      }
      if (!source.id || typeof source.id !== 'string') {
        throw new Error('Source must have a non-empty string "id"');
      }
      if (typeof source.query !== 'function') {
        throw new Error(`Source "${source.id}" must implement a query() method`);
      }

      this._sources.set(source.id, source);
      return this;
    }

    /**
     * Removes a source by ID.
     * @param {string} id
     * @returns {boolean}
     */
    unregisterSource(id) {
      return this._sources.delete(id);
    }

    /**
     * Retrieves a source by ID.
     * @param {string} id
     * @returns {object|null}
     */
    getSource(id) {
      return this._sources.get(id) || null;
    }

    /**
     * Returns all registered sources sorted by priority (lowest priority number = highest precedence).
     * @param {boolean} [onlyEnabled=false]
     * @returns {Array<object>}
     */
    getSources(onlyEnabled = false) {
      const list = Array.from(this._sources.values());
      const filtered = onlyEnabled ? list.filter(s => s.enabled) : list;
      return filtered.sort((a, b) => (a.priority || 100) - (b.priority || 100));
    }

    /**
     * Enables or disables a source.
     * @param {string} id
     * @param {boolean} [enabled=true]
     */
    setSourceEnabled(id, enabled = true) {
      const src = this.getSource(id);
      if (src) {
        src.enabled = Boolean(enabled);
      }
    }

    /**
     * Updates source priority.
     * @param {string} id
     * @param {number} priority
     */
    setSourcePriority(id, priority) {
      const src = this.getSource(id);
      if (src && Number.isInteger(priority)) {
        src.priority = priority;
      }
    }

    /**
     * Clears caches across all remote sources.
     */
    clearAllCaches() {
      for (const src of this._sources.values()) {
        if (typeof src.clearCache === 'function') {
          src.clearCache();
        }
      }
    }

    /**
     * Queries questions across all enabled sources with priority-based merging and cross-source deduplication.
     *
     * Merge behavior:
     * - Queries sources in order of priority (e.g. Internal first, then Remote)
     * - Gathers candidates until query.limit is satisfied (plus cushion for dedupe)
     * - Deduplicates across sources by normalized cryptographic signature
     * - Selects higher-quality record if identical question exists in multiple sources
     * - Tracks provenance and diagnostics per source
     *
     * @param {object} [queryOptions={}]
     * @param {string} [queryOptions.section]
     * @param {string} [queryOptions.skill]
     * @param {string} [queryOptions.difficulty]
     * @param {number} [queryOptions.limit]
     * @returns {Promise<object>} { questions, count, sourceBreakdown, diagnostics }
     */
    async query(queryOptions = {}) {
      const activeSources = this.getSources(true);
      const limit = Number.isInteger(queryOptions.limit) && queryOptions.limit > 0 ? queryOptions.limit : null;

      const rawCandidates = [];
      const sourceBreakdown = {};
      const warnings = [];
      const sourceDiagnostics = [];

      for (const src of activeSources) {
        if (!src.supports(queryOptions)) {
          continue;
        }

        try {
          // If a limit is requested, query what's needed from this source
          const remainingNeeded = limit ? Math.max(0, limit - rawCandidates.length) : null;
          const queryFilter = { ...queryOptions };
          if (remainingNeeded !== null && remainingNeeded === 0) {
            // We already have enough candidates before dedupe, but we could pull a small buffer
            break;
          }

          const res = await src.query(queryFilter);

          if (res.diagnostics && res.diagnostics.error === 'REMOTE_SOURCE_UNAVAILABLE') {
            warnings.push({
              sourceId: src.id,
              error: 'REMOTE_SOURCE_UNAVAILABLE',
              details: res.diagnostics.details,
              url: res.diagnostics.url
            });
            sourceDiagnostics.push({
              sourceId: src.id,
              status: 'unavailable',
              error: 'REMOTE_SOURCE_UNAVAILABLE'
            });
            continue; // Proceed to next source
          }

          const qList = Array.isArray(res.questions) ? res.questions : [];
          sourceDiagnostics.push({
            sourceId: src.id,
            status: 'success',
            delivered: qList.length
          });

          for (const q of qList) {
            // Tag with sourceId if not already tagged
            if (q.source && !q.source.resolvedFromSourceId) {
              q.source.resolvedFromSourceId = src.id;
            }
            rawCandidates.push(q);
          }

          // If we have enough for the requested limit plus 20% margin, we can stop querying lower priority sources
          if (limit && rawCandidates.length >= limit * 1.5) {
            break;
          }
        } catch (srcErr) {
          warnings.push({
            sourceId: src.id,
            error: 'SOURCE_QUERY_EXCEPTION',
            message: srcErr.message
          });
        }
      }

      // Cross-source deduplication via normalized cryptographic signatures
      const dedup = deduplicateVACTQuestions ? deduplicateVACTQuestions(rawCandidates) : {
        uniqueQuestions: rawCandidates,
        duplicateGroups: [],
        totalDuplicatesRemoved: 0
      };

      const uniqueQuestions = dedup.uniqueQuestions;
      const finalSlice = limit ? uniqueQuestions.slice(0, limit) : uniqueQuestions;

      // Calculate final source breakdown after dedupe
      for (const q of finalSlice) {
        const sId = q.source?.resolvedFromSourceId || q.source?.remoteSourceId || 'internal';
        sourceBreakdown[sId] = (sourceBreakdown[sId] || 0) + 1;
      }

      return {
        questions: finalSlice,
        count: finalSlice.length,
        requestedLimit: limit,
        sourceBreakdown,
        totalDuplicatesRemoved: dedup.totalDuplicatesRemoved || 0,
        diagnostics: {
          inspectedCandidates: rawCandidates.length,
          uniqueAvailable: uniqueQuestions.length,
          delivered: finalSlice.length,
          sourceDiagnostics,
          warnings
        }
      };
    }

    /**
     * Computes combined coverage across Internal and Remote sources.
     * Reports:
     * - Internal question count
     * - Remote question count (total and per-source)
     * - Combined unique question count after deduplication
     *
     * Example output format matching Phase 9 spec:
     * Physics: Internal 24, Remote 176, Combined unique 185
     *
     * @param {object} [options={}]
     * @returns {Promise<object>} Combined coverage report
     */
    async getCombinedCoverage(options = {}) {
      const activeSources = this.getSources(true);

      const allInternal = [];
      const allRemote = [];
      const remoteBySource = {};
      const errors = [];

      for (const src of activeSources) {
        try {
          const res = await src.query({});
          if (res.diagnostics && res.diagnostics.error === 'REMOTE_SOURCE_UNAVAILABLE') {
            errors.push({ sourceId: src.id, error: 'REMOTE_SOURCE_UNAVAILABLE', details: res.diagnostics.details });
            continue;
          }
          const list = Array.isArray(res.questions) ? res.questions : [];
          if (src.type === 'internal' || src.id === 'internal') {
            allInternal.push(...list);
          } else {
            allRemote.push(...list);
            remoteBySource[src.id] = (remoteBySource[src.id] || 0) + list.length;
          }
        } catch (err) {
          errors.push({ sourceId: src.id, error: err.message });
        }
      }

      // Cross-source deduplication of internal + remote combined
      const allCombined = [...allInternal, ...allRemote];
      const dedup = deduplicateVACTQuestions ? deduplicateVACTQuestions(allCombined) : {
        uniqueQuestions: allCombined,
        totalDuplicatesRemoved: 0
      };

      const uniqueCombined = dedup.uniqueQuestions;

      // Group by section & skill
      const sectionStats = {};
      for (const secKey of Object.values(VACT_SECTIONS)) {
        sectionStats[secKey] = {
          section: secKey,
          internal: 0,
          remote: 0,
          combinedUnique: 0,
          skills: {}
        };
      }

      // Count Internal
      for (const q of allInternal) {
        const sec = q.section;
        if (sectionStats[sec]) {
          sectionStats[sec].internal++;
          if (q.skill) {
            if (!sectionStats[sec].skills[q.skill]) {
              sectionStats[sec].skills[q.skill] = { internal: 0, remote: 0, combinedUnique: 0 };
            }
            sectionStats[sec].skills[q.skill].internal++;
          }
        }
      }

      // Count Remote
      for (const q of allRemote) {
        const sec = q.section;
        if (sectionStats[sec]) {
          sectionStats[sec].remote++;
          if (q.skill) {
            if (!sectionStats[sec].skills[q.skill]) {
              sectionStats[sec].skills[q.skill] = { internal: 0, remote: 0, combinedUnique: 0 };
            }
            sectionStats[sec].skills[q.skill].remote++;
          }
        }
      }

      // Count Combined Unique
      for (const q of uniqueCombined) {
        const sec = q.section;
        if (sectionStats[sec]) {
          sectionStats[sec].combinedUnique++;
          if (q.skill) {
            if (!sectionStats[sec].skills[q.skill]) {
              sectionStats[sec].skills[q.skill] = { internal: 0, remote: 0, combinedUnique: 0 };
            }
            sectionStats[sec].skills[q.skill].combinedUnique++;
          }
        }
      }

      return {
        summary: {
          internalTotal: allInternal.length,
          remoteTotal: allRemote.length,
          combinedRawTotal: allCombined.length,
          combinedUniqueTotal: uniqueCombined.length,
          crossSourceDuplicatesRemoved: dedup.totalDuplicatesRemoved || 0
        },
        sections: sectionStats,
        remoteBySource,
        errors
      };
    }
  }

  // Singleton instance
  const defaultSourceManager = new VACTSourceManager();

  return {
    VACTSourceManager,
    sourceManager: defaultSourceManager
  };
});
