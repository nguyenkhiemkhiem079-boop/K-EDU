const crypto = require('crypto');
const quality = require('./content_quality');

function inferSection(qNum, sourceRecord) {
  if (sourceRecord.sectionHint) {
    return sourceRecord.sectionHint.toLowerCase();
  }

  // If 2025+ full test structure (120 questions)
  if (sourceRecord.category === 'FULL_TEST' || sourceRecord.category === 'OFFICIAL') {
    if (sourceRecord.structureVersion === '2025+') {
      if (qNum >= 1 && qNum <= 30) return 'vietnamese';
      if (qNum >= 31 && qNum <= 60) return 'english';
      if (qNum >= 61 && qNum <= 90) return 'math';
      if (qNum >= 91 && qNum <= 102) return 'logic_data';
      if (qNum >= 103 && qNum <= 120) return 'scientific_reasoning';
    } else if (sourceRecord.structureVersion === 'legacy') {
      // Legacy 120 format:
      // Q1-20: Vietnamese, Q21-40: English, Q41-70: Math, Logic, Data, Q71-120: Science
      if (qNum >= 1 && qNum <= 20) return 'vietnamese';
      if (qNum >= 21 && qNum <= 40) return 'english';
      if (qNum >= 41 && qNum <= 70) return 'math';
      if (qNum >= 71 && qNum <= 120) return 'scientific_reasoning';
    }
  }

  return null; // unknown is review-required; never silently classify as math
}

function deriveExamSetId(sourceRecord) {
  if (sourceRecord.category !== 'FULL_TEST' && sourceRecord.category !== 'OFFICIAL') {
    return null;
  }
  return `vact_exam_${sourceRecord.sourceId}`;
}

function computeQuestionId(sourceId, qNum, questionText) {
  const hash = crypto.createHash('sha256')
    .update(`${sourceId}:::${qNum}:::${questionText.trim()}`)
    .digest('hex')
    .slice(0, 12);
  return `vact_q_${hash}`;
}

function normalizeQuestion(matchedQ, sourceRecord, sourcePageOverride = null, examSetIdOverride = null) {
  const section = inferSection(matchedQ.questionNumber, sourceRecord);
  const examSetId = examSetIdOverride || matchedQ.examSetId || deriveExamSetId(sourceRecord);
  const qId = computeQuestionId(sourceRecord.sourceId, matchedQ.questionNumber, matchedQ.questionText);

  const stimulus = matchedQ.stimulus || null;
  const questionText = matchedQ.questionText.trim();
  const requiresStimulus = quality.questionRequiresStimulus(questionText, stimulus);
  const requiresVisual = quality.questionRequiresVisual(questionText, stimulus);
  const stimulusPreserved = !requiresStimulus || quality.hasActualStimulusContent(stimulus);
  const visualPreserved = !requiresVisual || (Array.isArray(matchedQ.assets) && matchedQ.assets.length > 0);
  const cleanQuestionText = quality.stripKnownPublisherNoise(questionText);
  const malformed = quality.isMalformedQuestionText(cleanQuestionText);
  return {
    id: qId,
    section,
    skill: null,
    difficulty: null,
    questionType: 'single_choice',
    stimulus: matchedQ.stimulus || null,
    question: cleanQuestionText,
    options: matchedQ.options || [],
    correctAnswer: matchedQ.correctAnswer || null,
    explanation: matchedQ.explanation || null,
    source: {
      sourceId: sourceRecord.sourceId,
      sourceFile: sourceRecord.path || sourceRecord.filename,
      sourcePage: matchedQ.sourcePage || sourcePageOverride || null,
      questionNumber: matchedQ.questionNumber || null,
      examSetId,
      examSetIndex: matchedQ.examSetIndex || null,
      extractedFromSource: true,
      questionSourceId: sourceRecord.sourceId,
      questionSourceFile: sourceRecord.path || sourceRecord.filename,
      questionSourcePage: matchedQ.sourcePage || sourcePageOverride || null,
      solutionSourceId: matchedQ.solutionSourceId || (sourceRecord.documentRole === 'combined' ? sourceRecord.sourceId : null),
      solutionSourceFile: matchedQ.solutionSourceFile || (sourceRecord.documentRole === 'combined' ? (sourceRecord.path || sourceRecord.filename) : null),
      solutionSourcePage: matchedQ.solutionSourcePage !== undefined ? matchedQ.solutionSourcePage : (sourceRecord.documentRole === 'combined' ? (matchedQ.sourcePage || sourcePageOverride || null) : null)
    },
    quality: {
      sourceVerified: true,
      answerVerified: !!matchedQ.answerVerified,
      extractionVerified: true,
      reviewed: false,
      requiresStimulus,
      requiresVisual,
      stimulusPreserved,
      visualPreserved,
      contentComplete: !malformed && (!requiresStimulus || stimulusPreserved) && visualPreserved
    },
    parseDiagnostics: matchedQ.parseDiagnostics || null,
    status: 'production',
    validationIssues: [
      ...(malformed ? ['MALFORMED_QUESTION_TEXT'] : []),
      ...(matchedQ.parseDiagnostics?.duplicateQuestionNumber ? ['DUPLICATE_QUESTION_NUMBER'] : []),
      ...(matchedQ.parseDiagnostics && (!Number.isInteger(matchedQ.parseDiagnostics.sourcePage) || matchedQ.parseDiagnostics.sourcePage < 1) ? ['MISSING_SOURCE_PAGE'] : [])
    ]
  };
}

module.exports = {
  normalizeQuestion,
  inferSection,
  isPlaceholderStimulus: quality.isPlaceholderStimulus
};
