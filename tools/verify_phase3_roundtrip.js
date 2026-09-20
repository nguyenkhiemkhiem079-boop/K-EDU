const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const nodeRuntime = process.execPath;
const MathEngine = require(path.join(root, 'js/mathGenerator.js'));
const vact = require(path.join(root, 'js/vact'));

const memory = new Map();
const localStorage = {
  getItem: key => memory.has(key) ? memory.get(key) : null,
  setItem: (key, value) => memory.set(key, String(value)),
  removeItem: key => memory.delete(key),
  get length() { return memory.size; },
  key: index => [...memory.keys()][index] || null
};
const context = {
  console,
  Blob,
  setTimeout,
  clearTimeout,
  navigator: { onLine: false },
  localStorage,
  window: {}
};
context.window = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'js/quizContract.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(root, 'js/storage.js'), 'utf8'), context);
const { StorageEngine, QuizContract } = context;

function makeMathQuiz() {
  const exam = MathEngine.generateExam({ grade: '10', sourceMode: 'synthetic', mcqCount: 3, essayMatrix: { TH: 0, VD: 0, VDC: 0 }, seed: 'phase3-math' });
  assert.equal(exam.isComplete, true, JSON.stringify(exam.generationDiagnostics));
  return QuizContract.normalizeQuiz({
    id: 'PHASE3_MATH', title: 'Phase 3 Math', subject: 'toan', timeLimit: 45,
    answerKeys: exam.answerKeys, examHtml: exam.examHtml
  });
}

function makeVactQuiz(profileId, seed) {
  const method = ({ vact_mini_30: 'generateMini30', vact_mini_60: 'generateMini60', vact_mini_100: 'generateMini100', vact_full: 'generateFull120' })[profileId];
  const exam = vact.VACTExamGenerator[method]({ difficulty: 'balanced', seed });
  assert.equal(exam.isComplete, true, `${profileId} incomplete`);
  const quiz = vact.VACTExamGenerator.formatExamAsQuiz(exam, { title: `Phase 3 ${profileId}`, timeLimitMinutes: exam.timeLimitMinutes });
  quiz.id = `PHASE3_${profileId}`;
  quiz.pdfDataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(quiz.examHtml);
  return quiz;
}

async function assertRoundTrip(quiz) {
  const expectedKeys = quiz.answerKeys.length;
  const save = await StorageEngine.saveQuiz(quiz);
  assert.equal(save.success, true, `${quiz.id} save failed: ${JSON.stringify(save)}`);
  const rawPublic = JSON.parse(memory.get('khiemedu_quiz:' + quiz.id));
  assert.equal(rawPublic.answerKeys.length, expectedKeys);
  assert.equal(Object.prototype.hasOwnProperty.call(rawPublic.answerKeys[0], 'correct'), false, `${quiz.id} leaked correct answer`);
  assert.equal(Object.prototype.hasOwnProperty.call(rawPublic.answerKeys[0], 'explanation'), false, `${quiz.id} leaked explanation`);

  const publicQuiz = await StorageEngine.getQuiz(quiz.id);
  assert.equal(publicQuiz.answerKeys.length, expectedKeys);
  assert.equal(Object.prototype.hasOwnProperty.call(publicQuiz.answerKeys[0], 'correct'), false, `${quiz.id} public normalization leaked answer`);
  const privateKeys = await StorageEngine._getPrivateAnswerKeys(quiz.id);
  assert.equal(privateKeys.length, expectedKeys);
  assert.equal(privateKeys[0].correct, quiz.answerKeys[0].correct);

  const reloaded = await StorageEngine.getQuiz(quiz.id, { includePrivate: true });
  assert.equal(reloaded.answerKeys.length, expectedKeys);
  assert.equal(reloaded.answerKeys[0].correct, quiz.answerKeys[0].correct);
  assert.equal(reloaded.id, quiz.id);
  assert.equal(reloaded.title, quiz.title);
  if (quiz.sourceType.startsWith('vact_')) {
    assert.equal(reloaded.vactMeta.profileId, quiz.vactMeta.profileId);
    assert.equal(reloaded.vactMeta.generatedTotal, quiz.vactMeta.generatedTotal);
  }
}

(async () => {
  await assertRoundTrip(makeMathQuiz());
  for (const [profileId, seed] of [['vact_mini_30', 'phase3-30'], ['vact_mini_60', 'phase3-60'], ['vact_mini_100', 'phase3-100'], ['vact_full', 'phase3-full']]) {
    await assertRoundTrip(makeVactQuiz(profileId, seed));
  }

  const synced = [];
  const deleted = [];
  context.FirebaseEngine = context.window.FirebaseEngine = {
    isActive: true,
    async saveQuiz(record) { synced.push({ type: 'quiz', record }); return { success: true }; },
    async saveResult(record) { synced.push({ type: 'result', record }); return { success: true }; },
    async deleteQuiz(id) { deleted.push(id); return true; }
  };
  context.navigator.onLine = true;
  const resultKey = await StorageEngine.saveResult({ quizId: 'PHASE3_MATH', name: 'Student', className: '10A', score: 10 });
  await StorageEngine.processSyncQueues();
  assert.ok(synced.some(item => item.type === 'result' && item.record.id === resultKey));
  const quizSync = synced.find(item => item.type === 'quiz' && item.record.id === 'PHASE3_MATH');
  assert.ok(quizSync, 'quiz save queue did not sync');
  assert.equal(Object.prototype.hasOwnProperty.call(quizSync.record.answerKeys[0], 'correct'), false, 'cloud sync leaked answer key');
  assert.equal(Array.from(await StorageEngine.get('quiz_sync_queue')).length, 0);
  assert.equal(Array.from(await StorageEngine.get('result_sync_queue')).length, 0);

  context.navigator.onLine = false;
  const saveBeforeDelete = await StorageEngine.saveQuiz(makeMathQuiz());
  assert.equal(saveBeforeDelete.success, true);
  await StorageEngine.deleteQuiz('PHASE3_MATH');
  assert.equal(await StorageEngine.getQuiz('PHASE3_MATH'), null, 'deleted quiz resurrected locally');
  assert.equal(await StorageEngine._getPrivateAnswerKeys('PHASE3_MATH').then(keys => keys.length), 0, 'deleted private answer key survived');
  context.navigator.onLine = true;
  await StorageEngine.processSyncQueues();
  assert.ok(deleted.includes('PHASE3_MATH'), 'delete was not synced');
  assert.equal(await StorageEngine.getQuiz('PHASE3_MATH'), null, 'deleted quiz resurrected after reconnect');

  console.log(JSON.stringify({
    roundTrips: 5,
    syncedPublicQuiz: true,
    resultSync: true,
    deletionTombstone: true,
    publicAnswerLeak: false
  }));
})().catch(error => { console.error(error); process.exitCode = 1; });
