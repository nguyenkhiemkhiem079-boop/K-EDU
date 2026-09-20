(function () {
  'use strict';

  const VERSION = 2;
  const labels = { toan: 'Toán học', khtn: 'Khoa học Tự nhiên', vact: 'V-ACT — ĐHQG TP.HCM' };
  const VACT_PROFILES = {
    vact_mini_30: { totalQuestions: 30, sections: { vietnamese: 8, english: 8, math: 7, logic_data: 3, scientific_reasoning: 4 } },
    vact_mini_60: { totalQuestions: 60, sections: { vietnamese: 15, english: 15, math: 15, logic_data: 6, scientific_reasoning: 9 } },
    vact_mini_100: { totalQuestions: 100, sections: { vietnamese: 25, english: 25, math: 25, logic_data: 10, scientific_reasoning: 15 } },
    vact_full: { totalQuestions: 120, sections: { vietnamese: 30, english: 30, math: 30, logic_data: 12, scientific_reasoning: 18 } }
  };
  const PROFILE_SOURCE_TYPES = { vact_mini_30: 'vact_mini_30', vact_mini_60: 'vact_mini_60', vact_mini_100: 'vact_mini_100', vact_full: 'vact_full_120' };
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const normalSubject = raw => {
    const s = String(raw || '').toLowerCase();
    if (/vact|v-act|dgnl/.test(s)) return 'vact';
    if (/khtn|vật|lý|hóa|sinh/.test(s)) return 'khtn';
    return 'toan';
  };
  const profileFromRaw = raw => raw?.vactMeta?.profileId || raw?.metadata?.vact?.profileId || raw?.profileId || null;
  const sourceType = raw => {
    if (raw.sourceType) return String(raw.sourceType);
    const profileId = profileFromRaw(raw);
    if (profileId && PROFILE_SOURCE_TYPES[profileId]) return PROFILE_SOURCE_TYPES[profileId];
    if (raw.vactMeta || raw.metadata?.vact || raw.subject === 'vact') return 'vact_unclassified';
    return normalSubject(raw.subject) === 'khtn'
      ? 'khtn_generated'
      : (raw.pdfDataUrl && !raw.examHtml ? 'teacher_upload' : 'math_generated');
  };
  const getQuestionCounts = raw => {
    const keys = Array.isArray(raw.answerKeys) ? raw.answerKeys : [];
    if (keys.length) {
      const mcq = keys.filter(k => (k.type || 'mcq') !== 'essay').length;
      return { totalQuestions: keys.length, mcqCount: mcq, essayCount: keys.length - mcq };
    }
    const total = Number(raw.totalQuestions ?? raw.questionsCount ?? 0) || 0;
    const essay = Number(raw.essayCount || 0) || 0;
    return { totalQuestions: total, mcqCount: Number(raw.mcqCount ?? total - essay) || 0, essayCount: essay };
  };
  const cleanText = value => String(value ?? '').replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim();
  const answerPlaceholder = value => {
    const s = cleanText(value).toLowerCase();
    return !s || /^(undefined|null|n\/a|na|todo|tbd|unknown|chưa có|chua co|pending)$/.test(s) || s === '12 | x=12';
  };
  const optionLetter = value => {
    const s = cleanText(value).toUpperCase();
    const match = s.match(/^([A-H])(?:[.)\s:]|$)/);
    return match ? match[1] : null;
  };
  const normalizeOption = value => cleanText(value).replace(/^([A-H])[.):]+/i, '').trim().toLowerCase();
  const buildSource = key => key.source || {
    question: { id: key.questionSourceId || null, file: key.questionSourceFile || null, page: key.questionSourcePage || null },
    solution: { id: key.solutionSourceId || null, file: key.solutionSourceFile || null, page: key.solutionSourcePage || null },
    examSetId: key.examSetId || null,
    answerVerified: key.answerVerified ?? null,
    quality: key.quality || null,
    stimulus: key.stimulus || null,
    assets: key.assets || null
  };
  function normalizeKey(key = {}, index, publicOnly = false) {
    const options = Array.isArray(key.options) ? key.options.map(value => String(value ?? '')) : null;
    const rawCorrect = key.correct ?? key.correctAnswer ?? null;
    const letter = optionLetter(rawCorrect);
    const exactIndex = options && rawCorrect != null ? options.findIndex(option => normalizeOption(option) === normalizeOption(rawCorrect)) : -1;
    const correct = letter || (exactIndex >= 0 ? String.fromCharCode(65 + exactIndex) : rawCorrect);
    const normalized = {
      ...key,
      num: Number(key.num || index + 1),
      id: key.id || null,
      questionId: key.questionId || null,
      type: key.type === 'essay' ? 'essay' : 'mcq',
      correct,
      score: Number(key.score ?? 1),
      content: key.content ?? key.question ?? null,
      options,
      explanation: key.explanation ?? null,
      section: key.section ?? null,
      topic: key.topic ?? key.category ?? null,
      level: key.level ?? key.difficulty ?? null,
      source: buildSource(key)
    };
    if (publicOnly) {
      delete normalized.correct;
      delete normalized.correctAnswer;
      delete normalized.explanation;
      delete normalized.pitfall;
      delete normalized.keyFormula;
    }
    return normalized;
  }
  function normalizeQuiz(rawQuiz, options = {}) {
    const raw = clone(rawQuiz || {});
    const subject = raw.vactMeta || raw.metadata?.vact || raw.subject === 'vact' ? 'vact' : normalSubject(raw.subject || raw.subjectLabel || raw.discipline);
    const inferredType = sourceType({ ...raw, subject });
    const discipline = raw.discipline || (inferredType.startsWith('vact_') || subject === 'vact' ? 'vact' : subject === 'toan' ? 'toan' : null);
    const keys = (Array.isArray(raw.answerKeys) ? raw.answerKeys : []).map((key, index) => normalizeKey(key, index, options.public === true));
    const declaredCounts = {
      totalQuestions: raw.totalQuestions ?? raw.questionsCount ?? null,
      mcqCount: raw.mcqCount ?? null,
      essayCount: raw.essayCount ?? null
    };
    const counts = getQuestionCounts({ ...raw, answerKeys: keys });
    const html = raw.document?.examHtml ?? raw.examHtml ?? (typeof raw.pdfDataUrl === 'string' && raw.pdfDataUrl.startsWith('data:text/html') ? decodeURIComponent(raw.pdfDataUrl.slice(raw.pdfDataUrl.indexOf(',') + 1)) : null);
    const attachment = raw.document?.attachmentRef ?? (html ? null : raw.pdfDataUrl || null);
    const kind = raw.document?.kind || (html ? 'generated_html' : attachment ? (String(attachment).startsWith('data:image') ? 'uploaded_image' : 'uploaded_pdf') : 'none');
    const type = inferredType;
    const explicitVact = raw.metadata?.vact || raw.vactMeta || null;
    const vact = explicitVact || (type.startsWith('vact_') && type !== 'vact_unclassified' ? {
      profileId: Object.keys(PROFILE_SOURCE_TYPES).find(id => PROFILE_SOURCE_TYPES[id] === type) || null,
      requestedTotal: counts.totalQuestions,
      generatedTotal: counts.totalQuestions,
      missingTotal: 0,
      isComplete: true
    } : null);
    const legacy = { ...raw.metadata?.legacy, ...(raw.schemaVersion ? {} : { originalSchemaVersion: null }) };
    return {
      ...raw,
      schemaVersion: VERSION,
      id: String(raw.id || ''),
      title: String(raw.title || ''),
      sourceType: type,
      subject,
      subjectLabel: raw.subjectLabel || (subject === 'khtn' && discipline ? ({ vat_ly: 'Vật lý', hoa_hoc: 'Hóa học', sinh_hoc: 'Sinh học' }[discipline] || labels.khtn) : labels[subject]),
      discipline,
      targetClass: raw.targetClass ?? null,
      examTerm: raw.examTerm ?? null,
      timeLimit: Number(raw.timeLimit || 0),
      ...counts,
      declaredCounts,
      examMode: raw.examMode === 'split_pdf' ? (html ? 'generated' : 'split_document') : (raw.examMode || (html ? 'generated' : 'document_view')),
      answerKeys: keys,
      document: {
        kind,
        examHtml: html,
        attachmentRef: attachment,
        fileName: raw.document?.fileName ?? raw.pdfFileName ?? null,
        mimeType: raw.document?.mimeType ?? null,
        remoteUrl: raw.document?.remoteUrl ?? (/^https?:/.test(String(attachment)) ? attachment : null),
        checksum: raw.document?.checksum ?? null
      },
      assignment: { type: raw.assignment?.type || raw.assignType || 'all', classes: raw.assignment?.classes || raw.assignedClasses || [], students: raw.assignment?.students || raw.assignedStudents || [] },
      settings: { showLeaderboard: raw.settings?.showLeaderboard ?? raw.showLeaderboard ?? true, antiCheat: raw.settings?.antiCheat ?? raw.antiCheat ?? true },
      createdAt: raw.createdAt || new Date().toISOString(),
      updatedAt: raw.updatedAt || new Date().toISOString(),
      metadata: { generator: raw.metadata?.generator || (type === 'math_generated' ? { engine: 'MathEngine', difficultyMode: raw.difficultyMode || null, diagnostics: raw.generationDiagnostics || null } : type === 'khtn_generated' ? { engine: 'KhtnEngine', discipline } : null), vact, difficulty: raw.metadata?.difficulty || null, provenance: raw.metadata?.provenance || null, legacy }
    };
  }
  function validateKey(key, index, errors) {
    if (!Number.isInteger(key.num) || key.num < 1) errors.push(`INVALID_KEY_NUM:${index}`);
    if (answerPlaceholder(key.content)) errors.push(`MISSING_KEY_CONTENT:${index}`);
    if (!Number.isFinite(key.score) || key.score < 0) errors.push(`INVALID_SCORE:${index}`);
    if (key.type === 'essay') {
      if (answerPlaceholder(key.correct)) errors.push(`MISSING_ESSAY_ANSWER:${index}`);
      return;
    }
    if (!Array.isArray(key.options) || key.options.length < 2 || key.options.length > 8) errors.push(`INVALID_OPTION_COUNT:${index}`);
    const optionValues = (key.options || []).map(normalizeOption);
    if (optionValues.some(value => !value)) errors.push(`EMPTY_OPTION:${index}`);
    if (new Set(optionValues).size !== optionValues.length) errors.push(`DUPLICATE_OPTION:${index}`);
    const correctLetter = optionLetter(key.correct) || (typeof key.correct === 'string' && /^[A-H]$/.test(key.correct.trim().toUpperCase()) ? key.correct.trim().toUpperCase() : null);
    if (!correctLetter || !key.options || correctLetter.charCodeAt(0) - 65 >= key.options.length || answerPlaceholder(key.correct)) errors.push(`INVALID_MCQ_ANSWER:${index}`);
  }
  function validateVact(quiz, errors) {
    if (quiz.subject !== 'vact') return;
    const vact = quiz.metadata?.vact || quiz.vactMeta;
    const profileId = vact?.profileId;
    if (!profileId || !VACT_PROFILES[profileId]) {
      errors.push('MISSING_OR_INVALID_VACT_PROFILE_ID');
      return;
    }
    const profile = VACT_PROFILES[profileId];
    const generated = quiz.answerKeys.length;
    const requested = Number(vact.requestedTotal);
    const missing = Math.max(requested - generated, 0);
    if (requested !== profile.totalQuestions) errors.push('VACT_REQUESTED_TOTAL_MISMATCH');
    if (Number(vact.generatedTotal) !== generated) errors.push('VACT_GENERATED_TOTAL_MISMATCH');
    if (Number(vact.missingTotal) !== missing) errors.push('VACT_MISSING_TOTAL_MISMATCH');
    if (vact.isComplete !== (missing === 0)) errors.push('VACT_COMPLETENESS_MISMATCH');
    if (quiz.sourceType !== PROFILE_SOURCE_TYPES[profileId]) errors.push('VACT_SOURCE_TYPE_MISMATCH');
    const actualSections = quiz.answerKeys.reduce((map, key) => { if (key.section) map[key.section] = (map[key.section] || 0) + 1; return map; }, {});
    for (const [section, expected] of Object.entries(profile.sections)) {
      const actual = actualSections[section] || 0;
      const sectionMeta = vact.sections?.[section];
      if (sectionMeta && (Number(sectionMeta.requested ?? expected) !== expected || Number(sectionMeta.generated ?? actual) !== actual || Number(sectionMeta.missing ?? Math.max(expected - actual, 0)) !== Math.max(expected - actual, 0))) errors.push(`VACT_SECTION_METADATA_MISMATCH:${section}`);
      if (missing === 0 && actual !== expected) errors.push(`VACT_SECTION_COUNT_MISMATCH:${section}`);
    }
  }
  function getValidationErrors(quiz) {
    const e = [];
    if (!quiz || typeof quiz !== 'object') return ['INVALID_QUIZ'];
    if (!quiz.id) e.push('MISSING_ID');
    if (!quiz.title) e.push('MISSING_TITLE');
    if (!Number.isFinite(quiz.timeLimit) || quiz.timeLimit < 0) e.push('INVALID_TIME_LIMIT');
    const c = getQuestionCounts(quiz);
    if (quiz.totalQuestions !== c.totalQuestions) e.push('COUNT_TOTAL_MISMATCH');
    if (quiz.mcqCount !== c.mcqCount) e.push('MCQ_COUNT_MISMATCH');
    if (quiz.essayCount !== c.essayCount) e.push('ESSAY_COUNT_MISMATCH');
    if (quiz.declaredCounts?.totalQuestions != null && Number(quiz.declaredCounts.totalQuestions) !== quiz.totalQuestions) e.push('DECLARED_TOTAL_MISMATCH');
    if (!quiz.document || (quiz.document.kind === 'generated_html' && !quiz.document.examHtml)) e.push('MISSING_DOCUMENT');
    if (!Array.isArray(quiz.answerKeys)) e.push('MISSING_ANSWER_KEYS');
    if (!quiz.assignment) e.push('INVALID_ASSIGNMENT');
    if (!quiz.settings) e.push('INVALID_SETTINGS');
    if (!quiz.metadata) e.push('INVALID_METADATA');
    const nums = new Set(); const ids = new Set();
    (quiz.answerKeys || []).forEach((key, index) => {
      validateKey(key, index, e);
      if (nums.has(key.num)) e.push(`DUPLICATE_KEY_NUM:${key.num}`); else nums.add(key.num);
      if (key.id) { if (ids.has(key.id)) e.push(`DUPLICATE_KEY_ID:${key.id}`); else ids.add(key.id); }
    });
    validateVact(quiz, e);
    return [...new Set(e)];
  }
  const validateQuiz = quiz => { const errors = getValidationErrors(quiz); return { valid: errors.length === 0, errors }; };
  const createQuiz = (raw, options = {}) => { const quiz = normalizeQuiz(raw, options); const validation = validateQuiz(quiz); if (!validation.valid && options.strict) throw Object.assign(new Error(validation.errors.join(', ')), { code: 'QUIZ_INVALID', errors: validation.errors }); return quiz; };
  window.QuizContract = { VERSION, VACT_PROFILES, normalizeQuiz, validateQuiz, createQuiz, migrateLegacyQuiz: normalizeQuiz, getQuizKind: q => normalizeQuiz(q).sourceType, getDocumentKind: q => normalizeQuiz(q).document.kind, getQuestionCounts, getValidationErrors, assertQuiz: q => createQuiz(q, { strict: true }) };
})();
