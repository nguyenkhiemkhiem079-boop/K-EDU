(function () {
  'use strict';
  const MARKER = 'data_repair_v1';
  let report = { scanned: 0, canonical: 0, migratable: 0, recoverable: 0, unrecoverable: 0, migrated: 0, resultsMigrated: 0, items: [] };
  const isCanonical = quiz => quiz && quiz.schemaVersion === 1 && quiz.document && quiz.assignment && quiz.settings && quiz.metadata;
  async function repairQuiz(rawQuiz, options = {}) {
    if (!rawQuiz || !rawQuiz.id || !rawQuiz.title) return { status: 'unrecoverable', code: 'INVALID_QUIZ', quiz: rawQuiz };
    const staleBlob = typeof rawQuiz.pdfDataUrl === 'string' && rawQuiz.pdfDataUrl.startsWith('blob:');
    if (staleBlob && !options.attachment) {
      const attachment = options.storage?.getPdfBlob ? await options.storage.getPdfBlob(rawQuiz.id) : null;
      if (!attachment) return { status: 'unrecoverable', code: 'BROKEN_ATTACHMENT', quiz: rawQuiz };
    }
    const quiz = window.QuizContract ? window.QuizContract.migrateLegacyQuiz(rawQuiz) : { ...rawQuiz };
    const validation = window.QuizContract?.validateQuiz ? window.QuizContract.validateQuiz(quiz) : { valid: true, errors: [] };
    if (!validation.valid && !(quiz.document?.kind === 'uploaded_pdf' && quiz.document?.attachmentRef)) return { status: 'unrecoverable', code: validation.errors.join(','), quiz: rawQuiz };
    return { status: isCanonical(rawQuiz) ? 'canonical' : 'migratable', quiz, changed: !isCanonical(rawQuiz) };
  }
  function repairResult(raw) {
    if (!raw) return { status: 'unrecoverable', result: raw };
    const result = { ...raw, studentId: raw.studentId || raw.studentUid || null };
    return { status: result.studentId ? (raw.studentId ? 'canonical' : 'migratable') : 'recoverable', result, changed: result.studentId !== raw.studentId };
  }
  async function scan(options = {}) {
    report = { scanned: 0, canonical: 0, migratable: 0, recoverable: 0, unrecoverable: 0, migrated: 0, resultsMigrated: 0, items: [] };
    const storage = options.storage || window.StorageEngine; const quizzes = options.quizzes || await storage?.getAllQuizzes?.() || []; const results = options.results || await storage?.getAllResults?.() || [];
    for (const quiz of quizzes) { const item = await repairQuiz(quiz, { storage }); report.scanned++; report[item.status] = (report[item.status] || 0) + 1; report.items.push({ id: quiz.id, type: 'quiz', status: item.status, code: item.code || null }); }
    for (const result of results) { const item = repairResult(result); if (item.status === 'migratable') report.resultsMigrated++; report.items.push({ id: result.id, type: 'result', status: item.status }); }
    return getReport();
  }
  async function migrateLocalData(options = {}) {
    const storage = options.storage || window.StorageEngine; const scanReport = await scan({ ...options, storage });
    if (!storage) return scanReport;
    const backup = { at: new Date().toISOString(), report: scanReport, version: 1 };
    await storage.set?.(MARKER + '_backup', backup);
    const quizzes = options.quizzes || await storage.getAllQuizzes();
    for (const raw of quizzes) { const item = await repairQuiz(raw, { storage }); if (item.status === 'migratable') { await storage.saveQuiz(item.quiz); report.migrated++; } }
    const results = options.results || await storage.getAllResults();
    for (const raw of results) { const item = repairResult(raw); if (item.status === 'migratable') { await storage.set(raw.id.replace(/^khiemedu_/, ''), item.result); report.resultsMigrated++; } }
    await storage.set?.(MARKER, { version: 1, completedAt: new Date().toISOString() });
    return getReport();
  }
  function getReport() { return JSON.parse(JSON.stringify(report)); }
  window.DataRepair = { scan, repairQuiz, repairResult, migrateLocalData, getReport };
})();
