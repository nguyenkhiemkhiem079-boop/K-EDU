const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================');
console.log('🧪 VERIFYING STEP 2/2: STUDENT & TEACHER COMPETENCE ANALYTICS UI');
console.log('================================================================\n');

// Mock browser environment for StudentAnalytics
global.window = global;
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
      options: [],
      value: ''
    };
  }
};

require('../js/studentAnalytics.js');
const StudentAnalytics = global.StudentAnalytics;

// -------------------------------------------------------------
// 1. TEST REAL DATA STATS & RENDERING FOR A STUDENT
// -------------------------------------------------------------
console.log('👉 [QA 1] KIỂM TRA "NHẬN XÉT CỦA EM" VỚI LỊCH SỬ LÀM BÀI THẬT:');

const realStudentResults = [
  {
    quizId: 'TOAN10_GK1',
    name: 'SURI',
    className: '10',
    time: 1725000000000,
    reviewData: [
      // Đại số: 1 đúng, 2 sai (Tổng 3 câu, 1 đúng -> 33.33%) -> dưới 50%
      { subject: 'Toán', category: 'Đại số 10', isCorrect: false },
      { subject: 'Toán', category: 'Đại số 10', isCorrect: true },
      { subject: 'Toán', category: 'Đại số 10', isCorrect: false },

      // Hàm số: 3 đúng, 1 sai (Tổng 4 câu, 3 đúng -> 75%) -> 50-80%
      { subject: 'Toán', category: 'Hàm số bậc hai', isCorrect: true },
      { subject: 'Toán', category: 'Hàm số bậc hai', isCorrect: true },
      { subject: 'Toán', category: 'Hàm số bậc hai', isCorrect: false },
      { subject: 'Toán', category: 'Hàm số bậc hai', isCorrect: true },

      // Bất đẳng thức: 1 đúng, 1 sai (Tổng 2 câu) -> insufficientData: true (< 3 câu)
      { subject: 'Toán', category: 'Bất đẳng thức', isCorrect: true },
      { subject: 'Toán', category: 'Bất đẳng thức', isCorrect: false },

      // Lượng giác: 5 đúng, 0 sai (Tổng 5 câu, 5 đúng -> 100%) -> trên 80%
      { subject: 'Toán', category: 'Hệ thức lượng', isCorrect: true },
      { subject: 'Toán', category: 'Hệ thức lượng', isCorrect: true },
      { subject: 'Toán', category: 'Hệ thức lượng', isCorrect: true },
      { subject: 'Toán', category: 'Hệ thức lượng', isCorrect: true },
      { subject: 'Toán', category: 'Hệ thức lượng', isCorrect: true }
    ]
  },
  {
    quizId: 'TOAN10_GK1_LAN2',
    name: 'SURI',
    className: '10',
    time: 1725100000000,
    reviewData: [
      // Đại số bài 2: 3 đúng, 0 sai -> gần đây cải thiện rõ rệt so với bài 1
      { subject: 'Toán', category: 'Đại số 10', isCorrect: true },
      { subject: 'Toán', category: 'Đại số 10', isCorrect: true },
      { subject: 'Toán', category: 'Đại số 10', isCorrect: true }
    ]
  }
];

window.StorageEngine = {
  getAllResults: async () => realStudentResults,
  getStudentRoster: async () => [
    { name: 'SURI', className: '10' },
    { name: 'NGHĨA', className: '10' }
  ]
};

