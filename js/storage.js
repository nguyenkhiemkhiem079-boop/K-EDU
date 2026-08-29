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
    if (window.FirebaseEngine) {
      await window.FirebaseEngine.init();
    }
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
      const localPdf = await new Promise((resolve) => {
        const tx = this.db.transaction([STORE_PDFS], 'readonly');
        const store = tx.objectStore(STORE_PDFS);
        const req = store.get('pdf_' + quizId);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
      if (localPdf) return localPdf;
    }

    if (window.FirebaseEngine && window.FirebaseEngine.isActive) {
      const quiz = await window.FirebaseEngine.getQuiz(quizId);
      if (quiz && quiz.pdfDataUrl && quiz.pdfDataUrl.startsWith('http')) {
        return quiz.pdfDataUrl;
      }
    }

    return this.get('pdf_' + quizId);
  },

  async removePdfBlob(quizId) {
    if (window.FirebaseEngine && window.FirebaseEngine.isActive) {
      await window.FirebaseEngine.deletePdf(quizId);
    }
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
    if (window.FirebaseEngine && window.FirebaseEngine.isActive) {
      const cloudRoster = await window.FirebaseEngine.getStudentRoster();
      if (cloudRoster) {
        await this.set('student_roster', cloudRoster);
        return cloudRoster;
      }
    }
    const roster = await this.get('student_roster');
    return roster || [];
  },

  async saveStudentRoster(roster) {
    if (window.FirebaseEngine && window.FirebaseEngine.isActive) {
      await window.FirebaseEngine.saveStudentRoster(roster);
    }
    return await this.set('student_roster', roster);
  },

  async saveQuiz(quiz) {
    const quizToSave = { ...quiz };
    if (window.FirebaseEngine && window.FirebaseEngine.isActive) {
      await window.FirebaseEngine.saveQuiz(quizToSave);
      if (quizToSave.pdfDataUrl && quizToSave.pdfDataUrl.startsWith('data:')) {
        delete quizToSave.pdfDataUrl;
      }
      return await this.set('quiz:' + quiz.id, quizToSave);
    }
    if (quizToSave.pdfDataUrl && quizToSave.pdfDataUrl.startsWith('data:')) {
      delete quizToSave.pdfDataUrl;
    }
    return await this.set('quiz:' + quiz.id, quizToSave);
  },

  async getQuiz(id) {
    if (window.FirebaseEngine && window.FirebaseEngine.isActive) {
      const cloudQuiz = await window.FirebaseEngine.getQuiz(id);
      if (cloudQuiz) {
        const quizToCache = { ...cloudQuiz };
        if (quizToCache.pdfDataUrl && quizToCache.pdfDataUrl.startsWith('data:')) {
          delete quizToCache.pdfDataUrl;
        }
        await this.set('quiz:' + id, quizToCache);
        return cloudQuiz;
      }
    }
    return await this.get('quiz:' + id);
  },

  async getAllQuizzes() {
    if (window.FirebaseEngine && window.FirebaseEngine.isActive) {
      const cloudQuizzes = await window.FirebaseEngine.getAllQuizzes();
      if (cloudQuizzes && cloudQuizzes.length > 0) {
        for (const q of cloudQuizzes) {
          const qCache = { ...q };
          if (qCache.pdfDataUrl && qCache.pdfDataUrl.startsWith('data:')) {
            delete qCache.pdfDataUrl;
          }
          await this.set('quiz:' + q.id, qCache);
        }
        return cloudQuizzes;
      }
    }

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
    if (window.FirebaseEngine && window.FirebaseEngine.isActive) {
      await window.FirebaseEngine.deleteQuiz(quizId);
    }
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
    if (window.FirebaseEngine && window.FirebaseEngine.isActive) {
      await window.FirebaseEngine.saveResult(result);
    }
    await this.set(resultKey, result);
    await this.set(`submitted:${result.quizId}:${result.className}_${result.name}`, '1');
    return resultKey;
  },

  async hasSubmitted(quizId, className, name) {
    const sub = await this.get(`submitted:${quizId}:${className}_${name}`);
    return !!sub;
  },

  async getResultsByQuiz(quizId) {
    if (window.FirebaseEngine && window.FirebaseEngine.isActive) {
      const cloudResults = await window.FirebaseEngine.getResultsByQuiz(quizId);
      if (cloudResults && cloudResults.length > 0) {
        for (const r of cloudResults) {
          await this.set(r.id || `result:${r.quizId}:${r.className}_${r.name}_${Date.now()}`, r);
        }
        return cloudResults;
      }
    }

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

  async getAllResults() {
    if (window.FirebaseEngine && window.FirebaseEngine.isActive) {
      const cloudResults = await window.FirebaseEngine.getAllResults();
      if (cloudResults && cloudResults.length > 0) {
        for (const r of cloudResults) {
          await this.set(r.id || `result:${r.quizId}:${r.className}_${r.name}_${Date.now()}`, r);
        }
        return cloudResults;
      }
    }

    const keys = await this.list('result:');
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

  seedSampleDataIfEmpty(force = false) {
    if (!force && localStorage.getItem(STORAGE_PREFIX + 'sample_seeded_v3')) {
      return;
    }

    const defaultExams = [
      {
        id: 'TOAN6_GK1',
        title: 'Đề Kiểm Tra Giữa Học Kỳ I — Toán 6',
        targetClass: '6',
        examTerm: 'GK1',
        timeLimit: 45,
        totalQuestions: 12,
        mcqCount: 10,
        essayCount: 2,
        examMode: 'split_pdf',
        pdfFileName: 'De_Toan_6_GK1.html',
        assignType: 'all',
        createdAt: new Date().toISOString(),
        answerKeys: [
          { num: 1, type: 'mcq', correct: 'A', score: 0.7 },
          { num: 2, type: 'mcq', correct: 'B', score: 0.7 },
          { num: 3, type: 'mcq', correct: 'A', score: 0.7 },
          { num: 4, type: 'mcq', correct: 'C', score: 0.7 },
          { num: 5, type: 'mcq', correct: 'D', score: 0.7 },
          { num: 6, type: 'mcq', correct: 'A', score: 0.7 },
          { num: 7, type: 'mcq', correct: 'B', score: 0.7 },
          { num: 8, type: 'mcq', correct: 'C', score: 0.7 },
          { num: 9, type: 'mcq', correct: 'A', score: 0.7 },
          { num: 10, type: 'mcq', correct: 'D', score: 0.7 },
          { num: 11, type: 'essay', correct: '4 | x=4', score: 1.5 },
          { num: 12, type: 'essay', correct: '0 | n=0', score: 1.5 }
        ]
      },
      {
        id: 'TOAN7_GK1',
        title: 'Đề Kiểm Tra Giữa Học Kỳ I — Toán 7',
        targetClass: '7',
        examTerm: 'GK1',
        timeLimit: 45,
        totalQuestions: 12,
        mcqCount: 10,
        essayCount: 2,
        examMode: 'split_pdf',
        pdfFileName: 'De_Toan_7_GK1.html',
        assignType: 'all',
        createdAt: new Date(Date.now() - 10000).toISOString(),
        answerKeys: [
          { num: 1, type: 'mcq', correct: 'A', score: 0.7 },
          { num: 2, type: 'mcq', correct: 'A', score: 0.7 },
          { num: 3, type: 'mcq', correct: 'B', score: 0.7 },
          { num: 4, type: 'mcq', correct: 'C', score: 0.7 },
          { num: 5, type: 'mcq', correct: 'D', score: 0.7 },
          { num: 6, type: 'mcq', correct: 'A', score: 0.7 },
          { num: 7, type: 'mcq', correct: 'B', score: 0.7 },
          { num: 8, type: 'mcq', correct: 'C', score: 0.7 },
          { num: 9, type: 'mcq', correct: 'A', score: 0.7 },
          { num: 10, type: 'mcq', correct: 'D', score: 0.7 },
          { num: 11, type: 'essay', correct: '12 | x=12', score: 1.5 },
          { num: 12, type: 'essay', correct: '4 | min=4', score: 1.5 }
        ]
      },
      {
        id: 'TOAN8_GK1',
        title: 'Đề Kiểm Tra Giữa Học Kỳ I — Toán 8',
        targetClass: '8',
        examTerm: 'GK1',
        timeLimit: 45,
        totalQuestions: 12,
        mcqCount: 10,
        essayCount: 2,
        examMode: 'split_pdf',
        pdfFileName: 'De_Toan_8_GK1.html',
        assignType: 'all',
        createdAt: new Date(Date.now() - 20000).toISOString(),
        answerKeys: [
          { num: 1, type: 'mcq', correct: 'A', score: 0.7 },
          { num: 2, type: 'mcq', correct: 'B', score: 0.7 },
          { num: 3, type: 'mcq', correct: 'C', score: 0.7 },
          { num: 4, type: 'mcq', correct: 'D', score: 0.7 },
          { num: 5, type: 'mcq', correct: 'A', score: 0.7 },
          { num: 6, type: 'mcq', correct: 'B', score: 0.7 },
          { num: 7, type: 'mcq', correct: 'C', score: 0.7 },
          { num: 8, type: 'mcq', correct: 'A', score: 0.7 },
          { num: 9, type: 'mcq', correct: 'D', score: 0.7 },
          { num: 10, type: 'mcq', correct: 'B', score: 0.7 },
          { num: 11, type: 'essay', correct: '3 | x=3', score: 1.5 },
          { num: 12, type: 'essay', correct: '9 | max=9', score: 1.5 }
        ]
      },
      {
        id: 'TOAN9_GK1',
        title: 'Đề Kiểm Tra Giữa Học Kỳ I — Toán 9',
        targetClass: '9',
        examTerm: 'GK1',
        timeLimit: 45,
        totalQuestions: 12,
        mcqCount: 10,
        essayCount: 2,
        examMode: 'split_pdf',
        pdfFileName: 'De_Toan_9_GK1.html',
        assignType: 'all',
        createdAt: new Date(Date.now() - 30000).toISOString(),
        answerKeys: [
          { num: 1, type: 'mcq', correct: 'A', score: 0.7 },
          { num: 2, type: 'mcq', correct: 'A', score: 0.7 },
          { num: 3, type: 'mcq', correct: 'B', score: 0.7 },
          { num: 4, type: 'mcq', correct: 'C', score: 0.7 },
          { num: 5, type: 'mcq', correct: 'D', score: 0.7 },
          { num: 6, type: 'mcq', correct: 'A', score: 0.7 },
          { num: 7, type: 'mcq', correct: 'B', score: 0.7 },
          { num: 8, type: 'mcq', correct: 'C', score: 0.7 },
          { num: 9, type: 'mcq', correct: 'A', score: 0.7 },
          { num: 10, type: 'mcq', correct: 'D', score: 0.7 },
          { num: 11, type: 'essay', correct: '2 | P=2', score: 1.5 },
          { num: 12, type: 'essay', correct: '2.83 | 2*sqrt(2)', score: 1.5 }
        ]
      },
      {
        id: 'TOAN_TS10',
        title: 'Đề Luyện Thi Tuyển Sinh Vào Lớp 10 — Môn Toán',
        targetClass: 'TS10',
        examTerm: 'TS10',
        timeLimit: 90,
        totalQuestions: 15,
        mcqCount: 12,
        essayCount: 3,
        examMode: 'split_pdf',
        pdfFileName: 'De_Toan_TS10.html',
        assignType: 'all',
        createdAt: new Date(Date.now() - 40000).toISOString(),
        answerKeys: [
          { num: 1, type: 'mcq', correct: 'A', score: 0.55 },
          { num: 2, type: 'mcq', correct: 'B', score: 0.55 },
          { num: 3, type: 'mcq', correct: 'C', score: 0.55 },
          { num: 4, type: 'mcq', correct: 'A', score: 0.55 },
          { num: 5, type: 'mcq', correct: 'D', score: 0.55 },
          { num: 6, type: 'mcq', correct: 'B', score: 0.55 },
          { num: 7, type: 'mcq', correct: 'C', score: 0.55 },
          { num: 8, type: 'mcq', correct: 'A', score: 0.55 },
          { num: 9, type: 'mcq', correct: 'D', score: 0.55 },
          { num: 10, type: 'mcq', correct: 'B', score: 0.55 },
          { num: 11, type: 'mcq', correct: 'C', score: 0.55 },
          { num: 12, type: 'mcq', correct: 'A', score: 0.55 },
          { num: 13, type: 'essay', correct: '40 | x=40', score: 1.1 },
          { num: 14, type: 'essay', correct: '1.5 | 3/2', score: 1.1 },
          { num: 15, type: 'essay', correct: '5.2 | 3*sqrt(3)', score: 1.1 }
        ]
      },
      {
        id: 'TOAN10_GK1',
        title: 'Đề Kiểm Tra Giữa Học Kỳ I — Toán 10',
        targetClass: '10',
        examTerm: 'GK1',
        timeLimit: 45,
        totalQuestions: 12,
        mcqCount: 10,
        essayCount: 2,
        examMode: 'split_pdf',
        pdfFileName: 'De_Toan_10_GK1.html',
        assignType: 'all',
        createdAt: new Date(Date.now() - 50000).toISOString(),
        answerKeys: [
          { num: 1, type: 'mcq', correct: 'A', score: 0.7 },
          { num: 2, type: 'mcq', correct: 'C', score: 0.7 },
          { num: 3, type: 'mcq', correct: 'B', score: 0.7 },
          { num: 4, type: 'mcq', correct: 'D', score: 0.7 },
          { num: 5, type: 'mcq', correct: 'A', score: 0.7 },
          { num: 6, type: 'mcq', correct: 'B', score: 0.7 },
          { num: 7, type: 'mcq', correct: 'C', score: 0.7 },
          { num: 8, type: 'mcq', correct: 'A', score: 0.7 },
          { num: 9, type: 'mcq', correct: 'D', score: 0.7 },
          { num: 10, type: 'mcq', correct: 'B', score: 0.7 },
          { num: 11, type: 'essay', correct: '12 | F=12', score: 1.5 },
          { num: 12, type: 'essay', correct: '4 | min=4', score: 1.5 }
        ]
      },
      {
        id: 'TOAN11_GK1',
        title: 'Đề Kiểm Tra Giữa Học Kỳ I — Toán 11',
        targetClass: '11',
        examTerm: 'GK1',
        timeLimit: 45,
        totalQuestions: 12,
        mcqCount: 10,
        essayCount: 2,
        examMode: 'split_pdf',
        pdfFileName: 'De_Toan_11_GK1.html',
        assignType: 'all',
        createdAt: new Date(Date.now() - 60000).toISOString(),
        answerKeys: [
          { num: 1, type: 'mcq', correct: 'A', score: 0.7 },
          { num: 2, type: 'mcq', correct: 'A', score: 0.7 },
          { num: 3, type: 'mcq', correct: 'B', score: 0.7 },
          { num: 4, type: 'mcq', correct: 'C', score: 0.7 },
          { num: 5, type: 'mcq', correct: 'D', score: 0.7 },
          { num: 6, type: 'mcq', correct: 'A', score: 0.7 },
          { num: 7, type: 'mcq', correct: 'B', score: 0.7 },
          { num: 8, type: 'mcq', correct: 'C', score: 0.7 },
          { num: 9, type: 'mcq', correct: 'A', score: 0.7 },
          { num: 10, type: 'mcq', correct: 'D', score: 0.7 },
          { num: 11, type: 'essay', correct: '1.5 | 3/2', score: 1.5 },
          { num: 12, type: 'essay', correct: '0 | x=0', score: 1.5 }
        ]
      },
      {
        id: 'TOAN12_GK1',
        title: 'Đề Ôn Thi Tốt Nghiệp THPT — Môn Toán 12',
        targetClass: '12',
        examTerm: 'THPT',
        timeLimit: 90,
        totalQuestions: 15,
        mcqCount: 13,
        essayCount: 2,
        examMode: 'split_pdf',
        pdfFileName: 'De_Toan_12_THPT.html',
        assignType: 'all',
        createdAt: new Date(Date.now() - 70000).toISOString(),
        answerKeys: [
          { num: 1, type: 'mcq', correct: 'A', score: 0.55 },
          { num: 2, type: 'mcq', correct: 'A', score: 0.55 },
          { num: 3, type: 'mcq', correct: 'B', score: 0.55 },
          { num: 4, type: 'mcq', correct: 'C', score: 0.55 },
          { num: 5, type: 'mcq', correct: 'D', score: 0.55 },
          { num: 6, type: 'mcq', correct: 'A', score: 0.55 },
          { num: 7, type: 'mcq', correct: 'B', score: 0.55 },
          { num: 8, type: 'mcq', correct: 'C', score: 0.55 },
          { num: 9, type: 'mcq', correct: 'A', score: 0.55 },
          { num: 10, type: 'mcq', correct: 'D', score: 0.55 },
          { num: 11, type: 'mcq', correct: 'B', score: 0.55 },
          { num: 12, type: 'mcq', correct: 'C', score: 0.55 },
          { num: 13, type: 'mcq', correct: 'A', score: 0.55 },
          { num: 14, type: 'essay', correct: '12 | m=12', score: 1.4 },
          { num: 15, type: 'essay', correct: '1 | x=1', score: 1.4 }
        ]
      }
    ];

    defaultExams.forEach(exam => this.saveQuiz(exam));
    localStorage.setItem(STORAGE_PREFIX + 'sample_seeded_v3', '1');
  }
};

window.StorageEngine = StorageEngine;
