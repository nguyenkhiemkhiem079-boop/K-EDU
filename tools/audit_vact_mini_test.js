const path = require('node:path');
const vact = require('../js/vact');

function auditMiniTestSection(section, count = 20) {
  console.log(`\n========================================================================================`);
  console.log(`              MINI TEST SOURCE AUDIT: ${section.toUpperCase()} (${count} questions)`);
  console.log(`========================================================================================`);

  const gen = vact.VACTSectionTestGenerator;
  const result = gen.generate({
    section,
    count,
    difficulty: 'balanced'
  });

  console.log(`Generated: ${result.generatedCount} / Requested: ${result.requestedCount} | Missing: ${result.missingCount}`);
  if (result.shortages && result.shortages.length > 0) {
    console.log(`Shortages:`, JSON.stringify(result.shortages, null, 2));
  }

  console.log('\nGenerated Questions Provenance:');
  console.log(
    'No.'.padEnd(5) +
    'Question ID'.padEnd(25) +
    'Q#'.padStart(5) +
    'Page'.padStart(7) +
    '   ' +
    'Source File'
  );
  console.log('-'.repeat(90));

  result.questions.forEach((q, idx) => {
    const qNum = q.source?.questionNumber !== null && q.source?.questionNumber !== undefined ? q.source.questionNumber : 'N/A';
    const qPage = q.source?.sourcePage !== null && q.source?.sourcePage !== undefined ? q.source.sourcePage : 'N/A';
    const srcFile = q.source?.sourceFile ? path.basename(q.source.sourceFile) : 'UNKNOWN';

    console.log(
      String(idx + 1).padEnd(5) +
      String(q.id).padEnd(25) +
      String(qNum).padStart(5) +
      String(qPage).padStart(7) +
      '   ' +
      srcFile
    );
  });

  console.log('-'.repeat(90));

  // Provenance assertion
  for (const q of result.questions) {
    if (!q.source?.extractedFromSource || !q.source?.sourceId || !q.source?.sourceFile) {
      throw new Error(`Question ${q.id} failed provenance check in Mini ${section}`);
    }
  }

  console.log(`[PASS] All ${result.questions.length} questions strictly verified for source provenance.`);
}

function runMiniTestAudits() {
  console.log('Running V-ACT Mini Test Source Audits across sections...\n');
  auditMiniTestSection('math', 20);
  auditMiniTestSection('english', 20);
  auditMiniTestSection('vietnamese', 20);
  auditMiniTestSection('scientific_reasoning', 18);
  console.log('\n========================================================================================');
  console.log('                    ALL MINI TEST SOURCE AUDITS COMPLETED SUCCESSFULLY');
  console.log('========================================================================================\n');
}

if (require.main === module) {
  runMiniTestAudits();
}

module.exports = { auditMiniTestSection, runMiniTestAudits };
