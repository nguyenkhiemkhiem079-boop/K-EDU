/**
 * K-EDU V-ACT Core Architecture - Canonical Question Schema & Normalizers
 * Defines schema types, difficulty levels, legacy difficulty mapping, and normalization.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    const taxonomy = require('./taxonomy');
    module.exports = factory(taxonomy);
  } else {
    root.KEDUVACT = root.KEDUVACT || {};
    Object.assign(root.KEDUVACT, factory(root.KEDUVACT));
  }
})(typeof window !== 'undefined' ? window : globalThis, function (taxonomyModule) {
  'use strict';

  const VACT_SECTIONS = taxonomyModule?.VACT_SECTIONS || {
    VIETNAMESE: 'vietnamese',
    ENGLISH: 'english',
    MATH: 'math',
    LOGIC_DATA: 'logic_data',
    SCIENTIFIC_REASONING: 'scientific_reasoning'
  };

  /**
   * Supported and reserved question types for V-ACT
   */
  const VACT_QUESTION_TYPES = Object.freeze({
    SINGLE_CHOICE: 'single_choice',
    MULTIPLE_CHOICE: 'multiple_choice',
    TRUE_FALSE: 'true_false',
    NUMERIC: 'numeric',
    MATCHING: 'matching',
    STIMULUS_QUESTION: 'stimulus_question'
  });

  /**
   * Canonical V-ACT UI difficulty levels
   */
  const VACT_DIFFICULTY = Object.freeze({
    EASY: 'easy',
    MEDIUM: 'medium',
    HARD: 'hard'
  });

  const LETTER_KEYS = Object.freeze(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);

  /**
   * Maps legacy Vietnamese difficulty codes (NB, TH, VD, VDC) to V-ACT canonical difficulty.
   * Conservative mapping:
   * NB  -> easy
   * TH  -> medium
   * VD  -> medium
   * VDC -> hard
   *
   * @param {*} rawLevel
   * @returns {"easy"|"medium"|"hard"}
   */
  function mapLegacyDifficulty(rawLevel) {
    if (!rawLevel) return VACT_DIFFICULTY.MEDIUM;
    const clean = String(rawLevel).trim().toUpperCase();

    if (clean === 'NB' || clean === 'NHẬN BIẾT' || clean === 'NHAN BIET') {
      return VACT_DIFFICULTY.EASY;
    }
    if (clean === 'TH' || clean === 'THÔNG HIỂU' || clean === 'THONG HIEU') {
      return VACT_DIFFICULTY.MEDIUM;
    }
    if (clean === 'VD' || clean === 'VẬN DỤNG' || clean === 'VAN DUNG') {
      return VACT_DIFFICULTY.MEDIUM;
    }
    if (clean === 'VDC' || clean === 'VẬN DỤNG CAO' || clean === 'VAN DUNG CAO') {
      return VACT_DIFFICULTY.HARD;
    }

    const lower = String(rawLevel).trim().toLowerCase();
    if (lower === 'easy' || lower === 'basic') return VACT_DIFFICULTY.EASY;
    if (lower === 'hard' || lower === 'advanced') return VACT_DIFFICULTY.HARD;
    if (lower === 'medium') return VACT_DIFFICULTY.MEDIUM;

    return VACT_DIFFICULTY.MEDIUM;
  }

  /**
   * Cleans option text by stripping redundant leading prefixes like "A. ", "B) "
   * @param {string} opt
   * @returns {string}
   */
  function cleanOptionText(opt) {
    if (opt === null || opt === undefined) return '';
    return String(opt).replace(/^[A-Da-d][.)\]]\s*/, '').trim();
  }

  /**
   * Normalizes answer to standard uppercase letter ('A', 'B', 'C', 'D')
   * Supports integer indices (0 -> A, 1 -> B, etc.) and raw strings.
   * 
   * @param {*} rawAnswer
   * @param {Array<string>} [options]
   * @returns {string}
   */
  function normalizeCorrectAnswer(rawAnswer, options) {
    if (rawAnswer === null || rawAnswer === undefined) return '';

    // If integer index: 0 -> A, 1 -> B, etc.
    if (typeof rawAnswer === 'number' && Number.isInteger(rawAnswer)) {
      if (rawAnswer >= 0 && rawAnswer < LETTER_KEYS.length) {
        return LETTER_KEYS[rawAnswer];
      }
    }

    const str = String(rawAnswer).trim();

    // Already a letter like 'A', 'b', 'C.'
    const letterMatch = str.match(/^[A-Da-d](?:[.)\]]|$)/);
    if (letterMatch) {
      return letterMatch[0].charAt(0).toUpperCase();
    }

    // If raw answer is an exact text match to one of the options
    if (Array.isArray(options) && options.length > 0) {
      const cleanTarget = cleanOptionText(str).toLowerCase();
      for (let i = 0; i < options.length; i++) {
        const cleanOpt = cleanOptionText(options[i]).toLowerCase();
        if (cleanOpt === cleanTarget && i < LETTER_KEYS.length) {
          return LETTER_KEYS[i];
        }
      }
    }

    return str;
  }

  /**
   * Canonical factory and normalizer for V-ACT questions.
   * Takes raw questions from DocumentQuestionBank, synthetic generators, or JSON files
   * and maps them strictly to the canonical V-ACT schema shape.
   *
   * Crucial rule: Does NOT silently invent verification states or difficulty scores.
   *
   * @param {object} raw
   * @returns {object} Canonical V-ACT question object
   */
  function normalizeVACTQuestion(raw) {
    if (!raw || typeof raw !== 'object') {
      throw new TypeError('normalizeVACTQuestion expects an object');
    }

    // Preserve original ID or generate deterministic fallback
    const id = raw.id ? String(raw.id).trim() : `vact_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    // Resolve section
    let section = raw.section ? String(raw.section).trim() : '';
    if (!section && raw.subject) {
      const subj = String(raw.subject).trim().toLowerCase();
      if (subj === 'toan') section = VACT_SECTIONS.MATH;
      else if (subj === 'khtn') section = VACT_SECTIONS.SCIENTIFIC_REASONING;
      else if (subj === 'tieng_viet' || subj === 'vietnamese') section = VACT_SECTIONS.VIETNAMESE;
      else if (subj === 'tieng_anh' || subj === 'english') section = VACT_SECTIONS.ENGLISH;
    }
    if (!section && raw.topic) {
      const top = String(raw.topic).trim().toLowerCase();
      if (top.includes('logic')) section = VACT_SECTIONS.LOGIC_DATA;
      else if (top.includes('data')) section = VACT_SECTIONS.LOGIC_DATA;
      else if (top.includes('tiengviet')) section = VACT_SECTIONS.VIETNAMESE;
      else if (top.includes('tienganh')) section = VACT_SECTIONS.ENGLISH;
      else if (['vat_ly', 'hoa_hoc', 'sinh_hoc'].includes(top)) section = VACT_SECTIONS.SCIENTIFIC_REASONING;
    }
    if (!section) {
      section = VACT_SECTIONS.MATH; // conservative fallback if no indicator
    }

    // Resolve skill and subSkill
    const skill = raw.skill ? String(raw.skill).trim() : (raw.topic ? String(raw.topic).trim() : null);
    const subSkill = raw.subSkill ? String(raw.subSkill).trim() : null;

    // Difficulty normalization (conservative, no invented scores)
    const difficulty = raw.difficulty && Object.values(VACT_DIFFICULTY).includes(raw.difficulty)
      ? raw.difficulty
      : mapLegacyDifficulty(raw.level || raw.difficulty);

    let difficultyScore = null;
    if (typeof raw.difficultyScore === 'number' && raw.difficultyScore >= 0 && raw.difficultyScore <= 1) {
      difficultyScore = raw.difficultyScore;
    }

    // Question type
    const questionType = raw.questionType && Object.values(VACT_QUESTION_TYPES).includes(raw.questionType)
      ? raw.questionType
      : VACT_QUESTION_TYPES.SINGLE_CHOICE;

    const stimulusId = raw.stimulusId || raw.passageId || null;

    // Question text
    const questionText = raw.question !== undefined && raw.question !== null ? String(raw.question).trim() : '';

    // Options normalization
    let rawOptions = [];
    if (Array.isArray(raw.options)) {
      rawOptions = raw.options.map(opt => cleanOptionText(opt));
    }
    const options = rawOptions;

    // Answer normalization
    const rawAns = raw.correctAnswer !== undefined ? raw.correctAnswer : (raw.answer !== undefined ? raw.answer : raw.correct);
    const correctAnswer = normalizeCorrectAnswer(rawAns, raw.options);

    // Explanation / Solution
    const explanation = raw.explanation !== undefined && raw.explanation !== null
      ? String(raw.explanation).trim()
      : (raw.solution !== undefined && raw.solution !== null ? String(raw.solution).trim() : '');

    // Source object (preserve original provenance without inventing verification)
    const rawSource = raw.source || {};
    const originalId = raw.originalId || rawSource.originalId || null;
    const source = {
      provider: rawSource.provider || 'internal',
      type: rawSource.type || (raw.synthetic ? 'synthetic' : 'curated'),
      title: rawSource.title || raw.sourceTitle || null,
      year: rawSource.year || raw.sourceYear || null,
      url: rawSource.url || raw.sourceUrl || null,
      file: rawSource.file || raw.sourceFile || null,
      page: rawSource.page !== undefined ? rawSource.page : (raw.sourcePage !== undefined ? raw.sourcePage : null),
      originalId: originalId,
      originalGrade: rawSource.originalGrade || raw.originalGrade || null,
      originalTopic: rawSource.originalTopic || raw.originalTopic || null,
      originalSubject: rawSource.originalSubject || raw.originalSubject || null
    };

    // Quality object (strict: do NOT invent review status)
    const rawQuality = raw.quality || {};
    const rawCuration = raw.curation || {};
    const quality = {
      sourceVerified: Boolean(rawQuality.sourceVerified || rawCuration.documentOriginVerified),
      answerVerified: Boolean(rawQuality.answerVerified || rawCuration.answerReviewed),
      reviewed: Boolean(rawQuality.reviewed || rawCuration.status === 'approved' || rawCuration.status === 'verified')
    };

    return {
      id,
      originalId,
      section,
      skill,
      subSkill,
      difficulty,
      difficultyScore,
      questionType,
      stimulusId,
      question: questionText,
      options,
      correctAnswer,
      explanation,
      source,
      quality
    };
  }

  return {
    VACT_QUESTION_TYPES,
    VACT_DIFFICULTY,
    mapLegacyDifficulty,
    cleanOptionText,
    normalizeCorrectAnswer,
    normalizeVACTQuestion
  };
});
