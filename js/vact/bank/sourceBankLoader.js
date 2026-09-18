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

  function validateQuestion(q, validSourceIds) {
    if (!q || typeof q !== 'object') return false;
    if (!q.id || typeof q.id !== 'string') return false;
    if (!q.section || typeof q.section !== 'string') return false;
    if (!q.source || typeof q.source !== 'object') return false;
    if (!q.source.sourceId || typeof q.source.sourceId !== 'string') return false;
    if (!q.source.sourceFile || typeof q.source.sourceFile !== 'string') return false;
    if (q.source.extractedFromSource !== true) return false;
    if (!q.quality || q.quality.answerVerified !== true) return false;
    if (!['A', 'B', 'C', 'D'].includes(q.correctAnswer)) return false;
    if (!Array.isArray(q.options) || q.options.length < 2) return false;
    if (validSourceIds && !validSourceIds.has(q.source.sourceId)) return false;
    return true;
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
        if (validateQuestion(q, validSourceIds)) {
          verifiedQuestions.push(q);
        }
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
    getQuestions: () => [..._loadedQuestions],
    getSources: () => [..._loadedSources]
  };
});
