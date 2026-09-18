const assert = require('node:assert/strict');
const path = require('node:path');
const vact = require('../js/vact');

console.log('--- Starting V-ACT Section Mini Test Generator Verification ---');

const generator = vact.VACTSectionTestGenerator;
assert.ok(generator, 'VACTSectionTestGenerator must exist');
assert.ok(typeof generator.generate === 'function', 'generator.generate must be a function');

// 1. 10 Math questions
console.log('1. Verifying generation of 10 Math questions...');
const test1 = generator.generate({
  section: 'math',
  count: 10,
  difficulty: 'balanced',
  seed: 'test_seed_10_math'
});
assert.equal(test1.mode, 'section_mini');
assert.equal(test1.section, 'math');
assert.equal(test1.requestedCount, 10);
assert.equal(test1.generatedCount, 10);
assert.equal(test1.missingCount, 0);
assert.equal(test1.questions.length, 10);
assert.equal(test1.shortages.length, 0);
assert.ok(test1.id.startsWith('vact_mini_math_'));
console.log(`- 10 Math questions successfully generated (${test1.id})`);

// 2. Custom count > 30 (e.g. 50 Math questions)
console.log('2. Verifying custom count > 30 (50 Math questions without arbitrary cap)...');
const test2 = generator.generate({
  section: 'math',
  count: 50,
  difficulty: 'balanced',
  seed: 'test_seed_50_math'
});
assert.equal(test2.requestedCount, 50);
assert.equal(test2.generatedCount, 50, 'Must generate exactly 50 without capping at 30');
assert.equal(test2.questions.length, 50);
console.log(`- 50 Math questions successfully generated without arbitrary cap`);

// 3. Logic/Data generation
console.log('3. Verifying Logic & Data analysis generation...');
const test3 = generator.generate({
  section: 'logic_data',
  count: 12,
  difficulty: 'balanced',
  seed: 'test_seed_12_logic'
});
assert.equal(test3.section, 'logic_data');
assert.equal(test3.requestedCount, 12);
assert.equal(test3.generatedCount, 12);
assert.equal(test3.questions.length, 12);
assert.ok(test3.questions.every(q => q.section === 'logic_data'));
console.log(`- 12 Logic & Data questions successfully generated`);

// 4. Targeted Science Practice: Physics (testing shortage reporting)
console.log('4. Verifying targeted science practice: Physics with shortage handling...');
// We know from coverage that only 20 physics questions exist.
const test4 = generator.generate({
  section: 'scientific_reasoning',
  skill: 'physics',
  count: 30, // Requesting 30 when only 20 exist
  seed: 'test_seed_physics_shortage'
});
assert.equal(test4.section, 'scientific_reasoning');
assert.equal(test4.skill, 'physics');
assert.equal(test4.requestedCount, 30, 'requestedCount must remain 30');
assert.equal(test4.generatedCount, 20, 'Should generate all 20 available physics questions');
assert.equal(test4.missingCount, 10, 'missingCount must be 10');
assert.equal(test4.questions.length, 20);
assert.ok(test4.questions.every(q => q.section === 'scientific_reasoning' && q.skill === 'physics'));
assert.equal(test4.shortages.length, 1);
assert.equal(test4.shortages[0].requested, 30);
assert.equal(test4.shortages[0].available, 20);
assert.equal(test4.shortages[0].missing, 10);
assert.equal(test4.shortages[0].reason, 'POOL_SHORTAGE');
console.log(`- Targeted Physics practice handled shortage cleanly: req 30 -> gen 20 (missing 10)`);

// 5. Exact difficulty mode
console.log('5. Verifying exact difficulty mode...');
const test5 = generator.generate({
  section: 'math',
  count: 15,
  difficulty: 'medium',
  seed: 'test_seed_exact_medium'
});
assert.equal(test5.difficulty, 'medium');
assert.equal(test5.generatedCount, 15);
assert.ok(test5.questions.every(q => q.difficulty === 'medium'), 'All questions must have medium difficulty');

