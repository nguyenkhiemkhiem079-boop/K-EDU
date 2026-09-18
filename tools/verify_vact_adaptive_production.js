const assert = require('node:assert/strict');
const path = require('node:path');
const vact = require('../js/vact');

console.log('--- Starting V-ACT Adaptive Practice & Production Hardening Verification ---');

const adaptive = vact.adaptive;
const analytics = vact.performanceAnalytics;
const signatureEngine = vact.quality;

assert.ok(adaptive, 'Adaptive module must exist');
assert.ok(typeof adaptive.generateWeaknessTest === 'function');
assert.ok(typeof adaptive.formatWeaknessExamAsQuiz === 'function');
assert.ok(typeof adaptive.computeAdaptiveDifficultyWeights === 'function');
assert.ok(typeof adaptive.selectQuestionsWithRecentIntelligence === 'function');

const TEST_STUDENT = {
  studentName: 'Tran Van Adaptive',
  studentClass: '12-VACT',
  studentUid: 'usr_adaptive_qa'
};

// Clear previous attempts
analytics.clearAttempts(TEST_STUDENT);

// =========================================================================
// 1. MINIMUM ATTEMPTS THRESHOLD
// =========================================================================
console.log('1. Verifying minimum attempts threshold...');

const zeroAttemptsResult = adaptive.generateWeaknessTest({
  studentId: TEST_STUDENT,
  minimumAttempts: 1
});
assert.equal(zeroAttemptsResult.success, false);
assert.equal(zeroAttemptsResult.hasWeaknesses, false);
assert.equal(zeroAttemptsResult.reason, 'INSUFFICIENT_ATTEMPTS');
assert.ok(zeroAttemptsResult.message.includes('Cần hoàn thành tối thiểu'));

// =========================================================================
// 2. MINIMUM EVIDENCE THRESHOLD (NEVER CLASSIFY ON 1-2 QUESTIONS)
// =========================================================================
console.log('2. Verifying minimum evidence threshold (no weakness on 1-2 questions)...');

// Attempt with only 2 questions in geometry (0/2 correct)
analytics.recordAttempt({
  ...TEST_STUDENT,
  testId: 'att_sparse_01',
  mode: 'section_mini',
  generatedCount: 2,
  correct: 0,
  incorrect: 2,
  unanswered: 0,
  duration: 120,
  review: [
    { num: 1, id: 'q1', signature: 's1', section: 'math', skill: 'geometry', isCorrect: false },
    { num: 2, id: 'q2', signature: 's2', section: 'math', skill: 'geometry', isCorrect: false }
  ]
});

const sparseResult = adaptive.generateWeaknessTest({
  studentId: TEST_STUDENT,
  minimumQuestions: 5,
  minimumAttempts: 1
});
assert.equal(sparseResult.success, false);
assert.equal(sparseResult.hasWeaknesses, false);
assert.equal(sparseResult.reason, 'NO_VERIFIED_WEAKNESSES');
assert.ok(sparseResult.insufficientEvidence.some(item => item.name.includes('Hình học')));

// =========================================================================
// 3. TARGETED WEAKNESS PRACTICE WITH SUFFICIENT EVIDENCE
// =========================================================================
console.log('3. Verifying weakness practice generation with sufficient evidence (>= 5 questions)...');

// Add 4 more geometry questions (all incorrect: 0/6 = 0% < 60%)
// And 8 algebra questions (8/8 = 100% >= 80% strength)
analytics.recordAttempt({
  ...TEST_STUDENT,
  testId: 'att_rich_02',
  mode: 'section_mini',
  generatedCount: 12,
  correct: 8,
  incorrect: 4,
  unanswered: 0,
  duration: 600,
  review: [
    ...Array(4).fill(null).map((_, i) => ({
      num: i + 3,
      id: `q_geom_${i}`,
      signature: `sig_geom_${i}`,
      section: 'math',
      skill: 'geometry',
      isCorrect: false
    })),
    ...Array(8).fill(null).map((_, i) => ({
      num: i + 7,
      id: `q_alg_${i}`,
      signature: `sig_alg_${i}`,
      section: 'math',
      skill: 'algebra',
      isCorrect: true
    }))
  ]
});

const weaknessExam = adaptive.generateWeaknessTest({
  studentId: TEST_STUDENT,
  count: 15,
  minimumQuestions: 5,
  minimumAttempts: 1,
  weaknessThreshold: 60
});

