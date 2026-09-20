const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');

const pdfContext = { window: {}, console };
pdfContext.window = pdfContext;
vm.createContext(pdfContext);
vm.runInContext(fs.readFileSync(path.join(root, 'js/pdfExtractor.js'), 'utf8'), pdfContext);
const PdfExtractor = pdfContext.PdfExtractor;

function parse(text) {
  const rows = PdfExtractor.parseSmartOffline(text);
  assert.ok(Array.isArray(rows));
  return rows;
}

const noOptions = parse('Câu 1: Tính giá trị của biểu thức $1+1$. Đây là câu hỏi không có lựa chọn.');
assert.equal(noOptions.length, 1);
assert.equal(noOptions[0].options.length, 0, 'parser must not invent A/B/C/D placeholders');
assert.equal(noOptions[0].status, 'review_required');
assert.ok(noOptions[0].validationIssues.length > 0);

const noAnswer = parse('Câu 1: Thủ đô của Việt Nam là gì?\nA. Huế\nB. Hà Nội\nC. Đà Nẵng\nD. Cần Thơ');
assert.equal(noAnswer[0].correctAnswer, '');
assert.equal(noAnswer[0].status, 'review_required');
assert.ok(noAnswer[0].validationIssues.includes('MISSING_OR_INVALID_ANSWER'));

const answerTable = parse('Câu 1: Thủ đô của Việt Nam là gì?\nA. Huế\nB. Hà Nội\nC. Đà Nẵng\nD. Cần Thơ\nBẢNG ĐÁP ÁN\n1. B');
assert.equal(answerTable[0].correctAnswer, 'B');
assert.equal(answerTable[0].options.length, 4);

const repeated = parse('Câu 1: Một câu hỏi bị lặp?\nA. Một\nB. Hai\nC. Ba\nD. Bốn\n\nCâu 1: Một câu hỏi bị lặp?\nA. Một\nB. Hai\nC. Ba\nD. Bốn');
assert.equal(repeated.length, 2, 'duplicate question numbering must not silently drop a record');
assert.ok(repeated.every(row => row.validationIssues.includes('DUPLICATE_QUESTION_NUMBER')));

const duplicateOptions = parse('Câu 1: Phương án lỗi?\nA. giống nhau\nB. khác\nC. giống nhau\nD. cuối\nLời giải: Chọn A.');
assert.ok(duplicateOptions[0].validationIssues.includes('DUPLICATE_OPTIONS'));

const detailedContext = { window: {}, console, pdfjsLib: { GlobalWorkerOptions: {} } };
detailedContext.window = detailedContext;
vm.createContext(detailedContext);
vm.runInContext(fs.readFileSync(path.join(root, 'js/pdfExtractor.js'), 'utf8'), detailedContext);
assert.equal(typeof detailedContext.PdfExtractor.extractTextFromPdfDetailed, 'function');

const { validateQuestion } = require('./vact-ingestion/validate_questions');
const base = {
  id: 'vact_q_phase4', section: 'math', question: 'Một câu hỏi hợp lệ về đại số?',
  options: ['Một', 'Hai', 'Ba', 'Bốn'], correctAnswer: 'A',
  source: { sourceId: 'src_phase4', sourceFile: 'fixture.pdf', sourcePage: 3, extractedFromSource: true },
  quality: { answerVerified: true, contentComplete: true }
};
assert.equal(validateQuestion({ ...base }, new Set(['src_phase4'])).status, 'production');
const duplicate = validateQuestion({ ...base, options: ['Một', 'Hai', 'Một', 'Bốn'] }, new Set(['src_phase4']));
assert.equal(duplicate.status, 'review_required');
assert.ok(duplicate.validationIssues.includes('DUPLICATE_OPTIONS'));
const missingPage = validateQuestion({ ...base, source: { ...base.source, sourcePage: null } }, new Set(['src_phase4']));
assert.equal(missingPage.status, 'review_required');
const duplicateNumber = validateQuestion({ ...base, validationIssues: ['DUPLICATE_QUESTION_NUMBER'], parseDiagnostics: { duplicateQuestionNumber: true, sourcePage: 3 } }, new Set(['src_phase4']));
assert.equal(duplicateNumber.status, 'review_required');

const loader = require('../js/vact/bank/sourceBankLoader');
const loaderQuestion = { ...base, status: 'production' };
assert.equal(loader.getQuestionValidationFailureReason({ ...loaderQuestion, options: ['Một', 'Hai', 'Một', 'Bốn'] }, new Set(['src_phase4'])), 'DUPLICATE_OPTIONS');
assert.equal(loader.getQuestionValidationFailureReason(loaderQuestion, new Set(['src_phase4'])), null);

const production = JSON.parse(fs.readFileSync(path.join(root, 'data/vact/questions.json'), 'utf8'));
const review = JSON.parse(fs.readFileSync(path.join(root, 'data/vact/review-required.json'), 'utf8'));
assert.ok(production.length > 0);
assert.ok(production.every(q => q.status === 'production'));
assert.ok(production.every(q => Array.isArray(q.options) && new Set(q.options.map(o => String(o).replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim().toLowerCase())).size === q.options.length));
assert.ok(review.some(q => q.validationIssues?.includes('DUPLICATE_OPTIONS')));

console.log(JSON.stringify({
  parserDiagnostics: true,
  noPlaceholderOptions: true,
  duplicateNumberQuarantined: true,
  sourceLoaderRejectsDuplicateOptions: true,
  productionQuestions: production.length,
  reviewRequiredQuestions: review.length,
  productionDuplicateOptions: 0
}));
