/**
 * KhiemEdu Firebase Cloud Sync Engine
 * Supports cloud sync of quizzes, results, and rosters with fallback to LocalStorage/IndexedDB.
 */

function toPublicQuizPayload(quiz = {}) {
  const publicQuiz = JSON.parse(JSON.stringify(quiz));
  publicQuiz.answerKeys = Array.isArray(publicQuiz.answerKeys) ? publicQuiz.answerKeys.map(key => {
    const safe = { ...key };
    delete safe.correct;
    delete safe.correctAnswer;
    delete safe.explanation;
    delete safe.pitfall;
    delete safe.keyFormula;
    return safe;
  }) : [];
  if (Array.isArray(publicQuiz.questions)) publicQuiz.questions = publicQuiz.questions.map(question => {
    const safe = { ...question };
    delete safe.correct;
    delete safe.correctAnswer;
    delete safe.explanation;
    delete safe.pitfall;
    delete safe.keyFormula;
    return safe;
  });
  delete publicQuiz.privateAnswerKeys;
  delete publicQuiz.answerKey;
  return publicQuiz;
}

function toPrivateAnswerPayload(quiz = {}) {
  return { quizId: quiz.id, updatedAt: quiz.updatedAt || new Date().toISOString(), answerKeys: Array.isArray(quiz.answerKeys) ? JSON.parse(JSON.stringify(quiz.answerKeys)) : [] };
}

