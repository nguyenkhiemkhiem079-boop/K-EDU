const assert = require('node:assert/strict');
const path = require('node:path');
const vact = require('../js/vact');

console.log('--- Starting V-ACT Coverage & Deduplication Verification ---');

const coverage = vact.VACTCoverage;
const deduplicator = vact.deduplicateVACTQuestions;
const selectCanonical = vact.selectCanonicalQuestion;

assert.ok(coverage, 'VACTCoverage must exist');
assert.ok(typeof deduplicator === 'function', 'deduplicateVACTQuestions must be a function');
assert.ok(typeof selectCanonical === 'function', 'selectCanonicalQuestion must be a function');

// 1. Deduplication: duplicate questions collapse to one unique record
console.log('1. Verifying deduplication logic on duplicate questions...');
const baseQuestion = {
  id: 'q_orig_01',
  section: 'math',
  skill: 'algebra',
  difficulty: 'medium',
  questionType: 'single_choice',
  question: 'Tính giá trị của biểu thức \\( x + 2 = 5 \\):',
  options: ['A. 1', 'B. 2', 'C. 3', 'D. 4'],
  correctAnswer: 'C',
  explanation: 'x = 5 - 2 = 3',
  source: { file: 'exam1.pdf', page: 2 },
  quality: { sourceVerified: false, answerVerified: false, reviewed: false }
};

const duplicateQuestion = {
  id: 'q_duplicate_02',
  section: 'math',
  skill: 'algebra',
  difficulty: 'medium',
  questionType: 'single_choice',
  question: '  tính giá trị của biểu thức x + 2 = 5:  ', // same text, different spacing/latex
  options: ['1', '2', '3', '4'],
  correctAnswer: 'C',
  explanation: 'x = 3',
  source: { file: null, page: null },
  quality: { sourceVerified: false, answerVerified: false, reviewed: false }
};

const dedupPair = deduplicator([baseQuestion, duplicateQuestion]);
assert.equal(dedupPair.totalInput, 2);
assert.equal(dedupPair.totalUnique, 1, 'Duplicate questions must collapse to 1 unique record');
assert.equal(dedupPair.totalDuplicatesRemoved, 1);
assert.equal(dedupPair.duplicateGroups.length, 1);
assert.equal(dedupPair.duplicateGroups[0].canonicalId, 'q_orig_01', 'q_orig_01 must be chosen as canonical due to richer provenance');
assert.deepEqual(dedupPair.duplicateGroups[0].duplicateIds, ['q_duplicate_02']);

// 2. Different questions remain separate
console.log('2. Verifying distinct questions remain separate...');
const differentQuestion = {
  id: 'q_diff_03',
  section: 'math',
  skill: 'algebra',
  difficulty: 'medium',
  questionType: 'single_choice',
  question: 'Tính giá trị của biểu thức 2x + 1 = 7:',
  options: ['A. 1', 'B. 2', 'C. 3', 'D. 4'],
  correctAnswer: 'C',
  explanation: '2x = 6 => x = 3'
};

const dedupTriple = deduplicator([baseQuestion, duplicateQuestion, differentQuestion]);
assert.equal(dedupTriple.totalInput, 3);
assert.equal(dedupTriple.totalUnique, 2, 'Two distinct questions must yield 2 unique records');
assert.equal(dedupTriple.totalDuplicatesRemoved, 1);

// 3. Canonical Selection Rule
console.log('3. Verifying canonical selection rule hierarchy...');
const verifiedCandidate = {
  id: 'cand_verified',
  section: 'math',
  skill: 'algebra',
  question: 'Đề bài thử nghiệm',
  options: ['A', 'B'],
  correctAnswer: 'A',
  quality: { answerVerified: true, sourceVerified: true, reviewed: true },
  explanation: 'Giải chi tiết'
};
const unverifiedCandidate = {
  id: 'cand_unverified',
  section: 'math',
  skill: 'algebra',
  question: 'Đề bài thử nghiệm',
  options: ['A', 'B'],
  correctAnswer: 'A',
  quality: { answerVerified: false, sourceVerified: false, reviewed: false },
  explanation: 'Giải ngắn'
};
const chosen = selectCanonical([unverifiedCandidate, verifiedCandidate]);
assert.equal(chosen.id, 'cand_verified', 'Verified candidate must be preferred over unverified');

