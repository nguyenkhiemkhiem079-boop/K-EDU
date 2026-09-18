const fs = require('fs');
const path = require('path');

function runProvenanceReport() {
  const bankPath = path.resolve('data', 'vact', 'questions.json');
  const manifestPath = path.resolve('data', 'vact', 'sources.json');

  if (!fs.existsSync(bankPath)) {
    console.error(`Questions bank not found at ${bankPath}. Please run build_bank.js first.`);
    process.exit(1);
  }

  const questions = JSON.parse(fs.readFileSync(bankPath, 'utf8'));
  const sources = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const sourceIdSet = new Set(sources.map(s => s.sourceId));

  console.log('===============================================================');
  console.log('            V-ACT SOURCE PROVENANCE AUDIT REPORT               ');
  console.log('===============================================================\n');
  console.log(`Total Production Questions Audited: ${questions.length}`);

  let missingSourceId = 0;
  let missingSourceFile = 0;
  let missingExtractedFlag = 0;
  let missingAnswerVerified = 0;
  let invalidSourceIdRef = 0;
  let hasSourcePage = 0;
  let hasQuestionNumber = 0;

  for (const q of questions) {
    if (!q.source || !q.source.sourceId) missingSourceId++;
    else if (!sourceIdSet.has(q.source.sourceId)) invalidSourceIdRef++;

    if (!q.source || !q.source.sourceFile) missingSourceFile++;
    if (!q.source || q.source.extractedFromSource !== true) missingExtractedFlag++;
    if (!q.quality || q.quality.answerVerified !== true || !q.correctAnswer) missingAnswerVerified++;

    if (q.source?.sourcePage) hasSourcePage++;
    if (q.source?.questionNumber) hasQuestionNumber++;
  }

  console.log(`- Questions with valid registered sourceId: ${questions.length - missingSourceId - invalidSourceIdRef} / ${questions.length}`);
  console.log(`- Questions with real sourceFile name   : ${questions.length - missingSourceFile} / ${questions.length}`);
  console.log(`- Questions with extractedFromSource flag: ${questions.length - missingExtractedFlag} / ${questions.length}`);
  console.log(`- Questions with verified answer        : ${questions.length - missingAnswerVerified} / ${questions.length}`);
  console.log(`- Questions with sourcePage location     : ${hasSourcePage} (${(hasSourcePage / questions.length * 100).toFixed(1)}%)`);
  console.log(`- Questions with questionNumber         : ${hasQuestionNumber} (${(hasQuestionNumber / questions.length * 100).toFixed(1)}%)`);

  const passed = (missingSourceId === 0 &&
                  missingSourceFile === 0 &&
                  missingExtractedFlag === 0 &&
                  missingAnswerVerified === 0 &&
                  invalidSourceIdRef === 0);

  console.log('\n---------------------------------------------------------------');
  console.log(`AUDIT RESULT: ${passed ? 'PASSED (100% Provenance Verified)' : 'FAILED (Provenance Gaps Detected)'}`);
  console.log('---------------------------------------------------------------\n');

  if (!passed) {
    process.exit(1);
  }
}

if (require.main === module) {
  runProvenanceReport();
}

module.exports = {
  runProvenanceReport
};
