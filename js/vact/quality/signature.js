/**
 * K-EDU V-ACT Core Architecture - Signature & Anti-Duplication Quality Engine
 * Computes deterministic signatures for V-ACT questions and options.
 * Supports stimulus-aware Level 1 signatures, Level 2 text fingerprints,
 * and deterministic near-duplicate similarity classification.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.KEDUVACT = root.KEDUVACT || {};
    Object.assign(root.KEDUVACT, factory());
  }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const NEAR_DUPLICATE_THRESHOLDS = Object.freeze({
    EXACT: 1.0,
    PROBABLE: 0.85,
    REVIEW_REQUIRED: 0.70
  });

  const DUPLICATE_STATUS = Object.freeze({
    EXACT_DUPLICATE: 'EXACT_DUPLICATE',
    PROBABLE_DUPLICATE: 'PROBABLE_DUPLICATE',
    REVIEW_REQUIRED: 'REVIEW_REQUIRED',
    UNIQUE: 'UNIQUE'
  });

  /**
   * Normalizes text by removing zero-width chars, converting to Unicode NFC,
   * collapsing whitespace, stripping HTML tags, stripping LaTeX spacing and math tags,
   * removing space before punctuation, and lowercasing.
   * 
   * @param {*} value
   * @returns {string}
   */
  function normalizeSignatureText(value) {
    if (value === null || value === undefined) return '';
    let str = String(value)
      .normalize('NFC')
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // remove zero-width chars
      .replace(/\s*\(biến thể\s+\d+\)\s*$/iu, '') // strip variant markers
      .replace(/<[^>]+>/g, ' ') // strip common HTML tags
      .replace(/\\\(|\\\)|\\\[|\\\]|\$/g, ' ') // replace LaTeX delimiters with space to avoid word gluing
      .replace(/\\[,;:! ]|\\quad|\\qquad/g, ' ') // strip LaTeX spacing commands
      .replace(/\r\n/g, '\n')
      .replace(/\s+/g, ' ')
      .replace(/\s+([.,:;!?…])/g, '$1') // remove space before punctuation marks
      .trim()
      .toLowerCase();

    // Strip leading option letters like "a. ", "b) ", "[c] ", "1. "
    str = str.replace(/^[a-h1-8][.)\]]\s*/i, '');
    return str;
  }

  /**
   * Computes a canonical signature for a question, stimulus, and options.
   * Stimulus-aware: When a stimulus is provided, it is integrated into the signature.
   * Independent of IDs, timestamps, and formatting differences.
   * 
   * @param {string|object} questionOrObj Question string or raw/normalized question object
   * @param {Array<string>} [optionsList] Array of option strings (if first param is string)
   * @returns {string}
   */
  function computeVACTQuestionSignature(questionOrObj, optionsList) {
    if (questionOrObj && typeof questionOrObj === 'object' && typeof questionOrObj.signature === 'string' && questionOrObj.signature && !optionsList) {
      return questionOrObj.signature;
    }

    let stimulusText = '';
    let questionText = '';
    let options = [];

    if (questionOrObj && typeof questionOrObj === 'object') {
      stimulusText = questionOrObj.stimulus || questionOrObj.passage || '';
      questionText = questionOrObj.question || '';
      options = Array.isArray(questionOrObj.options) ? questionOrObj.options : [];
    } else {
      questionText = String(questionOrObj || '');
      options = Array.isArray(optionsList) ? optionsList : [];
    }

    const normStimulus = normalizeSignatureText(stimulusText);
    const normQ = normalizeSignatureText(questionText);
    const normOptions = options
      .map(normalizeSignatureText)
      .filter(Boolean)
      .join(' | ');

    let sig = normQ;
    if (normStimulus) {
      sig = `${normStimulus} ::: ${normQ}`;
    }
    if (normOptions) {
      sig = `${sig} ::: [${normOptions}]`;
    }

    if (questionOrObj && typeof questionOrObj === 'object' && !questionOrObj.signature) {
      try {
        questionOrObj.signature = sig;
      } catch (_) {}
    }

    return sig;
  }

  /**
   * Computes a normalized text fingerprint for semantic / fuzzy comparison (Level 2).
   * Strips all non-word symbols, keeps letters and numbers, collapses whitespace.
   * @param {string} text
   * @returns {string}
   */
  function computeTextFingerprint(text) {
    if (!text) return '';
    return normalizeSignatureText(text)
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Extracts a Set of word tokens and character 3-grams from text for similarity matching.
   * @param {string} text
   * @returns {Set<string>}
   */
  function extractFeatureSet(text) {
    const fp = computeTextFingerprint(text);
    const set = new Set();
    if (!fp) return set;

    // Word tokens
    const words = fp.split(' ').filter(w => w.length > 0);
    for (const w of words) {
      set.add(`w:${w}`);
    }

    // Character 3-grams for typo and minor formatting difference tolerance
    const compact = fp.replace(/\s+/g, '');
    for (let i = 0; i <= compact.length - 3; i++) {
      set.add(`g:${compact.slice(i, i + 3)}`);
    }

    return set;
  }

  /**
   * Computes deterministic similarity score (0.0 to 1.0) between two question objects or signature strings.
   * Combines exact signature check with Sørensen–Dice similarity of word tokens and character n-grams.
   * 
   * @param {object|string} q1
   * @param {object|string} q2
   * @returns {number} Float between 0.0 and 1.0
   */
  function computeQuestionSimilarity(q1, q2) {
    if (!q1 || !q2) return 0.0;
    const sig1 = typeof q1 === 'string' ? q1 : computeVACTQuestionSignature(q1);
    const sig2 = typeof q2 === 'string' ? q2 : computeVACTQuestionSignature(q2);

    if (sig1 === sig2) {
      return 1.0;
    }

    const fp1 = computeTextFingerprint(sig1);
    const fp2 = computeTextFingerprint(sig2);

    if (!fp1 && !fp2) return 1.0;
    if (!fp1 || !fp2) return 0.0;

    // 1. Word Dice Similarity
    const words1 = fp1.split(' ').filter(Boolean);
    const words2 = fp2.split(' ').filter(Boolean);
    const wordSet1 = new Set(words1);
    const wordSet2 = new Set(words2);

    let wordIntersection = 0;
    for (const w of wordSet1) {
      if (wordSet2.has(w)) wordIntersection++;
    }
    const wordDice = (wordSet1.size + wordSet2.size > 0)
      ? (2 * wordIntersection) / (wordSet1.size + wordSet2.size)
      : 0.0;

    // 2. Character 3-gram Dice Similarity
    const compact1 = fp1.replace(/\s+/g, '');
    const compact2 = fp2.replace(/\s+/g, '');
    const charSet1 = new Set();
    const charSet2 = new Set();

    for (let i = 0; i <= compact1.length - 3; i++) charSet1.add(compact1.slice(i, i + 3));
    for (let i = 0; i <= compact2.length - 3; i++) charSet2.add(compact2.slice(i, i + 3));

    let charIntersection = 0;
    for (const g of charSet1) {
      if (charSet2.has(g)) charIntersection++;
    }
    const charDice = (charSet1.size + charSet2.size > 0)
      ? (2 * charIntersection) / (charSet1.size + charSet2.size)
      : 0.0;

    // Blended similarity with strong weight on word overlap
    const blended = Math.max(wordDice, 0.7 * wordDice + 0.3 * charDice);
    return Math.round(blended * 1000) / 1000;
  }

  /**
   * Classifies the duplicate relationship between two questions based on deterministic similarity.
   * @param {number} similarity (0.0 - 1.0)
   * @returns {string} One of DUPLICATE_STATUS
   */
  function classifyDuplicateStatus(similarity) {
    if (typeof similarity !== 'number' || isNaN(similarity)) return DUPLICATE_STATUS.UNIQUE;
    if (similarity >= NEAR_DUPLICATE_THRESHOLDS.EXACT) {
      return DUPLICATE_STATUS.EXACT_DUPLICATE;
    }
    if (similarity >= NEAR_DUPLICATE_THRESHOLDS.PROBABLE) {
      return DUPLICATE_STATUS.PROBABLE_DUPLICATE;
    }
    if (similarity >= NEAR_DUPLICATE_THRESHOLDS.REVIEW_REQUIRED) {
      return DUPLICATE_STATUS.REVIEW_REQUIRED;
    }
    return DUPLICATE_STATUS.UNIQUE;
  }

  return {
    NEAR_DUPLICATE_THRESHOLDS,
    DUPLICATE_STATUS,
    normalizeSignatureText,
    computeVACTQuestionSignature,
    computeTextFingerprint,
    computeQuestionSimilarity,
    classifyDuplicateStatus
  };
});