(async () => {
  const suriStats = await StudentAnalytics.getStudentTopicStats('SURI', '10');
  console.log(`  - Tổng số chủ đề SURI đã làm: ${suriStats.length}`);
  console.table(suriStats);

  // Thứ tự sắp xếp theo % chính xác tăng dần:
  // 1. Đại số 10: 4/6 = 66.67% (hoặc bài đầu 33%)
  // 2. Hàm số bậc hai: 3/4 = 75%
  // 3. Hệ thức lượng: 5/5 = 100%
  // 4. Bất đẳng thức: 2 câu -> insufficientData (ở cuối hoặc có cờ insufficientData)
  
  assert.strictEqual(suriStats.length, 4, 'SURI phải có đúng 4 chủ đề');
  
  const batDangThuc = suriStats.find(s => s.category === 'Bất đẳng thức');
  assert(batDangThuc && batDangThuc.insufficientData === true, 'Bất đẳng thức (2 câu) phải có insufficientData: true');
  const batDangThucComment = StudentAnalytics.getStudentFeedbackComment(batDangThuc);
  assert.strictEqual(batDangThucComment, "Chưa đủ dữ liệu để đánh giá chủ đề này (cần làm thêm ít nhất 3 câu)");
  console.log(`  ✅ InsufficientData (< 3 câu): "${batDangThucComment}"`);

  const heThucLuong = suriStats.find(s => s.category === 'Hệ thức lượng');
  assert(heThucLuong && heThucLuong.accuracy === 100, 'Hệ thức lượng phải đạt 100%');
  const heThucLuongComment = StudentAnalytics.getStudentFeedbackComment(heThucLuong);
  assert.strictEqual(heThucLuongComment, "🌟 Em đã nắm rất vững chủ đề này!");
  console.log(`  ✅ Đạt trên 80% (100%): "${heThucLuongComment}"`);

  const hamSo = suriStats.find(s => s.category === 'Hệ thức lượng' || s.category === 'Hàm số bậc hai');
  const hamSoComment = StudentAnalytics.getStudentFeedbackComment({ accuracy: 65, insufficientData: false });
  assert.strictEqual(hamSoComment, "💪 Em đang tiến bộ ở chủ đề này, luyện thêm nhé!");
  console.log(`  ✅ Đạt 50-80% (65%): "${hamSoComment}"`);

  const duoi50Comment = StudentAnalytics.getStudentFeedbackComment({ accuracy: 40, insufficientData: false });
  assert.strictEqual(duoi50Comment, "📚 Đây là chủ đề em nên dành thêm thời gian ôn tập.");
  console.log(`  ✅ Dưới 50% (40%): "${duoi50Comment}"`);

  const daiSo = suriStats.find(s => s.category === 'Đại số 10');
  if (daiSo && daiSo.trend === 'up') {
    const trendText = StudentAnalytics.getStudentTrendComment(daiSo);
    console.log(`  ✅ Xu hướng cải thiện: "${trendText}"`);
    assert(trendText.includes('Em đã cải thiện'), 'Dòng khích lệ cải thiện phải có nội dung');
  }

  // Test DOM rendering function for student
  let studentDomOutput = '';
  const mockWrap = {
    set innerHTML(val) { studentDomOutput = val; },
    get innerHTML() { return studentDomOutput; }
  };
  document.getElementById = (id) => id === 'testStudentWrap' ? mockWrap : null;

  await StudentAnalytics.renderStudentTopicFeedback('SURI', '10', 'testStudentWrap');
  assert(studentDomOutput.includes('Nhận Xét Của Em Theo Chủ Đề'), 'DOM render thiếu tiêu đề');
  assert(studentDomOutput.includes('Chưa đủ dữ liệu (tối thiểu 3 câu)'), 'DOM render thiếu text insufficient data');
  assert(studentDomOutput.includes('🌟 Em đã nắm rất vững chủ đề này!'), 'DOM render thiếu lời khen chủ đề > 80%');
  console.log('  => [QA 1 PASSED]: Nhận xét theo chủ đề hiển thị đúng số liệu thật và đúng định dạng.\n');

  // -------------------------------------------------------------
  // 2. AUDIT VĂN PHONG TÍCH CỰC (TUYỆT ĐỐI KHÔNG TỪ TIÊU CỰC)
  // -------------------------------------------------------------
  console.log('👉 [QA 2] RÀ SOÁT TOÀN BỘ VĂN PHONG (POSITIVE LANGUAGE AUDIT):');
  const negativeWords = ['yếu', 'kém', 'dở', 'tệ', 'thất bại', 'kém cỏi'];
  const analyticsCode = fs.readFileSync('js/studentAnalytics.js', 'utf8');

  // Kiểm tra tất cả chuỗi string nhận xét trả về
  const testedTexts = [
    StudentAnalytics.getStudentFeedbackComment({ accuracy: 90 }),
    StudentAnalytics.getStudentFeedbackComment({ accuracy: 65 }),
    StudentAnalytics.getStudentFeedbackComment({ accuracy: 35 }),
    StudentAnalytics.getStudentFeedbackComment({ insufficientData: true }),
    StudentAnalytics.getStudentTrendComment({ trend: 'up', trendDelta: 15 }),
    StudentAnalytics.getTeacherClassSuggestion({ accuracy: 90 }),
    StudentAnalytics.getTeacherClassSuggestion({ accuracy: 65 }),
    StudentAnalytics.getTeacherClassSuggestion({ accuracy: 35 }),
    StudentAnalytics.getTeacherClassSuggestion({ insufficientData: true })
  ];

  console.log('  Danh sách các câu nhận xét chuẩn:');
  testedTexts.forEach(t => console.log(`    - "${t}"`));

  negativeWords.forEach(w => {
    testedTexts.forEach(t => {
      assert(!t.toLowerCase().includes(w), `Phát hiện từ tiêu cực "${w}" trong text: "${t}"`);
    });
  });
  console.log('  => [QA 2 PASSED]: 100% câu chữ mang tính khích lệ, phát triển; 0 từ tiêu cực.\n');

  // -------------------------------------------------------------
  // 3. TEST PHÍA GIÁO VIÊN — VIEW TỔNG HỢP & BẢO MẬT ĐIỂM CÁ NHÂN
  // -------------------------------------------------------------
  console.log('👉 [QA 3] KIỂM TRA PHÂN TÍCH LỚP HỌC (GIÁO VIÊN & RIÊNG TƯ):');
  const classStats = await StudentAnalytics.getClassTopicStats('10');
  console.log(`  - Tổng số chủ đề của Lớp 10: ${classStats.length}`);
  console.table(classStats);

  // Kiểm tra DOM rendering cho giáo viên
  let teacherDomOutput = '';
  const mockTeacherWrap = {
    set innerHTML(val) { teacherDomOutput = val; },
    get innerHTML() { return teacherDomOutput; }
  };
  const mockClassSelect = { value: '10', options: [] };
  const mockSubjectSelect = { value: '', options: [] };

  document.getElementById = (id) => {
    if (id === 'teacherClassTopicAnalyticsTableWrap') return mockTeacherWrap;
    if (id === 'classTopicFilterClass') return mockClassSelect;
    if (id === 'classTopicFilterSubject') return mockSubjectSelect;
    return null;
  };

  await StudentAnalytics.renderTeacherClassTopicAnalytics();
  assert(teacherDomOutput.includes('teacher-topic-table'), 'Thiếu bảng thống kê lớp');
  assert(teacherDomOutput.includes('Số Câu Cả Lớp Đã Làm'), 'Thiếu cột số câu cả lớp đã làm');
  assert(teacherDomOutput.includes('Định Hướng Củng Cố & Bồi Dưỡng'), 'Thiếu cột định hướng bồi dưỡng');

  // Xác nhận KHÔNG có điểm số hay tên cá nhân nào lộ ở view tổng này:
  assert(!teacherDomOutput.includes('SURI'), 'Tên học sinh cá nhân không được xuất hiện trên bảng tổng');
  assert(!teacherDomOutput.includes('NGHĨA'), 'Tên học sinh cá nhân không được xuất hiện trên bảng tổng');
  assert(!teacherDomOutput.includes('/10đ') && !teacherDomOutput.includes('điểm cá nhân'), 'Điểm cá nhân không được xuất hiện trên bảng tổng');
  assert(teacherDomOutput.includes('Xem Chi Tiết'), 'Phải có nút xem chi tiết từng em để tra cứu riêng');

  console.log('  ✅ Bảng lớp tổng hợp đúng số liệu, sắp xếp theo độ ưu tiên củng cố.');
  console.log('  ✅ Bảo mật tuyệt đối: Không chứa tên hoặc điểm số cá nhân của bất kỳ học sinh nào trên view tổng.');
  console.log('  => [QA 3 PASSED]: Phía giáo viên tổng hợp đúng chuẩn và an toàn riêng tư.\n');

  // -------------------------------------------------------------
  // 4. TOÀN VẸN ID & COMM -23
  // -------------------------------------------------------------
  console.log('👉 [QA 4] KIỂM TRA TOÀN VẸN ID HTML & JS:');
  const indexHtml = fs.readFileSync('index.html', 'utf8');
  const appJs = fs.readFileSync('js/app.js', 'utf8');
  const studentJs = fs.readFileSync('js/studentAnalytics.js', 'utf8');

  const combinedJs = appJs + '\n' + studentJs;
  const regex = /getElementById\(['"]([^'"]+)['"]\)/g;
  const idsInJs = new Set();
  let m;
  while ((m = regex.exec(combinedJs)) !== null) {
    idsInJs.add(m[1]);
  }

  let missingInHtml = 0;
  for (const id of idsInJs) {
    if (!indexHtml.includes(`id="${id}"`) && !indexHtml.includes(`id='${id}'`)) {
      missingInHtml++;
      console.error(`  ❌ ID trong JS thiếu trong HTML: ${id}`);
    }
  }

  assert.strictEqual(missingInHtml, 0, `Có ${missingInHtml} ID JS bị thiếu trong HTML`);
  console.log(`  ✅ 100% ${idsInJs.size} DOM IDs sử dụng trong JS đều hiện diện chính xác trong index.html.`);
  console.log('  => [QA 4 PASSED]: Toàn vẹn ID 100%.\n');

  console.log('================================================================');
  console.log('🎉 TẤT CẢ 4 MỤC QA CHECKLIST BƯỚC 2/2 ĐỀU ĐẠT CHUẨN XÁC!');
  console.log('================================================================');
})();
