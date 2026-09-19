/* Safe post-ingestion hardening for the committed V-ACT bank. Never invents content. */
const fs = require('fs');
const path = require('path');
const quality = require('./vact-ingestion/content_quality');

const dir = path.resolve('data/vact/questions');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
const strip = quality.stripOptionLabel;
let changed = 0; let review = 0;
const priorReviewPath = path.resolve('data/vact/review-required.json');
const priorReview = fs.existsSync(priorReviewPath) ? JSON.parse(fs.readFileSync(priorReviewPath, 'utf8')) : [];
const reviewRecords = []; const invalidRecords = [];
for (const file of files) {
  const p = path.join(dir, file); const bank = JSON.parse(fs.readFileSync(p, 'utf8'));
  let pendingStimulus = null; let pendingUntil = 0;
  for (let index = 0; index < bank.length; index++) {
    const q = bank[index];
    const before = JSON.stringify(q);
    q.validationIssues = (q.validationIssues || []).filter(i => !['MISSING_REQUIRED_CONTENT','OPTION_TOO_LONG','INVALID_OPTIONS','OPTION_SPILLOVER','MALFORMED_QUESTION_TEXT'].includes(i));
    if (q.status === 'review_required' && q.validationIssues.length === 0) q.status = 'production';
    q.options = Array.isArray(q.options) ? q.options.map(strip) : q.options;
    if (pendingStimulus && q.source?.questionNumber <= pendingUntil && (!q.stimulus || quality.isPlaceholderStimulus(q.stimulus))) q.stimulus = pendingStimulus;
    if (Array.isArray(q.options) && q.options.length === 4) {
      const spill = q.options[3].match(/\s+(?=(?:Dựa vào thông tin dưới đây|Dựa vào đoạn|Đọc đoạn|Sử dụng thông tin|Sử dụng dữ liệu|Trả lời các câu từ))/iu);
      if (spill) {
        const cut = spill.index;
        const tail = q.options[3].slice(cut).trim();
        q.options[3] = q.options[3].slice(0, cut).trim();
        pendingStimulus = tail;
        const range = tail.match(/(?:câu|question)\s+(\d+)\s*(?:đến|-|–)\s*(\d+)/iu);
        pendingUntil = range ? Number(range[2]) : (q.source?.questionNumber || 0) + 4;
        const next = bank[index + 1];
        if (next && (!next.stimulus || quality.isPlaceholderStimulus(next.stimulus))) next.stimulus = tail;
      }
    }
    q.quality = q.quality || {};
    q.quality.requiresStimulus = quality.questionRequiresStimulus(q.question, q.stimulus);
    q.quality.requiresVisual = quality.questionRequiresVisual(q.question, q.stimulus);
    q.quality.stimulusPreserved = !q.quality.requiresStimulus || quality.hasActualStimulusContent(q.stimulus);
    q.quality.visualPreserved = !q.quality.requiresVisual || (Array.isArray(q.assets) && q.assets.length > 0);
    q.quality.contentComplete = q.quality.stimulusPreserved && q.quality.visualPreserved;
    const issues = [];
    if (!q.id || !/^vact_q_[a-f0-9]{12}$/i.test(q.id)) issues.push('UNSTABLE_ID');
    if (!q.source?.extractedFromSource) issues.push('MISSING_PROVENANCE');
    if (!q.correctAnswer || !/^[A-D]$/.test(q.correctAnswer)) issues.push('ANSWER_UNVERIFIED');
    if (q.options?.some(o => String(o).length > 500)) issues.push('OPTION_TOO_LONG');
    if (!Array.isArray(q.options) || q.options.length !== 4 || q.options.some(o => !String(o).trim())) issues.push('INVALID_OPTIONS');
    if (q.options?.some(quality.hasCriticalOptionSpillover)) issues.push('OPTION_SPILLOVER');
    if (quality.isMalformedQuestionText(q.question)) issues.push('MALFORMED_QUESTION_TEXT');
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
const productionIds = new Set(all.filter(q => q.status === 'production').map(q => q.id));
const mergedReview = [...new Map([...priorReview, ...reviewRecords].filter(q => !productionIds.has(q.id)).map(q => [q.id, q])).values()];
fs.writeFileSync(path.resolve('data/vact/review-required.json'), JSON.stringify(mergedReview, null, 2) + '\n');
fs.writeFileSync(path.resolve('data/vact/invalid.json'), JSON.stringify(invalidRecords, null, 2) + '\n');
const report = { timestamp: new Date().toISOString(), files, changed, reviewRequired: mergedReview.length, policy: 'safe-no-content-invention' };
fs.writeFileSync(path.resolve('data/vact/post-ingestion-hardening.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
