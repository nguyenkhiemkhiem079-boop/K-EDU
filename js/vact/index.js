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
    const sourceBankLoader = require('./bank/sourceBankLoader');
    const examBank = require('./bank/examBank');
    const coverage = require('./bank/coverage');
    const sectionTestGenerator = require('./generator/sectionTestGenerator');
    const examGenerator = require('./generator/examGenerator');
    const performanceAnalytics = require('./analytics/performance');
    const practiceCenter = require('./practiceCenter');
    const sourceConfig = require('./sources/config');
    const internalSource = require('./sources/internalSource');
    const remoteJsonSource = require('./sources/remoteJsonSource');
    const sourceManager = require('./sources/sourceManager');
    const sourceRegistry = require('./sources/sourceRegistry');
    const adaptivePractice = require('./adaptive/weaknessGenerator');
    const reviewManager = require('./review/reviewManager');
    module.exports = factory(taxonomy, signature, validator, deduplicator, schema, profiles, adapter, internalBank, sourceBankLoader, examBank, coverage, sectionTestGenerator, examGenerator, performanceAnalytics, practiceCenter, sourceConfig, internalSource, remoteJsonSource, sourceManager, sourceRegistry, adaptivePractice, reviewManager);
  } else {
    root.KEDUVACT = root.KEDUVACT || {};
    // When loaded via script tags, individual modules attach to root.KEDUVACT
  }
})(typeof window !== 'undefined' ? window : globalThis, function (taxonomy, signature, validator, deduplicator, schema, profiles, adapter, internalBank, sourceBankLoader, examBank, coverage, sectionTestGenerator, examGenerator, performanceAnalytics, practiceCenter, sourceConfig, internalSource, remoteJsonSource, sourceManager, sourceRegistry, adaptivePractice, reviewManager) {
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
    ...examBank,
    ...coverage,
    ...(coverage.VACTCoverage || {}),
    ...sectionTestGenerator,
    ...examGenerator,
    performanceAnalytics,
    practiceCenter,
    VACTPracticeCenter: practiceCenter.VACTPracticeCenter,
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
      VACTRemoteJsonSource: remoteJsonSource.VACTRemoteJsonSource,
      registry: sourceRegistry.sourceRegistry,
      sourceRegistry: sourceRegistry.sourceRegistry,
      VACTSourceRegistry: sourceRegistry.VACTSourceRegistry,
      SOURCE_TYPES: sourceRegistry.SOURCE_TYPES,
      RIGHTS_STATUS: sourceRegistry.RIGHTS_STATUS,
      INGESTABLE_RIGHTS: sourceRegistry.INGESTABLE_RIGHTS
    }),
    sourceManager: sourceManager.sourceManager,
    VACTSourceManager: sourceManager.VACTSourceManager,
    VACTRemoteJsonSource: remoteJsonSource.VACTRemoteJsonSource,
    VACTInternalSource: internalSource.VACTInternalSource,
    VACTSourceConfig: sourceConfig,
    sourceRegistry: sourceRegistry.sourceRegistry,
    VACTSourceRegistry: sourceRegistry.VACTSourceRegistry,
    SOURCE_TYPES: sourceRegistry.SOURCE_TYPES,
    RIGHTS_STATUS: sourceRegistry.RIGHTS_STATUS,
    INGESTABLE_RIGHTS: sourceRegistry.INGESTABLE_RIGHTS,
    sourceBankLoader,
    VACTQuestionBank: internalBank.VACTInternalBank,
    VACTExamBank: examBank.VACTExamBank,
    examBank: examBank.examBank,
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
      sourceBankLoader,
      ...examBank,
      ...coverage,
      questionBank: internalBank.VACTInternalBank,
      VACTQuestionBank: internalBank.VACTInternalBank,
      examBank: examBank.examBank,
      VACTExamBank: examBank.VACTExamBank
    }),
    generator: Object.freeze({
      ...sectionTestGenerator,
      ...examGenerator
    }),
    review: Object.freeze({
      ...reviewManager
    }),
    VACTReviewManager: reviewManager,
    gradeVactAttempt: reviewManager.gradeVactAttempt,
    renderVactReviewHtml: reviewManager.renderVactReviewHtml,
    buildReviewItem: reviewManager.buildReviewItem,
    formatStudentFriendlySource: reviewManager.formatStudentFriendlySource
  });
});

