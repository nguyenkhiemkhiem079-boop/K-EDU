/**
 * K-EDU V-ACT Core Architecture - Unified Entry Point
 * Exposes core V-ACT modules under a controlled namespace: window.KEDUVACT (browser) or module.exports (Node.js).
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    const taxonomy = require('./taxonomy');
    const signature = require('./quality/signature');
    const schema = require('./schema');
    const validator = require('./quality/validator');
    const profiles = require('./profiles');
    const adapter = require('./bank/adapter');
    const internalBank = require('./bank/internalBank');
    module.exports = factory(taxonomy, signature, schema, validator, profiles, adapter, internalBank);
  } else {
    root.KEDUVACT = root.KEDUVACT || {};
    // When loaded via script tags, individual modules attach to root.KEDUVACT
  }
})(typeof window !== 'undefined' ? window : globalThis, function (taxonomy, signature, schema, validator, profiles, adapter, internalBank) {
  'use strict';

  return Object.freeze({
    ...taxonomy,
    ...signature,
    ...schema,
    ...validator,
    ...profiles,
    ...adapter,
    ...internalBank,
    bank: Object.freeze({
      ...adapter,
      ...internalBank
    })
  });
});
