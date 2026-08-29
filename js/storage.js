/**
 * KhiemEdu Storage Engine with Student/Class Roster & Targeted Assignment Control
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

  // Student Roster & Classes Management
  async getStudentRoster() {
    const roster = await this.get('student_roster');
    return roster || [];
  },

  async saveStudentRoster(roster) {
    return await this.set('student_roster', roster);
  },

  // Quizzes
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

  // Results
  async saveResult(result) {
    const resultKey = `result:${result.quizId}:${result.className}_${result.name}_${Date.now()}`;
    result.id = resultKey;
    await this.set(resultKey, result);
    await this.set(`submitted:${result.quizId}:${result.className}_${result.name}`, '1');
    return resultKey;
  },

  async updateResult(resultKey, updatedResult) {
    return await this.set(resultKey, updatedResult);
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

  // Seed sample student roster (6 students in different classes)
  seedStudentRosterIfEmpty() {
    if (!localStorage.getItem(STORAGE_PREFIX + 'student_roster')) {
      const initialRoster = [
        { id: 'STU01', name: 'Nguyễn Văn An', className: '8A1', avatar: '🦊' },
        { id: 'STU02', name: 'Trần Thị Bình', className: '8A2', avatar: '🦉' },
        { id: 'STU03', name: 'Lê Hoàng Cường', className: '9B1', avatar: '🦁' },
        { id: 'STU04', name: 'Phạm Minh Đức', className: '9B2', avatar: '🐼' },
        { id: 'STU05', name: 'Vũ Ngọc Hoa', className: '10C1', avatar: '🌟' },
        { id: 'STU06', name: 'Đặng Tuấn Kiệt', className: '10C2', avatar: '🚀' }
      ];
      this.saveStudentRoster(initialRoster);
    }
  },

  // Seed sample exam
  seedSampleDataIfEmpty() {
    const sampleKey = 'quiz:AZOTA01';
    if (!localStorage.getItem(STORAGE_PREFIX + sampleKey)) {
      const sampleQuiz = {
        id: 'AZOTA01',
        title: 'Đề Kiểm Tra Giữa Học Kỳ I — Toán 8',
        timeLimit: 45,
        totalQuestions: 12,
        examMode: 'split_pdf',
        pdfFileName: 'De_Kiem_Tra_Toan_8.pdf',
        pdfDataUrl: null,
        // Targeted Assignment Settings
        assignType: 'all', // 'all', 'classes', 'students'
        assignedClasses: ['8A1', '8A2'],
        assignedStudents: ['Nguyễn Văn An (8A1)', 'Trần Thị Bình (8A2)'],
        shuffle: false,
        showLeaderboard: true,
        antiCheat: true,
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
          { num: 9, type: 'truefalse', correct: 'Đúng', score: 1 },
          { num: 10, type: 'truefalse', correct: 'Sai', score: 1 },
          { num: 11, type: 'essay', correct: '12', score: 1.5 },
          { num: 12, type: 'essay', correct: '0.5', score: 1.5 }
        ]
      };
      this.saveQuiz(sampleQuiz);
    }
  }
};

window.StorageEngine = StorageEngine;
