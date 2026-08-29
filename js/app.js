/**
 * KhiemEdu Main Application Controller - 32+ Avatar Library, Real Analytics & Massive Key Importer
 */

const AppState = {
  activeTab: 'student',
  pendingTeacherTab: 'teacher',
  currentQuiz: null,
  currentQuizId: '',
  studentName: '',
  studentClass: '',
  studentAvatar: '🦊',
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
  // Analytics Filters
  parentTimeFilter: 'all',
  teacherAnalyticsScope: 'all',
  teacherTimeFilter: 'all'
};

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
  } else if (tabId === 'parent') {
    renderParentTab();
  }
}

/* --- Teacher Modal Controls --- */
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

  // Filter by time range
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

      <!-- Grid lines for 0, 2.5, 5, 7.5, 10 -->
      ${[0, 2.5, 5, 7.5, 10].map(s => {
        const y = padTop + chartH - (s / 10) * chartH;
        return `
          <line x1="${padLeft}" y1="${y}" x2="${width - padRight}" y2="${y}" stroke="var(--border-color)" stroke-dasharray="4 4" stroke-width="1.2"/>
          <text x="${padLeft - 8}" y="${y + 4}" fill="var(--text-muted)" font-size="11" font-weight="700" text-anchor="end">${s}đ</text>
        `;
      }).join('')}

      <!-- Gradient Area -->
      <path d="${areaPath}" fill="url(#scoreAreaGrad)"/>

      <!-- Score Line -->
      <path d="${linePath}" fill="none" stroke="var(--indigo)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>

      <!-- Data Points & Labels -->
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

/* ================= QUIZ PUBLISHING & RESULTS ================= */
async function publishTeacherQuiz() {
  const combinedKeys = [...AppState.teacherMcqKeys, ...AppState.teacherEssayKeys];

  if (!combinedKeys.length) {
    showToast('⚠️ Vui lòng thiết lập ít nhất 1 câu hỏi trắc nghiệm hoặc tự luận.', 'warn');
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
    totalQuestions: combinedKeys.length,
    mcqCount: AppState.teacherMcqKeys.length,
    essayCount: AppState.teacherEssayKeys.length,
    examMode: 'split_pdf',
    pdfFileName: AppState.teacherFileName || 'De_Thi_Toan.pdf',
    pdfDataUrl: AppState.teacherPdfData || null,
    assignType,
    assignedClasses,
    assignedStudents,
    showLeaderboard,
    antiCheat,
    createdAt: new Date().toISOString(),
    answerKeys: combinedKeys
  };

  await StorageEngine.saveQuiz(quiz);
  if (AppState.teacherPdfData) {
    await StorageEngine.savePdfBlob(id, AppState.teacherPdfData);
  }

  SoundEngine.playFanfare();
  GamificationEngine.fireConfetti();

  updatePersonalizedExamFeed();
  renderTeacherQuizManager();
  renderTeacherAnalyticsDashboard();

  const targetDesc = assignType === 'all' 
    ? '🌍 Công khai toàn bộ' 
    : (assignType === 'classes' ? `🏫 Giao cho lớp: ${assignedClasses.join(', ')}` : `👤 Giao đích danh: ${assignedStudents.length} học sinh`);

  const resDiv = document.getElementById('publishSuccessResult');
  resDiv.innerHTML = `
    <div class="card" style="background:var(--primary-light);border-color:var(--primary);margin-top:1rem;">
      <h3 style="color:var(--primary-shadow);margin-bottom:0.4rem;">🎉 Đã Phát Hành Đề Thi Thành Công!</h3>
      <p style="color:var(--primary-shadow);font-size:0.95rem;font-weight:700;">Gồm ${AppState.teacherMcqKeys.length} câu trắc nghiệm + ${AppState.teacherEssayKeys.length} câu tự luận. Phạm vi: <strong>${targetDesc}</strong></p>
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

/* ================= ROSTER & ASSIGN SELECTOR ================= */
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

  const avatars = ['🦊', '🦉', '🦁', '🐼', '🚀', '⚡', '🌟', '🦄', '🤖', '🥷'];
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
  renderTeacherAnalyticsDashboard();
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

            return `
              <tr>
                <td><strong style="color:var(--text-primary);font-size:1rem;">${escapeHtml(q.title)}</strong></td>
                <td>${targetLabel}</td>
                <td>
                  <span class="badge-status badge-pass" style="font-size:0.75rem;">${mcqCount} Trắc nghiệm</span>
                  ${essayCount > 0 ? `<span class="badge-status" style="font-size:0.75rem;background:var(--amber-light);color:var(--amber-shadow);margin-left:4px;">${essayCount} Tự luận</span>` : ''}
                </td>
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
    renderTeacherAnalyticsDashboard();
  }
}

