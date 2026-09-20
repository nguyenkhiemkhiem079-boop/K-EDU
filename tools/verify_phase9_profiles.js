const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vact = require('../js/vact');
const quizContract = (() => {
  const code = fs.readFileSync(path.join(__dirname, '..', 'js', 'quizContract.js'), 'utf8');
  const vm = require('node:vm');
  const ctx = { window: {}, console };
  vm.runInNewContext(code, ctx);
  return ctx.window.QuizContract;
})();

const expected = {
  vact_mini_30: { total: 30, minutes: 40, sections: { vietnamese: 8, english: 8, math: 7, logic_data: 3, scientific_reasoning: 4 }, wrapper: 'generateMini30' },
  vact_mini_60: { total: 60, minutes: 75, sections: { vietnamese: 15, english: 15, math: 15, logic_data: 6, scientific_reasoning: 9 }, wrapper: 'generateMini60' },
  vact_mini_100: { total: 100, minutes: 90, sections: { vietnamese: 25, english: 25, math: 25, logic_data: 10, scientific_reasoning: 15 }, wrapper: 'generateMini100' },
  vact_full: { total: 120, minutes: 150, sections: { vietnamese: 30, english: 30, math: 30, logic_data: 12, scientific_reasoning: 18 }, wrapper: 'generateFull120' }
};

for (const [profileId, spec] of Object.entries(expected)) {
  const profile = vact.VACT_PROFILES[profileId];
  assert.equal(profile.totalQuestions, spec.total);
  assert.equal(profile.timeLimitMinutes, spec.minutes);
  assert.deepEqual(profile.sections, spec.sections);
  const generated = vact.VACTExamGenerator.generateFromProfile(profileId, { seed: `phase9-${profileId}` });
  assert.equal(generated.profileId, profileId);
  assert.equal(generated.requestedTotal, spec.total);
  assert.equal(generated.generatedTotal, spec.total);
  assert.equal(generated.isComplete, true);
  assert.deepEqual(Object.fromEntries(Object.entries(generated.sections).map(([key, value]) => [key, value.generated])), spec.sections);
  assert.equal(vact.VACTExamGenerator[spec.wrapper]({ seed: `phase9-wrapper-${profileId}` }).profileId, profileId);
}

const mini30Quiz = vact.VACTExamGenerator.formatExamAsQuiz(vact.VACTExamGenerator.generateMini30({ seed: 'phase9-contract' }));
const normalizedExplicit = quizContract.normalizeQuiz({
  id: 'explicit-mini-30', title: 'Mini 30', subject: 'vact', timeLimit: 40,
  answerKeys: mini30Quiz.answerKeys, examHtml: '<p>Mini 30</p>',
  sourceType: 'vact_mini_100', vactMeta: { profileId: 'vact_mini_30', requestedTotal: 30, generatedTotal: 30, missingTotal: 0, isComplete: true }
});
assert.equal(normalizedExplicit.sourceType, 'vact_mini_30', 'Explicit profileId must outrank legacy sourceType');
assert.equal(normalizedExplicit.vactMeta.profileId, 'vact_mini_30');
const unclassified = quizContract.normalizeQuiz({ id: 'unclassified-vact', title: 'V-ACT 60 legacy', subject: 'vact', timeLimit: 75, answerKeys: [], examHtml: '<p>legacy</p>' });
assert.equal(unclassified.sourceType, 'vact_unclassified', 'An unclassified V-ACT record must not be relabeled Mini100');

const appCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');
assert.ok(appCode.includes('kedu_vact_selected_profile_v1'), 'Selected profile must persist across reloads');
assert.ok(appCode.includes('handleStartVactProfile'), 'Student UI must use one profile-driven start flow');
console.log('Phase 9 exact quotas, time metadata, wrappers, persistence contract, and explicit QuizContract identity passed.');
