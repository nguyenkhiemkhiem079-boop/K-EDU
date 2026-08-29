/**
 * KhiemEdu Main Application Controller
 */

// Application State
const AppState = {
  activeTab: 'student',
  currentQuiz: null,
  currentQuizId: '',
  studentName: '',
  studentClass: '',
  studentAvatar: '🦊',
  studentAnswers: {},
  flaggedQuestions: new Set(),
  studentOrder: [],
  timerInterval: null,
  secondsLeft: 0,
  totalExamSeconds: 0,
  tabSwitches: 0,
  extractedQuestions: [],
  pdfUrl: null,
  leaderboardTimer: null
};

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  StorageEngine.init();
  SoundEngine.init();
  initTheme();
  updateGamifyBar();
  initAvatars();
  renderSampleQuizzes();
  renderGamificationTab();
  initAntiCheatListeners();
});

/* ================= THEME & SOUND ================= */
function initTheme() {
  const savedTheme = localStorage.getItem('khiemedu_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('khiemedu_theme', next);
  updateThemeIcon(next);
  SoundEngine.playClick();
}

function updateThemeIcon(theme) {
  const btn = document.getElementById('themeToggleBtn');
  if (btn) btn.innerHTML = theme === 'light' ? '🌙' : '☀️';
}

function toggleSound() {
  const isMuted = SoundEngine.toggleMute();
  const btn = document.getElementById('soundToggleBtn');
  if (btn) btn.innerHTML = isMuted ? '🔇' : '🔊';
  if (!isMuted) SoundEngine.playClick();
}

/* ================= TAB NAVIGATION ================= */
function switchTab(tabId) {
  AppState.activeTab = tabId;
  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  document.querySelectorAll('.view-section').forEach(sec => {
    sec.classList.toggle('active', sec.id === 'tab' + capitalize(tabId));
  });

  SoundEngine.playClick();

  if (tabId === 'gamification') {
    renderGamificationTab();
  } else if (tabId === 'results') {
    loadRecentQuizzesList();
  }
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ================= MATH & LATEX RENDERING ================= */
function renderMath(text) {
  if (!text) return '';
  if (typeof katex === 'undefined') return escapeHtml(text);

  // Replace $$...$$ (display math)
  let processed = text.replace(/\$\$([\s\S]+?)\$\$/g, (match, formula) => {
    try {
      return katex.renderToString(formula, { displayMode: true, throwOnError: false });
    } catch (e) {
      return match;
    }
  });

  // Replace $...$ (inline math)
  processed = processed.replace(/\$([^\$\n]+?)\$/g, (match, formula) => {
    try {
      return katex.renderToString(formula, { displayMode: false, throwOnError: false });
    } catch (e) {
      return match;
    }
  });

  return processed;
}

function escapeHtml(str) {
  return (str || '').replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[m]));
}

/* ================= GAMIFICATION BAR ================= */
function updateGamifyBar() {
  const profile = GamificationEngine.getUserProfile();
  const levelInfo = GamificationEngine.getLevelInfo(profile.xp);

  const streakEl = document.getElementById('topStreakVal');
  const xpEl = document.getElementById('topXpVal');
  const levelEl = document.getElementById('topLevelVal');

  if (streakEl) streakEl.textContent = profile.streak || 1;
  if (xpEl) xpEl.textContent = profile.xp || 0;
  if (levelEl) levelEl.textContent = `Lv.${levelInfo.level} ${levelInfo.name}`;
}

function renderGamificationTab() {
  const profile = GamificationEngine.getUserProfile();
  const levelInfo = GamificationEngine.getLevelInfo(profile.xp);

  const userAvatar = document.getElementById('gamifyUserAvatar');
  const userName = document.getElementById('gamifyUserName');
  const userLevel = document.getElementById('gamifyLevelName');
  const userXpProgress = document.getElementById('gamifyXpProgress');
  const userXpText = document.getElementById('gamifyXpText');

  if (userAvatar) userAvatar.textContent = profile.avatar;
  if (userName) userName.textContent = profile.name;
  if (userLevel) userLevel.textContent = `Cấp ${levelInfo.level}: ${levelInfo.name}`;
  if (userXpProgress) userXpProgress.style.width = `${levelInfo.progress}%`;
  if (userXpText) userXpText.textContent = `${profile.xp} / ${levelInfo.nextXp} XP (${levelInfo.progress}%)`;

  // Stats
  const elExams = document.getElementById('statTotalExams');
  const elPerfect = document.getElementById('statPerfectScores');
  const elStreak = document.getElementById('statCurrentStreak');
  if (elExams) elExams.textContent = profile.examsCount || 0;
  if (elPerfect) elPerfect.textContent = profile.perfectCount || 0;
  if (elStreak) elStreak.textContent = `${profile.streak || 1} Ngày`;

  // Badges
  const badgesContainer = document.getElementById('badgesShowcaseGrid');
  if (badgesContainer) {
    badgesContainer.innerHTML = BADGES_DEFINITIONS.map(b => {
      const isUnlocked = profile.unlockedBadges.includes(b.id);
      return `
        <div class="badge-card ${isUnlocked ? '' : 'locked'}">
          <div class="badge-icon-wrap">${b.icon}</div>
          <div class="badge-name">${escapeHtml(b.name)}</div>
          <div class="badge-desc">${escapeHtml(b.desc)}</div>
          ${isUnlocked ? '<span class="badge-status badge-pass" style="margin-top:6px;">Đã mở khóa</span>' : '<span class="badge-status" style="margin-top:6px;background:var(--bg-card);color:var(--text-muted);">Chưa mở</span>'}
        </div>
      `;
    }).join('');
  }
}

