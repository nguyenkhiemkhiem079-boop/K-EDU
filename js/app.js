/**
 * KhiemEdu Main Application Controller - Enhanced Math Essay Key Editor & Smart Matcher
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
  batchExamsQueue: [],
  leaderboardTimer: null,
  studentRoster: []
};

document.addEventListener('DOMContentLoaded', async () => {
  await StorageEngine.init();
  SoundEngine.init();
  initTheme();
  updateGamifyBar();
  initAvatars();
  initTeacherAnswerGrid(12);
  await loadStudentRoster();
  initSavedStudentSession();
  renderTeacherQuizManager();
  renderTeacherRosterManager();
  renderAssignTargetsSelector();
  renderGamificationTab();
  initAntiCheatListeners();
});

/* Restore previous student login session if available */
function initSavedStudentSession() {
  const savedProfile = GamificationEngine.getUserProfile();
  if (savedProfile && savedProfile.name) {
    document.getElementById('studentJoinName').value = savedProfile.name;
    document.getElementById('studentJoinClass').value = savedProfile.className || '10';
    if (savedProfile.avatar) selectAvatar(savedProfile.avatar);
    AppState.studentName = savedProfile.name;
    AppState.studentClass = savedProfile.className || '10';
  }
  updatePersonalizedExamFeed();
}

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
  } else if (tabId === 'teacher') {
    renderTeacherQuizManager();
    renderTeacherRosterManager();
    renderAssignTargetsSelector();
  } else if (tabId === 'student') {
    updatePersonalizedExamFeed();
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

/* ================= GAMIFICATION & HALL OF FAME LEADERBOARD ================= */
function updateGamifyBar() {
  const profile = GamificationEngine.getUserProfile();
  const levelInfo = GamificationEngine.getLevelInfo(profile.xp);

  const streakEl = document.getElementById('topStreakVal');
  const xpEl = document.getElementById('topXpVal');
  const levelEl = document.getElementById('topLevelVal');

  if (streakEl) streakEl.textContent = profile.streak || 1;
  if (xpEl) xpEl.textContent = profile.xp || 0;
  if (levelEl) levelEl.textContent = `Lv.${levelInfo.level} ${levelInfo.name.split(' ')[0]}`;
}

async function renderGamificationTab() {
  const profile = GamificationEngine.getUserProfile();
  const levelInfo = GamificationEngine.getLevelInfo(profile.xp);

  const userAvatar = document.getElementById('gamifyUserAvatar');
  const userName = document.getElementById('gamifyUserName');
  const userLevel = document.getElementById('gamifyLevelName');
  const userXpProgress = document.getElementById('gamifyXpProgress');
  const userXpText = document.getElementById('gamifyXpText');

  if (userAvatar) userAvatar.textContent = profile.avatar;
  if (userName) userName.textContent = `${profile.name || 'Học Sinh'} (${profile.className || '10'})`;
  if (userLevel) userLevel.textContent = `Cấp ${levelInfo.level}: ${levelInfo.name}`;
  if (userXpProgress) userXpProgress.style.width = `${levelInfo.progress}%`;
  if (userXpText) userXpText.textContent = `${profile.xp} / ${levelInfo.nextXp} XP (${levelInfo.progress}%)`;

  const elExams = document.getElementById('statTotalExams');
  const elPerfect = document.getElementById('statPerfectScores');
  const elStreak = document.getElementById('statCurrentStreak');
  if (elExams) elExams.textContent = profile.examsCount || 0;
  if (elPerfect) elPerfect.textContent = profile.perfectCount || 0;
  if (elStreak) elStreak.textContent = `${profile.streak || 1} Ngày 🔥`;

  // Render Badges
  const badgesContainer = document.getElementById('badgesShowcaseGrid');
  if (badgesContainer) {
    badgesContainer.innerHTML = BADGES_DEFINITIONS.map(b => {
      const isUnlocked = profile.unlockedBadges.includes(b.id);
      return `
        <div class="badge-card ${isUnlocked ? 'unlocked' : 'locked'}" onclick="${isUnlocked ? 'celebrateConfetti()' : ''}">
          <div class="badge-icon-wrap">${b.icon}</div>
          <div class="badge-name">${escapeHtml(b.name)}</div>
          <div class="badge-desc">${escapeHtml(b.desc)}</div>
          ${isUnlocked ? '<span class="badge-status badge-pass" style="margin-top:8px;">✅ Đã mở khóa</span>' : '<span class="badge-status" style="margin-top:8px;background:var(--bg-card);color:var(--text-muted);">🔒 Chưa mở</span>'}
        </div>
      `;
    }).join('');
  }

  await renderHallOfFamePodium();
}

async function renderHallOfFamePodium() {
  const podiumWrap = document.getElementById('hallOfFamePodiumWrap');
  const listWrap = document.getElementById('hallOfFameListWrap');
  if (!podiumWrap || !listWrap) return;

  const currentProfile = GamificationEngine.getUserProfile();
  const roster = AppState.studentRoster || [];
  const baseScores = [
    { name: 'SURI', className: '10', avatar: '🦊', xp: currentProfile.xp || 520, streak: currentProfile.streak || 4, exams: currentProfile.examsCount || 5 },
    { name: 'TIÊN', className: '12', avatar: '🦉', xp: 680, streak: 6, exams: 7 },
    { name: 'GIANG', className: '8', avatar: '🦁', xp: 750, streak: 7, exams: 8 },
    { name: 'NGHĨA', className: '7', avatar: '🚀', xp: 420, streak: 3, exams: 4 },
    { name: 'MINH', className: '10', avatar: '⚡', xp: 490, streak: 4, exams: 5 }
  ];

  roster.forEach(s => {
    if (!baseScores.some(b => b.name.toLowerCase() === s.name.toLowerCase())) {
      baseScores.push({
        name: s.name,
        className: s.className,
        avatar: s.avatar || '👤',
        xp: 300,
        streak: 2,
        exams: 2
      });
    }
  });

  baseScores.sort((a, b) => (b.xp || 0) - (a.xp || 0));

  const top1 = baseScores[0] || { name: 'Quán Quân', className: '8', avatar: '👑', xp: 750, streak: 7 };
  const top2 = baseScores[1] || { name: 'Á Quân', className: '12', avatar: '🥈', xp: 680, streak: 6 };
  const top3 = baseScores[2] || { name: 'Quý Quân', className: '10', avatar: '🥉', xp: 520, streak: 4 };

  podiumWrap.innerHTML = `
    <div class="podium-wrapper">
      <div class="podium-col rank-2">
        <div class="podium-avatar-wrap"><div class="podium-avatar">${top2.avatar}</div></div>
        <div class="podium-name">${escapeHtml(top2.name)}</div>
        <div class="podium-class">Lớp ${escapeHtml(top2.className)}</div>
        <div class="podium-xp-tag">⭐ ${top2.xp} XP</div>
        <div class="podium-step">2</div>
      </div>

      <div class="podium-col rank-1">
        <div class="podium-avatar-wrap">
          <span class="podium-crown">👑</span>
          <div class="podium-avatar">${top1.avatar}</div>
        </div>
        <div class="podium-name" style="font-size:1.15rem;color:var(--amber-shadow);">${escapeHtml(top1.name)}</div>
        <div class="podium-class">Lớp ${escapeHtml(top1.className)}</div>
        <div class="podium-xp-tag" style="background:var(--amber-light);color:var(--amber-shadow);border-color:var(--amber);">⭐ ${top1.xp} XP 🔥 ${top1.streak}d</div>
        <div class="podium-step">1</div>
      </div>

      <div class="podium-col rank-3">
        <div class="podium-avatar-wrap"><div class="podium-avatar">${top3.avatar}</div></div>
        <div class="podium-name">${escapeHtml(top3.name)}</div>
        <div class="podium-class">Lớp ${escapeHtml(top3.className)}</div>
        <div class="podium-xp-tag">⭐ ${top3.xp} XP</div>
        <div class="podium-step">3</div>
      </div>
    </div>
  `;

  const rest = baseScores.slice(3);
  if (!rest.length) {
    listWrap.innerHTML = '';
    return;
  }

  listWrap.innerHTML = `
    <div class="leaderboard-list">
      ${rest.map((s, idx) => {
        const rank = idx + 4;
        const isUser = s.name.toLowerCase() === currentProfile.name.toLowerCase();
        return `
          <div class="leaderboard-row ${isUser ? 'is-current-user' : ''}">
            <div style="display:flex;align-items:center;gap:0.75rem;">
              <span class="leaderboard-rank-num">#${rank}</span>
              <span class="leaderboard-avatar">${s.avatar}</span>
              <div>
                <strong style="color:var(--text-primary);font-size:1rem;">${escapeHtml(s.name)} ${isUser ? '<span class="badge-status badge-pass" style="font-size:0.7rem;margin-left:4px;">Bạn</span>' : ''}</strong>
                <div style="font-size:0.8rem;color:var(--text-muted);font-weight:700;">Lớp ${escapeHtml(s.className)} · ${s.exams || 1} bài thi</div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:1rem;">
              <span style="font-weight:800;color:#ff9600;font-size:0.9rem;">🔥 ${s.streak || 1} ngày</span>
              <span style="font-weight:900;color:var(--indigo);font-size:1.1rem;">${s.xp} XP</span>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function celebrateConfetti() {
  GamificationEngine.fireConfetti();
  SoundEngine.playFanfare();
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

/* ================= ROSTER MANAGEMENT ================= */
async function loadStudentRoster() {
  AppState.studentRoster = await StorageEngine.getStudentRoster();
}

function renderTeacherRosterManager() {
  const wrap = document.getElementById('teacherRosterManagerWrap');
  if (!wrap) return;

  wrap.innerHTML = `
    <div style="margin-bottom:1rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.75rem;">
      <span style="font-weight:800;color:var(--text-primary);">Tổng số học sinh quản lý: <strong>${AppState.studentRoster.length}</strong></span>
      <button class="btn btn-primary btn-sm" onclick="showAddStudentModal()">+ Thêm Học Sinh Mới</button>
    </div>

    <div class="table-responsive">
      <table>
        <thead>
          <tr>
            <th>Mã HS</th>
            <th>Avatar</th>
            <th>Tên Học Sinh</th>
            <th>Lớp Học</th>
            <th>Thao Tác</th>
          </tr>
        </thead>
        <tbody>
          ${AppState.studentRoster.map((s, idx) => `
            <tr>
              <td><span class="code-badge" style="font-size:0.8rem;padding:2px 6px;">${s.id || 'HS' + (idx + 1)}</span></td>
              <td style="font-size:1.5rem;">${s.avatar || '👤'}</td>
              <td><strong style="color:var(--text-primary);font-size:1rem;">${escapeHtml(s.name)}</strong></td>
              <td><span class="badge-status badge-pass">Lớp ${escapeHtml(s.className)}</span></td>
              <td>
                <button class="btn btn-danger btn-sm" onclick="deleteRosterStudent(${idx})">🗑️ Xóa</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function showAddStudentModal() {
  const name = prompt('Nhập Tên học sinh (VD: SURI, NGHĨA, GIANG...):');
  if (!name || !name.trim()) return;
  const className = prompt('Nhập Lớp học của học sinh (VD: 10, 8, 7, 12...):', '10');
  if (!className || !className.trim()) return;

  const avatars = ['🦊', '🦉', '🦁', '🐼', '🚀', '⚡', '🌟'];
  const randomAvatar = avatars[Math.floor(Math.random() * avatars.length)];

  AppState.studentRoster.push({
    id: name.trim().toUpperCase() + className.trim(),
    name: name.trim().toUpperCase(),
    className: className.trim(),
    avatar: randomAvatar
  });

  StorageEngine.saveStudentRoster(AppState.studentRoster);
  renderTeacherRosterManager();
  renderAssignTargetsSelector();
  updatePersonalizedExamFeed();
  showToast(`✅ Đã thêm học sinh: ${name.trim()} (Lớp ${className.trim()})`, 'success');
  SoundEngine.playCorrect();
}

async function deleteRosterStudent(idx) {
  const stu = AppState.studentRoster[idx];
  if (confirm(`Bạn có chắc muốn xóa học sinh [${stu.name}] khỏi danh bạ?`)) {
    AppState.studentRoster.splice(idx, 1);
    await StorageEngine.saveStudentRoster(AppState.studentRoster);
    renderTeacherRosterManager();
    renderAssignTargetsSelector();
    updatePersonalizedExamFeed();
    showToast('🗑️ Đã xóa học sinh khỏi danh bạ.', 'success');
    SoundEngine.playClick();
  }
}

/* Render Targeted Assignment Options in Step 3 */
function renderAssignTargetsSelector() {
  const typeSelect = document.getElementById('assignTypeSelect');
  if (!typeSelect) return;

  const selectedType = typeSelect.value;
  const classesWrap = document.getElementById('assignClassesBox');
  const studentsWrap = document.getElementById('assignStudentsBox');

  if (selectedType === 'all') {
    classesWrap.classList.add('hidden');
    studentsWrap.classList.add('hidden');
  } else if (selectedType === 'classes') {
    classesWrap.classList.remove('hidden');
    studentsWrap.classList.add('hidden');
    
    const uniqueClasses = [...new Set(AppState.studentRoster.map(s => s.className))];
    const container = document.getElementById('assignClassCheckboxes');
    if (container) {
      container.innerHTML = uniqueClasses.map(c => `
        <label style="display:inline-flex;align-items:center;gap:0.4rem;padding:0.4rem 0.8rem;background:var(--bg-card);border:2px solid var(--border-color);border-radius:var(--radius-md);cursor:pointer;">
          <input type="checkbox" name="assign_class_cb" value="${escapeHtml(c)}" checked style="width:18px;height:18px;">
          <strong>Lớp ${escapeHtml(c)}</strong>
        </label>
      `).join('');
    }
  } else {
    classesWrap.classList.add('hidden');
    studentsWrap.classList.remove('hidden');

    const container = document.getElementById('assignStudentCheckboxes');
    if (container) {
      container.innerHTML = AppState.studentRoster.map(s => `
        <label style="display:inline-flex;align-items:center;gap:0.4rem;padding:0.4rem 0.8rem;background:var(--bg-card);border:2px solid var(--border-color);border-radius:var(--radius-md);cursor:pointer;">
          <input type="checkbox" name="assign_student_cb" value="${escapeHtml(s.name)} (${escapeHtml(s.className)})" checked style="width:18px;height:18px;">
          <span>${s.avatar} <strong>${escapeHtml(s.name)}</strong> (Lớp ${escapeHtml(s.className)})</span>
        </label>
      `).join('');
    }
  }
}

/* ================= BATCH EXAM PUBLISHING ENGINE ================= */
function handleBatchFilesSelect() {
  const fileInput = document.getElementById('batchExamFilesInput');
  if (!fileInput.files || !fileInput.files.length) return;

  const files = Array.from(fileInput.files);
  AppState.batchExamsQueue = [];

  const defaultTimeLimit = parseInt(document.getElementById('batchCommonTimeLimitInput')?.value || '45', 10);
  const defaultNumQuestions = parseInt(document.getElementById('batchCommonQuestionCountSelect')?.value || '12', 10);
  const defaultAssignType = document.getElementById('batchCommonAssignTypeSelect')?.value || 'all';

  let loadedCount = 0;

  files.forEach((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const fileData = e.target.result;
      const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');

      const keys = [];
      const defaultScore = Math.round((10 / defaultNumQuestions) * 100) / 100;
      for (let q = 1; q <= defaultNumQuestions; q++) {
        keys.push({ num: q, type: 'mcq', correct: 'A', score: defaultScore });
      }

      AppState.batchExamsQueue.push({
        id: generateQuizCode(),
        title: cleanTitle,
        timeLimit: defaultTimeLimit,
        totalQuestions: defaultNumQuestions,
        fileName: file.name,
        fileData: fileData,
        answerKeys: keys,
        rawAnswerString: '1A 2B 3C 4D 5A 6B 7C 8D 9A 10B 11:12 12:0.5',
        assignType: defaultAssignType
      });

      loadedCount++;
      if (loadedCount === files.length) {
        renderBatchQueueTable();
        showToast(`📁 Đã nạp thành công ${files.length} đề thi vào hàng chờ phát hành!`, 'success');
        SoundEngine.playCorrect();
      }
    };
    reader.readAsDataURL(file);
  });
}

function renderBatchQueueTable() {
  const wrap = document.getElementById('batchQueueTableWrap');
  const countBadge = document.getElementById('batchQueueCountBadge');
  if (!wrap) return;

  if (countBadge) countBadge.textContent = `${AppState.batchExamsQueue.length} đề`;

  if (!AppState.batchExamsQueue.length) {
    wrap.innerHTML = `
      <div style="text-align:center;padding:2rem;color:var(--text-muted);border:2px dashed var(--border-color);border-radius:var(--radius-lg);">
        <div style="font-size:2.5rem;margin-bottom:0.4rem;">📂</div>
        <p style="font-weight:700;">Chưa có file đề nào trong hàng chờ. Hãy chọn nhiều file PDF / Ảnh ở trên!</p>
      </div>
    `;
    return;
  }

  wrap.innerHTML = `
    <div class="table-responsive" style="margin-top:1rem;">
      <table>
        <thead>
          <tr>
            <th>STT</th>
            <th>Tên Đề Thi</th>
            <th>File Gốc</th>
            <th>Thời Gian</th>
            <th>Chuỗi Đáp Án Nhanh (VD: 1A 2B 3C...)</th>
            <th>Thao Tác</th>
          </tr>
        </thead>
        <tbody>
          ${AppState.batchExamsQueue.map((item, idx) => `
            <tr>
              <td><strong>#${idx + 1}</strong></td>
              <td>
                <input type="text" value="${escapeHtml(item.title)}" style="width:200px;font-size:0.9rem;font-weight:700;" oninput="updateBatchExamTitle(${idx}, this.value)">
              </td>
              <td><span class="badge-status badge-pass" style="font-size:0.75rem;">📄 ${escapeHtml(item.fileName)}</span></td>
              <td>
                <input type="number" value="${item.timeLimit}" min="1" max="180" style="width:70px;text-align:center;font-size:0.9rem;" oninput="updateBatchExamTimeLimit(${idx}, this.value)"> p
              </td>
              <td>
                <div style="display:flex;gap:0.4rem;align-items:center;">
                  <input type="text" placeholder="1A 2B 3C..." value="${escapeHtml(item.rawAnswerString || '')}" style="width:230px;font-size:0.85rem;" oninput="updateBatchExamAnswerString(${idx}, this.value)">
                  <span class="code-badge" style="font-size:0.75rem;padding:2px 6px;">${item.answerKeys.length} câu</span>
                </div>
              </td>
              <td>
                <button class="btn btn-danger btn-sm" onclick="removeBatchExamItem(${idx})">🗑️</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div style="margin-top:1.25rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;">
      <span style="font-weight:800;color:var(--indigo);">Tổng cộng: <strong>${AppState.batchExamsQueue.length} đề thi</strong> sẵn sàng phát hành.</span>
      <button class="btn btn-success btn-lg" onclick="publishAllBatchExams()">🚀 PHÁT HÀNH TẤT CẢ ${AppState.batchExamsQueue.length} ĐỀ THI HÀNG LOẠT</button>
    </div>
  `;
}

function updateBatchExamTitle(idx, val) {
  if (AppState.batchExamsQueue[idx]) AppState.batchExamsQueue[idx].title = val.trim();
}

function updateBatchExamTimeLimit(idx, val) {
  if (AppState.batchExamsQueue[idx]) AppState.batchExamsQueue[idx].timeLimit = parseInt(val, 10) || 45;
}

function updateBatchExamAnswerString(idx, val) {
  const item = AppState.batchExamsQueue[idx];
  if (!item) return;
  item.rawAnswerString = val;

  const raw = val.trim();
  const items = [];
  const regexWithNum = /(\d+)[\s.:-]+([A-D]|Đúng|Sai|[^\s,]+)/gi;
  let match;
  let hasNumberedMatches = false;

  while ((match = regexWithNum.exec(raw)) !== null) {
    hasNumberedMatches = true;
    const num = parseInt(match[1], 10);
    const ansVal = match[2].trim();
    let type = 'mcq';
    if (ansVal.toUpperCase() === 'ĐÚNG' || ansVal.toUpperCase() === 'SAI') type = 'truefalse';
    else if (!/^[A-D]$/i.test(ansVal)) type = 'essay';

    items.push({ num, type, correct: ansVal, score: 0.5 });
  }

  if (!hasNumberedMatches) {
    const letters = raw.toUpperCase().replace(/[^A-D]/g, '').split('');
    if (letters.length > 0) {
      letters.forEach((l, qIdx) => {
        items.push({ num: qIdx + 1, type: 'mcq', correct: l, score: 0.5 });
      });
    }
  }

  if (items.length > 0) {
    items.sort((a, b) => a.num - b.num);
    const perScore = Math.round((10 / items.length) * 100) / 100;
    items.forEach(it => it.score = perScore);
    item.answerKeys = items;
    item.totalQuestions = items.length;
  }
}

function removeBatchExamItem(idx) {
  AppState.batchExamsQueue.splice(idx, 1);
  renderBatchQueueTable();
  SoundEngine.playClick();
}

/* Save all batch exams in storage */
async function publishAllBatchExams() {
  if (!AppState.batchExamsQueue.length) {
    showToast('⚠️ Hàng chờ đang trống. Hãy chọn file đề trước!', 'warn');
    return;
  }

  const commonAssignType = document.getElementById('batchCommonAssignTypeSelect')?.value || 'all';
  const count = AppState.batchExamsQueue.length;

  for (const item of AppState.batchExamsQueue) {
    const quiz = {
      id: item.id || generateQuizCode(),
      title: item.title || 'Đề Kiểm Tra Toán',
      timeLimit: item.timeLimit || 45,
      totalQuestions: item.answerKeys.length,
      examMode: 'split_pdf',
      pdfFileName: item.fileName,
      pdfDataUrl: item.fileData,
      assignType: commonAssignType,
      assignedClasses: ['10', '8', '7', '12'],
      assignedStudents: [],
      showLeaderboard: true,
      antiCheat: true,
      createdAt: new Date().toISOString(),
      answerKeys: item.answerKeys
    };

    await StorageEngine.saveQuiz(quiz);
    if (item.fileData) {
      await StorageEngine.savePdfBlob(quiz.id, item.fileData);
    }
  }

  AppState.batchExamsQueue = [];
  renderBatchQueueTable();
  renderTeacherQuizManager();
  updatePersonalizedExamFeed();

  SoundEngine.playFanfare();
  GamificationEngine.fireConfetti();
  showToast(`🎉 ĐÃ PHÁT HÀNH THÀNH CÔNG ${count} ĐỀ THI HÀNG LOẠT!`, 'success');
}

/* ================= TEACHER: SINGLE PDF & MATH ESSAY ENHANCED KEY GENERATION ================= */
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
      type: i > 10 ? 'essay' : 'mcq',
      correct: i > 10 ? (i === 11 ? '12 | x=12' : '1/2 | 0.5') : 'A',
      score: defaultScore,
      testInput: ''
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

    items.push({ num, type, correct: val, score: 0.5, testInput: '' });
  }

  if (!hasNumberedMatches) {
    const letters = raw.toUpperCase().replace(/[^A-D]/g, '').split('');
    if (letters.length > 0) {
      letters.forEach((l, idx) => {
        items.push({ num: idx + 1, type: 'mcq', correct: l, score: 0.5, testInput: '' });
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

/* Render Teacher Key Grid with Math Symbols & Live Match Tester */
function renderTeacherAnswerKeyGrid() {
  const container = document.getElementById('teacherAnswerKeyGrid');
  if (!container) return;

  const mathSymbols = ['±', '√', 'π', '°', '²', '³', '≤', '≥', '≠', '/', '|'];

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
      // Enhanced Essay / Short Math Answer Editor with Live Match Tester
      const testVal = item.testInput || '';
      const isTestMatch = testVal ? checkAnswerMatch(testVal, item.correct) : null;

      bodyControls = `
        <div style="flex:1;min-width:320px;">
          <div style="display:flex;gap:0.4rem;align-items:center;">
            <input type="text" id="teacherKeyInput_${idx}" style="flex:1;padding:0.35rem 0.6rem;font-size:0.9rem;font-weight:700;border:2px solid var(--border-color);border-radius:var(--radius-sm);color:var(--indigo);" placeholder="Đáp số chuẩn (dùng | để thêm nhiều cách viết, VD: 12 | x=12)" value="${escapeHtml(item.correct)}" oninput="setTeacherKeyAnswer(${idx}, this.value)">
          </div>

          <!-- Quick Math Symbols Toolbar -->
          <div class="math-symbol-bar">
            <span style="font-size:0.75rem;font-weight:800;color:var(--text-muted);margin-right:2px;">Chèn nhanh:</span>
            ${mathSymbols.map(sym => `
              <button type="button" class="math-sym-btn" onclick="insertMathSymbol(${idx}, '${sym}')">${sym}</button>
            `).join('')}
          </div>

          <!-- Live Match Tester -->
          <div class="math-tester-box">
            <span style="font-size:0.75rem;font-weight:800;color:var(--text-secondary);">🧪 Chấm thử:</span>
            <input type="text" class="math-tester-input" placeholder="Gõ thử câu trả lời..." value="${escapeHtml(testVal)}" oninput="testTeacherAnswerMatch(${idx}, this.value)">
            ${testVal ? (isTestMatch ? '<span class="math-tester-pill badge-pass">✅ Chấm ĐÚNG</span>' : '<span class="math-tester-pill badge-fail">❌ Chấm SAI</span>') : '<span style="font-size:0.75rem;color:var(--text-muted);">Nhập để thử</span>'}
          </div>
        </div>
      `;
    }

    return `
      <div class="key-grid-item" style="align-items:flex-start;padding:0.75rem;">
        <div style="display:flex;gap:0.4rem;align-items:center;min-width:70px;margin-top:4px;">
          <span style="font-weight:900;color:var(--indigo);font-size:0.95rem;">Câu ${item.num}:</span>
        </div>
        <div style="display:flex;gap:0.6rem;align-items:flex-start;flex:1;flex-wrap:wrap;">
          ${bodyControls}
          <div style="display:flex;gap:0.4rem;align-items:center;margin-top:2px;">
            <input type="number" step="0.25" min="0.25" max="10" style="width:60px;padding:0.35rem 0.4rem;font-size:0.85rem;text-align:center;font-weight:800;" value="${item.score}" title="Điểm của câu này" onchange="setTeacherKeyScore(${idx}, this.value)">
            <select style="padding:0.35rem 0.4rem;font-size:0.85rem;width:125px;font-weight:700;" onchange="changeTeacherKeyType(${idx}, this.value)">
              <option value="mcq" ${item.type === 'mcq' ? 'selected' : ''}>Trắc nghiệm A-D</option>
              <option value="truefalse" ${item.type === 'truefalse' ? 'selected' : ''}>Đúng / Sai</option>
              <option value="essay" ${item.type === 'essay' ? 'selected' : ''}>✍️ Tự luận điền số</option>
            </select>
          </div>
        </div>
      </div>
    `;
  }).join('');

  document.getElementById('teacherTotalQuestionsCount').textContent = `${AppState.teacherAnswerKeys.length} câu`;
}

function insertMathSymbol(idx, sym) {
  const input = document.getElementById(`teacherKeyInput_${idx}`);
  if (input) {
    const start = input.selectionStart || input.value.length;
    const end = input.selectionEnd || input.value.length;
    const val = input.value;
    input.value = val.substring(0, start) + sym + val.substring(end);
    input.focus();
    input.selectionStart = input.selectionEnd = start + sym.length;
    setTeacherKeyAnswer(idx, input.value);
    SoundEngine.playClick();
  }
}

function testTeacherAnswerMatch(idx, val) {
  AppState.teacherAnswerKeys[idx].testInput = val;
  renderTeacherAnswerKeyGrid();
}

function setTeacherKeyAnswer(idx, ans) {
  AppState.teacherAnswerKeys[idx].correct = ans;
}

function setTeacherKeyScore(idx, score) {
  AppState.teacherAnswerKeys[idx].score = parseFloat(score) || 0.5;
}

function changeTeacherKeyType(idx, type) {
  AppState.teacherAnswerKeys[idx].type = type;
  if (type === 'truefalse') {
    AppState.teacherAnswerKeys[idx].correct = 'Đúng';
  } else if (type === 'essay') {
    AppState.teacherAnswerKeys[idx].correct = '12 | x=12';
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
    score: 0.5,
    testInput: ''
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

/* Publish Single Quiz */
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

  const assignType = document.getElementById('assignTypeSelect').value;
  let assignedClasses = [];
  let assignedStudents = [];

  if (assignType === 'classes') {
    const checked = document.querySelectorAll('input[name="assign_class_cb"]:checked');
    assignedClasses = Array.from(checked).map(c => c.value);
    if (!assignedClasses.length) {
      showToast('⚠️ Vui lòng chọn ít nhất 1 lớp được giao đề.', 'warn');
      return;
    }
  } else if (assignType === 'students') {
    const checked = document.querySelectorAll('input[name="assign_student_cb"]:checked');
    assignedStudents = Array.from(checked).map(s => s.value);
    if (!assignedStudents.length) {
      showToast('⚠️ Vui lòng chọn ít nhất 1 học sinh được giao đề.', 'warn');
      return;
    }
  }

  const quiz = {
    id,
    title,
    timeLimit,
    totalQuestions: AppState.teacherAnswerKeys.length,
    examMode: 'split_pdf',
    pdfFileName: AppState.teacherFileName || 'De_Thi_Toan.pdf',
    pdfDataUrl: AppState.teacherPdfData || null,
    assignType,
    assignedClasses,
    assignedStudents,
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

  updatePersonalizedExamFeed();
  renderTeacherQuizManager();

  const targetDesc = assignType === 'all' 
    ? '🌍 Công khai toàn bộ' 
    : (assignType === 'classes' ? `🏫 Giao cho lớp: ${assignedClasses.join(', ')}` : `👤 Giao đích danh: ${assignedStudents.length} học sinh`);

  const resDiv = document.getElementById('publishSuccessResult');
  resDiv.innerHTML = `
    <div class="card" style="background:var(--primary-light);border-color:var(--primary);margin-top:1rem;">
      <h3 style="color:var(--primary-shadow);margin-bottom:0.4rem;">🎉 Đã Phát Hành Đề Thi Thành Công!</h3>
      <p style="color:var(--primary-shadow);font-size:0.95rem;font-weight:700;">Phạm vi giao đề: <strong>${targetDesc}</strong></p>
      <div style="margin:1rem 0;display:flex;align-items:center;gap:1rem;flex-wrap:wrap;">
        <span class="code-badge" style="font-size:1.8rem;padding:0.6rem 1.4rem;">${id}</span>
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

/* ================= ADMIN / TEACHER QUIZ MANAGER ================= */
async function renderTeacherQuizManager() {
  const wrap = document.getElementById('teacherQuizManagerWrap');
  if (!wrap) return;

  const quizzes = await StorageEngine.getAllQuizzes();

  if (!quizzes.length) {
    wrap.innerHTML = `
      <div style="text-align:center;padding:2rem;color:var(--text-muted);">
        <p style="font-size:1.1rem;font-weight:700;">Chưa có đề thi nào trong hệ thống.</p>
        <button class="btn btn-primary btn-sm" style="margin-top:0.75rem;" onclick="resetSampleQuiz()">🔄 Nạp lại đề thi mẫu chuẩn</button>
      </div>
    `;
    return;
  }

  wrap.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:0.5rem;">
      <span style="font-weight:800;color:var(--text-secondary);">Tổng số đề thi: <strong>${quizzes.length}</strong></span>
      <div style="display:flex;gap:0.5rem;">
        <button class="btn btn-primary btn-sm" onclick="bulkSetAllQuizzesPublic()">🌍 Công Khai Tất Cả Đề</button>
        <button class="btn btn-secondary btn-sm" onclick="resetSampleQuiz()">🔄 Nạp đề mẫu</button>
      </div>
    </div>

    <div class="table-responsive">
      <table>
        <thead>
          <tr>
            <th>Tên Đề Thi</th>
            <th>Đối Tượng Giao</th>
            <th>Số Câu</th>
            <th>Thời Gian</th>
            <th>Thao Tác</th>
          </tr>
        </thead>
        <tbody>
          ${quizzes.map(q => {
            let targetLabel = '<span class="badge-status badge-pass">Công khai</span>';
            if (q.assignType === 'classes') {
              targetLabel = `<span class="badge-status" style="background:var(--sky-light);color:var(--sky-shadow);">Lớp: ${(q.assignedClasses||[]).join(', ')}</span>`;
            } else if (q.assignType === 'students') {
              targetLabel = `<span class="badge-status" style="background:var(--amber-light);color:var(--amber-shadow);">Đích danh ${(q.assignedStudents||[]).length} HS</span>`;
            }

            return `
              <tr>
                <td><strong style="color:var(--text-primary);font-size:1rem;">${escapeHtml(q.title)}</strong></td>
                <td>${targetLabel}</td>
                <td>${q.totalQuestions || (q.answerKeys ? q.answerKeys.length : 12)} câu</td>
                <td>${q.timeLimit} phút</td>
                <td>
                  <div style="display:flex;gap:0.4rem;align-items:center;flex-wrap:wrap;">
                    <button class="btn btn-secondary btn-sm" onclick="loadSampleToStudent('${q.id}')" title="Vào làm thử">🚀 Thi Thử</button>
                    <button class="btn btn-sky btn-sm" onclick="quickViewResults('${q.id}')" title="Xem bảng điểm của đề này">📊 Bảng Điểm</button>
                    <button class="btn btn-danger btn-sm" onclick="confirmDeleteQuiz('${q.id}', '${escapeHtml(q.title)}')" title="Xóa hoàn toàn đề này">🗑️ Xóa</button>
                  </div>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function bulkSetAllQuizzesPublic() {
  const quizzes = await StorageEngine.getAllQuizzes();
  if (!quizzes.length) return;
  for (const q of quizzes) {
    q.assignType = 'all';
    await StorageEngine.saveQuiz(q);
  }
  showToast('🌍 Đã chuyển toàn bộ đề thi sang trạng thái Công Khai!', 'success');
  renderTeacherQuizManager();
  updatePersonalizedExamFeed();
  SoundEngine.playCorrect();
}

function quickViewResults(quizId) {
  switchTab('results');
  document.getElementById('lookupQuizCodeInput').value = quizId;
  loadTeacherResults();
}

async function confirmDeleteQuiz(quizId, quizTitle) {
  if (confirm(`⚠️ BẠN CÓ CHẮC CHẮN MUỐN XÓA ĐỀ THI NÀY?\n\n- Tên đề: ${quizTitle}\n\nLưu ý: Toàn bộ bảng điểm và kết quả bài làm của học sinh cho đề này cũng sẽ bị xóa vĩnh viễn.`)) {
    await StorageEngine.deleteQuiz(quizId);
    showToast(`🗑️ Đã xóa thành công đề thi!`, 'success');
    SoundEngine.playClick();
    updatePersonalizedExamFeed();
    renderTeacherQuizManager();
  }
}

async function resetSampleQuiz() {
  StorageEngine.seedSampleDataIfEmpty();
  showToast('✅ Đã nạp lại đề thi mẫu thành công!', 'success');
  updatePersonalizedExamFeed();
  renderTeacherQuizManager();
  SoundEngine.playCorrect();
}

/* ================= PERSONALIZED EXAM FEED ================= */
function updatePersonalizedExamFeed() {
  const currentName = (document.getElementById('studentJoinName')?.value || '').trim();
  const currentClass = (document.getElementById('studentJoinClass')?.value || '').trim();
  renderSampleQuizzes(currentName, currentClass);
}

async function renderSampleQuizzes(filterName = '', filterClass = '') {
  const wrap = document.getElementById('sampleQuizzesList');
  if (!wrap) return;
  const quizzes = await StorageEngine.getAllQuizzes();

  if (!quizzes.length) {
    wrap.innerHTML = '<div style="color:var(--text-muted);font-size:0.95rem;text-align:center;padding:1.5rem;">Chưa có đề thi nào trong hệ thống.</div>';
    return;
  }

  let displayedQuizzes = quizzes;
  if (filterName || filterClass) {
    displayedQuizzes = quizzes.filter(q => {
      if (q.assignType === 'all' || !q.assignType) return true;
      if (q.assignType === 'classes' && Array.isArray(q.assignedClasses)) {
        return q.assignedClasses.some(c => c.toLowerCase() === filterClass.toLowerCase());
      }
      if (q.assignType === 'students' && Array.isArray(q.assignedStudents)) {
        const studentTag = `${filterName} (${filterClass})`.toLowerCase();
        return q.assignedStudents.some(s => s.toLowerCase() === studentTag || s.toLowerCase().includes(filterName.toLowerCase()));
      }
      return true;
    });
  }

  const titleHeader = document.getElementById('studentFeedHeaderTitle');
  if (titleHeader) {
    titleHeader.textContent = filterName ? `📚 Đề Thi Dành Riêng Cho ${filterName} (Lớp ${filterClass})` : '📚 Danh Sách Đề Thi Của Bạn';
  }

  if (!displayedQuizzes.length) {
    wrap.innerHTML = `
      <div style="text-align:center;padding:1.75rem 1rem;color:var(--text-muted);">
        <div style="font-size:2.5rem;margin-bottom:0.4rem;">📭</div>
        <p style="font-weight:800;font-size:1.05rem;color:var(--amber-shadow);">Hiện tại chưa có đề thi nào được phân công cho ${escapeHtml(filterName)} (Lớp ${escapeHtml(filterClass)}).</p>
        <p style="font-size:0.875rem;margin-top:4px;">Khi giáo viên giao bài theo lớp hoặc giao đích danh cho bạn, đề thi sẽ tự động xuất hiện ở đây.</p>
      </div>
    `;
    return;
  }

  wrap.innerHTML = displayedQuizzes.map(q => {
    let targetBadge = '<span class="badge-status badge-pass" style="font-size:0.75rem;">🌍 Đề công khai</span>';
    if (q.assignType === 'classes') {
      targetBadge = `<span class="badge-status" style="font-size:0.75rem;background:var(--sky-light);color:var(--sky-shadow);">🏫 Đề riêng Lớp ${(q.assignedClasses||[]).join(', ')}</span>`;
    } else if (q.assignType === 'students') {
      targetBadge = `<span class="badge-status" style="font-size:0.75rem;background:var(--amber-light);color:var(--amber-shadow);">👤 Đích danh cho bạn</span>`;
    }

    return `
      <div class="card" style="padding:1.25rem;margin-bottom:0.85rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;border-left:6px solid ${q.assignType === 'students' ? 'var(--amber)' : (q.assignType === 'classes' ? 'var(--sky)' : 'var(--primary)')};">
        <div>
          <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
            <div style="font-weight:800;font-size:1.15rem;color:var(--text-primary);">${escapeHtml(q.title)}</div>
            ${targetBadge}
          </div>
          <div style="font-size:0.9rem;color:var(--text-secondary);margin-top:4px;font-weight:600;">
            ⏳ Thời gian: <strong>${q.timeLimit} phút</strong> · 📝 Quy mô: <strong>${q.totalQuestions || (q.answerKeys ? q.answerKeys.length : 12)} câu hỏi</strong>
          </div>
        </div>
        <div style="display:flex;gap:0.5rem;align-items:center;">
          <button class="btn btn-success btn-lg" onclick="loadAndJoinQuizDirectly('${q.id}')">Bắt Đầu Làm Bài 🚀</button>
        </div>
      </div>
    `;
  }).join('');
}

function loadAndJoinQuizDirectly(quizId) {
  startExamWithQuizId(quizId);
}

function handleStudentFormSubmit() {
  const currentName = (document.getElementById('studentJoinName')?.value || '').trim();
  const currentClass = (document.getElementById('studentJoinClass')?.value || '').trim();
  if (!currentName || !currentClass) {
    showToast('⚠️ Vui lòng nhập Tên và Lớp học của bạn!', 'warn');
    return;
  }
  updatePersonalizedExamFeed();
  document.getElementById('sampleQuizzesList')?.scrollIntoView({ behavior: 'smooth' });
}

/* Join Exam Directly by Quiz ID */
async function startExamWithQuizId(quizId) {
  const className = document.getElementById('studentJoinClass').value.trim();
  const name = document.getElementById('studentJoinName').value.trim();
  const statusEl = document.getElementById('joinQuizStatus');

  if (!className || !name) {
    statusEl.innerHTML = '<span style="color:var(--rose);">⚠️ Vui lòng điền Tên và Lớp học của bạn ở ô bên trên!</span>';
    document.getElementById('studentJoinName').focus();
    return;
  }

  statusEl.innerHTML = '<span style="color:var(--indigo);">⏳ Đang tải đề thi...</span>';
  const quiz = await StorageEngine.getQuiz(quizId);

  if (!quiz) {
    statusEl.innerHTML = '<span style="color:var(--rose);">❌ Không tìm thấy đề thi. Hãy thử lại!</span>';
    return;
  }

  const alreadySubmitted = await StorageEngine.hasSubmitted(quizId, className, name);
  if (alreadySubmitted) {
    statusEl.innerHTML = '<span style="color:var(--amber);">⚠️ Bạn đã hoàn thành và nộp bài cho đề thi này rồi!</span>';
    return;
  }

  let pdfUrl = quiz.pdfDataUrl;
  if (!pdfUrl) {
    const blobData = await StorageEngine.getPdfBlob(quizId);
    if (blobData) pdfUrl = blobData;
  }

  AppState.currentQuiz = quiz;
  AppState.currentQuizId = quizId;
  AppState.studentName = name;
  AppState.studentClass = className;
  AppState.studentAnswers = {};
  AppState.flaggedQuestions.clear();
  AppState.tabSwitches = 0;

  const matchedStudent = AppState.studentRoster.find(s => s.name.toLowerCase() === name.toLowerCase());
  const profile = GamificationEngine.getUserProfile();
  profile.name = name;
  profile.className = className;
  if (matchedStudent && matchedStudent.avatar) profile.avatar = matchedStudent.avatar;
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
    startLiveLeaderboardPolling(quizId, className);
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

/* ================= ENHANCED SMART MATH MATCHER ================= */
function checkAnswerMatch(given, correct) {
  if (!given || !correct) return false;
  
  const gRaw = given.toString().trim();
  const cRaw = correct.toString().trim();

  // Support multiple acceptable variations separated by | or ;
  const acceptableList = cRaw.split(/[|;]/).map(s => s.trim()).filter(Boolean);
  
  for (const target of acceptableList) {
    if (matchSingleMathAnswer(gRaw, target)) {
      return true;
    }
  }

  return false;
}

function matchSingleMathAnswer(gStr, cStr) {
  // Strip units (cm, cm2, cm3, m, mm, km/h, kg, g, deg, độ, °...)
  const unitRegex = /\s*(cm[23]?|m[23]?|mm|km(\/h)?|kg|g|độ|°|rad)\s*$/i;
  let gClean = gStr.replace(unitRegex, '').trim().toLowerCase().replace(/\s+/g, '');
  let cClean = cStr.replace(unitRegex, '').trim().toLowerCase().replace(/\s+/g, '');

  if (gClean === cClean) return true;

  // Strip leading variables like x=, y=, z=, t=, x==
  const gStrippedVar = gClean.replace(/^[a-z]=[=]?/, '');
  const cStrippedVar = cClean.replace(/^[a-z]=[=]?/, '');
  if (gStrippedVar === cStrippedVar) return true;

  // Decimal number comparison with tolerance 1e-4
  const gNum = parseMathNumber(gStr);
  const cNum = parseMathNumber(cStr);
  if (gNum !== null && cNum !== null) {
    if (Math.abs(gNum - cNum) < 1e-4) return true;
  }

  // Fraction comparison
  const gFrac = parseFraction(gStr);
  const cFrac = parseFraction(cStr);
  if (gFrac !== null && cFrac !== null) {
    if (Math.abs(gFrac - cFrac) < 1e-4) return true;
  }
  if (gFrac !== null && cNum !== null) {
    if (Math.abs(gFrac - cNum) < 1e-4) return true;
  }
  if (gNum !== null && cFrac !== null) {
    if (Math.abs(gNum - cFrac) < 1e-4) return true;
  }

  // Set of multiple roots (e.g. "2, 3" vs "3, 2" or "x=2; x=3")
  if (matchSetOfRoots(gStr, cStr)) {
    return true;
  }

  return false;
}

function parseMathNumber(str) {
  if (!str) return null;
  const clean = str.trim().replace(',', '.').replace(/^[a-z]\s*=\s*/i, '').replace(/[^\d.-]/g, '');
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

function matchSetOfRoots(gStr, cStr) {
  const gItems = gStr.split(/[,;\s]+/).map(s => s.replace(/^[a-z]=[=]?/i, '').trim()).filter(Boolean);
  const cItems = cStr.split(/[,;\s]+/).map(s => s.replace(/^[a-z]=[=]?/i, '').trim()).filter(Boolean);

  if (gItems.length > 1 && gItems.length === cItems.length) {
    const gSorted = [...gItems].sort();
    const cSorted = [...cItems].sort();
    return gSorted.every((val, i) => val.toLowerCase() === cSorted[i].toLowerCase() || Math.abs(parseFloat(val) - parseFloat(cSorted[i])) < 1e-4);
  }
  return false;
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

function loadSampleToStudent(quizId) {
  switchTab('student');
  startExamWithQuizId(quizId);
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
  updatePersonalizedExamFeed();
  SoundEngine.playClick();
}
