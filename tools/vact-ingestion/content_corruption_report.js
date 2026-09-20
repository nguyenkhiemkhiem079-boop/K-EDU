const fs = require('node:fs');
const path = require('node:path');
const quality = require('./content_quality');

const FIELDS = ['question', 'option', 'stimulus', 'explanation'];

function getFieldIssues(question) {
  const issues = quality.getContentEncodingIssues(question);
  const byField = issues.byField || {};
  return {
    issues: issues.codes || [...issues],
    fields: {
      question: byField.question || [],
      option: byField.options || [],
      stimulus: byField.stimulus || [],
      explanation: byField.explanation || []
    },
    studentVisible: Boolean(issues.studentVisible),
    explanationOnly: Boolean(issues.explanationOnly)
  };
}

function createContentCorruptionReport(questions, options = {}) {
  const list = Array.isArray(questions) ? questions : [];
  const production = list.filter(q => q?.status === 'production');
  const bySection = {};
  const byField = Object.fromEntries(FIELDS.map(field => [field, 0]));
  const issueCounts = {};
  const affected = [];

  for (const question of list) {
    const analysis = getFieldIssues(question);
    const section = question?.section || 'unknown';
    bySection[section] ||= { totalRecords: 0, productionRecords: 0, affectedRecords: 0, affectedProductionRecords: 0 };
    bySection[section].totalRecords++;
    if (question?.status === 'production') bySection[section].productionRecords++;
    if (!analysis.issues.length) continue;

    bySection[section].affectedRecords++;
    if (question?.status === 'production') bySection[section].affectedProductionRecords++;
    for (const field of FIELDS) {
      if (analysis.fields[field].length) byField[field]++;
    }
    for (const issue of analysis.issues) issueCounts[issue] = (issueCounts[issue] || 0) + 1;

    affected.push({
      id: question?.id || null,
      section,
      status: question?.status || null,
      studentVisible: analysis.studentVisible,
      explanationOnly: analysis.explanationOnly,
      fields: analysis.fields,
      issues: analysis.issues,
      sourceFile: question?.source?.sourceFile || null,
      sourcePage: question?.source?.sourcePage || null,
      questionNumber: question?.source?.questionNumber || null,
      solutionSourceFile: question?.source?.solutionSourceFile || null,
      solutionSourcePage: question?.source?.solutionSourcePage || null
    });
  }

  const report = {
    generatedAt: new Date().toISOString(),
    totalRecords: list.length,
    productionRecords: production.length,
    affectedRecords: affected.length,
    affectedProductionRecords: affected.filter(item => item.status === 'production').length,
    studentVisibleAffectedRecords: affected.filter(item => item.studentVisible).length,
    explanationOnlyRecords: affected.filter(item => item.explanationOnly).length,
    bySection,
    byField,
    issueCounts,
    affectedIds: affected.map(item => item.id).filter(Boolean),
    affectedRecordsDetail: affected,
    sourceFile: affected.map(item => item.sourceFile).filter(Boolean),
    sourcePage: affected.map(item => item.sourcePage).filter(Boolean),
    questionNumber: affected.map(item => item.questionNumber).filter(Boolean),
    repairSummary: options.repairSummary || null,
    outputPath: options.outputPath || path.resolve('tools', 'vact-content-corruption-report.json')
  };

  if (options.write !== false) {
    fs.writeFileSync(report.outputPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
  }
  return report;
}

module.exports = {
  createContentCorruptionReport,
  getFieldIssues
};
