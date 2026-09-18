/**
 * Comprehensive QA Test Suite for Phase 12: V-ACT Student Result, Answer Review, and Source Solutions
 * Verifies all 14 QA test cases defined in Section 37 of the specification.
 */
const assert = require('assert');
const path = require('path');
const KEDUVACT = require('../js/vact');

console.log('====================================================');
console.log('🧪 RUNNING K-EDU V-ACT PHASE 12 REVIEW QA TEST SUITE');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(err);
  }
}

// 1. Correct answer test
runTest('1. Correct answer grading & review item creation', () => {
  const q = {
    id: 'vact_test_01',
    section: 'math',
    question: 'Giải phương trình 2x + 4 = 10',
    options: ['A. x = 2', 'B. x = 3', 'C. x = 4', 'D. x = 5'],
    correctAnswer: 'B',
    explanation: 'Ta có 2x = 6 suy ra x = 3.',
    source: { sourceFile: 'VACT_2025_MOCK_001.pdf', questionNumber: 15 }
  };
  const item = KEDUVACT.review.buildReviewItem(q, 'B', 1);
  assert.strictEqual(item.status, 'correct');
  assert.strictEqual(item.isCorrect, true);
  assert.strictEqual(item.studentAnswer, 'B');
  assert.strictEqual(item.correctAnswer, 'B');
});

// 2. Incorrect answer test
runTest('2. Incorrect answer grading & review item creation', () => {
  const q = {
    id: 'vact_test_02',
    section: 'math',
    question: 'Giải phương trình 2x + 4 = 10',
    options: ['A. x = 2', 'B. x = 3', 'C. x = 4', 'D. x = 5'],
    correctAnswer: 'B',
    explanation: 'Ta có 2x = 6 suy ra x = 3.',
    source: { sourceFile: 'VACT_2025_MOCK_001.pdf', questionNumber: 15 }
  };
  const item = KEDUVACT.review.buildReviewItem(q, 'A', 2);
  assert.strictEqual(item.status, 'incorrect');
  assert.strictEqual(item.isCorrect, false);
  assert.strictEqual(item.studentAnswer, 'A');
  assert.strictEqual(item.correctAnswer, 'B');
});

// 3. Unanswered question test
runTest('3. Unanswered question handling', () => {
  const q = {
    id: 'vact_test_03',
    section: 'english',
    question: 'Choose the best word to complete the sentence.',
    options: ['A. fast', 'B. quick', 'C. rapid', 'D. swift'],
    correctAnswer: 'A',
    explanation: 'Fast fits the context best.',
    source: { sourceFile: 'VACT_ENG_001.pdf', questionNumber: 5 }
  };
  const itemEmpty = KEDUVACT.review.buildReviewItem(q, null, 3);
  assert.strictEqual(itemEmpty.status, 'unanswered');
  assert.strictEqual(itemEmpty.isCorrect, false);
  assert.strictEqual(itemEmpty.studentAnswer, null);
  assert.strictEqual(itemEmpty.given, '(chưa điền)');

  const itemString = KEDUVACT.review.buildReviewItem(q, '(chưa điền)', 3);
  assert.strictEqual(itemString.status, 'unanswered');
});

// 4. Question with real extracted explanation
runTest('4. Real source explanation preserved faithfully', () => {
  const q = {
    id: 'vact_test_04',
    section: 'vietnamese',
    question: 'Biện pháp tu từ nào được sử dụng trong câu thơ sau?',
    options: ['A. Nhân hóa', 'B. So sánh', 'C. Ẩn dụ', 'D. Hoán dụ'],
    correctAnswer: 'C',
    explanation: 'Hình ảnh ẩn dụ chuyển đổi cảm giác thể hiện sâu sắc tâm trạng tác giả.',
    source: { sourceFile: 'VACT_VIET_001.pdf', questionNumber: 8 }
  };
  const item = KEDUVACT.review.buildReviewItem(q, 'C', 4);
  assert.strictEqual(item.explanation, 'Hình ảnh ẩn dụ chuyển đổi cảm giác thể hiện sâu sắc tâm trạng tác giả.');

  const html = KEDUVACT.review.renderVactReviewHtml({
    totalCount: 1,
    correctCount: 1,
    incorrectCount: 0,
    unansweredCount: 0,
    accuracy: 100,
    duration: 60,
    review: [item]
  });
  assert(html.includes('Hình ảnh ẩn dụ chuyển đổi cảm giác'), 'HTML must render real explanation');
});

