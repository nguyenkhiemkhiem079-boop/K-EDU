const { extractDocument } = require('./extract_document');
const { parseQuestions, cleanText } = require('./parse_questions');
const { getPairedSource } = require('./scan_sources');

/**
 * Matches extracted questions with solutions from paired or combined documents.
 * @param {Array<Object>} parsedQuestions
 * @param {Object} sourceRecord
 * @returns {Promise<Array<Object>>} questions with matched answer and explanation
 */
async function matchSolutions(parsedQuestions, sourceRecord) {
  let solutionMap = new Map(); // questionNumber -> { answer, explanation }

  // Case 1: Paired Solution PDF exists
  const pairedSource = getPairedSource(sourceRecord);
  if (pairedSource && pairedSource.documentRole === 'solution') {
    try {
      const solDoc = await extractDocument(pairedSource);
      const solQuestions = parseQuestions(solDoc, pairedSource);

      for (const sq of solQuestions) {
        let ans = sq.explicitAnswer;
        // If explicitAnswer wasn't caught by parseQuestionChunk, try additional regex on full chunk
        if (!ans) {
          const ansM = sq.rawChunk.match(/(?:Đáp\s*án(?:\s+đúng\s+là|\s*:|\s+là)?|Chọn)\s*([A-D])\b/i);
          if (ansM) ans = ansM[1].toUpperCase();
        }

        // Clean explanation
        let expl = null;
        if (sq.solutionText) {
          expl = cleanText(sq.solutionText);
        } else if (sq.rawChunk) {
          // If the whole chunk is explanation
          const expM = sq.rawChunk.match(/(?:Lời giải|Hướng dẫn giải|Phương pháp giải)[\s\S]*/i);
          if (expM) expl = cleanText(expM[0]);
        }

        solutionMap.set(sq.questionNumber, {
          answer: ans || null,
          explanation: expl || null,
          solutionSourceId: pairedSource.sourceId,
          solutionFile: pairedSource.filename
        });
      }
    } catch (err) {
      console.warn(`[matchSolutions] Failed to extract paired solution ${pairedSource.filename}: ${err.message}`);
    }
  }

  // Combine answers into each question
  const matched = parsedQuestions.map(q => {
    let correctAnswer = null;
    let explanation = null;
    let answerVerified = false;

    // First check paired solution
    const paired = solutionMap.get(q.questionNumber);
    if (paired && paired.answer) {
      correctAnswer = paired.answer;
      explanation = paired.explanation;
      answerVerified = true;
    } else if (q.explicitAnswer) {
      // Combined document had explicit answer
      correctAnswer = q.explicitAnswer;
      explanation = q.solutionText ? q.solutionText : null;
      answerVerified = true;
    } else {
      // Check if rawChunk has answer
      const rawAnsM = q.rawChunk.match(/(?:Đáp\s*án(?:\s+đúng\s+là|\s*:|\s+là)?|Chọn)\s*([A-D])\b/i);
      if (rawAnsM) {
        correctAnswer = rawAnsM[1].toUpperCase();
        explanation = q.solutionText ? q.solutionText : null;
        answerVerified = true;
      }
    }

    return {
      ...q,
      correctAnswer,
      explanation: explanation || null,
      answerVerified
    };
  });

  return matched;
}

module.exports = {
  matchSolutions
};
