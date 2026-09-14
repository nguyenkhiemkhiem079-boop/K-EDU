const fs = require('node:fs');
const path = require('node:path');
const bank = require('../js/documentQuestionBank');
const policy = require('../js/specializedBankPolicy');
const inputIndex = process.argv.indexOf('--apply');
if (inputIndex >= 0) {
  const reviews = JSON.parse(fs.readFileSync(process.argv[inputIndex + 1], 'utf8'));
  const updates = new Map();
  for (const review of reviews) {
    if (review.status !== 'approved') continue;
    const q = bank.questions.find(item => item.id === review.questionId);
    if (!q) throw new Error('Unknown question: ' + review.questionId);
    const proposed = { ...q, level: 'VDC', curation: review };
    if (!policy.isApproved(proposed)) throw new Error('Missing or stale source/difficulty/answer review: ' + q.id);
    if (!fs.existsSync(q.sourceFile)) throw new Error('Source PDF missing: ' + q.sourceFile);
    updates.set(q.id, proposed);
  }
  const writes = [];
  for (const name of fs.readdirSync('js/question-bank').filter(name => /^toan-.*\.js$/.test(name))) {
    const filename = path.join('js/question-bank', name);
    const source = fs.readFileSync(filename, 'utf8');
    const start = source.indexOf('const questions = ') + 'const questions = '.length;
    const end = source.slice(start).startsWith('[];') ? start + 2 : source.indexOf('\n];', start) + 2;
    if (start < 'const questions = '.length || end < start) throw new Error('Invalid shard: ' + filename);
    const questions = JSON.parse(source.slice(start, end));
    let changed = false;
    for (let i = 0; i < questions.length; i++) {
      if (updates.has(questions[i].id)) { questions[i] = updates.get(questions[i].id); updates.delete(questions[i].id); changed = true; }
    }
    if (changed) writes.push([filename, source.slice(0, start) + JSON.stringify(questions, null, 2) + source.slice(end)]);
  }
  if (updates.size) throw new Error('Legacy base-bank questions need a separate migration; no files written: ' + [...updates.keys()].join(', '));
  for (const [filename, source] of writes) fs.writeFileSync(filename, source);
  console.log(JSON.stringify({ updatedShards: writes.length }));
} else {
  const candidates = [];
  const marker = /THPT\s+[Cc][Hh][Uu][Yy][Êê][Nn]\s+[^)\n,]{2,90}/u;
  const existing = new Map(bank.questions.map(q => [policy.signature(q.question), q]));
  for (const grade of [7, 8, 9, 10, 11, 12]) {
    const filename = `tools/math-${grade}-review.json`;
    if (!fs.existsSync(filename)) continue;
    for (const q of JSON.parse(fs.readFileSync(filename, 'utf8'))) {
      const evidence = (q.question || '').match(marker)?.[0];
      if (!evidence) continue;
      const saved = existing.get(policy.signature(q.question));
      candidates.push({ questionId: saved?.id || null, status: 'pending', sourceType: 'specialized_school',
        schoolName: evidence, sourceFile: q.sourceFile, sourcePage: null, sourceEvidence: evidence,
        documentOriginVerified: false, difficultyReviewed: false, answerReviewed: false,
        questionSignature: policy.signature(saved?.question || q.question),
        answerSignature: policy.signature(saved?.correctAnswer || q.correctAnswer),
        currentLevel: saved?.level || q.level, question: saved?.question || q.question,
        options: saved?.options || q.options, correctAnswer: saved?.correctAnswer || q.correctAnswer,
        note: 'Source annotation is a candidate only. Check original PDF page, school attribution, VDC reasoning and answer; do not approve an entire compilation.' });
    }
  }
  fs.writeFileSync('tools/specialized-school-review.json', JSON.stringify(candidates, null, 2));
  const report = { candidates: candidates.length, matchedExisting: candidates.filter(q => q.questionId).length,
    approvedVdc: bank.questions.filter(q => policy.isApproved(q)).length,
    sources: [...new Set(candidates.map(q => q.sourceFile))] };
  fs.writeFileSync('tools/specialized-school-report.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
}
