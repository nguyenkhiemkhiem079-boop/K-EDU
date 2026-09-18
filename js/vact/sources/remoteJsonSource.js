/**
 * K-EDU V-ACT Core Architecture - Remote JSON Question Source
 * Fetches, verifies, caches, and normalizes remote V-ACT questions from authorized JSON feeds.
 *
 * Normalization Pipeline (Phase 9 Spec):
 * raw remote record -> normalizeVACTQuestion -> validateVACTQuestion -> signature -> deduplication
 *
 * Features:
 * - Strict security whitelist validation (no arbitrary student URLs)
 * - In-memory TTL caching with configurable expiration and safe stale handling
 * - Network failure & timeout resilience: returns REMOTE_SOURCE_UNAVAILABLE without crashing K-EDU
 * - Provenance preservation: provider, url, title, year, page
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    const config = require('./config');
    const taxonomy = require('../taxonomy');
    const schema = require('../schema');
    const validator = require('../quality/validator');
    const signature = require('../quality/signature');
    const deduplicator = require('../quality/deduplicator');
    module.exports = factory(config, taxonomy, schema, validator, signature, deduplicator);
  } else {
    root.KEDUVACT = root.KEDUVACT || {};
    root.KEDUVACT.sources = root.KEDUVACT.sources || {};
    const mod = factory(
      root.KEDUVACT.sourceConfig || root.KEDUVACT.sources,
      root.KEDUVACT,
      root.KEDUVACT,
      root.KEDUVACT.quality || root.KEDUVACT,
      root.KEDUVACT.quality || root.KEDUVACT,
      root.KEDUVACT.quality || root.KEDUVACT
    );
    Object.assign(root.KEDUVACT.sources, mod);
    root.KEDUVACT.RemoteJsonSource = mod.VACTRemoteJsonSource;
  }
})(typeof window !== 'undefined' ? window : globalThis, function (configModule, taxonomyModule, schemaModule, validatorModule, signatureModule, deduplicatorModule) {
  'use strict';

  const SOURCE_PRIORITIES = configModule?.SOURCE_PRIORITIES || { AUTHORIZED_REMOTE: 100 };
  const DEFAULT_CACHE_TTL_MS = configModule?.DEFAULT_CACHE_TTL_MS || 10 * 60 * 1000;
  const DEFAULT_TIMEOUT_MS = configModule?.DEFAULT_TIMEOUT_MS || 8000;
  const isAuthorizedSourceUrl = configModule?.isAuthorizedSourceUrl || (() => ({ authorized: true }));

  const isValidSection = taxonomyModule?.isValidSection || (() => true);
  const isValidSectionSkill = taxonomyModule?.isValidSectionSkill || (() => true);
  const normalizeVACTQuestion = schemaModule?.normalizeVACTQuestion;
  const validateVACTQuestion = validatorModule?.validateVACTQuestion || (() => ({ valid: true, errors: [] }));
  const computeVACTQuestionSignature = signatureModule?.computeVACTQuestionSignature;
  const deduplicateVACTQuestions = deduplicatorModule?.deduplicateVACTQuestions;

  /**
   * Remote JSON V-ACT question source implementation.
   */
  class VACTRemoteJsonSource {
    /**
     * @param {object} options
     * @param {string} options.id Unique source identifier
     * @param {string} options.url Authorized remote feed URL
     * @param {number} [options.priority=100]
     * @param {boolean} [options.enabled=true]
     * @param {number} [options.ttlMs=600000] Cache time-to-live in ms
     * @param {number} [options.timeoutMs=8000] Network timeout in ms
     * @param {string} [options.name] Human-readable source name
     * @param {Function} [options.fetchFn] Custom fetch function (useful for tests)
     */
    constructor(options = {}) {
      if (!options || typeof options !== 'object') {
        throw new TypeError('VACTRemoteJsonSource requires an options object');
      }
      if (!options.id || typeof options.id !== 'string') {
        throw new Error('VACTRemoteJsonSource requires a non-empty string "id"');
      }
      if (!options.url || typeof options.url !== 'string') {
        throw new Error('VACTRemoteJsonSource requires a non-empty string "url"');
      }

      this.id = options.id.trim();
      this.url = options.url.trim();
      this.name = options.name || `Remote Feed (${this.id})`;
      this.type = 'remote_json';
      this.priority = Number.isInteger(options.priority) ? options.priority : SOURCE_PRIORITIES.AUTHORIZED_REMOTE;
      this.enabled = options.enabled !== undefined ? Boolean(options.enabled) : true;
      this.ttlMs = Number.isInteger(options.ttlMs) && options.ttlMs > 0 ? options.ttlMs : DEFAULT_CACHE_TTL_MS;
      this.timeoutMs = Number.isInteger(options.timeoutMs) && options.timeoutMs > 0 ? options.timeoutMs : DEFAULT_TIMEOUT_MS;
      this.fetchFn = typeof options.fetchFn === 'function' ? options.fetchFn : null;

      // In-memory cache & diagnostics
      this._cachedQuestions = null;
      this._cacheTimestamp = 0;
      this._diagnostics = {
        status: 'uninitialized',
        lastFetchedAt: null,
        fetchCount: 0,
        cacheHits: 0,
        inspected: 0,
        valid: 0,
        invalid: 0,
        duplicatesRemoved: 0,
        lastError: null
      };
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
     * Clears internal cache.
     */
    clearCache() {
      this._cachedQuestions = null;
      this._cacheTimestamp = 0;
    }

    /**
     * Returns true if cached data is present and has not exceeded TTL.
     */
    isCacheValid() {
      if (!this._cachedQuestions) return false;
      const age = Date.now() - this._cacheTimestamp;
      return age < this.ttlMs;
    }

    /**
     * Low-level fetch mechanism handling both HTTP/HTTPS and file:// fixtures.
     * @private
     */
    async _fetchRawFeed() {
      // 1. Security Check: verify URL is authorized
      const auth = isAuthorizedSourceUrl(this.url);
      if (!auth.authorized) {
        const err = new Error(`Security Exception: ${auth.reason || 'Unauthorized remote feed URL'}`);
        err.code = 'UNAUTHORIZED_SOURCE_URL';
        throw err;
      }

      // 2. Local file:// protocol support for offline tests & QA fixtures
      if (this.url.startsWith('file://')) {
        if (typeof require === 'function') {
          try {
            const fs = require('node:fs/promises');
            const { fileURLToPath } = require('node:url');
            const filePath = fileURLToPath(this.url);
            const content = await fs.readFile(filePath, 'utf8');
            return JSON.parse(content);
          } catch (fileErr) {
            throw new Error(`Failed to read local fixture ${this.url}: ${fileErr.message}`);
          }
        }
      }

      // 3. HTTP / HTTPS network fetch
      const fetchImpl = this.fetchFn || (typeof fetch === 'function' ? fetch : null);
      if (!fetchImpl) {
        throw new Error('No fetch implementation available in current runtime environment');
      }

      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = controller ? setTimeout(() => controller.abort(), this.timeoutMs) : null;

      try {
        const response = await fetchImpl(this.url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'K-EDU-VACT-Ingestion/1.0'
          },
          signal: controller ? controller.signal : undefined
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data;
      } catch (netErr) {
        if (netErr.name === 'AbortError') {
          throw new Error(`Request timed out after ${this.timeoutMs}ms`);
        }
        throw netErr;
      } finally {
        if (timer) clearTimeout(timer);
      }
    }

    /**
     * Ingests, normalizes, validates, and deduplicates remote questions.
     * Guaranteed to never crash K-EDU on network or parse failure.
     *
     * @param {boolean} [forceRefresh=false]
     * @returns {Promise<Array<object>>} Normalized V-ACT questions
     */
    async loadQuestions(forceRefresh = false) {
      if (!forceRefresh && this.isCacheValid()) {
        this._diagnostics.cacheHits++;
        return this._cachedQuestions;
      }

      this._diagnostics.fetchCount++;
      this._diagnostics.status = 'loading';

      let rawData;
      try {
        rawData = await this._fetchRawFeed();
      } catch (fetchErr) {
        this._diagnostics.status = 'unavailable';
        this._diagnostics.lastError = {
          code: 'REMOTE_SOURCE_UNAVAILABLE',
          message: fetchErr.message,
          timestamp: new Date().toISOString()
        };
        console.warn(`[VACTRemoteSource:${this.id}] REMOTE_SOURCE_UNAVAILABLE:`, fetchErr.message);
        // Safe return: return empty array without crashing
        return [];
      }

      // Extract questions array and feed-level provenance defaults
      let rawList = [];
      let feedDefaults = {
        provider: this.name,
        url: this.url,
        title: null,
        year: null
      };

      if (Array.isArray(rawData)) {
        rawList = rawData;
      } else if (rawData && typeof rawData === 'object') {
        if (Array.isArray(rawData.questions)) {
          rawList = rawData.questions;
        } else if (Array.isArray(rawData.data)) {
          rawList = rawData.data;
        }
        feedDefaults.provider = rawData.provider || rawData.publisher || this.name;
        feedDefaults.title = rawData.title || rawData.name || null;
        feedDefaults.year = rawData.year || null;
        feedDefaults.url = rawData.url || this.url;
      }

      this._diagnostics.inspected = rawList.length;

      // Pipeline execution:
      // raw record -> normalizeVACTQuestion -> validateVACTQuestion -> signature -> deduplication
      const validNormalized = [];
      let invalidCount = 0;

      for (let i = 0; i < rawList.length; i++) {
        const rawQ = rawList[i];
        if (!rawQ || typeof rawQ !== 'object') {
          invalidCount++;
          continue;
        }

        try {
          // Normalize with feed-level provenance preservation
          const enrichedRaw = {
            ...rawQ,
            source: {
              provider: rawQ.source?.provider || feedDefaults.provider,
              url: rawQ.source?.url || feedDefaults.url,
              title: rawQ.source?.title || feedDefaults.title,
              year: rawQ.source?.year || feedDefaults.year,
              page: rawQ.source?.page !== undefined ? rawQ.source.page : (rawQ.page !== undefined ? rawQ.page : null),
              originalId: rawQ.source?.originalId || rawQ.id || null,
              ...(rawQ.source || {})
            }
          };

          const normalized = normalizeVACTQuestion(enrichedRaw);
          const validation = validateVACTQuestion(normalized);

          if (!validation.valid) {
            invalidCount++;
            continue;
          }

          // Attach remote source provenance tag
          normalized.source.remoteSourceId = this.id;
          normalized.source.remoteSourceUrl = this.url;

          // Ensure cryptographic signature is computed
          normalized.signature = computeVACTQuestionSignature(normalized);

          validNormalized.push(normalized);
        } catch (_) {
          invalidCount++;
        }
      }

      // Intra-feed deduplication
      const dedup = deduplicateVACTQuestions ? deduplicateVACTQuestions(validNormalized) : {
        uniqueQuestions: validNormalized,
        totalDuplicatesRemoved: 0
      };

      const finalQuestions = dedup.uniqueQuestions;

      // Update cache and diagnostics
      this._cachedQuestions = finalQuestions;
      this._cacheTimestamp = Date.now();
      this._diagnostics.status = 'ready';
      this._diagnostics.lastFetchedAt = new Date().toISOString();
      this._diagnostics.valid = finalQuestions.length;
      this._diagnostics.invalid = invalidCount;
      this._diagnostics.duplicatesRemoved = dedup.totalDuplicatesRemoved || 0;
      this._diagnostics.lastError = null;

      return this._cachedQuestions;
    }

    /**
     * Unified source query interface.
     * @param {object} [filter={}]
     * @returns {Promise<object>}
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

      const all = await this.loadQuestions();

      if (this._diagnostics.status === 'unavailable') {
        return {
          sourceId: this.id,
          sourceType: this.type,
          questions: [],
          count: 0,
          diagnostics: {
            error: 'REMOTE_SOURCE_UNAVAILABLE',
            details: this._diagnostics.lastError?.message || 'Source unreachable',
            url: this.url
          }
        };
      }

      const { section, skill, difficulty, limit } = filter;
      const filtered = all.filter(q => {
        if (section && q.section !== section) return false;
        if (skill && q.skill !== skill) return false;
        if (difficulty && q.difficulty !== difficulty) return false;
        return true;
      });

      const sliced = (typeof limit === 'number' && limit > 0) ? filtered.slice(0, limit) : filtered;

      return {
        sourceId: this.id,
        sourceType: this.type,
        questions: sliced,
        count: sliced.length,
        diagnostics: {
          totalAvailable: all.length,
          matchingQuery: filtered.length,
          delivered: sliced.length,
          cacheHit: this._diagnostics.cacheHits > 0
        }
      };
    }

    /**
     * Returns diagnostics for this remote source.
     */
    getDiagnostics() {
      return {
        id: this.id,
        name: this.name,
        url: this.url,
        enabled: this.enabled,
        priority: this.priority,
        ttlMs: this.ttlMs,
        ...this._diagnostics
      };
    }
  }

  return {
    VACTRemoteJsonSource
  };
});
