/**
 * KhiemEdu Main Application Controller (Split-Screen, OMR & Essay Photo Grading)
 */

const AppState = {
  activeTab: 'student',
  currentQuiz: null,
  currentQuizId: '',
  studentName: '',
  studentClass: '',
  studentAvatar: '🦊',
  studentAnswers: {}, // { 1: 'A', 2: 'B', 11: '12', 12: 'data:image...' }
  flaggedQuestions: new Set(),
  timerInterval: null,
  secondsLeft: 0,
  totalExamSeconds: 0,
  tabSwitches: 0,
  teacherPdfUrl: null,
  teacherPdfData: null,
  teacherFileName: '',
  teacherAnswerKeys: [],
  leaderboardTimer: null,
  gradingCurrentResult: null
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
    showToast('⚠️ Vui lòng nhập chuỗi đáp án (VD: 1A 2B 3C... hoặc ABCDABCD...)', 'warn');
    return;
  }

  const items = [];
  const regexWithNum = /(\d+)[\s.:-]+([A-D]|Đúng|Sai|TL|\d+)/gi;
  let match;
  let hasNumberedMatches = false;

  while ((match = regexWithNum.exec(raw)) !== null) {
    hasNumberedMatches = true;
    const num = parseInt(match[1], 10);
    const val = match[2].toUpperCase();
    let type = 'mcq';
    if (val === 'ĐÚNG' || val === 'SAI') type = 'truefalse';
    else if (val === 'TL' || val === 'TU_LUAN') type = 'essay_photo';
    else if (!/^[A-D]$/.test(val)) type = 'essay';

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
    showToast('⚠️ Không thể nhận diện được chuỗi đáp án. Hãy nhập dạng: 1A 2B 3C...', 'warn');
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
            <button type="button" class="bubble-btn ${item.correct === opt ? 'selected' : ''}" style="width:30px;height:30px;font-size:0.75rem;" onclick="setTeacherKeyAnswer(${idx}, '${opt}')">${opt}</button>
          `).join('')}
        </div>
      `;
    } else if (item.type === 'truefalse') {
      bodyControls = `
        <div style="display:flex;gap:0.35rem;align-items:center;">
          <button type="button" class="bubble-btn ${item.correct === 'Đúng' ? 'selected' : ''}" style="width:auto;padding:0 8px;height:30px;font-size:0.75rem;" onclick="setTeacherKeyAnswer(${idx}, 'Đúng')">Đúng</button>
          <button type="button" class="bubble-btn ${item.correct === 'Sai' ? 'selected' : ''}" style="width:auto;padding:0 8px;height:30px;font-size:0.75rem;" onclick="setTeacherKeyAnswer(${idx}, 'Sai')">Sai</button>
        </div>
      `;
    } else if (item.type === 'essay') {
      bodyControls = `
        <input type="text" style="width:110px;padding:0.25rem 0.5rem;font-size:0.8rem;" placeholder="Đáp số đúng" value="${escapeHtml(item.correct)}" oninput="setTeacherKeyAnswer(${idx}, this.value)">
      `;
    } else {
      bodyControls = `
        <span style="font-size:0.75rem;color:var(--amber-dark);font-weight:700;background:var(--amber-light);padding:2px 6px;border-radius:4px;">📷 Nộp ảnh bài làm</span>
      `;
    }

    return `
      <div class="key-grid-item">
        <span style="font-weight:700;color:var(--primary);min-width:55px;">Câu ${item.num}:</span>
        <div style="display:flex;gap:0.4rem;align-items:center;">
          ${bodyControls}
          <input type="number" step="0.25" min="0.25" max="10" style="width:55px;padding:0.25rem 0.4rem;font-size:0.8rem;text-align:center;" value="${item.score}" title="Điểm của câu này" onchange="setTeacherKeyScore(${idx}, this.value)">
          <select style="padding:0.2rem 0.35rem;font-size:0.75rem;width:95px;" onchange="changeTeacherKeyType(${idx}, this.value)">
            <option value="mcq" ${item.type === 'mcq' ? 'selected' : ''}>Trắc nghiệm</option>
            <option value="truefalse" ${item.type === 'truefalse' ? 'selected' : ''}>Đúng/Sai</option>
            <option value="essay" ${item.type === 'essay' ? 'selected' : ''}>Điền số</option>
            <option value="essay_photo" ${item.type === 'essay_photo' ? 'selected' : ''}>Tự luận (ảnh)</option>
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
    AppState.teacherAnswerKeys[idx].correct = '10';
  } else if (type === 'essay_photo') {
    AppState.teacherAnswerKeys[idx].correct = '';
    AppState.teacherAnswerKeys[idx].score = 2.0; // Default higher for essay
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
    <div class="card" style="background:var(--emerald-light);border-color:var(--emerald);margin-top:1rem;">
      <h3 style="color:var(--emerald-dark);margin-bottom:0.5rem;">🎉 Đã Phát Hành Đề Thi Thành Công!</h3>
      <p style="color:var(--emerald-dark);font-size:0.95rem;">Cung cấp mã đề này cho học sinh để làm bài trực tiếp trên hệ thống:</p>
      <div style="margin:1rem 0;display:flex;align-items:center;gap:1rem;flex-wrap:wrap;">
        <span class="code-badge" style="font-size:1.6rem;padding:0.5rem 1.2rem;">${id}</span>
        <button class="btn btn-primary btn-sm" onclick="copyToClipboard('${id}')">📋 Sao Chép Mã</button>
        <button class="btn btn-secondary btn-sm" onclick="loadSampleToStudent('${id}')">🚀 Vào Thi Thử Ngay</button>
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

  statusEl.innerHTML = '<span style="color:var(--primary);">Đang tải đề thi & file PDF gốc...</span>';
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
        <div style="font-family:sans-serif;padding:30px;color:#333;line-height:1.6;">
          <h2 style="color:#4f46e5;">📄 ĐỀ KIỂM TRA GIỮA HỌC KỲ I — MÔN TOÁN 8</h2>
          <hr/>
          <h3>I. PHẦN TRẮC NGHIỆM (7.0 điểm)</h3>
          <p><strong>Câu 1:</strong> Đơn thức nào sau đây đồng dạng với đơn thức $-3x^2y$?<br/>A. $2xy$ &nbsp;&nbsp; B. $5x^2y$ &nbsp;&nbsp; C. $-3xy^2$ &nbsp;&nbsp; D. $x^3y$</p>
          <p><strong>Câu 2:</strong> Khai triển hằng đẳng thức $(x + 2)^2$ ta được:<br/>A. $x^2 + 4$ &nbsp;&nbsp; B. $x^2 + 2x + 4$ &nbsp;&nbsp; C. $x^2 + 4x + 4$ &nbsp;&nbsp; D. $x^2 - 4x + 4$</p>
          <p><strong>Câu 3:</strong> Tứ giác có 4 góc bằng nhau là hình vuông. Đúng hay Sai?</p>
          <hr/>
          <h3>II. PHẦN TỰ LUẬN (3.0 điểm)</h3>
          <p><strong>Câu 11 (Điền đáp số):</strong> Tìm $x$ biết: $x^2 - 144 = 0$ ($x > 0$).</p>
          <p><strong>Câu 12 (Tự luận viết tay):</strong> Cho tam giác ABC vuông tại A. Chứng minh định lý Pythagoras và tính độ dài cạnh BC nếu $AB = 6\\text{cm}, AC = 8\\text{cm}$. <em>(Làm bài ra giấy và chụp ảnh tải lên)</em></p>
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
          <span>Câu ${k.num} (${k.score}đ)</span>
          <button type="button" class="btn btn-secondary btn-sm" style="padding:1px 5px;font-size:0.7rem;${isFlagged ? 'background:var(--amber-light);color:var(--amber-dark);' : ''}" onclick="toggleFlagSheet(${k.num})">★</button>
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
        <button type="button" class="bubble-btn ${current === 'Đúng' ? 'selected' : ''}" style="width:auto;padding:0 12px;font-size:0.8rem;" onclick="selectBubbleAnswer(${k.num}, 'Đúng')">Đúng</button>
        <button type="button" class="bubble-btn ${current === 'Sai' ? 'selected' : ''}" style="width:auto;padding:0 12px;font-size:0.8rem;" onclick="selectBubbleAnswer(${k.num}, 'Sai')">Sai</button>
      </div>
    `;
  } else if (k.type === 'essay') {
    const current = AppState.studentAnswers[k.num] || '';
    return `
      <input type="text" class="sheet-essay-input" placeholder="Điền đáp số..." value="${escapeHtml(current)}" oninput="recordSheetEssay(${k.num}, this.value)">
    `;
  } else {
    // Essay Photo Upload
    const photoData = AppState.studentAnswers[k.num];
    return `
      <div class="essay-photo-box">
        <div style="display:flex;align-items:center;gap:0.5rem;">
          <label class="btn btn-secondary btn-sm" style="margin:0;cursor:pointer;">
            <span>📷 Chụp / Tải Ảnh Bài Làm</span>
            <input type="file" accept="image/*" capture="environment" style="display:none;" onchange="handleStudentEssayPhotoUpload(${k.num}, this)">
          </label>
          ${photoData ? '<span style="color:var(--emerald);font-size:0.8rem;font-weight:700;">✅ Đã đính kèm ảnh</span>' : '<span style="color:var(--text-muted);font-size:0.75rem;">(Làm ra giấy rồi chụp)</span>'}
        </div>
        ${photoData ? `<img src="${photoData}" class="essay-photo-preview" onclick="openPhotoZoom('${photoData}')" title="Bấm để phóng to ảnh"/>` : ''}
      </div>
    `;
  }
}

