/* Safe post-ingestion hardening for the committed V-ACT bank. Never invents content. */
const fs = require('fs');
const path = require('path');

const dir = path.resolve('data/vact/questions');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
const strip = value => String(value ?? '').replace(/^\s*(?:\[[A-D]\]|[A-D])\s*(?:[.:)]|\s-\s)\s+/i, '').trim();
let changed = 0; let review = 0;
const reviewRecords = []; const invalidRecords = [];
for (const file of files) {
  const p = path.join(dir, file); const bank = JSON.parse(fs.readFileSync(p, 'utf8'));
  for (let index = 0; index < bank.length; index++) {
    const q = bank[index];
    const before = JSON.stringify(q);
    q.options = Array.isArray(q.options) ? q.options.map(strip) : q.options;
    if (Array.isArray(q.options) && q.options.length === 4) {
      const spill = q.options[3].match(/\s+(?=(?:Dựa vào thông tin dưới đây|Dựa vào đoạn|Đọc đoạn|Sử dụng thông tin|Sử dụng dữ liệu|Trả lời các câu từ))/iu);
      if (spill) {
        const cut = spill.index;
        const tail = q.options[3].slice(cut).trim();
        q.options[3] = q.options[3].slice(0, cut).trim();
        const next = bank[index + 1];
        if (next && !next.stimulus) next.stimulus = tail;
      }
    }
    q.quality = q.quality || {};
    q.quality.requiresStimulus = /(?:dựa vào|đọc|cho thông tin|bảng số liệu|biểu đồ|hình dưới đây|ngữ liệu|đoạn văn trên|đoạn trích trên|văn bản trên|thông tin trên|bảng trên|hình trên|biểu đồ trên|theo đoạn văn|theo đoạn trích|dựa vào nội dung|according to the passage|according to the text|according to the chart|according to the table|figure above|table above)/i.test(q.question || '');
    q.quality.requiresVisual = /(?:hình|biểu đồ|đồ thị|sơ đồ|bảng số liệu|hình vẽ)/i.test((q.question || '') + ' ' + (q.stimulus || ''));
    const stimulusText = String(q.stimulus || '').replace(/\s+/g, ' ').trim();
    const placeholder = !stimulusText || stimulusText.length < 40 || /^(?:dựa vào|đọc|sử dụng|cho)\s+(?:thông tin|đoạn|dữ liệu|bảng|biểu đồ)[^.!?]{0,80}(?:dưới đây|trên)?\s*$/iu.test(stimulusText);
    q.quality.stimulusPreserved = !q.quality.requiresStimulus || !placeholder;
    q.quality.visualPreserved = !q.quality.requiresVisual || (Array.isArray(q.assets) && q.assets.length > 0);
    q.quality.contentComplete = q.quality.stimulusPreserved && q.quality.visualPreserved;
    const issues = [];
    if (!q.id || !/^vact_q_[a-f0-9]{12}$/i.test(q.id)) issues.push('UNSTABLE_ID');
    if (!q.source?.extractedFromSource) issues.push('MISSING_PROVENANCE');
    if (!q.correctAnswer || !/^[A-D]$/.test(q.correctAnswer)) issues.push('ANSWER_UNVERIFIED');
    if (q.options?.some(o => String(o).length > 500)) issues.push('OPTION_TOO_LONG');
    if (!Array.isArray(q.options) || q.options.length !== 4 || q.options.some(o => !String(o).trim())) issues.push('INVALID_OPTIONS');
    if (q.options?.some(o => /(?:Dựa vào thông tin dưới đây|Dựa vào đoạn|Câu\s+\d+\s*[:.])/i.test(o))) issues.push('OPTION_SPILLOVER');
    if (!q.quality.contentComplete) issues.push('MISSING_REQUIRED_CONTENT');
    if (issues.length) { q.status = 'review_required'; q.validationIssues = [...new Set([...(q.validationIssues || []), ...issues])]; review++; }
    if (q.status === 'review_required') reviewRecords.push(q);
    if (q.status === 'invalid') invalidRecords.push(q);
    if (JSON.stringify(q) !== before) changed++;
  }
  fs.writeFileSync(p, JSON.stringify(bank, null, 2) + '\n');
}
const all = files.flatMap(file => JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')));
fs.writeFileSync(path.resolve('data/vact/questions.json'), JSON.stringify(all.filter(q => q.status === 'production'), null, 2) + '\n');
fs.writeFileSync(path.resolve('data/vact/review-required.json'), JSON.stringify(reviewRecords, null, 2) + '\n');
fs.writeFileSync(path.resolve('data/vact/invalid.json'), JSON.stringify(invalidRecords, null, 2) + '\n');
const report = { timestamp: new Date().toISOString(), files, changed, reviewRequired: review, policy: 'safe-no-content-invention' };
fs.writeFileSync(path.resolve('data/vact/post-ingestion-hardening.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
