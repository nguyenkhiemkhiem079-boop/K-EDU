/**
 * K-EDU V-ACT Core Architecture - Taxonomy & Section Definitions
 * Target Exam: V-ACT / Đánh Giá Năng Lực ĐHQG-HCM
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
   * Five Core V-ACT Sections
   */
  const VACT_SECTIONS = Object.freeze({
    VIETNAMESE: 'vietnamese',
    ENGLISH: 'english',
    MATH: 'math',
    LOGIC_DATA: 'logic_data',
    SCIENTIFIC_REASONING: 'scientific_reasoning'
  });

  /**
   * Human-readable metadata for sections
   */
  const VACT_SECTION_META = Object.freeze({
    [VACT_SECTIONS.VIETNAMESE]: Object.freeze({
      id: VACT_SECTIONS.VIETNAMESE,
      nameVi: 'Sử dụng ngôn ngữ - Tiếng Việt',
      nameEn: 'Language Usage - Vietnamese',
      standardQuestions: 30
    }),
    [VACT_SECTIONS.ENGLISH]: Object.freeze({
      id: VACT_SECTIONS.ENGLISH,
      nameVi: 'Sử dụng ngôn ngữ - Tiếng Anh',
      nameEn: 'Language Usage - English',
      standardQuestions: 30
    }),
    [VACT_SECTIONS.MATH]: Object.freeze({
      id: VACT_SECTIONS.MATH,
      nameVi: 'Toán học',
      nameEn: 'Mathematics',
      standardQuestions: 30
    }),
    [VACT_SECTIONS.LOGIC_DATA]: Object.freeze({
      id: VACT_SECTIONS.LOGIC_DATA,
      nameVi: 'Tư duy logic & Phân tích số liệu',
      nameEn: 'Logical Thinking & Data Analysis',
      standardQuestions: 12
    }),
    [VACT_SECTIONS.SCIENTIFIC_REASONING]: Object.freeze({
      id: VACT_SECTIONS.SCIENTIFIC_REASONING,
      nameVi: 'Suy luận khoa học',
      nameEn: 'Scientific Reasoning',
      standardQuestions: 18
    })
  });

  /**
   * Central V-ACT Taxonomy by Section
   */
  const VACT_TAXONOMY = Object.freeze({
    [VACT_SECTIONS.VIETNAMESE]: Object.freeze([
      'reading_comprehension',
      'vocabulary',
      'grammar',
      'language_usage',
      'literary_analysis',
      'inference'
    ]),
    [VACT_SECTIONS.ENGLISH]: Object.freeze([
      'vocabulary',
      'grammar',
      'reading_comprehension',
      'communication',
      'inference'
    ]),
    [VACT_SECTIONS.MATH]: Object.freeze([
      'algebra',
      'functions',
      'geometry',
      'probability_statistics',
      'real_world_math',
      'data_reading'
    ]),
    [VACT_SECTIONS.LOGIC_DATA]: Object.freeze([
      'logical_reasoning',
      'conditional_reasoning',
      'pattern_reasoning',
      'table_analysis',
      'chart_analysis',
      'data_interpretation'
    ]),
    [VACT_SECTIONS.SCIENTIFIC_REASONING]: Object.freeze([
      'physics',
      'chemistry',
      'biology',
      'history',
      'geography',
      'economics_law',
      'technology',
      'society',
      'interdisciplinary',
      'economics' // alias/backward-compatibility
    ])
  });

  /**
   * Check whether a section string is a valid V-ACT section ID
   * @param {string} section
   * @returns {boolean}
   */
  function isValidSection(section) {
    if (!section || typeof section !== 'string') return false;
    return Object.values(VACT_SECTIONS).includes(section.trim());
  }

  /**
   * Get all registered skills for a given section
   * @param {string} section
   * @returns {readonly string[]}
   */
  function getSkillsForSection(section) {
    if (!isValidSection(section)) return Object.freeze([]);
    return VACT_TAXONOMY[section.trim()] || Object.freeze([]);
  }

  /**
   * Validate whether a (section, skill) combination is valid in the V-ACT taxonomy
   * @param {string} section
   * @param {string} skill
   * @returns {boolean}
   */
  function isValidSectionSkill(section, skill) {
    if (!isValidSection(section) || !skill || typeof skill !== 'string') return false;
    const skills = VACT_TAXONOMY[section.trim()];
    return Boolean(skills && skills.includes(skill.trim()));
  }

  /**
   * Get metadata for a section
   * @param {string} section
   * @returns {object|null}
   */
  function getSectionMetadata(section) {
    if (!isValidSection(section)) return null;
    return VACT_SECTION_META[section.trim()] || null;
  }

  return {
    VACT_SECTIONS,
    VACT_SECTION_META,
    VACT_TAXONOMY,
    isValidSection,
    getSkillsForSection,
    isValidSectionSkill,
    getSectionMetadata
  };
});
