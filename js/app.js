/**
 * KhiemEdu Main Application Controller (Gamified EduTech Redesign)
 */

const AppState = {
  activeTab: 'student',
  currentQuiz: null,
  currentQuizId: '',
  studentName: '',
  studentClass: '',
  studentAvatar: '🦊',
  studentAnswers: {},
  flaggedQuestions: new Set(),
  timerInterval: null,
  secondsLeft: 0,
  totalExamSeconds: 0,
  tabSwitches: 0,
  teacherPdfUrl: null,
  teacherPdfData: null,
  teacherFileName: '',
  teacherAnswerKeys: [],
  leaderboardTimer: null
};

document.addEventListener('DOMContentLoaded', async () => {
  await StorageEngine.init();
  SoundEngine.init();
  initTheme();
  updateGamifyBar();
  initAvatars();
  initTeacherAnswerGrid(12);
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
  }
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
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

  const elExams = document.getElementById('statTotalExams');
  const elPerfect = document.getElementById('statPerfectScores');
  const elStreak = document.getElementById('statCurrentStreak');
  if (elExams) elExams.textContent = profile.examsCount || 0;
  if (elPerfect) elPerfect.textContent = profile.perfectCount || 0;
  if (elStreak) elStreak.textContent = `${profile.streak || 1} Ngày`;

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
    <button type="button" class="btn btn-secondary btn-sm ${a === current ? 'active' : ''}" style="font-size:1.35rem;padding:0.35rem 0.75rem;border-radius:var(--radius-md);" onclick="selectAvatar('${a}')">${a}</button>
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

/* ================= TEACHER: PDF & QUICK ANSWER KEY GENERATION ================= */
function handleTeacherPdfSelect() {
  const fileInput = document.getElementById('teacherPdfFileInput');
  if (!fileInput.files[0]) return;

  const file = fileInput.files[0];
  AppState.teacherFileName = file.name;

  if (AppState.teacherPdfUrl) URL.revokeObjectURL(AppState.teacherPdfUrl);
  AppState.teacherPdfUrl = URL.createObjectURL(file);
  document.getElementById('teacherPdfPreviewFrame').src = AppState.teacherPdfUrl;
  document.getElementById('teacherPdfPreviewWrapper').classList.remove('hidden');

  const reader = new FileReader();
  reader.onload = (e) => {
    AppState.teacherPdfData = e.target.result;
  };
  reader.readAsDataURL(file);

  showToast(`📄 Đã tải file đề: ${file.name}`, 'success');
  SoundEngine.playCorrect();
}

function setQuickQuestionCount(count) {
  initTeacherAnswerGrid(count);
  SoundEngine.playClick();
}

function initTeacherAnswerGrid(count) {
  const num = parseInt(count, 10) || 12;
  const defaultScore = Math.round((10 / num) * 100) / 100;
  
  AppState.teacherAnswerKeys = [];
  for (let i = 1; i <= num; i++) {
    AppState.teacherAnswerKeys.push({
      num: i,
      type: 'mcq',
      correct: 'A',
      score: defaultScore
    });
  }
  renderTeacherAnswerKeyGrid();
}

function parseFastAnswerString() {
  const raw = document.getElementById('fastAnswerStringInput').value.trim();
  if (!raw) {
    showToast('⚠️ Vui lòng nhập chuỗi đáp án (VD: 1A 2B 3C 4D 5:12 6:2.5 hoặc ABCD...)', 'warn');
    return;
  }

  const items = [];
  const regexWithNum = /(\d+)[\s.:-]+([A-D]|Đúng|Sai|[^\s,]+)/gi;
  let match;
  let hasNumberedMatches = false;

  while ((match = regexWithNum.exec(raw)) !== null) {
    hasNumberedMatches = true;
    const num = parseInt(match[1], 10);
    const val = match[2].trim();
    let type = 'mcq';
    if (val.toUpperCase() === 'ĐÚNG' || val.toUpperCase() === 'SAI') type = 'truefalse';
    else if (!/^[A-D]$/i.test(val)) type = 'essay';

    items.push({ num, type, correct: val, score: 0.5 });
  }

  if (!hasNumberedMatches) {
    const letters = raw.toUpperCase().replace(/[^A-D]/g, '').split('');
    if (letters.length > 0) {
      letters.forEach((l, idx) => {
        items.push({ num: idx + 1, type: 'mcq', correct: l, score: 0.5 });
      });
    }
  }

  if (items.length === 0) {
    showToast('⚠️ Không thể nhận diện được chuỗi đáp án. Hãy nhập dạng: 1A 2B 3:12 4:2.5...', 'warn');
    return;
  }

  items.sort((a, b) => a.num - b.num);
  const perScore = Math.round((10 / items.length) * 100) / 100;
  items.forEach(it => it.score = perScore);

  AppState.teacherAnswerKeys = items;
  renderTeacherAnswerKeyGrid();
  showToast(`✅ Đã nhận diện thành công ${items.length} câu đáp án!`, 'success');
  SoundEngine.playCorrect();
}

function renderTeacherAnswerKeyGrid() {
  const container = document.getElementById('teacherAnswerKeyGrid');
  if (!container) return;

  container.innerHTML = AppState.teacherAnswerKeys.map((item, idx) => {
    let bodyControls = '';
    if (item.type === 'mcq') {
      bodyControls = `
        <div style="display:flex;gap:0.35rem;align-items:center;">
          ${['A','B','C','D'].map(opt => `
            <button type="button" class="bubble-btn ${item.correct.toUpperCase() === opt ? 'selected' : ''}" style="width:34px;height:34px;font-size:0.85rem;" onclick="setTeacherKeyAnswer(${idx}, '${opt}')">${opt}</button>
          `).join('')}
        </div>
      `;
    } else if (item.type === 'truefalse') {
      bodyControls = `
        <div style="display:flex;gap:0.35rem;align-items:center;">
          <button type="button" class="bubble-btn ${item.correct === 'Đúng' ? 'selected' : ''}" style="width:auto;padding:0 10px;height:34px;font-size:0.8rem;" onclick="setTeacherKeyAnswer(${idx}, 'Đúng')">Đúng</button>
          <button type="button" class="bubble-btn ${item.correct === 'Sai' ? 'selected' : ''}" style="width:auto;padding:0 10px;height:34px;font-size:0.8rem;" onclick="setTeacherKeyAnswer(${idx}, 'Sai')">Sai</button>
        </div>
      `;
    } else {
      bodyControls = `
        <input type="text" style="width:130px;padding:0.35rem 0.6rem;font-size:0.85rem;border:2px solid var(--border-color);border-radius:var(--radius-sm);" placeholder="Đáp số" value="${escapeHtml(item.correct)}" oninput="setTeacherKeyAnswer(${idx}, this.value)">
      `;
    }

    return `
      <div class="key-grid-item">
        <span style="font-weight:800;color:var(--indigo);min-width:60px;">Câu ${item.num}:</span>
        <div style="display:flex;gap:0.4rem;align-items:center;">
          ${bodyControls}
          <input type="number" step="0.25" min="0.25" max="10" style="width:60px;padding:0.35rem 0.4rem;font-size:0.85rem;text-align:center;font-weight:700;" value="${item.score}" title="Điểm của câu này" onchange="setTeacherKeyScore(${idx}, this.value)">
          <select style="padding:0.3rem 0.4rem;font-size:0.8rem;width:110px;" onchange="changeTeacherKeyType(${idx}, this.value)">
            <option value="mcq" ${item.type === 'mcq' ? 'selected' : ''}>Trắc nghiệm</option>
            <option value="truefalse" ${item.type === 'truefalse' ? 'selected' : ''}>Đúng/Sai</option>
            <option value="essay" ${item.type === 'essay' ? 'selected' : ''}>Điền đáp số</option>
          </select>
        </div>
      </div>
    `;
  }).join('');

  document.getElementById('teacherTotalQuestionsCount').textContent = `${AppState.teacherAnswerKeys.length} câu`;
}

function setTeacherKeyAnswer(idx, ans) {
  AppState.teacherAnswerKeys[idx].correct = ans;
  renderTeacherAnswerKeyGrid();
  SoundEngine.playClick();
}

function setTeacherKeyScore(idx, score) {
  AppState.teacherAnswerKeys[idx].score = parseFloat(score) || 0.5;
}

function changeTeacherKeyType(idx, type) {
  AppState.teacherAnswerKeys[idx].type = type;
  if (type === 'truefalse') {
    AppState.teacherAnswerKeys[idx].correct = 'Đúng';
  } else if (type === 'essay') {
    AppState.teacherAnswerKeys[idx].correct = '12';
    AppState.teacherAnswerKeys[idx].score = 1.0;
  } else {
    AppState.teacherAnswerKeys[idx].correct = 'A';
  }
  renderTeacherAnswerKeyGrid();
}

function addOneTeacherKeyQuestion() {
  const nextNum = AppState.teacherAnswerKeys.length + 1;
  AppState.teacherAnswerKeys.push({
    num: nextNum,
    type: 'mcq',
    correct: 'A',
    score: 0.5
  });
  renderTeacherAnswerKeyGrid();
  SoundEngine.playClick();
}

function removeOneTeacherKeyQuestion() {
  if (AppState.teacherAnswerKeys.length <= 1) return;
  AppState.teacherAnswerKeys.pop();
  renderTeacherAnswerKeyGrid();
  SoundEngine.playClick();
}

/* Publish Quiz */
async function publishTeacherQuiz() {
  if (!AppState.teacherAnswerKeys.length) {
    showToast('⚠️ Vui lòng thiết lập ít nhất 1 câu hỏi trong bảng đáp án.', 'warn');
    return;
  }

  const id = generateQuizCode();
  const title = document.getElementById('teacherExamTitleInput').value.trim() || 'Đề Kiểm Tra Toán Học';
  const timeLimit = parseInt(document.getElementById('teacherExamTimeLimitInput').value || '45', 10);
  const showLeaderboard = document.getElementById('teacherShowLeaderboardToggle').checked;
  const antiCheat = document.getElementById('teacherAntiCheatToggle').checked;

  const quiz = {
    id,
    title,
    timeLimit,
    totalQuestions: AppState.teacherAnswerKeys.length,
    examMode: 'split_pdf',
    pdfFileName: AppState.teacherFileName || 'De_Thi_Toan.pdf',
    pdfDataUrl: AppState.teacherPdfData || null,
    showLeaderboard,
    antiCheat,
    createdAt: new Date().toISOString(),
    answerKeys: AppState.teacherAnswerKeys
  };

  await StorageEngine.saveQuiz(quiz);
  if (AppState.teacherPdfData) {
    await StorageEngine.savePdfBlob(id, AppState.teacherPdfData);
  }

  SoundEngine.playFanfare();
  GamificationEngine.fireConfetti();

  const resDiv = document.getElementById('publishSuccessResult');
  resDiv.innerHTML = `
    <div class="card" style="background:var(--primary-light);border-color:var(--primary);margin-top:1rem;">
      <h3 style="color:var(--primary-shadow);margin-bottom:0.5rem;">🎉 Đã Phát Hành Đề Thi Thành Công!</h3>
      <p style="color:var(--primary-shadow);font-size:1rem;font-weight:700;">Gửi mã đề này cho học sinh vào làm bài:</p>
      <div style="margin:1rem 0;display:flex;align-items:center;gap:1rem;flex-wrap:wrap;">
        <span class="code-badge" style="font-size:1.8rem;padding:0.6rem 1.4rem;">${id}</span>
        <button class="btn btn-primary" onclick="copyToClipboard('${id}')">📋 Sao Chép Mã</button>
        <button class="btn btn-secondary" onclick="loadSampleToStudent('${id}')">🚀 Vào Thi Thử Ngay</button>
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

/* ================= STUDENT: SPLIT-SCREEN EXAM ARENA ================= */
async function joinStudentQuiz(customCode) {
  const code = (customCode || document.getElementById('studentJoinCode').value).trim().toUpperCase();
  const className = document.getElementById('studentJoinClass').value.trim();
  const name = document.getElementById('studentJoinName').value.trim();
  const statusEl = document.getElementById('joinQuizStatus');

  if (!code || !className || !name) {
    statusEl.innerHTML = '<span style="color:var(--rose);">⚠️ Vui lòng điền đầy đủ Mã Đề, Lớp và Họ Tên học sinh!</span>';
    return;
  }

  statusEl.innerHTML = '<span style="color:var(--indigo);">⏳ Đang nạp đề thi & file PDF...</span>';
  const quiz = await StorageEngine.getQuiz(code);

  if (!quiz) {
    statusEl.innerHTML = '<span style="color:var(--rose);">❌ Không tìm thấy đề thi với mã này. Hãy kiểm tra lại!</span>';
    return;
  }

  const alreadySubmitted = await StorageEngine.hasSubmitted(code, className, name);
  if (alreadySubmitted) {
    statusEl.innerHTML = '<span style="color:var(--amber);">⚠️ Bạn đã hoàn thành và nộp bài cho đề thi này rồi!</span>';
    return;
  }

  let pdfUrl = quiz.pdfDataUrl;
  if (!pdfUrl) {
    const blobData = await StorageEngine.getPdfBlob(code);
    if (blobData) pdfUrl = blobData;
  }

  AppState.currentQuiz = quiz;
  AppState.currentQuizId = code;
  AppState.studentName = name;
  AppState.studentClass = className;
  AppState.studentAnswers = {};
  AppState.flaggedQuestions.clear();
  AppState.tabSwitches = 0;

  const profile = GamificationEngine.getUserProfile();
  profile.name = name;
  GamificationEngine.saveUserProfile(profile);

  document.getElementById('studentJoinSection').classList.add('hidden');
  document.getElementById('studentExamSection').classList.remove('hidden');
  document.getElementById('splitExamExamTitle').textContent = quiz.title;
  document.getElementById('splitExamStudentInfo').textContent = `${name} — Lớp ${className}`;

  const frame = document.getElementById('studentPdfViewerFrame');
  if (pdfUrl) {
    frame.src = pdfUrl;
  } else {
    frame.src = 'about:blank';
    setTimeout(() => {
      frame.contentDocument.body.innerHTML = `
        <div style="font-family:sans-serif;padding:35px;color:#1e293b;line-height:1.7;">
          <h2 style="color:#4f46e5;margin-bottom:8px;">📄 ĐỀ KIỂM TRA GIỮA HỌC KỲ I — MÔN TOÁN 8</h2>
          <hr style="border:1px solid #cbd5e1;margin-bottom:20px;"/>
          <h3 style="color:#0f172a;">I. PHẦN TRẮC NGHIỆM (7.0 điểm)</h3>
          <p><strong>Câu 1:</strong> Đơn thức nào sau đây đồng dạng với đơn thức $-3x^2y$?<br/>A. $2xy$ &nbsp;&nbsp;&nbsp; B. $5x^2y$ &nbsp;&nbsp;&nbsp; C. $-3xy^2$ &nbsp;&nbsp;&nbsp; D. $x^3y$</p>
          <p><strong>Câu 2:</strong> Khai triển hằng đẳng thức $(x + 2)^2$ ta được:<br/>A. $x^2 + 4$ &nbsp;&nbsp;&nbsp; B. $x^2 + 2x + 4$ &nbsp;&nbsp;&nbsp; C. $x^2 + 4x + 4$ &nbsp;&nbsp;&nbsp; D. $x^2 - 4x + 4$</p>
          <p><strong>Câu 3:</strong> Tứ giác có 4 góc bằng nhau là hình vuông. Đúng hay Sai?</p>
          <p><strong>Câu 4:</strong> Tính giá trị của biểu thức $P = \\sqrt{16} + \\sqrt[3]{27} - 2^3$:<br/>A. -1 &nbsp;&nbsp;&nbsp; B. 1 &nbsp;&nbsp;&nbsp; C. 7 &nbsp;&nbsp;&nbsp; D. 15</p>
          <hr style="border:1px solid #cbd5e1;margin:25px 0;"/>
          <h3 style="color:#0f172a;">II. PHẦN TỰ LUẬN ĐIỀN ĐÁP SỐ (3.0 điểm)</h3>
          <p><strong>Câu 11:</strong> Tìm $x$ dương biết $x^2 - 144 = 0$. <em>(Nhập số 12 hoặc x = 12 vào ô bên phải)</em></p>
          <p><strong>Câu 12:</strong> Tính giá trị phân số $\\frac{1}{4} + 0.25$. <em>(Nhập số 0.5 hoặc 1/2)</em></p>
        </div>
      `;
    }, 200);
  }

  renderStudentAnswerSheet(quiz.answerKeys || []);

  AppState.totalExamSeconds = quiz.timeLimit * 60;
  startExamTimer(AppState.totalExamSeconds);

  if (quiz.showLeaderboard) {
    document.getElementById('splitLiveLeaderboardBox').classList.remove('hidden');
    startLiveLeaderboardPolling(code, className);
  } else {
    document.getElementById('splitLiveLeaderboardBox').classList.add('hidden');
  }

  SoundEngine.playFanfare();
  statusEl.innerHTML = '';
}

function renderStudentAnswerSheet(keys) {
  const container = document.getElementById('studentAnswerSheetBody');
  if (!container) return;

  container.innerHTML = keys.map((k) => {
    const isFlagged = AppState.flaggedQuestions.has(k.num);
    return `
      <div class="bubble-q-row" id="sheetRow_${k.num}">
        <div class="bubble-q-num">
          <span>Câu ${k.num}</span>
          <button type="button" class="flag-star-btn ${isFlagged ? 'flagged' : ''}" onclick="toggleFlagSheet(${k.num})" title="Đánh dấu phân vân">★</button>
        </div>
        ${renderSheetInputs(k)}
      </div>
    `;
  }).join('');

  updateSheetProgress();
}

function renderSheetInputs(k) {
  if (k.type === 'mcq') {
    const current = AppState.studentAnswers[k.num];
    return `
      <div class="bubble-options-group">
        ${['A', 'B', 'C', 'D'].map(opt => `
          <button type="button" class="bubble-btn ${current === opt ? 'selected' : ''}" onclick="selectBubbleAnswer(${k.num}, '${opt}')">${opt}</button>
        `).join('')}
      </div>
    `;
  } else if (k.type === 'truefalse') {
    const current = AppState.studentAnswers[k.num];
    return `
      <div class="bubble-options-group">
        <button type="button" class="bubble-btn ${current === 'Đúng' ? 'selected' : ''}" style="width:auto;padding:0 14px;font-size:0.9rem;" onclick="selectBubbleAnswer(${k.num}, 'Đúng')">Đúng</button>
        <button type="button" class="bubble-btn ${current === 'Sai' ? 'selected' : ''}" style="width:auto;padding:0 14px;font-size:0.9rem;" onclick="selectBubbleAnswer(${k.num}, 'Sai')">Sai</button>
      </div>
    `;
  } else {
    const current = AppState.studentAnswers[k.num] || '';
    return `
      <div style="flex:1;max-width:220px;">
        <input type="text" class="sheet-essay-input" placeholder="Điền đáp số (VD: 12)..." value="${escapeHtml(current)}" oninput="recordSheetEssay(${k.num}, this.value)">
      </div>
    `;
  }
}

function selectBubbleAnswer(num, opt) {
  AppState.studentAnswers[num] = opt;
  SoundEngine.playClick();
  renderStudentAnswerSheet(AppState.currentQuiz.answerKeys);
}

function recordSheetEssay(num, val) {
  AppState.studentAnswers[num] = val;
  updateSheetProgress();
}

function toggleFlagSheet(num) {
  if (AppState.flaggedQuestions.has(num)) {
    AppState.flaggedQuestions.delete(num);
  } else {
    AppState.flaggedQuestions.add(num);
  }
  SoundEngine.playClick();
  renderStudentAnswerSheet(AppState.currentQuiz.answerKeys);
}

function updateSheetProgress() {
  if (!AppState.currentQuiz) return;
  const total = AppState.currentQuiz.answerKeys.length;
  const answered = Object.values(AppState.studentAnswers).filter(v => v !== undefined && v !== '').length;
  const pct = total ? Math.round((answered / total) * 100) : 0;
  
  const progressEl = document.getElementById('sheetProgressText');
  if (progressEl) {
    progressEl.textContent = `Đã làm: ${answered}/${total} câu (${pct}%)`;
  }
  const fillBar = document.getElementById('examProgressFillBar');
  if (fillBar) {
    fillBar.style.width = `${pct}%`;
  }
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
  const timerBox = document.getElementById('splitExamTimerBox');
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
      const banner = document.getElementById('splitExamCheatBanner');
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
      showToast('⚠️ Không thể sao chép nội dung trong phòng thi!', 'warn');
    }
  });
}

/* Smart Math Matcher */
function checkAnswerMatch(given, correct) {
  if (!given || !correct) return false;
  
  const gRaw = given.toString().trim();
  const cRaw = correct.toString().trim();

  const acceptableList = cRaw.split(/[|;]/).map(s => s.trim()).filter(Boolean);
  
  for (const target of acceptableList) {
    if (matchSingleAnswer(gRaw, target)) {
      return true;
    }
  }

  return false;
}

function matchSingleAnswer(gStr, cStr) {
  const g = gStr.toLowerCase().replace(/\s+/g, '');
  const c = cStr.toLowerCase().replace(/\s+/g, '');

  if (g === c) return true;

  const gStrippedVar = g.replace(/^[a-z]=[=]?/, '');
  const cStrippedVar = c.replace(/^[a-z]=[=]?/, '');
  if (gStrippedVar === cStrippedVar) return true;

  const gNum = parseMathNumber(gStr);
  const cNum = parseMathNumber(cStr);

  if (gNum !== null && cNum !== null) {
    if (Math.abs(gNum - cNum) < 1e-5) return true;
  }

  const gFrac = parseFraction(gStr);
  const cFrac = parseFraction(cStr);
  if (gFrac !== null && cFrac !== null) {
    if (Math.abs(gFrac - cFrac) < 1e-5) return true;
  }
  if (gFrac !== null && cNum !== null) {
    if (Math.abs(gFrac - cNum) < 1e-5) return true;
  }
  if (gNum !== null && cFrac !== null) {
    if (Math.abs(gNum - cFrac) < 1e-5) return true;
  }

  return false;
}

function parseMathNumber(str) {
  if (!str) return null;
  const clean = str.trim().replace(',', '.').replace(/^[a-z]\s*=\s*/i, '');
  if (/^-?\d+(\.\d+)?$/.test(clean)) {
    const val = parseFloat(clean);
    return isNaN(val) ? null : val;
  }
  return null;
}

function parseFraction(str) {
  if (!str) return null;
  const clean = str.trim().replace(/^[a-z]\s*=\s*/i, '');
  const match = clean.match(/^(-?\d+)\s*\/\s*(\d+)$/);
  if (match) {
    const num = parseInt(match[1], 10);
    const den = parseInt(match[2], 10);
    if (den !== 0) return num / den;
  }
  return null;
}

/* Submit Exam */
async function submitStudentExam(isAuto = false) {
  if (AppState.timerInterval) clearInterval(AppState.timerInterval);
  if (AppState.leaderboardTimer) clearInterval(AppState.leaderboardTimer);

  const quiz = AppState.currentQuiz;
  const keys = quiz.answerKeys || [];
  let totalEarnedScore = 0;
  let correctCount = 0;
  const reviewData = [];

  for (const k of keys) {
    const given = AppState.studentAnswers[k.num];
    const isCorrect = checkAnswerMatch(given, k.correct);
    let earned = 0;

    if (isCorrect) {
      correctCount++;
      earned = k.score;
      totalEarnedScore += earned;
    }

    reviewData.push({
      num: k.num,
      type: k.type,
      maxScore: k.score,
      earnedScore: earned,
      given: given || '(chưa điền)',
      correctAnswer: k.correct,
      isCorrect
    });
  }

  const total = keys.length;
  const finalScore10 = Math.round(totalEarnedScore * 10) / 10;
  const scorePct = Math.round((totalEarnedScore / 10) * 100);
  const timeTakenSeconds = AppState.totalExamSeconds - AppState.secondsLeft;

  const resultRecord = {
    quizId: AppState.currentQuizId,
    quizTitle: quiz.title,
    name: AppState.studentName,
    className: AppState.studentClass,
    avatar: AppState.studentAvatar,
    correct: correctCount,
    total,
    totalScore: finalScore10,
    scorePct,
    timeTakenSeconds,
    tabSwitches: AppState.tabSwitches,
    isAuto,
    submittedAt: new Date().toISOString(),
    review: reviewData
  };

  const savedKey = await StorageEngine.saveResult(resultRecord);
  resultRecord.key = savedKey;

  const rewards = GamificationEngine.awardExamRewards(resultRecord);
  updateGamifyBar();

  document.getElementById('studentExamSection').classList.add('hidden');
  document.getElementById('studentResultSection').classList.remove('hidden');

  renderExamResultHero(resultRecord, rewards);
  renderExamReviewList(reviewData);

  SoundEngine.playFanfare();
  GamificationEngine.fireConfetti();
}

function renderExamResultHero(result, rewards) {
  document.getElementById('resultScoreVal').textContent = `${result.totalScore}/10`;
  document.getElementById('resultScorePct').textContent = `${result.correct}/${result.total} câu đúng (${result.scorePct}%)`;
  document.getElementById('resultXpGained').textContent = `+${rewards.xpGained} XP`;
  document.getElementById('resultStreakCount').textContent = `${rewards.streak} Ngày 🔥`;
  document.getElementById('resultTabSwitches').textContent = result.tabSwitches;

  const min = Math.floor(result.timeTakenSeconds / 60);
  const sec = result.timeTakenSeconds % 60;
  document.getElementById('resultTimeTaken').textContent = `${min}p ${sec}s`;

  const badgeBox = document.getElementById('resultNewlyUnlockedBadges');
  if (rewards.newlyUnlocked && rewards.newlyUnlocked.length) {
    badgeBox.innerHTML = `
      <div class="card" style="background:var(--amber-light);border-color:var(--amber);margin:1rem 0;text-align:center;">
        <h3 style="color:var(--amber-shadow);font-size:1.3rem;">🎉 Mở Khóa Huy Hiệu Mới!</h3>
        <div style="display:flex;justify-content:center;gap:1.5rem;margin-top:0.75rem;">
          ${rewards.newlyUnlocked.map(b => `
            <div>
              <div style="font-size:2.8rem;">${b.icon}</div>
              <div style="font-weight:800;color:var(--amber-shadow);">${escapeHtml(b.name)}</div>
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
    <div class="bubble-q-row" style="padding:0.85rem 0.75rem;border-left:5px solid ${r.isCorrect ? 'var(--primary)' : 'var(--rose)'};">
      <div class="bubble-q-num">
        <span>Câu ${r.num} (${r.maxScore}đ):</span>
      </div>
      <div>
        Bạn điền: <strong style="color:${r.isCorrect ? 'var(--primary-shadow)' : 'var(--rose)'};font-size:1.05rem;">${escapeHtml(r.given)} ${r.isCorrect ? '✅' : '❌'}</strong>
        ${!r.isCorrect ? `&nbsp;—&nbsp; <span style="color:var(--primary-shadow);font-weight:800;">Đáp án đúng: ${escapeHtml(r.correctAnswer)}</span>` : ''}
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
  const box = document.getElementById('splitLiveLeaderboardList');
  if (!box) return;
  const results = await StorageEngine.getResultsByQuiz(quizId);
  const classResults = results.filter(r => (r.className || '').toLowerCase() === className.toLowerCase());
  classResults.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0) || a.timeTakenSeconds - b.timeTakenSeconds);

  if (!classResults.length) {
    box.innerHTML = '<div style="color:var(--text-muted);font-size:0.85rem;">Chưa có bạn nào nộp bài.</div>';
    return;
  }

  box.innerHTML = classResults.slice(0, 6).map((r, i) => `
    <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px dashed var(--border-color);font-size:0.85rem;font-weight:700;">
      <span><strong>#${i + 1}</strong> ${r.avatar || '👤'} ${escapeHtml(r.name)}</span>
      <span style="font-weight:800;color:var(--indigo);">${r.totalScore}đ</span>
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

  wrap.innerHTML = '<div style="color:var(--indigo);font-weight:700;">⏳ Đang tải bảng điểm lớp học...</div>';
  const results = await StorageEngine.getResultsByQuiz(code);

  if (!results.length) {
    wrap.innerHTML = '<div class="card" style="text-align:center;color:var(--text-muted);font-weight:700;">Chưa có học sinh nào nộp bài cho mã đề này.</div>';
    return;
  }

  let filtered = results;
  if (classFilter) {
    filtered = results.filter(r => (r.className || '').toLowerCase().includes(classFilter.toLowerCase()));
  }

  if (!filtered.length) {
    wrap.innerHTML = '<div class="card" style="text-align:center;color:var(--text-muted);font-weight:700;">Không tìm thấy kết quả phù hợp với lớp đã lọc.</div>';
    return;
  }

  const totalSubmissions = filtered.length;
  const avgScore = (filtered.reduce((acc, r) => acc + (r.totalScore || 0), 0) / totalSubmissions).toFixed(1);
  const highestScore = Math.max(...filtered.map(r => r.totalScore || 0));
  const passCount = filtered.filter(r => (r.totalScore || 0) >= 5).length;
  const passRate = Math.round((passCount / totalSubmissions) * 100);

  const byClass = {};
  filtered.forEach(r => {
    const c = r.className || 'Chưa rõ lớp';
    byClass[c] = byClass[c] || [];
    byClass[c].push(r);
  });

  Object.values(byClass).forEach(arr => arr.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0) || a.timeTakenSeconds - b.timeTakenSeconds));

  wrap.innerHTML = `
    <div class="stats-grid">
      <div class="stat-item"><div class="stat-val">${totalSubmissions}</div><div class="stat-lbl">Học sinh nộp bài</div></div>
      <div class="stat-item"><div class="stat-val">${avgScore}/10</div><div class="stat-lbl">Điểm trung bình</div></div>
      <div class="stat-item"><div class="stat-val">${highestScore}/10</div><div class="stat-lbl">Điểm cao nhất</div></div>
      <div class="stat-item"><div class="stat-val">${passRate}%</div><div class="stat-lbl">Tỷ lệ đạt (>= 5đ)</div></div>
    </div>

    <div style="margin-bottom:1.25rem;display:flex;justify-content:flex-end;">
      <button class="btn btn-success" onclick="exportResultsToCsv('${code}')">📥 Xuất Bảng Điểm (CSV / Excel)</button>
    </div>

    ${Object.keys(byClass).map(className => `
      <div class="card">
        <h3 style="color:var(--indigo);margin-bottom:1rem;">🏫 Bảng Điểm Lớp ${escapeHtml(className)} (${byClass[className].length} bài)</h3>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Hạng</th>
                <th>Học Sinh</th>
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
                  <td><strong style="color:${(r.totalScore || 0) >= 8 ? 'var(--primary-shadow)' : ((r.totalScore || 0) >= 5 ? 'var(--indigo)' : 'var(--rose)')};font-size:1.15rem;">${r.totalScore || 0}đ</strong></td>
                  <td>${r.correct}/${r.total}</td>
                  <td>${Math.floor(r.timeTakenSeconds / 60)}p ${r.timeTakenSeconds % 60}s</td>
                  <td>${r.tabSwitches > 0 ? `<span style="color:var(--rose);font-weight:800;">⚠️ ${r.tabSwitches}</span>` : '<span style="color:var(--primary);">0</span>'}</td>
                  <td>${new Date(r.submittedAt).toLocaleTimeString('vi-VN')}</td>
                  <td><span class="badge-status ${(r.totalScore || 0) >= 5 ? 'badge-pass' : 'badge-fail'}">${(r.totalScore || 0) >= 5 ? 'ĐẠT' : 'CHƯA ĐẠT'}</span></td>
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
    let csv = '\uFEFF';
    csv += 'Họ Tên,Lớp,Mã Đề,Điểm /10,Số Câu Đúng,Tổng Câu,Thời Gian (giây),Số Lần Rời Trang,Thời Gian Nộp\n';
    results.forEach(r => {
      csv += `"${r.name}","${r.className}","${r.quizId}","${r.totalScore}","${r.correct}","${r.total}","${r.timeTakenSeconds}","${r.tabSwitches}","${r.submittedAt}"\n`;
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

/* Sample & Helpers */
async function renderSampleQuizzes() {
  const wrap = document.getElementById('sampleQuizzesList');
  if (!wrap) return;
  const quizzes = await StorageEngine.getAllQuizzes();

  if (!quizzes.length) {
    wrap.innerHTML = '<div style="color:var(--text-muted);font-size:0.9rem;">Chưa có đề thi nào trong thư viện.</div>';
    return;
  }

  wrap.innerHTML = quizzes.map(q => `
    <div class="card" style="padding:1.15rem;margin-bottom:0.85rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;">
      <div>
        <div style="font-weight:800;font-size:1.1rem;color:var(--text-primary);">${escapeHtml(q.title)}</div>
        <div style="font-size:0.85rem;color:var(--text-secondary);margin-top:4px;font-weight:600;">
          Mã Đề: <span class="code-badge" style="font-size:0.9rem;padding:3px 8px;">${q.id}</span> · ${q.totalQuestions || (q.answerKeys ? q.answerKeys.length : 12)} câu · ${q.timeLimit} phút
        </div>
      </div>
      <button class="btn btn-success" onclick="loadSampleToStudent('${q.id}')">Vào Thi Thử Ngay 🚀</button>
    </div>
  `).join('');
}

function loadSampleToStudent(quizId) {
  switchTab('student');
  document.getElementById('studentJoinCode').value = quizId;
  if (!document.getElementById('studentJoinClass').value) {
    document.getElementById('studentJoinClass').value = '8A1';
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
