/**
 * K-EDU V-ACT Source-Backed Question Bank Runtime Loader
 * Loads and strictly verifies source-backed production questions and registered sources
 * before any exam readiness calculations or test generation take place.
 */
(function (root, factory) {
  'use strict';
  if (typeof module !== 'undefined' && module.exports) {
    const internalBankModule = require('./internalBank');
    const defaultLoader = factory(internalBankModule.VACTInternalBank || internalBankModule);
    defaultLoader.createLoader = factory;
    module.exports = defaultLoader;
  } else {
    root.KEDUVACT = root.KEDUVACT || {};
    root.KEDUVACT.bank = root.KEDUVACT.bank || {};
    const internalBank = root.KEDUVACT.VACTInternalBank || root.KEDUVACT.bank.VACTInternalBank;
    const loader = factory(internalBank);
    loader.createLoader = factory;
    root.KEDUVACT.sourceBankLoader = loader;
    root.KEDUVACT.bank.sourceBankLoader = loader;
    if (typeof window !== 'undefined') {
      window.sourceBankLoader = loader;
    }
  }
})(typeof window !== 'undefined' ? window : globalThis, function (VACTInternalBank, customFetch) {
  'use strict';

  let _status = 'idle'; // 'idle' | 'loading' | 'ready' | 'error'
  let _error = null;
  let _readyPromise = null;
  let _loadedQuestions = [];
  let _loadedSources = [];
  let _activeFetch = typeof customFetch === 'function' ? customFetch : null;

  function getStatus() {
    return _status;
  }

  function getError() {
    return _error;
  }

  function setFetchFn(fn) {
    _activeFetch = typeof fn === 'function' ? fn : null;
  }

  const ALLOWED_SECTIONS = new Set([
    'vietnamese',
    'english',
    'math',
    'logic_data',
    'scientific_reasoning'
  ]);

  function getQuestionValidationFailureReason(q, validSourceIds) {
    if (!q || typeof q !== 'object') return 'INVALID_OBJECT';
    if (!q.id || typeof q.id !== 'string' || !q.id.trim()) return 'MISSING_ID';
    if (q.status !== 'production') return 'INVALID_STATUS';
    if (!q.section || typeof q.section !== 'string' || !ALLOWED_SECTIONS.has(q.section.trim())) return 'INVALID_SECTION';
    if (!q.question || typeof q.question !== 'string' || !q.question.trim()) return 'EMPTY_QUESTION';
    if (!Array.isArray(q.options) || q.options.length !== 4) return 'INVALID_OPTION_COUNT';
    for (let i = 0; i < q.options.length; i++) {
      const opt = q.options[i];
      if (typeof opt !== 'string' || !opt.trim()) return 'EMPTY_OPTION';
    }
    if (!['A', 'B', 'C', 'D'].includes(q.correctAnswer)) return 'INVALID_ANSWER';
    if (!q.source || typeof q.source !== 'object') return 'INVALID_SOURCE';
    if (!q.source.sourceId || typeof q.source.sourceId !== 'string' || !q.source.sourceId.trim()) return 'INVALID_SOURCE';
    if (validSourceIds && !validSourceIds.has(q.source.sourceId.trim())) return 'SOURCE_NOT_REGISTERED';
    if (!q.source.sourceFile || typeof q.source.sourceFile !== 'string' || !q.source.sourceFile.trim()) return 'INVALID_SOURCE';
    if (q.source.extractedFromSource !== true) return 'NOT_EXTRACTED_FROM_SOURCE';
    if (!q.quality || typeof q.quality !== 'object' || q.quality.answerVerified !== true) return 'ANSWER_NOT_VERIFIED';
    return null;
  }

  function validateQuestion(q, validSourceIds) {
    return getQuestionValidationFailureReason(q, validSourceIds) === null;
  }

  async function fetchJson(relativeUrl) {
    if (typeof _activeFetch === 'function') {
      const response = await _activeFetch(relativeUrl, { cache: 'no-cache' });
      if (!response || !response.ok) {
        const status = response ? response.status : 'ERR';
        const statusText = response ? response.statusText : 'Network failure';
        throw new Error(`HTTP ${status} ${statusText} khi tải ${relativeUrl}`);
      }
      return await response.json();
    }

    if (typeof window !== 'undefined' && typeof fetch === 'function') {
      const response = await fetch(relativeUrl, { cache: 'no-cache' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText} khi tải ${relativeUrl}`);
      }
      return await response.json();
    }

    // In Node.js test environment fallback to fs if fetch cannot resolve relative local paths
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      try {
        const fs = require('node:fs');
        const path = require('node:path');
        const resolvedPath = path.resolve(__dirname, '../../../', relativeUrl);
        if (fs.existsSync(resolvedPath)) {
          const raw = fs.readFileSync(resolvedPath, 'utf8');
          return JSON.parse(raw);
        }
      } catch (_) {}
    }

    if (typeof fetch === 'function') {
      const response = await fetch(relativeUrl, { cache: 'no-cache' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText} khi tải ${relativeUrl}`);
      }
      return await response.json();
    }

    throw new Error('Môi trường hiện tại không hỗ trợ fetch dữ liệu.');
  }

  async function loadData() {
    _status = 'loading';
    _error = null;

    try {
      const [questionsRaw, sourcesRaw] = await Promise.all([
        fetchJson('data/vact/questions.json'),
        fetchJson('data/vact/sources.json')
      ]);

      if (!Array.isArray(questionsRaw) || questionsRaw.length === 0) {
        throw new Error('Dữ liệu ngân hàng câu hỏi V-ACT rỗng hoặc không đúng định dạng.');
      }
      if (!Array.isArray(sourcesRaw) || sourcesRaw.length === 0) {
        throw new Error('Danh mục nguồn tài liệu V-ACT rỗng hoặc không đúng định dạng.');
      }

      const validSourceIds = new Set(sourcesRaw.map(s => s?.sourceId || s?.id).filter(Boolean));
      if (validSourceIds.size === 0) {
        throw new Error('Không tìm thấy nguồn tài liệu hợp lệ trong sources.json.');
      }

      const verifiedQuestions = [];
      for (let i = 0; i < questionsRaw.length; i++) {
        const q = questionsRaw[i];
        const failReason = getQuestionValidationFailureReason(q, validSourceIds);
        if (failReason) {
          const qId = (q && q.id) ? q.id : `index_${i}`;
          throw new Error(`SOURCE_BANK_INVALID_QUESTION:${qId}:${failReason}`);
        }
        verifiedQuestions.push(q);
      }

      if (verifiedQuestions.length === 0) {
        throw new Error('Không có câu hỏi nào đạt kiểm định nguồn xác thực (source provenance).');
      }

      _loadedQuestions = verifiedQuestions;
      _loadedSources = sourcesRaw;

      // Expose globally for runtime consumers
      if (typeof window !== 'undefined') {
        window.VACTSourceBank = _loadedQuestions;
        window.VACTSources = _loadedSources;
      } else if (typeof globalThis !== 'undefined') {
        globalThis.VACTSourceBank = _loadedQuestions;
        globalThis.VACTSources = _loadedSources;
      }

      // Inject into VACTInternalBank and strictly enforce source_backed mode
      const bank = VACTInternalBank || (typeof window !== 'undefined' ? window.KEDUVACT?.VACTInternalBank : null);
      if (bank && typeof bank.setSourceBackedBank === 'function') {
        bank.setSourceBackedBank(_loadedQuestions);
        bank.setMode('source_backed');
      }

      _status = 'ready';
      _error = null;
      return {
        questionsCount: _loadedQuestions.length,
        sourcesCount: _loadedSources.length
      };
    } catch (err) {
      _status = 'error';
      _error = err;
      _readyPromise = null; // Allow retry on error
      const bank = VACTInternalBank || (typeof window !== 'undefined' ? window.KEDUVACT?.VACTInternalBank : null);
      if (bank && typeof bank.setSourceBackedBank === 'function') {
        bank.setSourceBackedBank([]);
      }
      console.error('[sourceBankLoader] Không thể nạp ngân hàng V-ACT:', err);
      throw err;
    }
  }

  function ready() {
    if (_status === 'ready') {
      return Promise.resolve({
        questionsCount: _loadedQuestions.length,
        sourcesCount: _loadedSources.length
      });
    }
    if (_status === 'loading' && _readyPromise) {
      return _readyPromise;
    }
    _readyPromise = loadData();
    return _readyPromise;
  }

  function reload() {
    _readyPromise = loadData();
    return _readyPromise;
  }

  return {
    ready,
    reload,
    getStatus,
    getError,
    setFetchFn,
    validateQuestion,
    getQuestionValidationFailureReason,
    getQuestions: () => [..._loadedQuestions],
    getSources: () => [..._loadedSources]
  };
});
