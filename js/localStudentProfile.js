(function () {
  'use strict';

  const STORAGE_KEY = 'kedu_student_profile_v1';
  const VERSION = 1;
  let profile = null;

  function now() { return new Date().toISOString(); }
  function createStudentId() {
    if (globalThis.crypto?.randomUUID) return 'stu_' + globalThis.crypto.randomUUID();
    if (globalThis.crypto?.getRandomValues) {
      const bytes = new Uint8Array(16);
      globalThis.crypto.getRandomValues(bytes);
      return 'stu_' + Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    }
    return 'stu_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2);
  }
  function normalize(value) { return typeof value === 'string' ? value.trim() : ''; }
  function read() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return saved && saved.version === VERSION ? saved : null;
    } catch (_) { return null; }
  }
  function ensureStudentId() {
    if (!profile) profile = { version: VERSION, createdAt: now() };
    if (!profile.studentId) profile.studentId = createStudentId();
    return profile.studentId;
  }
  function saveProfile(next = {}) {
    const existing = profile || read() || {};
    const timestamp = now();
    profile = {
      version: VERSION,
      studentId: existing.studentId || createStudentId(),
      name: normalize(next.name !== undefined ? next.name : existing.name),
      className: normalize(next.className !== undefined ? next.className : existing.className),
      avatar: next.avatar !== undefined ? next.avatar : (existing.avatar || ''),
      createdAt: existing.createdAt || timestamp,
      updatedAt: timestamp,
      lastActiveAt: timestamp
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    return { ...profile };
  }
  const api = {
    init() { profile = read(); ensureStudentId(); return saveProfile(profile); },
    getProfile() { return profile ? { ...profile } : null; },
    getStudentId() { return ensureStudentId(); },
    isReady() { return Boolean(profile?.name && profile?.className); },
    saveProfile,
    updateProfile(next) { return saveProfile(next); },
    ensureStudentId() { const id = ensureStudentId(); saveProfile(profile); return id; },
    clearProfile() { profile = null; localStorage.removeItem(STORAGE_KEY); }
  };
  window.LocalStudentProfile = api;
})();
