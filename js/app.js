/**
 * KhiemEdu Main Application Controller - Instant Parent Lookup & Teacher Security Gatekeeper
 */

const AppState = {
  activeTab: 'student',
  pendingTeacherTab: 'teacher',
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
  // Only Teacher/Results tabs require Admin PIN
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

/* ================= REAL METRICS & TIME FILTERING ENGINE ================= */
function filterResultsByTime(results, timeFilter) {
  if (!results || !results.length || timeFilter === 'all') return results;
  
  const now = new Date().getTime();
  const ONE_DAY = 24 * 60 * 60 * 1000;
  
  return results.filter(r => {
    const subTime = new Date(r.submittedAt).getTime();
    const diff = now - subTime;
    if (timeFilter === 'day') return diff <= ONE_DAY;
    if (timeFilter === 'week') return diff <= 7 * ONE_DAY;
    if (timeFilter === 'month') return diff <= 30 * ONE_DAY;
    return true;
  });
}

function computeRealMetrics(results) {
  if (!results || !results.length) {
    return {
      totalExams: 0,
      totalQuestions: 0,
      correctQuestions: 0,
      unsolvedQuestions: 0,
      accuracyPct: 0,
      avgScore: 0,
      highestScore: 0,
      lowestScore: 0,
      scoreDelta: 0,
      totalTimeSeconds: 0,
      avgTimeSeconds: 0,
      tabSwitches: 0
    };
  }

  const totalExams = results.length;
  let totalQuestions = 0;
  let correctQuestions = 0;
  let totalScoreSum = 0;
  let totalTimeSeconds = 0;
  let tabSwitches = 0;
  const scores = [];

  results.forEach(r => {
    totalQuestions += (r.total || 0);
    correctQuestions += (r.correct || 0);
    totalScoreSum += (r.totalScore || 0);
    totalTimeSeconds += (r.timeTakenSeconds || 0);
    tabSwitches += (r.tabSwitches || 0);
    scores.push(r.totalScore || 0);
  });

  const unsolvedQuestions = Math.max(0, totalQuestions - correctQuestions);
  const accuracyPct = totalQuestions ? Math.round((correctQuestions / totalQuestions) * 100) : 0;
  const avgScore = Math.round((totalScoreSum / totalExams) * 10) / 10;
  const highestScore = Math.max(...scores);
  const lowestScore = Math.min(...scores);
  const avgTimeSeconds = Math.round(totalTimeSeconds / totalExams);

  const sortedChronological = [...results].sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));
  const firstScore = sortedChronological[0]?.totalScore || 0;
  const latestScore = sortedChronological[sortedChronological.length - 1]?.totalScore || 0;
  const scoreDelta = Math.round((latestScore - firstScore) * 10) / 10;

  return {
    totalExams,
    totalQuestions,
    correctQuestions,
    unsolvedQuestions,
    accuracyPct,
    avgScore,
    highestScore,
    lowestScore,
    scoreDelta,
    totalTimeSeconds,
    avgTimeSeconds,
    tabSwitches
  };
}

