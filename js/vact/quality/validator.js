/**
 * K-EDU V-ACT Core Architecture - Question Quality Validator
 * Validates canonical V-ACT question objects against schema, taxonomy, and option integrity.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    const taxonomy = require('../taxonomy');
    const schema = require('../schema');
    module.exports = factory(taxonomy, schema);
  } else {
    root.KEDUVACT = root.KEDUVACT || {};
    Object.assign(root.KEDUVACT, factory(root.KEDUVACT, root.KEDUVACT));
  }
})(typeof window !== 'undefined' ? window : globalThis, function (taxonomyModule, schemaModule) {
  'use strict';

  const isValidSection = taxonomyModule?.isValidSection || (() => true);
  const isValidSectionSkill = taxonomyModule?.isValidSectionSkill || (() => true);
  const VACT_QUESTION_TYPES = schemaModule?.VACT_QUESTION_TYPES || {
    SINGLE_CHOICE: 'single_choice'
  };
  const VACT_DIFFICULTY = schemaModule?.VACT_DIFFICULTY || {
    EASY: 'easy',
    MEDIUM: 'medium',
    HARD: 'hard'
  };

  const LETTER_KEYS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  /**
   * Validates a canonical V-ACT question.
   * Returns a structured validation result without throwing.
   *
   * @param {*} question
   * @returns {{ valid: boolean, errors: string[] }}
   */
  function validateVACTQuestion(question) {
    const errors = [];

    if (!question || typeof question !== 'object' || Array.isArray(question)) {
      return { valid: false, errors: ['Question must be a non-null object'] };
    }

    // 1. Validate ID
    if (!question.id || typeof question.id !== 'string' || !question.id.trim()) {
      errors.push('Field "id" is required and must be a non-empty string');
    }

    // 2. Validate Section
    if (!question.section || typeof question.section !== 'string' || !isValidSection(question.section)) {
      errors.push(`Field "section" is invalid or unrecognized: "${question.section}"`);
    }

    // 3. Validate Question Text
    if (!question.question || typeof question.question !== 'string' || !question.question.trim()) {
      errors.push('Field "question" must be a non-empty string');
    }

    // 4. Validate Question Type
    const validTypes = Object.values(VACT_QUESTION_TYPES);
    if (!question.questionType || !validTypes.includes(question.questionType)) {
      errors.push(`Field "questionType" is invalid. Allowed types: ${validTypes.join(', ')}`);
    }

    // 5. Validate Taxonomy (Section & Skill combination)
    if (question.skill) {
      if (typeof question.skill !== 'string' || !question.skill.trim()) {
        errors.push('Field "skill" must be a non-empty string if provided');
      } else if (question.section && isValidSection(question.section)) {
        if (!isValidSectionSkill(question.section, question.skill)) {
          errors.push(`Skill "${question.skill}" is not a recognized taxonomy skill for section "${question.section}"`);
        }
      }
    }

    // 6. Validate Difficulty
    const validDiffs = Object.values(VACT_DIFFICULTY);
    if (!question.difficulty || !validDiffs.includes(question.difficulty)) {
      errors.push(`Field "difficulty" must be one of: ${validDiffs.join(', ')}`);
    }

    // 7. Validate Difficulty Score (must be null or number between 0 and 1)
    if (question.difficultyScore !== null && question.difficultyScore !== undefined) {
      if (typeof question.difficultyScore !== 'number' || isNaN(question.difficultyScore) || question.difficultyScore < 0 || question.difficultyScore > 1) {
        errors.push('Field "difficultyScore" must be null or a number between 0 and 1');
      }
    }

    // 8. Validate Correct Answer presence
    if (question.correctAnswer === null || question.correctAnswer === undefined || question.correctAnswer === '') {
      errors.push('Field "correctAnswer" is required');
    }

    // 9. Validate Single Choice specifics
    if (question.questionType === VACT_QUESTION_TYPES.SINGLE_CHOICE) {
      if (!Array.isArray(question.options)) {
        errors.push('Field "options" must be an array for single_choice questions');
      } else if (question.options.length < 2) {
        errors.push(`Field "options" must contain at least 2 choices, got ${question.options.length}`);
      } else {
        // Validate options content
        const emptyOptIndex = question.options.findIndex(opt => opt === null || opt === undefined || String(opt).trim() === '');
        if (emptyOptIndex !== -1) {
          errors.push(`Option at index ${emptyOptIndex} is empty`);
        }

        // Validate correctAnswer maps to one of the options
        const ans = String(question.correctAnswer).trim().toUpperCase();
        const letterIndex = LETTER_KEYS.indexOf(ans);

        let answerMapped = false;
        if (letterIndex !== -1) {
          if (letterIndex < question.options.length) {
            answerMapped = true;
          } else {
            errors.push(`Answer "${ans}" exceeds option count (${question.options.length})`);
          }
        } else {
          // If numeric index
          const num = Number(question.correctAnswer);
          if (Number.isInteger(num) && num >= 0 && num < question.options.length) {
            answerMapped = true;
          } else {
            // Or exact text match
            const target = String(question.correctAnswer).trim().toLowerCase();
            const found = question.options.some(opt => String(opt).trim().toLowerCase() === target);
            if (found) {
              answerMapped = true;
            }
          }
        }

        if (!answerMapped && errors.length === 0) {
          errors.push(`correctAnswer "${question.correctAnswer}" does not map to any provided option`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  return {
    validateVACTQuestion
  };
});
