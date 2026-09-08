const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================');
console.log('🧪 QA VERIFICATION SUITE: STORAGE RETENTION & AUTO-COMPACTION');
console.log('================================================================\n');

// Mock browser LocalStorage & Environment
const mockLocalStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; },
  clear() { this.store = {}; },
  get length() { return Object.keys(this.store).length; },
  key(i) { return Object.keys(this.store)[i] || null; }
};

global.window = global;
global.localStorage = mockLocalStorage;
global.document = {
  getElementById(id) {
    return {
      id,
      innerHTML: '',
      classList: {
        add: () => {},
        remove: () => {},
        toggle: () => {},
        contains: () => false
      },
      disabled: false,
      value: '',
      appendChild: () => {}
    };
  },
  querySelectorAll() { return []; },
  querySelector() { return null; },
  addEventListener() {},
  removeEventListener() {},
  createElement(tag) {
    return {
      tagName: tag,
      classList: { add: () => {}, remove: () => {} },
      appendChild: () => {},
      setAttribute: () => {},
      remove: () => {}
    };
  },
  body: {
    classList: { add: () => {}, remove: () => {} },
    appendChild: () => {}
  }
};
global.showToast = (msg, type) => {
  // console.log(`[Toast ${type}]: ${msg}`);
};

// Load storage.js
const storageCode = fs.readFileSync('js/storage.js', 'utf8');
eval(storageCode); // StorageEngine is defined in storage.js

// Load studentAnalytics.js
const analyticsCode = fs.readFileSync('js/studentAnalytics.js', 'utf8');
eval(analyticsCode);

// Helper constants
const DAY_MS = 24 * 60 * 60 * 1000;
const now = Date.now();

