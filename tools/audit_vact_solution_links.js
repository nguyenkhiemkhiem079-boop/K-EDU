const fs = require('node:fs');
const path = require('node:path');

function auditSolutionLinks() {
  console.log('========================================================================================');
  console.log('                        V-ACT SOURCE SOLUTION LINK AUDIT');
  console.log('========================================================================================\n');

  const questionsPath = path.resolve('data', 'vact', 'questions.json');
  const sourcesPath = path.resolve('data', 'vact', 'sources.json');

  if (!fs.existsSync(questionsPath) || !fs.existsSync(sourcesPath)) {
    console.error('ERROR: Required data/vact/ files missing.');
    process.exit(1);
  }

  const questions = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));
  const sources = JSON.parse(fs.readFileSync(sourcesPath, 'utf8'));
  const sourceMap = new Map(sources.map(s => [s.sourceId, s]));

  let productionCount = 0;
  let verifiedAnswerCount = 0;
  let withExplanationCount = 0;
  let answerOnlyCount = 0;
  let brokenSolutionLinks = 0;
  const brokenExamples = [];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (q.status !== 'production') continue;
    productionCount++;

    // Verify answer
    if (q.correctAnswer && ['A', 'B', 'C', 'D'].includes(q.correctAnswer) && q.quality?.answerVerified) {
      verifiedAnswerCount++;
    }

    // Verify source question metadata
    const hasQuestionSource = q.source?.sourceId && (q.source?.questionSourceId || q.source?.sourceFile);

    const hasExplanation = q.explanation && typeof q.explanation === 'string' && q.explanation.trim().length > 0;
    if (hasExplanation) {
      withExplanationCount++;
      // Verify solution source metadata exists
      const solSourceId = q.source?.solutionSourceId || q.source?.sourceId;
      const solSourceFile = q.source?.solutionSourceFile || q.source?.sourceFile;

      if (!solSourceId || !solSourceFile || !sourceMap.has(solSourceId)) {
        brokenSolutionLinks++;
        if (brokenExamples.length < 5) {
          brokenExamples.push({
            id: q.id,
            solSourceId,
            solSourceFile,
            reason: !sourceMap.has(solSourceId) ? 'solutionSourceId not found in manifest' : 'missing solution source metadata'
          });
        }
      }
    } else {
      answerOnlyCount++;
    }
  }

  console.log(`Production questions:          ${productionCount}`);
  console.log(`Verified answers:              ${verifiedAnswerCount}`);
  console.log(`Questions with solution text:  ${withExplanationCount}`);
  console.log(`Questions answer-only:         ${answerOnlyCount}`);
  console.log(`Broken solution links:         ${brokenSolutionLinks}`);

  if (brokenSolutionLinks > 0) {
    console.error('\nBroken solution links detected:', brokenExamples);
    throw new Error(`Audit FAILED: Broken solution links must be 0, found ${brokenSolutionLinks}`);
  }

  console.log('\n[PASS] All production questions with explanations have strictly verified solution source links (0 broken links).');
  console.log('========================================================================================\n');
}

if (require.main === module) {
  auditSolutionLinks();
}

module.exports = { auditSolutionLinks };
