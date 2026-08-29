/**
 * KhiemEdu Storage Engine with Precise Class-Level Isolation
 */

const STORAGE_PREFIX = 'khiemedu_';
const DB_NAME = 'KhiemEdu_DB';
const DB_VERSION = 2;
const STORE_PDFS = 'pdf_store';
const STORE_SUBMISSIONS = 'submission_photos';

const StorageEngine = {
  db: null,
  channel: typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('khiemedu_sync') : null,

  async init() {
    await this.initIndexedDB();
    this.seedSampleDataIfEmpty();
    this.seedStudentRosterIfEmpty();
  },

  initIndexedDB() {
    return new Promise((resolve) => {
      if (!window.indexedDB) {
        console.warn('IndexedDB not supported, falling back to LocalStorage');
        resolve(null);
        return;
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_PDFS)) {
          db.createObjectStore(STORE_PDFS);
        }
        if (!db.objectStoreNames.contains(STORE_SUBMISSIONS)) {
          db.createObjectStore(STORE_SUBMISSIONS);
        }
      };
      req.onsuccess = (e) => {
        this.db = e.target.result;
        resolve(this.db);
      };
      req.onerror = (e) => {
        console.error('IndexedDB open error:', e);
        resolve(null);
      };
    });
  },

  async savePdfBlob(quizId, base64OrBlob) {
    if (this.db) {
      return new Promise((resolve) => {
        const tx = this.db.transaction([STORE_PDFS], 'readwrite');
        const store = tx.objectStore(STORE_PDFS);
        store.put(base64OrBlob, 'pdf_' + quizId);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      });
    }
    return this.set('pdf_' + quizId, base64OrBlob);
  },

  async getPdfBlob(quizId) {
    if (this.db) {
      return new Promise((resolve) => {
        const tx = this.db.transaction([STORE_PDFS], 'readonly');
        const store = tx.objectStore(STORE_PDFS);
        const req = store.get('pdf_' + quizId);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    }
    return this.get('pdf_' + quizId);
  },

  async removePdfBlob(quizId) {
    if (this.db) {
      return new Promise((resolve) => {
        const tx = this.db.transaction([STORE_PDFS], 'readwrite');
        const store = tx.objectStore(STORE_PDFS);
        store.delete('pdf_' + quizId);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      });
    }
    return this.remove('pdf_' + quizId);
  },

  async set(key, value) {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, typeof value === 'string' ? value : JSON.stringify(value));
      if (this.channel) {
        this.channel.postMessage({ type: 'storage_update', key });
      }
      return true;
    } catch (e) {
      console.error('Storage set error:', e);
      return false;
    }
  },

  async get(key) {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + key);
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    } catch (e) {
      console.error('Storage get error:', e);
      return null;
    }
  },

  async remove(key) {
    localStorage.removeItem(STORAGE_PREFIX + key);
    if (this.channel) {
      this.channel.postMessage({ type: 'storage_remove', key });
    }
  },

  async list(prefix = '') {
    const fullPrefix = STORAGE_PREFIX + prefix;
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(fullPrefix)) {
        keys.push(k.replace(STORAGE_PREFIX, ''));
      }
    }
    return keys;
  },

  async getStudentRoster() {
    const roster = await this.get('student_roster');
    return roster || [];
  },

  async saveStudentRoster(roster) {
    return await this.set('student_roster', roster);
  },

  async saveQuiz(quiz) {
    return await this.set('quiz:' + quiz.id, quiz);
  },

  async getQuiz(id) {
    return await this.get('quiz:' + id);
  },

  async getAllQuizzes() {
    const keys = await this.list('quiz:');
    const list = [];
    for (const key of keys) {
      const q = await this.get(key);
      if (q) list.push(q);
    }
    list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    return list;
  },

  async deleteQuiz(quizId) {
    await this.remove('quiz:' + quizId);
    await this.removePdfBlob(quizId);

    const resultKeys = await this.list(`result:${quizId}:`);
    for (const rKey of resultKeys) {
      await this.remove(rKey);
    }
    const submittedKeys = await this.list(`submitted:${quizId}:`);
    for (const sKey of submittedKeys) {
      await this.remove(sKey);
    }
    return true;
  },

  async saveResult(result) {
    const resultKey = `result:${result.quizId}:${result.className}_${result.name}_${Date.now()}`;
    result.id = resultKey;
    await this.set(resultKey, result);
    await this.set(`submitted:${result.quizId}:${result.className}_${result.name}`, '1');
    return resultKey;
  },

  async hasSubmitted(quizId, className, name) {
    const sub = await this.get(`submitted:${quizId}:${className}_${name}`);
    return !!sub;
  },

  async getResultsByQuiz(quizId) {
    const keys = await this.list(`result:${quizId}:`);
    const results = [];
    for (const key of keys) {
      const r = await this.get(key);
      if (r) {
        r.key = key;
        results.push(r);
      }
    }
    return results;
  },

  seedStudentRosterIfEmpty() {
    if (!localStorage.getItem(STORAGE_PREFIX + 'student_roster')) {
      const initialRoster = [
        { id: 'SURI10', name: 'SURI', className: '10', avatar: '🦊' },
        { id: 'NGHIA7', name: 'NGHĨA', className: '7', avatar: '🚀' },
        { id: 'GIANG8', name: 'GIANG', className: '8', avatar: '🦁' },
        { id: 'TIEN12', name: 'TIÊN', className: '12', avatar: '🦉' },
        { id: 'MINH10', name: 'MINH', className: '10', avatar: '⚡' }
      ];
      this.saveStudentRoster(initialRoster);
    }
  },

  seedSampleDataIfEmpty() {
    // Sample Quiz 1: Math 10 for Class 10 (SURI, MINH)
    const sample10 = {
      id: 'TOAN10_GK1',
      title: 'Đề Kiểm Tra Toán Học — Lớp 10',
      targetClass: '10',
      timeLimit: 45,
      totalQuestions: 12,
      mcqCount: 10,
      essayCount: 2,
      examMode: 'split_pdf',
      pdfFileName: 'De_Toan_10.pdf',
      pdfDataUrl: null,
      assignType: 'classes',
      assignedClasses: ['10', '10A1', '10A2'],
      assignedStudents: ['SURI (10)', 'MINH (10)'],
      createdAt: new Date().toISOString(),
      answerKeys: [
        { num: 1, type: 'mcq', correct: 'A', score: 0.5 },
        { num: 2, type: 'mcq', correct: 'C', score: 0.5 },
        { num: 3, type: 'mcq', correct: 'B', score: 0.5 },
        { num: 4, type: 'mcq', correct: 'D', score: 0.5 },
        { num: 5, type: 'mcq', correct: 'A', score: 0.5 },
        { num: 6, type: 'mcq', correct: 'B', score: 0.5 },
        { num: 7, type: 'mcq', correct: 'C', score: 0.5 },
        { num: 8, type: 'mcq', correct: 'A', score: 0.5 },
        { num: 9, type: 'mcq', correct: 'D', score: 0.5 },
        { num: 10, type: 'mcq', correct: 'B', score: 0.5 },
        { num: 11, type: 'essay', correct: '12 | x=12', score: 2.5 },
        { num: 12, type: 'essay', correct: '1/2 | 0.5', score: 2.5 }
      ]
    };
    this.saveQuiz(sample10);

    // Sample Quiz 2: Math 8 for Class 8 (GIANG)
    const sample8 = {
      id: 'TOAN8_GK1',
      title: 'Đề Kiểm Tra Giữa Học Kỳ I — Toán 8',
      targetClass: '8',
      timeLimit: 45,
      totalQuestions: 12,
      mcqCount: 10,
      essayCount: 2,
      examMode: 'split_pdf',
      pdfFileName: 'De_Toan_8.pdf',
      pdfDataUrl: null,
      assignType: 'classes',
      assignedClasses: ['8', '8A1', '8A2'],
      assignedStudents: ['GIANG (8)'],
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      answerKeys: [
        { num: 1, type: 'mcq', correct: 'B', score: 0.5 },
        { num: 2, type: 'mcq', correct: 'C', score: 0.5 },
        { num: 3, type: 'mcq', correct: 'A', score: 0.5 },
        { num: 4, type: 'mcq', correct: 'D', score: 0.5 },
        { num: 5, type: 'mcq', correct: 'A', score: 0.5 },
        { num: 6, type: 'mcq', correct: 'C', score: 0.5 },
        { num: 7, type: 'mcq', correct: 'B', score: 0.5 },
        { num: 8, type: 'mcq', correct: 'D', score: 0.5 },
        { num: 9, type: 'mcq', correct: 'A', score: 0.5 },
        { num: 10, type: 'mcq', correct: 'B', score: 0.5 },
        { num: 11, type: 'essay', correct: '144 | x=12', score: 2.5 },
        { num: 12, type: 'essay', correct: '0.25 | 1/4', score: 2.5 }
      ]
    };
    this.saveQuiz(sample8);
  }
};

window.StorageEngine = StorageEngine;
