/**
 * KhiemEdu Main Application Controller - 32+ Avatar Library, Real Analytics & Modern Student Roster Modal
 */

/**
 * ExamVault — giữ đáp án đúng (trường `correct`) bên trong một closure riêng,
 * KHÔNG gắn vào AppState/window nên không thể đọc được bằng cách gõ
 * `AppState.currentQuiz.answerKeys` (hoặc tương tự) trong Console khi học sinh
 * đang làm bài. Học sinh chỉ nhận được bản "công khai" của answerKeys (không
 * có trường correct); việc chấm điểm được thực hiện thông qua ExamVault.grade().
 *
 * Lưu ý: đây là giải pháp giảm thiểu tốt nhất có thể trên một web tĩnh
 * không có backend. Một học sinh đủ kiên trì vẫn có thể đặt breakpoint và
 * dò từng bước để suy ra đáp án đúng lúc chấm điểm. Để bảo mật triệt để,
 * việc chấm điểm cần chuyển hẳn sang server (vd. Firebase Cloud Function).
 */
const ExamVault = (function () {
  const vault = new Map(); // quizId -> mảng answerKeys đầy đủ (có trường correct)

  function store(quizId, answerKeys) {
    vault.set(quizId, Array.isArray(answerKeys) ? answerKeys : []);
  }

  function getPublicKeys(quizId) {
    const keys = vault.get(quizId) || [];
    // Trả về bản sao đã loại bỏ trường `correct` để render an toàn cho học sinh
    return keys.map(({ correct, ...rest }) => ({ ...rest }));
  }

  function grade(quizId, studentAnswers) {
    const keys = vault.get(quizId) || [];
    let totalEarnedScore = 0;
    let correctCount = 0;
    const reviewData = [];

    for (const k of keys) {
      const given = studentAnswers[k.num];
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

    return { totalEarnedScore, correctCount, total: keys.length, reviewData };
  }

  function clear(quizId) {
    vault.delete(quizId);
  }

  return { store, getPublicKeys, grade, clear };
})();

const AppState = {
  activeTab: 'student',
  pendingTeacherTab: 'teacher',
  currentQuiz: null,
  currentQuizId: '',
  studentName: '',
  studentClass: '',
  studentAvatar: '🦊',
  modalSelectedAvatar: '🦊',
  avatarCategory: 'all',
  studentAnswers: {},
  flaggedQuestions: new Set(),
  timerInterval: null,
  secondsLeft: 0,
  totalExamSeconds: 0,
  tabSwitches: 0,
  teacherPdfUrl: null,
  teacherPdfData: null,
  teacherFileName: '',
  teacherMcqKeys: [],
  teacherEssayKeys: [],
  batchExamsQueue: [],
  leaderboardTimer: null,
  studentRoster: [],
  editingQuizId: null,
  editingQuizCreatedAt: null,
  // Analytics & Semester Filters
  parentTimeFilter: 'all',
  teacherAnalyticsScope: 'all',
  teacherTimeFilter: 'all',
  selectedTermFilter: 'all'
};

/* ================= TOANMATH SEMESTER BADGE HELPERS ================= */
function detectTermFromTitle(title = '') {
  if (/giữa\s*(học\s*)?kỳ\s*1|giữa\s*kì\s*1|gk1/i.test(title)) return 'GK1';
  if (/cuối\s*(học\s*)?kỳ\s*1|cuối\s*kì\s*1|học\s*kỳ\s*1|ck1/i.test(title)) return 'CK1';
  if (/giữa\s*(học\s*)?kỳ\s*2|giữa\s*kì\s*2|gk2/i.test(title)) return 'GK2';
  if (/cuối\s*(học\s*)?kỳ\s*2|cuối\s*kì\s*2|học\s*kỳ\s*2|ck2/i.test(title)) return 'CK2';
  if (/vào\s*10|tuyển\s*sinh/i.test(title)) return 'TS10';
  if (/thpt|tốt\s*nghiệp/i.test(title)) return 'THPT';
  return 'regular';
}

function detectGradeFromTitle(title = '') {
  if (!title) return '10';
  if (/TS10|vào\s*10|tuyển\s*sinh/i.test(title)) return 'TS10';
  if (/(?:Lớp|Khối|Toán)\s*12|THPT|Tốt nghiệp/i.test(title) && !/10|11/i.test(title)) return '12';
  const m = title.match(/(?:Toán|Lớp|Khối|K)\s*(\d+)/i);
  if (m && m[1]) return m[1];
  return '10';
}

function getExamTermBadge(term = 'regular') {
  switch (term) {
    case 'GK1': return '<span class="badge-status" style="font-size:0.75rem;background:#e0f2fe;color:#0369a1;font-weight:800;">🍂 Giữa HK1</span>';
    case 'CK1': return '<span class="badge-status" style="font-size:0.75rem;background:#dbeafe;color:#1d4ed8;font-weight:800;">❄️ Cuối HK1</span>';
    case 'GK2': return '<span class="badge-status" style="font-size:0.75rem;background:#fce7f3;color:#be185d;font-weight:800;">🌸 Giữa HK2</span>';
    case 'CK2': return '<span class="badge-status" style="font-size:0.75rem;background:#fef3c7;color:#b45309;font-weight:800;">☀️ Cuối HK2</span>';
    case 'TS10': return '<span class="badge-status" style="font-size:0.75rem;background:#ede9fe;color:#6d28d9;font-weight:800;">🎓 Vào 10</span>';
    case 'THPT': return '<span class="badge-status" style="font-size:0.75rem;background:#fee2e2;color:#b91c1c;font-weight:800;">🏛️ THPT QG</span>';
    default: return '<span class="badge-status" style="font-size:0.75rem;background:#f1f5f9;color:#475569;font-weight:700;">📝 Thường xuyên</span>';
  }
}

function filterExamFeedByTerm(term = 'all') {
  AppState.selectedTermFilter = term;
  document.querySelectorAll('.time-filter-bar button[id^="termBtn_"]').forEach(btn => {
    btn.classList.remove('active');
  });
  const activeBtn = document.getElementById(`termBtn_${term}`);
  if (activeBtn) activeBtn.classList.add('active');
  updatePersonalizedExamFeed();
}

/* ================= 32+ AVATARS LIBRARY DEFINITION ================= */
const AVATARS_COLLECTION = [
  // 🐾 Linh Thú Thông Thái
  { id: 'fox', emoji: '🦊', name: 'Cáo Thông Minh', category: 'animals' },
  { id: 'owl', emoji: '🦉', name: 'Cú Trí Tuệ', category: 'animals' },
  { id: 'lion', emoji: '🦁', name: 'Sư Tử Dũng Mãnh', category: 'animals' },
  { id: 'panda', emoji: '🐼', name: 'Gấu Trúc Đáng Yêu', category: 'animals' },
  { id: 'tiger', emoji: '🐯', name: 'Hổ Tinh Nhuệ', category: 'animals' },
  { id: 'dolphin', emoji: '🐬', name: 'Cá Heo Nhạy Bén', category: 'animals' },
  { id: 'eagle', emoji: '🦅', name: 'Đại Bàng Quyết Đoán', category: 'animals' },
  { id: 'wolf', emoji: '🐺', name: 'Sói Đầu Đàn', category: 'animals' },
  { id: 'unicorn', emoji: '🦄', name: 'Kỳ Lân May Mắn', category: 'animals' },
  { id: 'koala', emoji: '🐨', name: 'Koala Siêng Năng', category: 'animals' },
  { id: 'frog', emoji: '🐸', name: 'Ếch Nhanh Nhẹn', category: 'animals' },
  { id: 'penguin', emoji: '🐧', name: 'Cánh Cụt Đáng Yêu', category: 'animals' },
  { id: 'monkey', emoji: '🐵', name: 'Khỉ Hoạt Bát', category: 'animals' },
  { id: 'rabbit', emoji: '🐰', name: 'Thỏ Nhanh Trí', category: 'animals' },
  { id: 'dragon', emoji: '🐲', name: 'Rồng Thần', category: 'animals' },

  // ⚔️ Chiến Binh & Pháp Sư
  { id: 'astronaut', emoji: '🚀', name: 'Phi Hành Gia', category: 'warriors' },
  { id: 'lightning', emoji: '⚡', name: 'Tia Chớp Siêu Tốc', category: 'warriors' },
  { id: 'robot', emoji: '🤖', name: 'Robot AI Siêu Việt', category: 'warriors' },
  { id: 'wizard', emoji: '🧙‍♂️', name: 'Pháp Sư Toán Học', category: 'warriors' },
  { id: 'ninja', emoji: '🥷', name: 'Ninja Ẩn Thân', category: 'warriors' },
  { id: 'hero', emoji: '🦸‍♂️', name: 'Siêu Anh Hùng', category: 'warriors' },
  { id: 'crown', emoji: '👑', name: 'Vương Giả', category: 'warriors' },
  { id: 'sword', emoji: '⚔️', name: 'Kiếm Khách', category: 'warriors' },
  { id: 'shield', emoji: '🛡️', name: 'Vệ Binh Kiên Cường', category: 'warriors' },
  { id: 'target', emoji: '🎯', name: 'Thiện Xạ Điểm 10', category: 'warriors' },

  // ✨ Vũ Trụ & May Mắn
  { id: 'star', emoji: '🌟', name: 'Ngôi Sao Sáng', category: 'cosmic' },
  { id: 'crystal', emoji: '🔮', name: 'Quả Cầu Pha Lê', category: 'cosmic' },
  { id: 'fire', emoji: '🔥', name: 'Ngọn Lửa Bất Diệt', category: 'cosmic' },
  { id: 'diamond', emoji: '💎', name: 'Kim Cương Sáng Chói', category: 'cosmic' },
  { id: 'rainbow', emoji: '🌈', name: 'Cầu Vồng Hy Vọng', category: 'cosmic' },
  { id: 'clover', emoji: '🍀', name: 'Cỏ 4 Lá May Mắn', category: 'cosmic' },
  { id: 'planet', emoji: '🪐', name: 'Hành Tinh Bí Ẩn', category: 'cosmic' },
  { id: 'trophy', emoji: '🏆', name: 'Nhà Vô Địch', category: 'cosmic' }
];

/* ================= TEACHER ROLE SECURITY & GATEKEEPER ================= */
const TeacherAuth = {
  getPin() {
    return localStorage.getItem('khiemedu_teacher_pin') || '123456';
  },
  setPin(newPin) {
    localStorage.setItem('khiemedu_teacher_pin', newPin);
  },
  isLoggedIn() {
    return sessionStorage.getItem('khiemedu_teacher_session') === '1';
  },
  login() {
    sessionStorage.setItem('khiemedu_teacher_session', '1');
  },
  logout() {
    sessionStorage.removeItem('khiemedu_teacher_session');
    showToast('🔒 Đã đăng xuất và khóa quyền Giáo Viên!', 'info');
    SoundEngine.playClick();
    switchTab('student');
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  await StorageEngine.init();
  SoundEngine.init();
  initTheme();
  updateFirebaseUI();
  updateGamifyBar();
  initAvatars();
  initSeparatedTeacherGrids(10, 2);
  await loadStudentRoster();
  initSavedStudentSession();
  renderTeacherQuizManager();
  renderTeacherRosterManager();
  renderTeacherAnalyticsDashboard();
  renderAssignTargetsSelector();
  renderGamificationTab();
  initAntiCheatListeners();
  checkUrlQuizParam();
  checkAndRenderPausedExamBanner();
  initFirebaseRealtimeSync();
});

/* ================= AVATAR PICKER ENGINE ================= */
function initAvatars() {
  const container = document.getElementById('avatarSelector');
  if (!container) return;

  const currentAvatar = AppState.studentAvatar || '🦊';
  const selectedCat = AppState.avatarCategory || 'all';

  const categories = [
    { id: 'all', label: 'Tất Cả (32+)' },
    { id: 'animals', label: '🐾 Linh Thú' },
    { id: 'warriors', label: '⚔️ Chiến Binh' },
    { id: 'cosmic', label: '✨ Vũ Trụ & May Mắn' }
  ];

  const filteredAvatars = selectedCat === 'all'
    ? AVATARS_COLLECTION
    : AVATARS_COLLECTION.filter(a => a.category === selectedCat);

  container.innerHTML = `
    <div style="width:100%;">
      <div class="avatar-category-bar">
        ${categories.map(c => `
          <button type="button" class="avatar-cat-btn ${selectedCat === c.id ? 'active' : ''}" onclick="filterAvatarCategory('${c.id}')">${c.label}</button>
        `).join('')}
      </div>

      <div class="avatar-picker-grid">
        ${filteredAvatars.map(a => `
          <button type="button" class="avatar-btn ${currentAvatar === a.emoji ? 'selected' : ''}" onclick="selectAvatar('${a.emoji}', '${escapeHtml(a.name)}')" title="${escapeHtml(a.name)}">
            ${a.emoji}
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

function filterAvatarCategory(catId) {
  AppState.avatarCategory = catId;
  initAvatars();
  SoundEngine.playClick();
}

function selectAvatar(emoji, name = '') {
  AppState.studentAvatar = emoji;
  const profile = GamificationEngine.getUserProfile();
  profile.avatar = emoji;
  GamificationEngine.saveUserProfile(profile);

  initAvatars();
  updateGamifyBar();
  SoundEngine.playPop ? SoundEngine.playPop() : SoundEngine.playClick();
  if (name) showToast(`✨ Đã chọn Avatar: ${emoji} ${name}`, 'info');
}

/* Restore previous student login session if available */
function initSavedStudentSession() {
  const savedProfile = GamificationEngine.getUserProfile();
  if (savedProfile && savedProfile.name) {
    const nameEl = document.getElementById('studentJoinName');
    const classEl = document.getElementById('studentJoinClass');
    if (nameEl) nameEl.value = savedProfile.name;
    if (classEl) classEl.value = savedProfile.className || '10';
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
  if ((tabId === 'teacher' || tabId === 'results') && !TeacherAuth.isLoggedIn()) {
    AppState.pendingTeacherTab = tabId;
    openTeacherAuthModal();
    return;
  }

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
    renderTeacherAnalyticsDashboard();
    renderAssignTargetsSelector();
  } else if (tabId === 'student') {
    updatePersonalizedExamFeed();
    checkAndRenderPausedExamBanner();
  } else if (tabId === 'parent') {
    renderParentTab();
  }
}

/* --- Teacher PIN Modal --- */
function openTeacherAuthModal() {
  const modal = document.getElementById('teacherAuthModal');
  const input = document.getElementById('teacherPinInput');
  const errorEl = document.getElementById('teacherAuthError');
  if (errorEl) errorEl.textContent = '';
  if (input) {
    input.value = '';
    setTimeout(() => input.focus(), 150);
  }
  if (modal) modal.classList.remove('hidden');
  SoundEngine.playWarning();
}

function closeTeacherAuthModal() {
  const modal = document.getElementById('teacherAuthModal');
  if (modal) modal.classList.add('hidden');
}

function verifyTeacherAuth() {
  const input = document.getElementById('teacherPinInput');
  const errorEl = document.getElementById('teacherAuthError');
  const enteredPin = (input ? input.value : '').trim();
  const correctPin = TeacherAuth.getPin();

  if (enteredPin === correctPin) {
    TeacherAuth.login();
    closeTeacherAuthModal();
    showToast('🔓 Xác thực Giáo Viên thành công! Chào mừng Thầy/Cô.', 'success');
    SoundEngine.playFanfare();
    switchTab(AppState.pendingTeacherTab || 'teacher');
  } else {
    if (errorEl) errorEl.textContent = '❌ Mã PIN không chính xác. Vui lòng thử lại!';
    if (input) {
      input.value = '';
      input.focus();
    }
    SoundEngine.playWarning();
  }
}

function promptChangeTeacherPin() {
  const currentPin = prompt('Nhập mã PIN hiện tại của bạn:');
  if (currentPin === null) return;
  if (currentPin !== TeacherAuth.getPin()) {
    alert('❌ Mã PIN hiện tại không đúng!');
    return;
  }

  const newPin = prompt('Nhập mã PIN mới (VD: 4 - 8 chữ số):');
  if (!newPin || newPin.trim().length < 4) {
    alert('⚠️ Mã PIN mới phải có ít nhất 4 ký tự!');
    return;
  }

  TeacherAuth.setPin(newPin.trim());
  showToast('🔑 Đã cập nhật mã PIN Giáo Viên thành công!', 'success');
  SoundEngine.playCorrect();
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function escapeHtml(str) {
  return (str || '').replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[m]));
}

/* ================= MODERN STUDENT ROSTER MANAGEMENT ================= */
async function loadStudentRoster() {
  AppState.studentRoster = await StorageEngine.getStudentRoster();
  if (!AppState.studentRoster || !AppState.studentRoster.length) {
    AppState.studentRoster = StorageEngine.seedStudentRosterIfEmpty(true) || [];
  }
}

async function renderTeacherRosterManager() {
  const wrap = document.getElementById('teacherRosterManagerWrap');
  if (!wrap) return;

  if (!AppState.studentRoster || !AppState.studentRoster.length) {
    const raw = localStorage.getItem('khiemedu_student_roster');
    if (raw) {
      try { AppState.studentRoster = JSON.parse(raw); } catch (e) {}
    }
  }

  if (!AppState.studentRoster || !AppState.studentRoster.length) {
    AppState.studentRoster = StorageEngine.seedStudentRosterIfEmpty(true) || [];
  }

  const roster = AppState.studentRoster || [];

  wrap.innerHTML = `
    <div style="margin-bottom:1rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.75rem;">
      <span style="font-weight:800;color:var(--text-primary);">Tổng số học sinh quản lý: <strong style="color:var(--primary);font-size:1.15rem;">${roster.length}</strong></span>
      
      <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;">
        <button type="button" class="btn btn-primary btn-sm" onclick="openAddStudentModal()">+ Thêm Học Sinh Mới</button>
        <button type="button" class="btn btn-secondary btn-sm" onclick="openBatchStudentModal()">⚡ Nhập Cả Lớp (Excel / Text)</button>
        <button type="button" class="btn btn-sm" style="background:var(--bg-tertiary);" onclick="resetDefaultStudentRoster()" title="Nạp lại 5 học sinh mẫu">🔄 Nạp Danh Sách Mẫu</button>
      </div>
    </div>

    ${!roster.length ? `
      <div style="text-align:center;padding:2rem 1rem;background:var(--bg-tertiary);border:2px dashed var(--border-color);border-radius:var(--radius-lg);">
        <p style="font-weight:700;color:var(--text-secondary);margin-bottom:0.75rem;">Danh bạ hiện đang trống. Thầy/Cô có thể bấm thêm học sinh hoặc nạp danh sách mẫu:</p>
        <button type="button" class="btn btn-primary" onclick="resetDefaultStudentRoster()">🔄 Nạp Danh Sách Mẫu Chuẩn</button>
      </div>
    ` : `
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
            ${roster.map((s, idx) => `
              <tr>
                <td><span class="code-badge" style="font-size:0.8rem;padding:2px 6px;">${s.id || 'HS' + (idx + 1)}</span></td>
                <td style="font-size:1.5rem;">${s.avatar || '👤'}</td>
                <td><strong style="color:var(--text-primary);font-size:1rem;">${escapeHtml(s.name)}</strong></td>
                <td><span class="badge-status badge-pass">Lớp ${escapeHtml(s.className)}</span></td>
                <td>
                  <button type="button" class="btn btn-danger btn-sm" onclick="deleteRosterStudent(${idx})">🗑️ Xóa</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `}
  `;
}

/* --- Add Single Student Modal --- */
function openAddStudentModal() {
  const modal = document.getElementById('addStudentModal');
  const nameInput = document.getElementById('modalStudentNameInput');
  const classInput = document.getElementById('modalStudentClassInput');
  const avatarGrid = document.getElementById('modalAvatarSelectorGrid');

  AppState.modalSelectedAvatar = '🦊';

  if (nameInput) {
    nameInput.value = '';
    setTimeout(() => nameInput.focus(), 150);
  }
  if (classInput) classInput.value = '10';

  if (avatarGrid) {
    avatarGrid.innerHTML = AVATARS_COLLECTION.map(a => `
      <button type="button" class="roster-avatar-item ${AppState.modalSelectedAvatar === a.emoji ? 'active' : ''}" onclick="selectModalStudentAvatar('${a.emoji}')" title="${escapeHtml(a.name)}">
        ${a.emoji}
      </button>
    `).join('');
  }

  if (modal) modal.classList.remove('hidden');
  SoundEngine.playClick();
}

function closeAddStudentModal() {
  const modal = document.getElementById('addStudentModal');
  if (modal) modal.classList.add('hidden');
}

function selectModalStudentAvatar(emoji) {
  AppState.modalSelectedAvatar = emoji;
  const avatarGrid = document.getElementById('modalAvatarSelectorGrid');
  if (avatarGrid) {
    avatarGrid.querySelectorAll('.roster-avatar-item').forEach(btn => {
      btn.classList.toggle('active', btn.textContent.trim() === emoji);
    });
  }
  SoundEngine.playClick();
}

async function saveStudentFromModal() {
  const name = (document.getElementById('modalStudentNameInput')?.value || '').trim();
  const className = (document.getElementById('modalStudentClassInput')?.value || '10').trim();

  if (!name) {
    showToast('⚠️ Vui lòng nhập Tên học sinh!', 'warn');
    return;
  }

  const newStudent = {
    id: name.toUpperCase().replace(/\s+/g, '') + className,
    name: name.toUpperCase(),
    className: className,
    avatar: AppState.modalSelectedAvatar || '🦊'
  };

  AppState.studentRoster.push(newStudent);
  await StorageEngine.saveStudentRoster(AppState.studentRoster);

  closeAddStudentModal();
  renderTeacherRosterManager();
  renderAssignTargetsSelector();
  renderTeacherAnalyticsDashboard();
  updatePersonalizedExamFeed();

  showToast(`✅ Đã thêm học sinh: ${newStudent.avatar} ${newStudent.name} (Lớp ${newStudent.className})!`, 'success');
  SoundEngine.playCorrect();
}

/* --- Batch Add Students Modal --- */
function openBatchStudentModal() {
  const modal = document.getElementById('batchStudentModal');
  const textarea = document.getElementById('batchStudentsTextarea');
  if (textarea) textarea.value = '';
  if (modal) modal.classList.remove('hidden');
  SoundEngine.playClick();
}

function closeBatchStudentModal() {
  const modal = document.getElementById('batchStudentModal');
  if (modal) modal.classList.add('hidden');
}

async function saveBatchStudentsFromText() {
  const raw = (document.getElementById('batchStudentsTextarea')?.value || '').trim();
  const defaultClass = (document.getElementById('batchDefaultClassInput')?.value || '10').trim();

  if (!raw) {
    showToast('⚠️ Vui lòng dán danh sách học sinh!', 'warn');
    return;
  }

  const lines = raw.split(/[\r\n]+/);
  let addedCount = 0;

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;

    let name = '';
    let className = defaultClass;

    if (trimmed.includes(',')) {
      const parts = trimmed.split(',');
      name = parts[0].trim();
      className = parts[1].trim() || defaultClass;
    } else if (trimmed.includes('\t')) {
      const parts = trimmed.split('\t');
      name = parts[0].trim();
      className = parts[1].trim() || defaultClass;
    } else {
      name = trimmed;
    }

    if (name) {
      const randomAvatar = AVATARS_COLLECTION[Math.floor(Math.random() * AVATARS_COLLECTION.length)].emoji;
      AppState.studentRoster.push({
        id: name.toUpperCase().replace(/\s+/g, '') + className,
        name: name.toUpperCase(),
        className: className,
        avatar: randomAvatar
      });
      addedCount++;
    }
  });

  await StorageEngine.saveStudentRoster(AppState.studentRoster);
  closeBatchStudentModal();
  renderTeacherRosterManager();
  renderAssignTargetsSelector();
  renderTeacherAnalyticsDashboard();
  updatePersonalizedExamFeed();

  showToast(`⚡ ĐÃ NHẬP THÀNH CÔNG ${addedCount} HỌC SINH VÀO DANH BẠ!`, 'success');
  SoundEngine.playFanfare();
}

async function resetDefaultStudentRoster() {
  const initialRoster = [
    { id: 'SURI10', name: 'SURI', className: '10', avatar: '🦊' },
    { id: 'NGHIA7', name: 'NGHĨA', className: '7', avatar: '🚀' },
    { id: 'GIANG8', name: 'GIANG', className: '8', avatar: '🦁' },
    { id: 'TIEN12', name: 'TIÊN', className: '12', avatar: '🦉' },
    { id: 'MINH10', name: 'MINH', className: '10', avatar: '⚡' }
  ];

  AppState.studentRoster = initialRoster;
  await StorageEngine.saveStudentRoster(initialRoster);

  renderTeacherRosterManager();
  renderAssignTargetsSelector();
  renderTeacherAnalyticsDashboard();
  updatePersonalizedExamFeed();

  showToast('🔄 Đã nạp thành công 5 học sinh mẫu chuẩn!', 'success');
  SoundEngine.playCorrect();
}

async function deleteRosterStudent(idx) {
  const stu = AppState.studentRoster[idx];
  if (confirm(`Bạn có chắc muốn xóa học sinh [${stu.name}] khỏi danh bạ?`)) {
    AppState.studentRoster.splice(idx, 1);
    await StorageEngine.saveStudentRoster(AppState.studentRoster);
    renderTeacherRosterManager();
    renderAssignTargetsSelector();
    renderTeacherAnalyticsDashboard();
    updatePersonalizedExamFeed();
    showToast('🗑️ Đã xóa học sinh khỏi danh bạ.', 'success');
    SoundEngine.playClick();
  }
}

function renderAssignTargetsSelector() {
  const typeSelect = document.getElementById('assignTypeSelect');
  if (!typeSelect) return;

  const selectedType = typeSelect.value;
  const classesWrap = document.getElementById('assignClassesBox');
  const studentsWrap = document.getElementById('assignStudentsBox');
  const roster = AppState.studentRoster || [];

  if (selectedType === 'all') {
    classesWrap.classList.add('hidden');
    studentsWrap.classList.add('hidden');
  } else if (selectedType === 'classes') {
    classesWrap.classList.remove('hidden');
    studentsWrap.classList.add('hidden');
    
    const uniqueClasses = [...new Set(roster.map(s => s.className))];
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
      container.innerHTML = roster.map(s => `
        <label style="display:inline-flex;align-items:center;gap:0.4rem;padding:0.4rem 0.8rem;background:var(--bg-card);border:2px solid var(--border-color);border-radius:var(--radius-md);cursor:pointer;">
          <input type="checkbox" name="assign_student_cb" value="${escapeHtml(s.name)} (${escapeHtml(s.className)})" checked style="width:18px;height:18px;">
          <span>${s.avatar} <strong>${escapeHtml(s.name)}</strong> (Lớp ${escapeHtml(s.className)})</span>
        </label>
      `).join('');
    }
  }
}

/* ================= PARENT PORTAL & REAL METRICS ENGINE ================= */
function renderParentTab() {
  const nameInput = document.getElementById('parentChildNameInput');
  const classInput = document.getElementById('parentChildClassInput');
  if (nameInput && !nameInput.value && AppState.studentName) {
    nameInput.value = AppState.studentName;
  }
  if (classInput && !classInput.value && AppState.studentClass) {
    classInput.value = AppState.studentClass;
  }
  lookupParentChildReport();
}

async function lookupParentChildReport() {
  const nameInput = document.getElementById('parentChildNameInput');
  const classInput = document.getElementById('parentChildClassInput');
  const wrap = document.getElementById('parentReportContentWrap');
  if (!wrap) return;

  const name = (nameInput?.value || '').trim();
  const className = (classInput?.value || '').trim();

  if (!name) {
    wrap.innerHTML = `
      <div class="card" style="text-align:center;padding:2.5rem 1.5rem;color:var(--text-muted);">
        <div style="font-size:3rem;margin-bottom:0.5rem;">👨‍👩‍👧 📊</div>
        <h3 style="color:var(--indigo);margin-bottom:0.4rem;">Tra Cứu Báo Cáo Học Tập Của Con</h3>
        <p style="font-size:0.95rem;font-weight:600;">Vui lòng nhập Tên học sinh và Lớp của con vào 2 ô ở trên để hiển thị toàn bộ số liệu thực tế.</p>
      </div>
    `;
    return;
  }

  const allResults = await StorageEngine.getAllResults();
  let childResults = allResults.filter(r => r.name.toLowerCase() === name.toLowerCase());
  if (className) {
    childResults = childResults.filter(r => (r.className || '').toLowerCase().includes(className.toLowerCase()));
  }

  const filtered = filterResultsByTime(childResults, AppState.parentTimeFilter);
  const metrics = computeRealMetrics(filtered);

  wrap.innerHTML = `
    <!-- Time Filter Bar -->
    <div class="time-filter-bar">
      <span style="font-size:0.85rem;font-weight:800;color:var(--text-secondary);">📅 Lọc theo thời gian:</span>
      ${[
        { id: 'all', label: '♾️ Tất Cả' },
        { id: 'day', label: '📅 Hôm Nay' },
        { id: 'week', label: '🗓️ 7 Ngày Qua (Tuần)' },
        { id: 'month', label: '📆 30 Ngày Qua (Tháng)' }
      ].map(f => `
        <button type="button" class="time-filter-btn ${AppState.parentTimeFilter === f.id ? 'active' : ''}" onclick="setParentTimeFilter('${f.id}')">${f.label}</button>
      `).join('')}
    </div>

    <!-- 6 Real Metric Cards -->
    <div class="analytics-metric-grid">
      <div class="metric-card metric-score">
        <div class="metric-val">${metrics.avgScore}<span style="font-size:1.1rem;font-weight:700;">/10</span></div>
        <div class="metric-lbl">Thang Điểm Trung Bình</div>
        <div class="metric-sub">${metrics.totalExams} bài thi · Cao nhất: ${metrics.highestScore}đ</div>
      </div>

      <div class="metric-card metric-growth">
        <div class="metric-val" style="color:${metrics.scoreDelta >= 0 ? 'var(--primary)' : 'var(--rose)'};">
          ${metrics.scoreDelta > 0 ? '+' : ''}${metrics.scoreDelta}đ
        </div>
        <div class="metric-lbl">Sự Tiến Bộ (Độ Tăng Trưởng)</div>
        <div class="metric-sub">So với bài thi đầu tiên (${metrics.firstScore}đ ➔ ${metrics.latestScore}đ)</div>
      </div>

      <div class="metric-card metric-correct">
        <div class="metric-val">${metrics.correctQuestions}<span style="font-size:1.1rem;font-weight:700;">/${metrics.totalQuestions}</span></div>
        <div class="metric-lbl">Số Câu Giải Quyết Đúng</div>
        <div class="metric-sub">Độ chính xác trung bình: <strong>${metrics.accuracyPct}%</strong></div>
      </div>

      <div class="metric-card metric-unsolved">
        <div class="metric-val">${metrics.unsolvedQuestions}</div>
        <div class="metric-lbl">Số Câu Không Giải Được / Sai</div>
        <div class="metric-sub">Chiếm ${100 - metrics.accuracyPct}% tổng số câu hỏi đã làm</div>
      </div>

      <div class="metric-card metric-streak">
        <div class="metric-val">${metrics.activeDays} Ngày 🔥</div>
        <div class="metric-lbl">Chuỗi Ngày Học Tập Chăm Chỉ</div>
        <div class="metric-sub">Thời gian trung bình/bài: ${Math.floor(metrics.avgTimeSeconds/60)}p ${metrics.avgTimeSeconds%60}s</div>
      </div>

      <div class="metric-card metric-distract">
        <div class="metric-val" style="color:${metrics.totalTabSwitches > 0 ? 'var(--rose)' : 'var(--primary)'};">${metrics.totalTabSwitches} Lần</div>
        <div class="metric-lbl">Chỉ Số Mất Tập Trung (Rời Tab)</div>
        <div class="metric-sub">${metrics.totalTabSwitches === 0 ? '✅ Học tập nghiêm túc tuyệt đối' : '⚠️ Cần nhắc nhở tập trung hơn'}</div>
      </div>
    </div>

    <!-- Question Accuracy Breakdown Bar -->
    <div class="card" style="margin-bottom:1.25rem;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.6rem;">
        <span style="font-weight:800;color:var(--text-primary);">📊 Cơ Cấu Số Câu Giải Quyết (Accuracy Breakdown):</span>
        <span style="font-weight:900;color:var(--indigo);">${metrics.correctQuestions} Đúng / ${metrics.unsolvedQuestions} Sai & Chưa Giải</span>
      </div>
      <div class="question-breakdown-bar">
        <div class="breakdown-seg-correct" style="width:${metrics.accuracyPct}%;">${metrics.accuracyPct > 15 ? metrics.accuracyPct + '%' : ''}</div>
        <div class="breakdown-seg-unsolved" style="width:${100 - metrics.accuracyPct}%;">${(100 - metrics.accuracyPct) > 15 ? (100 - metrics.accuracyPct) + '%' : ''}</div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:0.4rem;font-size:0.8rem;font-weight:800;">
        <span style="color:var(--primary-shadow);">🟢 Đúng: ${metrics.correctQuestions} câu (${metrics.accuracyPct}%)</span>
        <span style="color:var(--rose);">🔴 Không giải được / Sai: ${metrics.unsolvedQuestions} câu (${100 - metrics.accuracyPct}%)</span>
      </div>
    </div>

    <!-- Interactive SVG Chart Box -->
    <div class="chart-container-box">
      <div class="chart-title">
        <span>📈 Biểu Đồ Thống Kê Điểm Số & Sự Tiến Bộ Qua Từng Bài Thi</span>
        <span style="font-size:0.8rem;color:var(--text-muted);font-weight:700;">(Thang điểm 0 - 10)</span>
      </div>
      <div class="chart-svg-wrap">
        ${generateSvgScoreChart(filtered)}
      </div>
    </div>

    <!-- Exam History Table -->
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:0.5rem;">
        <h3 style="color:var(--indigo);margin:0;">📋 Chi Tiết Lịch Sử Bài Làm Của Con (${filtered.length} bài)</h3>
        <button class="btn btn-success btn-sm" onclick="exportParentReportCard('${escapeHtml(name)}')">📥 Xuất Báo Cáo (CSV / Excel)</button>
      </div>

      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Tên Bài Thi</th>
              <th>Điểm Số</th>
              <th>Số Câu Đúng</th>
              <th>Số Câu Sai</th>
              <th>Thời Gian Làm</th>
              <th>Rời Màn Hình</th>
              <th>Ngày Làm</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map(r => {
              const unsolved = (r.total || 0) - (r.correct || 0);
              return `
                <tr>
                  <td><strong style="color:var(--text-primary);">${escapeHtml(r.quizTitle || 'Bài kiểm tra')}</strong></td>
                  <td><strong style="font-size:1.1rem;color:${(r.totalScore || 0) >= 8 ? 'var(--primary-shadow)' : ((r.totalScore || 0) >= 5 ? 'var(--indigo)' : 'var(--rose)')};">${r.totalScore || 0}đ</strong></td>
                  <td><span style="color:var(--primary-shadow);font-weight:800;">${r.correct}/${r.total}</span></td>
                  <td><span style="color:var(--rose);font-weight:800;">${unsolved}</span></td>
                  <td>${Math.floor(r.timeTakenSeconds / 60)}p ${r.timeTakenSeconds % 60}s</td>
                  <td>${r.tabSwitches > 0 ? `<span style="color:var(--rose);font-weight:800;">⚠️ ${r.tabSwitches}</span>` : '0'}</td>
                  <td>${new Date(r.submittedAt).toLocaleDateString('vi-VN')} ${new Date(r.submittedAt).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function setParentTimeFilter(filterId) {
  AppState.parentTimeFilter = filterId;
  lookupParentChildReport();
  SoundEngine.playClick();
}

function computeRealMetrics(results) {
  if (!results.length) {
    return {
      totalExams: 0,
      avgScore: 0,
      highestScore: 0,
      lowestScore: 0,
      firstScore: 0,
      latestScore: 0,
      scoreDelta: 0,
      totalQuestions: 0,
      correctQuestions: 0,
      unsolvedQuestions: 0,
      accuracyPct: 0,
      activeDays: 0,
      totalTabSwitches: 0,
      avgTimeSeconds: 0
    };
  }

  const totalExams = results.length;
  let totalScoreSum = 0;
  let highestScore = -1;
  let lowestScore = 999;
  let totalQuestions = 0;
  let correctQuestions = 0;
  let totalTabSwitches = 0;
  let totalTimeSeconds = 0;
  const uniqueDays = new Set();

  results.forEach(r => {
    const score = r.totalScore || 0;
    totalScoreSum += score;
    if (score > highestScore) highestScore = score;
    if (score < lowestScore) lowestScore = score;

    totalQuestions += (r.total || 0);
    correctQuestions += (r.correct || 0);
    totalTabSwitches += (r.tabSwitches || 0);
    totalTimeSeconds += (r.timeTakenSeconds || 0);

    if (r.submittedAt) {
      uniqueDays.add(r.submittedAt.slice(0, 10));
    }
  });

  const firstScore = results[0].totalScore || 0;
  const latestScore = results[results.length - 1].totalScore || 0;
  const scoreDelta = Math.round((latestScore - firstScore) * 10) / 10;
  const avgScore = Math.round((totalScoreSum / totalExams) * 10) / 10;
  const unsolvedQuestions = totalQuestions - correctQuestions;
  const accuracyPct = totalQuestions ? Math.round((correctQuestions / totalQuestions) * 100) : 0;
  const avgTimeSeconds = Math.round(totalTimeSeconds / totalExams);

  return {
    totalExams,
    avgScore,
    highestScore: highestScore === -1 ? 0 : highestScore,
    lowestScore: lowestScore === 999 ? 0 : lowestScore,
    firstScore,
    latestScore,
    scoreDelta,
    totalQuestions,
    correctQuestions,
    unsolvedQuestions,
    accuracyPct,
    activeDays: uniqueDays.size,
    totalTabSwitches,
    avgTimeSeconds
  };
}

function filterResultsByTime(results, filterId) {
  if (filterId === 'all') return results;
  const now = new Date();

  return results.filter(r => {
    if (!r.submittedAt) return true;
    const itemDate = new Date(r.submittedAt);
    const diffMs = now - itemDate;
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (filterId === 'day') return diffHours <= 24;
    if (filterId === 'week') return diffDays <= 7;
    if (filterId === 'month') return diffDays <= 30;
    return true;
  });
}

function generateSvgScoreChart(results) {
  if (!results.length) {
    return `<div style="text-align:center;padding:2rem;color:var(--text-muted);font-weight:700;">Chưa có dữ liệu bài thi để vẽ biểu đồ.</div>`;
  }

  const width = 720;
  const height = 220;
  const padLeft = 45;
  const padRight = 35;
  const padTop = 25;
  const padBottom = 35;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const points = results.map((r, idx) => {
    const x = results.length === 1 
      ? padLeft + chartW / 2 
      : padLeft + (idx / (results.length - 1)) * chartW;
    const score = Math.max(0, Math.min(10, r.totalScore || 0));
    const y = padTop + chartH - (score / 10) * chartH;
    return { x, y, score, title: r.quizTitle || `Bài ${idx + 1}` };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${(padTop + chartH)} L ${points[0].x.toFixed(1)} ${(padTop + chartH)} Z`;

  return `
    <svg viewBox="0 0 ${width} ${height}" class="chart-svg" style="width:100%;height:220px;overflow:visible;">
      <defs>
        <linearGradient id="scoreAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--indigo)" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="var(--indigo)" stop-opacity="0.0"/>
        </linearGradient>
      </defs>

      ${[0, 2.5, 5, 7.5, 10].map(s => {
        const y = padTop + chartH - (s / 10) * chartH;
        return `
          <line x1="${padLeft}" y1="${y}" x2="${width - padRight}" y2="${y}" stroke="var(--border-color)" stroke-dasharray="4 4" stroke-width="1.2"/>
          <text x="${padLeft - 8}" y="${y + 4}" fill="var(--text-muted)" font-size="11" font-weight="700" text-anchor="end">${s}đ</text>
        `;
      }).join('')}

      <path d="${areaPath}" fill="url(#scoreAreaGrad)"/>
      <path d="${linePath}" fill="none" stroke="var(--indigo)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>

      ${points.map((p, i) => `
        <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="6" fill="#fff" stroke="var(--indigo)" stroke-width="3"/>
        <text x="${p.x.toFixed(1)}" y="${(p.y - 10).toFixed(1)}" fill="var(--indigo)" font-size="11" font-weight="900" text-anchor="middle">${p.score}đ</text>
        <text x="${p.x.toFixed(1)}" y="${height - 12}" fill="var(--text-secondary)" font-size="10" font-weight="700" text-anchor="middle">#${i + 1}</text>
      `).join('')}
    </svg>
  `;
}

function exportParentReportCard(studentName) {
  StorageEngine.getAllResults().then(all => {
    const list = all.filter(r => r.name.toLowerCase() === studentName.toLowerCase());
    if (!list.length) return;
    let csv = '\uFEFF';
    csv += 'Họ Tên,Lớp,Tên Đề,Điểm Số /10,Số Câu Đúng,Số Câu Sai,Thời Gian (giây),Rời Màn Hình,Ngày Làm\n';
    list.forEach(r => {
      const unsolved = (r.total || 0) - (r.correct || 0);
      csv += `"${r.name}","${r.className}","${r.quizTitle || r.quizId}","${r.totalScore}","${r.correct}","${unsolved}","${r.timeTakenSeconds}","${r.tabSwitches}","${r.submittedAt}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BaoCaoHocTap_${studentName}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('✅ Đã xuất báo cáo học tập thành công!', 'success');
  });
}

/* ================= TEACHER REAL ANALYTICS DASHBOARD ================= */
async function renderTeacherAnalyticsDashboard() {
  const wrap = document.getElementById('teacherAnalyticsDashboardWrap');
  if (!wrap) return;

  const allResults = await StorageEngine.getAllResults();
  const roster = AppState.studentRoster || [];

  let filtered = allResults;
  if (AppState.teacherAnalyticsScope !== 'all') {
    filtered = allResults.filter(r => r.name.toLowerCase() === AppState.teacherAnalyticsScope.toLowerCase());
  }

  filtered = filterResultsByTime(filtered, AppState.teacherTimeFilter);
  const metrics = computeRealMetrics(filtered);

  const studentOptions = [
    { value: 'all', label: '🌍 Toàn Bộ Học Sinh' },
    ...roster.map(s => ({ value: s.name, label: `👤 ${s.avatar || '👤'} ${s.name} (Lớp ${s.className})` }))
  ];

  wrap.innerHTML = `
    <!-- Scope & Time Selector Bar -->
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.75rem;margin-bottom:1.25rem;">
      <div style="display:flex;align-items:center;gap:0.6rem;flex-wrap:wrap;">
        <label style="font-weight:800;color:var(--indigo);font-size:0.9rem;">🎯 Phạm Vi Phân Tích:</label>
        <select style="font-weight:700;padding:0.4rem 0.8rem;border:2px solid var(--border-color);border-radius:var(--radius-md);" onchange="setTeacherAnalyticsScope(this.value)">
          ${studentOptions.map(opt => `
            <option value="${escapeHtml(opt.value)}" ${AppState.teacherAnalyticsScope === opt.value ? 'selected' : ''}>${escapeHtml(opt.label)}</option>
          `).join('')}
        </select>
      </div>

      <div class="time-filter-bar" style="margin:0;">
        ${[
          { id: 'all', label: '♾️ Tất Cả' },
          { id: 'day', label: '📅 Hôm Nay' },
          { id: 'week', label: '🗓️ 7 Ngày' },
          { id: 'month', label: '📆 30 Ngày' }
        ].map(f => `
          <button type="button" class="time-filter-btn ${AppState.teacherTimeFilter === f.id ? 'active' : ''}" onclick="setTeacherTimeFilter('${f.id}')">${f.label}</button>
        `).join('')}
      </div>
    </div>

    <!-- 6 Real Metric Cards -->
    <div class="analytics-metric-grid">
      <div class="metric-card metric-score">
        <div class="metric-val">${metrics.avgScore}<span style="font-size:1.1rem;font-weight:700;">/10</span></div>
        <div class="metric-lbl">Điểm Trung Bình ${AppState.teacherAnalyticsScope === 'all' ? 'Toàn Trường' : 'Học Sinh'}</div>
        <div class="metric-sub">${metrics.totalExams} bài thi · Điểm cao nhất: ${metrics.highestScore}đ</div>
      </div>

      <div class="metric-card metric-growth">
        <div class="metric-val" style="color:${metrics.scoreDelta >= 0 ? 'var(--primary)' : 'var(--rose)'};">
          ${metrics.scoreDelta > 0 ? '+' : ''}${metrics.scoreDelta}đ
        </div>
        <div class="metric-lbl">Tiến Độ Tăng Trưởng Học Lực</div>
        <div class="metric-sub">Chênh lệch giữa bài đầu & bài gần nhất</div>
      </div>

      <div class="metric-card metric-correct">
        <div class="metric-val">${metrics.correctQuestions}<span style="font-size:1.1rem;font-weight:700;">/${metrics.totalQuestions}</span></div>
        <div class="metric-lbl">Số Câu Giải Quyết Đúng</div>
        <div class="metric-sub">Tỷ lệ chính xác: <strong>${metrics.accuracyPct}%</strong></div>
      </div>

      <div class="metric-card metric-unsolved">
        <div class="metric-val">${metrics.unsolvedQuestions}</div>
        <div class="metric-lbl">Số Câu Không Giải Được / Sai</div>
        <div class="metric-sub">Chiếm ${100 - metrics.accuracyPct}% tổng câu hỏi</div>
      </div>

      <div class="metric-card metric-streak">
        <div class="metric-val">${metrics.activeDays} Ngày 🔥</div>
        <div class="metric-lbl">Ngày Hoạt Động Chuyên Cần</div>
        <div class="metric-sub">Thời gian TB: ${Math.floor(metrics.avgTimeSeconds/60)}p ${metrics.avgTimeSeconds%60}s / bài</div>
      </div>

      <div class="metric-card metric-distract">
        <div class="metric-val" style="color:${metrics.totalTabSwitches > 0 ? 'var(--rose)' : 'var(--primary)'};">${metrics.totalTabSwitches} Lần</div>
        <div class="metric-lbl">Số Lần Rời Tab Phòng Thi</div>
        <div class="metric-sub">Giám sát nghiêm túc phòng thi</div>
      </div>
    </div>

    <!-- Breakdown Bar -->
    <div style="background:var(--bg-card);padding:1rem 1.25rem;border-radius:var(--radius-lg);border:2px solid var(--border-color);margin-bottom:1.25rem;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.6rem;">
        <span style="font-weight:800;color:var(--text-primary);">📊 Cơ Cấu Câu Hỏi Toàn Bộ:</span>
        <span style="font-weight:900;color:var(--indigo);">${metrics.correctQuestions} Câu Đúng (${metrics.accuracyPct}%) &nbsp;|&nbsp; ${metrics.unsolvedQuestions} Câu Không Giải Được (${100 - metrics.accuracyPct}%)</span>
      </div>
      <div class="question-breakdown-bar">
        <div class="breakdown-seg-correct" style="width:${metrics.accuracyPct}%;"></div>
        <div class="breakdown-seg-unsolved" style="width:${100 - metrics.accuracyPct}%;"></div>
      </div>
    </div>

    <!-- SVG Progress Chart -->
    <div class="chart-container-box" style="margin-bottom:1.5rem;">
      <div class="chart-title">
        <span>📈 Biểu Đồ Thống Kê Tiến Độ Điểm Số Theo Thời Gian</span>
      </div>
      <div class="chart-svg-wrap">
        ${generateSvgScoreChart(filtered)}
      </div>
    </div>
  `;
}

function setTeacherAnalyticsScope(scope) {
  AppState.teacherAnalyticsScope = scope;
  renderTeacherAnalyticsDashboard();
  SoundEngine.playClick();
}

function setTeacherTimeFilter(filterId) {
  AppState.teacherTimeFilter = filterId;
  renderTeacherAnalyticsDashboard();
  SoundEngine.playClick();
}

/* ================= MASSIVE KEY IMPORTER ENGINE (1 - 200+ QUESTIONS) ================= */
function initSeparatedTeacherGrids(mcqCount = 10, essayCount = 2) {
  const opts = ['A', 'B', 'C', 'D'];
  AppState.teacherMcqKeys = Array.from({ length: mcqCount }, (_, i) => ({
    num: i + 1,
    type: 'mcq',
    correct: opts[i % 4],
    score: 0.5
  }));

  AppState.teacherEssayKeys = Array.from({ length: essayCount }, (_, i) => ({
    num: mcqCount + i + 1,
    type: 'essay',
    correct: i === 0 ? '12 | x=12' : '3/4 | 0.75',
    score: 2.5,
    testInput: ''
  }));

  renderTeacherMcqGrid();
  renderTeacherEssayGrid();
  updateTotalExamPointsCalculation();
}

function parseMassiveKeyString() {
  const textarea = document.getElementById('massiveKeyTextarea');
  if (!textarea) return;
  const raw = textarea.value.trim();

  if (!raw) {
    showToast('⚠️ Vui lòng dán chuỗi đáp án (VD: 1A 2B 3C... hoặc ABCDABCD...)', 'warn');
    return;
  }

  const parsedItems = extractKeyItemsFromText(raw);

  if (!parsedItems.length) {
    showToast('⚠️ Không thể nhận diện được đáp án trắc nghiệm trong đoạn văn bản.', 'warn');
    return;
  }

  parsedItems.sort((a, b) => a.num - b.num);

  const essaySum = AppState.teacherEssayKeys.reduce((sum, k) => sum + (k.score || 0), 0);
  const remainingForMcq = Math.max(1, 10 - essaySum);
  const perScore = Math.round((remainingForMcq / parsedItems.length) * 100) / 100;

  AppState.teacherMcqKeys = parsedItems.map(item => ({
    num: item.num,
    type: 'mcq',
    correct: item.correct,
    score: perScore
  }));

  renumberEssayKeys();
  renderTeacherMcqGrid();
  renderTeacherEssayGrid();
  updateTotalExamPointsCalculation();

  showToast(`⚡ ĐÃ NHẬN DIỆN THÀNH CÔNG ${parsedItems.length} CÂU TRẮC NGHIỆM!`, 'success');
  SoundEngine.playFanfare();
}

function extractKeyItemsFromText(raw) {
  const items = [];
  const regexNumbered = /(?:câu\s*)?(\d+)[\s.:)\-–—=]+([A-D])/gi;
  let match;
  const foundNums = new Set();

  while ((match = regexNumbered.exec(raw)) !== null) {
    const num = parseInt(match[1], 10);
    const ans = match[2].toUpperCase();
    if (!foundNums.has(num)) {
      foundNums.add(num);
      items.push({ num, correct: ans });
    }
  }

  if (items.length > 0) return items;

  const lines = raw.split(/[\r\n,;]+/);
  lines.forEach(line => {
    const tokens = line.trim().split(/[\s\t]+/);
    if (tokens.length >= 2 && /^\d+$/.test(tokens[0]) && /^[A-D]$/i.test(tokens[1])) {
      const num = parseInt(tokens[0], 10);
      const ans = tokens[1].toUpperCase();
      if (!foundNums.has(num)) {
        foundNums.add(num);
        items.push({ num, correct: ans });
      }
    }
  });

  if (items.length > 0) return items;

  const cleanChars = raw.toUpperCase().replace(/[^A-D]/g, '').split('');
  cleanChars.forEach((c, idx) => {
    items.push({ num: idx + 1, correct: c });
  });

  return items;
}

function handleKeyFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const content = event.target.result;
    const textarea = document.getElementById('massiveKeyTextarea');
    if (textarea) textarea.value = content;
    parseMassiveKeyString();
  };
  reader.readAsText(file);
}

function autoBalance10Points() {
  const totalCount = AppState.teacherMcqKeys.length + AppState.teacherEssayKeys.length;
  if (!totalCount) return;

  if (AppState.teacherEssayKeys.length > 0) {
    const essayCount = AppState.teacherEssayKeys.length;
    const mcqCount = AppState.teacherMcqKeys.length;
    
    let essayScoreEach = 2.0;
    if (essayCount * essayScoreEach >= 9) {
      essayScoreEach = Math.round((6.0 / essayCount) * 10) / 10;
    }
    const essayTotal = essayScoreEach * essayCount;
    const remainingForMcq = Math.max(0.5, 10.0 - essayTotal);
    const mcqScoreEach = mcqCount ? Math.round((remainingForMcq / mcqCount) * 100) / 100 : 0;

    AppState.teacherEssayKeys.forEach(k => k.score = essayScoreEach);
    AppState.teacherMcqKeys.forEach(k => k.score = mcqScoreEach);
  } else {
    const perScore = Math.round((10.0 / totalCount) * 100) / 100;
    AppState.teacherMcqKeys.forEach(k => k.score = perScore);
  }

  renderTeacherMcqGrid();
  renderTeacherEssayGrid();
  updateTotalExamPointsCalculation();
  showToast(`⚖️ Đã tự động chia đều thang điểm 10 chuẩn cho toàn bộ ${totalCount} câu!`, 'success');
  SoundEngine.playCorrect();
}

function quickFillAllKeys(choice) {
  AppState.teacherMcqKeys.forEach(k => k.correct = choice);
  renderTeacherMcqGrid();
  showToast(`✨ Đã điền tất cả câu thành đáp án [${choice}]!`, 'info');
  SoundEngine.playClick();
}

function quickRandomizeKeys() {
  const opts = ['A', 'B', 'C', 'D'];
  AppState.teacherMcqKeys.forEach(k => {
    k.correct = opts[Math.floor(Math.random() * opts.length)];
  });
  renderTeacherMcqGrid();
  showToast(`🎲 Đã tạo ngẫu nhiên phân bổ A/B/C/D cho ${AppState.teacherMcqKeys.length} câu!`, 'info');
  SoundEngine.playClick();
}

function setCustomQuestionCount(count) {
  const newCount = parseInt(count, 10);
  if (isNaN(newCount) || newCount < 1 || newCount > 500) {
    showToast('⚠️ Số lượng câu hỏi từ 1 đến 500 câu.', 'warn');
    return;
  }

  const diff = newCount - AppState.teacherMcqKeys.length;
  if (diff > 0) {
    const opts = ['A', 'B', 'C', 'D'];
    for (let i = 0; i < diff; i++) {
      const num = AppState.teacherMcqKeys.length + 1;
      AppState.teacherMcqKeys.push({
        num,
        type: 'mcq',
        correct: opts[(num - 1) % 4],
        score: 0.1
      });
    }
  } else if (diff < 0) {
    AppState.teacherMcqKeys.splice(newCount);
  }

  renumberEssayKeys();
  autoBalance10Points();
  renderTeacherMcqGrid();
  renderTeacherEssayGrid();
  showToast(`📋 Đã thiết lập danh sách ${newCount} câu trắc nghiệm!`, 'success');
  SoundEngine.playClick();
}

function renderTeacherMcqGrid() {
  const container = document.getElementById('teacherMcqGridContainer');
  const countBadge = document.getElementById('teacherMcqCountBadge');
  if (!container) return;

  const totalMcq = AppState.teacherMcqKeys.length;
  if (countBadge) countBadge.textContent = `${totalMcq} câu trắc nghiệm`;

  if (!totalMcq) {
    container.innerHTML = `<div style="text-align:center;padding:1.5rem;color:var(--text-muted);font-weight:700;">Chưa có câu trắc nghiệm nào. Hãy dán chuỗi đáp án ở trên!</div>`;
    return;
  }

  container.innerHTML = `
    <div class="key-matrix-grid">
      ${AppState.teacherMcqKeys.map((item, idx) => `
        <div class="matrix-item">
          <span class="matrix-q-num">#${item.num}</span>
          <div class="matrix-btn-group">
            ${['A','B','C','D'].map(opt => `
              <button type="button" class="matrix-opt-btn ${item.correct.toUpperCase() === opt ? 'active' : ''}" onclick="setTeacherMcqAnswer(${idx}, '${opt}')">${opt}</button>
            `).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function setTeacherMcqAnswer(idx, opt) {
  AppState.teacherMcqKeys[idx].correct = opt;
  renderTeacherMcqGrid();
  SoundEngine.playClick();
}

function setTeacherMcqScore(idx, val) {
  AppState.teacherMcqKeys[idx].score = parseFloat(val) || 0.5;
  updateTotalExamPointsCalculation();
}

function renderTeacherEssayGrid() {
  const container = document.getElementById('teacherEssayGridContainer');
  const countBadge = document.getElementById('teacherEssayCountBadge');
  if (!container) return;

  if (countBadge) countBadge.textContent = `${AppState.teacherEssayKeys.length} câu tự luận`;

  const mathSymbols = ['±', '√', 'π', '°', '²', '³', '≤', '≥', '≠', '/', '|'];

  if (!AppState.teacherEssayKeys.length) {
    container.innerHTML = `
      <div style="text-align:center;padding:1.5rem;color:var(--text-muted);border:2px dashed var(--border-color);border-radius:var(--radius-lg);">
        <p style="font-weight:700;">Đề thi này chưa có câu tự luận nào. (Nếu là đề 100% trắc nghiệm, bạn có thể bỏ qua phần này).</p>
      </div>
    `;
    return;
  }

  container.innerHTML = AppState.teacherEssayKeys.map((item, idx) => {
    const testVal = item.testInput || '';
    const isTestMatch = testVal ? checkAnswerMatch(testVal, item.correct) : null;

    return `
      <div class="card" style="padding:1.1rem;margin-bottom:0.85rem;border-left:5px solid var(--indigo);background:var(--bg-card);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.6rem;flex-wrap:wrap;gap:0.5rem;">
          <span style="font-weight:900;color:var(--indigo);font-size:1.05rem;">✍️ Câu ${item.num} (Tự Luận Điền Số):</span>
          <div style="display:flex;align-items:center;gap:0.5rem;">
            <label style="font-size:0.85rem;font-weight:800;color:var(--text-secondary);">Điểm số:</label>
            <input type="number" step="0.25" min="0.25" max="10" style="width:70px;padding:0.35rem;font-size:0.9rem;text-align:center;font-weight:800;" value="${item.score}" onchange="setTeacherEssayScore(${idx}, this.value)">
            <button type="button" class="btn btn-danger btn-sm" onclick="removeOneTeacherEssayQuestion(${idx})" title="Xóa câu này">🗑️</button>
          </div>
        </div>

        <div style="margin-bottom:0.5rem;">
          <label style="font-size:0.85rem;font-weight:800;color:var(--text-primary);display:block;margin-bottom:0.3rem;">
            🎯 Đáp số chuẩn (Dùng dấu <code style="background:var(--indigo-light);color:var(--indigo);padding:1px 6px;border-radius:4px;">|</code> để thêm nhiều cách viết tương đương):
          </label>
          <input type="text" id="teacherEssayInput_${idx}" style="width:100%;padding:0.5rem 0.8rem;font-size:1rem;font-weight:800;border:2px solid var(--border-color);border-radius:var(--radius-md);color:var(--indigo);" placeholder="VD: 12 | x=12 | x = 12 hoặc 1/2 | 0.5" value="${escapeHtml(item.correct)}" oninput="setTeacherEssayAnswer(${idx}, this.value)">
        </div>

        <div class="math-symbol-bar">
          <span style="font-size:0.75rem;font-weight:800;color:var(--text-muted);margin-right:4px;">Chèn nhanh ký hiệu:</span>
          ${mathSymbols.map(sym => `
            <button type="button" class="math-sym-btn" onclick="insertMathSymbolToEssay(${idx}, '${sym}')">${sym}</button>
          `).join('')}
        </div>

        <div class="math-tester-box" style="margin-top:0.6rem;">
          <span style="font-size:0.8rem;font-weight:800;color:var(--text-secondary);">🧪 Chấm thử câu trả lời của học sinh:</span>
          <input type="text" class="math-tester-input" style="flex:1;max-width:260px;" placeholder="Gõ thử câu trả lời bất kỳ..." value="${escapeHtml(testVal)}" oninput="testTeacherEssayMatch(${idx}, this.value)">
          ${testVal ? (isTestMatch ? '<span class="math-tester-pill badge-pass">✅ Chấm ĐÚNG</span>' : '<span class="math-tester-pill badge-fail">❌ Chấm SAI</span>') : '<span style="font-size:0.75rem;color:var(--text-muted);">Nhập để xem thử kết quả</span>'}
        </div>
      </div>
    `;
  }).join('');
}

function setTeacherEssayAnswer(idx, ans) {
  AppState.teacherEssayKeys[idx].correct = ans;
}

function setTeacherEssayScore(idx, score) {
  AppState.teacherEssayKeys[idx].score = parseFloat(score) || 1.0;
  updateTotalExamPointsCalculation();
}

function insertMathSymbolToEssay(idx, sym) {
  const input = document.getElementById(`teacherEssayInput_${idx}`);
  if (input) {
    const start = input.selectionStart || input.value.length;
    const end = input.selectionEnd || input.value.length;
    const val = input.value;
    input.value = val.substring(0, start) + sym + val.substring(end);
    input.focus();
    input.selectionStart = input.selectionEnd = start + sym.length;
    setTeacherEssayAnswer(idx, input.value);
    SoundEngine.playClick();
  }
}

function testTeacherEssayMatch(idx, val) {
  AppState.teacherEssayKeys[idx].testInput = val;
  renderTeacherEssayGrid();
}

function addOneTeacherEssayQuestion() {
  const nextNum = AppState.teacherMcqKeys.length + AppState.teacherEssayKeys.length + 1;
  AppState.teacherEssayKeys.push({
    num: nextNum,
    type: 'essay',
    correct: '12 | x=12',
    score: 2.5,
    testInput: ''
  });
  renderTeacherEssayGrid();
  updateTotalExamPointsCalculation();
  SoundEngine.playClick();
}

function removeOneTeacherEssayQuestion(idx) {
  AppState.teacherEssayKeys.splice(idx, 1);
  renumberEssayKeys();
  renderTeacherEssayGrid();
  updateTotalExamPointsCalculation();
  SoundEngine.playClick();
}

function renumberEssayKeys() {
  const startNum = AppState.teacherMcqKeys.length;
  AppState.teacherEssayKeys.forEach((k, idx) => {
    k.num = startNum + idx + 1;
  });
}

function updateTotalExamPointsCalculation() {
  const mcqTotal = AppState.teacherMcqKeys.reduce((sum, k) => sum + (k.score || 0), 0);
  const essayTotal = AppState.teacherEssayKeys.reduce((sum, k) => sum + (k.score || 0), 0);
  const totalScore = Math.round((mcqTotal + essayTotal) * 100) / 100;
  const totalCount = AppState.teacherMcqKeys.length + AppState.teacherEssayKeys.length;

  const scoreEl = document.getElementById('teacherTotalScoreCalculationBadge');
  if (scoreEl) {
    scoreEl.innerHTML = `Tổng: <strong>${totalCount} câu</strong> (Trắc nghiệm: ${Math.round(mcqTotal*100)/100}đ + Tự luận: ${Math.round(essayTotal*100)/100}đ = <strong>${totalScore}/10đ</strong>)`;
  }
}

/* ================= SMART MATH AUTO-GENERATOR CONTROLLER ================= */
function updateMathGenEssaySummary() {
  const cTH = parseInt(document.getElementById('mathGenCountTHSelect')?.value || '1', 10);
  const cVD = parseInt(document.getElementById('mathGenCountVDSelect')?.value || '1', 10);
  const cVDC = parseInt(document.getElementById('mathGenCountVDCSelect')?.value || '1', 10);
  const total = cTH + cVD + cVDC;

  const badge = document.getElementById('mathGenTotalEssaySummaryBadge');
  if (badge) {
    badge.innerHTML = `Tổng: <strong>${total} câu tự luận</strong> (TH: ${cTH} · VD: ${cVD} · VDC: ${cVDC})`;
  }
}

async function triggerAutoGenerateMathExam() {
  if (typeof MathEngine === 'undefined') {
    showToast('⚠️ Bộ sinh đề toán chưa sẵn sàng, vui lòng thử lại.', 'warn');
    return;
  }

  try {
    const grade = document.getElementById('mathGenGradeSelect')?.value || '10';
    const term = document.getElementById('mathGenTermSelect')?.value || 'GK1';
    const topic = document.getElementById('mathGenTopicSelect')?.value || 'all';
    const mcqCount = parseInt(document.getElementById('mathGenMcqCountSelect')?.value || '12', 10);

    const countTH = parseInt(document.getElementById('mathGenCountTHSelect')?.value || '1', 10);
    const countVD = parseInt(document.getElementById('mathGenCountVDSelect')?.value || '1', 10);
    const countVDC = parseInt(document.getElementById('mathGenCountVDCSelect')?.value || '1', 10);

    const generated = MathEngine.generateExam({
      grade,
      term,
      topic,
      mcqCount,
      essayMatrix: { TH: countTH, VD: countVD, VDC: countVDC },
      timeLimit: 45
    });

    // 1. Populate Creator form
    const titleInput = document.getElementById('teacherExamTitleInput');
    const gradeSelect = document.getElementById('teacherExamGradeSelect');
    const termSelect = document.getElementById('teacherExamTermSelect');
    const timeLimitInput = document.getElementById('teacherExamTimeLimitInput');
    if (titleInput) titleInput.value = generated.title;
    if (gradeSelect) gradeSelect.value = grade;
    if (termSelect) termSelect.value = term;
    if (timeLimitInput) timeLimitInput.value = generated.timeLimit;

    // 2. Set MCQ & Essay keys
    AppState.teacherMcqKeys = (generated.answerKeys || []).filter(k => k.type === 'mcq').map(k => ({
      num: k.num,
      type: 'mcq',
      correct: k.correct,
      score: k.score
    }));

    AppState.teacherEssayKeys = (generated.answerKeys || []).filter(k => k.type === 'essay').map(k => ({
      num: k.num,
      type: 'essay',
      correct: k.correct,
      score: k.score,
      testInput: ''
    }));

    // 3. Create preview HTML as standalone Data URL for PDF/iframe viewer
    const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(generated.examHtml || '');
    AppState.teacherPdfData = dataUrl;
    AppState.teacherFileName = `${(generated.title || 'De_Toan').replace(/\s+/g, '_')}.html`;

    // Render preview frame
    const previewWrap = document.getElementById('teacherPdfPreviewWrapper');
    const previewFrame = document.getElementById('teacherPdfPreviewFrame');
    const clearBtn = document.getElementById('clearPdfBtn');
    const nameBadge = document.getElementById('teacherPdfFileNameBadge');

    if (previewWrap) previewWrap.classList.remove('hidden');
    if (previewFrame) previewFrame.src = dataUrl;
    if (clearBtn) clearBtn.classList.remove('hidden');
    if (nameBadge) {
      nameBadge.classList.remove('hidden');
      nameBadge.innerHTML = `📄 <strong>Tài liệu đề Toán đã sinh:</strong> ${escapeHtml(generated.title || '')}`;
    }

    // 4. TỰ ĐỘNG LƯU VÀ PHÁT HÀNH ĐỀ THI LÊN CẢ LOCAL VÀ CLOUD NGAY LẬP TỨC
    const newQuizId = generateQuizCode();
    const autoQuiz = {
      id: newQuizId,
      title: generated.title,
      targetClass: grade,
      examTerm: term,
      timeLimit: generated.timeLimit,
      totalQuestions: generated.answerKeys.length,
      mcqCount: generated.mcqCount,
      essayCount: generated.essayCount,
      examMode: 'split_pdf',
      examHtml: generated.examHtml, // Nhúng trực tiếp HTML đề thi để mọi thiết bị học sinh đều mở được ngay
      pdfFileName: AppState.teacherFileName,
      pdfDataUrl: dataUrl,
      assignType: 'all',
      assignedClasses: [],
      assignedStudents: [],
      showLeaderboard: true,
      antiCheat: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      answerKeys: generated.answerKeys
    };

    const saveRes = await StorageEngine.saveQuiz(autoQuiz);
    await StorageEngine.savePdfBlob(newQuizId, dataUrl);

    // Gán trạng thái đang chỉnh sửa đề này để nếu thầy cô muốn sửa thêm thì bấm "Lưu Thay Đổi"
    AppState.editingQuizId = newQuizId;
    AppState.editingQuizCreatedAt = autoQuiz.createdAt;

    // 5. Cập nhật giao diện lưới soạn thảo và danh sách đề
    renderTeacherMcqGrid();
    renderTeacherEssayGrid();
    updateTotalExamPointsCalculation();
    updatePersonalizedExamFeed();
    renderTeacherQuizManager();
    renderTeacherAnalyticsDashboard();

    // 6. Hiển thị hộp thông báo kết quả phát hành nổi bật
    const resBox = document.getElementById('mathGenResultBox');
    if (resBox) {
      resBox.classList.remove('hidden');
      const cloudStatusMsg = (saveRes && saveRes.cloudSaved)
        ? '<span style="color:var(--emerald-shadow);">☁️ Đã đồng bộ lên Firebase Cloud (Học sinh trên máy khác có thể thấy và làm bài ngay)!</span>'
        : '<span style="color:var(--amber-shadow);">💾 Đã lưu vào bộ nhớ máy này (Sẵn sàng phát hành hoặc thi thử).</span>';

      resBox.innerHTML = `
        <div style="background:var(--primary-light);border:2px solid var(--primary);border-radius:var(--radius-lg);padding:1.15rem 1.35rem;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:0.75rem;">
            <div>
              <h4 style="color:var(--primary-shadow);margin-bottom:0.35rem;font-size:1.15rem;">🎉 ĐÃ TỰ ĐỘNG SINH & LƯU PHÁT HÀNH ĐỀ THI THÀNH CÔNG!</h4>
              <p style="color:var(--primary-shadow);font-size:0.92rem;font-weight:700;margin-bottom:0.4rem;">
                Đề: <strong>${escapeHtml(generated.title)}</strong> (Lớp ${grade} · ${term} · ${generated.timeLimit} phút)
              </p>
              <div style="font-size:0.875rem;font-weight:700;">${cloudStatusMsg}</div>
            </div>
            <div style="text-align:right;">
              <span class="code-badge" style="font-size:1.6rem;padding:0.4rem 1rem;">${newQuizId}</span>
              <div style="font-size:0.75rem;color:var(--text-secondary);margin-top:2px;">MÃ ĐỀ THI</div>
            </div>
          </div>

          <div style="display:flex;gap:0.6rem;flex-wrap:wrap;margin-top:1rem;">
            <button type="button" class="btn btn-primary" onclick="loadSampleToStudent('${newQuizId}')">🚀 Vào Thi Thử Ngay</button>
            <button type="button" class="btn btn-secondary" onclick="copyQuizCode('${newQuizId}')">📋 Sao Chép Mã Đề</button>
            <button type="button" class="btn btn-sky" onclick="copyQuizLink('${newQuizId}')">🔗 Sao Chép Link Đề</button>
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('singleExamCreatorSection').scrollIntoView({behavior:'smooth'})">✏️ Chỉnh Sửa Đề Ở Dưới</button>
          </div>
        </div>
      `;
    }

    if (typeof SoundEngine !== 'undefined' && SoundEngine.playFanfare) SoundEngine.playFanfare();
    if (typeof GamificationEngine !== 'undefined' && GamificationEngine.fireConfetti) GamificationEngine.fireConfetti();
    showToast(`⚡ Đã tự động sinh và lưu đề thi [${newQuizId}] thành công!`, 'success');
  } catch (err) {
    console.error("Math Generator Error:", err);
    showToast(`⚠️ Có lỗi khi sinh đề: ${err.message}`, 'error');
  }
}

function previewGeneratedMathExamDocument() {
  const frame = document.getElementById('teacherPdfPreviewFrame');
  if (frame && frame.src && frame.src !== 'about:blank') {
    window.open(frame.src, '_blank');
  } else {
    triggerAutoGenerateMathExam();
  }
}

/* ================= FILE UPLOAD & PREVIEW HANDLERS ================= */
function handleTeacherPdfSelect() {
  const fileInput = document.getElementById('teacherPdfFileInput');
  if (!fileInput || !fileInput.files || !fileInput.files[0]) return;

  const file = fileInput.files[0];
  AppState.teacherFileName = file.name;

  const reader = new FileReader();
  reader.onload = (e) => {
    AppState.teacherPdfData = e.target.result;
    
    // Update preview frame
    const previewWrap = document.getElementById('teacherPdfPreviewWrapper');
    const previewFrame = document.getElementById('teacherPdfPreviewFrame');
    const clearBtn = document.getElementById('clearPdfBtn');
    const nameBadge = document.getElementById('teacherPdfFileNameBadge');

    if (previewWrap) previewWrap.classList.remove('hidden');
    if (previewFrame) previewFrame.src = AppState.teacherPdfData;
    if (clearBtn) clearBtn.classList.remove('hidden');
    if (nameBadge) {
      nameBadge.classList.remove('hidden');
      nameBadge.innerHTML = `📄 <strong>File đính kèm:</strong> ${escapeHtml(file.name)} (${(file.size / 1024).toFixed(1)} KB)`;
    }

    // Auto update exam title if currently default or empty
    const titleInput = document.getElementById('teacherExamTitleInput');
    if (titleInput && (titleInput.value === 'Đề Kiểm Tra Giữa Kì I — Môn Toán' || !titleInput.value.trim())) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_\\-]+/g, ' ');
      titleInput.value = cleanName;
    }

    showToast(`📄 Đã tải lên file đề thi: ${file.name}`, 'success');
    SoundEngine.playPop ? SoundEngine.playPop() : SoundEngine.playClick();
  };
  reader.readAsDataURL(file);
}

function clearTeacherPdf() {
  AppState.teacherPdfData = null;
  AppState.teacherFileName = '';
  const fileInput = document.getElementById('teacherPdfFileInput');
  if (fileInput) fileInput.value = '';
  const previewWrap = document.getElementById('teacherPdfPreviewWrapper');
  const previewFrame = document.getElementById('teacherPdfPreviewFrame');
  const clearBtn = document.getElementById('clearPdfBtn');
  const nameBadge = document.getElementById('teacherPdfFileNameBadge');

  if (previewWrap) previewWrap.classList.add('hidden');
  if (previewFrame) previewFrame.src = 'about:blank';
  if (clearBtn) clearBtn.classList.add('hidden');
  if (nameBadge) nameBadge.classList.add('hidden');

  showToast('🗑️ Đã gỡ bỏ file đề đính kèm.', 'info');
}

/* ================= BATCH EXAM UPLOAD HANDLERS ================= */
function handleBatchFilesSelect() {
  const fileInput = document.getElementById('batchExamFilesInput');
  if (!fileInput || !fileInput.files || !fileInput.files.length) return;

  const files = Array.from(fileInput.files);
  const commonTimeLimit = parseInt(document.getElementById('batchCommonTimeLimitInput')?.value || '45', 10);
  const commonQCount = parseInt(document.getElementById('batchCommonQuestionCountSelect')?.value || '12', 10);
  const commonAssignType = document.getElementById('batchCommonAssignTypeSelect')?.value || 'all';

  const defaultMcqCount = Math.max(1, commonQCount > 2 ? commonQCount - 2 : commonQCount);
  const defaultEssayCount = commonQCount > 2 ? 2 : 0;

  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[_\\-]+/g, ' ');
      
      const opts = ['A', 'B', 'C', 'D'];
      const mcqKeys = Array.from({ length: defaultMcqCount }, (_, i) => ({
        num: i + 1,
        type: 'mcq',
        correct: opts[i % 4],
        score: Math.round(((10 - defaultEssayCount * 2) / defaultMcqCount) * 100) / 100
      }));

      const essayKeys = Array.from({ length: defaultEssayCount }, (_, i) => ({
        num: defaultMcqCount + i + 1,
        type: 'essay',
        correct: '12 | x=12',
        score: 2.0
      }));

      AppState.batchExamsQueue.push({
        id: generateQuizCode(),
        fileName: file.name,
        fileData: e.target.result,
        title: cleanTitle,
        timeLimit: commonTimeLimit,
        totalQuestions: commonQCount,
        assignType: commonAssignType,
        answerKeys: [...mcqKeys, ...essayKeys]
      });

      renderBatchQueue();
    };
    reader.readAsDataURL(file);
  });

  fileInput.value = '';
  showToast(`⚡ Đang chuẩn bị ${files.length} đề trong danh sách tải lên hàng loạt...`, 'info');
}

function renderBatchQueue() {
  const wrap = document.getElementById('batchQueueTableWrap');
  const badge = document.getElementById('batchQueueCountBadge');
  if (!wrap) return;

  const queue = AppState.batchExamsQueue;
  if (badge) badge.textContent = `${queue.length} đề`;

  if (!queue.length) {
    wrap.innerHTML = '';
    return;
  }

  wrap.innerHTML = `
    <div style="background:var(--bg-card);padding:1rem;border-radius:var(--radius-lg);border:2px solid var(--border-color);margin-top:1rem;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;flex-wrap:wrap;gap:0.5rem;">
        <span style="font-weight:800;color:var(--text-primary);">📋 Danh Sách Đề Chờ Lưu & Phát Hành (${queue.length} đề):</span>
        <button type="button" class="btn btn-primary btn-lg" onclick="publishBatchExams()">💾 Lưu & Phát Hành Toàn Bộ ${queue.length} Đề 🚀</button>
      </div>

      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Tên File / Đề Thi</th>
              <th>Thời Gian</th>
              <th>Số Câu</th>
              <th>Đối Tượng</th>
              <th>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            ${queue.map((item, idx) => `
              <tr>
                <td><strong>${idx + 1}</strong></td>
                <td>
                  <input type="text" value="${escapeHtml(item.title)}" onchange="updateBatchItemTitle(${idx}, this.value)" style="width:100%;min-width:180px;padding:0.3rem 0.5rem;font-weight:700;">
                  <div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px;">📄 ${escapeHtml(item.fileName)}</div>
                </td>
                <td>
                  <input type="number" value="${item.timeLimit}" min="1" max="180" onchange="updateBatchItemTime(${idx}, this.value)" style="width:65px;padding:0.3rem;text-align:center;font-weight:700;"> p
                </td>
                <td><span class="badge-status badge-pass">${item.answerKeys.length} câu</span></td>
                <td>
                  <select onchange="updateBatchItemAssign(${idx}, this.value)" style="padding:0.3rem;font-weight:700;font-size:0.85rem;">
                    <option value="all" ${item.assignType === 'all' ? 'selected' : ''}>🌍 Công khai</option>
                    <option value="classes" ${item.assignType === 'classes' ? 'selected' : ''}>🏫 Theo Lớp</option>
                  </select>
                </td>
                <td>
                  <button type="button" class="btn btn-danger btn-sm" onclick="removeBatchQueueItem(${idx})" title="Xóa đề này khỏi hàng đợi">🗑️</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function updateBatchItemTitle(idx, val) {
  if (AppState.batchExamsQueue[idx]) AppState.batchExamsQueue[idx].title = val.trim();
}

function updateBatchItemTime(idx, val) {
  if (AppState.batchExamsQueue[idx]) AppState.batchExamsQueue[idx].timeLimit = parseInt(val, 10) || 45;
}

function updateBatchItemAssign(idx, val) {
  if (AppState.batchExamsQueue[idx]) AppState.batchExamsQueue[idx].assignType = val;
}

function removeBatchQueueItem(idx) {
  AppState.batchExamsQueue.splice(idx, 1);
  renderBatchQueue();
  SoundEngine.playClick();
}

async function publishBatchExams() {
  const queue = AppState.batchExamsQueue;
  if (!queue.length) return;

  for (const item of queue) {
    const mcqKeys = item.answerKeys.filter(k => k.type === 'mcq');
    const essayKeys = item.answerKeys.filter(k => k.type === 'essay');

    const quiz = {
      id: item.id || generateQuizCode(),
      title: item.title,
      targetClass: item.targetClass || detectGradeFromTitle(item.title) || '10',
      examTerm: item.examTerm || detectTermFromTitle(item.title) || 'GK1',
      timeLimit: item.timeLimit,
      totalQuestions: item.answerKeys.length,
      mcqCount: mcqKeys.length,
      essayCount: essayKeys.length,
      examMode: 'split_pdf',
      pdfFileName: item.fileName,
      pdfDataUrl: item.fileData,
      assignType: item.assignType || 'all',
      assignedClasses: [],
      assignedStudents: [],
      showLeaderboard: true,
      antiCheat: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      answerKeys: item.answerKeys
    };

    await StorageEngine.saveQuiz(quiz);
    if (item.fileData) {
      await StorageEngine.savePdfBlob(quiz.id, item.fileData);
    }
  }

  showToast(`🎉 Đã lưu và phát hành thành công ${queue.length} đề thi mới!`, 'success');
  SoundEngine.playFanfare();
  GamificationEngine.fireConfetti();

  AppState.batchExamsQueue = [];
  renderBatchQueue();
  updatePersonalizedExamFeed();
  renderTeacherQuizManager();
  renderTeacherAnalyticsDashboard();
}

/* ================= EDIT & MANAGE SINGLE EXAM ================= */
async function editTeacherQuiz(quizId) {
  const quiz = await StorageEngine.getQuiz(quizId);
  if (!quiz) {
    showToast('❌ Không tìm thấy đề thi cần chỉnh sửa.', 'error');
    return;
  }

  AppState.editingQuizId = quizId;
  AppState.editingQuizCreatedAt = quiz.createdAt || new Date().toISOString();

  // Scroll smoothly to editor
  const editorEl = document.getElementById('singleExamCreatorSection');
  if (editorEl) editorEl.scrollIntoView({ behavior: 'smooth' });

  // Update Edit Mode UI
  const banner = document.getElementById('teacherExamEditorModeBanner');
  const idText = document.getElementById('editingExamIdText');
  const titleText = document.getElementById('editingExamTitleText');
  const saveBtn = document.getElementById('teacherSaveQuizBtn');
  const cancelBtn = document.getElementById('teacherCancelEditBtn');
  const headerIcon = document.getElementById('creatorCardHeaderIcon');
  const headerTitle = document.getElementById('creatorCardHeaderTitle');

  if (banner) banner.classList.remove('hidden');
  if (idText) idText.textContent = quiz.id;
  if (titleText) titleText.textContent = quiz.title;
  if (saveBtn) saveBtn.innerHTML = '💾 Lưu Thay Đổi Đề Thi (Update)';
  if (cancelBtn) cancelBtn.classList.remove('hidden');
  if (headerIcon) headerIcon.textContent = '✏️';
  if (headerTitle) headerTitle.textContent = `Chỉnh Sửa Đề Thi: ${quiz.title}`;

  // Populate form fields
  const titleInput = document.getElementById('teacherExamTitleInput');
  const gradeSelect = document.getElementById('teacherExamGradeSelect');
  const termSelect = document.getElementById('teacherExamTermSelect');
  const timeLimitInput = document.getElementById('teacherExamTimeLimitInput');
  const assignSelect = document.getElementById('assignTypeSelect');
  const leaderboardToggle = document.getElementById('teacherShowLeaderboardToggle');
  const antiCheatToggle = document.getElementById('teacherAntiCheatToggle');

  if (titleInput) titleInput.value = quiz.title || '';
  if (gradeSelect) gradeSelect.value = quiz.targetClass || detectGradeFromTitle(quiz.title) || '10';
  if (termSelect) termSelect.value = quiz.examTerm || detectTermFromTitle(quiz.title);
  if (timeLimitInput) timeLimitInput.value = quiz.timeLimit || 45;
  if (leaderboardToggle) leaderboardToggle.checked = quiz.showLeaderboard !== false;
  if (antiCheatToggle) antiCheatToggle.checked = quiz.antiCheat !== false;

  if (assignSelect) {
    assignSelect.value = quiz.assignType || 'all';
    renderAssignTargetsSelector();

    // Check specific classes/students
    if (quiz.assignType === 'classes' && Array.isArray(quiz.assignedClasses)) {
      quiz.assignedClasses.forEach(c => {
        const cb = document.querySelector(`input[name="assign_class_cb"][value="${c}"]`);
        if (cb) cb.checked = true;
      });
    } else if (quiz.assignType === 'students' && Array.isArray(quiz.assignedStudents)) {
      quiz.assignedStudents.forEach(s => {
        const cb = document.querySelector(`input[name="assign_student_cb"][value="${s}"]`);
        if (cb) cb.checked = true;
      });
    }
  }

  // Handle PDF preview
  let pdfData = quiz.pdfDataUrl;
  if (!pdfData) {
    pdfData = await StorageEngine.getPdfBlob(quizId);
  }
  AppState.teacherPdfData = pdfData || null;
  AppState.teacherFileName = quiz.pdfFileName || '';

  const previewWrap = document.getElementById('teacherPdfPreviewWrapper');
  const previewFrame = document.getElementById('teacherPdfPreviewFrame');
  const clearBtn = document.getElementById('clearPdfBtn');
  const nameBadge = document.getElementById('teacherPdfFileNameBadge');

  if (pdfData) {
    if (previewWrap) previewWrap.classList.remove('hidden');
    if (previewFrame) previewFrame.src = pdfData;
    if (clearBtn) clearBtn.classList.remove('hidden');
    if (nameBadge) {
      nameBadge.classList.remove('hidden');
      nameBadge.innerHTML = `📄 <strong>File đang dùng:</strong> ${escapeHtml(quiz.pdfFileName || 'De_Thi.pdf')}`;
    }
  } else {
    if (previewWrap) previewWrap.classList.add('hidden');
    if (clearBtn) clearBtn.classList.add('hidden');
    if (nameBadge) nameBadge.classList.add('hidden');
  }

  // Populate questions
  const keys = quiz.answerKeys || [];
  AppState.teacherMcqKeys = keys.filter(k => k.type === 'mcq').map(k => ({ ...k }));
  AppState.teacherEssayKeys = keys.filter(k => k.type === 'essay').map(k => ({ ...k }));

  renderTeacherMcqGrid();
  renderTeacherEssayGrid();
  updateTotalExamPointsCalculation();

  showToast(`✏️ Đã mở chế độ chỉnh sửa cho đề [${quiz.title}].`, 'info');
  SoundEngine.playPop ? SoundEngine.playPop() : SoundEngine.playClick();
}

function cancelTeacherQuizEdit() {
  AppState.editingQuizId = null;
  AppState.editingQuizCreatedAt = null;

  const banner = document.getElementById('teacherExamEditorModeBanner');
  const saveBtn = document.getElementById('teacherSaveQuizBtn');
  const cancelBtn = document.getElementById('teacherCancelEditBtn');
  const headerIcon = document.getElementById('creatorCardHeaderIcon');
  const headerTitle = document.getElementById('creatorCardHeaderTitle');

  if (banner) banner.classList.add('hidden');
  if (saveBtn) saveBtn.innerHTML = '💾 Lưu & Phát Hành Đề Thi 🎯';
  if (cancelBtn) cancelBtn.classList.add('hidden');
  if (headerIcon) headerIcon.textContent = '➕';
  if (headerTitle) headerTitle.textContent = 'Tạo & Thiết Lập 1 Đề Thi Riêng Biệt';

  // Reset form to defaults
  const titleInput = document.getElementById('teacherExamTitleInput');
  const gradeSelect = document.getElementById('teacherExamGradeSelect');
  const termSelect = document.getElementById('teacherExamTermSelect');
  const timeLimitInput = document.getElementById('teacherExamTimeLimitInput');
  if (titleInput) titleInput.value = 'Đề Kiểm Tra Giữa Kì I — Môn Toán';
  if (gradeSelect) gradeSelect.value = '10';
  if (termSelect) termSelect.value = 'GK1';
  if (timeLimitInput) timeLimitInput.value = '45';

  clearTeacherPdf();
  initSeparatedTeacherGrids(10, 2);

  showToast('🔄 Đã thoát chế độ chỉnh sửa. Đang ở chế độ tạo đề mới.', 'info');
}

/* ================= QUIZ PUBLISHING & RESULTS ================= */
async function publishTeacherQuiz() {
  const combinedKeys = [...AppState.teacherMcqKeys, ...AppState.teacherEssayKeys];

  if (!combinedKeys.length) {
    showToast('⚠️ Vui lòng thiết lập ít nhất 1 câu hỏi trắc nghiệm hoặc tự luận.', 'warn');
    return;
  }

  const isEditing = !!AppState.editingQuizId;
  const id = isEditing ? AppState.editingQuizId : generateQuizCode();
  const title = document.getElementById('teacherExamTitleInput').value.trim() || 'Đề Kiểm Tra Toán Học';
  const gradeSelect = document.getElementById('teacherExamGradeSelect');
  const targetClass = gradeSelect ? gradeSelect.value : (detectGradeFromTitle(title) || '10');
  const examTerm = document.getElementById('teacherExamTermSelect')?.value || detectTermFromTitle(title);
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

  let examHtml = null;
  if (AppState.teacherPdfData && typeof AppState.teacherPdfData === 'string' && AppState.teacherPdfData.startsWith('data:text/html')) {
    try {
      const parts = AppState.teacherPdfData.split(',');
      if (parts.length > 1) {
        examHtml = decodeURIComponent(parts[1]);
      }
    } catch (e) {}
  }

  const quiz = {
    id,
    title,
    targetClass,
    examTerm,
    timeLimit,
    totalQuestions: combinedKeys.length,
    mcqCount: AppState.teacherMcqKeys.length,
    essayCount: AppState.teacherEssayKeys.length,
    examMode: 'split_pdf',
    examHtml,
    pdfFileName: AppState.teacherFileName || 'De_Thi_Toan.pdf',
    pdfDataUrl: AppState.teacherPdfData || null,
    assignType,
    assignedClasses,
    assignedStudents,
    showLeaderboard,
    antiCheat,
    createdAt: isEditing ? (AppState.editingQuizCreatedAt || new Date().toISOString()) : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    answerKeys: combinedKeys
  };

  const saveRes = await StorageEngine.saveQuiz(quiz);
  if (AppState.teacherPdfData) {
    await StorageEngine.savePdfBlob(id, AppState.teacherPdfData);
  }

  SoundEngine.playFanfare();
  GamificationEngine.fireConfetti();

  updatePersonalizedExamFeed();
  renderTeacherQuizManager();
  renderTeacherAnalyticsDashboard();

  let saveToast = isEditing ? `💾 Đã lưu và cập nhật đề [${title}]!` : `🎉 Đã phát hành đề thi mới [${title}]!`;
  if (saveRes && saveRes.cloudSaved) {
    saveToast += ' (Đã đồng bộ lên Firebase Cloud ☁️)';
  } else if (window.FirebaseEngine && window.FirebaseEngine.isActive) {
    saveToast += ' (Lưu thành công vào máy local 💾. Lưu ý: Firebase Cloud chưa được kích hoạt)';
  }
  showToast(saveToast, 'success');

  const targetDesc = assignType === 'all' 
    ? '🌍 Công khai toàn bộ' 
    : (assignType === 'classes' ? `🏫 Giao cho lớp: ${assignedClasses.join(', ')}` : `👤 Giao đích danh: ${assignedStudents.length} học sinh`);

  const resDiv = document.getElementById('publishSuccessResult');
  resDiv.innerHTML = `
    <div class="card" style="background:var(--primary-light);border-color:var(--primary);margin-top:1rem;">
      <h3 style="color:var(--primary-shadow);margin-bottom:0.4rem;">${isEditing ? '💾 Đã Lưu & Cập Nhật Thay Đổi Thành Công!' : '🎉 Đã Phát Hành Đề Thi Thành Công!'}</h3>
      <p style="color:var(--primary-shadow);font-size:0.95rem;font-weight:700;">Gồm ${AppState.teacherMcqKeys.length} câu trắc nghiệm + ${AppState.teacherEssayKeys.length} câu tự luận. Phạm vi: <strong>${targetDesc}</strong></p>
      <div style="margin:1rem 0;display:flex;align-items:center;gap:1rem;flex-wrap:wrap;">
        <span class="code-badge" style="font-size:1.8rem;padding:0.6rem 1.4rem;">${id}</span>
        <button class="btn btn-secondary" onclick="loadSampleToStudent('${id}')">🚀 Vào Thi Thử Ngay</button>
        <button class="btn btn-primary" onclick="cancelTeacherQuizEdit()">➕ Tạo Đề Thi Khác</button>
      </div>
    </div>
  `;
  resDiv.scrollIntoView({ behavior: 'smooth' });

  showToast(isEditing ? `💾 Đã lưu và cập nhật đề [${title}]!` : `🎉 Đã phát hành đề thi mới [${title}]!`, 'success');

  // Reset Edit State
  AppState.editingQuizId = null;
  AppState.editingQuizCreatedAt = null;
  const banner = document.getElementById('teacherExamEditorModeBanner');
  const saveBtn = document.getElementById('teacherSaveQuizBtn');
  const cancelBtn = document.getElementById('teacherCancelEditBtn');
  const headerIcon = document.getElementById('creatorCardHeaderIcon');
  const headerTitle = document.getElementById('creatorCardHeaderTitle');

  if (banner) banner.classList.add('hidden');
  if (saveBtn) saveBtn.innerHTML = '💾 Lưu & Phát Hành Đề Thi 🎯';
  if (cancelBtn) cancelBtn.classList.add('hidden');
  if (headerIcon) headerIcon.textContent = '➕';
  if (headerTitle) headerTitle.textContent = 'Tạo & Thiết Lập 1 Đề Thi Riêng Biệt';
}

function generateQuizCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

/* ================= QUIZ & RESULTS MANAGER ================= */
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
      <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
        <button class="btn btn-primary btn-sm" onclick="bulkSetAllQuizzesPublic()">🌍 Công Khai Tất Cả Đề</button>
        <button class="btn btn-danger btn-sm" onclick="deleteAllSampleQuizzes()">🗑️ Xóa Tất Cả Đề Mẫu</button>
      </div>
    </div>

    <div class="table-responsive">
      <table>
        <thead>
          <tr>
            <th>Tên Đề Thi</th>
            <th>Đối Tượng Giao</th>
            <th>Cấu Trúc Đề</th>
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

            const mcqCount = q.mcqCount || (q.answerKeys ? q.answerKeys.filter(k => k.type === 'mcq').length : 0);
            const essayCount = q.essayCount || (q.answerKeys ? q.answerKeys.filter(k => k.type === 'essay').length : 0);
            const termBadge = getExamTermBadge(q.examTerm || detectTermFromTitle(q.title));

            return `
              <tr>
                <td>
                  <div style="display:flex;align-items:center;gap:0.4rem;flex-wrap:wrap;">
                    <strong style="color:var(--text-primary);font-size:1rem;">${escapeHtml(q.title)}</strong>
                    ${termBadge}
                  </div>
                  <div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px;">Mã đề: <code>${q.id}</code></div>
                </td>
                <td>${targetLabel}</td>
                <td>
                  <span class="badge-status badge-pass" style="font-size:0.75rem;">${mcqCount} Trắc nghiệm</span>
                  ${essayCount > 0 ? `<span class="badge-status" style="font-size:0.75rem;background:var(--amber-light);color:var(--amber-shadow);margin-left:4px;">${essayCount} Tự luận</span>` : ''}
                </td>
                <td>${q.timeLimit} phút</td>
                <td>
                  <div style="display:flex;gap:0.4rem;align-items:center;flex-wrap:wrap;">
                    <button class="btn btn-primary btn-sm" onclick="editTeacherQuiz('${q.id}')" title="Chỉnh sửa đề thi này">✏️ Sửa</button>
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
    showToast('⚡ Đang xóa đề thi...', 'info');
    await StorageEngine.deleteQuiz(quizId);
    showToast(`🗑️ Đã xóa thành công đề thi!`, 'success');
    SoundEngine.playClick();
    await updatePersonalizedExamFeed();
    await renderTeacherQuizManager();
    await renderTeacherAnalyticsDashboard();
  }
}

async function deleteAllSampleQuizzes() {
  const sampleIds = [
    'TOAN6_GK1', 'TOAN7_GK1', 'TOAN8_GK1', 'TOAN9_GK1',
    'TOAN_TS10', 'TOAN10_GK1', 'TOAN11_GK1', 'TOAN12_GK1'
  ];

  if (!confirm('🗑️ Bạn có chắc chắn muốn XÓA SẠCH toàn bộ các đề thi mẫu khỏi hệ thống? (Các đề do bạn tự tạo vẫn được giữ nguyên)')) {
    return;
  }

  showToast('⚡ Đang xóa sạch tất cả đề thi mẫu...', 'info');

  for (const id of sampleIds) {
    await StorageEngine.deleteQuiz(id);
  }

  showToast('✅ Đã xóa sạch toàn bộ đề mẫu khỏi máy và Cloud!', 'success');
  if (typeof SoundEngine !== 'undefined' && SoundEngine.playCorrect) {
    SoundEngine.playCorrect();
  }
  await updatePersonalizedExamFeed();
  await renderTeacherQuizManager();
  await renderTeacherAnalyticsDashboard();
}

/* ================= PERSONALIZED EXAM FEED ================= */
function filterExamFeedByGrade(grade) {
  AppState.selectedGradeFilter = grade;
  const gradeBtns = ['all', '6', '7', '8', '9', 'TS10', '10', '11', '12'];
  gradeBtns.forEach(g => {
    const btn = document.getElementById(`gradeBtn_${g}`);
    if (btn) btn.classList.toggle('active', g === grade);
  });
  updatePersonalizedExamFeed();
}

function updatePersonalizedExamFeed() {
  const currentName = (document.getElementById('studentJoinName')?.value || '').trim();
  const currentClass = (document.getElementById('studentJoinClass')?.value || '').trim();
  renderSampleQuizzes(currentName, currentClass);
  checkAndRenderPausedExamBanner();
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

  // 1. Filter by Grade if selected in Grade Filter Bar
  if (AppState.selectedGradeFilter && AppState.selectedGradeFilter !== 'all') {
    const targetGrade = AppState.selectedGradeFilter;
    displayedQuizzes = displayedQuizzes.filter(q => {
      if (q.targetClass && q.targetClass.toString() === targetGrade) return true;
      const gradeFromTitle = detectGradeFromTitle(q.title);
      if (gradeFromTitle && gradeFromTitle.toString() === targetGrade) return true;
      return false;
    });
  }

  // 2. Filter by Semester/Term if selected
  if (AppState.selectedTermFilter && AppState.selectedTermFilter !== 'all') {
    const targetTerm = AppState.selectedTermFilter;
    displayedQuizzes = displayedQuizzes.filter(q => {
      const qTerm = q.examTerm || detectTermFromTitle(q.title);
      return qTerm === targetTerm;
    });
  }

  // 3. Filter by student specific assignment if assigned to specific students
  if (filterName) {
    displayedQuizzes = displayedQuizzes.filter(q => {
      if (q.assignType === 'students' && Array.isArray(q.assignedStudents)) {
        const studentTag = `${filterName} (${filterClass})`.toLowerCase();
        return q.assignedStudents.some(s => s.toLowerCase() === studentTag || s.toLowerCase().includes(filterName.toLowerCase()));
      }
      return true;
    });
  }

  const titleHeader = document.getElementById('studentFeedHeaderTitle');
  if (titleHeader) {
    if (AppState.selectedGradeFilter && AppState.selectedGradeFilter !== 'all') {
      titleHeader.textContent = `📚 Danh Sách Đề Thi Lớp ${AppState.selectedGradeFilter === 'TS10' ? 'Luyện Thi Vào 10' : AppState.selectedGradeFilter}`;
    } else if (filterName && filterClass) {
      titleHeader.textContent = `📚 Đề Thi Dành Cho: ${filterName} (Lớp ${filterClass})`;
    } else {
      titleHeader.textContent = '📚 Danh Sách Tất Cả Đề Thi (Lớp 6 - 12)';
    }
  }

  if (!displayedQuizzes.length) {
    wrap.innerHTML = `
      <div style="text-align:center;padding:1.75rem 1rem;color:var(--text-muted);">
        <div style="font-size:2.5rem;margin-bottom:0.4rem;">📭</div>
        <p style="font-weight:800;font-size:1.05rem;color:var(--amber-shadow);">Hiện tại chưa có đề thi nào phù hợp với bộ lọc hiện tại.</p>
        <p style="font-size:0.875rem;margin-top:4px;">Hãy thử chuyển sang tab <strong>"♾️ Tất Cả Kỳ"</strong> hoặc đổi khối lớp để xem thêm đề thi.</p>
      </div>
    `;
    return;
  }

  wrap.innerHTML = displayedQuizzes.map(q => {
    let targetBadge = '<span class="badge-status badge-pass" style="font-size:0.75rem;">🌍 Đề công khai</span>';
    if (q.assignType === 'classes') {
      targetBadge = `<span class="badge-status" style="font-size:0.75rem;background:var(--sky-light);color:var(--sky-shadow);">🏫 Lớp ${(q.assignedClasses||[]).join(', ')}</span>`;
    } else if (q.assignType === 'students') {
      targetBadge = `<span class="badge-status" style="font-size:0.75rem;background:var(--amber-light);color:var(--amber-shadow);">👤 Đích danh bạn</span>`;
    }

    const termBadge = getExamTermBadge(q.examTerm || detectTermFromTitle(q.title));
    const mcqCount = q.mcqCount || (q.answerKeys ? q.answerKeys.filter(k => k.type === 'mcq').length : 0);
    const essayCount = q.essayCount || (q.answerKeys ? q.answerKeys.filter(k => k.type === 'essay').length : 0);

    return `
      <div class="card" style="padding:1.25rem;margin-bottom:0.85rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;border-left:6px solid ${q.assignType === 'students' ? 'var(--amber)' : (q.assignType === 'classes' ? 'var(--sky)' : 'var(--primary)')};">
        <div>
          <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
            <div style="font-weight:800;font-size:1.15rem;color:var(--text-primary);">${escapeHtml(q.title)}</div>
            ${termBadge}
            ${targetBadge}
          </div>
          <div style="font-size:0.9rem;color:var(--text-secondary);margin-top:4px;font-weight:600;">
            ⏳ <strong>${q.timeLimit} phút</strong> · 📝 <strong>${mcqCount} trắc nghiệm</strong> + <strong>${essayCount} tự luận</strong>
          </div>
        </div>
        <div style="display:flex;gap:0.5rem;align-items:center;">
          <button class="btn btn-primary btn-sm" onclick="loadSampleToStudent('${q.id}')">🚀 Vào Thi Ngay</button>
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
  let quiz = await StorageEngine.getQuiz(quizId);

  // If not found locally, attempt direct fetch from Firebase Cloud
  if (!quiz && window.FirebaseEngine && window.FirebaseEngine.isActive) {
    statusEl.innerHTML = '<span style="color:var(--indigo);">☁️ Đang tìm đề thi trên Firebase Cloud...</span>';
    quiz = await window.FirebaseEngine.getQuiz(quizId);
    if (quiz) {
      await StorageEngine.saveQuiz(quiz);
    }
  }

  if (!quiz) {
    statusEl.innerHTML = '<span style="color:var(--rose);">❌ Không tìm thấy đề thi với mã: <strong>' + escapeHtml(quizId) + '</strong>. Vui lòng kiểm tra lại!</span>';
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
  if (!pdfUrl && quiz.examHtml) {
    pdfUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(quiz.examHtml);
  }

  // Giấu đáp án đúng vào ExamVault; AppState.currentQuiz chỉ chứa bản công khai
  // (không có trường `correct`) để tránh lộ đáp án qua Console trình duyệt.
  ExamVault.store(quizId, quiz.answerKeys || []);
  AppState.currentQuiz = { ...quiz, answerKeys: ExamVault.getPublicKeys(quizId) };
  AppState.currentQuizId = quizId;
  AppState.studentName = name;
  AppState.studentClass = className;

  // Kiểm tra xem học sinh có phiên làm bài đang tạm dừng cho đề này không
  const pausedSession = getPausedExamSession(name, quizId);
  const isResuming = !!pausedSession;

  if (isResuming) {
    AppState.studentAnswers = { ...(pausedSession.studentAnswers || {}) };
    AppState.flaggedQuestions = new Set(pausedSession.flaggedQuestions || []);
    AppState.tabSwitches = pausedSession.tabSwitches || 0;
    AppState.totalExamSeconds = pausedSession.totalExamSeconds || (quiz.timeLimit * 60);
    AppState.secondsLeft = (pausedSession.secondsLeft !== undefined) ? pausedSession.secondsLeft : AppState.totalExamSeconds;
  } else {
    AppState.studentAnswers = {};
    AppState.flaggedQuestions.clear();
    AppState.tabSwitches = 0;
    AppState.totalExamSeconds = quiz.timeLimit * 60;
    AppState.secondsLeft = AppState.totalExamSeconds;
  }

  const profile = GamificationEngine.getUserProfile();
  profile.name = name;
  profile.className = className;
  if (AppState.studentAvatar) profile.avatar = AppState.studentAvatar;
  GamificationEngine.saveUserProfile(profile);

  document.getElementById('studentJoinSection').classList.add('hidden');
  document.getElementById('studentExamSection').classList.remove('hidden');
  document.getElementById('splitExamExamTitle').textContent = quiz.title;
  document.getElementById('splitExamStudentInfo').textContent = `${name} — Lớp ${className}`;

  const frame = document.getElementById('studentPdfViewerFrame');
  if (pdfUrl) {
    frame.src = pdfUrl;
  } else if (quiz.examHtml) {
    frame.src = 'data:text/html;charset=utf-8,' + encodeURIComponent(quiz.examHtml);
  } else {
    frame.src = 'about:blank';
    setTimeout(() => {
      frame.contentDocument.body.innerHTML = `
        <div style="font-family:sans-serif;padding:35px;color:#1e293b;line-height:1.7;">
          <h2 style="color:#4f46e5;margin-bottom:8px;">📄 ${escapeHtml(quiz.title)}</h2>
          <hr style="border:1px solid #cbd5e1;margin-bottom:20px;"/>
          <h3 style="color:#0f172a;">DANH SÁCH CÂU HỎI TRONG ĐỀ THI</h3>
          <p>Mời học sinh đọc kỹ đề bài trên văn bản và chọn đáp án tương ứng trên phiếu tô bên phải.</p>
        </div>
      `;
    }, 200);
  }

  renderStudentAnswerSheet(AppState.currentQuiz.answerKeys);

  startExamTimer(AppState.secondsLeft);

  if (isResuming) {
    showToast('✨ Đã khôi phục toàn bộ các câu trả lời và thời gian làm bài của bạn!', 'success');
  }

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

  const mcqList = keys.filter(k => k.type === 'mcq' || k.type === 'truefalse');
  const essayList = keys.filter(k => k.type === 'essay');

  let html = '';

  if (mcqList.length > 0) {
    html += `<div style="padding:0.4rem 0.6rem;background:var(--bg-tertiary);border-radius:var(--radius-sm);font-weight:900;color:var(--indigo);font-size:0.85rem;margin-bottom:0.5rem;">I. PHẦN TRẮC NGHIỆM (${mcqList.length} CÂU)</div>`;
    html += mcqList.map(k => renderSingleSheetRow(k)).join('');
  }

  if (essayList.length > 0) {
    html += `<div style="padding:0.4rem 0.6rem;background:var(--amber-light);border-radius:var(--radius-sm);font-weight:900;color:var(--amber-shadow);font-size:0.85rem;margin:1rem 0 0.5rem;">II. PHẦN TỰ LUẬN ĐIỀN ĐÁP SỐ (${essayList.length} CÂU)</div>`;
    html += essayList.map(k => renderSingleSheetRow(k)).join('');
  }

  container.innerHTML = html;
  updateSheetProgress();
}

function renderSingleSheetRow(k) {
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
      <div style="flex:1;max-width:240px;">
        <input type="text" class="sheet-essay-input" placeholder="Điền đáp số (VD: 12)..." value="${escapeHtml(current)}" oninput="recordSheetEssay(${k.num}, this.value)">
      </div>
    `;
  }
}

function selectBubbleAnswer(num, opt) {
  AppState.studentAnswers[num] = opt;
  SoundEngine.playClick();
  renderStudentAnswerSheet(AppState.currentQuiz.answerKeys);
  saveCurrentExamSessionToPaused();
}

function recordSheetEssay(num, val) {
  AppState.studentAnswers[num] = val;
  updateSheetProgress();
  saveCurrentExamSessionToPaused();
}

function toggleFlagSheet(num) {
  if (AppState.flaggedQuestions.has(num)) {
    AppState.flaggedQuestions.delete(num);
  } else {
    AppState.flaggedQuestions.add(num);
  }
  SoundEngine.playClick();
  renderStudentAnswerSheet(AppState.currentQuiz.answerKeys);
  saveCurrentExamSessionToPaused();
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
    const pauseModal = document.getElementById('pauseExamModal');
    // Khi đang tạm dừng làm bài, không tính vi phạm rời tab
    if (pauseModal && !pauseModal.classList.contains('hidden')) {
      return;
    }
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

/* ================= PAUSE & RESUME EXAM ENGINE ================= */
function getPausedExamStorageKey(name, quizId) {
  const cleanName = (name || '').trim().toUpperCase();
  return 'khiemedu_paused_exam_' + cleanName + '_' + quizId;
}

function getPausedExamSession(name, quizId) {
  try {
    const key = getPausedExamStorageKey(name, quizId);
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}

function getActivePausedExamSession() {
  try {
    const raw = localStorage.getItem('khiemedu_active_paused_session');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}

function saveCurrentExamSessionToPaused() {
  if (!AppState.currentQuiz || !AppState.currentQuizId) return null;

  const session = {
    quizId: AppState.currentQuizId,
    quizTitle: AppState.currentQuiz.title,
    quizTargetClass: AppState.currentQuiz.targetClass,
    quizExamTerm: AppState.currentQuiz.examTerm,
    timeLimit: AppState.currentQuiz.timeLimit,
    studentName: AppState.studentName,
    studentClass: AppState.studentClass,
    studentAvatar: AppState.studentAvatar,
    studentAnswers: { ...AppState.studentAnswers },
    flaggedQuestions: Array.from(AppState.flaggedQuestions),
    secondsLeft: AppState.secondsLeft,
    totalExamSeconds: AppState.totalExamSeconds,
    tabSwitches: AppState.tabSwitches,
    pausedAt: new Date().toISOString()
  };

  const key = getPausedExamStorageKey(AppState.studentName, AppState.currentQuizId);
  localStorage.setItem(key, JSON.stringify(session));
  localStorage.setItem('khiemedu_active_paused_session', JSON.stringify(session));
  return session;
}

function clearPausedExamSession(studentName, quizId) {
  if (studentName && quizId) {
    const key = getPausedExamStorageKey(studentName, quizId);
    localStorage.removeItem(key);
  }
  const active = getActivePausedExamSession();
  if (active && (!quizId || active.quizId === quizId)) {
    localStorage.removeItem('khiemedu_active_paused_session');
  }
  checkAndRenderPausedExamBanner();
}

function pauseStudentExam() {
  if (!AppState.currentQuiz || !AppState.currentQuizId) return;

  // 1. Freeze timer
  if (AppState.timerInterval) {
    clearInterval(AppState.timerInterval);
    AppState.timerInterval = null;
  }

  // 2. Save session snapshot
  const session = saveCurrentExamSessionToPaused();
  if (!session) return;

  // 3. Populate modal UI
  const total = AppState.currentQuiz.answerKeys ? AppState.currentQuiz.answerKeys.length : 0;
  const answered = Object.values(AppState.studentAnswers).filter(v => v !== undefined && v !== '').length;
  const m = Math.floor(AppState.secondsLeft / 60);
  const s = AppState.secondsLeft % 60;

  const titleEl = document.getElementById('pausedExamTitle');
  const progressEl = document.getElementById('pausedExamProgress');
  const timeEl = document.getElementById('pausedExamTimeLeft');

  if (titleEl) titleEl.textContent = session.quizTitle;
  if (progressEl) progressEl.textContent = `Đã làm: ${answered}/${total} câu (${total ? Math.round(answered / total * 100) : 0}%)`;
  if (timeEl) timeEl.textContent = `⏱️ Còn lại: ${m} phút ${String(s).padStart(2, '0')} giây`;

  const modal = document.getElementById('pauseExamModal');
  if (modal) modal.classList.remove('hidden');

  if (typeof SoundEngine !== 'undefined' && SoundEngine.playWarning) {
    SoundEngine.playWarning();
  }
  showToast('⏸️ Bài thi đã tạm dừng! Toàn bộ đáp án của bạn đã được lưu an toàn.', 'info');
}

function resumeStudentExam() {
  const modal = document.getElementById('pauseExamModal');
  if (modal) modal.classList.add('hidden');

  // Resume countdown
  if (AppState.secondsLeft > 0) {
    startExamTimer(AppState.secondsLeft);
  }

  if (typeof SoundEngine !== 'undefined' && SoundEngine.playClick) {
    SoundEngine.playClick();
  }
  showToast('▶️ Đã tiếp tục làm bài thi!', 'success');
}

function exitPausedExamToHome() {
  const modal = document.getElementById('pauseExamModal');
  if (modal) modal.classList.add('hidden');

  // Freeze any timers
  if (AppState.timerInterval) {
    clearInterval(AppState.timerInterval);
    AppState.timerInterval = null;
  }
  if (AppState.leaderboardTimer) {
    clearInterval(AppState.leaderboardTimer);
    AppState.leaderboardTimer = null;
  }

  // Return to student view
  document.getElementById('studentExamSection')?.classList.add('hidden');
  document.getElementById('studentJoinSection')?.classList.remove('hidden');
  document.getElementById('studentResultSection')?.classList.add('hidden');

  checkAndRenderPausedExamBanner();
  updatePersonalizedExamFeed();

  showToast('💾 Đã lưu bài thi dở dang! Bạn có thể quay lại làm tiếp bất kỳ lúc nào.', 'success');
}

function checkAndRenderPausedExamBanner() {
  const banner = document.getElementById('activePausedExamBanner');
  if (!banner) return;

  const active = getActivePausedExamSession();
  if (!active) {
    banner.classList.add('hidden');
    banner.innerHTML = '';
    return;
  }

  const answered = Object.values(active.studentAnswers || {}).filter(v => v !== undefined && v !== '').length;
  const m = Math.floor((active.secondsLeft || 0) / 60);
  const s = (active.secondsLeft || 0) % 60;

  banner.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;background:linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);border:2.5px solid var(--amber);border-radius:var(--radius-xl);padding:1.1rem 1.4rem;box-shadow:0 8px 24px rgba(245,158,11,0.2), 0 4px 0 var(--amber-shadow);animation:modalPop 0.3s ease;">
      <div style="display:flex;align-items:center;gap:1rem;">
        <div style="font-size:2.4rem;background:#fde68a;width:56px;height:56px;border-radius:var(--radius-full);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(245,158,11,0.3);">
          ⏸️
        </div>
        <div>
          <div style="font-size:0.75rem;font-weight:900;color:var(--amber-shadow);text-transform:uppercase;letter-spacing:1px;">
            ⚡ BÀI THI ĐANG TẠM DỪNG CỦA BẠN (ĐÃ LƯU TIẾN ĐỘ)
          </div>
          <div style="font-size:1.15rem;font-weight:900;color:var(--text-primary);margin:2px 0;">
            ${escapeHtml(active.quizTitle)}
          </div>
          <div style="font-size:0.85rem;color:var(--text-secondary);font-weight:700;">
            👤 <strong>${escapeHtml(active.studentName)}</strong> (${escapeHtml(active.studentClass)}) · ⏱️ Còn lại: <strong style="color:var(--amber-shadow);">${m}p ${String(s).padStart(2, '0')}s</strong> · Đã trả lời: <strong style="color:var(--primary-shadow);">${answered} câu</strong>
          </div>
        </div>
      </div>
      <div style="display:flex;gap:0.6rem;align-items:center;flex-wrap:wrap;">
        <button type="button" class="btn btn-secondary btn-sm" onclick="discardPausedExamSession('${escapeHtml(active.studentName)}', '${escapeHtml(active.quizId)}')">
          🗑️ Hủy Bài Này
        </button>
        <button type="button" class="btn btn-primary btn-lg" onclick="resumeActivePausedSession()" style="background:var(--amber);border-color:var(--amber-shadow);color:#fff;box-shadow:0 4px 0 var(--amber-shadow);font-weight:900;">
          ▶️ Tiếp Tục Thi Ngay 🚀
        </button>
      </div>
    </div>
  `;
  banner.classList.remove('hidden');
}

function resumeActivePausedSession() {
  const active = getActivePausedExamSession();
  if (!active) return;
  // Điền tên & lớp nếu người dùng chưa nhập
  const nameInput = document.getElementById('studentJoinName');
  const classInput = document.getElementById('studentJoinClass');
  if (nameInput && active.studentName) nameInput.value = active.studentName;
  if (classInput && active.studentClass) classInput.value = active.studentClass;
  startExamWithQuizId(active.quizId);
}

function discardPausedExamSession(name, quizId) {
  if (confirm('⚠️ Bạn có chắc muốn hủy bỏ bài thi đang làm dở này? Dữ liệu câu trả lời sẽ bị xóa.')) {
    clearPausedExamSession(name, quizId);
    showToast('🗑️ Đã hủy bỏ bài thi dở dang.', 'info');
  }
}

/* Smart Math Matcher */
function checkAnswerMatch(given, correct) {
  if (!given || !correct) return false;
  
  const gRaw = given.toString().trim();
  const cRaw = correct.toString().trim();

  const acceptableList = cRaw.split(/[|;]/).map(s => s.trim()).filter(Boolean);
  
  for (const target of acceptableList) {
    if (matchSingleMathAnswer(gRaw, target)) {
      return true;
    }
  }

  return false;
}

function matchSingleMathAnswer(gStr, cStr) {
  const unitRegex = /\s*(cm[23]?|m[23]?|mm|km(\/h)?|kg|g|độ|°|rad)\s*$/i;
  let gClean = gStr.replace(unitRegex, '').trim().toLowerCase().replace(/\s+/g, '');
  let cClean = cStr.replace(unitRegex, '').trim().toLowerCase().replace(/\s+/g, '');

  if (gClean === cClean) return true;

  const gStrippedVar = gClean.replace(/^[a-z]=[=]?/, '');
  const cStrippedVar = cClean.replace(/^[a-z]=[=]?/, '');
  if (gStrippedVar === cStrippedVar) return true;

  const gNum = parseMathNumber(gStr);
  const cNum = parseMathNumber(cStr);
  if (gNum !== null && cNum !== null) {
    if (Math.abs(gNum - cNum) < 1e-4) return true;
  }

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

/* Submit Exam */
async function submitStudentExam(isAuto = false) {
  if (AppState.timerInterval) clearInterval(AppState.timerInterval);
  if (AppState.leaderboardTimer) clearInterval(AppState.leaderboardTimer);

  // Xóa phiên tạm dừng cho bài thi này
  clearPausedExamSession(AppState.studentName, AppState.currentQuizId);

  const quiz = AppState.currentQuiz;
  const { totalEarnedScore, correctCount, total, reviewData } =
    ExamVault.grade(AppState.currentQuizId, AppState.studentAnswers);

  const finalScore10 = Math.round(totalEarnedScore * 10) / 10;
  const scorePct = total ? Math.round((correctCount / total) * 100) : 0;
  const timeTakenSeconds = AppState.totalExamSeconds - AppState.secondsLeft;

  const resultRecord = {
    quizId: AppState.currentQuizId,
    quizTitle: quiz.title,
    name: AppState.studentName,
    className: AppState.studentClass,
    avatar: AppState.studentAvatar || '🦊',
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

  ExamVault.clear(AppState.currentQuizId);
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
  checkAndRenderPausedExamBanner();
  SoundEngine.playClick();
}

/* ================= GAMIFICATION / VINH DANH ================= */
function updateGamifyBar() {
  const profile = GamificationEngine.getUserProfile();
  const levelInfo = GamificationEngine.getLevelInfo(profile.xp || 0);

  const streakEl = document.getElementById('topStreakVal');
  const xpEl = document.getElementById('topXpVal');
  const levelEl = document.getElementById('topLevelVal');

  if (streakEl) streakEl.textContent = profile.streak || 1;
  if (xpEl) xpEl.textContent = profile.xp || 0;
  if (levelEl) levelEl.textContent = `Lv.${levelInfo.level} ${levelInfo.name}`;
}

async function renderGamificationTab() {
  const profile = GamificationEngine.getUserProfile();
  const levelInfo = GamificationEngine.getLevelInfo(profile.xp || 0);

  const nameEl = document.getElementById('gamifyUserName');
  const levelNameEl = document.getElementById('gamifyLevelName');
  const avatarEl = document.getElementById('gamifyUserAvatar');
  const xpTextEl = document.getElementById('gamifyXpText');
  const xpProgEl = document.getElementById('gamifyXpProgress');

  if (nameEl) nameEl.textContent = profile.name || 'Học Sinh';
  if (levelNameEl) levelNameEl.textContent = `Cấp ${levelInfo.level}: ${levelInfo.name}`;
  if (avatarEl) avatarEl.textContent = profile.avatar || AppState.studentAvatar || '🦊';
  if (xpTextEl) xpTextEl.textContent = `${levelInfo.currentXp} / ${levelInfo.nextXp} XP (${levelInfo.progress}%)`;
  if (xpProgEl) xpProgEl.style.width = `${levelInfo.progress}%`;

  const totalExamsEl = document.getElementById('statTotalExams');
  const perfScoresEl = document.getElementById('statPerfectScores');
  const streakEl = document.getElementById('statCurrentStreak');

  if (totalExamsEl) totalExamsEl.textContent = profile.examsCount || 0;
  if (perfScoresEl) perfScoresEl.textContent = profile.perfectCount || 0;
  if (streakEl) streakEl.textContent = `${profile.streak || 1} Ngày 🔥`;

  const badgesGrid = document.getElementById('badgesShowcaseGrid');
  if (badgesGrid) {
    const unlocked = new Set(profile.unlockedBadges || []);
    badgesGrid.innerHTML = BADGES_DEFINITIONS.map(b => {
      const isUnlocked = unlocked.has(b.id);
      return `
        <div class="badge-card ${isUnlocked ? 'unlocked' : 'locked'}" onclick="triggerBadgeCelebration('${b.name}', ${isUnlocked})">
          <div class="badge-icon">${b.icon}</div>
          <div class="badge-title">${escapeHtml(b.name)}</div>
          <div class="badge-desc">${escapeHtml(b.desc)}</div>
          <div style="margin-top:0.4rem;font-size:0.75rem;font-weight:800;color:${isUnlocked ? 'var(--primary-shadow)' : 'var(--text-muted)'};">
            ${isUnlocked ? '✅ ĐÃ MỞ KHÓA' : '🔒 CHƯA ĐẠT'}
          </div>
        </div>
      `;
    }).join('');
  }

  renderHallOfFameLeaderboard();
}

async function renderHallOfFameLeaderboard() {
  const podiumWrap = document.getElementById('hallOfFamePodiumWrap');
  const listWrap = document.getElementById('hallOfFameListWrap');
  if (!podiumWrap || !listWrap) return;

  const roster = await StorageEngine.getStudentRoster();
  const allResults = await StorageEngine.getAllResults();

  const statsMap = {};
  roster.forEach(s => {
    statsMap[s.name.toLowerCase()] = {
      name: s.name,
      className: s.className,
      avatar: s.avatar || '🦊',
      xp: 200,
      exams: 0,
      avgScore: 0,
      totalScore: 0
    };
  });

  allResults.forEach(r => {
    const key = r.name.toLowerCase();
    if (!statsMap[key]) {
      statsMap[key] = {
        name: r.name,
        className: r.className || '10',
        avatar: r.avatar || '🦊',
        xp: 150,
        exams: 0,
        avgScore: 0,
        totalScore: 0
      };
    }
    statsMap[key].exams++;
    statsMap[key].totalScore += (r.totalScore || 0);
    statsMap[key].xp += (r.totalScore >= 8 ? 150 : 80);
  });

  const studentsList = Object.values(statsMap);
  studentsList.forEach(s => {
    s.avgScore = s.exams ? (Math.round((s.totalScore / s.exams) * 10) / 10) : 8.5;
  });

  studentsList.sort((a, b) => b.xp - a.xp || b.avgScore - a.avgScore);

  const top1 = studentsList[0] || { name: 'SURI', className: '10', avatar: '🦊', xp: 850, avgScore: 9.5 };
  const top2 = studentsList[1] || { name: 'NGHĨA', className: '10', avatar: '🦉', xp: 620, avgScore: 8.8 };
  const top3 = studentsList[2] || { name: 'GIANG', className: '10', avatar: '🦁', xp: 480, avgScore: 8.2 };

  podiumWrap.innerHTML = `
    <div class="podium-container">
      <!-- #2 Silver -->
      <div class="podium-column podium-col-2">
        <div class="podium-avatar-bubble">
          <div class="podium-avatar">${top2.avatar}</div>
          <div class="podium-rank-badge badge-rank-2">2</div>
        </div>
        <div class="podium-stand stand-silver">
          <div class="podium-user-name">${escapeHtml(top2.name)}</div>
          <div class="podium-user-score">⭐ ${top2.xp} XP</div>
          <div class="podium-step-number">#2</div>
        </div>
      </div>

      <!-- #1 Gold -->
      <div class="podium-column podium-col-1">
        <div class="podium-avatar-bubble">
          <div class="podium-crown">👑</div>
          <div class="podium-avatar">${top1.avatar}</div>
          <div class="podium-rank-badge badge-rank-1">1</div>
        </div>
        <div class="podium-stand stand-gold">
          <div class="podium-user-name">${escapeHtml(top1.name)}</div>
          <div class="podium-user-score">⭐ ${top1.xp} XP</div>
          <div class="podium-step-number">#1</div>
        </div>
      </div>

      <!-- #3 Bronze -->
      <div class="podium-column podium-col-3">
        <div class="podium-avatar-bubble">
          <div class="podium-avatar">${top3.avatar}</div>
          <div class="podium-rank-badge badge-rank-3">3</div>
        </div>
        <div class="podium-stand stand-bronze">
          <div class="podium-user-name">${escapeHtml(top3.name)}</div>
          <div class="podium-user-score">⭐ ${top3.xp} XP</div>
          <div class="podium-step-number">#3</div>
        </div>
      </div>
    </div>
  `;

  listWrap.innerHTML = `
    <div class="table-responsive" style="margin-top:1.5rem;">
      <table>
        <thead>
          <tr>
            <th>Hạng</th>
            <th>Chiến Binh</th>
            <th>Lớp</th>
            <th>Kinh Nghiệm (XP)</th>
            <th>Điểm TB</th>
            <th>Bài Thi Đã Làm</th>
          </tr>
        </thead>
        <tbody>
          ${studentsList.slice(3).map((s, idx) => `
            <tr>
              <td><strong>#${idx + 4}</strong></td>
              <td><strong>${s.avatar} ${escapeHtml(s.name)}</strong></td>
              <td><span class="badge-status badge-pass">Lớp ${escapeHtml(s.className)}</span></td>
              <td><strong style="color:var(--indigo);">⭐ ${s.xp} XP</strong></td>
              <td><strong>${s.avgScore}/10đ</strong></td>
              <td>${s.exams} bài</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function triggerBadgeCelebration(badgeName, isUnlocked) {
  if (isUnlocked) {
    GamificationEngine.fireConfetti();
    SoundEngine.playFanfare();
    showToast(`🏆 Huy hiệu: ${badgeName} đã mở khóa!`, 'success');
  } else {
    SoundEngine.playWarning();
    showToast(`🔒 Huy hiệu: ${badgeName} chưa đạt. Hãy luyện thêm bài thi nhé!`, 'warn');
  }
}

function celebrateConfetti() {
  GamificationEngine.fireConfetti();
  SoundEngine.playFanfare();
}

/* ================= FIREBASE CLOUD CONFIG UI HANDLERS ================= */
function toggleFirebaseConfigForm() {
  const wrapper = document.getElementById('firebaseConfigFormWrapper');
  if (wrapper) {
    wrapper.classList.toggle('hidden');
    SoundEngine.playClick();
  }
}

function updateFirebaseUI() {
  const badge = document.getElementById('firebaseConnectionBadge');
  const apiInput = document.getElementById('fbApiKey');
  const projectInput = document.getElementById('fbProjectId');
  const bucketInput = document.getElementById('fbStorageBucket');
  const authInput = document.getElementById('fbAuthDomain');
  const appIdInput = document.getElementById('fbAppId');
  const senderIdInput = document.getElementById('fbSenderId');

  let config = window.FirebaseEngine ? window.FirebaseEngine.defaultConfig : null;

  // Fill in inputs from storage if exists
  const configStr = localStorage.getItem('khiemedu_firebase_config');
  if (configStr) {
    try {
      config = JSON.parse(configStr);
    } catch (e) {
      console.error('Error parsing stored Firebase config:', e);
    }
  }

  if (config) {
    if (apiInput) apiInput.value = config.apiKey || '';
    if (projectInput) projectInput.value = config.projectId || '';
    if (bucketInput) bucketInput.value = config.storageBucket || '';
    if (authInput) authInput.value = config.authDomain || '';
    if (appIdInput) appIdInput.value = config.appId || '';
    if (senderIdInput) senderIdInput.value = config.messagingSenderId || '';
  }

  if (badge) {
    if (window.FirebaseEngine && window.FirebaseEngine.isActive) {
      badge.textContent = 'Đồng Bộ Cloud Bật ☁️';
      badge.className = 'badge-status badge-pass';
      badge.style.background = 'var(--rose)';
      badge.style.color = '#fff';
    } else {
      const isEnabled = localStorage.getItem('khiemedu_firebase_enabled') === '1';
      if (isEnabled && configStr) {
        badge.textContent = 'Lỗi Kết Nối ⚠️';
        badge.className = 'badge-status badge-warn';
      } else {
        badge.textContent = 'Đang Chạy Offline 📴';
        badge.className = 'badge-status badge-fail';
      }
      badge.style.background = '';
      badge.style.color = '';
    }
  }
}

async function handleTestFirebaseConnection() {
  const statusBox = document.getElementById('firebaseConnectionStatusBox');
  if (!window.FirebaseEngine) {
    showToast('⚠️ Không tìm thấy Firebase SDK!', 'error');
    return;
  }
  if (statusBox) {
    statusBox.innerHTML = '<span style="color:var(--indigo);font-weight:700;">⚡ Đang gửi ping kiểm tra kết nối Firestore & Storage...</span>';
  }
  showToast('⚡ Đang kiểm tra kết nối Firebase Cloud...', 'info');

  const res = await window.FirebaseEngine.testConnection();
  if (res.ok) {
    showToast('🎉 Kết nối Firebase Cloud Sync thành công!', 'success');
    SoundEngine.playFanfare();
    if (statusBox) {
      statusBox.innerHTML = `
        <div style="background:rgba(34, 197, 94, 0.12);border:1.5px solid var(--emerald);padding:0.7rem 0.9rem;border-radius:8px;color:var(--emerald-shadow);font-size:0.9rem;">
          <strong style="display:block;margin-bottom:2px;">✅ KẾT NỐI FIREBASE THÀNH CÔNG:</strong>
          <div>${escapeHtml(res.message)}</div>
        </div>
      `;
    }
  } else {
    showToast('⚠️ Kiểm tra Firebase: Chưa hoàn tất thiết lập', 'warn');
    SoundEngine.playWarning();
    const projectId = (window.FirebaseEngine.defaultConfig && window.FirebaseEngine.defaultConfig.projectId) || 'k-edu-d2051';
    if (statusBox) {
      statusBox.innerHTML = `
        <div style="background:rgba(239, 68, 68, 0.08);border:1.5px solid var(--rose);padding:0.7rem 0.9rem;border-radius:8px;color:var(--rose);font-size:0.875rem;">
          <strong style="display:block;margin-bottom:4px;">⚠️ PHÁT HIỆN VẤN ĐỀ VỀ FIREBASE:</strong>
          <div style="margin-bottom:6px;line-height:1.4;">${escapeHtml(res.message)}</div>
          <div style="background:var(--bg-card);padding:0.5rem 0.75rem;border-radius:6px;color:var(--text-secondary);font-size:0.82rem;border:1px dashed var(--rose);">
            💡 <strong>Hướng dẫn thiết lập 1 phút trên Firebase Console:</strong>
            <ul style="margin:4px 0 0 1rem;padding:0;">
              <li>Truy cập <a href="https://console.firebase.google.com/project/${escapeHtml(projectId)}/firestore" target="_blank" style="color:var(--primary);font-weight:700;text-decoration:underline;">Firebase Console Firestore</a> &rarr; Bấm <strong>"Create database"</strong> (chọn Test mode).</li>
              <li>Truy cập <a href="https://console.firebase.google.com/project/${escapeHtml(projectId)}/storage" target="_blank" style="color:var(--primary);font-weight:700;text-decoration:underline;">Firebase Console Storage</a> &rarr; Bấm <strong>"Get started"</strong> (chọn Test mode).</li>
            </ul>
          </div>
        </div>
      `;
    }
  }
}

async function handleSaveFirebaseConfig() {
  const apiKey = document.getElementById('fbApiKey')?.value.trim();
  const projectId = document.getElementById('fbProjectId')?.value.trim();
  const storageBucket = document.getElementById('fbStorageBucket')?.value.trim();
  const authDomain = document.getElementById('fbAuthDomain')?.value.trim();
  const appId = document.getElementById('fbAppId')?.value.trim();
  const messagingSenderId = document.getElementById('fbSenderId')?.value.trim();

  if (!apiKey || !projectId || !storageBucket || !authDomain || !appId) {
    showToast('⚠️ Vui lòng điền đầy đủ các thông số cấu hình Firebase bắt buộc!', 'warn');
    SoundEngine.playWarning();
    return;
  }

  if (!apiKey.startsWith('AIzaSy')) {
    showToast('⚠️ API Key không hợp lệ! Mã Firebase API Key của Google luôn bắt đầu bằng "AIzaSy..."', 'error');
    SoundEngine.playWarning();
    return;
  }

  const config = { apiKey, projectId, storageBucket, authDomain, appId, messagingSenderId };
  showToast('⚡ Đang lưu cấu hình và kiểm tra kết nối...', 'info');

  if (window.FirebaseEngine) {
    const success = await window.FirebaseEngine.saveConfig(config);
    if (success) {
      updateFirebaseUI();
      await handleTestFirebaseConnection();
      await loadStudentRoster();
      renderTeacherQuizManager();
      renderTeacherRosterManager();
      renderTeacherAnalyticsDashboard();
      updatePersonalizedExamFeed();
      initFirebaseRealtimeSync();
    } else {
      showToast('❌ Cấu hình sai hoặc lỗi kết nối Firebase. Vui lòng kiểm tra console.', 'error');
      SoundEngine.playWarning();
      updateFirebaseUI();
    }
  }
}

async function handleResetFirebaseDefaultConfig() {
  localStorage.removeItem('khiemedu_firebase_config');
  localStorage.setItem('khiemedu_firebase_enabled', '1');
  if (window.FirebaseEngine) {
    await window.FirebaseEngine.init();
  }
  updateFirebaseUI();
  showToast('🔄 Đã khôi phục cấu hình chuẩn của Google Firebase!', 'success');
  if (typeof SoundEngine !== 'undefined' && SoundEngine.playFanfare) SoundEngine.playFanfare();
  await handleTestFirebaseConnection();
}

function handleDisableFirebase() {
  if (window.FirebaseEngine) {
    window.FirebaseEngine.disable();
    updateFirebaseUI();
    if (unsubQuizzesListener) {
      try { unsubQuizzesListener(); } catch (e) {}
      unsubQuizzesListener = null;
    }
    showToast('📴 Đã tạm tắt đồng bộ đám mây. Hệ thống đang chạy offline.', 'info');
    SoundEngine.playClick();
  }
}

function handleClearFirebaseConfig() {
  if (confirm('⚠️ Bạn có chắc chắn muốn xóa toàn bộ thông số kết nối Firebase khỏi máy này?')) {
    if (window.FirebaseEngine) {
      window.FirebaseEngine.clearConfig();
    }
    if (unsubQuizzesListener) {
      try { unsubQuizzesListener(); } catch (e) {}
      unsubQuizzesListener = null;
    }
    // Clear input fields
    const fields = ['fbApiKey', 'fbProjectId', 'fbStorageBucket', 'fbAuthDomain', 'fbAppId', 'fbSenderId'];
    fields.forEach(f => {
      const el = document.getElementById(f);
      if (el) el.value = '';
    });
    updateFirebaseUI();
    showToast('🗑️ Đã xóa sạch credentials và chuyển về chạy offline.', 'info');
    SoundEngine.playClick();
  }
}

async function handleSyncLocalToFirebase() {
  if (!window.FirebaseEngine || !window.FirebaseEngine.isActive) {
    showToast('⚠️ Vui lòng kết nối Firebase Cloud thành công trước khi đồng bộ!', 'warn');
    SoundEngine.playWarning();
    return;
  }
  
  if (confirm('🔄 Bạn có muốn đồng bộ toàn bộ đề thi, học sinh và bảng điểm từ máy này lên Firebase Cloud không?\n(Dữ liệu trên Cloud sẽ được cập nhật/bổ sung từ dữ liệu máy này)')) {
    showToast('⚡ Đang đồng bộ dữ liệu lên Cloud...', 'info');
    try {
      await StorageEngine.syncLocalToCloud();
      showToast('🎉 Đồng bộ dữ liệu lên Cloud thành công!', 'success');
      SoundEngine.playFanfare();
      
      // Reload manager elements to sync with cloud
      await loadStudentRoster();
      renderTeacherQuizManager();
      renderTeacherRosterManager();
      renderTeacherAnalyticsDashboard();
      updatePersonalizedExamFeed();
    } catch (e) {
      console.error(e);
      showToast('❌ Lỗi khi đồng bộ dữ liệu. Chi tiết ở Console.', 'error');
      SoundEngine.playWarning();
    }
  }
}

/* ================= DIRECT CODE ENTRY & SHARING HELPERS ================= */
async function handleJoinByDirectCode() {
  const codeInput = document.getElementById('directQuizCodeInput');
  const code = codeInput ? codeInput.value.trim().toUpperCase() : '';
  if (!code) {
    showToast('⚠️ Vui lòng nhập mã đề thi (gồm 6 ký tự)!', 'warn');
    if (codeInput) codeInput.focus();
    return;
  }
  await startExamWithQuizId(code);
}

function copyQuizCode(code) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(code);
    showToast(`📋 Đã sao chép mã đề: ${code}`, 'success');
  } else {
    prompt('Mã đề thi của bạn:', code);
  }
  SoundEngine.playClick();
}

function copyQuizLink(code) {
  const url = `${window.location.origin}${window.location.pathname}?quiz=${encodeURIComponent(code)}`;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url);
    showToast('🔗 Đã sao chép link đề thi vào bộ nhớ tạm!', 'success');
  } else {
    prompt('Link làm bài thi trực tiếp:', url);
  }
  SoundEngine.playClick();
}

function checkUrlQuizParam() {
  try {
    const params = new URLSearchParams(window.location.search);
    const quizParam = params.get('quiz');
    if (quizParam) {
      const codeInput = document.getElementById('directQuizCodeInput');
      if (codeInput) codeInput.value = quizParam.toUpperCase();
      showToast(`🎯 Đã nhận diện mã đề [${quizParam.toUpperCase()}]. Nhập tên & lớp để vào thi ngay!`, 'info');
    }
  } catch (e) {}
}

let unsubQuizzesListener = null;

function initFirebaseRealtimeSync() {
  if (unsubQuizzesListener) {
    try { unsubQuizzesListener(); } catch (e) {}
    unsubQuizzesListener = null;
  }

  if (window.FirebaseEngine && window.FirebaseEngine.isActive && typeof window.FirebaseEngine.listenToQuizzes === 'function') {
    unsubQuizzesListener = window.FirebaseEngine.listenToQuizzes(async (cloudQuizzes) => {
      if (!cloudQuizzes || !cloudQuizzes.length) return;
      console.log('☁️ [Realtime Sync] Nhận được đề thi từ Firebase Cloud:', cloudQuizzes.length);

      for (const q of cloudQuizzes) {
        const cacheItem = { ...q };
        if (cacheItem.pdfDataUrl && cacheItem.pdfDataUrl.startsWith('data:') && cacheItem.pdfDataUrl.length > 300000) {
          delete cacheItem.pdfDataUrl;
        }
        await StorageEngine.set('quiz:' + q.id, cacheItem);
      }

      updatePersonalizedExamFeed();
      renderTeacherQuizManager();
    });
  }
}