function handleStudentEssayPhotoUpload(num, inputEl) {
  if (!inputEl.files[0]) return;
  const file = inputEl.files[0];
  const reader = new FileReader();
  reader.onload = (e) => {
    AppState.studentAnswers[num] = e.target.result;
    SoundEngine.playCorrect();
    renderStudentAnswerSheet(AppState.currentQuiz.answerKeys);
    showToast(`📷 Đã đính kèm ảnh bài làm câu ${num}`, 'success');
  };
  reader.readAsDataURL(file);
}

function openPhotoZoom(imgSrc) {
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  modal.innerHTML = `
    <div class="modal-card" style="text-align:center;max-width:850px;">
      <h3 style="margin-bottom:0.75rem;">🔍 Xem Ảnh Bài Làm Tự Luận</h3>
      <img src="${imgSrc}" style="max-width:100%;max-height:75vh;border-radius:var(--radius-md);border:1px solid var(--border-color);"/>
      <div style="margin-top:1rem;">
        <button class="btn btn-secondary" onclick="this.closest('.modal-backdrop').remove()">Đóng</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
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
  const progressEl = document.getElementById('sheetProgressText');
  if (progressEl) {
    progressEl.textContent = `Đã làm: ${answered}/${total} câu (${Math.round((answered / total) * 100)}%)`;
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

/* Submit Exam */
async function submitStudentExam(isAuto = false) {
  if (AppState.timerInterval) clearInterval(AppState.timerInterval);
  if (AppState.leaderboardTimer) clearInterval(AppState.leaderboardTimer);

  const quiz = AppState.currentQuiz;
  const keys = quiz.answerKeys || [];
  let autoEarnedScore = 0;
  let correctCount = 0;
  let hasPendingEssay = false;
  const reviewData = [];

  for (const k of keys) {
    const given = AppState.studentAnswers[k.num];
    let isCorrect = false;
    let earned = 0;
    let status = 'graded';

    if (k.type === 'essay_photo') {
      hasPendingEssay = true;
      status = 'pending_teacher';
      earned = 0;
      // Save photo in StorageEngine
      if (given) {
        const photoKey = `photo_${AppState.currentQuizId}_${AppState.studentClass}_${AppState.studentName}_q${k.num}`;
        await StorageEngine.saveSubmissionPhoto(photoKey, given);
      }
    } else {
      isCorrect = checkAnswerMatch(given, k.correct);
      if (isCorrect) {
        correctCount++;
        earned = k.score;
        autoEarnedScore += earned;
      }
    }

    reviewData.push({
      num: k.num,
      type: k.type,
      maxScore: k.score,
      earnedScore: earned,
      status, // 'graded' or 'pending_teacher'
      given: given || '(chưa làm)',
      correctAnswer: k.correct || '(Giáo viên chấm bài)',
      isCorrect,
      teacherFeedback: ''
    });
  }

  const total = keys.length;
  const timeTakenSeconds = AppState.totalExamSeconds - AppState.secondsLeft;

  const resultRecord = {
    quizId: AppState.currentQuizId,
    quizTitle: quiz.title,
    name: AppState.studentName,
    className: AppState.studentClass,
    avatar: AppState.studentAvatar,
    correct: correctCount,
    total,
    autoScore: Math.round(autoEarnedScore * 10) / 10,
    totalScore: Math.round(autoEarnedScore * 10) / 10,
    hasPendingEssay,
    isGradedFully: !hasPendingEssay,
    scorePct: Math.round((autoEarnedScore / 10) * 100),
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

function checkAnswerMatch(given, correct) {
  if (!given || !correct) return false;
  const g = given.toString().trim().toLowerCase().replace(/\s+/g, ' ');
  const c = correct.toString().trim().toLowerCase().replace(/\s+/g, ' ');
  if (g === c) return true;

  const gNum = parseFloat(g.replace(',', '.'));
  const cNum = parseFloat(c.replace(',', '.'));
  if (!isNaN(gNum) && !isNaN(cNum) && Math.abs(gNum - cNum) < 1e-6) return true;

  return false;
}

function renderExamResultHero(result, rewards) {
  document.getElementById('resultScoreVal').textContent = `${result.totalScore}/10`;
  document.getElementById('resultScorePct').textContent = result.hasPendingEssay 
    ? `Điểm trắc nghiệm: ${result.autoScore}đ (Đang chờ chấm tự luận ⏳)`
    : `${result.correct}/${result.total} câu đúng (${result.scorePct}%)`;

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

  container.innerHTML = reviewData.map(r => {
    if (r.type === 'essay_photo') {
      const isGraded = r.status === 'graded';
      return `
        <div class="bubble-q-row" style="padding:0.75rem 0.5rem;border-left:4px solid ${isGraded ? 'var(--emerald)' : 'var(--amber)'};">
          <div class="bubble-q-num">
            <span>Câu ${r.num}:</span>
          </div>
          <div style="flex:1;">
            <div><strong>Tự luận giải chi tiết (Nộp ảnh bài làm):</strong> <span class="badge-status ${isGraded ? 'badge-pass' : 'badge-pending'}">${isGraded ? `Đã chấm: ${r.earnedScore}/${r.maxScore}đ` : '⏳ Đang chờ giáo viên chấm'}</span></div>
            ${r.given && r.given.startsWith('data:image') ? `<div style="margin-top:6px;"><img src="${r.given}" class="essay-photo-preview" onclick="openPhotoZoom('${r.given}')" title="Bấm để xem ảnh bài làm"/></div>` : '<div style="color:var(--rose);font-size:0.85rem;">(Học sinh chưa nộp ảnh bài làm)</div>'}
            ${r.teacherFeedback ? `<div style="margin-top:6px;padding:6px 10px;background:var(--bg-tertiary);border-radius:4px;color:var(--primary);font-size:0.85rem;">📝 <strong>Nhận xét của giáo viên:</strong> ${escapeHtml(r.teacherFeedback)}</div>` : ''}
          </div>
        </div>
      `;
    }

    return `
      <div class="bubble-q-row" style="padding:0.75rem 0.5rem;border-left:4px solid ${r.isCorrect ? 'var(--emerald)' : 'var(--rose)'};">
        <div class="bubble-q-num">
          <span>Câu ${r.num}:</span>
        </div>
        <div>
          Bạn chọn: <strong style="color:${r.isCorrect ? 'var(--emerald)' : 'var(--rose)'};">${escapeHtml(r.given)} ${r.isCorrect ? '✅' : '❌'}</strong>
          ${!r.isCorrect ? `&nbsp;—&nbsp; <span style="color:var(--emerald-dark);font-weight:700;">Đáp án đúng: ${escapeHtml(r.correctAnswer)}</span>` : ''}
        </div>
      </div>
    `;
  }).join('');
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
    <div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px dashed var(--border-color);font-size:0.85rem;">
      <span><strong>#${i + 1}</strong> ${r.avatar || '👤'} ${escapeHtml(r.name)}</span>
      <span style="font-weight:700;color:var(--primary);">${r.totalScore || r.autoScore}đ</span>
    </div>
  `).join('');
}

