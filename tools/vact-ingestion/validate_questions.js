function validateQuestion(q) {
  const issues = [];

  // Check question text
  if (!q.question || q.question.trim().length < 8) {
    issues.push('Question text too short or missing');
  }

  // Check options
  if (!Array.isArray(q.options) || q.options.length !== 4) {
    issues.push(`Expected 4 options, found ${q.options ? q.options.length : 0}`);
  } else {
    // Check that options A, B, C, D exist
    const labels = q.options.map(o => o.trim().slice(0, 2).toUpperCase());
    if (!labels[0].startsWith('A') || !labels[1].startsWith('B') || !labels[2].startsWith('C') || !labels[3].startsWith('D')) {
      issues.push('Options do not conform to A, B, C, D format');
    }
  }

  // Check provenance
  if (!q.source || !q.source.sourceId || !q.source.sourceFile || q.source.extractedFromSource !== true) {
    issues.push('Missing or invalid source provenance');
  }

  // Determine status
  if (issues.some(i => i.includes('Expected 4 options') || i.includes('Question text too short') || i.includes('Missing or invalid source provenance'))) {
    q.status = 'invalid';
    q.quality.extractionVerified = false;
    q.validationIssues = issues;
    return q;
  }

  // Check answer
  const validAnswers = ['A', 'B', 'C', 'D'];
  if (!q.correctAnswer || !validAnswers.includes(q.correctAnswer)) {
    q.quality.answerVerified = false;
    q.status = 'review_required';
    q.validationIssues = issues.concat(['Missing or unverified answer']);
    return q;
  }

  q.quality.answerVerified = true;
  q.status = 'production';
  return q;
}

function validateQuestions(questions) {
  return questions.map(validateQuestion);
}

module.exports = {
  validateQuestion,
  validateQuestions
};
