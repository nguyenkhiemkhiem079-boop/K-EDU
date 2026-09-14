const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { parsePdfQuestions } = require('./extract-questions');
const source = 'Câu 1. Tính tổng của hai số 2 và 3.\nA. 5\nB. 6\nC. 7\nD. 8\nLời giải: Chọn A.\n';
const scoped = parsePdfQuestions(source, 'LOP 8/example.pdf', 'example.pdf');
assert.equal(scoped[0].correctAnswer, 'A');
assert.equal(scoped[0].answerEvidence, 'inline_solution');
const statements = parsePdfQuestions('Câu 1. Có bao nhiêu khẳng định đúng?\na) Một ý trong đề.\nb) Một ý khác.\nc) Ý thứ ba.\nd) Ý thứ tư.\nA. 1\nB. 2\nC. 3\nD. 4\nLời giải: Chọn B.', 'LOP 8/example.pdf', 'example.pdf')[0];
assert.ok(statements.question.includes('d) Ý thứ tư.'));
assert.deepEqual(statements.options, ['1', '2', '3', '4']);
const ambiguous = parsePdfQuestions(source.replace('Lời giải: Chọn A.', '') + source.replace('Lời giải: Chọn A.', '') + '\nBẢNG ĐÁP ÁN\n1. B', 'LOP 8/example.pdf', 'example.pdf');
assert.ok(ambiguous.every(q => q.confidence === 'low' && !q.correctAnswer));

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'kedu-bank-import-'));
const bankDir = path.join(directory, 'js');
fs.mkdirSync(bankDir);
const bankFile = path.join(bankDir, 'documentQuestionBank.js');
const reviewFile = path.join(directory, 'review.json');
try {
  fs.writeFileSync(bankFile, `const DocumentQuestionBank = { questions: [
    {id:'existing', question:'Existing question', grade:'8', type:'mcq'}
  ],
  /**
   * Truy vấn câu hỏi
   */
  signature(text) { return String(text).normalize('NFC').trim().replace(/\\s+/g, ' '); },
  registerQuestions(questions) { this.questions.push(...questions); },
  getQuestions() { return this.questions; }
}; module.exports = DocumentQuestionBank;
if (require('fs').existsSync(__dirname + '/question-bank/toan-8.js')) DocumentQuestionBank.registerQuestions(require('./question-bank/toan-8.js'));`);
  const question = { grade: '8', topic: 'dai_so', level: 'TH', type: 'mcq', source: 'Fixture', sourceFile: 'fixture.pdf', question: 'A new verified question?', options: ['1', '2', '3', '4'], correctAnswer: 'A', confidence: 'high', answerEvidence: 'inline_solution' };
  const run = () => {
    const result = spawnSync(process.execPath, [path.resolve(__dirname, 'extract-questions.js'), '--commit', '--from-review', '--output', reviewFile], { cwd: directory, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  };
  fs.writeFileSync(reviewFile, JSON.stringify([question, { ...question, question: 'Existing question' }, { ...question, question: 'Unverified question?', answerEvidence: 'unverified' }]));
  run();
  const first = fs.readFileSync(bankFile, 'utf8');
  const shardFile = path.join(bankDir, 'question-bank', 'toan-8.js');
  const firstShard = fs.readFileSync(shardFile, 'utf8');
  run();
  assert.equal(fs.readFileSync(bankFile, 'utf8'), first);
  assert.equal(fs.readFileSync(shardFile, 'utf8'), firstShard);
  fs.writeFileSync(reviewFile, JSON.stringify([{ ...question, question: 'Another verified question?' }]));
  run();
  const bank = require(bankFile);
  assert.equal(bank.questions.length, 3);
  assert.equal(new Set(bank.questions.map(q => q.id)).size, 3);
} finally {
  const shardFile = path.join(bankDir, 'question-bank', 'toan-8.js');
  if (fs.existsSync(shardFile)) fs.unlinkSync(shardFile);
  if (fs.existsSync(path.dirname(shardFile))) fs.rmdirSync(path.dirname(shardFile));
  fs.unlinkSync(bankFile);
  fs.unlinkSync(reviewFile);
  fs.rmdirSync(bankDir);
  fs.rmdirSync(directory);
}
console.log('PASS: scoped answer evidence, repeated imports, existing duplicates and ID collisions');
