const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const old = JSON.parse(cp.execFileSync('git', ['show', '0675a735:data/vact/questions.json'], { encoding: 'utf8', maxBuffer: 100 * 1024 * 1024 }));
const q20 = old.find(q => q.id === 'vact_q_f2dfc6ae5182');
if (!q20) throw new Error('known Q20 fixture not found');
const marker = q20.options[3].search(/Dựa vào thông tin dưới đây/iu);
if (marker < 0) throw new Error('known Q20 stimulus marker not found');
const recovered = q20.options[3].slice(marker).trim();
const root = path.resolve('data/vact');
const files = fs.readdirSync(path.join(root, 'questions')).filter(f => f.endsWith('.json'));
let updated = 0;
for (const file of files) {
  const p = path.join(root, 'questions', file); const rows = JSON.parse(fs.readFileSync(p, 'utf8'));
  for (const q of rows) {
    if (q.source?.examSetId === q20.source.examSetId && q.source.questionNumber >= 21 && q.source.questionNumber <= 25) {
      q.stimulus = recovered; q.quality = q.quality || {}; q.quality.requiresStimulus = true; q.quality.stimulusPreserved = true; q.quality.contentComplete = !q.quality.requiresVisual || q.quality.visualPreserved === true; updated++;
    }
  }
  fs.writeFileSync(p, JSON.stringify(rows, null, 2) + '\n');
}
const all = files.flatMap(f => JSON.parse(fs.readFileSync(path.join(root, 'questions', f), 'utf8')));
for (const file of ['questions.json', 'review-required.json']) {
  const p = path.join(root, file); if (!fs.existsSync(p)) continue;
  const rows = JSON.parse(fs.readFileSync(p, 'utf8')); const map = new Map(all.map(q => [q.id, q]));
  const out = rows.map(q => map.get(q.id) || q); fs.writeFileSync(p, JSON.stringify(file === 'questions.json' ? out.filter(q => q.status === 'production') : out.filter(q => q.status === 'review_required'), null, 2) + '\n');
}
console.log(JSON.stringify({ updated, stimulusLength: recovered.length }, null, 2));
