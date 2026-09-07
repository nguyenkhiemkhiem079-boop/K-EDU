/**
 * K-EDU Automated QA State Driver
 * Activated ONLY when URL parameter ?qa= is present.
 */
document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const qa = params.get('qa');
  if (!qa) return;

  const theme = params.get('theme');
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  }

  // Set student credentials
  const nameInput = document.getElementById('studentJoinName');
  const classInput = document.getElementById('studentJoinClass');
  if (nameInput) nameInput.value = 'Nguyễn Văn Khiêm';
  if (classInput) classInput.value = '10A1';

  // Seed sample demo quiz if not already present
  let existing = await StorageEngine.get('quiz:DEMO10');
  if (!existing && typeof MathEngine !== 'undefined') {
    const demo = MathEngine.generateExam({
      grade: '10',
      term: 'GK1',
      topic: 'Hình học',
      mcqCount: 5,
      essayMatrix: { TH: 1, VD: 1, VDC: 0 }
    });
    demo.id = 'DEMO10';
    demo.title = 'Đề Thi Hình Học & Đo Lường (KaTeX)';
    demo.assignType = 'all';
    await StorageEngine.saveQuiz(demo);
    existing = demo;
  }

  if (qa === 'login') {
    switchTab('student');
    updatePersonalizedExamFeed();
    window.scrollTo(0, 0);
  } else if (qa === 'path') {
    switchTab('student');
    updatePersonalizedExamFeed();
    const feed = document.getElementById('sampleQuizzesList');
    if (feed) {
      feed.scrollIntoView({ behavior: 'instant', block: 'center' });
    }
  } else if (qa === 'exam') {
    switchTab('student');
    if (existing) {
      await startExamWithQuizId(existing.id);
      window.scrollTo(0, 0);
    }
  } else if (qa === 'result') {
    switchTab('student');
    if (existing) {
      await startExamWithQuizId(existing.id);
      AppState.studentAnswers = {
        1: 'A',
        2: 'B',
        3: 'C'
      };
      await submitStudentExam(true);
      window.scrollTo(0, 0);
    }
  } else if (qa === 'batch_controls' || qa === 'teacher') {
    if (typeof TeacherAuth !== 'undefined') TeacherAuth.login();
    AppState.isTeacherLoggedIn = true;
    const authModal = document.getElementById('teacherAuthModal');
    if (authModal) authModal.classList.add('hidden');
    switchTab('teacher');
    const authCard = document.getElementById('teacherAuthCard');
    const dash = document.getElementById('teacherDashboard');
    if (authCard) authCard.classList.add('hidden');
    if (dash) dash.classList.remove('hidden');
    switchTeacherSubtab('create');
    const singleSec = document.getElementById('singleExamCreatorSection');
    if (singleSec) singleSec.style.display = 'none';
    window.scrollTo(0, 0);
  } else if (qa === 'doc_bank') {
    if (typeof TeacherAuth !== 'undefined') TeacherAuth.login();
    AppState.isTeacherLoggedIn = true;
    const authModal = document.getElementById('teacherAuthModal');
    if (authModal) authModal.classList.add('hidden');
    switchTab('teacher');
    const authCard = document.getElementById('teacherAuthCard');
    const dash = document.getElementById('teacherDashboard');
    if (authCard) authCard.classList.add('hidden');
    if (dash) dash.classList.remove('hidden');
    switchTeacherSubtab('create');
    const singleSec = document.getElementById('singleExamCreatorSection');
    if (singleSec) singleSec.style.display = 'block';
    if (typeof renderDocumentBankStats === 'function') renderDocumentBankStats();
    const statsCard = document.getElementById('docBankStatsCard');
    if (statsCard) statsCard.scrollIntoView({ behavior: 'instant', block: 'center' });
  } else if (qa === 'doc_shortage') {
    if (typeof TeacherAuth !== 'undefined') TeacherAuth.login();
    AppState.isTeacherLoggedIn = true;
    const authModal = document.getElementById('teacherAuthModal');
    if (authModal) authModal.classList.add('hidden');
    switchTab('teacher');
    const authCard = document.getElementById('teacherAuthCard');
    const dash = document.getElementById('teacherDashboard');
    if (authCard) authCard.classList.add('hidden');
    if (dash) dash.classList.remove('hidden');
    switchTeacherSubtab('create');
    if (typeof renderDocumentBankStats === 'function') renderDocumentBankStats();

    const gradeSelect = document.getElementById('mathGenGradeSelect');
    const countSelect = document.getElementById('mathGenMcqCountSelect');
    const sourceSelect = document.getElementById('mathGenSourceSelect');
    if (gradeSelect) gradeSelect.value = '6';
    if (countSelect) countSelect.value = '20';
    if (sourceSelect) sourceSelect.value = 'document';
    const batchSelect = document.getElementById('mathGenBatchCountSelect');
    if (batchSelect) batchSelect.value = '1';

    if (typeof triggerAutoGenerateMathExam === 'function') {
      await triggerAutoGenerateMathExam();
    }
    const alertEl = document.getElementById('mathGenSourceAlert');
    if (alertEl) alertEl.scrollIntoView({ behavior: 'instant', block: 'center' });
  } else if (qa === 'doc_gen') {
    if (typeof TeacherAuth !== 'undefined') TeacherAuth.login();
    AppState.isTeacherLoggedIn = true;
    const authModal = document.getElementById('teacherAuthModal');
    if (authModal) authModal.classList.add('hidden');
    switchTab('teacher');
    const authCard = document.getElementById('teacherAuthCard');
    const dash = document.getElementById('teacherDashboard');
    if (authCard) authCard.classList.add('hidden');
    if (dash) dash.classList.remove('hidden');
    switchTeacherSubtab('create');
    if (typeof renderDocumentBankStats === 'function') renderDocumentBankStats();

    const gradeSelect = document.getElementById('mathGenGradeSelect');
    const countSelect = document.getElementById('mathGenMcqCountSelect');
    const sourceSelect = document.getElementById('mathGenSourceSelect');
    if (gradeSelect) gradeSelect.value = '10';
    if (countSelect) countSelect.value = '12';
    if (sourceSelect) sourceSelect.value = 'document';
    const batchSelect = document.getElementById('mathGenBatchCountSelect');
    if (batchSelect) batchSelect.value = '1';

    if (typeof triggerAutoGenerateMathExam === 'function') {
      await triggerAutoGenerateMathExam();
    }
    const gridEl = document.getElementById('teacherMcqGridContainer');
    if (gridEl) gridEl.scrollIntoView({ behavior: 'instant', block: 'center' });
  } else if (qa === 'batch_modal') {
    if (typeof TeacherAuth !== 'undefined') TeacherAuth.login();
    AppState.isTeacherLoggedIn = true;
    const authModal = document.getElementById('teacherAuthModal');
    if (authModal) authModal.classList.add('hidden');
    switchTab('teacher');
    const authCard = document.getElementById('teacherAuthCard');
    const dash = document.getElementById('teacherDashboard');
    if (authCard) authCard.classList.add('hidden');
    if (dash) dash.classList.remove('hidden');
    switchTeacherSubtab('create');
    if (typeof triggerAutoGenerateMathExam === 'function') {
      await triggerAutoGenerateMathExam();
      if (typeof showBatchGenResultsModal === 'function') {
        showBatchGenResultsModal();
      }
    }
  } else if (qa === 'admin_results') {
    if (typeof TeacherAuth !== 'undefined') TeacherAuth.login();
    AppState.isTeacherLoggedIn = true;
    switchTab('results');
    // Seed sample student results for DEMO10 if none
    const existingRes = await StorageEngine.getResultsByQuiz('DEMO10');
    if (!existingRes || !existingRes.length) {
      await StorageEngine.saveResult({
        id: 'result:DEMO10:10A1_NguyenVanA_' + Date.now(),
        quizId: 'DEMO10',
        className: '10A1',
        name: 'Nguyễn Văn A',
        totalScore: 9.0,
        correct: 5,
        total: 5,
        tabSwitches: 6, // Cảnh báo gian lận
        timeTakenSeconds: 150,
        submittedAt: new Date().toISOString()
      });
      await StorageEngine.saveResult({
        id: 'result:DEMO10:10A1_TranThiB_' + (Date.now() + 1),
        quizId: 'DEMO10',
        className: '10A1',
        name: 'Trần Thị B',
        totalScore: 7.0,
        correct: 4,
        total: 5,
        tabSwitches: 0,
        timeTakenSeconds: 320,
        submittedAt: new Date().toISOString()
      });
    }
    const input = document.getElementById('lookupQuizCodeInput');
    if (input) input.value = 'DEMO10';
    await loadTeacherResults();
    window.scrollTo(0, 0);
  } else if (qa === 'teacher_modal') {
    TeacherAuth.logout();
    openTeacherAuthModal();
    window.scrollTo(0, 0);
  } else if (qa === 'vinhdanh') {
    switchTab('gamification');
    window.scrollTo(0, 0);
  } else if (qa === 'vinhdanh_modal') {
    switchTab('gamification');
    TeacherAuth.logout();
    openResetVinhDanhModal();
    window.scrollTo(0, 0);
  } else if (qa === 'vinhdanh_reset_done') {
    if (typeof TeacherAuth !== 'undefined') TeacherAuth.login();
    switchTab('gamification');
    await executeAdminResetVinhDanh('all');
    window.scrollTo(0, 1250);
  } else if (qa === 'quiz_status') {
    if (typeof TeacherAuth !== 'undefined') TeacherAuth.login();
    AppState.isTeacherLoggedIn = true;
    switchTab('teacher');
    switchTeacherSubtab('manage');
    // Seed DEMO10 results (Taken) and TOAN10_GK1 quiz (Untaken) to show both
    await StorageEngine.saveQuiz({
      id: 'TOAN10_GK1',
      title: 'Đề Thi Khảo Sát Giữa HK1 - Toán 10',
      timeLimit: 45,
      targetClass: '10',
      examTerm: 'GK1',
      assignType: 'all',
      answerKeys: [{ id: 1, type: 'mcq', ans: 'A' }, { id: 2, type: 'mcq', ans: 'B' }]
    });
    const existing = await StorageEngine.getResultsByQuiz('DEMO10');
    if (!existing || !existing.length) {
      await StorageEngine.saveResult({
        id: 'result:DEMO10:10A1_NguyenVanA_' + Date.now(),
        quizId: 'DEMO10',
        className: '10A1',
        name: 'Nguyễn Văn A',
        totalScore: 9.5,
        correct: 19,
        total: 20,
        tabSwitches: 0,
        timeTakenSeconds: 1200,
        submittedAt: new Date().toISOString()
      });
      await StorageEngine.saveResult({
        id: 'result:DEMO10:10A1_TranThiB_' + (Date.now() + 1),
        quizId: 'DEMO10',
        className: '10A1',
        name: 'Trần Thị B',
        totalScore: 8.0,
        correct: 16,
        total: 20,
        tabSwitches: 3,
        timeTakenSeconds: 1400,
        submittedAt: new Date().toISOString()
      });
    }
    await renderTeacherQuizManager();
    window.scrollTo(0, 0);
  } else if (qa === 'student_status') {
    switchTab('student');
    const existing = await StorageEngine.getResultsByQuiz('DEMO10');
    if (!existing || !existing.length) {
      await StorageEngine.saveResult({
        id: 'result:DEMO10:10A1_NguyenVanA_' + Date.now(),
        quizId: 'DEMO10',
        className: '10A1',
        name: 'Nguyễn Văn A',
        avatar: '🦊',
        totalScore: 9.5,
        correct: 19,
        total: 20,
        submittedAt: new Date().toISOString()
      });
      await StorageEngine.saveResult({
        id: 'result:DEMO10:10A1_TranThiB_' + (Date.now() + 1),
        quizId: 'DEMO10',
        className: '10A1',
        name: 'Trần Thị B',
        avatar: '🐼',
        totalScore: 8.0,
        correct: 16,
        total: 20,
        submittedAt: new Date().toISOString()
      });
    }
    const joinName = document.getElementById('studentJoinName');
    const joinClass = document.getElementById('studentJoinClass');
    if (joinName) joinName.value = 'Nguyễn Văn A';
    if (joinClass) joinClass.value = '10A1';
    const formCard = joinName ? joinName.closest('.card') : null;
    if (formCard) formCard.style.display = 'none';
    await renderSampleQuizzes('Nguyễn Văn A', '10A1');
    window.scrollTo(0, 0);
  } else if (qa === 'mobile') {
    switchTab('student');
    updatePersonalizedExamFeed();
    window.scrollTo(0, 0);
  }
});
