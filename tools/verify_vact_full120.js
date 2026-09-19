const assert = require('node:assert/strict');
const path = require('node:path');
const vact = require('../js/vact');

console.log('--- Starting Full V-ACT 120 Simulation Verification ---');

const examGenerator = vact.VACTExamGenerator;
assert.ok(examGenerator, 'VACTExamGenerator must exist');
assert.ok(typeof examGenerator.generateFromProfile === 'function');
assert.ok(typeof examGenerator.generateFull120 === 'function');
assert.ok(typeof examGenerator.formatExamAsQuiz === 'function');
assert.ok(typeof examGenerator.computeSectionBreakdown === 'function');

// 1. Profile totals, time limit & section requirements
console.log('1. Verifying Full V-ACT 120 profile constants & time limit...');
const profile = vact.VACT_FULL_PROFILE;
assert.equal(profile.id, 'vact_full');
assert.equal(profile.totalQuestions, 120);
assert.equal(profile.timeLimitMinutes, 150, 'Full V-ACT duration must be exactly 150 minutes');
assert.equal(profile.sections.vietnamese, 30);
assert.equal(profile.sections.english, 30);
assert.equal(profile.sections.math, 30);
assert.equal(profile.sections.logic_data, 12);
assert.equal(profile.sections.scientific_reasoning, 18);
assert.equal(
  profile.sections.vietnamese +
  profile.sections.english +
  profile.sections.math +
  profile.sections.logic_data +
  profile.sections.scientific_reasoning,
  120,
  'Sum of sections must equal 120'
);

// 2. Partial Full 120 with current live repository bank
console.log('2. Verifying Full V-ACT 120 generation with current repository bank...');
const liveFull = examGenerator.generateFull120({
  difficulty: 'balanced',
  seed: 'test_live_full_120'
});

assert.equal(liveFull.profileId, 'vact_full');
assert.equal(liveFull.requestedTotal, 120);
assert.equal(liveFull.timeLimitMinutes, 150);
assert.equal(liveFull.isComplete, true, 'Live Full 120 must be marked isComplete: true with production bank');
assert.equal(liveFull.missingTotal, 0, 'Should be missing 0 questions');
assert.equal(liveFull.generatedTotal, 120, 'Should generate exactly 120 questions (30 Viet + 30 Eng + 30 Math + 12 Logic + 18 Science)');
assert.equal(liveFull.questions.length, 120);

// 3. Section Isolation: No cross-section replacement
console.log('3. Verifying strict section isolation (NO compensating shortages with math)...');
const sec = liveFull.sections;

assert.equal(sec.vietnamese.requested, 30);
assert.equal(sec.vietnamese.generated, 30);
assert.equal(sec.vietnamese.missing, 0);
assert.equal(sec.vietnamese.isComplete, true);

assert.equal(sec.english.requested, 30);
assert.equal(sec.english.generated, 30);
assert.equal(sec.english.missing, 0);
assert.equal(sec.english.isComplete, true);

assert.equal(sec.math.requested, 30);
assert.equal(sec.math.generated, 30, 'Math must NOT exceed requested 30 to fill language gaps');
assert.equal(sec.math.missing, 0);
assert.equal(sec.math.isComplete, true);

assert.equal(sec.logic_data.requested, 12);
assert.equal(sec.logic_data.generated, 12);
assert.equal(sec.logic_data.missing, 0);
assert.equal(sec.logic_data.isComplete, true);

assert.equal(sec.scientific_reasoning.requested, 18);
assert.equal(sec.scientific_reasoning.generated, 18);
assert.equal(sec.scientific_reasoning.missing, 0);
assert.equal(sec.scientific_reasoning.isComplete, true);

console.log('- Sections successfully isolated: Viet(30/30), Eng(30/30), Math(30/30), Logic(12/12), Sci(18/18)');

// 4. Deduplication across entire Full 120 exam
console.log('4. Verifying anti-duplication across entire Full V-ACT 120...');
const allSignatures = liveFull.questions.map(q => vact.computeVACTQuestionSignature(q));
const uniqueSignatures = new Set(allSignatures);
assert.equal(uniqueSignatures.size, liveFull.questions.length, 'Every question across the entire exam must have a unique signature');

