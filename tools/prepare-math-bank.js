const fs = require('node:fs');
const path = require('node:path');
const { parsePdfQuestions } = require('./extract-questions');
const bank = require('../js/documentQuestionBank');
const seen = new Set(bank.questions.map(q => bank.signature(q.question)));
const candidates = [];
const report = { extracted: 0, candidates: 0, newUniqueCandidates: 0, byGrade: {}, missingPdfGrades: [] };
const combinedFile = 'tools/math-expanded-review.json';
const combined = fs.existsSync(combinedFile) ? JSON.parse(fs.readFileSync(combinedFile, 'utf8')) : null;
for (const grade of ['6', '7', '8', '9', '10', '11', '12']) {
  const directory = path.join('TÀI LIỆU', 'TOÁN', 'LỚP ' + grade);
  const hasPdfs = fs.existsSync(directory) && fs.readdirSync(directory).some(name => name.toLowerCase().endsWith('.pdf'));
  if (!hasPdfs) report.missingPdfGrades.push(grade);
  const filename = `tools/math-${grade}-review.json`;
  if (!combined && !fs.existsSync(filename) && hasPdfs) throw new Error('Missing extraction: ' + filename);
  const questions = combined ? combined.filter(q => String(q.grade) === grade) : (fs.existsSync(filename) ? JSON.parse(fs.readFileSync(filename, 'utf8')) : []);
  const stats = { extracted: questions.length, eligible: 0, pending: 0 };
  report.extracted += questions.length;
  for (const q of questions) {
    if (q.confidence !== 'high' || q.answerEvidence !== 'inline_solution') { stats.pending++; continue; }
    const labelled = q.options?.every(o => /^[a-dA-D][.)]/.test(o.trim()));
    const options = (q.options || []).map((o, i) => labelled ? o : `${'ABCD'[i]}. ${o}`);
    const text = `Câu 1. ${q.question}\n${options.join('\n')}\n${q.explanation || ''}`;
    const repaired = parsePdfQuestions(text, q.sourceFile, q.source + '.pdf')[0];
    if (!repaired || repaired.confidence !== 'high' || /hình (vẽ|bên|sau)|đồ thị (sau|bên)|bảng (sau|dưới)|cho trong hình|theo hình/i.test(repaired.question)) { stats.pending++; continue; }
    candidates.push(repaired);
    stats.eligible++;
    const signature = bank.signature(repaired.question);
    if (!seen.has(signature)) { seen.add(signature); report.newUniqueCandidates++; }
  }
  report.byGrade[grade] = stats;
}
report.candidates = candidates.length;
fs.writeFileSync('tools/math-expanded-candidates.json', JSON.stringify(candidates, null, 2));
fs.writeFileSync('tools/math-expansion-report.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
