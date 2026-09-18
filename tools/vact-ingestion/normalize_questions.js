const crypto = require('crypto');

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

  return 'math'; // default fallback
}

function deriveExamSetId(sourceRecord) {
  if (sourceRecord.category !== 'FULL_TEST' && sourceRecord.category !== 'OFFICIAL') {
    return null;
  }
  const base = sourceRecord.filename
    .replace(/\.pdf$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  return `vact_exam_${base}`;
}

function computeQuestionId(sourceId, qNum, questionText) {
  const hash = crypto.createHash('sha256')
    .update(`${sourceId}:::${qNum}:::${questionText.trim()}`)
    .digest('hex')
    .slice(0, 12);
  return `vact_q_${hash}`;
}

function normalizeQuestion(matchedQ, sourceRecord) {
  const section = inferSection(matchedQ.questionNumber, sourceRecord);
  const examSetId = deriveExamSetId(sourceRecord);
  const qId = computeQuestionId(sourceRecord.sourceId, matchedQ.questionNumber, matchedQ.questionText);

  return {
    id: qId,
    section,
    skill: null,
    difficulty: null,
    questionType: 'single_choice',
    stimulus: matchedQ.stimulus || null,
    question: matchedQ.questionText.trim(),
    options: matchedQ.options || [],
    correctAnswer: matchedQ.correctAnswer || null,
    explanation: matchedQ.explanation || null,
    source: {
      sourceId: sourceRecord.sourceId,
      sourceFile: sourceRecord.path || sourceRecord.filename,
      sourcePage: matchedQ.sourcePage || null,
      questionNumber: matchedQ.questionNumber || null,
      examSetId,
      extractedFromSource: true,
      questionSourceId: sourceRecord.sourceId,
      questionSourceFile: sourceRecord.path || sourceRecord.filename,
      questionSourcePage: matchedQ.sourcePage || null,
      solutionSourceId: matchedQ.solutionSourceId || (sourceRecord.documentRole === 'combined' ? sourceRecord.sourceId : null),
      solutionSourceFile: matchedQ.solutionSourceFile || (sourceRecord.documentRole === 'combined' ? (sourceRecord.path || sourceRecord.filename) : null),
      solutionSourcePage: matchedQ.solutionSourcePage !== undefined ? matchedQ.solutionSourcePage : (sourceRecord.documentRole === 'combined' ? (matchedQ.sourcePage || null) : null)
    },
    quality: {
      sourceVerified: true,
      answerVerified: !!matchedQ.answerVerified,
      extractionVerified: true,
      reviewed: false
    },
    status: 'production' // will be adjusted by validate_questions
  };
}

module.exports = {
  normalizeQuestion,
  inferSection
};