function initAvatars() {
  const avatars = ['🦊', '🦉', '🦁', '🐼', '🚀', '⚡', '🧠', '🌟'];
  const wrap = document.getElementById('avatarSelector');
  if (!wrap) return;
  const current = GamificationEngine.getUserProfile().avatar || '🦊';
  wrap.innerHTML = avatars.map(a => `
    <button type="button" class="btn btn-secondary btn-sm ${a === current ? 'active' : ''}" style="font-size:1.3rem;padding:0.3rem 0.6rem;" onclick="selectAvatar('${a}')">${a}</button>
  `).join('');
}

function selectAvatar(a) {
  AppState.studentAvatar = a;
  const profile = GamificationEngine.getUserProfile();
  profile.avatar = a;
  GamificationEngine.saveUserProfile(profile);
  initAvatars();
  updateGamifyBar();
  SoundEngine.playClick();
}

/* ================= TEACHER: PDF & QUIZ CREATION ================= */
async function handlePdfUpload() {
  const fileInput = document.getElementById('pdfFileInput');
  const statusEl = document.getElementById('pdfExtractStatus');
  const provider = document.getElementById('aiProviderSelect').value;
  const apiKey = document.getElementById('aiApiKeyInput').value.trim();

  if (!fileInput.files[0]) {
    showToast('⚠️ Vui lòng chọn file đề thi PDF trước.', 'warn');
    return;
  }

  const file = fileInput.files[0];
  statusEl.innerHTML = `<span style="color:var(--primary);">⏳ Đang đọc nội dung file PDF: ${escapeHtml(file.name)}...</span>`;
  document.getElementById('startExtractBtn').disabled = true;

  try {
    if (AppState.pdfUrl) URL.revokeObjectURL(AppState.pdfUrl);
    AppState.pdfUrl = URL.createObjectURL(file);
    document.getElementById('pdfPreview').src = AppState.pdfUrl;

    const rawText = await PdfExtractor.extractTextFromPdf(file);
    if (!rawText.trim()) {
      statusEl.innerHTML = '<span style="color:var(--rose);">❌ Không đọc được nội dung chữ từ PDF (có thể là file scan ảnh).</span>';
      document.getElementById('startExtractBtn').disabled = false;
      return;
    }

    statusEl.innerHTML = `<span style="color:var(--primary);">🤖 Đang phân tích câu hỏi (${provider === 'offline' ? 'Bộ nhận diện tích hợp' : provider.toUpperCase()})...</span>`;
    const questions = await PdfExtractor.parseQuestions(rawText, apiKey, provider);

    AppState.extractedQuestions = questions.map((q, idx) => ({
      id: idx + 1,
      type: q.type || 'mcq',
      question: q.question || '',
      options: Array.isArray(q.options) && q.options.length ? q.options : (q.type === 'mcq' ? ['A. ', 'B. ', 'C. ', 'D. '] : []),
      correctAnswer: (q.correctAnswer || '').trim(),
      explanation: q.explanation || ''
    }));

    const missing = AppState.extractedQuestions.filter(q => !q.correctAnswer).length;
    statusEl.innerHTML = missing
      ? `✅ Đã trích xuất ${AppState.extractedQuestions.length} câu hỏi. <strong style="color:var(--rose);">(${missing} câu chưa có đáp án, vui lòng điền ở bảng dưới)</strong>`
      : `✅ Đã trích xuất thành công ${AppState.extractedQuestions.length} câu hỏi kèm đáp án!`;

    renderTeacherQuestionsReview();
    document.getElementById('teacherReviewCard').classList.remove('hidden');
    document.getElementById('teacherPublishCard').classList.remove('hidden');
    SoundEngine.playCorrect();
  } catch (err) {
    console.error(err);
    statusEl.innerHTML = `<span style="color:var(--rose);">❌ Lỗi trích xuất: ${escapeHtml(err.message)}</span>`;
    showToast('Lỗi khi đọc file PDF: ' + err.message, 'error');
  } finally {
    document.getElementById('startExtractBtn').disabled = false;
  }
}