// 5. Question without explanation (answer-only)
runTest('5. Answer-only question renders transparent fallback without hallucination', () => {
  const q = {
    id: 'vact_test_05',
    section: 'logic_data',
    question: 'Từ 5 người A, B, C, D, E chọn ra 3 người...',
    options: ['A. 10', 'B. 20', 'C. 30', 'D. 40'],
    correctAnswer: 'A',
    explanation: '', // Source has only answer key
    source: { sourceFile: 'VACT_LOGIC_001.pdf', questionNumber: 12 }
  };
  const item = KEDUVACT.review.buildReviewItem(q, 'B', 5);
  assert.strictEqual(item.explanation, null);

  const html = KEDUVACT.review.renderVactReviewHtml({
    totalCount: 1,
    correctCount: 0,
    incorrectCount: 1,
    unansweredCount: 0,
    accuracy: 0,
    duration: 60,
    review: [item]
  });
  assert(html.includes('Tài liệu nguồn hiện không có lời giải chi tiết.'), 'Fallback message must be rendered');
  assert(!html.includes('undefined'), 'No undefined text in output');
});

// 6. Separate Question and Solution PDF provenance
runTest('6. Separate question PDF and solution PDF provenance tracking', () => {
  const q = {
    id: 'vact_test_06',
    section: 'scientific_reasoning',
    question: 'Quá trình quang hợp diễn ra chủ yếu ở bào quan nào?',
    options: ['A. Ti thể', 'B. Lục lạp', 'C. Riboxom', 'D. Nhân tế bào'],
    correctAnswer: 'B',
    explanation: 'Lục lạp chứa diệp lục hấp thu năng lượng ánh sáng mặt trời.',
    source: {
      questionSourceFile: 'TÀI LIỆU\\DGNL\\V-ACT\\UPDATE\\VACT_2025_MOCK_003_QUESTION.pdf',
      questionSourcePage: 12,
      solutionSourceFile: 'TÀI LIỆU\\DGNL\\V-ACT\\UPDATE\\VACT_2025_MOCK_003_SOLUTION.pdf',
      solutionSourcePage: 14,
      questionNumber: 37
    }
  };
  const item = KEDUVACT.review.buildReviewItem(q, 'B', 6);
  assert.strictEqual(item.friendlySource.questionNumber, 37);
  assert.strictEqual(item.friendlySource.sourcePage, 12);
  assert.strictEqual(item.friendlySource.solutionSourcePage, 14);

  // CRITICAL: Ensure local Windows path is NEVER exposed in displayText
  assert(!item.friendlySource.displayText.includes('C:\\'), 'Must not expose C:\\');
  assert(!item.friendlySource.displayText.includes('UPDATE'), 'Must not expose directory path');
  assert(item.friendlySource.displayText.includes('Câu gốc: 37'), 'Must include original question number');
  assert(item.friendlySource.displayText.includes('Trang nguồn: 12'), 'Must include page number');
});

// 7. Question with diagram / figure
runTest('7. Question with image/diagram figure preserved in review', () => {
  const q = {
    id: 'vact_test_07',
    section: 'math',
    question: 'Cho hình chóp S.ABCD có đáy là hình vuông (xem hình bên dưới).',
    diagram: 'https://k-edu.vn/assets/geo_pyramid_01.png',
    options: ['A. a^3/3', 'B. a^3/6', 'C. a^3/2', 'D. 2a^3'],
    correctAnswer: 'A',
    explanation: 'Thể tích hình chóp V = 1/3 * B * h.',
    source: { sourceFile: 'VACT_MATH_001.pdf', questionNumber: 22 }
  };
  const item = KEDUVACT.review.buildReviewItem(q, 'A', 7);
  const html = KEDUVACT.review.renderVactReviewHtml({
    totalCount: 1,
    correctCount: 1,
    incorrectCount: 0,
    unansweredCount: 0,
    accuracy: 100,
    duration: 50,
    review: [item]
  });
  assert(html.includes('Cho hình chóp S.ABCD'), 'Question content preserved');
});

