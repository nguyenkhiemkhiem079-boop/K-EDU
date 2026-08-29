/**
 * ToanMath Platform - Quản lý Ngân hàng Dữ liệu & Tùy chỉnh Câu hỏi Tự Luận
 */

class QuestionDataManager {
  constructor() {
    this.questions = getLocalQuestionBank();
    this.currentFilters = {
      grade: 'all',
      level: 'all',
      type: 'all',
      search: ''
    };
  }

  getAllQuestions() {
    return this.questions;
  }

  getFilteredQuestions() {
    return this.questions.filter(q => {
      const matchGrade = this.currentFilters.grade === 'all' || q.grade.toString() === this.currentFilters.grade;
      const matchLevel = this.currentFilters.level === 'all' || q.level === this.currentFilters.level;
      const matchType = this.currentFilters.type === 'all' || q.type === this.currentFilters.type;
      const matchSearch = !this.currentFilters.search || 
        q.content.toLowerCase().includes(this.currentFilters.search.toLowerCase()) ||
        q.topic.toLowerCase().includes(this.currentFilters.search.toLowerCase()) ||
        (q.subtopic && q.subtopic.toLowerCase().includes(this.currentFilters.search.toLowerCase()));

      return matchGrade && matchLevel && matchType && matchSearch;
    });
  }

  addQuestion(questionData) {
    const newId = `Q_${Date.now().toString().slice(-6)}`;
    const newQuestion = {
      id: newId,
      ...questionData
    };
    this.questions.unshift(newQuestion);
    saveLocalQuestionBank(this.questions);
    return newQuestion;
  }

  deleteQuestion(id) {
    this.questions = this.questions.filter(q => q.id !== id);
    saveLocalQuestionBank(this.questions);
  }

  resetToDefault() {
    this.questions = [...INITIAL_QUESTION_BANK];
    saveLocalQuestionBank(this.questions);
  }

