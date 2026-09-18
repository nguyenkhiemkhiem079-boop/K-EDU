const assert = require('node:assert/strict');
const path = require('node:path');

// Load V-ACT module
const vact = require('../js/vact');

console.log('--- Starting V-ACT Core Architecture Verification ---');

// 1. All five sections exist
console.log('1. Verifying five core V-ACT sections...');
assert.ok(vact.VACT_SECTIONS, 'VACT_SECTIONS must exist');
const expectedSections = ['vietnamese', 'english', 'math', 'logic_data', 'scientific_reasoning'];
for (const sec of expectedSections) {
  assert.ok(Object.values(vact.VACT_SECTIONS).includes(sec), `Section "${sec}" must exist in VACT_SECTIONS`);
  assert.equal(vact.isValidSection(sec), true, `isValidSection("${sec}") must return true`);
}
assert.equal(vact.isValidSection('history'), false, 'Unregistered section must return false');
assert.equal(vact.isValidSection(''), false, 'Empty section must return false');
assert.equal(vact.isValidSection(null), false, 'Null section must return false');

// 2. Taxonomy combinations
console.log('2. Verifying taxonomy combinations...');
// Valid combinations
assert.equal(vact.isValidSectionSkill('vietnamese', 'reading_comprehension'), true);
assert.equal(vact.isValidSectionSkill('english', 'grammar'), true);
assert.equal(vact.isValidSectionSkill('math', 'algebra'), true);
assert.equal(vact.isValidSectionSkill('logic_data', 'chart_analysis'), true);
assert.equal(vact.isValidSectionSkill('scientific_reasoning', 'physics'), true);

// Invalid combinations
assert.equal(vact.isValidSectionSkill('math', 'reading_comprehension'), false, 'Math cannot have reading_comprehension');
assert.equal(vact.isValidSectionSkill('english', 'physics'), false, 'English cannot have physics');
assert.equal(vact.isValidSectionSkill('vietnamese', 'unknown_skill_xyz'), false, 'Unknown skill must fail');
assert.equal(vact.isValidSectionSkill('invalid_section', 'algebra'), false, 'Invalid section must fail');

// 3. Legacy difficulty mapping (NB, TH, VD, VDC)
console.log('3. Verifying legacy difficulty mapping...');
assert.equal(vact.mapLegacyDifficulty('NB'), 'easy');
assert.equal(vact.mapLegacyDifficulty('nb'), 'easy');
assert.equal(vact.mapLegacyDifficulty('Nhận biết'), 'easy');
assert.equal(vact.mapLegacyDifficulty('TH'), 'medium');
assert.equal(vact.mapLegacyDifficulty('thông hiểu'), 'medium');
assert.equal(vact.mapLegacyDifficulty('VD'), 'medium');
assert.equal(vact.mapLegacyDifficulty('VẬN DỤNG'), 'medium');
assert.equal(vact.mapLegacyDifficulty('VDC'), 'hard');
assert.equal(vact.mapLegacyDifficulty('Vận dụng cao'), 'hard');
assert.equal(vact.mapLegacyDifficulty('easy'), 'easy');
assert.equal(vact.mapLegacyDifficulty('medium'), 'medium');
assert.equal(vact.mapLegacyDifficulty('hard'), 'hard');
assert.equal(vact.mapLegacyDifficulty(null), 'medium', 'Conservative default for missing level');

// 4. Normalized question shape and validation
console.log('4. Verifying question normalization and validation...');
const rawLegacyQuestion = {
  id: 'doc_math_001',
  subject: 'toan',
  topic: 'algebra',
  level: 'TH',
  question: 'Giải phương trình \\( x^2 - 4 = 0 \\):',
  options: ['A. x = 1', 'B. x = ±2', 'C. x = 0', 'D. x = 4'],
  correctAnswer: 1, // index 1 -> B
  solution: 'Ta có x^2 = 4 <=> x = ±2',
  sourceFile: 'De-thi-thu-2025.pdf',
  sourcePage: 3
};

