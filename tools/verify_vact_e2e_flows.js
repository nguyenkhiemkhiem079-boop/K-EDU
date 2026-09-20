const assert = require('node:assert/strict');
const path = require('node:path');
const vact = require('../js/vact');

console.log('--- Starting V-ACT End-to-End Student Practice Flows Verification ---');

const {
  VACTSectionTestGenerator,
  VACTExamGenerator,
  performanceAnalytics,
  adaptive,
  sources
} = vact;

const E2E_STUDENT = {
  studentName: 'Tran E2E Tester',
  studentClass: '12-HCM',
  studentUid: 'usr_e2e_flow'
};

vact.VACTInternalBank.setMode('legacy');

performanceAnalytics.clearAttempts(E2E_STUDENT);

(async function runE2E() {
  // =========================================================================
  // FLOW A: Student -> V-ACT -> Math -> 30 -> Submit -> Analytics
  // =========================================================================
  console.log('FLOW A: Simulating Student -> V-ACT -> Math -> 30 -> Submit -> Analytics...');

  const math30 = VACTSectionTestGenerator.generate({
    section: 'math',
    count: 30,
    difficulty: 'balanced'
  });
  assert.equal(math30.questions.length, 30);
  assert.equal(math30.generatedCount, 30);
  assert.equal(math30.missingCount, 0);

  // Submit test with 24/30 correct
  const attemptA = performanceAnalytics.recordAttempt({
    ...E2E_STUDENT,
    testId: math30.testId,
    mode: 'section_mini',
    section: 'math',
    requestedCount: 30,
    generatedCount: 30,
    correct: 24,
    incorrect: 6,
    unanswered: 0,
    duration: 1800,
    review: math30.questions.map((q, idx) => ({
      num: q.num,
      id: q.id,
      section: q.section,
      skill: q.skill,
      isCorrect: idx < 24,
      given: idx < 24 ? q.correctAnswer : 'Z',
      correctAnswer: q.correctAnswer
    }))
  });

  assert.equal(attemptA.accuracy, 80);
  const mathStats = performanceAnalytics.computeSectionAnalytics(attemptA);
  assert.equal(mathStats.math.accuracy, 80);
  console.log('  -> FLOW A SUCCESS: Math 30 practice recorded & analyzed (80% accuracy)');

  // =========================================================================
  // FLOW B: Student -> Scientific -> Physics -> Custom Count (20) -> Submit
  // =========================================================================
  console.log('FLOW B: Simulating Student -> Scientific -> Physics -> Custom Count (20) -> Submit...');

  const phy20 = VACTSectionTestGenerator.generate({
    section: 'scientific_reasoning',
    skill: 'physics',
    count: 20,
    difficulty: 'balanced'
  });
  assert.equal(phy20.questions.length, 20);

  // Submit with 8/20 correct (40% < 60% weakness)
  const attemptB = performanceAnalytics.recordAttempt({
    ...E2E_STUDENT,
    testId: phy20.testId,
    mode: 'section_mini',
    section: 'scientific_reasoning',
    skill: 'physics',
    requestedCount: 20,
    generatedCount: 20,
    correct: 8,
    incorrect: 12,
    unanswered: 0,
    duration: 1200,
    review: phy20.questions.map((q, idx) => ({
      num: q.num,
      id: q.id,
      section: q.section,
      skill: q.skill,
      isCorrect: idx < 8,
      given: idx < 8 ? q.correctAnswer : 'B',
      correctAnswer: q.correctAnswer
    }))
  });

  assert.equal(attemptB.accuracy, 40);
  const sciStats = performanceAnalytics.computeSectionAnalytics(attemptB);
  assert.equal(sciStats.scientific_reasoning.accuracy, 40);
  console.log('  -> FLOW B SUCCESS: Physics targeted practice recorded & analyzed (40% accuracy)');

  // Composite production profiles must run against the strict source-backed
  // bank. Legacy-mode section fixtures above are intentionally isolated.
  vact.VACTInternalBank.setMode('source_backed');
  vact.VACTCoverage.clearCoverageCache();

  // =========================================================================
  // FLOW C: Student -> Mini 100 -> Submit -> Section Analytics
  // =========================================================================
  console.log('FLOW C: Simulating Student -> Mini 100 -> Submit -> Section Analytics...');

  const mini100 = VACTExamGenerator.generateMini100();
  assert.ok(mini100);
  assert.equal(mini100.profileId, 'vact_mini_100');

  // Submit Mini 100 with 45 correct out of 57 generated
  const attemptC = performanceAnalytics.recordAttempt({
    ...E2E_STUDENT,
    testId: mini100.id,
    mode: 'mini_100',
    profile: 'vact_mini_100',
    requestedCount: 100,
    generatedCount: mini100.generatedTotal,
    correct: 45,
    incorrect: 10,
    unanswered: 2,
    duration: 5400,
    review: mini100.questions.map((q, idx) => ({
      num: q.num,
      id: q.id,
      section: q.section,
      skill: q.skill,
      isCorrect: idx < 45,
      given: idx < 45 ? q.correctAnswer : 'A',
      correctAnswer: q.correctAnswer
    }))
  });

  const miniSectionBreakdown = performanceAnalytics.computeSectionAnalytics(attemptC);
  assert.ok(miniSectionBreakdown.math);
  assert.ok(miniSectionBreakdown.logic_data);
  assert.ok(miniSectionBreakdown.scientific_reasoning);
  assert.ok(miniSectionBreakdown.vietnamese);
  assert.ok(miniSectionBreakdown.english, 'English must be present in a complete source-backed Mini 100 profile');
  console.log('  -> FLOW C SUCCESS: Mini 100 test recorded with section breakdown');

  // =========================================================================
  // FLOW D: Student -> Full V-ACT 120 -> Timer -> Submit
  // =========================================================================
  console.log('FLOW D: Simulating Student -> Full V-ACT 120 -> Timer -> Submit...');

  const full120 = VACTExamGenerator.generateFull120();
  assert.equal(full120.timeLimitMinutes, 150);

  const quizD = VACTExamGenerator.formatExamAsQuiz(full120);
  assert.equal(quizD.timeLimit, 150);
  assert.equal(quizD.subjectLabel, 'Full V-ACT 120');

  // Simulating submission after 150 minutes (9000s)
  const attemptD = performanceAnalytics.recordAttempt({
    ...E2E_STUDENT,
    testId: full120.id,
    mode: 'full_120',
    profile: 'vact_full',
    requestedCount: 120,
    generatedCount: full120.generatedTotal,
    correct: 55,
    incorrect: 10,
    unanswered: 2,
    duration: 9000,
    review: full120.questions.map((q, idx) => ({
      num: q.num,
      id: q.id,
      section: q.section,
      skill: q.skill,
      isCorrect: idx < 55,
      given: idx < 55 ? q.correctAnswer : 'C',
      correctAnswer: q.correctAnswer
    }))
  });

  assert.equal(attemptD.duration, 9000);
  console.log('  -> FLOW D SUCCESS: Full V-ACT 120 (150m) simulation completed and persisted');

  // =========================================================================
  // FLOW E: Student -> Analytics -> Luyện Điểm Yếu -> New Adaptive Test
  // =========================================================================
  console.log('FLOW E: Simulating Student -> Analytics -> Luyện Điểm Yếu -> New Adaptive Test...');

  // From Flow B, Physics had 8/20 = 40% accuracy with 20 questions (>= 5 questions evidence!)
  // Therefore Physics is a verified weakness!
  const weaknessPractice = adaptive.generateWeaknessTest({
    studentId: E2E_STUDENT,
    count: 10,
    minimumQuestions: 5,
    weaknessThreshold: 60
  });

  assert.equal(weaknessPractice.success, true);
  assert.equal(weaknessPractice.hasWeaknesses, true);
  assert.ok(weaknessPractice.targetedWeaknesses.some(w => w.name.includes('Vật lý') || w.key.includes('physics')));
  assert.equal(weaknessPractice.questions.length, 10);

  const weaknessQuiz = adaptive.formatWeaknessExamAsQuiz(weaknessPractice);
  assert.ok(weaknessQuiz.id);
  assert.equal(weaknessQuiz.mode, 'weakness_practice');
  assert.equal(weaknessQuiz.isVactWeakness, true);
  console.log('  -> FLOW E SUCCESS: Luyện điểm yếu successfully generated targeting verified weak skill');

  // =========================================================================
  // FLOW F: Remote Source Unavailable -> Internal Bank Still Works
  // =========================================================================
  console.log('FLOW F: Simulating Remote Source Unavailable -> Internal Bank Still Works...');

  const smFailover = new sources.VACTSourceManager();
  const mockFailing = new sources.VACTRemoteJsonSource({
    id: 'broken_remote_feed',
    url: 'https://api.k-edu.vn/unreachable-server.json',
    fetchFn: async () => {
      throw new Error('Network Timeout (504 Gateway Timeout)');
    }
  });

  // Temporarily add whitelist prefix for the mock URL
  sources.config.addAuthorizedUrlPrefix('https://api.k-edu.vn/unreachable-server.json');
  smFailover.registerSource(mockFailing);

  // Query 10 Math questions:
  const failoverRes = await smFailover.query({ section: 'math', limit: 10 });
  assert.equal(failoverRes.count, 10, 'Internal bank must successfully deliver 10 math questions');
  assert.equal(failoverRes.sourceBreakdown.internal, 10);
  sources.config.removeAuthorizedUrlPrefix('https://api.k-edu.vn/unreachable-server.json');

  console.log('  -> FLOW F SUCCESS: Remote failure isolated; internal bank continued seamlessly');

  // Cleanup
  performanceAnalytics.clearAttempts(E2E_STUDENT);
  vact.VACTInternalBank.setMode('source_backed');

  console.log('--- ALL V-ACT END-TO-END PRACTICE FLOWS VERIFIED SUCCESSFULLY ---');
})();