  /**
   * Thuật toán kiểm tra đáp án tự luận điền số
   * Hỗ trợ nhiều đáp án tương đương (phân tách bởi |), bỏ qua khoảng trắng, chấp nhận dạng phân số/thập phân/x=...
   */
  evaluateEssayAnswer(studentAnswer, expectedAnswerPattern) {
    if (!studentAnswer || !expectedAnswerPattern) return false;

    const normalize = (str) => {
      return str
        .toLowerCase()
        .replace(/\s+/g, '') // bỏ khoảng trắng
        .replace(/^x=|^y=|^m=|^s=|^a=|^b=|^k=|^d=|^v=|^ah=|^bc=/, '') // bỏ tiền tố biến
        .replace(/,/g, '.'); // chuẩn hóa dấu phẩy thành dấu chấm
    };

    const studentClean = normalize(studentAnswer.trim());
    const validExpectedList = expectedAnswerPattern.split('|').map(ans => normalize(ans.trim()));

    // 1. Kiểm tra đối sánh chuỗi trực tiếp
    if (validExpectedList.includes(studentClean)) {
      return true;
    }

    // 2. Kiểm tra tính tương đương số học (Ví dụ: 1/2 tương đương 0.5)
    const parseNumeric = (val) => {
      if (val.includes('/')) {
        const parts = val.split('/');
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) && parseFloat(parts[1]) !== 0) {
          return parseFloat(parts[0]) / parseFloat(parts[1]);
        }
      }
      const num = parseFloat(val);
      return isNaN(num) ? null : num;
    };

    const studentNum = parseNumeric(studentClean);
    if (studentNum !== null) {
      for (const expected of validExpectedList) {
        const expectedNum = parseNumeric(expected);
        if (expectedNum !== null && Math.abs(studentNum - expectedNum) < 1e-5) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Bộ sinh biến thể số ngẫu nhiên phong phú cho câu tự luận
   * Đổi số ngẫu nhiên theo nhiều chủ đề: Phương trình bậc nhất, bậc 2, Hệ PT, Hình học, Toán thực tế
   */
  generateRandomizedVariant(grade = 9) {
    const templates = [
      // Dạng 1: Phương trình bậc nhất một biến ax + b = c
      () => {
        const x0 = Math.floor(Math.random() * 12) + 1; // Nghiệm 1..12
        const a = Math.floor(Math.random() * 5) + 2;   // Hệ số 2..6
        const b = Math.floor(Math.random() * 20) + 1;
        const c = a * x0 + b;
        return {
          topic: "Đại số",
          subtopic: "Phương trình bậc nhất",
          content: `Giải phương trình và tìm nghiệm $x$: $${a}x + ${b} = ${c}$.`,
          correctAnswer: `${x0} | x=${x0} | x = ${x0}`,
          solution: `Ta có:\n$$${a}x = ${c} - ${b} = ${c - b}$$\n$$x = \\dfrac{${c - b}}{${a}} = ${x0}$$\nVậy nghiệm của phương trình là $x = ${x0}$.`
        };
      },
      // Dạng 2: Phương trình tích (x - x1)(x - x2) = 0
      () => {
        const x1 = Math.floor(Math.random() * 6) + 1;
        const x2 = x1 + Math.floor(Math.random() * 4) + 1;
        const S = x1 + x2;
        const P = x1 * x2;
        return {
          topic: "Đại số",
          subtopic: "Phương trình bậc hai",
          content: `Tìm tổng các nghiệm của phương trình bậc hai: $x^2 - ${S}x + ${P} = 0$.`,
          correctAnswer: `${S} | ${S}.0`,
          solution: `Áp dụng định lý Vi-ét cho phương trình $x^2 - ${S}x + ${P} = 0$:\nTổng hai nghiệm $x_1 + x_2 = -\\dfrac{b}{a} = ${S}$.`
        };
      },
      // Dạng 3: Hệ thức lượng trong tam giác vuông
      () => {
        // Tam giác vuông với đường cao AH^2 = BH * CH
        const bhList = [2, 3, 4, 9, 16];
        const chList = [8, 12, 9, 4, 25];
        const idx = Math.floor(Math.random() * bhList.length);
        const bh = bhList[idx];
        const ch = chList[idx];
        const ah = Math.round(Math.sqrt(bh * ch));
        return {
          topic: "Hình học",
          subtopic: "Hệ thức lượng trong tam giác vuông",
          content: `Cho tam giác $ABC$ vuông tại $A$, đường cao $AH$. Biết độ dài các hình chiếu $BH = ${bh}\\text{ cm}$ và $CH = ${ch}\\text{ cm}$. Tính độ dài đường cao $AH$ (cm).`,
          correctAnswer: `${ah} | AH=${ah} | ${ah} cm | ${ah}cm`,
          solution: `Áp dụng hệ thức lượng trong tam giác vuông $ABC$:\n$$AH^2 = BH \\cdot CH = ${bh} \\times ${ch} = ${bh * ch}$$\n$$\\implies AH = \\sqrt{${bh * ch}} = ${ah}\\text{ cm}$$.`
        };
      },
      // Dạng 4: Toán tỉ lệ & Phân số
      () => {
        const k = Math.floor(Math.random() * 8) + 2;
        const a = 3, b = 5;
        const x = a * k;
        const y = b * k;
        const sum = x + y;
        return {
          topic: "Số học & Đại số",
          subtopic: "Dãy tỉ số bằng nhau",
          content: `Tìm giá trị của $x$ biết $\\dfrac{x}{${a}} = \\dfrac{y}{${b}}$ và $x + y = ${sum}$.`,
          correctAnswer: `${x} | x=${x} | x = ${x}`,
          solution: `Áp dụng tính chất dãy tỉ số bằng nhau:\n$$\\dfrac{x}{${a}} = \\dfrac{y}{${b}} = \\dfrac{x+y}{${a}+${b}} = \\dfrac{${sum}}{${a+b}} = ${k}$$\n$$\\implies x = ${a} \\times ${k} = ${x}$$.`
        };
      }
    ];

    const pick = templates[Math.floor(Math.random() * templates.length)];
    return pick();
  }

  // ==================== QUẢN LÝ LƯU TRỮ ĐỀ THI BỀN VỮNG (LOCALSTORAGE) ====================

  getSavedExams() {
    try {
      const saved = localStorage.getItem("toanmath_saved_exams");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Lỗi khi đọc danh sách đề thi:", e);
    }
    return null; // Chưa từng khởi tạo
  }

  saveAllExams(exams) {
    try {
      localStorage.setItem("toanmath_saved_exams", JSON.stringify(exams));
      localStorage.setItem("toanmath_exams_initialized", "true");
    } catch (e) {
      console.error("Lỗi khi ghi danh sách đề thi:", e);
    }
  }

  saveOrUpdateExam(exam) {
    let exams = this.getSavedExams() || [];
    const index = exams.findIndex(e => e.id === exam.id);
    if (index >= 0) {
      exams[index] = exam; // Cập nhật
    } else {
      exams.unshift(exam); // Thêm mới lên đầu
    }
    this.saveAllExams(exams);
    return exams;
  }

  deleteSavedExam(examId) {
    let exams = this.getSavedExams() || [];
    exams = exams.filter(e => e.id !== examId);
    this.saveAllExams(exams);
    return exams;
  }
}
