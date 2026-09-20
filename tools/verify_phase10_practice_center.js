const assert = require('node:assert/strict');
const vact = require('../js/vact');

const taxonomy = vact.VACT_TAXONOMY;
assert.deepEqual(taxonomy.vietnamese, ['reading_comprehension', 'vocabulary', 'grammar', 'language_usage', 'literary_analysis', 'inference']);
assert.deepEqual(taxonomy.math, ['algebra', 'functions', 'geometry', 'probability_statistics', 'real_world_math', 'data_reading']);
assert.ok(taxonomy.scientific_reasoning.includes('economics_law'));
assert.ok(taxonomy.scientific_reasoning.includes('economics'), 'Backward-compatible economics alias must remain visible');

const center = vact.VACTPracticeCenter;
const coverage = center.getTopicCoverage();
assert.equal(coverage.math.length, taxonomy.math.length);
assert.equal(coverage.math.find(item => item.skill === 'algebra').available, 0, 'Unclassified bank must not be presented as algebra coverage');
assert.equal(coverage.math.find(item => item.skill === 'algebra').ready, false);
assert.deepEqual(coverage.math.find(item => item.skill === 'algebra').supportedDifficulties, ['mixed']);

const sectionRequest = center.getPracticeRequestStatus({ section: 'math', count: 5, difficulty: 'mixed' });
assert.equal(sectionRequest.complete, true, 'Section-level practice may use real section questions');
const generated = center.generatePractice({ section: 'math', count: 5, difficulty: 'mixed', seed: 'phase10-math' });
assert.equal(generated.generatedCount, 5);
assert.equal(generated.questions.length, 5);
assert.equal(new Set(generated.questionSignatures).size, 5, 'Practice questions must be unique');
for (const q of generated.questions) {
  assert.equal(q.status, 'production');
  assert.equal(q.options.length, 4);
  assert.ok(['A', 'B', 'C', 'D'].includes(q.correctAnswer));
}
assert.throws(() => center.generatePractice({ section: 'math', skill: 'algebra', count: 1, difficulty: 'mixed' }), /NO_PRODUCTION_DATA|POOL_SHORTAGE/);
assert.throws(() => center.generatePractice({ section: 'logic_data', count: 9999, difficulty: 'mixed' }), /POOL_SHORTAGE/);

const saved = center.savePracticeResult({
  section: 'math', skill: null, questionCount: 5, correct: 4, wrong: 1, accuracy: 80,
  timeSpent: 92, questionSignatures: generated.questionSignatures, review: generated.questions.map((q, index) => ({ id: q.id, signature: generated.questionSignatures[index], section: 'math', skill: null, isCorrect: index < 4, given: index < 4 ? q.correctAnswer : 'A' }))
}, { studentName: 'Phase 10', studentClass: '10A1', studentId: 'phase10-student' });
assert.equal(saved.questionCount, 5);
assert.equal(saved.wrong, 1);
assert.equal(saved.timeSpent, 92);
const reloaded = vact.performanceAnalytics.getAttempts({ studentId: 'phase10-student' });
assert.equal(reloaded.at(-1).questionSignatures.length, 5);
assert.equal(reloaded.at(-1).wrong, 1);
assert.equal(reloaded.at(-1).timeSpent, 92);
const skillStats = vact.performanceAnalytics.computeSkillAnalytics(reloaded);
assert.deepEqual(skillStats, {}, 'Weakness analytics must not invent a skill when review metadata is absent');
console.log('Phase 10 taxonomy rendering, truthful coverage, empty-topic disable, generation, uniqueness, persistence, and analytics update passed.');