/* ================= RESULTS & TEACHER ESSAY GRADING MODAL ================= */
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

  const totalSubmissions = filtered.length;
  const avgScore = (filtered.reduce((acc, r) => acc + (r.totalScore || r.autoScore || 0), 0) / totalSubmissions).toFixed(1);
  const highestScore = Math.max(...filtered.map(r => r.totalScore || r.autoScore || 0));
  const passCount = filtered.filter(r => (r.totalScore || r.autoScore || 0) >= 5).length;
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
      <button class="btn btn-success btn-sm" onclick="exportResultsToCsv('${code}')">📥 Xuất Bảng Điểm (CSV / Excel)</button>
    </div>

    ${Object.keys(byClass).map(className => `
      <div class="card">
        <h3 style="color:var(--primary);margin-bottom:1rem;">🏫 Bảng Điểm Lớp ${escapeHtml(className)} (${byClass[className].length} bài)</h3>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Hạng</th>
                <th>Học Sinh</th>
                <th>Tổng Điểm</th>
                <th>Trắc Nghiệm</th>
                <th>Tự Luận</th>
                <th>Thời Gian</th>
                <th>Rời Tab</th>
                <th>Hành Động</th>
              </tr>
            </thead>
            <tbody>
              ${byClass[className].map((r, i) => {
                const hasPhotoEssay = (r.review || []).some(x => x.type === 'essay_photo');
                return `
                  <tr>
                    <td><strong>#${i + 1}</strong></td>
                    <td><strong>${r.avatar || '👤'} ${escapeHtml(r.name)}</strong></td>
                    <td><strong style="color:${(r.totalScore || 0) >= 8 ? 'var(--emerald)' : ((r.totalScore || 0) >= 5 ? 'var(--primary)' : 'var(--rose)')};font-size:1.1rem;">${r.totalScore || 0}đ</strong></td>
                    <td>${r.autoScore || 0}đ</td>
                    <td>
                      ${hasPhotoEssay 
                        ? (r.isGradedFully ? '<span class="badge-status badge-pass">Đã chấm</span>' : '<span class="badge-status badge-pending">Chờ chấm</span>') 
                        : '<span style="color:var(--text-muted);font-size:0.8rem;">(Không có)</span>'}
                    </td>
                    <td>${Math.floor(r.timeTakenSeconds / 60)}p ${r.timeTakenSeconds % 60}s</td>
                    <td>${r.tabSwitches > 0 ? `<span style="color:var(--rose);font-weight:700;">⚠️ ${r.tabSwitches}</span>` : '<span style="color:var(--emerald);">0</span>'}</td>
                    <td>
                      <button class="btn btn-primary btn-sm" onclick="openTeacherGradingModal('${r.key || r.id}')">
                        ${hasPhotoEssay ? '✍️ Chấm Tự Luận' : '👁️ Xem Bài Làm'}
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `).join('')}
  `;
}

/* Open Teacher Grading Desk Modal */
async function openTeacherGradingModal(resultKey) {
  const result = await StorageEngine.get(resultKey.replace('khiemedu_', ''));
  if (!result) {
    showToast('❌ Không tìm thấy thông tin bài thi.', 'error');
    return;
  }
  AppState.gradingCurrentResult = result;
  AppState.gradingCurrentResultKey = resultKey.replace('khiemedu_', '');

  const photoEssays = (result.review || []).filter(r => r.type === 'essay_photo');

  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.id = 'teacherGradingModalBackdrop';
  modal.innerHTML = `
    <div class="modal-card">
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border-color);padding-bottom:0.75rem;margin-bottom:1rem;">
        <div>
          <h2 style="font-size:1.25rem;color:var(--primary);margin:0;">✍️ Bàn Chấm Thi Tự Luận</h2>
          <div style="font-size:0.85rem;color:var(--text-muted);">Học sinh: <strong>${escapeHtml(result.name)}</strong> — Lớp: <strong>${escapeHtml(result.className)}</strong></div>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="document.getElementById('teacherGradingModalBackdrop').remove()">Đóng ✕</button>
      </div>

      <!-- Overview stats -->
      <div style="display:flex;gap:1rem;margin-bottom:1rem;background:var(--bg-tertiary);padding:0.75rem 1rem;border-radius:var(--radius-md);">
        <div>Điểm trắc nghiệm: <strong style="color:var(--primary);">${result.autoScore}đ</strong></div>
        <div>Tổng điểm hiện tại: <strong id="gradingModalTotalScore" style="color:var(--emerald);font-size:1.1rem;">${result.totalScore}đ / 10</strong></div>
      </div>

      <!-- Essay Photo Review List -->
      ${photoEssays.length === 0 ? '<div style="color:var(--text-muted);padding:1rem;">Đề thi này không có câu tự luận nộp ảnh.</div>' : ''}

      ${photoEssays.map((item, idx) => `
        <div class="card" style="margin-bottom:1rem;background:var(--bg-secondary);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
            <strong style="color:var(--primary);font-size:1rem;">Câu ${item.num} (Tối đa ${item.maxScore}đ):</strong>
            <span class="badge-status ${item.status === 'graded' ? 'badge-pass' : 'badge-pending'}">${item.status === 'graded' ? 'Đã chấm' : 'Chưa chấm'}</span>
          </div>

          <div style="margin:0.75rem 0;">
            <label>Ảnh bài làm viết tay của học sinh:</label>
            ${item.given && item.given.startsWith('data:image') 
              ? `<div style="text-align:center;"><img src="${item.given}" style="max-width:100%;max-height:380px;border-radius:var(--radius-md);border:1px solid var(--border-color);cursor:pointer;" onclick="openPhotoZoom('${item.given}')" title="Nhấp vào để phóng to ảnh"/></div>` 
              : '<div style="color:var(--rose);font-weight:600;">Học sinh không nộp ảnh cho câu này.</div>'}
          </div>

          <div class="form-row" style="margin-top:0.75rem;">
            <div class="form-group" style="flex:1;">
              <label>Cho điểm câu ${item.num} (0 - ${item.maxScore}đ):</label>
              <input type="number" id="gradeScoreInput_${item.num}" step="0.25" min="0" max="${item.maxScore}" value="${item.earnedScore || 0}" style="font-weight:700;font-size:1.1rem;color:var(--emerald-dark);">
            </div>
            <div class="form-group" style="flex:2;">
              <label>Lời nhận xét / Bút đỏ của giáo viên:</label>
              <input type="text" id="gradeFeedbackInput_${item.num}" placeholder="VD: Lập luận tốt, bước cuối tính nhầm số..." value="${escapeHtml(item.teacherFeedback || '')}">
            </div>
          </div>
        </div>
      `).join('')}

      <div style="display:flex;justify-content:flex-end;gap:0.75rem;margin-top:1rem;border-top:1px solid var(--border-color);padding-top:1rem;">
        <button class="btn btn-secondary" onclick="document.getElementById('teacherGradingModalBackdrop').remove()">Hủy</button>
        <button class="btn btn-success btn-lg" onclick="saveTeacherEssayGrading()">💾 Lưu Bảng Điểm & Nhận Xét</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

async function saveTeacherEssayGrading() {
  const result = AppState.gradingCurrentResult;
  if (!result) return;

  let newEssayTotalEarned = 0;
  result.review.forEach(item => {
    if (item.type === 'essay_photo') {
      const scoreInput = document.getElementById(`gradeScoreInput_${item.num}`);
      const feedbackInput = document.getElementById(`gradeFeedbackInput_${item.num}`);
      if (scoreInput) {
        const givenScore = Math.min(item.maxScore, Math.max(0, parseFloat(scoreInput.value) || 0));
        item.earnedScore = givenScore;
        item.status = 'graded';
        newEssayTotalEarned += givenScore;
      }
      if (feedbackInput) {
        item.teacherFeedback = feedbackInput.value.trim();
      }
    }
  });

  result.totalScore = Math.round(((result.autoScore || 0) + newEssayTotalEarned) * 10) / 10;
  result.isGradedFully = true;
  result.hasPendingEssay = false;
  result.scorePct = Math.round((result.totalScore / 10) * 100);

  await StorageEngine.updateResult(AppState.gradingCurrentResultKey, result);

  SoundEngine.playFanfare();
  GamificationEngine.fireConfetti();
  showToast(`✅ Đã cập nhật điểm thành công: ${result.totalScore}/10 điểm!`, 'success');

  const modal = document.getElementById('teacherGradingModalBackdrop');
  if (modal) modal.remove();

  loadTeacherResults();
}

function exportResultsToCsv(quizCode) {
  StorageEngine.getResultsByQuiz(quizCode).then(results => {
    if (!results.length) return;
    let csv = '\uFEFF';
    csv += 'Họ Tên,Lớp,Mã Đề,Tổng Điểm /10,Điểm Trắc Nghiệm,Số Câu Đúng,Thời Gian (giây),Số Lần Rời Trang,Thời Gian Nộp\n';
    results.forEach(r => {
      csv += `"${r.name}","${r.className}","${r.quizId}","${r.totalScore || r.autoScore}","${r.autoScore || 0}","${r.correct}","${r.timeTakenSeconds}","${r.tabSwitches}","${r.submittedAt}"\n`;
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
    <div class="card" style="padding:1rem;margin-bottom:0.75rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;">
      <div>
        <div style="font-weight:700;font-size:1rem;">${escapeHtml(q.title)}</div>
        <div style="font-size:0.8rem;color:var(--text-muted);margin-top:2px;">
          Mã Đề: <span class="code-badge" style="font-size:0.85rem;padding:2px 6px;">${q.id}</span> · ${q.totalQuestions || (q.answerKeys ? q.answerKeys.length : 12)} câu (Có tự luận nộp ảnh) · ${q.timeLimit} phút
        </div>
      </div>
      <button class="btn btn-primary btn-sm" onclick="loadSampleToStudent('${q.id}')">Vào Thi Thử Ngay 🚀</button>
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
