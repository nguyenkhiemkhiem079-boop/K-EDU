/**
 * K-EDU V-ACT Core Architecture - Legacy Question Bank Adapter
 * Adapts existing K-EDU DocumentQuestionBank items to canonical V-ACT question schema on-the-fly.
 * Strict rules: No raw record mutation, no invented verification, explicit eligibility rules.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    const taxonomy = require('../taxonomy');
    const schema = require('../schema');
    const validator = require('../quality/validator');
    module.exports = factory(taxonomy, schema, validator);
  } else {
    root.KEDUVACT = root.KEDUVACT || {};
    root.KEDUVACT.bank = root.KEDUVACT.bank || {};
    const adapter = factory(root.KEDUVACT, root.KEDUVACT, root.KEDUVACT);
    Object.assign(root.KEDUVACT.bank, adapter);
    Object.assign(root.KEDUVACT, adapter);
  }
})(typeof window !== 'undefined' ? window : globalThis, function (taxonomyModule, schemaModule, validatorModule) {
  'use strict';

  const VACT_SECTIONS = taxonomyModule?.VACT_SECTIONS || {
    VIETNAMESE: 'vietnamese',
    ENGLISH: 'english',
    MATH: 'math',
    LOGIC_DATA: 'logic_data',
    SCIENTIFIC_REASONING: 'scientific_reasoning'
  };

  const mapLegacyDifficulty = schemaModule?.mapLegacyDifficulty || (lvl => 'medium');
  const normalizeVACTQuestion = schemaModule?.normalizeVACTQuestion;
  const validateVACTQuestion = validatorModule?.validateVACTQuestion || (() => ({ valid: true, errors: [] }));

  /**
   * Maps legacy question topic, subject, and grade to V-ACT section and skill.
   * Conservative: Only maps when metadata is reliably unambiguous.
   *
   * @param {object} raw
   * @returns {{ section: string|null, skill: string|null, status: string }}
   */
  function mapLegacySectionAndSkill(raw) {
    if (!raw || typeof raw !== 'object') {
      return { section: null, skill: null, status: 'invalid_record' };
    }

    const topic = String(raw.topic || '').trim().toLowerCase();
    const subject = String(raw.subject || 'toan').trim().toLowerCase();
    const gradeStr = String(raw.grade || '').trim().toUpperCase();

    // 1. Logic & Data (DGNL specific)
    if (topic === 'dgnl_logic') {
      return { section: VACT_SECTIONS.LOGIC_DATA, skill: 'logical_reasoning', status: 'mapped' };
    }
    if (topic === 'dgnl_data') {
      return { section: VACT_SECTIONS.LOGIC_DATA, skill: 'data_interpretation', status: 'mapped' };
    }

    // 2. Vietnamese (DGNL specific)
    if (topic === 'dgnl_tiengviet' || topic.includes('tiengviet')) {
      return { section: VACT_SECTIONS.VIETNAMESE, skill: 'language_usage', status: 'mapped' };
    }

    // 3. Scientific Reasoning (KHTN: Physics, Chemistry, Biology)
    if (topic === 'vat_ly' || topic === 'vatly') {
      return { section: VACT_SECTIONS.SCIENTIFIC_REASONING, skill: 'physics', status: 'mapped' };
    }
    if (topic === 'hoa_hoc' || topic === 'hoahoc') {
      return { section: VACT_SECTIONS.SCIENTIFIC_REASONING, skill: 'chemistry', status: 'mapped' };
    }
    if (topic === 'sinh_hoc' || topic === 'sinhhoc') {
      return { section: VACT_SECTIONS.SCIENTIFIC_REASONING, skill: 'biology', status: 'mapped' };
    }

    // 4. Mathematics (Strict eligibility: Grade 10, 11, 12, or Grade: DGNL)
    const isHighSchoolOrDgnl = ['10', '11', '12', 'DGNL'].includes(gradeStr);
    const isMiddleSchool = ['6', '7', '8', '9'].includes(gradeStr);

    if (subject === 'toan') {
      if (isMiddleSchool) {
        return {
          section: null,
          skill: null,
          status: 'unsupported_grade_middle_school'
        };
      }

      if (isHighSchoolOrDgnl) {
        let mathSkill = 'algebra';
        if (['ham_so', 'luong_giac'].includes(topic)) {
          mathSkill = 'functions';
        } else if (['vecto', 'hinh_hoc'].includes(topic)) {
          mathSkill = 'geometry';
        } else if (['xac_suat'].includes(topic)) {
          mathSkill = 'probability_statistics';
        } else if (['dai_so', 'mu_logarit', 'tich_phan', 'so_hoc'].includes(topic)) {
          mathSkill = 'algebra';
        }
        return { section: VACT_SECTIONS.MATH, skill: mathSkill, status: 'mapped' };
      }
    }

    return { section: null, skill: null, status: 'unmapped_section' };
  }

  /**
   * Evaluates whether a raw legacy question satisfies V-ACT eligibility rules.
   *
   * @param {object} raw
   * @returns {{ eligible: boolean, reason?: string }}
   */
  function isLegacyQuestionEligible(raw) {
    if (!raw || typeof raw !== 'object') {
      return { eligible: false, reason: 'Record is not an object' };
    }

    // Question content check
    const qText = String(raw.question || '').trim();
    if (!qText || qText.length < 5) {
      return { eligible: false, reason: 'Missing or malformed question text' };
    }

    // Options check
    if (!Array.isArray(raw.options) || raw.options.length < 2) {
      return { eligible: false, reason: 'Must have at least 2 options' };
    }

    // Answer presence check
    const hasAnswer = raw.correctAnswer !== undefined || raw.answer !== undefined || raw.correct !== undefined;
    if (!hasAnswer || raw.correctAnswer === null || raw.correctAnswer === '') {
      return { eligible: false, reason: 'Missing answer key' };
    }

    // Section mapping check
    const mapping = mapLegacySectionAndSkill(raw);
    if (!mapping.section) {
      return { eligible: false, reason: mapping.status };
    }

    return { eligible: true };
  }

  /**
   * Adapts a raw legacy question into a validated canonical V-ACT question object.
   * Does NOT mutate the input rawQuestion.
   *
   * @param {object} rawQuestion
   * @returns {{ success: boolean, question?: object, reason?: string, errors?: string[] }}
   */
  function adaptLegacyQuestion(rawQuestion) {
    if (!rawQuestion || typeof rawQuestion !== 'object') {
      return { success: false, reason: 'Raw question must be a non-null object' };
    }

    // 1. Eligibility Check
    const eligibility = isLegacyQuestionEligible(rawQuestion);
    if (!eligibility.eligible) {
      return { success: false, reason: eligibility.reason };
    }

    // 2. Section & Skill Mapping
    const mapping = mapLegacySectionAndSkill(rawQuestion);
    if (!mapping.section) {
      return { success: false, reason: mapping.status };
    }

    // 3. Preserve provenance and original identifier
    const originalId = rawQuestion.id ? String(rawQuestion.id).trim() : '';
    const adaptedId = originalId ? (originalId.startsWith('legacy:') ? originalId : `legacy:${originalId}`) : `legacy_${Date.now()}`;

    // 4. Quality flags: Do NOT invent review or verification states
    const rawQuality = rawQuestion.quality || {};
    const rawCuration = rawQuestion.curation || {};
    const quality = {
      sourceVerified: Boolean(rawQuality.sourceVerified || rawCuration.documentOriginVerified),
      answerVerified: Boolean(rawQuality.answerVerified || rawCuration.answerReviewed),
      reviewed: Boolean(rawQuality.reviewed || rawCuration.status === 'approved' || rawCuration.status === 'verified')
    };

    // 5. Source metadata
    const source = {
      provider: 'kedu_legacy',
      type: rawQuestion.synthetic ? 'synthetic' : 'curated',
      title: rawQuestion.sourceTitle || rawQuestion.source || null,
      year: rawQuestion.sourceYear || null,
      url: rawQuestion.sourceUrl || null,
      file: rawQuestion.sourceFile || (typeof rawQuestion.source === 'string' && rawQuestion.source.includes('.pdf') ? rawQuestion.source : null),
      page: rawQuestion.sourcePage !== undefined ? rawQuestion.sourcePage : null,
      originalId: originalId || null,
      originalGrade: rawQuestion.grade || null,
      originalTopic: rawQuestion.topic || null,
      originalSubject: rawQuestion.subject || null
    };

    // 6. Build canonical input shape
    const intermediate = {
      id: adaptedId,
      section: mapping.section,
      skill: mapping.skill,
      subSkill: null, // Conservative: do not invent sub-skill without rigorous classifier
      difficulty: mapLegacyDifficulty(rawQuestion.level),
      difficultyScore: null, // Conservative: keep null, do not invent scores
      questionType: 'single_choice',
      stimulusId: rawQuestion.stimulusId || rawQuestion.passageId || null,
      question: rawQuestion.question,
      options: rawQuestion.options,
      correctAnswer: rawQuestion.correctAnswer !== undefined ? rawQuestion.correctAnswer : (rawQuestion.answer !== undefined ? rawQuestion.answer : rawQuestion.correct),
      explanation: rawQuestion.explanation || rawQuestion.solution || '',
      source,
      quality
    };

    // 7. Normalization
    let normalized;
    try {
      normalized = normalizeVACTQuestion(intermediate);
    } catch (err) {
      return { success: false, reason: `Normalization failed: ${err.message}` };
    }

    // 8. Strict Schema Validation
    const val = validateVACTQuestion(normalized);
    if (!val.valid) {
      return {
        success: false,
        reason: val.errors.join('; '),
        errors: val.errors
      };
    }

    return {
      success: true,
      question: normalized
    };
  }

  return {
    mapLegacySectionAndSkill,
    isLegacyQuestionEligible,
    adaptLegacyQuestion
  };
});
