/**
 * Phase 0 production-invariant audit.
 *
 * This is deliberately separate from run-all-qa.js during the baseline phase.
 * It proves that the existing green QA suite does not yet cover the release
 * invariants. Once the corresponding hardening phases land, this becomes a
 * release-gate suite instead of a known-failure audit.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const failures = [];

function audit(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    failures.push({ name, message: error.message });
    console.log(`FAIL ${name}: ${error.message}`);
  }
}

function loadContract() {
  const context = { window: {} };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'js/quizContract.js'), 'utf8'), context);
  return context.QuizContract;
}

audit('Math rejects missing MCQ answers', () => {
  const MathEngine = require(path.join(root, 'js/mathGenerator.js'));
  global.DocumentQuestionBank = {
    query(filter) {
      return filter.type === 'mcq'
        ? [{ id: 'phase0-invalid-mcq', grade: '10', subject: 'toan', topic: 'dai_so', type: 'mcq', question: 'Invalid answer fixture', options: ['one', 'two', 'three', 'four'] }]
        : [];
    }
  };
  const exam = MathEngine.generateExam({ grade: '10', sourceMode: 'document', mcqCount: 1, essayMatrix: { TH: 0, VD: 0, VDC: 0 } });
  assert.equal(exam.answerKeys.length, 0, 'an answer-less record entered the answer key');
});

audit('Math rejects missing essay answers', () => {
  const MathEngine = require(path.join(root, 'js/mathGenerator.js'));
  global.DocumentQuestionBank = {
    query(filter) {
      return filter.type === 'essay'
        ? [{ id: 'phase0-invalid-essay', grade: '10', subject: 'toan', topic: 'dai_so', level: 'TH', type: 'essay', question: 'Essay without verified answer' }]
        : [];
    }
  };
  const exam = MathEngine.generateExam({ grade: '10', sourceMode: 'document', mcqCount: 0, essayMatrix: { TH: 1, VD: 0, VDC: 0 } });
  assert.equal(exam.answerKeys.length, 0, 'an answer-less essay entered the answer key');
});

audit('Math difficulty mode filters selected records', () => {
  const MathEngine = require(path.join(root, 'js/mathGenerator.js'));
  global.DocumentQuestionBank = {
    query(filter) {
      return filter.type === 'mcq'
        ? [{ id: 'phase0-vd-mcq', grade: '10', subject: 'toan', topic: 'dai_so', level: 'VD', type: 'mcq', question: 'VD fixture', options: ['a', 'b', 'c', 'd'], correctAnswer: 'D' }]
        : [];
    }
  };
  const exam = MathEngine.generateExam({ grade: '10', sourceMode: 'document', difficultyMode: 'basic', mcqCount: 1, essayMatrix: { TH: 0, VD: 0, VDC: 0 } });
  assert.equal(exam.answerKeys.length, 0, 'a VD record entered a basic exam');
});

audit('Math seed is reproducible', () => {
  const MathEngine = require(path.join(root, 'js/mathGenerator.js'));
  delete global.DocumentQuestionBank;
  const config = { grade: '10', sourceMode: 'synthetic', mcqCount: 5, essayMatrix: { TH: 0, VD: 0, VDC: 0 }, seed: 'phase0-seed' };
  const canonical = exam => exam.answerKeys.map(key => ({ content: key.content, options: key.options, correct: key.correct }));
  assert.deepEqual(canonical(MathEngine.generateExam(config)), canonical(MathEngine.generateExam(config)));
});

audit('QuizContract rejects malformed answer keys', () => {
  const contract = loadContract();
  const quiz = contract.normalizeQuiz({
    id: 'phase0-invalid-contract',
    title: 'Invalid contract fixture',
    subject: 'toan',
    timeLimit: 45,
    examHtml: '<p>fixture</p>',
    answerKeys: [{ num: 1, type: 'mcq', options: ['A', 'B'], correct: 'D', score: NaN }]
  });
  assert.equal(contract.validateQuiz(quiz).valid, false, 'malformed key passed contract validation');
});

audit('Profile registry exposes all production profiles', () => {
  const profiles = require(path.join(root, 'js/vact/profiles.js'));
  assert.deepEqual(Object.keys(profiles.VACT_PROFILES || {}).sort(), ['vact_full', 'vact_mini_100', 'vact_mini_30', 'vact_mini_60']);
});

audit('Student persistence boundary does not expose private answer keys', () => {
  const storage = fs.readFileSync(path.join(root, 'js/storage.js'), 'utf8');
  const firebase = fs.readFileSync(path.join(root, 'js/firebase.js'), 'utf8');
  assert.ok(/public/i.test(storage) && /private/i.test(firebase), 'no explicit public/private quiz boundary exists');
});

audit('Exam iframes are sandboxed', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  for (const id of ['studentPdfViewerFrame', 'teacherPdfPreviewFrame']) {
    const tag = html.match(new RegExp(`<iframe[^>]*id="${id}"[^>]*>`, 'i'))?.[0] || '';
    assert.ok(/\bsandbox\b/i.test(tag), `${id} has no sandbox`);
  }
});

const summary = { passed: 8 - failures.length, failed: failures.length, failures };
console.log(JSON.stringify(summary, null, 2));
if (failures.length > 0) process.exitCode = 1;
