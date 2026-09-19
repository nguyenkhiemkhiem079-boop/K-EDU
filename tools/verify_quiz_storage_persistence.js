const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const vact = require('../js/vact');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js/storage.js'), 'utf8');
const memory = new Map();
const context = {
  window: {}, Blob, console, setTimeout, clearTimeout,
  localStorage: { getItem: k => memory.get(k) || null, setItem: (k, v) => memory.set(k, String(v)), removeItem: k => memory.delete(k), get length() { return memory.size; }, key: i => [...memory.keys()][i] || null }
};
context.window = context;
vm.createContext(context);
vm.runInContext(source, context);
const { normalizeQuizForPersistence, DB_VERSION, STORE_QUIZZES } = context.KEDUStorageInternals;
assert.equal(DB_VERSION, 3);
assert.equal(STORE_QUIZZES, 'quiz_store');

const full = vact.VACTExamGenerator.generateFull120({ difficulty: 'balanced', seed: 'storage-roundtrip' });
assert.equal(full.generatedTotal, 120);
const fullQuiz = vact.VACTExamGenerator.formatExamAsQuiz(full, { title: 'Storage Full 120', timeLimitMinutes: 150 });
assert.equal(fullQuiz.answerKeys.length, 120);
assert.ok(fullQuiz.examHtml.length > 0);
fullQuiz.pdfDataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(fullQuiz.examHtml);
const fullStored = normalizeQuizForPersistence(fullQuiz);
assert.ok(fullStored.success);
assert.equal(fullStored.quiz.pdfDataUrl, undefined, 'generated HTML must not be persisted twice');
assert.equal(fullStored.quiz.examHtml, fullQuiz.examHtml);
assert.equal(fullStored.quiz.vactMeta.profileId, fullQuiz.vactMeta.profileId);

const mathQuiz = { id: 'MATH_STORAGE_1', title: 'Math storage', subject: 'toan', timeLimit: 45, totalQuestions: 1, answerKeys: [{ num: 1, correct: 'A' }], examHtml: '<h1>Math</h1>', pdfDataUrl: 'data:text/html;charset=utf-8,' + encodeURIComponent('<h1>Math</h1>') };
const mathStored = normalizeQuizForPersistence(mathQuiz);
assert.ok(mathStored.success);
assert.equal(mathStored.quiz.pdfDataUrl, undefined);
assert.equal(mathStored.quiz.examHtml, mathQuiz.examHtml);

const pdfQuiz = normalizeQuizForPersistence({ id: 'PDF_1', title: 'PDF', pdfDataUrl: 'data:application/pdf;base64,AA==' });
assert.ok(pdfQuiz.success);
assert.equal(pdfQuiz.quiz.pdfDataUrl, 'data:application/pdf;base64,AA==', 'real PDF attachment is preserved');
console.log(JSON.stringify({ fullBytes: JSON.stringify(fullQuiz).length, examHtmlBytes: fullQuiz.examHtml.length, answerKeyBytes: JSON.stringify(fullQuiz.answerKeys).length, redundantDataUrlBytes: fullQuiz.pdfDataUrl.length, normalizedBytes: JSON.stringify(fullStored.quiz).length }));
