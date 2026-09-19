const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
global.window = global;
global.localStorage = { getItem: () => null, setItem() {} };
const bank = require('../js/documentQuestionBank');
global.DocumentQuestionBank = bank;
const math = require('../js/mathGenerator');
const science = require('../js/khtnGenerator');
const policy = require('../js/specializedBankPolicy');
const original = bank.questions;
try {
  bank.questions = [];
  for (const subject of ['toan', 'khtn']) {
    for (const topic of subject === 'toan' ? ['dai_so'] : ['vat_ly', 'hoa_hoc', 'sinh_hoc']) {
      for (const level of ['NB', 'TH', 'VD', 'VDC']) {
        for (const type of ['mcq', 'essay']) {
          const id = `${subject}-${topic}-${level}-${type}`;
          bank.questions.push({ id, subject, topic, level, type, grade: '8', question: id,
            options: type === 'mcq' ? ['1', '2', '3', '4'] : undefined,
            correctAnswer: type === 'mcq' ? 'A' : '1', source: 'Fixture' });
        }
      }
    }
  }
  for (const q of [...bank.questions].filter(q => q.level === 'VDC')) {
    const copy = { ...q, id: q.id + '-second', question: q.question + '-second' };
    bank.questions.push(copy);
    for (const item of [q, copy]) item.curation = {
      status: 'approved', sourceType: 'specialized_school', schoolName: 'Trường chuyên fixture',
      sourceFile: item.sourceFile = 'fixture.pdf', sourcePage: 1, sourceEvidence: 'School header fixture',
      documentOriginVerified: true, difficultyReviewed: true, answerReviewed: true, questionId: item.id,
      questionSignature: policy.signature(item.question), answerSignature: policy.signature(item.correctAnswer)
    };
  }

  // 1. DGNL: kiểm tra mức độ chuẩn cho basic (NB, TH) và advanced (VD, VDC)
  for (const mode of ['basic', 'advanced']) {
    const allowed = mode === 'basic' ? ['NB', 'TH'] : ['VD', 'VDC'];
    const dgnl = math.generateDgnlExam({ difficultyMode: mode });
    assert.ok(dgnl.answerKeys.every(q => allowed.includes(q.level)));
  }

  // 2. KHTN: kiểm tra phân môn và mức độ cơ bản/nâng cao
  for (const mode of ['basic', 'advanced']) {
    const allowed = mode === 'basic' ? ['NB', 'TH'] : ['VDC'];
    const config = { grade: '8', sourceMode: 'document', difficultyMode: mode, mcqCount: 10,
      essayMatrix: { TH: 1, VD: 1, VDC: 1 }, discipline: 'hoa_hoc' };
    const exam = science.generateExam(config);
    assert.equal(exam.mcqCount, 2);
    assert.ok(exam.warning);
    assert.ok(exam.answerKeys.length > 0);
    assert.ok(exam.answerKeys.every(q => allowed.includes(q.level)));
    assert.ok(exam.answerKeys.every(q => q.content.startsWith('khtn-hoa_hoc-')));
    const batch = science.generateBatchExams({ ...config, mcqCount: 1, essayMatrix: { TH: 0, VD: 0, VDC: 0 }, batchCount: 2 });
    assert.ok(batch.every(item => item.answerKeys.every(q => allowed.includes(q.level))));
    assert.equal(new Set(batch.flatMap(item => item.answerKeys.map(q => q.content))).size, 2);

    const synExam = science.generateExam({ grade: '8', sourceMode: 'synthetic', difficultyMode: mode,
      discipline: 'vat_ly', mcqCount: 8, essayMatrix: { TH: 1, VD: 1, VDC: 1 } });
    assert.ok(synExam.answerKeys.every(q => allowed.includes(q.level)), `${mode} synthetic levels`);
    assert.ok(synExam.answerKeys.every(q => q.topic === 'Vật lý'));
  }

  // 3. TOÁN HỌC: Kiểm tra các yêu cầu 7, 8, 9, 10
  // Requirement 7 & 8: Không áp dụng bộ lọc toàn cục ép buộc tất cả câu phải là VDC hoặc NB/TH.
  // Ma trận tự luận người dùng nhập { TH: 1, VD: 1, VDC: 1 } được giữ nguyên vẹn.
  const mathExam = math.generateExam({
    grade: '8',
    sourceMode: 'document',
    mcqCount: 10,
    essayMatrix: { TH: 1, VD: 1, VDC: 1 }
  });
  // Trong ngân hàng fixture có 5 câu trắc nghiệm (NB, TH, VD, 2 VDC). Tất cả 5 câu đều được lấy, không bị triệt tiêu về 0!
  assert.equal(mathExam.mcqCount, 5);
  assert.equal(mathExam.essayCount, 3);
  const mathVdcEssay = mathExam.answerKeys.find(q => q.type === 'essay' && q.level === 'VDC');
  assert.ok(mathVdcEssay, 'Phải chọn đúng câu tự luận VDC');
  // Requirement 9: Câu VDC phải đạt chuẩn SpecializedBankPolicy.isApproved === true
  assert.equal(policy.isApproved(bank.questions.find(q => q.id === mathVdcEssay.content)), true);

  // Requirement 7: Khi không có câu VDC đạt chuẩn, trắc nghiệm tuyệt đối KHÔNG bị về 0
  const approvedVdc = bank.questions.filter(q => q.level === 'VDC');
  const savedCurations = approvedVdc.map(q => q.curation);
  approvedVdc.forEach(q => { q.curation = null; });
  try {
    const examWithoutApprovedVdc = math.generateExam({
      grade: '8',
      sourceMode: 'document',
      mcqCount: 10,
      essayMatrix: { TH: 1, VD: 1, VDC: 1 }
    });
    // MCQ vẫn được lấy đủ 5 câu từ ngân hàng, không bị xóa sạch!
    assert.equal(examWithoutApprovedVdc.mcqCount, 5);
    // Câu VDC chưa duyệt KHÔNG được lấy vào đề
    assert.equal(examWithoutApprovedVdc.answerKeys.some(q => q.type === 'essay' && q.level === 'VDC'), false);
    // Requirement 10: Cảnh báo chính xác thiếu câu VDC trường chuyên đã duyệt
    assert.ok(examWithoutApprovedVdc.warning.includes('Tự luận VDC: Ngân hàng chỉ có 0/1 câu VDC trường chuyên đã duyệt đạt chuẩn'));
    assert.ok(!examWithoutApprovedVdc.warning.includes('0/10 câu phù hợp'));
  } finally {
    approvedVdc.forEach((q, idx) => { q.curation = savedCurations[idx]; });
  }

  // Requirement 10: Phân biệt các loại thiếu hụt
  // 10a. Thiếu câu VD
  const examVdShortage = math.generateExam({
    grade: '8',
    sourceMode: 'document',
    mcqCount: 5,
    essayMatrix: { TH: 1, VD: 5, VDC: 0 }
  });
  assert.ok(examVdShortage.warning.includes('Tự luận VD: Ngân hàng chỉ có 1/5 câu Vận dụng (VD) phù hợp.'));

  // 10b. Thiếu ngân hàng câu hỏi trắc nghiệm thông thường
  const examMcqShortage = math.generateExam({
    grade: '8',
    sourceMode: 'document',
    mcqCount: 20,
    essayMatrix: { TH: 0, VD: 0, VDC: 0 }
  });
  assert.ok(examMcqShortage.warning.includes('Ngân hàng tài liệu chỉ có 5/20 câu phù hợp'));

  // Sinh đề hàng loạt toán độc lập không trùng câu
  const mathBatch = math.generateBatchExams({ grade: '8', sourceMode: 'document', mcqCount: 2, essayMatrix: { TH: 0, VD: 0, VDC: 0 }, batchCount: 2, deduplicatePolicy: 'disjoint' });
  assert.equal(mathBatch.length, 2);
  assert.equal(new Set(mathBatch.flatMap(b => b.answerKeys.map(k => k.content))).size, 4);

  assert.throws(() => math.generateExam({ difficultyMode: 'invalid' }));
  assert.throws(() => science.generateExam({ discipline: 'invalid' }));

  const source = fs.readFileSync(require('node:path').join(__dirname, '../js/app.js'), 'utf8');
  const context = vm.createContext({});
  vm.runInContext(source.slice(source.indexOf('function classifyExamDifficulty('), source.indexOf('async function renderSampleQuizzes(')), context);
  assert.equal(context.classifyExamDifficulty({ answerKeys: [{ level: 'NB' }, { level: 'TH' }] }), 'basic');
  assert.equal(context.classifyExamDifficulty({ answerKeys: [{ level: 'VD' }, { level: 'VDC' }] }), 'mixed');
  assert.equal(context.classifyExamDifficulty({ answerKeys: [{ level: 'VDC' }], difficultyMode: 'advanced', specializedSourceOnly: true }), 'advanced');

  const approved = bank.questions.find(q => q.curation);
  assert.equal(policy.isApproved(approved), true);
  assert.equal(policy.isApproved({ ...approved, question: 'edited' }), false);
  assert.equal(policy.isApproved({ ...approved, curation: { ...approved.curation, answerReviewed: false } }), false);
  assert.equal(policy.isApproved({ ...approved, curation: undefined, source: 'Chuyên đề VDC' }), false);
  assert.equal(context.classifyExamDifficulty({ answerKeys: [{ level: 'TH' }, { level: 'VD' }], difficultyMode: 'advanced' }), 'mixed');
  assert.equal(context.classifyExamDifficulty({ answerKeys: [{ level: '' }] }), 'unclassified');
} finally { bank.questions = original; }
console.log('PASS: strict subject/discipline and difficulty separation, shortages, synthetic and independent batches');
