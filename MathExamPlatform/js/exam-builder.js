/**
 * ToanMath Platform - Bộ Sinh Đề thi Tự động theo Ma trận Chuẩn
 */

class ExamBuilder {
  constructor(dataManager) {
    this.dataManager = dataManager;
  }

  /**
   * Sinh đề thi theo cấu hình ma trận
   */
  generateExam(config) {
    const {
      title = "Đề Kiểm Tra Toán THCS",
      grade = 9,
      duration = 45, // phút
      numChoice = 12,
      numEssay = 3,
      levelDistribution = { NB: 40, TH: 30, VD: 20, VDC: 10 }, // %
      examCode = Math.floor(100 + Math.random() * 900)
    } = config;

    const allQuestions = this.dataManager.getAllQuestions();
    
    // Lọc theo khối lớp (Nếu grade là 'all' thì lấy cả khối, còn không thì lấy đúng lớp hoặc lớp lân cận nếu thiếu)
    let candidatePool = allQuestions.filter(q => grade === 'all' || q.grade == grade);


    const choicePool = candidatePool.filter(q => q.type === 'choice' || !q.type);
    const essayPool = candidatePool.filter(q => q.type === 'essay' || q.type === 'fill');

    // Thuật toán chọn câu hỏi theo tỉ lệ mức độ nhận thức
    const selectedQuestions = [];

    const seen = new Set();
    const signature = q => String(q.content || '').normalize('NFC').trim().replace(/\s+/g, ' ');
    const selectFromPool = (pool, count) => {
      const shuffled = [...pool];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      const selected = [];
      for (const q of shuffled) {
        if (selected.length >= count) break;
        const key = signature(q);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        selected.push(q);
      }
      return selected;
    };

    // Chọn trắc nghiệm
    const selectedChoice = selectFromPool(choicePool, numChoice);
    selectedChoice.forEach((q, idx) => {
      selectedQuestions.push({
        ...q,
        examQuestionNumber: idx + 1,
        questionLabel: `Câu ${idx + 1}`,
        questionType: 'choice'
      });
    });

    // Chọn tự luận điền số
    let selectedEssay = selectFromPool(essayPool, numEssay);
    
    // Nếu trong ngân hàng chưa đủ câu tự luận, tự động sinh từ ngân hàng hoặc tạo biến thể số
    if (selectedEssay.length < numEssay) {
      const needed = numEssay - selectedEssay.length;
      for (let i = 0; i < needed; i++) {
        let variant = null;
        for (let attempt = 0; attempt < 50; attempt++) {
          const candidate = this.dataManager.generateRandomizedVariant();
          const key = signature(candidate);
          if (!key || seen.has(key)) continue;
          seen.add(key);
          variant = candidate;
          break;
        }
        if (!variant) break;
        selectedEssay.push({
          id: `ESSAY_GEN_${Date.now()}_${i}`,
          grade: grade === 'all' ? 8 : grade,
          topic: "Đại số & Phương trình",
          level: "VD",
          type: "essay",
          content: variant.content,
          correctAnswer: variant.correctAnswer,
          solution: variant.solution
        });
      }
    }

    selectedEssay.forEach((q, idx) => {
      const qNum = selectedChoice.length + idx + 1;
      selectedQuestions.push({
        ...q,
        examQuestionNumber: qNum,
        questionLabel: `Câu ${qNum}`,
        questionType: 'essay'
      });
    });

    return {
      id: `EXAM_${Date.now()}`,
      code: examCode,
      title: title,
      grade: grade === 'all' ? "Tổng hợp THCS" : `Lớp ${grade}`,
      duration: duration, // phút
      totalQuestions: selectedQuestions.length,
      numChoice: selectedChoice.length,
      numEssay: selectedEssay.length,
      warning: selectedChoice.length < numChoice || selectedEssay.length < numEssay ? 'Không đủ câu độc nhất cho khối đã chọn; đề sử dụng số câu thực tế.' : null,
      createdAt: new Date().toISOString(),
      questions: selectedQuestions
    };
  }
}
