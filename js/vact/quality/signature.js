/**
 * K-EDU V-ACT Core Architecture - Signature & Anti-Duplication Quality Engine
 * Computes deterministic signatures for V-ACT questions and options.
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

  /**
   * Normalizes text by removing zero-width chars, converting to Unicode NFC,
   * collapsing whitespace, stripping redundant LaTeX math tags, removing space
   * before punctuation, and lowercasing.
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
      .replace(/\\\(|\\\)|\\\[|\\\]|\$/g, ' ') // replace LaTeX delimiters with space to avoid word gluing
      .replace(/\r\n/g, '\n')
      .replace(/\s+/g, ' ')
      .replace(/\s+([.,:;!?…])/g, '$1') // remove space before punctuation marks
      .trim()
      .toLowerCase();

    // Strip leading option letters like "a. ", "b) ", "[c] "
    str = str.replace(/^[a-d][.)\]]\s*/i, '');
    return str;
  }

  /**
   * Computes a canonical signature for a question and its options.
   * Independent of IDs, timestamps, and formatting differences.
   * 
   * @param {string|object} questionOrObj Question string or raw/normalized question object
   * @param {Array<string>} [optionsList] Array of option strings (if first param is string)
   * @returns {string}
   */
  function computeVACTQuestionSignature(questionOrObj, optionsList) {
    let questionText = '';
    let options = [];

    if (questionOrObj && typeof questionOrObj === 'object') {
      questionText = questionOrObj.question || '';
      options = Array.isArray(questionOrObj.options) ? questionOrObj.options : [];
    } else {
      questionText = String(questionOrObj || '');
      options = Array.isArray(optionsList) ? optionsList : [];
    }

    const normQ = normalizeSignatureText(questionText);
    const normOptions = options
      .map(normalizeSignatureText)
      .filter(Boolean)
      .join(' | ');

    if (!normOptions) {
      return normQ;
    }

    return `${normQ} ::: [${normOptions}]`;
  }

  return {
    normalizeSignatureText,
    computeVACTQuestionSignature
  };
});
