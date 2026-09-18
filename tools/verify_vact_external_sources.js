const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const vact = require('../js/vact');

console.log('--- Starting V-ACT External Question Source Infrastructure Verification ---');

const {
  VACTSourceManager,
  VACTInternalSource,
  VACTRemoteJsonSource,
  VACTSourceConfig,
  sourceManager
} = vact.sources;

assert.ok(VACTSourceManager, 'VACTSourceManager must exist');
assert.ok(VACTInternalSource, 'VACTInternalSource must exist');
assert.ok(VACTRemoteJsonSource, 'VACTRemoteJsonSource must exist');
assert.ok(VACTSourceConfig, 'VACTSourceConfig must exist');
assert.ok(sourceManager, 'Default sourceManager singleton must exist');

// File fixture paths
const validFixturePath = path.resolve(__dirname, 'fixtures/vact_remote_sample_valid.json');
const invalidFixturePath = path.resolve(__dirname, 'fixtures/vact_remote_sample_invalid.json');
const dupFixturePath = path.resolve(__dirname, 'fixtures/vact_remote_sample_duplicates.json');

const validFixtureUrl = pathToFileURL(validFixturePath).href;
const invalidFixtureUrl = pathToFileURL(invalidFixturePath).href;
const dupFixtureUrl = pathToFileURL(dupFixturePath).href;

