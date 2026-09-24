/**
 * KhiemEdu Storage Engine with Precise Class-Level Isolation
 */

const STORAGE_PREFIX = 'khiemedu_';
const DB_NAME = 'KhiemEdu_DB';
const DB_VERSION = 4;
const STORE_PDFS = 'pdf_store';
const STORE_SUBMISSIONS = 'submission_photos';
const STORE_QUIZZES = 'quiz_store';
const STORE_PRIVATE_QUIZZES = 'quiz_private_store';
const QUIZ_INDEX_KEY = 'quiz_index';
const QUIZ_SYNC_QUEUE_KEY = 'quiz_sync_queue';
const RESULT_SYNC_QUEUE_KEY = 'result_sync_queue';

function classifyQuizAttachment(quiz = {}) {
  const value = quiz.pdfDataUrl;
  if (quiz.examHtml && typeof value === 'string' && value.startsWith('data:text/html')) return 'generated_html';
  if (typeof value === 'string' && value.startsWith('data:application/pdf')) return 'data_pdf';
  if (value instanceof Blob || (typeof value === 'string' && value.startsWith('blob:'))) return 'blob_file';
  if (typeof value === 'string' && /^https?:\/\//.test(value)) return 'remote_url';
  return 'none';
}

function normalizeQuizForPersistence(quiz = {}) {
  const normalized = { ...quiz };
  if (!normalized.id || !normalized.title) return { success: false, code: 'INVALID_QUIZ', quiz: normalized };
  if (!normalized.examHtml && typeof normalized.pdfDataUrl === 'string' && normalized.pdfDataUrl.startsWith('data:text/html')) {
    try { normalized.examHtml = decodeURIComponent(normalized.pdfDataUrl.slice(normalized.pdfDataUrl.indexOf(',') + 1)); }
    catch (_) { return { success: false, code: 'INVALID_GENERATED_HTML', quiz: normalized }; }
  }
  normalized.updatedAt = normalized.updatedAt || new Date().toISOString();
  if (!normalized.createdAt) normalized.createdAt = normalized.updatedAt;
  if (classifyQuizAttachment(normalized) === 'generated_html') delete normalized.pdfDataUrl;
  return { success: true, quiz: normalized, attachmentType: classifyQuizAttachment(normalized) };
}

function containsPrivateAnswerData(quiz = {}) {
  return Array.isArray(quiz.answerKeys) && quiz.answerKeys.some(key => Object.prototype.hasOwnProperty.call(key || {}, 'correct') || Object.prototype.hasOwnProperty.call(key || {}, 'correctAnswer') || Object.prototype.hasOwnProperty.call(key || {}, 'explanation') || Object.prototype.hasOwnProperty.call(key || {}, 'keyFormula'));
}

function toPublicAnswerKey(key = {}) {
  const publicKey = JSON.parse(JSON.stringify(key));
  delete publicKey.correct;
  delete publicKey.correctAnswer;
  delete publicKey.explanation;
  delete publicKey.pitfall;
  delete publicKey.keyFormula;
  return publicKey;
}

function toPublicQuizPayload(quiz = {}) {
  const publicQuiz = JSON.parse(JSON.stringify(quiz));
  publicQuiz.answerKeys = Array.isArray(publicQuiz.answerKeys) ? publicQuiz.answerKeys.map(toPublicAnswerKey) : [];
  if (Array.isArray(publicQuiz.questions)) publicQuiz.questions = publicQuiz.questions.map(toPublicAnswerKey);
  delete publicQuiz.privateAnswerKeys;
  delete publicQuiz.answerKey;
  return publicQuiz;
}

function toPrivateQuizPayload(quiz = {}) {
  return {
    id: quiz.id,
    quizId: quiz.id,
    updatedAt: quiz.updatedAt,
    answerKeys: Array.isArray(quiz.answerKeys) ? JSON.parse(JSON.stringify(quiz.answerKeys)) : []
  };
}

function toQuizIndexItem(quiz) {
  return ['id', 'title', 'subject', 'targetClass', 'examTerm', 'timeLimit', 'totalQuestions', 'createdAt', 'updatedAt']
    .reduce((item, key) => { if (quiz[key] !== undefined) item[key] = quiz[key]; return item; }, {});
}

const StorageEngine = {
  db: null,
  channel: typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('khiemedu_sync') : null,

  async init() {
    await this.initIndexedDB();
    if (window.FirebaseEngine) {
      await window.FirebaseEngine.init();
    }
    await this.purgeSampleQuizzes();
    this.seedStudentRosterIfEmpty();
    window.addEventListener?.('online', () => this.processSyncQueues());
  },

  async purgeSampleQuizzes() {
    if (localStorage.getItem(STORAGE_PREFIX + 'sample_purged_v1') === '1') return;
    localStorage.setItem(STORAGE_PREFIX + 'sample_purged_v1', '1');
    localStorage.setItem(STORAGE_PREFIX + 'sample_seeded_v3', 'purged');

    const sampleIds = [
      'TOAN6_GK1', 'TOAN7_GK1', 'TOAN8_GK1', 'TOAN9_GK1',
      'TOAN_TS10', 'TOAN10_GK1', 'TOAN11_GK1', 'TOAN12_GK1'
    ];

    // Mark tombstones instantly
    const deletedIds = this.getDeletedQuizIds();
    sampleIds.forEach(id => {
      deletedIds.add(id);
      localStorage.removeItem(STORAGE_PREFIX + 'quiz:' + id);
      localStorage.removeItem(STORAGE_PREFIX + 'pdf_' + id);
    });
    localStorage.setItem(STORAGE_PREFIX + 'deleted_quizzes', JSON.stringify(Array.from(deletedIds)));

    // Clean up Cloud & IndexedDB in background without blocking
    setTimeout(async () => {
      for (const id of sampleIds) {
        try {
          await this.removePdfBlob(id);
          if (window.FirebaseEngine && window.FirebaseEngine.isActive) {
            await window.FirebaseEngine.deleteQuiz(id);
          }
        } catch (e) {}
      }
    }, 100);
  },

  initIndexedDB() {
    return new Promise((resolve) => {
      if (!window.indexedDB) {
        console.warn('IndexedDB not supported, falling back to LocalStorage');
        resolve(null);
        return;
      }
      const timer = setTimeout(() => {
        console.warn('IndexedDB open timeout, falling back');
        resolve(null);
      }, 10000);

      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(STORE_PDFS)) {
            db.createObjectStore(STORE_PDFS);
          }
          if (!db.objectStoreNames.contains(STORE_SUBMISSIONS)) {
            db.createObjectStore(STORE_SUBMISSIONS);
          }
          if (!db.objectStoreNames.contains(STORE_QUIZZES)) {
            db.createObjectStore(STORE_QUIZZES, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(STORE_PRIVATE_QUIZZES)) {
            db.createObjectStore(STORE_PRIVATE_QUIZZES, { keyPath: 'id' });
          }
        };
        req.onsuccess = (e) => {
          clearTimeout(timer);
          this.db = e.target.result;
          resolve(this.db);
        };
        req.onerror = (e) => {
          clearTimeout(timer);
          console.error('IndexedDB open error:', e);
          resolve(null);
        };
        req.onblocked = (e) => {
          clearTimeout(timer);
          console.warn('IndexedDB open blocked');
          resolve(null);
        };
      } catch (err) {
        clearTimeout(timer);
        console.warn('IndexedDB exception:', err);
        resolve(null);
      }
    });
  },

  async enqueueSync(kind, id, action = 'save') {
    const key = kind === 'quiz' ? QUIZ_SYNC_QUEUE_KEY : RESULT_SYNC_QUEUE_KEY;
    const queue = await this.get(key) || [];
    const next = queue.filter(item => item.id !== id || item.action !== action);
    next.push({ id, action, attempts: 0, queuedAt: new Date().toISOString() });
    await this.set(key, next);
  },

  /**
   * Cho giáo viên chủ động bấm "Đồng bộ lại" khi thấy đề đang ở trạng thái
   * lỗi/chưa đồng bộ, thay vì phải chờ tự động hoặc không biết phải làm gì.
   * Đặt lại attempts về 0 để có đủ 3 lượt thử mới, rồi chạy đồng bộ ngay.
   */
  async retryCloudSync(quizId) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return { success: false, code: 'OFFLINE', error: 'Thiết bị đang offline, không thể đồng bộ.' };
    }
    if (!window.FirebaseEngine?.isActive) {
      return { success: false, code: 'FIREBASE_INACTIVE', error: 'Firebase Cloud chưa được kích hoạt trên hệ thống này.' };
    }
    await this._updateQuizSyncStatus(quizId, { status: 'pending', errorCode: null, errorMessage: null });
    await this.enqueueSync('quiz', quizId);
    await this.processSyncQueues();
    const updated = await this.getQuiz(quizId);
    return { success: updated?.cloudSync?.status === 'synced', cloudSync: updated?.cloudSync || null };
  },

  async processSyncQueues() {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    if (!window.FirebaseEngine?.isActive) return;
    for (const [kind, key] of [['quiz', QUIZ_SYNC_QUEUE_KEY], ['result', RESULT_SYNC_QUEUE_KEY]]) {
      const queue = await this.get(key) || []; const remaining = [];
      for (const item of queue) {
        const now = new Date().toISOString();
        try {
          if (item.action === 'delete') {
            if (kind === 'quiz') {
              const deleted = await window.FirebaseEngine.deleteQuiz(item.id);
              if (deleted === false || (deleted && deleted.success === false)) throw new Error('FIREBASE_DELETE_FAILED');
            }
          }
          else {
            const record = kind === 'quiz' ? await this.getQuiz(item.id, { includePrivate: true }) : await this.get(item.id.replace(STORAGE_PREFIX, ''));
            if (!record) throw new Error('SYNC_RECORD_NOT_FOUND');
            const response = kind === 'quiz'
              ? await window.FirebaseEngine.saveQuiz(toPublicQuizPayload(record), { privateAnswerKeys: record.answerKeys })
              : await window.FirebaseEngine.saveResult(record);
            if (!response || response.success === false) throw new Error(response?.error || 'FIREBASE_SYNC_FAILED');
            // QUAN TRỌNG: đánh dấu đã đồng bộ thành công — trước đây trạng thái luôn
            // dừng ở "pending" mãi mãi kể cả khi đồng bộ thành công, khiến không ai
            // biết chắc học sinh đã thấy được đề hay chưa.
            if (kind === 'quiz') {
              await this._updateQuizSyncStatus(item.id, { status: 'synced', lastAttemptAt: now, lastSuccessAt: now, errorCode: null, errorMessage: null });
            }
          }
        } catch (error) {
          const errMsg = error?.message || String(error);
          console.error('[StorageEngine] sync failure', { kind, id: item.id, action: item.action, error: errMsg });
          const nextAttempts = (item.attempts || 0) + 1;
          if (nextAttempts < 3) {
            remaining.push({ ...item, attempts: nextAttempts, error: errMsg });
            if (kind === 'quiz' && item.action !== 'delete') {
              await this._updateQuizSyncStatus(item.id, { status: 'pending', lastAttemptAt: now, errorCode: 'RETRY_PENDING', errorMessage: errMsg });
            }
          } else {
            // Hết số lần thử — TRƯỚC ĐÂY mục này bị âm thầm loại khỏi hàng đợi mà
            // không ai được báo, khiến đề tồn tại trên máy giáo viên nhưng KHÔNG BAO
            // GIỜ lên cloud, nên học sinh nhập mã sẽ luôn báo "không tìm thấy đề".
            // GIỜ: đánh dấu rõ ràng là "failed" để giao diện giáo viên hiển thị cảnh báo.
            if (kind === 'quiz' && item.action !== 'delete') {
              await this._updateQuizSyncStatus(item.id, { status: 'failed', lastAttemptAt: now, errorCode: 'SYNC_GIVE_UP', errorMessage: errMsg });
            }
          }
        }
      }
      await this.set(key, remaining);
    }
  },

  /**
   * Cập nhật riêng trường cloudSync của một đề thi đã lưu, không đụng tới các
   * trường khác. Dùng để phản ánh trung thực trạng thái đồng bộ cloud thật sự
   * (synced / pending / failed) thay vì để mãi ở "pending" hoặc biến mất âm thầm.
   */
  async _updateQuizSyncStatus(quizId, cloudSyncPatch) {
    try {
      const indexed = await this.getQuizRecordFromIndexedDB(quizId);
      let record = indexed.success ? indexed.quiz : await this.get('quiz:' + quizId);
      if (!record) return false;
      record = { ...record, cloudSync: { ...(record.cloudSync || {}), ...cloudSyncPatch } };
      const saveResult = await this.saveQuizRecordToIndexedDB(record);
      if (!saveResult.success) await this.set('quiz:' + quizId, record);
      if (this.channel) this.channel.postMessage({ type: 'quiz_sync_status_changed', quizId, cloudSync: record.cloudSync });
      return true;
    } catch (err) {
      console.warn('[StorageEngine] _updateQuizSyncStatus failed', quizId, err);
      return false;
    }
  },

  async saveQuizRecordToIndexedDB(quiz) {
    if (!this.db) await this.initIndexedDB();
    if (!this.db) return { success: false, code: 'INDEXEDDB_UNAVAILABLE' };
    return new Promise(resolve => {
      let settled = false;
      const finish = result => { if (!settled) { settled = true; clearTimeout(timer); resolve(result); } };
      const timer = setTimeout(() => finish({ success: false, code: 'INDEXEDDB_TIMEOUT' }), 10000);
      try {
        const tx = this.db.transaction([STORE_QUIZZES], 'readwrite');
        tx.objectStore(STORE_QUIZZES).put(quiz);
        tx.oncomplete = () => finish({ success: true, quizRecord: true });
        tx.onerror = () => finish({ success: false, code: 'INDEXEDDB_WRITE_FAILED', error: tx.error });
        tx.onabort = () => finish({ success: false, code: 'INDEXEDDB_WRITE_FAILED', error: tx.error });
      } catch (error) { finish({ success: false, code: 'INDEXEDDB_WRITE_FAILED', error }); }
    });
  },

  async savePrivateQuizRecordToIndexedDB(quiz) {
    if (!this.db) await this.initIndexedDB();
    if (!this.db) return { success: false, code: 'INDEXEDDB_UNAVAILABLE' };
    return new Promise(resolve => {
      try {
        const tx = this.db.transaction([STORE_PRIVATE_QUIZZES], 'readwrite');
        tx.objectStore(STORE_PRIVATE_QUIZZES).put(quiz);
        tx.oncomplete = () => resolve({ success: true, privateQuizRecord: true });
        tx.onerror = () => resolve({ success: false, code: 'INDEXEDDB_PRIVATE_WRITE_FAILED', error: tx.error });
        tx.onabort = () => resolve({ success: false, code: 'INDEXEDDB_PRIVATE_WRITE_FAILED', error: tx.error });
      } catch (error) { resolve({ success: false, code: 'INDEXEDDB_PRIVATE_WRITE_FAILED', error }); }
    });
  },

  async getQuizRecordFromIndexedDB(quizId) {
    if (!this.db) await this.initIndexedDB();
    if (!this.db) return { success: false, code: 'INDEXEDDB_UNAVAILABLE', quiz: null };
    return new Promise(resolve => {
      let settled = false;
      const finish = result => { if (!settled) { settled = true; clearTimeout(timer); resolve(result); } };
      const timer = setTimeout(() => finish({ success: false, code: 'INDEXEDDB_TIMEOUT', quiz: null }), 10000);
      try {
        const tx = this.db.transaction([STORE_QUIZZES], 'readonly');
        const req = tx.objectStore(STORE_QUIZZES).get(quizId);
        req.onsuccess = () => finish({ success: true, quiz: req.result || null });
        req.onerror = () => finish({ success: false, code: 'INDEXEDDB_READ_FAILED', quiz: null, error: req.error });
      } catch (error) { finish({ success: false, code: 'INDEXEDDB_READ_FAILED', quiz: null, error }); }
    });
  },

  async getPrivateQuizRecordFromIndexedDB(quizId) {
    if (!this.db) await this.initIndexedDB();
    if (!this.db) return { success: false, code: 'INDEXEDDB_UNAVAILABLE', quiz: null };
    return new Promise(resolve => {
      try {
        const tx = this.db.transaction([STORE_PRIVATE_QUIZZES], 'readonly');
        const req = tx.objectStore(STORE_PRIVATE_QUIZZES).get(quizId);
        req.onsuccess = () => resolve({ success: true, quiz: req.result || null });
        req.onerror = () => resolve({ success: false, code: 'INDEXEDDB_PRIVATE_READ_FAILED', quiz: null, error: req.error });
      } catch (error) { resolve({ success: false, code: 'INDEXEDDB_PRIVATE_READ_FAILED', quiz: null, error }); }
    });
  },

  async deleteQuizRecordFromIndexedDB(quizId) {
    if (!this.db) await this.initIndexedDB();
    if (!this.db) return { success: false, code: 'INDEXEDDB_UNAVAILABLE' };
    return new Promise(resolve => {
      try {
        const tx = this.db.transaction([STORE_QUIZZES], 'readwrite');
        tx.objectStore(STORE_QUIZZES).delete(quizId);
        tx.oncomplete = () => resolve({ success: true });
        tx.onerror = () => resolve({ success: false, code: 'INDEXEDDB_WRITE_FAILED', error: tx.error });
        tx.onabort = () => resolve({ success: false, code: 'INDEXEDDB_WRITE_FAILED', error: tx.error });
      } catch (error) { resolve({ success: false, code: 'INDEXEDDB_WRITE_FAILED', error }); }
    });
  },

  async deletePrivateQuizRecordFromIndexedDB(quizId) {
    if (!this.db) await this.initIndexedDB();
    if (!this.db) return { success: false, code: 'INDEXEDDB_UNAVAILABLE' };
    return new Promise(resolve => {
      try {
        const tx = this.db.transaction([STORE_PRIVATE_QUIZZES], 'readwrite');
        tx.objectStore(STORE_PRIVATE_QUIZZES).delete(quizId);
        tx.oncomplete = () => resolve({ success: true });
        tx.onerror = () => resolve({ success: false, code: 'INDEXEDDB_PRIVATE_DELETE_FAILED', error: tx.error });
        tx.onabort = () => resolve({ success: false, code: 'INDEXEDDB_PRIVATE_DELETE_FAILED', error: tx.error });
      } catch (error) { resolve({ success: false, code: 'INDEXEDDB_PRIVATE_DELETE_FAILED', error }); }
    });
  },

  async listQuizRecordsFromIndexedDB() {
    if (!this.db) await this.initIndexedDB();
    if (!this.db) return { success: false, code: 'INDEXEDDB_UNAVAILABLE', quizzes: [] };
    return new Promise(resolve => {
      try {
        const tx = this.db.transaction([STORE_QUIZZES], 'readonly');
        const req = tx.objectStore(STORE_QUIZZES).getAll();
        req.onsuccess = () => resolve({ success: true, quizzes: req.result || [] });
        req.onerror = () => resolve({ success: false, code: 'INDEXEDDB_READ_FAILED', quizzes: [], error: req.error });
      } catch (error) { resolve({ success: false, code: 'INDEXEDDB_READ_FAILED', quizzes: [], error }); }
    });
  },

  async updateQuizIndex(quiz) {
    const index = await this.get(QUIZ_INDEX_KEY);
    const items = Array.isArray(index) ? index.filter(item => item.id !== quiz.id) : [];
    items.push(toQuizIndexItem(quiz));
    return this.set(QUIZ_INDEX_KEY, items);
  },

  async savePdfBlob(quizId, base64OrBlob) {
    if (typeof base64OrBlob === 'string' && base64OrBlob.startsWith('blob:')) {
      try {
        const response = await fetch(base64OrBlob);
        if (!response.ok) return false;
        base64OrBlob = await response.blob();
      } catch (error) { return false; }
    }
    if (!this.db) await this.initIndexedDB();
    if (this.db) {
      return new Promise((resolve) => {
        const timer = setTimeout(() => { console.warn('INDEXEDDB_TIMEOUT saving attachment', quizId); resolve(false); }, 10000);
        try {
          const tx = this.db.transaction([STORE_PDFS], 'readwrite');
          const store = tx.objectStore(STORE_PDFS);
          store.put(base64OrBlob, 'pdf_' + quizId);
          tx.oncomplete = () => { clearTimeout(timer); resolve(true); };
          tx.onerror = () => { clearTimeout(timer); console.warn('ATTACHMENT_WRITE_FAILED', tx.error); resolve(false); };
          tx.onabort = () => { clearTimeout(timer); console.warn('ATTACHMENT_WRITE_FAILED', tx.error); resolve(false); };
        } catch (e) {
          clearTimeout(timer);
          resolve(false);
        }
      });
    }
    // Fallback only for small files
    if (typeof base64OrBlob === 'string' && base64OrBlob.length < 500000) {
      return this.set('pdf_' + quizId, base64OrBlob);
    }
    return false;
  },

  async getPdfBlob(quizId) {
    if (!this.db) await this.initIndexedDB();
    if (this.db) {
      const localPdf = await new Promise((resolve) => {
        const timer = setTimeout(() => { console.warn('INDEXEDDB_TIMEOUT reading attachment', quizId); resolve(null); }, 10000);
        try {
          const tx = this.db.transaction([STORE_PDFS], 'readonly');
          const store = tx.objectStore(STORE_PDFS);
          const req = store.get('pdf_' + quizId);
          req.onsuccess = () => { clearTimeout(timer); resolve(req.result || null); };
          req.onerror = () => { clearTimeout(timer); resolve(null); };
        } catch (e) {
          clearTimeout(timer);
          resolve(null);
        }
      });
      if (localPdf) return localPdf;
    }

    // Check cached quiz in localStorage
    const cachedQuiz = await this.get('quiz:' + quizId);
    if (cachedQuiz && cachedQuiz.pdfDataUrl && cachedQuiz.pdfDataUrl.startsWith('http')) {
      return cachedQuiz.pdfDataUrl;
    }

    // Check Firebase Cloud
    if (window.FirebaseEngine && window.FirebaseEngine.isActive && typeof window.FirebaseEngine.getQuiz === 'function') {
      try {
        const quiz = await window.FirebaseEngine.getQuiz(quizId);
        if (quiz && quiz.pdfDataUrl && quiz.pdfDataUrl.startsWith('http')) {
          return quiz.pdfDataUrl;
        }
      } catch (err) {
        console.warn('Firebase getQuiz fallback error:', err);
      }
    }

    return this.get('pdf_' + quizId);
  },

  async removePdfBlob(quizId) {
    if (window.FirebaseEngine && window.FirebaseEngine.isActive && typeof window.FirebaseEngine.deletePdf === 'function') {
      await window.FirebaseEngine.deletePdf(quizId);
    }
    if (!this.db) await this.initIndexedDB();
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
      this.lastError = (e && (e.name === 'QuotaExceededError' || e.code === 22)) ? 'LOCAL_STORAGE_QUOTA' : 'LOCAL_STORAGE_WRITE_FAILED';
      console.error(this.lastError, e);
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
    // 1. Get from local first for instantaneous rendering
    let localRoster = await this.get('student_roster');
    if (!Array.isArray(localRoster) || localRoster.length === 0) {
      localRoster = this.seedStudentRosterIfEmpty(true) || [];
    }

    // 2. Sync with Cloud if active
    const canReadCloudRoster = window.FirebaseEngine
      && window.FirebaseEngine.isActive
      && typeof window.FirebaseEngine.isTeacherAuthorized === 'function'
      && await window.FirebaseEngine.isTeacherAuthorized();
    if (canReadCloudRoster && typeof window.FirebaseEngine.getStudentRoster === 'function') {
      try {
        const cloudRoster = await window.FirebaseEngine.getStudentRoster();
        if (Array.isArray(cloudRoster) && cloudRoster.length > 0) {
          await this.set('student_roster', cloudRoster);
          return cloudRoster;
        } else if (Array.isArray(localRoster) && localRoster.length > 0) {
          window.FirebaseEngine.saveStudentRoster(localRoster).catch(() => {});
        }
      } catch (err) {
        console.warn('Firebase getStudentRoster warning:', err);
      }
    }

    return localRoster;
  },

  async saveStudentRoster(roster) {
    const canWriteCloudRoster = window.FirebaseEngine
      && window.FirebaseEngine.isActive
      && typeof window.FirebaseEngine.isTeacherAuthorized === 'function'
      && await window.FirebaseEngine.isTeacherAuthorized();
    if (canWriteCloudRoster && typeof window.FirebaseEngine.saveStudentRoster === 'function') {
      try {
        await window.FirebaseEngine.saveStudentRoster(roster);
      } catch (err) {
        console.warn('Firebase saveStudentRoster error:', err);
      }
    }
    return await this.set('student_roster', roster);
  },

  async saveQuiz(quiz) {
    quiz = window.QuizContract ? window.QuizContract.normalizeQuiz(quiz) : quiz;
    const normalized = normalizeQuizForPersistence(quiz);
    if (!normalized.success) return { success: false, localSaved: false, code: normalized.code, error: 'Đề thi cần có mã và tiêu đề.' };
    const quizToSave = normalized.quiz;
    if (window.QuizContract?.validateQuiz) {
      const validation = window.QuizContract.validateQuiz(quizToSave);
      if (!validation.valid) return { success: false, localSaved: false, code: 'QUIZ_INVALID', errors: validation.errors, error: 'Đề thi không hợp lệ và chưa được lưu.' };
    }
    const publicQuiz = toPublicQuizPayload(quizToSave);
    const privateQuiz = toPrivateQuizPayload(quizToSave);
    const attachmentType = normalized.attachmentType;
    const privateRecordResult = await this.savePrivateQuizRecordToIndexedDB(privateQuiz);
    const privateStorageFallback = privateRecordResult.code === 'INDEXEDDB_UNAVAILABLE';
    const privateFallbackSaved = privateStorageFallback ? await this.set('quiz_private:' + quizToSave.id, privateQuiz) : false;
    if (!privateRecordResult.success && !privateFallbackSaved) return { success: false, localSaved: false, code: privateRecordResult.code || 'PRIVATE_ANSWER_WRITE_FAILED', error: 'Không thể lưu đáp án riêng tư của đề thi.' };
    const recordResult = await this.saveQuizRecordToIndexedDB(publicQuiz);
    const localStorageFallback = recordResult.code === 'INDEXEDDB_UNAVAILABLE';
    const fallbackSaved = localStorageFallback ? await this.set('quiz:' + quizToSave.id, publicQuiz) : false;
    if (!recordResult.success && !fallbackSaved) return { success: false, localSaved: false, code: recordResult.code, error: 'Không thể lưu đề vào bộ nhớ thiết bị.' };

    let attachmentSaved = attachmentType === 'none' || attachmentType === 'generated_html' || attachmentType === 'remote_url';
    if (!attachmentSaved) attachmentSaved = await this.savePdfBlob(quizToSave.id, quizToSave.pdfDataUrl);
    const localComplete = attachmentSaved || attachmentType === 'generated_html';
    if (!localComplete) {
      await this.deleteQuizRecordFromIndexedDB(quizToSave.id);
      await this.deletePrivateQuizRecordFromIndexedDB(quizToSave.id);
      if (fallbackSaved) await this.remove('quiz:' + quizToSave.id);
      if (privateFallbackSaved) await this.remove('quiz_private:' + quizToSave.id);
      return { success: false, localSaved: false, code: 'ATTACHMENT_WRITE_FAILED', error: 'Không thể lưu tệp đính kèm của đề thi.' };
    }

    await this.updateQuizIndex(quizToSave);
    if (this.channel) this.channel.postMessage({ type: 'quizzes_updated', quizId: quizToSave.id });
    const deletedIds = this.getDeletedQuizIds();
    if (deletedIds.delete(quizToSave.id)) await this.set('deleted_quizzes', Array.from(deletedIds));

    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    quizToSave.cloudSync = { status: offline ? 'pending' : (window.FirebaseEngine?.isActive ? 'pending' : 'unavailable'), lastAttemptAt: null, lastSuccessAt: null, errorCode: null, errorMessage: null };
    publicQuiz.cloudSync = quizToSave.cloudSync;
    await this.saveQuizRecordToIndexedDB(publicQuiz);
    if (privateRecordResult.success) await this.savePrivateQuizRecordToIndexedDB(privateQuiz);
    else if (privateFallbackSaved) await this.set('quiz_private:' + quizToSave.id, privateQuiz);
    await this.enqueueSync('quiz', quizToSave.id);
    // QUAN TRỌNG: trước đây dòng dưới KHÔNG được await — hàm saveQuiz() trả về
    // "success" ngay lập tức trong khi việc đồng bộ lên Cloud (thứ học sinh ở
    // thiết bị KHÁC cần để tìm ra đề) vẫn chạy nền và có thể âm thầm thất bại.
    // Giờ đợi luôn lượt thử đồng bộ đầu tiên để biết chắc kết quả thật.
    if (!offline) await this.processSyncQueues();
    const finalRecord = await this.getQuizRecordFromIndexedDB(quizToSave.id);
    const finalCloudSync = (finalRecord.success && finalRecord.quiz && finalRecord.quiz.cloudSync) || quizToSave.cloudSync;
    return {
      success: true,
      localSaved: true,
      local: { quizRecord: !!(recordResult.success || fallbackSaved), privateAnswerKey: !!(privateRecordResult.success || privateFallbackSaved), attachment: attachmentSaved, fallback: localStorageFallback || privateStorageFallback },
      cloudSaved: finalCloudSync.status === 'synced',
      cloud: { state: finalCloudSync.status, errorMessage: finalCloudSync.errorMessage || null },
      code: null
    };
  },

  async getQuiz(id, options = {}) {
    const includePrivate = options.includePrivate === true;
    const mergePrivate = async publicQuiz => {
      if (!publicQuiz) return null;
      let record = publicQuiz;
      if (containsPrivateAnswerData(record)) {
        const legacyPrivate = toPrivateQuizPayload(record);
        const savedPrivate = await this.savePrivateQuizRecordToIndexedDB(legacyPrivate);
        if (!savedPrivate.success) await this.set('quiz_private:' + id, legacyPrivate);
        record = toPublicQuizPayload(record);
        await this.saveQuizRecordToIndexedDB(record);
      }
      if (!includePrivate) return window.QuizContract ? window.QuizContract.normalizeQuiz(record, { public: true }) : record;
      const privateRecord = await this.getPrivateQuizRecordFromIndexedDB(id);
      let privateQuiz = privateRecord.success ? privateRecord.quiz : null;
      if (!privateQuiz) privateQuiz = await this.get('quiz_private:' + id);
      if ((!privateQuiz || !Array.isArray(privateQuiz.answerKeys)) && includePrivate && window.FirebaseEngine?.isActive && typeof window.FirebaseEngine.getPrivateAnswerKeys === 'function') {
        const cloudPrivate = await window.FirebaseEngine.getPrivateAnswerKeys(id);
        if (cloudPrivate && Array.isArray(cloudPrivate.answerKeys)) {
          privateQuiz = { id, quizId: id, answerKeys: cloudPrivate.answerKeys, updatedAt: cloudPrivate.updatedAt || record.updatedAt };
          const storedPrivate = await this.savePrivateQuizRecordToIndexedDB(privateQuiz);
          if (!storedPrivate.success) await this.set('quiz_private:' + id, privateQuiz);
        }
      }
      if (!privateQuiz || !Array.isArray(privateQuiz.answerKeys)) return window.QuizContract ? window.QuizContract.normalizeQuiz(record) : record;
      const merged = { ...record, answerKeys: privateQuiz.answerKeys };
      return window.QuizContract ? window.QuizContract.normalizeQuiz(merged) : merged;
    };
    const indexed = await this.getQuizRecordFromIndexedDB(id);
    if (indexed.success && indexed.quiz) return mergePrivate(indexed.quiz);
    const localQuiz = await this.get('quiz:' + id);
    if (localQuiz) {
      const stored = normalizeQuizForPersistence(localQuiz).quiz;
      const migrationPrivate = containsPrivateAnswerData(stored) ? toPrivateQuizPayload(stored) : null;
      if (migrationPrivate) {
        const privateMigration = await this.savePrivateQuizRecordToIndexedDB(migrationPrivate);
        if (!privateMigration.success) await this.set('quiz_private:' + id, migrationPrivate);
      }
      const migration = await this.saveQuizRecordToIndexedDB(toPublicQuizPayload(stored));
      if (migration.success) {
        await this.updateQuizIndex(localQuiz);
        await this.remove('quiz:' + id);
        await this.set('quiz_storage_migration_v4', { completedAt: new Date().toISOString() });
      }
      return mergePrivate(stored);
    }

    if (window.FirebaseEngine && window.FirebaseEngine.isActive && typeof window.FirebaseEngine.getQuiz === 'function') {
      try {
        const cloudQuiz = await window.FirebaseEngine.getQuiz(id);
        if (cloudQuiz) {
          await this.saveQuizRecordToIndexedDB(toPublicQuizPayload(normalizeQuizForPersistence(cloudQuiz).quiz));
          await this.updateQuizIndex(cloudQuiz);
          return mergePrivate(cloudQuiz);
        }
      } catch (err) {
        console.warn('Firebase getQuiz failed, falling back to local:', err);
      }
    }
    return null;
  },

  async _getPrivateAnswerKeys(quizId) {
    const indexed = await this.getPrivateQuizRecordFromIndexedDB(quizId);
    if (indexed.success && Array.isArray(indexed.quiz?.answerKeys)) return indexed.quiz.answerKeys;
    const local = await this.get('quiz_private:' + quizId);
    return Array.isArray(local?.answerKeys) ? local.answerKeys : [];
  },

  async cachePublicQuiz(quiz) {
    const normalized = normalizeQuizForPersistence(quiz);
    if (!normalized.success) return null;
    const publicQuiz = toPublicQuizPayload(normalized.quiz);
    const stored = await this.saveQuizRecordToIndexedDB(publicQuiz);
    if (!stored.success) await this.set('quiz:' + publicQuiz.id, publicQuiz);
    await this.updateQuizIndex(publicQuiz);
    return window.QuizContract ? window.QuizContract.normalizeQuiz(publicQuiz, { public: true }) : publicQuiz;
  },

  getDeletedQuizIds() {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + 'deleted_quizzes');
      return new Set(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  },

  async getAllQuizzes(options = {}) {
    const deletedIds = this.getDeletedQuizIds();
    const indexedResult = await this.listQuizRecordsFromIndexedDB();
    const indexedList = indexedResult.success ? indexedResult.quizzes.filter(q => q && !deletedIds.has(q.id)).map(q => toPublicQuizPayload(q)) : [];
    const localKeys = await this.list('quiz:');
    const localList = [];
    for (const key of localKeys) {
          const q = await this.getQuiz(String(key).replace(/^quiz:/, ''), { includePrivate: true });
      if (q && !deletedIds.has(q.id)) {
        localList.push(q);
        const stored = normalizeQuizForPersistence(q).quiz;
        if (containsPrivateAnswerData(stored)) {
          const privateMigration = await this.savePrivateQuizRecordToIndexedDB(toPrivateQuizPayload(stored));
          if (!privateMigration.success) await this.set('quiz_private:' + stored.id, toPrivateQuizPayload(stored));
        }
        const migration = await this.saveQuizRecordToIndexedDB(toPublicQuizPayload(stored));
        if (migration.success) {
          await this.updateQuizIndex(q);
          await this.remove(key);
          await this.set('quiz_storage_migration_v3', { completedAt: new Date().toISOString() });
        }
      }
    }

    const quizMap = new Map();
    [...indexedList, ...localList].forEach(q => {
      const existing = quizMap.get(q.id);
      if (!existing || new Date(q.updatedAt || q.createdAt || 0) >= new Date(existing.updatedAt || existing.createdAt || 0)) quizMap.set(q.id, q);
    });
    const primaryLocalList = Array.from(quizMap.values());

    // Public quiz metadata is intentionally readable by students. The answer
    // key remains in the private store and is never joined on this path.
    if (window.FirebaseEngine && window.FirebaseEngine.isActive) {
      try {
        const cloudQuizzes = await window.FirebaseEngine.getAllQuizzes();
        if (cloudQuizzes && cloudQuizzes.length > 0) {
          // Merge local và cloud thông minh theo ID
          const quizMap = new Map();
          // Đưa đề local vào trước (bỏ qua đề đã xóa)
          primaryLocalList.forEach(q => { if (q && q.id && !deletedIds.has(q.id)) quizMap.set(q.id, toPublicQuizPayload(q)); });

          // Cloud cập nhật hoặc bổ sung
          cloudQuizzes.forEach(cq => {
            if (!cq || !cq.id || deletedIds.has(cq.id)) return;
            const existing = quizMap.get(cq.id);
            if (!existing) {
              quizMap.set(cq.id, toPublicQuizPayload(cq));
            } else {
              const cloudTime = new Date(cq.updatedAt || cq.createdAt || 0).getTime();
              const localTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
              if (cloudTime >= localTime) {
                quizMap.set(cq.id, toPublicQuizPayload(cq));
              }
            }
          });

          const merged = Array.from(quizMap.values());
          merged.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

          // Keep full records in IndexedDB, localStorage only has a lightweight index.
          for (const q of merged) {
            await this.saveQuizRecordToIndexedDB(toPublicQuizPayload(normalizeQuizForPersistence(q).quiz));
            await this.updateQuizIndex(q);
          }
          if (options.includePrivate) return Promise.all(merged.map(q => this.getQuiz(q.id, { includePrivate: true })));
          return merged.map(q => window.QuizContract ? window.QuizContract.normalizeQuiz(q, { public: true }) : q);
        }
      } catch (e) {
        console.warn('Firebase getAllQuizzes failed, using local list:', e);
      }
    }

    primaryLocalList.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    if (options.includePrivate) return Promise.all(primaryLocalList.map(q => this.getQuiz(q.id, { includePrivate: true })));
    return primaryLocalList.map(q => window.QuizContract ? window.QuizContract.normalizeQuiz(q, { public: true }) : q);
  },

  async deleteQuiz(quizId) {
    // Record tombstone so it never resurrects
    const deletedIds = this.getDeletedQuizIds();
    deletedIds.add(quizId);
    localStorage.setItem(STORAGE_PREFIX + 'deleted_quizzes', JSON.stringify(Array.from(deletedIds)));

    const pendingQuizQueue = await this.get(QUIZ_SYNC_QUEUE_KEY) || [];
    await this.set(QUIZ_SYNC_QUEUE_KEY, pendingQuizQueue.filter(item => item.id !== quizId));
    await this.enqueueSync('quiz', quizId, 'delete');
    if (!(typeof navigator !== 'undefined' && navigator.onLine === false)) this.processSyncQueues();
    await this.remove('quiz:' + quizId);
    await this.deleteQuizRecordFromIndexedDB(quizId);
    await this.remove('quiz_private:' + quizId);
    await this.deletePrivateQuizRecordFromIndexedDB(quizId);
    const quizIndex = await this.get(QUIZ_INDEX_KEY);
    if (Array.isArray(quizIndex)) await this.set(QUIZ_INDEX_KEY, quizIndex.filter(item => item.id !== quizId));
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

  _lastSubmitRecord: null,

  async saveResult(result) {
    const now = Date.now();
    if (this._lastSubmitRecord &&
        this._lastSubmitRecord.quizId === result.quizId &&
        this._lastSubmitRecord.name === result.name &&
        this._lastSubmitRecord.className === result.className &&
        (this._lastSubmitRecord.studentId || this._lastSubmitRecord.studentUid) === (result.studentId || result.studentUid) &&
        (now - this._lastSubmitRecord.time < 5000)) {
      console.warn('[StorageEngine] Blocked rapid duplicate submission for:', result.name, result.quizId);
      return this._lastSubmitRecord.resultKey;
    }

    const identity = result.studentId || result.studentUid || result.className + '_' + result.name;
    const resultKey = `result:${result.quizId}:${identity}_${now}`;
    result.id = resultKey;
    const localSaved = await this.set(resultKey, result);
    if (!localSaved) {
      let cloudOnly = null;
      try { if (window.FirebaseEngine?.isActive) cloudOnly = await window.FirebaseEngine.saveResult(result); }
      catch (error) { console.error('[StorageEngine] result cloud fallback failed', error); }
      if (!cloudOnly) throw new Error('Không lưu được kết quả. Bài làm vẫn được giữ để thử nộp lại.');
      return typeof cloudOnly === 'string' ? cloudOnly : resultKey;
    }
    this._lastSubmitRecord = { quizId: result.quizId, name: result.name, className: result.className, studentId: result.studentId, studentUid: result.studentUid, time: now, resultKey };
    await this.set(`submitted:${result.quizId}:${identity}`, '1');
    await this.enqueueSync('result', resultKey);
    if (!(typeof navigator !== 'undefined' && navigator.onLine === false)) this.processSyncQueues();
    return resultKey;
  },

  async hasSubmitted(quizId, className, name, studentId = null) {
    const sub = await this.get(`submitted:${quizId}:${studentId || className + '_' + name}`);
    if (sub) return true;
    const results = await this.getResultsByQuiz(quizId);
    return results.some(r => studentId ? (r.studentId === studentId || r.studentUid === studentId) : (r.className || '').trim().toLowerCase() === (className || '').trim().toLowerCase() && (r.name || '').trim().toLowerCase() === (name || '').trim().toLowerCase());
  },

  async deleteResult(resultId, quizId = null, className = null, name = null) {
    // 1. Remove from LocalStorage
    const cleanKey = resultId.replace(STORAGE_PREFIX, '');
    const originalResult = await this.get(cleanKey) || await this.get(resultId);
    if (originalResult?.studentId || originalResult?.studentUid) await this.remove(`submitted:${originalResult.quizId}:${originalResult.studentId || originalResult.studentUid}`);
    await this.remove(cleanKey);
    await this.remove(resultId);

    // 2. Clear student submission lock so they can retake if needed
    if (quizId && className && name) {
      await this.remove(`submitted:${quizId}:${className}_${name}`);
    } else {
      // Parse info from resultId format: result:quizId:className_name_timestamp
      const parts = cleanKey.split(':');
      if (parts.length >= 3) {
        const qId = parts[1];
        const studentRaw = parts[2];
        const lastUnder = studentRaw.lastIndexOf('_');
        if (lastUnder > 0) {
          const classAndName = studentRaw.substring(0, lastUnder);
          await this.remove(`submitted:${qId}:${classAndName}`);
        }
      }
    }

    // 3. Mark in deleted tombstones to prevent resurrecting from Cloud sync
    const deletedRes = this.getDeletedResultIds();
    deletedRes.add(resultId);
    deletedRes.add(cleanKey);
    localStorage.setItem(STORAGE_PREFIX + 'deleted_results', JSON.stringify(Array.from(deletedRes)));

    // 4. Delete from Firebase Firestore if connected
    const canWriteCloudResult = window.FirebaseEngine
      && window.FirebaseEngine.isActive
      && typeof window.FirebaseEngine.isTeacherAuthorized === 'function'
      && await window.FirebaseEngine.isTeacherAuthorized();
    if (canWriteCloudResult) {
      await window.FirebaseEngine.deleteResult(resultId);
    }

    if (this.channel) {
      this.channel.postMessage({ type: 'results_updated', resultId });
    }
    return true;
  },

  async resetSubmissionForRetake(quizId, className, name) {
    // Xóa khóa nộp bài để học sinh có thể làm lại bài thi từ đầu
    await this.remove(`submitted:${quizId}:${className}_${name}`);
    
    // Tìm và xóa bài nộp tương ứng của học sinh này
    const all = await this.getAllResults();
    const matches = all.filter(r => 
      r.quizId === quizId && 
      (r.name || '').toLowerCase() === (name || '').toLowerCase() &&
      (!className || (r.className || '').toLowerCase() === className.toLowerCase())
    );

    for (const m of matches) {
      await this.deleteResult(m.id || m.key, quizId, className, name);
    }
    return true;
  },

  async penalizeCheatedSubmission(resultId, reason = 'Vi phạm chống gian lận (Rời màn hình nhiều lần)') {
    // Đặt điểm về 0 và gắn cờ gian lận minh bạch
    const cleanKey = resultId.replace(STORAGE_PREFIX, '');
    let res = await this.get(cleanKey);
    if (!res) res = await this.get(resultId);
    if (!res) return false;

    res.totalScore = 0;
    res.score = 0;
    res.isCheated = true;
    res.cheatReason = reason;
    res.penalizedAt = new Date().toISOString();

    await this.set(cleanKey, res);
    const canWriteCloudResult = window.FirebaseEngine
      && window.FirebaseEngine.isActive
      && typeof window.FirebaseEngine.isTeacherAuthorized === 'function'
      && await window.FirebaseEngine.isTeacherAuthorized();
    if (canWriteCloudResult) {
      await window.FirebaseEngine.saveResult(res);
    }
    if (this.channel) {
      this.channel.postMessage({ type: 'results_updated', resultId });
    }
    return true;
  },

  async clearResultsByQuiz(quizId) {
    const keys = await this.list(`result:${quizId}:`);
    for (const k of keys) {
      await this.deleteResult(k, quizId);
    }
    const submittedKeys = await this.list(`submitted:${quizId}:`);
    for (const sk of submittedKeys) {
      await this.remove(sk);
    }
    if (window.FirebaseEngine && window.FirebaseEngine.isActive) {
      await window.FirebaseEngine.deleteResultsByQuiz(quizId);
    }
    return true;
  },

  /**
   * Lấy thời điểm nộp bài mới nhất của một quiz (ms).
   * Trả về null nếu đề chưa có bất kỳ bài nộp nào (đề chưa ai làm).
   */
  async getLastSubmissionTime(quizId) {
    const keys = await this.list(`result:${quizId}:`);
    if (!keys || keys.length === 0) return null;

    let latest = 0;
    for (const k of keys) {
      const rec = await this.get(k);
      if (!rec) continue;
      let timeMs = 0;
      if (rec.submittedAt) {
        timeMs = new Date(rec.submittedAt).getTime();
      } else if (rec.time) {
        timeMs = typeof rec.time === 'number' ? rec.time : new Date(rec.time).getTime();
      } else if (rec.createdAt) {
        timeMs = typeof rec.createdAt === 'number' ? rec.createdAt : new Date(rec.createdAt).getTime();
      } else {
        const parts = k.split('_');
        const lastPart = parts[parts.length - 1];
        const parsed = parseInt(lastPart, 10);
        if (!isNaN(parsed) && parsed > 1000000000) {
          timeMs = parsed;
        }
      }
      if (timeMs > latest) {
        latest = timeMs;
      }
    }
    return latest > 0 ? latest : null;
  },

  /**
   * Quét và dọn dẹp các đề thi đã kết thúc trên 7 ngày kể từ lần nộp bài cuối cùng.
   * - Nén kết quả: xóa các field nặng trong review[], giữ lại các field nhẹ cần cho StudentAnalytics.
   * - Xóa đề gốc: quiz:{quizId} và pdf_{quizId}.
   * - Không xóa quiz chưa từng có ai nộp bài.
   * - Đồng bộ Firebase nếu active.
   */
  async runRetentionSweep() {
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const allQuizzes = await this.getAllQuizzes();

    let quizzesRemoved = 0;
    let resultsCompacted = 0;
    let bytesSaved = 0;

    for (const quiz of allQuizzes) {
      if (!quiz || !quiz.id) continue;

      const lastSubmissionTime = await this.getLastSubmissionTime(quiz.id);
      // Đề chưa có ai làm thì KHÔNG bao giờ bị đụng vào
      if (lastSubmissionTime === null) continue;

      // Kiểm tra mốc 7 ngày kể từ lần nộp bài cuối cùng
      if (now - lastSubmissionTime > SEVEN_DAYS_MS) {
        // 1. NÉN TỪNG BẢN GHI RESULT
        const resultKeys = await this.list(`result:${quiz.id}:`);
        for (const rKey of resultKeys) {
          const rec = await this.get(rKey);
          if (!rec) continue;
          if (rec.compacted) continue; // Đã nén trước đó, bỏ qua để tránh xử lý lặp lại

          const oldJson = JSON.stringify(rec);
          const oldLen = oldJson.length;

          // Cắt gọn review[] chỉ giữ lại field nhẹ
          const rawReview = rec.review || rec.reviewData || [];
          const cleanReview = Array.isArray(rawReview) ? rawReview.map(item => ({
            num: item.num,
            type: item.type,
            level: item.level,
            category: item.category,
            subject: item.subject,
            maxScore: item.maxScore,
            earnedScore: item.earnedScore,
            given: item.given,
            correctAnswer: item.correctAnswer,
            isCorrect: item.isCorrect
          })) : [];

          rec.review = cleanReview;
          if (rec.reviewData) {
            rec.reviewData = cleanReview;
          }
          rec.compacted = true;
          rec.compactedAt = new Date().toISOString();

          const newJson = JSON.stringify(rec);
          bytesSaved += Math.max(0, oldLen - newJson.length);

          await this.set(rKey, rec);
          if (window.FirebaseEngine && window.FirebaseEngine.isActive) {
            try {
              const docId = rec.id || rKey;
              await window.FirebaseEngine.db.collection('results').doc(docId).set(rec);
            } catch (e) {
              console.warn('[RetentionSweep] Firebase updateResult error:', e);
            }
          }
          resultsCompacted++;
        }

        // 2. XÓA ĐỀ GỐC VÀ FILE PDF
        const quizRaw = await this.get('quiz:' + quiz.id);
        if (quizRaw) {
          bytesSaved += JSON.stringify(quizRaw).length;
        }
        await this.remove('quiz:' + quiz.id);
        await this.removePdfBlob(quiz.id);

        if (window.FirebaseEngine && window.FirebaseEngine.isActive) {
          try {
            const deleted = await window.FirebaseEngine.deleteQuiz(quiz.id);
            if (deleted === false) throw new Error('FIREBASE_DELETE_FAILED');
          } catch (e) {
            console.warn('[RetentionSweep] Firebase deleteQuiz error:', { quizId: quiz.id, message: e?.message || String(e) });
          }
        }
        quizzesRemoved++;
      }
    }

    console.log(`[RetentionSweep] Hoàn tất: Đã xóa ${quizzesRemoved} đề, nén ${resultsCompacted} kết quả, tiết kiệm ~${Math.round(bytesSaved / 1024)}KB.`);
    return { quizzesRemoved, resultsCompacted, bytesSaved };
  },

  async clearAllTestResults() {
    // Dọn dẹp sạch toàn bộ bài nộp thử nghiệm (reset thống kê về 0)
    const keys = await this.list('result:');
    for (const k of keys) {
      await this.remove(k);
    }
    const submittedKeys = await this.list('submitted:');
    for (const sk of submittedKeys) {
      await this.remove(sk);
    }
    localStorage.removeItem(STORAGE_PREFIX + 'deleted_results');

    if (window.FirebaseEngine && window.FirebaseEngine.isActive && typeof window.FirebaseEngine.deleteAllResults === 'function') {
      try {
        await window.FirebaseEngine.deleteAllResults();
      } catch (err) {
        console.warn('Firebase deleteAllResults error:', err);
      }
    }

    if (this.channel) {
      this.channel.postMessage({ type: 'results_updated', all: true });
    }
    return true;
  },

  getDeletedResultIds() {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + 'deleted_results');
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch (e) {
      return new Set();
    }
  },

  async _readMergedResults(prefix, loadCloud) {
    const deleted = this.getDeletedResultIds();
    const results = new Map();
    for (const key of await this.list(prefix)) {
      const result = await this.get(key);
      if (result && !deleted.has(key) && !deleted.has(result.id)) results.set(result.id || key, { ...result, key });
    }
    const canReadCloudResults = window.FirebaseEngine
      && window.FirebaseEngine.isActive
      && typeof window.FirebaseEngine.isTeacherAuthorized === 'function'
      && await window.FirebaseEngine.isTeacherAuthorized();
    if (canReadCloudResults) {
      try {
        for (const result of await loadCloud() || []) {
          if (!result || deleted.has(result.id) || deleted.has(result.key)) continue;
          const key = result.id || result.key || `result:${result.quizId}:${result.className}_${result.name}_${new Date(result.submittedAt || 0).getTime()}`;
          if (deleted.has(key)) continue;
          results.set(key, { ...result, key });
          await this.set(key, result);
        }
      } catch (error) { console.warn('Cloud results unavailable; using local results:', error); }
    }
    return Array.from(results.values());
  },

  async getResultsByQuiz(quizId) {
    return this._readMergedResults(`result:${quizId}:`, () => window.FirebaseEngine.getResultsByQuiz(quizId));
  },

  async getAllResults() {
    return this._readMergedResults('result:', () => window.FirebaseEngine.getAllResults());
  },

  seedStudentRosterIfEmpty(force = false) {
    const raw = localStorage.getItem(STORAGE_PREFIX + 'student_roster');
    let hasStudents = false;
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          hasStudents = true;
        }
      } catch (e) {}
    }

    if (force || !hasStudents) {
      const initialRoster = [
        { id: 'SURI10', name: 'SURI', className: '10', avatar: '🦊' },
        { id: 'NGHIA7', name: 'NGHĨA', className: '7', avatar: '🚀' },
        { id: 'GIANG8', name: 'GIANG', className: '8', avatar: '🦁' },
        { id: 'TIEN12', name: 'TIÊN', className: '12', avatar: '🦉' },
        { id: 'MINH10', name: 'MINH', className: '10', avatar: '⚡' }
      ];
      localStorage.setItem(STORAGE_PREFIX + 'student_roster', JSON.stringify(initialRoster));
      this.saveStudentRoster(initialRoster);
      return initialRoster;
    }
    return null;
  },

  seedSampleDataIfEmpty(force = false) {
    if (!force) {
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
  },

  async syncLocalToCloud() {
    if (!window.FirebaseEngine || !window.FirebaseEngine.isActive) {
      throw new Error('Firebase chưa kích hoạt hoặc chưa cấu hình.');
    }
    try {
      console.log('☁️ [Sync] Bắt đầu đồng bộ dữ liệu local lên Cloud...');
      
      // 1. Đồng bộ Quizzes (bao gồm upload PDF từ IndexedDB lên Storage)
      const quizKeys = await this.list('quiz:');
      for (const key of quizKeys) {
        const q = await this.getQuiz(String(key).replace(/^quiz:/, ''), { includePrivate: true });
        if (q) {
          if (typeof q.pdfDataUrl !== 'string' || !q.pdfDataUrl.startsWith('http')) {
            const blob = await this.getPdfBlob(q.id);
            if (blob) {
              q.pdfDataUrl = blob;
            }
          }
          const saved = await window.FirebaseEngine.saveQuiz(toPublicQuizPayload(q), { privateAnswerKeys: q.answerKeys });
          if (!saved || !saved.success) throw new Error(saved?.error || 'Không đồng bộ được đề ' + q.id);
        }
      }
      
      // 2. Đồng bộ Student Roster
      const roster = await this.get('student_roster');
      if (roster && roster.length > 0) {
        await window.FirebaseEngine.saveStudentRoster(roster);
      }

      // 3. Đồng bộ Results
      const resultKeys = await this.list('result:');
      for (const key of resultKeys) {
        const r = await this.get(key);
        if (r) {
          if (!await window.FirebaseEngine.saveResult(r)) throw new Error('Không đồng bộ được kết quả ' + (r.id || key));
        }
      }

      console.log('☁️ [Sync] Đồng bộ dữ liệu local lên Cloud HOÀN TẤT!');
      return true;
    } catch (e) {
      console.error('☁️ [Sync] Lỗi khi đồng bộ lên Cloud:', e);
      throw e;
    }
  },

  // ================= 🎟️ VOUCHERS & REDEMPTIONS PERSISTENCE =================
  saveVoucher(voucher) {
    if (!voucher || !voucher.code) return;
    const list = this.getAllVouchers();
    const existingIndex = list.findIndex(v => v.code === voucher.code);
    if (existingIndex >= 0) {
      list[existingIndex] = { ...list[existingIndex], ...voucher };
    } else {
      list.unshift(voucher);
    }
    localStorage.setItem(STORAGE_PREFIX + 'vouchers', JSON.stringify(list));
    if (this.channel) {
      this.channel.postMessage({ type: 'voucher_updated', voucher });
    }
    return voucher;
  },

  getAllVouchers() {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + 'vouchers');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  updateVoucherStatus(code, status, note = '') {
    const list = this.getAllVouchers();
    const target = list.find(v => v.code === code);
    if (target) {
      target.status = status;
      target.updatedAt = new Date().toISOString();
      if (note) target.teacherNote = note;
      localStorage.setItem(STORAGE_PREFIX + 'vouchers', JSON.stringify(list));
      if (this.channel) {
        this.channel.postMessage({ type: 'voucher_updated', voucher: target });
      }
      return target;
    }
    return null;
  },

  // ================= ⚖️ PENALTIES & DISCIPLINARY LOG PERSISTENCE =================
  savePenalty(record) {
    if (!record) return null;
    const list = this.getAllPenalties();
    if (!record.id) {
      record.id = 'pen_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    }
    if (!record.createdAt) {
      record.createdAt = new Date().toISOString();
    }
    list.unshift(record);
    localStorage.setItem(STORAGE_PREFIX + 'penalties', JSON.stringify(list));
    if (this.channel) {
      this.channel.postMessage({ type: 'penalty_updated', record });
    }
    return record;
  },

  getAllPenalties() {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + 'penalties');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  deletePenalty(penaltyId) {
    const list = this.getAllPenalties();
    const target = list.find(p => p.id === penaltyId);
    if (!target) return null;
    const filtered = list.filter(p => p.id !== penaltyId);
    localStorage.setItem(STORAGE_PREFIX + 'penalties', JSON.stringify(filtered));
    if (this.channel) {
      this.channel.postMessage({ type: 'penalty_deleted', penaltyId });
    }
    return target;
  },

  getPenaltiesByStudent(studentName) {
    if (!studentName) return [];
    const clean = studentName.trim().toLowerCase();
    return this.getAllPenalties().filter(p => p.studentName && p.studentName.trim().toLowerCase() === clean);
  }
};

window.StorageEngine = StorageEngine;
window.KEDUStorageInternals = { classifyQuizAttachment, normalizeQuizForPersistence, toPublicQuizPayload, toPrivateQuizPayload, containsPrivateAnswerData, DB_VERSION, STORE_QUIZZES, STORE_PRIVATE_QUIZZES };
