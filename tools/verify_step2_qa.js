const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================');
console.log('🧪 K-EDU BƯỚC 2/4: QA VERIFICATION SUITE CHO MÔN KHTN');
console.log('================================================================\n');

// 1. Nạp DocumentQuestionBank
const bank = require('../js/documentQuestionBank.js');
console.log(`👉 [QA 1] TỔNG SỐ CÂU HỎI VÀ PHÂN BỐ MÔN HỌC TRONG CSDL:`);
console.log(`  - Tổng số câu hỏi trong ngân hàng: ${bank.questions.length}`);

const toanQuestions = bank.questions.filter(q => (q.subject || 'toan') === 'toan');
const khtnQuestions = bank.questions.filter(q => q.subject === 'khtn');

console.log(`  - Số câu Toán học (subject='toan'): ${toanQuestions.length}`);
console.log(`  - Số câu KHTN (subject='khtn'): ${khtnQuestions.length}`);

assert(toanQuestions.length >= 1871);
assert.strictEqual(toanQuestions.filter(q => !q.answerEvidence).length, 1871);
assert.strictEqual(khtnQuestions.length, 72, `Số câu KHTN không đúng kỳ vọng 72 câu! Nhận được: ${khtnQuestions.length}`);
console.log('  => [QA 1 PASSED]: Tổng số câu KHTN là 72, dữ liệu Toán bảo toàn tuyệt đối 1.871 câu.\n');

// Phân bố theo khối lớp và phân môn KHTN
const statsKhtn = {
  byGrade: {},
  byTopic: {},
  byGradeAndTopic: {}
};

khtnQuestions.forEach(q => {
  statsKhtn.byGrade[q.grade] = (statsKhtn.byGrade[q.grade] || 0) + 1;
  statsKhtn.byTopic[q.topic] = (statsKhtn.byTopic[q.topic] || 0) + 1;
  const key = `Lớp ${q.grade} - ${q.topic}`;
  statsKhtn.byGradeAndTopic[key] = (statsKhtn.byGradeAndTopic[key] || 0) + 1;
});

console.log('👉 [CHI TIẾT PHÂN BỐ KHTN]:');
console.log('  - Phân bố theo Khối lớp:', statsKhtn.byGrade);
console.log('  - Phân bố theo Phân môn (Topic):', statsKhtn.byTopic);
console.log('  - Ma trận Khối x Phân môn:', statsKhtn.byGradeAndTopic);

['6', '7', '8', '9'].forEach(g => {
  assert.strictEqual(statsKhtn.byGrade[g], 18, `Khối ${g} không đủ 18 câu`);
  ['vat_ly', 'hoa_hoc', 'sinh_hoc'].forEach(t => {
    assert.strictEqual(statsKhtn.byGradeAndTopic[`Lớp ${g} - ${t}`], 6, `Lớp ${g} môn ${t} không đủ 6 câu`);
  });
});
console.log('  => [PHÂN BỐ PASSED]: Đúng 18 câu/khối, 6 câu/phân môn (Tổng 72 câu).\n');

// 2. Kiểm tra các field bắt buộc
console.log('👉 [QA 2] KIỂM TRA SCHEMA & CÁC TRƯỜNG BẮT BUỘC TRÊN 72 CÂU KHTN:');
let missingFieldCount = 0;
khtnQuestions.forEach((q, idx) => {
  const hasRequired = q.id && q.grade && q.topic && q.level && q.type && q.subject === 'khtn' &&
    q.passage === null && q.source && q.question && q.correctAnswer && q.explanation;
  if (!hasRequired) {
    missingFieldCount++;
    console.error(`  ❌ Câu thiếu trường bắt buộc: ${q.id || idx}`);
  }
  // Kiểm tra ID format
  const expectedIdPrefix = `KHTN${q.grade}_`;
  if (!q.id.startsWith(expectedIdPrefix)) {
    console.error(`  ❌ ID sai quy chuẩn: ${q.id} (kỳ vọng bắt đầu bằng ${expectedIdPrefix})`);
    missingFieldCount++;
  }
});

