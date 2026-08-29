/**
 * ToanMath Platform - Động cơ Phòng thi Trực tuyến Độc lập (Exam Runner)
 */

class ExamRunner {
  constructor(dataManager, onExamFinishCallback) {
    this.dataManager = dataManager;
    this.onExamFinish = onExamFinishCallback;
    this.currentExam = null;
    this.userAnswers = {};
    this.bookmarks = new Set();
    this.timerInterval = null;
    this.remainingSeconds = 0;
    this.isFinished = false;
  }

  startExam(examData) {
    this.currentExam = examData;
    this.userAnswers = {};
    this.bookmarks = new Set();
    this.isFinished = false;
    this.remainingSeconds = (examData.duration || 45) * 60;

    this.startTimer();
  }

  startTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);

    this.timerInterval = setInterval(() => {
      this.remainingSeconds--;
      
      this.updateTimerDisplay();

      if (this.remainingSeconds <= 0) {
        clearInterval(this.timerInterval);
        this.submitExam(true); // Hết giờ tự động nộp
      }
    }, 1000);

    this.updateTimerDisplay();
  }

  updateTimerDisplay() {
    const timerElem = document.getElementById("examTimerDisplay");
    if (!timerElem) return;

    const minutes = Math.floor(this.remainingSeconds / 60);
    const seconds = this.remainingSeconds % 60;
    const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    timerElem.innerText = formatted;

    const timerBox = document.getElementById("timerBoxWrapper");
    if (timerBox) {
      if (this.remainingSeconds <= 300) { // Dưới 5 phút
        timerBox.classList.add("timer-warning");
      } else {
        timerBox.classList.remove("timer-warning");
      }
    }
  }

  recordAnswer(questionId, answerValue) {
    this.userAnswers[questionId] = answerValue;
  }

  toggleBookmark(questionId) {
    if (this.bookmarks.has(questionId)) {
      this.bookmarks.delete(questionId);
    } else {
      this.bookmarks.add(questionId);
    }
  }

  submitExam(isAutoSubmit = false) {
    if (this.isFinished) return;
    this.isFinished = true;
    if (this.timerInterval) clearInterval(this.timerInterval);

    // Thuật toán chấm điểm
    let correctCount = 0;
    const details = [];

    this.currentExam.questions.forEach((q, idx) => {
      const userAns = this.userAnswers[q.id];
      let isCorrect = false;

      if (q.questionType === 'choice' || q.type === 'choice') {
        isCorrect = (userAns !== undefined && parseInt(userAns, 10) === q.correctAnswer);
      } else {
        // Tự luận điền số
        isCorrect = this.dataManager.evaluateEssayAnswer(userAns || '', q.correctAnswer);
      }

      if (isCorrect) correctCount++;

      details.push({
        questionNumber: idx + 1,
        question: q,
        userAnswer: userAns !== undefined ? userAns : "Chưa trả lời",
        isCorrect: isCorrect,
        correctAnswer: q.correctAnswer,
        solution: q.solution
      });
    });

    const totalQuestions = this.currentExam.questions.length;
    const score = totalQuestions > 0 ? ((correctCount / totalQuestions) * 10).toFixed(2) : 0;

    const resultReport = {
      exam: this.currentExam,
      score: parseFloat(score),
      correctCount: correctCount,
      totalQuestions: totalQuestions,
      details: details,
      timeSpentSeconds: (this.currentExam.duration * 60) - Math.max(0, this.remainingSeconds),
      isAutoSubmit: isAutoSubmit
    };

    if (this.onExamFinish) {
      this.onExamFinish(resultReport);
    }

    return resultReport;
  }
}