const FirebaseEngine = {
  isActive: false,
  app: null,
  db: null,
  storage: null,

  defaultConfig: {
    apiKey: "AIzaSyDOXRbpqTVn64gtGh7A5ybBLg7kHi2wtg8",
    authDomain: "k-edu-d2051.firebaseapp.com",
    projectId: "k-edu-d2051",
    storageBucket: "k-edu-d2051.firebasestorage.app",
    messagingSenderId: "1090573699843",
    appId: "1:1090573699843:web:d3a24004641a5ddfdd7736",
    measurementId: "G-WCYHEF2QTE"
  },

  async init() {
    try {
      const configStr = localStorage.getItem('khiemedu_firebase_config');
      const isEnabledStr = localStorage.getItem('khiemedu_firebase_enabled');

      let config = this.defaultConfig;
      let isEnabled = true;

      if (configStr) {
        try {
          const parsed = JSON.parse(configStr);
          if (parsed && typeof parsed.apiKey === 'string' && parsed.apiKey.startsWith('AIzaSy')) {
            config = parsed;
          } else {
            console.warn('Stored Firebase config had corrupted/autofilled apiKey. Resetting to defaultConfig.');
            localStorage.removeItem('khiemedu_firebase_config');
            config = this.defaultConfig;
          }
        } catch (e) {
          console.error("Error parsing localstorage config, using default:", e);
          config = this.defaultConfig;
        }
      }

      if (isEnabledStr !== null) {
        isEnabled = isEnabledStr === '1';
      } else {
        localStorage.setItem('khiemedu_firebase_enabled', '1');
      }

      if (!isEnabled) {
        this.isActive = false;
        console.log('☁️ Firebase is disabled. Running in Local Mode.');
        return false;
      }

      if (!config || !config.apiKey || !config.projectId || !config.storageBucket) {
        throw new Error('Cấu hình Firebase thiếu tham số bắt buộc.');
      }

      // Initialize Firebase (Compat mode)
      if (window.firebase) {
        if (!firebase.apps.length) {
          this.app = firebase.initializeApp(config);
        } else {
          this.app = firebase.app();
        }
        this.db = firebase.firestore();
        this.storage = firebase.storage();
        this.isActive = true;

        // Enable offline persistence for Firestore if possible
        this.db.enablePersistence().catch((err) => {
          if (err.code === 'failed-precondition') {
            console.warn('Firestore offline persistence failed: multiple tabs open');
          } else if (err.code === 'unimplemented') {
            console.warn('Firestore offline persistence is not supported in this browser');
          }
        });

        console.log('☁️ Firebase initialized and Cloud Sync is ACTIVE!');
        return true;
      } else {
        throw new Error('Chưa nạp được SDK Firebase từ CDN.');
      }
    } catch (e) {
      console.error('Firebase initialization error:', e);
      this.isActive = false;
      return false;
    }
  },

  // Save config to LocalStorage and reinitialize
  async saveConfig(config) {
    localStorage.setItem('khiemedu_firebase_config', JSON.stringify(config));
    localStorage.setItem('khiemedu_firebase_enabled', '1');
    if (window.firebase && firebase.apps.length > 0) {
      await Promise.all(firebase.apps.map(a => a.delete().catch(() => {})));
    }
    return await this.init();
  },

  // Disable Firebase
  disable() {
    localStorage.setItem('khiemedu_firebase_enabled', '0');
    this.isActive = false;
    console.log('☁️ Firebase Cloud Sync deactivated.');
  },

  // Clear Firebase config
  clearConfig() {
    localStorage.removeItem('khiemedu_firebase_config');
    localStorage.removeItem('khiemedu_firebase_enabled');
    this.isActive = false;
    console.log('☁️ Firebase config cleared.');
  },

  // Helper to convert base64, dataUrl, or raw string to Blob
  _dataToBlob(data, defaultType = 'application/pdf') {
    if (data instanceof Blob) return data;
    if (typeof data !== 'string') return null;

    if (data.startsWith('data:')) {
      const separator = data.indexOf(',');
      const parts = [data.slice(0, separator), data.slice(separator + 1)];
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : defaultType;
      const isBase64 = parts[0].includes(';base64');

      if (isBase64) {
        try {
          const byteString = atob(parts[1]);
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
          }
          return new Blob([ia], { type: mime });
        } catch (e) {
          console.error('Error decoding base64 data url:', e);
          return null;
        }
      } else {
        const text = parts[0].includes(';base64') ? new TextDecoder().decode(Uint8Array.from(atob(parts[1]), c => c.charCodeAt(0))) : decodeURIComponent(parts[1]);
        return new Blob([text], { type: mime });
      }
    }

    // Attempt raw base64 decode
    try {
      const byteString = atob(data);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      return new Blob([ia], { type: defaultType });
    } catch {
      return new Blob([data], { type: defaultType });
    }
  },

  // --- HEALTH CHECK / CONNECTION TEST ---
  async testConnection() {
    if (!this.isActive || !this.db) {
      return {
        ok: false,
        firestore: false,
        storage: false,
        message: 'Firebase chưa được kích hoạt hoặc cấu hình thiếu.'
      };
    }

    let firestoreOk = false;
    let storageOk = false;
    let firestoreMsg = '';
    let storageMsg = '';

    // 1. Test Firestore
    try {
      await this.db.collection('quizzes').limit(1).get();
      firestoreOk = true;
      firestoreMsg = 'Cloud Firestore hoạt động tốt.';
    } catch (err) {
      console.error('Firestore connection test error:', err);
      const msg = err.message || '';
      if (err.code === 'not-found' || msg.includes('does not exist') || msg.includes('404')) {
        firestoreMsg = 'Cơ sở dữ liệu Firestore (default) chưa được tạo. Vào Firebase Console -> Build -> Firestore Database -> Create database và cấu hình Security Rules theo tài khoản, vai trò được phép truy cập.';
      } else if (err.code === 'permission-denied') {
        firestoreMsg = 'Quyền truy cập Firestore bị chặn (Permission Denied). Kiểm tra tài khoản Firebase Authentication và Security Rules cho đúng vai trò, bộ sưu tập và thao tác cần dùng.';
      } else {
        firestoreMsg = `Lỗi Firestore (${err.code || 'unknown'}): ${msg}`;
      }
    }

    // 2. Test Cloud Storage
    try {
      if (this.storage) {
        const testRef = this.storage.ref().child('_ping_check.txt');
        const testBlob = new Blob(['ping'], { type: 'text/plain' });
        await testRef.put(testBlob);
        await testRef.delete().catch(() => {});
        storageOk = true;
        storageMsg = 'Cloud Storage hoạt động tốt.';
      }
    } catch (err) {
      console.error('Storage connection test error:', err);
      const msg = err.message || '';
      if (err.code === 'storage/bucket-not-found' || msg.includes('404') || msg.includes('does not exist')) {
        storageMsg = 'Storage bucket chưa được khởi tạo. Vào Firebase Console -> Build -> Storage -> Get started và cấu hình Security Rules theo tài khoản, vai trò và đường dẫn tệp.';
      } else if (err.code === 'storage/unauthorized') {
        storageMsg = 'Quyền truy cập Cloud Storage bị chặn. Kiểm tra tài khoản Firebase Authentication và Security Rules cho đường dẫn tệp, vai trò và thao tác cần dùng.';
      } else {
        storageMsg = `Lỗi Storage (${err.code || 'unknown'}): ${msg}`;
      }
    }

    const overallOk = firestoreOk;
    let finalMessage = '';
    if (firestoreOk && storageOk) {
      finalMessage = 'Kết nối Firebase Cloud (Firestore & Storage) hoạt động hoàn hảo!';
    } else if (!firestoreOk) {
      finalMessage = firestoreMsg;
    } else {
      finalMessage = `${firestoreMsg} Tuy nhiên: ${storageMsg}`;
    }

    return {
      ok: overallOk,
      firestore: firestoreOk,
      storage: storageOk,
      firestoreMsg,
      storageMsg,
      message: finalMessage
    };
  },

  // --- STORAGE OPERATIONS ---
  async uploadPdf(quizId, base64OrDataUrl, fileName) {
    if (!this.isActive || !this.storage) return null;
    try {
      const isHtml = (fileName && fileName.endsWith('.html')) || (typeof base64OrDataUrl === 'string' && base64OrDataUrl.includes('text/html'));
      const mimeType = isHtml ? 'text/html' : 'application/pdf';
      const ext = isHtml ? '.html' : '.pdf';

      let blob;
      if (typeof base64OrDataUrl === 'string' && base64OrDataUrl.startsWith('blob:')) {
        const response = await fetch(base64OrDataUrl);
        if (!response.ok) throw new Error('Không đọc được file đính kèm.');
        blob = await response.blob();
      } else blob = this._dataToBlob(base64OrDataUrl, mimeType);
      if (!blob) {
        console.warn('Could not convert PDF/file data to Blob');
        return null;
      }

      // Upload with proper contentType metadata so iframe renders it inline instead of downloading
      const ref = this.storage.ref().child(`quizzes/pdf_${quizId}${ext}`);
      const uploadPromise = ref.put(blob, {
        contentType: mimeType,
        cacheControl: 'public, max-age=86400'
      });
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('FIREBASE_STORAGE_TIMEOUT')), 15000));
      const uploadTask = await Promise.race([uploadPromise, timeoutPromise]);
      const downloadUrl = await uploadTask.ref.getDownloadURL();
      console.log('☁️ PDF/Document uploaded to Firebase Storage:', downloadUrl);
      return downloadUrl;
    } catch (e) {
      console.warn('Firebase Storage upload non-fatal warning:', e.message || e);
      return null;
    }
  },

  async deletePdf(quizId) {
    if (!this.isActive || !this.storage) return;
    try {
      // Try deleting both extension variants
      await this.storage.ref().child(`quizzes/pdf_${quizId}`).delete().catch(() => {});
      await this.storage.ref().child(`quizzes/pdf_${quizId}.pdf`).delete().catch(() => {});
      await this.storage.ref().child(`quizzes/pdf_${quizId}.html`).delete().catch(() => {});
      console.log('☁️ PDF deleted from Firebase Storage:', quizId);
    } catch (e) {
      console.warn('Firebase Storage delete warning:', e.message);
    }
  },

  // --- FIRESTORE OPERATIONS ---
  async saveQuiz(quiz) {
    if (!this.isActive || !this.db) return { success: false, error: 'Firebase is not active' };
    try {
      const quizToSave = { ...quiz };
      let downloadUrl = null;

      // Extract examHtml if available in pdfDataUrl
      if (!quizToSave.examHtml && quizToSave.pdfDataUrl && typeof quizToSave.pdfDataUrl === 'string' && quizToSave.pdfDataUrl.startsWith('data:text/html')) {
        try {
          const separator = quizToSave.pdfDataUrl.indexOf(',');
      const parts = [quizToSave.pdfDataUrl.slice(0, separator), quizToSave.pdfDataUrl.slice(separator + 1)];
          if (parts.length > 1) {
            quizToSave.examHtml = decodeURIComponent(parts[1]);
          }
        } catch (e) {
          console.warn('Could not extract examHtml from pdfDataUrl:', e);
        }
      }

      // If quiz contains raw base64 or data URL, upload to Firebase Storage if available
      if (quizToSave.pdfDataUrl && ((typeof quizToSave.pdfDataUrl === 'string' && (quizToSave.pdfDataUrl.startsWith('data:') || quizToSave.pdfDataUrl.startsWith('blob:'))) || quizToSave.pdfDataUrl instanceof Blob)) {
        if (this.storage) {
          try {
            downloadUrl = await this.uploadPdf(quiz.id, quizToSave.pdfDataUrl, quizToSave.pdfFileName);
            if (downloadUrl) {
              quizToSave.pdfDataUrl = downloadUrl;
              quiz.pdfDataUrl = downloadUrl; // Update original reference so caller can cache it
            }
          } catch (e) {
            console.warn('Storage upload skipped:', e);
          }
        }
        
        // If upload to Storage fails or is unavailable:
        // Only strip pdfDataUrl if it's a huge binary file (> 500KB) to prevent exceeding Firestore's 1MB doc limit.
        // For auto-generated math exams (~15KB HTML), KEEP it directly in Firestore so student devices can render it instantly!
        if (!downloadUrl && typeof quizToSave.pdfDataUrl === 'string' && quizToSave.pdfDataUrl.length > 500000) {
          throw new Error('Không tải được file lên Cloud Storage; đề chỉ được lưu ở máy nếu có bản local.');
        }
        if (!downloadUrl && quizToSave.pdfDataUrl instanceof Blob) throw new Error('Không tải được file Blob lên Cloud Storage.');
        if (!downloadUrl && typeof quizToSave.pdfDataUrl === 'string' && quizToSave.pdfDataUrl.startsWith('blob:')) throw new Error('Không lưu được địa chỉ file tạm lên Cloud.');
        if (downloadUrl && quizToSave.examHtml?.length > 500000) delete quizToSave.examHtml;
      }

      const publicQuiz = toPublicQuizPayload(quizToSave);
      const privateAnswerPayload = toPrivateAnswerPayload(quizToSave);
      const privateSetPromise = this.db.collection('quiz_answer_keys').doc(quiz.id).set(privateAnswerPayload);
      const publicSetPromise = this.db.collection('quizzes').doc(quiz.id).set(publicQuiz);
      const setTimer = new Promise((_, reject) => setTimeout(() => reject(new Error('FIREBASE_SYNC_TIMEOUT')), 15000));
      await Promise.race([Promise.all([privateSetPromise, publicSetPromise]), setTimer]);

      console.log('☁️ Quiz saved to Firestore with public/private answer separation:', quiz.id);
      return { success: true, downloadUrl };
    } catch (e) {
      console.error('Firestore saveQuiz error:', e);
      return { success: false, error: e.message };
    }
  },

  async getQuiz(id) {
    if (!this.isActive || !this.db) return null;
    try {
      const doc = await this.db.collection('quizzes').doc(id).get();
      if (!doc.exists) return null;
      const data = doc.data();
      if (data) {
        if (!data.pdfDataUrl && data.examHtml) {
          data.pdfDataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(data.examHtml);
        }
      }
      return data;
    } catch (e) {
      console.error('Firestore getQuiz error:', e);
      return null;
    }
  },

  async getAllQuizzes() {
    if (!this.isActive || !this.db) return [];
    try {
      const snapshot = await this.db.collection('quizzes').get();
      const list = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data) {
          if (!data.pdfDataUrl && data.examHtml) {
            data.pdfDataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(data.examHtml);
          }
          list.push(data);
        }
      });
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      return list;
    } catch (e) {
      console.error('Firestore getAllQuizzes error:', e);
      return [];
    }
  },

  // Realtime listener for newly published/updated quizzes across all devices
  listenToQuizzes(callback) {
    if (!this.isActive || !this.db) return () => {};
    try {
      return this.db.collection('quizzes').onSnapshot((snapshot) => {
        const list = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          if (data) {
            if (!data.pdfDataUrl && data.examHtml) {
              data.pdfDataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(data.examHtml);
            }
            list.push(data);
          }
        });
        list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        if (typeof callback === 'function') {
          callback(list);
        }
      }, (err) => {
        console.warn('Realtime quizzes listener warning:', err.message);
      });
    } catch (e) {
      console.warn('Error setting up quizzes listener:', e);
      return () => {};
    }
  },

  async deleteQuiz(quizId) {
    if (!this.isActive) return false;
    try {
      await this.db.collection('quizzes').doc(quizId).delete();
      await this.db.collection('quiz_answer_keys').doc(quizId).delete();
      await this.deletePdf(quizId);
      console.log('☁️ Quiz deleted from Firestore:', quizId);
      return true;
    } catch (e) {
      console.error('Firestore deleteQuiz error:', e);
      return false;
    }
  },

  async saveResult(result) {
    if (!this.isActive) return null;
    try {
      const docId = result.id || `result_${result.quizId}_${Date.now()}`;
      await this.db.collection('results').doc(docId).set(result);
      console.log('☁️ Result saved to Firestore:', docId);
      return docId;
    } catch (e) {
      console.error('Firestore saveResult error:', e);
      return null;
    }
  },

  async deleteResult(resultId) {
    if (!this.isActive) return false;
    try {
      await this.db.collection('results').doc(resultId).delete();
      console.log('☁️ Result deleted from Firestore:', resultId);
      return true;
    } catch (e) {
      console.error('Firestore deleteResult error:', e);
      return false;
    }
  },

  async deleteResultsByQuiz(quizId) {
    if (!this.isActive) return false;
    try {
      const snapshot = await this.db.collection('results').where('quizId', '==', quizId).get();
      const batch = this.db.batch();
      snapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      console.log('☁️ All results for quiz deleted from Firestore:', quizId);
      return true;
    } catch (e) {
      console.error('Firestore deleteResultsByQuiz error:', e);
      return false;
    }
  },

  async deleteAllResults() {
    if (!this.isActive) return false;
    try {
      const snapshot = await this.db.collection('results').get();
      if (snapshot.empty) return true;
      const batch = this.db.batch();
      snapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      console.log('☁️ All test results permanently deleted from Firestore');
      return true;
    } catch (e) {
      console.error('Firestore deleteAllResults error:', e);
      return false;
    }
  },

  async getResultsByQuiz(quizId) {
    if (!this.isActive) return [];
    try {
      const snapshot = await this.db.collection('results').where('quizId', '==', quizId).get();
      const list = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        data.key = doc.id;
        list.push(data);
      });
      return list;
    } catch (e) {
      console.error('Firestore getResultsByQuiz error:', e);
      return [];
    }
  },

  async getAllResults() {
    if (!this.isActive) return [];
    try {
      const snapshot = await this.db.collection('results').get();
      const list = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        data.key = doc.id;
        list.push(data);
      });
      return list;
    } catch (e) {
      console.error('Firestore getAllResults error:', e);
      return [];
    }
  },

  async saveStudentRoster(roster) {
    if (!this.isActive) return false;
    try {
      await this.db.collection('roster').doc('students').set({ list: roster });
      console.log('☁️ Student roster saved to Firestore');
      return true;
    } catch (e) {
      console.error('Firestore saveStudentRoster error:', e);
      return false;
    }
  },

  async getStudentRoster() {
    if (!this.isActive) return null;
    try {
      const doc = await this.db.collection('roster').doc('students').get();
      return doc.exists ? doc.data().list : null;
    } catch (e) {
      console.error('Firestore getStudentRoster error:', e);
      return null;
    }
  }
};

window.FirebaseEngine = FirebaseEngine;
