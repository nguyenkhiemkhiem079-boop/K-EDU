/**
 * Behavioral Math production invariants.
 *
 * These tests deliberately exercise the public generator API instead of
 * checking source strings. A failure is a release blocker for Math.
 */
const assert = require('node:assert/strict');
const MathEngine = require('../js/mathGenerator');

const emptyEssayMatrix = { TH: 0, VD: 0, VDC: 0 };
const originalDocumentQuestionBank = global.DocumentQuestionBank;

function useBank(query) {
  global.DocumentQuestionBank = { query };
}

function clearBank() {
  if (originalDocumentQuestionBank === undefined) delete global.DocumentQuestionBank;
  else global.DocumentQuestionBank = originalDocumentQuestionBank;
}

function sumScores(exam) {
  return Number(exam.answerKeys.reduce((sum, key) => sum + Number(key.score || 0), 0).toFixed(2));
}

try {
  useBank(filter => {
    if (filter.type === 'mcq') {
      return [{
        id: 'invalid-mcq',
        subject: 'toan',
        grade: '10',
        topic: 'all',
        level: 'TH',
        type: 'mcq',
        question: 'MCQ without a verified answer',
        options: ['1', '2', '3', '4']
      }];
    }
    return [{
      id: 'invalid-essay',
      subject: 'toan',
      grade: '10',
      topic: 'all',
      level: 'TH',
      type: 'essay',
      question: 'Essay without a verified answer'
    }];
  });
  const invalidMcqExam = MathEngine.generateExam({ grade: '10', sourceMode: 'document', mcqCount: 1, essayMatrix: emptyEssayMatrix });
  assert.equal(invalidMcqExam.isComplete, false);
  assert.equal(invalidMcqExam.answerKeys.length, 0);
  assert.equal(invalidMcqExam.generationDiagnostics.shortages[0].missing, 1);

  const invalidEssayExam = MathEngine.generateExam({ grade: '10', sourceMode: 'document', mcqCount: 0, essayMatrix: { TH: 1, VD: 0, VDC: 0 } });
  assert.equal(invalidEssayExam.isComplete, false);
  assert.equal(invalidEssayExam.answerKeys.length, 0);
  assert.equal(invalidEssayExam.generationDiagnostics.shortages[0].missing, 1);

  useBank(filter => filter.type === 'mcq' ? [{
    id: 'vd-only',
    subject: 'toan',
    grade: '10',
    topic: 'all',
    level: 'VD',
    type: 'mcq',
    question: 'Advanced fixture',
    options: ['1', '2', '3', '4'],
    correctAnswer: 'D'
  }] : []);
  const basicExam = MathEngine.generateExam({ grade: '10', sourceMode: 'document', difficultyMode: 'basic', mcqCount: 1, essayMatrix: emptyEssayMatrix });
  const advancedExam = MathEngine.generateExam({ grade: '10', sourceMode: 'document', difficultyMode: 'advanced', mcqCount: 1, essayMatrix: emptyEssayMatrix });
  assert.equal(basicExam.isComplete, false);
  assert.equal(basicExam.answerKeys.length, 0);
  assert.equal(advancedExam.isComplete, true);
  assert.equal(advancedExam.answerKeys[0].level, 'VD');

  useBank(filter => filter.type === 'mcq' ? [
    { id: 'gk1', term: 'GK1', subject: 'toan', grade: '10', topic: 'all', level: 'TH', type: 'mcq', question: 'GK1 fixture', options: ['1', '2', '3', '4'], correctAnswer: 'A' },
    { id: 'gk2', term: 'GK2', subject: 'toan', grade: '10', topic: 'all', level: 'TH', type: 'mcq', question: 'GK2 fixture', options: ['1', '2', '3', '4'], correctAnswer: 'A' }
  ] : []);
  const termExam = MathEngine.generateExam({ grade: '10', term: 'GK1', sourceMode: 'document', mcqCount: 1, essayMatrix: emptyEssayMatrix });
  assert.equal(termExam.isComplete, true);
  assert.equal(termExam.answerKeys[0].content, 'GK1 fixture');
  assert.equal(termExam.generationDiagnostics.termFilter.excludedCount, 1);

  useBank(() => []);
  const documentOnly = MathEngine.generateExam({ grade: '10', sourceMode: 'document', mcqCount: 1, essayMatrix: emptyEssayMatrix, seed: 'source-mode' });
  const hybrid = MathEngine.generateExam({ grade: '10', sourceMode: 'hybrid', mcqCount: 1, essayMatrix: emptyEssayMatrix, seed: 'source-mode' });
  assert.equal(documentOnly.isComplete, false);
  assert.equal(hybrid.isComplete, true);
  assert.equal(hybrid.generationDiagnostics.sourceMode, 'hybrid');

  const original = { question: '2 + 2 = ?', options: ['3', '4', '5', '6'], correctAnswer: 'B', type: 'mcq', level: 'TH' };
  for (let seed = 1; seed <= 200; seed++) {
    const shuffled = MathEngine.shuffleQuestionOptions(original, MathEngine.createSeededRandom(seed));
    assert.equal(shuffled.options['ABCD'.indexOf(shuffled.correctAnswer)], '4');
  }

  clearBank();
  const mcqOnly = MathEngine.generateExam({ grade: '10', sourceMode: 'synthetic', mcqCount: 7, essayMatrix: emptyEssayMatrix, seed: 'scores-mcq' });
  const essayOnly = MathEngine.generateExam({ grade: '10', sourceMode: 'synthetic', mcqCount: 0, essayMatrix: { TH: 2, VD: 0, VDC: 0 }, seed: 'scores-essay' });
  const mixed = MathEngine.generateExam({ grade: '10', sourceMode: 'synthetic', mcqCount: 3, essayMatrix: { TH: 1, VD: 1, VDC: 0 }, seed: 'scores-mixed' });
  for (const exam of [mcqOnly, essayOnly, mixed]) {
    assert.equal(exam.isComplete, true);
    assert.equal(sumScores(exam), 10);
    assert.equal(exam.totalQuestions, exam.answerKeys.length);
  }

  useBank(filter => filter.type === 'mcq' ? [
    { id: 'duplicate-1', subject: 'toan', grade: '10', topic: 'all', level: 'TH', type: 'mcq', question: '  X\u200b + 1 = 2  (Biến thể 1)', options: ['1', '2', '3', '4'], correctAnswer: 'A' },
    { id: 'duplicate-2', subject: 'toan', grade: '10', topic: 'all', level: 'TH', type: 'mcq', question: '<span>X + 1 = 2</span>', options: ['1', '2', '3', '4'], correctAnswer: 'A' }
  ] : []);
  const duplicateExam = MathEngine.generateExam({ grade: '10', sourceMode: 'document', mcqCount: 2, essayMatrix: emptyEssayMatrix });
  assert.equal(duplicateExam.answerKeys.length, 1);
  assert.equal(new Set(duplicateExam.answerKeys.map(key => MathEngine.mathQuestionSignature(key.content))).size, duplicateExam.answerKeys.length);
  assert.equal(duplicateExam.isComplete, false);

  clearBank();
  const batchConfig = { grade: '10', sourceMode: 'synthetic', mcqCount: 5, essayMatrix: { TH: 1, VD: 0, VDC: 0 }, batchCount: 3, deduplicatePolicy: 'disjoint', seed: 'batch-invariant' };
  const batchA = MathEngine.generateBatchExams(batchConfig);
  const batchB = MathEngine.generateBatchExams(batchConfig);
  assert.deepEqual(batchA.map(exam => exam.answerKeys), batchB.map(exam => exam.answerKeys));
  assert.ok(batchA.every(exam => exam.isComplete === true));
  const batchSignatures = batchA.flatMap(exam => exam.answerKeys.map(key => MathEngine.mathQuestionSignature(key.content)));
  assert.equal(new Set(batchSignatures).size, batchSignatures.length);

  const variants = MathEngine.generateBatchExams({ ...batchConfig, deduplicatePolicy: 'variant_shuffle', seed: 'variant-invariant' });
  assert.ok(variants.every(exam => exam.isComplete === true));
  assert.ok(variants.every(exam => exam.totalQuestions === exam.answerKeys.length));

  console.log('PASS Math production invariants');
} finally {
  clearBank();
}
