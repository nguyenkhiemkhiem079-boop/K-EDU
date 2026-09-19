/**
 * K-EDU V-ACT Phase 3.5 Verification Suite
 * Tests all required capabilities:
 * 1. Full 120 exam completeness
 * 2. 119-question incomplete exam rejection
 * 3. Question exact duplicate
 * 4. Near duplicate diagnostics & centralized thresholds
 * 5. Stimulus-aware signature
 * 6. Exam mirror duplicate detection
 * 7. Canonical selection & alternate source provenance
 * 8. Coverage target (2,400 model)
 * 9. Gap analysis & import priority
 * 10. Legacy source tagging (legacy_pre_2025 supplemental only)
 * 11. Rights blocking (review_required / blocked sources non-ingestable)
 */
const assert = require('assert');
const vact = require('../js/vact');

console.log('--- Starting V-ACT Phase 3.5 Architecture Verification ---');

// Helper to generate synthetic test questions for an exam set
function createMockQuestion(id, section, skill, questionNum, text = '') {
  return {
    id: `mock_q_${id}`,
    section,
    skill,
    originalQuestionNumber: questionNum,
    question: text || `Câu hỏi trắc nghiệm ${section} số ${questionNum}: Nội dung câu hỏi kiểm tra kiến thức ${skill}`,
    options: [
      `Lựa chọn A cho câu ${questionNum}`,
      `Lựa chọn B cho câu ${questionNum}`,
      `Lựa chọn C cho câu ${questionNum}`,
      `Lựa chọn D cho câu ${questionNum}`
    ],
    correctAnswer: 'A',
    difficulty: 'medium'
  };
}

function create120QuestionSet() {
  const questions = [];
  let num = 1;

  // 30 Vietnamese
  for (let i = 0; i < 30; i++) {
    questions.push(createMockQuestion(`viet_${i + 1}`, 'vietnamese', 'reading_comprehension', num++));
  }
  // 30 English
  for (let i = 0; i < 30; i++) {
    questions.push(createMockQuestion(`eng_${i + 1}`, 'english', 'grammar', num++));
  }
  // 30 Math
  for (let i = 0; i < 30; i++) {
    questions.push(createMockQuestion(`math_${i + 1}`, 'math', 'algebra', num++));
  }
  // 12 Logic / Data
  for (let i = 0; i < 12; i++) {
    questions.push(createMockQuestion(`logic_${i + 1}`, 'logic_data', 'logical_reasoning', num++));
  }
  // 18 Scientific Reasoning
  const sciSkills = ['physics', 'chemistry', 'biology', 'history', 'geography', 'economics_law'];
  for (let i = 0; i < 18; i++) {
    const sk = sciSkills[i % sciSkills.length];
    questions.push(createMockQuestion(`sci_${i + 1}`, 'scientific_reasoning', sk, num++));
  }

  return questions;
}

// ============================================================================
// 1. Full 120 Exam Completeness
// ============================================================================
console.log('1. Verifying full 120 exam completeness...');
const full120Questions = create120QuestionSet();
assert.equal(full120Questions.length, 120, 'Should have exactly 120 mock questions');

const completenessCheck = vact.examBank.constructor.prototype.registerExam
  ? vact.validateExamCompleteness({ structureVersion: '2025+', questions: full120Questions })
  : vact.bank.validateExamCompleteness({ structureVersion: '2025+', questions: full120Questions });

assert.equal(completenessCheck.isComplete, true, '120-item set matching 30/30/30/12/18 must be complete');
assert.equal(completenessCheck.status, 'complete', 'Status must be complete');
assert.equal(completenessCheck.missingCount, 0, 'Missing count must be 0');
assert.equal(completenessCheck.sectionCounts.vietnamese, 30);
assert.equal(completenessCheck.sectionCounts.english, 30);
assert.equal(completenessCheck.sectionCounts.math, 30);
assert.equal(completenessCheck.sectionCounts.logic_data, 12);
assert.equal(completenessCheck.sectionCounts.scientific_reasoning, 18);

