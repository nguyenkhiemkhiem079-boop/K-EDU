const fs = require('node:fs');
const path = require('node:path');
const childProcess = require('node:child_process');
const quality = require('./content_quality');
const { createContentCorruptionReport, getFieldIssues } = require('./content_corruption_report');

const ROOT = path.resolve(__dirname, '../..');
const DATA_DIR = path.join(ROOT, 'data', 'vact');
const SHARD_DIR = path.join(DATA_DIR, 'questions');

function readJson(relativePath, baselineCommit) {
  if (baselineCommit) {
    const raw = childProcess.execFileSync('git', ['show', `${baselineCommit}:${relativePath}`], {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 256 * 1024 * 1024
    });
    return JSON.parse(raw);
  }
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

function writeJson(relativePath, value) {
  const target = path.join(ROOT, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function countBySection(questions) {
  const counts = { vietnamese: 0, english: 0, math: 0, logic_data: 0, scientific_reasoning: 0 };
  for (const question of questions) {
    if (counts[question.section] !== undefined) counts[question.section]++;
  }
  return counts;
}

function getProfileReadiness(bySection) {
  const profiles = require('../../js/vact/profiles').VACT_PROFILES;
  const result = {};
  for (const [profileId, profile] of Object.entries(profiles)) {
    const missing = Object.fromEntries(Object.entries(profile.sections).map(([section, required]) => [section, Math.max(0, required - (bySection[section] || 0))]));
    result[profileId] = {
      runtimeReady: Object.values(missing).every(value => value === 0),
      required: profile.totalQuestions,
      generated: profile.totalQuestions - Object.values(missing).reduce((sum, value) => sum + value, 0),
      missing
    };
  }
  return result;
}

function markReviewRequired(question, analysis) {
  const next = JSON.parse(JSON.stringify(question));
  const visible = analysis.studentVisible;
  next.status = 'review_required';
  next.quality = {
    ...(next.quality || {}),
    extractionVerified: false,
    contentComplete: false,
    explanationRepairRequired: Boolean(analysis.fields.explanation.length)
  };
  next.validationIssues = [...new Set([
    ...(Array.isArray(next.validationIssues) ? next.validationIssues : []),
    ...analysis.issues,
    visible ? 'MATH_CONTENT_CORRUPTED' : 'MATH_EXPLANATION_REPAIR_REQUIRED'
  ])];
  return next;
}

function quarantineCorrupted(options = {}) {
  const baselineCommit = options.baselineCommit || null;
  const baselineProduction = readJson('data/vact/questions.json', baselineCommit);
  const baselineReview = readJson('data/vact/review-required.json', baselineCommit);
  const baselineInvalid = readJson('data/vact/invalid.json', baselineCommit);
  const baselineExams = readJson('data/vact/exams.json', baselineCommit);
  const baselineSources = readJson('data/vact/sources.json', baselineCommit);
  const baselineIngestion = readJson('data/vact/ingestion-report.json', baselineCommit);
  const sourceRepairs = readJson('tools/vact-ingestion/source-repairs.json', null);

  const cleanProduction = [];
  const quarantined = [];
  for (const question of baselineProduction) {
    const analysis = getFieldIssues(question);
    if (analysis.issues.length) quarantined.push(markReviewRequired(question, analysis));
    else cleanProduction.push(question);
  }

  const quarantinedById = new Map(quarantined.map(question => [question.id, question]));
  const repairedProduction = [];
  for (const repair of sourceRepairs) {
    const original = quarantinedById.get(repair.id);
    if (!original) throw new Error(`SOURCE_REPAIR_TARGET_NOT_QUARANTINED:${repair.id}`);
    if (original.source?.sourceFile !== repair.sourceFile || original.source?.sourcePage !== repair.sourcePage) {
      throw new Error(`SOURCE_REPAIR_PROVENANCE_MISMATCH:${repair.id}`);
    }
    if (original.source?.solutionSourceFile !== repair.solutionSourceFile || original.source?.solutionSourcePage !== repair.solutionSourcePage) {
      throw new Error(`SOURCE_REPAIR_SOLUTION_PROVENANCE_MISMATCH:${repair.id}`);
    }
    if (original.correctAnswer !== repair.correctAnswer) {
      throw new Error(`SOURCE_REPAIR_ANSWER_MISMATCH:${repair.id}`);
    }
    const repaired = {
      ...original,
      question: repair.question,
      options: repair.options,
      stimulus: repair.stimulus,
      explanation: repair.explanation,
      correctAnswer: repair.correctAnswer,
      status: 'production',
      quality: {
        ...(original.quality || {}),
        extractionVerified: true,
        contentComplete: true,
        explanationRepairRequired: false,
        reviewed: true
      },
      validationIssues: [],
      sourceRepair: {
        sourceFile: repair.sourceFile,
        sourcePage: repair.sourcePage,
        solutionSourceFile: repair.solutionSourceFile,
        solutionSourcePage: repair.solutionSourcePage,
        basis: repair.repairBasis
      }
    };
    if (getFieldIssues(repaired).issues.length) throw new Error(`SOURCE_REPAIR_STILL_CORRUPTED:${repair.id}`);
    repairedProduction.push(repaired);
  }
  const repairedIds = new Set(repairedProduction.map(question => question.id));
  const remainingQuarantined = quarantined.filter(question => !repairedIds.has(question.id));
  const finalProduction = [...cleanProduction, ...repairedProduction];

  const reviewById = new Map((baselineReview || []).map(question => [question.id, question]));
  for (const question of remainingQuarantined) reviewById.set(question.id, question);
  const reviewRequired = [...reviewById.values()];
  const bySection = countBySection(finalProduction);
  const profileReadiness = getProfileReadiness(bySection);
  const sourcesByCategory = baselineSources.reduce((counts, source) => {
    counts[source.category] = (counts[source.category] || 0) + 1;
    return counts;
  }, {});

  // Rebuild canonical production/review shards from the clean production set.
  writeJson('data/vact/questions.json', finalProduction);
  const shardNameMap = {
    vietnamese: 'vietnamese-001.json',
    english: 'english-001.json',
    math: 'math-001.json',
    logic_data: 'logic-data-001.json',
    scientific_reasoning: 'scientific-001.json'
  };
  for (const [section, filename] of Object.entries(shardNameMap)) {
    writeJson(`data/vact/questions/${filename}`, finalProduction.filter(question => question.section === section));
  }
  writeJson('data/vact/review-required.json', reviewRequired);
  writeJson('data/vact/invalid.json', baselineInvalid);
  writeJson('data/vact/sources.json', baselineSources);

  const productionIds = new Set(finalProduction.map(question => question.id));
  const exams = baselineExams.map(exam => {
    const examQuestions = baselineProduction.filter(question => question.source?.examSetId === exam.id);
    const productionQuestionCount = examQuestions.filter(question => productionIds.has(question.id)).length;
    const expectedQuestionCount = exam.expectedQuestionCount || exam.expected || 120;
    return {
      ...exam,
      productionQuestionCount,
      productionComplete: productionQuestionCount === expectedQuestionCount,
      complete: productionQuestionCount === expectedQuestionCount
    };
  });
  writeJson('data/vact/exams.json', exams);

  const corruptionReport = createContentCorruptionReport([...finalProduction, ...reviewRequired, ...baselineInvalid], {
    repairSummary: {
      baselineProductionRecords: baselineProduction.length,
      affectedProductionRecordsBeforeRepair: quarantined.length,
      quarantinedRecords: remainingQuarantined.length,
      successfullyRepairedRecords: repairedProduction.length,
      repairedIds: repairedProduction.map(question => question.id),
      remainingReviewRequiredRecords: reviewRequired.length,
      remainingCorruptedProductionRecords: 0
    }
  });
  writeJson('tools/vact-content-corruption-report.json', corruptionReport);

  const ingestionReport = {
    ...baselineIngestion,
    generatedAt: new Date().toISOString(),
    sourcesByCategory,
    totalRaw: baselineIngestion.totalRaw || baselineIngestion.rawParsedCount || baselineProduction.length + (baselineReview || []).length + baselineInvalid.length,
    uniqueCount: baselineIngestion.uniqueCount || baselineIngestion.normalizedUniqueCount || baselineProduction.length + (baselineReview || []).length,
    duplicateCount: baselineIngestion.duplicateCount || baselineIngestion.duplicatesRemoved || 0,
    docsProcessed: baselineIngestion.docsProcessed || baselineIngestion.ingestableSources || 0,
    docsFailed: baselineIngestion.docsFailed || 0,
    productionCount: finalProduction.length,
    reviewRequiredCount: reviewRequired.length,
    invalidCount: baselineInvalid.length,
    bySection,
    profileReadiness,
    mini100Ready: profileReadiness.vact_mini_100.runtimeReady,
    full120Ready: profileReadiness.vact_full.runtimeReady,
    contentCorruption: corruptionReport.repairSummary
  };
  writeJson('data/vact/ingestion-report.json', ingestionReport);

  return {
    baselineProductionRecords: baselineProduction.length,
    productionRecords: finalProduction.length,
    quarantinedRecords: remainingQuarantined.length,
    successfullyRepairedRecords: repairedProduction.length,
    reviewRequiredRecords: reviewRequired.length,
    invalidRecords: baselineInvalid.length,
    bySection,
    profileReadiness,
    corruptionReport
  };
}

if (require.main === module) {
  const baselineIndex = process.argv.indexOf('--baseline');
  const baselineCommit = baselineIndex >= 0 ? process.argv[baselineIndex + 1] : null;
  const result = quarantineCorrupted({ baselineCommit });
  console.log(JSON.stringify({
    baselineProductionRecords: result.baselineProductionRecords,
    affectedProductionRecordsBeforeRepair: result.corruptionReport.repairSummary.affectedProductionRecordsBeforeRepair,
    productionRecords: result.productionRecords,
    quarantinedRecords: result.quarantinedRecords,
    reviewRequiredRecords: result.reviewRequiredRecords,
    invalidRecords: result.invalidRecords,
    bySection: result.bySection,
    profileReadiness: result.profileReadiness
  }, null, 2));
}

module.exports = { quarantineCorrupted };
