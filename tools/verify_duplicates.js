const assert = require('node:assert/strict');
global.window = global;
global.localStorage = { getItem: () => null, setItem: () => {} };
const bank = require('../js/documentQuestionBank');
global.DocumentQuestionBank = bank;
const engines = [require('../js/mathGenerator'), require('../js/khtnGenerator')];
const original = bank.questions;
try {
  for (const [index, engine] of engines.entries()) {
    const subject = index ? 'khtn' : 'toan';
    const base = { grade: '8', subject, topic: 'all', level: 'TH', source: 'Fixture', correctAnswer: 'A' };
    bank.questions = [
      { ...base, id: '1', type: 'mcq', question: 'Tính giá trị 2 + 3?', options: ['5', '6', '7', '8'] },
      { ...base, id: '2', type: 'mcq', question: 'Tính  giá trị 2 + 3? (Biến thể 2)', options: ['5', '6', '7', '8'] },
      { ...base, id: '3', type: 'essay', question: 'Tính giá trị 8 + 4?', correctAnswer: '12' },
      { ...base, id: '4', type: 'essay', question: 'Tính giá trị 8 + 4? (Biến thể 3)', correctAnswer: '12' }
    ];
    assert.equal(bank.query({ subject }).length, 2);
    const seen = new Set();
    const config = { grade: '8', sourceMode: 'document', mcqCount: 5, essayMatrix: { TH: 2, VD: 0, VDC: 0 }, batchSeenSignatures: seen };
    const first = engine.generateExam(config);
    assert.equal(first.mcqCount, 1);
    assert.equal(first.essayCount, 1);
    assert.ok(first.warning);
    assert.equal(engine.generateExam(config).totalQuestions, 0);
    assert.ok(Math.abs(first.answerKeys.reduce((sum, q) => sum + q.score, 0) - 10) < 0.1);
    const random = Math.random;
    Math.random = () => 0;
    try {
      const exam = engine.generateExam({ ...config, sourceMode: 'synthetic', mcqCount: 150, batchSeenSignatures: new Set() });
      const keys = exam.answerKeys.map(q => bank.signature(q.content));
      assert.equal(new Set(keys).size, keys.length);
      assert.ok(exam.answerKeys.every(q => !q.content.includes('(Biến thể')));
    } finally { Math.random = random; }
  }
} finally { bank.questions = original; }
console.log('PASS: duplicate bank entries, disjoint essays, exhausted generators, document-only sources and shortage scoring');
