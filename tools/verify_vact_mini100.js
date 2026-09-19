const assert = require('node:assert/strict');
const path = require('node:path');
const vact = require('../js/vact');

console.log('--- Starting Mini V-ACT 100 Verification ---');

const examGenerator = vact.VACTExamGenerator;
assert.ok(examGenerator, 'VACTExamGenerator must exist');
assert.ok(typeof examGenerator.generateFromProfile === 'function');
assert.ok(typeof examGenerator.generateMini100 === 'function');
assert.ok(typeof examGenerator.formatExamAsQuiz === 'function');
assert.ok(typeof examGenerator.computeSectionBreakdown === 'function');

// 1. Profile totals & section requirements
console.log('1. Verifying Mini V-ACT 100 profile constants...');
const profile = vact.VACT_MINI_100_PROFILE;
assert.equal(profile.id, 'vact_mini_100');
assert.equal(profile.totalQuestions, 100);
assert.equal(profile.sections.vietnamese, 25);
assert.equal(profile.sections.english, 25);
assert.equal(profile.sections.math, 25);
assert.equal(profile.sections.logic_data, 10);
assert.equal(profile.sections.scientific_reasoning, 15);

// 2. Partial Mini 100 with current live repository bank
console.log('2. Verifying Mini 100 generation with current repository bank...');
const liveMini = examGenerator.generateMini100({
  difficulty: 'balanced',
  seed: 'test_live_mini_100'
});

assert.equal(liveMini.profileId, 'vact_mini_100');
assert.equal(liveMini.requestedTotal, 100);
assert.equal(liveMini.isComplete, true, 'Live Mini 100 must be marked isComplete: true with production bank');
assert.equal(liveMini.missingTotal, 0, 'Should be missing 0 questions');
assert.equal(liveMini.generatedTotal, 100, 'Should generate exactly 100 questions');
assert.equal(liveMini.questions.length, 100);

// 3. Section Isolation: No cross-section replacement
console.log('3. Verifying strict section isolation (NO compensating shortages with math)...');
const sec = liveMini.sections;

assert.equal(sec.vietnamese.requested, 25);
assert.equal(sec.vietnamese.generated, 25);
assert.equal(sec.vietnamese.missing, 0);
assert.equal(sec.vietnamese.isComplete, true);

assert.equal(sec.english.requested, 25);
assert.equal(sec.english.generated, 25);
assert.equal(sec.english.missing, 0);
assert.equal(sec.english.isComplete, true);

assert.equal(sec.math.requested, 25);
assert.equal(sec.math.generated, 25, 'Math must NOT exceed requested 25 to fill language gaps');
assert.equal(sec.math.missing, 0);
assert.equal(sec.math.isComplete, true);

assert.equal(sec.logic_data.requested, 10);
assert.equal(sec.logic_data.generated, 10);
assert.equal(sec.logic_data.missing, 0);
assert.equal(sec.logic_data.isComplete, true);

assert.equal(sec.scientific_reasoning.requested, 15);
assert.equal(sec.scientific_reasoning.generated, 15);
assert.equal(sec.scientific_reasoning.missing, 0);
assert.equal(sec.scientific_reasoning.isComplete, true);

console.log('- Sections successfully isolated: Viet(25/25), Eng(25/25), Math(25/25), Logic(10/10), Sci(15/15)');

// 4. Deduplication across the entire exam
console.log('4. Verifying anti-duplication across entire Mini 100...');
const allSignatures = liveMini.questions.map(q => vact.computeVACTQuestionSignature(q));
const uniqueSignatures = new Set(allSignatures);
assert.equal(uniqueSignatures.size, liveMini.questions.length, 'Every question across the entire exam must have a unique signature');

// 5. Sequential Question Numbering and Section Boundaries
console.log('5. Verifying sequential numbering and section boundaries...');
for (let i = 0; i < liveMini.questions.length; i++) {
  const q = liveMini.questions[i];
  assert.equal(q.examIndex, i + 1, `Question index must be ${i + 1}`);
  assert.ok(q.sectionKey, 'Each question must be tagged with sectionKey');
  assert.ok(q.sectionPartNumber >= 1 && q.sectionPartNumber <= 5);
}

