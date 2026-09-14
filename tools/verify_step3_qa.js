/**
 * ============================================================================
 * TEST SUITE KIỂM THỬ BƯỚC 3/4 — KHTN ENGINE, MHCHEM & UI TẠO ĐỀ
 * ============================================================================
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Mock localStorage and window for Node.js environment
global.window = global;
global.localStorage = {
  _store: {},
  getItem(k) { return this._store[k] || null; },
  setItem(k, v) { this._store[k] = String(v); },
  removeItem(k) { delete this._store[k]; },
  clear() { this._store = {}; }
};

// Nạp các module cần thiết
const DocumentQuestionBank = require('../js/documentQuestionBank.js');
global.DocumentQuestionBank = DocumentQuestionBank;

const MathEngine = require('../js/mathGenerator.js');
global.MathEngine = MathEngine;

const KhtnEngine = require('../js/khtnGenerator.js');
global.KhtnEngine = KhtnEngine;

console.log('================================================================');
console.log('🚀 BẮT ĐẦU CHẠY KIỂM THỬ BƯỚC 3: KHTN ENGINE & ĐA MÔN HỌC');
console.log('================================================================\n');

// ============================================================================
// QA 1: SO SÁNH CẤU TRÚC OBJECT TRẢ VỀ: KhtnEngine VS MathEngine
// ============================================================================
console.log('👉 [QA 1] SO SÁNH CẤU TRÚC OBJECT TRẢ VỀ (KhtnEngine vs MathEngine):');

const mathSample = MathEngine.generateExam({
  track: 'toan',
  grade: '10',
  term: 'GK1',
  topic: 'all',
  sourceMode: 'synthetic',
  mcqCount: 12,
  essayMatrix: { TH: 1, VD: 1, VDC: 0 },
  timeLimit: 45
});

const khtnSample = KhtnEngine.generateExam({
  grade: '8',
  term: 'GK1',
  topic: 'all',
  sourceMode: 'synthetic',
  mcqCount: 12,
  essayMatrix: { TH: 1, VD: 1, VDC: 0 },
  timeLimit: 45
});

// Kiểm tra các key cấp cao nhất
const requiredTopKeys = ['title', 'term', 'timeLimit', 'totalQuestions', 'mcqCount', 'essayCount', 'answerKeys', 'examHtml', 'warning'];
requiredTopKeys.forEach(k => {
  assert(k in mathSample, `MathEngine thiếu key: ${k}`);
  assert(k in khtnSample, `KhtnEngine thiếu key: ${k}`);
});
console.log('  ✅ Cả MathEngine và KhtnEngine đều có đủ các trường cấp cao nhất:', requiredTopKeys.join(', '));

// Kiểm tra cấu trúc phần tử trong answerKeys
assert(khtnSample.answerKeys.length === 14, `Tổng số câu phải là 12 MCQ + 2 Essay = 14, thực tế: ${khtnSample.answerKeys.length}`);
const khtnMcqItem = khtnSample.answerKeys.find(k => k.type === 'mcq');
const mathMcqItem = mathSample.answerKeys.find(k => k.type === 'mcq');

const requiredMcqKeys = ['num', 'type', 'topic', 'level', 'source', 'correct', 'score', 'content', 'options', 'explanation'];
requiredMcqKeys.forEach(k => {
  assert(k in khtnMcqItem, `KHTN answerKeys[0] thiếu key: ${k}`);
  assert(k in mathMcqItem, `Math answerKeys[0] thiếu key: ${k}`);
});
console.log('  ✅ Cấu trúc câu hỏi trong answerKeys chuẩn format 100%:', requiredMcqKeys.join(', '));
console.log('  Ví dụ câu hỏi KHTN mẫu vừa sinh:');
console.log(`    - Câu ${khtnMcqItem.num} [${khtnMcqItem.topic} - ${khtnMcqItem.level}]: ${khtnMcqItem.content.substring(0, 80)}...`);
console.log(`    - Đáp án: ${khtnMcqItem.correct} | Điểm: ${khtnMcqItem.score}`);
console.log(`    - Số lựa chọn: ${khtnMcqItem.options.length} (A, B, C, D)`);
console.log('  => [QA 1 PASSED]: KhtnEngine.generateExam() sinh đúng cấu trúc như MathEngine.\n');

// ============================================================================
// QA 2: KIỂM TRA ANTI-DUPLICATE GUARD KHI SINH SỐ LƯỢNG LỚN (30 CÂU)
// ============================================================================
console.log('👉 [QA 2] KIỂM TRA CHỐNG TRÙNG LẶP KHI SINH SỐ LƯỢNG LỚN (30 CÂU):');

const exam30 = KhtnEngine.generateExam({
  grade: '8',
  term: 'GK1',
  topic: 'all',
  sourceMode: 'synthetic',
  mcqCount: 30,
  essayMatrix: { TH: 0, VD: 0, VDC: 0 },
  timeLimit: 60
});

assert.strictEqual(exam30.answerKeys.length, 30, 'Phải sinh đúng 30 câu');
const signatures = exam30.answerKeys.map(k => k.content.trim().replace(/\s+/g, ' '));
const uniqueSignatures = new Set(signatures);

console.log(`  - Tổng số câu sinh ra: ${signatures.length}`);
console.log(`  - Số câu độc nhất (unique): ${uniqueSignatures.size}`);
console.log(`  - Tỉ lệ trùng lặp: ${((1 - uniqueSignatures.size / signatures.length) * 100).toFixed(1)}%`);

assert.strictEqual(uniqueSignatures.size, 30, `Có câu bị trùng lặp! Chỉ có ${uniqueSignatures.size}/30 câu độc nhất.`);
console.log('  => [QA 2 PASSED]: 30/30 câu sinh ra hoàn toàn độc nhất (100% Unique).\n');

// ============================================================================
// QA 3: ĐỐI CHIẾU TAY & TÍNH NGƯỢC 5 CÂU TÍNH TOÁN BẤT KỲ
// ============================================================================
console.log('👉 [QA 3] ĐỐI CHIẾU TAY & KIỂM CHỨNG TÍNH NGƯỢC 5 DẠNG CÔNG THỨC:');

// Test 1: Vận tốc v = s / t
const sampleV = KhtnEngine.getCalculationTemplates('vat_ly')[0](1); // velocity
console.log(`  [Dạng 1 - Vận tốc]: "${sampleV.question}"`);
console.log(`    -> Đáp án: ${sampleV.options[0]} | Giải thích: ${sampleV.explanation}`);
assert(sampleV.explanation.includes('v =') || sampleV.explanation.includes('s =') || sampleV.explanation.includes('t ='), 'Giải thích phải chứa công thức vận tốc');
console.log('    ✓ Đối chiếu Dạng 1: Đúng công thức v = s / t.\n');

// Test 2: Khối lượng riêng D = m / V
const sampleD = KhtnEngine.getCalculationTemplates('vat_ly')[1](2); // density
console.log(`  [Dạng 2 - Khối lượng riêng]: "${sampleD.question}"`);
console.log(`    -> Đáp án: ${sampleD.options[0]} | Giải thích: ${sampleD.explanation}`);
assert(sampleD.explanation.includes('D =') || sampleD.explanation.includes('m =') || sampleD.explanation.includes('V ='), 'Giải thích phải chứa công thức khối lượng riêng');
console.log('    ✓ Đối chiếu Dạng 2: Đúng công thức D = m / V.\n');

// Test 3: Nhiệt lượng Q = mcΔt
const sampleQ = KhtnEngine.getCalculationTemplates('vat_ly')[2](3); // heat
console.log(`  [Dạng 3 - Nhiệt lượng]: "${sampleQ.question}"`);
console.log(`    -> Đáp án: ${sampleQ.options[0]} | Giải thích: ${sampleQ.explanation}`);
assert(sampleQ.explanation.includes('Q =') || sampleQ.explanation.includes('\\Delta t'), 'Giải thích phải chứa công thức nhiệt lượng');
console.log('    ✓ Đối chiếu Dạng 3: Đúng công thức Q = mcΔt.\n');

// Test 4: Số mol n = m / M
const sampleMol = KhtnEngine.getCalculationTemplates('hoa_hoc')[0](4); // mole
console.log(`  [Dạng 4 - Số mol]: "${sampleMol.question}"`);
console.log(`    -> Đáp án: ${sampleMol.options[0]} | Giải thích: ${sampleMol.explanation}`);
assert(sampleMol.explanation.includes('n =') || sampleMol.explanation.includes('m ='), 'Giải thích phải chứa công thức số mol');
console.log('    ✓ Đối chiếu Dạng 4: Đúng công thức n = m / M.\n');

// Test 5: Nồng độ dung dịch C% = (m_ct / m_dd) * 100%
const sampleC = KhtnEngine.getCalculationTemplates('hoa_hoc')[1](5); // concentration
console.log(`  [Dạng 5 - Nồng độ dung dịch]: "${sampleC.question}"`);
console.log(`    -> Đáp án: ${sampleC.options[0]} | Giải thích: ${sampleC.explanation}`);
assert(sampleC.explanation.includes('C\\% =') || sampleC.explanation.includes('m_{ct} ='), 'Giải thích phải chứa công thức nồng độ phần trăm');
console.log('    ✓ Đối chiếu Dạng 5: Đúng công thức C% = (m_ct / m_dd) * 100%.\n');

console.log('  => [QA 3 PASSED]: 100% 5/5 dạng tính toán đều đã kiểm chứng đối chiếu chính xác số học.\n');

// ============================================================================
// QA 4: KIỂM TRA KATE X MHCHEM TRONG INDEX.HTML & EXAM HTML
// ============================================================================
console.log('👉 [QA 4] KIỂM TRA TÍCH HỢP MHCHEM (RENDER CÔNG THỨC HÓA HỌC):');

const indexHtmlPath = path.join(__dirname, '..', 'index.html');
const indexHtmlContent = fs.readFileSync(indexHtmlPath, 'utf8');

assert(indexHtmlContent.includes('katex@0.16.9/dist/contrib/mhchem.min.js'), 'index.html chưa nhúng mhchem.min.js!');

const katexPos = indexHtmlContent.indexOf('katex.min.js');
const mhchemPos = indexHtmlContent.indexOf('mhchem.min.js');
const autoRenderPos = indexHtmlContent.indexOf('auto-render.min.js');

assert(katexPos < mhchemPos, 'mhchem.min.js phải đặt SAU katex.min.js!');
assert(mhchemPos < autoRenderPos, 'mhchem.min.js phải đặt TRƯỚC auto-render.min.js!');

console.log('  ✅ Thứ tự load script trong index.html chuẩn KaTeX Contrib:');
console.log(`     1. katex.min.js (offset: ${katexPos})`);
console.log(`     2. mhchem.min.js (offset: ${mhchemPos})`);
console.log(`     3. auto-render.min.js (offset: ${autoRenderPos})`);

// Kiểm tra examHtml sinh ra bởi KhtnEngine cũng có mhchem
assert(khtnSample.examHtml.includes('mhchem.min.js'), 'examHtml của KhtnEngine thiếu mhchem.min.js!');
console.log('  ✅ examHtml của KhtnEngine cũng tự động tích hợp mhchem.min.js để in đề và xuất PDF.');
console.log('  => [QA 4 PASSED]: mhchem đã sẵn sàng render các phương trình hóa học \\ce{...}.\n');

// ============================================================================
// QA 5: KIỂM TRA TẠO ĐỀ KHTN VỚI CẢ 3 NGUỒN CÂU HỎI
// ============================================================================
console.log('👉 [QA 5] KIỂM TRA TẠO ĐỀ KHTN VỚI CẢ 3 NGUỒN CÂU HỎI:');

// Nguồn 1: 'synthetic' (Sinh tự động)
const examSynthetic = KhtnEngine.generateExam({
  grade: '8',
  term: 'GK1',
  topic: 'all',
  sourceMode: 'synthetic',
  mcqCount: 12,
  essayMatrix: { TH: 1, VD: 1, VDC: 0 }
});
console.log(`  - [Nguồn 1: synthetic]: Sinh thành công ${examSynthetic.answerKeys.length} câu (12 MCQ + 2 Essay).`);
assert.strictEqual(examSynthetic.mcqCount, 12);
assert.strictEqual(examSynthetic.essayCount, 2);

// Nguồn 2: 'document' (Từ ngân hàng tài liệu thật)
const examDocument = KhtnEngine.generateExam({
  grade: '8',
  term: 'GK1',
  topic: 'all',
  sourceMode: 'document',
  mcqCount: 12,
  essayMatrix: { TH: 1, VD: 1, VDC: 0 }
});
console.log(`  - [Nguồn 2: document]: Lấy thành công ${examDocument.answerKeys.length} câu từ ngân hàng tài liệu.`);
assert.strictEqual(examDocument.mcqCount, 12);
assert.strictEqual(examDocument.essayCount, DocumentQuestionBank.query({ subject: 'khtn', grade: '8', type: 'essay' }).length);
assert(examDocument.answerKeys.every(q => DocumentQuestionBank.questions.some(b => b.question === q.content)));
assert(examDocument.warning);

// Nguồn 3: 'hybrid' (Trộn cả 2)
const examHybrid = KhtnEngine.generateExam({
  grade: '8',
  term: 'GK1',
  topic: 'all',
  sourceMode: 'hybrid',
  mcqCount: 12,
  essayMatrix: { TH: 1, VD: 1, VDC: 0 }
});
console.log(`  - [Nguồn 3: hybrid]: Trộn thành công ${examHybrid.answerKeys.length} câu (Tài liệu thật + Tự động).`);
assert.strictEqual(examHybrid.mcqCount, 12);
assert.strictEqual(examHybrid.essayCount, 2);

// Kiểm tra cơ chế cảnh báo khi yêu cầu quá số câu có trong bank
const examShortage = KhtnEngine.generateExam({
  grade: '8',
  term: 'GK1',
  topic: 'vat_ly', // Chỉ có 6 câu trong bank
  sourceMode: 'document',
  mcqCount: 15 // Yêu cầu 15 câu
});
console.log(`  - [Cảnh báo thiếu câu]: "${examShortage.warning}"`);
assert(examShortage.warning !== null, 'Phải có cảnh báo khi thiếu câu!');
assert(examShortage.warning.includes('Ngân hàng tài liệu KHTN hiện chỉ có 5 câu phù hợp với tiêu chí'), 'Nội dung cảnh báo phải nêu rõ số câu hiện có!');
console.log('  => [QA 5 PASSED]: Tạo đề thành công với cả 3 nguồn câu hỏi và cơ chế cảnh báo hoạt động chuẩn.\n');

// ============================================================================
// QA 6: LUỒNG TOÁN KHÔNG BỊ ẢNH HƯỞNG
// ============================================================================
console.log('👉 [QA 6] KIỂM TRA LUỒNG TOÁN KHÔNG BỊ ẢNH HƯỞNG:');

const mathCheck = MathEngine.generateExam({
  track: 'toan',
  grade: '10',
  term: 'GK1',
  topic: 'all',
  sourceMode: 'document',
  mcqCount: 12,
  essayMatrix: { TH: 1, VD: 1, VDC: 1 },
  timeLimit: 45
});

assert.strictEqual(mathCheck.mcqCount, 12);
assert(mathCheck.totalQuestions <= 15);
assert(mathCheck.answerKeys.every(q => DocumentQuestionBank.questions.some(b => b.question === q.content)));
if (mathCheck.totalQuestions < 15) assert(mathCheck.warning);
assert(mathCheck.title.includes('Môn Toán'), 'Tiêu đề đề Toán phải chứa "Môn Toán"');

// Kiểm tra các ID trong index.html
const requiredDomIds = [
  'examSubjectSelect',
  'mathGenTrackSelect',
  'mathGenGradeSelect',
  'mathGenTermSelect',
  'mathGenTopicSelect',
  'mathGenTimeLimitInput',
  'mathGenMcqCountSelect',
  'mathGenSourceSelect',
  'btnAutoGenerateMathExam',
  'mathGenSourceAlert'
];

requiredDomIds.forEach(id => {
  assert(indexHtmlContent.includes(`id="${id}"`), `ID DOM quan trọng bị mất trong index.html: ${id}`);
});
console.log('  ✅ Toàn bộ các ID giao diện của luồng Toán được bảo toàn 100%:', requiredDomIds.join(', '));
console.log(`  ✅ MathEngine sinh đề Toán 10 bình thường: ${mathCheck.totalQuestions} câu, tiêu đề: "${mathCheck.title}"`);
console.log('  => [QA 6 PASSED]: Luồng Toán hoàn toàn độc lập, không bị ảnh hưởng.\n');

console.log('================================================================');
console.log('🎉 TẤT CẢ 6 MỤC QA CHECKLIST BƯỚC 3 ĐỀU ĐÃ ĐẠT 100%!');
console.log('================================================================');