const normalized = vact.normalizeVACTQuestion(rawLegacyQuestion);
assert.equal(normalized.id, 'doc_math_001');
assert.equal(normalized.section, 'math');
assert.equal(normalized.skill, 'algebra');
assert.equal(normalized.difficulty, 'medium');
assert.equal(normalized.difficultyScore, null, 'Difficulty score must remain null, never invented');
assert.equal(normalized.questionType, 'single_choice');
assert.equal(normalized.correctAnswer, 'B');
assert.equal(normalized.explanation, 'Ta có x^2 = 4 <=> x = ±2');
assert.equal(normalized.source.file, 'De-thi-thu-2025.pdf');
assert.equal(normalized.source.page, 3);
assert.equal(normalized.quality.sourceVerified, false, 'Must not invent source verification');
assert.equal(normalized.quality.reviewed, false, 'Must not invent review status');

// Validate the normalized question
const validationResult = vact.validateVACTQuestion(normalized);
assert.equal(validationResult.valid, true, `Normalized question should be valid: ${validationResult.errors.join(', ')}`);
assert.equal(validationResult.errors.length, 0);

// 5. Invalid question is rejected
console.log('5. Verifying rejection of invalid questions...');
const invalidQuestion1 = {
  id: '',
  section: 'math',
  question: '',
  questionType: 'single_choice',
  options: ['Option 1'], // < 2 options
  correctAnswer: 'A',
  difficulty: 'super_hard' // invalid difficulty
};
const res1 = vact.validateVACTQuestion(invalidQuestion1);
assert.equal(res1.valid, false);
assert.ok(res1.errors.some(e => e.includes('id')));
assert.ok(res1.errors.some(e => e.includes('question')));
assert.ok(res1.errors.some(e => e.includes('at least 2 choices')));
assert.ok(res1.errors.some(e => e.includes('difficulty')));

// Invalid taxonomy combination in question
const invalidSkillQ = {
  id: 'q_test_skill',
  section: 'math',
  skill: 'grammar', // invalid for math
  question: 'Tính toán biểu thức sau:',
  questionType: 'single_choice',
  options: ['1', '2'],
  correctAnswer: 'A',
  difficulty: 'easy'
};
const resSkill = vact.validateVACTQuestion(invalidSkillQ);
assert.equal(resSkill.valid, false);
assert.ok(resSkill.errors.some(e => e.includes('taxonomy skill')), 'Taxonomy mismatch must be rejected');

// Invalid answer mapping
const invalidAnswerQ = {
  id: 'q_test_ans',
  section: 'english',
  skill: 'grammar',
  question: 'Choose the correct word:',
  questionType: 'single_choice',
  options: ['is', 'are'],
  correctAnswer: 'D', // D is out of bounds for 2 choices (A, B)
  difficulty: 'easy'
};
const resAns = vact.validateVACTQuestion(invalidAnswerQ);
assert.equal(resAns.valid, false);
assert.ok(resAns.errors.some(e => e.includes('exceeds option count') || e.includes('does not map')));

// 6. Signatures: Equivalent vs Different questions
console.log('6. Verifying question signature generation...');
const textA = '  Cho hàm số  \\( y = f(x) \\) liên tục trên \\( \\mathbb{R} \\)...  ';
const optsA = ['A. 1', 'B. 2', 'C. 3', 'D. 4'];

const textB = 'cho hàm số y = f(x) liên tục trên \\mathbb{R}...'; // lowercase, no LaTeX delimiters
const optsB = ['1', '2', '3', '4']; // no A., B. prefixes

const sigA = vact.computeVACTQuestionSignature(textA, optsA);
const sigB = vact.computeVACTQuestionSignature(textB, optsB);
assert.equal(sigA, sigB, 'Equivalent questions with formatting/LaTeX differences must have identical signatures');