function renderTeacherQuestionsReview() {
  const container = document.getElementById('teacherQuestionsEditList');
  if (!container) return;

  container.innerHTML = AppState.extractedQuestions.map((q, idx) => {
    const isMissing = !q.correctAnswer;
    return `
      <div class="q-card ${isMissing ? 'warning-border' : ''}">
        <div class="q-header">
          <div class="q-badge-num">${idx + 1}</div>
          <div class="q-title-area">
            <label>Nội dung câu hỏi (hỗ trợ công thức Toán trong $ $):</label>
            <textarea oninput="updateTeacherQ(${idx}, 'question', this.value)">${escapeHtml(q.question)}</textarea>
            <div style="margin-top:6px;font-size:0.9rem;padding:6px 10px;background:var(--bg-tertiary);border-radius:var(--radius-sm);border:1px dashed var(--border-color);">
              <span style="font-size:0.75rem;color:var(--text-muted);font-weight:700;">XEM TRƯỚC CÔNG THỨC:</span>
              <div>${renderMath(q.question || '<em>Chưa nhập nội dung</em>')}</div>
            </div>
            ${isMissing ? '<div style="color:var(--rose);font-size:0.8rem;font-weight:700;margin-top:4px;">⚠️ Chưa có đáp án đúng cho câu này</div>' : ''}
          </div>
          <div>
            <select style="width:140px;margin-bottom:6px;" onchange="changeTeacherQType(${idx}, this.value)">
              <option value="mcq" ${q.type === 'mcq' ? 'selected' : ''}>Trắc nghiệm</option>
              <option value="truefalse" ${q.type === 'truefalse' ? 'selected' : ''}>Đúng/Sai</option>
              <option value="essay" ${q.type === 'essay' ? 'selected' : ''}>Điền số/Tự luận</option>
            </select>
            <button type="button" class="btn btn-danger btn-sm" style="width:100%;" onclick="removeTeacherQ(${idx})">Xóa</button>
          </div>
        </div>

        ${renderTeacherOptionsBlock(q, idx)}

        <div style="margin-top:0.75rem;">
          <label>Lời giải chi tiết / Hướng dẫn (tùy chọn):</label>
          <input type="text" value="${escapeHtml(q.explanation)}" placeholder="VD: Áp dụng định lý Pythagoras..." oninput="updateTeacherQ(${idx}, 'explanation', this.value)">
        </div>
      </div>
    `;
  }).join('');

  renderAnswerKeySummaryTable();
}

function renderTeacherOptionsBlock(q, idx) {
  if (q.type === 'mcq') {
    const opts = q.options.length ? q.options : ['A. ', 'B. ', 'C. ', 'D. '];
    return `
      <div style="margin-left:2.5rem;">
        <label>Các phương án lựa chọn:</label>
        ${opts.map((opt, oi) => `
          <div style="display:flex;gap:0.5rem;margin-bottom:0.4rem;align-items:center;">
            <input type="text" value="${escapeHtml(opt)}" oninput="updateTeacherOption(${idx}, ${oi}, this.value)">
          </div>
        `).join('')}
        <div style="margin-top:0.5rem;display:flex;align-items:center;gap:0.5rem;">
          <label style="margin:0;">Đáp án đúng (A/B/C/D):</label>
          <input type="text" style="width:70px;text-transform:uppercase;font-weight:700;" value="${escapeHtml(q.correctAnswer)}" oninput="updateTeacherQ(${idx}, 'correctAnswer', this.value.toUpperCase())">
        </div>
      </div>
    `;
  } else if (q.type === 'truefalse') {
    return `
      <div style="margin-left:2.5rem;">
        <label>Đáp án đúng:</label>
        <select style="width:120px;" onchange="updateTeacherQ(${idx}, 'correctAnswer', this.value)">
          <option value="Đúng" ${q.correctAnswer === 'Đúng' ? 'selected' : ''}>Đúng</option>
          <option value="Sai" ${q.correctAnswer === 'Sai' ? 'selected' : ''}>Sai</option>
        </select>
      </div>
    `;
  } else {
    return `
      <div style="margin-left:2.5rem;">
        <label>Đáp số / Giá trị học sinh cần điền:</label>
        <input type="text" value="${escapeHtml(q.correctAnswer)}" placeholder="VD: 12 hoặc -5.5" oninput="updateTeacherQ(${idx}, 'correctAnswer', this.value)">
      </div>
    `;
  }
}

function renderAnswerKeySummaryTable() {
  const tbody = document.getElementById('answerKeyTableBody');
  if (!tbody) return;
  tbody.innerHTML = AppState.extractedQuestions.map((q, i) => `
    <tr>
      <td><strong>${i + 1}</strong></td>
      <td><span class="q-type-tag">${q.type.toUpperCase()}</span></td>
      <td>${q.correctAnswer ? `<strong style="color:var(--emerald);">${escapeHtml(q.correctAnswer)}</strong>` : '<span style="color:var(--rose);font-weight:700;">Chưa điền</span>'}</td>
    </tr>
  `).join('');
}

function updateTeacherQ(idx, field, val) {
  AppState.extractedQuestions[idx][field] = val;
  renderAnswerKeySummaryTable();
}

function updateTeacherOption(idx, oi, val) {
  AppState.extractedQuestions[idx].options[oi] = val;
}

function changeTeacherQType(idx, newType) {
  AppState.extractedQuestions[idx].type = newType;
  if (newType === 'mcq' && (!AppState.extractedQuestions[idx].options || !AppState.extractedQuestions[idx].options.length)) {
    AppState.extractedQuestions[idx].options = ['A. ', 'B. ', 'C. ', 'D. '];
  }
  renderTeacherQuestionsReview();
}

function removeTeacherQ(idx) {
  AppState.extractedQuestions.splice(idx, 1);
  renderTeacherQuestionsReview();
}