// ============================================================================
// 2. 119-Question Incomplete Exam Rejection
// ============================================================================
console.log('2. Verifying 119-question incomplete exam handling...');
// Remove 1 English question -> 119 questions total
const incomplete119Questions = full120Questions.filter((q, idx) => idx !== 35);
assert.equal(incomplete119Questions.length, 119);

const incompleteCheck = vact.validateExamCompleteness({
  structureVersion: '2025+',
  questions: incomplete119Questions
});

assert.equal(incompleteCheck.isComplete, false, '119-item set must NOT be marked complete');
assert.equal(incompleteCheck.status, 'incomplete', 'Status must be incomplete');
assert.equal(incompleteCheck.missingCount, 1, 'Missing count must be 1');
assert.equal(incompleteCheck.deficits.english, 1, 'English deficit must be 1');
assert.equal(incompleteCheck.reason, 'EXACT_119_DEFICIT');

// ============================================================================
// 3. Question Exact Duplicate (Level 1)
// ============================================================================
console.log('3. Verifying Level-1 exact normalized signature deduplication...');
const qA = {
  id: 'q_dup_1',
  section: 'math',
  question: '  Cho hàm số  y = f(x) liên tục trên R.  <p>Tính tích phân</p>  ',
  options: ['A.  \\( 1 \\)', 'B. 2', 'C. 3', 'D. 4'],
  correctAnswer: 'A'
};

const qB = {
  id: 'q_dup_2',
  section: 'math',
  question: 'Cho hàm số y = f(x) liên tục trên R. Tính tích phân',
  options: ['1', '2', '3', '4'],
  correctAnswer: 'A'
};

const sigA = vact.computeVACTQuestionSignature(qA);
const sigB = vact.computeVACTQuestionSignature(qB);
assert.equal(sigA, sigB, 'Level-1 normalized signatures must match despite HTML/LaTeX/whitespace differences');

const dedupResult = vact.deduplicateVACTQuestions([qA, qB]);
assert.equal(dedupResult.totalInput, 2);
assert.equal(dedupResult.totalUnique, 1, 'Exact duplicate must result in exactly 1 unique question');
assert.equal(dedupResult.totalDuplicatesRemoved, 1);

// ============================================================================
// 4. Near Duplicate Detection & Centralized Thresholds (Level 2)
// ============================================================================
console.log('4. Verifying Level-2 near-duplicate diagnostics & thresholds...');
const qNear1 = {
  id: 'q_near_1',
  section: 'math',
  question: 'Tìm tất cả các giá trị của tham số m để phương trình x^2 - 2mx + m + 2 = 0 có hai nghiệm phân biệt.',
  options: ['m > 2', 'm < -1', 'm > 2 hoặc m < -1', '-1 < m < 2'],
  correctAnswer: 'C'
};

const qNear2 = {
  id: 'q_near_2',
  section: 'math',
  question: 'Tìm các giá trị của m để phương trình x^2 - 2mx + m + 2 = 0 có đúng hai nghiệm phân biệt.',
  options: ['m > 2', 'm < -1', 'm > 2 hoặc m < -1', '-1 < m < 2'],
  correctAnswer: 'C'
};

const qDistinct = {
  id: 'q_distinct_1',
  section: 'math',
  question: 'Trong không gian Oxyz, cho mặt phẳng (P): 2x - y + 2z - 4 = 0. Tính khoảng cách từ điểm A(1, 2, 3) đến (P).',
  options: ['2', '4/3', '3', '5/3'],
  correctAnswer: 'A'
};

const simNear = vact.computeQuestionSimilarity(qNear1, qNear2);
assert.ok(simNear >= 0.85, `Near-duplicate similarity should be >= 0.85 (got ${simNear})`);

const statusNear = vact.classifyDuplicateStatus(simNear);
assert.equal(statusNear, vact.DUPLICATE_STATUS.PROBABLE_DUPLICATE, 'Should classify as PROBABLE_DUPLICATE');

const simDistinct = vact.computeQuestionSimilarity(qNear1, qDistinct);
assert.ok(simDistinct < 0.70, `Distinct questions similarity should be < 0.70 (got ${simDistinct})`);
assert.equal(vact.classifyDuplicateStatus(simDistinct), vact.DUPLICATE_STATUS.UNIQUE);

