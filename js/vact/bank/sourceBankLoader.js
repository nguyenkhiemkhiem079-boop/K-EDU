/**
 * K-EDU V-ACT browser runtime source-bank loader.
 * Strictly loads generated source-backed bank JSON and never falls back to legacy content.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory(globalThis);
  } else {
    root.KEDUVACT = root.KEDUVACT || {};
    const api = factory(root);
    root.KEDUVACT.sourceBankLoader = api;
    root.KEDUVACT.SourceBankLoader = api;
    Promise.resolve().then(() => api.ready()).catch(() => {});
  }
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  const DEFAULT_QUESTIONS_URL = 'data/vact/questions.json';
  const DEFAULT_SOURCES_URL = 'data/vact/sources.json';

  let status = 'idle';
  let error = null;
  let inFlight = null;
  let loadedQuestions = null;
  let loadedSources = null;

  function getFetch() {
    if (root && typeof root.fetch === 'function') return root.fetch.bind(root);
    if (typeof fetch === 'function') return fetch;
    return null;
  }

  async function fetchJson(url) {
    const fetchFn = getFetch();
    if (!fetchFn) {
      const err = new Error('SOURCE_BANK_FETCH_UNAVAILABLE');
      err.code = 'SOURCE_BANK_FETCH_UNAVAILABLE';
      throw err;
    }
    const response = await fetchFn(url, { cache: 'no-store' });
    if (!response || !response.ok) {
      const err = new Error(`SOURCE_BANK_HTTP_ERROR:${response ? response.status : 'NO_RESPONSE'}:${url}`);
      err.code = 'SOURCE_BANK_HTTP_ERROR';
      throw err;
    }
    try {
      return await response.json();
    } catch (cause) {
      const err = new Error(`SOURCE_BANK_INVALID_JSON:${url}`);
      err.code = 'SOURCE_BANK_INVALID_JSON';
      err.cause = cause;
      throw err;
    }
  }

  function validatePayload(questions, sources) {
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('SOURCE_BANK_EMPTY_OR_INVALID_QUESTIONS');
    }
    if (!Array.isArray(sources) || sources.length === 0) {
      throw new Error('SOURCE_BANK_EMPTY_OR_INVALID_SOURCES');
    }

    const sourceIds = new Set(sources.map(s => s && s.sourceId).filter(Boolean));
    const seenIds = new Set();
    for (const q of questions) {
      if (!q || typeof q !== 'object') throw new Error('SOURCE_BANK_INVALID_QUESTION');
      if (q.status !== 'production') throw new Error(`SOURCE_BANK_NON_PRODUCTION_ITEM:${q.id || 'unknown'}`);
      if (!q.id || seenIds.has(q.id)) throw new Error(`SOURCE_BANK_DUPLICATE_OR_MISSING_ID:${q.id || 'missing'}`);
      seenIds.add(q.id);
      if (!q.source || q.source.extractedFromSource !== true || !q.source.sourceId || !q.source.sourceFile) {
        throw new Error(`SOURCE_BANK_INVALID_PROVENANCE:${q.id}`);
      }
      if (!sourceIds.has(q.source.sourceId)) {
        throw new Error(`SOURCE_BANK_SOURCE_ID_MISMATCH:${q.id}:${q.source.sourceId}`);
      }
      if (!q.quality || q.quality.answerVerified !== true) {
        throw new Error(`SOURCE_BANK_UNVERIFIED_ANSWER:${q.id}`);
      }
      if (!['A', 'B', 'C', 'D'].includes(q.correctAnswer)) {
        throw new Error(`SOURCE_BANK_INVALID_ANSWER:${q.id}`);
      }
      if (!Array.isArray(q.options) || q.options.length !== 4) {
        throw new Error(`SOURCE_BANK_INVALID_OPTIONS:${q.id}`);
      }
    }
    return true;
  }

  function install(questions, sources) {
    const bank = root?.KEDUVACT?.VACTInternalBank;
    if (!bank || typeof bank.setSourceBackedBank !== 'function' || typeof bank.setMode !== 'function') {
      throw new Error('SOURCE_BANK_INTERNAL_BANK_API_UNAVAILABLE');
    }
    bank.setSourceBackedBank(questions);
    bank.setMode('source_backed');
    loadedQuestions = questions;
    loadedSources = sources;
    status = 'ready';
    error = null;
    return { questions, sources };
  }

  async function load(force = false) {
    if (!force && status === 'ready' && loadedQuestions && loadedSources) {
      return { questions: loadedQuestions, sources: loadedSources };
    }
    if (!force && inFlight) return inFlight;

    status = 'loading';
    error = null;
    inFlight = (async () => {
      try {
        const [questions, sources] = await Promise.all([
          fetchJson(DEFAULT_QUESTIONS_URL),
          fetchJson(DEFAULT_SOURCES_URL)
        ]);
        validatePayload(questions, sources);
        return install(questions, sources);
      } catch (err) {
        status = 'error';
        error = err instanceof Error ? err : new Error(String(err));
        loadedQuestions = null;
        loadedSources = null;
        const bank = root?.KEDUVACT?.VACTInternalBank;
        if (bank?.setSourceBackedBank) bank.setSourceBackedBank(null);
        if (bank?.setMode) bank.setMode('source_backed');
        throw error;
      } finally {
        inFlight = null;
      }
    })();
    return inFlight;
  }

  function ready() {
    return load(false);
  }

  function reload() {
    return load(true);
  }

  function getStatus() {
    return status;
  }

  function getError() {
    return error;
  }

  function getSnapshot() {
    return {
      status,
      questionCount: Array.isArray(loadedQuestions) ? loadedQuestions.length : 0,
      sourceCount: Array.isArray(loadedSources) ? loadedSources.length : 0,
      error: error ? String(error.message || error) : null
    };
  }

  return {
    ready,
    reload,
    getStatus,
    getError,
    getSnapshot,
    validatePayload
  };
});