function addBlankQuestion() {
  AppState.extractedQuestions.push({
    id: AppState.extractedQuestions.length + 1,
    type: 'mcq',
    question: 'Câu hỏi mới $x = ?$...',
    options: ['A. ', 'B. ', 'C. ', 'D. '],
    correctAnswer: 'A',
    explanation: ''
  });
  renderTeacherQuestionsReview();
  document.getElementById('teacherReviewCard').classList.remove('hidden');
  document.getElementById('teacherPublishCard').classList.remove('hidden');
  SoundEngine.playClick();
}

async function publishTeacherQuiz() {
  if (!AppState.extractedQuestions.length) {
    showToast('⚠️ Chưa có câu hỏi nào trong đề.', 'warn');
    return;
  }

  const missing = AppState.extractedQuestions.filter(q => !q.correctAnswer.trim());
  if (missing.length) {
    showToast(`⚠️ Còn ${missing.length} câu chưa có đáp án đúng. Vui lòng hoàn thiện trước khi phát hành!`, 'warn');
    return;
  }

  const id = generateQuizCode();
  const quiz = {
    id,
    title: document.getElementById('examTitleInput').value.trim() || 'Đề Kiểm Tra Toán',
    timeLimit: parseInt(document.getElementById('examTimeLimitInput').value || '15', 10),
    shuffle: document.getElementById('shuffleQuestionsToggle').checked,
    showLeaderboard: document.getElementById('showLeaderboardToggle').checked,
    antiCheat: document.getElementById('antiCheatToggle').checked,
    createdAt: new Date().toISOString(),
    questions: AppState.extractedQuestions.map((q, i) => ({ ...q, id: i + 1 }))
  };

  await StorageEngine.saveQuiz(quiz);
  SoundEngine.playFanfare();
  GamificationEngine.fireConfetti();

  const resDiv = document.getElementById('publishSuccessResult');
  resDiv.innerHTML = `
    <div class="card" style="background:var(--emerald-light);border-color:var(--emerald);margin-top:1rem;">
      <h3 style="color:var(--emerald-dark);margin-bottom:0.5rem;">🎉 Đã Phát Hành Đề Thi Thành Công!</h3>
      <p style="color:var(--emerald-dark);font-size:0.95rem;">Gửi mã đề này cho học sinh vào làm bài:</p>
      <div style="margin:1rem 0;display:flex;align-items:center;gap:1rem;flex-wrap:wrap;">
        <span class="code-badge" style="font-size:1.6rem;padding:0.5rem 1.2rem;">${id}</span>
        <button class="btn btn-primary btn-sm" onclick="copyToClipboard('${id}')">📋 Sao Chép Mã</button>
        <button class="btn btn-secondary btn-sm" onclick="loadSampleToStudent('${id}')">🚀 Vào Thi Ngay</button>
      </div>
    </div>
  `;
  resDiv.scrollIntoView({ behavior: 'smooth' });
}

function generateQuizCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

/* ================= STUDENT: EXAM & PRACTICE ================= */
async function joinStudentQuiz(customCode) {
  const code = (customCode || document.getElementById('studentJoinCode').value).trim().toUpperCase();
  const className = document.getElementById('studentJoinClass').value.trim();
  const name = document.getElementById('studentJoinName').value.trim();
  const statusEl = document.getElementById('joinQuizStatus');

  if (!code || !className || !name) {
    statusEl.innerHTML = '<span style="color:var(--rose);">⚠️ Vui lòng điền đầy đủ Mã Đề, Lớp và Họ Tên học sinh!</span>';
    return;
  }

  statusEl.innerHTML = '<span style="color:var(--primary);">Đang tải đề thi...</span>';
  const quiz = await StorageEngine.getQuiz(code);

  if (!quiz) {
    statusEl.innerHTML = '<span style="color:var(--rose);">❌ Không tìm thấy đề thi với mã này. Hãy kiểm tra lại!</span>';
    return;
  }

  const alreadySubmitted = await StorageEngine.hasSubmitted(code, className, name);
  if (alreadySubmitted) {
    statusEl.innerHTML = '<span style="color:var(--amber-dark);">⚠️ Bạn đã hoàn thành và nộp bài cho đề thi này rồi!</span>';
    return;
  }

  // Set App State for exam
  AppState.currentQuiz = quiz;
  AppState.currentQuizId = code;
  AppState.studentName = name;
  AppState.studentClass = className;
  AppState.studentAnswers = {};
  AppState.flaggedQuestions.clear();
  AppState.tabSwitches = 0;

  // Save profile name
  const profile = GamificationEngine.getUserProfile();
  profile.name = name;
  GamificationEngine.saveUserProfile(profile);

  // Prepare questions order
  let order = quiz.questions.map(q => q.id);
  if (quiz.shuffle) {
    order = shuffleArray(order);
  }
  AppState.studentOrder = order;

  // Switch UI
  document.getElementById('studentJoinSection').classList.add('hidden');
  document.getElementById('studentExamSection').classList.remove('hidden');
  document.getElementById('examActiveTitle').textContent = quiz.title;
  document.getElementById('examStudentInfo').textContent = `${name} — Lớp ${className}`;

  renderStudentExamQuestions();
  renderQuestionNavGrid();

  // Timer
  AppState.totalExamSeconds = quiz.timeLimit * 60;
  startExamTimer(AppState.totalExamSeconds);

  // Live Leaderboard
  if (quiz.showLeaderboard) {
    document.getElementById('examLiveLeaderboardBox').classList.remove('hidden');
    startLiveLeaderboardPolling(code, className);
  } else {
    document.getElementById('examLiveLeaderboardBox').classList.add('hidden');
  }

  SoundEngine.playFanfare();
  statusEl.innerHTML = '';
}