// Confirm that near duplicates are NOT silently merged into 1 unique item
const nearDedupResult = vact.deduplicateVACTQuestions([qNear1, qNear2], { detectNearDuplicates: true });
assert.equal(nearDedupResult.totalUnique, 2, 'Uncertain near duplicates must NOT be silently merged');
assert.equal(nearDedupResult.probableDuplicatesCount, 1, 'Near duplicate must be flagged in diagnostics');

// ============================================================================
// 5. Stimulus-Aware Signature
// ============================================================================
console.log('5. Verifying stimulus-aware signature...');
const qStemOnly = 'Theo đoạn trích, nguyên nhân chính dẫn đến sự kiện là gì?';
const qOpts = ['Nguyên nhân A', 'Nguyên nhân B', 'Nguyên nhân C', 'Nguyên nhân D'];

const qWithStimulus1 = {
  id: 'q_stim_1',
  section: 'vietnamese',
  stimulus: 'Đoạn văn số 1: Trích từ tác phẩm văn học thế kỉ XX mô tả quang cảnh làng quê...',
  question: qStemOnly,
  options: qOpts,
  correctAnswer: 'A'
};

const qWithStimulus2 = {
  id: 'q_stim_2',
  section: 'vietnamese',
  stimulus: 'Đoạn văn số 2: Báo cáo khoa học xã hội về biến đổi kinh tế thời hiện đại...',
  question: qStemOnly,
  options: qOpts,
  correctAnswer: 'A'
};

const sigStim1 = vact.computeVACTQuestionSignature(qWithStimulus1);
const sigStim2 = vact.computeVACTQuestionSignature(qWithStimulus2);

assert.notEqual(sigStim1, sigStim2, 'Questions with identical stem but different stimulus must have different signatures');
assert.ok(sigStim1.includes('đoạn văn số 1'), 'Signature must incorporate stimulus text');

// ============================================================================
// 6. Exam Mirror Duplicate Detection
// ============================================================================
console.log('6. Verifying exam mirror duplicate detection...');
vact.examBank.clear();

// Register Canonical Exam 1
const exam1Questions = create120QuestionSet();
const registeredExam1 = vact.examBank.registerExam({
  id: 'exam_2025_canonical',
  sourceId: 'vact_official_sample_2025',
  year: 2025,
  structureVersion: '2025+',
  title: 'Đề thi mẫu chính thức VNU-HCM 2025',
  questions: exam1Questions
});

assert.equal(registeredExam1.isCanonical, true, 'First exam must be canonical');
assert.equal(registeredExam1.status, 'complete', 'Must be complete');

// Register Exam 2 which mirrors Exam 1 with 100% same questions under a different website ID
const exam2Questions = exam1Questions.map((q, i) => ({
  ...q,
  id: `mirror_web_q_${i + 1}`
}));

const registeredExam2 = vact.examBank.registerExam({
  id: 'exam_2025_mirror_website_x',
  sourceId: 'commercial_ref_mock_2025',
  year: 2025,
  structureVersion: '2025+',
  title: 'Đề thi copy trên mạng X',
  questions: exam2Questions
});

assert.equal(registeredExam2.isCanonical, false, 'Mirrored exam must NOT be marked canonical');
assert.equal(registeredExam2.canonicalExamId, 'exam_2025_canonical', 'Must point to canonical exam');

const canonicalList = vact.examBank.getCanonicalExams();
assert.equal(canonicalList.length, 1, 'Exam bank must only report 1 unique canonical exam');

const exam1After = vact.examBank.getExam('exam_2025_canonical');
assert.ok(Array.isArray(exam1After.mirrors), 'Canonical exam must record mirrors');
assert.equal(exam1After.mirrors.length, 1, 'Must have 1 recorded mirror');
assert.equal(exam1After.mirrors[0].mirrorExamId, 'exam_2025_mirror_website_x');

