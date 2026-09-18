/**
 * K-EDU V-ACT Core Architecture - Student Result, Answer Review and Source Solutions Module
 * Provides immutable answer freezing, verified answer grading, dedicated review rendering,
 * source provenance labeling (zero filesystem paths), and accessible question navigator.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    const taxonomy = require('../taxonomy');
    module.exports = factory(taxonomy);
  } else {
    root.KEDUVACT = root.KEDUVACT || {};
    root.KEDUVACT.review = root.KEDUVACT.review || {};
    const reviewModule = factory(root.KEDUVACT);
    Object.assign(root.KEDUVACT.review, reviewModule);
    Object.assign(root.KEDUVACT, reviewModule);
  }
})(typeof window !== 'undefined' ? window : globalThis, function (taxonomyModule) {
  'use strict';

  const VACT_SECTIONS = taxonomyModule?.VACT_SECTIONS || {
    VIETNAMESE: 'vietnamese',
    ENGLISH: 'english',
    MATH: 'math',
    LOGIC_DATA: 'logic_data',
    SCIENTIFIC_REASONING: 'scientific_reasoning'
  };

  const SECTION_LABELS_VI = Object.freeze({
    [VACT_SECTIONS.VIETNAMESE]: 'Tiếng Việt',
    [VACT_SECTIONS.ENGLISH]: 'Tiếng Anh',
    [VACT_SECTIONS.MATH]: 'Toán học',
    [VACT_SECTIONS.LOGIC_DATA]: 'Tư duy logic & Phân tích số liệu',
    [VACT_SECTIONS.SCIENTIFIC_REASONING]: 'Suy luận khoa học'
  });

  /**
   * Generates a student-friendly source provenance label.
   * Strictly suppresses local filesystem paths (e.g. C:\Users\... or TÀI LIỆU/...).
   *
   * @param {object} source
   * @returns {object} { title, questionNumber, sourcePage, displayText }
   */
  function formatStudentFriendlySource(source) {
    if (!source || typeof source !== 'object') {
      return {
        title: 'Nguồn V-ACT chuẩn hóa',
        questionNumber: null,
        sourcePage: null,
        displayText: 'Nguồn: V-ACT chuẩn hóa'
      };
    }

    const rawFile = source.questionSourceFile || source.sourceFile || '';
    const cleanName = rawFile.replace(/^.*[\\\/]/, '').trim();

    let title = 'V-ACT';
    if (/OFFICIAL.*2025.*DOT1/i.test(cleanName)) {
      title = 'Đề chính thức V-ACT ĐHQG-HCM 2025 — Đợt 1';
    } else if (/OFFICIAL.*2025.*DOT2/i.test(cleanName)) {
      title = 'Đề chính thức V-ACT ĐHQG-HCM 2025 — Đợt 2';
    } else if (/OFFICIAL.*2024.*DOT1/i.test(cleanName)) {
      title = 'Đề chính thức V-ACT ĐHQG-HCM 2024 — Đợt 1';
    } else if (/MOCK_(\d+)/i.test(cleanName)) {
      const num = cleanName.match(/MOCK_(\d+)/i)[1];
      title = `Đề thi V-ACT 2025 — Đề số ${parseInt(num, 10)}`;
    } else if (/BOOK_KHOI_DONG/i.test(cleanName)) {
      title = 'Bộ đề Khởi động V-ACT 2025';
    } else if (/BOOK_VUOT_CHUONG_NGAI_VAT/i.test(cleanName)) {
      title = 'Bộ đề Vượt chướng ngại vật V-ACT 2025';
    } else if (/ENG_/i.test(cleanName)) {
      title = 'Ngân hàng Tiếng Anh V-ACT';
    } else if (/MATH_/i.test(cleanName)) {
      title = 'Ngân hàng Toán học V-ACT';
    } else if (/LOGIC_/i.test(cleanName)) {
      title = 'Ngân hàng Tư duy logic & Dữ liệu V-ACT';
    } else if (/SCIENCE_/i.test(cleanName)) {
      title = 'Ngân hàng Suy luận khoa học V-ACT';
    } else if (/VIET_/i.test(cleanName)) {
      title = 'Ngân hàng Tiếng Việt V-ACT';
    } else if (cleanName) {
      title = cleanName.replace(/\.pdf$/i, '').replace(/_/g, ' ');
    }

    const qNum = source.questionNumber ? `Câu gốc: ${source.questionNumber}` : null;
    const pageNum = (source.questionSourcePage || source.sourcePage);
    const qPage = pageNum ? `Trang nguồn: ${pageNum}` : null;

    const parts = [title];
    if (qNum) parts.push(qNum);
    if (qPage) parts.push(qPage);

    return {
      title,
      questionNumber: source.questionNumber || null,
      sourcePage: pageNum || null,
      solutionSourceFile: source.solutionSourceFile ? source.solutionSourceFile.replace(/^.*[\\\/]/, '').trim() : null,
      solutionSourcePage: source.solutionSourcePage || null,
      displayText: parts.join(' • ')
    };
  }

  /**
   * Builds an immutable review question item.
   *
   * @param {object} q Question object
   * @param {string} studentAnswer Student's submitted answer
   * @param {number} num Sequence number
   * @returns {object} Canonical review item
   */
  function buildReviewItem(q, studentAnswer, num = 1) {
    if (!q || typeof q !== 'object') {
      throw new TypeError('buildReviewItem expects a valid question object');
    }

    const given = (studentAnswer !== undefined && studentAnswer !== null) ? String(studentAnswer).trim() : '';
    const isUnanswered = !given || given === '(chưa điền)';
    const correctAnswer = q.correctAnswer ? String(q.correctAnswer).trim().toUpperCase() : '';

    if (!correctAnswer || !['A', 'B', 'C', 'D'].includes(correctAnswer)) {
      throw new Error(`ANSWER_METADATA_ERROR: Question ${q.id || num} is missing a valid verified correctAnswer`);
    }

    const isCorrect = !isUnanswered && given.toUpperCase() === correctAnswer;
    const status = isCorrect ? 'correct' : (isUnanswered ? 'unanswered' : 'incorrect');

    const sourceObj = q.source || {};
    const friendlySource = formatStudentFriendlySource(sourceObj);

    return {
      num,
      questionId: q.id || `vact_q_${num}`,
      id: q.id || `vact_q_${num}`,
      section: q.sectionKey || q.section || VACT_SECTIONS.MATH,
      sectionLabel: SECTION_LABELS_VI[q.sectionKey || q.section] || 'V-ACT',
      skill: q.skill || null,
      difficulty: q.difficulty || 'medium',
      stimulus: q.stimulus || null,
      question: q.question || q.content || '',
      content: q.question || q.content || '',
      options: Array.isArray(q.options) ? [...q.options] : [],
      studentAnswer: isUnanswered ? null : given,
      given: isUnanswered ? '(chưa điền)' : given,
      correctAnswer,
      isCorrect,
      status, // "correct" | "incorrect" | "unanswered"
      explanation: (q.explanation && typeof q.explanation === 'string' && q.explanation.trim().length > 0)
        ? q.explanation.trim()
        : null,
      source: {
        sourceId: sourceObj.sourceId || null,
        sourceFile: sourceObj.sourceFile || null,
        sourcePage: sourceObj.sourcePage || null,
        questionNumber: sourceObj.questionNumber || null,
        examSetId: sourceObj.examSetId || null,
        questionSourceId: sourceObj.questionSourceId || sourceObj.sourceId || null,
        questionSourceFile: sourceObj.questionSourceFile || sourceObj.sourceFile || null,
        questionSourcePage: sourceObj.questionSourcePage || sourceObj.sourcePage || null,
        solutionSourceId: sourceObj.solutionSourceId || null,
        solutionSourceFile: sourceObj.solutionSourceFile || null,
        solutionSourcePage: sourceObj.solutionSourcePage || null
      },
      friendlySource,
      quality: {
        answerVerified: Boolean(q.quality?.answerVerified !== false),
        sourceVerified: Boolean(q.quality?.sourceVerified !== false)
      }
    };
  }

  /**
   * Grades a V-ACT exam attempt, freezing student answers and generating complete review data.
   *
   * @param {object} examOrQuiz
   * @param {object} rawStudentAnswers Key-value pair of question num/id -> student answer
   * @param {object} [meta] Additional metadata (studentName, className, duration, etc.)
   * @returns {object} Graded attempt record with frozen answers
   */
  function gradeVactAttempt(examOrQuiz, rawStudentAnswers = {}, meta = {}) {
    if (!examOrQuiz) {
      throw new TypeError('gradeVactAttempt expects an exam or quiz object');
    }

    // 1. Freeze student answers for immutability
    const submittedAnswers = Object.freeze({ ...rawStudentAnswers });

    const questions = Array.isArray(examOrQuiz.questions)
      ? examOrQuiz.questions
      : (Array.isArray(examOrQuiz.answerKeys) ? examOrQuiz.answerKeys : []);

    const reviewData = [];
    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;

    const sectionBreakdown = {
      [VACT_SECTIONS.VIETNAMESE]: { name: 'Tiếng Việt', correct: 0, wrong: 0, unanswered: 0, total: 0, pct: 0 },
      [VACT_SECTIONS.ENGLISH]: { name: 'Tiếng Anh', correct: 0, wrong: 0, unanswered: 0, total: 0, pct: 0 },
      [VACT_SECTIONS.MATH]: { name: 'Toán học', correct: 0, wrong: 0, unanswered: 0, total: 0, pct: 0 },
      [VACT_SECTIONS.LOGIC_DATA]: { name: 'Tư duy logic & Phân tích số liệu', correct: 0, wrong: 0, unanswered: 0, total: 0, pct: 0 },
      [VACT_SECTIONS.SCIENTIFIC_REASONING]: { name: 'Suy luận khoa học', correct: 0, wrong: 0, unanswered: 0, total: 0, pct: 0 }
    };

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const num = q.num || q.examIndex || (i + 1);
      const studentAns = submittedAnswers[num] || submittedAnswers[q.id] || null;

      const item = buildReviewItem(q, studentAns, num);
      reviewData.push(item);

      if (item.status === 'correct') {
        correctCount++;
      } else if (item.status === 'unanswered') {
        unansweredCount++;
      } else {
        incorrectCount++;
      }

      const sec = item.section;
      if (sectionBreakdown[sec]) {
        sectionBreakdown[sec].total++;
        if (item.status === 'correct') {
          sectionBreakdown[sec].correct++;
        } else if (item.status === 'unanswered') {
          sectionBreakdown[sec].unanswered++;
        } else {
          sectionBreakdown[sec].wrong++;
        }
      }
    }

    // Compute section percentages
    for (const key of Object.keys(sectionBreakdown)) {
      const s = sectionBreakdown[key];
      s.pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
    }

    const totalCount = questions.length;
    const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
    const duration = Number(meta.duration) || 0;

    const attemptId = `vact_att_${examOrQuiz.id || Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    return {
      attemptId,
      testId: examOrQuiz.id || `vact_test_${Date.now()}`,
      title: examOrQuiz.title || 'V-ACT Test',
      mode: meta.mode || (totalCount === 120 ? 'full_120' : (totalCount === 100 ? 'mini_100' : 'section_mini')),
      profileId: examOrQuiz.vactMeta?.profileId || (totalCount === 120 ? 'vact_full' : null),
      questionIds: reviewData.map(r => r.questionId),
      answers: submittedAnswers,
      submittedAnswers,
      correctCount,
      incorrectCount,
      unansweredCount,
      totalCount,
      accuracy,
      sectionBreakdown,
      review: reviewData,
      reviewData,
      duration,
      startedAt: meta.startedAt || new Date(Date.now() - duration * 1000).toISOString(),
      submittedAt: new Date().toISOString(),
      studentName: meta.studentName || 'Học Sinh',
      studentClass: meta.studentClass || 'V-ACT',
      studentUid: meta.studentUid || null
    };
  }

  /**
   * Filters review items by status ('all' | 'incorrect' | 'correct' | 'unanswered') and optional section.
   */
  function filterReviewItems(reviewList, filter = 'all', sectionFilter = null) {
    if (!Array.isArray(reviewList)) return [];

    return reviewList.filter(item => {
      if (filter === 'incorrect' && item.status !== 'incorrect') return false;
      if (filter === 'correct' && item.status !== 'correct') return false;
      if (filter === 'unanswered' && item.status !== 'unanswered') return false;
      if (sectionFilter && item.section !== sectionFilter) return false;
      return true;
    });
  }

  /**
   * Generates Question Navigator HTML bar with accessible icons.
   */
  function renderQuestionNavigatorHtml(reviewData, activeNum = null) {
    if (!Array.isArray(reviewData) || reviewData.length === 0) return '';

    let html = `
      <div class="vact-review-navigator" style="display:flex;flex-wrap:wrap;gap:6px;margin:1rem 0;padding:12px;background:var(--bg-tertiary, #f8fafc);border-radius:10px;border:1px solid var(--border-color, #e2e8f0);">
        <div style="width:100%;display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-size:0.84rem;font-weight:700;">
          <span style="color:var(--text-primary, #0f172a);">Mục lục câu hỏi (${reviewData.length} câu):</span>
          <div style="display:flex;gap:12px;font-size:0.75rem;">
            <span style="color:#059669;display:flex;align-items:center;gap:3px;"><strong>✓</strong> Đúng</span>
            <span style="color:#e11d48;display:flex;align-items:center;gap:3px;"><strong>✕</strong> Sai</span>
            <span style="color:#d97706;display:flex;align-items:center;gap:3px;"><strong>○</strong> Chưa làm</span>
          </div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;width:100%;max-height:220px;overflow-y:auto;padding-right:4px;">
    `;

    reviewData.forEach(item => {
      let bg = '#ecfdf5';
      let border = '#10b981';
      let color = '#047857';
      let icon = '✓';

      if (item.status === 'incorrect') {
        bg = '#fff1f2';
        border = '#f43f5e';
        color = '#be123c';
        icon = '✕';
      } else if (item.status === 'unanswered') {
        bg = '#fffbeb';
        border = '#f59e0b';
        color = '#b45309';
        icon = '○';
      }

      const isActive = activeNum === item.num;
      const activeStyle = isActive ? 'box-shadow:0 0 0 2px var(--indigo, #6366f1);font-weight:900;' : '';

      html += `
        <button type="button" class="vact-nav-bubble" onclick="scrollToReviewQuestion(${item.num})"
          title="Câu ${item.num}: ${item.status === 'correct' ? 'Đúng' : (item.status === 'unanswered' ? 'Chưa làm' : 'Sai')}"
          style="width:36px;height:36px;border-radius:6px;border:1.5px solid ${border};background:${bg};color:${color};font-size:0.8rem;font-weight:800;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;line-height:1;${activeStyle}">
          <span>${item.num}</span>
          <span style="font-size:0.6rem;margin-top:1px;">${icon}</span>
        </button>
      `;
    });

    html += `
        </div>
      </div>
    `;

    return html;
  }

  /**
   * Renders the complete, student-facing Question Review Screen.
   *
   * @param {object} attempt Graded attempt object
   * @param {object} [options]
   * @param {string} [options.filter='all'] 'all' | 'incorrect' | 'unanswered' | 'correct'
   * @param {string} [options.sectionFilter=null]
   * @returns {string} HTML string
   */
  function renderVactReviewHtml(attempt, options = {}) {
    if (!attempt || !Array.isArray(attempt.review)) {
      return `<div style="padding:2rem;text-align:center;">Không có dữ liệu xem lại bài thi.</div>`;
    }

    const currentFilter = options.filter || 'all';
    const currentSectionFilter = options.sectionFilter || null;

    const filteredItems = filterReviewItems(attempt.review, currentFilter, currentSectionFilter);
    const navHtml = renderQuestionNavigatorHtml(attempt.review);

    const min = Math.floor(attempt.duration / 60);
    const sec = attempt.duration % 60;
    const timeStr = `${min} phút ${sec} giây`;

    let html = `
      <div class="vact-review-screen" style="max-width:960px;margin:0 auto;font-family:inherit;">
        <!-- 1. HEADER & SUMMARY HERO -->
        <div class="vact-result-hero" style="background:var(--bg-card, #ffffff);border:2px solid var(--indigo, #6366f1);border-radius:12px;padding:20px;margin-bottom:20px;box-shadow:0 6px 20px rgba(99,102,241,0.12);">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;border-bottom:1px solid var(--border-color, #e2e8f0);padding-bottom:12px;margin-bottom:16px;">
            <div>
              <span style="font-size:0.8rem;font-weight:800;color:var(--indigo, #6366f1);text-transform:uppercase;letter-spacing:0.5px;">BÁO CÁO KẾT QUẢ V-ACT</span>
              <h2 style="margin:4px 0 0;font-size:1.6rem;color:var(--text-primary, #0f172a);">${escapeHtml(attempt.title || 'V-ACT')}</h2>
            </div>
            <div style="font-size:0.85rem;color:var(--text-secondary, #64748b);">
              ⏱️ Thời gian: <strong>${timeStr}</strong>
            </div>
          </div>

          <!-- Overall Stats Summary -->
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:10px;margin-bottom:16px;">
            <div style="background:rgba(16,185,129,0.08);border:1px solid #10b981;padding:10px;border-radius:8px;text-align:center;">
              <div style="font-size:1.6rem;font-weight:900;color:#059669;">${attempt.correctCount}</div>
              <div style="font-size:0.75rem;font-weight:800;color:#065f46;">✓ Câu đúng</div>
            </div>
            <div style="background:rgba(244,63,94,0.08);border:1px solid #f43f5e;padding:10px;border-radius:8px;text-align:center;">
              <div style="font-size:1.6rem;font-weight:900;color:#e11d48;">${attempt.incorrectCount}</div>
              <div style="font-size:0.75rem;font-weight:800;color:#9f1239;">✕ Câu sai</div>
            </div>
            <div style="background:rgba(245,158,11,0.08);border:1px solid #f59e0b;padding:10px;border-radius:8px;text-align:center;">
              <div style="font-size:1.6rem;font-weight:900;color:#d97706;">${attempt.unansweredCount}</div>
              <div style="font-size:0.75rem;font-weight:800;color:#92400e;">○ Chưa làm</div>
            </div>
            <div style="background:rgba(99,102,241,0.08);border:1px solid #6366f1;padding:10px;border-radius:8px;text-align:center;">
              <div style="font-size:1.6rem;font-weight:900;color:#4f46e5;">${attempt.accuracy}%</div>
              <div style="font-size:0.75rem;font-weight:800;color:#3730a3;">Độ chính xác</div>
            </div>
          </div>

          <!-- Section Results Cards -->
          <div style="font-weight:800;font-size:0.85rem;color:var(--text-secondary, #64748b);margin-bottom:8px;">KẾT QUẢ THEO TỪNG PHẦN:</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(160px, 1fr));gap:8px;">
    `;

    for (const [secKey, s] of Object.entries(attempt.sectionBreakdown || {})) {
      if (s.total === 0) continue;
      const color = s.pct >= 75 ? '#059669' : (s.pct >= 50 ? '#4f46e5' : '#e11d48');
      html += `
        <div style="background:var(--bg-tertiary, #f8fafc);border:1px solid var(--border-color, #e2e8f0);padding:8px 12px;border-radius:6px;">
          <div style="font-size:0.75rem;font-weight:700;color:var(--text-secondary, #64748b);">${escapeHtml(s.name)}</div>
          <div style="display:flex;justify-content:space-between;align-items:baseline;margin-top:2px;">
            <span style="font-size:1.1rem;font-weight:900;color:var(--text-primary, #0f172a);">${s.correct}/${s.total}</span>
            <span style="font-size:0.8rem;font-weight:800;color:${color};">${s.pct}%</span>
          </div>
        </div>
      `;
    }

    html += `
          </div>
        </div>

        <!-- 2. ACTION BUTTONS & FILTER TOOLBAR -->
        <div class="vact-review-toolbar" style="background:var(--bg-card, #ffffff);border:1px solid var(--border-color, #e2e8f0);border-radius:10px;padding:12px 16px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            <button type="button" class="btn btn-sm ${currentFilter === 'all' ? 'btn-primary' : 'btn-secondary'}" onclick="setVactReviewFilter('all')" style="font-weight:800;border-radius:6px;padding:6px 12px;">
              📋 Xem lại bài (${attempt.totalCount})
            </button>
            <button type="button" class="btn btn-sm ${currentFilter === 'incorrect' ? 'btn-primary' : 'btn-secondary'}" onclick="setVactReviewFilter('incorrect')" style="font-weight:800;border-radius:6px;padding:6px 12px;${currentFilter === 'incorrect' ? 'background:#e11d48;border-color:#e11d48;' : ''}">
              ❌ Xem câu sai (${attempt.incorrectCount})
            </button>
            <button type="button" class="btn btn-sm ${currentFilter === 'unanswered' ? 'btn-primary' : 'btn-secondary'}" onclick="setVactReviewFilter('unanswered')" style="font-weight:800;border-radius:6px;padding:6px 12px;">
              ○ Xem câu chưa làm (${attempt.unansweredCount})
            </button>
          </div>

          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            <button type="button" class="btn btn-sm btn-primary" onclick="handleRetakeSimilarVactTest('${attempt.mode || 'section_mini'}', '${attempt.profileId || ''}')" style="background:#059669;border-color:#059669;font-weight:800;border-radius:6px;padding:6px 14px;">
              🔄 Làm lại bài tương tự
            </button>
            <button type="button" class="btn btn-sm btn-secondary" onclick="returnToVactDashboard()" style="font-weight:800;border-radius:6px;padding:6px 12px;">
              🏠 Quay lại V-ACT
            </button>
          </div>
        </div>

        <!-- 3. QUESTION NAVIGATOR -->
        ${navHtml}

        <!-- 4. QUESTION REVIEW CARDS LIST -->
        <div class="vact-review-cards-list" style="display:flex;flex-direction:column;gap:18px;margin-top:16px;">
    `;

    if (filteredItems.length === 0) {
      html += `
        <div style="padding:2.5rem 1rem;text-align:center;background:var(--bg-card, #ffffff);border:2px dashed var(--border-color, #e2e8f0);border-radius:10px;">
          <div style="font-size:2.5rem;margin-bottom:8px;">🎉</div>
          <div style="font-size:1.1rem;font-weight:800;color:var(--text-primary, #0f172a);">Không có câu hỏi nào trong danh mục này!</div>
        </div>
      `;
    } else {
      filteredItems.forEach(item => {
        const isWrong = item.status === 'incorrect';
        const isUnanswered = item.status === 'unanswered';
        const isCorrect = item.status === 'correct';

        let borderColor = isCorrect ? '#10b981' : (isUnanswered ? '#f59e0b' : '#f43f5e');
        let statusBadge = isCorrect
          ? '<span style="background:#ecfdf5;color:#047857;border:1px solid #10b981;padding:3px 10px;border-radius:999px;font-size:0.8rem;font-weight:900;">✓ Đúng</span>'
          : (isUnanswered
            ? '<span style="background:#fffbeb;color:#b45309;border:1px solid #f59e0b;padding:3px 10px;border-radius:999px;font-size:0.8rem;font-weight:900;">○ Chưa trả lời</span>'
            : '<span style="background:#fff1f2;color:#be123c;border:1px solid #f43f5e;padding:3px 10px;border-radius:999px;font-size:0.8rem;font-weight:900;">✕ Sai</span>');

        html += `
          <div class="vact-review-card" id="review_q_${item.num}" style="background:var(--bg-card, #ffffff);border:1px solid var(--border-color, #e2e8f0);border-left:5px solid ${borderColor};border-radius:10px;padding:18px;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
            <!-- Top meta row -->
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                <span style="font-weight:900;font-size:1.05rem;color:var(--text-primary, #0f172a);">Câu ${item.num}</span>
                <span style="background:rgba(99,102,241,0.12);color:#4338ca;padding:2px 8px;border-radius:4px;font-size:0.75rem;font-weight:800;">${escapeHtml(item.sectionLabel)}</span>
                ${item.skill ? `<span style="background:#f1f5f9;color:#475569;padding:2px 8px;border-radius:4px;font-size:0.75rem;font-weight:700;">${escapeHtml(item.skill)}</span>` : ''}
              </div>
              <div>${statusBadge}</div>
            </div>

            <!-- Stimulus (if present) -->
            ${item.stimulus ? `
              <div class="vact-review-stimulus" style="background:var(--bg-tertiary, #f8fafc);border:1px dashed #cbd5e1;border-radius:8px;padding:12px 16px;margin-bottom:14px;font-size:0.9rem;line-height:1.6;color:var(--text-secondary, #475569);">
                <div style="font-size:0.75rem;font-weight:800;color:var(--indigo, #6366f1);margin-bottom:4px;text-transform:uppercase;">📖 Ngữ liệu / Đoạn trích dẫn:</div>
                ${item.stimulus}
              </div>
            ` : ''}

            <!-- Question Prompt -->
            <div class="vact-review-prompt" style="font-size:0.98rem;font-weight:700;color:var(--text-primary, #0f172a);line-height:1.6;margin-bottom:14px;">
              ${item.question}
            </div>

            <!-- Options with visual states -->
            <div class="vact-review-options" style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px;">
        `;

        const optionLetters = ['A', 'B', 'C', 'D'];
        item.options.forEach((optText, optIdx) => {
          const letter = optionLetters[optIdx] || String.fromCharCode(65 + optIdx);
          const isUserPick = (item.given || '').trim().toUpperCase() === letter;
          const isTarget = item.correctAnswer === letter;

          let bg = 'var(--bg-card, #ffffff)';
          let border = '1px solid var(--border-color, #e2e8f0)';
          let color = 'var(--text-primary, #1e293b)';
          let badge = '';

          if (isUserPick && isTarget) {
            // Selected & correct
            bg = '#ecfdf5';
            border = '2px solid #10b981';
            color = '#047857';
            badge = '<span style="color:#047857;font-weight:900;margin-left:auto;font-size:0.78rem;">✓ (Bạn đã chọn đúng)</span>';
          } else if (isUserPick && !isTarget) {
            // Student wrong answer
            bg = '#fff1f2';
            border = '2px solid #f43f5e';
            color = '#be123c';
            badge = '<span style="color:#be123c;font-weight:900;margin-left:auto;font-size:0.78rem;">✕ (Bạn đã chọn)</span>';
          } else if (isTarget) {
            // Correct answer
            bg = '#f0fdf4';
            border = '2px solid #10b981';
            color = '#047857';
            badge = '<span style="color:#047857;font-weight:900;margin-left:auto;font-size:0.78rem;">🌟 (Đáp án đúng)</span>';
          }

          html += `
            <div style="padding:10px 14px;background:${bg};border:${border};border-radius:8px;display:flex;align-items:center;gap:10px;font-size:0.92rem;color:${color};font-weight:600;">
              <strong style="min-width:24px;">${letter}.</strong>
              <div style="flex:1;">${optText.replace(/^[A-D]\s*[.:)]\s*/i, '')}</div>
              ${badge}
            </div>
          `;
        });

        html += `
            </div>

            <!-- Answer Recap Banner -->
            <div style="background:var(--bg-tertiary, #f8fafc);border-radius:8px;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;font-size:0.88rem;margin-bottom:14px;">
              <div>Bạn chọn: <strong style="color:${isCorrect ? '#059669' : (isUnanswered ? '#d97706' : '#e11d48')};">${escapeHtml(item.given)}</strong></div>
              <div>Đáp án đúng: <strong style="color:#059669;">${escapeHtml(item.correctAnswer)}</strong></div>
              <div>Kết quả: ${statusBadge}</div>
            </div>

            <!-- REAL SOURCE EXPLANATION -->
            <div class="vact-review-explanation" style="margin-bottom:14px;">
              <div style="padding:12px 16px;background:rgba(99,102,241,0.06);border-left:4px solid #6366f1;border-radius:6px;">
                <div style="font-weight:800;font-size:0.85rem;color:#4338ca;margin-bottom:6px;display:flex;align-items:center;gap:6px;">
                  <span>💡</span> <span>LỜI GIẢI CHI TIẾT TỪ TÀI LIỆU NGUỒN:</span>
                </div>
                <div class="vact-explanation-body" style="font-size:0.92rem;line-height:1.6;color:var(--text-primary, #1e293b);">
                  ${item.explanation ? item.explanation : `
                    <div style="color:var(--text-secondary, #64748b);font-style:italic;">
                      Đáp án đúng: <strong>${escapeHtml(item.correctAnswer)}</strong>.<br>
                      Tài liệu nguồn hiện không có lời giải chi tiết.
                    </div>
                  `}
                </div>
              </div>
            </div>

            <!-- SOURCE PROVENANCE FOOTER -->
            <div class="vact-review-source-footer" style="border-top:1px dashed var(--border-color, #e2e8f0);padding-top:8px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;font-size:0.78rem;color:var(--text-secondary, #64748b);">
              <div>
                <span>📚 <strong>Nguồn:</strong> ${escapeHtml(item.friendlySource.displayText)}</span>
              </div>
              <div style="display:flex;gap:8px;align-items:center;">
                <span style="background:#e0e7ff;color:#3730a3;padding:1px 6px;border-radius:4px;font-size:0.72rem;font-weight:700;">PROVENANCE VERIFIED</span>
              </div>
            </div>
          </div>
        `;
      });
    }

    html += `
        </div>
      </div>
    `;

    return html;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  const VACTReviewManager = {
    formatStudentFriendlySource,
    buildReviewItem,
    gradeVactAttempt,
    filterReviewItems,
    renderQuestionNavigatorHtml,
    renderVactReviewHtml
  };

  return VACTReviewManager;
});
