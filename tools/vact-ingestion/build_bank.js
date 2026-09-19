const fs = require('fs');
const path = require('path');
const { loadManifest, getIngestableSources } = require('./scan_sources');
const { extractDocument } = require('./extract_document');
const { parseQuestions } = require('./parse_questions');
const { matchSolutions } = require('./match_solutions');
const { normalizeQuestion } = require('./normalize_questions');
const { validateQuestions } = require('./validate_questions');
const { deduplicateQuestions } = require('./deduplicate_questions');
const { generateIngestionReport } = require('./report_ingestion');

async function buildBank(options = {}) {
  console.log('===============================================================');
  console.log('       K-EDU V-ACT SOURCE-BACKED QUESTION BANK INGESTION        ');
  console.log('===============================================================\n');

  const manifest = loadManifest();
  const sources = getIngestableSources();
  console.log(`[1/6] Scanning sources: Found ${manifest.length} total, ${sources.length} ingestable.`);

  let rawQuestions = [];
  let docsProcessed = 0;
  let docsFailed = 0;
  const examRecords = [];

  for (let i = 0; i < sources.length; i++) {
    const src = sources[i];
    // We only extract from question or combined documents (solution-only docs are processed via pairing)
    if (src.documentRole === 'solution') {
      continue;
    }

    try {
      const docData = await extractDocument(src, options);
      const parsed = parseQuestions(docData, src);
      const matched = await matchSolutions(parsed, src);
      const normalized = matched.map(q => normalizeQuestion(q, src));
      const validated = validateQuestions(normalized);

      rawQuestions.push(...validated);
      docsProcessed++;

      // If full test or official, record exam
      if (src.category === 'FULL_TEST' || src.category === 'OFFICIAL') {
        const prodCount = validated.filter(q => q.status === 'production').length;
        const qIds = validated.map(q => q.id);
        const expected = (src.structureVersion === '2025+' || src.structureVersion === 'legacy') ? 120 : validated.length;

        const sourceQuestionCount = validated.length;
        const answerVerifiedCount = validated.filter(q => q.quality?.answerVerified === true && /^[A-D]$/.test(q.correctAnswer || '')).length;
        const productionQuestionCount = validated.filter(q => q.status === 'production').length;
        const expectedQuestionCount = (src.structureVersion === '2025+' || src.structureVersion === 'legacy') ? 120 : sourceQuestionCount;
        examRecords.push({
          id: validated[0]?.source?.examSetId || `vact_exam_${src.sourceId}`,
          sourceId: src.sourceId,
          filename: src.filename,
          year: src.year,
          structureVersion: src.structureVersion,
          questionIds: qIds,
          expectedQuestionCount,
          sourceQuestionCount,
          answerVerifiedCount,
          extractedQuestionCount: sourceQuestionCount,
          productionQuestionCount,
          sourceComplete: sourceQuestionCount === expectedQuestionCount,
          answerComplete: answerVerifiedCount === expectedQuestionCount,
          productionComplete: productionQuestionCount === expectedQuestionCount,
          complete: productionQuestionCount === expectedQuestionCount,
          sourceBacked: true
        });
      }

      console.log(`[${i + 1}/${sources.length}] Processed ${src.filename}: ${validated.length} questions parsed.`);
    } catch (err) {
      docsFailed++;
      console.error(`[${i + 1}/${sources.length}] Failed to process ${src.filename}: ${err.message}`);
    }
  }

  console.log(`\n[2/6] Extraction summary: ${docsProcessed} docs processed, ${docsFailed} failed, ${rawQuestions.length} raw questions.`);

  // Deduplication
  console.log('[3/6] Running stimulus-aware deduplication across all sources...');
  const dedupeResult = deduplicateQuestions(rawQuestions, manifest);
  const { uniqueQuestions, duplicateQuestions } = dedupeResult;

  // Split into statuses
  const production = uniqueQuestions.filter(q => q.status === 'production');
  const reviewRequired = uniqueQuestions.filter(q => q.status === 'review_required');
  const invalid = uniqueQuestions.filter(q => q.status === 'invalid');

  console.log(`[4/6] Quality categorization:`);
  console.log(`   - Production Ready : ${production.length}`);
  console.log(`   - Review Required  : ${reviewRequired.length}`);
  console.log(`   - Invalid          : ${invalid.length}`);
  console.log(`   - Duplicates Merged: ${duplicateQuestions.length}`);

  // Section coverage of production questions
  const bySection = {
    vietnamese: 0,
    english: 0,
    math: 0,
    logic_data: 0,
    scientific_reasoning: 0
  };
  production.forEach(q => {
    if (bySection[q.section] !== undefined) {
      bySection[q.section]++;
    }
  });

  console.log(`\n[5/6] Production Coverage by Section:`);
  console.log(`   - Vietnamese           : ${bySection.vietnamese}`);
  console.log(`   - English              : ${bySection.english}`);
  console.log(`   - Math                 : ${bySection.math}`);
  console.log(`   - Logic/Data           : ${bySection.logic_data}`);
  console.log(`   - Scientific Reasoning : ${bySection.scientific_reasoning}`);

  // Readiness checks
  // Mini 100: 25 Viet, 25 Eng, 25 Math, 10 Logic, 15 Sci
  const mini100Ready = bySection.vietnamese >= 25 &&
                       bySection.english >= 25 &&
                       bySection.math >= 25 &&
                       bySection.logic_data >= 10 &&
                       bySection.scientific_reasoning >= 15;

  // Full 120: 30 Viet, 30 Eng, 30 Math, 12 Logic, 18 Sci
  const full120Ready = bySection.vietnamese >= 30 &&
                       bySection.english >= 30 &&
                       bySection.math >= 30 &&
                       bySection.logic_data >= 12 &&
                       bySection.scientific_reasoning >= 18;

  console.log(`   - Mini V-ACT 100 Ready : ${mini100Ready ? 'YES' : 'NO'}`);
  console.log(`   - Full V-ACT 120 Ready : ${full120Ready ? 'YES' : 'NO'}`);

  // Count sources by category
  const sourcesByCategory = {};
  manifest.forEach(s => {
    sourcesByCategory[s.category] = (sourcesByCategory[s.category] || 0) + 1;
  });

  const stats = {
    totalSources: manifest.length,
    ingestableSources: sources.length,
    sourcesByCategory,
    docsProcessed,
    docsFailed,
    totalRaw: rawQuestions.length,
    uniqueCount: uniqueQuestions.length,
    duplicateCount: duplicateQuestions.length,
    productionCount: production.length,
    reviewRequiredCount: reviewRequired.length,
    invalidCount: invalid.length,
    bySection,
    mini100Ready,
    full120Ready,
    totalExams: examRecords.length,
    completeExams: examRecords.filter(e => e.complete).length,
    incompleteExams: examRecords.filter(e => !e.complete).length
  };

  // Write data/vact/ files
  console.log('\n[6/6] Writing output bank files to data/vact/...');
  const dataDir = path.resolve('data', 'vact');
  const questionsShardDir = path.join(dataDir, 'questions');
  fs.mkdirSync(questionsShardDir, { recursive: true });

  fs.writeFileSync(path.join(dataDir, 'sources.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(dataDir, 'exams.json'), JSON.stringify(examRecords, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(dataDir, 'questions.json'), JSON.stringify(production, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(dataDir, 'review-required.json'), JSON.stringify(reviewRequired, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(dataDir, 'invalid.json'), JSON.stringify(invalid, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(dataDir, 'ingestion-report.json'), JSON.stringify(stats, null, 2) + '\n', 'utf8');

  // Shards
  const sections = ['vietnamese', 'english', 'math', 'logic_data', 'scientific_reasoning'];
  const shardNameMap = {
    vietnamese: 'vietnamese-001.json',
    english: 'english-001.json',
    math: 'math-001.json',
    logic_data: 'logic-data-001.json',
    scientific_reasoning: 'scientific-001.json'
  };

  sections.forEach(sec => {
    const secQuestions = production.filter(q => q.section === sec);
    fs.writeFileSync(path.join(questionsShardDir, shardNameMap[sec]), JSON.stringify(secQuestions, null, 2) + '\n', 'utf8');
  });

  // Generate markdown report
  generateIngestionReport(stats);
  console.log('Generated docs/vact-source-ingestion-report.md');
  console.log('Ingestion pipeline complete!\n');

  return stats;
}

if (require.main === module) {
  buildBank().catch(err => {
    console.error('Fatal error building bank:', err);
    process.exit(1);
  });
}

module.exports = {
  buildBank
};
