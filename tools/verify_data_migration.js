const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ctx = { window: {}, console };
ctx.window = ctx;
vm.createContext(ctx);
for (const file of ['js/quizContract.js', 'js/dataRepair.js']) vm.runInContext(fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8'), ctx);
const R = ctx.DataRepair;
const key = (num, section = null) => ({ num, type: 'mcq', content: 'Question ' + num, options: ['one', 'two', 'three', 'four'], correct: 'A', section });
const math = { id: 'M', title: 'Math', subject: 'toan', timeLimit: 45, answerKeys: [key(1)], examHtml: '<p>Câu 1</p>', assignType: 'all' };
const counts = { vietnamese: 25, english: 25, math: 25, logic_data: 10, scientific_reasoning: 15 };
let n = 0;
const vactKeys = Object.entries(counts).flatMap(([section, count]) => Array.from({ length: count }, () => key(++n, section)));
const vact = { id: 'V', title: 'VACT', subject: 'vact', timeLimit: 90, answerKeys: vactKeys, examHtml: '<p>Câu 1</p>', vactMeta: { profileId: 'vact_mini_100', requestedTotal: 100, generatedTotal: 100, missingTotal: 0, isComplete: true } };
const upload = { id: 'U', title: 'Upload', timeLimit: 0, pdfDataUrl: 'data:application/pdf;base64,AA==', answerKeys: [] };
(async () => {
  for (const q of [math, vact, upload]) {
    const x = await R.repairQuiz(q);
    assert.equal(x.status, 'migratable');
    assert.equal(x.quiz.schemaVersion, 2);
  }
  const invalid = await R.repairQuiz({ id: 'I', title: 'Invalid', timeLimit: 45, answerKeys: [{ num: 1, correct: 'A' }], examHtml: '<p>bad</p>' });
  assert.equal(invalid.status, 'review_required');
  assert.equal(invalid.code, 'QUIZ_INVALID');
  assert.equal((await R.repairQuiz({ id: 'B', title: 'Broken', pdfDataUrl: 'blob:expired', timeLimit: 0, answerKeys: [] })).code, 'BROKEN_ATTACHMENT');
  assert.equal(R.repairResult({ studentUid: 'old' }).result.studentId, 'old');
  const once = (await R.repairQuiz(math)).quiz;
  const twice = (await R.repairQuiz(once)).quiz;
  assert.equal(JSON.stringify(once.id), JSON.stringify(twice.id));
  assert.equal(JSON.stringify(once.answerKeys), JSON.stringify(twice.answerKeys));
  console.log('Safe legacy quiz/result migration, review quarantine, and idempotency passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
