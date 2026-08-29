/**
 * KhiemEdu Storage Engine
 * Handles persistent storage, cross-tab synchronization, and export/import.
 */

const STORAGE_PREFIX = 'khiemedu_';

const StorageEngine = {
  channel: typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('khiemedu_sync') : null,

  init() {
    this.seedSampleDataIfEmpty();
  },

  async set(key, value) {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, typeof value === 'string' ? value : JSON.stringify(value));
      if (this.channel) {
        this.channel.postMessage({ type: 'storage_update', key, value });
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
    return list;
  },

  // Results
  async saveResult(result) {
    const key = `result:${result.quizId}:${result.className}_${result.name}_${Date.now()}`;
    await this.set(key, result);
    await this.set(`submitted:${result.quizId}:${result.className}_${result.name}`, '1');
    return key;
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
      if (r) results.push(r);
    }
    return results;
  },

  // Seed sample exam with LaTeX Math equations
  seedSampleDataIfEmpty() {
    const sampleKey = 'quiz:MATH01';
    if (!localStorage.getItem(STORAGE_PREFIX + sampleKey)) {
      const sampleQuiz = {
        id: 'MATH01',
        title: 'Đề Thi Thử Toán Học — Đấu Trường Trí Tuệ',
        timeLimit: 15,
        shuffle: true,
        showLeaderboard: true,
        antiCheat: true,
        createdAt: new Date().toISOString(),
        questions: [
          {
            id: 1,
            type: 'mcq',
            question: 'Nghiệm của phương trình bậc hai $x^2 - 5x + 6 = 0$ là:',
            options: [
              'A. $x = 1$ hoặc $x = 6$',
              'B. $x = 2$ hoặc $x = 3$',
              'C. $x = -2$ hoặc $x = -3$',
              'D. $x = 0$ hoặc $x = 5$'
            ],
            correctAnswer: 'B',
            explanation: 'Phân tích đa thức thành nhân tử: $(x-2)(x-3) = 0 \\Rightarrow x=2$ hoặc $x=3$.'
          },
          {
            id: 2,
            type: 'mcq',
            question: 'Tính giá trị của biểu thức $P = \\sqrt{16} + \\sqrt[3]{27} - 2^3$:',
            options: [
              'A. -1',
              'B. 1',
              'C. 7',
              'D. 15'
            ],
            correctAnswer: 'A',
            explanation: 'Ta có $P = 4 + 3 - 8 = -1$.'
          },
          {
            id: 3,
            type: 'truefalse',
            question: 'Trong mặt phẳng tọa độ $Oxy$, đồ thị hàm số $y = 2x - 4$ đi qua điểm $A(2; 0)$ và $B(0; -4)$. Khẳng định này Đúng hay Sai?',
            options: [],
            correctAnswer: 'Đúng',
            explanation: 'Thay $x=2 \\Rightarrow y=2(2)-4=0$ (thỏa mãn $A$). Thay $x=0 \\Rightarrow y=-4$ (thỏa mãn $B$).'
          },
          {
            id: 4,
            type: 'essay',
            question: 'Một hình tròn có bán kính $r = 5\\text{ cm}$. Tính diện tích hình tròn theo $\\pi$ (chỉ điền số nguyên, ví dụ: 25):',
            options: [],
            correctAnswer: '25',
            explanation: 'Diện tích $S = \\pi r^2 = \\pi (5)^2 = 25\\pi$. Số cần điền là 25.'
          },
          {
            id: 5,
            type: 'mcq',
            question: 'Cho tam giác vuông có hai cạnh góc vuông là $3\\text{ cm}$ và $4\\text{ cm}$. Độ dài cạnh huyền là:',
            options: [
              'A. $5\\text{ cm}$',
              'B. $6\\text{ cm}$',
              'C. $7\\text{ cm}$',
              'D. $\\sqrt{7}\\text{ cm}$'
            ],
            correctAnswer: 'A',
            explanation: 'Áp dụng định lý Pythagoras: $c = \\sqrt{3^2 + 4^2} = \\sqrt{9 + 16} = 5\\text{ cm}$.'
          }
        ]
      };
      this.saveQuiz(sampleQuiz);
    }
  }
};

window.StorageEngine = StorageEngine;
