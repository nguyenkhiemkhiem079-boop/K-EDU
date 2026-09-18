/**
 * K-EDU V-ACT Core Architecture - Deduplication Engine
 * Groups questions by normalized signature, selects canonical records deterministically,
 * and tracks diagnostic duplicate group provenance.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    const signature = require('./signature');
    const validator = require('./validator');
    module.exports = factory(signature, validator);
  } else {
    root.KEDUVACT = root.KEDUVACT || {};
    root.KEDUVACT.quality = root.KEDUVACT.quality || {};
    const deduplicator = factory(root.KEDUVACT, root.KEDUVACT);
    Object.assign(root.KEDUVACT.quality, deduplicator);
    Object.assign(root.KEDUVACT, deduplicator);
  }
})(typeof window !== 'undefined' ? window : globalThis, function (signatureModule, validatorModule) {
  'use strict';

  const computeVACTQuestionSignature = signatureModule?.computeVACTQuestionSignature;
  const validateVACTQuestion = validatorModule?.validateVACTQuestion || (() => ({ valid: true, errors: [] }));

  /**
   * Computes a deterministic quality score for a question candidate to select
   * the best canonical record among duplicate variants.
   *
   * Scoring hierarchy (Phase 3 spec):
   * 1. Valid question: +10,000 pts
   * 2. Verified answer (quality.answerVerified): +2,000 pts
   * 3. Reviewed content (quality.reviewed): +1,000 pts
   * 4. Verified source origin (quality.sourceVerified): +500 pts
   * 5. Richer provenance:
   *    - source.file present: +100 pts
   *    - source.page present: +50 pts
   *    - source.title present: +25 pts
   * 6. Richer explanation: length of explanation (up to +100 pts)
   *
   * @param {object} q
   * @returns {number}
   */
  function scoreQuestionQuality(q) {
    if (!q || typeof q !== 'object') return -1;
    let score = 0;

    // 1. Validation
    const val = validateVACTQuestion(q);
    if (val.valid) score += 10000;

    // 2. Verified answer
    if (q.quality?.answerVerified) score += 2000;

    // 3. Reviewed content
    if (q.quality?.reviewed) score += 1000;

    // 4. Source verified
    if (q.quality?.sourceVerified) score += 500;

    // 5. Richer provenance
    const src = q.source || {};
    if (src.file && typeof src.file === 'string' && src.file.trim()) score += 100;
    if (src.page !== null && src.page !== undefined) score += 50;
    if (src.title && typeof src.title === 'string' && src.title.trim()) score += 25;

    // 6. Richer explanation
    const expLen = String(q.explanation || '').trim().length;
    score += Math.min(expLen, 100);

    return score;
  }

  /**
   * Selects the single best canonical question from an array of duplicate candidates.
   * Deterministic: Uses quality scoring with alphabetical ID fallback.
   * Does NOT mutate candidates.
   *
   * @param {Array<object>} candidates
   * @returns {object|null}
   */
  function selectCanonicalQuestion(candidates) {
    if (!Array.isArray(candidates) || candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];

    let best = candidates[0];
    let bestScore = scoreQuestionQuality(best);

    for (let i = 1; i < candidates.length; i++) {
      const current = candidates[i];
      const currentScore = scoreQuestionQuality(current);

      if (currentScore > bestScore) {
        best = current;
        bestScore = currentScore;
      } else if (currentScore === bestScore) {
        // Deterministic fallback: tie-break by ID string comparison
        const idBest = String(best.id || '');
        const idCurr = String(current.id || '');
        if (idCurr.localeCompare(idBest) < 0) {
          best = current;
          bestScore = currentScore;
        }
      }
    }

    return best;
  }

  /**
   * Deduplicates an array of questions based on question text + options signature.
   * Returns unique canonical questions along with diagnostic duplicate groups.
   *
   * @param {Array<object>} questions Array of questions
   * @returns {{
   *   uniqueQuestions: Array<object>,
   *   duplicateGroups: Array<object>,
   *   totalInput: number,
   *   totalUnique: number,
   *   totalDuplicatesRemoved: number
   * }}
   */
  function deduplicateVACTQuestions(questions) {
    if (!Array.isArray(questions)) {
      return {
        uniqueQuestions: [],
        duplicateGroups: [],
        totalInput: 0,
        totalUnique: 0,
        totalDuplicatesRemoved: 0
      };
    }

    const groupsBySig = new Map();

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q || typeof q !== 'object') continue;

      const sig = computeVACTQuestionSignature(q);
      if (!groupsBySig.has(sig)) {
        groupsBySig.set(sig, []);
      }
      groupsBySig.get(sig).push(q);
    }

    const uniqueQuestions = [];
    const duplicateGroups = [];
    let duplicatesRemoved = 0;

    groupsBySig.forEach((members, sig) => {
      const canonical = selectCanonicalQuestion(members);
      if (canonical) {
        uniqueQuestions.push(canonical);
      }

      if (members.length > 1) {
        const canonicalId = canonical ? canonical.id : null;
        const dupIds = members
          .map(m => m.id)
          .filter(id => id !== canonicalId);

        duplicateGroups.push({
          signature: sig,
          canonicalId,
          canonicalQuestion: canonical,
          duplicateIds: dupIds,
          totalCount: members.length
        });

        duplicatesRemoved += (members.length - 1);
      }
    });

    return {
      uniqueQuestions,
      duplicateGroups,
      totalInput: questions.length,
      totalUnique: uniqueQuestions.length,
      totalDuplicatesRemoved: duplicatesRemoved
    };
  }

  return {
    scoreQuestionQuality,
    selectCanonicalQuestion,
    deduplicateVACTQuestions
  };
});