(async () => {
  // -------------------------------------------------------------
  // TEST 1: ĐỀ CHƯA AI LÀM KHÔNG BỊ ĐỤNG DÙ TẠO LÂU (30 NGÀY)
  // -------------------------------------------------------------
  console.log('👉 [QA 1] ĐỀ CHƯA AI LÀM KHÔNG BỊ ĐỤNG DÙ TẠO LÂU (30 NGÀY):');
  mockLocalStorage.clear();

  const quizUnused = {
    id: 'QUIZ_OLD_UNUSED',
    title: 'Đề chưa ai làm (30 ngày trước)',
    createdAt: new Date(now - 30 * DAY_MS).toISOString(),
    totalQuestions: 10
  };
  await StorageEngine.saveQuiz(quizUnused);

  const lastSubUnused = await StorageEngine.getLastSubmissionTime(quizUnused.id);
  assert.strictEqual(lastSubUnused, null, 'Quiz chưa có bài nộp phải trả về null');

  const sweepStats1 = await StorageEngine.runRetentionSweep();
  assert.strictEqual(sweepStats1.quizzesRemoved, 0, 'Không được xóa quiz chưa có bài nộp');
  
  const checkQuiz1 = await StorageEngine.get('quiz:' + quizUnused.id);
  assert(checkQuiz1 !== null, 'Quiz cũ chưa làm phải còn nguyên vẹn');
  console.log('  ✅ Quiz tạo 30 ngày trước nhưng chưa ai làm vẫn được giữ nguyên 100%.\n');

  // -------------------------------------------------------------
  // TEST 2: ĐỀ ĐÃ LÀM > 7 NGÀY BỊ NÉN + XÓA ĐÚNG
  // -------------------------------------------------------------
  console.log('👉 [QA 2] ĐỀ ĐÃ LÀM > 7 NGÀY BỊ NÉN + XÓA ĐÚNG:');
  const quizOldUsed = {
    id: 'QUIZ_OLD_USED',
    title: 'Đề thi kết thúc 8 ngày trước',
    createdAt: new Date(now - 15 * DAY_MS).toISOString(),
    totalQuestions: 2
  };
  await StorageEngine.saveQuiz(quizOldUsed);

  const heavyReview = [
    {
      num: 1,
      type: 'mcq',
      level: 'TH',
      category: 'Đại số',
      subject: 'Toán',
      maxScore: 1,
      earnedScore: 1,
      given: 'A',
      correctAnswer: 'A',
      isCorrect: true,
      // Heavy fields:
      content: 'Nội dung câu hỏi cực dài kèm ảnh và đồ thị...'.repeat(50),
      options: ['Phương án A siêu dài', 'Phương án B', 'Phương án C', 'Phương án D'],
      diagram: '<svg>Đồ thị nặng</svg>',
      explanation: 'Lời giải chi tiết từng bước rất dài...',
      pitfall: 'Bẫy đề học sinh hay mắc...',
      keyFormula: '\\int f(x) dx',
      source: 'Đề thi THPT Quốc Gia Chuyên Hà Tĩnh',
      passage: 'Đoạn văn đọc hiểu...'
    },
    {
      num: 2,
      type: 'mcq',
      level: 'VD',
      category: 'Hình học',
      subject: 'Toán',
      maxScore: 1,
      earnedScore: 0,
      given: 'B',
      correctAnswer: 'C',
      isCorrect: false,
      content: 'Câu 2 rất dài...'.repeat(50),
      options: ['A', 'B', 'C', 'D'],
      explanation: 'Giải thích câu 2...'
    }
  ];

  const resultOld = {
    id: 'result:QUIZ_OLD_USED:10_SURI_' + (now - 8 * DAY_MS),
    quizId: 'QUIZ_OLD_USED',
    name: 'SURI',
    className: '10',
    totalScore: 5,
    correct: 1,
    total: 2,
    submittedAt: new Date(now - 8 * DAY_MS).toISOString(),
    review: JSON.parse(JSON.stringify(heavyReview))
  };
  await StorageEngine.set(resultOld.id, resultOld);

  const oldResultRaw = await StorageEngine.get(resultOld.id);
  const oldSize = JSON.stringify(oldResultRaw).length;

  const sweepStats2 = await StorageEngine.runRetentionSweep();
  console.log(`  - Thống kê Sweep: ${sweepStats2.quizzesRemoved} đề xóa, ${sweepStats2.resultsCompacted} kết quả nén, ${sweepStats2.bytesSaved} bytes tiết kiệm.`);
  assert.strictEqual(sweepStats2.quizzesRemoved, 1, 'Phải xóa 1 đề đã kết thúc 8 ngày trước');
  assert.strictEqual(sweepStats2.resultsCompacted, 1, 'Phải nén 1 kết quả');

  // Đề gốc đã bị xóa:
  const checkDeletedQuiz = await StorageEngine.get('quiz:' + quizOldUsed.id);
  assert.strictEqual(checkDeletedQuiz, null, 'Đề gốc quiz:QUIZ_OLD_USED phải bị xóa khỏi storage');

  // Kết quả vẫn còn nhưng đã nén:
  const compactedResult = await StorageEngine.get(resultOld.id);
  assert(compactedResult !== null, 'Bản ghi kết quả phải còn nguyên');
  assert.strictEqual(compactedResult.compacted, true, 'compacted phải là true');
  assert(compactedResult.compactedAt, 'compactedAt phải có timestamp');

  // Kiểm tra cắt bỏ các trường nặng:
  const item1 = compactedResult.review[0];
  assert.strictEqual(item1.content, undefined, 'content phải bị xóa');
  assert.strictEqual(item1.options, undefined, 'options phải bị xóa');
  assert.strictEqual(item1.explanation, undefined, 'explanation phải bị xóa');
  assert.strictEqual(item1.diagram, undefined, 'diagram phải bị xóa');
  assert.strictEqual(item1.pitfall, undefined, 'pitfall phải bị xóa');
  assert.strictEqual(item1.keyFormula, undefined, 'keyFormula phải bị xóa');
  assert.strictEqual(item1.source, undefined, 'source phải bị xóa');
  assert.strictEqual(item1.passage, undefined, 'passage phải bị xóa');

  // Kiểm tra giữ lại các trường nhẹ cốt lõi:
  assert.strictEqual(item1.num, 1);
  assert.strictEqual(item1.type, 'mcq');
  assert.strictEqual(item1.level, 'TH');
  assert.strictEqual(item1.category, 'Đại số');
  assert.strictEqual(item1.subject, 'Toán');
  assert.strictEqual(item1.isCorrect, true);

  const newSize = JSON.stringify(compactedResult).length;
  console.log(`  - Dung lượng trước nén: ${oldSize} bytes -> Sau nén: ${newSize} bytes (Giảm ${Math.round((1 - newSize/oldSize)*100)}%)`);
  assert(newSize < oldSize * 0.4, 'Dung lượng phải giảm ít nhất 60% sau khi nén');
  console.log('  ✅ Đề cũ > 7 ngày được nén và dọn dẹp chính xác tuyệt đối.\n');

  // -------------------------------------------------------------
  // TEST 3: ĐỀ VỪA NỘP BÀI (1 NGÀY) KHÔNG BỊ ĐỤNG
  // -------------------------------------------------------------
  console.log('👉 [QA 3] ĐỀ VỪA NỘP BÀI (1 NGÀY TRƯỚC) KHÔNG BỊ ĐỤNG:');
  const quizRecent = {
    id: 'QUIZ_RECENT',
    title: 'Đề vừa thi hôm qua',
    createdAt: new Date(now - 2 * DAY_MS).toISOString()
  };
  await StorageEngine.saveQuiz(quizRecent);

  const resultRecent = {
    id: 'result:QUIZ_RECENT:10_SURI_' + (now - 1 * DAY_MS),
    quizId: 'QUIZ_RECENT',
    name: 'SURI',
    className: '10',
    submittedAt: new Date(now - 1 * DAY_MS).toISOString(),
    review: [{ num: 1, content: 'Đề đang trong hạn 7 ngày', isCorrect: true }]
  };
  await StorageEngine.set(resultRecent.id, resultRecent);

  const sweepStats3 = await StorageEngine.runRetentionSweep();
  assert.strictEqual(sweepStats3.quizzesRemoved, 0, 'Đề mới 1 ngày không được xóa');
  assert.strictEqual(sweepStats3.resultsCompacted, 0, 'Kết quả mới 1 ngày không được nén');

  const checkRecentQuiz = await StorageEngine.get('quiz:' + quizRecent.id);
  assert(checkRecentQuiz !== null, 'Quiz vừa nộp 1 ngày phải còn nguyên');
  console.log('  ✅ Đề thi vừa nộp 1 ngày trước không bị ảnh hưởng.\n');

  // -------------------------------------------------------------
  // TEST 4: RESET MỐC 7 NGÀY KHI CÓ HỌC SINH NỘP BÀI MỚI
  // -------------------------------------------------------------
  console.log('👉 [QA 4] RESET MỐC 7 NGÀY KHI CÓ HỌC SINH NỘP BÀI MỚI:');
  const quizMultiSubmit = {
    id: 'QUIZ_MULTI',
    title: 'Đề thi có bài nộp cũ và bài nộp mới'
  };
  await StorageEngine.saveQuiz(quizMultiSubmit);

  // Bài nộp 1: 8 ngày trước (nếu chỉ có bài này thì quiz sẽ bị xóa)
  const resOld = {
    id: 'result:QUIZ_MULTI:10_HOCSINH1_' + (now - 8 * DAY_MS),
    quizId: 'QUIZ_MULTI',
    submittedAt: new Date(now - 8 * DAY_MS).toISOString(),
    review: [{ num: 1, content: 'Bài 1', isCorrect: true }]
  };
  await StorageEngine.set(resOld.id, resOld);

  // Bài nộp 2: Vừa nộp hôm nay (reset mốc 7 ngày)
  const resNew = {
    id: 'result:QUIZ_MULTI:10_HOCSINH2_' + now,
    quizId: 'QUIZ_MULTI',
    submittedAt: new Date(now).toISOString(),
    review: [{ num: 1, content: 'Bài 2 mới nộp', isCorrect: false }]
  };
  await StorageEngine.set(resNew.id, resNew);

  const lastSubMulti = await StorageEngine.getLastSubmissionTime('QUIZ_MULTI');
  console.log(`  - Lần nộp bài mới nhất: ${new Date(lastSubMulti).toISOString()}`);
  assert(now - lastSubMulti < 5000, 'lastSubmissionTime phải lấy theo lần nộp mới nhất');

  const sweepStats4 = await StorageEngine.runRetentionSweep();
  assert.strictEqual(sweepStats4.quizzesRemoved, 0, 'Không được xóa quiz vì đã có bài nộp mới reset timer');
  
  const checkMultiQuiz = await StorageEngine.get('quiz:QUIZ_MULTI');
  assert(checkMultiQuiz !== null, 'Quiz phải được bảo toàn khi có bài nộp mới');
  console.log('  ✅ Mốc 7 ngày được reset chuẩn xác theo lần nộp bài cuối cùng.\n');

  // -------------------------------------------------------------
  // TEST 5: STUDENT ANALYTICS VẪN ĐÚNG SAU KHI NÉN
  // -------------------------------------------------------------
  console.log('👉 [QA 5] STUDENT ANALYTICS HOẠT ĐỘNG CHUẨN XÁC SAU KHI NÉN:');
  // Chạy getStudentTopicStats với mock StorageEngine
  const originalGetAll = StorageEngine.getAllResults;
  StorageEngine.getAllResults = async () => [compactedResult];

  const studentStats = await StudentAnalytics.getStudentTopicStats('SURI', '10');
  console.log('  - Kết quả StudentAnalytics trên dữ liệu đã nén:');
  console.table(studentStats);

  assert.strictEqual(studentStats.length, 2, 'Phải phân tích được 2 chủ đề từ kết quả đã nén');
  const daisoStat = studentStats.find(s => s.category === 'Đại số');
  const hinhhocStat = studentStats.find(s => s.category === 'Hình học');

  assert(daisoStat && daisoStat.correct === 1 && daisoStat.totalQuestions === 1);
  assert(hinhhocStat && hinhhocStat.correct === 0 && hinhhocStat.totalQuestions === 1);

  StorageEngine.getAllResults = originalGetAll;
  console.log('  ✅ StudentAnalytics phân tích chính xác 100% các trường category, subject, isCorrect từ bản ghi đã nén.\n');

  // -------------------------------------------------------------
  // TEST 6: GIAO DIỆN XEM LẠI BẢN GHI ĐÃ NÉN KHÔNG BỊ VỠ
  // -------------------------------------------------------------
  console.log('👉 [QA 6] GIAO DIỆN XEM LẠI BẢN GHI ĐÃ NÉN:');
  // Nạp app.js để kiểm tra renderExamReviewList
  const appJsCode = fs.readFileSync('js/app.js', 'utf8');
  eval(appJsCode);

  let reviewContainerHtml = '';
  document.getElementById = (id) => {
    if (id === 'studentExamReviewCard') return { classList: { remove: () => {}, add: () => {} }, appendChild: () => {} };
    if (id === 'examReviewContainer') return {
      set innerHTML(val) { reviewContainerHtml = val; },
      get innerHTML() { return reviewContainerHtml; },
      appendChild: () => {}
    };
    return { classList: { remove: () => {}, add: () => {} }, innerHTML: '', appendChild: () => {}, disabled: false, value: '' };
  };

  renderExamReviewList(compactedResult.review, false, compactedResult);

  assert(reviewContainerHtml.includes('Đề thi này đã được dọn dẹp sau 7 ngày để tiết kiệm dung lượng'),
    'Giao diện phải hiển thị thông báo đã dọn dẹp đề');
  assert(reviewContainerHtml.includes('Thang điểm:'), 'Giao diện phải giữ nguyên điểm số');
  assert(reviewContainerHtml.includes('Số câu đúng:'), 'Giao diện phải giữ nguyên số câu đúng');
  console.log('  - HTML thông báo nén hiển thị:');
  console.log('   ', reviewContainerHtml.trim().split('\n')[2].trim());
  console.log('  ✅ Giao diện xem lại hiển thị banner thông báo thân thiện, không bị lỗi render.\n');

  // -------------------------------------------------------------
  // TEST 7: RATE LIMIT 24H & MANUAL BUTTON
  // -------------------------------------------------------------
  console.log('👉 [QA 7] GIỚI HẠN TẦN SUẤT 24H & NÚT THỦ CÔNG:');
  // Lần 1: Chạy auto sweep
  mockLocalStorage.removeItem('khiemedu_last_sweep_at');
  let sweepRunCount = 0;
  const origSweep = StorageEngine.runRetentionSweep;
  StorageEngine.runRetentionSweep = async () => {
    sweepRunCount++;
    return { quizzesRemoved: 0, resultsCompacted: 0, bytesSaved: 0 };
  };

  await checkAndRunAutoRetentionSweep();
  assert.strictEqual(sweepRunCount, 1, 'Lần 1 chưa có flag phải chạy');
  assert(mockLocalStorage.getItem('khiemedu_last_sweep_at') !== null, 'Phải lưu timestamp khi chạy');

  // Lần 2 ngay sau đó: phải bị rate-limit chặn
  await checkAndRunAutoRetentionSweep();
  assert.strictEqual(sweepRunCount, 1, 'Lần 2 trong vòng 24h phải bị chặn');
  console.log('  ✅ Auto-sweep tự động chặn không chạy lặp lại trong vòng 24h.');

  // Nút thủ công: bỏ qua rate limit và chạy ngay
  await triggerManualRetentionSweep();
  assert.strictEqual(sweepRunCount, 2, 'Nút thủ công phải chạy ngay lập tức');
  console.log('  ✅ Nút thủ công "🧹 Dọn Dẹp Đề Cũ" kích hoạt thành công.');

  StorageEngine.runRetentionSweep = origSweep;
  console.log('  => [QA 7 PASSED]: Tần suất tự động và nút thủ công hoạt động chuẩn xác.\n');

  console.log('================================================================');
  console.log('🎉 TẤT CẢ 7 MỤC TRONG QA CHECKLIST ĐỀU ĐẠT 100%!');
  console.log('================================================================');
  process.exit(0);
})();