async function resetSampleQuiz() {
  StorageEngine.seedSampleDataIfEmpty();
  showToast('✅ Đã nạp lại đề thi mẫu thành công!', 'success');
  updatePersonalizedExamFeed();
  renderTeacherQuizManager();
  renderTeacherAnalyticsDashboard();
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
      if (q.assignType === 'students' && Array.isArray(q.assignedStudents)) {
        const studentTag = `${filterName} (${filterClass})`.toLowerCase();
        return q.assignedStudents.some(s => s.toLowerCase() === studentTag || s.toLowerCase().includes(filterName.toLowerCase()));
      }

      if (q.assignType === 'classes' && Array.isArray(q.assignedClasses)) {
        if (!filterClass) return false;
        return q.assignedClasses.some(c => c.toLowerCase() === filterClass.toLowerCase());
      }

      if (filterClass) {
        if (q.assignedClasses && q.assignedClasses.length > 0) {
          const matchClass = q.assignedClasses.some(c => c.toLowerCase() === filterClass.toLowerCase());
          if (!matchClass) return false;
        }

        const gradeMatch = q.title.match(/(?:Toán|Lớp)\s*(\d+)/i);
        if (gradeMatch && gradeMatch[1]) {
          const gradeNum = gradeMatch[1];
          if (gradeNum !== filterClass && !filterClass.startsWith(gradeNum)) {
            return false;
          }
        }
      }

      return true;
    });
  }

  const titleHeader = document.getElementById('studentFeedHeaderTitle');
  if (titleHeader) {
    if (filterName && filterClass) {
      titleHeader.textContent = `📚 Đề Thi Dành Riêng Cho: ${filterName} (Lớp ${filterClass})`;
    } else if (filterClass) {
      titleHeader.textContent = `📚 Danh Sách Đề Thi Lớp ${filterClass}`;
    } else {
      titleHeader.textContent = '📚 Danh Sách Đề Thi';
    }
  }

  if (!displayedQuizzes.length) {
    wrap.innerHTML = `
      <div style="text-align:center;padding:1.75rem 1rem;color:var(--text-muted);">
        <div style="font-size:2.5rem;margin-bottom:0.4rem;">📭</div>
        <p style="font-weight:800;font-size:1.05rem;color:var(--amber-shadow);">Hiện tại chưa có đề thi nào phù hợp với Lớp ${escapeHtml(filterClass || 'đang chọn')}.</p>
        <p style="font-size:0.875rem;margin-top:4px;">Khi giáo viên tạo đề và giao bài cho Lớp ${escapeHtml(filterClass || '')}, đề thi sẽ tự động xuất hiện ở đây.</p>
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

    const mcqCount = q.mcqCount || (q.answerKeys ? q.answerKeys.filter(k => k.type === 'mcq').length : 0);
    const essayCount = q.essayCount || (q.answerKeys ? q.answerKeys.filter(k => k.type === 'essay').length : 0);

    return `
      <div class="card" style="padding:1.25rem;margin-bottom:0.85rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;border-left:6px solid ${q.assignType === 'students' ? 'var(--amber)' : (q.assignType === 'classes' ? 'var(--sky)' : 'var(--primary)')};">
        <div>
          <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
            <div style="font-weight:800;font-size:1.15rem;color:var(--text-primary);">${escapeHtml(q.title)}</div>
            ${targetBadge}
          </div>
          <div style="font-size:0.9rem;color:var(--text-secondary);margin-top:4px;font-weight:600;">
            ⏳ <strong>${q.timeLimit} phút</strong> · 📝 <strong>${mcqCount} câu trắc nghiệm</strong> + <strong>${essayCount} câu tự luận</strong>
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
  if (AppState.studentAvatar) profile.avatar = AppState.studentAvatar;
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
          <h2 style="color:#4f46e5;margin-bottom:8px;">📄 ${escapeHtml(quiz.title)}</h2>
          <hr style="border:1px solid #cbd5e1;margin-bottom:20px;"/>
          <h3 style="color:#0f172a;">DANH SÁCH CÂU HỎI TRONG ĐỀ THI</h3>
          <p>Mời học sinh đọc kỹ đề bài trên văn bản và chọn đáp án tương ứng trên phiếu tô bên phải.</p>
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

  // Render Badges
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

  // Render Hall of Fame Top 3 & List
  renderHallOfFameLeaderboard();
}

async function renderHallOfFameLeaderboard() {
  const podiumWrap = document.getElementById('hallOfFamePodiumWrap');
  const listWrap = document.getElementById('hallOfFameListWrap');
  if (!podiumWrap || !listWrap) return;

  const roster = await StorageEngine.getStudentRoster();
  const allResults = await StorageEngine.getAllResults();

  // Aggregate stats per student
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
