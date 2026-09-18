/**
 * K-EDU V-ACT Core Architecture - Source Registry
 * Manages authorized question sources, rights status enforcement,
 * exam structure versions, and ingestion admissibility.
 *
 * Strict Compliance:
 * - Only 'approved', 'owned', or 'licensed' sources may be ingested into production.
 * - 'review_required' and 'blocked' content are strictly non-ingestable.
 * - "Freely downloadable" != "licensed for reuse".
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.KEDUVACT = root.KEDUVACT || {};
    root.KEDUVACT.sources = root.KEDUVACT.sources || {};
    const registry = factory();
    Object.assign(root.KEDUVACT.sources, registry);
    root.KEDUVACT.sourceRegistry = registry.sourceRegistry;
    root.KEDUVACT.VACTSourceRegistry = registry.VACTSourceRegistry;
  }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const SOURCE_TYPES = Object.freeze({
    OFFICIAL_SAMPLE: 'official_sample',
    OFFICIAL_RELEASED: 'official_released',
    AUTHORIZED_FULL_MOCK: 'authorized_full_mock',
    AUTHORIZED_SUBJECT_PACK: 'authorized_subject_pack',
    INTERNAL_CURATED: 'internal_curated',
    REMOTE_AUTHORIZED: 'remote_authorized'
  });

  const RIGHTS_STATUS = Object.freeze({
    APPROVED: 'approved',
    OWNED: 'owned',
    LICENSED: 'licensed',
    REVIEW_REQUIRED: 'review_required',
    BLOCKED: 'blocked'
  });

  const INGESTABLE_RIGHTS = Object.freeze([
    RIGHTS_STATUS.APPROVED,
    RIGHTS_STATUS.OWNED,
    RIGHTS_STATUS.LICENSED
  ]);

  const STRUCTURE_VERSIONS = Object.freeze({
    V2025_PLUS: '2025+',
    LEGACY_PRE_2025: 'legacy_pre_2025'
  });

  /**
   * Validates a source definition object against schema requirements.
   * @param {object} def
   * @returns {{ valid: boolean, errors: string[] }}
   */
  function validateSourceDefinition(def) {
    const errors = [];
    if (!def || typeof def !== 'object') {
      return { valid: false, errors: ['Source definition must be a non-null object'] };
    }

    if (!def.sourceId || typeof def.sourceId !== 'string' || !def.sourceId.trim()) {
      errors.push('Field "sourceId" is required and must be a non-empty string');
    }
    if (!def.provider || typeof def.provider !== 'string' || !def.provider.trim()) {
      errors.push('Field "provider" is required and must be a non-empty string');
    }
    if (!def.exam || typeof def.exam !== 'string') {
      errors.push('Field "exam" must be a string');
    }
    if (typeof def.year !== 'number' || isNaN(def.year) || def.year < 2000 || def.year > 2100) {
      errors.push('Field "year" must be a valid 4-digit year number');
    }
    if (!def.sourceType || !Object.values(SOURCE_TYPES).includes(def.sourceType)) {
      errors.push(`Field "sourceType" must be one of: ${Object.values(SOURCE_TYPES).join(', ')}`);
    }
    if (!def.structureVersion || !Object.values(STRUCTURE_VERSIONS).includes(def.structureVersion)) {
      errors.push(`Field "structureVersion" must be one of: ${Object.values(STRUCTURE_VERSIONS).join(', ')}`);
    }
    if (typeof def.enabled !== 'boolean') {
      errors.push('Field "enabled" must be a boolean');
    }
    if (typeof def.priority !== 'number' || isNaN(def.priority)) {
      errors.push('Field "priority" must be a number');
    }

    if (!def.rights || typeof def.rights !== 'object') {
      errors.push('Field "rights" is required and must be an object');
    } else if (!def.rights.status || !Object.values(RIGHTS_STATUS).includes(def.rights.status)) {
      errors.push(`Field "rights.status" must be one of: ${Object.values(RIGHTS_STATUS).join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * VACTSourceRegistry implementation
   */
  class VACTSourceRegistry {
    constructor() {
      this._sources = new Map();
      this.reset();
    }

    /**
     * Resets registry to initial baseline sources.
     */
    reset() {
      this._sources.clear();
      this.registerBaselineSources();
    }

    /**
     * Registers baseline authorized and reference sources.
     */
    registerBaselineSources() {
      // 1. Internal curated bank (owned, legacy supplemental)
      this.registerSource({
        sourceId: 'internal_kedu_legacy',
        provider: 'K-EDU Curated Bank',
        exam: 'V-ACT',
        year: 2024,
        sourceType: SOURCE_TYPES.INTERNAL_CURATED,
        structureVersion: STRUCTURE_VERSIONS.LEGACY_PRE_2025,
        url: null,
        enabled: true,
        priority: 10,
        rights: {
          status: RIGHTS_STATUS.OWNED,
          licenseNote: 'Internal proprietary curated questions - licensed for production training'
        }
      });

      // 2. Official sample 2025+ (approved)
      this.registerSource({
        sourceId: 'vact_official_sample_2025',
        provider: 'VNU-HCM',
        exam: 'V-ACT',
        year: 2025,
        sourceType: SOURCE_TYPES.OFFICIAL_SAMPLE,
        structureVersion: STRUCTURE_VERSIONS.V2025_PLUS,
        url: 'https://thinangluc.vnuhcm.edu.vn',
        enabled: true,
        priority: 1,
        rights: {
          status: RIGHTS_STATUS.APPROVED,
          licenseNote: 'Official public sample release by VNU-HCM for candidate practice'
        }
      });

      // 3. Commercial reference mock (review required - blocked from ingestion)
      this.registerSource({
        sourceId: 'commercial_ref_mock_2025',
        provider: 'Third-party Publisher',
        exam: 'V-ACT',
        year: 2025,
        sourceType: SOURCE_TYPES.AUTHORIZED_FULL_MOCK,
        structureVersion: STRUCTURE_VERSIONS.V2025_PLUS,
        url: null,
        enabled: false,
        priority: 99,
        rights: {
          status: RIGHTS_STATUS.REVIEW_REQUIRED,
          licenseNote: 'Commercial prep set pending written authorization - NOT eligible for production ingestion'
        }
      });
    }

    /**
     * Registers or updates a source definition.
     * @param {object} sourceDef
     * @returns {object} Registered source
     */
    registerSource(sourceDef) {
      const validation = validateSourceDefinition(sourceDef);
      if (!validation.valid) {
        throw new Error(`Invalid source definition: ${validation.errors.join('; ')}`);
      }

      const cleanDef = {
        sourceId: sourceDef.sourceId.trim(),
        provider: sourceDef.provider.trim(),
        exam: sourceDef.exam ? sourceDef.exam.trim() : 'V-ACT',
        year: sourceDef.year,
        sourceType: sourceDef.sourceType,
        structureVersion: sourceDef.structureVersion,
        url: sourceDef.url ? String(sourceDef.url).trim() : null,
        enabled: Boolean(sourceDef.enabled),
        priority: sourceDef.priority,
        rights: {
          status: sourceDef.rights.status,
          licenseNote: sourceDef.rights.licenseNote ? String(sourceDef.rights.licenseNote).trim() : '',
          allowedUsage: Array.isArray(sourceDef.rights.allowedUsage) ? [...sourceDef.rights.allowedUsage] : ['practice', 'assessment']
        }
      };

      this._sources.set(cleanDef.sourceId, cleanDef);
      return JSON.parse(JSON.stringify(cleanDef));
    }

    /**
     * Retrieves a source by its ID.
     * @param {string} sourceId
     * @returns {object|null}
     */
    getSource(sourceId) {
      if (!sourceId || typeof sourceId !== 'string') return null;
      const src = this._sources.get(sourceId.trim());
      return src ? JSON.parse(JSON.stringify(src)) : null;
    }

    /**
     * Returns all registered sources.
     * @returns {Array<object>}
     */
    getAllSources() {
      return Array.from(this._sources.values()).map(s => JSON.parse(JSON.stringify(s)));
    }

    /**
     * Checks if a source is eligible for production ingestion.
     * Criteria: Must be enabled AND rights status must be 'approved', 'owned', or 'licensed'.
     *
     * @param {string|object} sourceOrId
     * @returns {boolean}
     */
    isSourceIngestable(sourceOrId) {
      let src = null;
      if (typeof sourceOrId === 'string') {
        src = this._sources.get(sourceOrId.trim());
      } else if (sourceOrId && typeof sourceOrId === 'object') {
        src = sourceOrId;
      }
      if (!src) return false;
      if (!src.enabled) return false;
      return INGESTABLE_RIGHTS.includes(src.rights?.status);
    }

    /**
     * Returns all sources currently admissible for automatic production ingestion.
     * @returns {Array<object>}
     */
    getIngestableSources() {
      return this.getAllSources().filter(s => this.isSourceIngestable(s));
    }

    /**
     * Returns sources pending rights review.
     * @returns {Array<object>}
     */
    getPendingReviewSources() {
      return this.getAllSources().filter(s => s.rights?.status === RIGHTS_STATUS.REVIEW_REQUIRED);
    }

    /**
     * Returns sources explicitly blocked.
     * @returns {Array<object>}
     */
    getBlockedSources() {
      return this.getAllSources().filter(s => s.rights?.status === RIGHTS_STATUS.BLOCKED);
    }
  }

  const sourceRegistry = new VACTSourceRegistry();

  return {
    SOURCE_TYPES,
    RIGHTS_STATUS,
    INGESTABLE_RIGHTS,
    STRUCTURE_VERSIONS,
    validateSourceDefinition,
    VACTSourceRegistry,
    sourceRegistry
  };
});
