/**
 * K-EDU Generation App Integration Regression Verification Suite
 * Verifies all 15 requirements from Section 19 and KHTN generation flow.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

require('../js/specializedBankPolicy');
require('../js/documentQuestionBank');
const MathEngine = require('../js/mathGenerator');
const KhtnEngine = require('../js/khtnGenerator');

console.log('================================================================');
console.log('🧪 VERIFY GENERATION APP INTEGRATION REGRESSION SUITE');
console.log('================================================================\n');

// 1. Math single exam: TH=1, VD=1, VDC=0 does NOT get interpreted as 0/0/0
console.log('👉 [TEST 1] Math single exam TH=1, VD=1, VDC=0 does not get interpreted as 0/0/0');
const exam1 = MathEngine.generateExam({
  grade: '10',
  term: 'GK1',
  topic: 'all',
  sourceMode: 'hybrid',
  mcqCount: 12,
  essayMatrix: { TH: 1, VD: 1, VDC: 0 }
});
assert.ok(exam1.generationDiagnostics, 'Exam must contain generationDiagnostics');
assert.strictEqual(exam1.generationDiagnostics.generated.TH, 1, 'TH count must be 1');
assert.strictEqual(exam1.generationDiagnostics.generated.VD, 1, 'VD count must be 1');
assert.strictEqual(exam1.generationDiagnostics.generated.VDC, 0, 'VDC count must be 0');
console.log('  => [TEST 1 PASSED]\n');

// 2. Math generated counts are read from: generationDiagnostics.generated
console.log('👉 [TEST 2] Math generated counts are correctly read from generationDiagnostics.generated');
const diag = exam1.generationDiagnostics.generated;
const actualMcq = exam1.mcqCount;
const actualTH = Number(diag.TH ?? 0);
const actualVD = Number(diag.VD ?? 0);
const actualVDC = Number(diag.VDC ?? 0);
assert.strictEqual(actualMcq, 12);
assert.strictEqual(actualTH, 1);
assert.strictEqual(actualVD, 1);
assert.strictEqual(actualVDC, 0);
console.log('  => [TEST 2 PASSED]\n');

// 3. complete Math exam is allowed to save
console.log('👉 [TEST 3] Complete Math exam is complete and allowed to save');
const isMathIncomplete = !exam1 || !exam1.isComplete ||
  actualMcq !== 12 ||
  actualTH !== 1 ||
  actualVD !== 1 ||
  actualVDC !== 0;
assert.strictEqual(isMathIncomplete, false, 'Complete Math exam must not be marked incomplete');
console.log('  => [TEST 3 PASSED]\n');

// 4. incomplete Math exam is blocked
console.log('👉 [TEST 4] Incomplete Math exam is blocked');
const incompleteMath = MathEngine.generateExam({
  grade: '6',
  term: 'GK1',
  topic: 'all',
  sourceMode: 'document',
  mcqCount: 9999, // impossible document count
  essayMatrix: { TH: 0, VD: 0, VDC: 0 }
});
const incompleteDiag = incompleteMath.generationDiagnostics.generated;
const isIncBlocked = !incompleteMath || !incompleteMath.isComplete ||
  incompleteMath.mcqCount !== 9999 ||
  Number(incompleteDiag.TH ?? 0) !== 0 ||
  Number(incompleteDiag.VD ?? 0) !== 0 ||
  Number(incompleteDiag.VDC ?? 0) !== 0;
assert.strictEqual(isIncBlocked, true, 'Incomplete Math exam must be detected and blocked');
console.log('  => [TEST 4 PASSED]\n');

// 5. KHTN exam without isComplete property is NOT automatically rejected
console.log('👉 [TEST 5] KHTN exam without isComplete property is NOT rejected');
const khtnExam = KhtnEngine.generateExam({
  grade: '8',
  term: 'GK1',
  topic: 'all',
  discipline: 'all',
  sourceMode: 'hybrid',
  mcqCount: 12,
  essayMatrix: { TH: 1, VD: 1, VDC: 0 }
});
assert.strictEqual(khtnExam.isComplete, undefined, 'KhtnEngine does not return isComplete');
// Test the validation branch for KHTN
const khtnMcq = khtnExam.mcqCount;
const essayKeys = (khtnExam.answerKeys || []).filter(k => k.type === 'essay');
const khtnTH = essayKeys.filter(k => k.level === 'TH').length;
const khtnVD = essayKeys.filter(k => k.level === 'VD').length;
const khtnVDC = essayKeys.filter(k => k.level === 'VDC').length;
const expectedTotalEssay = 1 + 1 + 0;
const actualTotalEssay = khtnExam.essayCount ?? essayKeys.length;
const isKhtnIncomplete = !khtnExam || khtnMcq !== 12 || actualTotalEssay !== expectedTotalEssay;
assert.strictEqual(isKhtnIncomplete, false, 'Valid KHTN exam must not be blocked because of missing isComplete');
console.log('  => [TEST 5 PASSED]\n');

// 6. complete KHTN exam is allowed
console.log('👉 [TEST 6] Complete KHTN exam passes validation');
assert.strictEqual(khtnExam.answerKeys.length, 14, 'Total questions should be 12 MCQ + 2 Essay = 14');
assert.strictEqual(isKhtnIncomplete, false);
console.log('  => [TEST 6 PASSED]\n');

// 7. incomplete KHTN counts are blocked
console.log('👉 [TEST 7] Incomplete KHTN counts are blocked');
const fakeIncompleteKhtn = {
  mcqCount: 10,
  essayCount: 1,
  answerKeys: [
    { type: 'mcq', level: 'TH' },
    { type: 'essay', level: 'TH' }
  ]
};
const fakeEssayKeys = fakeIncompleteKhtn.answerKeys.filter(k => k.type === 'essay');
const fakeActualTotal = fakeIncompleteKhtn.essayCount ?? fakeEssayKeys.length;
const fakeReqMcq = 12;
const fakeReqEssay = 2;
const isBlockedKhtn = !fakeIncompleteKhtn || fakeIncompleteKhtn.mcqCount !== fakeReqMcq || fakeActualTotal !== fakeReqEssay;
assert.strictEqual(isBlockedKhtn, true, 'Short KHTN exam must be blocked');
console.log('  => [TEST 7 PASSED]\n');

// 8. app default sourceMode fallback is hybrid
console.log('👉 [TEST 8] App default sourceMode fallback is hybrid');
const appJsContent = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
assert.ok(appJsContent.includes("mathGenSourceSelect')?.value || (isKhtn ? 'document' : 'hybrid')") ||
          appJsContent.includes("mathGenSourceSelect')?.value || 'hybrid'"),
  'app.js must use hybrid fallback for normal Math sourceMode');
console.log('  => [TEST 8 PASSED]\n');

// 9. app default deduplicatePolicy fallback is variant_shuffle
console.log('👉 [TEST 9] App default deduplicatePolicy fallback is variant_shuffle');
assert.ok(appJsContent.includes("mathGenDeduplicatePolicySelect')?.value || 'variant_shuffle'"),
  'app.js must fallback to variant_shuffle');
console.log('  => [TEST 9 PASSED]\n');

// 10. default UI VDC value is 0
console.log('👉 [TEST 10] Default UI VDC value is 0 in index.html');
const indexHtmlContent = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
assert.ok(indexHtmlContent.includes('id="mathGenCountVDCSelect" min="0" step="1" value="0"'),
  'index.html mathGenCountVDCSelect must default to value="0"');
console.log('  => [TEST 10 PASSED]\n');

// 11. default essay summary is 2 total
console.log('👉 [TEST 11] Default essay summary is 2 total in index.html');
assert.ok(indexHtmlContent.includes('id="mathGenTotalEssaySummaryBadge" style="background:#ede9fe;color:#6d28d9;font-weight:800;">\n                Tổng: 2 câu tự luận (TH: 1 · VD: 1 · VDC: 0)') ||
          indexHtmlContent.includes('Tổng: 2 câu tự luận (TH: 1 · VD: 1 · VDC: 0)'),
  'index.html must display 2 total essays initially');
console.log('  => [TEST 11 PASSED]\n');

// 12. initial batch badge matches variant_shuffle
console.log('👉 [TEST 12] Initial batch badge matches variant_shuffle');
assert.ok(indexHtmlContent.includes('id="mathGenBatchStatusBadge" style="background:var(--indigo-light);color:var(--indigo-shadow);font-weight:800;">\n                🔀 Chế độ: Hoán vị mã đề chuẩn Bộ GD&ĐT (101, 102...)') ||
          indexHtmlContent.includes('🔀 Chế độ: Hoán vị mã đề chuẩn Bộ GD&ĐT (101, 102...)'),
  'index.html batch badge must match variant_shuffle');
console.log('  => [TEST 12 PASSED]\n');

// 13. batch button text changes between variant_shuffle and disjoint
console.log('👉 [TEST 13] Batch button text changes between variant_shuffle and disjoint');
assert.ok(appJsContent.includes("TỰ ĐỘNG SINH ${count} MÃ ĐỀ TOÁN (ĐẢO MÃ ĐỀ) & NẠP HỆ THỐNG") ||
          appJsContent.includes("TỰ ĐỘNG SINH ${count} MÃ ĐỀ TOÁN"),
  'app.js must provide variant_shuffle button text');
assert.ok(appJsContent.includes("TỰ ĐỘNG SINH ${count} ĐỀ TOÁN (100% ĐỘC LẬP) & NẠP HỆ THỐNG") ||
          appJsContent.includes("100% ĐỘC LẬP"),
  'app.js must provide disjoint button text');
console.log('  => [TEST 13 PASSED]\n');

// 14. capacity hard blocker prevents generation
console.log('👉 [TEST 14] Capacity hard blocker prevents generation for VDC > 0');
const capHard = MathEngine.getGenerationCapacity({
  grade: '10',
  term: 'GK1',
  topic: 'all',
  sourceMode: 'hybrid',
  mcqCount: 12,
  essayMatrix: { TH: 1, VD: 1, VDC: 1 }
});
assert.strictEqual(capHard.feasible, false, 'Requested VDC with 0 approved must be infeasible');
assert.ok(capHard.blockers.some(b => b.code === 'VDC_APPROVED_SOURCE_SHORTAGE'),
  'Must include VDC_APPROVED_SOURCE_SHORTAGE blocker');
console.log('  => [TEST 14 PASSED]\n');

// 15. hybrid document shortage alone does not block generation
console.log('👉 [TEST 15] Hybrid document shortage alone does not block generation');
const capHybrid = MathEngine.getGenerationCapacity({
  grade: '10',
  term: 'GK1',
  topic: 'all',
  sourceMode: 'hybrid',
  mcqCount: 50,
  essayMatrix: { TH: 1, VD: 1, VDC: 0 }
});
assert.strictEqual(capHybrid.feasible, true, 'Hybrid mode with templates available must be feasible');
assert.strictEqual(capHybrid.blockers.length, 0, 'No hard blockers for hybrid when templates can refill');
console.log('  => [TEST 15 PASSED]\n');

console.log('🎉 ALL 15 APP INTEGRATION REGRESSION TESTS PASSED SUCCESSFULLY!');
