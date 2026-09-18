/**
 * K-EDU V-ACT Core Architecture - Full Exam Bank & Mirror Deduplication
 * Manages full exam sets, preserves original question numbers and examSetId,
 * validates 120-item completeness (rejecting 119/120 sets as incomplete),
 * computes exam fingerprints, and detects mirrored full exams across sources.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    const taxonomy = require('../taxonomy');
    const schema = require('../schema');
    const signature = require('../quality/signature');
    module.exports = factory(taxonomy, schema, signature);
  } else {
    root.KEDUVACT = root.KEDUVACT || {};
    root.KEDUVACT.bank = root.KEDUVACT.bank || {};
    const examBankModule = factory(root.KEDUVACT, root.KEDUVACT, root.KEDUVACT.quality);
    Object.assign(root.KEDUVACT.bank, examBankModule);
    root.KEDUVACT.examBank = examBankModule.examBank;
    root.KEDUVACT.VACTExamBank = examBankModule.VACTExamBank;
  }
})(typeof window !== 'undefined' ? window : globalThis, function (taxonomyModule, schemaModule, signatureModule) {
  'use strict';

  const VACT_SECTIONS = taxonomyModule?.VACT_SECTIONS || {
    VIETNAMESE: 'vietnamese',
    ENGLISH: 'english',
    MATH: 'math',
    LOGIC_DATA: 'logic_data',
    SCIENTIFIC_REASONING: 'scientific_reasoning'
  };

  const normalizeVACTQuestion = schemaModule?.normalizeVACTQuestion;
  const computeVACTQuestionSignature = signatureModule?.computeVACTQuestionSignature;

  const EXAM_STATUS = Object.freeze({
    COMPLETE: 'complete',
    INCOMPLETE: 'incomplete'
  });

  const FULL_EXAM_2025_SECTIONS = Object.freeze({
    [VACT_SECTIONS.VIETNAMESE]: 30,
    [VACT_SECTIONS.ENGLISH]: 30,
    [VACT_SECTIONS.MATH]: 30,
    [VACT_SECTIONS.LOGIC_DATA]: 12,
    [VACT_SECTIONS.SCIENTIFIC_REASONING]: 18
  });

  const FULL_EXAM_2025_TOTAL = 120;
  const MIRROR_OVERLAP_THRESHOLD = 0.90; // 90% or more overlap indicates mirrored exam

  /**
   * Deterministic simple hash string generator from sorted signature list.
   * @param {Array<string>} signatures
   * @returns {string}
   */
  function computeExamFingerprint(signatures) {
    if (!Array.isArray(signatures) || signatures.length === 0) return 'empty_exam_fp';
    const sorted = [...signatures].sort();
    let hash = 0;
    const str = sorted.join(';;;');
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32bit integer
    }
    const hex = (hash >>> 0).toString(16);
    return `fp_${sorted.length}_${hex}`;
  }

  /**
   * Validates completeness of an exam set against target structure.
   * For 2025+: Requires exactly 30 Viet, 30 Eng, 30 Math, 12 Logic/Data, 18 Scientific Reasoning.
   * If even 1 question is missing (e.g. 119/120), status = 'incomplete'.
   * Pre-2025 sources are always marked 'incomplete' for full-test simulation purposes.
   *
   * @param {object} params
   * @param {string} params.structureVersion
   * @param {Array<object>} params.questions
   * @returns {object} Completeness report
   */
  function validateExamCompleteness(params = {}) {
    const structureVersion = params.structureVersion || '2025+';
    const questions = Array.isArray(params.questions) ? params.questions : [];

    const sectionCounts = {
      [VACT_SECTIONS.VIETNAMESE]: 0,
      [VACT_SECTIONS.ENGLISH]: 0,
      [VACT_SECTIONS.MATH]: 0,
      [VACT_SECTIONS.LOGIC_DATA]: 0,
      [VACT_SECTIONS.SCIENTIFIC_REASONING]: 0
    };

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (q && q.section && sectionCounts[q.section] !== undefined) {
        sectionCounts[q.section]++;
      }
    }

    // Pre-2025 legacy sources cannot be a complete 2025+ full test
    if (structureVersion === 'legacy_pre_2025') {
      return {
        isComplete: false,
        status: EXAM_STATUS.INCOMPLETE,
        reason: 'LEGACY_PRE_2025_SUPPLEMENTAL_ONLY',
        structureVersion,
        totalCount: questions.length,
        expectedCount: FULL_EXAM_2025_TOTAL,
        missingCount: Math.max(0, FULL_EXAM_2025_TOTAL - questions.length),
        sectionCounts,
        deficits: { ...FULL_EXAM_2025_SECTIONS }
      };
    }

    const deficits = {};
    let missingCount = 0;
    let isComplete = true;

    for (const [secKey, expected] of Object.entries(FULL_EXAM_2025_SECTIONS)) {
      const actual = sectionCounts[secKey] || 0;
      const deficit = Math.max(0, expected - actual);
      deficits[secKey] = deficit;
      if (deficit > 0) {
        isComplete = false;
        missingCount += deficit;
      }
    }

    if (questions.length < FULL_EXAM_2025_TOTAL) {
      isComplete = false;
      missingCount = Math.max(missingCount, FULL_EXAM_2025_TOTAL - questions.length);
    }

    return {
      isComplete,
      status: isComplete ? EXAM_STATUS.COMPLETE : EXAM_STATUS.INCOMPLETE,
      reason: isComplete ? null : (questions.length === 119 ? 'EXACT_119_DEFICIT' : 'SECTION_DEFICIT'),
      structureVersion,
      totalCount: questions.length,
      expectedCount: FULL_EXAM_2025_TOTAL,
      missingCount,
      sectionCounts,
      deficits
    };
  }

  /**
   * Computes overlap ratio between two sets of question signatures.
   * @param {Set<string>} setA
   * @param {Set<string>} setB
   * @returns {number} Float 0.0 - 1.0
   */
  function computeSignatureOverlap(setA, setB) {
    if (!setA || !setB || setA.size === 0 || setB.size === 0) return 0.0;
    let intersection = 0;
    for (const sig of setA) {
      if (setB.has(sig)) {
        intersection++;
      }
    }
    const smaller = Math.min(setA.size, setB.size);
    return smaller > 0 ? (intersection / smaller) : 0.0;
  }

  /**
   * VACTExamBank manages full exam models, preserving complete exam structure,
   * origin numbers, and deduplicating mirrored exams across providers.
   */
  class VACTExamBank {
    constructor() {
      this._exams = new Map();
      this._examSignatures = new Map(); // examId -> Set of signatures
    }

    /**
     * Clears all registered exams.
     */
    clear() {
      this._exams.clear();
      this._examSignatures.clear();
    }

    /**
     * Registers a full exam set into the bank.
     * Preserves question origin, validates completeness, computes fingerprint,
     * and performs mirror deduplication.
     *
     * @param {object} rawExam
     * @returns {object} Registered exam entity
     */
    registerExam(rawExam) {
      if (!rawExam || typeof rawExam !== 'object') {
        throw new TypeError('registerExam expects an object');
      }

      const id = rawExam.id ? String(rawExam.id).trim() : `vact_exam_${Date.now()}`;
      const sourceId = rawExam.sourceId ? String(rawExam.sourceId).trim() : 'unknown_source';
      const year = typeof rawExam.year === 'number' ? rawExam.year : 2025;
      const structureVersion = rawExam.structureVersion || (year < 2025 ? 'legacy_pre_2025' : '2025+');
      const title = rawExam.title ? String(rawExam.title).trim() : id;

      const rawQuestions = Array.isArray(rawExam.questions) ? rawExam.questions : [];
      const normalizedQuestions = [];
      const signatures = [];
      const sigSet = new Set();

      for (let i = 0; i < rawQuestions.length; i++) {
        const rawQ = rawQuestions[i];
        if (!rawQ) continue;

        // Preserve origin fields
        const questionWithOrigin = {
          ...rawQ,
          examSetId: id,
          originalQuestionNumber: typeof rawQ.originalQuestionNumber === 'number' ? rawQ.originalQuestionNumber : (i + 1),
          sourceId: sourceId,
          structureVersion: structureVersion
        };

        const norm = normalizeVACTQuestion ? normalizeVACTQuestion(questionWithOrigin) : questionWithOrigin;
        const sig = computeVACTQuestionSignature ? computeVACTQuestionSignature(norm) : (norm.signature || norm.id);

        norm.signature = sig;
        norm.examSetId = id;
        norm.originalQuestionNumber = questionWithOrigin.originalQuestionNumber;
        norm.sourceId = sourceId;
        norm.structureVersion = structureVersion;

        normalizedQuestions.push(norm);
        signatures.push(sig);
        sigSet.add(sig);
      }

      // Check completeness
      const completeness = validateExamCompleteness({
        structureVersion,
        questions: normalizedQuestions
      });

      // Compute fingerprint
      const examFingerprint = computeExamFingerprint(signatures);

      // Check for mirrored copy against existing registered canonical exams
      let isCanonical = true;
      let canonicalExamId = null;
      let mirrorOverlapRatio = 0;

      for (const [existingId, existingSignatures] of this._examSignatures.entries()) {
        const existingExam = this._exams.get(existingId);
        if (!existingExam || !existingExam.isCanonical) continue;

        const overlap = computeSignatureOverlap(sigSet, existingSignatures);
        if (overlap >= MIRROR_OVERLAP_THRESHOLD) {
          isCanonical = false;
          canonicalExamId = existingId;
          mirrorOverlapRatio = Math.round(overlap * 1000) / 1000;

          // Add this source reference as mirror under canonical exam
          if (!existingExam.mirrors) {
            existingExam.mirrors = [];
          }
          existingExam.mirrors.push({
            mirrorExamId: id,
            sourceId,
            provider: rawExam.provider || sourceId,
            year,
            overlapRatio: mirrorOverlapRatio
          });
          break;
        }
      }

      const examRecord = {
        id,
        sourceId,
        provider: rawExam.provider || sourceId,
        title,
        year,
        structureVersion,
        expectedQuestions: FULL_EXAM_2025_TOTAL,
        sections: { ...FULL_EXAM_2025_SECTIONS },
        questionIds: normalizedQuestions.map(q => q.id),
        questions: normalizedQuestions,
        completeness,
        status: completeness.status,
        examFingerprint,
        isCanonical,
        canonicalExamId,
        mirrors: isCanonical ? [] : null
      };

      this._exams.set(id, examRecord);
      this._examSignatures.set(id, sigSet);

      return JSON.parse(JSON.stringify(examRecord));
    }

    /**
     * Retrieves an exam by its ID.
     * @param {string} examId
     * @returns {object|null}
     */
    getExam(examId) {
      if (!examId || typeof examId !== 'string') return null;
      const ex = this._exams.get(examId.trim());
      return ex ? JSON.parse(JSON.stringify(ex)) : null;
    }

    /**
     * Returns all registered exams.
     * @returns {Array<object>}
     */
    getAllExams() {
      return Array.from(this._exams.values()).map(e => JSON.parse(JSON.stringify(e)));
    }

    /**
     * Returns only canonical unique exams (filtering out mirrored copies).
     * @returns {Array<object>}
     */
    getCanonicalExams() {
      return this.getAllExams().filter(e => e.isCanonical);
    }

    /**
     * Returns complete, canonical 2025+ full exams ready for full 120-item simulation.
     * @returns {Array<object>}
     */
    getCompleteExams() {
      return this.getAllExams().filter(e => e.isCanonical && e.status === EXAM_STATUS.COMPLETE);
    }

    /**
     * Returns incomplete exams.
     * @returns {Array<object>}
     */
    getIncompleteExams() {
      return this.getAllExams().filter(e => e.status === EXAM_STATUS.INCOMPLETE);
    }

    /**
     * Retrieves questions of a given exam.
     * @param {string} examId
     * @returns {Array<object>}
     */
    getExamQuestions(examId) {
      const ex = this._exams.get(examId);
      if (!ex || !Array.isArray(ex.questions)) return [];
      return ex.questions.map(q => JSON.parse(JSON.stringify(q)));
    }

    /**
     * Returns diagnostic statistics of the exam bank.
     * @returns {object}
     */
    getDiagnostics() {
      const all = this.getAllExams();
      const canonical = all.filter(e => e.isCanonical);
      const complete = canonical.filter(e => e.status === EXAM_STATUS.COMPLETE);
      const incomplete = all.filter(e => e.status === EXAM_STATUS.INCOMPLETE);
      const mirrors = all.filter(e => !e.isCanonical);

      return {
        totalRegistered: all.length,
        canonicalCount: canonical.length,
        mirrorsCount: mirrors.length,
        completeCanonicalCount: complete.length,
        incompleteCount: incomplete.length,
        mirrors: mirrors.map(m => ({
          id: m.id,
          canonicalExamId: m.canonicalExamId,
          sourceId: m.sourceId
        }))
      };
    }
  }

  const examBank = new VACTExamBank();

  return {
    EXAM_STATUS,
    FULL_EXAM_2025_SECTIONS,
    FULL_EXAM_2025_TOTAL,
    MIRROR_OVERLAP_THRESHOLD,
    computeExamFingerprint,
    validateExamCompleteness,
    computeSignatureOverlap,
    VACTExamBank,
    examBank
  };
});
