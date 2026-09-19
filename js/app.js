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

  function store(quizId, answerKeys, meta = {}) {
    const rawKeys = Array.isArray(answerKeys) ? answerKeys : [];
    const subject = (typeof meta === 'string' ? meta : meta?.subject) || 'toan';
    vault.set(quizId, {
      keys: rawKeys,
      meta: { subject }
    });
  }

  function getPublicKeys(quizId) {
    const entry = vault.get(quizId);
    const keys = Array.isArray(entry) ? entry : (entry?.keys || []);
    // Trả về bản sao đã loại bỏ trường `correct`, `explanation` và solution source để render an toàn cho học sinh
    return keys.map(({ correct, correctAnswer, explanation, pitfall, keyFormula, ...rest }) => {
      const safe = { ...rest };
      if (safe.source && typeof safe.source === 'object') {
        const { solutionSourceId, solutionSourceFile, solutionSourcePage, ...safeSrc } = safe.source;
        safe.source = safeSrc;
      }
      return safe;
    });
  }

  function grade(quizId, studentAnswers) {
    const entry = vault.get(quizId);
    const keys = Array.isArray(entry) ? entry : (entry?.keys || []);
    const metaSubject = (!Array.isArray(entry) && entry?.meta?.subject) ? entry.meta.subject : 'toan';
    const fallbackSubjectLabel = (typeof SUBJECT_LABELS !== 'undefined' && SUBJECT_LABELS[metaSubject]) || metaSubject || 'Toán học';
    let totalEarnedScore = 0;
    let correctCount = 0;
    const reviewData = [];

    for (const k of keys) {
      const given = studentAnswers[k.num];
      const isCorrect = checkAnswerMatch(given, k.correct);
      let earned = 0;

      if (isCorrect) {
        correctCount++;
        earned = Number.isFinite(Number(k.score)) ? Number(k.score) : 0;
        totalEarnedScore += earned;
      }

      reviewData.push({
        num: k.num,
        id: k.id || `q_${k.num}`,
        questionId: k.id || k.questionId || `q_${k.num}`,
        type: k.type,
        level: k.level || 'TH',
        category: k.topic || k.category || '',
        source: k.source || null,
        quality: k.quality || null,
        stimulus: k.stimulus !== undefined ? k.stimulus : (k.passage !== undefined ? k.passage : null),
        subject: k.subject || fallbackSubjectLabel,
        section: k.section || null,
        skill: k.skill || null,
        passage: k.passage !== undefined ? k.passage : null,
        content: k.content || '',
        options: k.options || [],
        diagram: k.diagram || null,
        explanation: k.explanation || '',
        pitfall: k.pitfall || '',
        keyFormula: k.keyFormula || '',
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

  function getTeacherKeys(quizId) {
    if (typeof isMasterTeacherRole !== 'function' || !isMasterTeacherRole()) return [];
    return [...(vault.get(quizId)?.keys || [])];
  }

  return { store, getPublicKeys, getTeacherKeys, grade, clear };
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
  selectedTermFilter: 'all',
  teacherQuizStatusFilter: 'all',
  teacherQuizSearchQuery: ''
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
    const stored = localStorage.getItem('khiemedu_teacher_pin');
    if (!stored || stored === '123456') {
      return '130909';
    }
    return stored;
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
  await window.LocalStudentProfile?.init();
  restoreLocalStudentProfile();
  renderTeacherQuizManager();
  renderTeacherRosterManager();
  renderTeacherAnalyticsDashboard();
  renderAssignTargetsSelector();
  renderGamificationTab();
  initAntiCheatListeners();
  checkUrlQuizParam();
  checkAndRenderPausedExamBanner();
  initFirebaseRealtimeSync();
  initializeVactRuntime().catch(err => console.warn('V-ACT runtime init warning:', err));
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

/* ================= 👑 ROLE ĐẶC BIỆT: THẦY KHIÊM (CẦN MẬT KHẨU BẢO MẬT) ================= */
const MasterTeacherAuth = {
  getPassword() {
    const stored = localStorage.getItem('khiemedu_master_pass');
    if (!stored || stored === 'khiem123') {
      return '130909';
    }
    return stored;
  },
  setPassword(newPass) {
    localStorage.setItem('khiemedu_master_pass', newPass);
  },
  isVerified() {
    return localStorage.getItem('khiemedu_master_verified') === 'true';
  },
  setVerified(val = true) {
    localStorage.setItem('khiemedu_master_verified', val ? 'true' : 'false');
  }
};

function isMasterTeacherRole(name) {
  const n = (name !== undefined ? name : (AppState.studentName || GamificationEngine.getUserProfile().name || '')).trim().toLowerCase();
  const isNameMatch = n.includes('thầy khiêm') || n.includes('thay khiem') || n === 'khiêm' || n === 'khiem' || n.includes('thaykhiem');
  return isNameMatch && MasterTeacherAuth.isVerified();
}

function updateMasterTeacherRoleUI(isActive) {
  const navBadge = document.getElementById('masterTeacherNavBadge');
  if (navBadge) navBadge.classList.toggle('hidden', !isActive);

  const detectedPill = document.getElementById('masterTeacherDetectedPill');
  if (detectedPill) detectedPill.classList.toggle('hidden', !isActive);
}

function handleMasterTeacherActivation() {
  if (MasterTeacherAuth.isVerified()) {
    activateMasterTeacherRole();
  } else {
    openMasterTeacherAuthModal();
  }
}

function openMasterTeacherAuthModal() {
  const modal = document.getElementById('masterTeacherAuthModal');
  const input = document.getElementById('masterTeacherPinInput');
  const err = document.getElementById('masterTeacherAuthError');
  if (err) err.textContent = '';
  if (input) {
    input.value = '';
    setTimeout(() => input.focus(), 150);
  }
  if (modal) modal.classList.remove('hidden');
  SoundEngine.playWarning();
}

function closeMasterTeacherAuthModal() {
  const modal = document.getElementById('masterTeacherAuthModal');
  if (modal) modal.classList.add('hidden');
}

function toggleMasterPassVisibility() {
  const input = document.getElementById('masterTeacherPinInput');
  if (input) {
    input.type = input.type === 'password' ? 'text' : 'password';
  }
}

function verifyMasterTeacherAuth() {
  const input = document.getElementById('masterTeacherPinInput');
  const errorEl = document.getElementById('masterTeacherAuthError');
  const enteredPass = (input ? input.value : '').trim();
  const correctPass = MasterTeacherAuth.getPassword();

  if (enteredPass === correctPass) {
    MasterTeacherAuth.setVerified(true);
    closeMasterTeacherAuthModal();
    activateMasterTeacherRole();
  } else {
    if (errorEl) errorEl.textContent = '❌ Mật khẩu không chính xác! Vui lòng thử lại.';
    SoundEngine.playWarning();
    if (input) {
      input.classList.add('shake');
      setTimeout(() => input.classList.remove('shake'), 500);
      input.focus();
    }
  }
}

function promptChangeMasterPassword() {
  const currentPass = prompt('Nhập mật khẩu Thầy Khiêm hiện tại:');
  if (currentPass === null) return;
  if (currentPass !== MasterTeacherAuth.getPassword()) {
    alert('❌ Mật khẩu hiện tại không đúng!');
    return;
  }
  const newPass = prompt('Nhập mật khẩu Thầy Khiêm mới (tối thiểu 4 ký tự):');
  if (!newPass || newPass.trim().length < 4) {
    alert('⚠️ Mật khẩu mới phải có ít nhất 4 ký tự!');
    return;
  }
  MasterTeacherAuth.setPassword(newPass.trim());
  showToast('🔑 Đã đổi mật khẩu Role Thầy Khiêm thành công!', 'success');
  SoundEngine.playCorrect();
}

function logoutMasterTeacherRole() {
  MasterTeacherAuth.setVerified(false);
  const profile = GamificationEngine.getUserProfile();
  profile.isMasterTeacher = false;
  profile.name = 'Học Sinh';
  profile.className = '10';
  profile.frame = 'frame-target';
  GamificationEngine.saveUserProfile(profile);

  sessionStorage.removeItem('khiemedu_teacher_logged');
  
  const nameInput = document.getElementById('studentJoinName');
  const classInput = document.getElementById('studentJoinClass');
  if (nameInput) nameInput.value = '';
  if (classInput) classInput.value = '10';
  AppState.studentName = '';

  updateMasterTeacherRoleUI(false);
  updateGamifyBar();
  updatePersonalizedExamFeed();
  showToast('🚪 Đã đăng xuất khỏi Role Thầy Khiêm!', 'info');
}

function activateMasterTeacherRole() {
  const nameInput = document.getElementById('studentJoinName');
  const classInput = document.getElementById('studentJoinClass');
  if (nameInput) nameInput.value = 'Thầy Khiêm';
  if (classInput) classInput.value = 'GV / Sáng Lập Viên';

  AppState.studentName = 'Thầy Khiêm';
  AppState.studentClass = 'GV / Sáng Lập Viên';
  AppState.studentAvatar = '👨‍🏫';

  const profile = GamificationEngine.getUserProfile();
  profile.name = 'Thầy Khiêm';
  profile.className = 'GV / Sáng Lập Viên';
  profile.avatar = '👨‍🏫';
  profile.frame = 'frame-master-khiem';
  profile.isMasterTeacher = true;
  profile.xp = Math.max(profile.xp || 0, 9999);
  profile.streak = Math.max(profile.streak || 0, 99);
  profile.perfectStreak = Math.max(profile.perfectStreak || 0, 10);
  
  // Mở khóa TOÀN BỘ 18 HUY HIỆU VÀ KHUNG VIỀN!
  profile.unlockedBadges = BADGES_DEFINITIONS.map(b => b.id);
  profile.unlockedFrames = BADGES_DEFINITIONS.map(b => b.frame.cssClass);
  if (!profile.unlockedFrames.includes('frame-master-khiem')) {
    profile.unlockedFrames.push('frame-master-khiem');
  }

  GamificationEngine.saveUserProfile(profile);
  TeacherAuth.login(); // Tự động mở khóa quyền quản trị giáo viên!

  selectAvatar('👨‍🏫');
  updateGamifyBar();
  updateMasterTeacherRoleUI(true);
  updatePersonalizedExamFeed();

  GamificationEngine.fireConfetti();
  SoundEngine.playFanfare();
  showToast('👑 Chào mừng Thầy Khiêm! Xác thực mật khẩu thành công! Bạn đã mở khóa toàn bộ quyền hạn & Khung Viền Hoàng Kim Long Phụng!', 'success');
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
  if (isMasterTeacherRole()) {
    updateMasterTeacherRoleUI(true);
    TeacherAuth.login();
  }
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
    if (isMasterTeacherRole()) {
      TeacherAuth.login();
    } else {
      AppState.pendingTeacherTab = tabId;
      openTeacherAuthModal();
      return;
    }
  }

  AppState.activeTab = tabId;
  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  document.querySelectorAll('.view-section').forEach(sec => {
    sec.classList.toggle('active', sec.id === 'tab' + capitalize(tabId));
  });

  if (tabId !== 'student') {
    document.body.classList.remove('in-exam-session');
  }

  SoundEngine.playClick();

  if (tabId === 'gamification') {
    renderGamificationTab();
  } else if (tabId === 'teacher') {
    switchTeacherSubtab(AppState.activeTeacherSubtab || 'create');
    renderAssignTargetsSelector();
    renderDocumentBankStats();
    checkAndRunAutoRetentionSweep();
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

/* ================= TEACHER SUB-TAB NAVIGATION ================= */
function switchTeacherSubtab(subtabName) {
  AppState.activeTeacherSubtab = subtabName;
  const subtabs = ['create', 'manage', 'analytics', 'vouchers', 'settings'];
  subtabs.forEach(name => {
    const btn = document.getElementById(`btnTeacherSubtab_${name}`);
    const view = document.getElementById(`teacherSubtabView_${name}`);
    if (btn) btn.classList.toggle('active', name === subtabName);
    if (view) view.classList.toggle('hidden', name !== subtabName);
  });

  SoundEngine.playClick ? SoundEngine.playClick() : null;

  if (subtabName === 'create') {
    renderDocumentBankStats();
  } else if (subtabName === 'manage') {
    renderTeacherQuizManager();
    renderTeacherRosterManager();
    renderTeacherPenaltyManagerSection();
  } else if (subtabName === 'analytics') {
    renderTeacherAnalyticsDashboard();
    if (typeof StudentAnalytics !== 'undefined' && StudentAnalytics.renderTeacherClassTopicAnalytics) {
      StudentAnalytics.renderTeacherClassTopicAnalytics();
    }
  } else if (subtabName === 'vouchers') {
    renderTeacherVouchersManager('all');
  }
}

function toggleCustomAnswerKeySection() {
  const checkbox = document.getElementById('toggleCustomAnswerKeyCheckbox');
  const wrap = document.getElementById('customAnswerKeySectionWrap');
  if (!checkbox || !wrap) return;

  if (checkbox.checked) {
    wrap.classList.remove('hidden');
  } else {
    wrap.classList.add('hidden');
  }
  updateTotalExamPointsCalculation();
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
                  <button type="button" class="btn btn-warning btn-sm" onclick="openTeacherPenaltyModal('${escapeHtml(s.name)}')" style="margin-right:4px;">⚖️ Kỷ Luật</button>
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

/* ================= DISCIPLINARY & PENALTY MANAGEMENT (SỔ KỶ LUẬT & TRỪ ĐIỂM) ================= */
function openTeacherPenaltyModal(studentName = '') {
  const modal = document.getElementById('modalTeacherPenalty');
  const studentSelect = document.getElementById('penaltyStudentSelect');
  const classInput = document.getElementById('penaltyClassInput');
  const xpInput = document.getElementById('penaltyXpInput');
  const reasonInput = document.getElementById('penaltyReasonInput');
  const noteInput = document.getElementById('penaltyNoteInput');

  if (!modal) return;

  const roster = AppState.studentRoster || [];
  if (studentSelect) {
    studentSelect.innerHTML = `
      <option value="">-- Chọn học sinh từ danh bạ --</option>
      ${roster.map(s => `<option value="${escapeHtml(s.name)}" data-class="${escapeHtml(s.className || '10')}">${escapeHtml(s.name)} (Lớp ${escapeHtml(s.className)})</option>`).join('')}
    `;

    if (studentName) {
      studentSelect.value = studentName;
      const opt = studentSelect.options[studentSelect.selectedIndex];
      if (opt && classInput) {
        classInput.value = opt.dataset.class || '10';
      }
    } else if (roster.length && classInput) {
      studentSelect.selectedIndex = 1;
      const opt = studentSelect.options[1];
      if (opt) classInput.value = opt.dataset.class || '10';
    }
  }

  if (xpInput) xpInput.value = '-5';
  if (reasonInput) reasonInput.value = 'Đi học muộn / Mất trật tự trong giờ';
  if (noteInput) noteInput.value = '';

  renderTeacherPenaltyHistory();
  modal.classList.remove('hidden');
  SoundEngine.playClick();
}

function closeTeacherPenaltyModal() {
  const modal = document.getElementById('modalTeacherPenalty');
  if (modal) modal.classList.add('hidden');
}

function onPenaltyStudentSelected() {
  const studentSelect = document.getElementById('penaltyStudentSelect');
  const classInput = document.getElementById('penaltyClassInput');
  if (!studentSelect || !classInput) return;

  const opt = studentSelect.options[studentSelect.selectedIndex];
  if (opt && opt.dataset.class) {
    classInput.value = opt.dataset.class;
  }
}

function applyQuickPenaltyPreset(xp, reason) {
  const xpInput = document.getElementById('penaltyXpInput');
  const reasonInput = document.getElementById('penaltyReasonInput');
  if (xpInput) {
    xpInput.value = xp;
    xpInput.style.color = xp < 0 ? 'var(--rose)' : 'var(--primary-shadow)';
  }
  if (reasonInput) reasonInput.value = reason;
  SoundEngine.playClick();
}

async function submitTeacherPenaltyForm() {
  const studentSelect = document.getElementById('penaltyStudentSelect');
  const classInput = document.getElementById('penaltyClassInput');
  const xpInput = document.getElementById('penaltyXpInput');
  const reasonInput = document.getElementById('penaltyReasonInput');
  const noteInput = document.getElementById('penaltyNoteInput');

  const studentName = (studentSelect?.value || '').trim();
  const className = (classInput?.value || '').trim();
  const xpChange = parseInt(xpInput?.value || '0', 10);
  const reason = (reasonInput?.value || '').trim();
  const teacherNote = (noteInput?.value || '').trim();

  if (!studentName) {
    showToast('⚠️ Vui lòng chọn học sinh!', 'warn');
    return;
  }
  if (!reason) {
    showToast('⚠️ Vui lòng nhập lý do trừ/cộng điểm!', 'warn');
    return;
  }
  if (isNaN(xpChange) || xpChange === 0) {
    showToast('⚠️ Vui lòng nhập số điểm thay đổi khác 0!', 'warn');
    return;
  }

  GamificationEngine.applyTeacherAdjustment(studentName, className, xpChange, reason, teacherNote);

  renderTeacherPenaltyHistory();
  renderTeacherPenaltyManagerSection();
  renderWeeklyLeaderboard();
  renderGamificationTab();

  if (xpChange < 0) {
    showToast(`⚖️ Đã trừ ${Math.abs(xpChange)} XP của [${studentName}]: ${reason}`, 'warn');
  } else {
    showToast(`🌟 Đã thưởng +${xpChange} XP cho [${studentName}]: ${reason}`, 'success');
    SoundEngine.playFanfare();
  }
}

async function handleDeletePenalty(penaltyId) {
  if (!confirm('Bạn có chắc muốn xóa bản ghi kỷ luật này?')) return;

  await StorageEngine.deletePenalty(penaltyId);
  renderTeacherPenaltyHistory();
  renderTeacherPenaltyManagerSection();
  renderWeeklyLeaderboard();
  renderGamificationTab();
  showToast('🗑️ Đã xóa bản ghi kỷ luật thành công.', 'success');
  SoundEngine.playClick();
}

function renderTeacherPenaltyHistory() {
  const tbody = document.getElementById('penaltyHistoryTableBody');
  const countBadge = document.getElementById('penaltyHistoryCountBadge');
  if (!tbody) return;

  const penalties = StorageEngine.getAllPenalties();
  if (countBadge) countBadge.textContent = `${penalties.length} bản ghi`;

  if (!penalties.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center;padding:1.5rem;color:var(--text-muted);font-weight:700;">
          Chưa có ghi nhận kỷ luật hoặc trừ/thưởng điểm nào.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = penalties.map(p => {
    const isNeg = (p.xpChange || 0) < 0;
    const dateStr = p.createdAt ? new Date(p.createdAt).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '—';
    return `
      <tr>
        <td style="font-size:0.8rem;color:var(--text-muted);">${dateStr}</td>
        <td><strong style="color:var(--text-primary);">${escapeHtml(p.studentName)}</strong></td>
        <td><span class="badge-status badge-pass">Lớp ${escapeHtml(p.className || 'Chung')}</span></td>
        <td>
          <span class="badge-penalty ${isNeg ? 'badge-penalty-negative' : 'badge-penalty-positive'}">
            ${isNeg ? '' : '+'}${p.xpChange} XP
          </span>
        </td>
        <td style="font-size:0.85rem;font-weight:700;">${escapeHtml(p.reason || '—')}</td>
        <td style="font-size:0.8rem;color:var(--text-secondary);font-style:italic;">${escapeHtml(p.teacherNote || '—')}</td>
        <td>
          <button type="button" class="btn btn-secondary btn-sm" onclick="handleDeletePenalty('${p.id}')" style="padding:0.2rem 0.5rem;font-size:0.75rem;" title="Xóa bản ghi này">
            🗑️ Xóa
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function renderTeacherPenaltyManagerSection() {
  const wrap = document.getElementById('teacherPenaltyManagerWrap');
  if (!wrap) return;

  const penalties = StorageEngine.getAllPenalties();
  if (!penalties.length) {
    wrap.innerHTML = `
      <div style="text-align:center;padding:1.75rem 1rem;background:var(--bg-tertiary);border:2px dashed var(--border-color);border-radius:var(--radius-lg);">
        <p style="font-weight:700;color:var(--text-secondary);margin-bottom:0.75rem;">Sổ kỷ luật hiện đang sạch sẽ. Chưa có học sinh nào bị trừ điểm nề nếp.</p>
        <button type="button" class="btn btn-danger btn-sm" onclick="openTeacherPenaltyModal()">➕ Thêm Ghi Nhận Kỷ Luật / Trừ Điểm</button>
      </div>
    `;
    return;
  }

  wrap.innerHTML = `
    <div style="margin-bottom:0.75rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;">
      <span style="font-weight:800;color:var(--text-primary);">Tổng số ghi nhận: <strong style="color:var(--rose);font-size:1.1rem;">${penalties.length}</strong></span>
      <button type="button" class="btn btn-danger btn-sm" onclick="openTeacherPenaltyModal()">➕ Trừ / Thưởng Điểm</button>
    </div>
    <div class="table-responsive" style="max-height:300px;overflow-y:auto;">
      <table class="penalty-history-table">
        <thead>
          <tr>
            <th>Thời Gian</th>
            <th>Học Sinh</th>
            <th>Lớp</th>
            <th>Mức Điểm</th>
            <th>Lý Do Vi Phạm / Thưởng</th>
            <th>Ghi Chú</th>
            <th>Hành Động</th>
          </tr>
        </thead>
        <tbody>
          ${penalties.map(p => {
            const isNeg = (p.xpChange || 0) < 0;
            const dateStr = p.createdAt ? new Date(p.createdAt).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '—';
            return `
              <tr>
                <td style="font-size:0.8rem;color:var(--text-muted);">${dateStr}</td>
                <td><strong style="color:var(--text-primary);">${escapeHtml(p.studentName)}</strong></td>
                <td><span class="badge-status badge-pass">Lớp ${escapeHtml(p.className || 'Chung')}</span></td>
                <td>
                  <span class="badge-penalty ${isNeg ? 'badge-penalty-negative' : 'badge-penalty-positive'}">
                    ${isNeg ? '' : '+'}${p.xpChange} XP
                  </span>
                </td>
                <td style="font-size:0.85rem;font-weight:700;">${escapeHtml(p.reason || '—')}</td>
                <td style="font-size:0.8rem;color:var(--text-secondary);font-style:italic;">${escapeHtml(p.teacherNote || '—')}</td>
                <td>
                  <button type="button" class="btn btn-secondary btn-sm" onclick="handleDeletePenalty('${p.id}')" style="padding:0.2rem 0.5rem;font-size:0.75rem;">
                    🗑️ Xóa
                  </button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderStudentDisciplinaryStatus() {
  const wrap = document.getElementById('studentDisciplinaryWrap');
  if (!wrap) return;

  const profile = GamificationEngine.getUserProfile();
  const penalties = StorageEngine.getPenaltiesByStudent(profile.name);

  if (!penalties.length) {
    wrap.innerHTML = `
      <div class="card" style="border-left:5px solid var(--primary);background:linear-gradient(135deg, rgba(16,185,129,0.05), var(--bg-card));margin-top:1.5rem;">
        <div style="display:flex;align-items:center;gap:0.75rem;">
          <span style="font-size:2rem;">🌟</span>
          <div>
            <div style="font-weight:900;font-size:1.05rem;color:var(--primary-shadow);">Nề Nếp & Ý Thức Học Tập Xuất Sắc</div>
            <div style="font-size:0.85rem;color:var(--text-secondary);font-weight:700;">Bạn không có điểm trừ kỷ luật nào! Hãy tiếp tục duy trì tinh thần học tập chính trực nhé.</div>
          </div>
        </div>
      </div>
    `;
    return;
  }

  const totalDeducted = penalties.filter(p => (p.xpChange || 0) < 0).reduce((sum, p) => sum + Math.abs(p.xpChange), 0);
  const totalBonus = penalties.filter(p => (p.xpChange || 0) > 0).reduce((sum, p) => sum + p.xpChange, 0);

  wrap.innerHTML = `
    <div class="card student-disciplinary-card" style="margin-top:1.5rem;">
      <div class="card-header" style="flex-wrap:wrap;gap:0.5rem;">
        <div style="display:flex;align-items:center;gap:0.5rem;">
          <span style="font-size:1.6rem;">⚖️</span>
          <div>
            <h3 style="margin:0;font-size:1.15rem;color:var(--rose);">Sổ Ghi Nhận Nề Nếp & Kỷ Luật Của Bạn</h3>
            <p class="card-subtitle" style="margin:0;">Chi tiết các lần nhắc nhở vi phạm hoặc khen thưởng từ Thầy Cô & Hệ Thống:</p>
          </div>
        </div>
        <div style="display:flex;gap:0.5rem;align-items:center;">
          ${totalDeducted > 0 ? `<span class="badge-penalty badge-penalty-negative">Tổng trừ: -${totalDeducted} XP</span>` : ''}
          ${totalBonus > 0 ? `<span class="badge-penalty badge-penalty-positive">Tổng thưởng: +${totalBonus} XP</span>` : ''}
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:0.6rem;margin-top:1rem;">
        ${penalties.map(p => {
          const isNeg = (p.xpChange || 0) < 0;
          const dateStr = p.createdAt ? new Date(p.createdAt).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '—';
          return `
            <div style="padding:0.75rem 1rem;background:var(--bg-card);border:1.5px solid ${isNeg ? 'rgba(244,63,94,0.3)' : 'rgba(16,185,129,0.3)'};border-radius:var(--radius-md);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;">
              <div style="display:flex;align-items:center;gap:0.6rem;">
                <span style="font-size:1.3rem;">${isNeg ? '⚠️' : '🌟'}</span>
                <div>
                  <div style="font-weight:800;font-size:0.9rem;color:var(--text-primary);">${escapeHtml(p.reason || 'Điều chỉnh điểm')}</div>
                  ${p.teacherNote ? `<div style="font-size:0.8rem;color:var(--text-secondary);font-style:italic;">💬 Lời nhắn: "${escapeHtml(p.teacherNote)}"</div>` : ''}
                  <div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px;">${dateStr}</div>
                </div>
              </div>
              <span class="badge-penalty ${isNeg ? 'badge-penalty-negative' : 'badge-penalty-positive'}" style="font-size:0.9rem;padding:0.25rem 0.65rem;">
                ${isNeg ? '' : '+'}${p.xpChange} XP
              </span>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
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

    <!-- Student Disciplinary & Conduct Log in Parent View -->
    ${(() => {
      const childPenalties = typeof StorageEngine !== 'undefined' && typeof StorageEngine.getPenaltiesByStudent === 'function'
        ? StorageEngine.getPenaltiesByStudent(name)
        : [];
      if (!childPenalties.length) {
        return `
          <div class="card" style="border-left:5px solid var(--primary);background:linear-gradient(135deg, rgba(16,185,129,0.05), var(--bg-card));margin-bottom:1.25rem;">
            <div style="display:flex;align-items:center;gap:0.75rem;">
              <span style="font-size:2rem;">🌟</span>
              <div>
                <div style="font-weight:900;font-size:1rem;color:var(--primary-shadow);">Nề Nếp Học Tập & Ý Thức Của Con: Xuất Sắc</div>
                <div style="font-size:0.85rem;color:var(--text-secondary);font-weight:700;">Học sinh không có bất kỳ vi phạm hay điểm trừ kỷ luật nào. Con luôn tự giác và trung thực khi làm bài!</div>
              </div>
            </div>
          </div>
        `;
      }
      const negSum = childPenalties.filter(p => (p.xpChange || 0) < 0).reduce((s, p) => s + Math.abs(p.xpChange), 0);
      const posSum = childPenalties.filter(p => (p.xpChange || 0) > 0).reduce((s, p) => s + p.xpChange, 0);
      return `
        <div class="card" style="border-left:5px solid var(--rose);margin-bottom:1.25rem;">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.75rem;">
            <div style="font-weight:900;font-size:1.05rem;color:var(--text-primary);display:flex;align-items:center;gap:0.4rem;">
              <span>⚖️</span> <span>Sổ Theo Dõi Nề Nếp & Kỷ Luật Của Con (${childPenalties.length} lần ghi nhận)</span>
            </div>
            <div style="display:flex;gap:0.5rem;">
              ${negSum > 0 ? `<span class="badge-penalty badge-penalty-negative">Tổng trừ: -${negSum} XP</span>` : ''}
              ${posSum > 0 ? `<span class="badge-penalty badge-penalty-positive">Tổng thưởng: +${posSum} XP</span>` : ''}
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:0.5rem;">
            ${childPenalties.map(p => {
              const isNeg = (p.xpChange || 0) < 0;
              const dateStr = p.createdAt ? new Date(p.createdAt).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '—';
              return `
                <div style="padding:0.6rem 0.85rem;background:var(--bg-tertiary);border-radius:var(--radius-md);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.4rem;">
                  <div>
                    <strong style="color:var(--text-primary);font-size:0.9rem;">${isNeg ? '⚠️' : '🌟'} ${escapeHtml(p.reason || '')}</strong>
                    ${p.teacherNote ? `<div style="font-size:0.8rem;color:var(--text-secondary);font-style:italic;margin-top:2px;">💬 Nhận xét của Thầy: "${escapeHtml(p.teacherNote)}"</div>` : ''}
                    <div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px;">${dateStr}</div>
                  </div>
                  <span class="badge-penalty ${isNeg ? 'badge-penalty-negative' : 'badge-penalty-positive'}">
                    ${isNeg ? '' : '+'}${p.xpChange} XP
                  </span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    })()}

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
  results = (results || []).filter(r => r.gradingStatus !== 'pending' && !r.isDocumentOnly);
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

function generateSvgScoreChart(results, maxLimit = 25) {
  results = (results || []).filter(r => r.gradingStatus !== 'pending' && !r.isDocumentOnly);
  if (!results || !results.length) {
    return `<div style="text-align:center;padding:2.5rem 1rem;color:var(--text-muted);font-weight:700;">Chưa có dữ liệu bài thi để vẽ biểu đồ.</div>`;
  }

  // Sắp xếp bài thi theo thứ tự thời gian nộp bài tăng dần
  const sorted = [...results].sort((a, b) => {
    const tA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
    const tB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
    return tA - tB;
  });

  const totalCount = sorted.length;
  // Nếu có quá nhiều bài nộp (ví dụ > 25 bài), hiển thị 25 bài gần nhất để biểu đồ luôn thoáng đẹp, chống đè chữ
  const isCapped = maxLimit && totalCount > maxLimit;
  const displayItems = isCapped ? sorted.slice(-maxLimit) : sorted;
  const N = displayItems.length;

  const width = 760;
  const height = 230;
  const padLeft = 45;
  const padRight = 35;
  const padTop = 30;
  const padBottom = 35;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const points = displayItems.map((r, idx) => {
    const x = N === 1 
      ? padLeft + chartW / 2 
      : padLeft + (idx / (N - 1)) * chartW;
    const score = Math.max(0, Math.min(10, typeof r.totalScore === 'number' ? r.totalScore : (parseFloat(r.totalScore) || 0)));
    const y = padTop + chartH - (score / 10) * chartH;
    
    let dateStr = '';
    if (r.submittedAt) {
      try {
        const d = new Date(r.submittedAt);
        dateStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
      } catch (e) {}
    }

    return { 
      x, 
      y, 
      score, 
      title: r.quizTitle || r.quizId || `Bài ${idx + 1}`,
      dateStr,
      rawIndex: isCapped ? (totalCount - N + idx + 1) : (idx + 1)
    };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${(padTop + chartH)} L ${points[0].x.toFixed(1)} ${(padTop + chartH)} Z`;

  // Xác định bước nhảy nhãn trục X để KHÔNG BAO GIỜ bị đè chữ
  let xStep = 1;
  if (N > 40) xStep = Math.ceil(N / 8);
  else if (N > 20) xStep = Math.ceil(N / 10);
  else if (N > 12) xStep = 2;

  // Bán kính điểm co giãn theo mật độ
  const pointRadius = N > 40 ? 2.5 : (N > 20 ? 3.5 : 5);

  // Tìm điểm cao nhất để làm nổi bật
  let maxScore = -1;
  points.forEach(p => {
    if (p.score > maxScore) maxScore = p.score;
  });

  return `
    <div style="position:relative;">
      <svg viewBox="0 0 ${width} ${height}" class="chart-svg" style="width:100%;height:230px;overflow:visible;">
        <defs>
          <linearGradient id="scoreAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--indigo)" stop-opacity="0.32"/>
            <stop offset="100%" stop-color="var(--indigo)" stop-opacity="0.0"/>
          </linearGradient>
        </defs>

        <!-- Trục Y mốc điểm 0, 2.5, 5, 7.5, 10 -->
        ${[0, 2.5, 5, 7.5, 10].map(s => {
          const y = padTop + chartH - (s / 10) * chartH;
          return `
            <line x1="${padLeft}" y1="${y}" x2="${width - padRight}" y2="${y}" stroke="var(--border-color)" stroke-dasharray="4 4" stroke-width="1.2"/>
            <text x="${padLeft - 8}" y="${y + 4}" fill="var(--text-muted)" font-size="11" font-weight="700" text-anchor="end">${s}đ</text>
          `;
        }).join('')}

        <!-- Miền tô màu dốc & Đường vẽ tiến độ -->
        <path d="${areaPath}" fill="url(#scoreAreaGrad)"/>
        <path d="${linePath}" fill="none" stroke="var(--indigo)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>

        <!-- Nhãn trục hoành X (Có bước nhảy chống đè chữ) -->
        ${points.map((p, i) => {
          const shouldShowX = (i % xStep === 0) || (i === points.length - 1);
          if (!shouldShowX) return '';
          return `
            <text x="${p.x.toFixed(1)}" y="${height - 10}" fill="var(--text-secondary)" font-size="10" font-weight="700" text-anchor="middle">#${p.rawIndex}</text>
          `;
        }).join('')}

        <!-- Các điểm dữ liệu & Tooltip tương tác -->
        ${points.map((p, i) => {
          let showScoreLabel = false;
          if (N <= 15) {
            showScoreLabel = true;
          } else if (N <= 25) {
            showScoreLabel = (i % 2 === 0) || (i === N - 1);
          } else {
            showScoreLabel = (i === 0 || i === N - 1 || p.score === maxScore);
          }

          const tooltipText = `Bài #${p.rawIndex}: ${p.score}đ | ${p.title}${p.dateStr ? ' (' + p.dateStr + ')' : ''}`;

          return `
            <g class="chart-point-node" style="cursor:pointer;">
              <title>${escapeHtml(tooltipText)}</title>
              <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${pointRadius}" fill="#fff" stroke="var(--indigo)" stroke-width="2.5"/>
              ${showScoreLabel ? `
                <text x="${p.x.toFixed(1)}" y="${(p.y - 8).toFixed(1)}" fill="var(--indigo)" font-size="10.5" font-weight="900" text-anchor="middle" style="pointer-events:none;text-shadow:0 1px 3px rgba(255,255,255,0.9);">${p.score}đ</text>
              ` : ''}
            </g>
          `;
        }).join('')}
      </svg>
      ${isCapped ? `
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.8rem;color:var(--text-muted);margin-top:0.35rem;font-weight:700;flex-wrap:wrap;gap:0.4rem;">
          <span>💡 Đang hiển thị <strong>${N} bài gần nhất</strong> để đảm bảo biểu đồ sắc nét.</span>
          <span style="color:var(--indigo);">Tổng cộng: <strong>${totalCount} bài thi</strong> trong hệ thống</span>
        </div>
      ` : ''}
    </div>
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

  const [allResults, allQuizzes] = await Promise.all([
    StorageEngine.getAllResults(),
    StorageEngine.getAllQuizzes()
  ]);
  const roster = AppState.studentRoster || [];

  let filtered = allResults;
  if (AppState.teacherAnalyticsScope !== 'all') {
    filtered = allResults.filter(r => r.name.toLowerCase() === AppState.teacherAnalyticsScope.toLowerCase());
  }

  filtered = filterResultsByTime(filtered, AppState.teacherTimeFilter);
  const metrics = computeRealMetrics(filtered);

  // Exam coverage calculation
  const quizIdsWithSubmissions = new Set(filtered.filter(r => r.quizId).map(r => r.quizId.toString().trim().toUpperCase()));
  const takenQuizzesCount = allQuizzes.filter(q => quizIdsWithSubmissions.has((q.id || '').toString().trim().toUpperCase())).length;
  const totalQuizzesCount = allQuizzes.length;
  const examCoveragePct = totalQuizzesCount ? Math.round((takenQuizzesCount / totalQuizzesCount) * 100) : 0;

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

    <!-- Exam Coverage & Engagement Progress -->
    <div style="background:var(--bg-card);padding:1rem 1.25rem;border-radius:var(--radius-lg);border:2px solid var(--border-color);margin-bottom:1.25rem;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.6rem;flex-wrap:wrap;gap:0.5rem;">
        <span style="font-weight:800;color:var(--text-primary);">🎯 Tỷ Lệ Khai Thác Đề Thi (Exam Coverage):</span>
        <span style="font-weight:900;color:var(--primary);">${takenQuizzesCount}/${totalQuizzesCount} Đề Có Lượt Làm (${examCoveragePct}%) &nbsp;|&nbsp; ${totalQuizzesCount - takenQuizzesCount} Đề Chưa Có Lượt Làm</span>
      </div>
      <div class="question-breakdown-bar">
        <div class="breakdown-seg-correct" style="width:${examCoveragePct}%;background:linear-gradient(90deg, #10b981, #059669);" title="Đã có học sinh làm: ${examCoveragePct}%"></div>
        <div class="breakdown-seg-unsolved" style="width:${100 - examCoveragePct}%;background:var(--bg-tertiary);" title="Chưa có học sinh làm: ${100 - examCoveragePct}%"></div>
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

  if (typeof StudentAnalytics !== 'undefined' && StudentAnalytics.renderTeacherClassTopicAnalytics) {
    StudentAnalytics.renderTeacherClassTopicAnalytics();
  }
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
  const regexNumbered = /(?:câu\s*)?(\d+)[\s.:)\-–—=]*([A-D])(?:\b|\s|$)/gi;
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
      ${AppState.teacherMcqKeys.map((item, idx) => {
        const isTf = item.type === 'truefalse';
        const opts = isTf ? ['Đúng', 'Sai'] : ['A', 'B', 'C', 'D'];
        return `
          <div class="matrix-item ${isTf ? 'matrix-item-tf' : ''}">
            <span class="matrix-q-num">#${item.num}${isTf ? ' (Đ/S)' : ''}</span>
            <div class="matrix-btn-group">
              ${opts.map(opt => {
                const isActive = isTf
                  ? (String(item.correct).toLowerCase() === opt.toLowerCase())
                  : (String(item.correct).toUpperCase() === opt);
                return `
                  <button type="button" 
                    class="matrix-opt-btn ${isActive ? 'active' : ''}" 
                    style="${isTf ? 'padding:0.25rem 0.5rem;font-size:0.8rem;min-width:44px;' : ''}"
                    onclick="setTeacherMcqAnswer(${idx}, '${opt}')">${opt}</button>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }).join('')}
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
  const isCustom = !!document.getElementById('toggleCustomAnswerKeyCheckbox')?.checked;
  const scoreEl = document.getElementById('teacherTotalScoreCalculationBadge');
  if (!scoreEl) return;

  if (!isCustom) {
    scoreEl.innerHTML = `Chế độ Tinh Gọn (Học sinh xem đề & nộp bài trực tiếp)`;
    scoreEl.className = 'badge-status badge-pass';
    return;
  }

  const mcqTotal = AppState.teacherMcqKeys.reduce((sum, k) => sum + (k.score || 0), 0);
  const essayTotal = AppState.teacherEssayKeys.reduce((sum, k) => sum + (k.score || 0), 0);
  const totalScore = Math.round((mcqTotal + essayTotal) * 100) / 100;
  const totalCount = AppState.teacherMcqKeys.length + AppState.teacherEssayKeys.length;

  scoreEl.className = 'badge-status badge-pass';
  scoreEl.innerHTML = `Tổng: <strong>${totalCount} câu</strong> (Trắc nghiệm: ${Math.round(mcqTotal*100)/100}đ + Tự luận: ${Math.round(essayTotal*100)/100}đ = <strong>${totalScore}/10đ</strong>)`;
}

/* ================= SMART MATH AUTO-GENERATOR CONTROLLER ================= */
function switchMathGenMode(mode = 'standard') {
  const btnStandard = document.getElementById('tabMathModeStandard');
  const btnDgnl = document.getElementById('tabMathModeDgnl');
  const panelStandard = document.getElementById('mathGenStandardPanel');
  const panelDgnl = document.getElementById('mathGenDgnlPanel');

  if (mode === 'dgnl') {
    if (btnDgnl) {
      btnDgnl.className = 'btn btn-primary';
      btnDgnl.style.boxShadow = '0 3px 10px rgba(99,102,241,0.25)';
    }
    if (btnStandard) {
      btnStandard.className = 'btn btn-secondary';
      btnStandard.style.boxShadow = 'none';
    }
    if (panelStandard) panelStandard.classList.add('hidden');
    if (panelDgnl) panelDgnl.classList.remove('hidden');
    showToast('🧠 Đã chuyển sang chế độ tạo đề Đánh Giá Năng Lực (Mini 100 / Full 120)!', 'info');
  } else {
    if (btnStandard) {
      btnStandard.className = 'btn btn-primary';
      btnStandard.style.boxShadow = '0 3px 10px rgba(99,102,241,0.25)';
    }
    if (btnDgnl) {
      btnDgnl.className = 'btn btn-secondary';
      btnDgnl.style.boxShadow = 'none';
    }
    if (panelStandard) panelStandard.classList.remove('hidden');
    if (panelDgnl) panelDgnl.classList.add('hidden');
    showToast('📐 Đã chuyển sang chế độ tạo đề Toán Phổ Thông (Lớp 6 - 12)!', 'info');
  }
}

function selectDgnlPackage(pkg = 'mini') {
  const radioMini = document.getElementById('dgnlPackageMini');
  const radioFull = document.getElementById('dgnlPackageFull');
  const cardMini = document.getElementById('cardDgnlMini');
  const cardFull = document.getElementById('cardDgnlFull');
  const timeInput = document.getElementById('dgnlTimeLimitInput');
  const btn = document.getElementById('btnGenerateDgnlExam');

  if (pkg === 'full') {
    if (radioFull) radioFull.checked = true;
    if (cardFull) {
      cardFull.style.border = '2.5px solid #7c3aed';
      cardFull.style.opacity = '1';
      cardFull.style.boxShadow = '0 4px 14px rgba(124,58,237,0.2)';
    }
    if (cardMini) {
      cardMini.style.border = '2px solid var(--border-color)';
      cardMini.style.opacity = '0.85';
      cardMini.style.boxShadow = 'none';
    }
    if (timeInput) timeInput.value = 150;
    if (btn) btn.innerHTML = '🚀 TẠO FULL V-ACT 120 — ĐHQG TP.HCM (120 CÂU — 150 PHÚT)';
  } else {
    if (radioMini) radioMini.checked = true;
    if (cardMini) {
      cardMini.style.border = '2.5px solid var(--indigo)';
      cardMini.style.opacity = '1';
      cardMini.style.boxShadow = '0 4px 14px rgba(99,102,241,0.2)';
    }
    if (cardFull) {
      cardFull.style.border = '2px solid var(--border-color)';
      cardFull.style.opacity = '0.85';
      cardFull.style.boxShadow = 'none';
    }
    if (timeInput) timeInput.value = 90;
    if (btn) btn.innerHTML = '🚀 TẠO MINI V-ACT 100 — ĐHQG TP.HCM (100 CÂU — 90 PHÚT)';
  }
}

async function triggerAutoGenerateDgnlExam() {
  const examGen = window.KEDUVACT?.VACTExamGenerator || window.VACTExamGenerator;
  if (!examGen || typeof examGen.generateMini100 !== 'function') {
    showToast('⚠️ Bộ sinh đề V-ACT chưa sẵn sàng, vui lòng thử lại.', 'warn');
    return;
  }

  // Ensure source bank is ready
  const loader = window.KEDUVACT?.sourceBankLoader || window.sourceBankLoader;
  if (loader && loader.getStatus() !== 'ready') {
    try {
      await loader.ready();
    } catch (err) {
      showToast('❌ Không thể tải ngân hàng câu hỏi V-ACT. Vui lòng thử lại.', 'error');
      return;
    }
  }

  try {
    const isFull = document.getElementById('dgnlPackageFull')?.checked;
    const timeLimit = parseInt(document.getElementById('dgnlTimeLimitInput')?.value || (isFull ? '150' : '90'), 10) || (isFull ? 150 : 90);

    showToast(`⏳ Đang tự động sinh đề V-ACT — ĐHQG TP.HCM (${isFull ? '120' : '100'} câu)...`, 'info');

    // Check readiness before generating
    const vactCoverage = window.KEDUVACT?.VACTCoverage || window.VACTCoverage;
    const profileId = isFull ? 'vact_full' : 'vact_mini_100';
    if (vactCoverage && typeof vactCoverage.getProfileReadiness === 'function') {
      const readiness = vactCoverage.getProfileReadiness(profileId);
      if (!readiness.ready) {
        const missingParts = [];
        for (const [secKey, sec] of Object.entries(readiness.sections || {})) {
          if (sec.missing > 0) missingParts.push(`${secKey}: ${sec.available}/${sec.required}`);
        }
        showToast(`⚠️ Ngân hàng chưa đủ câu hỏi để sinh đề hoàn chỉnh (${readiness.totalAvailable}/${readiness.totalRequired}). ${missingParts.join(', ')}`, 'warn');
        return;
      }
    }

    // Generate using canonical VACTExamGenerator
    const examResult = isFull
      ? examGen.generateFull120({ timeLimitMinutes: timeLimit })
      : examGen.generateMini100({ timeLimitMinutes: timeLimit });

    if (!examResult || !examResult.questions || examResult.questions.length === 0) {
      showToast('⚠️ Không thể sinh đề V-ACT, vui lòng thử lại.', 'warn');
      return;
    }

    // Validate completeness — never save a partial exam
    if (!examResult.isComplete) {
      showToast(`❌ Đề thi không đầy đủ (${examResult.generatedTotal}/${examResult.requestedTotal} câu). Không thể lưu đề bán phần.`, 'error');
      return;
    }

    const generated = examGen.formatExamAsQuiz(examResult);

    if (!generated) {
      showToast('⚠️ Không thể định dạng đề V-ACT, vui lòng thử lại.', 'warn');
      return;
    }

    // 1. Cập nhật biểu mẫu giáo viên
    const titleInput = document.getElementById('teacherExamTitleInput');
    const gradeSelect = document.getElementById('teacherExamGradeSelect');
    const termSelect = document.getElementById('teacherExamTermSelect');
    const timeLimitInput = document.getElementById('teacherExamTimeLimitInput');
    if (titleInput) titleInput.value = generated.title;
    if (gradeSelect) gradeSelect.value = 'DGNL';
    if (termSelect) termSelect.value = 'DGNL';
    if (timeLimitInput) timeLimitInput.value = generated.timeLimit;
    syncExamTimeLimits(generated.timeLimit);

    const customKeyCb = document.getElementById('toggleCustomAnswerKeyCheckbox');
    if (customKeyCb) {
      customKeyCb.checked = true;
      toggleCustomAnswerKeySection();
    }

    // 2. Nạp khóa đáp án
    AppState.teacherMcqKeys = (generated.answerKeys || []).map(k => ({ ...k }));
    AppState.teacherEssayKeys = [];

    // 3. Tạo preview HTML
    const dataUrl = generated.pdfDataUrl || ('data:text/html;charset=utf-8,' + encodeURIComponent(generated.examHtml || ''));
    AppState.teacherPdfData = dataUrl;
    AppState.teacherFileName = `${(generated.title || 'De_VACT').replace(/\s+/g, '_')}.html`;

    const previewWrap = document.getElementById('teacherPdfPreviewWrapper');
    const previewFrame = document.getElementById('teacherPdfPreviewFrame');
    const clearBtn = document.getElementById('clearPdfBtn');
    const nameBadge = document.getElementById('teacherPdfFileNameBadge');

    if (previewWrap) previewWrap.classList.remove('hidden');
    if (previewFrame) previewFrame.src = dataUrl;
    if (clearBtn) clearBtn.classList.remove('hidden');
    if (nameBadge) {
      nameBadge.classList.remove('hidden');
      nameBadge.innerHTML = `📄 <strong>Đề thi V-ACT — ĐHQG TP.HCM đã sinh:</strong> ${escapeHtml(generated.title)}`;
    }

    // 4. Lưu và phát hành đề thi lên hệ thống
    const newQuizId = generateQuizCode();
    const totalQ = generated.answerKeys ? generated.answerKeys.length : (generated.questionsCount || 0);
    const autoQuiz = {
      id: newQuizId,
      title: generated.title,
      targetClass: 'DGNL',
      examTerm: 'DGNL',
      timeLimit: generated.timeLimit || examResult.timeLimitMinutes,
      totalQuestions: totalQ,
      mcqCount: totalQ,
      essayCount: 0,
      examMode: 'split_pdf',
      examHtml: generated.examHtml || '',
      pdfFileName: AppState.teacherFileName,
      pdfDataUrl: dataUrl,
      assignType: 'all',
      assignedClasses: [],
      assignedStudents: [],
      showLeaderboard: true,
      antiCheat: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      answerKeys: generated.answerKeys || [],
      subject: 'vact',
      subjectLabel: 'V-ACT — Đánh giá năng lực (ĐHQG TP.HCM)',
      discipline: 'vact',
      vactMeta: generated.vactMeta || null
    };

    await persistTeacherQuiz(autoQuiz);
    AppState.editingQuizId = newQuizId;

    renderTeacherMcqGrid();
    renderTeacherEssayGrid();
    updateTotalExamPointsCalculation();
    updatePersonalizedExamFeed();
    renderTeacherQuizManager();
    renderTeacherAnalyticsDashboard();

    const resBox = document.getElementById('mathGenResultBox');
    if (resBox) {
      resBox.classList.remove('hidden');
      resBox.innerHTML = `
        <div style="background:var(--primary-light);border:2px solid var(--primary);border-radius:var(--radius-lg);padding:1.15rem 1.35rem;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:0.75rem;">
            <div>
              <h4 style="color:var(--primary-shadow);margin-bottom:0.35rem;font-size:1.15rem;">🎉 ĐÃ PHÁT HÀNH THÀNH CÔNG ĐỀ ĐÁNH GIÁ NĂNG LỰC!</h4>
              <p style="color:var(--primary-shadow);font-size:0.92rem;font-weight:700;margin-bottom:0.4rem;">
                <strong>${escapeHtml(generated.title)}</strong>
              </p>
              <div style="font-size:0.875rem;font-weight:700;color:var(--emerald-shadow);">
                🧠 100% Trắc nghiệm chuẩn hóa (${generated.mcqCount} câu) · Thời gian: ${generated.timeLimit} phút · Mã đề: <strong>${newQuizId}</strong>
              </div>
            </div>
            <div style="text-align:right;">
              <span class="code-badge" style="font-size:1.3rem;padding:0.35rem 0.85rem;">${newQuizId}</span>
              <div style="font-size:0.75rem;color:var(--text-secondary);margin-top:2px;">MÃ ĐỀ THI ĐGNL</div>
            </div>
          </div>
          <div style="display:flex;gap:0.6rem;flex-wrap:wrap;margin-top:1rem;">
            <button type="button" class="btn btn-sky" onclick="loadSampleToStudent('${newQuizId}')">🚀 Vào Thi Thử Ngay [${newQuizId}]</button>
            <button type="button" class="btn btn-secondary" onclick="previewDgnlExamDocument()">👁️ Xem Bản In KaTeX</button>
            <button type="button" class="btn btn-primary" onclick="copyQuizCode('${newQuizId}')">📋 Sao Chép Mã Đề</button>
          </div>
        </div>
      `;
    }

    if (typeof SoundEngine !== 'undefined' && SoundEngine.playFanfare) SoundEngine.playFanfare();
    if (typeof GamificationEngine !== 'undefined' && GamificationEngine.fireConfetti) GamificationEngine.fireConfetti();
    showToast(`🎉 Đã tạo và phát hành đề ĐGNL [${newQuizId}] thành công!`, 'success');
  } catch (err) {
    console.error('Lỗi khi sinh đề ĐGNL:', err);
    showToast(`❌ Không thể sinh đề ĐGNL: ${err.message || err}`, 'error');
  }
}

function previewDgnlExamDocument() {
  const isFull = document.getElementById('dgnlPackageFull')?.checked;
  const timeLimit = parseInt(document.getElementById('dgnlTimeLimitInput')?.value || (isFull ? '150' : '90'), 10) || (isFull ? 150 : 90);

  const examGen = window.KEDUVACT?.VACTExamGenerator || window.VACTExamGenerator;
  if (!examGen || typeof examGen.generateMini100 !== 'function') {
    showToast('⚠️ Không thể xem trước đề V-ACT.', 'warn');
    return;
  }

  try {
    const examResult = isFull
      ? examGen.generateFull120({ timeLimitMinutes: timeLimit })
      : examGen.generateMini100({ timeLimitMinutes: timeLimit });

    if (!examResult || !examResult.questions || examResult.questions.length === 0) {
      showToast('⚠️ Không thể tạo bản xem trước đề V-ACT.', 'warn');
      return;
    }

    const examHtml = examGen.renderExamPaperHtml(examResult);
    const w = window.open('', '_blank');
    if (w) {
      w.document.open();
      w.document.write(examHtml);
      w.document.close();
    }
  } catch (err) {
    console.error('previewDgnlExamDocument error:', err);
    showToast('⚠️ Không thể tạo bản in đề V-ACT: ' + err.message, 'warn');
  }
}

function handleTrackChange(trackVal) {
  const gradeSelect = document.getElementById('mathGenGradeSelect');
  const termSelect = document.getElementById('mathGenTermSelect');
  const countSelect = document.getElementById('mathGenMcqCountSelect');
  const topicSelect = document.getElementById('mathGenTopicSelect');

  if (trackVal && trackVal.startsWith('dgnl')) {
    switchMathGenMode('dgnl');
  } else {
    switchMathGenMode('standard');
    if (gradeSelect && gradeSelect.value === 'DGNL') gradeSelect.value = '12';
    if (termSelect && termSelect.value === 'DGNL') termSelect.value = 'THPT';
  }
}

// ============================================================
// XỬ LÝ ĐỔI MÔN HỌC (BƯỚC 1/4 - KHUNG ĐA MÔN HỌC)
// ============================================================
const SUBJECT_LABELS = {
  toan:     'Toán học',
  khtn:     'Khoa học Tự nhiên',
  tienganh: 'Tiếng Anh',
  sat:      'SAT Quốc tế'
};

function handleExamSubjectChange(subjectVal) {
  document.getElementById('mathGenDisciplineGroup')?.classList.toggle('hidden', subjectVal !== 'khtn');
  const khtnBanner = document.getElementById('khtnInfoBanner');
  const mathGenControls = document.getElementById('mathGenControlsContainer');
  const trackGroup = document.getElementById('mathGenTrackSelect')?.closest('.form-group');
  const gradeSelect = document.getElementById('mathGenGradeSelect');
  const topicSelect = document.getElementById('mathGenTopicSelect');
  const btnAuto = document.getElementById('btnAutoGenerateMathExam');
  const titleInput = document.getElementById('teacherExamTitleInput');

  // Đảm bảo khung điều khiển luôn hiển thị
  if (mathGenControls) mathGenControls.classList.remove('hidden');

  if (subjectVal === 'khtn') {
    if (khtnBanner) khtnBanner.classList.remove('hidden');
    if (trackGroup) trackGroup.style.display = 'none';

    // Đổi options khối lớp KHTN (Lớp 6 - 9, GDPT 2018)
    if (gradeSelect) {
      gradeSelect.innerHTML = `
        <option value="6">KHTN 6</option>
        <option value="7">KHTN 7</option>
        <option value="8" selected>KHTN 8</option>
        <option value="9">KHTN 9</option>
        <option value="all">Tổng Hợp KHTN (6-9)</option>
      `;
    }

    // Đổi options phân môn KHTN
    if (topicSelect) {
      topicSelect.innerHTML = `
        <option value="all" selected>Tất cả phân môn (Tổng hợp)</option>
        <option value="vat_ly">Vật lý</option>
        <option value="hoa_hoc">Hóa học</option>
        <option value="sinh_hoc">Sinh học</option>
      `;
    }

    if (btnAuto) {
      btnAuto.innerHTML = `⚡ TỰ ĐỘNG SINH 5 ĐỀ KHTN (KHÔNG TRÙNG LẶP) & NẠP HỆ THỐNG 🚀`;
      btnAuto.style.background = 'linear-gradient(135deg, #059669, #10b981)';
    }

    if (titleInput) {
      const defaultTitles = Object.values(SUBJECT_LABELS).map(l => `Đề Kiểm Tra — Môn ${l}`);
      if (defaultTitles.includes(titleInput.value) || titleInput.value === 'Đề Kiểm Tra — Môn Toán') {
        titleInput.value = 'Đề Kiểm Tra — Môn Khoa học Tự nhiên';
      }
    }
  } else {
    // Khôi phục giao diện Toán học chuẩn
    if (khtnBanner) khtnBanner.classList.add('hidden');
    if (trackGroup) trackGroup.style.display = '';

    if (gradeSelect) {
      gradeSelect.innerHTML = `
        <option value="6">Toán 6</option>
        <option value="7">Toán 7</option>
        <option value="8">Toán 8</option>
        <option value="9">Toán 9</option>
        <option value="10" selected>Toán 10</option>
        <option value="11">Toán 11</option>
        <option value="12">Toán 12</option>
        <option value="TS10">Luyện Thi Tuyển Sinh Vào 10</option>
        <option value="all">Tổng Hợp Đa Dạng Khối</option>
      `;
    }

    if (topicSelect) {
      topicSelect.innerHTML = `
        <option value="all" selected>Tất cả chủ đề</option>
        <option value="Số học">Số học & Tập hợp</option>
        <option value="Đại số">Đại số & Phương trình</option>
        <option value="Hình học">Hình học & Đo lường</option>
        <option value="Hàm số">Hàm số & Parabol</option>
        <option value="Vectơ">Vectơ & Tọa độ Oxy</option>
      `;
    }

    if (btnAuto) {
      btnAuto.innerHTML = `⚡ TỰ ĐỘNG SINH 5 ĐỀ TOÁN (KHÔNG TRÙNG LẶP) & NẠP HỆ THỐNG 🚀`;
      btnAuto.style.background = 'linear-gradient(135deg, #6366f1, #8b5cf6)';
    }

    if (titleInput) {
      const defaultTitles = Object.values(SUBJECT_LABELS).map(l => `Đề Kiểm Tra — Môn ${l}`);
      if (defaultTitles.includes(titleInput.value) || titleInput.value === 'Đề Kiểm Tra — Môn Khoa học Tự nhiên') {
        titleInput.value = 'Đề Kiểm Tra — Môn Toán';
      }
    }
  }
}

if (typeof window !== 'undefined') {
  window.handleTrackChange = handleTrackChange;
  window.handleExamSubjectChange = handleExamSubjectChange;
  window.switchMathGenMode = switchMathGenMode;
  window.selectDgnlPackage = selectDgnlPackage;
  window.triggerAutoGenerateDgnlExam = triggerAutoGenerateDgnlExam;
  window.previewDgnlExamDocument = previewDgnlExamDocument;
}

function updateMathGenEssaySummary() {
  const cTH = Math.max(0, parseInt(document.getElementById('mathGenCountTHSelect')?.value || '0', 10) || 0);
  const cVD = Math.max(0, parseInt(document.getElementById('mathGenCountVDSelect')?.value || '0', 10) || 0);
  const cVDC = Math.max(0, parseInt(document.getElementById('mathGenCountVDCSelect')?.value || '0', 10) || 0);
  const total = cTH + cVD + cVDC;

  const badge = document.getElementById('mathGenTotalEssaySummaryBadge');
  if (badge) {
    badge.innerHTML = `Tổng: <strong>${total} câu tự luận</strong> (TH: ${cTH} · VD: ${cVD} · VDC: ${cVDC})`;
  }
  updateMathGenCapacityStatus();
}

function updateMathGenCapacityStatus() {
  const container = document.getElementById('mathGenCapacityStatusBar');
  if (!container) return;

  const currentSubject = document.getElementById('examSubjectSelect')?.value || 'toan';
  if (currentSubject === 'khtn') {
    container.style.display = 'none';
    return;
  }
  container.style.display = 'block';

  const grade = document.getElementById('mathGenGradeSelect')?.value || '10';
  const term = document.getElementById('mathGenTermSelect')?.value || 'GK1';
  const topic = document.getElementById('mathGenTopicSelect')?.value || 'all';
  const sourceMode = document.getElementById('mathGenSourceSelect')?.value || 'hybrid';
  const mcqCount = parseInt(document.getElementById('mathGenMcqCountSelect')?.value || '12', 10);
  const countTH = Math.max(0, parseInt(document.getElementById('mathGenCountTHSelect')?.value || '0', 10) || 0);
  const countVD = Math.max(0, parseInt(document.getElementById('mathGenCountVDSelect')?.value || '0', 10) || 0);
  const countVDC = Math.max(0, parseInt(document.getElementById('mathGenCountVDCSelect')?.value || '0', 10) || 0);

  if (typeof MathEngine === 'undefined' || typeof MathEngine.getGenerationCapacity !== 'function') {
    return;
  }

  const cap = MathEngine.getGenerationCapacity({
    grade,
    term,
    topic,
    sourceMode,
    mcqCount,
    essayMatrix: { TH: countTH, VD: countVD, VDC: countVDC }
  });

  const mcqEl = document.getElementById('mathGenCapMcq');
  const thEl = document.getElementById('mathGenCapTH');
  const vdEl = document.getElementById('mathGenCapVD');
  const vdcEl = document.getElementById('mathGenCapVDC');
  const noteEl = document.getElementById('mathGenCapacityNote');

  if (mcqEl) mcqEl.textContent = `Trắc nghiệm tài liệu: ${cap.mcq.documentAvailable}`;
  if (thEl) thEl.textContent = `TH: ${cap.essay.TH.documentAvailable}`;
  if (vdEl) vdEl.textContent = `VD: ${cap.essay.VD.documentAvailable}`;
  if (vdcEl) vdcEl.textContent = `VDC đã duyệt: ${cap.essay.VDC.approvedAvailable}`;

  if (noteEl) {
    if (!cap.feasible) {
      const blockerMsgs = (cap.blockers || []).map(b => {
        if (b.code === 'VDC_APPROVED_SOURCE_SHORTAGE') {
          return `⛔ Ngân hàng hiện chưa có đủ câu VDC trường chuyên đã duyệt (Yêu cầu: ${b.requested}, Khả dụng: ${b.available})`;
        }
        return `⛔ ${b.part || 'Thiếu nguồn'}: Yêu cầu ${b.requested}, khả dụng ${b.available}`;
      });
      noteEl.innerHTML = `<span style="color:#dc2626;">${escapeHtml(blockerMsgs.join(' · '))}</span>`;
    } else if (sourceMode === 'hybrid') {
      noteEl.innerHTML = `<span style="color:#059669;">✨ Hybrid có thể bổ sung tự động</span>`;
    } else {
      noteEl.innerHTML = `<span style="color:#2563eb;">📚 Chế độ tài liệu thật (đủ câu)</span>`;
    }
  }
}
window.updateMathGenCapacityStatus = updateMathGenCapacityStatus;

// Global state to store latest generated batch exams for preview and copy
AppState.latestBatchGeneratedExams = [];

/**
 * Render widget thống kê từ DocumentQuestionBank.getStats()
 */
function renderDocumentBankStats() {
  if (typeof DocumentQuestionBank === 'undefined' || typeof DocumentQuestionBank.getStats !== 'function') return;
  const stats = DocumentQuestionBank.getStats();
  const difficultyTable = document.getElementById('docBankDifficultyBreakdown');
  if (difficultyTable) {
    const labels = { toan: 'Toán', vat_ly: 'Vật lý (KHTN)', hoa_hoc: 'Hóa học (KHTN)', sinh_hoc: 'Sinh học (KHTN)', dgnl: 'Đánh giá năng lực' };
    difficultyTable.innerHTML = '<table class="data-table"><thead><tr><th>Môn / nhóm đề</th><th>Cơ bản (NB + TH)</th><th>Nhãn VD/VDC hiện có</th><th>VDC trường chuyên đã duyệt</th><th>Chưa phân loại</th></tr></thead><tbody>' +
      Object.entries(stats.byDisciplineDifficulty || {}).map(([key, counts]) => `<tr><td>${escapeHtml(labels[key] || key)}</td><td>${counts.basic.toLocaleString()}</td><td>${counts.advanced.toLocaleString()}</td><td>${(counts.specializedVdc || 0).toLocaleString()}</td><td>${counts.unclassified.toLocaleString()}</td></tr>`).join('') + '</tbody></table>';
  }

  const totalBadge = document.getElementById('docBankTotalBadge');
  const sourcesBadge = document.getElementById('docBankSourcesBadge');
  const container = document.getElementById('docBankStatsBreakdown');

  if (totalBadge) totalBadge.textContent = `${(stats.total || 0).toLocaleString()} CÂU HỎI`;
  if (sourcesBadge) sourcesBadge.textContent = `${stats.sourcesCount || 0} Nguồn Tài Liệu`;

  if (!container) return;

  const gradeOrder = ['DGNL', '12', '11', '10', '9', '8', '7', '6'];
  const gradeLabels = {
    'DGNL': '🧠 ĐGNL',
    '12': '📐 Toán 12',
    '11': '📐 Toán 11',
    '10': '📐 Toán 10',
    '9': '📐 Toán 9',
    '8': '📐 Toán 8',
    '7': '📐 Toán 7',
    '6': '📐 Toán 6'
  };

  const html = gradeOrder.map(g => {
    const count = (stats.byGrade && stats.byGrade[g]) || 0;
    if (count === 0) return '';
    return `
      <div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-md);padding:0.6rem 0.5rem;text-align:center;">
        <div style="font-size:0.75rem;font-weight:700;color:var(--text-secondary);">${gradeLabels[g] || 'Lớp ' + g}</div>
        <div style="font-size:1.1rem;font-weight:900;color:var(--primary);margin-top:2px;">${count.toLocaleString()}</div>
        <div style="font-size:0.68rem;color:var(--text-secondary);">câu hỏi</div>
      </div>
    `;
  }).filter(Boolean).join('');

  container.innerHTML = html;
}
window.renderDocumentBankStats = renderDocumentBankStats;

function setExamDifficultyMode(mode) {
  if (!['basic', 'advanced', 'mixed'].includes(mode)) return;
  const input = document.getElementById('mathGenDifficultyMode');
  if (input) input.value = mode;
  // Người dùng tự cấu hình Ma trận Tự luận (TH / VD / VDC).
  // Tuyệt đối không tự ý ghi đè hoặc vô hiệu hóa các ô nhập.
  updateMathGenEssaySummary();
}
window.setExamDifficultyMode = setExamDifficultyMode;
document.addEventListener('DOMContentLoaded', () => {
  updateMathGenEssaySummary();
  updateMathGenBatchPolicyNotice();
  updateMathGenBatchButtonText();
  updateMathGenCapacityStatus();
  ['mathGenGradeSelect', 'mathGenTermSelect', 'mathGenTopicSelect', 'mathGenSourceSelect', 'mathGenMcqCountSelect'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', updateMathGenCapacityStatus);
  });
  const policyEl = document.getElementById('mathGenDeduplicatePolicySelect');
  if (policyEl) {
    policyEl.addEventListener('change', () => {
      updateMathGenBatchPolicyNotice();
      updateMathGenBatchButtonText();
    });
  }
});

function updateMathGenBatchButtonText() {
  const count = parseInt(document.getElementById('mathGenBatchCountSelect')?.value || '1', 10);
  const policy = document.getElementById('mathGenDeduplicatePolicySelect')?.value || 'variant_shuffle';
  const btn = document.getElementById('btnAutoGenerateMathExam');
  if (!btn) return;
  if (count > 1) {
    if (policy === 'variant_shuffle') {
      btn.innerHTML = `⚡ TỰ ĐỘNG SINH ${count} MÃ ĐỀ TOÁN (ĐẢO MÃ ĐỀ) & NẠP HỆ THỐNG 🚀`;
    } else {
      btn.innerHTML = `⚡ TỰ ĐỘNG SINH ${count} ĐỀ TOÁN (100% ĐỘC LẬP) & NẠP HỆ THỐNG 🚀`;
    }
  } else {
    btn.innerHTML = `⚡ TỰ ĐỘNG SINH ĐỀ TOÁN & NẠP VÀO PHIẾU ĐÁP ÁN 🚀`;
  }
}

function updateMathGenBatchPolicyNotice() {
  const policy = document.getElementById('mathGenDeduplicatePolicySelect')?.value || 'variant_shuffle';
  const notice = document.getElementById('mathGenBatchNotice');
  const badge = document.getElementById('mathGenBatchStatusBadge');
  if (policy === 'disjoint') {
    if (badge) badge.textContent = '🛡️ Chế độ: Đảm bảo 100% không trùng lặp câu hỏi';
    if (notice) notice.innerHTML = '💡 <strong>Chế độ 100% Độc Lập:</strong> Hệ thống tự động theo dõi và khóa chữ ký câu hỏi trên toàn bộ 5/10 đề. Mỗi câu hỏi trong đề 2, 3, 4, 5... đảm bảo khác biệt hoàn toàn với các đề trước, kết hợp giữa ngân hàng câu hỏi thực tế và bộ sinh tham số ngẫu nhiên.';
  } else {
    if (badge) badge.textContent = '🔀 Chế độ: Hoán vị mã đề chuẩn Bộ GD&ĐT (101, 102...)';
    if (notice) notice.innerHTML = '💡 <strong>Chế độ Đảo Mã Đề:</strong> Sinh bộ đề gốc chuẩn rồi tự động hoán vị ngẫu nhiên thứ tự câu hỏi và 4 phương án A-B-C-D cho từng mã đề 101, 102, 103... Có sẵn ma trận đáp án tương ứng từng mã đề.';
  }
}

/**
 * Đồng bộ 2 chiều thời gian làm bài giữa các ô cài đặt (Setting 1 lần đồng bộ toàn bộ)
 */
function syncExamTimeLimits(newVal, source = '') {
  const parsed = parseInt(newVal, 10);
  if (isNaN(parsed) || parsed <= 0) return;
  const timeLimitInputs = [
    document.getElementById('teacherExamTimeLimitInput'),
    document.getElementById('mathGenTimeLimitInput'),
    document.getElementById('batchCommonTimeLimitInput')
  ];
  timeLimitInputs.forEach(input => {
    if (input && input.value !== String(parsed)) {
      input.value = parsed;
    }
  });
}

async function triggerAutoGenerateMathExam() {
  const currentSubject = document.getElementById('examSubjectSelect')?.value || 'toan';
  const isKhtn = (currentSubject === 'khtn');
  const activeEngine = isKhtn 
    ? (typeof KhtnEngine !== 'undefined' ? KhtnEngine : null)
    : (typeof MathEngine !== 'undefined' ? MathEngine : null);
  const subjectDisplayName = isKhtn ? 'Khoa học Tự nhiên' : 'Toán';

  if (!activeEngine) {
    showToast(`⚠️ Bộ sinh đề ${subjectDisplayName} chưa sẵn sàng, vui lòng thử lại.`, 'warn');
    return;
  }

  try {
    const track = isKhtn ? 'khtn' : (document.getElementById('mathGenTrackSelect')?.value || 'toan');
    const grade = document.getElementById('mathGenGradeSelect')?.value || (isKhtn ? '8' : '10');
    const term = document.getElementById('mathGenTermSelect')?.value || 'GK1';
    let topic = document.getElementById('mathGenTopicSelect')?.value || 'all';
    const sourceMode = document.getElementById('mathGenSourceSelect')?.value || (isKhtn ? 'document' : 'hybrid');
    const difficultyMode = document.getElementById('mathGenDifficultyMode')?.value || 'mixed';
    const discipline = isKhtn ? (document.getElementById('mathGenDisciplineSelect')?.value || 'all') : 'all';
    if (isKhtn && discipline !== 'all') topic = discipline;
    if (!isKhtn && sourceMode !== 'synthetic' && typeof DocumentQuestionBank !== 'undefined') {
      await DocumentQuestionBank.ensureGradeLoaded(track.startsWith('dgnl') ? 'DGNL' : grade);
    }
    const mcqCount = parseInt(document.getElementById('mathGenMcqCountSelect')?.value || '12', 10);

    const countTH = Math.max(0, parseInt(document.getElementById('mathGenCountTHSelect')?.value || '0', 10) || 0);
    const countVD = Math.max(0, parseInt(document.getElementById('mathGenCountVDSelect')?.value || '0', 10) || 0);
    const countVDC = Math.max(0, parseInt(document.getElementById('mathGenCountVDCSelect')?.value || '0', 10) || 0);

    const batchCount = parseInt(document.getElementById('mathGenBatchCountSelect')?.value || '1', 10);
    const deduplicatePolicy = document.getElementById('mathGenDeduplicatePolicySelect')?.value || 'variant_shuffle';
    const batchTitlePrefix = (document.getElementById('mathGenBatchTitlePrefixInput')?.value || '').trim();

    // Lấy thời gian làm bài từ ô nhập (ưu tiên ô mathGenTimeLimitInput hoặc teacherExamTimeLimitInput)
    const timeLimitVal = parseInt(
      document.getElementById('mathGenTimeLimitInput')?.value || 
      document.getElementById('teacherExamTimeLimitInput')?.value || 
      '45', 10
    ) || 45;
    syncExamTimeLimits(timeLimitVal);

    // ================= TRƯỜNG HỢP 1: TẠO HÀNG LOẠT N ĐỀ THI (5, 10, 20 ĐỀ...) =================
    if (batchCount > 1) {
      showToast(`⏳ Đang tự động sinh ${batchCount} đề thi ${subjectDisplayName} không trùng lặp (${timeLimitVal} phút)...`, 'info');
      const generatedList = activeEngine.generateBatchExams({
        track,
        grade,
        term,
        topic,
        sourceMode,
        difficultyMode,
        discipline,
        mcqCount,
        essayMatrix: { TH: countTH, VD: countVD, VDC: countVDC },
        timeLimit: timeLimitVal,
        batchCount,
        deduplicatePolicy,
        titlePrefix: batchTitlePrefix
      });

      if (!generatedList || !generatedList.length) {
        showToast(`⚠️ Không thể sinh bộ đề thi ${subjectDisplayName}, vui lòng thử lại.`, 'warn');
        return;
      }

      const firstGen = generatedList[0];
      const incomplete = generatedList.find(gen => {
        if (!gen.totalQuestions || gen.mcqCount < mcqCount) return true;
        if (isKhtn) {
          return gen.essayCount < countTH + countVD + countVDC;
        } else {
          if (gen.isComplete === false) return true;
          const diag = gen.generationDiagnostics?.generated;
          if (diag) {
            if (Number(diag.TH ?? 0) < countTH) return true;
            if (Number(diag.VD ?? 0) < countVD) return true;
            if (Number(diag.VDC ?? 0) < countVDC) return true;
          }
          return gen.essayCount < countTH + countVD + countVDC;
        }
      });
      if (incomplete) {
        const warning = incomplete.warning || 'Ngân hàng chưa đủ câu độc nhất cho cả bộ đề.';
        showToast(warning, 'warn');
        const shortageAlert = document.getElementById('mathGenSourceAlert');
        if (shortageAlert) {
          shortageAlert.classList.remove('hidden');
          shortageAlert.style.display = 'block';
          shortageAlert.textContent = warning;
        }
        return;
      }
      const alertEl = document.getElementById('mathGenSourceAlert');
      if (firstGen && firstGen.warning) {
        if (alertEl) {
          alertEl.classList.remove('hidden');
          alertEl.style.display = 'block';
          alertEl.innerHTML = `⚠️ <strong>Lưu ý nguồn câu hỏi:</strong> ${escapeHtml(firstGen.warning)}`;
        }
      } else if (alertEl) {
        alertEl.classList.add('hidden');
        alertEl.style.display = 'none';
        alertEl.innerHTML = '';
      }

      const savePromises = generatedList.map(async (gen, i) => {
        const newQuizId = generateQuizCode();
        const examDataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(gen.examHtml || '');
        const fileName = `${(gen.title || `De_${isKhtn ? 'KHTN' : 'Toan'}_${gen.examCode || i+1}`).replace(/\s+/g, '_')}.html`;

        const autoQuiz = {
          id: newQuizId,
          title: gen.title,
          targetClass: grade,
          examTerm: term,
          timeLimit: gen.timeLimit,
          totalQuestions: gen.answerKeys.length,
          mcqCount: gen.mcqCount,
          essayCount: gen.essayCount,
          examMode: 'split_pdf',
          examHtml: gen.examHtml,
          pdfFileName: fileName,
          pdfDataUrl: examDataUrl,
          assignType: 'all',
          assignedClasses: [],
          assignedStudents: [],
          showLeaderboard: true,
          antiCheat: true,
          createdAt: new Date(Date.now() + i * 1000).toISOString(),
          updatedAt: new Date(Date.now() + i * 1000).toISOString(),
          answerKeys: gen.answerKeys,
          examCode: gen.examCode || (100 + i + 1).toString(),
          subject: isKhtn ? 'khtn' : 'toan',
          difficultyMode,
          specializedSourceOnly: difficultyMode === 'advanced',
          discipline,
          subjectLabel: isKhtn ? ({ vat_ly: 'Vật lý', hoa_hoc: 'Hóa học', sinh_hoc: 'Sinh học' }[discipline] || 'Khoa học Tự nhiên') : 'Toán học'
        };

        await persistTeacherQuiz(autoQuiz);
        return { quizId: newQuizId, exam: gen, quiz: autoQuiz, dataUrl: examDataUrl };
      });

      const savedExams = await Promise.all(savePromises);

      // Nạp đề thi đầu tiên vào giao diện Editor
      const firstSaved = savedExams[0];
      AppState.teacherMcqKeys = (firstGen.answerKeys || []).filter(k => k.type === 'mcq').map(k => ({ ...k }));
      AppState.teacherEssayKeys = (firstGen.answerKeys || []).filter(k => k.type === 'essay').map(k => ({ ...k, testInput: '' }));
      AppState.teacherPdfData = firstSaved.dataUrl;
      AppState.teacherFileName = firstSaved.quiz.pdfFileName;
      AppState.editingQuizId = firstSaved.quizId;
      AppState.editingQuizCreatedAt = firstSaved.quiz.createdAt;

      const titleInput = document.getElementById('teacherExamTitleInput');
      const gradeSelect = document.getElementById('teacherExamGradeSelect');
      const termSelect = document.getElementById('teacherExamTermSelect');
      const timeLimitInput = document.getElementById('teacherExamTimeLimitInput');
      if (titleInput) titleInput.value = firstGen.title;
      if (gradeSelect) gradeSelect.value = grade;
      if (termSelect) termSelect.value = term;
      if (timeLimitInput) timeLimitInput.value = firstGen.timeLimit;
      syncExamTimeLimits(firstGen.timeLimit);

      const customKeyCb = document.getElementById('toggleCustomAnswerKeyCheckbox');
      if (customKeyCb) {
        customKeyCb.checked = true;
        toggleCustomAnswerKeySection();
      }

      const previewWrap = document.getElementById('teacherPdfPreviewWrapper');
      const previewFrame = document.getElementById('teacherPdfPreviewFrame');
      const clearBtn = document.getElementById('clearPdfBtn');
      const nameBadge = document.getElementById('teacherPdfFileNameBadge');
      if (previewWrap) previewWrap.classList.remove('hidden');
      if (previewFrame) previewFrame.src = firstSaved.dataUrl;
      if (clearBtn) clearBtn.classList.remove('hidden');
      if (nameBadge) {
        nameBadge.classList.remove('hidden');
        nameBadge.innerHTML = `📄 <strong>Bộ đề ${batchCount} đề ${subjectDisplayName} đã sinh (Đang mở Đề 1):</strong> ${escapeHtml(firstGen.title || '')}`;
      }

      renderTeacherMcqGrid();
      renderTeacherEssayGrid();
      updateTotalExamPointsCalculation();
      updatePersonalizedExamFeed();
      renderTeacherQuizManager();
      renderTeacherAnalyticsDashboard();

      // Kết quả thông báo nổi bật trên Teacher Hub
      const resBox = document.getElementById('mathGenResultBox');
      if (resBox) {
        resBox.classList.remove('hidden');
        resBox.innerHTML = `
          <div style="background:var(--primary-light);border:2px solid var(--primary);border-radius:var(--radius-lg);padding:1.15rem 1.35rem;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:0.75rem;">
              <div>
                <h4 style="color:var(--primary-shadow);margin-bottom:0.35rem;font-size:1.15rem;">🎉 ĐÃ TỰ ĐỘNG SINH & PHÁT HÀNH ${savedExams.length} ĐỀ THI KHÔNG TRÙNG LẶP!</h4>
                <p style="color:var(--primary-shadow);font-size:0.92rem;font-weight:700;margin-bottom:0.4rem;">
                  Môn: <strong>${subjectDisplayName}</strong> · Chế độ: <strong>${deduplicatePolicy === 'disjoint' ? '🛡️ 100% Độc lập (Không trùng câu hỏi)' : '🔀 Đảo mã đề hoán vị (101, 102...)'}</strong> · ${savedExams.length} Đề thi riêng biệt
                </p>
                <div style="font-size:0.875rem;font-weight:700;color:var(--emerald-shadow);">
                  ☁️ Tất cả ${savedExams.length} đề đã được lưu vào hệ thống và sẵn sàng thi hoặc in ấn.
                </div>
              </div>
              <div style="text-align:right;">
                <span class="code-badge" style="font-size:1.3rem;padding:0.35rem 0.85rem;">${savedExams.length} ĐỀ</span>
                <div style="font-size:0.75rem;color:var(--text-secondary);margin-top:2px;">BỘ ĐỀ TỰ ĐỘNG</div>
              </div>
            </div>

            <div style="display:flex;gap:0.6rem;flex-wrap:wrap;margin-top:1rem;">
              <button type="button" class="btn btn-primary" onclick="showBatchGenResultsModal()">📋 Xem Chi Tiết Bảng ${savedExams.length} Đề & Mã Thi</button>
              <button type="button" class="btn btn-secondary" onclick="copyAllBatchQuizCodes()">📋 Sao Chép Toàn Bộ Mã Đề</button>
              <button type="button" class="btn btn-sky" onclick="loadSampleToStudent('${savedExams[0].quizId}')">🚀 Thi Thử Đề 1 [${savedExams[0].quizId}]</button>
            </div>
          </div>
        `;
      }

      // Mở modal hiển thị danh sách tất cả các đề
      showBatchGenResultsModal(savedExams, deduplicatePolicy);

      if (typeof SoundEngine !== 'undefined' && SoundEngine.playFanfare) SoundEngine.playFanfare();
      if (typeof GamificationEngine !== 'undefined' && GamificationEngine.fireConfetti) GamificationEngine.fireConfetti();
      showToast(`⚡ Đã tự động sinh và lưu thành công bộ ${savedExams.length} đề thi ${subjectDisplayName}!`, 'success');
      return;
    }

    // ================= TRƯỜNG HỢP 2: TẠO 1 ĐỀ THI ĐƠN LẺ TIÊU CHUẨN =================
    // Capacity preflight check for normal Math (Requirements 12 & 13)
    if (!isKhtn && typeof MathEngine !== 'undefined' && typeof MathEngine.getGenerationCapacity === 'function') {
      const capacity = MathEngine.getGenerationCapacity({
        track,
        grade,
        term,
        topic,
        sourceMode,
        difficultyMode,
        mcqCount,
        essayMatrix: { TH: countTH, VD: countVD, VDC: countVDC }
      });

      if (capacity && capacity.feasible === false) {
        const hardBlocker = (capacity.blockers || []).find(b =>
          b.code === 'VDC_APPROVED_SOURCE_SHORTAGE' ||
          (sourceMode === 'document' && b.code === 'DOCUMENT_POOL_SHORTAGE')
        );
        if (hardBlocker) {
          const msg = hardBlocker.message || `[${hardBlocker.code}] Yêu cầu ${hardBlocker.requested}, khả dụng ${hardBlocker.available}`;
          showToast(`❌ Không thể sinh đề: ${msg}`, 'error');
          const alertEl = document.getElementById('mathGenSourceAlert');
          if (alertEl) {
            alertEl.classList.remove('hidden');
            alertEl.style.display = 'block';
            alertEl.innerHTML = `❌ <strong>Không đủ điều kiện tạo đề:</strong> ${escapeHtml(msg)}<br><small style="color:var(--text-secondary);">Vui lòng kiểm tra lại cấu hình số câu hoặc chuyển sang chế độ phù hợp.</small>`;
          }
          return;
        }
      }
    }

    const generated = activeEngine.generateExam({
      track,
      grade,
      term,
      topic,
      sourceMode,
      difficultyMode,
      discipline,
      mcqCount,
      essayMatrix: { TH: countTH, VD: countVD, VDC: countVDC },
      timeLimit: timeLimitVal
    });
    function formatGenerationShortage(s) {
      const label = s.part || s.type || s.code || 'Nguồn câu hỏi';
      const actual = s.available ?? s.generated ?? 0;
      return `[${s.code || 'SHORTAGE'}] ${label}: yêu cầu ${s.requested}, hiện có ${actual}`;
    }

    let isIncomplete = false;
    let detailMsg = '';

    if (isKhtn) {
      // KHTN completeness verification (Requirements 2, 3, 4)
      const actualMcq = generated?.mcqCount ?? 0;
      const essayKeys = (generated?.answerKeys || []).filter(k => k.type === 'essay');
      const actualTH = essayKeys.filter(k => k.level === 'TH').length;
      const actualVD = essayKeys.filter(k => k.level === 'VD').length;
      const actualVDC = essayKeys.filter(k => k.level === 'VDC').length;
      const expectedTotalEssay = countTH + countVD + countVDC;
      const actualTotalEssay = generated?.essayCount ?? essayKeys.length;

      if (!generated || actualMcq !== mcqCount || actualTotalEssay !== expectedTotalEssay) {
        isIncomplete = true;
        detailMsg = `Không thể tạo đủ đề KHTN: Trắc nghiệm ${actualMcq}/${mcqCount}, TH ${actualTH}/${countTH}, VD ${actualVD}/${countVD}, VDC ${actualVDC}/${countVDC}.`;
      }
    } else {
      // Normal ToanMath completeness verification (Requirements 1, 10, 14)
      const diagGenerated = generated?.generationDiagnostics?.generated || {};
      const actualMcq = generated?.mcqCount ?? 0;
      const actualTH = Number(diagGenerated.TH ?? 0);
      const actualVD = Number(diagGenerated.VD ?? 0);
      const actualVDC = Number(diagGenerated.VDC ?? 0);

      isIncomplete = !generated || !generated.isComplete ||
        actualMcq !== mcqCount ||
        actualTH !== countTH ||
        actualVD !== countVD ||
        actualVDC !== countVDC;

      if (isIncomplete) {
        const shortages = (generated && generated.generationDiagnostics && generated.generationDiagnostics.shortages) || [];
        if (shortages.length > 0) {
          detailMsg = shortages.map(s => formatGenerationShortage(s)).join('; ');
        } else {
          detailMsg = `Trắc nghiệm: ${actualMcq}/${mcqCount}, TH: ${actualTH}/${countTH}, VD: ${actualVD}/${countVD}, VDC: ${actualVDC}/${countVDC}`;
        }
      }
    }

    if (isIncomplete) {
      showToast(`Không thể tạo và lưu đề do thiếu câu hỏi: ${detailMsg}`, 'error');
      const alertEl = document.getElementById('mathGenSourceAlert');
      if (alertEl) {
        alertEl.classList.remove('hidden');
        alertEl.style.display = 'block';
        alertEl.innerHTML = `❌ <strong>Không đủ câu hỏi để hoàn thành đề:</strong> ${escapeHtml(detailMsg)}<br><small style="color:var(--text-secondary);">Vui lòng điều chỉnh bộ lọc hoặc sử dụng chế độ Hybrid để bổ sung tự động.</small>`;
      }
      return;
    }

    const alertEl = document.getElementById('mathGenSourceAlert');
    if (generated && generated.warning) {
      showToast(`⚠️ ${generated.warning}`, 'warn');
      if (alertEl) {
        alertEl.classList.remove('hidden');
        alertEl.style.display = 'block';
        alertEl.innerHTML = `⚠️ <strong>Lưu ý nguồn câu hỏi:</strong> ${escapeHtml(generated.warning)}`;
      }
    } else if (alertEl) {
      alertEl.classList.add('hidden');
      alertEl.style.display = 'none';
      alertEl.innerHTML = '';
    }

    // 1. Populate Creator form
    const titleInput = document.getElementById('teacherExamTitleInput');
    const gradeSelect = document.getElementById('teacherExamGradeSelect');
    const termSelect = document.getElementById('teacherExamTermSelect');
    const timeLimitInput = document.getElementById('teacherExamTimeLimitInput');
    if (titleInput) titleInput.value = generated.title;
    if (gradeSelect) gradeSelect.value = grade;
    if (termSelect) termSelect.value = term;
    if (timeLimitInput) timeLimitInput.value = generated.timeLimit;
    syncExamTimeLimits(generated.timeLimit);

    const customKeyCb = document.getElementById('toggleCustomAnswerKeyCheckbox');
    if (customKeyCb) {
      customKeyCb.checked = true;
      toggleCustomAnswerKeySection();
    }

    // 2. Set MCQ & Essay keys with full explanation and didactic metadata
    AppState.teacherMcqKeys = (generated.answerKeys || []).filter(k => k.type === 'mcq').map(k => ({
      ...k
    }));

    AppState.teacherEssayKeys = (generated.answerKeys || []).filter(k => k.type === 'essay').map(k => ({
      ...k,
      testInput: ''
    }));

    // 3. Create preview HTML as standalone Data URL for PDF/iframe viewer
    const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(generated.examHtml || '');
    AppState.teacherPdfData = dataUrl;
    AppState.teacherFileName = `${(generated.title || `De_${isKhtn ? 'KHTN' : 'Toan'}`).replace(/\s+/g, '_')}.html`;

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
      nameBadge.innerHTML = `📄 <strong>Tài liệu đề ${subjectDisplayName} đã sinh:</strong> ${escapeHtml(generated.title || '')}`;
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
      examHtml: generated.examHtml,
      pdfFileName: AppState.teacherFileName,
      pdfDataUrl: dataUrl,
      assignType: 'all',
      assignedClasses: [],
      assignedStudents: [],
      showLeaderboard: true,
      antiCheat: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      answerKeys: generated.answerKeys,
      subject: isKhtn ? 'khtn' : 'toan',
      difficultyMode,
      specializedSourceOnly: generated.specializedSourceOnly === true,
      discipline,
      subjectLabel: isKhtn ? ({ vat_ly: 'Vật lý', hoa_hoc: 'Hóa học', sinh_hoc: 'Sinh học' }[discipline] || 'Khoa học Tự nhiên') : 'Toán học'
    };

    const saveRes = await persistTeacherQuiz(autoQuiz);

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
            <button type="button" class="btn btn-secondary" onclick="selectTeacherCreateSource('upload');document.getElementById('singleExamCreatorSection').scrollIntoView({behavior:'smooth'})">Kiểm tra và chỉnh sửa đề</button>
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

function showBatchGenResultsModal(savedExams = null, deduplicatePolicy = 'disjoint') {
  if (savedExams) {
    AppState.latestBatchGeneratedExams = savedExams;
  } else {
    savedExams = AppState.latestBatchGeneratedExams;
  }
  if (!savedExams || !savedExams.length) {
    showToast('Chưa có danh sách bộ đề vừa sinh.', 'info');
    return;
  }

  const modal = document.getElementById('batchGenResultsModal');
  const body = document.getElementById('batchGenModalBody');
  const summary = document.getElementById('batchGenModalSummary');
  if (!modal || !body) return;

  if (summary) {
    summary.innerHTML = `Tổng cộng: <strong>${savedExams.length} đề thi</strong> · ${deduplicatePolicy === 'disjoint' ? '🛡️ 100% Không trùng lặp câu hỏi' : '🔀 Hoán vị mã đề 101, 102...'}`;
  }

  let rowsHtml = `
    <table class="data-table" style="width:100%;font-size:0.9rem;border-collapse:collapse;">
      <thead>
        <tr style="background:var(--bg-tertiary);border-bottom:2px solid var(--border-color);">
          <th style="width:45px;text-align:center;padding:0.6rem;">STT</th>
          <th style="width:120px;text-align:center;padding:0.6rem;">Mã Đề</th>
          <th style="padding:0.6rem;">Tên Đề Thi</th>
          <th style="width:110px;text-align:center;padding:0.6rem;">Số Câu</th>
          <th style="width:120px;text-align:center;padding:0.6rem;">Chống Trùng</th>
          <th style="width:230px;text-align:center;padding:0.6rem;">Hành Động</th>
        </tr>
      </thead>
      <tbody>
  `;

  savedExams.forEach((item, idx) => {
    const qCount = `${item.exam.mcqCount || 0} TN + ${item.exam.essayCount || 0} TL`;
    const examCode = item.exam.examCode ? `<span class="badge-status badge-pass" style="font-size:0.75rem;">Mã ${item.exam.examCode}</span>` : '';
    rowsHtml += `
      <tr style="border-bottom:1px solid var(--border-color);">
        <td style="text-align:center;font-weight:700;padding:0.6rem;">${idx + 1}</td>
        <td style="text-align:center;padding:0.6rem;">
          <span class="code-badge" style="font-size:1.05rem;padding:0.2rem 0.6rem;cursor:pointer;" onclick="copySingleQuizCode('${item.quizId}')" title="Bấm để sao chép mã đề">
            ${item.quizId}
          </span>
          <div style="margin-top:2px;">${examCode}</div>
        </td>
        <td style="padding:0.6rem;">
          <div style="font-weight:700;color:var(--text-primary);">${escapeHtml(item.exam.title || item.quiz.title)}</div>
          <div style="font-size:0.78rem;color:var(--text-secondary);">Thời gian: ${item.exam.timeLimit || 45} phút</div>
        </td>
        <td style="text-align:center;font-weight:700;color:var(--indigo);padding:0.6rem;">
          ${qCount}
        </td>
        <td style="text-align:center;padding:0.6rem;">
          <span class="badge-status" style="background:#ecfdf5;color:#047857;font-size:0.75rem;font-weight:800;">
            ✓ Không trùng
          </span>
        </td>
        <td style="text-align:center;padding:0.6rem;">
          <div style="display:flex;gap:0.35rem;justify-content:center;flex-wrap:wrap;">
            <button type="button" class="btn btn-secondary" style="padding:0.3rem 0.55rem;font-size:0.78rem;" onclick="previewBatchSingleExam(${idx})" title="Mở bản in đề thi LaTeX sang tab mới">
              👁️ Bản In
            </button>
            <button type="button" class="btn btn-sky" style="padding:0.3rem 0.55rem;font-size:0.78rem;" onclick="copySingleQuizCode('${item.quizId}')" title="Sao chép mã đề">
              📋 Mã Đề
            </button>
            <button type="button" class="btn btn-primary" style="padding:0.3rem 0.55rem;font-size:0.78rem;" onclick="loadSampleToStudent('${item.quizId}'); closeBatchGenResultsModal();" title="Vào thi thử">
              🚀 Thi Thử
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  rowsHtml += `
      </tbody>
    </table>
  `;

  body.innerHTML = rowsHtml;
  modal.classList.remove('hidden');
}

function closeBatchGenResultsModal() {
  const modal = document.getElementById('batchGenResultsModal');
  if (modal) modal.classList.add('hidden');
}

function copyAllBatchQuizCodes() {
  const exams = AppState.latestBatchGeneratedExams || [];
  if (!exams.length) {
    showToast('Không có danh sách mã đề.', 'warn');
    return;
  }
  const text = exams.map((e, idx) => `Đề ${idx + 1} (${e.exam.title}): Mã ${e.quizId}`).join('\n');
  navigator.clipboard.writeText(text).then(() => {
    showToast(`📋 Đã sao chép toàn bộ ${exams.length} mã đề vào bộ nhớ tạm!`, 'success');
  }).catch(() => {
    showToast(`Mã đề:\n${exams.map(e => e.quizId).join(', ')}`, 'info');
  });
}

function copySingleQuizCode(code) {
  if (typeof copyQuizCode === 'function') {
    copyQuizCode(code);
  } else {
    navigator.clipboard.writeText(code).then(() => {
      showToast(`📋 Đã sao chép mã đề: ${code}`, 'success');
    });
  }
}

function previewBatchSingleExam(idx) {
  const exams = AppState.latestBatchGeneratedExams || [];
  if (!exams[idx] || !exams[idx].dataUrl) {
    showToast('Không tìm thấy bản in đề thi này.', 'warn');
    return;
  }
  window.open(exams[idx].dataUrl, '_blank');
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
    if (titleInput && (titleInput.value === 'Đề Kiểm Tra Giữa Kì I — Môn Toán' || titleInput.value === 'Đề Kiểm Tra — Môn Toán' || !titleInput.value.trim())) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_\\-]+/g, ' ');
      titleInput.value = cleanName;
    }

    // By default for uploaded exams, skip question setup / answer key
    const customKeyCb = document.getElementById('toggleCustomAnswerKeyCheckbox');
    if (customKeyCb) {
      customKeyCb.checked = false;
      toggleCustomAnswerKeySection();
    }
    updateTotalExamPointsCalculation();

    showToast(`📄 Đã tải file: ${file.name} (Chế độ tinh gọn: Học sinh chỉ xem đề & nộp bài)`, 'success');
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

  updateTotalExamPointsCalculation();
  showToast('🗑️ Đã gỡ bỏ file đề đính kèm.', 'info');
}

function toggleAiExtractionSettings() {
  const box = document.getElementById('aiExtractionSettingsBox');
  if (box) {
    box.classList.toggle('hidden');
  }
}

function closePdfExtractionModal() {
  const modal = document.getElementById('pdfExtractionConfirmModal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

function applyExtractedQuestionsToForm() {
  if (!window._pendingExtractedData) {
    closePdfExtractionModal();
    return;
  }

  const { mappedMcq, mappedEssay } = window._pendingExtractedData;
  AppState.teacherMcqKeys = mappedMcq || [];
  AppState.teacherEssayKeys = mappedEssay || [];

  // Mở phần cấu hình đáp án chi tiết nếu đang đóng
  const customKeyCb = document.getElementById('toggleCustomAnswerKeyCheckbox');
  if (customKeyCb && !customKeyCb.checked) {
    customKeyCb.checked = true;
    toggleCustomAnswerKeySection();
  }

  renderTeacherMcqGrid();
  renderTeacherEssayGrid();
  updateTotalExamPointsCalculation();
  closePdfExtractionModal();

  showToast('✅ Đã nạp thành công câu hỏi vào phiếu đáp án. Hãy rà soát lại trước khi bấm Lưu!', 'success');
  SoundEngine.playFanfare ? SoundEngine.playFanfare() : SoundEngine.playClick();
}

async function handleExtractPdfQuestions() {
  const fileInput = document.getElementById('teacherPdfFileInput');
  if (!fileInput || !fileInput.files || !fileInput.files[0]) {
    showToast('⚠️ Vui lòng chọn một file PDF trước khi trích xuất câu hỏi.', 'warn');
    return;
  }

  const file = fileInput.files[0];
  if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
    showToast('⚠️ Tính năng trích xuất nội dung tự động chỉ hỗ trợ file định dạng PDF.', 'warn');
    return;
  }

  const btn = document.getElementById('btnExtractPdfQuestions');
  const originalText = btn ? btn.innerHTML : '🔍 Trích Xuất Câu Hỏi Từ File Này';

  try {
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '⏳ Đang đọc nội dung PDF...';
    }
    showToast('⏳ Đang đọc text từ file PDF, vui lòng đợi trong giây lát...', 'info');

    if (typeof PdfExtractor === 'undefined') {
      throw new Error('Mô-đun PdfExtractor chưa được nạp.');
    }

    // 1. Trích xuất văn bản thô từ PDF
    const rawText = await PdfExtractor.extractTextFromPdf(file);

    // 2. Phát hiện trường hợp PDF ảnh scan (không có text layer)
    if (!rawText || rawText.trim().length < 20) {
      showToast('Không tìm thấy văn bản trong file (có thể là ảnh scan) — vui lòng nhập đáp án thủ công', 'warn');
      return;
    }

    if (btn) {
      btn.innerHTML = '🤖 Đang nhận diện câu hỏi...';
    }

    // 3. Phân tích câu hỏi (Mặc định offline không tốn API key)
    const provider = document.getElementById('pdfAiProviderSelect')?.value || 'offline';
    const apiKey = document.getElementById('pdfAiApiKeyInput')?.value?.trim() || '';

    const questions = await PdfExtractor.parseQuestions(rawText, apiKey, provider);

    if (!questions || !questions.length) {
      showToast('⚠️ Không tìm thấy câu hỏi hợp lệ trong tài liệu. Vui lòng nhập đáp án thủ công.', 'warn');
      return;
    }

    // 4. Phân loại câu hỏi và tính điểm chia đều 10 điểm
    const essayItems = questions.filter(q => q.type === 'essay');
    const mcqAndTfItems = questions.filter(q => q.type !== 'essay');

    const totalCount = questions.length;
    const mcqCount = questions.filter(q => q.type === 'mcq').length;
    const tfCount = questions.filter(q => q.type === 'truefalse').length;
    const essayCount = essayItems.length;

    const essayTotal = essayItems.length > 0 ? (mcqAndTfItems.length ? Math.min(3.0, essayItems.length * 1.0) : 10) : 0;
    const mcqTotal = 10.0 - essayTotal;
    const mcqScore = mcqAndTfItems.length > 0 ? Math.round((mcqTotal / mcqAndTfItems.length) * 100) / 100 : 0;
    const essayScore = essayItems.length > 0 ? Math.round((essayTotal / essayItems.length) * 100) / 100 : 0;

    let numCounter = 1;
    const mappedMcq = mcqAndTfItems.map(q => {
      let correct = q.correctAnswer;
      if (q.type === 'truefalse') {
        correct = correct ? (/sai|f/i.test(correct) ? 'Sai' : 'Đúng') : '';
      } else {
        correct = (correct && /^[A-D]$/i.test(correct.trim())) ? correct.trim().toUpperCase() : '';
      }
      return {
        num: numCounter++,
        type: q.type === 'truefalse' ? 'truefalse' : 'mcq',
        correct,
        score: mcqScore,
        content: q.question || '',
        options: q.options || [],
        explanation: q.explanation || ''
      };
    });

    const mappedEssay = essayItems.map(q => ({
      num: numCounter++,
      type: 'essay',
      correct: q.correctAnswer || '',
      score: essayScore,
      content: q.question || '',
      explanation: q.explanation || '',
      testInput: ''
    }));

    // Lưu kết quả tạm — TUYỆT ĐỐI CHƯA LƯU HOẶC PHÁT HÀNH ĐỀ
    window._pendingExtractedData = {
      mappedMcq,
      mappedEssay,
      totalCount,
      mcqCount,
      tfCount,
      essayCount
    };

    // 5. Hiển thị màn hình xem lại / xác nhận cho giáo viên
    const summaryContainer = document.getElementById('pdfExtractionSummaryContent');
    if (summaryContainer) {
      summaryContainer.innerHTML = `
        <div style="background:var(--bg-secondary);padding:1rem;border-radius:var(--radius-md);border:1px solid var(--border-color);margin-bottom:0.75rem;">
          <div style="font-size:1.1rem;font-weight:800;color:var(--indigo);margin-bottom:0.5rem;">
            📊 Đã nhận diện được: <strong>${totalCount} câu hỏi</strong>
          </div>
          <ul style="margin:0;padding-left:1.25rem;color:var(--text-primary);font-weight:600;font-size:0.9rem;">
            <li>📝 <strong>${mcqCount}</strong> câu trắc nghiệm (A, B, C, D) — ${mcqScore}đ/câu</li>
            <li>⚖️ <strong>${tfCount}</strong> câu Đúng / Sai — ${mcqScore}đ/câu</li>
            <li>✍️ <strong>${essayCount}</strong> câu tự luận / điền số — ${essayScore}đ/câu</li>
          </ul>
        </div>
        <p style="margin:0;color:var(--text-secondary);font-size:0.875rem;">
          Đã nhận diện ${totalCount} câu (${mcqCount} trắc nghiệm, ${tfCount} đúng/sai, ${essayCount} tự luận) — vui lòng kiểm tra lại đáp án trước khi lưu đề.
        </p>
      `;
    }

    const modal = document.getElementById('pdfExtractionConfirmModal');
    if (modal) {
      modal.classList.remove('hidden');
    }

    SoundEngine.playFanfare ? SoundEngine.playFanfare() : SoundEngine.playClick();
  } catch (err) {
    console.error('[handleExtractPdfQuestions error]', err);
    showToast(`❌ Lỗi trích xuất PDF: ${err.message || 'Không thể đọc nội dung file'}`, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  }
}

if (typeof window !== 'undefined') {
  window.handleExtractPdfQuestions = handleExtractPdfQuestions;
  window.toggleAiExtractionSettings = toggleAiExtractionSettings;
  window.closePdfExtractionModal = closePdfExtractionModal;
  window.applyExtractedQuestionsToForm = applyExtractedQuestionsToForm;
  window.extractKeyItemsFromText = extractKeyItemsFromText;
  window.parseMassiveKeyString = parseMassiveKeyString;
  window.renderTeacherMcqGrid = renderTeacherMcqGrid;
  window.renderTeacherEssayGrid = renderTeacherEssayGrid;
  window.publishTeacherQuiz = publishTeacherQuiz;
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
      examMode: 'split_pdf', // TODO: Chế độ đề tải lên có phiếu làm bài song song (split_pdf)
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

    await persistTeacherQuiz(quiz);
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
  if (window.selectTeacherCreateSource) window.selectTeacherCreateSource('upload');
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
  syncExamTimeLimits(quiz.timeLimit || 45);
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
  AppState.teacherMcqKeys = keys.filter(k => k.type === 'mcq' || k.type === 'truefalse').map(k => ({ ...k }));
  AppState.teacherEssayKeys = keys.filter(k => k.type === 'essay').map(k => ({ ...k }));

  renderTeacherMcqGrid();
  renderTeacherEssayGrid();

  const customKeyCb = document.getElementById('toggleCustomAnswerKeyCheckbox');
  if (customKeyCb) {
    customKeyCb.checked = keys.length > 0;
    toggleCustomAnswerKeySection();
  }

  updateTotalExamPointsCalculation();

  switchTeacherSubtab('create');
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
  if (headerIcon) headerIcon.textContent = '📁';
  if (headerTitle) headerTitle.textContent = 'Tải Lên File Đề Thi Gốc (PDF / Ảnh) — Tinh Gọn Siêu Tốc';

  // Reset form to defaults
  const titleInput = document.getElementById('teacherExamTitleInput');
  const gradeSelect = document.getElementById('teacherExamGradeSelect');
  const termSelect = document.getElementById('teacherExamTermSelect');
  const timeLimitInput = document.getElementById('teacherExamTimeLimitInput');
  const currentSubjectEl = document.getElementById('examSubjectSelect');
  const currentSubjectLabel = (typeof SUBJECT_LABELS !== 'undefined' && currentSubjectEl)
    ? (SUBJECT_LABELS[currentSubjectEl.value] || 'Toán học')
    : 'Toán học';
  if (titleInput) titleInput.value = `Đề Kiểm Tra — Môn ${currentSubjectLabel}`;
  if (gradeSelect) gradeSelect.value = '10';
  if (termSelect) termSelect.value = 'GK1';
  if (timeLimitInput) timeLimitInput.value = '45';

  const customKeyCb = document.getElementById('toggleCustomAnswerKeyCheckbox');
  if (customKeyCb) {
    customKeyCb.checked = false;
    toggleCustomAnswerKeySection();
  }

  clearTeacherPdf();
  initSeparatedTeacherGrids(10, 2);

  showToast('🔄 Đã thoát chế độ chỉnh sửa. Đang ở chế độ tạo đề mới.', 'info');
}

/* ================= QUIZ PUBLISHING & RESULTS ================= */
async function persistTeacherQuiz(quiz) {
  const result = await StorageEngine.saveQuiz(quiz);
  if (!result || !result.success) {
    const message = result?.error || 'Không lưu được đề thi. Vui lòng thử lại.';
    showToast(message, 'error');
    throw new Error(message);
  }
  return result;
}

async function publishTeacherQuiz() {
  // LUÔN LẤY ĐỦ toàn bộ câu hỏi trắc nghiệm & tự luận nếu đã có trong AppState
  const combinedKeys = [...(AppState.teacherMcqKeys || []), ...(AppState.teacherEssayKeys || [])];
  if (combinedKeys.some(k => !String(k.correct ?? '').trim() || !Number.isFinite(Number(k.score)) || Number(k.score) < 0)) {
    showToast('Vui lòng kiểm tra đáp án và điểm của từng câu trước khi phát hành.', 'warn');
    return;
  }

  // Đối với đề tải lên (PDF / Ảnh), chỉ báo lỗi nếu hoàn toàn không có file và không có câu hỏi nào
  if (!AppState.teacherPdfData && !combinedKeys.length) {
    showToast('⚠️ Vui lòng tải lên file đề thi (PDF/Ảnh) hoặc thiết lập câu hỏi trắc nghiệm / tự luận.', 'warn');
    return;
  }

  const isEditing = !!AppState.editingQuizId;
  const id = isEditing ? AppState.editingQuizId : generateQuizCode();
  const previousQuiz = isEditing ? await StorageEngine.getQuiz(id) : null;
  const title = document.getElementById('teacherExamTitleInput').value.trim() || (AppState.teacherFileName ? AppState.teacherFileName.replace(/\.[^/.]+$/, '').replace(/[_\-]+/g, ' ') : 'Đề Kiểm Tra');
  const examSubjectVal = document.getElementById('examSubjectSelect')?.value || 'toan';
  const examSubjectLabel = (typeof SUBJECT_LABELS !== 'undefined' ? SUBJECT_LABELS[examSubjectVal] : null) || 'Toán học';
  const gradeSelect = document.getElementById('teacherExamGradeSelect');
  const targetClass = gradeSelect ? gradeSelect.value : (detectGradeFromTitle(title) || '10');
  const examTerm = document.getElementById('teacherExamTermSelect')?.value || detectTermFromTitle(title);
  
  // Đồng bộ thời gian làm bài từ ô nhập
  const timeLimit = Math.max(1, parseInt(
    document.getElementById('teacherExamTimeLimitInput')?.value || 
    document.getElementById('mathGenTimeLimitInput')?.value || 
    '45', 10
  ));
  syncExamTimeLimits(timeLimit);

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
      const separator = AppState.teacherPdfData.indexOf(',');
      const parts = [AppState.teacherPdfData.slice(0, separator), AppState.teacherPdfData.slice(separator + 1)];
      if (parts.length > 1) {
        examHtml = parts[0].includes(';base64') ? new TextDecoder().decode(Uint8Array.from(atob(parts[1]), c => c.charCodeAt(0))) : decodeURIComponent(parts[1]);
        // Tự động đồng bộ số phút trong bài thi examHtml theo timeLimit mới
        examHtml = examHtml
          .replace(/Thời gian làm bài:\s*<strong>\d+\s*phút<\/strong>/gi, `Thời gian làm bài: <strong>${timeLimit} phút</strong>`)
          .replace(/Thời gian làm bài:\s*\d+\s*phút/gi, `Thời gian làm bài: ${timeLimit} phút`);
        AppState.teacherPdfData = 'data:text/html;charset=utf-8,' + encodeURIComponent(examHtml);
      }
    } catch (e) {}
  }

  const isDocumentOnly = !combinedKeys.length && !!AppState.teacherPdfData;
  const isDocumentViewMode = isDocumentOnly;

  const quiz = {
    id,
    title,
    targetClass,
    examTerm,
    timeLimit,
    totalQuestions: isDocumentOnly ? 0 : combinedKeys.length,
    mcqCount: isDocumentOnly ? 0 : (AppState.teacherMcqKeys || []).length,
    essayCount: isDocumentOnly ? 0 : (AppState.teacherEssayKeys || []).length,
    examMode: isDocumentOnly ? 'document_view' : 'split_pdf',
    examHtml,
    pdfFileName: AppState.teacherFileName || 'De_Thi_Goc.pdf',
    pdfDataUrl: AppState.teacherPdfData || null,
    assignType,
    assignedClasses,
    assignedStudents,
    showLeaderboard,
    antiCheat,
    createdAt: isEditing ? (AppState.editingQuizCreatedAt || new Date().toISOString()) : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    answerKeys: combinedKeys,
    subject: examSubjectVal,
    subjectLabel: previousQuiz?.subject === examSubjectVal ? previousQuiz.subjectLabel : examSubjectLabel,
    difficultyMode: classifyExamDifficulty({ answerKeys: combinedKeys, difficultyMode: previousQuiz?.difficultyMode, specializedSourceOnly: previousQuiz?.specializedSourceOnly }),
    specializedSourceOnly: previousQuiz?.specializedSourceOnly === true,
    discipline: previousQuiz?.discipline || (examSubjectVal === 'khtn' ? 'all' : 'toan')
  };

  const customKeyCb = document.getElementById('toggleCustomAnswerKeyCheckbox');
  if (customKeyCb && combinedKeys.length > 0) {
    customKeyCb.checked = true;
    toggleCustomAnswerKeySection();
  }

  const saveRes = await persistTeacherQuiz(quiz);

  if (typeof SoundEngine !== 'undefined' && SoundEngine.playFanfare) SoundEngine.playFanfare();
  if (typeof GamificationEngine !== 'undefined' && GamificationEngine.fireConfetti) GamificationEngine.fireConfetti();

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

  const modeDesc = isDocumentViewMode 
    ? '📄 Chế độ đề gốc tinh gọn (Học sinh xem đề toàn màn hình & nộp bài)' 
    : `Phiếu chấm: ${AppState.teacherMcqKeys.length} câu trắc nghiệm + ${AppState.teacherEssayKeys.length} câu tự luận`;

  const resDiv = document.getElementById('publishSuccessResult');
  if (resDiv) {
    resDiv.innerHTML = `
      <div class="card" style="background:var(--primary-light);border-color:var(--primary);margin-top:1rem;">
        <h3 style="color:var(--primary-shadow);margin-bottom:0.4rem;">${isEditing ? '💾 Đã Lưu & Cập Nhật Thay Đổi Thành Công!' : '🎉 Đã Phát Hành Đề Thi Thành Công!'}</h3>
        <p style="color:var(--primary-shadow);font-size:0.95rem;font-weight:700;">${modeDesc}. Phạm vi: <strong>${targetDesc}</strong></p>
        <div style="margin:1rem 0;display:flex;align-items:center;gap:1rem;flex-wrap:wrap;">
          <span class="code-badge" style="font-size:1.8rem;padding:0.6rem 1.4rem;">${id}</span>
          <button class="btn btn-secondary" onclick="loadSampleToStudent('${id}')">🚀 Vào Thi Thử Ngay</button>
          <button class="btn btn-primary" onclick="cancelTeacherQuizEdit()">➕ Tạo Đề Thi Khác</button>
        </div>
      </div>
    `;
    if (typeof resDiv.scrollIntoView === 'function') {
      resDiv.scrollIntoView({ behavior: 'smooth' });
    }
  }

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
  if (headerIcon) headerIcon.textContent = '📁';
  if (headerTitle) headerTitle.textContent = 'Tải Lên File Đề Thi Gốc (PDF / Ảnh) — Tinh Gọn Siêu Tốc';
}

function generateQuizCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

/* ================= QUIZ & RESULTS MANAGER ================= */
function setTeacherQuizStatusFilter(status) {
  AppState.teacherQuizStatusFilter = status;
  renderTeacherQuizManager();
  if (typeof SoundEngine !== 'undefined' && SoundEngine.playClick) SoundEngine.playClick();
}

function handleTeacherQuizSearch(query) {
  AppState.teacherQuizSearchQuery = query;
  renderTeacherQuizManager();
}

function clearTeacherQuizSearch() {
  AppState.teacherQuizSearchQuery = '';
  renderTeacherQuizManager();
}

async function renderTeacherQuizManager() {
  const wrap = document.getElementById('teacherQuizManagerWrap');
  if (!wrap) return;

  await autoRepairCorruptedQuizzes();

  const [quizzes, allResults] = await Promise.all([
    StorageEngine.getAllQuizzes(),
    StorageEngine.getAllResults()
  ]);

  if (!quizzes.length) {
    wrap.innerHTML = `
      <div style="text-align:center;padding:2rem;color:var(--text-muted);">
        <p style="font-size:1.1rem;font-weight:700;">Chưa có đề thi nào trong hệ thống.</p>
        <button class="btn btn-primary btn-sm" style="margin-top:0.75rem;" onclick="resetSampleQuiz()">🔄 Nạp lại đề thi mẫu chuẩn</button>
      </div>
    `;
    return;
  }

  // 1. Group results by quizId (case-insensitive)
  const resultsByQuiz = {};
  allResults.forEach(r => {
    if (!r || !r.quizId) return;
    const qKey = r.quizId.toString().trim().toUpperCase();
    if (!resultsByQuiz[qKey]) resultsByQuiz[qKey] = [];
    resultsByQuiz[qKey].push(r);
  });

  // 2. Metrics calculation
  const totalQuizzes = quizzes.length;
  const takenQuizzes = quizzes.filter(q => {
    const qKey = (q.id || '').toString().trim().toUpperCase();
    return (resultsByQuiz[qKey] || []).length > 0;
  });
  const untakenQuizzes = quizzes.filter(q => {
    const qKey = (q.id || '').toString().trim().toUpperCase();
    return (resultsByQuiz[qKey] || []).length === 0;
  });

  const takenCount = takenQuizzes.length;
  const untakenCount = untakenQuizzes.length;
  const takenPct = totalQuizzes ? Math.round((takenCount / totalQuizzes) * 100) : 0;
  const totalSubmissions = allResults.filter(r => r.quizId).length;

  // 3. Filter quizzes by status
  let displayedQuizzes = quizzes;
  if (AppState.teacherQuizStatusFilter === 'taken') {
    displayedQuizzes = takenQuizzes;
  } else if (AppState.teacherQuizStatusFilter === 'untaken') {
    displayedQuizzes = untakenQuizzes;
  }

  // 4. Filter by search query
  if (AppState.teacherQuizSearchQuery) {
    const qTerm = AppState.teacherQuizSearchQuery.trim().toLowerCase();
    displayedQuizzes = displayedQuizzes.filter(q => 
      (q.title || '').toLowerCase().includes(qTerm) || 
      (q.id || '').toLowerCase().includes(qTerm)
    );
  }

  // Render full component
  wrap.innerHTML = `
    <!-- Top 4 Summary Stats Cards -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(210px, 1fr));gap:0.75rem;margin-bottom:1.25rem;">
      <!-- Card 1: Total Quizzes -->
      <div class="card" style="padding:1rem;background:var(--bg-card);border:2px solid var(--border-color);border-radius:var(--radius-lg);margin-bottom:0;cursor:pointer;" onclick="setTeacherQuizStatusFilter('all')" title="Xem tất cả đề thi">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:0.8rem;font-weight:800;color:var(--text-secondary);text-transform:uppercase;">📚 Tổng Số Đề Thi</span>
          <span style="font-size:1.2rem;">📂</span>
        </div>
        <div style="font-size:1.75rem;font-weight:900;color:var(--text-primary);margin:0.25rem 0;">${totalQuizzes} <span style="font-size:0.85rem;font-weight:700;color:var(--text-muted);">đề</span></div>
        <div style="font-size:0.78rem;color:var(--text-muted);">Kho đề toàn hệ thống</div>
      </div>

      <!-- Card 2: Taken Quizzes -->
      <div class="card" style="padding:1rem;background:${AppState.teacherQuizStatusFilter === 'taken' ? 'rgba(16,185,129,0.1)' : 'var(--bg-card)'};border:2px solid ${AppState.teacherQuizStatusFilter === 'taken' ? 'var(--primary)' : 'rgba(16,185,129,0.35)'};border-radius:var(--radius-lg);margin-bottom:0;cursor:pointer;transition:all 0.2s ease;" onclick="setTeacherQuizStatusFilter('taken')" title="Lọc xem các đề đã có học sinh làm">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:0.8rem;font-weight:800;color:var(--primary);text-transform:uppercase;">🟢 Đã Có Học Sinh Làm</span>
          <span style="font-size:1.2rem;">📝</span>
        </div>
        <div style="font-size:1.75rem;font-weight:900;color:var(--primary);margin:0.25rem 0;">${takenCount} <span style="font-size:0.85rem;font-weight:700;">(${takenPct}%)</span></div>
        <div style="font-size:0.78rem;color:var(--text-secondary);">Bấm để chỉ xem đề đã nộp</div>
      </div>

      <!-- Card 3: Untaken Quizzes -->
      <div class="card" style="padding:1rem;background:${AppState.teacherQuizStatusFilter === 'untaken' ? 'rgba(245,158,11,0.1)' : 'var(--bg-card)'};border:2px solid ${AppState.teacherQuizStatusFilter === 'untaken' ? 'var(--amber)' : 'rgba(245,158,11,0.35)'};border-radius:var(--radius-lg);margin-bottom:0;cursor:pointer;transition:all 0.2s ease;" onclick="setTeacherQuizStatusFilter('untaken')" title="Lọc xem các đề chưa có ai làm">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:0.8rem;font-weight:800;color:var(--amber-shadow);text-transform:uppercase;">⚪ Chưa Có Học Sinh Làm</span>
          <span style="font-size:1.2rem;">⏳</span>
        </div>
        <div style="font-size:1.75rem;font-weight:900;color:var(--amber-shadow);margin:0.25rem 0;">${untakenCount} <span style="font-size:0.85rem;font-weight:700;">(${100 - takenPct}%)</span></div>
        <div style="font-size:0.78rem;color:var(--text-secondary);">Đề mới / Chưa giao cho ai</div>
      </div>

      <!-- Card 4: Total Submissions -->
      <div class="card" style="padding:1rem;background:var(--bg-card);border:2px solid rgba(14,165,233,0.35);border-radius:var(--radius-lg);margin-bottom:0;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:0.8rem;font-weight:800;color:var(--sky-shadow);text-transform:uppercase;">📊 Tổng Lượt Nộp Bài</span>
          <span style="font-size:1.2rem;">🎓</span>
        </div>
        <div style="font-size:1.75rem;font-weight:900;color:var(--sky-shadow);margin:0.25rem 0;">${totalSubmissions} <span style="font-size:0.85rem;font-weight:700;">bài</span></div>
        <div style="font-size:0.78rem;color:var(--text-muted);">Lượt làm từ tất cả học sinh</div>
      </div>
    </div>

    <!-- Coverage Progress Indicator -->
    <div style="background:var(--bg-tertiary);padding:0.75rem 1.1rem;border-radius:var(--radius-md);border:1.5px solid var(--border-color);margin-bottom:1.25rem;">
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.82rem;font-weight:800;margin-bottom:0.4rem;flex-wrap:wrap;gap:0.4rem;">
        <span style="color:var(--text-primary);">🎯 Độ Phủ Bài Thi Của Học Sinh: <strong>${takenCount}/${totalQuizzes} đề đã được làm (${takenPct}%)</strong></span>
        <span style="color:var(--text-muted);font-weight:700;">${untakenCount} đề đang chờ học sinh thử sức</span>
      </div>
      <div style="height:10px;background:var(--bg-card);border-radius:999px;overflow:hidden;border:1px solid var(--border-color);display:flex;">
        <div style="width:${takenPct}%;height:100%;background:linear-gradient(90deg, #10b981, #059669);transition:width 0.4s ease;" title="Đã có bài nộp: ${takenPct}%"></div>
        <div style="width:${100 - takenPct}%;height:100%;background:rgba(203,213,225,0.4);" title="Chưa có bài nộp: ${100 - takenPct}%"></div>
      </div>
    </div>

    <!-- Filter Buttons & Search Bar Toolbar -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:0.75rem;">
      <div style="display:flex;gap:0.4rem;align-items:center;flex-wrap:wrap;">
        <span style="font-weight:800;color:var(--text-secondary);font-size:0.85rem;">🔍 Bộ Lọc:</span>
        <button type="button" class="btn btn-sm ${AppState.teacherQuizStatusFilter === 'all' ? 'btn-primary' : 'btn-secondary'}" onclick="setTeacherQuizStatusFilter('all')">
          🌐 Tất Cả (${totalQuizzes})
        </button>
        <button type="button" class="btn btn-sm" style="${AppState.teacherQuizStatusFilter === 'taken' ? 'background:var(--primary);color:#fff;border-color:var(--primary);' : 'background:var(--bg-card);color:var(--primary);border:2px solid var(--primary);'};font-weight:800;" onclick="setTeacherQuizStatusFilter('taken')">
          🟢 Đã Có HS Làm (${takenCount})
        </button>
        <button type="button" class="btn btn-sm" style="${AppState.teacherQuizStatusFilter === 'untaken' ? 'background:var(--amber);color:#fff;border-color:var(--amber);' : 'background:var(--bg-card);color:var(--amber-shadow);border:2px solid var(--amber);'};font-weight:800;" onclick="setTeacherQuizStatusFilter('untaken')">
          ⚪ Chưa Có Ai Làm (${untakenCount})
        </button>
      </div>

      <div style="display:flex;gap:0.5rem;flex-wrap:wrap;align-items:center;">
        <div style="position:relative;">
          <input type="text" id="teacherQuizSearchInput" placeholder="🔍 Tìm tên hoặc mã đề..." value="${escapeHtml(AppState.teacherQuizSearchQuery || '')}" oninput="handleTeacherQuizSearch(this.value)" style="padding:0.4rem 2rem 0.4rem 0.75rem;border:2px solid var(--border-color);border-radius:var(--radius-md);font-weight:600;font-size:0.85rem;min-width:210px;">
          ${AppState.teacherQuizSearchQuery ? `<span onclick="clearTeacherQuizSearch()" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);cursor:pointer;font-weight:900;color:var(--text-muted);" title="Xóa tìm kiếm">✕</span>` : ''}
        </div>
        <button class="btn btn-primary btn-sm" onclick="bulkSetAllQuizzesPublic()">🌍 Công Khai Tất Cả</button>
        <button class="btn btn-danger btn-sm" onclick="deleteAllSampleQuizzes()">🗑️ Xóa Đề Mẫu</button>
      </div>
    </div>

    <!-- Quizzes Table -->
    ${displayedQuizzes.length === 0 ? `
      <div style="text-align:center;padding:2.5rem 1rem;background:var(--bg-card);border:2px dashed var(--border-color);border-radius:var(--radius-lg);margin-top:0.5rem;">
        <div style="font-size:2.2rem;margin-bottom:0.5rem;">🔍 📭</div>
        <div style="font-weight:800;font-size:1.05rem;color:var(--text-primary);margin-bottom:0.3rem;">Không tìm thấy đề thi phù hợp!</div>
        <p style="font-size:0.85rem;color:var(--text-secondary);max-width:400px;margin:0 auto 1rem;">
          Không có đề nào khớp với bộ lọc "<strong>${AppState.teacherQuizStatusFilter === 'taken' ? 'Đã có học sinh làm' : AppState.teacherQuizStatusFilter === 'untaken' ? 'Chưa có ai làm' : 'Tất cả'}</strong>" ${AppState.teacherQuizSearchQuery ? `và từ khóa "<strong>${escapeHtml(AppState.teacherQuizSearchQuery)}</strong>"` : ''}.
        </p>
        <button class="btn btn-secondary btn-sm" onclick="setTeacherQuizStatusFilter('all'); clearTeacherQuizSearch();">🔄 Bỏ lọc để xem toàn bộ (${totalQuizzes} đề)</button>
      </div>
    ` : `
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th style="min-width:180px;">Tên Đề Thi & Mã Đề</th>
              <th style="min-width:160px;">Tình Trạng Nộp Bài</th>
              <th>Đối Tượng Giao</th>
              <th>Cấu Trúc Đề</th>
              <th>Thời Gian</th>
              <th style="min-width:210px;">Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            ${displayedQuizzes.map(q => {
              const qKey = (q.id || '').toString().trim().toUpperCase();
              const subs = resultsByQuiz[qKey] || [];
              const hasSubs = subs.length > 0;

              let targetLabel = '<span class="badge-status badge-pass">Công khai</span>';
              if (q.assignType === 'classes') {
                targetLabel = `<span class="badge-status" style="background:var(--sky-light);color:var(--sky-shadow);">Lớp: ${(q.assignedClasses||[]).join(', ')}</span>`;
              } else if (q.assignType === 'students') {
                targetLabel = `<span class="badge-status" style="background:var(--amber-light);color:var(--amber-shadow);">Đích danh ${(q.assignedStudents||[]).length} HS</span>`;
              }

              const mcqCount = q.mcqCount || (q.answerKeys ? q.answerKeys.filter(k => k.type === 'mcq').length : 0);
              const essayCount = q.essayCount || (q.answerKeys ? q.answerKeys.filter(k => k.type === 'essay').length : 0);
              const termBadge = getExamTermBadge(q.examTerm || detectTermFromTitle(q.title));

              // Format submission status column
              let statusColumnHtml = '';
              if (hasSubs) {
                const avgScore = (subs.reduce((acc, r) => acc + (r.totalScore || 0), 0) / subs.length).toFixed(1);
                const maxScore = Math.max(...subs.map(r => r.totalScore || 0));
                const totalCheats = subs.reduce((acc, r) => acc + (r.tabSwitches || 0), 0);

                // Extract unique students with highest score & avatar
                const takerMap = new Map();
                subs.forEach(r => {
                  const n = (r.name || 'Học sinh').trim();
                  if (!n) return;
                  const sc = typeof r.totalScore === 'number' ? r.totalScore : 0;
                  let av = r.avatar;
                  if (!av || av === '👤') {
                    const rSt = (AppState.studentRoster || []).find(st => st.name.toLowerCase() === n.toLowerCase());
                    av = (rSt && rSt.avatar) ? rSt.avatar : '🦊';
                  }
                  const ex = takerMap.get(n.toLowerCase());
                  if (!ex || sc > ex.score) {
                    takerMap.set(n.toLowerCase(), { name: n, className: r.className || '', avatar: av, score: sc });
                  }
                });
                const takersList = Array.from(takerMap.values()).sort((a, b) => b.score - a.score);

                statusColumnHtml = `
                  <div>
                    <span class="badge-status badge-pass" style="font-size:0.8rem;cursor:pointer;display:inline-flex;align-items:center;gap:0.3rem;" onclick="quickViewResults('${q.id}')" title="Bấm để mở bảng điểm">
                      <span>🟢</span> <strong>${subs.length} bài nộp</strong>
                    </span>
                    <div style="font-size:0.75rem;color:var(--text-secondary);margin-top:4px;line-height:1.4;">
                      <span>Điểm TB: <strong style="color:var(--primary);">${avgScore}đ</strong></span> · <span>Cao nhất: <strong style="color:var(--indigo);">${maxScore}đ</strong></span>
                      ${totalCheats > 0 ? `<br><span style="color:var(--rose);font-weight:700;">⚠️ ${totalCheats} lần rời tab thi</span>` : ''}
                    </div>
                    <!-- Danh sách học sinh đã làm: Avatar + Tên + Điểm -->
                    <div style="display:flex;gap:0.3rem;flex-wrap:wrap;margin-top:0.35rem;">
                      ${takersList.slice(0, 3).map(st => `
                        <span class="badge-status" style="font-size:0.72rem;background:var(--sky-light);color:var(--sky-shadow);padding:1px 6px;border-radius:var(--radius-full);display:inline-flex;align-items:center;gap:3px;" title="${escapeHtml(st.name)} (Lớp ${escapeHtml(st.className)}) · ${st.score}đ">
                          <span>${st.avatar}</span> <strong>${escapeHtml(st.name)}</strong> <span style="opacity:0.85;">(${st.score}đ)</span>
                        </span>
                      `).join('')}
                      ${takersList.length > 3 ? `<span style="font-size:0.7rem;color:var(--text-muted);font-weight:700;cursor:pointer;line-height:1.8;" onclick="quickViewResults('${q.id}')" title="Xem thêm">+${takersList.length - 3} HS khác...</span>` : ''}
                    </div>
                  </div>
                `;
              } else {
                statusColumnHtml = `
                  <div>
                    <span class="badge-status badge-neutral" style="font-size:0.8rem;">
                      <span>⚪</span> Chưa có học sinh làm
                    </span>
                    <div style="font-size:0.74rem;color:var(--text-muted);margin-top:3px;">
                      Đề mới / Chưa có lượt nộp
                    </div>
                  </div>
                `;
              }

              return `
                <tr style="${hasSubs ? '' : 'opacity:0.95;'}">
                  <td>
                    <div style="display:flex;align-items:center;gap:0.4rem;flex-wrap:wrap;">
                      <strong style="color:var(--text-primary);font-size:0.95rem;">${escapeHtml(q.title)}</strong>
                      ${termBadge}
                    </div>
                    <div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px;">
                      Mã đề: <code style="font-weight:800;color:var(--indigo);background:var(--bg-tertiary);padding:1px 5px;border-radius:4px;">${q.id}</code>
                    </div>
                  </td>
                  <td>${statusColumnHtml}</td>
                  <td>${targetLabel}</td>
                  <td>
                    <span class="badge-status badge-pass" style="font-size:0.75rem;">${mcqCount} Trắc nghiệm</span>
                    ${essayCount > 0 ? `<span class="badge-status" style="font-size:0.75rem;background:var(--amber-light);color:var(--amber-shadow);margin-left:4px;">${essayCount} Tự luận</span>` : ''}
                  </td>
                  <td>${q.timeLimit} phút</td>
                  <td>
                    <div style="display:flex;gap:0.35rem;align-items:center;flex-wrap:wrap;">
                      <button class="btn btn-primary btn-sm" onclick="editTeacherQuiz('${q.id}')" title="Chỉnh sửa đề thi này">✏️ Sửa</button>
                      <button class="btn btn-secondary btn-sm" onclick="loadSampleToStudent('${q.id}')" title="Vào làm thử">🚀 Thi Thử</button>
                      <button class="btn btn-sm ${hasSubs ? 'btn-sky' : 'btn-outline'}" onclick="quickViewResults('${q.id}')" title="${hasSubs ? `Xem bảng điểm (${subs.length} bài nộp)` : 'Chưa có bài nộp nào'}" style="${hasSubs ? 'font-weight:800;' : 'opacity:0.8;'}">
                        📊 Bảng Điểm ${hasSubs ? `(${subs.length})` : ''}
                      </button>
                      <button class="btn btn-danger btn-sm" onclick="confirmDeleteQuiz('${q.id}', '${escapeHtml(q.title)}')" title="Xóa hoàn toàn đề này">🗑️</button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `}
  `;
}

async function bulkSetAllQuizzesPublic() {
  const quizzes = await StorageEngine.getAllQuizzes();
  if (!quizzes.length) return;
  for (const q of quizzes) {
    q.assignType = 'all';
    await persistTeacherQuiz(q);
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
  
  const n = currentName.toLowerCase();
  const isKhiemName = n.includes('thầy khiêm') || n.includes('thay khiem') || n === 'khiêm' || n === 'khiem' || n.includes('thaykhiem');

  if (isKhiemName && !MasterTeacherAuth.isVerified()) {
    const detectedPill = document.getElementById('masterTeacherDetectedPill');
    if (detectedPill) {
      detectedPill.innerHTML = `
        <span>🔒 Bạn đang nhập tên Thầy Khiêm. Cần mật khẩu để mở khóa Role Master!</span>
        <button type="button" class="btn btn-sm btn-primary" onclick="openMasterTeacherAuthModal()" style="font-size:0.75rem;padding:0.25rem 0.65rem;border-radius:var(--radius-full);background:linear-gradient(135deg, #f59e0b, #8b5cf6);">Nhập Mật Khẩu 🔑</button>
      `;
      detectedPill.classList.remove('hidden');
    }
    const navBadge = document.getElementById('masterTeacherNavBadge');
    if (navBadge) navBadge.classList.add('hidden');
  } else {
    const isMaster = isMasterTeacherRole(currentName);
    updateMasterTeacherRoleUI(isMaster);
    if (isMaster) {
      TeacherAuth.login();
      const detectedPill = document.getElementById('masterTeacherDetectedPill');
      if (detectedPill) {
        detectedPill.innerHTML = `
          <span>👑 Đang hoạt động: <strong>Role Thầy Khiêm (Master Creator)</strong> — Đã mở khóa 100% đặc quyền & Khung Viền Hoàng Kim!</span>
          <div style="display:flex;gap:0.4rem;">
            <button type="button" class="btn btn-sm btn-secondary" onclick="switchTab('teacher')" style="font-size:0.75rem;padding:0.25rem 0.65rem;border-radius:var(--radius-full);">Vào Bàn Giáo Viên ➔</button>
            <button type="button" class="btn btn-sm" onclick="logoutMasterTeacherRole()" style="font-size:0.75rem;padding:0.25rem 0.6rem;border-radius:var(--radius-full);background:rgba(239,68,68,0.1);color:#ef4444;border:1px solid rgba(239,68,68,0.2);">🚪 Thoát Role</button>
          </div>
        `;
      }
    }
  }

  renderSampleQuizzes(currentName, currentClass);
  checkAndRenderPausedExamBanner();
  if (typeof StudentAnalytics !== 'undefined' && StudentAnalytics.renderStudentTopicFeedback) {
    StudentAnalytics.renderStudentTopicFeedback(currentName, currentClass, 'studentLobbyTopicFeedbackWrap');
  }
}

let isRepairRunning = false;
async function autoRepairCorruptedQuizzes() {
  if (isRepairRunning) return;
  isRepairRunning = true;
  try {
    const allQuizzes = await StorageEngine.getAllQuizzes();
    for (const q of allQuizzes) {
      if (!q || !q.title) continue;
      const needsRepair = (!q.totalQuestions || q.totalQuestions === 0 || !q.answerKeys || q.answerKeys.length === 0);
      if (!needsRepair) continue;

      // Nhận diện ma trận tự luận trong tên đề: ví dụ (3TH + 4VD + 3VDC)
      const matrixMatch = q.title.match(/(\d+)\s*TH\s*\+\s*(\d+)\s*VD\s*\+\s*(\d+)\s*VDC/i);
      if (matrixMatch) {
        const cTH = parseInt(matrixMatch[1], 10) || 0;
        const cVD = parseInt(matrixMatch[2], 10) || 0;
        const cVDC = parseInt(matrixMatch[3], 10) || 0;
        const gradeStr = q.targetClass || detectGradeFromTitle(q.title) || '10';
        const termStr = q.examTerm || detectTermFromTitle(q.title) || 'GK1';
        const tLimit = q.timeLimit || 45;

        if (typeof MathEngine !== 'undefined' && MathEngine.generateExam) {
          const regenerated = MathEngine.generateExam({
            grade: gradeStr,
            term: termStr,
            mcqCount: 0,
            essayMatrix: { TH: cTH, VD: cVD, VDC: cVDC },
            timeLimit: tLimit,
            title: q.title
          });

          if (regenerated && regenerated.answerKeys && regenerated.answerKeys.length > 0) {
            q.answerKeys = regenerated.answerKeys;
            q.totalQuestions = regenerated.totalQuestions;
            q.mcqCount = regenerated.mcqCount;
            q.essayCount = regenerated.essayCount;
            q.timeLimit = tLimit;
            q.examMode = 'split_pdf';
            if (!q.examHtml && regenerated.examHtml) {
              q.examHtml = regenerated.examHtml;
              q.pdfDataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(regenerated.examHtml);
            }
            await persistTeacherQuiz(q);
          }
        }
      }
    }
  } catch (err) {
    console.warn('autoRepairCorruptedQuizzes error:', err);
  } finally {
    isRepairRunning = false;
  }
}

function classifyExamDifficulty(quiz) {
  const keys = quiz.answerKeys || [];
  if (!keys.length) return quiz.difficultyMode || 'unclassified';
  const levels = keys.map(q => String(q.level || '').toUpperCase());
  if (levels.every(level => ['NB', 'TH'].includes(level))) return 'basic';
  if (levels.every(level => level === 'VDC') && quiz.difficultyMode === 'advanced' && quiz.specializedSourceOnly === true) return 'advanced';
  return levels.every(level => ['NB', 'TH', 'VD', 'VDC'].includes(level)) ? 'mixed' : 'unclassified';
}

async function renderSampleQuizzes(filterName = '', filterClass = '') {
  const wrap = document.getElementById('sampleQuizzesList');
  if (!wrap) return;

  await autoRepairCorruptedQuizzes();

  const [quizzes, allResults] = await Promise.all([
    StorageEngine.getAllQuizzes(),
    StorageEngine.getAllResults()
  ]);

  if (!quizzes.length) {
    wrap.innerHTML = `
      <div class="duo-empty-state">
        <div class="duo-empty-icon">🦉 🎒 ✨</div>
        <div class="duo-empty-title">Chưa có đề thi nào trong hệ thống!</div>
        <p class="duo-empty-text">Hãy vào bàn <strong>Giáo Viên & Quản Trị</strong> để tạo hoặc tải lên đề thi đầu tiên nhé! 🚀</p>
      </div>
    `;
    return;
  }

  let displayedQuizzes = quizzes;
  const difficulty = document.getElementById('studentExamDifficultyFilter')?.value || 'all';
  const subject = document.getElementById('studentExamSubjectFilter')?.value || 'all';
  displayedQuizzes = displayedQuizzes.filter(quiz => {
    if (difficulty !== 'all' && classifyExamDifficulty(quiz) !== difficulty) return false;
    const discipline = quiz.discipline === 'dgnl' || String(quiz.targetClass) === 'DGNL' ? 'dgnl'
      : quiz.subject === 'khtn' ? (quiz.discipline && quiz.discipline !== 'all' ? quiz.discipline : 'khtn') : (quiz.subject || 'toan');
    return subject === 'all' || discipline === subject;
  });

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
      <div class="duo-empty-state">
        <div class="duo-empty-icon">🦉 🎒 ✨</div>
        <div class="duo-empty-title">Chưa tìm thấy bài thi phù hợp!</div>
        <p class="duo-empty-text">Chưa có đề phù hợp với môn, mức độ, khối lớp và học kỳ đã chọn. Đề hỗn hợp hoặc chưa phân loại nằm trong mục “Tất cả, gồm đề hỗn hợp / chưa phân loại”.</p>
      </div>
    `;
    return;
  }

  const MILESTONE_ICONS = ['⭐', '📘', '⚡', '🎯', '🚀', '👑', '🏆', '💎', '🔥', '🔮'];
  const MILESTONE_POSITIONS = ['pos-center', 'pos-left', 'pos-center', 'pos-right'];

  wrap.innerHTML = `
    <div class="learning-path-container">
      ${displayedQuizzes.map((q, idx) => {
        const qKey = (q.id || '').toString().trim().toUpperCase();
        const qSubs = allResults.filter(r => (r.quizId || '').toString().trim().toUpperCase() === qKey);
        const activeStudentName = (filterName || AppState.studentName || document.getElementById('studentJoinName')?.value || '').trim().toLowerCase();
        const studentId = window.LocalStudentProfile?.getStudentId();
        const mySubs = studentId ? qSubs.filter(r => r.studentId === studentId || r.studentUid === studentId)
          : activeStudentName ? qSubs.filter(r => (r.name || '').trim().toLowerCase() === activeStudentName) : [];
        const hasCompleted = mySubs.length > 0;
        const myBestScore = hasCompleted ? Math.max(...mySubs.map(r => r.totalScore || 0)) : 0;

        let targetBadge = '<span class="badge-status badge-pass">🌍 Đề công khai</span>';
        if (q.assignType === 'classes') {
          targetBadge = `<span class="badge-status badge-sky">🏫 Lớp ${(q.assignedClasses||[]).join(', ')}</span>`;
        } else if (q.assignType === 'students') {
          targetBadge = `<span class="badge-status badge-amber">👤 Đích danh bạn</span>`;
        }

        const termBadge = getExamTermBadge(q.examTerm || detectTermFromTitle(q.title));
        const mcqCount = q.mcqCount || (q.answerKeys ? q.answerKeys.filter(k => k.type === 'mcq').length : 0);
        const essayCount = q.essayCount || (q.answerKeys ? q.answerKeys.filter(k => k.type === 'essay').length : 0);
        const icon = MILESTONE_ICONS[idx % MILESTONE_ICONS.length];
        const posClass = MILESTONE_POSITIONS[idx % MILESTONE_POSITIONS.length];

        let circleColorClass = hasCompleted ? 'circle-green' : 'circle-sky';
        if (q.assignType === 'students') circleColorClass = 'circle-amber';
        else if (idx % 4 === 3) circleColorClass = 'circle-purple';

        const isLast = idx === displayedQuizzes.length - 1;

        // Social proof or completion status line
        let completionBadgeHtml = '';
        let socialProofHtml = '';
        if (hasCompleted) {
          completionBadgeHtml = `<span class="badge-status badge-pass" style="font-size:0.75rem;font-weight:800;background:#dcfce7;color:#15803d;border:1.5px solid #86efac;">✅ ĐÃ LÀM (${myBestScore}/10đ)</span>`;
          socialProofHtml = `<span>👥 <strong>${qSubs.length}</strong> bạn đã nộp</span>`;
        } else if (qSubs.length > 0) {
          socialProofHtml = `<span>👥 <strong>${qSubs.length}</strong> bạn đã làm</span>`;
        } else {
          socialProofHtml = `<span style="color:var(--primary);font-weight:700;">✨ Đề mới — Hãy là người đầu tiên!</span>`;
        }

        // Extract unique students who completed this exam
        const studentTakerMap = new Map();
        qSubs.forEach(r => {
          const nameClean = (r.name || 'Học sinh').trim();
          if (!nameClean) return;
          const score = typeof r.totalScore === 'number' ? r.totalScore : 0;
          let avatar = r.avatar;
          if (!avatar || avatar === '👤') {
            const rosterSt = (AppState.studentRoster || []).find(st => st.name.toLowerCase() === nameClean.toLowerCase());
            avatar = (rosterSt && rosterSt.avatar) ? rosterSt.avatar : '🦊';
          }
          const existing = studentTakerMap.get(nameClean.toLowerCase());
          if (!existing || score > existing.score) {
            studentTakerMap.set(nameClean.toLowerCase(), {
              name: nameClean,
              className: r.className || '',
              avatar: avatar,
              score: score
            });
          }
        });
        const uniqueTakers = Array.from(studentTakerMap.values()).sort((a, b) => b.score - a.score);

        // Build HTML for student names & icons outside the card
        let studentTakersSectionHtml = '';
        if (uniqueTakers.length > 0) {
          studentTakersSectionHtml = `
            <div class="exam-card-students-section" style="margin-top:0.6rem;padding:0.45rem 0.65rem;background:var(--bg-tertiary);border:1.5px solid var(--border-color);border-radius:var(--radius-md);">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.35rem;font-size:0.75rem;font-weight:800;color:var(--text-secondary);">
                <span style="display:flex;align-items:center;gap:0.3rem;">
                  <span>👥</span> <span>Đã có <strong>${uniqueTakers.length} bạn</strong> làm bài:</span>
                </span>
                <span style="color:var(--indigo);font-size:0.72rem;cursor:pointer;font-weight:800;" onclick="quickViewResults('${q.id}')" title="Xem bảng xếp hạng đề này">Bảng điểm ➔</span>
              </div>
              <div style="display:flex;gap:0.35rem;flex-wrap:wrap;align-items:center;">
                ${uniqueTakers.slice(0, 4).map(st => `
                  <span class="student-taker-pill" title="${escapeHtml(st.name)} (Lớp ${escapeHtml(st.className)}) · Đạt: ${st.score}/10đ">
                    <span style="font-size:0.95rem;line-height:1;">${st.avatar}</span>
                    <span style="color:var(--text-primary);max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(st.name)}</span>
                    <span class="taker-score">${st.score}đ</span>
                  </span>
                `).join('')}
                ${uniqueTakers.length > 4 ? `
                  <span style="font-size:0.72rem;font-weight:800;color:var(--text-muted);cursor:pointer;background:var(--bg-card);border:1.5px solid var(--border-color);padding:0.2rem 0.5rem;border-radius:var(--radius-full);" onclick="quickViewResults('${q.id}')" title="Xem tất cả ${uniqueTakers.length} học sinh">
                    +${uniqueTakers.length - 4} bạn khác...
                  </span>
                ` : ''}
              </div>
            </div>
          `;
        } else {
          studentTakersSectionHtml = `
            <div class="exam-card-students-section" style="margin-top:0.6rem;padding:0.4rem 0.65rem;background:rgba(16,185,129,0.06);border:1.5px dashed rgba(16,185,129,0.35);border-radius:var(--radius-md);display:flex;align-items:center;gap:0.4rem;font-size:0.75rem;color:var(--primary);font-weight:700;">
              <span>✨</span> <span>Chưa có ai làm đề này — Hãy là người đầu tiên ghi danh!</span>
            </div>
          `;
        }

        // Định dạng mô tả số lượng câu hỏi thông minh, không bao giờ hiện "0 trắc nghiệm + 0 tự luận"
        let qCountDisplay = '';
        if (mcqCount > 0 && essayCount > 0) {
          qCountDisplay = `<span>📝 <strong>${mcqCount} trắc nghiệm</strong></span><span>•</span><span>✍️ <strong>${essayCount} tự luận</strong></span>`;
        } else if (essayCount > 0) {
          qCountDisplay = `<span>✍️ <strong>${essayCount} câu tự luận</strong></span>`;
        } else if (mcqCount > 0) {
          qCountDisplay = `<span>📝 <strong>${mcqCount} câu trắc nghiệm</strong></span>`;
        } else {
          qCountDisplay = `<span>📝 <strong>${q.totalQuestions || 0} câu hỏi</strong></span>`;
        }

        const isKhtnQuiz = (q.subject === 'khtn' || (q.subjectLabel && q.subjectLabel.includes('Tự nhiên')) || (q.title && q.title.includes('KHTN')));
        const subjectBadge = isKhtnQuiz
          ? `<span class="badge-status" style="background:#ecfdf5;color:#065f46;border:1.5px solid #10b981;font-weight:800;font-size:0.75rem;">🔬 KHTN</span>`
          : `<span class="badge-status" style="background:#eef2ff;color:#3730a3;border:1.5px solid #6366f1;font-weight:800;font-size:0.75rem;">📐 Toán</span>`;

        return `
          <div class="path-milestone-node ${posClass}">
            <div class="path-milestone-circle ${isKhtnQuiz ? 'circle-green' : circleColorClass}" onclick="loadSampleToStudent('${q.id}')" title="Bắt đầu: ${escapeHtml(q.title)}">
              <span class="milestone-icon">${hasCompleted ? '🏆' : (isKhtnQuiz ? '🔬' : icon)}</span>
              <span class="path-milestone-badge">${hasCompleted ? '✓' : idx + 1}</span>
            </div>

            <div class="path-lesson-card" style="${hasCompleted ? 'border-color:rgba(16,185,129,0.5);' : (isKhtnQuiz ? 'border-color:rgba(16,185,129,0.4);' : '')}">
              <div class="path-lesson-badges">
                ${subjectBadge}
                ${termBadge}
                ${targetBadge}
                ${completionBadgeHtml}
              </div>
              <div class="path-lesson-title">${escapeHtml(q.title)}</div>
              <div class="path-lesson-meta">
                <span>⏱️ <strong>${q.timeLimit} phút</strong></span>
                <span>•</span>
                ${qCountDisplay}
                <span>•</span>
                ${socialProofHtml}
              </div>

              ${studentTakersSectionHtml}
              
              ${hasCompleted ? `
                <div style="display:flex;gap:0.4rem;align-items:center;margin-top:0.5rem;flex-wrap:wrap;">
                  <button type="button" class="btn btn-secondary btn-sm path-start-btn" style="flex:1;" onclick="loadSampleToStudent('${q.id}')">
                    <span>🔄 LÀM LẠI</span>
                    <span class="path-xp-tag" style="background:var(--sky-light);color:var(--sky-shadow);">+20 XP</span>
                  </button>
                  <button type="button" class="btn btn-sky btn-sm" onclick="quickViewResults('${q.id}')" title="Xem bảng điểm của đề này" style="padding:0.45rem 0.75rem;font-weight:800;border-radius:var(--radius-md);">
                    📊 Bảng Điểm
                  </button>
                </div>
              ` : `
                <button type="button" class="btn btn-primary btn-sm path-start-btn" onclick="loadSampleToStudent('${q.id}')">
                  <span>🚀 VÀO THI NGAY</span>
                  <span class="path-xp-tag">+50 XP</span>
                </button>
              `}
            </div>
          ${!isLast ? '<div class="path-connector"></div>' : ''}
        </div>
      `;
    }).join('')}
  </div>
`;
  initVactMini100UI();
  initVactFull120UI();
  updateVactStudentDashboard();
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
  window.LocalStudentProfile?.updateProfile({ name: currentName, className: currentClass, avatar: AppState.studentAvatar || '' });
  renderLocalStudentGreeting();
  updatePersonalizedExamFeed();
  document.getElementById('sampleQuizzesList')?.scrollIntoView({ behavior: 'smooth' });
}

function restoreLocalStudentProfile() {
  const profile = window.LocalStudentProfile?.getProfile();
  if (!profile) return;
  const nameEl = document.getElementById('studentJoinName');
  const classEl = document.getElementById('studentJoinClass');
  if (nameEl && profile.name) nameEl.value = profile.name;
  if (classEl && profile.className) classEl.value = profile.className;
  if (profile.avatar) AppState.studentAvatar = profile.avatar;
  renderLocalStudentGreeting();
}

function renderLocalStudentGreeting() {
  const profile = window.LocalStudentProfile?.getProfile();
  const greeting = document.getElementById('studentProfileGreeting');
  const submitButton = document.getElementById('studentProfileSubmitButton');
  if (!greeting) return;
  if (profile?.name && profile?.className) {
    greeting.textContent = `Xin chào, ${profile.name} — Lớp ${profile.className}. CHỈNH SỬA HỒ SƠ bằng hai ô phía trên.`;
    greeting.classList.remove('hidden');
    if (submitButton) submitButton.textContent = 'CHỈNH SỬA HỒ SƠ';
  } else {
    greeting.classList.add('hidden');
    if (submitButton) submitButton.textContent = 'BẮT ĐẦU HỌC';
  }
}

/* Join Exam Directly by Quiz ID */
function stripGeneratedAnswerTable(html) {
  return html.replace(/<div class="page-break"><\/div>\s*<div class="section-title"[^>]*>BẢNG ĐÁP ÁN & HƯỚNG DẪN CHẤM THI<\/div>\s*<table class="answer-key-table">[\s\S]*?<\/table>/g, '');
}

async function startExamWithQuizId(quizId) {
  const className = document.getElementById('studentJoinClass').value.trim();
  const name = document.getElementById('studentJoinName').value.trim();
  const statusEl = document.getElementById('joinQuizStatus');

  if (!className || !name) {
    statusEl.innerHTML = '<span style="color:var(--rose);">⚠️ Vui lòng điền Tên và Lớp học của bạn ở ô bên trên!</span>';
    document.getElementById('studentJoinName').focus();
    return;
  }
  window.LocalStudentProfile?.updateProfile({ name, className, avatar: AppState.studentAvatar || '' });
  renderLocalStudentGreeting();

  statusEl.innerHTML = '<span style="color:var(--indigo);">⏳ Đang tải đề thi...</span>';
  let quiz = await StorageEngine.getQuiz(quizId);

  // If not found locally, attempt direct fetch from Firebase Cloud
  if (!quiz && window.FirebaseEngine && window.FirebaseEngine.isActive) {
    statusEl.innerHTML = '<span style="color:var(--indigo);">☁️ Đang tìm đề thi trên Firebase Cloud...</span>';
    quiz = await window.FirebaseEngine.getQuiz(quizId);
    if (quiz) {
      await persistTeacherQuiz(quiz);
    }
  }

  if (!quiz) {
    statusEl.innerHTML = '<span style="color:var(--rose);">❌ Không tìm thấy đề thi với mã: <strong>' + escapeHtml(quizId) + '</strong>. Vui lòng kiểm tra lại!</span>';
    return;
  }

  const studentId = window.LocalStudentProfile?.getStudentId();
  const alreadySubmitted = await StorageEngine.hasSubmitted(quizId, className, name, studentId);
  if (alreadySubmitted) {
    statusEl.innerHTML = '<span style="color:var(--amber);">⚠️ Bạn đã hoàn thành và nộp bài cho đề thi này rồi!</span>';
    return;
  }

  if (quiz.examHtml && quiz.examHtml.includes('answer-key-table')) {
    const publicHtml = stripGeneratedAnswerTable(quiz.examHtml);
    quiz = { ...quiz, examHtml: publicHtml, pdfDataUrl: 'data:text/html;charset=utf-8,' + encodeURIComponent(publicHtml) };
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
  ExamVault.store(quizId, quiz.answerKeys || [], { subject: quiz.subject || quiz.subjectLabel || 'toan' });
  AppState.currentQuiz = { ...quiz, answerKeys: ExamVault.getPublicKeys(quizId) };
  AppState.currentQuizId = quizId;
  AppState.studentId = studentId || null;
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
  document.body.classList.add('in-exam-session');

  // Master Teacher Exam Toolbar toggle
  const isMaster = isMasterTeacherRole(name);
  const masterToolbar = document.getElementById('masterTeacherExamToolbar');
  if (masterToolbar) masterToolbar.classList.toggle('hidden', !isMaster);

  setMobileExamView('pdf');
  updateMobileSheetBadges();

  const isKhtnExam = (quiz.subject === 'khtn' || (quiz.subjectLabel && quiz.subjectLabel.includes('Tự nhiên')) || (quiz.title && quiz.title.includes('KHTN')));
  const subjectIcon = isKhtnExam ? '🔬' : '📐';
  document.getElementById('splitExamExamTitle').textContent = `${subjectIcon} ${quiz.title}`;
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

  const isDocumentOnly = quiz.examMode === 'document_view' || !quiz.answerKeys || quiz.answerKeys.length === 0;
  const splitLayout = document.querySelector('.split-exam-layout');
  const docControls = document.getElementById('documentOnlyControls');
  const answerPane = document.querySelector('.answer-sheet-pane');
  const mobileSelector = document.querySelector('.mobile-mode-bar') || document.querySelector('.mobile-exam-mode-selector');
  const mobileSheetTrigger = document.getElementById('mobileFloatingSheetTrigger');

  if (isDocumentOnly) {
    if (splitLayout) splitLayout.classList.add('document-only-mode');
    if (docControls) docControls.classList.remove('hidden');
    if (answerPane) answerPane.classList.add('hidden');
    if (mobileSelector) mobileSelector.classList.add('hidden');
    if (mobileSheetTrigger) mobileSheetTrigger.classList.add('hidden');
  } else {
    if (splitLayout) splitLayout.classList.remove('document-only-mode');
    if (docControls) docControls.classList.add('hidden');
    if (answerPane) answerPane.classList.remove('hidden');
    if (mobileSelector) mobileSelector.classList.remove('hidden');
    if (mobileSheetTrigger) mobileSheetTrigger.classList.remove('hidden');
    renderStudentAnswerSheet(AppState.currentQuiz.answerKeys);
  }

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

  const isVact = AppState.currentQuiz && (AppState.currentQuiz.subject === 'vact' || AppState.currentQuiz.vactMeta);
  if (isVact) {
    let vactHtml = '';
    const sectionNames = {
      vietnamese: 'PHẦN 1 — TIẾNG VIỆT',
      english: 'PHẦN 2 — TIẾNG ANH',
      math: 'PHẦN 3 — TOÁN HỌC',
      logic_data: 'PHẦN 4 — TƯ DUY LOGIC & PHÂN TÍCH SỐ LIỆU',
      scientific_reasoning: 'PHẦN 5 — SUY LUẬN KHOA HỌC'
    };
    const shortNames = {
      vietnamese: 'P1: TV',
      english: 'P2: TA',
      math: 'P3: Toán',
      logic_data: 'P4: Logic',
      scientific_reasoning: 'P5: Khoa học'
    };

    // Quick Section Navigation Bar
    const distinctSections = [...new Set(keys.map(k => k.section || 'math'))];
    vactHtml += `
      <div class="vact-quick-nav-bar" style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:0.75rem;padding:0.45rem;background:var(--bg-tertiary);border-radius:var(--radius-md);border:1px solid var(--border-color);position:sticky;top:0;z-index:5;">
        <span style="font-size:0.75rem;font-weight:800;color:var(--text-secondary);align-self:center;margin-right:2px;">Chuyển phần:</span>
        ${distinctSections.map(sec => {
          const secQuestions = keys.filter(k => (k.section || 'math') === sec);
          const answeredInSec = secQuestions.filter(k => AppState.studentAnswers[k.num] && AppState.studentAnswers[k.num] !== '(chưa điền)').length;
          const label = shortNames[sec] || sec;
          return `<button type="button" class="btn btn-sm btn-secondary" onclick="document.querySelector('#vactSectionBanner_${sec}')?.scrollIntoView({behavior:'smooth',block:'start'})" style="font-size:0.72rem;padding:2px 6px;border-radius:var(--radius-sm);font-weight:800;" title="${sectionNames[sec] || sec}">${label} <span style="opacity:0.8;">(${answeredInSec}/${secQuestions.length})</span></button>`;
        }).join('')}
      </div>
    `;

    let lastSection = null;
    keys.forEach(k => {
      const sec = k.section || 'math';
      if (sec !== lastSection) {
        lastSection = sec;
        const bannerTitle = sectionNames[sec] || `PHẦN — ${sec.toUpperCase()}`;
        const secQuestions = keys.filter(item => (item.section || 'math') === sec);
        const answeredInSec = secQuestions.filter(item => AppState.studentAnswers[item.num] && AppState.studentAnswers[item.num] !== '(chưa điền)').length;
        vactHtml += `
          <div class="vact-sheet-section-banner" id="vactSectionBanner_${sec}" style="padding:0.45rem 0.75rem;background:linear-gradient(90deg, #312e81, #4338ca);color:#fff;border-radius:var(--radius-sm);font-weight:900;font-size:0.82rem;margin:0.85rem 0 0.45rem;letter-spacing:0.5px;display:flex;justify-content:space-between;align-items:center;">
            <span>${bannerTitle}</span>
            <span style="font-size:0.74rem;background:rgba(255,255,255,0.2);padding:1px 8px;border-radius:999px;">${answeredInSec}/${secQuestions.length} câu</span>
          </div>
        `;
      }
      vactHtml += renderSingleSheetRow(k);
    });

    container.innerHTML = vactHtml;
    updateSheetProgress();
    return;
  }

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
          <button type="button" data-question="${k.num}" data-opt="${opt}" class="bubble-btn ${current === opt ? 'selected' : ''}" onclick="selectBubbleAnswer(${k.num}, '${opt}')">${opt}</button>
        `).join('')}
      </div>
    `;
  } else if (k.type === 'truefalse') {
    const current = AppState.studentAnswers[k.num];
    return `
      <div class="bubble-options-group">
        <button type="button" data-question="${k.num}" data-opt="Đúng" class="bubble-btn ${current === 'Đúng' ? 'selected' : ''}" style="width:auto;padding:0 14px;font-size:0.9rem;" onclick="selectBubbleAnswer(${k.num}, 'Đúng')">Đúng</button>
        <button type="button" data-question="${k.num}" data-opt="Sai" class="bubble-btn ${current === 'Sai' ? 'selected' : ''}" style="width:auto;padding:0 14px;font-size:0.9rem;" onclick="selectBubbleAnswer(${k.num}, 'Sai')">Sai</button>
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
  updateMobileSheetBadges();
}

/* ================= 👑 MASTER TEACHER EXAM TOOLBAR ACTIONS ================= */
function masterTeacherRevealAnswers() {
  if (!isMasterTeacherRole() || !AppState.currentQuizId) return;
  const questions = ExamVault.getTeacherKeys(AppState.currentQuizId);
  let count = 0;
  questions.forEach((q, idx) => {
    const qIndex = q.num;
    const correctAns = String(q.correct || '').split(/[|;]/)[0].trim();
    if (correctAns) {
      const optBtn = document.querySelector(`.bubble-btn[data-question="${qIndex}"][data-opt="${correctAns}"]`);
      if (optBtn) {
        optBtn.style.outline = '3px solid #10b981';
        optBtn.style.backgroundColor = 'rgba(16, 185, 129, 0.2)';
        optBtn.style.color = '#047857';
        optBtn.style.fontWeight = '900';
        count++;
      }
    }
  });
  SoundEngine.playFanfare();
  showToast(`👁️ Thầy Khiêm: Đã làm nổi bật ${count} đáp án chính xác trên Phiếu Làm Bài!`, 'success');
}

function masterTeacherAutoSolve10() {
  if (!AppState.currentQuizData) return;
  const questions = AppState.currentQuizData.questions || [];
  questions.forEach((q, idx) => {
    const qIndex = idx + 1;
    const correctAns = (q.correctAnswer || '').trim().toUpperCase();
    if (correctAns) {
      AppState.studentAnswers[qIndex] = correctAns;
    }
  });
  SoundEngine.playFanfare();
  renderStudentAnswerSheet(AppState.currentQuiz.answerKeys);
  saveCurrentExamSessionToPaused();
  showToast('⚡ Thầy Khiêm đã tự động điền 100% đáp án đúng! Chuẩn bị nộp bài...', 'success');
  setTimeout(() => submitStudentExam(), 600);
}

/* ================= 📱 MOBILE EXAM EXPANDED VIEW CONTROLLER ================= */
function setMobileExamView(mode) {
  const layout = document.querySelector('.split-exam-layout');
  if (!layout) return;

  layout.classList.remove('view-pdf', 'view-sheet', 'view-both');
  layout.classList.add('view-' + mode);

  const btnMap = {
    pdf: 'btnMobileViewPdf',
    sheet: 'btnMobileViewSheet',
    both: 'btnMobileViewBoth'
  };

  Object.entries(btnMap).forEach(([m, id]) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.classList.toggle('active', m === mode);
    }
  });

  // Smooth scroll to top of pane when switching views
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (typeof SoundEngine !== 'undefined' && SoundEngine.playClick) {
    SoundEngine.playClick();
  }
}

function updateMobileSheetBadges() {
  if (!AppState.currentQuiz) return;
  const total = AppState.currentQuiz.answerKeys ? AppState.currentQuiz.answerKeys.length : 0;
  const answered = Object.values(AppState.studentAnswers || {}).filter(v => v !== undefined && v !== '').length;
  const text = `${answered}/${total}`;

  const b1 = document.getElementById('mobileAnsweredBadge');
  const b2 = document.getElementById('mobileFloatingAnswerCount');
  if (b1) b1.textContent = text;
  if (b2) b2.textContent = text;
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
  const timeText = `⏱️ ${m}:${String(s).padStart(2, '0')}`;
  const isWarn = AppState.secondsLeft <= 120;

  const timerBox = document.getElementById('splitExamTimerBox');
  if (timerBox) {
    timerBox.textContent = timeText;
    timerBox.classList.toggle('timer-warn', isWarn);
  }

  const docTimerBox = document.getElementById('docExamTimerBox');
  if (docTimerBox) {
    docTimerBox.textContent = timeText;
    docTimerBox.classList.toggle('timer-warn', isWarn);
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
  return 'khiemedu_paused_exam_' + (window.LocalStudentProfile?.getStudentId?.() || cleanName) + '_' + quizId;
}

function getActivePausedStorageKey() {
  const studentId = window.LocalStudentProfile?.getStudentId?.();
  return 'khiemedu_active_paused_session' + (studentId ? '_' + studentId : '');
}

function getPausedExamSession(name, quizId) {
  try {
    const key = getPausedExamStorageKey(name, quizId);
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
    const legacyKey = 'khiemedu_paused_exam_' + (name || '').trim().toUpperCase() + '_' + quizId;
    const legacyRaw = localStorage.getItem(legacyKey);
    if (legacyRaw) return JSON.parse(legacyRaw);
  } catch (e) {}
  return null;
}

function getActivePausedExamSession() {
  try {
    const raw = localStorage.getItem(getActivePausedStorageKey());
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
    studentId: AppState.studentId || window.LocalStudentProfile?.getStudentId?.() || null,
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
  localStorage.setItem(getActivePausedStorageKey(), JSON.stringify(session));
  return session;
}

function clearPausedExamSession(studentName, quizId) {
  if (studentName && quizId) {
    const key = getPausedExamStorageKey(studentName, quizId);
    localStorage.removeItem(key);
  }
  const active = getActivePausedExamSession();
  if (active && (!quizId || active.quizId === quizId)) {
    localStorage.removeItem(getActivePausedStorageKey());
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
  document.body.classList.remove('in-exam-session');
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
  if (given === null || given === undefined || correct === null || correct === undefined || !String(given).trim() || !String(correct).trim()) return false;
  
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
  const clean = String(str).trim().replace(',', '.').replace(/^[a-z]\s*=\s*/i, '').replace(/\s*(cm[23]?|m[23]?|mm|km(\/h)?|kg|g|độ|°|rad)\s*$/i, '').trim().replace(/−/g, '-');
  if (/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(clean)) {
    const val = Number(clean);
    return Number.isFinite(val) ? val : null;
  }
  return null;
}

function parseFraction(str) {
  if (!str) return null;
  const clean = String(str).trim().replace(/^[a-z]\s*=\s*/i, '').replace(/\s*(cm[23]?|m[23]?|mm|km(\/h)?|kg|g|độ|°|rad)\s*$/i, '').trim();
  const match = clean.match(/^([+-]?\d+(?:[.,]\d+)?)\s*\/\s*([+-]?\d+(?:[.,]\d+)?)$/);
  if (match) {
    const num = Number(match[1].replace(',', '.'));
    const den = Number(match[2].replace(',', '.'));
    if (den !== 0) return num / den;
  }
  return null;
}

/* Submit Exam */
async function submitStudentExam(isAuto = false) {
  // ================= CHỐNG BẤM NỘP BÀI NHIỀU LẦN (IDEMPOTENCY GUARD) =================
  if (AppState.isSubmitting) {
    console.warn('[submitStudentExam] Đã chặn lần nhấn nộp bài trùng lặp khi đang xử lý.');
    return;
  }

  // Xác nhận nộp bài thủ công (không hỏi nếu tự động nộp do hết giờ)
  if (!isAuto) {
    const total = AppState.currentQuiz?.answerKeys?.length || 0;
    const answeredCount = Object.keys(AppState.studentAnswers || {}).filter(k => AppState.studentAnswers[k] && AppState.studentAnswers[k] !== '(chưa điền)').length;
    const unansweredCount = Math.max(0, total - answeredCount);
    let confirmMsg = 'Bạn có chắc chắn muốn nộp bài thi không?';
    if (unansweredCount > 0) {
      confirmMsg = `⚠️ Bạn còn ${unansweredCount}/${total} câu chưa trả lời!\n\nBạn có chắc chắn muốn nộp bài thi ngay bây giờ không?`;
    }
    if (typeof confirm === 'function' && !confirm(confirmMsg)) {
      return;
    }
  }

  AppState.isSubmitting = true;

  // Vô hiệu hóa nút nộp bài ngay lập tức để ngăn chặn double-click / spam click
  const submitBtns = [
    document.getElementById('btnSubmitStudentExam'),
    document.getElementById('btnSubmitDocExam')
  ].filter(Boolean);

  submitBtns.forEach(btn => {
    btn.disabled = true;
    btn.dataset.prevHtml = btn.innerHTML;
    btn.innerHTML = '⏳ Đang chấm & lưu kết quả...';
  });

  try {
    if (AppState.timerInterval) clearInterval(AppState.timerInterval);
    if (AppState.leaderboardTimer) clearInterval(AppState.leaderboardTimer);

    // Xóa phiên tạm dừng cho bài thi này
    const quiz = AppState.currentQuiz || {};
    const isDocumentOnly = quiz.examMode === 'document_view' || !quiz.answerKeys || quiz.answerKeys.length === 0;

    let totalEarnedScore = 0;
    let correctCount = 0;
    let total = 0;
    let reviewData = [];

    if (isDocumentOnly) {
      totalEarnedScore = 0;
      correctCount = 0;
      total = 0;
      reviewData = [{
        num: 1,
        type: 'document_submission',
        level: 'VD',
        category: 'Đề thi gốc',
        subject: (AppState.currentQuiz && AppState.currentQuiz.subjectLabel) || 'Toán học',
        content: 'Bài nộp hoàn thành từ đề thi gốc.',
        explanation: 'Học sinh đã xem đề và hoàn thành bài thi. Giáo viên sẽ chấm và nhận xét bài làm trực tiếp.',
        pitfall: 'Không có điểm trừ hệ thống cho đề thi tự luận trực tiếp.',
        keyFormula: 'Hoàn thành bài thi',
        maxScore: null,
        earnedScore: null,
        given: 'Đã hoàn thành và nộp bài',
        correctAnswer: 'Đã nộp bài cho giáo viên',
        isCorrect: null
      }];
    } else {
      const gradeResult = ExamVault.grade(AppState.currentQuizId, AppState.studentAnswers);
      totalEarnedScore = gradeResult.totalEarnedScore;
      correctCount = gradeResult.correctCount;
      total = gradeResult.total;
      reviewData = gradeResult.reviewData;
    }

    // Freeze student answers for strict immutability
    const submittedAnswers = Object.freeze({ ...AppState.studentAnswers });

    // Identify V-ACT exams
    const isVact = Boolean(
      quiz.subject === 'vact' ||
      quiz.vactMeta ||
      (quiz.answerKeys && quiz.answerKeys.some(r => r.section)) ||
      (reviewData && reviewData.some(r => r.section))
    );

    let vactAttempt = null;
    const timeTakenSeconds = AppState.totalExamSeconds - AppState.secondsLeft;

    if (isVact && window.KEDUVACT?.review?.gradeVactAttempt) {
      try {
        const vMeta = quiz.vactMeta || {};
        const examQuestions = (quiz.questions && quiz.questions.length) ? quiz.questions : (quiz.answerKeys || []);
        vactAttempt = window.KEDUVACT.review.gradeVactAttempt({
          id: AppState.currentQuizId,
          title: quiz.title || 'V-ACT',
          questions: examQuestions
        }, submittedAnswers, {
          studentName: AppState.studentName,
          className: AppState.studentClass,
          studentId: AppState.studentId || window.LocalStudentProfile?.getStudentId?.() || null,
          duration: timeTakenSeconds,
          mode: vMeta.mode || (vMeta.profileId ? (vMeta.profileId === 'vact_full' ? 'full_120' : 'mini_100') : 'section_mini'),
          profileId: vMeta.profileId || null,
          title: quiz.title || 'V-ACT'
        });

        totalEarnedScore = vactAttempt.correctCount;
        correctCount = vactAttempt.correctCount;
        total = vactAttempt.totalCount;
        reviewData = vactAttempt.review;
      } catch (gradeErr) {
        console.error('V-ACT verified grading error:', gradeErr);
        if (String(gradeErr.message).includes('ANSWER_METADATA_ERROR')) {
          showToast('LỖI DỮ LIỆU ĐÁP ÁN: ' + gradeErr.message, 'error');
        }
      }
    }

    const finalScore10 = Math.round(totalEarnedScore * 10) / 10;
    const scorePct = total ? Math.round((correctCount / total) * 100) : 0;

    // Kiểm tra xem bài thi này học sinh đã từng nộp trước đó chưa (Retake)
    const studentId = AppState.studentId || window.LocalStudentProfile?.getStudentId?.() || null;
    const isRetake = await StorageEngine.hasSubmitted(AppState.currentQuizId, AppState.studentClass, AppState.studentName, studentId);

    const resultRecord = {
      studentId,
      quizId: AppState.currentQuizId,
      quizTitle: quiz.title,
      subjectLabel: quiz.subjectLabel || quiz.subject || 'Toán học',
      name: AppState.studentName,
      className: AppState.studentClass,
      avatar: AppState.studentAvatar || '🦊',
      correct: correctCount,
      total,
      totalScore: isDocumentOnly ? null : (isVact ? correctCount : finalScore10),
      gradingStatus: isDocumentOnly ? 'pending' : 'graded',
      scorePct,
      timeTakenSeconds,
      tabSwitches: AppState.tabSwitches,
      isAuto,
      isDocumentOnly,
      isRetake,
      isVact,
      submittedAnswers,
      vactAttempt,
      submittedAt: new Date().toISOString(),
      review: reviewData
    };

    const savedKey = await StorageEngine.saveResult(resultRecord);
    resultRecord.key = savedKey;
    clearPausedExamSession(AppState.studentName, AppState.currentQuizId);

    // Ghi nhận bản ghi phân tích năng lực V-ACT nếu bài thi thuộc hệ thống V-ACT
    if (isVact && window.KEDUVACT?.performanceAnalytics?.recordAttempt) {
      try {
        const vMeta = quiz.vactMeta || {};
        window.KEDUVACT.performanceAnalytics.recordAttempt({
          testId: AppState.currentQuizId,
          mode: vMeta.profileId ? (vMeta.profileId === 'vact_full' ? 'full_120' : 'mini_100') : (vMeta.mode || 'section_mini'),
          profile: vMeta.profileId || null,
          section: vMeta.section || (vMeta.profileId ? 'composite' : (reviewData[0]?.section || 'composite')),
          skill: vMeta.skill || null,
          requestedCount: vMeta.requestedTotal || total,
          generatedCount: total,
          questionIds: reviewData.map(r => r.id || r.questionId || `q_${r.num}`),
          questionSignatures: reviewData.map(r => r.signature || `${r.num}`),
          answers: { ...submittedAnswers },
          submittedAnswers,
          correct: correctCount,
          incorrect: Math.max(0, total - correctCount - (reviewData.filter(r => !r.given || r.given === '(chưa điền)').length)),
          unanswered: reviewData.filter(r => !r.given || r.given === '(chưa điền)').length,
          scoreRaw: correctCount,
          accuracy: scorePct,
          duration: timeTakenSeconds,
          startedAt: new Date(Date.now() - (timeTakenSeconds * 1000)).toISOString(),
          submittedAt: new Date().toISOString(),
          studentName: AppState.studentName,
          studentClass: AppState.studentClass,
          studentId,
          review: reviewData,
          sectionResults: vactAttempt?.sectionBreakdown || null
        });
        updateVactStudentDashboard();
      } catch (analyticsErr) {
        console.warn('V-ACT attempt record warning:', analyticsErr);
      }
    }

    const rewards = GamificationEngine.awardExamRewards(resultRecord);
    updateGamifyBar();

    document.body.classList.remove('in-exam-session');
    document.getElementById('studentExamSection').classList.add('hidden');
    document.getElementById('studentResultSection').classList.remove('hidden');

    renderExamResultHero(resultRecord, rewards);
    renderExamReviewList(reviewData, isDocumentOnly, resultRecord);
    if (typeof StudentAnalytics !== 'undefined' && StudentAnalytics.renderStudentTopicFeedback) {
      StudentAnalytics.renderStudentTopicFeedback(resultRecord.name, resultRecord.className, 'studentResultTopicFeedbackWrap');
    }

    SoundEngine.playFanfare();
    GamificationEngine.fireConfetti();

    ExamVault.clear(AppState.currentQuizId);
  } catch (error) {
    showToast(error.message || 'Không lưu được kết quả. Hãy thử nộp lại.', 'error');
    try { saveCurrentExamSessionToPaused(); } catch (saveError) { console.warn('Could not cache paused exam:', saveError); }
  } finally {
    AppState.isSubmitting = false;
    submitBtns.forEach(btn => {
      btn.disabled = false;
      if (btn.dataset.prevHtml) btn.innerHTML = btn.dataset.prevHtml;
    });
  }
}

/**
 * Tự động dọn dẹp các bản ghi nộp bài trùng lặp (do spam bấm nộp trước đó trong vòng 5 giây)
 */
async function sanitizeDuplicateSubmissions() {
  try {
    const all = await StorageEngine.getAllResults();
    if (!all || all.length <= 1) return 0;

    const groups = {};
    all.forEach(r => {
      if (!r || !r.quizId || !r.name) return;
      const k = JSON.stringify([r.quizId, (r.className || '').trim().toLowerCase(), r.name.trim().toLowerCase()]);
      if (!groups[k]) groups[k] = [];
      groups[k].push(r);
    });

    let removedCount = 0;
    for (const k in groups) {
      const list = groups[k];
      if (list.length <= 1) continue;

      list.sort((a, b) => new Date(a.submittedAt || 0) - new Date(b.submittedAt || 0));

      for (let i = 1; i < list.length; i++) {
        const prev = list[i - 1];
        const curr = list[i];
        const diffMs = Math.abs(new Date(curr.submittedAt || 0) - new Date(prev.submittedAt || 0));
        // Trùng cùng người, cùng đề trong vòng 5s -> xóa bản ghi dư thừa
        if (diffMs < 5000 && curr.totalScore === prev.totalScore) {
          const deleteKey = curr.id || curr.key;
          if (deleteKey) {
            console.log('[Sanitize] Đã xóa bài nộp trùng lặp:', deleteKey);
            await StorageEngine.deleteResult(deleteKey);
            removedCount++;
          }
        }
      }
    }
    return removedCount;
  } catch (err) {
    console.warn('[Sanitize] Lỗi dọn dẹp bài trùng lặp:', err);
    return 0;
  }
}

if (typeof window !== 'undefined') {
  window.sanitizeDuplicateSubmissions = sanitizeDuplicateSubmissions;
}

function renderExamResultHero(result, rewards) {
  const isVact = Boolean(
    result.isVact ||
    result.vactAttempt ||
    result.subjectLabel === 'Mini V-ACT 100' ||
    result.subjectLabel === 'Full V-ACT 120' ||
    (typeof result.subjectLabel === 'string' && result.subjectLabel.startsWith('V-ACT')) ||
    result.subject === 'vact' ||
    (AppState.currentQuiz && (AppState.currentQuiz.subject === 'vact' || AppState.currentQuiz.vactMeta)) ||
    (result.review && result.review.some(r => r.section))
  );

  if (result.isDocumentOnly) {
    document.getElementById('resultScoreVal').textContent = 'ĐÃ NỘP ✅';
    document.getElementById('resultScorePct').textContent = 'Đã ghi nhận bài nộp thành công cho giáo viên!';
  } else if (isVact) {
    document.getElementById('resultScoreVal').textContent = `${result.correct}/${result.total}`;
    document.getElementById('resultScorePct').textContent = `${result.scorePct}% chính xác (${result.correct} đúng / ${result.total} câu)`;
  } else {
    document.getElementById('resultScoreVal').textContent = `${result.totalScore}/10`;
    document.getElementById('resultScorePct').textContent = `${result.correct}/${result.total} câu đúng (${result.scorePct}%)`;
  }
  document.getElementById('resultXpGained').textContent = `+${rewards.xpGained} XP`;
  document.getElementById('resultStreakCount').textContent = `${rewards.streak} Ngày 🔥`;
  document.getElementById('resultTabSwitches').textContent = result.tabSwitches;

  const min = Math.floor(result.timeTakenSeconds / 60);
  const sec = result.timeTakenSeconds % 60;
  document.getElementById('resultTimeTaken').textContent = `${min}p ${sec}s`;

  // Hiển thị chi tiết điểm thưởng XP & Chuỗi điểm 10
  const breakdownBox = document.getElementById('resultBonusBreakdown');
  if (breakdownBox && rewards.bonusBreakdown && rewards.bonusBreakdown.length) {
    breakdownBox.innerHTML = `
      <div style="background:var(--bg-tertiary);border:1.5px solid var(--border-color);border-radius:var(--radius-md);padding:0.75rem 1rem;margin-top:0.75rem;text-align:left;">
        <div style="font-weight:800;font-size:0.85rem;color:var(--text-secondary);margin-bottom:0.4rem;">CHI TIẾT ĐIỂM THƯỞNG BÀI THI:</div>
        <div style="display:flex;flex-direction:column;gap:0.35rem;">
          ${rewards.bonusBreakdown.map(b => `
            <div style="display:flex;justify-content:space-between;font-size:0.85rem;font-weight:700;">
              <span>${b.icon || '✨'} ${escapeHtml(b.label)}</span>
              <span style="color:${b.xp >= 0 ? 'var(--indigo)' : 'var(--rose);font-weight:900'};">${b.xp > 0 ? '+' : ''}${b.xp} XP</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    breakdownBox.classList.remove('hidden');
  }

  // Hiển thị bảng phân tích điểm theo từng phần V-ACT
  const vactBreakdownBox = document.getElementById('vactSectionScoreBreakdown');
  if (vactBreakdownBox) {
    const computeFn = window.KEDUVACT?.computeSectionBreakdown || window.KEDUVACT?.VACTExamGenerator?.computeSectionBreakdown || window.VACTExamGenerator?.computeSectionBreakdown;
    if (isVact && computeFn) {
      const breakdown = computeFn(result.review || []);
      const unanswered = (result.review || []).filter(r => !r.given || r.given === '(chưa điền)').length;
      const wrong = Math.max(0, result.total - result.correct - unanswered);
      const titleLabel = result.subjectLabel === 'Full V-ACT 120' ? 'KẾT QUẢ TỪNG PHẦN FULL V-ACT 120' : 'KẾT QUẢ TỪNG PHẦN V-ACT';

      let bHtml = `
        <div class="card" style="background:var(--bg-tertiary);border:2px solid var(--indigo);border-radius:var(--radius-lg);padding:1rem 1.25rem;margin:1.25rem 0;text-align:left;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;flex-wrap:wrap;gap:0.5rem;">
            <h3 style="margin:0;font-size:1.1rem;color:var(--indigo);display:flex;align-items:center;gap:0.4rem;">
              <span>🏆</span> <span>${titleLabel}:</span>
            </h3>
            <div style="font-size:0.85rem;font-weight:800;color:var(--text-secondary);">
              Đúng: <strong style="color:var(--emerald);">${result.correct}</strong> | Sai: <strong style="color:var(--rose);">${wrong}</strong> | Chưa điền: <strong style="color:var(--amber-shadow);">${unanswered}</strong>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:0.6rem;">
      `;

      for (const s of Object.values(breakdown)) {
        if (s.total === 0) continue;
        const color = s.pct >= 75 ? 'var(--emerald)' : (s.pct >= 50 ? 'var(--indigo)' : 'var(--rose)');
        bHtml += `
          <div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-md);padding:0.6rem 0.85rem;">
            <div style="font-size:0.78rem;font-weight:800;color:var(--text-secondary);margin-bottom:0.2rem;">${escapeHtml(s.name)}</div>
            <div style="display:flex;justify-content:space-between;align-items:baseline;">
              <span style="font-size:1.15rem;font-weight:900;color:var(--text-primary);">${s.correct}/${s.total}</span>
              <span style="font-size:0.82rem;font-weight:800;color:${color};">${s.pct}%</span>
            </div>
          </div>
        `;
      }

      bHtml += `
          </div>
        </div>
      `;
      vactBreakdownBox.innerHTML = bHtml;
      vactBreakdownBox.classList.remove('hidden');
    } else {
      vactBreakdownBox.classList.add('hidden');
    }
  }

  const badgeBox = document.getElementById('resultNewlyUnlockedBadges');
  if (rewards.newlyUnlocked && rewards.newlyUnlocked.length) {
    badgeBox.innerHTML = `
      <div class="card" style="background:var(--amber-light);border-color:var(--amber);margin:1rem 0;text-align:center;">
        <h3 style="color:var(--amber-shadow);font-size:1.3rem;">🎉 Mở Khóa Huy Hiệu Mới!</h3>
        <div style="display:flex;justify-content:center;gap:1.5rem;margin-top:0.75rem;flex-wrap:wrap;">
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

function renderExamReviewList(reviewData, isDocumentOnly = false, resultRecord = null) {
  const reviewCard = document.getElementById('studentExamReviewCard');
  if (isDocumentOnly) {
    if (reviewCard) reviewCard.classList.add('hidden');
    return;
  } else {
    if (reviewCard) reviewCard.classList.remove('hidden');
  }

  const container = document.getElementById('examReviewContainer');
  if (!container) return;

  // Xử lý khi xem lại kết quả đã nén sau 7 ngày
  if (resultRecord && resultRecord.compacted) {
    const total = resultRecord.total || (reviewData ? reviewData.length : 0);
    const correctCount = resultRecord.correct || (reviewData ? reviewData.filter(r => r.isCorrect).length : 0);
    const scoreVal = resultRecord.totalScore !== undefined ? resultRecord.totalScore : (resultRecord.score || 0);

    container.innerHTML = `
      <div class="review-portal-wrap" style="padding:2.5rem 1.5rem;text-align:center;background:var(--bg-card);border:2px dashed var(--indigo);border-radius:var(--radius-lg);margin-top:1rem;">
        <div style="font-size:3.5rem;margin-bottom:0.75rem;">📦</div>
        <div style="font-size:1.25rem;font-weight:800;color:var(--text-primary);margin-bottom:0.6rem;">
          Đề thi này đã được dọn dẹp sau 7 ngày để tiết kiệm dung lượng
        </div>
        <p style="font-size:0.95rem;font-weight:600;color:var(--text-secondary);max-width:580px;margin:0 auto 1.5rem;line-height:1.5;">
          Không thể xem lại nội dung câu hỏi chi tiết, nhưng điểm số và thống kê chủ đề vẫn được giữ nguyên.
        </p>
        <div style="display:inline-flex;gap:1.25rem;flex-wrap:wrap;justify-content:center;">
          <div style="background:var(--bg-tertiary);border:1px solid var(--border-color);padding:0.75rem 1.5rem;border-radius:var(--radius-md);font-weight:800;">
            Thang điểm: <span style="color:var(--primary);font-size:1.15rem;">${scoreVal}/10đ</span>
          </div>
          <div style="background:var(--bg-tertiary);border:1px solid var(--border-color);padding:0.75rem 1.5rem;border-radius:var(--radius-md);font-weight:800;">
            Số câu đúng: <span style="color:var(--indigo);font-size:1.15rem;">${correctCount}/${total} câu</span>
          </div>
        </div>
      </div>
    `;
    return;
  }

  // DEDICATED V-ACT RESULT & ANSWER REVIEW MODE
  const isVact = Boolean(
    resultRecord?.isVact ||
    resultRecord?.vactAttempt ||
    (AppState.currentQuiz && (AppState.currentQuiz.subject === 'vact' || AppState.currentQuiz.vactMeta)) ||
    (reviewData && reviewData.some(r => r.section))
  );

  if (isVact && window.KEDUVACT?.review?.renderVactReviewHtml) {
    let attempt = resultRecord?.vactAttempt;
    if (!attempt) {
      const correctCount = reviewData.filter(r => r.isCorrect).length;
      const unansweredCount = reviewData.filter(r => !r.given || r.given === '(chưa điền)').length;
      const incorrectCount = Math.max(0, reviewData.length - correctCount - unansweredCount);
      const acc = reviewData.length > 0 ? Math.round((correctCount / reviewData.length) * 100) : 0;
      const secBreakdown = window.KEDUVACT.computeSectionBreakdown
        ? window.KEDUVACT.computeSectionBreakdown(reviewData)
        : (window.KEDUVACT.analytics?.performance?.computeSectionAnalytics ? window.KEDUVACT.analytics.performance.computeSectionAnalytics({ review: reviewData }) : {});

      attempt = {
        title: resultRecord?.quizTitle || AppState.currentQuiz?.title || 'V-ACT',
        mode: AppState.currentQuiz?.vactMeta?.mode || AppState.currentQuiz?.mode || 'section_mini',
        profileId: AppState.currentQuiz?.vactMeta?.profileId || null,
        duration: resultRecord?.timeTakenSeconds || (AppState.totalExamSeconds - AppState.secondsLeft) || 0,
        totalCount: reviewData.length,
        correctCount,
        incorrectCount,
        unansweredCount,
        accuracy: acc,
        sectionBreakdown: secBreakdown,
        review: reviewData.map((r, idx) => {
          if (r.friendlySource && r.status) return r;
          return window.KEDUVACT.review.buildReviewItem(r, r.given, r.num || (idx + 1));
        })
      };
    }

    window._activeVactReviewAttempt = attempt;
    const currentFilter = window._activeVactReviewFilter || 'all';
    container.innerHTML = window.KEDUVACT.review.renderVactReviewHtml(attempt, { filter: currentFilter });

    if (typeof renderMathInElement !== 'undefined') {
      renderMathInElement(container, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false },
          { left: "\\(", right: "\\)", display: false },
          { left: "\\[", right: "\\]", display: true }
        ],
        throwOnError: false
      });
    }
    return;
  }

  const total = reviewData.length;
  const correctCount = reviewData.filter(r => r.isCorrect).length;
  const wrongList = reviewData.filter(r => !r.isCorrect);
  const wrongCount = wrongList.length;
  const unansweredCount = reviewData.filter(r => !r.given || r.given === '(chưa điền)').length;

  let html = `
    <div class="review-portal-wrap">
      <!-- Review Toolbar & Filter Tabs -->
      <div class="review-nav-bar">
        <div class="review-filter-group">
          <button type="button" class="review-tab-btn active" id="btnFilterAll" onclick="filterReviewCards('all')">
            <span>📋 Tất Cả</span>
            <span class="review-count-badge badge-all">${total}</span>
          </button>
          <button type="button" class="review-tab-btn ${wrongCount > 0 ? 'highlight-wrong' : ''}" id="btnFilterWrong" onclick="filterReviewCards('wrong')">
            <span>❌ Chỉ Xem Câu Sai</span>
            <span class="review-count-badge badge-wrong">${wrongCount}</span>
          </button>
          <button type="button" class="review-tab-btn" id="btnFilterCorrect" onclick="filterReviewCards('correct')">
            <span>✅ Câu Làm Đúng</span>
            <span class="review-count-badge badge-correct">${correctCount}</span>
          </button>
          ${unansweredCount > 0 ? `
            <button type="button" class="review-tab-btn" id="btnFilterUnanswered" onclick="filterReviewCards('unanswered')">
              <span>⚪ Chưa Điền</span>
              <span class="review-count-badge badge-unanswered">${unansweredCount}</span>
            </button>
          ` : ''}
        </div>

        <div class="review-actions-group">
          <button type="button" class="btn btn-secondary btn-sm" onclick="printExamReviewReport()" title="In bản lời giải & phân tích">
            <span>🖨️ In Báo Cáo</span>
          </button>
          ${wrongCount > 0 ? `
            <button type="button" class="btn btn-primary btn-sm" onclick="retryWrongQuestionsExam()" style="background:var(--rose);border-color:var(--rose);box-shadow:0 4px 12px rgba(225,29,72,0.3);">
              <span>🔄 Ôn Lại ${wrongCount} Câu Sai</span>
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Overview Alert Banner -->
      <div class="review-alert-banner ${wrongCount === 0 ? 'banner-perfect' : 'banner-review'}">
        ${wrongCount === 0 ? `
          <div style="font-weight:800;font-size:1.05rem;color:var(--primary);">🌟 Xuất Sắc! Bạn Đã Trả Lời Đúng Tất Cả ${total} Câu Hỏi!</div>
          <div style="font-size:0.88rem;color:var(--text-secondary);margin-top:3px;">Điểm số hoàn hảo! Hãy tiếp tục duy trì thành tích tuyệt vời này.</div>
        ` : `
          <div style="font-weight:800;font-size:1.05rem;color:var(--rose);">🎯 Phân Tích Bài Thi: Bạn đã làm sai ${wrongCount}/${total} câu hỏi.</div>
          <div style="font-size:0.88rem;color:var(--text-secondary);margin-top:3px;">Bấm nút <strong>"❌ Chỉ Xem Câu Sai"</strong> và đọc kỹ mục <strong>"Phân Tích Lỗi Sai Thường Gặp & Bẫy Đề"</strong> bên dưới để cải thiện điểm số nhé!</div>
        `}
      </div>

      <!-- Question Cards List -->
      <div class="review-cards-list" id="reviewCardsList">
        ${reviewData.map((r, i) => {
          const isWrong = !r.isCorrect;
          const isUnanswered = !r.given || r.given === '(chưa điền)';
          const statusClass = r.isCorrect ? 'status-correct' : (isUnanswered ? 'status-unanswered' : 'status-wrong');
          const statusType = r.isCorrect ? 'correct' : (isUnanswered ? 'unanswered' : 'wrong');

          const levelLabels = { NB: 'Nhận Biết', TH: 'Thông Hiểu', VD: 'Vận Dụng', VDC: 'Vận Dụng Cao' };
          const levelLabel = levelLabels[r.level] || r.level || 'Thông Hiểu';

          // Process options for MCQ
          const optionLetters = ['A', 'B', 'C', 'D'];
          let optionsHtml = '';

          if (r.options && r.options.length > 0) {
            optionsHtml = `
              <div class="review-options-grid">
                ${r.options.map((optText, optIdx) => {
                  const letter = optionLetters[optIdx] || String.fromCharCode(65 + optIdx);
                  const isUserPick = (r.given || '').trim().toUpperCase() === letter;
                  const isTarget = (r.correctAnswer || '').trim().toUpperCase() === letter;

                  let optClass = 'review-opt-box';
                  let tagBadge = '';

                  if (isUserPick && isTarget) {
                    optClass += ' opt-user-correct';
                    tagBadge = `<span class="opt-tag-badge tag-correct">✅ Lựa chọn của bạn (Chính xác)</span>`;
                  } else if (isUserPick && !isTarget) {
                    optClass += ' opt-user-wrong';
                    tagBadge = `<span class="opt-tag-badge tag-wrong">❌ Bạn đã chọn phương án này</span>`;
                  } else if (isTarget) {
                    optClass += ' opt-target-correct';
                    tagBadge = `<span class="opt-tag-badge tag-target">🌟 Đáp án chuẩn xác</span>`;
                  }

                  return `
                    <div class="${optClass}">
                      <div style="display:flex;align-items:flex-start;gap:0.4rem;">
                        <span class="review-opt-letter">${letter}.</span>
                        <div class="review-opt-text" style="flex:1;">${optText}</div>
                      </div>
                      ${tagBadge}
                    </div>
                  `;
                }).join('')}
              </div>
            `;
          } else if (r.type === 'essay') {
            optionsHtml = `
              <div class="review-essay-box" style="margin-top:0.8rem;padding:0.75rem 1rem;background:var(--bg-tertiary);border-radius:var(--radius-md);border:1.5px dashed var(--border-color);">
                <div style="font-size:0.95rem;font-weight:700;margin-bottom:0.25rem;">
                  Học sinh điền: <strong style="color:${r.isCorrect ? 'var(--primary-shadow)' : 'var(--rose)'};">${escapeHtml(r.given)}</strong>
                </div>
                <div style="font-size:0.95rem;font-weight:800;color:var(--primary-shadow);">
                  Đáp số chính xác: <span>${escapeHtml(r.correctAnswer)}</span>
                </div>
              </div>
            `;
          }

          return `
            <div class="review-q-card ${statusClass}" data-status="${statusType}">
              <div class="review-card-top">
                <div class="review-q-meta">
                  <span class="review-q-num">Câu ${r.num}</span>
                  <span class="level-badge level-${(r.level || 'th').toLowerCase()}">${levelLabel}</span>
                  <span class="review-type-badge">${r.type === 'mcq' ? 'Trắc nghiệm' : 'Tự luận'}</span>
                  ${r.category ? `<span class="review-category-badge">📂 ${escapeHtml(r.category)}</span>` : ''}
                  ${r.source ? `<span class="review-source-badge" style="display:inline-flex;align-items:center;gap:3px;font-size:0.75rem;font-weight:700;padding:2px 8px;border-radius:6px;background:#e0e7ff;color:#3730a3;border:1px solid #c7d2fe;">📚 ${escapeHtml(r.source)}</span>` : ''}
                </div>
                <div class="review-score-badge ${r.isCorrect ? 'score-pass' : 'score-fail'}">
                  ${r.isCorrect ? `✅ Đạt: <strong>+${r.earnedScore}đ</strong> / ${r.maxScore}đ` : `❌ Chưa đạt: <strong>0đ</strong> / ${r.maxScore}đ`}
                </div>
              </div>

              <!-- Question Content -->
              <div class="review-q-content">
                ${r.content ? r.content : `<em>(Đọc nội dung câu hỏi trong văn bản đề gốc số #${r.num})</em>`}
              </div>

              ${r.diagram ? `<div class="review-q-diagram">${r.diagram}</div>` : ''}

              <!-- Choices -->
              ${optionsHtml}

              <!-- SMART EXPLANATION & PITFALL BOX -->
              <div class="review-explanation-wrapper">
                ${r.explanation ? `
                  <div class="review-explain-box">
                    <div class="explain-title">
                      <span>💡</span> <strong>HƯỚNG DẪN GIẢI & LỜI GIẢI CHI TIẾT:</strong>
                    </div>
                    <div class="explain-body">
                      ${r.explanation}
                    </div>
                  </div>
                ` : ''}

                ${isWrong && r.pitfall ? `
                  <div class="review-pitfall-box">
                    <div class="pitfall-title">
                      <span>⚠️</span> <strong>PHÂN TÍCH LỖI SAI THƯỜNG GẶP (TẠI SAO DỄ CHỌN SAI?):</strong>
                    </div>
                    <div class="pitfall-body">
                      ${r.pitfall}
                    </div>
                  </div>
                ` : ''}

                ${r.keyFormula ? `
                  <div class="review-formula-box">
                    <div class="formula-title">
                      <span>📌</span> <strong>KIẾN THỨC CỐT LÕI CẦN GHI NHỚ:</strong>
                    </div>
                    <div class="formula-body">
                      ${r.keyFormula}
                    </div>
                  </div>
                ` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  container.innerHTML = html;

  // Render Math with KaTeX
  if (typeof renderMathInElement !== 'undefined') {
    renderMathInElement(container, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "$", right: "$", display: false },
        { left: "\\(", right: "\\)", display: false },
        { left: "\\[", right: "\\]", display: true }
      ],
      throwOnError: false
    });
  }
}

function filterReviewCards(filterType) {
  const cards = document.querySelectorAll('#reviewCardsList .review-q-card');
  const buttons = document.querySelectorAll('.review-filter-group .review-tab-btn');

  buttons.forEach(btn => btn.classList.remove('active'));
  if (filterType === 'all') document.getElementById('btnFilterAll')?.classList.add('active');
  if (filterType === 'wrong') document.getElementById('btnFilterWrong')?.classList.add('active');
  if (filterType === 'correct') document.getElementById('btnFilterCorrect')?.classList.add('active');
  if (filterType === 'unanswered') document.getElementById('btnFilterUnanswered')?.classList.add('active');

  cards.forEach(card => {
    const status = card.getAttribute('data-status');
    if (filterType === 'all') {
      card.style.display = 'block';
    } else if (filterType === 'wrong') {
      card.style.display = (status === 'wrong' || status === 'unanswered') ? 'block' : 'none';
    } else if (filterType === 'correct') {
      card.style.display = status === 'correct' ? 'block' : 'none';
    } else if (filterType === 'unanswered') {
      card.style.display = status === 'unanswered' ? 'block' : 'none';
    }
  });
}

function printExamReviewReport() {
  window.print();
}

function retryWrongQuestionsExam() {
  filterReviewCards('wrong');
  showToast('🎯 Đang chuyển sang danh sách các câu làm sai để bạn tập trung ôn tập!', 'info');
  const firstWrong = document.querySelector('#reviewCardsList .review-q-card.status-wrong, #reviewCardsList .review-q-card.status-unanswered');
  if (firstWrong) {
    firstWrong.scrollIntoView({ behavior: 'smooth', block: 'center' });
    firstWrong.style.transition = 'box-shadow 0.3s ease';
    firstWrong.style.boxShadow = '0 0 0 4px var(--rose)';
    setTimeout(() => { firstWrong.style.boxShadow = ''; }, 2500);
  }
}

if (typeof window !== 'undefined') {
  window.filterReviewCards = filterReviewCards;
  window.printExamReviewReport = printExamReviewReport;
  window.retryWrongQuestionsExam = retryWrongQuestionsExam;
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
  const classResults = results.filter(r => r.gradingStatus !== 'pending' && !r.isDocumentOnly && (r.className || '').toLowerCase() === className.toLowerCase());
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
  const graded = filtered.filter(r => r.gradingStatus !== 'pending' && !r.isDocumentOnly);
  const avgScore = graded.length ? (graded.reduce((acc, r) => acc + (r.totalScore || 0), 0) / graded.length).toFixed(1) : '—';
  const highestScore = graded.length ? Math.max(...graded.map(r => r.totalScore || 0)) : '—';
  const passCount = graded.filter(r => (r.totalScore || 0) >= 5).length;
  const passRate = graded.length ? Math.round((passCount / graded.length) * 100) : 0;

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

    <div style="margin-bottom:1.25rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.75rem;background:var(--bg-card);padding:0.85rem 1.15rem;border-radius:var(--radius-lg);border:2px solid var(--border-color);">
      <div style="font-weight:800;font-size:0.92rem;color:var(--indigo);display:flex;align-items:center;gap:0.4rem;">
        <span>🛡️</span> <strong>Bàn Điều Khiển Quản Trị & Chống Gian Lận (Mã Đề: ${code})</strong>
      </div>
      <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
        <button type="button" class="btn btn-warning btn-sm" style="background:var(--amber-light);color:var(--amber-shadow);border:1.5px solid var(--amber);" onclick="adminBulkPenalizeCheaters('${code}')" title="Tự động đặt 0 điểm cho các bài thi có cảnh báo rời màn hình">
          ⚠️ Hủy Điểm Bài Rời Màn Hình (>0 lần)
        </button>
        <button type="button" class="btn btn-secondary btn-sm" onclick="adminResetAllResultsForQuiz('${code}')" title="Xóa kết quả đề này để cả lớp được thi lại từ đầu">
          🔄 Cho Cả Lớp Thi Lại Đề Này
        </button>
        <button type="button" class="btn btn-success btn-sm" onclick="exportResultsToCsv('${code}')">
          📥 Xuất Bảng Điểm (CSV / Excel)
        </button>
      </div>
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
                <th style="text-align:center;min-width:240px;">🛡️ Quyền Admin (Xử Lý)</th>
              </tr>
            </thead>
            <tbody>
              ${byClass[className].map((r, i) => `
                <tr>
                  <td><strong>#${i + 1}</strong></td>
                  <td><strong>${r.avatar || '👤'} ${escapeHtml(r.name)}</strong></td>
                  <td>${r.isCheated 
                    ? `<span class="badge-status badge-fail" style="font-weight:900;font-size:0.85rem;" title="${escapeHtml(r.cheatReason || 'Gian lận')}">🚨 0đ (GIAN LẬN)</span>`
                    : (r.isDocumentOnly 
                      ? '<span class="badge-status badge-pass" style="font-weight:900;font-size:0.85rem;">ĐÃ NỘP BÀI ✅</span>' 
                      : `<strong style="color:${(r.totalScore || 0) >= 8 ? 'var(--primary-shadow)' : ((r.totalScore || 0) >= 5 ? 'var(--indigo)' : 'var(--rose)')};font-size:1.15rem;">${r.totalScore || 0}đ</strong>`
                    )
                  }</td>
                  <td>${r.isDocumentOnly ? '<span style="color:var(--text-muted);font-weight:700;">Đề Gốc</span>' : `${r.correct}/${r.total}`}</td>
                  <td>${Math.floor(r.timeTakenSeconds / 60)}p ${r.timeTakenSeconds % 60}s</td>
                  <td>${r.tabSwitches > 0 ? `<span style="color:var(--rose);font-weight:800;" title="Rời màn hình ${r.tabSwitches} lần">⚠️ ${r.tabSwitches}</span>` : '<span style="color:var(--primary);">0</span>'}</td>
                  <td>${new Date(r.submittedAt).toLocaleTimeString('vi-VN')}</td>
                  <td><span class="badge-status ${r.isCheated ? 'badge-fail' : ((r.isDocumentOnly || (r.totalScore || 0) >= 5) ? 'badge-pass' : 'badge-fail')}">${r.isCheated ? 'HỦY BÀI' : (r.isDocumentOnly ? 'ĐÃ NỘP' : ((r.totalScore || 0) >= 5 ? 'ĐẠT' : 'CHƯA ĐẠT'))}</span></td>
                  <td style="text-align:center;">
                    <div style="display:flex;gap:0.35rem;justify-content:center;flex-wrap:wrap;">
                      <button type="button" class="btn btn-primary btn-sm" style="padding:0.25rem 0.5rem;font-size:0.75rem;" onclick="adminViewSubmissionReview('${escapeHtml(r.id || r.key || '')}')" title="Xem chi tiết bài làm & lời giải">
                        👁️ Xem Bài
                      </button>
                      <button type="button" class="btn btn-secondary btn-sm" style="padding:0.25rem 0.5rem;font-size:0.75rem;" onclick="adminResetStudentRetake('${escapeHtml(r.id || r.key || '')}', '${escapeHtml(code)}', '${escapeHtml(r.className || '')}', '${escapeHtml(r.name || '')}')" title="Xóa kết quả cũ, mở khóa để học sinh thi lại từ đầu">
                        🔄 Cho Thi Lại
                      </button>
                      <button type="button" class="btn btn-warning btn-sm" style="padding:0.25rem 0.5rem;font-size:0.75rem;background:var(--amber-light);color:var(--amber-shadow);border:1px solid var(--amber);" onclick="adminPenalizeCheater('${escapeHtml(r.id || r.key || '')}', '${escapeHtml(code)}', '${escapeHtml(r.name || '')}')" title="Hạ điểm về 0 do vi phạm quy chế hoặc gian lận">
                        🛑 Hủy 0đ
                      </button>
                      <button type="button" class="btn btn-danger btn-sm" style="padding:0.25rem 0.5rem;font-size:0.75rem;" onclick="adminDeleteSingleResult('${escapeHtml(r.id || r.key || '')}', '${escapeHtml(code)}', '${escapeHtml(r.className || '')}', '${escapeHtml(r.name || '')}')" title="Xóa vĩnh viễn bài làm này khỏi bảng điểm và thống kê">
                        🗑️ Xóa
                      </button>
                    </div>
                  </td>
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
    csv += 'Họ Tên,Lớp,Mã Đề,Điểm /10,Số Câu Đúng,Tổng Câu,Thời Gian (giây),Số Lần Rời Trang,Thời Gian Nộp,Trạng Thái,Lý Do Vi Phạm\n';
    results.forEach(r => {
      csv += `"${r.name}","${r.className}","${r.quizId}","${r.totalScore}","${r.correct}","${r.total}","${r.timeTakenSeconds}","${r.tabSwitches}","${r.submittedAt}","${r.isCheated ? 'GIAN LẬN' : 'HỢP LỆ'}","${r.cheatReason || ''}"\n`;
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

/* ================= 🛡️ ADMIN SUBMISSION & ANTI-CHEAT HANDLERS ================= */
async function adminResetStudentRetake(resultId, quizId, className, name) {
  if (!TeacherAuth.isLoggedIn()) {
    openTeacherAuthModal();
    return;
  }

  const confirmMsg = `🔄 XÁC NHẬN CHO HỌC SINH THI LẠI?\n\n- Học sinh: ${name} (Lớp ${className || 'N/A'})\n- Mã đề: ${quizId}\n\nHệ thống sẽ xóa bài làm cũ và mở khóa quyền nộp bài để học sinh này có thể vào thi lại từ đầu.`;
  if (!confirm(confirmMsg)) return;

  showToast('⏳ Đang mở khóa bài thi cho học sinh...', 'info');
  await StorageEngine.deleteResult(resultId, quizId, className, name);
  showToast(`✅ Đã reset bài thi! Học sinh ${name} có thể làm lại đề ${quizId}.`, 'success');
  SoundEngine.playCorrect();

  await loadTeacherResults();
  if (typeof renderTeacherAnalyticsDashboard === 'function') {
    renderTeacherAnalyticsDashboard();
  }
}

async function adminPenalizeCheater(resultId, quizId, name) {
  if (!TeacherAuth.isLoggedIn()) {
    openTeacherAuthModal();
    return;
  }

  const reason = prompt(`🛑 XÁC NHẬN HỦY ĐIỂM DO GIAN LẬN:\n\nNhập lý do xử lý vi phạm cho học sinh "${name}":`, 'Rời màn hình thi / Vi phạm quy chế');
  if (reason === null) return; // Người dùng bấm Hủy

  showToast('⏳ Đang cập nhật điểm phạt...', 'info');
  await StorageEngine.penalizeCheatedSubmission(resultId, reason);
  showToast(`🛑 Đã đặt 0 điểm (Gian lận) cho bài thi của ${name}.`, 'warn');
  SoundEngine.playWarning();

  await loadTeacherResults();
  if (typeof renderTeacherAnalyticsDashboard === 'function') {
    renderTeacherAnalyticsDashboard();
  }
}

async function adminDeleteSingleResult(resultId, quizId, className, name) {
  if (!TeacherAuth.isLoggedIn()) {
    openTeacherAuthModal();
    return;
  }

  const confirmMsg = `🗑️ XÁC NHẬN XÓA BÀI NỘP NÀY?\n\n- Học sinh: ${name} (Lớp ${className || 'N/A'})\n- Mã đề: ${quizId}\n\nBài nộp sẽ bị xóa vĩnh viễn khỏi bảng điểm và thống kê.`;
  if (!confirm(confirmMsg)) return;

  showToast('⏳ Đang xóa bài nộp...', 'info');
  await StorageEngine.deleteResult(resultId, quizId, className, name);
  showToast(`🗑️ Đã xóa bài nộp của ${name} khỏi hệ thống!`, 'success');
  SoundEngine.playClick();

  await loadTeacherResults();
  if (typeof renderTeacherAnalyticsDashboard === 'function') {
    renderTeacherAnalyticsDashboard();
  }
}

async function adminBulkPenalizeCheaters(quizCode) {
  if (!TeacherAuth.isLoggedIn()) {
    openTeacherAuthModal();
    return;
  }

  const results = await StorageEngine.getResultsByQuiz(quizCode);
  const cheaters = results.filter(r => (r.tabSwitches > 0 || r.isCheated) && ((r.totalScore || 0) > 0));

  if (!cheaters.length) {
    showToast('✨ Không có bài thi nào có cảnh báo rời màn hình cần xử lý.', 'info');
    return;
  }

  const confirmMsg = `⚠️ PHÁT HIỆN ${cheaters.length} BÀI THI CÓ CẢNH BÁO RỜI MÀN HÌNH!\n\nBạn có chắc chắn muốn HỦY ĐIỂM (0 điểm) cho tất cả ${cheaters.length} học sinh này không?`;
  if (!confirm(confirmMsg)) return;

  showToast(`⏳ Đang xử lý ${cheaters.length} bài thi vi phạm...`, 'info');
  for (const r of cheaters) {
    await StorageEngine.penalizeCheatedSubmission(r.id || r.key, `Rời màn hình ${r.tabSwitches} lần trong lúc làm bài`);
  }

  showToast(`🛑 Đã hủy điểm thành công ${cheaters.length} bài thi gian lận!`, 'success');
  SoundEngine.playWarning();

  await loadTeacherResults();
  if (typeof renderTeacherAnalyticsDashboard === 'function') {
    renderTeacherAnalyticsDashboard();
  }
}

async function adminResetAllResultsForQuiz(quizCode) {
  if (!TeacherAuth.isLoggedIn()) {
    openTeacherAuthModal();
    return;
  }

  const confirmMsg = `🔄 BẠN CÓ CHẮC MUỐN CHO CẢ LỚP THI LẠI ĐỀ NÀY?\n\n- Mã đề: ${quizCode}\n\nToàn bộ lượt nộp bài của đề ${quizCode} sẽ bị xóa và mở khóa cho tất cả học sinh làm lại từ đầu.`;
  if (!confirm(confirmMsg)) return;

  showToast('⏳ Đang reset toàn bộ kết quả đề thi...', 'info');
  await StorageEngine.clearResultsByQuiz(quizCode);
  showToast(`✅ Đã reset toàn bộ lượt nộp đề ${quizCode}!`, 'success');
  SoundEngine.playCorrect();

  await loadTeacherResults();
  if (typeof renderTeacherAnalyticsDashboard === 'function') {
    renderTeacherAnalyticsDashboard();
  }
}

async function handleAdminClearAllTestResults() {
  if (!TeacherAuth.isLoggedIn()) {
    openTeacherAuthModal();
    return;
  }

  const confirmMsg = `⚠️ CẢNH BÁO: BẠN CÓ CHẮC CHẮN MUỐN DỌN SẠCH TOÀN BỘ BÀI NỘP TEST / THỬ NGHIỆM?\n\n- Toàn bộ kết quả bài thi cũ và số liệu biểu đồ sẽ được đưa về 0 để sẵn sàng cho kỳ thi mới.\n- Danh sách đề thi và danh bạ học sinh KHÔNG bị ảnh hưởng.`;
  if (!confirm(confirmMsg)) return;

  showToast('🧹 Đang dọn dẹp sạch toàn bộ dữ liệu bài nộp...', 'info');
  await StorageEngine.clearAllTestResults();
  showToast('🎉 Đã dọn sạch toàn bộ kết quả bài nộp thử nghiệm!', 'success');
  SoundEngine.playFanfare();

  if (typeof renderTeacherAnalyticsDashboard === 'function') {
    renderTeacherAnalyticsDashboard();
  }
  const resultsWrap = document.getElementById('teacherResultsTableWrap');
  if (resultsWrap) resultsWrap.innerHTML = '';
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
  document.body.classList.remove('in-exam-session');
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

/* ================= 🏆 EXPANDED WEEKLY HALL OF FAME & REWARDS ENGINE ================= */
AppState.weeklyPeriod = 'current'; // 'current' | 'previous' | 'all'
AppState.weeklyClassFilter = 'all';
AppState.leaderboardSubTab = 'individual'; // 'individual' | 'class' | 'shop'

function setWeeklyPeriod(period) {
  AppState.weeklyPeriod = period;
  ['current', 'previous', 'all'].forEach(p => {
    const btn = document.getElementById('periodBtn_' + p);
    if (btn) btn.classList.toggle('active', p === period);
  });
  SoundEngine.playClick();
  renderGamificationTab();
}

function filterWeeklyLeaderboardByClass(className) {
  AppState.weeklyClassFilter = className;
  SoundEngine.playClick();
  renderGamificationTab();
}

function switchLeaderboardSubTab(tab) {
  AppState.leaderboardSubTab = tab;
  ['individual', 'class', 'shop'].forEach(t => {
    const btn = document.getElementById('tabBtnLeaderboard' + capitalize(t));
    if (btn) btn.classList.toggle('active', t === tab);
    const content = document.getElementById('subTabContent' + capitalize(t));
    if (content) content.classList.toggle('hidden', t !== tab);
  });
  SoundEngine.playClick();
  if (tab === 'shop') renderRewardShop();
}

async function renderGamificationTab() {
  const profile = GamificationEngine.getUserProfile();
  const levelInfo = GamificationEngine.getLevelInfo(profile.xp || 0);
  const currentLeague = WeeklyHonorEngine.getLeague(profile.xp || 0);

  // 1. Cập nhật hồ sơ cá nhân
  const nameEl = document.getElementById('gamifyUserName');
  const levelNameEl = document.getElementById('gamifyLevelName');
  const userLeagueBadge = document.getElementById('gamifyUserLeagueBadge');
  const avatarEl = document.getElementById('gamifyUserAvatar');
  const xpTextEl = document.getElementById('gamifyXpText');
  const xpProgEl = document.getElementById('gamifyXpProgress');

  if (nameEl) {
    const titleObj = typeof SHOP_ITEMS !== 'undefined' ? SHOP_ITEMS.find(it => it.id === profile.equippedTitle) : null;
    const titleHtml = titleObj ? ` <span class="equipped-title-badge" style="border-color:${titleObj.titleColor};color:${titleObj.titleColor};">${titleObj.titleText}</span>` : '';
    nameEl.innerHTML = `${escapeHtml(profile.name || 'Học Sinh')}${titleHtml}`;
  }
  if (levelNameEl) levelNameEl.textContent = `Cấp ${levelInfo.level}: ${levelInfo.name}`;
  if (userLeagueBadge) {
    userLeagueBadge.innerHTML = `${currentLeague.icon} ${currentLeague.name}`;
    userLeagueBadge.style.color = currentLeague.color;
    userLeagueBadge.style.borderColor = currentLeague.border;
  }
  if (avatarEl) {
    avatarEl.textContent = profile.avatar || AppState.studentAvatar || '🦊';
    avatarEl.className = 'avatar-with-frame ' + (profile.frame || 'frame-gold');
  }
  if (xpTextEl) xpTextEl.textContent = `${levelInfo.currentXp} / ${levelInfo.nextXp} XP (${levelInfo.progress}%)`;
  if (xpProgEl) xpProgEl.style.width = `${levelInfo.progress}%`;

  const totalExamsEl = document.getElementById('statTotalExams');
  const perfScoresEl = document.getElementById('statPerfectScores');
  const perfStreakEl = document.getElementById('statPerfectStreak');
  const streakEl = document.getElementById('statCurrentStreak');

  if (totalExamsEl) totalExamsEl.textContent = profile.examsCount || 0;
  if (perfScoresEl) perfScoresEl.textContent = profile.perfectCount || 0;
  if (perfStreakEl) perfStreakEl.textContent = `${profile.perfectStreak || 0} 🔥`;
  if (streakEl) streakEl.textContent = `${profile.streak || 1} Ngày ⚡`;

  // 2. Tính toán chu kỳ tuần
  let weekRange = null;
  let offset = 0;
  if (AppState.weeklyPeriod === 'current') {
    offset = 0;
    weekRange = WeeklyHonorEngine.getWeekRange(0);
  } else if (AppState.weeklyPeriod === 'previous') {
    offset = 1;
    weekRange = WeeklyHonorEngine.getWeekRange(1);
  }

  const periodTitleEl = document.getElementById('weeklyHeaderPeriodTitle');
  const periodSubEl = document.getElementById('weeklyHeaderDateSubtitle');
  if (periodTitleEl) {
    periodTitleEl.textContent = AppState.weeklyPeriod === 'all' 
      ? 'Bảng Vàng Danh Dự Toàn Thời Gian' 
      : (AppState.weeklyPeriod === 'previous' ? 'Bảng Vàng Vinh Danh Tuần Trước' : 'Bảng Vàng Vinh Danh Tuần Này');
  }
  if (periodSubEl && weekRange) {
    periodSubEl.textContent = weekRange.label;
  } else if (periodSubEl) {
    periodSubEl.textContent = 'Tổng hợp toàn bộ thành tích từ trước đến nay';
  }

  // 3. Tự động dọn dẹp các bản ghi trùng lặp và lấy dữ liệu thật từ Storage
  await sanitizeDuplicateSubmissions();
  const roster = await StorageEngine.getStudentRoster();
  const allResults = await StorageEngine.getAllResults();
  const availableQuizzes = await StorageEngine.getAllQuizzes();

  // Bảng xếp hạng tuần
  const rankings = WeeklyHonorEngine.calculateWeeklyLeaderboard(
    allResults,
    weekRange,
    roster,
    availableQuizzes,
    AppState.weeklyClassFilter
  );

  // Tính tuần trước để so sánh tiến độ vượt bậc
  const prevWeekRange = WeeklyHonorEngine.getWeekRange(offset + 1);
  const prevRankings = WeeklyHonorEngine.calculateWeeklyLeaderboard(
    allResults,
    prevWeekRange,
    roster,
    availableQuizzes,
    AppState.weeklyClassFilter
  );

  // 6 Hạng mục vinh danh đặc biệt
  const specialHonors = WeeklyHonorEngine.calculateSpecialHonors(rankings, prevRankings);

  // Thống kê cá nhân học sinh trong tuần
  const currentStudentStats = rankings.find(s => s.name.trim().toLowerCase() === (profile.name || '').trim().toLowerCase()) || null;

  // Cập nhật League Pill
  const userPill = document.getElementById('currentUserLeaguePill');
  if (userPill) {
    const sLeague = currentStudentStats ? currentStudentStats.league : currentLeague;
    userPill.innerHTML = `${sLeague.icon} <span>${sLeague.name}</span>`;
    userPill.style.borderColor = sLeague.border;
    userPill.style.color = sLeague.color;
  }

  // 4. Render các thành phần
  renderWeeklyQuests(profile, currentStudentStats);
  renderSpecialHonors(specialHonors);
  renderWeeklyPodium(rankings);
  renderWeeklyHallOfFameTable(rankings);

  // Đại chiến giữa các lớp
  const classBattle = WeeklyHonorEngine.calculateClassBattle(rankings);
  renderClassBattle(classBattle);

  // Cửa hàng đổi thưởng
  renderRewardShop();

  // Huy hiệu
  renderBadgesShowcase(profile);

  // Kỷ luật & nề nếp
  renderStudentDisciplinaryStatus();
}

/* 🎯 RENDER NHIỆM VỤ TUẦN */
function renderWeeklyQuests(profile, studentWeeklyStat) {
  const container = document.getElementById('weeklyQuestsGrid');
  if (!container) return;

  const quests = WeeklyHonorEngine.getWeeklyQuests(profile, studentWeeklyStat);
  container.innerHTML = quests.map(q => {
    const pct = Math.round((q.current / q.target) * 100);
    return `
      <div class="quest-item-card ${q.isCompleted ? 'completed' : ''}">
        <div>
          <div class="quest-header">
            <div class="quest-icon">${q.icon}</div>
            <div style="flex:1;">
              <div style="font-weight:800;font-size:0.95rem;color:var(--text-primary);">${escapeHtml(q.title)}</div>
              <div style="font-size:0.8rem;color:var(--text-secondary);">${escapeHtml(q.desc)}</div>
            </div>
          </div>
          <div class="quest-progress-wrap">
            <div class="quest-progress-fill" style="width:${pct}%;"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:0.75rem;font-weight:800;color:var(--text-secondary);">
            <span>Tiến độ: ${q.current}/${q.target}</span>
            <span style="color:var(--indigo);">+${q.rewardXp} XP</span>
          </div>
        </div>
        <div style="margin-top:0.75rem;text-align:right;">
          ${q.isCompleted 
            ? '<span class="badge-status badge-pass" style="font-size:0.75rem;">✅ ĐÃ HOÀN THÀNH</span>'
            : '<span style="font-size:0.75rem;font-weight:800;color:var(--text-muted);">Đang thực hiện...</span>'}
        </div>
      </div>
    `;
  }).join('');
}

/* 🌟 RENDER 6 HẠNG MỤC VINH DANH ĐẶC BIỆT */
function renderSpecialHonors(honors) {
  const container = document.getElementById('specialHonorsGrid');
  if (!container) return;

  const items = [
    {
      title: 'Thủ Khoa Tuần',
      tag: 'Điểm & XP Cao Nhất',
      icon: '👑',
      cardClass: 'card-titan',
      tagColor: '#b45309',
      student: honors.titan,
      metric: honors.titan ? `${honors.titan.honorXp} XP · ${honors.titan.avgScore}/10đ` : 'Chưa có'
    },
    {
      title: 'Ngôi Sao Tiến Bộ',
      tag: 'Tăng Điểm Vượt Bậc',
      icon: '🧗',
      cardClass: 'card-improved',
      tagColor: '#15803d',
      student: honors.mostImproved,
      metric: honors.mostImproved ? `+${honors.mostImproved.scoreDiff} điểm so tuần trước` : 'Chưa có'
    },
    {
      title: 'Thần Tốc Toán Học',
      tag: 'Nộp Nhanh & Điểm Giỏi',
      icon: '⚡',
      cardClass: 'card-speed',
      tagColor: '#0369a1',
      student: honors.speedMaster,
      metric: honors.speedMaster ? `Đạt ${honors.speedMaster.avgScore}đ · Tốc độ chớp nhoáng` : 'Chưa có'
    },
    {
      title: 'Chiến Binh Bất Bại',
      tag: 'Chuỗi 10 Dài Nhất',
      icon: '🔥',
      cardClass: 'card-streak',
      tagColor: '#b91c1c',
      student: honors.streakMaster,
      metric: honors.streakMaster ? `Chuỗi ${honors.streakMaster.maxPerfectStreak} bài 10 tuyệt đối` : 'Chưa có'
    },
    {
      title: 'Ong Vàng Chăm Chỉ',
      tag: 'Giải Nhiều Đề Nhất',
      icon: '📚',
      cardClass: 'card-dedicated',
      tagColor: '#6d28d9',
      student: honors.dedicated,
      metric: honors.dedicated ? `Đã nộp ${honors.dedicated.submissionsCount} đề thi` : 'Chưa có'
    },
    {
      title: 'Biểu Tượng Chính Trực',
      tag: 'Kỷ Luật Tuyệt Đối',
      icon: '🕊️',
      cardClass: 'card-honest',
      tagColor: '#0e7490',
      student: honors.honestParagon,
      metric: honors.honestParagon ? `100% 0 vi phạm tab` : 'Chưa có'
    }
  ];

  container.innerHTML = items.map(item => {
    const st = item.student;
    return `
      <div class="honor-badge-card ${item.cardClass}">
        <div class="honor-card-icon">${item.icon}</div>
        <div class="honor-card-info">
          <div class="honor-card-tag" style="color:${item.tagColor};">${item.tag}</div>
          <div style="font-weight:900;font-size:1.05rem;color:var(--text-primary);margin-bottom:0.15rem;">
            ${item.title}: <strong>${st ? escapeHtml(st.name) : 'Đang chờ đón'}</strong>
          </div>
          <div style="font-size:0.8rem;color:var(--text-secondary);font-weight:700;">
            ${st ? `Lớp ${escapeHtml(st.className)} · ${item.metric}` : 'Hãy là người đầu tiên đạt danh hiệu này!'}
          </div>
        </div>
        ${st ? `
          <button type="button" class="btn btn-secondary btn-sm" onclick="openHonorCertificateForStudent('${escapeHtml(st.name)}', '${item.title}')" title="Xem & In Bằng Khen" style="padding:0.35rem 0.6rem;font-size:0.75rem;border-radius:var(--radius-full);">
            📜 Bằng Khen
          </button>
        ` : ''}
      </div>
    `;
  }).join('');
}

/* 👑 RENDER BỤC VINH QUANG 3D */
function renderWeeklyPodium(rankings) {
  const podiumWrap = document.getElementById('hallOfFamePodiumWrap');
  if (!podiumWrap) return;

  const hasScoredStudent = rankings && rankings.some(s => (s.honorXp || 0) > 0 || (s.submissionsCount || 0) > 0);
  if (!hasScoredStudent) {
    podiumWrap.innerHTML = `
      <div style="text-align:center;padding:2.5rem 1.5rem;background:var(--bg-card);border-radius:var(--radius-lg);border:2px dashed var(--border-color);margin:1rem 0;">
        <div style="font-size:3rem;margin-bottom:0.5rem;">🌱</div>
        <div style="font-size:1.15rem;font-weight:900;color:var(--text-primary);margin-bottom:0.25rem;">Bảng Vàng Đang Khởi Động — Chờ Đón Quán Quân!</div>
        <div style="font-size:0.875rem;font-weight:700;color:var(--text-secondary);max-width:480px;margin:0 auto;">
          Điểm số Bảng Vàng tuần này đang ở trạng thái mới (0 XP). Hãy là học sinh đầu tiên hoàn thành bài thi để bước lên Bục Vinh Quang! 🏆
        </div>
      </div>
    `;
    return;
  }

  const top1 = rankings[0] || { name: 'Quán Quân', className: '10', avatar: '🦊', honorXp: 0, avgScore: 0, maxPerfectStreak: 0 };
  const top2 = rankings[1] || { name: 'Á Quân', className: '10', avatar: '🦉', honorXp: 0, avgScore: 0, maxPerfectStreak: 0 };
  const top3 = rankings[2] || { name: 'Quý Quân', className: '10', avatar: '🦁', honorXp: 0, avgScore: 0, maxPerfectStreak: 0 };

  podiumWrap.innerHTML = `
    <div class="podium-wrapper">
      <!-- #2 Silver -->
      <div class="podium-col rank-2">
        <div class="podium-avatar-wrap">
          <div class="podium-avatar avatar-with-frame ${top2.frame || 'frame-gold'}">${top2.avatar || '🦉'}</div>
        </div>
        <div class="podium-name">${escapeHtml(top2.name)}</div>
        <div class="podium-class">Lớp ${escapeHtml(top2.className)}</div>
        <div class="podium-xp-tag">⭐ ${top2.honorXp || 0} XP</div>
        <div class="podium-step">2</div>
      </div>

      <!-- #1 Gold -->
      <div class="podium-col rank-1">
        <div class="podium-crown">👑</div>
        <div class="podium-avatar-wrap">
          <div class="podium-avatar avatar-with-frame ${top1.frame || 'frame-gold'}">${top1.avatar || '🦊'}</div>
        </div>
        <div class="podium-name" style="font-size:1.15rem;color:#b45309;">${escapeHtml(top1.name)}</div>
        <div class="podium-class">Lớp ${escapeHtml(top1.className)}</div>
        <div class="podium-xp-tag" style="background:#fef3c7;color:#b45309;font-size:0.95rem;">⭐ ${top1.honorXp || 0} XP</div>
        <div class="podium-step">1</div>
      </div>

      <!-- #3 Bronze -->
      <div class="podium-col rank-3">
        <div class="podium-avatar-wrap">
          <div class="podium-avatar avatar-with-frame ${top3.frame || ''}">${top3.avatar || '🦁'}</div>
        </div>
        <div class="podium-name">${escapeHtml(top3.name)}</div>
        <div class="podium-class">Lớp ${escapeHtml(top3.className)}</div>
        <div class="podium-xp-tag">⭐ ${top3.honorXp || 0} XP</div>
        <div class="podium-step">3</div>
      </div>
    </div>
  `;
}

/* 📋 RENDER BẢNG TỔNG SẮP VINH DANH HÀNG TUẦN */
function renderWeeklyHallOfFameTable(rankings) {
  const listWrap = document.getElementById('hallOfFameListWrap');
  if (!listWrap) return;

  const hasSubmissions = rankings && rankings.some(s => (s.honorXp || 0) > 0 || (s.submissionsCount || 0) > 0);
  if (!hasSubmissions) {
    listWrap.innerHTML = `
      <div style="text-align:center;padding:2.5rem;color:var(--text-muted);">
        <div style="font-size:3rem;margin-bottom:0.5rem;">📭</div>
        <div style="font-size:1.1rem;font-weight:800;color:var(--text-primary);">Chưa có kết quả bài thi nào trong khoảng thời gian này!</div>
        <div style="font-size:0.875rem;font-weight:600;margin-top:0.25rem;">Điểm Bảng Vàng đã được reset sạch sẽ. Học sinh hoàn thành bài thi sẽ tự động xuất hiện trên Bảng Vàng theo thời gian thực!</div>
      </div>
    `;
    return;
  }

  listWrap.innerHTML = `
    <div class="table-responsive" style="margin-top:0.5rem;">
      <table>
        <thead>
          <tr>
            <th style="width:60px;">Hạng</th>
            <th>Chiến Binh</th>
            <th>Lớp</th>
            <th>Hạng Đấu</th>
            <th>Bài Tuần</th>
            <th>Điểm 10</th>
            <th>Chuỗi 10 🔥</th>
            <th>Tiến Độ Bài</th>
            <th>Điểm Vinh Danh</th>
            <th style="text-align:center;">Bằng Khen</th>
          </tr>
        </thead>
        <tbody>
          ${rankings.map(s => {
            const lg = s.league || WeeklyHonorEngine.getLeague(s.honorXp);
            return `
              <tr style="${s.rank <= 3 ? 'background:rgba(245, 158, 11, 0.04);' : ''}">
                <td>
                  <strong style="font-size:1.05rem;color:${s.rank === 1 ? '#d97706' : (s.rank === 2 ? '#64748b' : (s.rank === 3 ? '#b45309' : 'var(--text-primary)'))};">
                    ${s.rank === 1 ? '🥇 1' : (s.rank === 2 ? '🥈 2' : (s.rank === 3 ? '🥉 3' : '#' + s.rank))}
                  </strong>
                </td>
                <td>
                  <div style="display:flex;align-items:center;gap:0.6rem;">
                    <span style="font-size:1.5rem;">${s.avatar || '🦊'}</span>
                    <div>
                      <strong style="color:var(--text-primary);font-size:0.95rem;">${escapeHtml(s.name)}</strong>
                      ${s.honorsBadges && s.honorsBadges.length ? `
                        <div style="display:flex;gap:0.25rem;flex-wrap:wrap;margin-top:2px;">
                          ${s.honorsBadges.map(b => `<span style="font-size:0.7rem;background:var(--bg-tertiary);padding:1px 5px;border-radius:4px;font-weight:800;">${b}</span>`).join('')}
                        </div>
                      ` : ''}
                    </div>
                  </div>
                </td>
                <td><span class="badge-status badge-pass">Lớp ${escapeHtml(s.className)}</span></td>
                <td>
                  <span class="user-league-pill" style="padding:0.2rem 0.6rem;font-size:0.75rem;border-color:${lg.border};color:${lg.color};">
                    ${lg.icon} ${lg.name}
                  </span>
                </td>
                <td><strong>${s.submissionsCount}</strong> bài</td>
                <td><strong style="color:var(--primary);">${s.perfectScores}</strong></td>
                <td><strong style="color:#ef4444;">${s.maxPerfectStreak ? s.maxPerfectStreak + ' liên tiếp 🔥' : '—'}</strong></td>
                <td>
                  <div style="display:flex;align-items:center;gap:0.35rem;">
                    <div style="width:50px;height:6px;background:var(--bg-tertiary);border-radius:3px;overflow:hidden;">
                      <div style="width:${s.completionRate || 0}%;height:100%;background:var(--primary);"></div>
                    </div>
                    <span style="font-size:0.75rem;font-weight:800;">${s.completionRate || 0}%</span>
                  </div>
                <td>
                  <div style="display:flex;align-items:center;gap:0.35rem;flex-wrap:wrap;">
                    <strong style="color:var(--indigo);font-size:1.05rem;">⭐ ${s.honorXp} XP</strong>
                    ${s.penaltiesCount > 0 && s.penaltiesTotalXp < 0 ? `
                      <span class="badge-penalty-count" title="${s.penaltiesCount} lần ghi nhận kỷ luật tuần này (${(s.penaltiesList || []).map(p => p.reason).join('; ')})">
                        ⚠️ ${s.penaltiesTotalXp} XP
                      </span>
                    ` : ''}
                  </div>
                </td>
                  <button type="button" class="btn btn-secondary btn-sm" onclick="openHonorCertificateForStudent('${escapeHtml(s.name)}', '${s.rank === 1 ? 'QUÁN QUÂN TUẦN' : 'CHIẾN BINH XUẤT SẮC'}')" style="padding:0.3rem 0.6rem;font-size:0.8rem;border-radius:var(--radius-full);" title="Xem Bằng Khen">
                    📜 In
                  </button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

/* 🏫 RENDER ĐẠI CHIẾN GIỮA CÁC LỚP */
function renderClassBattle(classBattle) {
  const container = document.getElementById('classBattleContainer');
  if (!container) return;

  const hasActivity = classBattle && classBattle.some(c => (c.totalHonorXp || 0) > 0 || (c.totalSubmissions || 0) > 0);
  if (!hasActivity) {
    container.innerHTML = `
      <div style="text-align:center;padding:2.5rem 1.5rem;color:var(--text-muted);background:var(--bg-card);border-radius:var(--radius-lg);border:2px dashed var(--border-color);margin:1rem 0;">
        <div style="font-size:3rem;margin-bottom:0.5rem;">🏫</div>
        <div style="font-size:1.1rem;font-weight:800;color:var(--text-primary);">Chưa có dữ liệu thi đua giữa các lớp!</div>
        <div style="font-size:0.875rem;font-weight:600;margin-top:0.25rem;">Khi học sinh hoàn thành bài thi, điểm tập thể của các lớp sẽ tự động cập nhật tại đây.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="class-battle-grid">
      ${classBattle.map(c => `
        <div class="class-battle-card ${c.rank === 1 ? 'rank-1' : ''}">
          <div style="font-size:2.5rem;margin-bottom:0.3rem;">
            ${c.rank === 1 ? '🏆' : (c.rank === 2 ? '🥈' : (c.rank === 3 ? '🥉' : '🏫'))}
          </div>
          <div style="font-size:1.35rem;font-weight:900;color:var(--text-primary);margin-bottom:0.25rem;">
            Lớp ${escapeHtml(c.className)}
          </div>
          <div style="display:inline-block;padding:0.25rem 0.8rem;background:var(--bg-card);border-radius:var(--radius-full);font-size:0.8rem;font-weight:800;color:var(--indigo);margin-bottom:1rem;">
            Hạng #${c.rank} Toàn Trường
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;font-size:0.85rem;text-align:left;background:var(--bg-card);padding:0.85rem;border-radius:var(--radius-md);border:1px solid var(--border-color);">
            <div>Thành viên: <strong>${c.studentsCount} học sinh</strong></div>
            <div>Bài nộp: <strong>${c.totalSubmissions} bài</strong></div>
            <div>Điểm 10: <strong style="color:var(--primary);">${c.perfectCount} lần</strong></div>
            <div>Điểm TB lớp: <strong style="color:var(--amber);">${c.classAvgScore}/10đ</strong></div>
          </div>
          <div style="margin-top:1rem;font-size:1.15rem;font-weight:900;color:var(--indigo);">
            ⭐ ${c.totalHonorXp} Tổng XP
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

/* ================= 🎁 REWARD SHOP & CATEGORIES CONTROLLER ================= */
let activeShopCategory = 'perks';
let isWheelSpinning = false;
let wheelCurrentRotation = 0;

function switchShopCategory(cat) {
  activeShopCategory = cat;

  // Toggle active category button
  ['perks', 'boosters', 'cosmetics', 'wheel', 'wallet'].forEach(c => {
    const btn = document.getElementById(`btnShopCat_${c}`);
    if (btn) btn.classList.toggle('active', c === cat);
  });

  const standardWrap = document.getElementById('shopStandardItemsWrap');
  const wheelWrap = document.getElementById('shopLuckyWheelWrap');
  const walletWrap = document.getElementById('shopStudentWalletWrap');

  if (standardWrap) standardWrap.classList.toggle('hidden', cat === 'wheel' || cat === 'wallet');
  if (wheelWrap) wheelWrap.classList.toggle('hidden', cat !== 'wheel');
  if (walletWrap) walletWrap.classList.toggle('hidden', cat !== 'wallet');

  if (cat === 'wheel') {
    initLuckyWheelCanvas();
  } else if (cat === 'wallet') {
    renderStudentWallet();
  } else {
    renderShopCategoryItems(cat);
  }
}

function renderRewardShop() {
  const profile = GamificationEngine.getUserProfile();
  const xpBadge = document.getElementById('shopUserXpVal');
  if (xpBadge) xpBadge.textContent = `${profile.xp || 0} XP`;

  // Check 2x booster
  const boosterPill = document.getElementById('shopActiveBoosterPill');
  if (boosterPill) {
    if (profile.boosters && profile.boosters.xp2xUntil && profile.boosters.xp2xUntil > Date.now()) {
      const remainingHours = Math.ceil((profile.boosters.xp2xUntil - Date.now()) / (1000 * 60 * 60));
      boosterPill.classList.remove('hidden');
      boosterPill.innerHTML = `⚡ 2x XP: Còn ${remainingHours}h`;
    } else {
      boosterPill.classList.add('hidden');
    }
  }

  switchShopCategory(activeShopCategory || 'perks');
}

function renderShopCategoryItems(category) {
  const container = document.getElementById('shopItemsGrid');
  if (!container) return;

  const profile = GamificationEngine.getUserProfile();
  const userXp = profile.xp || 0;

  // Filter items: if 'cosmetics', include both 'titles' and 'frames'
  let items = [];
  if (category === 'cosmetics') {
    items = SHOP_ITEMS.filter(it => it.category === 'titles' || it.category === 'frames');
  } else {
    items = SHOP_ITEMS.filter(it => it.category === category);
  }

  container.innerHTML = items.map(item => {
    // Check ownership
    const isTitle = item.type === 'title';
    const isFrame = item.type === 'frame';
    const isOwned = (isTitle && (profile.unlockedTitles || []).includes(item.id)) ||
                    (isFrame && (profile.unlockedFrames || []).includes(item.cssClass)) ||
                    (item.type === 'booster' && item.id === 'booster_deep_hint' && profile.boosters?.hasVdcHints);
    const isEquipped = (isTitle && profile.equippedTitle === item.id) ||
                       (isFrame && profile.frame === item.cssClass);

    // Calculate effective price (for milk tea with discount)
    let effectivePrice = item.priceXp;
    let discNote = '';
    if (item.id === 'perk_milk_tea') {
      const disc = (profile.vouchers || []).find(v => v.category === 'discount' && v.status === 'active');
      if (disc) {
        effectivePrice = Math.max(10, item.priceXp - disc.value);
        discNote = `<div style="font-size:0.75rem;color:#10b981;font-weight:800;margin-top:2px;">🎉 Áp dụng mã giảm -50 XP!</div>`;
      }
    }

    const canAfford = userXp >= effectivePrice;

    return `
      <div class="shop-item-card">
        <div>
          ${item.badgeText ? `
            <div style="text-align:right;">
              <span class="shop-badge-tag" style="background:#e0e7ff;color:var(--indigo);">${item.badgeText}</span>
            </div>
          ` : (item.category === 'perks' ? `
            <div style="text-align:right;">
              <span class="shop-badge-tag" style="background:#fef3c7;color:#b45309;">VOUCHER ĐỔI QUÀ 🎟️</span>
            </div>
          ` : '')}
          
          <div style="font-size:3rem;margin:0.25rem 0;">${item.icon}</div>
          <div style="font-weight:800;font-size:1.05rem;color:var(--text-primary);margin-bottom:0.3rem;">
            ${escapeHtml(item.name)}
          </div>
          <div style="font-size:0.8rem;color:var(--text-secondary);line-height:1.4;margin-bottom:0.75rem;">
            ${escapeHtml(item.desc)}
          </div>
        </div>

        <div>
          <div style="margin-bottom:0.6rem;">
            <div style="font-weight:900;font-size:1.15rem;color:var(--amber);">
              ⭐ ${effectivePrice} XP
              ${effectivePrice < item.priceXp ? `<span style="text-decoration:line-through;font-size:0.85rem;color:var(--text-muted);">${item.priceXp} XP</span>` : ''}
            </div>
            ${discNote}
          </div>

          ${isOwned ? (
            isTitle ? `
              <button type="button" class="btn ${isEquipped ? 'btn-secondary' : 'btn-primary'} btn-sm" onclick="handleEquipShopTitle('${item.id}')" style="width:100%;font-weight:800;">
                ${isEquipped ? '✅ Đang Đeo Danh Hiệu' : '⚡ Đeo Danh Hiệu Này'}
              </button>
            ` : (isFrame ? `
              <button type="button" class="btn ${isEquipped ? 'btn-secondary' : 'btn-primary'} btn-sm" onclick="equipShopItem('${item.id}', 'frame')" style="width:100%;font-weight:800;">
                ${isEquipped ? '✅ Đang Trang Bị Khung' : '⚡ Trang Bị Khung Này'}
              </button>
            ` : `
              <button type="button" class="btn btn-secondary btn-sm" disabled style="width:100%;font-weight:800;opacity:0.8;">
                ✓ Đã Kích Hoạt
              </button>
            `)
          ) : `
            <button type="button" class="btn btn-primary btn-sm" onclick="handleBuyShopItem('${item.id}')" ${!canAfford ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''} style="width:100%;font-weight:800;">
              ${item.category === 'perks' ? '🎟️ Đổi Voucher Ngay' : '🛒 Mở Khóa Ngay'}
            </button>
          `}
        </div>
      </div>
    `;
  }).join('');
}

function handleBuyShopItem(itemId) {
  const res = GamificationEngine.buyShopItem(itemId, AppState.selectedClass || '10');
  if (!res.success) {
    SoundEngine.playWarning ? SoundEngine.playWarning() : null;
    showToast(`⚠️ ${res.error}`, 'warn');
    return;
  }

  GamificationEngine.fireConfetti();
  SoundEngine.playFanfare ? SoundEngine.playFanfare() : null;
  showToast(res.message, 'success');

  renderGamificationTab();
}

function handleEquipShopTitle(titleId) {
  const profile = GamificationEngine.getUserProfile();
  if (profile.equippedTitle === titleId) {
    GamificationEngine.equipTitle('');
    showToast('Đã gỡ danh hiệu khỏi tên bạn.', 'info');
  } else {
    GamificationEngine.equipTitle(titleId);
    showToast('Đã trang bị danh hiệu trước tên bạn!', 'success');
  }
  renderGamificationTab();
}

function equipShopItem(itemId, itemType) {
  const item = SHOP_ITEMS.find(i => i.id === itemId);
  if (!item) return;

  const profile = GamificationEngine.getUserProfile();
  if (itemType === 'frame') {
    profile.frame = item.cssClass;
  }

  GamificationEngine.saveUserProfile(profile);
  SoundEngine.playClick ? SoundEngine.playClick() : null;
  showToast(`✨ Đã trang bị: ${item.name}!`, 'success');
  renderGamificationTab();
}

/* ================= 🎰 LUCKY WHEEL DRAWING & ANIMATION ================= */
function initLuckyWheelCanvas() {
  const canvas = document.getElementById('luckyWheelCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const items = typeof LUCKY_WHEEL_ITEMS !== 'undefined' ? LUCKY_WHEEL_ITEMS : [];
  if (items.length === 0) return;

  const width = canvas.width;
  const height = canvas.height;
  const center = width / 2;
  const radius = center - 6;
  const numSegments = items.length;
  const anglePerSegment = (2 * Math.PI) / numSegments;

  ctx.clearRect(0, 0, width, height);

  for (let i = 0; i < numSegments; i++) {
    const item = items[i];
    const startAngle = i * anglePerSegment;
    const endAngle = startAngle + anglePerSegment;

    // Draw slice
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.arc(center, center, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = item.color || '#6366f1';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw text & icon
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(startAngle + anglePerSegment / 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;
    ctx.fillText(`${item.icon} ${item.name.slice(0, 14)}`, radius - 18, 5);
    ctx.restore();
  }
}

function handleSpinLuckyWheel() {
  if (isWheelSpinning) return;

  const profile = GamificationEngine.getUserProfile();
  if ((profile.xp || 0) < 20) {
    SoundEngine.playWarning ? SoundEngine.playWarning() : null;
    showToast('⚠️ Bạn cần ít nhất 20 XP để quay vòng may mắn! Hãy hoàn thành thêm bài thi nhé.', 'warn');
    return;
  }

  const canvas = document.getElementById('luckyWheelCanvas');
  const btn = document.getElementById('btnSpinWheel');
  const banner = document.getElementById('luckyWheelResultBanner');
  if (!canvas || !btn) return;

  isWheelSpinning = true;
  btn.disabled = true;
  if (banner) banner.classList.add('hidden');

  // Trigger spin engine
  const result = GamificationEngine.spinLuckyWheel();
  if (!result.success) {
    isWheelSpinning = false;
    btn.disabled = false;
    showToast(result.error, 'warn');
    return;
  }

  // Calculate target rotation
  const items = typeof LUCKY_WHEEL_ITEMS !== 'undefined' ? LUCKY_WHEEL_ITEMS : [];
  const numSegments = items.length;
  const segmentDegrees = 360 / numSegments;
  const chosenIndex = result.rewardIndex;

  // Pointer is at the top (270 degrees in canvas coords where 0 is 3 o'clock)
  const targetOffset = 270 - (chosenIndex * segmentDegrees + segmentDegrees / 2);
  const extraSpins = 360 * 5;
  wheelCurrentRotation = wheelCurrentRotation + extraSpins + ((targetOffset - (wheelCurrentRotation % 360) + 360) % 360);

  canvas.style.transition = 'transform 4s cubic-bezier(0.15, 0.9, 0.2, 1)';
  canvas.style.transform = `rotate(${wheelCurrentRotation}deg)`;

  SoundEngine.playClick ? SoundEngine.playClick() : null;

  setTimeout(() => {
    isWheelSpinning = false;
    btn.disabled = false;

    GamificationEngine.fireConfetti();
    SoundEngine.playFanfare ? SoundEngine.playFanfare() : null;

    if (banner) {
      banner.classList.remove('hidden');
      const titleEl = document.getElementById('luckyWheelResultTitle');
      const descEl = document.getElementById('luckyWheelResultDesc');
      if (titleEl) titleEl.innerHTML = `🎉 Trúng: ${result.reward.icon} ${result.reward.name}!`;
      if (descEl) descEl.textContent = result.rewardDetail;
    }

    // Refresh UI
    const xpBadge = document.getElementById('shopUserXpVal');
    if (xpBadge) xpBadge.textContent = `${result.newXp} XP`;
    renderGamificationTab();
  }, 4200);
}

/* ================= 🎒 STUDENT WALLET & BACKPACK ================= */
function renderStudentWallet() {
  const container = document.getElementById('studentWalletContent');
  if (!container) return;

  const profile = GamificationEngine.getUserProfile();
  const vouchers = profile.vouchers || [];
  const inv = profile.inventory || [];
  const boosters = profile.boosters || {};

  const has2x = boosters.xp2xUntil && boosters.xp2xUntil > Date.now();
  const streakShieldCount = inv.filter(i => i === 'shield_freeze').length;

  container.innerHTML = `
    <!-- Top Active Boosters Overview -->
    <div style="background:var(--bg-tertiary);border-radius:var(--radius-lg);padding:1.25rem;border:1.5px solid var(--border-color);margin-bottom:1.5rem;">
      <h3 style="margin:0 0 0.75rem;font-size:1.15rem;color:var(--text-primary);display:flex;align-items:center;gap:0.4rem;">
        <span>⚡</span> Các Hiệu Ứng Bổ Trợ Đang Kích Hoạt
      </h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:0.75rem;">
        <div style="background:var(--bg-card);padding:0.85rem;border-radius:var(--radius-md);border:1.5px solid ${has2x ? 'var(--indigo)' : 'var(--border-color)'};">
          <div style="font-size:1.5rem;margin-bottom:0.25rem;">🌟</div>
          <div style="font-weight:800;color:var(--text-primary);">Thẻ Nhân Đôi XP (2x Booster)</div>
          <div style="font-size:0.8rem;color:${has2x ? 'var(--indigo)' : 'var(--text-muted)'};font-weight:700;margin-top:0.2rem;">
            ${has2x ? `Đang kích hoạt · Còn ${Math.ceil((boosters.xp2xUntil - Date.now()) / (1000 * 60 * 60))} giờ` : 'Chưa kích hoạt'}
          </div>
        </div>

        <div style="background:var(--bg-card);padding:0.85rem;border-radius:var(--radius-md);border:1.5px solid ${streakShieldCount > 0 ? '#0ea5e9' : 'var(--border-color)'};">
          <div style="font-size:1.5rem;margin-bottom:0.25rem;">🛡️</div>
          <div style="font-weight:800;color:var(--text-primary);">Bùa Hộ Mệnh Chuỗi Streak</div>
          <div style="font-size:0.8rem;color:${streakShieldCount > 0 ? '#0284c7' : 'var(--text-muted)'};font-weight:700;margin-top:0.2rem;">
            ${streakShieldCount > 0 ? `Đang sở hữu: ${streakShieldCount} bùa hộ mệnh` : 'Không có trong túi đồ'}
          </div>
        </div>

        <div style="background:var(--bg-card);padding:0.85rem;border-radius:var(--radius-md);border:1.5px solid ${boosters.hasVdcHints ? '#f59e0b' : 'var(--border-color)'};">
          <div style="font-size:1.5rem;margin-bottom:0.25rem;">💡</div>
          <div style="font-weight:800;color:var(--text-primary);">Mẹo Lời Giải VDC Điểm 10</div>
          <div style="font-size:0.8rem;color:${boosters.hasVdcHints ? '#b45309' : 'var(--text-muted)'};font-weight:700;margin-top:0.2rem;">
            ${boosters.hasVdcHints ? 'Đã mở khóa vĩnh viễn' : 'Chưa sở hữu'}
          </div>
        </div>
      </div>
    </div>

    <!-- Vouchers & Coupons List -->
    <div>
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;margin-bottom:1rem;">
        <h3 style="margin:0;font-size:1.15rem;color:var(--text-primary);display:flex;align-items:center;gap:0.4rem;">
          <span>🎟️</span> Kho Voucher & Phiếu Đổi Quà Của Bạn (${vouchers.length})
        </h3>
        <span style="font-size:0.8rem;color:var(--text-secondary);font-weight:600;">Xuất trình mã này cho Thầy Khiêm trong buổi học để nhận quà!</span>
      </div>

      ${vouchers.length === 0 ? `
        <div style="text-align:center;padding:2rem;color:var(--text-muted);border:2px dashed var(--border-color);border-radius:var(--radius-lg);">
          <div style="font-size:2.5rem;margin-bottom:0.4rem;">📭</div>
          <div style="font-weight:800;color:var(--text-primary);">Bạn chưa có Voucher nào trong túi đồ!</div>
          <div style="font-size:0.85rem;font-weight:600;margin-top:0.2rem;">Hãy tích lũy điểm XP từ bài thi để đổi Thẻ Miễn BTVN, Trà Sữa Thầy Khiêm hoặc quay thưởng nhé.</div>
        </div>
      ` : `
        <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(280px, 1fr));gap:1rem;">
          ${vouchers.map(v => {
            const isPending = v.status === 'pending';
            const isRedeemed = v.status === 'redeemed' || v.status === 'used';
            const isCancelled = v.status === 'cancelled';
            const isDiscount = v.category === 'discount';

            let statusPill = `<span class="badge-status badge-pass" style="font-size:0.75rem;">✅ ĐÃ SỬ DỤNG</span>`;
            if (isPending) {
              statusPill = `<span class="user-league-pill" style="padding:0.2rem 0.6rem;font-size:0.72rem;border-color:#f59e0b;color:#b45309;">⏳ CHỜ THẦY DUYỆT</span>`;
            } else if (isDiscount) {
              statusPill = `<span class="user-league-pill" style="padding:0.2rem 0.6rem;font-size:0.72rem;border-color:#8b5cf6;color:#7c3aed;">🎉 MÃ GIẢM GIÁ</span>`;
            } else if (isCancelled) {
              statusPill = `<span class="badge-status badge-fail" style="font-size:0.75rem;">❌ ĐÃ HOÀN ĐIỂM</span>`;
            }

            return `
              <div class="voucher-card">
                <div>
                  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.75rem;">
                    <div style="font-size:2.2rem;">${v.icon || '🎟️'}</div>
                    ${statusPill}
                  </div>
                  <div style="font-weight:900;font-size:1.05rem;color:var(--text-primary);margin-bottom:0.3rem;">
                    ${escapeHtml(v.name)}
                  </div>
                  <div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:0.85rem;line-height:1.4;">
                    ${escapeHtml(v.desc || '')}
                  </div>
                </div>

                <div style="border-top:1.5px dashed var(--border-color);padding-top:0.75rem;display:flex;justify-content:space-between;align-items:center;">
                  <div>
                    <div style="font-size:0.7rem;color:var(--text-secondary);font-weight:700;">MÃ SERIAL:</div>
                    <code class="voucher-serial-code" style="font-size:0.95rem;padding:2px 8px;">${escapeHtml(v.code)}</code>
                  </div>
                  <button type="button" class="btn btn-secondary btn-sm" onclick="navigator.clipboard.writeText('${v.code}'); showToast('📋 Đã sao chép mã voucher ${v.code}!', 'success');" style="padding:0.3rem 0.6rem;font-size:0.78rem;">
                    📋 Chép Mã
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    </div>
  `;
}

/* ================= 🎟️ TEACHER VOUCHER MANAGEMENT ================= */
async function renderTeacherVouchersManager(filter = 'all') {
  const wrap = document.getElementById('teacherVouchersTableWrap');
  if (!wrap) return;

  // Update filter buttons
  ['all', 'pending', 'redeemed'].forEach(f => {
    const btn = document.getElementById(`btnVoucherFilter_${f}`);
    if (btn) {
      btn.classList.toggle('active', f === filter);
      btn.classList.toggle('btn-primary', f === filter);
      btn.classList.toggle('btn-secondary', f !== filter);
    }
  });

  // Pull vouchers from storage & student profile
  let vouchers = StorageEngine.getAllVouchers() || [];

  // Sync any student profile vouchers not yet in storage
  const profile = GamificationEngine.getUserProfile();
  if (profile && Array.isArray(profile.vouchers)) {
    profile.vouchers.forEach(pv => {
      if (!vouchers.some(v => v.code === pv.code)) {
        vouchers.unshift(pv);
        StorageEngine.saveVoucher(pv);
      }
    });
  }

  // Filter
  if (filter === 'pending') {
    vouchers = vouchers.filter(v => v.status === 'pending');
  } else if (filter === 'redeemed') {
    vouchers = vouchers.filter(v => v.status === 'redeemed' || v.status === 'used');
  }

  if (vouchers.length === 0) {
    wrap.innerHTML = `
      <div style="text-align:center;padding:2.5rem 1rem;color:var(--text-muted);border:2px dashed var(--border-color);border-radius:var(--radius-lg);margin-top:1rem;">
        <div style="font-size:3rem;margin-bottom:0.5rem;">🎟️</div>
        <div style="font-size:1.1rem;font-weight:800;color:var(--text-primary);">Chưa có yêu cầu đổi thưởng nào!</div>
        <div style="font-size:0.875rem;font-weight:600;margin-top:0.25rem;">Khi học sinh dùng điểm XP đổi Voucher (Thẻ Trà Sữa, Miễn BTVN, Điểm cộng), yêu cầu sẽ xuất hiện tại đây để Thầy phê duyệt.</div>
      </div>
    `;
    return;
  }

  wrap.innerHTML = `
    <div class="table-responsive">
      <table>
        <thead>
          <tr>
            <th>Mã Serial</th>
            <th>Học Sinh</th>
            <th>Lớp</th>
            <th>Phần Thưởng</th>
            <th>Chi Phí XP</th>
            <th>Thời Gian</th>
            <th>Trạng Thái</th>
            <th style="text-align:center;">Hành Động</th>
          </tr>
        </thead>
        <tbody>
          ${vouchers.map(v => {
            const isPending = v.status === 'pending';
            const isRedeemed = v.status === 'redeemed' || v.status === 'used';
            const isCancelled = v.status === 'cancelled';
            const timeStr = v.createdAt ? new Date(v.createdAt).toLocaleString('vi-VN') : '—';

            let statusBadge = '<span class="badge-status badge-pass">✅ Đã Trao Quà</span>';
            if (isPending) {
              statusBadge = '<span class="user-league-pill" style="padding:0.2rem 0.6rem;font-size:0.75rem;border-color:#f59e0b;color:#b45309;">⏳ Chờ Thầy Duyệt</span>';
            } else if (isCancelled) {
              statusBadge = '<span class="badge-status badge-fail">❌ Đã Hoàn Điểm</span>';
            }

            return `
              <tr>
                <td><code class="voucher-serial-code" style="font-size:0.95rem;padding:2px 8px;">${escapeHtml(v.code || '—')}</code></td>
                <td><strong>${escapeHtml(v.studentName || 'Học sinh')}</strong></td>
                <td><span class="badge-status badge-pass">Lớp ${escapeHtml(v.className || '10')}</span></td>
                <td>
                  <div style="display:flex;align-items:center;gap:0.4rem;">
                    <span style="font-size:1.3rem;">${v.icon || '🎁'}</span>
                    <div>
                      <strong style="color:var(--text-primary);">${escapeHtml(v.name || 'Voucher')}</strong>
                      <div style="font-size:0.75rem;color:var(--text-secondary);">${escapeHtml(v.desc || '')}</div>
                    </div>
                  </div>
                </td>
                <td><strong style="color:var(--amber);font-size:1rem;">⭐ ${v.costXp || 0} XP</strong></td>
                <td style="font-size:0.8rem;color:var(--text-secondary);">${timeStr}</td>
                <td>${statusBadge}</td>
                <td style="text-align:center;">
                  ${isPending ? `
                    <div style="display:flex;gap:0.4rem;justify-content:center;">
                      <button type="button" class="btn btn-primary btn-sm" onclick="handleTeacherApproveVoucher('${v.code}')" style="padding:0.3rem 0.65rem;font-size:0.78rem;font-weight:800;">
                        ✅ Duyệt & Trao Quà
                      </button>
                      <button type="button" class="btn btn-danger btn-sm" onclick="handleTeacherRefundVoucher('${v.code}')" style="padding:0.3rem 0.65rem;font-size:0.78rem;font-weight:800;">
                        ↩️ Hoàn XP
                      </button>
                    </div>
                  ` : (isRedeemed ? `
                    <span style="font-size:0.8rem;color:var(--text-muted);font-weight:700;">Đã xác nhận</span>
                  ` : `
                    <span style="font-size:0.8rem;color:var(--rose);font-weight:700;">Đã hoàn điểm</span>
                  `)}
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function handleTeacherApproveVoucher(code) {
  if (!confirm(`Xác nhận trao quà / áp dụng voucher [${code}] cho học sinh?`)) return;

  const updated = StorageEngine.updateVoucherStatus(code, 'redeemed', 'Thầy Khiêm đã xác nhận trao quà');
  
  // Also update in student profile if matching
  const profile = GamificationEngine.getUserProfile();
  if (profile && Array.isArray(profile.vouchers)) {
    const v = profile.vouchers.find(item => item.code === code);
    if (v) {
      v.status = 'redeemed';
      GamificationEngine.saveUserProfile(profile);
    }
  }

  SoundEngine.playFanfare ? SoundEngine.playFanfare() : null;
  showToast(`🎉 Đã duyệt và xác nhận trao voucher [${code}] thành công!`, 'success');
  renderTeacherVouchersManager(document.querySelector('#teacherVoucherFilterGroup .active')?.id?.replace('btnVoucherFilter_', '') || 'all');
}

function handleTeacherRefundVoucher(code) {
  if (!confirm(`Hủy voucher [${code}] và hoàn trả số điểm XP đã trừ cho học sinh?`)) return;

  const list = StorageEngine.getAllVouchers();
  const target = list.find(v => v.code === code);
  const cost = target ? (target.costXp || 0) : 0;

  StorageEngine.updateVoucherStatus(code, 'cancelled', 'Đã hủy và hoàn trả điểm XP');

  // Refund XP to student
  const profile = GamificationEngine.getUserProfile();
  if (profile) {
    if (Array.isArray(profile.vouchers)) {
      const v = profile.vouchers.find(item => item.code === code);
      if (v) v.status = 'cancelled';
    }
    profile.xp = (profile.xp || 0) + cost;
    GamificationEngine.saveUserProfile(profile);
  }

  showToast(`↩️ Đã hủy voucher [${code}] và hoàn lại ${cost} XP cho học sinh!`, 'info');
  renderTeacherVouchersManager(document.querySelector('#teacherVoucherFilterGroup .active')?.id?.replace('btnVoucherFilter_', '') || 'all');
}

/* 🏅 RENDER HUY HIỆU & THÀNH TỰU KÈM KHUNG VIỀN AVATAR */
function renderBadgesShowcase(profile) {
  const badgesGrid = document.getElementById('badgesShowcaseGrid');
  if (!badgesGrid) return;

  const unlocked = new Set(profile.unlockedBadges || []);
  const currentFrame = profile.frame || 'frame-target';

  badgesGrid.innerHTML = BADGES_DEFINITIONS.map(b => {
    const isUnlocked = unlocked.has(b.id);
    const frame = b.frame || { name: 'Viền Cơ Bản', cssClass: 'frame-target', icon: '🎯' };
    const isEquipped = currentFrame === frame.cssClass;

    return `
      <div class="badge-card ${isUnlocked ? 'unlocked' : 'locked'}" onclick="triggerBadgeCelebration('${b.name}', ${isUnlocked}, '${frame.cssClass}', '${escapeHtml(frame.name)}')">
        <!-- Khung Viền Avatar Mẫu -->
        <div class="badge-avatar-preview avatar-with-frame ${isUnlocked ? frame.cssClass : ''}">
          <span>${b.icon}</span>
        </div>

        <div class="badge-title" style="font-weight:900;font-size:0.95rem;color:var(--text-primary);margin-bottom:0.2rem;">
          ${escapeHtml(b.name)}
        </div>
        
        <div class="badge-desc" style="font-size:0.8rem;color:var(--text-secondary);line-height:1.4;">
          ${escapeHtml(b.desc)}
        </div>

        <!-- Tên Khung Viền Thưởng -->
        <div>
          <span class="badge-frame-pill">
            <span>🎁</span> <span>Khung: ${escapeHtml(frame.name)}</span>
          </span>
        </div>

        <!-- Trạng Thái & Nút Trang Bị Khung -->
        <div style="margin-top:0.65rem;">
          ${isUnlocked ? (
            isEquipped 
              ? `<button type="button" class="btn btn-secondary btn-sm" style="width:100%;font-size:0.75rem;padding:0.35rem 0.5rem;font-weight:800;border-color:var(--primary);color:var(--primary);" disabled>
                   ✅ Đang Dùng Khung
                 </button>`
              : `<button type="button" class="btn btn-primary btn-sm" onclick="event.stopPropagation(); equipBadgeFrame('${frame.cssClass}', '${escapeHtml(frame.name)}')" style="width:100%;font-size:0.75rem;padding:0.35rem 0.5rem;font-weight:800;">
                   ⚡ Dùng Khung Này
                 </button>`
          ) : `
            <div style="font-size:0.75rem;font-weight:800;color:var(--text-muted);padding:0.35rem 0;">
              🔒 CHƯA ĐẠT
            </div>
          `}
        </div>
      </div>
    `;
  }).join('');
}

function equipBadgeFrame(frameCssClass, frameName) {
  const profile = GamificationEngine.getUserProfile();
  profile.frame = frameCssClass;
  if (!profile.unlockedFrames) profile.unlockedFrames = [];
  if (!profile.unlockedFrames.includes(frameCssClass)) profile.unlockedFrames.push(frameCssClass);
  GamificationEngine.saveUserProfile(profile);

  SoundEngine.playClick();
  GamificationEngine.fireConfetti();
  showToast(`✨ Đã đổi sang khung Avatar: ${frameName}!`, 'success');
  renderGamificationTab();
}

function triggerBadgeCelebration(badgeName, isUnlocked, frameCssClass, frameName) {
  if (isUnlocked) {
    GamificationEngine.fireConfetti();
    SoundEngine.playFanfare();
    showToast(`🏆 Huy hiệu: ${badgeName} — Nhận khung: ${frameName}! Bấm "Dùng Khung Này" để trang bị!`, 'success');
  } else {
    SoundEngine.playWarning();
    showToast(`🔒 Huy hiệu: ${badgeName} chưa mở khóa. Hãy hoàn thành thử thách để nhận khung viền độc quyền này nhé!`, 'warn');
  }
}

/* ================= 📜 HONOR CERTIFICATE HANDLERS ================= */
async function openHonorCertificateForStudent(studentName, customTitle = 'HỌC SINH XUẤT SẮC TOÀN DIỆN') {
  const modal = document.getElementById('honorCertificateModal');
  const printArea = document.getElementById('honorCertificatePrintArea');
  if (!modal || !printArea) return;

  const allResults = await StorageEngine.getAllResults();
  const roster = await StorageEngine.getStudentRoster();
  const availableQuizzes = await StorageEngine.getAllQuizzes();
  const weekRange = WeeklyHonorEngine.getWeekRange(AppState.weeklyPeriod === 'previous' ? 1 : 0);

  const rankings = WeeklyHonorEngine.calculateWeeklyLeaderboard(allResults, weekRange, roster, availableQuizzes);
  const st = rankings.find(s => s.name.trim().toLowerCase() === studentName.trim().toLowerCase()) || {
    name: studentName,
    className: '10',
    rank: 1,
    honorXp: 850,
    perfectScores: 2,
    maxPerfectStreak: 2
  };

  printArea.innerHTML = `
    <div class="certificate-container">
      <div class="certificate-seal">🏆</div>
      <div class="cert-school-name">HỆ THỐNG GIÁO DỤC K-EDU · TOÀN QUỐC</div>
      <div class="cert-title">GIẤY CHỨNG NHẬN VINH DANH</div>
      <p style="font-style:italic;color:#78350f;margin-bottom:0.5rem;font-size:0.95rem;">Chứng nhận thành tích học tập và rèn luyện xuất sắc tại K-EDU:</p>

      <div class="cert-student-name">${escapeHtml(st.name)}</div>
      <div style="font-size:1.1rem;font-weight:800;color:#4338ca;margin-bottom:0.5rem;">Học Sinh Lớp ${escapeHtml(st.className)}</div>

      <div class="cert-achievement-box">
        <div style="font-size:1.15rem;font-weight:900;margin-bottom:0.35rem;">✨ DANH HIỆU: ${escapeHtml(customTitle)} ✨</div>
        <div style="display:flex;justify-content:space-around;flex-wrap:wrap;gap:0.5rem;margin-top:0.4rem;">
          <span>Thứ Hạng: <strong>Hạng #${st.rank || 1}</strong></span>
          <span>Điểm Vinh Danh: <strong>${st.honorXp || 0} XP</strong></span>
          <span>Điểm 10: <strong>${st.perfectScores || 0} bài</strong></span>
        </div>
        <div style="font-size:0.8rem;color:#78350f;margin-top:0.4rem;">(${escapeHtml(weekRange.label)})</div>
      </div>

      <p style="font-size:0.88rem;color:#57534e;max-width:560px;margin:0 auto 1.25rem;line-height:1.5;">
        Hội Đồng Sư Phạm K-EDU nhiệt liệt tuyên dương nỗ lực bền bỉ và tinh thần tự giác của em. Chúc em tiếp tục giữ vững phong độ và gặt hái thêm nhiều thành công rực rỡ!
      </p>

      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:1.5rem;padding:0 1rem;flex-wrap:wrap;gap:1rem;">
        <div style="text-align:left;">
          <div style="font-size:0.75rem;color:#78350f;font-weight:700;">Mã định danh Bằng khen:</div>
          <div style="font-family:monospace;font-weight:800;color:#92400e;">KEDU-HONOR-${Date.now().toString().slice(-6)}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:0.8rem;color:#78350f;font-style:italic;margin-bottom:0.25rem;">Ngày cấp: ${new Date().toLocaleDateString('vi-VN')}</div>
          <div style="font-weight:900;font-size:0.95rem;color:#1e1b4b;">HỘI ĐỒNG SƯ PHẠM K-EDU</div>
          <div style="font-size:1.5rem;margin-top:0.15rem;">✍️ <em>KhiemEdu</em></div>
        </div>
      </div>
    </div>
  `;

  modal.classList.remove('hidden');
  SoundEngine.playFanfare();
}

function openHonorCertificateForCurrentUser() {
  const profile = GamificationEngine.getUserProfile();
  openHonorCertificateForStudent(profile.name || 'Học Sinh', 'CHIẾN BINH TOÀN NĂNG TUẦN');
}

function closeHonorCertificateModal() {
  const modal = document.getElementById('honorCertificateModal');
  if (modal) modal.classList.add('hidden');
}

function printHonorCertificate() {
  window.print();
}

function shareCertificateToZalo() {
  const profile = GamificationEngine.getUserProfile();
  const text = `🎉 Con vừa nhận được BẰNG KHEN VINH DANH trên Hệ thống Toán K-EDU tuần này với danh hiệu Học Sinh Xuất Sắc! Bố mẹ xem thành tích của con nhé! 🌟`;
  navigator.clipboard.writeText(text).then(() => {
    showToast('📋 Đã sao chép lời chúc mừng và bằng khen! Bạn có thể dán ngay vào Zalo gửi cho Bố Mẹ!', 'success');
  }).catch(() => {
    showToast('🎉 Hãy chụp màn hình Bằng Khen để gửi vào Zalo cho Bố Mẹ nhé!', 'success');
  });
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

/* ================= 🛡️ QUYỀN ADMIN: RESET ĐIỂM VINH DANH & BẢNG VÀNG ================= */
let selectedResetVinhDanhOption = 'leaderboard';

function openResetVinhDanhModal() {
  const modal = document.getElementById('modalResetVinhDanh');
  if (!modal) return;
  modal.classList.remove('hidden');
  SoundEngine.playPop();

  // Highlight default option
  selectResetVinhDanhOption('leaderboard');

  // Check login state
  const pinGroup = document.getElementById('resetVinhDanhPinGroup');
  if (pinGroup) {
    if (TeacherAuth.isLoggedIn()) {
      pinGroup.style.display = 'none';
    } else {
      pinGroup.style.display = 'block';
      const pinInput = document.getElementById('adminResetVinhDanhPin');
      if (pinInput) pinInput.value = '';
    }
  }
}

function closeResetVinhDanhModal() {
  const modal = document.getElementById('modalResetVinhDanh');
  if (modal) modal.classList.add('hidden');
  SoundEngine.playClick();
}

function selectResetVinhDanhOption(optionId) {
  selectedResetVinhDanhOption = optionId;
  const options = ['leaderboard', 'profile', 'all'];
  options.forEach(opt => {
    const card = document.getElementById('resetOptCard_' + opt);
    const radio = document.getElementById('resetRadio_' + opt);
    if (card) {
      if (opt === optionId) {
        card.style.borderColor = 'var(--rose)';
        card.style.background = 'rgba(244, 63, 94, 0.08)';
      } else {
        card.style.borderColor = 'var(--border-color)';
        card.style.background = 'var(--bg-card)';
      }
    }
    if (radio) radio.checked = (opt === optionId);
  });
  SoundEngine.playClick();
}

async function executeAdminResetVinhDanh(forcedType = null) {
  const type = forcedType || selectedResetVinhDanhOption || 'leaderboard';

  // Verify PIN if teacher not logged in
  if (!TeacherAuth.isLoggedIn()) {
    const pinInput = document.getElementById('adminResetVinhDanhPin');
    const pin = pinInput ? pinInput.value.trim() : '';
    if (pin === TeacherAuth.getPin() || pin === '130909' || pin === 'thaykhiemkedu') {
      TeacherAuth.login();
    } else {
      showToast('❌ Mã PIN Quản Trị không chính xác!', 'error');
      SoundEngine.playBuzz();
      return;
    }
  }

  // 1. Reset Bảng Vàng (leaderboard)
  if (type === 'leaderboard' || type === 'all') {
    await StorageEngine.clearAllTestResults();
    if (window.FirebaseEngine && window.FirebaseEngine.isActive && typeof window.FirebaseEngine.deleteAllResults === 'function') {
      await window.FirebaseEngine.deleteAllResults();
    }
  }

  // 2. Reset Hồ Sơ Cá Nhân (profile XP)
  if (type === 'profile' || type === 'all') {
    GamificationEngine.resetUserProfile();
    updateGamifyBar();
  }

  // Re-render Bảng Vàng & Vinh Danh
  await renderGamificationTab();
  closeResetVinhDanhModal();

  SoundEngine.playFanfare();
  GamificationEngine.fireConfetti();
  showToast('🎉 Đã reset thành công điểm mục Vinh Danh!', 'success');
}

async function handleQuickResetVinhDanh(type = 'all') {
  if (!TeacherAuth.isLoggedIn()) {
    const pin = prompt('🛡️ QUYỀN ADMIN:\nNhập mã PIN Giáo viên để xác nhận Reset Điểm Vinh Danh:');
    if (pin === TeacherAuth.getPin() || pin === '130909' || pin === 'thaykhiemkedu') {
      TeacherAuth.login();
    } else {
      if (pin !== null) alert('❌ Mã PIN không hợp lệ! Quyền bị từ chối.');
      return;
    }
  }

  if (confirm('⚠️ Bạn có chắc chắn muốn Reset Điểm mục Vinh Danh không?\nThao tác này sẽ đưa điểm số về 0 để khởi động đợt thi đua mới.')) {
    await executeAdminResetVinhDanh(type);
  }
}

// Khởi tạo hiển thị widget Thống kê Ngân hàng câu hỏi DocumentQuestionBank
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      renderDocumentBankStats();
    });
  } else {
    setTimeout(renderDocumentBankStats, 300);
  }
}

/* ================= STORAGE RETENTION & AUTO-COMPACTION ENGINE ================= */
async function checkAndRunAutoRetentionSweep() {
  try {
    const lastSweepStr = localStorage.getItem('khiemedu_last_sweep_at');
    const now = Date.now();
    if (lastSweepStr) {
      const elapsed = now - parseInt(lastSweepStr, 10);
      if (elapsed < 24 * 60 * 60 * 1000) {
        return; // Đã chạy trong vòng 24 giờ qua
      }
    }

    localStorage.setItem('khiemedu_last_sweep_at', now.toString());
    const stats = await StorageEngine.runRetentionSweep();
    if (stats && (stats.quizzesRemoved > 0 || stats.resultsCompacted > 0)) {
      console.log(`[AutoRetentionSweep] Đã tự động dọn ${stats.quizzesRemoved} đề, nén ${stats.resultsCompacted} kết quả, tiết kiệm ~${Math.round(stats.bytesSaved / 1024)}KB.`);
    }
  } catch (err) {
    console.warn('[AutoRetentionSweep] Error running sweep:', err);
  }
}

async function triggerManualRetentionSweep() {
  const btn = document.getElementById('btnManualRetentionSweep');
  if (btn) btn.disabled = true;

  try {
    showToast('⏳ Đang tiến hành quét và dọn dẹp đề thi quá 7 ngày...', 'info');
    const stats = await StorageEngine.runRetentionSweep();
    localStorage.setItem('khiemedu_last_sweep_at', Date.now().toString());

    if (stats && (stats.quizzesRemoved > 0 || stats.resultsCompacted > 0)) {
      const kb = Math.round(stats.bytesSaved / 1024);
      showToast(`🧹 Đã dọn ${stats.quizzesRemoved} đề thi cũ, nén ${stats.resultsCompacted} bản ghi kết quả, tiết kiệm ~${kb}KB!`, 'success');
      if (typeof renderTeacherQuizManager === 'function') renderTeacherQuizManager();
    } else {
      showToast('🎉 Hệ thống lưu trữ đã được tối ưu! Không có đề thi nào kết thúc quá 7 ngày cần dọn dẹp.', 'success');
    }
  } catch (err) {
    console.error('triggerManualRetentionSweep error:', err);
    showToast('⚠️ Có lỗi xảy ra trong quá trình dọn dẹp.', 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function adminViewSubmissionReview(resultId) {
  const modal = document.getElementById('teacherSubmissionReviewModal');
  const modalBody = document.getElementById('teacherSubmissionReviewModalBody');
  const modalTitle = document.getElementById('teacherSubmissionReviewModalTitle');
  if (!modal || !modalBody) return;

  const cleanKey = resultId.replace(STORAGE_PREFIX, '');
  let res = await StorageEngine.get(cleanKey);
  if (!res) res = await StorageEngine.get(resultId);

  if (!res) {
    showToast('⚠️ Không tìm thấy bản ghi kết quả này.', 'warn');
    return;
  }

  if (modalTitle) {
    modalTitle.innerHTML = `<span>📖</span> Chi Tiết Bài Làm: ${escapeHtml(res.name)} (${escapeHtml(res.className)}) — Mã Đề: ${escapeHtml(res.quizId)}`;
  }

  if (res.compacted) {
    const total = res.total || (res.review ? res.review.length : 0);
    const correctCount = res.correct || (res.review ? res.review.filter(r => r.isCorrect).length : 0);
    const scoreVal = res.totalScore !== undefined ? res.totalScore : (res.score || 0);

    modalBody.innerHTML = `
      <div style="padding:2.5rem 1.5rem;text-align:center;background:var(--bg-card);border:2px dashed var(--indigo);border-radius:var(--radius-lg);">
        <div style="font-size:3.5rem;margin-bottom:0.75rem;">📦</div>
        <div style="font-size:1.25rem;font-weight:800;color:var(--text-primary);margin-bottom:0.6rem;">
          Đề thi này đã được dọn dẹp sau 7 ngày để tiết kiệm dung lượng
        </div>
        <p style="font-size:0.95rem;font-weight:600;color:var(--text-secondary);max-width:580px;margin:0 auto 1.5rem;line-height:1.5;">
          Không thể xem lại nội dung câu hỏi chi tiết, nhưng điểm số và thống kê chủ đề vẫn được giữ nguyên.
        </p>
        <div style="display:inline-flex;gap:1.25rem;flex-wrap:wrap;justify-content:center;">
          <div style="background:var(--bg-tertiary);border:1px solid var(--border-color);padding:0.75rem 1.5rem;border-radius:var(--radius-md);font-weight:800;">
            Thang điểm: <span style="color:var(--primary);font-size:1.15rem;">${scoreVal}/10đ</span>
          </div>
          <div style="background:var(--bg-tertiary);border:1px solid var(--border-color);padding:0.75rem 1.5rem;border-radius:var(--radius-md);font-weight:800;">
            Số câu đúng: <span style="color:var(--indigo);font-size:1.15rem;">${correctCount}/${total} câu</span>
          </div>
        </div>
      </div>
    `;
  } else {
    const reviewData = res.review || res.reviewData || [];
    modalBody.innerHTML = `
      <div style="margin-bottom:1rem;display:flex;gap:1rem;flex-wrap:wrap;">
        <div class="stat-item" style="padding:0.5rem 1rem;"><div class="stat-val">${res.totalScore || 0}/10đ</div><div class="stat-lbl">Điểm số</div></div>
        <div class="stat-item" style="padding:0.5rem 1rem;"><div class="stat-val">${res.correct || 0}/${res.total || reviewData.length}</div><div class="stat-lbl">Số câu đúng</div></div>
        <div class="stat-item" style="padding:0.5rem 1rem;"><div class="stat-val">${Math.floor((res.timeTakenSeconds || 0)/60)}p ${(res.timeTakenSeconds || 0)%60}s</div><div class="stat-lbl">Thời gian làm</div></div>
      </div>
      <div class="review-cards-list">
        ${reviewData.map((r, i) => `
          <div class="review-qcard ${r.isCorrect ? 'status-correct' : 'status-wrong'}" style="margin-bottom:1rem;padding:1rem;background:var(--bg-card);border:1.5px solid var(--border-color);border-radius:var(--radius-md);">
            <div style="font-weight:800;margin-bottom:0.5rem;">Câu ${r.num || (i + 1)}: ${r.isCorrect ? '✅ Đúng' : '❌ Sai'} (${escapeHtml(r.category || r.subject || 'Chủ đề')})</div>
            ${r.content ? `<div style="margin-bottom:0.5rem;">${r.content}</div>` : ''}
            <div style="font-size:0.9rem;">Học sinh chọn: <strong>${escapeHtml(r.given || '(chưa điền)')}</strong> | Đáp án đúng: <strong style="color:var(--primary);">${escapeHtml(r.correctAnswer || '')}</strong></div>
            ${r.explanation ? `<div style="margin-top:0.5rem;font-size:0.85rem;color:var(--text-secondary);background:var(--bg-tertiary);padding:0.5rem;border-radius:var(--radius-sm);">💡 Lời giải: ${r.explanation}</div>` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  modal.classList.remove('hidden');
}

function closeTeacherSubmissionReviewModal() {
  const modal = document.getElementById('teacherSubmissionReviewModal');
  if (modal) modal.classList.add('hidden');
}

/* ================= V-ACT RUNTIME INITIALIZATION & STATE MANAGEMENT ================= */
async function initializeVactRuntime() {
  const loader = window.KEDUVACT?.sourceBankLoader || window.sourceBankLoader;
  if (!loader) {
    console.warn('[VACT] sourceBankLoader chưa sẵn sàng.');
    return;
  }

  // Set initial loading UI (buttons disabled, loading text, no 0/100 or 0/120)
  renderVactCardsLoading();

  try {
    await loader.ready();
    if (window.KEDUVACT?.VACTCoverage?.clearCoverageCache) {
      window.KEDUVACT.VACTCoverage.clearCoverageCache();
    }
    initVactMini100UI();
    initVactFull120UI();
    updateVactStudentDashboard();
  } catch (err) {
    console.error('[VACT] Không thể nạp ngân hàng câu hỏi V-ACT:', err);
    renderVactCardsError(err);
  }
}

async function retryVactRuntimeLoad() {
  const loader = window.KEDUVACT?.sourceBankLoader || window.sourceBankLoader;
  if (!loader) return;
  renderVactCardsLoading();
  try {
    await loader.reload();
    if (window.KEDUVACT?.VACTCoverage?.clearCoverageCache) {
      window.KEDUVACT.VACTCoverage.clearCoverageCache();
    }
    initVactMini100UI();
    initVactFull120UI();
    updateVactStudentDashboard();
  } catch (err) {
    console.error('[VACT] Tải lại ngân hàng thất bại:', err);
    renderVactCardsError(err);
  }
}

function renderVactCardsLoading() {
  const btnMini = document.getElementById('btnStartMini100');
  const btnFull = document.getElementById('btnStartFull120');
  if (btnMini) {
    btnMini.disabled = true;
    btnMini.textContent = 'Đang tải ngân hàng V-ACT...';
  }
  if (btnFull) {
    btnFull.disabled = true;
    btnFull.textContent = 'Đang tải ngân hàng V-ACT...';
  }

  const miniBox = document.getElementById('vactMini100WarningBox');
  const miniText = document.getElementById('vactMini100WarningText');
  if (miniBox && miniText) {
    miniBox.style.display = 'block';
    miniText.innerHTML = '<span style="display:inline-flex;align-items:center;gap:0.4rem;">⏳ Đang tải ngân hàng V-ACT từ nguồn xác thực...</span>';
  }

  const fullBox = document.getElementById('vactFull120WarningBox');
  const fullText = document.getElementById('vactFull120WarningText');
  if (fullBox && fullText) {
    fullBox.style.display = 'block';
    fullText.innerHTML = '<span style="display:inline-flex;align-items:center;gap:0.4rem;">⏳ Đang tải ngân hàng V-ACT từ nguồn xác thực...</span>';
  }
}

function renderVactCardsError(err) {
  const btnMini = document.getElementById('btnStartMini100');
  const btnFull = document.getElementById('btnStartFull120');
  if (btnMini) {
    btnMini.disabled = true;
    btnMini.textContent = 'BẮT ĐẦU MINI 100 🚀';
  }
  if (btnFull) {
    btnFull.disabled = true;
    btnFull.textContent = 'BẮT ĐẦU FULL V-ACT 🏆';
  }

  const errorHtml = `
    <div>Không thể tải ngân hàng V-ACT từ nguồn xác thực. Vui lòng tải lại trang hoặc thử lại.</div>
    <div style="margin-top:0.45rem;">
      <button type="button" class="btn btn-secondary btn-sm" onclick="retryVactRuntimeLoad()" style="padding:0.25rem 0.75rem;font-weight:700;border-radius:var(--radius-sm);">
        🔄 Thử lại
      </button>
    </div>
  `;

  const miniBox = document.getElementById('vactMini100WarningBox');
  const miniText = document.getElementById('vactMini100WarningText');
  if (miniBox && miniText) {
    miniBox.style.display = 'block';
    miniText.innerHTML = errorHtml;
  }

  const fullBox = document.getElementById('vactFull120WarningBox');
  const fullText = document.getElementById('vactFull120WarningText');
  if (fullBox && fullText) {
    fullBox.style.display = 'block';
    fullText.innerHTML = errorHtml;
  }
}

window.initializeVactRuntime = initializeVactRuntime;
window.retryVactRuntimeLoad = retryVactRuntimeLoad;

/* ================= V-ACT MINI 100 PRACTICE ENGINE & UI ================= */
function initVactMini100UI() {
  const card = document.getElementById('vactMini100Card');
  if (!card) return;

  const loader = window.KEDUVACT?.sourceBankLoader || window.sourceBankLoader;
  if (loader && loader.getStatus() === 'loading') {
    renderVactCardsLoading();
    return;
  }
  if (loader && loader.getStatus() === 'error') {
    renderVactCardsError(loader.getError());
    return;
  }

  const vactCoverage = window.KEDUVACT?.VACTCoverage || window.VACTCoverage;
  if (!vactCoverage || typeof vactCoverage.getProfileReadiness !== 'function') return;

  try {
    const readiness = vactCoverage.getProfileReadiness('vact_mini_100');
    const warningBox = document.getElementById('vactMini100WarningBox');
    const warningText = document.getElementById('vactMini100WarningText');
    const btnStart = document.getElementById('btnStartMini100');

    if (btnStart) {
      btnStart.textContent = 'BẮT ĐẦU MINI 100 🚀';
      btnStart.disabled = !readiness.ready;
    }

    if (warningBox && warningText) {
      if (!readiness.ready) {
        warningBox.style.display = 'block';
        const missingDetails = [];
        const secLabels = {
          vietnamese: 'Tiếng Việt',
          english: 'Tiếng Anh',
          math: 'Toán học',
          logic_data: 'Logic & Phân tích số liệu',
          scientific_reasoning: 'Suy luận khoa học'
        };

        for (const [secKey, sec] of Object.entries(readiness.sections || {})) {
          if (sec.missing > 0) {
            const label = secLabels[secKey] || secKey;
            missingDetails.push(`thiếu ${sec.missing} câu ${label} (hiện có ${sec.available}/${sec.required})`);
          }
        }

        warningText.innerHTML = `
          <div>Ngân hàng nguồn hiện chưa đủ để tạo Mini V-ACT 100 hoàn chỉnh (khả dụng <strong>${readiness.totalAvailable}/${readiness.totalRequired}</strong> câu: ${missingDetails.join('; ')}).</div>
          <div style="margin-top:0.35rem;font-size:0.8rem;color:#fef08a;">
            ⚠️ Tuân thủ nghiêm ngặt nguyên tắc độc lập phần thi (không tự ý bù chéo câu giữa các phần).
          </div>
        `;
      } else {
        warningBox.style.display = 'none';
      }
    }
  } catch (e) {
    console.warn('initVactMini100UI warning:', e);
  }
}

async function handleStartMini100Click() {
  const loader = window.KEDUVACT?.sourceBankLoader || window.sourceBankLoader;
  if (loader && loader.getStatus() !== 'ready') {
    try {
      await loader.ready();
    } catch (err) {
      showToast('Không thể tải ngân hàng V-ACT từ nguồn xác thực. Vui lòng thử lại.', 'error');
      return;
    }
  }

  // Requirement 18: Recheck readiness before proceeding
  const vactCoverage = window.KEDUVACT?.VACTCoverage || window.VACTCoverage;
  if (vactCoverage && typeof vactCoverage.getProfileReadiness === 'function') {
    const readiness = vactCoverage.getProfileReadiness('vact_mini_100') || vactCoverage.getProfileReadiness('vact_mini');
    if (!readiness || !readiness.ready) {
      showToast(`Ngân hàng câu hỏi chưa đủ điều kiện tạo đề Mini V-ACT 100 (${readiness?.totalAvailable || 0}/${readiness?.totalRequired || 100} câu). Vui lòng thử lại sau.`, 'error');
      return;
    }
  }

  const nameEl = document.getElementById('studentJoinName');
  const classEl = document.getElementById('studentJoinClass');

  const name = nameEl?.value?.trim();
  const className = classEl?.value?.trim();

  if (!name || !className) {
    showToast('⚠️ Vui lòng nhập Họ Tên và Lớp học của bạn trước khi bắt đầu!', 'warn');
    nameEl?.focus();
    nameEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  window.LocalStudentProfile?.updateProfile({ name, className, avatar: AppState.studentAvatar || '' });

  const examGen = window.KEDUVACT?.VACTExamGenerator || window.VACTExamGenerator;
  if (!examGen) {
    showToast('Hệ thống tạo đề V-ACT chưa sẵn sàng.', 'error');
    return;
  }

  try {
    showToast('⚡ Đang tổng hợp bài luyện Mini V-ACT 100...', 'info');
    const examResult = examGen.generateMini100();

    // Requirement 16: Block incomplete before format & save
    if (
      !examResult ||
      !examResult.isComplete ||
      examResult.requestedTotal !== 100 ||
      examResult.generatedTotal !== 100 ||
      !examResult.questions ||
      examResult.questions.length !== 100
    ) {
      const generatedCount = examResult?.generatedTotal ?? examResult?.questions?.length ?? 0;
      showToast(`Không thể tạo đề Mini V-ACT 100: Chỉ tạo được ${generatedCount}/100 câu hỏi hoàn chỉnh. Đã hủy lưu đề thi để tránh đề thi không đầy đủ.`, 'error');
      return;
    }

    const quizRecord = examGen.formatExamAsQuiz(examResult, {
      title: 'Đề Luyện Tập Tổng Hợp — Mini V-ACT 100',
      timeLimitMinutes: 90
    });

    await StorageEngine.saveQuiz(quizRecord);

    showToast(`Đã tạo thành công bài thi Mini V-ACT 100 (${examResult.generatedTotal} câu)!`, 'success');
    await startExamWithQuizId(quizRecord.id);
  } catch (err) {
    console.error('Failed to start Mini V-ACT 100:', err);
    showToast('Lỗi khi tạo đề Mini V-ACT 100: ' + err.message, 'error');
  }
}

/* ================= V-ACT FULL 120 SIMULATION ENGINE & UI ================= */
function initVactFull120UI() {
  const card = document.getElementById('vactFull120Card');
  if (!card) return;

  const loader = window.KEDUVACT?.sourceBankLoader || window.sourceBankLoader;
  if (loader && loader.getStatus() === 'loading') {
    renderVactCardsLoading();
    return;
  }
  if (loader && loader.getStatus() === 'error') {
    renderVactCardsError(loader.getError());
    return;
  }

  const vactCoverage = window.KEDUVACT?.VACTCoverage || window.VACTCoverage;
  if (!vactCoverage || typeof vactCoverage.getProfileReadiness !== 'function') return;

  try {
    const readiness = vactCoverage.getProfileReadiness('vact_full');
    const warningBox = document.getElementById('vactFull120WarningBox');
    const warningText = document.getElementById('vactFull120WarningText');
    const btnStart = document.getElementById('btnStartFull120');

    if (btnStart) {
      btnStart.textContent = 'BẮT ĐẦU FULL V-ACT 🏆';
      btnStart.disabled = !readiness.ready;
    }

    if (warningBox && warningText) {
      if (!readiness.ready) {
        warningBox.style.display = 'block';
        const missingDetails = [];
        const secLabels = {
          vietnamese: 'Tiếng Việt',
          english: 'Tiếng Anh',
          math: 'Toán học',
          logic_data: 'Logic & Phân tích số liệu',
          scientific_reasoning: 'Suy luận khoa học'
        };

        for (const [secKey, sec] of Object.entries(readiness.sections || {})) {
          if (sec.missing > 0) {
            const label = secLabels[secKey] || secKey;
            missingDetails.push(`thiếu ${sec.missing} câu ${label} (hiện có ${sec.available}/${sec.required})`);
          }
        }

        warningText.innerHTML = `
          <div>Ngân hàng nguồn hiện chưa đủ để tạo Full V-ACT 120 hoàn chỉnh (khả dụng <strong>${readiness.totalAvailable}/${readiness.totalRequired}</strong> câu: ${missingDetails.join('; ')}).</div>
          <div style="margin-top:0.35rem;font-size:0.8rem;color:#fef08a;">
            ⚠️ Tuân thủ nghiêm ngặt nguyên tắc cách ly phần thi (không bù câu môn này sang môn khác).
          </div>
        `;
      } else {
        warningBox.style.display = 'none';
      }
    }
  } catch (e) {
    console.warn('initVactFull120UI warning:', e);
  }
}

async function handleStartFull120Click() {
  const loader = window.KEDUVACT?.sourceBankLoader || window.sourceBankLoader;
  if (loader && loader.getStatus() !== 'ready') {
    try {
      await loader.ready();
    } catch (err) {
      showToast('Không thể tải ngân hàng V-ACT từ nguồn xác thực. Vui lòng thử lại.', 'error');
      return;
    }
  }

  // Requirement 18: Recheck readiness before proceeding
  const vactCoverage = window.KEDUVACT?.VACTCoverage || window.VACTCoverage;
  if (vactCoverage && typeof vactCoverage.getProfileReadiness === 'function') {
    const readiness = vactCoverage.getProfileReadiness('vact_full');
    if (!readiness || !readiness.ready) {
      showToast(`Ngân hàng câu hỏi chưa đủ điều kiện tạo đề Full V-ACT 120 (${readiness?.totalAvailable || 0}/${readiness?.totalRequired || 120} câu). Vui lòng thử lại sau.`, 'error');
      return;
    }
  }

  const nameEl = document.getElementById('studentJoinName');
  const classEl = document.getElementById('studentJoinClass');

  const name = nameEl?.value?.trim();
  const className = classEl?.value?.trim();

  if (!name || !className) {
    showToast('⚠️ Vui lòng nhập Họ Tên và Lớp học của bạn trước khi bắt đầu!', 'warn');
    nameEl?.focus();
    nameEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  window.LocalStudentProfile?.updateProfile({ name, className, avatar: AppState.studentAvatar || '' });

  const examGen = window.KEDUVACT?.VACTExamGenerator || window.VACTExamGenerator;
  if (!examGen || typeof examGen.generateFull120 !== 'function') {
    showToast('Hệ thống tạo đề Full V-ACT 120 chưa sẵn sàng.', 'error');
    return;
  }

  try {
    showToast('🏆 Đang mô phỏng kỳ thi Full V-ACT 120 (150 phút)...', 'info');
    const examResult = examGen.generateFull120();

    // Requirement 17: Block incomplete before format & save
    if (
      !examResult ||
      !examResult.isComplete ||
      examResult.requestedTotal !== 120 ||
      examResult.generatedTotal !== 120 ||
      !examResult.questions ||
      examResult.questions.length !== 120
    ) {
      const generatedCount = examResult?.generatedTotal ?? examResult?.questions?.length ?? 0;
      showToast(`Không thể tạo đề Full V-ACT 120: Chỉ tạo được ${generatedCount}/120 câu hỏi hoàn chỉnh. Đã hủy lưu đề thi để tránh đề thi không đầy đủ.`, 'error');
      return;
    }

    const quizRecord = examGen.formatExamAsQuiz(examResult, {
      title: 'Đề Thi Mô Phỏng Chuẩn Hóa — Full V-ACT 120',
      timeLimitMinutes: 150
    });

    await StorageEngine.saveQuiz(quizRecord);

    showToast(`Đã tạo thành công bài thi Full V-ACT 120 (${examResult.generatedTotal} câu)!`, 'success');
    await startExamWithQuizId(quizRecord.id);
  } catch (err) {
    console.error('Failed to start Full V-ACT 120:', err);
    showToast('Lỗi khi tạo đề Full V-ACT 120: ' + err.message, 'error');
  }
}

window.initVactMini100UI = initVactMini100UI;
window.handleStartMini100Click = handleStartMini100Click;
window.initVactFull120UI = initVactFull120UI;
window.handleStartFull120Click = handleStartFull120Click;

/* ================= V-ACT STUDENT DASHBOARD & WRONG QUESTION REVIEW ================= */
function updateVactStudentDashboard() {
  const container = document.getElementById('vactStudentAnalyticsSection');
  if (!container) return;

  const analytics = window.KEDUVACT?.performanceAnalytics;
  if (!analytics || typeof analytics.renderDashboardHtml !== 'function') {
    container.innerHTML = '';
    return;
  }

  const name = (document.getElementById('studentJoinName')?.value || AppState.studentName || '').trim();
  const className = (document.getElementById('studentJoinClass')?.value || AppState.studentClass || '').trim();
  const studentId = window.LocalStudentProfile?.getStudentId?.() || AppState.studentId || null;

  const html = analytics.renderDashboardHtml({ studentName: name, studentClass: className, studentId });
  container.innerHTML = html;
}

function handleOpenWrongQuestionsModal(attemptId = null) {
  const modal = document.getElementById('vactWrongQuestionsModal');
  const body = document.getElementById('vactWrongQuestionsModalBody');
  const title = document.getElementById('vactWrongQuestionsModalTitle');
  if (!modal || !body) return;

  const analytics = window.KEDUVACT?.performanceAnalytics;
  if (!analytics) return;

  const name = (document.getElementById('studentJoinName')?.value || AppState.studentName || '').trim();
  const className = (document.getElementById('studentJoinClass')?.value || AppState.studentClass || '').trim();
  const studentId = window.LocalStudentProfile?.getStudentId?.() || AppState.studentId || null;

  const wrongQuestions = analytics.getWrongQuestions({ studentName: name, studentClass: className, studentId }, { attemptId });

  if (title) {
    title.innerHTML = `<span>🔍</span> <span>Ôn Lại Câu Hỏi Chưa Đạt (${wrongQuestions.length} câu)</span>`;
  }

  if (!wrongQuestions.length) {
    body.innerHTML = `
      <div style="padding:2.5rem 1.5rem;text-align:center;background:var(--bg-card);border:2px dashed var(--emerald);border-radius:var(--radius-lg);">
        <div style="font-size:3.5rem;margin-bottom:0.75rem;">🎉</div>
        <div style="font-size:1.25rem;font-weight:800;color:var(--text-primary);margin-bottom:0.5rem;">
          Không có câu hỏi nào bị làm sai hoặc chưa điền!
        </div>
        <p style="font-size:0.92rem;color:var(--text-secondary);margin:0;">
          Bạn đã hoàn thành chính xác tất cả các câu hỏi được kiểm tra trong bài thi này.
        </p>
      </div>
    `;
  } else {
    body.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:1rem;">
        ${wrongQuestions.map((q, idx) => `
          <div class="card" style="padding:1rem 1.25rem;background:var(--bg-tertiary);border-left:4px solid ${q.isUnanswered ? 'var(--amber)' : 'var(--rose)'};border-radius:var(--radius-md);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.45rem;flex-wrap:wrap;gap:0.4rem;">
              <span style="font-weight:900;font-size:0.92rem;color:var(--text-primary);">
                Câu ${q.num || idx + 1}: <span style="color:${q.isUnanswered ? 'var(--amber-shadow)' : 'var(--rose)'};">${q.isUnanswered ? 'Chưa trả lời' : 'Làm sai'}</span>
              </span>
              <div style="display:flex;gap:0.35rem;font-size:0.75rem;font-weight:800;">
                ${q.section ? `<span style="background:rgba(99,102,241,0.15);color:var(--indigo);padding:2px 8px;border-radius:999px;">${q.section}</span>` : ''}
                ${q.skillName ? `<span style="background:rgba(16,185,129,0.15);color:var(--emerald);padding:2px 8px;border-radius:999px;">${q.skillName}</span>` : ''}
              </div>
            </div>
            <div style="font-size:0.92rem;font-weight:600;color:var(--text-primary);margin-bottom:0.6rem;line-height:1.5;">
              ${escapeHtml(q.question)}
            </div>
            ${Array.isArray(q.options) && q.options.length ? `
              <div style="display:flex;flex-direction:column;gap:0.35rem;margin-bottom:0.6rem;">
                ${q.options.map((opt, oIdx) => {
                  const optLetter = String.fromCharCode(65 + oIdx);
                  const isGiven = q.given === optLetter || q.given === opt;
                  const isCorrect = q.correctAnswer === optLetter || q.correctAnswer === opt;
                  let bg = 'var(--bg-card)';
                  let border = '1px solid var(--border-color)';
                  let color = 'var(--text-primary)';
                  if (isCorrect) {
                    bg = 'rgba(16,185,129,0.12)';
                    border = '1.5px solid var(--emerald)';
                    color = 'var(--emerald)';
                  } else if (isGiven) {
                    bg = 'rgba(244,63,94,0.12)';
                    border = '1.5px solid var(--rose)';
                    color = 'var(--rose)';
                  }
                  return `
                    <div style="padding:0.4rem 0.75rem;background:${bg};border:${border};border-radius:var(--radius-sm);font-size:0.85rem;color:${color};font-weight:700;">
                      <strong>${optLetter}.</strong> ${escapeHtml(opt)}
                      ${isCorrect ? ' <span style="color:var(--emerald);font-weight:900;">✓ (Đáp án đúng)</span>' : ''}
                      ${isGiven && !isCorrect ? ' <span style="color:var(--rose);font-weight:900;">✗ (Em đã chọn)</span>' : ''}
                    </div>
                  `;
                }).join('')}
              </div>
            ` : ''}
            <div style="display:flex;gap:1rem;flex-wrap:wrap;font-size:0.82rem;font-weight:800;margin-top:0.4rem;">
              <div>Em chọn: <span style="color:var(--rose);">${escapeHtml(q.given || '(chưa điền)')}</span></div>
              <div>Đáp án đúng: <span style="color:var(--emerald);">${escapeHtml(q.correctAnswer)}</span></div>
            </div>
            ${q.explanation ? `
              <div style="margin-top:0.6rem;padding:0.5rem 0.75rem;background:rgba(99,102,241,0.08);border-radius:var(--radius-sm);font-size:0.82rem;color:var(--text-secondary);line-height:1.5;">
                💡 <strong>Lời giải:</strong> ${escapeHtml(q.explanation)}
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  modal.classList.remove('hidden');
}

function closeVactWrongQuestionsModal() {
  const modal = document.getElementById('vactWrongQuestionsModal');
  if (modal) modal.classList.add('hidden');
}

window.updateVactStudentDashboard = updateVactStudentDashboard;
window.handleOpenWrongQuestionsModal = handleOpenWrongQuestionsModal;
window.closeVactWrongQuestionsModal = closeVactWrongQuestionsModal;

/* ================= V-ACT ADAPTIVE WEAKNESS PRACTICE ================= */
async function handleStartWeaknessPracticeClick() {
  const nameEl = document.getElementById('studentJoinName');
  const classEl = document.getElementById('studentJoinClass');

  const name = (nameEl?.value || AppState.studentName || '').trim();
  const className = (classEl?.value || AppState.studentClass || '').trim();
  const studentId = window.LocalStudentProfile?.getStudentId?.() || AppState.studentId || null;

  if (!name || !className) {
    showToast('⚠️ Vui lòng nhập Họ Tên và Lớp học của bạn để hệ thống tải dữ liệu điểm yếu!', 'warn');
    nameEl?.focus();
    nameEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  window.LocalStudentProfile?.updateProfile({ name, className, avatar: AppState.studentAvatar || '' });

  const loader = window.KEDUVACT?.sourceBankLoader || window.sourceBankLoader;
  if (loader && loader.getStatus() !== 'ready') {
    try {
      await loader.ready();
    } catch (err) {
      showToast('Không thể tải ngân hàng V-ACT từ nguồn xác thực. Vui lòng thử lại.', 'error');
      return;
    }
  }

  const adaptive = window.KEDUVACT?.adaptive || window.KEDUVACT?.adaptivePractice;
  if (!adaptive || typeof adaptive.generateWeaknessTest !== 'function') {
    showToast('Hệ thống Luyện Điểm Yếu Thích Ứng chưa sẵn sàng.', 'error');
    return;
  }

  try {
    showToast('🎯 Đang phân tích năng lực và tạo đề luyện điểm yếu...', 'info');
    const weaknessResult = adaptive.generateWeaknessTest({
      studentId: { studentName: name, studentClass: className, studentId },
      count: 20,
      minimumQuestions: 5,
      minimumAttempts: 1,
      weaknessThreshold: 60,
      adaptiveDifficulty: true
    });

    if (!weaknessResult.success) {
      showToast(weaknessResult.message || 'Chưa đủ dữ liệu nhận diện điểm yếu.', 'info');
      return;
    }

    const quizRecord = adaptive.formatWeaknessExamAsQuiz(weaknessResult);
    await StorageEngine.saveQuiz(quizRecord);

    const weakNames = weaknessResult.targetedWeaknesses.map(w => w.name).join(', ');
    showToast(`🎯 Đã tạo bài luyện điểm yếu (${weaknessResult.generatedCount} câu): ${weakNames}!`, 'success');

    await startExamWithQuizId(quizRecord.id || quizRecord.examId);
  } catch (err) {
    console.warn('handleStartWeaknessPracticeClick error:', err);
    showToast('Lỗi khi tạo bài luyện điểm yếu: ' + err.message, 'error');
  }
}

window.handleStartWeaknessPracticeClick = handleStartWeaknessPracticeClick;


/* ================= V-ACT REVIEW SYSTEM EVENT HANDLERS ================= */

function setVactReviewFilter(filter) {
  window._activeVactReviewFilter = filter;
  if (window._activeVactReviewAttempt && window.KEDUVACT?.review?.renderVactReviewHtml) {
    const container = document.getElementById('examReviewContainer');
    if (container) {
      container.innerHTML = window.KEDUVACT.review.renderVactReviewHtml(window._activeVactReviewAttempt, { filter });
      if (typeof renderMathInElement !== 'undefined') {
        renderMathInElement(container, {
          delimiters: [
            { left: "$$", right: "$$", display: true },
            { left: "$", right: "$", display: false },
            { left: "\(", right: "\)", display: false },
            { left: "\[", right: "\]", display: true }
          ],
          throwOnError: false
        });
      }
    }
  }
}

function scrollToReviewQuestion(num) {
  const el = document.getElementById('vact-review-q-' + num);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.style.transition = 'box-shadow 0.3s ease, border-color 0.3s ease';
    el.style.boxShadow = '0 0 0 3px #6366f1';
    setTimeout(() => {
      el.style.boxShadow = '';
    }, 1500);
  }
}

async function handleRetakeSimilarVactTest(mode, profileId) {
  try {
    showToast('Đang khởi tạo bài thi V-ACT tương tự với các câu hỏi mới...', 'info');
    if (profileId === 'vact_full' || mode === 'full_120') {
      if (typeof startFullVact120Exam === 'function') {
        await startFullVact120Exam();
        return;
      }
    } else if (profileId === 'vact_mini_100' || mode === 'mini_100') {
      if (typeof startMiniVact100Exam === 'function') {
        await startMiniVact100Exam();
        return;
      }
    } else if (mode === 'section_mini' || mode === 'weakness_practice') {
      if (typeof handleStartWeaknessPracticeClick === 'function') {
        await handleStartWeaknessPracticeClick();
        return;
      }
    }
    restartStudentJoin();
  } catch (err) {
    console.error('Error retaking similar V-ACT test:', err);
    showToast('Không thể tạo đề mới: ' + err.message, 'error');
  }
}

function returnToVactDashboard() {
  const resSec = document.getElementById('studentResultSection');
  if (resSec) resSec.classList.add('hidden');
  const exSec = document.getElementById('studentExamSection');
  if (exSec) exSec.classList.add('hidden');
  const joinSec = document.getElementById('studentJoinSection');
  if (joinSec) joinSec.classList.remove('hidden');
  updateVactStudentDashboard();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openVactAttemptReview(attemptId) {
  const analytics = window.KEDUVACT?.performanceAnalytics;
  if (!analytics) return;
  const name = (document.getElementById('studentJoinName')?.value || AppState.studentName || '').trim();
  const className = (document.getElementById('studentJoinClass')?.value || AppState.studentClass || '').trim();
  const studentId = window.LocalStudentProfile?.getStudentId?.() || AppState.studentId || null;

  const attempt = analytics.getAttemptById(attemptId, { studentName: name, studentClass: className, studentId });
  if (!attempt) {
    showToast('Không tìm thấy dữ liệu xem lại của bài thi này.', 'warn');
    return;
  }

  const reviewItems = (attempt.review || []).map((r, idx) => {
    if (r.friendlySource && r.status) return r;
    return window.KEDUVACT.review.buildReviewItem(r, r.given || r.studentAnswer, r.num || (idx + 1));
  });

  const fullAttempt = {
    ...attempt,
    title: attempt.title || (attempt.mode === 'full_120' ? 'Full V-ACT 120' : (attempt.mode === 'mini_100' ? 'Mini V-ACT 100' : 'V-ACT Mini Test')),
    duration: attempt.duration || 0,
    totalCount: attempt.generatedCount || reviewItems.length,
    correctCount: attempt.correct !== undefined ? attempt.correct : reviewItems.filter(r => r.isCorrect).length,
    incorrectCount: attempt.incorrect !== undefined ? attempt.incorrect : reviewItems.filter(r => r.status === 'incorrect').length,
    unansweredCount: attempt.unanswered !== undefined ? attempt.unanswered : reviewItems.filter(r => r.status === 'unanswered').length,
    accuracy: attempt.accuracy || (reviewItems.length ? Math.round((reviewItems.filter(r => r.isCorrect).length / reviewItems.length) * 100) : 0),
    sectionBreakdown: attempt.sectionResults || analytics.computeSectionAnalytics({ review: reviewItems }),
    review: reviewItems
  };

  window._activeVactReviewAttempt = fullAttempt;
  window._activeVactReviewFilter = 'all';

  document.getElementById('studentJoinSection')?.classList.add('hidden');
  document.getElementById('studentExamSection')?.classList.add('hidden');
  document.getElementById('studentResultSection')?.classList.remove('hidden');
  document.getElementById('studentExamReviewCard')?.classList.remove('hidden');

  renderExamResultHero({
    totalScore: fullAttempt.correctCount,
    correct: fullAttempt.correctCount,
    total: fullAttempt.totalCount,
    scorePct: fullAttempt.accuracy,
    timeTakenSeconds: fullAttempt.duration,
    tabSwitches: 0,
    subjectLabel: fullAttempt.title,
    review: fullAttempt.review,
    isVact: true
  }, { xpGained: 0, streak: 1, bonusBreakdown: [] });

  const container = document.getElementById('examReviewContainer');
  if (container) {
    container.innerHTML = window.KEDUVACT.review.renderVactReviewHtml(fullAttempt, { filter: 'all' });
    if (typeof renderMathInElement !== 'undefined') {
      renderMathInElement(container, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false },
          { left: "\(", right: "\)", display: false },
          { left: "\[", right: "\]", display: true }
        ],
        throwOnError: false
      });
    }
  }

  document.getElementById('studentExamReviewCard')?.scrollIntoView({ behavior: 'smooth' });
}

window.setVactReviewFilter = setVactReviewFilter;
window.scrollToReviewQuestion = scrollToReviewQuestion;
window.handleRetakeSimilarVactTest = handleRetakeSimilarVactTest;
window.returnToVactDashboard = returnToVactDashboard;
window.openVactAttemptReview = openVactAttemptReview;