// 6. Balanced difficulty mode and demand redistribution
console.log('6. Verifying balanced difficulty mode and demand redistribution...');
const test6 = generator.generate({
  section: 'math',
  count: 20,
  difficulty: 'balanced',
  seed: 'test_seed_balanced'
});
assert.equal(test6.generatedCount, 20);
assert.ok(test6.diagnostics.difficultyDistribution, 'Diagnostics must include difficulty distribution');
assert.equal(typeof test6.diagnostics.difficultyDistribution.redistributed, 'boolean');
console.log(`- Balanced difficulty diagnostics:`, test6.diagnostics.difficultyDistribution);

// 7. Intra-test duplicate prevention
console.log('7. Verifying intra-test duplicate prevention (unique signatures)...');
const test7 = generator.generate({
  section: 'math',
  count: 40,
  seed: 'test_seed_dedup'
});
const sigSet = new Set(test7.questions.map(q => vact.computeVACTQuestionSignature(q)));
assert.equal(sigSet.size, test7.questions.length, 'Every question signature within one generated test must be unique');
assert.equal(test7.questionSignatures.length, test7.questions.length);

// 8. Recent question exclusion
console.log('8. Verifying recent questions exclusion...');
const firstBatch = generator.generate({
  section: 'math',
  count: 10,
  seed: 'batch_1'
});
const firstBatchSignatures = firstBatch.questionSignatures;

const secondBatch = generator.generate({
  section: 'math',
  count: 10,
  excludeSignatures: firstBatchSignatures,
  seed: 'batch_2'
});
assert.equal(secondBatch.diagnostics.recentFallbackUsed, false, 'Should have enough math questions without needing fallback');
const secondBatchSigSet = new Set(secondBatch.questionSignatures);
for (const sig of firstBatchSignatures) {
  assert.equal(secondBatchSigSet.has(sig), false, 'Second batch must exclude recent signatures when pool allows');
}
console.log(`- Excluded 10 recent signatures successfully from second batch`);

// 9. Fallback when recent pool is exhausted
console.log('9. Verifying graceful fallback when all questions are marked recent...');
// In Vietnamese, there are only 7 questions. If we exclude all 7 and ask for 5:
const allViet = vact.VACTCoverage.getUniqueUsableQuestions().filter(q => q.section === 'vietnamese');
const allVietSigs = allViet.map(q => vact.computeVACTQuestionSignature(q));
assert.equal(allVietSigs.length, 7);

const vietFallbackTest = generator.generate({
  section: 'vietnamese',
  count: 5,
  excludeSignatures: allVietSigs, // all 7 are marked seen
  seed: 'viet_fallback'
});
assert.equal(vietFallbackTest.generatedCount, 5, 'Should fall back to seen questions rather than failing');
assert.equal(vietFallbackTest.diagnostics.recentFallbackUsed, true, 'recentFallbackUsed must be true');
console.log(`- Graceful fallback verified when recent pool was exhausted`);

// 10. Shortage reporting on completely empty pool (English = 0)
console.log('10. Verifying shortage reporting when pool is empty (English = 0)...');
const testEnglish = generator.generate({
  section: 'english',
  count: 20
});
assert.equal(testEnglish.requestedCount, 20);
assert.equal(testEnglish.generatedCount, 0);
assert.equal(testEnglish.missingCount, 20);
assert.equal(testEnglish.shortages.length, 1);
assert.equal(testEnglish.shortages[0].reason, 'POOL_SHORTAGE');
assert.equal(testEnglish.shortages[0].missing, 20);

// 11. Requested count remains unchanged in all cases
console.log('11. Verifying requestedCount invariant across tests...');
for (const t of [test1, test2, test3, test4, test5, test6, test7, testEnglish]) {
  assert.ok(typeof t.requestedCount === 'number');
  assert.equal(t.missingCount, Math.max(0, t.requestedCount - t.generatedCount));
}

// 12. Reproducibility with seed
console.log('12. Verifying reproducibility with seed...');
const runA = generator.generate({ section: 'math', count: 15, seed: 'fixed_seed_abc' });
const runB = generator.generate({ section: 'math', count: 15, seed: 'fixed_seed_abc' });
assert.deepEqual(
  runA.questions.map(q => q.id),
  runB.questions.map(q => q.id),
  'Same seed must yield identical question order'
);

console.log('--- ALL V-ACT SECTION MINI TEST GENERATOR TESTS PASSED SUCCESSFULLY ---');
