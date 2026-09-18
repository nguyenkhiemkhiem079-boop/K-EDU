const assert = require('node:assert/strict');
const path = require('node:path');
const vact = require('../js/vact');

console.log('--- Starting V-ACT Performance Analytics Verification ---');

const analytics = vact.performanceAnalytics;
assert.ok(analytics, 'VACTPerformanceAnalytics module must exist');
assert.ok(typeof analytics.recordAttempt === 'function');
assert.ok(typeof analytics.getAttempts === 'function');
assert.ok(typeof analytics.getAttemptById === 'function');
assert.ok(typeof analytics.computeSectionAnalytics === 'function');
assert.ok(typeof analytics.computeSkillAnalytics === 'function');
assert.ok(typeof analytics.getAttemptHistory === 'function');
assert.ok(typeof analytics.computeTrends === 'function');
assert.ok(typeof analytics.detectStrengthsAndWeaknesses === 'function');
assert.ok(typeof analytics.getWrongQuestions === 'function');
assert.ok(typeof analytics.renderDashboardHtml === 'function');
assert.ok(typeof analytics.clearAttempts === 'function');

const TEST_STUDENT = {
  studentName: 'Nguyen Van A',
  studentClass: '12A1',
  studentUid: 'usr_test_123'
};

// Clear any previous attempts
analytics.clearAttempts(TEST_STUDENT);
assert.equal(analytics.getAttempts(TEST_STUDENT).length, 0);

// =========================================================================
// 1. ATTEMPT PERSISTENCE
// =========================================================================
console.log('1. Verifying attempt persistence & schema fields...');

const sampleAttempt = analytics.recordAttempt({
  ...TEST_STUDENT,
  testId: 'test_full_001',
  mode: 'full_120',
  profile: 'vact_full',
  requestedCount: 120,
  generatedCount: 120,
  correct: 82,
  incorrect: 30,
  unanswered: 8,
  scoreRaw: 82,
  duration: 8100, // 135 mins
  review: [
    // Math questions
    { num: 1, id: 'q_m1', signature: 'sig_m1', section: 'math', skill: 'algebra', isCorrect: true, given: 'A', correctAnswer: 'A' },
    { num: 2, id: 'q_m2', signature: 'sig_m2', section: 'math', skill: 'algebra', isCorrect: true, given: 'B', correctAnswer: 'B' },
    { num: 3, id: 'q_m3', signature: 'sig_m3', section: 'math', skill: 'geometry', isCorrect: false, given: 'C', correctAnswer: 'D', options: ['A','B','C','D'], question: 'Tính thể tích khối chóp?', explanation: 'V = 1/3 B h' },
    { num: 4, id: 'q_m4', signature: 'sig_m4', section: 'math', skill: 'functions', isCorrect: false, given: '', correctAnswer: 'A', options: ['A','B','C','D'], question: 'Tìm tiệm cận ngang?', explanation: 'y = lim x->inf' },
    // Scientific reasoning
    { num: 5, id: 'q_s1', signature: 'sig_s1', section: 'scientific_reasoning', skill: 'physics', isCorrect: true, given: 'A', correctAnswer: 'A' },
    { num: 6, id: 'q_s2', signature: 'sig_s2', section: 'scientific_reasoning', skill: 'chemistry', isCorrect: true, given: 'C', correctAnswer: 'C' },
    { num: 7, id: 'q_s3', signature: 'sig_s3', section: 'scientific_reasoning', skill: 'biology', isCorrect: false, given: 'B', correctAnswer: 'C' },
    // Logic/Data
    { num: 8, id: 'q_l1', signature: 'sig_l1', section: 'logic_data', skill: 'logical_reasoning', isCorrect: true, given: 'D', correctAnswer: 'D' },
    { num: 9, id: 'q_l2', signature: 'sig_l2', section: 'logic_data', skill: 'data_interpretation', isCorrect: true, given: 'B', correctAnswer: 'B' },
    // Vietnamese
    { num: 10, id: 'q_v1', signature: 'sig_v1', section: 'vietnamese', skill: 'reading_comprehension', isCorrect: true, given: 'A', correctAnswer: 'A' }
  ]
});

assert.ok(sampleAttempt.id, 'Attempt should have unique id');
assert.equal(sampleAttempt.testId, 'test_full_001');
assert.equal(sampleAttempt.mode, 'full_120');
assert.equal(sampleAttempt.profile, 'vact_full');
assert.equal(sampleAttempt.requestedCount, 120);
assert.equal(sampleAttempt.generatedCount, 120);
assert.equal(sampleAttempt.correct, 82);
assert.equal(sampleAttempt.incorrect, 30);
assert.equal(sampleAttempt.unanswered, 8);
assert.equal(sampleAttempt.scoreRaw, 82);
assert.equal(sampleAttempt.accuracy, 68); // 82/120 = 68%
assert.equal(sampleAttempt.duration, 8100);
assert.ok(sampleAttempt.startedAt);
assert.ok(sampleAttempt.submittedAt);
assert.equal(sampleAttempt.questionIds.length, 10);
assert.equal(sampleAttempt.questionSignatures.length, 10);