function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function renderStudentExamQuestions() {
  const container = document.getElementById('examQuestionsContainer');
  if (!container) return;

  container.innerHTML = AppState.studentOrder.map((qid, idx) => {
    const q = AppState.currentQuiz.questions.find(x => x.id === qid);
    return `
      <div class="q-card" id="examQCard_${qid}">
        <div class="q-header">
          <div class="q-badge-num">${idx + 1}</div>
          <div class="q-title-area">
            <div style="font-size:1.05rem;font-weight:600;line-height:1.6;">
              ${renderMath(q.question)}
            </div>
          </div>
          <button type="button" class="btn btn-secondary btn-sm" id="flagBtn_${qid}" onclick="toggleFlagQuestion(${qid})">
            ★ Đánh dấu
          </button>
        </div>
        ${renderStudentQuestionInput(q, qid)}
      </div>
    `;
  }).join('');
}

function renderStudentQuestionInput(q, qid) {
  if (q.type === 'mcq') {
    return q.options.map(opt => {
      const letter = opt.trim().charAt(0).toUpperCase();
      return `
        <div class="opt-choice-row">
          <label class="opt-radio-label" id="optLabel_${qid}_${letter}">
            <input type="radio" name="student_q_${qid}" value="${letter}" onchange="recordStudentAnswer(${qid}, '${letter}')">
            <span>${renderMath(opt)}</span>
          </label>
        </div>
      `;
    }).join('');
  } else if (q.type === 'truefalse') {
    return `
      <div class="opt-choice-row">
        <label class="opt-radio-label" id="optLabel_${qid}_Dung">
          <input type="radio" name="student_q_${qid}" value="Đúng" onchange="recordStudentAnswer(${qid}, 'Đúng')">
          <span>Đúng</span>
        </label>
      </div>
      <div class="opt-choice-row">
        <label class="opt-radio-label" id="optLabel_${qid}_Sai">
          <input type="radio" name="student_q_${qid}" value="Sai" onchange="recordStudentAnswer(${qid}, 'Sai')">
          <span>Sai</span>
        </label>
      </div>
    `;
  } else {
    return `
      <div class="opt-choice-row">
        <input type="text" placeholder="Nhập đáp án số hoặc biểu thức của bạn..." oninput="recordStudentAnswer(${qid}, this.value)">
      </div>
    `;
  }
}

function recordStudentAnswer(qid, val) {
  AppState.studentAnswers[qid] = val;
  SoundEngine.playClick();
  renderQuestionNavGrid();
}

function toggleFlagQuestion(qid) {
  if (AppState.flaggedQuestions.has(qid)) {
    AppState.flaggedQuestions.delete(qid);
  } else {
    AppState.flaggedQuestions.add(qid);
  }
  const btn = document.getElementById(`flagBtn_${qid}`);
  if (btn) btn.style.background = AppState.flaggedQuestions.has(qid) ? 'var(--amber-light)' : '';
  renderQuestionNavGrid();
  SoundEngine.playClick();
}

function renderQuestionNavGrid() {
  const container = document.getElementById('examQuestionNavGrid');
  if (!container || !AppState.currentQuiz) return;

  container.innerHTML = AppState.studentOrder.map((qid, idx) => {
    const isAnswered = AppState.studentAnswers[qid] !== undefined && AppState.studentAnswers[qid] !== '';
    const isFlagged = AppState.flaggedQuestions.has(qid);
    let classes = 'nav-num-btn';
    if (isAnswered) classes += ' answered';
    if (isFlagged) classes += ' flagged';

    return `
      <button type="button" class="${classes}" onclick="scrollToQuestion(${qid})">${idx + 1}</button>
    `;
  }).join('');
}

