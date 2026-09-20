(function () {
  'use strict';
  const objectUrls = new WeakMap();
  const htmlDataPrefix = /^data:text\/html(?:;charset=[^,]+)?(?:;base64)?,/i;

  function decodeHtmlDataUrl(value) {
    try {
      const data = value.slice(value.indexOf(',') + 1);
      return /;base64,/i.test(value) ? atob(data) : decodeURIComponent(data);
    } catch (error) {
      console.warn('[ExamRenderer] Invalid HTML data URL', { message: error?.message || String(error) });
      return null;
    }
  }
  const dangerousTags = 'script,iframe,frame,frameset,object,embed,applet,portal,form,base,meta,link'.split(',');
  const urlAttributes = new Set(['src', 'href', 'action', 'formaction', 'poster', 'background', 'xlink:href']);

  function isSafeResourceUrl(value) {
    const normalized = String(value || '').trim().replace(/[\u0000-\u001f\u007f]/g, '');
    if (!normalized) return true;
    return /^(?:https?:|mailto:|tel:|blob:|data:image\/(?:png|gif|jpe?g|webp|svg\+xml);)/i.test(normalized)
      && !/^(?:javascript|vbscript|data:text\/html):/i.test(normalized);
  }

  function stripUnsafeDom(document, stripAnswerTable) {
    dangerousTags.forEach(tag => document.querySelectorAll(tag).forEach(node => node.remove()));
    document.querySelectorAll('*').forEach(node => {
      Array.from(node.attributes || []).forEach(attribute => {
        const name = attribute.name.toLowerCase();
        const value = attribute.value || '';
        if (name.startsWith('on') || name === 'srcdoc') {
          node.removeAttribute(attribute.name);
          return;
        }
        if (urlAttributes.has(name) && !isSafeResourceUrl(value)) node.removeAttribute(attribute.name);
        if (name === 'style' && /(?:expression\s*\(|url\s*\(\s*["']?\s*(?:javascript|vbscript|data:text\/html):)/i.test(value)) {
          node.removeAttribute(attribute.name);
        }
      });
    });
    if (stripAnswerTable) {
      document.querySelectorAll('.answer-key-table').forEach(node => node.remove());
      document.querySelectorAll('.section-title').forEach(title => {
        if (/BẢNG\s+ĐÁP\s+ÁN|HƯỚNG\s+DẪN\s+CHẤM/i.test(title.textContent || '')) {
          let cursor = title;
          while (cursor) {
            const next = cursor.nextElementSibling;
            cursor.remove();
            cursor = next;
            if (cursor?.classList?.contains('section-title')) break;
          }
        }
      });
    }
  }

  function sanitizeExamHtml(html, options = {}) {
    const input = String(html || '');
    if (!input.trim()) return '';

    // DOM-based filtering is the primary path. It preserves KaTeX markup,
    // supported diagrams, styles and inline images while removing executable
    // elements, event handlers and unsafe resource URLs.
    const Parser = typeof DOMParser === 'function' ? DOMParser : window.DOMParser;
    if (typeof Parser === 'function') {
      const isFullDocument = /<html[\s>]/i.test(input);
      const parsed = new Parser().parseFromString(
        isFullDocument ? input : '<!doctype html><html><head></head><body>' + input + '</body></html>',
        'text/html'
      );
      stripUnsafeDom(parsed, options.stripAnswerTable === true);
      return isFullDocument ? parsed.documentElement.outerHTML : parsed.body.innerHTML;
    }

    // Non-browser fallback used by build tooling and tests. This remains
    // conservative: executable tags and event-handler/unsafe URL attributes
    // are removed rather than attempting to parse arbitrary HTML with regex.
    let output = input
      .replace(/<\/?(?:script|iframe|frame|frameset|object|embed|applet|portal|form|base|meta|link)(?:\s[^>]*)?>[\s\S]*?<\/?(?:script|iframe|frame|frameset|object|embed|applet|portal|form|base|meta|link)\s*>/gi, '')
      .replace(/<(?:script|iframe|frame|frameset|object|embed|applet|portal|form|base|meta|link)(?:\s[^>]*)?\/>/gi, '')
      .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/\s+srcdoc\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/(\s(?:src|href|action|formaction|poster|background|xlink:href)\s*=\s*["'])\s*(?:javascript|vbscript|data:text\/html):[^"']*(["'])/gi, '$1$2')
      .replace(/expression\s*\([^)]*\)/gi, '');
    if (options.stripAnswerTable) {
      output = output
        .replace(/(?:<div class="page-break"><\/div>\s*)?<div class="section-title"[^>]*>BẢNG ĐÁP ÁN[\s\S]*?(?=<div class="section-title"|$)/gi, '')
        .replace(/<table[^>]*class="[^"']*answer-key-table[^"']*"[\s\S]*?<\/table>/gi, '');
    }
    return output;
  }

  function sanitizeStudentExamHtml(html) {
    return sanitizeExamHtml(html, { stripAnswerTable: true });
  }
  function buildExamSrcdoc(html) {
    const content = sanitizeExamHtml(html);
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
    // Imported HTML, generated HTML and remote documents are untrusted. The
    // frame deliberately has no allow-scripts token; KaTeX is supplied as CSS
    // and formulas are rendered before the document reaches this boundary.
    frame.setAttribute('sandbox', 'allow-same-origin');
    frame.setAttribute('referrerpolicy', 'no-referrer');
    clearFrame(frame);
    const resolved = await resolveQuizDocument(quiz);
    if (!resolved.success) {
      frame.srcdoc = buildExamSrcdoc('<section role="alert"><h2>⚠️ Không tìm thấy nội dung đề thi.</h2><p>' + (options.audience === 'teacher' ? 'Nguồn tài liệu: ' + resolved.source : 'Vui lòng thử lại hoặc liên hệ giáo viên.') + '</p></section>');
      return resolved;
    }
    if (resolved.kind === 'GENERATED_HTML') {
      const html = options.audience === 'student' ? sanitizeStudentExamHtml(resolved.html) : sanitizeExamHtml(resolved.html);
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
  window.ExamDocumentRenderer = { resolveQuizDocument, renderIntoFrame, clearFrame, dispose: () => {}, getDocumentKind: async quiz => (await resolveQuizDocument(quiz)).kind, buildExamSrcdoc, sanitizeExamHtml, sanitizeStudentExamHtml };
})();