const retrievedList = analytics.getAttempts(TEST_STUDENT);
assert.equal(retrievedList.length, 1);
assert.equal(retrievedList[0].id, sampleAttempt.id);

const foundById = analytics.getAttemptById(sampleAttempt.id, TEST_STUDENT);
assert.ok(foundById);
assert.equal(foundById.testId, 'test_full_001');

// =========================================================================
// 2. NO OFFICIAL SCORE FABRICATION
// =========================================================================
console.log('2. Verifying strict NO official V-ACT score fabrication...');
assert.equal(sampleAttempt.officialScore, undefined, 'Must not fabricate officialScore');
assert.equal(sampleAttempt.scoreOfficial, undefined, 'Must not fabricate scoreOfficial');
assert.equal(sampleAttempt.scaledScore, undefined, 'Must not fabricate scaledScore');
assert.equal(sampleAttempt.vactScore, undefined, 'Must not fabricate vactScore');

// =========================================================================
// 3. SECTION ANALYTICS
// =========================================================================
console.log('3. Verifying section breakdown (only present sections evaluated)...');

const sectionBreakdown = analytics.computeSectionAnalytics(sampleAttempt);
// Review has: math (4), scientific_reasoning (3), logic_data (2), vietnamese (1). english is NOT present.
assert.ok(sectionBreakdown.math, 'Math section must be present');
assert.equal(sectionBreakdown.math.total, 4);
assert.equal(sectionBreakdown.math.correct, 2);
assert.equal(sectionBreakdown.math.incorrect, 2);
assert.equal(sectionBreakdown.math.unanswered, 1); // q_m4 given is ''
assert.equal(sectionBreakdown.math.accuracy, 50); // 2/4 = 50%

assert.ok(sectionBreakdown.scientific_reasoning, 'Scientific Reasoning section must be present');
assert.equal(sectionBreakdown.scientific_reasoning.total, 3);
assert.equal(sectionBreakdown.scientific_reasoning.correct, 2);
assert.equal(sectionBreakdown.scientific_reasoning.accuracy, 67); // 2/3 = 67%

assert.ok(sectionBreakdown.logic_data, 'Logic/Data section must be present');
assert.equal(sectionBreakdown.logic_data.total, 2);
assert.equal(sectionBreakdown.logic_data.correct, 2);
assert.equal(sectionBreakdown.logic_data.accuracy, 100);

assert.ok(sectionBreakdown.vietnamese, 'Vietnamese section must be present');
assert.equal(sectionBreakdown.vietnamese.total, 1);
assert.equal(sectionBreakdown.vietnamese.accuracy, 100);

assert.equal(sectionBreakdown.english, undefined, 'English section must NOT be present when test had no English questions');

// =========================================================================
// 4. SKILL ANALYTICS (NO GUESSED SKILLS)
// =========================================================================
console.log('4. Verifying skill analytics & strict taxonomy validation...');

const skillBreakdown = analytics.computeSkillAnalytics(sampleAttempt);
assert.ok(skillBreakdown['math.algebra'], 'math.algebra must exist');
assert.equal(skillBreakdown['math.algebra'].total, 2);
assert.equal(skillBreakdown['math.algebra'].correct, 2);
assert.equal(skillBreakdown['math.algebra'].accuracy, 100);

assert.ok(skillBreakdown['math.geometry'], 'math.geometry must exist');
assert.equal(skillBreakdown['math.geometry'].total, 1);
assert.equal(skillBreakdown['math.geometry'].correct, 0);
assert.equal(skillBreakdown['math.geometry'].accuracy, 0);

assert.ok(skillBreakdown['scientific_reasoning.physics'], 'scientific_reasoning.physics must exist');
assert.equal(skillBreakdown['scientific_reasoning.physics'].total, 1);
assert.equal(skillBreakdown['scientific_reasoning.physics'].correct, 1);

assert.ok(skillBreakdown['logic_data.logical_reasoning'], 'logic_data.logical_reasoning must exist');
assert.equal(skillBreakdown['logic_data.logical_reasoning'].total, 1);

