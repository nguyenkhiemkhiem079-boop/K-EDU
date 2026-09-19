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
    await this.purgeSampleQuizzes();
    this.seedStudentRosterIfEmpty();
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
      }, 1000);

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
        const timer = setTimeout(() => resolve(false), 800);
        try {
          const tx = this.db.transaction([STORE_PDFS], 'readwrite');
          const store = tx.objectStore(STORE_PDFS);
          store.put(base64OrBlob, 'pdf_' + quizId);
          tx.oncomplete = () => { clearTimeout(timer); resolve(true); };
          tx.onerror = () => { clearTimeout(timer); resolve(false); };
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
        const timer = setTimeout(() => resolve(null), 800);
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
    if (window.FirebaseEngine && window.FirebaseEngine.isActive) {
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
    if (window.FirebaseEngine && window.FirebaseEngine.isActive) {
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
    // 1. Get from local first for instantaneous rendering
    let localRoster = await this.get('student_roster');
    if (!Array.isArray(localRoster) || localRoster.length === 0) {
      localRoster = this.seedStudentRosterIfEmpty(true) || [];
    }

    // 2. Sync with Cloud if active
    if (window.FirebaseEngine && window.FirebaseEngine.isActive && typeof window.FirebaseEngine.getStudentRoster === 'function') {
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
    if (window.FirebaseEngine && window.FirebaseEngine.isActive && typeof window.FirebaseEngine.saveStudentRoster === 'function') {
      try {
        await window.FirebaseEngine.saveStudentRoster(roster);
      } catch (err) {
        console.warn('Firebase saveStudentRoster error:', err);
      }
    }
    return await this.set('student_roster', roster);
  },

  async saveQuiz(quiz) {
    const previousQuiz = await this.get('quiz:' + quiz.id);
    const quizToSave = { ...quiz };
    quizToSave.updatedAt = new Date().toISOString();

    // Preserve examHtml for auto-generated or HTML exams
    if (!quizToSave.examHtml && quizToSave.pdfDataUrl && typeof quizToSave.pdfDataUrl === 'string' && quizToSave.pdfDataUrl.startsWith('data:text/html')) {
      try {
        const separator = quizToSave.pdfDataUrl.indexOf(',');
      const parts = [quizToSave.pdfDataUrl.slice(0, separator), quizToSave.pdfDataUrl.slice(separator + 1)];
        if (parts.length > 1) {
          quizToSave.examHtml = parts[0].includes(';base64') ? new TextDecoder().decode(Uint8Array.from(atob(parts[1]), c => c.charCodeAt(0))) : decodeURIComponent(parts[1]);
        }
      } catch (e) {}
    }

    // 1. Save to LocalStorage IMMEDIATELY (guaranteed 0ms local persistence, UI updates instantly)
    const localCacheQuiz = { ...quizToSave };
    if (typeof localCacheQuiz.pdfDataUrl === 'string' && (localCacheQuiz.pdfDataUrl.startsWith('data:') || localCacheQuiz.pdfDataUrl.startsWith('blob:'))) {
      if (typeof localCacheQuiz.pdfDataUrl === 'string' && localCacheQuiz.pdfDataUrl.length > 300000) {
        delete localCacheQuiz.pdfDataUrl;
      }
    }
    if (localCacheQuiz.pdfDataUrl instanceof Blob || (typeof localCacheQuiz.pdfDataUrl === 'string' && localCacheQuiz.pdfDataUrl.startsWith('blob:'))) delete localCacheQuiz.pdfDataUrl;
    const localSaved = await this.set('quiz:' + quiz.id, localCacheQuiz);
    if (this.channel) {
      this.channel.postMessage({ type: 'quizzes_updated', quizId: quiz.id });
    }

    // 2. Save PDF / HTML to IndexedDB safely in background
    const hasAttachment = quizToSave.pdfDataUrl && ((typeof quizToSave.pdfDataUrl === 'string' && (quizToSave.pdfDataUrl.startsWith('data:') || quizToSave.pdfDataUrl.startsWith('blob:'))) || quizToSave.pdfDataUrl instanceof Blob);
    let attachmentSaved = false;
    if (hasAttachment) {
      try {
        attachmentSaved = await this.savePdfBlob(quiz.id, quizToSave.pdfDataUrl);
      } catch (e) {
        console.warn('savePdfBlob non-fatal error:', e);
      }
    }

    // 3. Push to Firebase Cloud in background/parallel (safe from crashes)
    let cloudResult = null;
    if (window.FirebaseEngine && window.FirebaseEngine.isActive) {
      try {
        cloudResult = await window.FirebaseEngine.saveQuiz(quizToSave);
        if (cloudResult && cloudResult.downloadUrl) {
          quizToSave.pdfDataUrl = cloudResult.downloadUrl;
          quiz.pdfDataUrl = cloudResult.downloadUrl;
          await this.set('quiz:' + quiz.id, quizToSave);
        }
      } catch (e) {
        console.warn('FirebaseEngine saveQuiz warning:', e);
      }
    }

    const localComplete = !!(localSaved && (!hasAttachment || attachmentSaved || localCacheQuiz.examHtml || (typeof localCacheQuiz.pdfDataUrl === 'string' && localCacheQuiz.pdfDataUrl.startsWith('data:'))));
    const success = localComplete || !!(cloudResult && cloudResult.success);
    if (success) {
      const deletedIds = this.getDeletedQuizIds();
      if (deletedIds.delete(quiz.id)) await this.set('deleted_quizzes', Array.from(deletedIds));
    } else if (localSaved) {
      if (previousQuiz) await this.set('quiz:' + quiz.id, previousQuiz);
      else await this.remove('quiz:' + quiz.id);
    }
    return {
      success,
      localSaved: localComplete,
      cloudSaved: !!(cloudResult && cloudResult.success),
      error: !localComplete && !(cloudResult && cloudResult.success) ? 'Không lưu được đề hoặc file đính kèm. Hãy kiểm tra dung lượng lưu trữ và kết nối.' : (cloudResult && cloudResult.error ? cloudResult.error : null)
    };
  },

  async getQuiz(id) {
    let localQuiz = await this.get('quiz:' + id);
    if (localQuiz) {
      if (!localQuiz.pdfDataUrl && localQuiz.examHtml) {
        localQuiz.pdfDataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(localQuiz.examHtml);
      }
      return localQuiz;
    }

    if (window.FirebaseEngine && window.FirebaseEngine.isActive) {
      try {
        const cloudQuiz = await window.FirebaseEngine.getQuiz(id);
        if (cloudQuiz) {
          if (!cloudQuiz.pdfDataUrl && cloudQuiz.examHtml) {
            cloudQuiz.pdfDataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(cloudQuiz.examHtml);
          }
          const quizToCache = { ...cloudQuiz };
          if (quizToCache.pdfDataUrl && quizToCache.pdfDataUrl.startsWith('data:') && quizToCache.pdfDataUrl.length > 300000) {
            delete quizToCache.pdfDataUrl;
          }
          await this.set('quiz:' + id, quizToCache);
          return cloudQuiz;
        }
      } catch (err) {
        console.warn('Firebase getQuiz failed, falling back to local:', err);
      }
    }
    return null;
  },

  getDeletedQuizIds() {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + 'deleted_quizzes');
      return new Set(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  },

  async getAllQuizzes() {
    const deletedIds = this.getDeletedQuizIds();
    const localKeys = await this.list('quiz:');
    const localList = [];
    for (const key of localKeys) {
      const q = await this.get(key);
      if (q && !deletedIds.has(q.id)) {
        if (!q.pdfDataUrl && q.examHtml) {
          q.pdfDataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(q.examHtml);
        }
        localList.push(q);
      }
    }

    if (window.FirebaseEngine && window.FirebaseEngine.isActive) {
      try {
        const cloudQuizzes = await window.FirebaseEngine.getAllQuizzes();
        if (cloudQuizzes && cloudQuizzes.length > 0) {
          // Merge local và cloud thông minh theo ID
          const quizMap = new Map();
          // Đưa đề local vào trước (bỏ qua đề đã xóa)
          localList.forEach(q => { if (q && q.id && !deletedIds.has(q.id)) quizMap.set(q.id, q); });

          // Cloud cập nhật hoặc bổ sung
          cloudQuizzes.forEach(cq => {
            if (!cq || !cq.id || deletedIds.has(cq.id)) return;
            if (!cq.pdfDataUrl && cq.examHtml) {
              cq.pdfDataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(cq.examHtml);
            }
            const existing = quizMap.get(cq.id);
            if (!existing) {
              quizMap.set(cq.id, cq);
            } else {
              const cloudTime = new Date(cq.updatedAt || cq.createdAt || 0).getTime();
              const localTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
              if (cloudTime >= localTime) {
                quizMap.set(cq.id, cq);
              }
            }
          });

          const merged = Array.from(quizMap.values());
          merged.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

          // Cập nhật bộ nhớ đệm LocalStorage
          for (const q of merged) {
            const cacheItem = { ...q };
            if (cacheItem.pdfDataUrl && cacheItem.pdfDataUrl.startsWith('data:') && cacheItem.pdfDataUrl.length > 300000) {
              delete cacheItem.pdfDataUrl;
            }
            await this.set('quiz:' + q.id, cacheItem);
          }
          return merged;
        }
      } catch (e) {
        console.warn('Firebase getAllQuizzes failed, using local list:', e);
      }
    }

    localList.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    return localList;
  },

  async deleteQuiz(quizId) {
    // Record tombstone so it never resurrects
    const deletedIds = this.getDeletedQuizIds();
    deletedIds.add(quizId);
    localStorage.setItem(STORAGE_PREFIX + 'deleted_quizzes', JSON.stringify(Array.from(deletedIds)));

    if (window.FirebaseEngine && window.FirebaseEngine.isActive) {
      try {
        await window.FirebaseEngine.deleteQuiz(quizId);
      } catch (e) {
        console.warn('Firebase deleteQuiz error:', e);
      }
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
    let cloudSaved = false;
    if (window.FirebaseEngine && window.FirebaseEngine.isActive) {
      try {
        const response = await window.FirebaseEngine.saveResult(result);
        cloudSaved = typeof response === 'string' ? !!response : !!(response && response.success);
      } catch (error) { console.warn('Cloud result save failed:', error); }
    }
    if (!localSaved && !cloudSaved) throw new Error('Không lưu được kết quả. Bài làm vẫn được giữ để thử nộp lại.');
    this._lastSubmitRecord = { quizId: result.quizId, name: result.name, className: result.className, studentId: result.studentId, studentUid: result.studentUid, time: now, resultKey };
    await this.set(`submitted:${result.quizId}:${identity}`, '1');
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
    if (window.FirebaseEngine && window.FirebaseEngine.isActive) {
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
    if (window.FirebaseEngine && window.FirebaseEngine.isActive) {
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
            await window.FirebaseEngine.db.collection('quizzes').doc(quiz.id).delete();
            await window.FirebaseEngine.deletePdf(quiz.id);
          } catch (e) {
            console.warn('[RetentionSweep] Firebase deleteQuiz error:', e);
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
    if (window.FirebaseEngine && window.FirebaseEngine.isActive) {
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
        const q = await this.get(key);
        if (q) {
          if (typeof q.pdfDataUrl !== 'string' || !q.pdfDataUrl.startsWith('http')) {
            const blob = await this.getPdfBlob(q.id);
            if (blob) {
              q.pdfDataUrl = blob;
            }
          }
          const saved = await window.FirebaseEngine.saveQuiz(q);
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