// ============================================================================
// 7. Canonical Selection & Alternate Source Provenance
// ============================================================================
console.log('7. Verifying deterministic canonical question selection & provenance...');
const candUnverified = {
  id: 'cand_a',
  sourceId: 'unverified_web',
  originalId: 'orig_101',
  question: 'Định luật Ôm cho toàn mạch biểu diễn bởi hệ thức nào?',
  options: ['I = E / (R + r)', 'I = U / R', 'I = q / t', 'I = E * r'],
  correctAnswer: 'A',
  quality: { sourceVerified: false, answerVerified: false, reviewed: false }
};

const candVerified = {
  id: 'cand_b',
  sourceId: 'official_sample',
  originalId: 'orig_vnu_45',
  examSetId: 'exam_2025_canonical',
  originalQuestionNumber: 45,
  question: 'Định luật Ôm cho toàn mạch biểu diễn bởi hệ thức nào?',
  options: ['I = E / (R + r)', 'I = U / R', 'I = q / t', 'I = E * r'],
  correctAnswer: 'A',
  explanation: 'Theo định luật Ôm cho toàn mạch: Cường độ dòng điện chạy trong mạch điện kín tỉ lệ thuận với suất điện động...',
  source: { file: 'vnu_2025_de_mau.pdf', page: 12, title: 'Đề thi mẫu 2025' },
  quality: { sourceVerified: true, answerVerified: true, reviewed: true }
};

const canonicalSelected = vact.selectCanonicalQuestion([candUnverified, candVerified]);
assert.equal(canonicalSelected.id, 'cand_b', 'Higher quality verified candidate must be selected as canonical');
assert.ok(Array.isArray(canonicalSelected.alternateSources), 'Must preserve alternate sources');
assert.equal(canonicalSelected.alternateSources.length, 1, 'Must record candidate A as alternate source');
assert.equal(canonicalSelected.alternateSources[0].sourceId, 'unverified_web');
assert.equal(canonicalSelected.alternateSources[0].originalId, 'orig_101');

// ============================================================================
// 8. Coverage Target (2,400 Model)
// ============================================================================
console.log('8. Verifying 2,400 bank coverage target model...');
const targets = vact.VACT_BANK_TARGETS;
assert.equal(targets.vietnamese, 600);
assert.equal(targets.english, 600);
assert.equal(targets.math, 600);
assert.equal(targets.logic_data, 240);
assert.equal(targets.scientific_reasoning, 360);
assert.equal(targets.TOTAL, 2400);

const sciTargets = vact.VACT_SCIENTIFIC_TARGETS;
const expectedSciSkills = ['physics', 'chemistry', 'biology', 'history', 'geography', 'economics_law', 'technology', 'society', 'interdisciplinary'];
let sciSum = 0;
for (const sk of expectedSciSkills) {
  assert.equal(sciTargets[sk], 40, `Target for ${sk} should be 40`);
  sciSum += sciTargets[sk];
}
assert.equal(sciSum, 360, 'Scientific reasoning targets must sum to 360');

// ============================================================================
// 9. Gap Analysis & Import Priority
// ============================================================================
console.log('9. Verifying gap analysis & import priority scoring...');
const gaps = vact.VACTCoverage.getGaps();
assert.ok(Array.isArray(gaps) && gaps.length > 0, 'Gaps array must not be empty');

// Check that top deficits correspond to real shortages (e.g. English with 421 available vs 600 target)
const engGap = gaps.find(g => g.section === 'english' && !g.skill);
assert.ok(engGap, 'English gap must be present');
assert.equal(engGap.target, 600);
assert.equal(engGap.available, 421);
assert.equal(engGap.missing, 179);
assert.equal(engGap.deficitPct, 29.8);

// Verify Import Priorities
const priorities = vact.VACTCoverage.getImportPriorities();
assert.ok(priorities.topSectionDeficits.some(d => d.section === 'english'), 'English must be in top section deficits');
assert.ok(priorities.topSectionDeficits.some(d => d.section === 'vietnamese'), 'Vietnamese must be in top section deficits');