(async function runTests() {
  // =========================================================================
  // 1. UNIFIED SOURCE INTERFACE
  // =========================================================================
  console.log('1. Verifying unified source interface on Internal and Remote sources...');

  const internalSrc = new VACTInternalSource({ id: 'test_internal', priority: 10 });
  assert.equal(internalSrc.id, 'test_internal');
  assert.equal(internalSrc.enabled, true);
  assert.equal(internalSrc.priority, 10);
  assert.equal(typeof internalSrc.supports, 'function');
  assert.equal(typeof internalSrc.query, 'function');

  assert.equal(internalSrc.supports({ section: 'math' }), true);
  assert.equal(internalSrc.supports({ section: 'invalid_sec' }), false);

  const remoteSrc = new VACTRemoteJsonSource({
    id: 'test_remote_valid',
    url: validFixtureUrl,
    priority: 100
  });
  assert.equal(remoteSrc.id, 'test_remote_valid');
  assert.equal(remoteSrc.url, validFixtureUrl);
  assert.equal(remoteSrc.enabled, true);
  assert.equal(remoteSrc.priority, 100);
  assert.equal(typeof remoteSrc.supports, 'function');
  assert.equal(typeof remoteSrc.query, 'function');

  // =========================================================================
  // 2. REMOTE JSON NORMALIZATION & PROVENANCE PRESERVATION
  // =========================================================================
  console.log('2. Verifying remote JSON question normalization & provenance preservation...');

  const validRes = await remoteSrc.query();
  assert.equal(validRes.sourceId, 'test_remote_valid');
  assert.equal(validRes.count, 6, 'Should normalize exactly 6 valid questions');
  assert.equal(validRes.questions.length, 6);

  const sampleQ = validRes.questions.find(q => q.id === 'remote_phy_001');
  assert.ok(sampleQ, 'remote_phy_001 must exist');
  assert.equal(sampleQ.section, 'scientific_reasoning');
  assert.equal(sampleQ.skill, 'physics');
  assert.equal(sampleQ.difficulty, 'medium');
  assert.equal(sampleQ.correctAnswer, 'B');
  assert.ok(sampleQ.signature, 'Question must have computed cryptographic signature');

  // Check provenance
  assert.ok(sampleQ.source, 'Source provenance must be preserved');
  assert.equal(sampleQ.source.provider, 'V-ACT Practice Consortium');
  assert.equal(sampleQ.source.title, 'Đề thi thử ĐHQG-HCM 2026');
  assert.equal(sampleQ.source.year, 2026);
  assert.equal(sampleQ.source.page, 12);
  assert.equal(sampleQ.source.remoteSourceId, 'test_remote_valid');

  // =========================================================================
  // 3. REJECTION OF INVALID REMOTE RECORDS
  // =========================================================================
  console.log('3. Verifying graceful handling and rejection of malformed remote records...');

  const invalidSrc = new VACTRemoteJsonSource({
    id: 'test_remote_invalid',
    url: invalidFixtureUrl
  });

  const invalidRes = await invalidSrc.query();
  assert.equal(invalidRes.sourceId, 'test_remote_invalid');
  assert.equal(invalidRes.count, 1, 'Only 1 valid question should survive');
  assert.equal(invalidRes.questions[0].id, 'valid_survivor_001');

  const diag = invalidSrc.getDiagnostics();
  assert.equal(diag.inspected, 5, 'Inspected 5 raw records');
  assert.equal(diag.valid, 1, '1 valid record');
  assert.equal(diag.invalid, 4, '4 invalid records safely rejected');
  assert.equal(diag.status, 'ready');

  // =========================================================================
  // 4. IN-MEMORY CACHING & TTL
  // =========================================================================
  console.log('4. Verifying in-memory caching and TTL policy...');

  assert.equal(remoteSrc._diagnostics.cacheHits, 0);
  // Second query should hit cache
  await remoteSrc.query();
  assert.equal(remoteSrc._diagnostics.cacheHits, 1, 'Cache hit count should increment');

  // Third query should hit cache again
  await remoteSrc.query();
  assert.equal(remoteSrc._diagnostics.cacheHits, 2, 'Cache hit count should be 2');

  // Force clear cache
  remoteSrc.clearCache();
  assert.equal(remoteSrc.isCacheValid(), false);
  await remoteSrc.query();
  assert.equal(remoteSrc._diagnostics.cacheHits, 2, 'Cache hit should not increment after clear');

  // =========================================================================
  // 5. NETWORK FAILURE & TIMEOUT RESILIENCE
  // =========================================================================
  console.log('5. Verifying network failure resilience (REMOTE_SOURCE_UNAVAILABLE)...');

  // Temporarily whitelist a dummy test domain to test network error without security block
  VACTSourceConfig.addAuthorizedUrlPrefix('https://api.k-edu.vn/mock-unreachable');

  const failingSrc = new VACTRemoteJsonSource({
    id: 'test_failing_feed',
    url: 'https://api.k-edu.vn/mock-unreachable/offline.json',
    fetchFn: async () => {
      const err = new Error('ECONNREFUSED: Server connection refused');
      err.code = 'ECONNREFUSED';
      throw err;
    }
  });

  // Querying failing source directly
  const failRes = await failingSrc.query();
  assert.equal(failRes.count, 0);
  assert.ok(failRes.diagnostics);
  assert.equal(failRes.diagnostics.error, 'REMOTE_SOURCE_UNAVAILABLE');
  assert.ok(failRes.diagnostics.details.includes('ECONNREFUSED'));

  // Manager querying failing source along with healthy internal source
  const testManager = new VACTSourceManager();
  testManager.registerSource(failingSrc);

  // Internal has 20 physics questions. Requesting 25 will query failingSrc for the remainder:
  const managerRes = await testManager.query({ section: 'scientific_reasoning', skill: 'physics', limit: 25 });
  assert.equal(managerRes.count, 20, 'Should fall back to internal source and return available 20 questions');
  assert.ok(managerRes.diagnostics.warnings.some(w => w.error === 'REMOTE_SOURCE_UNAVAILABLE'));

  // Clean up admin prefix
  VACTSourceConfig.removeAuthorizedUrlPrefix('https://api.k-edu.vn/mock-unreachable');

  // =========================================================================
  // 6. SECURITY & URL WHITELIST VERIFICATION
  // =========================================================================
  console.log('6. Verifying security policy and URL whitelist protection...');

  // Attempting to use unauthorized student/external URL
  const untrustedSrc = new VACTRemoteJsonSource({
    id: 'test_untrusted',
    url: 'https://commercial-exams-paywall.com/scrape-feed.json'
  });

  const untrustedRes = await untrustedSrc.query();
  assert.equal(untrustedRes.count, 0);
  assert.equal(untrustedRes.diagnostics.error, 'REMOTE_SOURCE_UNAVAILABLE');
  assert.ok(untrustedRes.diagnostics.details.includes('Security Exception') || untrustedRes.diagnostics.details.includes('whitelist'));

  // Whitelisted URLs pass
  assert.equal(VACTSourceConfig.isAuthorizedSourceUrl('https://api.k-edu.vn/feeds/test.json').authorized, true);
  assert.equal(VACTSourceConfig.isAuthorizedSourceUrl('https://raw.githubusercontent.com/k-edu/vact/test.json').authorized, true);
  assert.equal(VACTSourceConfig.isAuthorizedSourceUrl('http://insecure-domain.org/feed.json').authorized, false);

  // =========================================================================
  // 7. SOURCE PRIORITY & WATERFALL MERGE
  // =========================================================================
  console.log('7. Verifying source priority and waterfall merging...');

  const smMerge = new VACTSourceManager();
  // Internal source has 20 physics questions in current repository bank
  // Register remote source with 2 physics questions
  smMerge.registerSource(new VACTRemoteJsonSource({
    id: 'remote_science_feed',
    url: validFixtureUrl,
    priority: 100
  }));

  // Student requests 21 physics questions:
  // Internal provides 20, remaining 1 fulfilled from remote!
  const mergeRes = await smMerge.query({
    section: 'scientific_reasoning',
    skill: 'physics',
    limit: 21
  });

  assert.equal(mergeRes.count, 21, 'Should merge 20 internal + 1 remote = 21 questions');
  assert.equal(mergeRes.sourceBreakdown.internal, 20);
  assert.equal(mergeRes.sourceBreakdown.remote_science_feed, 1);

  // =========================================================================
  // 8. CROSS-SOURCE DEDUPLICATION
  // =========================================================================
  console.log('8. Verifying cross-source cryptographic deduplication...');

  const smDedup = new VACTSourceManager();
  // dupFixture contains:
  // - remote_dup_internal_phy_01 (identical text to legacy:KHTN6_VATLY_01 in internal bank, but higher quality)
  // - remote_dup_valid_sample_01 (identical text to remote_phy_001)
  // - remote_phy_distinct_099 (distinct)
  smDedup.registerSource(new VACTRemoteJsonSource({
    id: 'dup_feed',
    url: dupFixtureUrl,
    priority: 100
  }));

  const dedupRes = await smDedup.query({
    section: 'scientific_reasoning',
    skill: 'physics'
  });

  // The duplicate question must only appear ONCE in the combined result
  const matchedStem = 'Đơn vị đo độ dài hợp pháp trong hệ thống đo lường chính thức của nước ta là:';
  const matchingQuestions = dedupRes.questions.filter(q => q.question.includes(matchedStem));
  assert.equal(matchingQuestions.length, 1, 'Question appearing in internal and remote must be included exactly ONCE!');

  // Canonical record selection: remote record with reviewed: true should win over unreviewed
  assert.equal(matchingQuestions[0].quality.sourceVerified, true, 'Best quality record should be selected');
  assert.equal(matchingQuestions[0].source.provider, 'Verified V-ACT Consortium');

  // =========================================================================
  // 9. MULTI-TIER COMBINED COVERAGE MATRIX
  // =========================================================================
  console.log('9. Verifying combined coverage matrix (Internal, Remote, Combined unique)...');

  const smCoverage = new VACTSourceManager();
  smCoverage.registerSource(new VACTRemoteJsonSource({
    id: 'remote_science_1',
    url: validFixtureUrl,
    priority: 100
  }));

  const coverageReport = await smCoverage.getCombinedCoverage();
  assert.ok(coverageReport.summary);
  assert.ok(coverageReport.summary.internalTotal > 0);
  assert.equal(coverageReport.summary.remoteTotal, 6);
  assert.ok(coverageReport.summary.combinedUniqueTotal > 0);

  // Check Physics section breakdown:
  // Internal: 20
  // Remote: 2
  // Combined unique: 22
  const phyStats = coverageReport.sections.scientific_reasoning.skills.physics;
  assert.ok(phyStats);
  assert.equal(phyStats.internal, 20, 'Internal physics count should be 20');
  assert.equal(phyStats.remote, 2, 'Remote physics count should be 2');
  assert.equal(phyStats.combinedUnique, 22, 'Combined unique physics count should be 22');

  // Test coverage integration via VACTCoverage.getCombinedCoverage()
  const vactCovResult = await vact.VACTCoverage.getCombinedCoverage();
  assert.ok(vactCovResult.summary);
  assert.ok(vactCovResult.sections);

  console.log('--- ALL V-ACT EXTERNAL QUESTION SOURCE TESTS PASSED SUCCESSFULLY ---');
})();
