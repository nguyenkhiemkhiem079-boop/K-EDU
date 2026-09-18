const path = require('node:path');
const vact = require('../js/vact');

function auditFull120() {
  console.log('========================================================================================');
  console.log('                          FULL 120 SOURCE-BACKED AUDIT');
  console.log('========================================================================================\n');

  const examGen = vact.examGenerator || vact;
  const exam = examGen.generateFromProfile('vact_full', {
    difficulty: 'balanced'
  });

  console.log(`Generated Full Exam ID: ${exam.id}`);
  console.log(`Status: ${exam.isComplete ? 'COMPLETE (120/120 items)' : 'INCOMPLETE'}\n`);

  console.log('Section Generation Report:');
  console.log('----------------------------------------------------------------------------------------');
  console.log('Section'.padEnd(28) + 'Generated'.padStart(10) + ' / ' + 'Requested'.padEnd(10) + 'Status'.padStart(12));
  console.log('----------------------------------------------------------------------------------------');

  const sectionKeys = ['vietnamese', 'english', 'math', 'logic_data', 'scientific_reasoning'];
  let totalGenerated = 0;
  let totalRequested = 0;

  sectionKeys.forEach(secKey => {
    const secData = exam.sections[secKey];
    if (secData) {
      totalGenerated += secData.generated;
      totalRequested += secData.requested;
      const statusStr = secData.isComplete ? 'OK' : `SHORT (${secData.missing})`;
      console.log(
        secData.nameVi.padEnd(28) +
        String(secData.generated).padStart(10) + ' / ' + String(secData.requested).padEnd(10) +
        statusStr.padStart(12)
      );
    }
  });

  console.log('----------------------------------------------------------------------------------------');
  console.log(
    'TOTAL'.padEnd(28) +
    String(totalGenerated).padStart(10) + ' / ' + String(totalRequested).padEnd(10) +
    (totalGenerated === totalRequested ? 'PERFECT' : 'SHORTAGE').padStart(12)
  );
  console.log('----------------------------------------------------------------------------------------\n');

  // Verify provenance on every single question
  console.log(`Verifying source provenance on all ${exam.questions.length} questions...`);
  let missingSourceCount = 0;
  let missingAnswerCount = 0;

  exam.questions.forEach((q, idx) => {
    if (!q.source?.extractedFromSource || !q.source?.sourceId || !q.source?.sourceFile) {
      missingSourceCount++;
      console.error(`Question #${idx + 1} (${q.id}) failed source provenance!`);
    }
    if (!q.quality?.answerVerified || !q.correctAnswer) {
      missingAnswerCount++;
      console.error(`Question #${idx + 1} (${q.id}) failed answer verification!`);
    }
  });

  console.log(`Missing source provenance: ${missingSourceCount}`);
  console.log(`Missing verified answer:   ${missingAnswerCount}`);

  if (missingSourceCount === 0 && missingAnswerCount === 0) {
    console.log('\n[PASS] Full 120 exam generated strictly from verified source-backed questions with 100% provenance.');
  } else {
    throw new Error('Provenance QA assertion failed on Full 120 exam.');
  }

  console.log('\nSample Questions (First 5 of Exam):');
  console.log('-'.repeat(90));
  exam.questions.slice(0, 5).forEach(q => {
    const fn = path.basename(q.source.sourceFile);
    console.log(`[Exam Q#${q.examIndex}] (${q.section}) ${q.id} | Page ${q.source.sourcePage} Q#${q.source.questionNumber} from ${fn}`);
  });
  console.log('-'.repeat(90));
  console.log('\n========================================================================================\n');
}

if (require.main === module) {
  auditFull120();
}

module.exports = { auditFull120 };
