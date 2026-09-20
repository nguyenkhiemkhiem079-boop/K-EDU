const quality = require('./content_quality');
function validateQuestion(q) {
  q = { ...q, quality: { ...(q.quality || {}) }, validationIssues: Array.isArray(q.validationIssues) ? [...q.validationIssues] : [] };
  const issues = [];
  const optionSignature = value => String(value ?? '').replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

  // Check question text
  if (!q.question || q.question.trim().length < 8) {
    issues.push('Question text too short or missing');
  }
  if (!q.section) issues.push('UNKNOWN_SECTION');
  if (quality.isMalformedQuestionText(q.question) || q.validationIssues?.includes('MALFORMED_QUESTION_TEXT')) issues.push('MALFORMED_QUESTION_TEXT');
  if (q.parseDiagnostics?.duplicateQuestionNumber || q.validationIssues?.includes('DUPLICATE_QUESTION_NUMBER')) issues.push('DUPLICATE_QUESTION_NUMBER');
  if (q.parseDiagnostics && (!Number.isInteger(q.parseDiagnostics.sourcePage) || q.parseDiagnostics.sourcePage < 1)) issues.push('MISSING_SOURCE_PAGE');
  if (q.quality?.requiresStimulus && !q.quality.stimulusPreserved) issues.push('MISSING_REQUIRED_CONTENT');
  if (q.quality?.requiresVisual && !q.quality.visualPreserved) issues.push('VISUAL_MISSING');
  if (q.options?.some(quality.hasCriticalOptionSpillover)) issues.push('OPTION_SPILLOVER');

  // Check options
  if (!Array.isArray(q.options) || q.options.length !== 4) {
    issues.push(`Expected 4 options, found ${q.options ? q.options.length : 0}`);
  } else {
    // Check that options A, B, C, D exist
    if (q.options.some(o => /^\s*(?:\[[A-D]\]|[A-D])\s*[.:)]/i.test(String(o)))) issues.push('DUPLICATE_OPTION_LABEL');
    if (q.options.some(o => String(o).length > 500)) issues.push('OPTION_TOO_LONG');
    if (new Set(q.options.map(optionSignature)).size !== q.options.length) issues.push('DUPLICATE_OPTIONS');
    if (q.options.some(o => /(?:Dựa vào thông tin dưới đây|Câu\s+\d+\s*[:.])/i.test(String(o)))) issues.push('OPTION_SPILLOVER');
  }

  // Check provenance
  if (!q.source || !q.source.sourceId || !q.source.sourceFile || q.source.extractedFromSource !== true) {
    issues.push('Missing or invalid source provenance');
  }
  if (q.source && (!Number.isInteger(q.source.sourcePage) || q.source.sourcePage < 1)) issues.push('MISSING_SOURCE_PAGE');

  // Determine status
  if (issues.some(i => i.includes('Expected 4 options') || i.includes('Question text too short') || i.includes('Missing or invalid source provenance') || ['UNKNOWN_SECTION','MALFORMED_QUESTION_TEXT','OPTION_SPILLOVER'].includes(i))) {
    q.status = 'invalid';
    q.quality.extractionVerified = false;
    q.validationIssues = issues;
    return q;
  }

  // Check answer
  const validAnswers = ['A', 'B', 'C', 'D'];
  if (!q.correctAnswer || !validAnswers.includes(q.correctAnswer) || issues.some(i => ['MISSING_REQUIRED_CONTENT','VISUAL_MISSING','DUPLICATE_OPTION_LABEL','DUPLICATE_OPTIONS','DUPLICATE_QUESTION_NUMBER','MISSING_SOURCE_PAGE','OPTION_TOO_LONG'].includes(i))) {
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
