const assert = require('assert');
const fs = require('fs');
const path = require('path');
const parser = require('./vact-ingestion/parse_questions');
const quality = require('./vact-ingestion/content_quality');
const files = fs.readdirSync(path.resolve('data/vact/questions')).filter(f => f.endsWith('.json'));
const questions = files.flatMap(f => JSON.parse(fs.readFileSync(path.resolve('data/vact/questions', f), 'utf8')));
const runtimeQuestions = JSON.parse(fs.readFileSync(path.resolve('data/vact/questions.json'), 'utf8'));
const runtimeIds = new Set(runtimeQuestions.map(q => q.id));
const productionShardQuestions = questions.filter(q => q.status === 'production');
const checks = [
  ['bank is non-empty', questions.length > 0],
  ['stable IDs', questions.every(q => /^vact_q_[a-f0-9]{12}$/i.test(q.id))],
  ['four options', questions.every(q => Array.isArray(q.options) && q.options.length === 4)],
  ['no duplicate option labels', questions.every(q => q.options.every(o => !/^\s*(?:\[[A-D]\]|[A-D])\s*[.:)]/i.test(o)))],
  ['answers A-D', questions.every(q => /^[A-D]$/.test(q.correctAnswer || ''))],
  ['source provenance', questions.every(q => q.source?.extractedFromSource === true)],
  ['no fabricated fallback section', questions.every(q => q.section && q.section !== 'unknown')],
  ['canonical option text', questions.every(q => q.options.every(o => typeof o === 'string'))],
  ['questions.json production-only', runtimeQuestions.every(q => q.status === 'production')],
  ['questions.json equals production shards', runtimeQuestions.length === productionShardQuestions.length && productionShardQuestions.every(q => runtimeIds.has(q.id))],
  ['no confirmed spillover', runtimeQuestions.every(q => !q.validationIssues?.includes('OPTION_SPILLOVER'))],
  ['no malformed production', runtimeQuestions.every(q => !q.validationIssues?.includes('MALFORMED_QUESTION_TEXT'))],
  ['no missing required content', runtimeQuestions.every(q => q.quality?.contentComplete === true)],
  ['review retains content', questions.filter(q => q.status === 'review_required').every(q => q.question && q.options)],
  ['no localStorage clear in repair', !fs.readFileSync(path.resolve('tools/repair_vact_bank.js'), 'utf8').includes('localStorage.clear')]
  , ['plain option a preserved', parser.cleanOption('a') === 'a']
  , ['plain option b preserved', parser.cleanOption('b') === 'b']
  , ['punctuated label stripped', parser.cleanOption('A. foo') === 'foo']
  , ['same-line trailing split', parser.findTrailingContentBoundary('answer. Dựa vào thông tin sau đây') < 40]
  , ['placeholder detected', quality.isPlaceholderStimulus('Dựa vào thông tin dưới đây để trả lời các câu hỏi từ câu 95 đến 98')]
  , ['dependency detected', quality.questionRequiresStimulus('Theo đoạn văn trên, ý nào đúng?', null)]
  , ['publisher question remains valid', !quality.isMalformedQuestionText('(TAQ Education) Chọn câu không mắc lỗi')]
  , ['publisher answer fragment malformed', quality.isMalformedQuestionText('(TAQ Education) Đáp án C')]
  , ['paired source refs resolve', (() => { const s = JSON.parse(fs.readFileSync(path.resolve('data/vact/sources.json'))); const ids = new Set(s.map(x => x.sourceId)); return s.every(x => !x.pairedSourceId || ids.has(x.pairedSourceId)); })()]
  , ['migration map meaningful', Object.keys(JSON.parse(fs.readFileSync(path.resolve('data/vact/id-migration.json')))).length > 0]
];
for (const [name, ok] of checks) { assert.ok(ok, name); console.log(`PASS ${name}`); }
console.log(`PASS hardening checks (${checks.length})`);