assert.equal(weaknessExam.success, true);
assert.equal(weaknessExam.hasWeaknesses, true);
assert.ok(weaknessExam.targetedWeaknesses.some(w => w.key === 'math.geometry'));
assert.equal(weaknessExam.questions.length, 15, 'Should deliver requested question count');
assert.ok(weaknessExam.questions[0].num === 1);
assert.ok(weaknessExam.questions[14].num === 15);

// =========================================================================
// 4. ADAPTIVE DIFFICULTY WEIGHTS
// =========================================================================
console.log('4. Verifying adaptive difficulty adjustments...');

const highComp = adaptive.computeAdaptiveDifficultyWeights(85);
assert.equal(highComp.hard, 0.30);
assert.equal(highComp.easy, 0.20);
assert.ok(highComp.profileName.includes('Nâng cao'));

const lowComp = adaptive.computeAdaptiveDifficultyWeights(40);
assert.equal(lowComp.easy, 0.50);
assert.equal(lowComp.hard, 0.10);
assert.ok(lowComp.profileName.includes('Củng cố'));

const stdComp = adaptive.computeAdaptiveDifficultyWeights(65);
assert.equal(stdComp.easy, 0.30);
assert.equal(stdComp.medium, 0.50);
assert.equal(stdComp.hard, 0.20);
assert.ok(stdComp.profileName.includes('Cân bằng'));

// =========================================================================
// 5. RECENT-QUESTION INTELLIGENCE
// =========================================================================
console.log('5. Verifying recent-question intelligence (unseen -> seen long ago -> fallback)...');

const mockPool = [
  { id: 'p1', question: 'Câu 1', options: ['A','B','C','D'], signature: 'sig_pool_1' },
  { id: 'p2', question: 'Câu 2', options: ['A','B','C','D'], signature: 'sig_pool_2' },
  { id: 'p3', question: 'Câu 3', options: ['A','B','C','D'], signature: 'sig_pool_3' },
  { id: 'p4', question: 'Câu 4', options: ['A','B','C','D'], signature: 'sig_pool_4' }
];

const mockAttempts = [
  {
    submittedAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    questionSignatures: ['sig_pool_2'] // seen long ago
  },
  {
    submittedAt: new Date().toISOString(),
    questionSignatures: ['sig_pool_3'] // recently seen
  }
];

// When requesting 2 questions out of pool:
// Should select p1 (unseen) and p4 (unseen) before p2 (seen long ago) and p3 (recently seen)
const selected2 = adaptive.selectQuestionsWithRecentIntelligence(mockPool, mockAttempts, 2);
const selIds2 = selected2.map(q => q.id);
assert.ok(selIds2.includes('p1'), 'Should select unseen p1');
assert.ok(selIds2.includes('p4'), 'Should select unseen p4');
assert.ok(!selIds2.includes('p3'), 'Should not select recently seen p3 when unseen are available');

// When requesting 4 questions (pool exhausted):
// Must fall back safely to include all without failing or permanently excluding
const selected4 = adaptive.selectQuestionsWithRecentIntelligence(mockPool, mockAttempts, 4);
assert.equal(selected4.length, 4, 'Should fallback and deliver all 4 when required');

// =========================================================================
// 6. QUIZ RUNNER CONVERSION (formatWeaknessExamAsQuiz)
// =========================================================================
console.log('6. Verifying formatWeaknessExamAsQuiz conversion for K-EDU exam runner...');

const quiz = adaptive.formatWeaknessExamAsQuiz(weaknessExam);
assert.ok(quiz.id);
assert.ok(quiz.examId);
assert.equal(quiz.id, weaknessExam.testId);
assert.equal(quiz.mode, 'weakness_practice');
assert.equal(quiz.isVactWeakness, true);
assert.equal(quiz.questions.length, 15);
assert.ok(quiz.title.includes('Luyện Điểm Yếu'));

// =========================================================================
// 7. PERFORMANCE & SIGNATURE MEMOIZATION
// =========================================================================
console.log('7. Verifying question signature memoization...');

const testObj = {
  question: 'Phương trình bậc hai ax^2 + bx + c = 0',
  options: ['A. Có nghiệm', 'B. Vô nghiệm', 'C. Luôn dương', 'D. Luôn âm']
};

const sig1 = signatureEngine.computeVACTQuestionSignature(testObj);
assert.ok(sig1);
assert.equal(testObj.signature, sig1, 'Signature should be memoized on question object');

// Second call should return instantly
const sig2 = signatureEngine.computeVACTQuestionSignature(testObj);
assert.equal(sig1, sig2);

// Clean up test student
analytics.clearAttempts(TEST_STUDENT);

console.log('--- ALL V-ACT ADAPTIVE & PRODUCTION TESTS PASSED SUCCESSFULLY ---');
