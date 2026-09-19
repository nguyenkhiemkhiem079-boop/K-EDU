const crypto = require('crypto');

function normalizeForSignature(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/<[^>]+>/g, '') // strip HTML
    .replace(/\\[,;!]/g, '') // strip LaTeX spacing
    .replace(/\\quad|\\qquad/g, '')
    // Preserve mathematical operators and grouping; only remove prose punctuation.
    .replace(/[.,:;?!'"“”‘’`~#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function computeQuestionSignature(q) {
  const normStimulus = normalizeForSignature(q.stimulus || '');
  const normQuestion = normalizeForSignature(q.question || '');
  const normOptions = (q.options || []).map(opt => {
    // Strip A. B. C. D.
    const cleanOpt = opt.replace(/^[A-D]\s*[.:)]\s*/i, '');
    return normalizeForSignature(cleanOpt);
  }).sort().join(' | ');

  const fullStr = `${normStimulus} ::: ${normQuestion} ::: [${normOptions}]`;
  return crypto.createHash('sha256').update(fullStr).digest('hex');
}

/**
 * Calculates priority score for picking the canonical question.
 * 1. official source (+1000)
 * 2. verified answer (+500)
 * 3. 2025+ structure (+200)
 * 4. has explanation (+100)
 * 5. longer explanation length
 */
function getCanonicalScore(q, sourceManifestMap) {
  let score = 0;
  const sourceRecord = sourceManifestMap.get(q.source?.sourceId);

  if (sourceRecord?.official || sourceRecord?.category === 'OFFICIAL') {
    score += 1000;
  }
  if (q.quality?.answerVerified && q.correctAnswer) {
    score += 500;
  }
  if (sourceRecord?.structureVersion === '2025+') {
    score += 200;
  }
  if (q.explanation && q.explanation.length > 20) {
    score += 100 + Math.min(q.explanation.length, 100);
  }
  return score;
}

function deduplicateQuestions(questions, sourceManifestList) {
  const sourceManifestMap = new Map();
  sourceManifestList.forEach(s => sourceManifestMap.set(s.sourceId, s));

  const groups = new Map(); // signature -> array of questions

  for (const q of questions) {
    const sig = computeQuestionSignature(q);
    q.signature = sig;
    if (!groups.has(sig)) {
      groups.set(sig, []);
    }
    groups.get(sig).push(q);
  }

  const uniqueQuestions = [];
  const duplicateQuestions = [];

  for (const [sig, group] of groups.entries()) {
    if (group.length === 1) {
      const q = group[0];
      q.alternateSources = [];
      uniqueQuestions.push(q);
    } else {
      // Sort to find the highest-scoring canonical question
      group.sort((a, b) => {
        const scoreA = getCanonicalScore(a, sourceManifestMap);
        const scoreB = getCanonicalScore(b, sourceManifestMap);
        if (scoreB !== scoreA) return scoreB - scoreA;
        return a.id.localeCompare(b.id);
      });

      const canonical = group[0];
      canonical.alternateSources = [];

      for (let i = 1; i < group.length; i++) {
        const dup = group[i];
        dup.status = 'duplicate';
        dup.canonicalQuestionId = canonical.id;
        canonical.alternateSources.push({
          sourceId: dup.source?.sourceId,
          sourceFile: dup.source?.sourceFile,
          sourcePage: dup.source?.sourcePage,
          questionNumber: dup.source?.questionNumber,
          examSetId: dup.source?.examSetId
        });
        duplicateQuestions.push(dup);
      }

      uniqueQuestions.push(canonical);
    }
  }

  return {
    uniqueQuestions,
    duplicateQuestions,
    totalRaw: questions.length,
    uniqueCount: uniqueQuestions.length,
    duplicateCount: duplicateQuestions.length
  };
}

module.exports = {
  computeQuestionSignature,
  deduplicateQuestions
};