// 8. Shared Stimulus Group (Reading Passage / Chart)
runTest('8. Shared stimulus group preserved with question in review', () => {
  const stimulusText = 'Đọc đoạn thông tin sau và trả lời các câu hỏi từ 1 đến 2: Năm 2024, kim ngạch xuất khẩu đạt...';
  const q = {
    id: 'vact_test_08',
    section: 'logic_data',
    stimulus: stimulusText,
    question: 'Tốc độ tăng trưởng kim ngạch xuất khẩu năm 2024 là bao nhiêu?',
    options: ['A. 5.2%', 'B. 8.4%', 'C. 12.1%', 'D. 15.6%'],
    correctAnswer: 'B',
    explanation: 'Áp dụng công thức tăng trưởng: (A - B)/B * 100% = 8.4%.',
    source: { sourceFile: 'VACT_MOCK_002.pdf', questionNumber: 61 }
  };
  const item = KEDUVACT.review.buildReviewItem(q, 'B', 8);
  assert.strictEqual(item.stimulus, stimulusText);

  const html = KEDUVACT.review.renderVactReviewHtml({
    totalCount: 1,
    correctCount: 1,
    incorrectCount: 0,
    unansweredCount: 0,
    accuracy: 100,
    duration: 80,
    review: [item]
  });
  assert(html.includes('Đọc đoạn thông tin sau'), 'Stimulus rendered in review');
});

// 9. Answer Option Shuffling Safety
runTest('9. Shuffled options comparison and letter matching safety', () => {
  const q = {
    id: 'vact_test_09',
    section: 'english',
    question: 'She _____ to school yesterday.',
    options: ['A. go', 'B. went', 'C. gone', 'D. going'],
    correctAnswer: 'B',
    explanation: 'Past simple of go is went.',
    source: { sourceFile: 'VACT_ENG_002.pdf', questionNumber: 1 }
  };
  // Student chose B
  const itemB = KEDUVACT.review.buildReviewItem(q, 'B', 9);
  assert.strictEqual(itemB.isCorrect, true);
  assert.strictEqual(itemB.status, 'correct');

  // Student chose D
  const itemD = KEDUVACT.review.buildReviewItem(q, 'D', 9);
  assert.strictEqual(itemD.isCorrect, false);
  assert.strictEqual(itemD.status, 'incorrect');
});

// 10. Grade V-ACT Attempt and Answer Freezing
runTest('10. Answer freezing (Object.freeze) and section breakdown calculation', () => {
  const rawAnswers = { 1: 'A', 2: 'B', 3: 'C' };
  const testQuestions = [
    { id: 'q1', section: 'vietnamese', correctAnswer: 'A', question: 'C1', options: ['A. 1', 'B. 2'] },
    { id: 'q2', section: 'math', correctAnswer: 'C', question: 'C2', options: ['A. 1', 'B. 2', 'C. 3'] },
    { id: 'q3', section: 'english', correctAnswer: 'C', question: 'C3', options: ['A. 1', 'B. 2', 'C. 3'] }
  ];

  const graded = KEDUVACT.review.gradeVactAttempt({
    id: 'test_attempt_01',
    title: 'Test Exam',
    questions: testQuestions
  }, rawAnswers, { duration: 120 });

  // Verify answer freezing
  assert(Object.isFrozen(graded.submittedAnswers), 'submittedAnswers must be frozen');
  assert.strictEqual(graded.correctCount, 2);
  assert.strictEqual(graded.incorrectCount, 1);
  assert.strictEqual(graded.unansweredCount, 0);
  assert.strictEqual(graded.totalCount, 3);
  assert.strictEqual(graded.accuracy, 67);

  // Verify section breakdown
  assert.strictEqual(graded.sectionBreakdown.vietnamese.correct, 1);
  assert.strictEqual(graded.sectionBreakdown.vietnamese.total, 1);
  assert.strictEqual(graded.sectionBreakdown.math.correct, 0);
  assert.strictEqual(graded.sectionBreakdown.math.wrong, 1);
  assert.strictEqual(graded.sectionBreakdown.english.correct, 1);
});