function scrollToQuestion(qid) {
  const el = document.getElementById(`examQCard_${qid}`);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/* Timer & Anti Cheat */
function startExamTimer(seconds) {
  AppState.secondsLeft = seconds;
  updateExamTimerUI();

  if (AppState.timerInterval) clearInterval(AppState.timerInterval);
  AppState.timerInterval = setInterval(() => {
    AppState.secondsLeft--;
    updateExamTimerUI();

    if (AppState.secondsLeft <= 60 && AppState.secondsLeft > 0) {
      SoundEngine.playWarning();
    }

    if (AppState.secondsLeft <= 0) {
      clearInterval(AppState.timerInterval);
      submitStudentExam(true);
    }
  }, 1000);
}

function updateExamTimerUI() {
  const m = Math.floor(AppState.secondsLeft / 60);
  const s = AppState.secondsLeft % 60;
  const timerBox = document.getElementById('examTimerBox');
  if (timerBox) {
    timerBox.textContent = `⏱️ ${m}:${String(s).padStart(2, '0')}`;
    timerBox.classList.toggle('timer-warn', AppState.secondsLeft <= 120);
  }
}

function initAntiCheatListeners() {
  document.addEventListener('visibilitychange', () => {
    const examSection = document.getElementById('studentExamSection');
    if (document.hidden && examSection && !examSection.classList.contains('hidden')) {
      AppState.tabSwitches++;
      const banner = document.getElementById('examCheatWarningBanner');
      if (banner) {
        banner.textContent = `⚠️ CẢNH BÁO: Bạn đã rời khỏi trang làm bài ${AppState.tabSwitches} lần! Hệ thống sẽ ghi nhận vào bảng điểm.`;
        banner.classList.remove('hidden');
      }
      SoundEngine.playWarning();
    }
  });

  document.addEventListener('copy', (e) => {
    const examSection = document.getElementById('studentExamSection');
    if (examSection && !examSection.classList.contains('hidden')) {
      e.preventDefault();
      showToast('⚠️ Không thể sao chép nội dung đề thi!', 'warn');
    }
  });
}

/* Submit Exam */
async function submitStudentExam(isAuto = false) {
  if (AppState.timerInterval) clearInterval(AppState.timerInterval);
  if (AppState.leaderboardTimer) clearInterval(AppState.leaderboardTimer);

  const quiz = AppState.currentQuiz;
  let correctCount = 0;
  const reviewData = [];

  quiz.questions.forEach((q, i) => {
    const given = AppState.studentAnswers[q.id];
    const isCorrect = checkAnswerMatch(given, q.correctAnswer);
    if (isCorrect) correctCount++;
    reviewData.push({
      num: i + 1,
      question: q.question,
      given: given || '(chưa trả lời)',
      correctAnswer: q.correctAnswer,
      isCorrect,
      explanation: q.explanation || ''
    });
  });

  const total = quiz.questions.length;
  const scorePct = total ? Math.round((correctCount / total) * 100) : 0;
  const timeTakenSeconds = AppState.totalExamSeconds - AppState.secondsLeft;

  const resultRecord = {
    quizId: AppState.currentQuizId,
    quizTitle: quiz.title,
    name: AppState.studentName,
    className: AppState.studentClass,
    avatar: AppState.studentAvatar,
    correct: correctCount,
    total,
    scorePct,
    timeTakenSeconds,
    tabSwitches: AppState.tabSwitches,
    isAuto,
    submittedAt: new Date().toISOString(),
    review: reviewData
  };

  await StorageEngine.saveResult(resultRecord);

  // Gamification rewards
  const rewards = GamificationEngine.awardExamRewards(resultRecord);
  updateGamifyBar();

  // Show Results UI
  document.getElementById('studentExamSection').classList.add('hidden');
  document.getElementById('studentResultSection').classList.remove('hidden');

  renderExamResultHero(resultRecord, rewards);
  renderExamReviewList(reviewData);

  SoundEngine.playFanfare();
  GamificationEngine.fireConfetti();
}

function checkAnswerMatch(given, correct) {
  if (!given || !correct) return false;
  const g = given.toString().trim().toLowerCase().replace(/\s+/g, ' ');
  const c = correct.toString().trim().toLowerCase().replace(/\s+/g, ' ');
  if (g === c) return true;

  // Numeric equivalence (e.g., 2.5 vs 2,5 or 05 vs 5)
  const gNum = parseFloat(g.replace(',', '.'));
  const cNum = parseFloat(c.replace(',', '.'));
  if (!isNaN(gNum) && !isNaN(cNum) && Math.abs(gNum - cNum) < 1e-6) return true;

  return false;
}

function renderExamResultHero(result, rewards) {
  document.getElementById('resultScoreVal').textContent = `${result.correct}/${result.total}`;
  document.getElementById('resultScorePct').textContent = `${result.scorePct}%`;
  document.getElementById('resultXpGained').textContent = `+${rewards.xpGained} XP`;
  document.getElementById('resultStreakCount').textContent = `${rewards.streak} Ngày 🔥`;
  document.getElementById('resultTabSwitches').textContent = result.tabSwitches;

  const min = Math.floor(result.timeTakenSeconds / 60);
  const sec = result.timeTakenSeconds % 60;
  document.getElementById('resultTimeTaken').textContent = `${min}p ${sec}s`;

  // New Badges Notification
  const badgeBox = document.getElementById('resultNewlyUnlockedBadges');
  if (rewards.newlyUnlocked && rewards.newlyUnlocked.length) {
    badgeBox.innerHTML = `
      <div class="card" style="background:var(--amber-light);border-color:var(--amber);margin:1rem 0;text-align:center;">
        <h3 style="color:var(--amber-dark);">🎉 Mở Khóa Huy Hiệu Mới!</h3>
        <div style="display:flex;justify-content:center;gap:1.5rem;margin-top:0.5rem;">
          ${rewards.newlyUnlocked.map(b => `
            <div>
              <div style="font-size:2.5rem;">${b.icon}</div>
              <div style="font-weight:700;color:var(--amber-dark);">${escapeHtml(b.name)}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    badgeBox.classList.remove('hidden');
  } else {
    badgeBox.classList.add('hidden');
  }
}

function renderExamReviewList(reviewData) {
  const container = document.getElementById('examReviewContainer');
  if (!container) return;

  container.innerHTML = reviewData.map(r => `
    <div class="q-card" style="border-left:4px solid ${r.isCorrect ? 'var(--emerald)' : 'var(--rose)'};">
      <div class="q-header">
        <div class="q-badge-num" style="background:${r.isCorrect ? 'var(--emerald)' : 'var(--rose)'};">${r.num}</div>
        <div class="q-title-area">
          <div style="font-size:1rem;font-weight:600;line-height:1.5;">${renderMath(r.question)}</div>
        </div>
      </div>

      <div style="margin-left:2.5rem;font-size:0.9rem;">
        <div style="margin:0.25rem 0;">
          Câu trả lời của bạn: <strong style="color:${r.isCorrect ? 'var(--emerald)' : 'var(--rose)'};">${renderMath(r.given)} ${r.isCorrect ? '✅' : '❌'}</strong>
        </div>
        ${!r.isCorrect ? `<div style="margin:0.25rem 0;color:var(--emerald-dark);font-weight:600;">Đáp án đúng: ${renderMath(r.correctAnswer)}</div>` : ''}
        ${r.explanation ? `<div style="margin-top:0.5rem;padding:0.5rem 0.75rem;background:var(--bg-tertiary);border-radius:var(--radius-sm);color:var(--text-secondary);">💡 <strong>Lời giải:</strong> ${renderMath(r.explanation)}</div>` : ''}
      </div>
    </div>
  `).join('');
}

/* Live Leaderboard in Exam */
function startLiveLeaderboardPolling(quizId, className) {
  refreshLiveLeaderboard(quizId, className);
  AppState.leaderboardTimer = setInterval(() => refreshLiveLeaderboard(quizId, className), 5000);
}

async function refreshLiveLeaderboard(quizId, className) {
  const box = document.getElementById('examLiveLeaderboardList');
  if (!box) return;
  const results = await StorageEngine.getResultsByQuiz(quizId);
  const classResults = results.filter(r => (r.className || '').toLowerCase() === className.toLowerCase());
  classResults.sort((a, b) => b.scorePct - a.scorePct || a.timeTakenSeconds - b.timeTakenSeconds);

  if (!classResults.length) {
    box.innerHTML = '<div style="color:var(--text-muted);font-size:0.85rem;">Chưa có bạn nào nộp bài.</div>';
    return;
  }

  box.innerHTML = classResults.slice(0, 8).map((r, i) => `
    <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px dashed var(--border-color);font-size:0.85rem;">
      <span><strong>#${i + 1}</strong> ${r.avatar || '👤'} ${escapeHtml(r.name)}</span>
      <span style="font-weight:700;color:var(--primary);">${r.scorePct}%</span>
    </div>
  `).join('');
}

/* ================= RESULTS & GRADEBOOK ================= */
async function loadTeacherResults() {
  const code = document.getElementById('lookupQuizCodeInput').value.trim().toUpperCase();
  const classFilter = document.getElementById('lookupClassFilterInput').value.trim();
  const wrap = document.getElementById('teacherResultsTableWrap');

  if (!code) {
    showToast('⚠️ Vui lòng nhập Mã Đề để tra cứu.', 'warn');
    return;
  }

  wrap.innerHTML = '<div style="color:var(--primary);">Đang tải bảng điểm...</div>';
  const results = await StorageEngine.getResultsByQuiz(code);

  if (!results.length) {
    wrap.innerHTML = '<div class="card" style="text-align:center;color:var(--text-muted);">Chưa có học sinh nào nộp bài cho mã đề này.</div>';
    return;
  }

  let filtered = results;
  if (classFilter) {
    filtered = results.filter(r => (r.className || '').toLowerCase().includes(classFilter.toLowerCase()));
  }

  if (!filtered.length) {
    wrap.innerHTML = '<div class="card" style="text-align:center;color:var(--text-muted);">Không tìm thấy kết quả phù hợp với lớp đã lọc.</div>';
    return;
  }

  // Summary Metrics
  const totalSubmissions = filtered.length;
  const avgScore = Math.round(filtered.reduce((acc, r) => acc + r.scorePct, 0) / totalSubmissions);
  const highestScore = Math.max(...filtered.map(r => r.scorePct));
  const lowestScore = Math.min(...filtered.map(r => r.scorePct));
  const passCount = filtered.filter(r => r.scorePct >= 50).length;
  const passRate = Math.round((passCount / totalSubmissions) * 100);

  // Group by Class
  const byClass = {};
  filtered.forEach(r => {
    const c = r.className || 'Chưa rõ lớp';
    byClass[c] = byClass[c] || [];
    byClass[c].push(r);
  });

  Object.values(byClass).forEach(arr => arr.sort((a, b) => b.scorePct - a.scorePct || a.timeTakenSeconds - b.timeTakenSeconds));

  wrap.innerHTML = `
    <!-- Summary Cards -->
    <div class="stats-grid">
      <div class="stat-item"><div class="stat-val">${totalSubmissions}</div><div class="stat-lbl">Học sinh nộp bài</div></div>
      <div class="stat-item"><div class="stat-val">${avgScore}%</div><div class="stat-lbl">Điểm trung bình</div></div>
      <div class="stat-item"><div class="stat-val">${highestScore}%</div><div class="stat-lbl">Điểm cao nhất</div></div>
      <div class="stat-item"><div class="stat-val">${passRate}%</div><div class="stat-lbl">Tỷ lệ đạt (>= 50%)</div></div>
    </div>

    <!-- Export Action -->
    <div style="margin-bottom:1.5rem;display:flex;justify-content:flex-end;">
      <button class="btn btn-success btn-sm" onclick="exportResultsToCsv('${code}')">📥 Xuất Bảng Điểm (CSV / Excel)</button>
    </div>

    <!-- Class Tables -->
    ${Object.keys(byClass).map(className => `
      <div class="card">
        <h3 style="color:var(--primary);margin-bottom:1rem;">🏫 Bảng Điểm Lớp ${escapeHtml(className)} (${byClass[className].length} bài)</h3>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Hạng</th>
                <th>Họ & Tên</th>
                <th>Điểm Số</th>
                <th>Số Câu Đúng</th>
                <th>Thời Gian</th>
                <th>Rời Tab</th>
                <th>Nộp Lúc</th>
                <th>Trạng Thái</th>
              </tr>
            </thead>
            <tbody>
              ${byClass[className].map((r, i) => `
                <tr>
                  <td><strong>#${i + 1}</strong></td>
                  <td><strong>${r.avatar || '👤'} ${escapeHtml(r.name)}</strong></td>
                  <td><strong style="color:${r.scorePct >= 80 ? 'var(--emerald)' : (r.scorePct >= 50 ? 'var(--primary)' : 'var(--rose)')};">${r.scorePct}%</strong></td>
                  <td>${r.correct}/${r.total}</td>
                  <td>${Math.floor(r.timeTakenSeconds / 60)}p ${r.timeTakenSeconds % 60}s</td>
                  <td>${r.tabSwitches > 0 ? `<span style="color:var(--rose);font-weight:700;">⚠️ ${r.tabSwitches}</span>` : '<span style="color:var(--emerald);">0</span>'}</td>
                  <td>${new Date(r.submittedAt).toLocaleTimeString('vi-VN')}</td>
                  <td><span class="badge-status ${r.scorePct >= 50 ? 'badge-pass' : 'badge-fail'}">${r.scorePct >= 50 ? 'ĐẠT' : 'CHƯA ĐẠT'}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `).join('')}
  `;
}

function exportResultsToCsv(quizCode) {
  StorageEngine.getResultsByQuiz(quizCode).then(results => {
    if (!results.length) return;
    let csv = '\uFEFF'; // UTF-8 BOM
    csv += 'Họ Tên,Lớp,Mã Đề,Điểm %,Số Câu Đúng,Tổng Câu,Thời Gian (giây),Số Lần Rời Trang,Thời Gian Nộp\n';
    results.forEach(r => {
      csv += `"${r.name}","${r.className}","${r.quizId}","${r.scorePct}","${r.correct}","${r.total}","${r.timeTakenSeconds}","${r.tabSwitches}","${r.submittedAt}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BangDiem_${quizCode}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('✅ Đã xuất bảng điểm thành công!', 'success');
  });
}