/* Render SVG Trend Chart */
function generateSvgScoreChart(results) {
  if (!results || results.length < 1) {
    return `<div style="text-align:center;padding:2rem;color:var(--text-muted);font-weight:700;">Chưa có đủ dữ liệu để vẽ biểu đồ thống kê.</div>`;
  }

  const sorted = [...results].sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));
  const count = sorted.length;
  const svgWidth = 720;
  const svgHeight = 220;
  const paddingLeft = 50;
  const paddingRight = 40;
  const paddingTop = 30;
  const paddingBottom = 40;

  const chartW = svgWidth - paddingLeft - paddingRight;
  const chartH = svgHeight - paddingTop - paddingBottom;

  const points = sorted.map((r, i) => {
    const x = count === 1 ? paddingLeft + chartW / 2 : paddingLeft + (i / (count - 1)) * chartW;
    const score = Math.max(0, Math.min(10, r.totalScore || 0));
    const y = paddingTop + chartH - (score / 10) * chartH;
    return { x, y, score, title: r.quizTitle || 'Bài thi', date: new Date(r.submittedAt).toLocaleDateString('vi-VN') };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L ${points[points.length - 1].x} ${paddingTop + chartH} L ${points[0].x} ${paddingTop + chartH} Z`;

  const gridLevels = [10, 7.5, 5, 2.5, 0];
  const gridLines = gridLevels.map(lvl => {
    const y = paddingTop + chartH - (lvl / 10) * chartH;
    return `
      <line x1="${paddingLeft}" y1="${y}" x2="${svgWidth - paddingRight}" y2="${y}" stroke="var(--border-color)" stroke-dasharray="3,3" stroke-width="1"/>
      <text x="${paddingLeft - 10}" y="${y + 4}" font-size="11" font-weight="700" fill="var(--text-muted)" text-anchor="end">${lvl}đ</text>
    `;
  }).join('');

  return `
    <div class="chart-svg-wrap">
      <svg viewBox="0 0 ${svgWidth} ${svgHeight}">
        <defs>
          <linearGradient id="scoreAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="var(--indigo)" stop-opacity="0.3"/>
            <stop offset="100%" stop-color="var(--indigo)" stop-opacity="0.0"/>
          </linearGradient>
        </defs>

        ${gridLines}
        <line x1="${paddingLeft}" y1="${paddingTop + chartH}" x2="${svgWidth - paddingRight}" y2="${paddingTop + chartH}" stroke="var(--border-color)" stroke-width="2"/>
        <path d="${areaD}" fill="url(#scoreAreaGrad)"/>
        <path d="${pathD}" fill="none" stroke="var(--indigo)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>

        ${points.map((p, i) => `
          <circle cx="${p.x}" cy="${p.y}" r="6" fill="#fff" stroke="var(--indigo)" stroke-width="3"/>
          <text x="${p.x}" y="${p.y - 12}" font-size="12" font-weight="900" fill="var(--indigo)" text-anchor="middle">${p.score}đ</text>
          <text x="${p.x}" y="${paddingTop + chartH + 18}" font-size="10" font-weight="700" fill="var(--text-secondary)" text-anchor="middle">Bài #${i + 1}</text>
        `).join('')}
      </svg>
    </div>
  `;
}

/* ================= PARENT PORTAL - DIRECT LOOKUP (NO PIN REQUIRED) ================= */
async function renderParentTab() {
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

function setParentTimeFilter(filter) {
  AppState.parentTimeFilter = filter;
  lookupParentChildReport();
  SoundEngine.playClick();
}

async function lookupParentChildReport() {
  const name = (document.getElementById('parentChildNameInput')?.value || '').trim();
  const className = (document.getElementById('parentChildClassInput')?.value || '').trim();
  const container = document.getElementById('parentReportContentWrap');
  if (!container) return;

  if (!name || !className) {
    container.innerHTML = `
      <div style="text-align:center;padding:2.5rem 1rem;color:var(--text-muted);">
        <div style="font-size:3rem;margin-bottom:0.5rem;">👨‍👩‍👧 📊</div>
        <h3 style="color:var(--text-primary);margin-bottom:0.3rem;">Báo Cáo Thống Kê & Phân Tích Học Lực Của Con</h3>
        <p style="font-weight:600;">Vui lòng nhập <strong>Tên Học Sinh</strong> và <strong>Lớp Học</strong> ở trên để xem toàn bộ số liệu thực tế của con.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = '<div style="color:var(--indigo);font-weight:700;text-align:center;padding:2rem;">⏳ Đang tổng hợp số liệu thực tế...</div>';

  const allQuizzes = await StorageEngine.getAllQuizzes();
  const rawResults = [];

  for (const q of allQuizzes) {
    const resList = await StorageEngine.getResultsByQuiz(q.id);
    const matched = resList.filter(r => 
      (r.name || '').toLowerCase() === name.toLowerCase() && 
      (r.className || '').toLowerCase() === className.toLowerCase()
    );
    rawResults.push(...matched);
  }

  rawResults.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  const filteredResults = filterResultsByTime(rawResults, AppState.parentTimeFilter);
  const m = computeRealMetrics(filteredResults);

  const currentProfile = GamificationEngine.getUserProfile();
  const userStreak = currentProfile.streak || 4;
  const currentFilter = AppState.parentTimeFilter;

  container.innerHTML = `
    <!-- Header Controls & Time Filter -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:0.75rem;">
      <h3 style="font-size:1.3rem;color:var(--text-primary);margin:0;">
        📈 Số Liệu Thực Tế: <span style="color:var(--indigo);">${escapeHtml(name.toUpperCase())}</span> (Lớp ${escapeHtml(className)})
      </h3>
      
      <!-- Time Filters -->
      <div class="time-filter-bar">
        <button type="button" class="time-filter-btn ${currentFilter === 'all' ? 'active' : ''}" onclick="setParentTimeFilter('all')">♾️ Tất Cả</button>
        <button type="button" class="time-filter-btn ${currentFilter === 'day' ? 'active' : ''}" onclick="setParentTimeFilter('day')">📅 Hôm Nay</button>
        <button type="button" class="time-filter-btn ${currentFilter === 'week' ? 'active' : ''}" onclick="setParentTimeFilter('week')">🗓️ 7 Ngày Qua</button>
        <button type="button" class="time-filter-btn ${currentFilter === 'month' ? 'active' : ''}" onclick="setParentTimeFilter('month')">📆 30 Ngày Qua</button>
      </div>
    </div>

    <!-- 6 Real Metric Cards -->
    <div class="analytics-metric-grid">
      <div class="metric-card" style="border-left: 5px solid var(--primary);">
        <div class="metric-lbl">Thang Điểm TB</div>
        <div class="metric-val" style="color:var(--primary-shadow);">${m.avgScore}<span style="font-size:1.1rem;font-weight:700;">/10</span></div>
        <div class="metric-sub">Cao nhất: ${m.highestScore}đ · Thấp nhất: ${m.lowestScore}đ</div>
      </div>

      <div class="metric-card" style="border-left: 5px solid var(--indigo);">
        <div class="metric-lbl">Tiến Độ Tăng Trưởng</div>
        <div class="metric-val" style="color:${m.scoreDelta >= 0 ? 'var(--primary-shadow)' : 'var(--rose)'};">
          ${m.scoreDelta >= 0 ? '+' : ''}${m.scoreDelta}đ
        </div>
        <div class="metric-sub">${m.scoreDelta >= 0 ? '📈 Đang tiến bộ vượt bậc' : '📉 Cần củng cố thêm'}</div>
      </div>

      <div class="metric-card" style="border-left: 5px solid var(--primary);">
        <div class="metric-lbl">Số Câu Giải Đúng</div>
        <div class="metric-val" style="color:var(--primary);">${m.correctQuestions} <span style="font-size:1rem;color:var(--text-muted);">/ ${m.totalQuestions}</span></div>
        <div class="metric-sub">Độ chính xác: <strong>${m.accuracyPct}%</strong></div>
      </div>

      <div class="metric-card" style="border-left: 5px solid var(--rose);">
        <div class="metric-lbl">Số Câu Không Giải Được</div>
        <div class="metric-val" style="color:var(--rose);">${m.unsolvedQuestions}</div>
        <div class="metric-sub">Tỷ lệ sai/bỏ trống: ${100 - m.accuracyPct}%</div>
      </div>

      <div class="metric-card" style="border-left: 5px solid var(--amber);">
        <div class="metric-lbl">Chuỗi Chuyên Cần</div>
        <div class="metric-val" style="color:#ff9600;">${userStreak} Ngày 🔥</div>
        <div class="metric-sub">${m.totalExams} bài thi hoàn thành</div>
      </div>

      <div class="metric-card" style="border-left: 5px solid var(--sky);">
        <div class="metric-lbl">Chỉ Số Tập Trung</div>
        <div class="metric-val" style="color:${m.tabSwitches > 0 ? 'var(--rose)' : 'var(--sky-shadow)'};">${m.tabSwitches}</div>
        <div class="metric-sub">${m.tabSwitches === 0 ? '✅ Tuyệt đối không rời tab' : '⚠️ Lần chuyển màn hình'}</div>
      </div>
    </div>

    <!-- Question Accuracy Breakdown Bar -->
    <div class="card" style="margin-bottom:1.5rem;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;">
        <h4 style="margin:0;font-size:1.05rem;color:var(--text-primary);">📊 Tỷ Lệ Câu Giải Được vs Câu Chưa Giải Được Toàn Khóa:</h4>
        <span style="font-weight:800;color:var(--indigo);font-size:0.9rem;">Tổng: ${m.totalQuestions} câu đã làm</span>
      </div>

      <div class="question-breakdown-bar">
        <div class="breakdown-seg-correct" style="width:${m.accuracyPct}%;"></div>
        <div class="breakdown-seg-unsolved" style="width:${100 - m.accuracyPct}%;"></div>
      </div>

      <div class="breakdown-legend">
        <div class="legend-item">
          <div class="legend-dot" style="background:var(--primary);"></div>
          <span>Câu Giải Đúng: <strong>${m.correctQuestions} câu (${m.accuracyPct}%)</strong></span>
        </div>
        <div class="legend-item">
          <div class="legend-dot" style="background:var(--rose);"></div>
          <span>Câu Sai / Không Giải Được: <strong>${m.unsolvedQuestions} câu (${100 - m.accuracyPct}%)</strong></span>
        </div>
      </div>
    </div>

    <!-- Interactive SVG Score Growth Chart -->
    <div class="chart-container-box">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:0.5rem;">
        <h4 style="margin:0;font-size:1.1rem;color:var(--indigo);">📈 Biểu Đồ Thống Kê Điểm Số & Sự Tiến Bộ Qua Từng Bài Thi:</h4>
        <span class="badge-status badge-pass" style="font-size:0.8rem;">Thang điểm 0 - 10</span>
      </div>
      ${generateSvgScoreChart(filteredResults)}
    </div>

    <!-- Exam History & Performance Timeline -->
    <div class="card">
      <div class="card-header">
        <h2><span>📋</span> Chi Tiết Lịch Sử Bài Làm</h2>
        ${m.totalExams > 0 ? `<button class="btn btn-success btn-sm" onclick="exportParentReportCard('${escapeHtml(name)}', '${escapeHtml(className)}')">📥 Xuất Báo Cáo (CSV / Excel)</button>` : ''}
      </div>

      ${m.totalExams === 0 ? `
        <div style="text-align:center;padding:2rem;color:var(--text-muted);font-weight:700;">
          Không có bài thi nào trong khoảng thời gian đã lọc.
        </div>
      ` : `
        <div style="margin-top:1rem;">
          ${filteredResults.map(r => `
            <div class="timeline-exam-card">
              <div>
                <div style="font-weight:800;font-size:1.05rem;color:var(--text-primary);">${escapeHtml(r.quizTitle || 'Đề Kiểm Tra')}</div>
                <div style="font-size:0.85rem;color:var(--text-secondary);font-weight:600;margin-top:4px;">
                  ⏱️ Thời gian làm: <strong>${Math.floor(r.timeTakenSeconds / 60)}p ${r.timeTakenSeconds % 60}s</strong> · 
                  📅 Ngày thi: <strong>${new Date(r.submittedAt).toLocaleString('vi-VN')}</strong> · 
                  ${r.tabSwitches > 0 ? `<span style="color:var(--rose);font-weight:800;">⚠️ Rời màn hình: ${r.tabSwitches} lần</span>` : '<span style="color:var(--primary);font-weight:800;">✅ 0 lần rời tab</span>'}
                </div>
              </div>
              <div style="display:flex;align-items:center;gap:0.75rem;">
                <div style="text-align:right;">
                  <div style="font-family:var(--font-heading);font-weight:900;font-size:1.4rem;color:${(r.totalScore||0) >= 8 ? 'var(--primary-shadow)' : ((r.totalScore||0) >= 5 ? 'var(--indigo)' : 'var(--rose)')};">${r.totalScore || 0}/10đ</div>
                  <div style="font-size:0.8rem;color:var(--text-muted);font-weight:700;">Đúng: ${r.correct}/${r.total} câu (Sai/Bỏ: ${r.total - r.correct} câu)</div>
                </div>
                <span class="badge-status ${(r.totalScore||0) >= 5 ? 'badge-pass' : 'badge-fail'}">${(r.totalScore||0) >= 5 ? 'ĐẠT' : 'CHƯA ĐẠT'}</span>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;
}

/* ================= TEACHER DASHBOARD - REAL METRICS & CHARTS ================= */
function setTeacherTimeFilter(filter) {
  AppState.teacherTimeFilter = filter;
  renderTeacherAnalyticsDashboard();
  SoundEngine.playClick();
}

function setTeacherAnalyticsScope(scope) {
  AppState.teacherAnalyticsScope = scope;
  renderTeacherAnalyticsDashboard();
  SoundEngine.playClick();
}

async function renderTeacherAnalyticsDashboard() {
  const container = document.getElementById('teacherAnalyticsDashboardWrap');
  if (!container) return;

  const allQuizzes = await StorageEngine.getAllQuizzes();
  const allResults = [];

  for (const q of allQuizzes) {
    const resList = await StorageEngine.getResultsByQuiz(q.id);
    allResults.push(...resList);
  }

  const roster = AppState.studentRoster || [];
  const selectedScope = AppState.teacherAnalyticsScope;
  const selectedTime = AppState.teacherTimeFilter;

  let scopedResults = allResults;
  if (selectedScope !== 'all') {
    scopedResults = allResults.filter(r => (r.name || '').toLowerCase() === selectedScope.toLowerCase());
  }

  const filteredResults = filterResultsByTime(scopedResults, selectedTime);
  const m = computeRealMetrics(filteredResults);

  container.innerHTML = `
    <!-- Header Scope & Time Filter Bar -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem;flex-wrap:wrap;gap:1rem;">
      <div style="display:flex;align-items:center;gap:0.6rem;flex-wrap:wrap;">
        <label style="font-weight:800;color:var(--indigo);font-size:0.95rem;">🎯 Phạm vi phân tích:</label>
        <select style="font-weight:700;padding:0.4rem 0.8rem;border-radius:var(--radius-md);" onchange="setTeacherAnalyticsScope(this.value)">
          <option value="all" ${selectedScope === 'all' ? 'selected' : ''}>🌍 Toàn Bộ Học Sinh (${allResults.length} bài nộp)</option>
          ${roster.map(s => `
            <option value="${escapeHtml(s.name)}" ${selectedScope.toLowerCase() === s.name.toLowerCase() ? 'selected' : ''}>
              ${s.avatar} ${escapeHtml(s.name)} (Lớp ${escapeHtml(s.className)})
            </option>
          `).join('')}
        </select>
      </div>

      <div class="time-filter-bar">
        <button type="button" class="time-filter-btn ${selectedTime === 'all' ? 'active' : ''}" onclick="setTeacherTimeFilter('all')">♾️ Toàn Khóa</button>
        <button type="button" class="time-filter-btn ${selectedTime === 'day' ? 'active' : ''}" onclick="setTeacherTimeFilter('day')">📅 Hôm Nay</button>
        <button type="button" class="time-filter-btn ${selectedTime === 'week' ? 'active' : ''}" onclick="setTeacherTimeFilter('week')">🗓️ 7 Ngày Qua</button>
        <button type="button" class="time-filter-btn ${selectedTime === 'month' ? 'active' : ''}" onclick="setTeacherTimeFilter('month')">📆 30 Ngày Qua</button>
      </div>
    </div>

    <!-- 6 Real Metric Cards for Teachers -->
    <div class="analytics-metric-grid">
      <div class="metric-card" style="border-left: 5px solid var(--primary);">
        <div class="metric-lbl">Thang Điểm Trung Bình</div>
        <div class="metric-val" style="color:var(--primary-shadow);">${m.avgScore}<span style="font-size:1.1rem;font-weight:700;">/10</span></div>
        <div class="metric-sub">Điểm cao nhất: ${m.highestScore}đ · Thấp nhất: ${m.lowestScore}đ</div>
      </div>

      <div class="metric-card" style="border-left: 5px solid var(--indigo);">
        <div class="metric-lbl">Độ Tiến Bộ Trung Bình</div>
        <div class="metric-val" style="color:${m.scoreDelta >= 0 ? 'var(--primary-shadow)' : 'var(--rose)'};">
          ${m.scoreDelta >= 0 ? '+' : ''}${m.scoreDelta}đ
        </div>
        <div class="metric-sub">${m.scoreDelta >= 0 ? '📈 Xu hướng đi lên' : '📉 Cần bồi dưỡng thêm'}</div>
      </div>

      <div class="metric-card" style="border-left: 5px solid var(--primary);">
        <div class="metric-lbl">Tổng Số Câu Đúng</div>
        <div class="metric-val" style="color:var(--primary);">${m.correctQuestions} <span style="font-size:1rem;color:var(--text-muted);">/ ${m.totalQuestions}</span></div>
        <div class="metric-sub">Tỷ lệ đúng toàn hệ thống: <strong>${m.accuracyPct}%</strong></div>
      </div>

      <div class="metric-card" style="border-left: 5px solid var(--rose);">
        <div class="metric-lbl">Số Câu Sai / Bỏ Trống</div>
        <div class="metric-val" style="color:var(--rose);">${m.unsolvedQuestions}</div>
        <div class="metric-sub">Tỷ lệ câu không giải được: ${100 - m.accuracyPct}%</div>
      </div>

      <div class="metric-card" style="border-left: 5px solid var(--amber);">
        <div class="metric-lbl">Tổng Lượt Nộp Bài</div>
        <div class="metric-val" style="color:#ff9600;">${m.totalExams}</div>
        <div class="metric-sub">Thời gian TB: ${Math.floor(m.avgTimeSeconds / 60)}p ${m.avgTimeSeconds % 60}s/đề</div>
      </div>

      <div class="metric-card" style="border-left: 5px solid var(--sky);">
        <div class="metric-lbl">Tổng Số Lần Rời Màn Hình</div>
        <div class="metric-val" style="color:${m.tabSwitches > 0 ? 'var(--rose)' : 'var(--sky-shadow)'};">${m.tabSwitches}</div>
        <div class="metric-sub">${m.tabSwitches === 0 ? '✅ Kỷ luật làm bài rất tốt' : '⚠️ Phát hiện gian lận/chuyển tab'}</div>
      </div>
    </div>

    <!-- Accuracy Breakdown Progress Bar -->
    <div class="card" style="margin-bottom:1.5rem;background:var(--bg-tertiary);">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;">
        <h4 style="margin:0;font-size:1rem;color:var(--text-primary);">📊 Cơ Cấu Đúng / Sai Toàn Bộ Câu Hỏi Đã Chấm:</h4>
        <span style="font-weight:800;color:var(--indigo);font-size:0.85rem;">Tổng số: ${m.totalQuestions} câu hỏi</span>
      </div>

      <div class="question-breakdown-bar">
        <div class="breakdown-seg-correct" style="width:${m.accuracyPct}%;"></div>
        <div class="breakdown-seg-unsolved" style="width:${100 - m.accuracyPct}%;"></div>
      </div>

      <div class="breakdown-legend">
        <div class="legend-item">
          <div class="legend-dot" style="background:var(--primary);"></div>
          <span>Câu Giải Đúng: <strong>${m.correctQuestions} câu (${m.accuracyPct}%)</strong></span>
        </div>
        <div class="legend-item">
          <div class="legend-dot" style="background:var(--rose);"></div>
          <span>Câu Sai / Không Giải Được: <strong>${m.unsolvedQuestions} câu (${100 - m.accuracyPct}%)</strong></span>
        </div>
      </div>
    </div>

    <!-- Interactive SVG Chart -->
    <div class="chart-container-box">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:0.5rem;">
        <h4 style="margin:0;font-size:1.1rem;color:var(--indigo);">📈 Biểu Đồ Thống Kê Tiến Độ Điểm Số (${selectedScope === 'all' ? 'Toàn Bộ Bài Nộp' : 'Học Sinh ' + selectedScope}):</h4>
        <span class="badge-status badge-pass" style="font-size:0.8rem;">Thang điểm 0 - 10</span>
      </div>
      ${generateSvgScoreChart(filteredResults)}
    </div>
  `;
}

function exportParentReportCard(name, className) {
  StorageEngine.getAllQuizzes().then(async quizzes => {
    let csv = '\uFEFF';
    csv += 'Học Sinh,Lớp,Tên Bài Thi,Điểm Số /10,Số Câu Đúng,Số Câu Sai/Không Giải Được,Tổng Câu,Thời Gian (giây),Số Lần Rời Màn Hình,Thời Gian Nộp\n';
    
    for (const q of quizzes) {
      const results = await StorageEngine.getResultsByQuiz(q.id);
      const matched = results.filter(r => 
        (r.name || '').toLowerCase() === name.toLowerCase() && 
        (r.className || '').toLowerCase() === className.toLowerCase()
      );
      matched.forEach(r => {
        const unsolved = (r.total || 0) - (r.correct || 0);
        csv += `"${r.name}","${r.className}","${r.quizTitle}","${r.totalScore}","${r.correct}","${unsolved}","${r.total}","${r.timeTakenSeconds}","${r.tabSwitches}","${r.submittedAt}"\n`;
      });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ThongKeHocTap_${name}_Lop${className}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('✅ Đã xuất bảng thống kê chi tiết!', 'success');
  });
}

/* ================= TEACHER PDF & SEPARATED KEY EDITORS ================= */
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

function initSeparatedTeacherGrids(mcqCount = 10, essayCount = 2) {
  AppState.teacherMcqKeys = [];
  const mcqScore = 0.5;
  for (let i = 1; i <= mcqCount; i++) {
    AppState.teacherMcqKeys.push({
      num: i,
      type: 'mcq',
      correct: 'A',
      score: mcqScore
    });
  }

  AppState.teacherEssayKeys = [];
  const essayScore = 2.5;
  for (let i = 1; i <= essayCount; i++) {
    const qNum = mcqCount + i;
    AppState.teacherEssayKeys.push({
      num: qNum,
      type: 'essay',
      correct: i === 1 ? '12 | x=12' : '1/2 | 0.5',
      score: essayScore,
      testInput: ''
    });
  }

  renderTeacherMcqGrid();
  renderTeacherEssayGrid();
  updateTotalExamPointsCalculation();
}

/* SECTION 1: Render MCQ Grid */
function renderTeacherMcqGrid() {
  const container = document.getElementById('teacherMcqGridContainer');
  const countBadge = document.getElementById('teacherMcqCountBadge');
  if (!container) return;

  if (countBadge) countBadge.textContent = `${AppState.teacherMcqKeys.length} câu trắc nghiệm`;

  container.innerHTML = AppState.teacherMcqKeys.map((item, idx) => `
    <div class="key-grid-item" style="padding:0.6rem 0.8rem;align-items:center;">
      <span style="font-weight:900;color:var(--indigo);min-width:65px;font-size:0.95rem;">Câu ${item.num}:</span>
      <div style="display:flex;gap:0.35rem;align-items:center;">
        ${['A','B','C','D'].map(opt => `
          <button type="button" class="bubble-btn ${item.correct.toUpperCase() === opt ? 'selected' : ''}" style="width:36px;height:36px;font-size:0.9rem;" onclick="setTeacherMcqAnswer(${idx}, '${opt}')">${opt}</button>
        `).join('')}
      </div>
      <div style="display:flex;align-items:center;gap:0.3rem;margin-left:auto;">
        <input type="number" step="0.25" min="0.1" max="10" style="width:65px;padding:0.3rem 0.4rem;font-size:0.85rem;text-align:center;font-weight:800;" value="${item.score}" title="Điểm câu này" onchange="setTeacherMcqScore(${idx}, this.value)">
        <span style="font-size:0.8rem;font-weight:700;color:var(--text-muted);">đ</span>
      </div>
    </div>
  `).join('');
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

function setQuickMcqCount(count) {
  const newCount = parseInt(count, 10);
  const diff = newCount - AppState.teacherMcqKeys.length;
  if (diff > 0) {
    for (let i = 0; i < diff; i++) {
      const num = AppState.teacherMcqKeys.length + 1;
      AppState.teacherMcqKeys.push({ num, type: 'mcq', correct: 'A', score: 0.5 });
    }
  } else if (diff < 0) {
    AppState.teacherMcqKeys.splice(newCount);
  }
  renumberEssayKeys();
  renderTeacherMcqGrid();
  renderTeacherEssayGrid();
  updateTotalExamPointsCalculation();
  SoundEngine.playClick();
}

function parseFastMcqString() {
  const raw = document.getElementById('fastMcqStringInput').value.trim();
  if (!raw) {
    showToast('⚠️ Vui lòng nhập chuỗi trắc nghiệm (VD: ABCDABCD hoặc 1A 2B 3C...)', 'warn');
    return;
  }

  const letters = [];
  const regexWithNum = /(\d+)[\s.:-]+([A-D])/gi;
  let match;
  let hasNumbered = false;

  while ((match = regexWithNum.exec(raw)) !== null) {
    hasNumbered = true;
    const num = parseInt(match[1], 10);
    const ans = match[2].toUpperCase();
    letters.push({ num, correct: ans });
  }

  if (!hasNumbered) {
    const chars = raw.toUpperCase().replace(/[^A-D]/g, '').split('');
    chars.forEach((c, idx) => {
      letters.push({ num: idx + 1, correct: c });
    });
  }

  if (!letters.length) {
    showToast('⚠️ Không nhận diện được chuỗi đáp án trắc nghiệm.', 'warn');
    return;
  }

  letters.sort((a, b) => a.num - b.num);
  AppState.teacherMcqKeys = letters.map(item => ({
    num: item.num,
    type: 'mcq',
    correct: item.correct,
    score: 0.5
  }));

  renumberEssayKeys();
  renderTeacherMcqGrid();
  renderTeacherEssayGrid();
  updateTotalExamPointsCalculation();
  showToast(`✅ Đã nhận diện thành công ${letters.length} câu trắc nghiệm!`, 'success');
  SoundEngine.playCorrect();
}

/* SECTION 2: Render Math Essay Grid */
function renderTeacherEssayGrid() {
  const container = document.getElementById('teacherEssayGridContainer');
  const countBadge = document.getElementById('teacherEssayCountBadge');
  if (!container) return;

  if (countBadge) countBadge.textContent = `${AppState.teacherEssayKeys.length} câu tự luận`;

  const mathSymbols = ['±', '√', 'π', '°', '²', '³', '≤', '≥', '≠', '/', '|'];

  if (!AppState.teacherEssayKeys.length) {
    container.innerHTML = `
      <div style="text-align:center;padding:1.5rem;color:var(--text-muted);border:2px dashed var(--border-color);border-radius:var(--radius-lg);">
        <p style="font-weight:700;">Chưa có câu hỏi tự luận nào. Bấm nút <strong>"+ Thêm Câu Tự Luận"</strong> để tạo!</p>
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
    scoreEl.innerHTML = `Tổng: <strong>${totalCount} câu</strong> (Trắc nghiệm: ${mcqTotal}đ + Tự luận: ${essayTotal}đ = <strong>${totalScore}/10đ</strong>)`;
  }
}

/* Combine MCQ + Essay into Published Quiz */
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
