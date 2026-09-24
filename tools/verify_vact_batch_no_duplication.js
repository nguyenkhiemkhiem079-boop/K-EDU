/**
 * K-EDU V-ACT Batch Cross-Exam Duplication Regression Suite
 *
 * WHY THIS FILE EXISTS:
 * On 2026-09-23 it was found that generating multiple V-ACT exams (e.g. 5
 * Full-120 exams for 5 different classes sitting at once) by calling
 * generateFromProfile() repeatedly produced ~78% cross-exam duplicate
 * questions (263/337 occurrences in a 5-exam sample), because each call
 * started with a fresh, independent signature-dedup set with no memory of
 * what earlier exams in the same batch had already used.
 *
 * Fix: added generateBatch()/generateFull120Batch(), which thread ONE
 * shared signature set across every exam in the batch.
 *
 * This suite locks that guarantee in: any future change that makes
 * generateBatch() (or the profile-mixing helpers it depends on) forget to
 * carry `excludeSignatures` forward between exams will fail this test.
 */

const assert = require('assert');
const { VACTExamGenerator } = require('../js/vact/generator/examGenerator');
const { computeVACTQuestionSignature } = require('../js/vact/quality/signature');

console.log('================================================================');
console.log('🧪 VERIFY V-ACT BATCH GENERATION HAS ZERO CROSS-EXAM DUPLICATION');
console.log('================================================================\n');

console.log('👉 [TEST 1] 5-exam Full V-ACT (120q) batch has zero cross-exam duplicate questions\n');

const batch = VACTExamGenerator.generateFull120Batch(5, { seed: 'regression_no_dup_2026_09_23' });
assert.strictEqual(batch.exams.length, 5, 'Batch should produce exactly 5 exams');

const seenIn = new Map();
let crossExamDuplicates = 0;
batch.exams.forEach((exam, examIndex) => {
  exam.questions.forEach(q => {
    const sig = computeVACTQuestionSignature(q);
    if (seenIn.has(sig)) {
      crossExamDuplicates++;
      console.error(`  ❌ Question reused: first seen in exam #${seenIn.get(sig) + 1}, repeated in exam #${examIndex + 1} (signature: ${sig.slice(0, 60)}...)`);
    } else {
      seenIn.set(sig, examIndex);
    }
  });
});

assert.strictEqual(
  crossExamDuplicates, 0,
  `Found ${crossExamDuplicates} cross-exam duplicate question occurrence(s) — this is the exact bug fixed on 2026-09-23. Check that generateBatch() is still threading excludeSignatures across every exam in the loop.`
);
console.log(`  => [TEST 1 PASSED] 0 cross-exam duplicates across ${batch.exams.length} exams (${seenIn.size} unique questions used).\n`);

console.log('👉 [TEST 2] The first exam in any batch is always complete regardless of later exhaustion\n');

assert.strictEqual(batch.exams[0].isComplete, true, 'The first exam in a batch must always be complete — it has first access to the full pool before any exclusions apply.');
assert.strictEqual(batch.exams[0].generatedTotal, batch.exams[0].requestedTotal, 'First exam must generate its full requested question count.');
console.log('  => [TEST 2 PASSED] First exam in the batch is always complete.\n');

console.log('👉 [TEST 3] Batch honestly reports incompleteness when the bank cannot fill every exam (no silent duplication)\n');

// With the current (thin) Math/Logic/Science bank sizes, requesting 5 full
// exams is known to exceed capacity. The correct behavior is to report
// shortages honestly per exam, NOT to silently start repeating questions.
// isBatchComplete should reflect this rather than falsely claiming success.
const anyIncomplete = batch.exams.some(e => !e.isComplete);
if (anyIncomplete) {
  assert.strictEqual(batch.isBatchComplete, false, 'isBatchComplete must be false when any exam in the batch is incomplete.');
  console.log('  => [TEST 3 PASSED] Batch correctly reports isBatchComplete=false when bank capacity is exceeded (honest shortage, not silent duplication).\n');
} else {
  console.log('  => [TEST 3 SKIPPED] Bank currently has enough unique content for all 5 exams to be complete — nothing to verify here.\n');
}

console.log('================================================================');
console.log('✅ ALL V-ACT BATCH DUPLICATION TESTS PASSED');
console.log('================================================================');
