/**
 * K-EDU V-ACT Core Architecture - External Source Configuration & Security Policy
 * Enforces strict authorization rules for remote question feeds:
 * - Prevents arbitrary student-supplied URLs from being fetched
 * - Whitelists authorized protocols and hostnames
 * - Centralizes default source priorities, caching TTLs, and timeouts
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.KEDUVACT = root.KEDUVACT || {};
    root.KEDUVACT.sources = root.KEDUVACT.sources || {};
    const cfg = factory();
    Object.assign(root.KEDUVACT.sources, cfg);
    root.KEDUVACT.sourceConfig = cfg;
  }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  /**
   * Default source priorities.
   * Lower number = higher priority during question selection.
   */
  const SOURCE_PRIORITIES = Object.freeze({
    INTERNAL: 10,
    AUTHORIZED_REMOTE: 100,
    COMMUNITY: 200
  });

  /**
   * Default network and caching constants.
   */
  const DEFAULT_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
  const DEFAULT_TIMEOUT_MS = 8000; // 8 seconds

  /**
   * Whitelisted hostname patterns authorized to serve remote V-ACT JSON feeds.
   * Prevents SSRF and unauthorized network requests.
   */
  const AUTHORIZED_HOST_PATTERNS = [
    /^localhost(:\d+)?$/i,
    /^127\.0\.0\.1(:\d+)?$/,
    /(^|\.)k-edu\.vn$/i,
    /(^|\.)k-edu\.edu\.vn$/i,
    /(^|\.)githubusercontent\.com$/i,
    /(^|\.)edu-cloud\.vn$/i
  ];

  /**
   * Additional dynamically allowed URL prefixes (configured by admin).
   */
  const _adminAllowedUrlPrefixes = new Set();

  /**
   * Validates whether a URL is authorized for remote question ingestion.
   * Enforces:
   * 1. Valid URL string
   * 2. Safe protocol (https: or http on localhost, file: for local test fixtures)
   * 3. Whitelisted domain or explicitly admin-whitelisted URL prefix
   *
   * @param {string} urlString
   * @returns {{ authorized: boolean, reason?: string }}
   */
  function isAuthorizedSourceUrl(urlString) {
    if (!urlString || typeof urlString !== 'string') {
      return { authorized: false, reason: 'URL must be a non-empty string' };
    }

    const trimmed = urlString.trim();

    // Check if explicitly allowed by admin prefix (e.g. file:// or custom mock)
    for (const prefix of _adminAllowedUrlPrefixes) {
      if (trimmed.startsWith(prefix)) {
        return { authorized: true };
      }
    }

    // Allow local file:// paths for QA testing and fixtures
    if (trimmed.startsWith('file://')) {
      return { authorized: true };
    }

    // Parse URL
    let parsed;
    try {
      parsed = new URL(trimmed);
    } catch (_) {
      return { authorized: false, reason: 'Malformed URL format' };
    }

    // Protocol check: HTTPS only, except http for localhost
    const isLocalhost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    if (parsed.protocol === 'http:' && !isLocalhost) {
      return { authorized: false, reason: 'Insecure protocol: only HTTPS is permitted for remote feeds' };
    }
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return { authorized: false, reason: `Unsupported protocol: ${parsed.protocol}` };
    }

    // Host check
    const hostname = parsed.hostname.toLowerCase();
    const isMatched = AUTHORIZED_HOST_PATTERNS.some(pat => pat.test(hostname));
    if (!isMatched) {
      return {
        authorized: false,
        reason: `Host "${hostname}" is not in the authorized K-EDU remote feed whitelist`
      };
    }

    return { authorized: true };
  }

  /**
   * Allows administrators to whitelist specific URL prefixes for test fixtures or internal intranets.
   * @param {string} prefix
   */
  function addAuthorizedUrlPrefix(prefix) {
    if (prefix && typeof prefix === 'string') {
      _adminAllowedUrlPrefixes.add(prefix.trim());
    }
  }

  /**
   * Removes an admin whitelisted URL prefix.
   * @param {string} prefix
   */
  function removeAuthorizedUrlPrefix(prefix) {
    if (prefix && typeof prefix === 'string') {
      _adminAllowedUrlPrefixes.delete(prefix.trim());
    }
  }

  /**
   * Clears all admin-configured custom whitelist prefixes.
   */
  function clearAdminAuthorizedUrlPrefixes() {
    _adminAllowedUrlPrefixes.clear();
  }

  /**
   * Default configured remote sources list.
   */
  const DEFAULT_REMOTE_FEEDS = Object.freeze([]);

  return {
    SOURCE_PRIORITIES,
    DEFAULT_CACHE_TTL_MS,
    DEFAULT_TIMEOUT_MS,
    isAuthorizedSourceUrl,
    addAuthorizedUrlPrefix,
    removeAuthorizedUrlPrefix,
    clearAdminAuthorizedUrlPrefixes,
    DEFAULT_REMOTE_FEEDS
  };
});
