const assert = require('node:assert/strict');
const path = require('node:path');

// Load V-ACT module and document question bank
const vact = require('../js/vact');
const docBank = require('../js/documentQuestionBank');

console.log('--- Starting V-ACT Legacy Question Bank Adapter Verification ---');

const internalBank = vact.VACTInternalBank;
assert.ok(internalBank, 'VACTInternalBank must exist');
assert.ok(typeof internalBank.query === 'function', 'internalBank.query must be a function');
assert.ok(typeof internalBank.getDiagnostics === 'function', 'internalBank.getDiagnostics must be a function');
assert.ok(typeof internalBank.getCoverage === 'function', 'internalBank.getCoverage must be a function');

// 1. Diagnostics & Total Raw Ingestion
console.log('1. Verifying diagnostics on real repository questions...');
const diag = internalBank.getDiagnostics();
console.log(`Total raw inspected: ${diag.inspected}`);
console.log(`Successfully mapped: ${diag.mapped}`);
console.log(`Invalid / malformed: ${diag.invalid}`);
console.log(`Unsupported (e.g. middle school): ${diag.unsupported}`);

assert.equal(diag.inspected, 14034, 'Must inspect all 14,034 repository questions');
assert.ok(diag.mapped > 13000, `Expected > 13,000 mapped questions, got ${diag.mapped}`);
assert.ok(diag.unsupported > 300, `Expected middle school math excluded (>300), got ${diag.unsupported}`);

// 2. Section Availability & Mapped Examples
console.log('2. Verifying mapped question availability across sections...');

// Logic & Data
const logicQuestions = internalBank.query({ section: 'logic_data' });
assert.ok(logicQuestions.length >= 400, `Expected >= 400 logic_data questions, got ${logicQuestions.length}`);
const sampleLogic = logicQuestions[0];
assert.equal(sampleLogic.section, 'logic_data');
assert.ok(['logical_reasoning', 'data_interpretation'].includes(sampleLogic.skill));
assert.ok(sampleLogic.id.startsWith('legacy:'));
assert.ok(sampleLogic.options.length >= 2);
assert.ok(['A', 'B', 'C', 'D'].includes(sampleLogic.correctAnswer));
console.log(`- logic_data verified: ${logicQuestions.length} questions available`);

// Vietnamese
const vietQuestions = internalBank.query({ section: 'vietnamese' });
assert.ok(vietQuestions.length >= 7, `Expected >= 7 vietnamese questions, got ${vietQuestions.length}`);
const sampleViet = vietQuestions[0];
assert.equal(sampleViet.section, 'vietnamese');
assert.equal(sampleViet.skill, 'language_usage');
assert.ok(sampleViet.id.startsWith('legacy:'));
assert.ok(sampleViet.question.length > 10);
console.log(`- vietnamese verified: ${vietQuestions.length} questions available`);

// Scientific Reasoning: Physics, Chemistry, Biology
const scienceQuestions = internalBank.query({ section: 'scientific_reasoning' });
assert.ok(scienceQuestions.length >= 60, `Expected >= 60 science questions, got ${scienceQuestions.length}`);

const physicsQuestions = internalBank.query({ section: 'scientific_reasoning', skill: 'physics' });
assert.ok(physicsQuestions.length >= 18, `Expected >= 18 physics questions, got ${physicsQuestions.length}`);
assert.equal(physicsQuestions[0].skill, 'physics');

const chemQuestions = internalBank.query({ section: 'scientific_reasoning', skill: 'chemistry' });
assert.ok(chemQuestions.length >= 18, `Expected >= 18 chemistry questions, got ${chemQuestions.length}`);
assert.equal(chemQuestions[0].skill, 'chemistry');

const bioQuestions = internalBank.query({ section: 'scientific_reasoning', skill: 'biology' });
assert.ok(bioQuestions.length >= 18, `Expected >= 18 biology questions, got ${bioQuestions.length}`);
assert.equal(bioQuestions[0].skill, 'biology');
console.log(`- scientific_reasoning verified: ${scienceQuestions.length} total (Physics: ${physicsQuestions.length}, Chemistry: ${chemQuestions.length}, Biology: ${bioQuestions.length})`);

// Mathematics
const mathQuestions = internalBank.query({ section: 'math' });
assert.ok(mathQuestions.length > 12000, `Expected > 12,000 math questions, got ${mathQuestions.length}`);
const sampleMath = mathQuestions[0];
assert.equal(sampleMath.section, 'math');
assert.ok(['algebra', 'functions', 'geometry', 'probability_statistics'].includes(sampleMath.skill));
console.log(`- math verified: ${mathQuestions.length} high-school questions available`);

