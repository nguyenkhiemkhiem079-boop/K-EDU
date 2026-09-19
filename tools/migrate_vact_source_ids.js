const fs = require('fs');
const path = require('path');
const root = path.resolve('data/vact');
const sourcesPath = path.join(root, 'sources.json');
const sources = JSON.parse(fs.readFileSync(sourcesPath, 'utf8'));
const migration = {};
for (const s of sources) {
  if (!s.fileHash) continue;
  const stable = `vact_src_${String(s.fileHash).replace(/[^a-f0-9]/gi, '').slice(0, 16).toLowerCase()}`;
  if (s.sourceId && s.sourceId !== stable) migration[s.sourceId] = stable;
  s.sourceId = stable;
}
fs.writeFileSync(sourcesPath, JSON.stringify(sources, null, 2) + '\n');
fs.writeFileSync(path.join(root, 'id-migration.json'), JSON.stringify(migration, null, 2) + '\n');
for (const file of ['questions.json', 'review-required.json', 'invalid.json']) {
  const p = path.join(root, file); if (!fs.existsSync(p)) continue;
  const rows = JSON.parse(fs.readFileSync(p, 'utf8'));
  for (const q of rows) {
    for (const key of ['sourceId', 'questionSourceId', 'solutionSourceId']) {
      if (q.source?.[key] && migration[q.source[key]]) q.source[key] = migration[q.source[key]];
    }
  }
  fs.writeFileSync(p, JSON.stringify(rows, null, 2) + '\n');
}
for (const file of fs.readdirSync(path.join(root, 'questions')).filter(f => f.endsWith('.json'))) {
  const p = path.join(root, 'questions', file); const rows = JSON.parse(fs.readFileSync(p, 'utf8'));
  for (const q of rows) for (const key of ['sourceId', 'questionSourceId', 'solutionSourceId']) if (q.source?.[key] && migration[q.source[key]]) q.source[key] = migration[q.source[key]];
  fs.writeFileSync(p, JSON.stringify(rows, null, 2) + '\n');
}
console.log(JSON.stringify({ migrated: Object.keys(migration).length }, null, 2));
