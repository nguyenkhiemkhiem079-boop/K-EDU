const fs = require('node:fs');
const path = require('node:path');

function auditFullExams() {
  console.log('========================================================================================');
  console.log('                             FULL EXAM SOURCE AUDIT');
  console.log('========================================================================================');

  const examsPath = path.resolve('data', 'vact', 'exams.json');
  const sourcesPath = path.resolve('data', 'vact', 'sources.json');
  const questionsPath = path.resolve('data', 'vact', 'questions.json');

  if (!fs.existsSync(examsPath) || !fs.existsSync(sourcesPath) || !fs.existsSync(questionsPath)) {
    console.error('ERROR: Required data/vact/ files missing. Run build_bank.js first.');
    process.exit(1);
  }

  const exams = JSON.parse(fs.readFileSync(examsPath, 'utf8'));
  const sources = JSON.parse(fs.readFileSync(sourcesPath, 'utf8'));
  const questions = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));

  const sourceMap = new Map(sources.map(s => [s.sourceId, s]));
  const questionMap = new Map(questions.map(q => [q.id, q]));

  console.log(`Auditing ${exams.length} registered exam sets...\n`);

  let completeCount = 0;
  let incompleteCount = 0;

  exams.forEach((ex, idx) => {
    const src = sourceMap.get(ex.sourceId) || {};
    const pairedSrc = src.pairedSourceId ? sourceMap.get(src.pairedSourceId) : null;
    const solutionFile = pairedSrc ? pairedSrc.filename : (src.documentRole === 'combined' ? src.filename : 'N/A');

    const qIds = ex.questionIds || [];
    let answerVerifiedCount = 0;
    let prodCount = 0;

    qIds.forEach(id => {
      const q = questionMap.get(id);
      if (q) {
        if (q.quality?.answerVerified) answerVerifiedCount++;
        if (q.status === 'production') prodCount++;
      }
    });

    const missing = Math.max(0, (ex.expectedQuestionCount || 120) - ex.extractedQuestionCount);
    const completeStr = ex.complete ? 'YES' : 'NO';
    if (ex.complete) completeCount++; else incompleteCount++;

    console.log(`[Exam #${idx + 1}] ID: ${ex.id}`);
    console.log(`  - Source File       : ${ex.filename}`);
    console.log(`  - Solution File     : ${solutionFile}`);
    console.log(`  - Questions Extracted: ${ex.extractedQuestionCount}`);
    console.log(`  - Answer Verified   : ${answerVerifiedCount}`);
    console.log(`  - Production Ready  : ${prodCount}`);
    console.log(`  - Missing Questions : ${missing}`);
    console.log(`  - Complete          : ${completeStr}`);
    console.log('----------------------------------------------------------------------------------------');
  });

  console.log(`Total Registered: ${exams.length} | Complete: ${completeCount} | Incomplete: ${incompleteCount}`);
  console.log('========================================================================================\n');
}

if (require.main === module) {
  auditFullExams();
}

module.exports = { auditFullExams };
