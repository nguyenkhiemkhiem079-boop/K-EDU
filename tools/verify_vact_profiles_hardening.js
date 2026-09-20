/**
 * V-ACT profile-driven production invariants.
 *
 * Includes the required 500-seed matrix for every canonical profile.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vact = require('../js/vact');

const profiles = vact.VACT_PROFILES;
const generator = vact.VACTExamGenerator;
const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');
const expectedSections = {
  vact_mini_30: { vietnamese: 8, english: 8, math: 7, logic_data: 3, scientific_reasoning: 4 },
  vact_mini_60: { vietnamese: 15, english: 15, math: 15, logic_data: 6, scientific_reasoning: 9 },
  vact_mini_100: { vietnamese: 25, english: 25, math: 25, logic_data: 10, scientific_reasoning: 15 },
  vact_full: { vietnamese: 30, english: 30, math: 30, logic_data: 12, scientific_reasoning: 18 }
};

assert.deepEqual(Object.keys(profiles).sort(), ['vact_full', 'vact_mini_100', 'vact_mini_30', 'vact_mini_60']);
for (const [profileId, sections] of Object.entries(expectedSections)) {
  const profile = profiles[profileId];
  assert.equal(vact.validateVACTProfile(profile).valid, true);
  assert.deepEqual(profile.sections, sections);
  assert.equal(Object.values(sections).reduce((sum, count) => sum + count, 0), profile.totalQuestions);
  assert.equal(vact.resolveVACTProfile(profileId).id, profileId);
}

assert.equal(vact.resolveVACTProfile('full120').id, 'vact_full');
assert.equal(vact.resolveVACTProfile('mini100').id, 'vact_mini_100');
assert.equal(vact.resolveVACTProfile('vact_mini_30').id, 'vact_mini_30');
assert.equal(vact.resolveVACTProfile('unknown_profile'), null);
assert.throws(() => generator.generateFromProfile({ totalQuestions: 30, sections: expectedSections.vact_mini_30 }), /Invalid exam profile/);
for (const profileId of Object.keys(expectedSections)) {
  assert.match(indexHtml, new RegExp(`value="${profileId}"`));
}
assert.match(appJs, /generateFromProfile\(profileId/);

function assertProductionQuestion(question) {
  assert.equal(question.status, 'production');
  assert.equal(question.quality?.answerVerified, true);
  assert.equal(question.source?.extractedFromSource, true);
  assert.ok(question.source?.sourceId);
  assert.ok(question.source?.sourceFile);
  assert.ok(['A', 'B', 'C', 'D'].includes(question.correctAnswer));
  assert.equal(question.options.length, 4);
}

for (const [profileId, expected] of Object.entries(expectedSections)) {
  const exam = generator.generateFromProfile(profileId, { seed: `profile-hardening-${profileId}` });
  assert.equal(exam.profileId, profileId);
  assert.equal(exam.requestedTotal, profiles[profileId].totalQuestions);
  assert.equal(exam.generatedTotal, profiles[profileId].totalQuestions);
  assert.equal(exam.missingTotal, 0);
  assert.equal(exam.isComplete, true);
  assert.equal(exam.questions.length, profiles[profileId].totalQuestions);
  assert.deepEqual(Object.fromEntries(Object.entries(exam.sections).map(([key, section]) => [key, section.generated])), expected);
  assert.equal(new Set(exam.questions.map(question => vact.computeVACTQuestionSignature(question))).size, exam.questions.length);
  assert.equal(exam.diagnostics.classifiedCount + exam.diagnostics.unclassifiedCount, exam.generatedTotal);
  assert.equal(exam.diagnostics.fallbackUsed, exam.diagnostics.unclassifiedCount > 0);

  for (const question of exam.questions) assertProductionQuestion(question);

  const quiz = generator.formatExamAsQuiz(exam);
  assert.equal(quiz.sourceType, profileId === 'vact_full' ? 'vact_full_120' : profileId);
  assert.equal(quiz.vactMeta.profileId, profileId);
  assert.equal(quiz.answerKeys.length, profiles[profileId].totalQuestions);
  assert.equal(quiz.questions.length, profiles[profileId].totalQuestions);
  quiz.answerKeys.forEach((key, index) => {
    const source = exam.questions[index];
    assert.equal(key.answerVerified, true);
    assert.equal(key.questionSourceId, source.questionSourceId);
    assert.equal(key.questionSourceFile, source.questionSourceFile);
    assert.equal(key.questionSourcePage, source.questionSourcePage);
    assert.deepEqual(key.quality, source.quality);
    assert.deepEqual(key.stimulus, source.stimulus);
    assert.deepEqual(key.assets, source.assets);
  });
}

// Required fuzz matrix: 500 deterministic seeds × 4 profiles = 2,000 runs.
for (let seed = 1; seed <= 500; seed++) {
  for (const [profileId, expected] of Object.entries(expectedSections)) {
    const exam = generator.generateFromProfile(profileId, { seed });
    assert.equal(exam.profileId, profileId);
    assert.equal(exam.requestedTotal, profiles[profileId].totalQuestions);
    assert.equal(exam.generatedTotal, profiles[profileId].totalQuestions);
    assert.equal(exam.missingTotal, 0);
    assert.equal(exam.isComplete, true);
    assert.equal(exam.questions.length, profiles[profileId].totalQuestions);
    assert.deepEqual(Object.fromEntries(Object.entries(exam.sections).map(([key, section]) => [key, section.generated])), expected);
    assert.equal(new Set(exam.questions.map(question => vact.computeVACTQuestionSignature(question))).size, exam.questions.length);
    exam.questions.forEach(assertProductionQuestion);
  }
}

console.log('PASS V-ACT profile hardening: 4 profiles × 500 seeds = 2,000 deterministic runs');
