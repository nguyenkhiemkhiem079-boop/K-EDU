const assert = require('assert');
const fs = require('fs');
const path = require('path');
const files = fs.readdirSync(path.resolve('data/vact/questions')).filter(f => f.endsWith('.json'));
const questions = files.flatMap(f => JSON.parse(fs.readFileSync(path.resolve('data/vact/questions', f), 'utf8')));
const checks = [
  ['bank is non-empty', questions.length > 0],
  ['stable IDs', questions.every(q => /^vact_q_[a-f0-9]{12}$/i.test(q.id))],
  ['four options', questions.every(q => Array.isArray(q.options) && q.options.length === 4)],
  ['no duplicate option labels', questions.every(q => q.options.every(o => !/^\s*(?:\[[A-D]\]|[A-D])\s*[.:)]/i.test(o)))],
  ['answers A-D', questions.every(q => /^[A-D]$/.test(q.correctAnswer || ''))],
  ['source provenance', questions.every(q => q.source?.extractedFromSource === true)],
  ['no fabricated fallback section', questions.every(q => q.section && q.section !== 'unknown')],
  ['canonical option text', questions.every(q => q.options.every(o => typeof o === 'string'))],
  ['review retains content', questions.filter(q => q.status === 'review_required').every(q => q.question && q.options)],
  ['no localStorage clear in repair', !fs.readFileSync(path.resolve('tools/repair_vact_bank.js'), 'utf8').includes('localStorage.clear')]
];
for (const [name, ok] of checks) { assert.ok(ok, name); console.log(`PASS ${name}`); }
console.log(`PASS hardening checks (${checks.length})`);
