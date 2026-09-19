(function () {
  'use strict';
  const VERSION = 1;
  const labels = { toan: 'Toán học', khtn: 'Khoa học Tự nhiên', vact: 'V-ACT — ĐHQG TP.HCM' };
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const normalSubject = raw => {
    const s = String(raw || '').toLowerCase();
    if (/vact|v-act|dgnl/.test(s)) return 'vact'; if (/khtn|vật|lý|hóa|sinh/.test(s)) return 'khtn'; return 'toan';
  };
  const sourceType = raw => raw.sourceType || (raw.vactMeta || raw.subject === 'vact' ? ((raw.vactMeta?.profileId === 'vact_full' || raw.totalQuestions === 120) ? 'vact_full_120' : 'vact_mini_100') : (normalSubject(raw.subject) === 'khtn' ? 'khtn_generated' : (raw.pdfDataUrl && !raw.examHtml ? 'teacher_upload' : 'math_generated')));
  const getQuestionCounts = raw => {
    const keys = Array.isArray(raw.answerKeys) ? raw.answerKeys : [];
    if (keys.length) { const mcq = keys.filter(k => (k.type || 'mcq') !== 'essay').length; const essay = keys.length - mcq; return { totalQuestions: keys.length, mcqCount: mcq, essayCount: essay }; }
    const total = Number(raw.totalQuestions ?? raw.questionsCount ?? 0) || 0; const essay = Number(raw.essayCount || 0) || 0; return { totalQuestions: total, mcqCount: Number(raw.mcqCount ?? total - essay) || 0, essayCount: essay };
  };
  function normalizeKey(key, index) {
    const source = key.source || { question: { id: key.questionSourceId || null, file: key.questionSourceFile || null, page: key.questionSourcePage || null }, solution: { id: key.solutionSourceId || null, file: key.solutionSourceFile || null, page: key.solutionSourcePage || null }, examSetId: key.examSetId || null, answerVerified: key.answerVerified ?? null, quality: key.quality || null, stimulus: key.stimulus || null };
    return { ...key, num: Number(key.num || index + 1), id: key.id || null, questionId: key.questionId || null, type: key.type === 'essay' ? 'essay' : 'mcq', correct: key.correct ?? key.correctAnswer ?? null, score: Number(key.score ?? 1), content: key.content ?? key.question ?? null, options: Array.isArray(key.options) ? key.options : null, explanation: key.explanation ?? null, section: key.section ?? null, topic: key.topic ?? key.category ?? null, level: key.level ?? key.difficulty ?? null, source };
  }
  function normalizeQuiz(rawQuiz, options = {}) {
    const raw = clone(rawQuiz || {}); const subject = raw.vactMeta || raw.metadata?.vact ? 'vact' : normalSubject(raw.subject || raw.subjectLabel || raw.discipline);
    const inferredType = sourceType({ ...raw, subject });
    const discipline = raw.discipline || (inferredType.startsWith('vact_') || subject === 'vact' ? 'vact' : subject === 'toan' ? 'toan' : null);
    const keys = (raw.answerKeys || []).map(normalizeKey); const counts = getQuestionCounts({ ...raw, answerKeys: keys });
    const html = raw.document?.examHtml ?? raw.examHtml ?? (typeof raw.pdfDataUrl === 'string' && raw.pdfDataUrl.startsWith('data:text/html') ? decodeURIComponent(raw.pdfDataUrl.slice(raw.pdfDataUrl.indexOf(',') + 1)) : null);
    const attachment = raw.document?.attachmentRef ?? (html ? null : raw.pdfDataUrl || null);
    const kind = raw.document?.kind || (html ? 'generated_html' : attachment ? (String(attachment).startsWith('data:image') ? 'uploaded_image' : 'uploaded_pdf') : 'none');
    const type = inferredType; const vact = raw.metadata?.vact || raw.vactMeta || (type.startsWith('vact_') ? { profileId: type === 'vact_full_120' ? 'vact_full' : 'vact_mini_100', requestedTotal: counts.totalQuestions, generatedTotal: counts.totalQuestions, missingTotal: 0, isComplete: true } : null);
    const legacy = { ...raw.metadata?.legacy, ...(raw.schemaVersion ? {} : { originalSchemaVersion: null }) };
    return { ...raw, schemaVersion: VERSION, id: String(raw.id || ''), title: String(raw.title || ''), sourceType: type, subject, subjectLabel: raw.subjectLabel || (subject === 'khtn' && discipline ? ({ vat_ly: 'Vật lý', hoa_hoc: 'Hóa học', sinh_hoc: 'Sinh học' }[discipline] || labels.khtn) : labels[subject]), discipline, targetClass: raw.targetClass ?? null, examTerm: raw.examTerm ?? null, timeLimit: Number(raw.timeLimit || 0), ...counts, examMode: raw.examMode === 'split_pdf' ? (html ? 'generated' : 'split_document') : (raw.examMode || (html ? 'generated' : 'document_view')), answerKeys: keys, document: { kind, examHtml: html, attachmentRef: attachment, fileName: raw.document?.fileName ?? raw.pdfFileName ?? null, mimeType: raw.document?.mimeType ?? null, remoteUrl: raw.document?.remoteUrl ?? (/^https?:/.test(String(attachment)) ? attachment : null), checksum: raw.document?.checksum ?? null }, assignment: { type: raw.assignment?.type || raw.assignType || 'all', classes: raw.assignment?.classes || raw.assignedClasses || [], students: raw.assignment?.students || raw.assignedStudents || [] }, settings: { showLeaderboard: raw.settings?.showLeaderboard ?? raw.showLeaderboard ?? true, antiCheat: raw.settings?.antiCheat ?? raw.antiCheat ?? true }, createdAt: raw.createdAt || new Date().toISOString(), updatedAt: raw.updatedAt || new Date().toISOString(), metadata: { generator: raw.metadata?.generator || (type === 'math_generated' ? { engine: 'MathEngine', difficultyMode: raw.difficultyMode || null, diagnostics: raw.generationDiagnostics || null } : type === 'khtn_generated' ? { engine: 'KhtnEngine', discipline } : null), vact, difficulty: raw.metadata?.difficulty || null, provenance: raw.metadata?.provenance || null, legacy } };
  }
  function getValidationErrors(quiz) { const e=[]; if (!quiz.id) e.push('MISSING_ID'); if (!quiz.title) e.push('MISSING_TITLE'); if (!Number.isFinite(quiz.timeLimit) || quiz.timeLimit < 0) e.push('INVALID_TIME_LIMIT'); const c=getQuestionCounts(quiz); if (quiz.totalQuestions !== c.totalQuestions) e.push('COUNT_TOTAL_MISMATCH'); if (quiz.mcqCount !== c.mcqCount) e.push('MCQ_COUNT_MISMATCH'); if (quiz.essayCount !== c.essayCount) e.push('ESSAY_COUNT_MISMATCH'); if (!quiz.document || (quiz.document.kind === 'generated_html' && !quiz.document.examHtml)) e.push('MISSING_DOCUMENT'); if (!Array.isArray(quiz.answerKeys)) e.push('MISSING_ANSWER_KEYS'); if (!quiz.assignment) e.push('INVALID_ASSIGNMENT'); if (!quiz.settings) e.push('INVALID_SETTINGS'); if (!quiz.metadata) e.push('INVALID_METADATA'); return e; }
  const validateQuiz = (quiz, options={}) => ({ valid: getValidationErrors(quiz).length === 0, errors: getValidationErrors(quiz) });
  const createQuiz = (raw, options={}) => { const quiz=normalizeQuiz(raw, options); const validation=validateQuiz(quiz, options); if (!validation.valid && options.strict) throw Object.assign(new Error(validation.errors.join(', ')), { code: 'QUIZ_INVALID', errors: validation.errors }); return quiz; };
  window.QuizContract = { normalizeQuiz, validateQuiz, createQuiz, migrateLegacyQuiz: normalizeQuiz, getQuizKind: q => normalizeQuiz(q).sourceType, getDocumentKind: q => normalizeQuiz(q).document.kind, getQuestionCounts, getValidationErrors, assertQuiz: q => createQuiz(q, { strict: true }) };
})();