// Test question with missing skill or invalid guessed skill
const testWithBadSkills = {
  review: [
    { section: 'math', skill: 'invented_skill_xyz', isCorrect: true }, // invalid skill
    { section: 'math', skill: null, isCorrect: true }, // missing skill
    { section: 'invalid_section', skill: 'algebra', isCorrect: true }, // invalid section
    { section: 'math', skill: 'algebra', isCorrect: true } // valid
  ]
};
const filteredSkills = analytics.computeSkillAnalytics(testWithBadSkills);
assert.equal(Object.keys(filteredSkills).length, 1, 'Only legitimate taxonomy skills must be included');
assert.ok(filteredSkills['math.algebra'], 'math.algebra should be the only mapped skill');
assert.equal(filteredSkills['math.algebra'].total, 1);

// =========================================================================
// 5. ATTEMPT HISTORY FORMATTING
// =========================================================================
console.log('5. Verifying attempt history labels and formatting...');

// Record a few more attempts to test history formatting
analytics.recordAttempt({
  ...TEST_STUDENT,
  testId: 'test_mini_math_1',
  mode: 'section_mini',
  profile: null,
  section: 'math',
  requestedCount: 30,
  generatedCount: 30,
  correct: 18,
  incorrect: 12,
  unanswered: 0,
  duration: 1800,
  submittedAt: new Date(Date.now() - 3600000).toISOString()
});

analytics.recordAttempt({
  ...TEST_STUDENT,
  testId: 'test_mini_math_2',
  mode: 'section_mini',
  profile: null,
  section: 'math',
  requestedCount: 30,
  generatedCount: 30,
  correct: 22,
  incorrect: 8,
  unanswered: 0,
  duration: 1800,
  submittedAt: new Date(Date.now() - 1800000).toISOString()
});

analytics.recordAttempt({
  ...TEST_STUDENT,
  testId: 'test_mini_100',
  mode: 'mini_100',
  profile: 'vact_mini_100',
  requestedCount: 100,
  generatedCount: 100,
  correct: 71,
  incorrect: 24,
  unanswered: 5,
  duration: 6000,
  submittedAt: new Date().toISOString()
});

const history = analytics.getAttemptHistory(TEST_STUDENT, 10);
assert.equal(history.length, 4);
// Reverse chronological: Mini 100, Math Mini #2, Math Mini #1, Full V-ACT
const labels = history.map(h => h.label);
assert.ok(labels.includes('Mini 100'), 'Should contain "Mini 100"');
assert.ok(labels.includes('Full V-ACT'), 'Should contain "Full V-ACT"');
assert.ok(labels.some(l => l.includes('Math Mini')), 'Should contain "Math Mini #..."');

// Check score text format matching user specification examples:
// Math Mini #1  18/30
// Math Mini #2  22/30
// Mini 100      71/100
// Full V-ACT    82/120
const mathMini1 = history.find(h => h.label === 'Math Mini #1');
assert.ok(mathMini1, 'Math Mini #1 must exist');
assert.equal(mathMini1.scoreText, '18/30', 'Math Mini #1 scoreText should be 18/30');

const mathMini2 = history.find(h => h.label === 'Math Mini #2');
assert.ok(mathMini2, 'Math Mini #2 must exist');
assert.equal(mathMini2.scoreText, '22/30', 'Math Mini #2 scoreText should be 22/30');

const mini100Hist = history.find(h => h.label === 'Mini 100');
assert.ok(mini100Hist, 'Mini 100 must exist');
assert.equal(mini100Hist.scoreText, '71/100', 'Mini 100 scoreText should be 71/100');

const fullVactHist = history.find(h => h.label === 'Full V-ACT');
assert.ok(fullVactHist, 'Full V-ACT must exist');
assert.equal(fullVactHist.scoreText, '82/120', 'Full V-ACT scoreText should be 82/120');

// =========================================================================
// 6. TREND CALCULATION
// =========================================================================
console.log('6. Verifying trend calculation without statistical overclaiming...');

// All attempts of student: Full (68%), Math 1 (60%), Math 2 (73%), Mini 100 (71%)
const allAttempts = analytics.getAttempts(TEST_STUDENT);
const trends = analytics.computeTrends(allAttempts);

assert.equal(trends.hasEnoughData, true);
assert.equal(trends.attemptsCount, 4);
assert.ok(trends.overall.progressionText.includes('→'), 'Progression should be shown as A% → B% → C%');
assert.ok(Number.isFinite(trends.overall.delta));

// Section-level trend (e.g. Math accuracy progression)
assert.ok(trends.sections.math, 'Math section trend should exist');
assert.ok(trends.sections.math.progressionText.includes('→'), 'Math progression should show trend text');
assert.equal(trends.sections.math.points.length, 3); // Full, Math 1, Math 2

// When < 2 attempts
const singleAttemptTrend = analytics.computeTrends([allAttempts[0]]);
assert.equal(singleAttemptTrend.hasEnoughData, false);
assert.ok(singleAttemptTrend.message.includes('ít nhất 2 bài thi'));