// 4. Coverage totals equal actual unique usable records
console.log('4. Verifying coverage summary totals from real bank data...');
const summary = coverage.getSummary({ refresh: true });
assert.equal(summary.totalRaw, 14034);
assert.equal(summary.totalMapped, 13596);
assert.equal(summary.duplicatesCount, 6);
assert.equal(summary.totalUniqueUsable, 13590);
assert.equal(summary.invalidCount, 53);
assert.equal(summary.unsupportedCount, 385);

// 5. Section totals add correctly
console.log('5. Verifying section totals summation...');
const secSum = Object.values(summary.sections).reduce((acc, s) => acc + s.total, 0);
assert.equal(secSum, summary.totalUniqueUsable, 'Sum of section totals must equal totalUniqueUsable');

assert.equal(summary.sections.vietnamese.total, 7);
assert.equal(summary.sections.english.total, 0);
assert.equal(summary.sections.math.total, 13114);
assert.equal(summary.sections.logic_data.total, 401);
assert.equal(summary.sections.scientific_reasoning.total, 68);

// 6. Scientific skill totals work
console.log('6. Verifying scientific skill totals breakdown...');
const sciSkills = summary.sections.scientific_reasoning.skills;
assert.equal(sciSkills.physics, 20);
assert.equal(sciSkills.chemistry, 24);
assert.equal(sciSkills.biology, 24);
const sciSkillSum = Object.values(sciSkills).reduce((a, b) => a + b, 0);
assert.equal(sciSkillSum, summary.sections.scientific_reasoning.total, 'Sum of scientific skills must equal total scientific questions');

// 7. Mini 100 Readiness check
console.log('7. Verifying Mini 100 readiness check...');
const miniReadiness = coverage.getProfileReadiness('vact_mini_100');
assert.equal(miniReadiness.profileId, 'vact_mini_100');
assert.equal(miniReadiness.ready, false, 'Mini 100 cannot be ready due to missing English and Vietnamese questions');
assert.equal(miniReadiness.totalRequired, 100);
assert.equal(miniReadiness.sections.english.missing, 25);
assert.equal(miniReadiness.sections.vietnamese.missing, 18);
assert.equal(miniReadiness.sections.math.missing, 0);
assert.equal(miniReadiness.sections.logic_data.missing, 0);
assert.equal(miniReadiness.sections.scientific_reasoning.missing, 0);
assert.ok(miniReadiness.shortages.length >= 2);

// 8. Full Profile Readiness check
console.log('8. Verifying Full V-ACT 120 readiness check...');
const fullReadiness = coverage.getProfileReadiness('vact_full');
assert.equal(fullReadiness.profileId, 'vact_full');
assert.equal(fullReadiness.ready, false, 'Full V-ACT 120 cannot be ready');
assert.equal(fullReadiness.totalRequired, 120);
assert.equal(fullReadiness.sections.english.missing, 30);
assert.equal(fullReadiness.sections.vietnamese.missing, 23);
assert.equal(fullReadiness.sections.math.missing, 0);
assert.equal(fullReadiness.sections.logic_data.missing, 0);
assert.equal(fullReadiness.sections.scientific_reasoning.missing, 0);

// 9. Capacity lookup works
console.log('9. Verifying capacity lookup...');
const capMath = coverage.getCapacity({ section: 'math' });
assert.equal(capMath.available, 13114);

const capPhysics = coverage.getCapacity({ section: 'scientific_reasoning', skill: 'physics' });
assert.equal(capPhysics.available, 20);

const capEnglish = coverage.getCapacity({ section: 'english' });
assert.equal(capEnglish.available, 0);

// 10. Shortage math: missing = max(0, requested - available)
console.log('10. Verifying shortage math and reasons...');
const shortageTest1 = coverage.checkShortage({ section: 'english', requested: 30 });
assert.equal(shortageTest1.missing, 30);
assert.equal(shortageTest1.fulfilled, false);
assert.equal(shortageTest1.reason, 'POOL_SHORTAGE');

const shortageTest2 = coverage.checkShortage({ section: 'math', requested: 30 });
assert.equal(shortageTest2.missing, 0);
assert.equal(shortageTest2.fulfilled, true);
assert.equal(shortageTest2.reason, null);

const shortageTest3 = coverage.checkShortage({ section: 'vietnamese', requested: 10 });
assert.equal(shortageTest3.missing, 3); // available is 7, requested 10 -> missing 3
assert.equal(shortageTest3.fulfilled, false);

console.log('--- ALL V-ACT COVERAGE & DEDUPLICATION TESTS PASSED SUCCESSFULLY ---');
