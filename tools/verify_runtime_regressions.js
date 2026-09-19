const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = file => fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8').replace(/\r\n/g, '\n');
const silent = { log() {}, warn() {}, error() {} };
function memory() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key), key: i => [...values.keys()][i], get length() { return values.size; } };
}

(async () => {
  const app = read('js/app.js');
  const matcher = app.slice(app.indexOf('function checkAnswerMatch('), app.indexOf('/* Submit Exam */'));
  const vault = app.slice(app.indexOf('const ExamVault ='), app.indexOf('const AppState ='));
  const ctx = vm.createContext({ console: silent, window: {}, localStorage: memory(), Blob, TextDecoder, Uint8Array, ArrayBuffer, atob, setTimeout, clearTimeout });
  vm.runInContext(matcher + vault + '\nglobalThis.vault = ExamVault;', ctx);
  assert.equal(ctx.checkAnswerMatch('1/2', '12'), false);
  assert.equal(ctx.checkAnswerMatch('1/0', '1'), false);
  assert.equal(ctx.checkAnswerMatch('2+3', '23'), false);
  assert.equal(ctx.checkAnswerMatch('abc5', '5'), false);
  assert.equal(ctx.checkAnswerMatch('1/2', '0,5'), true);
  assert.equal(ctx.checkAnswerMatch('x=0', '0'), true);
  assert.equal(ctx.checkAnswerMatch(0, '0'), true);
  ctx.vault.store('fixture', [{ num: 1, type: 'essay', correct: '0.5', correctAnswer: '0.5', explanation: 'Answer 0.5', keyFormula: '0.5', score: 1 }]);
  const publicKey = ctx.vault.getPublicKeys('fixture')[0];
  for (const field of ['correct', 'correctAnswer', 'explanation', 'keyFormula']) assert.equal(publicKey[field], undefined);
  assert.equal(ctx.vault.grade('fixture', { 1: '1/2' }).totalEarnedScore, 1);
  assert.deepEqual(Array.from(ctx.vault.getTeacherKeys('fixture')), []);

  vm.runInContext(read('js/firebase.js'), ctx);
  const firebase = ctx.window.FirebaseEngine;
  assert.equal(await firebase._dataToBlob('data:text/html;charset=utf-8,<p>a,b,c</p>').text(), '<p>a,b,c</p>');
  vm.runInContext(read('js/storage.js'), ctx);
  const storage = ctx.window.StorageEngine;
  const html = 'data:text/html;charset=utf-8,<p>a,b,c</p>';
  assert.equal((await storage.saveQuiz({ id: 'html', title: 'HTML fixture', pdfDataUrl: html })).success, true);
  assert.equal((await storage.getQuiz('html')).examHtml, '<p>a,b,c</p>');
  assert.equal((await storage.saveQuiz({ id: 'blob', title: 'Blob fixture', pdfDataUrl: new Blob(['PDF']) })).success, false);
  assert.equal(await storage.getQuiz('blob'), null);
  const first = await storage.saveResult({ quizId: 'q', name: 'An', className: '8A' });
  assert.equal(await storage.saveResult({ quizId: 'q', name: 'An', className: '8A' }), first);
  assert.notEqual(await storage.saveResult({ quizId: 'q', name: 'An', className: '8B' }), first);
  assert.equal(await storage.hasSubmitted('q', '8A', 'An'), true);
  assert.equal(await storage.hasSubmitted('q', '8C', 'An'), false);
  ctx.window.FirebaseEngine = { isActive: true, getResultsByQuiz: async () => [{ id: 'result:q:cloud', quizId: 'q', name: 'Bình', className: '8A' }], getAllResults: async () => [{ id: 'result:q:cloud', quizId: 'q', name: 'Bình', className: '8A' }] };
  assert.equal((await storage.getResultsByQuiz('q')).length, 3);
  assert.equal((await storage.getAllResults()).length, 3);
  ctx.window.FirebaseEngine.getAllResults = async () => { throw new Error('Offline'); };
  assert.equal((await storage.getAllResults()).length, 3);
  const originalSet = ctx.localStorage.setItem;
  ctx.localStorage.setItem = () => { throw new Error('QuotaExceededError'); };
  ctx.window.FirebaseEngine.isActive = false;
  assert.equal((await storage.saveQuiz({ id: 'quota' })).success, false);
  storage._lastSubmitRecord = null;
  await assert.rejects(storage.saveResult({ quizId: 'failed', name: 'An', className: '8A' }));
  assert.equal(storage._lastSubmitRecord, null);
  ctx.window.FirebaseEngine = { isActive: true, saveResult: async () => 'cloud-key' };
  assert.ok(await storage.saveResult({ quizId: 'cloud-only', name: 'An', className: '8A' }));
  ctx.localStorage.setItem = originalSet;

  vm.runInContext(read('js/pdfExtractor.js'), ctx);
  const pdf = ctx.window.PdfExtractor;
  const text = 'Câu 1. Tính tổng hai số 2 và 3?\nA. 5\nB. 6\nC. 7\nD. 8';
  assert.equal(pdf.parseSmartOffline(text)[0].correctAnswer, '');
  assert.equal(pdf.parseSmartOffline(text + '\nLời giải: Chọn A.')[0].correctAnswer, 'A');
  assert.equal(pdf.parseSmartOffline(text + '\nBẢNG ĐÁP ÁN\n1. B')[0].correctAnswer, 'B');
  assert.equal(pdf.parseSmartOffline(text + '\n' + text + '\nBẢNG ĐÁP ÁN\n1. B')[0].correctAnswer, '');
  await assert.rejects(pdf.parseQuestions(text, '', 'gemini'));
  await assert.rejects(pdf.parseQuestions('x'.repeat(20001), 'fixture', 'claude'));
  ctx.fetch = async () => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: '{}' }] } }] }) });
  await assert.rejects(pdf.parseQuestions(text, 'fixture', 'gemini'));

  vm.runInContext(read('js/gamification.js'), ctx);
  const game = ctx.window.GamificationEngine;
  game.getUserProfile = () => ({ streak: 2 });
  assert.equal(game.awardExamRewards({ isDocumentOnly: true, totalScore: 10 }).xpGained, 0);
  const submit = app.slice(app.indexOf('async function submitStudentExam('), app.indexOf('/**\n * Tự động dọn dẹp các bản ghi nộp bài trùng lặp'));
  let savedRecord;
  let cleared = 0;
  let paused = 0;
  const element = { dataset: {}, innerHTML: 'Submit', classList: { add() {}, remove() {} } };
  ctx.document = { getElementById: () => element, body: { classList: { remove() {} } } };
  ctx.AppState = { currentQuiz: { examMode: 'document_view', title: 'Fixture' }, currentQuizId: 'document', studentName: 'An', studentClass: '8A', studentAnswers: {}, totalExamSeconds: 100, secondsLeft: 50, tabSwitches: 0 };
  storage.hasSubmitted = async () => false;
  storage.saveResult = async r => { savedRecord = r; return 'saved'; };
  ctx.GamificationEngine = game;
  ctx.clearPausedExamSession = () => cleared++;
  ctx.saveCurrentExamSessionToPaused = () => paused++;
  ctx.SoundEngine = { playFanfare() {} };
  game.fireConfetti = () => {};
  for (const name of ['showToast', 'updateGamifyBar', 'renderExamResultHero', 'renderExamReviewList']) ctx[name] = () => {};
  vm.runInContext(submit, ctx);
  await ctx.submitStudentExam();
  assert.equal(savedRecord.totalScore, null);
  assert.equal(savedRecord.gradingStatus, 'pending');
  assert.equal(savedRecord.correct, 0);
  assert.equal(cleared, 1);
  storage.saveResult = async () => { throw new Error('Quota'); };
  await ctx.submitStudentExam();
  assert.equal(cleared, 1);
  assert.equal(paused, 1);
  assert.equal(ctx.AppState.isSubmitting, false);

  vm.runInContext(read('js/studentAnalytics.js'), ctx);
  const backfillResult = { quizId: 'topic', review: [{ num: 1, category: '' }] };
  ctx.window.StorageEngine = { getAllResults: async () => [backfillResult], getQuiz: async () => ({ answerKeys: [{ num: 1, topic: 'Algebra' }] }), set: async () => true };
  await ctx.window.StudentAnalytics.backfillData();
  assert.equal(backfillResult.review[0].category, 'Algebra');
  const alternate = vm.createContext({ console: silent, localStorage: memory() });
  vm.runInContext(read('MathExamPlatform/js/data-bank.js') + read('MathExamPlatform/js/data-manager.js') + '\nglobalThis.manager = new QuestionDataManager();', alternate);
  assert.equal(alternate.manager.evaluateEssayAnswer('1/0', '1'), false);
  assert.equal(alternate.manager.evaluateEssayAnswer('2xyz', '2'), false);
  assert.equal(alternate.manager.evaluateEssayAnswer('1/2', '0.5'), true);
  const a = alternate.manager.addQuestion({ content: 'first', id: 'override' });
  const b = alternate.manager.addQuestion({ content: 'second', id: 'override' });
  assert.notEqual(a.id, b.id);
  alternate.localStorage.setItem('toanmath_question_bank', '[]');
  assert.equal(alternate.getLocalQuestionBank().length, 0);
  vm.runInContext(read('MathExamPlatform/js/exam-builder.js') + '\nglobalThis.builder = new ExamBuilder(manager);', alternate);
  alternate.manager.getAllQuestions = () => [
    { id: 'one', grade: 8, type: 'choice', content: 'Unique question?' },
    { id: 'duplicate', grade: 8, type: 'choice', content: 'Unique  question?' },
    { id: 'other-grade', grade: 9, type: 'choice', content: 'Another grade?' }
  ];
  const legacyExam = alternate.builder.generateExam({ grade: 8, numChoice: 3, numEssay: 0 });
  assert.equal(legacyExam.numChoice, 1);
  assert.equal(legacyExam.questions[0].grade, 8);
  assert.ok(legacyExam.warning);
  global.DocumentQuestionBank = require('../js/documentQuestionBank');
  const math = require('../js/mathGenerator');
  const khtn = require('../js/khtnGenerator');
  for (const engine of [math, khtn]) {
    const exam = engine.generateExam({ grade: '8', mcqCount: 60, essayMatrix: { TH: 0, VD: 0, VDC: 0 }, sourceMode: 'synthetic' });
    assert.ok(Math.abs(exam.answerKeys.reduce((sum, q) => sum + q.score, 0) - 10) < 1e-8);
  }
  const key = [{ num: 1, type: 'mcq', content: 'Public question?', topic: 'Physics', level: 'TH', correct: 'D', score: 10, options: ['1', '2', '3', '4'] }];
  assert.equal(khtn.renderExamToHtml('Fixture', key, 45).includes('<table class="answer-key-table">'), false);
  const privateHtml = khtn.renderExamToHtml('Fixture', key, 45, '', true);
  assert.ok(privateHtml.includes('<table class="answer-key-table">'));
  vm.runInContext(app.slice(app.indexOf('function stripGeneratedAnswerTable('), app.indexOf('async function startExamWithQuizId(')), ctx);
  assert.equal(ctx.stripGeneratedAnswerTable(privateHtml).includes('<table class="answer-key-table">'), false);
  const batches = math.generateBatchExams({ track: 'dgnl_hn', sourceMode: 'synthetic', batchCount: 2, mcqCount: 150, deduplicatePolicy: 'disjoint' });
  const content = batches.flatMap(exam => exam.answerKeys.map(q => q.content));
  assert.equal(new Set(content).size, content.length);
  assert.ok(batches.some(exam => exam.warning));
  console.log('PASS: grading, answer exposure, file persistence, quota failure, class isolation, result merging, PDF parsing and pending rewards');
})().catch(error => { console.error(error); process.exitCode = 1; });
