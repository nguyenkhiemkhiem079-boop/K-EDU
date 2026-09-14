const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
global.window = global;
global.localStorage = { getItem: () => null, setItem() {} };
const bank = require('../js/documentQuestionBank');
global.DocumentQuestionBank = bank;
const math = require('../js/mathGenerator');
const science = require('../js/khtnGenerator');
const policy = require('../js/specializedBankPolicy');
const original = bank.questions;
try {
  bank.questions = [];
  for (const subject of ['toan', 'khtn']) {
    for (const topic of subject === 'toan' ? ['dai_so'] : ['vat_ly', 'hoa_hoc', 'sinh_hoc']) {
      for (const level of ['NB', 'TH', 'VD', 'VDC']) {
        for (const type of ['mcq', 'essay']) {
          const id = `${subject}-${topic}-${level}-${type}`;
          bank.questions.push({ id, subject, topic, level, type, grade: '8', question: id,
            options: type === 'mcq' ? ['1', '2', '3', '4'] : undefined,
            correctAnswer: type === 'mcq' ? 'A' : '1', source: 'Fixture' });
        }
      }
    }
  }
  for (const q of [...bank.questions].filter(q => q.level === 'VDC')) {
    const copy = { ...q, id: q.id + '-second', question: q.question + '-second' };
    bank.questions.push(copy);
    for (const item of [q, copy]) item.curation = {
      status: 'approved', sourceType: 'specialized_school', schoolName: 'Trường chuyên fixture',
      sourceFile: item.sourceFile = 'fixture.pdf', sourcePage: 1, sourceEvidence: 'School header fixture',
      documentOriginVerified: true, difficultyReviewed: true, answerReviewed: true, questionId: item.id,
      questionSignature: policy.signature(item.question), answerSignature: policy.signature(item.correctAnswer)
    };
  }
  for (const mode of ['basic', 'advanced']) {
    const allowed = mode === 'basic' ? ['NB', 'TH'] : ['VDC'];
    const dgnl = math.generateDgnlExam({ difficultyMode: mode });
    assert.ok(dgnl.answerKeys.every(q => allowed.includes(q.level)));
    for (const engine of [math, science]) {
      const config = { grade: '8', sourceMode: 'document', difficultyMode: mode, mcqCount: 10,
        essayMatrix: { TH: 1, VD: 1, VDC: 1 }, discipline: 'hoa_hoc' };
      const exam = engine.generateExam(config);
      assert.equal(exam.mcqCount, 2);
      assert.ok(exam.warning);
      assert.ok(exam.answerKeys.length > 0);
      assert.ok(exam.answerKeys.every(q => allowed.includes(q.level)));
      assert.ok(exam.answerKeys.every(q => q.content.startsWith(engine === math ? 'toan-' : 'khtn-hoa_hoc-')));
      const batch = engine.generateBatchExams({ ...config, mcqCount: 1, essayMatrix: { TH: 0, VD: 0, VDC: 0 }, batchCount: 2 });
      assert.ok(batch.every(item => item.answerKeys.every(q => allowed.includes(q.level))));
      assert.equal(new Set(batch.flatMap(item => item.answerKeys.map(q => q.content))).size, 2);
    }
    for (const engine of [math, science]) {
      const exam = engine.generateExam({ grade: '8', sourceMode: 'synthetic', difficultyMode: mode,
        discipline: 'vat_ly', mcqCount: 8, essayMatrix: { TH: 1, VD: 1, VDC: 1 } });
      assert.ok(exam.answerKeys.every(q => allowed.includes(q.level)), `${mode} synthetic levels`);
      if (engine === science) assert.ok(exam.answerKeys.every(q => q.topic === 'Vật lý'));
    }
  }
  assert.throws(() => math.generateExam({ difficultyMode: 'invalid' }));
  assert.throws(() => science.generateExam({ discipline: 'invalid' }));
  const source = fs.readFileSync(require('node:path').join(__dirname, '../js/app.js'), 'utf8');
  const context = vm.createContext({});
  vm.runInContext(source.slice(source.indexOf('function classifyExamDifficulty('), source.indexOf('async function renderSampleQuizzes(')), context);
  assert.equal(context.classifyExamDifficulty({ answerKeys: [{ level: 'NB' }, { level: 'TH' }] }), 'basic');
  assert.equal(context.classifyExamDifficulty({ answerKeys: [{ level: 'VD' }, { level: 'VDC' }] }), 'mixed');
  assert.equal(context.classifyExamDifficulty({ answerKeys: [{ level: 'VDC' }], difficultyMode: 'advanced', specializedSourceOnly: true }), 'advanced');
  const approved = bank.questions.find(q => q.curation);
  assert.equal(policy.isApproved(approved), true);
  assert.equal(policy.isApproved({ ...approved, question: 'edited' }), false);
  assert.equal(policy.isApproved({ ...approved, curation: { ...approved.curation, answerReviewed: false } }), false);
  assert.equal(policy.isApproved({ ...approved, curation: undefined, source: 'Chuyên đề VDC' }), false);
  assert.equal(context.classifyExamDifficulty({ answerKeys: [{ level: 'TH' }, { level: 'VD' }], difficultyMode: 'advanced' }), 'mixed');
  assert.equal(context.classifyExamDifficulty({ answerKeys: [{ level: '' }] }), 'unclassified');
} finally { bank.questions = original; }
console.log('PASS: strict subject/discipline and difficulty separation, shortages, synthetic and independent batches');
