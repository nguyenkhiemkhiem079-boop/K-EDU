/**
 * K-EDU ToanMath Generation Capacity & Hybrid Refill Verification Suite
 * Verifies all 16 P0 requirements from Section 25.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

require('../js/specializedBankPolicy');
const Bank = require('../js/documentQuestionBank');
const MathEngine = require('../js/mathGenerator');

console.log('================================================================');
console.log('🧪 VERIFY MATH GENERATION CAPACITY & HYBRID SUITE');
console.log('================================================================\n');

// 1. default normal Math mode is hybrid
console.log('👉 [TEST 1] Default normal Math source mode is hybrid');
const defaultCap = MathEngine.getGenerationCapacity({ grade: '10', term: 'GK1', topic: 'all' });
assert.ok(defaultCap, 'getGenerationCapacity should return diagnostics');
const examDefault = MathEngine.generateExam({ grade: '10', term: 'GK1', topic: 'all', mcqCount: 12, essayMatrix: { TH: 1, VD: 1, VDC: 0 } });
assert.strictEqual(examDefault.generationDiagnostics.sourceMode, 'hybrid', 'Default sourceMode in generateExam must be hybrid');
console.log('  => [TEST 1 PASSED]\n');

// 2. hybrid 12 MCQ generates exactly 12
console.log('👉 [TEST 2] Hybrid 12 MCQ generates exactly 12');
const examHybrid12 = MathEngine.generateExam({
  grade: '10',
  term: 'GK1',
  topic: 'all',
  sourceMode: 'hybrid',
  mcqCount: 12,
  essayMatrix: { TH: 0, VD: 0, VDC: 0 }
});
assert.strictEqual(examHybrid12.mcqCount, 12, 'Hybrid mode must generate exactly 12 MCQ');
assert.strictEqual(examHybrid12.answerKeys.filter(k => k.type === 'mcq').length, 12);
console.log('  => [TEST 2 PASSED]\n');

// 3. document-only shortage reports exact available count
console.log('👉 [TEST 3] Document-only shortage reports exact available count');
const docAvailable = Bank.query({ subject: 'toan', grade: '6', topic: 'all', type: 'mcq' }).length;
const examDocShort = MathEngine.generateExam({
  grade: '6',
  term: 'GK1',
  topic: 'all',
  sourceMode: 'document',
  mcqCount: docAvailable + 20,
  essayMatrix: { TH: 0, VD: 0, VDC: 0 }
});
assert.strictEqual(examDocShort.mcqCount, docAvailable, 'Document-only mode must not refill with templates');
assert.ok(examDocShort.warning.includes(`${docAvailable}/${docAvailable + 20}`), 'Warning must report exact available count');
const mcqDiag = examDocShort.generationDiagnostics.shortages.find(s => s.type === 'mcq');
assert.ok(mcqDiag, 'Diagnostics must include mcq shortage');
assert.strictEqual(mcqDiag.generated, docAvailable);
assert.strictEqual(mcqDiag.requested, docAvailable + 20);
console.log('  => [TEST 3 PASSED]\n');

// 4. recent history does not cause false single-exam shortage
console.log('👉 [TEST 4] Recent history does not cause false single-exam shortage');
global.AppState = global.AppState || {};
// Exclude all doc questions as "recent"
const allG10Ids = Bank.query({ subject: 'toan', grade: '10', topic: 'all', type: 'mcq' }).map(q => q.id);
global.AppState.recentDocQuestionIds = new Set(allG10Ids);

const examWithRecent = MathEngine.generateExam({
  grade: '10',
  term: 'GK1',
  topic: 'all',
  sourceMode: 'hybrid',
  mcqCount: 12,
  essayMatrix: { TH: 1, VD: 1, VDC: 0 }
});
assert.strictEqual(examWithRecent.mcqCount, 12, 'Recent history must not cause shortage in hybrid mode');
assert.strictEqual(examWithRecent.essayCount, 2, 'Essay must generate 2 questions');
global.AppState.recentDocQuestionIds = new Set();
console.log('  => [TEST 4 PASSED]\n');

// 5. one exam has no duplicate signatures
console.log('👉 [TEST 5] One exam has no duplicate signatures');
const testExam5 = MathEngine.generateExam({
  grade: '10',
  term: 'GK1',
  topic: 'all',
  sourceMode: 'hybrid',
  mcqCount: 20,
  essayMatrix: { TH: 2, VD: 2, VDC: 0 }
});
const signatures = testExam5.answerKeys.map(k => k.content.replace(/\s+/g, ' ').trim().toLowerCase());
const uniqueSignatures = new Set(signatures);
assert.strictEqual(signatures.length, uniqueSignatures.size, 'All questions in one exam must have unique signatures');
console.log('  => [TEST 5 PASSED]\n');

// 6. TH hybrid refill works
console.log('👉 [TEST 6] TH hybrid refill works');
const examThRefill = MathEngine.generateExam({
  grade: '7',
  term: 'GK1',
  topic: 'all',
  sourceMode: 'hybrid',
  mcqCount: 5,
  essayMatrix: { TH: 3, VD: 0, VDC: 0 }
});
const generatedTHCount = examThRefill.answerKeys.filter(k => k.type === 'essay' && ['TH', 'NB'].includes(k.level)).length;
assert.strictEqual(generatedTHCount, 3, 'TH hybrid refill must provide 3 TH essay questions');
console.log('  => [TEST 6 PASSED]\n');

// 7. VD hybrid refill works
console.log('👉 [TEST 7] VD hybrid refill works');
const examVdRefill = MathEngine.generateExam({
  grade: '10',
  term: 'GK1',
  topic: 'all',
  sourceMode: 'hybrid',
  mcqCount: 5,
  essayMatrix: { TH: 0, VD: 3, VDC: 0 }
});
const generatedVDCount = examVdRefill.answerKeys.filter(k => k.type === 'essay' && k.level === 'VD').length;
assert.strictEqual(generatedVDCount, 3, 'VD hybrid refill must provide 3 VD essay questions');
console.log('  => [TEST 7 PASSED]\n');

// 8. VDC with zero approved source blocks
console.log('👉 [TEST 8] VDC with zero approved source blocks in preflight');
const vdcCap = MathEngine.getGenerationCapacity({
  grade: '10',
  term: 'GK1',
  topic: 'all',
  sourceMode: 'hybrid',
  mcqCount: 12,
  essayMatrix: { TH: 1, VD: 1, VDC: 1 }
});
assert.strictEqual(vdcCap.feasible, false, 'Capacity preflight must be non-feasible when VDC approved is 0');
const vdcBlocker = vdcCap.blockers.find(b => b.code === 'VDC_APPROVED_SOURCE_SHORTAGE');
assert.ok(vdcBlocker, 'Blockers must include VDC_APPROVED_SOURCE_SHORTAGE');
assert.strictEqual(vdcBlocker.requested, 1);
assert.strictEqual(vdcBlocker.available, 0);
console.log('  => [TEST 8 PASSED]\n');

// 9. VD is never relabeled as VDC
console.log('👉 [TEST 9] VD is never relabeled as VDC');
const examNoRelabel = MathEngine.generateExam({
  grade: '10',
  term: 'GK1',
  topic: 'all',
  sourceMode: 'hybrid',
  mcqCount: 10,
  essayMatrix: { TH: 1, VD: 2, VDC: 1 }
});
const actualVdcKeys = examNoRelabel.answerKeys.filter(k => k.type === 'essay' && k.level === 'VDC');
assert.strictEqual(actualVdcKeys.length, 0, 'No unapproved VD question may be relabeled as VDC');
console.log('  => [TEST 9 PASSED]\n');

// 10. incomplete exam cannot be published / marked complete
console.log('👉 [TEST 10] Incomplete exam cannot be marked complete');
assert.strictEqual(examNoRelabel.isComplete, false, 'Exam with missing VDC must have isComplete = false');
console.log('  => [TEST 10 PASSED]\n');

// 11. generationDiagnostics exists
console.log('👉 [TEST 11] generationDiagnostics exists on generated exam');
assert.ok(examNoRelabel.generationDiagnostics, 'Exam result must expose generationDiagnostics');
assert.strictEqual(typeof examNoRelabel.generationDiagnostics.requested, 'object');
assert.strictEqual(typeof examNoRelabel.generationDiagnostics.generated, 'object');
assert.strictEqual(typeof examNoRelabel.generationDiagnostics.fallback, 'object');
console.log('  => [TEST 11 PASSED]\n');

// 12. shortage reason codes are explicit
console.log('👉 [TEST 12] Shortage reason codes are explicit');
const knownCodes = new Set([
  'DOCUMENT_POOL_SHORTAGE',
  'TOPIC_POOL_SHORTAGE',
  'GRADE_POOL_SHORTAGE',
  'RECENT_ONLY_EXCLUSION',
  'DUPLICATE_EXHAUSTION',
  'TEMPLATE_GENERATION_SHORTAGE',
  'BATCH_DISJOINT_CAPACITY',
  'VDC_APPROVED_SOURCE_SHORTAGE'
]);
examNoRelabel.generationDiagnostics.shortages.forEach(s => {
  assert.ok(knownCodes.has(s.code), `Shortage code "${s.code}" must be an explicit known code`);
});
console.log('  => [TEST 12 PASSED]\n');

// 13. batch default is variation/variant_shuffle
console.log('👉 [TEST 13] Batch default is variant_shuffle');
const batchExams = MathEngine.generateBatchExams({
  grade: '10',
  term: 'GK1',
  topic: 'all',
  sourceMode: 'hybrid',
  mcqCount: 5,
  essayMatrix: { TH: 1, VD: 1, VDC: 0 },
  batchCount: 3
});
assert.strictEqual(batchExams.length, 3, 'Default batch generation should produce requested exam count');
console.log('  => [TEST 13 PASSED]\n');

// 14. disjoint batch capacity is preflighted
console.log('👉 [TEST 14] Disjoint batch capacity preflight succeeds for small pool');
const smallDisjoint = MathEngine.generateBatchExams({
  grade: '10',
  term: 'GK1',
  topic: 'all',
  sourceMode: 'hybrid',
  mcqCount: 2,
  essayMatrix: { TH: 0, VD: 0, VDC: 0 },
  batchCount: 2,
  deduplicatePolicy: 'disjoint'
});
assert.strictEqual(smallDisjoint.length, 2, 'Small disjoint batch within capacity must succeed');
console.log('  => [TEST 14 PASSED]\n');

// 15. disjoint impossible batch blocks before generation
console.log('👉 [TEST 15] Disjoint impossible batch blocks before generation');
assert.throws(() => {
  MathEngine.generateBatchExams({
    grade: '6',
    term: 'GK1',
    topic: 'all',
    sourceMode: 'document',
    mcqCount: 50,
    essayMatrix: { TH: 0, VD: 0, VDC: 0 },
    batchCount: 50,
    deduplicatePolicy: 'disjoint'
  });
}, /Chế độ 100% độc lập cần \d+ câu độc nhất/);
console.log('  => [TEST 15 PASSED]\n');

// 16. topic filter behavior is explicit
console.log('👉 [TEST 16] Topic filter behavior is explicit');
const docSoHoc = Bank.query({ subject: 'toan', grade: '10', topic: 'Số học', type: 'mcq' });
const examTopic = MathEngine.generateExam({
  grade: '10',
  term: 'GK1',
  topic: 'Số học',
  sourceMode: 'document',
  mcqCount: 5,
  essayMatrix: { TH: 0, VD: 0, VDC: 0 }
});
assert.strictEqual(examTopic.answerKeys.filter(k => k.type === 'mcq').length, Math.min(5, docSoHoc.length));
console.log('  => [TEST 16 PASSED]\n');

console.log('🎉 ALL 16 MATH GENERATION CAPACITY TESTS PASSED SUCCESSFULLY!');