// 6. Complete Mini 100 simulation (using mock complete bank)
console.log('6. Verifying complete Mini 100 generation when bank is sufficient...');
const mockQuestions = [];
const mockSource = { sourceId: 'vact_mock_src', sourceFile: 'mock.pdf', extractedFromSource: true, provider: 'mock' };
const mockQuality = { answerVerified: true, sourceVerified: true };
for (let i = 1; i <= 25; i++) {
  mockQuestions.push({
    id: `mock_viet_${i}`, section: 'vietnamese', skill: 'language_usage', difficulty: 'medium',
    questionType: 'single_choice', question: `Câu hỏi tiếng Việt số ${i}`, options: ['A', 'B', 'C', 'D'],
    correctAnswer: 'A', status: 'production', quality: mockQuality, source: mockSource
  });
  mockQuestions.push({
    id: `mock_eng_${i}`, section: 'english', skill: 'reading_comprehension', difficulty: 'medium',
    questionType: 'single_choice', question: `English test question ${i}`, options: ['A', 'B', 'C', 'D'],
    correctAnswer: 'B', status: 'production', quality: mockQuality, source: mockSource
  });
  mockQuestions.push({
    id: `mock_math_${i}`, section: 'math', skill: 'algebra', difficulty: 'medium',
    questionType: 'single_choice', question: `Câu hỏi toán số ${i}`, options: ['A', 'B', 'C', 'D'],
    correctAnswer: 'C', status: 'production', quality: mockQuality, source: mockSource
  });
}
for (let i = 1; i <= 10; i++) {
  mockQuestions.push({
    id: `mock_logic_${i}`, section: 'logic_data', skill: 'logical_reasoning', difficulty: 'medium',
    questionType: 'single_choice', question: `Câu hỏi logic số ${i}`, options: ['A', 'B', 'C', 'D'],
    correctAnswer: 'D', status: 'production', quality: mockQuality, source: mockSource
  });
}
for (let i = 1; i <= 15; i++) {
  mockQuestions.push({
    id: `mock_sci_${i}`, section: 'scientific_reasoning', skill: 'physics', difficulty: 'medium',
    questionType: 'single_choice', question: `Câu hỏi khoa học số ${i}`, options: ['A', 'B', 'C', 'D'],
    correctAnswer: 'A', status: 'production', quality: mockQuality, source: mockSource
  });
}

// Set custom bank in internalBank
vact.VACTInternalBank.setRawBank(mockQuestions);
vact.VACTCoverage.clearCoverageCache();

const completeMini = examGenerator.generateMini100({ seed: 'mock_complete_100' });
assert.equal(completeMini.requestedTotal, 100);
assert.equal(completeMini.generatedTotal, 100);
assert.equal(completeMini.missingTotal, 0);
assert.equal(completeMini.isComplete, true, 'isComplete must be true when all sections are fully populated');
assert.equal(completeMini.shortages.length, 0);
console.log('- Complete Mini 100 (100/100) generated successfully with mock bank');

// Reset raw bank to default document bank
vact.VACTInternalBank.setRawBank(null);
vact.VACTCoverage.clearCoverageCache();

// 7. Format Exam As Quiz
console.log('7. Verifying formatExamAsQuiz conversion...');
const quizObj = examGenerator.formatExamAsQuiz(liveMini);
assert.equal(quizObj.id, liveMini.id);
assert.equal(quizObj.subject, 'vact');
assert.equal(quizObj.subjectLabel, 'Mini V-ACT 100');
assert.equal(quizObj.timeLimit, 90);
assert.equal(quizObj.answerKeys.length, 100);
assert.ok(quizObj.examHtml.includes('PHẦN 1 —'));
assert.ok(quizObj.examHtml.includes('Tiếng Việt'));
assert.ok(quizObj.vactMeta.isComplete === true);

// 8. Section Breakdown / Grading Analytics
console.log('8. Verifying computeSectionBreakdown analytics...');
const mockReviewData = [
  { section: 'vietnamese', isCorrect: true, given: 'A', correct: 'A' },
  { section: 'vietnamese', isCorrect: false, given: 'B', correct: 'A' },
  { section: 'math', isCorrect: true, given: 'C', correct: 'C' },
  { section: 'math', isCorrect: true, given: 'D', correct: 'D' },
  { section: 'logic_data', isCorrect: false, given: '(chưa điền)', correct: 'A' }
];

const breakdown = examGenerator.computeSectionBreakdown(mockReviewData);
assert.equal(breakdown.vietnamese.total, 2);
assert.equal(breakdown.vietnamese.correct, 1);
assert.equal(breakdown.vietnamese.wrong, 1);
assert.equal(breakdown.vietnamese.pct, 50);

assert.equal(breakdown.math.total, 2);
assert.equal(breakdown.math.correct, 2);
assert.equal(breakdown.math.wrong, 0);
assert.equal(breakdown.math.pct, 100);

assert.equal(breakdown.logic_data.total, 1);
assert.equal(breakdown.logic_data.unanswered, 1);

console.log('--- ALL MINI V-ACT 100 TESTS PASSED SUCCESSFULLY ---');
