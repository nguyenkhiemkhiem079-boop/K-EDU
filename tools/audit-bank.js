const fs = require('node:fs');
const path = require('node:path');
const bank = require('../js/documentQuestionBank');

function audit(questions) {
  const ids = new Set();
  const signatures = new Map();
  const report = { total: questions.length, unique: 0, duplicates: [], invalid: [], coverage: {} };
  for (const q of questions) {
    const errors = [];
    if (!q.id || ids.has(q.id)) errors.push('missing_or_duplicate_id');
    ids.add(q.id);
    const signature = bank.signature(q.question);
    if (!signature) errors.push('empty_question');
    if (!q.source) errors.push('missing_source');
    if (!q.correctAnswer) errors.push('missing_answer');
    if (q.type === 'mcq' && (!Array.isArray(q.options) || q.options.length !== 4 || !/^[ABCD]$/.test(q.correctAnswer))) errors.push('invalid_mcq');
    if (q.type === 'mcq' && Array.isArray(q.options) && new Set(q.options.map(bank.signature)).size !== q.options.length) errors.push('duplicate_options');
    if (errors.length) report.invalid.push({ id: q.id, errors });
    if (signatures.has(signature)) report.duplicates.push({ id: q.id, matches: signatures.get(signature) });
    else {
      signatures.set(signature, q.id);
      const key = [q.subject || 'toan', q.grade, q.topic, q.level, q.type].join('/');
      report.coverage[key] = (report.coverage[key] || 0) + 1;
    }
  }
  report.unique = signatures.size;
  return report;
}

if (require.main === module) {
  const output = path.resolve(process.argv[2] || 'tools/bank-audit.json');
  const report = audit(bank.questions);
  fs.writeFileSync(output, JSON.stringify(report, null, 2));
  const stats = { all: bank.getStats(), toan: bank.getStats('toan'), khtn: bank.getStats('khtn') };
  fs.writeFileSync(path.resolve('js/question-bank/stats.js'), 'window.QuestionBankStats = ' + JSON.stringify(stats) + ';\n');
  console.log(JSON.stringify({ total: report.total, unique: report.unique, duplicates: report.duplicates.length, invalid: report.invalid.length, output }));
}
module.exports = { audit };
