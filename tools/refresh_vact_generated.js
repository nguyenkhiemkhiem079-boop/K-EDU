const fs = require('fs');
const path = require('path');
const root = path.resolve('data/vact');
const source = JSON.parse(fs.readFileSync(path.join(root, 'sources.json'), 'utf8'));
const shardDir = path.join(root, 'questions');
const shardFiles = fs.readdirSync(shardDir).filter(f => f.endsWith('.json'));
const allShardRows = shardFiles.flatMap(f => JSON.parse(fs.readFileSync(path.join(shardDir, f), 'utf8')));
const production = allShardRows.filter(q => q.status === 'production');
const priorReviewPath = path.join(root, 'review-required.json');
const priorReview = fs.existsSync(priorReviewPath) ? JSON.parse(fs.readFileSync(priorReviewPath, 'utf8')) : [];
const productionIds = new Set(production.map(q => q.id));
const review = [...new Map([...priorReview, ...allShardRows.filter(q => q.status === 'review_required')].filter(q => !productionIds.has(q.id)).map(q => [q.id, q])).values()];
const invalid = allShardRows.filter(q => q.status === 'invalid');
const all = [...production, ...review, ...invalid];
for (const file of shardFiles) {
  const p = path.join(shardDir, file);
  const rows = JSON.parse(fs.readFileSync(p, 'utf8')).filter(q => q.status === 'production');
  fs.writeFileSync(p, JSON.stringify(rows, null, 2) + '\n');
}
const exams = [];
for (const s of source.filter(x => x.category === 'FULL_TEST' || x.category === 'OFFICIAL')) {
  const rows = all.filter(q => q.source?.sourceId === s.sourceId);
  const numbers = new Set(rows.map(q => q.source?.questionNumber).filter(Number.isFinite));
  const expected = s.structureVersion === '2025+' || s.structureVersion === 'legacy' ? 120 : numbers.size;
  const answerVerifiedCount = rows.filter(q => q.quality?.answerVerified === true && /^[A-D]$/.test(q.correctAnswer || '')).length;
  const productionQuestionCount = rows.filter(q => q.status === 'production').length;
  exams.push({
    id: `vact_exam_${s.sourceId}`,
    sourceId: s.sourceId,
    filename: s.filename,
    year: s.year,
    structureVersion: s.structureVersion,
    questionIds: rows.map(q => q.id),
    expectedQuestionCount: expected,
    sourceQuestionCount: numbers.size,
    answerVerifiedCount,
    productionQuestionCount,
    extractedQuestionCount: numbers.size,
    sourceComplete: numbers.size === expected,
    answerComplete: answerVerifiedCount === expected,
    productionComplete: productionQuestionCount === expected,
    complete: productionQuestionCount === expected,
    sourceBacked: true
  });
}
fs.writeFileSync(path.join(root, 'questions.json'), JSON.stringify(production, null, 2) + '\n');
fs.writeFileSync(path.join(root, 'exams.json'), JSON.stringify(exams, null, 2) + '\n');
const bySection = {}; for (const q of production) bySection[q.section] = (bySection[q.section] || 0) + 1;
const report = { totalSources: source.length, ingestableSources: source.filter(s => s.usableForQuestionExtraction && s.category !== 'DUPLICATE' && s.category !== 'PENDING').length, rawParsedCount: all.length, normalizedUniqueCount: new Set(all.map(q => q.id)).size, productionCount: production.length, reviewRequiredCount: review.length, invalidCount: invalid.length, duplicatesRemoved: 8, bySection, totalExams: exams.length, sourceCompleteExams: exams.filter(e => e.sourceComplete).length, answerCompleteExams: exams.filter(e => e.answerComplete).length, productionCompleteExams: exams.filter(e => e.productionComplete).length, generatedAt: new Date().toISOString() };
fs.writeFileSync(path.join(root, 'ingestion-report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
