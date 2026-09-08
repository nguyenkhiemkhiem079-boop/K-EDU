const StudentAnalytics = {
  // Backfill dữ liệu lịch sử nếu bị thiếu category
  async backfillData() {
    console.log('[StudentAnalytics] Bắt đầu kiểm tra và backfill dữ liệu cũ...');
    if (!window.StorageEngine) {
      console.error('StorageEngine chưa được load.');
      return 0;
    }

    const allResults = await window.StorageEngine.getAllResults();
    let updatedCount = 0;
    let missingQuizCount = 0;
    
    for (const result of allResults) {
      let needsUpdate = false;
      const quiz = await window.StorageEngine.getQuiz(result.quizId);
      
      if (!quiz || !quiz.keys) {
        missingQuizCount++;
        continue; // Không thể backfill nếu không còn quiz.keys
      }
      
      const keyMap = {};
      quiz.keys.forEach(k => {
        keyMap[k.num] = k.topic || k.category || '';
      });

      const reviewList = result.review || result.reviewData || [];
      if (Array.isArray(reviewList)) {
        for (const item of reviewList) {
          if (!item.category) { // Category bị rỗng
            const correctTopic = keyMap[item.num];
            if (correctTopic) {
              item.category = correctTopic;
              needsUpdate = true;
            }
          }
        }
      }

      if (needsUpdate) {
        // Cập nhật lại bản ghi (giữ nguyên ID)
        await window.StorageEngine.set(result.key || result.id, result);
        if (window.FirebaseEngine && window.FirebaseEngine.isActive) {
          await window.FirebaseEngine.saveResult(result);
        }
        updatedCount++;
      }
    }
    
    console.log(`[StudentAnalytics] Backfill hoàn tất. Cập nhật ${updatedCount} bản ghi.`);
    if (missingQuizCount > 0) {
      console.warn(`[StudentAnalytics] Không thể backfill ${missingQuizCount} bài do đề gốc không còn lưu trữ — thống kê cho các bài này sẽ bị thiếu (chỉ chính xác từ đây trở về sau).`);
    }
    return updatedCount;
  },

  async getStudentTopicStats(studentName, studentClass) {
    if (!window.StorageEngine) return [];

    const allResults = await window.StorageEngine.getAllResults();
    const studentResults = allResults.filter(r => 
      (r.name || '').toLowerCase() === (studentName || '').toLowerCase() &&
      (r.className || '').toLowerCase() === (studentClass || '').toLowerCase()
    );

    // Sắp xếp các bài theo thời gian nộp
    studentResults.sort((a, b) => new Date(a.time || a.createdAt || 0) - new Date(b.time || b.createdAt || 0));

    const stats = {};

    for (const result of studentResults) {
      const reviewList = result.review || result.reviewData || [];
      const topicAttempt = {}; // Gom nhóm trong 1 bài thi
      
      for (const item of reviewList) {
        const subject = item.subject || 'Chưa rõ';
        const category = item.category || 'Chưa phân loại';
        const isCorrect = item.isCorrect ? 1 : 0;
        
        const key = `${subject}|||${category}`;
        if (!topicAttempt[key]) {
          topicAttempt[key] = { correct: 0, total: 0 };
        }
        topicAttempt[key].total += 1;
        topicAttempt[key].correct += isCorrect;
      }
      
      for (const key in topicAttempt) {
        if (!stats[key]) {
          stats[key] = { attempts: [] };
        }
        stats[key].attempts.push(topicAttempt[key]);
      }
    }

    const finalStats = [];

    for (const key in stats) {
      const [subject, category] = key.split('|||');
      const attempts = stats[key].attempts;
      
      let totalQuestions = 0;
      let totalCorrect = 0;
      
      attempts.forEach(a => {
        totalQuestions += a.total;
        totalCorrect += a.correct;
      });

      // Ngưỡng tối thiểu 3 câu
      if (totalQuestions < 3) {
        finalStats.push({
          subject,
          category,
          totalQuestions,
          correct: totalCorrect,
          accuracy: null,
          insufficientData: true
        });
        continue;
      }

      const accuracy = (totalCorrect / totalQuestions) * 100;
      
      // Tính xu hướng: so sánh 3 lần gần nhất với quá khứ
      const recentAttempts = attempts.slice(-3);
      const oldAttempts = attempts.slice(0, -3);
      
      let trend = 'neutral';
      let trendDelta = 0;
      if (oldAttempts.length > 0 && recentAttempts.length > 0) {
        let recentT = 0, recentC = 0;
        recentAttempts.forEach(a => { recentT += a.total; recentC += a.correct; });
        const recentAcc = recentC / recentT;
        
        let oldT = 0, oldC = 0;
        oldAttempts.forEach(a => { oldT += a.total; oldC += a.correct; });
        const oldAcc = oldC / oldT;
        
        const delta = Math.round((recentAcc - oldAcc) * 100);
        trendDelta = delta;
        if (recentAcc > oldAcc + 0.05) trend = 'up';
        else if (recentAcc < oldAcc - 0.05) trend = 'down';
      }

      finalStats.push({
        subject,
        category,
        totalQuestions,
        correct: totalCorrect,
        accuracy,
        trend,
        trendDelta: trendDelta > 0 ? trendDelta : 0,
        insufficientData: false
      });
    }

    // Sort by accuracy ascending (Chủ đề cần ưu tiên củng cố lên đầu)
    finalStats.sort((a, b) => {
      if (a.insufficientData && b.insufficientData) return 0;
      if (a.insufficientData) return 1;
      if (b.insufficientData) return -1;
      return a.accuracy - b.accuracy;
    });

    return finalStats;
  },

  // Helper sinh lời nhận xét động viên theo chuẩn yêu cầu (tuyệt đối không tiêu cực)
  getStudentFeedbackComment(stat) {
    if (!stat || stat.insufficientData) {
      return "Chưa đủ dữ liệu để đánh giá chủ đề này (cần làm thêm ít nhất 3 câu)";
    }
    const acc = stat.accuracy;
    if (acc >= 80) {
      return "🌟 Em đã nắm rất vững chủ đề này!";
    } else if (acc >= 50) {
      return "💪 Em đang tiến bộ ở chủ đề này, luyện thêm nhé!";
    } else {
      return "📚 Đây là chủ đề em nên dành thêm thời gian ôn tập.";
    }
  },

  // Helper sinh dòng khích lệ khi phát hiện xu hướng cải thiện
  getStudentTrendComment(stat) {
    if (!stat || stat.insufficientData) return '';
    if (stat.trend === 'up' && stat.trendDelta > 0) {
      return `📈 Em đã cải thiện +${stat.trendDelta}% ở chủ đề này so với trước!`;
    }
    return '';
  },

  // Helper định hướng kế hoạch bồi dưỡng cho Giáo viên (tổng hợp, tích cực)
  getTeacherClassSuggestion(stat) {
    if (!stat || stat.insufficientData) {
      return "Chưa đủ dữ liệu để đánh giá chủ đề này (cần làm thêm ít nhất 3 câu)";
    }
    const acc = stat.accuracy;
    if (acc >= 80) {
      return "🌟 Lớp đang nắm rất vững chủ đề này. Thầy Cô có thể giới thiệu bài tập thử thách mở rộng.";
    } else if (acc >= 50) {
      return "💪 Lớp đang có tiến bộ tốt ở chủ đề này. Nên duy trì các bài luyện tập định kỳ.";
    } else {
      return "📚 Đây là chủ đề lớp nên dành thêm thời gian ôn tập và củng cố trọng tâm.";
    }
  },

  async getClassTopicStats(className, subjectFilter) {
    if (!window.StorageEngine) return [];

    const allResults = await window.StorageEngine.getAllResults();
    const classResults = allResults.filter(r => 
      (r.className || '').toLowerCase() === (className || '').toLowerCase()
    );

    const stats = {};

    for (const result of classResults) {
      const reviewList = result.review || result.reviewData || [];
      for (const item of reviewList) {
        const subject = item.subject || 'Chưa rõ';
        if (subjectFilter && subject.toLowerCase() !== subjectFilter.toLowerCase()) continue;
        
        const category = item.category || 'Chưa phân loại';
        const isCorrect = item.isCorrect ? 1 : 0;
        
        const key = `${subject}|||${category}`;
        if (!stats[key]) {
          stats[key] = { total: 0, correct: 0 };
        }
        stats[key].total += 1;
        stats[key].correct += isCorrect;
      }
    }

    const finalStats = [];
    for (const key in stats) {
      const [subject, category] = key.split('|||');
      const { total, correct } = stats[key];
      
      if (total < 3) {
         finalStats.push({ subject, category, totalQuestions: total, correct, accuracy: null, insufficientData: true });
         continue;
      }
      
      finalStats.push({
        subject, category, totalQuestions: total, correct, accuracy: (correct/total)*100, insufficientData: false
      });
    }

    // Sort by accuracy ascending
    finalStats.sort((a, b) => {
      if (a.insufficientData && b.insufficientData) return 0;
      if (a.insufficientData) return 1;
      if (b.insufficientData) return -1;
      return a.accuracy - b.accuracy;
    });

    return finalStats;
  },

  // Helper an toàn escape HTML
  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  // ================= PHẦN A: PHÍA HỌC SINH — "NHẬN XÉT CỦA EM" =================
  async renderStudentTopicFeedback(studentName, className, targetContainerId) {
    const wrap = document.getElementById(targetContainerId);
    if (!wrap) return;

    if (!studentName || !studentName.trim()) {
      if (targetContainerId === 'studentLobbyTopicFeedbackWrap') {
        wrap.innerHTML = '';
      } else {
        wrap.innerHTML = `
          <div class="card" style="border-left: 5px solid var(--indigo);">
            <div class="card-header">
              <h2><span>🌟</span> Nhận Xét Năng Lực Của Em</h2>
            </div>
            <p style="color:var(--text-secondary);font-weight:600;margin:0.5rem 0;">
              Vui lòng nhập Tên và Lớp học để xem nhận xét chi tiết theo từng chủ đề nhé!
            </p>
          </div>
        `;
      }
      return;
    }

    const cleanName = studentName.trim();
    const cleanClass = (className || '').trim();
    const stats = await this.getStudentTopicStats(cleanName, cleanClass);

    if (!stats || stats.length === 0) {
      wrap.innerHTML = `
        <div class="card" style="border-left: 5px solid var(--indigo);">
          <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;">
            <h2><span>🌟</span> Nhận Xét Năng Lực Của Em</h2>
            <span class="topic-stat-meta">👤 ${this.escapeHtml(cleanName)} ${cleanClass ? `(Lớp ${this.escapeHtml(cleanClass)})` : ''}</span>
          </div>
          <p style="color:var(--text-secondary);font-weight:600;margin:0.5rem 0;">
            Em chưa có lịch sử làm bài nào được lưu. Hãy thử sức với bài thi để cùng khám phá năng lực bản thân nhé! 🚀
          </p>
        </div>
      `;
      return;
    }

    wrap.innerHTML = `
      <div class="card" style="border-left: 5px solid var(--indigo);">
        <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;">
          <h2><span>🌟</span> Nhận Xét Của Em Theo Chủ Đề</h2>
          <span class="topic-stat-meta">👤 ${this.escapeHtml(cleanName)} ${cleanClass ? `(Lớp ${this.escapeHtml(cleanClass)})` : ''}</span>
        </div>
        <p style="color:var(--text-secondary);font-weight:600;font-size:0.95rem;margin:0.25rem 0 1rem 0;">
          Thống kê tỷ lệ chính xác và nhận xét chi tiết theo từng chủ đề đã làm (sắp xếp theo mức độ cần dành thêm thời gian ôn tập lên đầu):
        </p>

        <div class="topic-feedback-container">
          ${stats.map(stat => {
            const subjectLower = (stat.subject || '').toLowerCase();
            const subjectClass = subjectLower.includes('toán') || subjectLower === 'toan' ? 'topic-subject-toan'
              : subjectLower.includes('khtn') ? 'topic-subject-khtn' : 'topic-subject-other';
            
            let fillClass = 'topic-fill-insufficient';
            let widthStyle = 'width: 100%;';
            let metaText = '';

            if (stat.insufficientData) {
              metaText = 'Chưa đủ dữ liệu (tối thiểu 3 câu)';
            } else {
              const acc = Math.round(stat.accuracy);
              widthStyle = `width: ${Math.min(100, Math.max(5, acc))}%;`;
              fillClass = acc >= 80 ? 'topic-fill-mastery' : acc >= 50 ? 'topic-fill-progressing' : 'topic-fill-review';
              metaText = `${acc}% chính xác (${stat.correct}/${stat.totalQuestions} câu)`;
            }

            const mainComment = this.getStudentFeedbackComment(stat);
            const trendComment = this.getStudentTrendComment(stat);

            return `
              <div class="topic-feedback-item">
                <div class="topic-feedback-header">
                  <div class="topic-title-wrap">
                    <span class="topic-subject-badge ${subjectClass}">${this.escapeHtml(stat.subject || 'Chưa rõ')}</span>
                    <span>${this.escapeHtml(stat.category || 'Chưa phân loại')}</span>
                  </div>
                  <span class="topic-stat-meta">${metaText}</span>
                </div>

                <div class="topic-progress-track">
                  <div class="topic-progress-fill ${fillClass}" style="${fillClass === 'topic-fill-insufficient' ? '' : widthStyle}"></div>
                </div>

                <div class="topic-comment-box">
                  <div class="topic-main-comment">${this.escapeHtml(mainComment)}</div>
                  ${trendComment ? `<div class="topic-trend-line">${this.escapeHtml(trendComment)}</div>` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  },

  // ================= PHẦN B: PHÍA GIÁO VIÊN — "PHÂN TÍCH LỚP HỌC" =================
  async renderTeacherClassTopicAnalytics() {
    const tableWrap = document.getElementById('teacherClassTopicAnalyticsTableWrap');
    const classSelect = document.getElementById('classTopicFilterClass');
    const subjectSelect = document.getElementById('classTopicFilterSubject');
    if (!tableWrap) return;

    // Cập nhật danh sách các lớp học vào select nếu chưa có
    if (classSelect && window.StorageEngine) {
      const currentSelected = classSelect.value;
      const [allResults, roster] = await Promise.all([
        window.StorageEngine.getAllResults(),
        window.StorageEngine.getStudentRoster ? window.StorageEngine.getStudentRoster() : []
      ]);

      const classSet = new Set();
      (allResults || []).forEach(r => {
        if (r.className && r.className.trim()) classSet.add(r.className.trim());
      });
      (roster || []).forEach(s => {
        if (s.className && s.className.trim()) classSet.add(s.className.trim());
      });

      const sortedClasses = Array.from(classSet).sort();
      const optionsHtml = [
        `<option value="">-- Tất cả các lớp --</option>`,
        ...sortedClasses.map(c => `<option value="${this.escapeHtml(c)}" ${currentSelected === c ? 'selected' : ''}>Lớp ${this.escapeHtml(c)}</option>`)
      ].join('');

      // Chỉ cập nhật options nếu số lượng thay đổi hoặc chưa có
      if (classSelect.options.length <= 1 || sortedClasses.length !== (classSelect.options.length - 1)) {
        classSelect.innerHTML = optionsHtml;
        if (currentSelected && sortedClasses.includes(currentSelected)) {
          classSelect.value = currentSelected;
        }
      }
    }

    const selectedClass = classSelect ? classSelect.value : '';
    const selectedSubject = subjectSelect ? subjectSelect.value : '';

    const stats = await this.getClassTopicStats(selectedClass, selectedSubject);

    if (!stats || stats.length === 0) {
      tableWrap.innerHTML = `
        <div style="text-align:center;padding:2rem;background:var(--bg-card);border:1.5px dashed var(--border-color);border-radius:var(--radius-lg);color:var(--text-secondary);">
          <div style="font-size:2rem;margin-bottom:0.4rem;">📚</div>
          <div style="font-weight:800;font-size:1.05rem;color:var(--text-primary);margin-bottom:0.3rem;">Chưa Có Dữ Liệu Bài Làm Cho Bộ Lọc Này</div>
          <p style="font-size:0.9rem;font-weight:600;margin:0;">
            Hãy chọn lớp khác hoặc hướng dẫn học sinh làm bài thi để hệ thống tự động tổng hợp phân tích nhé!
          </p>
        </div>
      `;
      return;
    }

    tableWrap.innerHTML = `
      <div class="teacher-topic-table-wrap">
        <table class="teacher-topic-table">
          <thead>
            <tr>
              <th>Môn Học</th>
              <th>Chủ Đề</th>
              <th style="text-align:center;">Số Câu Cả Lớp Đã Làm</th>
              <th style="min-width:180px;">% Chính Xác TB Cả Lớp</th>
              <th>Định Hướng Củng Cố & Bồi Dưỡng</th>
              <th style="text-align:center;white-space:nowrap;">Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            ${stats.map(stat => {
              const subjectLower = (stat.subject || '').toLowerCase();
              const subjectClass = subjectLower.includes('toán') || subjectLower === 'toan' ? 'topic-subject-toan'
                : subjectLower.includes('khtn') ? 'topic-subject-khtn' : 'topic-subject-other';

              let accDisplay = '';
              if (stat.insufficientData) {
                accDisplay = `<span style="font-size:0.85rem;color:var(--text-muted);font-weight:700;">⏳ Chưa đủ dữ liệu (tối thiểu 3 câu)</span>`;
              } else {
                const acc = Math.round(stat.accuracy);
                const fillClass = acc >= 80 ? 'topic-fill-mastery' : acc >= 50 ? 'topic-fill-progressing' : 'topic-fill-review';
                accDisplay = `
                  <div style="display:flex;align-items:center;gap:0.6rem;">
                    <div class="topic-progress-track" style="flex:1;height:8px;margin:0;">
                      <div class="topic-progress-fill ${fillClass}" style="width:${Math.min(100, Math.max(5, acc))}%;"></div>
                    </div>
                    <span style="font-weight:800;font-size:0.88rem;min-width:40px;">${acc}%</span>
                  </div>
                `;
              }

              const suggestion = this.getTeacherClassSuggestion(stat);

              return `
                <tr>
                  <td><span class="topic-subject-badge ${subjectClass}">${this.escapeHtml(stat.subject || 'Chưa rõ')}</span></td>
                  <td style="font-weight:800;color:var(--text-primary);">${this.escapeHtml(stat.category || 'Chưa phân loại')}</td>
                  <td style="text-align:center;font-weight:700;">
                    ${stat.totalQuestions} câu <span style="font-size:0.8rem;color:var(--text-muted);">(${stat.correct} đúng)</span>
                  </td>
                  <td>${accDisplay}</td>
                  <td style="font-size:0.88rem;font-weight:600;color:var(--text-secondary);line-height:1.4;">
                    ${this.escapeHtml(suggestion)}
                  </td>
                  <td style="text-align:center;">
                    <button type="button" class="btn btn-secondary btn-sm" onclick="StudentAnalytics.openTeacherStudentDetailModal('${this.escapeHtml(selectedClass)}', '${this.escapeHtml(stat.category)}', '${this.escapeHtml(stat.subject)}')" style="font-size:0.8rem;padding:0.35rem 0.75rem;white-space:nowrap;">
                      🔍 Xem Chi Tiết
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  handleClassTopicFilterChange() {
    this.renderTeacherClassTopicAnalytics();
  },

  // Modal xem chi tiết từng học sinh (giữ tính riêng tư, không lộ trên view tổng)
  async openTeacherStudentDetailModal(selectedClass, category, subject) {
    const modal = document.getElementById('teacherStudentDetailModal');
    const modalBody = document.getElementById('teacherStudentDetailModalBody');
    if (!modal || !modalBody || !window.StorageEngine) return;

    const [allResults, roster] = await Promise.all([
      window.StorageEngine.getAllResults(),
      window.StorageEngine.getStudentRoster ? window.StorageEngine.getStudentRoster() : []
    ]);

    // Tìm danh sách học sinh thuộc lớp này
    const studentMap = new Map();
    (allResults || []).forEach(r => {
      if (!selectedClass || (r.className || '').toLowerCase() === selectedClass.toLowerCase()) {
        if (r.name && r.name.trim()) {
          studentMap.set(r.name.trim(), r.className || selectedClass);
        }
      }
    });
    (roster || []).forEach(s => {
      if (!selectedClass || (s.className || '').toLowerCase() === selectedClass.toLowerCase()) {
        if (s.name && s.name.trim()) {
          studentMap.set(s.name.trim(), s.className || selectedClass);
        }
      }
    });

    const students = Array.from(studentMap.entries()).map(([name, cls]) => ({ name, className: cls }));

    if (students.length === 0) {
      modalBody.innerHTML = `
        <div style="text-align:center;padding:2rem;color:var(--text-secondary);">
          <p style="font-weight:700;">Chưa tìm thấy học sinh nào thuộc lớp này có lịch sử làm bài.</p>
        </div>
      `;
      modal.classList.remove('hidden');
      return;
    }

    const firstStudent = students[0];

    modalBody.innerHTML = `
      <div style="margin-bottom:1rem;display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap;background:var(--bg-secondary);padding:0.75rem 1rem;border-radius:var(--radius-md);">
        <label style="font-weight:800;color:var(--text-primary);font-size:0.9rem;">👤 Chọn Học Sinh Trong Lớp:</label>
        <select id="teacherModalStudentSelect" onchange="StudentAnalytics.loadModalStudentDetails(this.value)" style="font-weight:700;padding:0.4rem 0.8rem;border:1.5px solid var(--border-color);border-radius:var(--radius-md);flex:1;min-width:200px;">
          ${students.map(s => `
            <option value="${this.escapeHtml(s.name)}|||${this.escapeHtml(s.className)}">${this.escapeHtml(s.name)} (Lớp ${this.escapeHtml(s.className)})</option>
          `).join('')}
        </select>
      </div>

      <div id="teacherModalStudentFeedbackContainer"></div>
    `;

    modal.classList.remove('hidden');
    this.loadModalStudentDetails(`${firstStudent.name}|||${firstStudent.className}`);
  },

  async loadModalStudentDetails(compositeValue) {
    if (!compositeValue) return;
    const [name, cls] = compositeValue.split('|||');
    await this.renderStudentTopicFeedback(name, cls, 'teacherModalStudentFeedbackContainer');
  },

  closeStudentDetailModal() {
    const modal = document.getElementById('teacherStudentDetailModal');
    if (modal) modal.classList.add('hidden');
  },

  // Hàm demo/test tự chạy để đối chiếu kết quả không cần UI
  async testDemo() {
    console.log("========== BẮT ĐẦU TEST BỘ THỐNG KÊ (STUDENT ANALYTICS) ==========");
    
    const mockResults = [
      {
        quizId: 'test-quiz-1',
        name: 'Nguyen Van A',
        className: '10A1',
        time: 1600000000000,
        reviewData: [
          // Đại số (2 đúng, 1 sai) => Tổng 3, Đúng 2 => 66.67%
          { subject: 'Toán', category: 'Đại số', isCorrect: true },
          { subject: 'Toán', category: 'Đại số', isCorrect: false },
          { subject: 'Toán', category: 'Đại số', isCorrect: true },
          
          // Hình học (1 đúng, 1 sai) => Tổng 2 (chưa đủ ngưỡng 3) => insufficientData: true
          { subject: 'Toán', category: 'Hình học', isCorrect: true },
          { subject: 'Toán', category: 'Hình học', isCorrect: false }
        ]
      },
      {
        quizId: 'test-quiz-2',
        name: 'Nguyen Van A',
        className: '10A1',
        time: 1600000000100,
        reviewData: [
          // Đại số (1 đúng, 0 sai) => Cũ + mới = Tổng 4, Đúng 3 => 75%
          { subject: 'Toán', category: 'Đại số', isCorrect: true },
          
          // Tổ hợp (3 đúng) => Tổng 3, Đúng 3 => 100%
          { subject: 'Toán', category: 'Tổ hợp', isCorrect: true },
          { subject: 'Toán', category: 'Tổ hợp', isCorrect: true },
          { subject: 'Toán', category: 'Tổ hợp', isCorrect: true }
        ]
      }
    ];

    if (!window.StorageEngine) {
      window.StorageEngine = {};
    }
    const originalGetAll = window.StorageEngine.getAllResults;
    window.StorageEngine.getAllResults = async () => mockResults;

    console.log("1. Kiểm tra getStudentTopicStats('Nguyen Van A', '10A1'):");
    const studentStats = await this.getStudentTopicStats('Nguyen Van A', '10A1');
    console.table(studentStats);
    
    // Kiểm chứng tay:
    // Đại số: 4 câu, 3 đúng -> 75%
    // Tổ hợp: 3 câu, 3 đúng -> 100%
    // Hình học: 2 câu -> insufficientData

    console.log("2. Kiểm tra getClassTopicStats('10A1'):");
    const classStats = await this.getClassTopicStats('10A1');
    console.table(classStats);

    window.StorageEngine.getAllResults = originalGetAll; // Phục hồi
    console.log("========== HOÀN TẤT TEST ==========");
  }
};

window.StudentAnalytics = StudentAnalytics;