// Test candidate source ranking
const candidateSources = [
  { sourceId: 'math_only_pack', section: 'math', provider: 'Math Specialist' },
  { sourceId: 'english_pack', section: 'english', provider: 'English Specialist' }
];
const rankedCandidates = vact.VACTCoverage.getImportPriorities(candidateSources, {
  bankTargets: { vietnamese: 600, english: 600, math: 400, logic_data: 240, scientific_reasoning: 360 }
});
assert.equal(rankedCandidates[0].sourceId, 'english_pack', 'English source must be ranked higher than Math source');
assert.equal(rankedCandidates[1].sourceId, 'math_only_pack');
assert.equal(rankedCandidates[1].recommendation, 'DEPRIORITIZED');

// ============================================================================
// 10. Legacy Source Tagging
// ============================================================================
console.log('10. Verifying legacy source tagging (legacy_pre_2025)...');
const legacyQ = vact.normalizeVACTQuestion({
  id: 'legacy_q_01',
  section: 'math',
  year: 2023,
  question: 'Đạo hàm của hàm số y = e^x là:',
  options: ['e^x', 'x * e^(x-1)', 'ln(x)', 'e'],
  correctAnswer: 'A'
});

assert.equal(legacyQ.structureVersion, 'legacy_pre_2025', 'Pre-2025 question must be tagged legacy_pre_2025');

const legacyExamCheck = vact.validateExamCompleteness({
  structureVersion: 'legacy_pre_2025',
  questions: create120QuestionSet()
});
assert.equal(legacyExamCheck.isComplete, false, 'Pre-2025 exam cannot be marked as complete full-test');
assert.equal(legacyExamCheck.reason, 'LEGACY_PRE_2025_SUPPLEMENTAL_ONLY');

// ============================================================================
// 11. Rights Blocking
// ============================================================================
console.log('11. Verifying rights blocking policy...');
const reg = vact.sourceRegistry;

// Register approved source
reg.registerSource({
  sourceId: 'licensed_partner_source',
  provider: 'Educational Partner',
  exam: 'V-ACT',
  year: 2025,
  sourceType: vact.SOURCE_TYPES.AUTHORIZED_SUBJECT_PACK,
  structureVersion: '2025+',
  enabled: true,
  priority: 2,
  rights: {
    status: vact.RIGHTS_STATUS.LICENSED,
    licenseNote: 'Licensed for platform test delivery'
  }
});
assert.equal(reg.isSourceIngestable('licensed_partner_source'), true, 'Licensed source must be ingestable');

// Register review_required source
reg.registerSource({
  sourceId: 'unverified_online_pdf',
  provider: 'Random Forum',
  exam: 'V-ACT',
  year: 2025,
  sourceType: vact.SOURCE_TYPES.AUTHORIZED_FULL_MOCK,
  structureVersion: '2025+',
  enabled: true,
  priority: 50,
  rights: {
    status: vact.RIGHTS_STATUS.REVIEW_REQUIRED,
    licenseNote: 'Usage rights unclear - downloaded from forum'
  }
});
assert.equal(reg.isSourceIngestable('unverified_online_pdf'), false, 'review_required source must be blocked from ingestion');

// Register blocked source
reg.registerSource({
  sourceId: 'commercial_copyrighted_pack',
  provider: 'Commercial Book Publisher',
  exam: 'V-ACT',
  year: 2025,
  sourceType: vact.SOURCE_TYPES.AUTHORIZED_FULL_MOCK,
  structureVersion: '2025+',
  enabled: false,
  priority: 100,
  rights: {
    status: vact.RIGHTS_STATUS.BLOCKED,
    licenseNote: 'Copyrighted commercial material - strictly prohibited'
  }
});
assert.equal(reg.isSourceIngestable('commercial_copyrighted_pack'), false, 'Blocked source must be non-ingestable');

const ingestableList = reg.getIngestableSources();
assert.ok(ingestableList.some(s => s.sourceId === 'licensed_partner_source'));
assert.ok(!ingestableList.some(s => s.sourceId === 'unverified_online_pdf'), 'Must not include review_required in ingestable list');
assert.ok(!ingestableList.some(s => s.sourceId === 'commercial_copyrighted_pack'), 'Must not include blocked in ingestable list');

console.log('--- ALL 11 V-ACT PHASE 3.5 TESTS PASSED SUCCESSFULLY ---');