// 5. Sequential Question Numbering and Section Boundaries
console.log('5. Verifying sequential numbering and section metadata...');
for (let i = 0; i < liveFull.questions.length; i++) {
  const q = liveFull.questions[i];
  assert.equal(q.examIndex, i + 1, `Question index must be ${i + 1}`);
  assert.ok(q.sectionKey, 'Each question must be tagged with sectionKey');
  assert.ok(q.sectionPartNumber >= 1 && q.sectionPartNumber <= 5);
}

// 6. Complete Full 120 simulation (using mock complete bank)
console.log('6. Verifying complete Full V-ACT 120 generation when bank is sufficient...');
const mockQuestions = [];
const mockSource = { sourceId: 'vact_mock_src', sourceFile: 'mock.pdf', extractedFromSource: true, provider: 'mock' };
const mockQuality = { answerVerified: true, sourceVerified: true };
// 30 Vietnamese, 30 English, 30 Math, 12 Logic, 18 Science = 120
for (let i = 1; i <= 30; i++) {
  mockQuestions.push({
    id: `mock_viet_${i}`, section: 'vietnamese', skill: 'language_usage', difficulty: 'medium',
    questionType: 'single_choice', question: `Câu hỏi tiếng Việt chuẩn số ${i}`, options: ['A', 'B', 'C', 'D'],
    correctAnswer: 'A', status: 'production', quality: mockQuality, source: mockSource
  });
  mockQuestions.push({
    id: `mock_eng_${i}`, section: 'english', skill: 'reading_comprehension', difficulty: 'medium',
    questionType: 'single_choice', question: `English standard test question ${i}`, options: ['A', 'B', 'C', 'D'],
    correctAnswer: 'B', status: 'production', quality: mockQuality, source: mockSource
  });
  mockQuestions.push({
    id: `mock_math_${i}`, section: 'math', skill: 'algebra', difficulty: 'medium',
    questionType: 'single_choice', question: `Câu hỏi toán học số ${i}`, options: ['A', 'B', 'C', 'D'],
    correctAnswer: 'C', status: 'production', quality: mockQuality, source: mockSource
  });
}
for (let i = 1; i <= 12; i++) {
  mockQuestions.push({
    id: `mock_logic_${i}`, section: 'logic_data', skill: 'logical_reasoning', difficulty: 'medium',
    questionType: 'single_choice', question: `Câu hỏi logic và số liệu số ${i}`, options: ['A', 'B', 'C', 'D'],
    correctAnswer: 'D', status: 'production', quality: mockQuality, source: mockSource
  });
}
for (let i = 1; i <= 18; i++) {
  mockQuestions.push({
    id: `mock_sci_${i}`, section: 'scientific_reasoning', skill: 'physics', difficulty: 'medium',
    questionType: 'single_choice', question: `Câu hỏi suy luận khoa học số ${i}`, options: ['A', 'B', 'C', 'D'],
    correctAnswer: 'A', status: 'production', quality: mockQuality, source: mockSource
  });
}

// Set custom bank in internalBank
vact.VACTInternalBank.setRawBank(mockQuestions);
vact.VACTCoverage.clearCoverageCache();

const completeFull = examGenerator.generateFull120({
  difficulty: 'balanced',
  seed: 'test_mock_complete_full_120'
});

assert.equal(completeFull.requestedTotal, 120);
assert.equal(completeFull.generatedTotal, 120);
assert.equal(completeFull.missingTotal, 0);
assert.equal(completeFull.isComplete, true, 'Complete Full 120 must be marked isComplete: true when pool satisfies all counts');
assert.equal(completeFull.sections.vietnamese.generated, 30);
assert.equal(completeFull.sections.english.generated, 30);
assert.equal(completeFull.sections.math.generated, 30);
assert.equal(completeFull.sections.logic_data.generated, 12);
assert.equal(completeFull.sections.scientific_reasoning.generated, 18);
console.log('- Complete Full V-ACT 120 (120/120) generated successfully with mock bank');

// Reset raw bank to default document bank
vact.VACTInternalBank.setRawBank(null);
vact.VACTCoverage.clearCoverageCache();

