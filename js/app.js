/**
 * KhiemEdu Main Application Controller - Real Metrics, Interactive SVG Charts & Dual Analytics
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
  teacherAnalyticsScope: 'all', // 'all' or student name
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

  // Score growth progress (Delta between earliest and latest exam)
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

  // Generate points (X: index, Y: score 0-10)
  const points = sorted.map((r, i) => {
    const x = count === 1 ? paddingLeft + chartW / 2 : paddingLeft + (i / (count - 1)) * chartW;
    const score = Math.max(0, Math.min(10, r.totalScore || 0));
    const y = paddingTop + chartH - (score / 10) * chartH;
    return { x, y, score, title: r.quizTitle || 'Bài thi', date: new Date(r.submittedAt).toLocaleDateString('vi-VN') };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L ${points[points.length - 1].x} ${paddingTop + chartH} L ${points[0].x} ${paddingTop + chartH} Z`;

  // Grid lines (0đ, 2.5đ, 5đ, 7.5đ, 10đ)
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

        <!-- Grid Lines -->
        ${gridLines}

        <!-- Baseline Axis -->
        <line x1="${paddingLeft}" y1="${paddingTop + chartH}" x2="${svgWidth - paddingRight}" y2="${paddingTop + chartH}" stroke="var(--border-color)" stroke-width="2"/>

        <!-- Area Fill -->
        <path d="${areaD}" fill="url(#scoreAreaGrad)"/>

        <!-- Trend Line -->
        <path d="${pathD}" fill="none" stroke="var(--indigo)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>

        <!-- Data Node Dots & Labels -->
        ${points.map((p, i) => `
          <circle cx="${p.x}" cy="${p.y}" r="6" fill="#fff" stroke="var(--indigo)" stroke-width="3"/>
          <text x="${p.x}" y="${p.y - 12}" font-size="12" font-weight="900" fill="var(--indigo)" text-anchor="middle">${p.score}đ</text>
          <text x="${p.x}" y="${paddingTop + chartH + 18}" font-size="10" font-weight="700" fill="var(--text-secondary)" text-anchor="middle">Bài #${i + 1}</text>
        `).join('')}
      </svg>
    </div>
  `;
}

/* ================= PARENT PORTAL - REAL METRICS DASHBOARD ================= */
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
        <h3 style="color:var(--text-primary);margin-bottom:0.3rem;">Báo Cáo Thống Kê & Phân Tích Học Lực Thực Tế</h3>
        <p style="font-weight:600;">Vui lòng nhập <strong>Tên Học Sinh</strong> và <strong>Lớp Học</strong> ở trên để tải toàn bộ số liệu thống kê chi tiết của con.</p>
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
  const userXp = currentProfile.xp || 520;
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
        <div class="breakdown-seg-correct" style="width:${m.accuracyPct}%;" title="Số câu đúng: ${m.correctQuestions} câu (${m.accuracyPct}%)"></div>
        <div class="breakdown-seg-unsolved" style="width:${100 - m.accuracyPct}%;" title="Số câu không giải được: ${m.unsolvedQuestions} câu (${100 - m.accuracyPct}%)"></div>
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
      <!-- Scope Selector (Toàn trường vs Từng Học Sinh) -->
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

      <!-- Time Filter Bar -->
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
        keys.push({ num: q, type: q > 10 ? 'essay' : 'mcq', correct: q > 10 ? '12' : 'A', score: defaultScore });
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
  renderTeacherAnalyticsDashboard();
  updatePersonalizedExamFeed();

  SoundEngine.playFanfare();
  GamificationEngine.fireConfetti();
  showToast(`🎉 ĐÃ PHÁT HÀNH THÀNH CÔNG ${count} ĐỀ THI HÀNG LOẠT!`, 'success');
}

/* ================= STRICT PERSONALIZED EXAM FEED ================= */
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
          <h2 style="color:#4f46e5;margin-bottom:8px;">📄 ${escapeHtml(quiz.title)}</h2>
          <hr style="border:1px solid #cbd5e1;margin-bottom:20px;"/>
          <h3 style="color:#0f172a;">I. PHẦN TRẮC NGHIỆM</h3>
          <p><strong>Câu 1:</strong> Đơn thức nào sau đây đồng dạng với đơn thức $-3x^2y$?<br/>A. $2xy$ &nbsp;&nbsp;&nbsp; B. $5x^2y$ &nbsp;&nbsp;&nbsp; C. $-3xy^2$ &nbsp;&nbsp;&nbsp; D. $x^3y$</p>
          <p><strong>Câu 2:</strong> Khai triển hằng đẳng thức $(x + 2)^2$ ta được:<br/>A. $x^2 + 4$ &nbsp;&nbsp;&nbsp; B. $x^2 + 2x + 4$ &nbsp;&nbsp;&nbsp; C. $x^2 + 4x + 4$ &nbsp;&nbsp;&nbsp; D. $x^2 - 4x + 4$</p>
          <hr style="border:1px solid #cbd5e1;margin:25px 0;"/>
          <h3 style="color:#0f172a;">II. PHẦN TỰ LUẬN ĐIỀN ĐÁP SỐ</h3>
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

/* Enhanced Smart Math Matcher */
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
