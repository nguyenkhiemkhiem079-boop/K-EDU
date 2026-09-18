/**
 * K-EDU V-ACT Core Architecture - Unified Entry Point
 * Exposes core V-ACT modules under a controlled namespace: window.KEDUVACT (browser) or module.exports (Node.js).
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    const taxonomy = require('./taxonomy');
    const signature = require('./quality/signature');
    const validator = require('./quality/validator');
    const deduplicator = require('./quality/deduplicator');
    const schema = require('./schema');
    const profiles = require('./profiles');
    const adapter = require('./bank/adapter');
    const internalBank = require('./bank/internalBank');
    const coverage = require('./bank/coverage');
    const sectionTestGenerator = require('./generator/sectionTestGenerator');
    const examGenerator = require('./generator/examGenerator');
    const performanceAnalytics = require('./analytics/performance');
    const sourceConfig = require('./sources/config');
    const internalSource = require('./sources/internalSource');
    const remoteJsonSource = require('./sources/remoteJsonSource');
    const sourceManager = require('./sources/sourceManager');
    const adaptivePractice = require('./adaptive/weaknessGenerator');
    module.exports = factory(taxonomy, signature, validator, deduplicator, schema, profiles, adapter, internalBank, coverage, sectionTestGenerator, examGenerator, performanceAnalytics, sourceConfig, internalSource, remoteJsonSource, sourceManager, adaptivePractice);
  } else {
    root.KEDUVACT = root.KEDUVACT || {};
    // When loaded via script tags, individual modules attach to root.KEDUVACT
  }
})(typeof window !== 'undefined' ? window : globalThis, function (taxonomy, signature, validator, deduplicator, schema, profiles, adapter, internalBank, coverage, sectionTestGenerator, examGenerator, performanceAnalytics, sourceConfig, internalSource, remoteJsonSource, sourceManager, adaptivePractice) {
  'use strict';

  return Object.freeze({
    ...taxonomy,
    ...signature,
    ...validator,
    ...deduplicator,
    ...schema,
    ...profiles,
    ...adapter,
    ...internalBank,
    ...coverage,
    ...sectionTestGenerator,
    ...examGenerator,
    performanceAnalytics,
    analytics: Object.freeze({
      performance: performanceAnalytics
    }),
    sources: Object.freeze({
      config: sourceConfig,
      sourceConfig,
      VACTSourceConfig: sourceConfig,
      internal: internalSource,
      remote: remoteJsonSource,
      sourceManager: sourceManager.sourceManager,
      VACTSourceManager: sourceManager.VACTSourceManager,
      VACTInternalSource: internalSource.VACTInternalSource,
      VACTRemoteJsonSource: remoteJsonSource.VACTRemoteJsonSource
    }),
    sourceManager: sourceManager.sourceManager,
    VACTSourceManager: sourceManager.VACTSourceManager,
    VACTRemoteJsonSource: remoteJsonSource.VACTRemoteJsonSource,
    VACTInternalSource: internalSource.VACTInternalSource,
    VACTSourceConfig: sourceConfig,
    adaptive: Object.freeze({
      ...adaptivePractice
    }),
    generateWeaknessTest: adaptivePractice.generateWeaknessTest,
    formatWeaknessExamAsQuiz: adaptivePractice.formatWeaknessExamAsQuiz,
    quality: Object.freeze({
      ...signature,
      ...validator,
      ...deduplicator
    }),
    bank: Object.freeze({
      ...adapter,
      ...internalBank,
      ...coverage
    }),
    generator: Object.freeze({
      ...sectionTestGenerator,
      ...examGenerator
    })
  });
});