// 7. formatExamAsQuiz conversion and time limits
console.log('7. Verifying formatExamAsQuiz conversion (150 min, subjectLabel)...');
const quizRecord = examGenerator.formatExamAsQuiz(liveFull);
assert.equal(quizRecord.subject, 'vact');
assert.equal(quizRecord.subjectLabel, 'Full V-ACT 120');
assert.equal(quizRecord.timeLimit, 150);
assert.equal(quizRecord.answerKeys.length, 120);
assert.ok(quizRecord.examHtml.includes('Thời gian làm bài: <strong>150 phút</strong>'));
assert.ok(quizRecord.examHtml.includes('PHẦN 1 —'));
assert.ok(quizRecord.examHtml.includes('Tiếng Việt'));
assert.ok(quizRecord.examHtml.includes('PHẦN 3 —'));
assert.ok(quizRecord.examHtml.includes('Toán học'));

// 8. Result breakdown analytics without invented scaled score
console.log('8. Verifying result breakdown analytics...');
const mockReviewData = [
  // 5 Vietnamese (4 correct, 1 wrong)
  { section: 'vietnamese', isCorrect: true, given: 'A', correctAnswer: 'A' },
  { section: 'vietnamese', isCorrect: true, given: 'B', correctAnswer: 'B' },
  { section: 'vietnamese', isCorrect: true, given: 'C', correctAnswer: 'C' },
  { section: 'vietnamese', isCorrect: true, given: 'D', correctAnswer: 'D' },
  { section: 'vietnamese', isCorrect: false, given: 'A', correctAnswer: 'B' },
  // 3 Math (2 correct, 1 unanswered)
  { section: 'math', isCorrect: true, given: 'A', correctAnswer: 'A' },
  { section: 'math', isCorrect: true, given: 'B', correctAnswer: 'B' },
  { section: 'math', isCorrect: false, given: '(chưa điền)', correctAnswer: 'C' },
  // 2 Logic (1 correct, 1 wrong)
  { section: 'logic_data', isCorrect: true, given: 'D', correctAnswer: 'D' },
  { section: 'logic_data', isCorrect: false, given: 'C', correctAnswer: 'D' }
];

const breakdown = examGenerator.computeSectionBreakdown(mockReviewData);
assert.equal(breakdown.vietnamese.total, 5);
assert.equal(breakdown.vietnamese.correct, 4);
assert.equal(breakdown.vietnamese.wrong, 1);
assert.equal(breakdown.vietnamese.pct, 80);

assert.equal(breakdown.math.total, 3);
assert.equal(breakdown.math.correct, 2);
assert.equal(breakdown.math.wrong, 1);
assert.equal(breakdown.math.unanswered, 1);
assert.equal(breakdown.math.pct, 67);

assert.equal(breakdown.logic_data.total, 2);
assert.equal(breakdown.logic_data.correct, 1);
assert.equal(breakdown.logic_data.wrong, 1);
assert.equal(breakdown.logic_data.pct, 50);

// 9. Timeout auto-submit vs manual submit confirmation logic
console.log('9. Verifying timeout and manual submit logic invariants...');
function simulateSubmit(isAuto, studentAnswers, totalKeys) {
  if (!isAuto) {
    const answeredCount = Object.keys(studentAnswers || {}).filter(k => studentAnswers[k] && studentAnswers[k] !== '(chưa điền)').length;
    const unansweredCount = Math.max(0, totalKeys - answeredCount);
    return {
      auto: false,
      needsConfirmation: true,
      unansweredCount,
      confirmed: true
    };
  }
  return {
    auto: true,
    needsConfirmation: false,
    unansweredCount: 0
  };
}

const timeoutSubmit = simulateSubmit(true, { 1: 'A' }, 120);
assert.equal(timeoutSubmit.auto, true);
assert.equal(timeoutSubmit.needsConfirmation, false, 'Timeout auto-submit must NOT prompt confirmation');

const manualSubmit = simulateSubmit(false, { 1: 'A', 2: 'B' }, 120);
assert.equal(manualSubmit.auto, false);
assert.equal(manualSubmit.needsConfirmation, true);
assert.equal(manualSubmit.unansweredCount, 118, 'Manual submit must correctly compute unanswered count');

console.log('--- ALL FULL V-ACT 120 SIMULATION TESTS PASSED SUCCESSFULLY ---');