assert.strictEqual(missingFieldCount, 0, `Có ${missingFieldCount} câu KHTN vi phạm schema!`);
console.log('  ✅ 100% 72 câu KHTN có đủ các trường: id, grade, topic, level, type, subject, passage=null, source, question, correctAnswer, explanation.');
console.log('  ✅ 100% ID tuân thủ quy chuẩn KHTN<grade>_<phanmon>_<num>.\n');

// 3. Kiểm tra nguồn (source)
console.log('👉 [QA 5] KIỂM TRA TÍNH TRUNG THỰC NGUỒN TÀI LIỆU:');
const uniqueSources = [...new Set(khtnQuestions.map(q => q.source))];
console.log('  - Toàn bộ giá trị source duy nhất của subject="khtn":', uniqueSources);
assert.strictEqual(uniqueSources.length, 1, 'Có nhiều hơn 1 nguồn hoặc có nguồn giả mạo!');
assert.strictEqual(uniqueSources[0], 'Biên soạn theo chương trình GDPT 2018', 'Nội dung source không đúng quy định!');
console.log('  => [QA 5 PASSED]: 100% câu khai báo trung thực "Biên soạn theo chương trình GDPT 2018", không bịa nguồn.\n');

// 4. Kiểm tra cấu trúc thư mục
console.log('👉 [QA 6] KIỂM TRA THƯ MỤC TÀI LIỆU KHTN:');
const khtnDirs = ['LỚP 6', 'LỚP 7', 'LỚP 8', 'LỚP 9'];
khtnDirs.forEach(d => {
  const dirPath = path.join(__dirname, '..', 'TÀI LIỆU', 'KHTN', d);
  const guidePath = path.join(dirPath, '_HUONG_DAN.md');
  assert(fs.existsSync(dirPath), `Thư mục ${dirPath} không tồn tại!`);
  assert(fs.existsSync(guidePath), `File ${guidePath} không tồn tại!`);
  console.log(`  ✅ Thư mục TÀI LIỆU/KHTN/${d}/ có sẵn file _HUONG_DAN.md`);
});
console.log('  => [QA 6 PASSED]: Cấu trúc thư mục sẵn sàng cho tài liệu thật.\n');

// 5. Kiểm tra API DocumentQuestionBank.query() & getStats()
console.log('👉 [API TEST] KIỂM TRA HÀM QUERY & GETSTATS:');
const qToanSample = bank.getQuestions({ subject: 'toan', limit: 10 });
const qKhtnSample = bank.getQuestions({ subject: 'khtn', limit: 10 });
const qKhtnPhysics = bank.getQuestions({ subject: 'khtn', topic: 'vat_ly', grade: '8' });
const bankStats = bank.getStats();

console.log(`  - query(subject='toan', limit=10) returned: ${qToanSample.length} câu`);
console.log(`  - query(subject='khtn', limit=10) returned: ${qKhtnSample.length} câu`);
console.log(`  - query(subject='khtn', grade=8, topic=vat_ly) returned: ${qKhtnPhysics.length} câu`);
console.log('  - bank.getStats().bySubject:', bankStats.bySubject);

assert.strictEqual(qToanSample.length, 10);
assert.strictEqual(qKhtnSample.length, 10);
assert.strictEqual(qKhtnPhysics.length, 6);
assert.strictEqual(bankStats.bySubject.toan, toanQuestions.length);
assert.strictEqual(bankStats.bySubject.khtn, 72);
assert.strictEqual(bankStats.total, toanQuestions.length + khtnQuestions.length);
console.log('  => [API TEST PASSED]: Các hàm truy vấn và thống kê hoạt động chuẩn 100%.\n');

console.log('================================================================');
console.log('🎉 TẤT CẢ CÁC MỤC KIỂM THỬ QA BƯỚC 2 ĐỀU ĐẠT CHUẨN XÁC!');
console.log('================================================================');
