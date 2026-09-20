const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const quality = require('../tools/vact-ingestion/content_quality');
const { validateQuestion } = require('../tools/vact-ingestion/validate_questions');
const sourceBankLoader = require('../js/vact/bank/sourceBankLoader');

const root = path.resolve(__dirname, '..');
const production = JSON.parse(fs.readFileSync(path.join(root, 'data/vact/questions.json'), 'utf8'));
const reviewRequired = JSON.parse(fs.readFileSync(path.join(root, 'data/vact/review-required.json'), 'utf8'));
const report = JSON.parse(fs.readFileSync(path.join(__dirname, 'vact-content-corruption-report.json'), 'utf8'));

function hasCorruption(value, question) {
  return quality.hasCorruptedMathGlyphs(value) || (question?.section === 'math' && quality.hasBrokenMathLayout(value));
}

function assertClean(value, label, question) {
  assert.equal(hasCorruption(value, question), false, `${label} contains corrupted extraction glyphs/layout`);
}

for (const question of production) {
  assertClean(question.question, `${question.id}.question`, question);
  question.options.forEach((option, index) => assertClean(option, `${question.id}.options[${index}]`, question));
  assertClean(question.stimulus, `${question.id}.stimulus`, question);
  assertClean(question.explanation, `${question.id}.explanation`, question);
}

const visibleRegressionIds = [
  'vact_q_aad83b457b68',
  'vact_q_4640f8ef4c9a',
  'vact_q_3b4d6930d0da',
  'vact_q_c7791a572307',
  'vact_q_afacb56a8129',
  'vact_q_e21889288c6b'
];
const productionIds = new Set(production.map(question => question.id));
const reviewIds = new Set(reviewRequired.map(question => question.id));
for (const id of visibleRegressionIds) {
  if (id === 'vact_q_aad83b457b68') {
    const repaired = production.find(question => question.id === id);
    assert.ok(repaired?.sourceRepair, `${id} should carry source repair evidence`);
    assertClean(repaired.question, `${id}.question`, repaired);
    repaired.options.forEach((option, index) => assertClean(option, `${id}.options[${index}]`, repaired));
    assertClean(repaired.stimulus, `${id}.stimulus`, repaired);
    assertClean(repaired.explanation, `${id}.explanation`, repaired);
  } else {
    assert.equal(productionIds.has(id), false, `${id} must not remain production-ready while corrupted`);
    assert.equal(reviewIds.has(id), true, `${id} must be present in review-required.json`);
  }
}

const corrupted = {
  id: 'encoding-regression',
  section: 'math',
  question: 'Tập xác định là',
  options: ['  1 D =', 'D = R', 'D = [0;1]', 'D = R'],
  correctAnswer: 'A',
  source: { sourceId: 'source', sourceFile: 'source.pdf', sourcePage: 1, extractedFromSource: true },
  quality: { answerVerified: true, extractionVerified: true, contentComplete: true }
};
const validated = validateQuestion(corrupted);
assert.equal(validated.status, 'review_required');
assert.equal(validated.quality.extractionVerified, false);
assert.equal(validated.quality.contentComplete, false);
assert.ok(validated.validationIssues.includes('MATH_CONTENT_CORRUPTED'));
assert.equal(sourceBankLoader.getQuestionValidationFailureReason(corrupted, new Set(['source'])), 'MATH_CONTENT_CORRUPTED');

const explanationOnly = { ...corrupted, id: 'encoding-explanation-only', options: ['A', 'B', 'C', 'D'], explanation: 'Lời giải ' };
assert.equal(sourceBankLoader.getQuestionValidationFailureReason({ ...explanationOnly, status: 'production' }, new Set(['source'])), 'MATH_EXPLANATION_REPAIR_REQUIRED');

assert.equal(report.affectedProductionRecords, 0, 'corruption report must show zero affected production records after quarantine');
assert.ok(report.repairSummary.repairedIds.includes('vact_q_aad83b457b68'));
assert.ok(report.byField.option >= 1);
assert.ok(report.byField.explanation >= 1);

console.log(`V-ACT encoding QA passed: ${production.length} production records clean; ${report.affectedRecords} quarantined/review-required records tracked.`);
