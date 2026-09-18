/**
 * K-EDU V-ACT Core Architecture - Deduplication Engine
 * Groups questions by normalized signature, selects canonical records deterministically,
 * preserves alternate source provenance, and computes near-duplicate diagnostics
 * without silently merging uncertain pairs.
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
  const computeQuestionSimilarity = signatureModule?.computeQuestionSimilarity;
  const classifyDuplicateStatus = signatureModule?.classifyDuplicateStatus;
  const DUPLICATE_STATUS = signatureModule?.DUPLICATE_STATUS || {
    EXACT_DUPLICATE: 'EXACT_DUPLICATE',
    PROBABLE_DUPLICATE: 'PROBABLE_DUPLICATE',
    REVIEW_REQUIRED: 'REVIEW_REQUIRED',
    UNIQUE: 'UNIQUE'
  };
  const NEAR_DUPLICATE_THRESHOLDS = signatureModule?.NEAR_DUPLICATE_THRESHOLDS || {
    EXACT: 1.0,
    PROBABLE: 0.85,
    REVIEW_REQUIRED: 0.70
  };

  const validateVACTQuestion = validatorModule?.validateVACTQuestion || (() => ({ valid: true, errors: [] }));

  /**
   * Computes a deterministic quality score for a question candidate to select
   * the best canonical record among duplicate variants.
   *
   * Scoring hierarchy (Spec 11):
   * 1. Valid question: +10,000 pts
   * 2. Verified answer (quality.answerVerified): +2,000 pts
   * 3. Reviewed content (quality.reviewed): +1,000 pts
   * 4. Verified source origin (quality.sourceVerified): +500 pts
   * 5. Richer provenance:
   *    - source.file present: +100 pts
   *    - source.page present: +50 pts
   *    - source.title present: +25 pts
   * 6. Richer explanation: length of explanation (up to +100 pts)
   * 7. Stable fallback: alphabetical ID comparison (in selectCanonicalQuestion)
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
   * Preserves alternate source references on the returned canonical object.
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

    // Preserve alternate source references without modifying original objects directly
    const canonical = { ...best };
    canonical.alternateSources = Array.isArray(best.alternateSources)
      ? [...best.alternateSources]
      : [];

    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      if (c && c.id !== best.id) {
        const ref = {
          sourceId: c.sourceId || c.source?.sourceId || 'unknown',
          originalId: c.originalId || c.id,
          examSetId: c.examSetId || c.source?.examSetId || null,
          originalQuestionNumber: c.originalQuestionNumber || c.source?.originalQuestionNumber || null,
          provider: c.source?.provider || null
        };
        const alreadyHas = canonical.alternateSources.some(
          a => a.sourceId === ref.sourceId && a.originalId === ref.originalId
        );
        if (!alreadyHas) {
          canonical.alternateSources.push(ref);
        }
      }
    }

    return canonical;
  }

  /**
   * Identifies near-duplicate pairs across a list of questions using Level-2 similarity.
   * Only pairs with similarity >= REVIEW_REQUIRED (< 1.0) are returned as near-duplicates.
   *
   * @param {Array<object>} questions
   * @param {object} [options]
   * @param {number} [options.maxComparisons=10000]
   * @returns {Array<object>}
   */
  function detectNearDuplicates(questions, options = {}) {
    if (!Array.isArray(questions) || questions.length < 2 || !computeQuestionSimilarity) {
      return [];
    }

    const maxComparisons = options.maxComparisons || 20000;
    const nearDups = [];
    let comparisons = 0;

    for (let i = 0; i < questions.length; i++) {
      for (let j = i + 1; j < questions.length; j++) {
        comparisons++;
        if (comparisons > maxComparisons) break;

        const q1 = questions[i];
        const q2 = questions[j];
        if (!q1 || !q2) continue;

        // Same section check for efficiency
        if (q1.section && q2.section && q1.section !== q2.section) continue;

        const sim = computeQuestionSimilarity(q1, q2);
        const status = classifyDuplicateStatus ? classifyDuplicateStatus(sim) : (
          sim >= NEAR_DUPLICATE_THRESHOLDS.EXACT ? DUPLICATE_STATUS.EXACT_DUPLICATE :
          sim >= NEAR_DUPLICATE_THRESHOLDS.PROBABLE ? DUPLICATE_STATUS.PROBABLE_DUPLICATE :
          sim >= NEAR_DUPLICATE_THRESHOLDS.REVIEW_REQUIRED ? DUPLICATE_STATUS.REVIEW_REQUIRED :
          DUPLICATE_STATUS.UNIQUE
        );

        if (status === DUPLICATE_STATUS.PROBABLE_DUPLICATE || status === DUPLICATE_STATUS.REVIEW_REQUIRED) {
          nearDups.push({
            q1Id: q1.id,
            q2Id: q2.id,
            similarity: Math.round(sim * 1000) / 1000,
            status,
            q1Preview: (q1.question || '').slice(0, 80),
            q2Preview: (q2.question || '').slice(0, 80)
          });
        }
      }
      if (comparisons > maxComparisons) break;
    }

    return nearDups;
  }

  /**
   * Deduplicates an array of questions based on question text + options signature (Level 1).
   * Returns unique canonical questions along with diagnostic duplicate groups and
   * optional Level-2 near-duplicate diagnostics.
   *
   * @param {Array<object>} questions Array of questions
   * @param {object} [options]
   * @param {boolean} [options.detectNearDuplicates=false]
   * @returns {{
   *   uniqueQuestions: Array<object>,
   *   duplicateGroups: Array<object>,
   *   nearDuplicates: Array<object>,
   *   totalInput: number,
   *   totalUnique: number,
   *   totalDuplicatesRemoved: number,
   *   probableDuplicatesCount: number,
   *   reviewRequiredCount: number
   * }}
   */
  function deduplicateVACTQuestions(questions, options = {}) {
    if (!Array.isArray(questions)) {
      return {
        uniqueQuestions: [],
        duplicateGroups: [],
        nearDuplicates: [],
        totalInput: 0,
        totalUnique: 0,
        totalDuplicatesRemoved: 0,
        probableDuplicatesCount: 0,
        reviewRequiredCount: 0
      };
    }

    const groupsBySig = new Map();

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q || typeof q !== 'object') continue;

      const sig = computeVACTQuestionSignature ? computeVACTQuestionSignature(q) : (q.signature || q.id);
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

    let nearDuplicates = [];
    if (options.detectNearDuplicates && uniqueQuestions.length > 1) {
      nearDuplicates = detectNearDuplicates(uniqueQuestions, options);
    }

    const probableCount = nearDuplicates.filter(d => d.status === DUPLICATE_STATUS.PROBABLE_DUPLICATE).length;
    const reviewCount = nearDuplicates.filter(d => d.status === DUPLICATE_STATUS.REVIEW_REQUIRED).length;

    return {
      uniqueQuestions,
      duplicateGroups,
      nearDuplicates,
      totalInput: questions.length,
      totalUnique: uniqueQuestions.length,
      totalDuplicatesRemoved: duplicatesRemoved,
      probableDuplicatesCount: probableCount,
      reviewRequiredCount: reviewCount
    };
  }

  return {
    scoreQuestionQuality,
    selectCanonicalQuestion,
    detectNearDuplicates,
    deduplicateVACTQuestions,
    DUPLICATE_STATUS,
    NEAR_DUPLICATE_THRESHOLDS
  };
});
