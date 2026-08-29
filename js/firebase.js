/**
 * KhiemEdu Firebase Cloud Sync Engine
 * Supports cloud sync of quizzes, results, and rosters with fallback to LocalStorage/IndexedDB.
 */

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

  init() {
    try {
      const configStr = localStorage.getItem('khiemedu_firebase_config');
      const isEnabledStr = localStorage.getItem('khiemedu_firebase_enabled');

      let config = this.defaultConfig;
      let isEnabled = true;

      if (configStr) {
        try {
          config = JSON.parse(configStr);
        } catch (e) {
          console.error("Error parsing localstorage config, using default:", e);
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
      if (window.firebase && firebase.apps.length === 0) {
        this.app = firebase.initializeApp(config);
      } else if (window.firebase) {
        this.app = firebase.app();
      } else {
        throw new Error('Chưa nạp được SDK Firebase từ CDN.');
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
    } catch (e) {
      console.error('Firebase initialization error:', e);
      this.isActive = false;
      return false;
    }
  },

  // Save config to LocalStorage
  saveConfig(config) {
    localStorage.setItem('khiemedu_firebase_config', JSON.stringify(config));
    localStorage.setItem('khiemedu_firebase_enabled', '1');
    return this.init();
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

  // --- STORAGE OPERATIONS ---
  async uploadPdf(quizId, base64OrDataUrl, fileName) {
    if (!this.isActive) return null;
    try {
      const ref = this.storage.ref().child(`quizzes/pdf_${quizId}`);
      let uploadTask;
      if (base64OrDataUrl.startsWith('data:')) {
        uploadTask = await ref.putString(base64OrDataUrl, 'data_url');
      } else {
        // Assume raw base64 or blob
        uploadTask = await ref.putString(base64OrDataUrl, 'base64');
      }
      const downloadUrl = await uploadTask.ref.getDownloadURL();
      console.log('☁️ PDF uploaded to Firebase Storage:', downloadUrl);
      return downloadUrl;
    } catch (e) {
      console.error('Firebase Storage upload error:', e);
      return null;
    }
  },

  async deletePdf(quizId) {
    if (!this.isActive) return;
    try {
      const ref = this.storage.ref().child(`quizzes/pdf_${quizId}`);
      await ref.delete();
      console.log('☁️ PDF deleted from Firebase Storage:', quizId);
    } catch (e) {
      // Ignore if file doesn't exist
      console.warn('Firebase Storage delete warning:', e.message);
    }
  },

  // --- FIRESTORE OPERATIONS ---
  async saveQuiz(quiz) {
    if (!this.isActive) return false;
    try {
      // Strip any direct huge base64 dataUrl before saving to Firestore doc to stay well below 1MB doc limit
      const quizToSave = { ...quiz };
      if (quizToSave.pdfDataUrl && quizToSave.pdfDataUrl.startsWith('data:')) {
        // If it's a data url, upload it to storage first
        const downloadUrl = await this.uploadPdf(quiz.id, quizToSave.pdfDataUrl, quizToSave.pdfFileName);
        if (downloadUrl) {
          quizToSave.pdfDataUrl = downloadUrl;
        } else {
          // If upload fails, remove it to prevent Firestore document limit error
          delete quizToSave.pdfDataUrl;
        }
      }

      await this.db.collection('quizzes').doc(quiz.id).set(quizToSave);
      console.log('☁️ Quiz saved to Firestore:', quiz.id);
      return true;
    } catch (e) {
      console.error('Firestore saveQuiz error:', e);
      return false;
    }
  },

  async getQuiz(id) {
    if (!this.isActive) return null;
    try {
      const doc = await this.db.collection('quizzes').doc(id).get();
      return doc.exists ? doc.data() : null;
    } catch (e) {
      console.error('Firestore getQuiz error:', e);
      return null;
    }
  },

  async getAllQuizzes() {
    if (!this.isActive) return [];
    try {
      const snapshot = await this.db.collection('quizzes').get();
      const list = [];
      snapshot.forEach(doc => list.push(doc.data()));
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      return list;
    } catch (e) {
      console.error('Firestore getAllQuizzes error:', e);
      return [];
    }
  },

  async deleteQuiz(quizId) {
    if (!this.isActive) return false;
    try {
      await this.db.collection('quizzes').doc(quizId).delete();
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
