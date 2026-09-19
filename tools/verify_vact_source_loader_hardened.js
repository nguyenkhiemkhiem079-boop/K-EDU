/**
 * K-EDU V-ACT Hardened sourceBankLoader Runtime Verification Suite
 * Verifies all Section 27 requirements.
 */

const assert = require('assert');
const sourceBankLoader = require('../js/vact/bank/sourceBankLoader');

console.log('================================================================');
console.log('🧪 VERIFY HARDENED V-ACT SOURCE LOADER SUITE');
console.log('================================================================\n');

const validSources = new Set(['SRC_DGNL_2025_OFFICIAL_SAMPLE']);

function createValidQuestion() {
  return {
    id: 'TEST_Q_VALID',
    status: 'production',
    section: 'math',
    question: 'Giải phương trình $x + 2 = 5$.',
    options: ['A. $x = 3$', 'B. $x = 1$', 'C. $x = 2$', 'D. $x = 4$'],
    correctAnswer: 'A',
    source: {
      sourceId: 'SRC_DGNL_2025_OFFICIAL_SAMPLE',
      sourceFile: 'data/vact/raw/sample.pdf',
      extractedFromSource: true
    },
    quality: {
      answerVerified: true
    }
  };
}

// 1. Option count validation
console.log('👉 [TEST 1] Option count validation: 2 options -> fail, 3 options -> fail, 4 options -> pass');
const q2Options = createValidQuestion();
q2Options.options = ['A. 1', 'B. 2'];
assert.strictEqual(sourceBankLoader.validateQuestion(q2Options, validSources), false, '2 options must fail validation');

const q3Options = createValidQuestion();
q3Options.options = ['A. 1', 'B. 2', 'C. 3'];
assert.strictEqual(sourceBankLoader.validateQuestion(q3Options, validSources), false, '3 options must fail validation');

const q4Options = createValidQuestion();
assert.strictEqual(sourceBankLoader.validateQuestion(q4Options, validSources), true, '4 options must pass validation');
console.log('  => [TEST 1 PASSED]\n');

// 2. Non-production status validation
console.log('👉 [TEST 2] Non-production status -> fail');
const qDraft = createValidQuestion();
qDraft.status = 'draft';
assert.strictEqual(sourceBankLoader.validateQuestion(qDraft, validSources), false, 'draft status must fail validation');

const qReview = createValidQuestion();
qReview.status = 'review';
assert.strictEqual(sourceBankLoader.validateQuestion(qReview, validSources), false, 'review status must fail validation');
console.log('  => [TEST 2 PASSED]\n');

// 3. Invalid sourceId validation
console.log('👉 [TEST 3] Invalid sourceId -> fail');
const qBadSource = createValidQuestion();
qBadSource.source.sourceId = 'UNREGISTERED_SOURCE_XYZ';
assert.strictEqual(sourceBankLoader.validateQuestion(qBadSource, validSources), false, 'Unregistered sourceId must fail validation');
console.log('  => [TEST 3 PASSED]\n');

// 4. answerVerified false validation
console.log('👉 [TEST 4] answerVerified false -> fail');
const qUnverified = createValidQuestion();
qUnverified.quality.answerVerified = false;
assert.strictEqual(sourceBankLoader.validateQuestion(qUnverified, validSources), false, 'answerVerified false must fail validation');
console.log('  => [TEST 4 PASSED]\n');

// 5. extractedFromSource false validation
console.log('👉 [TEST 5] extractedFromSource false -> fail');
const qNotExtracted = createValidQuestion();
qNotExtracted.source.extractedFromSource = false;
assert.strictEqual(sourceBankLoader.validateQuestion(qNotExtracted, validSources), false, 'extractedFromSource false must fail validation');
console.log('  => [TEST 5 PASSED]\n');

// 6. One bad question in otherwise valid bank -> entire loader load must fail
console.log('👉 [TEST 6] One bad question in otherwise valid bank fails entire loader load');
(async () => {
  const customLoader = sourceBankLoader.createLoader(null);

  // Mock fetch function returning 1 bad question among valid ones
  const mockQuestions = [
    createValidQuestion(),
    {
      ...createValidQuestion(),
      id: 'BAD_QUESTION_1',
      options: ['Only one option', 'Second option'] // fails 4-options requirement
    }
  ];
  const mockSources = [
    { sourceId: 'SRC_DGNL_2025_OFFICIAL_SAMPLE', id: 'SRC_DGNL_2025_OFFICIAL_SAMPLE' }
  ];

  customLoader.setFetchFn(async (url) => {
    if (url.includes('questions.json')) {
      return { ok: true, json: async () => mockQuestions };
    }
    if (url.includes('sources.json')) {
      return { ok: true, json: async () => mockSources };
    }
    return { ok: false, status: 404 };
  });

  let loadFailed = false;
  let failureError = null;
  try {
    await customLoader.ready();
  } catch (err) {
    loadFailed = true;
    failureError = err;
  }

  assert.strictEqual(loadFailed, true, 'Custom loader must throw error when any question fails validation');
  assert.ok(failureError && failureError.message.includes('SOURCE_BANK_INVALID_QUESTION:BAD_QUESTION_1:INVALID_OPTION_COUNT'),
    `Error message must include SOURCE_BANK_INVALID_QUESTION:BAD_QUESTION_1:INVALID_OPTION_COUNT, got: ${failureError?.message}`);
  assert.strictEqual(customLoader.getStatus(), 'error');
  console.log('  => [TEST 6 PASSED]\n');

  console.log('🎉 ALL HARDENED SOURCE LOADER TESTS PASSED SUCCESSFULLY!');
})();