/* ================= SAMPLE & DEMO HELPERS ================= */
async function renderSampleQuizzes() {
  const wrap = document.getElementById('sampleQuizzesList');
  if (!wrap) return;
  const quizzes = await StorageEngine.getAllQuizzes();

  if (!quizzes.length) {
    wrap.innerHTML = '<div style="color:var(--text-muted);font-size:0.9rem;">Chưa có đề thi nào trong thư viện.</div>';
    return;
  }

  wrap.innerHTML = quizzes.map(q => `
    <div class="card" style="padding:1rem;margin-bottom:0.75rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;">
      <div>
        <div style="font-weight:700;font-size:1rem;">${escapeHtml(q.title)}</div>
        <div style="font-size:0.8rem;color:var(--text-muted);margin-top:2px;">
          Mã Đề: <span class="code-badge" style="font-size:0.85rem;padding:2px 6px;">${q.id}</span> · ${q.questions.length} câu · ${q.timeLimit} phút
        </div>
      </div>
      <button class="btn btn-primary btn-sm" onclick="loadSampleToStudent('${q.id}')">Vào Thi Thử 🚀</button>
    </div>
  `).join('');
}

function loadSampleToStudent(quizId) {
  switchTab('student');
  document.getElementById('studentJoinCode').value = quizId;
  if (!document.getElementById('studentJoinClass').value) {
    document.getElementById('studentJoinClass').value = '10A1';
  }
  if (!document.getElementById('studentJoinName').value) {
    document.getElementById('studentJoinName').value = 'Học Sinh Trải Nghiệm';
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast(`📋 Đã sao chép mã đề: ${text}`, 'success');
  });
}

function showToast(msg, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>${msg}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3500);
}

function restartStudentJoin() {
  document.getElementById('studentResultSection').classList.add('hidden');
  document.getElementById('studentExamSection').classList.add('hidden');
  document.getElementById('studentJoinSection').classList.remove('hidden');
  renderSampleQuizzes();
  SoundEngine.playClick();
}