// 3. English Zero-Coverage Safety Check
console.log('3. Verifying English zero-coverage handling...');
const englishQuestions = internalBank.query({ section: 'english' });
assert.deepEqual(englishQuestions, [], 'English questions must genuinely be 0 and return empty array without error');
const cov = internalBank.getCoverage();
assert.equal(cov.sections.english.total, 0, 'Coverage for English must be 0');

// 4. Source Preservation & Traceability
console.log('4. Verifying source provenance and original ID traceability...');
const rawSample = docBank.questions.find(q => q.id === 'DGNL_2025_D1_01');
assert.ok(rawSample, 'Sample DGNL_2025_D1_01 must exist in raw bank');
const adaptedSample = vact.adaptLegacyQuestion(rawSample);
assert.equal(adaptedSample.success, true);
assert.equal(adaptedSample.question.id, 'legacy:DGNL_2025_D1_01');
assert.equal(adaptedSample.question.source.originalId, 'DGNL_2025_D1_01');
assert.equal(adaptedSample.question.source.originalGrade, 'DGNL');
assert.equal(adaptedSample.question.source.originalTopic, 'dgnl_logic');
assert.equal(adaptedSample.question.source.provider, 'kedu_legacy');

// 5. No Invented Quality Flags
console.log('5. Verifying quality flags are NOT invented...');
assert.equal(adaptedSample.question.quality.sourceVerified, false);
assert.equal(adaptedSample.question.quality.answerVerified, false);
assert.equal(adaptedSample.question.quality.reviewed, false);
assert.equal(adaptedSample.question.difficultyScore, null);

// 6. No Raw Question Mutation
console.log('6. Verifying adapter does NOT mutate raw questions...');
const rawBefore = JSON.stringify(rawSample);
vact.adaptLegacyQuestion(rawSample);
const rawAfter = JSON.stringify(rawSample);
assert.equal(rawBefore, rawAfter, 'Raw question object must remain strictly unmutated');

// 7. Invalid Raw Records Rejection
console.log('7. Verifying rejection of malformed raw records...');
const malformedEmptyOpt = {
  id: 'bad_01',
  grade: '12',
  topic: 'dai_so',
  subject: 'toan',
  question: 'Phương trình x = 0 có nghiệm:',
  options: ['A. 0', ''], // Empty option at index 1
  correctAnswer: 'A'
};
const resEmptyOpt = vact.adaptLegacyQuestion(malformedEmptyOpt);
assert.equal(resEmptyOpt.success, false, 'Question with empty option must be rejected');

const malformedNoAnswer = {
  id: 'bad_02',
  grade: '12',
  topic: 'dai_so',
  subject: 'toan',
  question: 'Phương trình x = 0 có nghiệm:',
  options: ['0', '1', '2', '3']
  // No correctAnswer
};
const resNoAns = vact.adaptLegacyQuestion(malformedNoAnswer);
assert.equal(resNoAns.success, false, 'Question with missing answer must be rejected');

// 8. Query Filtering Capabilities
console.log('8. Verifying multi-criteria query filtering...');
const qSecOnly = internalBank.query({ section: 'logic_data' });
assert.ok(qSecOnly.length > 0);
assert.ok(qSecOnly.every(q => q.section === 'logic_data'));

const qSecSkill = internalBank.query({ section: 'logic_data', skill: 'data_interpretation' });
assert.ok(qSecSkill.length > 0);
assert.ok(qSecSkill.every(q => q.section === 'logic_data' && q.skill === 'data_interpretation'));

const qSecDiff = internalBank.query({ section: 'logic_data', difficulty: 'easy' });
assert.ok(qSecDiff.every(q => q.section === 'logic_data' && q.difficulty === 'easy'));

const qSecSkillDiff = internalBank.query({ section: 'logic_data', skill: 'logical_reasoning', difficulty: 'medium' });
assert.ok(qSecSkillDiff.every(q => q.section === 'logic_data' && q.skill === 'logical_reasoning' && q.difficulty === 'medium'));

const qLimit = internalBank.query({ section: 'math', limit: 15 });
assert.equal(qLimit.length, 15, 'Query limit must be respected');

console.log('--- ALL V-ACT LEGACY ADAPTER TESTS PASSED SUCCESSFULLY ---');