// Different question must produce different signature
const textC = 'Cho hàm số y = g(x) khác biệt';
const sigC = vact.computeVACTQuestionSignature(textC, optsA);
assert.notEqual(sigA, sigC, 'Different question text must produce different signature');

// 7. Exam Profiles: Mini 100, Full 120, Time Limits
console.log('7. Verifying exam profile totals and durations...');
const fullProfile = vact.VACT_FULL_PROFILE;
assert.equal(fullProfile.id, 'vact_full');
assert.equal(fullProfile.totalQuestions, 120);
assert.equal(fullProfile.timeLimitMinutes, 150);

const fullSum = Object.values(fullProfile.sections).reduce((a, b) => a + b, 0);
assert.equal(fullSum, 120, 'Full V-ACT sections must sum to exactly 120');
assert.equal(fullProfile.sections.vietnamese, 30);
assert.equal(fullProfile.sections.english, 30);
assert.equal(fullProfile.sections.math, 30);
assert.equal(fullProfile.sections.logic_data, 12);
assert.equal(fullProfile.sections.scientific_reasoning, 18);

const miniProfile = vact.VACT_MINI_100_PROFILE;
assert.equal(miniProfile.id, 'vact_mini_100');
assert.equal(miniProfile.totalQuestions, 100);
const miniSum = Object.values(miniProfile.sections).reduce((a, b) => a + b, 0);
assert.equal(miniSum, 100, 'Mini V-ACT 100 sections must sum to exactly 100');
assert.equal(miniProfile.sections.vietnamese, 25);
assert.equal(miniProfile.sections.english, 25);
assert.equal(miniProfile.sections.math, 25);
assert.equal(miniProfile.sections.logic_data, 10);
assert.equal(miniProfile.sections.scientific_reasoning, 15);

// Test profile validator helper
const fullVal = vact.validateVACTProfile(fullProfile);
assert.equal(fullVal.valid, true);
const miniVal = vact.validateVACTProfile(miniProfile);
assert.equal(miniVal.valid, true);

// Test profile validator failure on broken math
const brokenProfile = {
  id: 'broken',
  totalQuestions: 100,
  sections: {
    vietnamese: 20,
    english: 20,
    math: 20,
    logic_data: 10,
    scientific_reasoning: 10 // sum = 80 !== 100
  }
};
const brokenVal = vact.validateVACTProfile(brokenProfile);
assert.equal(brokenVal.valid, false);
assert.ok(brokenVal.errors.some(e => e.includes('Section sum mismatch')));

// 8. Browser Environment Compatibility
console.log('8. Verifying browser global window.KEDUVACT loading...');
const vm = require('node:vm');
const fs = require('node:fs');
const windowObj = {};
const browserCtx = vm.createContext({ window: windowObj, globalThis: windowObj });
const scripts = [
  '../js/vact/taxonomy.js',
  '../js/vact/quality/signature.js',
  '../js/vact/schema.js',
  '../js/vact/quality/validator.js',
  '../js/vact/profiles.js'
];
for (const scriptPath of scripts) {
  const code = fs.readFileSync(path.resolve(__dirname, scriptPath), 'utf8');
  vm.runInContext(code, browserCtx);
}
assert.ok(browserCtx.window.KEDUVACT, 'window.KEDUVACT must exist');
assert.ok(browserCtx.window.KEDUVACT.VACT_SECTIONS, 'VACT_SECTIONS must exist on window.KEDUVACT');
assert.ok(browserCtx.window.KEDUVACT.VACT_FULL_PROFILE, 'VACT_FULL_PROFILE must exist on window.KEDUVACT');
assert.equal(typeof browserCtx.window.KEDUVACT.normalizeVACTQuestion, 'function');
assert.equal(typeof browserCtx.window.KEDUVACT.validateVACTQuestion, 'function');
assert.equal(typeof browserCtx.window.KEDUVACT.computeVACTQuestionSignature, 'function');

console.log('--- ALL V-ACT CORE ARCHITECTURE TESTS PASSED SUCCESSFULLY ---');