// =========================================================================
// 7. WEAKNESS & STRENGTH DETECTION (EVIDENCE THRESHOLD)
// =========================================================================
console.log('7. Verifying weakness & strength detection with strict evidence threshold...');

// Case A: Only 1 question in a topic -> NEVER declare weakness or strength
const sparseAttempt = {
  review: [
    { section: 'math', skill: 'geometry', isCorrect: false } // 0/1 = 0%
  ]
};
const sparseEval = analytics.detectStrengthsAndWeaknesses([sparseAttempt], { minQuestions: 5 });
assert.equal(sparseEval.weaknesses.length, 0, 'Must NOT declare weakness on 1 question!');
assert.equal(sparseEval.strengths.length, 0, 'Must NOT declare strength on 1 question!');
assert.equal(sparseEval.insufficientEvidence.length, 2, 'Should mark both section & skill as insufficient evidence');
assert.ok(sparseEval.insufficientEvidence[0].reason.includes('Chưa đủ bằng chứng'));

// Case B: 10 questions in geometry, only 3 correct (30% < 60%) -> WEAKNESS
// and 10 questions in algebra, 9 correct (90% >= 80%) -> STRENGTH
const richAttempt = {
  review: [
    ...Array(7).fill({ section: 'math', skill: 'geometry', isCorrect: false, given: 'A' }),
    ...Array(3).fill({ section: 'math', skill: 'geometry', isCorrect: true, given: 'B' }),
    ...Array(9).fill({ section: 'math', skill: 'algebra', isCorrect: true, given: 'C' }),
    ...Array(1).fill({ section: 'math', skill: 'algebra', isCorrect: false, given: 'D' })
  ]
};
const richEval = analytics.detectStrengthsAndWeaknesses([richAttempt], { minQuestions: 5 });

const geomWeakness = richEval.weaknesses.find(w => w.key === 'math.geometry');
assert.ok(geomWeakness, 'math.geometry must be identified as weakness');
assert.equal(geomWeakness.total, 10);
assert.equal(geomWeakness.correct, 3);
assert.equal(geomWeakness.accuracy, 30);

const algStrength = richEval.strengths.find(s => s.key === 'math.algebra');
assert.ok(algStrength, 'math.algebra must be identified as strength');
assert.equal(algStrength.total, 10);
assert.equal(algStrength.correct, 9);
assert.equal(algStrength.accuracy, 90);

// =========================================================================
// 8. WRONG QUESTION REVIEW
// =========================================================================
console.log('8. Verifying wrong & unanswered question retrieval for review...');

const wrongQuestions = analytics.getWrongQuestions(TEST_STUDENT, { attemptId: sampleAttempt.id });
// In sampleAttempt review: 2 incorrect (q_m3, q_s3), 1 unanswered (q_m4)
assert.equal(wrongQuestions.length, 3, 'Should retrieve exactly 3 incorrect/unanswered questions');

const unansweredQ = wrongQuestions.find(q => q.id === 'q_m4');
assert.ok(unansweredQ);
assert.equal(unansweredQ.isUnanswered, true);
assert.equal(unansweredQ.explanation, 'y = lim x->inf');
assert.equal(unansweredQ.correctAnswer, 'A');

const incorrectQ = wrongQuestions.find(q => q.id === 'q_m3');
assert.ok(incorrectQ);
assert.equal(incorrectQ.isUnanswered, false);
assert.equal(incorrectQ.given, 'C');
assert.equal(incorrectQ.correctAnswer, 'D');

// =========================================================================
// 9. DASHBOARD HTML RENDERING
// =========================================================================
console.log('9. Verifying student dashboard HTML rendering...');

const html = analytics.renderDashboardHtml(TEST_STUDENT);
assert.ok(html.includes('BÁO CÁO NĂNG LỰC & TIẾN ĐỘ V-ACT'), 'Dashboard must have title');
assert.ok(html.includes('Đề đã luyện'), 'Must show tests completed');
assert.ok(html.includes('Tỷ Lệ Chính Xác Theo Từng Phần'), 'Must show section breakdown');
assert.ok(html.includes('ĐIỂM MẠNH'), 'Must show Strengths');
assert.ok(html.includes('CẦN CẢI THIỆN'), 'Must show Weaknesses');
assert.ok(html.includes('Lịch Sử Các Bài Thi Gần Nhất'), 'Must show History');
assert.ok(html.includes('Xem Lại Câu Sai'), 'Must have button to review wrong questions');

// Clean up test student attempts
analytics.clearAttempts(TEST_STUDENT);
assert.equal(analytics.getAttempts(TEST_STUDENT).length, 0);

console.log('--- ALL V-ACT PERFORMANCE ANALYTICS TESTS PASSED SUCCESSFULLY ---');
