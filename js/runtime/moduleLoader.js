/**
 * K-EDU optional runtime module boundary.
 *
 * The student lobby does not need the Math/KHTN engines or the document bank.
 * Keep their loading explicit, cached and observable so future code does not
 * accidentally turn the question bank back into a critical initial payload.
 */
(function (root) {
  'use strict';

  const modules = Object.freeze({
    documentBank: { src: 'js/documentQuestionBank.js?v=5.2', global: 'DocumentQuestionBank' },
    math: { src: 'js/mathGenerator.js?v=5.4', global: 'MathEngine' },
    khtn: { src: 'js/khtnGenerator.js?v=5.2', global: 'KhtnEngine' }
  });
  const pending = new Map();
  const metrics = [];

  function getMetrics() {
    return metrics.map(item => ({ ...item }));
  }

  function getState() {
    return Object.fromEntries(Object.keys(modules).map(key => [key, {
      loaded: !!root[modules[key].global],
      pending: pending.has(key)
    }]));
  }

  function ensure(moduleName) {
    const descriptor = modules[moduleName];
    if (!descriptor) return Promise.reject(new Error('UNKNOWN_OPTIONAL_MODULE:' + moduleName));
    if (root[descriptor.global]) return Promise.resolve(root[descriptor.global]);
    if (pending.has(moduleName)) return pending.get(moduleName);
    if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
      return Promise.reject(new Error('OPTIONAL_MODULE_REQUIRES_BROWSER:' + moduleName));
    }

    const startedAt = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
    const promise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.async = true;
      script.src = descriptor.src;
      script.dataset.keduOptionalModule = moduleName;
      script.onload = () => {
        const durationMs = Math.max(0, (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now()) - startedAt);
        if (!root[descriptor.global]) {
          const error = new Error('OPTIONAL_MODULE_GLOBAL_MISSING:' + moduleName);
          metrics.push({ module: moduleName, status: 'error', durationMs, error: error.message });
          pending.delete(moduleName);
          script.remove();
          reject(error);
          return;
        }
        metrics.push({ module: moduleName, status: 'loaded', durationMs });
        resolve(root[descriptor.global]);
      };
      script.onerror = () => {
        const durationMs = Math.max(0, (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now()) - startedAt);
        const error = new Error('OPTIONAL_MODULE_LOAD_FAILED:' + moduleName);
        metrics.push({ module: moduleName, status: 'error', durationMs, error: error.message });
        pending.delete(moduleName);
        script.remove();
        reject(error);
      };
      document.head.appendChild(script);
    });
    pending.set(moduleName, promise);
    return promise;
  }

  async function ensureGenerationModules({ subject = 'toan', sourceMode = 'hybrid' } = {}) {
    const key = subject === 'khtn' ? 'khtn' : 'math';
    const engine = await ensure(key);
    // Document-backed and hybrid generation must explicitly load the canonical
    // bank before querying it. Synthetic generation does not need the bank.
    if (sourceMode !== 'synthetic') await ensure('documentBank');
    return { engine, documentBank: root.DocumentQuestionBank || null };
  }

  root.KEDUModuleLoader = Object.freeze({
    ensure,
    ensureGenerationModules,
    ensureDocumentBank: () => ensure('documentBank'),
    ensureMath: () => ensure('math'),
    ensureKhtn: () => ensure('khtn'),
    getState,
    getMetrics
  });
})(typeof window !== 'undefined' ? window : globalThis);
