/* Safe post-ingestion hardening for the committed V-ACT bank. Never invents content. */
const fs = require('fs');
const path = require('path');

const dir = path.resolve('data/vact/questions');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
const strip = value => String(value ?? '').replace(/^\s*(?:\[[A-D]\]|[A-D])\s*(?:[.:)]|$)\s*/i, '').trim();
let changed = 0; let review = 0;
for (const file of files) {
  const p = path.join(dir, file); const bank = JSON.parse(fs.readFileSync(p, 'utf8'));
  for (const q of bank) {
    const before = JSON.stringify(q);
    q.options = Array.isArray(q.options) ? q.options.map(strip) : q.options;
    q.quality = q.quality || {};
    q.quality.requiresStimulus = /(?:dựa vào|đọc|cho thông tin|bảng số liệu|biểu đồ|hình dưới đây|ngữ liệu)/i.test(q.question || '');
    q.quality.requiresVisual = /(?:hình|biểu đồ|đồ thị|sơ đồ|bảng số liệu|hình vẽ)/i.test((q.question || '') + ' ' + (q.stimulus || ''));
    q.quality.stimulusPreserved = !q.quality.requiresStimulus || !!(q.stimulus && q.stimulus.length > 40);
    q.quality.visualPreserved = !q.quality.requiresVisual || /(?:hình|biểu đồ|đồ thị|sơ đồ|bảng)/i.test(q.stimulus || '');
    q.quality.contentComplete = q.quality.stimulusPreserved && q.quality.visualPreserved;
    const issues = [];
    if (!q.id || !/^vact_q_[a-f0-9]{12}$/i.test(q.id)) issues.push('UNSTABLE_ID');
    if (!q.source?.extractedFromSource) issues.push('MISSING_PROVENANCE');
    if (!q.correctAnswer || !/^[A-D]$/.test(q.correctAnswer)) issues.push('ANSWER_UNVERIFIED');
    if (q.options?.some(o => String(o).length > 500)) issues.push('OPTION_TOO_LONG');
    if (q.options?.some(o => /(?:Dựa vào thông tin dưới đây|Câu\s+\d+\s*[:.])/i.test(o))) issues.push('OPTION_SPILLOVER');
    if (!q.quality.contentComplete) issues.push('MISSING_REQUIRED_CONTENT');
    if (issues.length) { q.status = 'review_required'; q.validationIssues = [...new Set([...(q.validationIssues || []), ...issues])]; review++; }
    if (JSON.stringify(q) !== before) changed++;
  }
  fs.writeFileSync(p, JSON.stringify(bank, null, 2) + '\n');
}
const report = { timestamp: new Date().toISOString(), files, changed, reviewRequired: review, policy: 'safe-no-content-invention' };
fs.writeFileSync(path.resolve('data/vact/post-ingestion-hardening.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
