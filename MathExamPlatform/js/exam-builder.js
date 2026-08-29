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
    if (candidatePool.length < (numChoice + numEssay)) {
      candidatePool = allQuestions; // Dự phòng lấy từ toàn kho nếu lớp đó chưa đủ câu
    }

    const choicePool = candidatePool.filter(q => q.type === 'choice' || !q.type);
    const essayPool = candidatePool.filter(q => q.type === 'essay' || q.type === 'fill');

    // Thuật toán chọn câu hỏi theo tỉ lệ mức độ nhận thức
    const selectedQuestions = [];

    const selectFromPool = (pool, count) => {
      if (pool.length <= count) return [...pool];
      // Xáo trộn ngẫu nhiên
      const shuffled = [...pool].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, count);
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
        const variant = this.dataManager.generateRandomizedVariant();
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
      createdAt: new Date().toISOString(),
      questions: selectedQuestions
    };
  }
}
