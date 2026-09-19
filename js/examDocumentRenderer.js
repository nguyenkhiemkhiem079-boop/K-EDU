(function () {
  'use strict';
  const objectUrls = new WeakMap();
  const htmlDataPrefix = /^data:text\/html(?:;charset=[^,]+)?(?:;base64)?,/i;

  function decodeHtmlDataUrl(value) {
    try {
      const data = value.slice(value.indexOf(',') + 1);
      return /;base64,/i.test(value) ? atob(data) : decodeURIComponent(data);
    } catch (_) { return null; }
  }
  function sanitizeStudentExamHtml(html) {
    return String(html || '')
      .replace(/<div class="page-break"><\/div>\s*<div class="section-title"[^>]*>BẢNG ĐÁP ÁN[\s\S]*?(?=<div class="section-title"|$)/gi, '')
      .replace(/<table[^>]*class="[^"]*answer-key-table[^"]*"[\s\S]*?<\/table>/gi, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '');
  }
  function buildExamSrcdoc(html) {
    const content = String(html || '');
    if (/<html[\s>]/i.test(content)) return content;
    return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">' +
      '<style>body{margin:0;padding:20px;font-family:Arial,sans-serif;color:#172033}.kedu-rendered-exam{max-width:1000px;margin:auto}</style>' +
      '</head><body><div class="kedu-rendered-exam">' + content + '</div></body></html>';
  }
  async function resolveQuizDocument(quiz = {}) {
    const document = quiz.document || {};
    if (typeof document.examHtml === 'string' && document.examHtml.trim()) return { success: true, kind: 'GENERATED_HTML', source: 'document.examHtml', html: document.examHtml };
    if (typeof quiz.examHtml === 'string' && quiz.examHtml.trim()) return { success: true, kind: 'GENERATED_HTML', source: 'legacy-examHtml', html: quiz.examHtml };
    const value = document.remoteUrl || document.attachmentRef || quiz.pdfDataUrl;
    if (typeof value === 'string' && htmlDataPrefix.test(value)) {
      const html = decodeHtmlDataUrl(value);
      if (html) return { success: true, kind: 'GENERATED_HTML', source: 'legacy-data-html', html };
    }
    const staleBlob = typeof value === 'string' && value.startsWith('blob:');
    if ((!value || staleBlob || (typeof value === 'string' && /^https?:\/\//i.test(value))) && quiz.id && window.StorageEngine?.getPdfBlob) {
      const blob = await window.StorageEngine.getPdfBlob(quiz.id);
      if (blob && !(typeof blob === 'string' && blob.startsWith('blob:'))) return { success: true, kind: blob instanceof Blob && blob.type.startsWith('image/') ? 'LOCAL_IMAGE_BLOB' : 'LOCAL_PDF_BLOB', source: 'indexeddb-attachment', blob };
    }
    if (typeof value === 'string' && /^https?:\/\//i.test(value)) return { success: true, kind: /\.(png|jpe?g|gif|webp)(\?|$)/i.test(value) ? 'REMOTE_HTML' : 'REMOTE_PDF', source: 'remote-url', url: value };
    if (typeof value === 'string' && value.startsWith('data:application/pdf')) return { success: true, kind: 'DATA_PDF', source: 'data-url', url: value };
    if (typeof value === 'string' && value.startsWith('data:image/')) return { success: true, kind: 'DATA_IMAGE', source: 'data-url', url: value };
    return { success: false, kind: 'NONE', code: 'DOCUMENT_NOT_FOUND', source: staleBlob ? 'stale-blob-url' : 'missing' };
  }
  function clearFrame(frame) { if (!frame) return; const old = objectUrls.get(frame); if (old) URL.revokeObjectURL(old); objectUrls.delete(frame); frame.removeAttribute('srcdoc'); frame.src = 'about:blank'; }
  async function renderIntoFrame(frame, quiz, options = {}) {
    if (!frame) return { success: false, code: 'FRAME_NOT_FOUND' };
    clearFrame(frame);
    const resolved = await resolveQuizDocument(quiz);
    if (!resolved.success) {
      frame.srcdoc = buildExamSrcdoc('<section role="alert"><h2>⚠️ Không tìm thấy nội dung đề thi.</h2><p>' + (options.audience === 'teacher' ? 'Nguồn tài liệu: ' + resolved.source : 'Vui lòng thử lại hoặc liên hệ giáo viên.') + '</p></section>');
      return resolved;
    }
    if (resolved.kind === 'GENERATED_HTML') {
      const html = options.audience === 'student' ? sanitizeStudentExamHtml(resolved.html) : resolved.html;
      if (!html.trim()) return { success: false, code: 'DOCUMENT_EMPTY' };
      frame.srcdoc = buildExamSrcdoc(html);
    } else if (resolved.blob) {
      const url = URL.createObjectURL(resolved.blob); objectUrls.set(frame, url); frame.src = url;
    } else if (resolved.kind === 'DATA_IMAGE') {
      frame.srcdoc = buildExamSrcdoc('<img alt="Đề thi" style="max-width:100%;height:auto" src="' + resolved.url + '">');
    } else frame.src = resolved.url;
    console.info('[ExamRenderer]', { quizId: quiz.id, kind: resolved.kind, source: resolved.source, examHtmlLength: quiz.examHtml?.length || 0, status: 'OK' });
    return { success: true, kind: resolved.kind, source: resolved.source };
  }
  window.ExamDocumentRenderer = { resolveQuizDocument, renderIntoFrame, clearFrame, dispose: () => {}, getDocumentKind: async quiz => (await resolveQuizDocument(quiz)).kind, buildExamSrcdoc, sanitizeStudentExamHtml };
})();