// 11. History Review Reproducibility
runTest('11. Review from history reproduces full result and explanation without re-grading errors', () => {
  const attemptRecord = {
    id: 'hist_attempt_100',
    title: 'Lịch sử V-ACT Test',
    mode: 'section_mini',
    generatedCount: 2,
    duration: 180,
    review: [
      {
        num: 1,
        id: 'hq1',
        section: 'math',
        question: 'Tích 3 * 7 bằng bao nhiêu?',
        options: ['A. 21', 'B. 24'],
        studentAnswer: 'A',
        given: 'A',
        correctAnswer: 'A',
        isCorrect: true,
        status: 'correct',
        explanation: '3 * 7 = 21',
        friendlySource: { displayText: 'Đề V-ACT 2025 — Đề số 01' },
        source: { questionNumber: 10 }
      },
      {
        num: 2,
        id: 'hq2',
        section: 'math',
        question: 'Tích 4 * 7 bằng bao nhiêu?',
        options: ['A. 21', 'B. 28'],
        studentAnswer: 'A',
        given: 'A',
        correctAnswer: 'B',
        isCorrect: false,
        status: 'incorrect',
        explanation: '4 * 7 = 28',
        friendlySource: { displayText: 'Đề V-ACT 2025 — Đề số 01' },
        source: { questionNumber: 11 }
      }
    ]
  };

  const html = KEDUVACT.review.renderVactReviewHtml(attemptRecord);
  assert(html.includes('Tích 3 * 7'), 'Historical Q1 rendered');
  assert(html.includes('Tích 4 * 7'), 'Historical Q2 rendered');
  assert(html.includes('4 * 7 = 28'), 'Historical solution rendered');
});

// 12. Timeout / Auto-submit test
runTest('12. Auto-submit on timeout behaves identically for grading and review', () => {
  const testQuestions = [
    { id: 'tq1', section: 'math', correctAnswer: 'D', question: 'Q1', options: ['A. 1', 'B. 2', 'C. 3', 'D. 4'] },
    { id: 'tq2', section: 'math', correctAnswer: 'A', question: 'Q2', options: ['A. 1', 'B. 2', 'C. 3', 'D. 4'] }
  ];
  // Student ran out of time, only answered Q1
  const timedOutAnswers = { 1: 'D' };
  const timedOutGraded = KEDUVACT.review.gradeVactAttempt({
    id: 'timeout_test',
    questions: testQuestions
  }, timedOutAnswers, { isAuto: true, duration: 150 });

  assert.strictEqual(timedOutGraded.correctCount, 1);
  assert.strictEqual(timedOutGraded.unansweredCount, 1);
  assert.strictEqual(timedOutGraded.totalCount, 2);
  assert.strictEqual(timedOutGraded.review[1].status, 'unanswered');
});

// 13. Shortage / Partial test
runTest('13. Shortage test summary reports generatedCount faithfully', () => {
  const testQuestions = [
    { id: 'sq1', section: 'english', correctAnswer: 'A', question: 'Q1', options: ['A. a', 'B. b'] },
    { id: 'sq2', section: 'english', correctAnswer: 'B', question: 'Q2', options: ['A. a', 'B. b'] }
  ];
  // Requested 5, generated 2
  const graded = KEDUVACT.review.gradeVactAttempt({
    id: 'shortage_test',
    requestedCount: 5,
    generatedCount: 2,
    questions: testQuestions
  }, { 1: 'A', 2: 'B' });

  assert.strictEqual(graded.totalCount, 2, 'Summary must use generatedCount 2, not pretend 5');
  assert.strictEqual(graded.correctCount, 2);
  assert.strictEqual(graded.accuracy, 100);
});

// 14. Answer metadata corruption protection (ANSWER_METADATA_ERROR)
runTest('14. Corrupted answer metadata flags ANSWER_METADATA_ERROR', () => {
  const corruptedQ = {
    id: 'corrupted_q_99',
    section: 'math',
    question: 'Câu hỏi có đáp án bị rỗng',
    options: ['A. 1', 'B. 2'],
    correctAnswer: null // Corrupted!
  };

  assert.throws(() => {
    KEDUVACT.review.buildReviewItem(corruptedQ, 'A', 1);
  }, /ANSWER_METADATA_ERROR/, 'Must throw ANSWER_METADATA_ERROR when answer metadata is missing');
});

console.log(`\n====================================================`);
console.log(`📊 RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
console.log(`====================================================`);

if (passedTests !== totalTests) {
  process.exit(1);
}
