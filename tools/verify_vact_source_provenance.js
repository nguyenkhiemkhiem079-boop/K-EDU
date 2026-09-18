const assert = require('assert');
const fs = require('fs');
const path = require('path');

function runProvenanceQA() {
  console.log('Testing V-ACT Source Provenance Requirements...');
  const bankPath = path.resolve('data', 'vact', 'questions.json');
  const manifestPath = path.resolve('data', 'vact', 'sources.json');

  assert.ok(fs.existsSync(bankPath), 'data/vact/questions.json must exist');
  assert.ok(fs.existsSync(manifestPath), 'data/vact/sources.json must exist');

  const questions = JSON.parse(fs.readFileSync(bankPath, 'utf8'));
  const sources = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const sourceIdSet = new Set(sources.map(s => s.sourceId));

  assert.ok(questions.length > 0, 'Production question bank must not be empty');

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];

    // Check 1: sourceId exists and is valid
    assert.ok(q.source && q.source.sourceId, `Question #${i} (${q.id}) must have source.sourceId`);
    assert.ok(sourceIdSet.has(q.source.sourceId), `Question #${i} (${q.id}) sourceId "${q.source.sourceId}" must exist in manifest`);

    // Check 2: sourceFile exists
    assert.ok(q.source.sourceFile, `Question #${i} (${q.id}) must have source.sourceFile`);

    // Check 3: extractedFromSource is true
    assert.strictEqual(q.source.extractedFromSource, true, `Question #${i} (${q.id}) source.extractedFromSource must be true`);

    // Check 4: answerVerified is true
    assert.strictEqual(q.quality?.answerVerified, true, `Question #${i} (${q.id}) quality.answerVerified must be true`);
    assert.ok(['A', 'B', 'C', 'D'].includes(q.correctAnswer), `Question #${i} (${q.id}) correctAnswer must be A, B, C, or D`);

    // Check 5: status is production
    assert.strictEqual(q.status, 'production', `Question #${i} (${q.id}) status must be production`);
  }

  console.log(`PASS: All ${questions.length} production questions strictly verified for source provenance and verified answers!`);
}

if (require.main === module) {
  runProvenanceQA();
}

module.exports = {
  runProvenanceQA
};
