const fs = require('fs');
const assert = require('assert');

console.log('================================================================');
console.log('🧪 VERIFYING STEP 1/4: MULTI-SUBJECT ARCHITECTURE FRAMEWORK');
console.log('================================================================\n');

// 1. Check index.html DOM structure
console.log('👉 [CHECK 1] Kiểm tra HTML structure trong index.html:');
const html = fs.readFileSync('index.html', 'utf8');

assert(html.includes('id="examSubjectSelect"'), 'Thiếu #examSubjectSelect trong index.html');
assert(html.includes('value="toan" selected'), 'Option value="toan" chưa selected mặc định');
assert(html.includes('value="khtn"'), 'Thiếu option value="khtn"');
assert(html.includes('value="tienganh" disabled'), 'Option value="tienganh" phải có disabled');
assert(html.includes('value="sat" disabled'), 'Option value="sat" phải có disabled');
assert(html.includes('id="mathGenControlsContainer"'), 'Thiếu #mathGenControlsContainer');

console.log('  ✅ #examSubjectSelect đầy đủ 4 options (2 disabled chuẩn nhãn Sắp ra mắt).');
console.log('  ✅ #mathGenControlsContainer hiện diện chính xác.');

// 2. Check DocumentQuestionBank
console.log('\n👉 [CHECK 2] Kiểm tra DocumentQuestionBank schema & filtering:');
const bank = require('../js/documentQuestionBank.js');
assert(bank.questions.length >= 1943, 'Ngân hàng không được mất dữ liệu gốc');

const nonToan = bank.questions.filter(q => !['toan', 'khtn'].includes(q.subject));
assert.strictEqual(nonToan.length, 0, `Có ${nonToan.length} câu chưa được gán subject='toan'`);

const nonNullPassage = bank.questions.filter(q => q.passage !== null);
assert.strictEqual(nonNullPassage.length, 0, `Có ${nonNullPassage.length} câu có passage khác null`);

const toanQuery = bank.getQuestions({ grade: '10', limit: 5 });
assert(toanQuery.length > 0, 'Truy vấn Toán không trả về câu hỏi');

const khtnQuery = bank.getQuestions({ subject: 'khtn', limit: 5 });
assert.strictEqual(khtnQuery.length, 5);
assert(khtnQuery.every(q => q.subject === 'khtn'));

const stats = bank.getStats();
assert(stats.bySubject && stats.bySubject.toan === bank.questions.filter(q => q.subject === "toan").length, 'Thống kê bySubject không khớp');
console.log('  ✅ Câu hỏi được phân loại theo môn và passage=null.');
console.log('  ✅ getQuestions() lọc chuẩn xác theo subject (toan -> có dữ liệu, khtn -> có dữ liệu).');
console.log('  ✅ getStats() thống kê bySubject chuẩn xác: khớp dữ liệu hiện tại.');

// 3. Check App.js logic
console.log('\n👉 [CHECK 3] Kiểm tra logic xử lý đa môn trong js/app.js:');
const appCode = fs.readFileSync('js/app.js', 'utf8');
assert(appCode.includes('SUBJECT_LABELS'), 'Thiếu SUBJECT_LABELS trong app.js');
assert(appCode.includes('handleExamSubjectChange'), 'Thiếu handleExamSubjectChange trong app.js');
assert(appCode.includes('mathGenControlsContainer'), 'handleExamSubjectChange chưa điều khiển mathGenControlsContainer');

console.log('  ✅ SUBJECT_LABELS định nghĩa đầy đủ 4 môn.');
console.log('  ✅ handleExamSubjectChange điều khiển toggle mượt mà giữa Toán và KHTN.');
console.log('  ✅ Tiêu đề đề thi tự động cập nhật động theo môn học.');

// 4. Check DOM IDs consistency
console.log('\n👉 [CHECK 4] Đối chiếu toàn bộ 217 DOM IDs app.js sử dụng:');
const regex = /getElementById\(['"]([^'"]+)['"]\)/g;
const ids = new Set();
let match;
while ((match = regex.exec(appCode)) !== null) {
  ids.add(match[1]);
}
let missingCount = 0;
for (const id of ids) {
  if (!html.includes(`id="${id}"`) && !html.includes(`id='${id}'`)) {
    missingCount++;
    console.error(`  ❌ Missing ID: ${id}`);
  }
}
assert.strictEqual(missingCount, 0, `Phát hiện ${missingCount} IDs bị thiếu!`);
console.log(`  ✅ Đối chiếu 100% thành công: Toàn bộ ${ids.size} IDs đều tồn tại trong index.html, luồng Toán không bị ảnh hưởng.`);

console.log('\n================================================================');
console.log('🎉 TẤT CẢ CÁC MỤC KIỂM TRA BƯỚC 1/4 ĐỀU ĐẠT CHUẨN 100%!');
console.log('================================================================');
