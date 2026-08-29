/**
 * ToanMath Platform - Ứng dụng Quản lý CSDL & Phòng Thi Toán THCS
 * Điều phối chính & Tương tác giao diện với Lưu Trữ Bền Vững LocalStorage
 */

// Khởi tạo các module
const dataManager = new QuestionDataManager();
const examBuilder = new ExamBuilder(dataManager);
let examRunner = null;
let currentGeneratedExam = null;
let currentExamList = [];

// Khởi động ứng dụng
document.addEventListener("DOMContentLoaded", () => {
  examRunner = new ExamRunner(dataManager, handleExamFinished);
  
  // Tải danh sách đề thi đã lưu từ LocalStorage (Không tự động tạo lại nếu người dùng đã xóa)
  loadSavedExams();

  // Hiển thị danh sách câu hỏi ngân hàng
  renderQuestionBankList();

  // Render toán học KaTeX ban đầu
  renderMathInDocument();

  // Khởi tạo preview trong modal
  renderMathPreview('newContent', 'contentPreview');
  renderMathPreview('newSolution', 'solutionPreview');
});

/**
 * Tải danh sách đề thi đã lưu từ LocalStorage
 */
function loadSavedExams() {
  const saved = dataManager.getSavedExams();
  const isInitialized = localStorage.getItem("toanmath_exams_initialized");

  if (saved !== null) {
    currentExamList = saved;
  } else if (!isInitialized) {
    // Chỉ khởi tạo 3 đề mẫu 1 lần duy nhất trong lần đầu mở trang
    initSampleExams();
  } else {
    currentExamList = [];
  }

  // Nếu có đề đã lưu thì hiển thị đề đầu tiên ở khu vực tạo đề
  if (currentExamList.length > 0) {
    currentGeneratedExam = currentExamList[0];
    displayGeneratedExamPreview(currentGeneratedExam);
  } else {
    document.getElementById("latestExamPreview").innerHTML = `
      <p style="color: var(--text-muted);">Chưa có đề thi nào trong danh sách. Hãy nhập thông số và bấm <strong>"Sinh Đề Thi Ngay"</strong>!</p>
    `;
    const essayCard = document.getElementById("essayCustomizerCard");
    if (essayCard) essayCard.style.display = "none";
  }
}

function initSampleExams() {
  currentExamList = [
    examBuilder.generateExam({
      title: "Đề Kiểm Tra Toán Học — Lớp 10",
      grade: 10,
      duration: 45,
      numChoice: 10,
      numEssay: 2,
      examCode: 101
    }),
    examBuilder.generateExam({
      title: "Đề Khảo Sát Chất Lượng Toán 9 (Giữa Kỳ)",
      grade: 9,
      duration: 45,
      numChoice: 12,
      numEssay: 2,
      examCode: 202
    }),
    examBuilder.generateExam({
      title: "Đề Kiểm Tra Định Kỳ Đại Số & Hình Học 8",
      grade: 8,
      duration: 45,
      numChoice: 8,
      numEssay: 2,
      examCode: 303
    })
  ];

  // Gán nhãn mẫu cho câu tự luận
  if (currentExamList[0].questions[10]) currentExamList[0].questions[10].questionLabel = "Câu 11";
  if (currentExamList[0].questions[11]) currentExamList[0].questions[11].questionLabel = "Câu 12";

  dataManager.saveAllExams(currentExamList);
}

/**
 * Hiển thị Toast thông báo trạng thái
 */
function showToast(message, type = "success") {
  let toast = document.getElementById("appToastNotification");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "appToastNotification";
    toast.style.cssText = `
      position: fixed;
      bottom: 25px;
      right: 25px;
      padding: 0.85rem 1.4rem;
      border-radius: 10px;
      font-weight: 600;
      font-size: 0.95rem;
      color: #fff;
      z-index: 9999;
      box-shadow: 0 10px 25px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.3s ease;
      opacity: 0;
      transform: translateY(20px);
    `;
    document.body.appendChild(toast);
  }

  toast.style.background = type === "success" ? "#10b981" : (type === "danger" ? "#ef4444" : "#4f46e5");
  toast.innerHTML = (type === "success" ? "✓ " : "ℹ ") + message;
  toast.style.opacity = "1";
  toast.style.transform = "translateY(0)";

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(20px)";
  }, 2500);
}

/**
 * Điều hướng giữa 2 phân hệ độc lập: Creator (Quản trị/Tạo đề) & Exam (Phòng thi)
 */
function switchModule(moduleName) {
  const tabCreator = document.getElementById("tabBtnCreator");
  const tabExam = document.getElementById("tabBtnExam");
  const modCreator = document.getElementById("moduleCreator");
  const modExam = document.getElementById("moduleExam");

  if (moduleName === 'creator') {
    tabCreator.classList.add("active");
    tabExam.classList.remove("active");
    modCreator.classList.add("active");
    modExam.classList.remove("active");
    renderQuestionBankList();
    if (currentGeneratedExam) displayGeneratedExamPreview(currentGeneratedExam);
  } else {
    tabCreator.classList.remove("active");
    tabExam.classList.add("active");
    modCreator.classList.remove("active");
    modExam.classList.add("active");
    showExamSelectScreen();
  }

  renderMathInDocument();
}

/**
 * Chuyển đổi theme Sáng/Tối
 */
function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  html.setAttribute("data-theme", next);
}

/**
 * Tự động render KaTeX cho toàn bộ hoặc phần tử cụ thể
 */
function renderMathInDocument(targetElem = document.body) {
  if (typeof renderMathInElement === "function") {
    renderMathInElement(targetElem, {
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

/**
 * Render xem trước công thức Toán tức thì khi gõ
 */
function renderMathPreview(inputId, previewId) {
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  if (!input || !preview) return;

  preview.innerHTML = input.value.replace(/\n/g, '<br>') || "<em>Chưa có nội dung</em>";
  renderMathInDocument(preview);
}

/**
 * Chèn nhanh ký hiệu toán học vào ô nhập liệu
 */
function insertSymbol(targetInputId, symbol) {
  const input = document.getElementById(targetInputId);
  if (!input) return;

  const start = input.selectionStart || 0;
  const end = input.selectionEnd || 0;
  const text = input.value;

  input.value = text.substring(0, start) + symbol + text.substring(end);
  input.focus();
  input.selectionStart = input.selectionEnd = start + symbol.length;

  if (targetInputId === 'newContent') renderMathPreview('newContent', 'contentPreview');
  if (targetInputId === 'newSolution') renderMathPreview('newSolution', 'solutionPreview');
  if (targetInputId === 'newEssayAnswer') handleLiveAnswerTest();

  if (targetInputId.startsWith('custom_essay_ans_')) {
    const qIdx = targetInputId.replace('custom_essay_ans_', '');
    handleLiveTestEssayCustomizer(qIdx);
  }
}

// ==================== PHÂN HỆ 1: QUẢN LÝ DỮ LIỆU & TẠO ĐỀ ====================

function renderQuestionBankList() {
  const container = document.getElementById("questionBankList");
  const badge = document.getElementById("totalQuestionsBadge");
  if (!container) return;

  const questions = dataManager.getFilteredQuestions();
  badge.innerText = `${questions.length} câu hỏi`;

  if (questions.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
        Không tìm thấy câu hỏi nào phù hợp với bộ lọc.
      </div>
    `;
    return;
  }

  container.innerHTML = questions.map((q, idx) => {
    const levelBadgeClass = `badge-${q.level.toLowerCase()}`;
    const levelName = { NB: "Nhận biết", TH: "Thông hiểu", VD: "Vận dụng", VDC: "Vận dụng cao" }[q.level] || q.level;
    const typeName = (q.type === 'essay' || q.type === 'fill') ? "Tự luận điền số" : "Trắc nghiệm";
    const gradeName = q.grade == 10 ? "Tuyển sinh 10" : `Toán ${q.grade}`;

    let optionsHtml = '';
    if (q.type === 'choice' || !q.type) {
      optionsHtml = `
        <div class="options-list" style="margin: 0.75rem 0;">
          ${(q.options || []).map((opt, oIdx) => `
            <div class="option-item ${oIdx === q.correctAnswer ? 'selected' : ''}" style="cursor: default;">
              <span class="option-letter">${String.fromCharCode(65 + oIdx)}</span>
              <span class="option-content">${opt}</span>
              ${oIdx === q.correctAnswer ? '<span style="color: var(--success); font-weight: bold; margin-left: auto;">✓ Đáp án đúng</span>' : ''}
            </div>
          `).join('')}
        </div>
      `;
    } else {
      optionsHtml = `
        <div style="margin: 0.75rem 0; padding: 0.75rem; background: rgba(0,0,0,0.15); border-radius: var(--radius-md); border-left: 3px solid var(--primary);">
          <strong>🎯 Đáp số chuẩn:</strong> <code>${q.correctAnswer}</code>
        </div>
      `;
    }

    return `
      <div class="question-card" id="bank_q_${q.id}">
        <div class="question-card-head">
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;">
            <span class="badge badge-grade">${gradeName}</span>
            <span class="badge ${levelBadgeClass}">${levelName}</span>
            <span class="badge badge-type">${typeName}</span>
            <span style="font-size: 0.8rem; color: var(--text-muted);">${q.topic} - ${q.subtopic || ''}</span>
          </div>
          <div>
            <button class="btn btn-secondary btn-sm" onclick="handleDeleteQuestion('${q.id}')" title="Xóa câu hỏi">🗑️ Xóa</button>
          </div>
        </div>

        <div class="question-text">${q.content}</div>
        ${optionsHtml}

        <details style="margin-top: 0.75rem; font-size: 0.9rem;">
          <summary style="cursor: pointer; color: var(--primary); font-weight: 600;">Xem lời giải chi tiết</summary>
          <div style="margin-top: 0.5rem; padding: 0.75rem; background: rgba(99, 102, 241, 0.05); border-radius: var(--radius-md); white-space: pre-line;">
            ${q.solution || 'Chưa có lời giải chi tiết.'}
          </div>
        </details>
      </div>
    `;
  }).join('');

  renderMathInDocument(container);
}

function handleFilterChange() {
  dataManager.currentFilters.grade = document.getElementById("filterGrade").value;
  dataManager.currentFilters.level = document.getElementById("filterLevel").value;
  dataManager.currentFilters.type = document.getElementById("filterType").value;
  renderQuestionBankList();
}

function handleSearchQuestion() {
  dataManager.currentFilters.search = document.getElementById("searchQuestionInput").value;
  renderQuestionBankList();
}

function handleDeleteQuestion(id) {
  if (confirm("Bạn có chắc chắn muốn xóa câu hỏi này khỏi ngân hàng?")) {
    dataManager.deleteQuestion(id);
    renderQuestionBankList();
    showToast("Đã xóa câu hỏi khỏi ngân hàng dữ liệu", "danger");
  }
}

// Modal Thêm câu hỏi
function openAddQuestionModal() {
  document.getElementById("addQuestionModal").style.display = "flex";
  handleNewQuestionTypeChange();
}

function closeAddQuestionModal() {
  document.getElementById("addQuestionModal").style.display = "none";
}

function handleNewQuestionTypeChange() {
  const type = document.getElementById("newType").value;
  const choiceSection = document.getElementById("choiceConfigSection");
  const essaySection = document.getElementById("essayConfigSection");

  if (type === 'choice') {
    choiceSection.style.display = 'block';
    essaySection.style.display = 'none';
  } else {
    choiceSection.style.display = 'none';
    essaySection.style.display = 'block';
    handleLiveAnswerTest();
  }
}

function handleLiveAnswerTest() {
  const expectedAnswer = document.getElementById("newEssayAnswer").value;
  const studentAns = document.getElementById("liveTestStudentAnswer").value;
  const resultBadge = document.getElementById("liveTestResultBadge");

  if (!studentAns.trim()) {
    resultBadge.innerHTML = `<span style="color: var(--text-muted);">Gõ thử câu trả lời để kiểm tra</span>`;
    return;
  }

  const isCorrect = dataManager.evaluateEssayAnswer(studentAns, expectedAnswer);
  if (isCorrect) {
    resultBadge.innerHTML = `<span style="color: #10b981; font-weight: bold;">✓ Hợp lệ (ĐÚNG)</span>`;
  } else {
    resultBadge.innerHTML = `<span style="color: #ef4444; font-weight: bold;">✕ Không khớp (SAI)</span>`;
  }
}

function handleAutoRandomizeVariant() {
  const grade = parseInt(document.getElementById("newGrade").value, 10) || 9;
  const variant = dataManager.generateRandomizedVariant(grade);
  document.getElementById("newContent").value = variant.content;
  document.getElementById("newEssayAnswer").value = variant.correctAnswer;
  document.getElementById("newSolution").value = variant.solution;

  renderMathPreview('newContent', 'contentPreview');
  renderMathPreview('newSolution', 'solutionPreview');
  handleLiveAnswerTest();
}

function handleSaveNewQuestion(e) {
  e.preventDefault();
  const type = document.getElementById("newType").value;
  
  let options = [];
  let correctAnswer = 0;

  if (type === 'choice') {
    options = [
      document.getElementById("newOpt0").value,
      document.getElementById("newOpt1").value,
      document.getElementById("newOpt2").value,
      document.getElementById("newOpt3").value
    ];
    const checkedRadio = document.querySelector('input[name="newCorrectChoice"]:checked');
    correctAnswer = checkedRadio ? parseInt(checkedRadio.value, 10) : 0;
  } else {
    correctAnswer = document.getElementById("newEssayAnswer").value;
  }

  const newQ = {
    grade: parseInt(document.getElementById("newGrade").value, 10),
    level: document.getElementById("newLevel").value,
    type: type,
    topic: document.getElementById("newTopic").value,
    subtopic: document.getElementById("newSubtopic").value,
    content: document.getElementById("newContent").value,
    options: options,
    correctAnswer: correctAnswer,
    solution: document.getElementById("newSolution").value
  };

  dataManager.addQuestion(newQ);
  closeAddQuestionModal();
  renderQuestionBankList();
  showToast("Đã lưu câu hỏi mới vào ngân hàng CSDL!", "success");
}

/**
 * Sinh đề thi theo ma trận và tự động lưu vào LocalStorage
 */
function handleGenerateExam(e) {
  e.preventDefault();
  const title = document.getElementById("cfgExamTitle").value;
  const grade = document.getElementById("cfgGrade").value;
  const duration = parseInt(document.getElementById("cfgDuration").value, 10);
  const numChoice = parseInt(document.getElementById("cfgNumChoice").value, 10);
  const numEssay = parseInt(document.getElementById("cfgNumEssay").value, 10);

  currentGeneratedExam = examBuilder.generateExam({
    title,
    grade,
    duration,
    numChoice,
    numEssay
  });

  // Tự động gán nhãn câu tự luận theo thứ tự (ví dụ: Câu 13, Câu 14...)
  currentGeneratedExam.questions.forEach((q, idx) => {
    if (q.questionType === 'essay' || q.type === 'essay') {
      const essayIndex = idx - currentGeneratedExam.numChoice + 1;
      q.questionLabel = `Câu ${numChoice + essayIndex}`;
    }
  });

  // Lưu đề thi vào LocalStorage
  currentExamList = dataManager.saveOrUpdateExam(currentGeneratedExam);

  displayGeneratedExamPreview(currentGeneratedExam);
  showToast("Đã tạo đề thi và lưu vào hệ thống thành công!", "success");
}

/**
 * Nút SAVE: Lưu đề thi hiện tại vào LocalStorage
 */
function handleSaveCurrentExam() {
  if (!currentGeneratedExam) {
    alert("Chưa có đề thi nào để lưu!");
    return;
  }

  currentExamList = dataManager.saveOrUpdateExam(currentGeneratedExam);
  displayGeneratedExamPreview(currentGeneratedExam);
  showToast("💾 Đã lưu và cập nhật đề thi vào hệ thống!", "success");
}

function displayGeneratedExamPreview(exam) {
  const preview = document.getElementById("latestExamPreview");
  preview.innerHTML = `
    <div style="width: 100%; text-align: left;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; flex-wrap: wrap;">
        <h4 style="font-size: 1.15rem; color: #818cf8;">${exam.title}</h4>
        <div style="display: flex; gap: 0.4rem;">
          <button class="btn btn-primary btn-sm" onclick="handleSaveCurrentExam()" title="Lưu đề thi này vào bộ nhớ trình duyệt">
            <span>💾</span> Lưu Đề
          </button>
          <button class="btn btn-secondary btn-sm" onclick="openEditExamModal()" title="Chỉnh sửa toàn bộ đề thi">
            <span>🛠️</span> Sửa Đề
          </button>
        </div>
      </div>
      <div style="font-size: 0.85rem; color: var(--text-muted); margin: 0.4rem 0;">
        <span>Khối: <strong>${exam.grade}</strong></span> • 
        <span>Mã đề: <strong>${exam.code}</strong></span> • 
        <span>Thời gian: <strong>${exam.duration} phút</strong></span>
      </div>
      <div style="display: flex; gap: 0.5rem; margin: 0.75rem 0;">
        <span class="badge badge-nb">${exam.questions.filter(q => q.questionType === 'choice' || q.type === 'choice').length} Trắc nghiệm</span>
        <span class="badge badge-type">${exam.questions.filter(q => q.questionType === 'essay' || q.type === 'essay').length} Tự luận điền số</span>
      </div>
      <div style="display: flex; gap: 0.75rem; margin-top: 1rem; flex-wrap: wrap;">
        <button class="btn btn-primary" onclick="launchExamSession(currentGeneratedExam)">
          <span>✍️</span> Thi Ngay (Phòng Thi)
        </button>
        <button class="btn btn-secondary" onclick="prepareAndPrintExam(currentGeneratedExam, false)">
          <span>🖨️</span> In Đề Học Sinh
        </button>
        <button class="btn btn-secondary" onclick="prepareAndPrintExam(currentGeneratedExam, true)">
          <span>📋</span> In Kèm Lời Giải
        </button>
      </div>
    </div>
  `;

  // Render bảng tùy chỉnh số & nhãn câu cho các câu tự luận trong đề
  renderEssayCustomizer(exam);
}

// ==================== BẢNG TÙY CHỈNH SỐ & SỬA SỐ CÂU TỰ LUẬN (13, 13a, 13b, 13c...) ====================

function renderEssayCustomizer(exam) {
  const card = document.getElementById("essayCustomizerCard");
  const container = document.getElementById("essayCustomizerItemsContainer");
  if (!card || !container) return;

  const essayQuestions = exam.questions.filter(q => q.questionType === 'essay' || q.type === 'essay' || q.type === 'fill');

  if (essayQuestions.length === 0) {
    card.style.display = "none";
    return;
  }

  card.style.display = "block";

  container.innerHTML = essayQuestions.map((q, idx) => {
    const globalIdx = exam.questions.findIndex(item => item.id === q.id);
    const label = q.questionLabel || `Câu ${exam.numChoice + idx + 1}`;

    return `
      <div class="essay-editor-item" id="essay_item_block_${globalIdx}">
        <div class="essay-editor-head">
          <div style="display: flex; align-items: center; gap: 0.5rem; flex: 1; flex-wrap: wrap;">
            <div class="essay-editor-title">
              <span>✍️</span>
              <input type="text" class="form-control" id="custom_essay_label_${globalIdx}" value="${label}" style="width: 140px; font-weight: 700; color: #818cf8; padding: 0.3rem 0.5rem; font-size: 0.95rem;" title="Sửa nhãn số câu (VD: Câu 13, Câu 13a, Câu 13b...)" oninput="updateEssayQuestionData(${globalIdx})">
              <span>:</span>
            </div>
            <span style="font-size: 0.75rem; color: var(--text-muted);">(Tự Luận Điền Số)</span>
          </div>

          <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
            <button type="button" class="btn btn-secondary btn-sm" onclick="duplicateAsSubQuestion(${globalIdx})" title="Thêm ý phụ (VD: 13a -> 13b)">
              <span>➕</span> Thêm ý con (${getSuggestedSubLabel(label)})
            </button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="randomizeSingleEssayQuestion(${globalIdx})" title="Đổi số ngẫu nhiên cho câu này">
              <span>🎲</span> Đổi số
            </button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="removeEssayQuestionFromExam(${globalIdx})" title="Xóa câu này khỏi đề" style="color: #ef4444;">
              <span>🗑️</span> Xóa
            </button>
          </div>
        </div>

        <div class="form-group" style="margin-bottom: 0.85rem;">
          <label class="form-label" style="font-size: 0.85rem;">Đề bài (chỉnh sửa trực tiếp số liệu hoặc công thức LaTeX):</label>
          <input type="text" class="form-control" id="custom_essay_content_${globalIdx}" value="${q.content.replace(/"/g, '&quot;')}" oninput="updateEssayQuestionData(${globalIdx})">
        </div>

        <div class="form-group" style="margin-bottom: 0.5rem;">
          <label class="form-label" style="font-size: 0.95rem; color: #c084fc; font-weight: 700;">
            🎯 Đáp số chuẩn (Dùng dấu <code>|</code> để thêm nhiều cách viết tương đương):
          </label>
          <input type="text" class="form-control" id="custom_essay_ans_${globalIdx}" value="${q.correctAnswer}" placeholder="VD: 12 | x=12 | x = 12 hoặc 1/2 | 0.5" oninput="updateEssayQuestionData(${globalIdx}); handleLiveTestEssayCustomizer(${globalIdx})">
        </div>

        <!-- Thanh chèn nhanh ký hiệu Toán học -->
        <div class="symbol-toolbar">
          <span style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted); margin-right: 4px;">Chèn nhanh ký hiệu:</span>
          <button type="button" class="symbol-btn" onclick="insertSymbol('custom_essay_ans_${globalIdx}', '±')">±</button>
          <button type="button" class="symbol-btn" onclick="insertSymbol('custom_essay_ans_${globalIdx}', '√')">√</button>
          <button type="button" class="symbol-btn" onclick="insertSymbol('custom_essay_ans_${globalIdx}', 'π')">π</button>
          <button type="button" class="symbol-btn" onclick="insertSymbol('custom_essay_ans_${globalIdx}', '°')">°</button>
          <button type="button" class="symbol-btn" onclick="insertSymbol('custom_essay_ans_${globalIdx}', '²')">²</button>
          <button type="button" class="symbol-btn" onclick="insertSymbol('custom_essay_ans_${globalIdx}', '³')">³</button>
          <button type="button" class="symbol-btn" onclick="insertSymbol('custom_essay_ans_${globalIdx}', '≤')">≤</button>
          <button type="button" class="symbol-btn" onclick="insertSymbol('custom_essay_ans_${globalIdx}', '≥')">≥</button>
          <button type="button" class="symbol-btn" onclick="insertSymbol('custom_essay_ans_${globalIdx}', '≠')">≠</button>
          <button type="button" class="symbol-btn" onclick="insertSymbol('custom_essay_ans_${globalIdx}', '/')">/</button>
          <button type="button" class="symbol-btn" onclick="insertSymbol('custom_essay_ans_${globalIdx}', '|')">|</button>
        </div>

        <!-- Ô Chấm thử trực tiếp câu trả lời của học sinh -->
        <div class="live-tester-bar">
          <span style="font-size: 0.85rem; font-weight: 600; display: flex; align-items: center; gap: 0.35rem;">
            🧪 Chấm thử câu trả lời của học sinh:
          </span>
          <input type="text" class="live-test-input" id="live_test_input_${globalIdx}" placeholder="Gõ thử câu trả lời bất kỳ..." oninput="handleLiveTestEssayCustomizer(${globalIdx})">
          <span class="test-eval-result neutral" id="live_test_badge_${globalIdx}">Nhập để xem thử kết quả</span>
        </div>
      </div>
    `;
  }).join('');

  renderMathInDocument(container);
}

function getSuggestedSubLabel(currentLabel) {
  const match = currentLabel.match(/(\d+)([a-z])?/i);
  if (match) {
    const num = match[1];
    const letter = match[2];
    if (!letter) return `${num}a`;
    const nextCharCode = letter.charCodeAt(0) + 1;
    return `${num}${String.fromCharCode(nextCharCode)}`;
  }
  return "13a";
}

function duplicateAsSubQuestion(globalIdx) {
  if (!currentGeneratedExam || !currentGeneratedExam.questions[globalIdx]) return;
  const originalQ = currentGeneratedExam.questions[globalIdx];
  const currentLabel = originalQ.questionLabel || `Câu ${globalIdx + 1}`;
  const newSubLabel = `Câu ${getSuggestedSubLabel(currentLabel)}`;

  const variant = dataManager.generateRandomizedVariant(9);

  const newSubQ = {
    ...originalQ,
    id: `ESSAY_SUB_${Date.now()}`,
    questionLabel: newSubLabel,
    content: variant.content,
    correctAnswer: variant.correctAnswer,
    solution: variant.solution
  };

  currentGeneratedExam.questions.splice(globalIdx + 1, 0, newSubQ);
  currentGeneratedExam.totalQuestions = currentGeneratedExam.questions.length;
  currentGeneratedExam.numEssay = currentGeneratedExam.questions.filter(q => q.questionType === 'essay').length;

  // Cập nhật ngay vào LocalStorage
  currentExamList = dataManager.saveOrUpdateExam(currentGeneratedExam);

  displayGeneratedExamPreview(currentGeneratedExam);
  showToast(`Đã thêm ý con ${newSubLabel} và lưu đề!`, "success");
}

function addNewEssayQuestionToCurrentExam() {
  if (!currentGeneratedExam) return;
  const essayCount = currentGeneratedExam.questions.filter(q => q.questionType === 'essay').length;
  const choiceCount = currentGeneratedExam.questions.filter(q => q.questionType === 'choice').length;
  const newNum = choiceCount + essayCount + 1;

  const variant = dataManager.generateRandomizedVariant(9);
  const newQ = {
    id: `ESSAY_ADD_${Date.now()}`,
    grade: 9,
    topic: "Đại số & Hình học",
    level: "VD",
    type: "essay",
    questionType: "essay",
    questionLabel: `Câu ${newNum}`,
    content: variant.content,
    correctAnswer: variant.correctAnswer,
    solution: variant.solution
  };

  currentGeneratedExam.questions.push(newQ);
  currentGeneratedExam.totalQuestions = currentGeneratedExam.questions.length;
  currentGeneratedExam.numEssay++;

  // Cập nhật ngay vào LocalStorage
  currentExamList = dataManager.saveOrUpdateExam(currentGeneratedExam);

  displayGeneratedExamPreview(currentGeneratedExam);
  showToast(`Đã thêm Câu ${newNum} vào đề thi!`, "success");
}

function removeEssayQuestionFromExam(globalIdx) {
  if (!currentGeneratedExam || !currentGeneratedExam.questions[globalIdx]) return;
  if (confirm("Bạn có chắc chắn muốn xóa câu này khỏi đề thi hiện tại?")) {
    currentGeneratedExam.questions.splice(globalIdx, 1);
    currentGeneratedExam.totalQuestions = currentGeneratedExam.questions.length;
    currentGeneratedExam.numEssay = currentGeneratedExam.questions.filter(q => q.questionType === 'essay').length;

    // Cập nhật ngay vào LocalStorage
    currentExamList = dataManager.saveOrUpdateExam(currentGeneratedExam);

    displayGeneratedExamPreview(currentGeneratedExam);
    showToast("Đã xóa câu hỏi khỏi đề thi!", "danger");
  }
}

function handleLiveTestEssayCustomizer(globalIdx) {
  const ansField = document.getElementById(`custom_essay_ans_${globalIdx}`);
  const inputField = document.getElementById(`live_test_input_${globalIdx}`);
  const badge = document.getElementById(`live_test_badge_${globalIdx}`);
  if (!ansField || !inputField || !badge) return;

  const studentAns = inputField.value.trim();
  if (!studentAns) {
    badge.className = "test-eval-result neutral";
    badge.innerText = "Nhập để xem thử kết quả";
    return;
  }

  const isCorrect = dataManager.evaluateEssayAnswer(studentAns, ansField.value);
  if (isCorrect) {
    badge.className = "test-eval-result correct";
    badge.innerText = "✓ Hợp lệ (ĐÚNG)";
  } else {
    badge.className = "test-eval-result incorrect";
    badge.innerText = "✕ Không khớp (SAI)";
  }
}

function updateEssayQuestionData(globalIdx) {
  if (!currentGeneratedExam || !currentGeneratedExam.questions[globalIdx]) return;
  const labelInput = document.getElementById(`custom_essay_label_${globalIdx}`);
  const contentInput = document.getElementById(`custom_essay_content_${globalIdx}`);
  const ansInput = document.getElementById(`custom_essay_ans_${globalIdx}`);

  if (labelInput) currentGeneratedExam.questions[globalIdx].questionLabel = labelInput.value.trim();
  if (contentInput) currentGeneratedExam.questions[globalIdx].content = contentInput.value;
  if (ansInput) currentGeneratedExam.questions[globalIdx].correctAnswer = ansInput.value;

  // Lưu tự động vào LocalStorage
  dataManager.saveOrUpdateExam(currentGeneratedExam);
}

function randomizeSingleEssayQuestion(globalIdx) {
  if (!currentGeneratedExam || !currentGeneratedExam.questions[globalIdx]) return;
  const grade = currentGeneratedExam.grade === "Lớp 9" ? 9 : (parseInt(currentGeneratedExam.grade.replace(/\D/g, ''), 10) || 9);
  const variant = dataManager.generateRandomizedVariant(grade);

  currentGeneratedExam.questions[globalIdx].content = variant.content;
  currentGeneratedExam.questions[globalIdx].correctAnswer = variant.correctAnswer;
  currentGeneratedExam.questions[globalIdx].solution = variant.solution;

  // Cập nhật DOM
  const contentInput = document.getElementById(`custom_essay_content_${globalIdx}`);
  const ansInput = document.getElementById(`custom_essay_ans_${globalIdx}`);
  if (contentInput) contentInput.value = variant.content;
  if (ansInput) ansInput.value = variant.correctAnswer;

  handleLiveTestEssayCustomizer(globalIdx);
  renderMathInDocument(document.getElementById(`essay_item_block_${globalIdx}`));

  // Cập nhật LocalStorage
  dataManager.saveOrUpdateExam(currentGeneratedExam);
  showToast("Đã đổi số ngẫu nhiên và lưu đề!", "success");
}

function randomizeAllEssayQuestions() {
  if (!currentGeneratedExam) return;
  currentGeneratedExam.questions.forEach((q, idx) => {
    if (q.questionType === 'essay' || q.type === 'essay' || q.type === 'fill') {
      const grade = currentGeneratedExam.grade === "Lớp 9" ? 9 : (parseInt(currentGeneratedExam.grade.replace(/\D/g, ''), 10) || 9);
      const variant = dataManager.generateRandomizedVariant(grade);

      currentGeneratedExam.questions[idx].content = variant.content;
      currentGeneratedExam.questions[idx].correctAnswer = variant.correctAnswer;
      currentGeneratedExam.questions[idx].solution = variant.solution;
    }
  });

  dataManager.saveOrUpdateExam(currentGeneratedExam);
  renderEssayCustomizer(currentGeneratedExam);
  showToast("Đã đổi số ngẫu nhiên TẤT CẢ câu tự luận và lưu đề!", "success");
}

// ==================== MODAL CHỈNH SỬA TOÀN BỘ ĐỀ THI ====================

function openEditExamModal() {
  if (!currentGeneratedExam) return;
  document.getElementById("editExamModal").style.display = "flex";
  document.getElementById("editExamTitle").value = currentGeneratedExam.title;
  document.getElementById("editExamCode").value = currentGeneratedExam.code;
  document.getElementById("editExamGrade").value = currentGeneratedExam.grade;
  document.getElementById("editExamDuration").value = currentGeneratedExam.duration;
  document.getElementById("editExamQCount").innerText = currentGeneratedExam.questions.length;

  renderEditExamQuestionsList();
}

function closeEditExamModal() {
  document.getElementById("editExamModal").style.display = "none";
}

function renderEditExamQuestionsList() {
  const container = document.getElementById("editExamQuestionsList");
  if (!container || !currentGeneratedExam) return;

  container.innerHTML = currentGeneratedExam.questions.map((q, idx) => {
    const isEssay = q.questionType === 'essay' || q.type === 'essay';
    const label = q.questionLabel || `Câu ${idx + 1}`;

    return `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.65rem 0.9rem; background: var(--bg-input); border: 1px solid var(--border-color); border-radius: var(--radius-md);">
        <div style="display: flex; align-items: center; gap: 0.5rem; flex: 1; overflow: hidden;">
          <input type="text" value="${label}" style="width: 90px; padding: 0.2rem 0.4rem; font-weight: bold; background: var(--bg-card); color: var(--text-main); border: 1px solid var(--border-color); border-radius: 4px;" onchange="updateQuestionLabelInExam(${idx}, this.value)">
          <span class="badge ${isEssay ? 'badge-type' : 'badge-nb'}" style="font-size: 0.7rem;">${isEssay ? 'Tự luận' : 'Trắc nghiệm'}</span>
          <span style="font-size: 0.85rem; text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">${q.content}</span>
        </div>
        <div style="display: flex; gap: 0.35rem; margin-left: 0.5rem;">
          <button type="button" class="btn btn-secondary btn-sm" onclick="moveQuestionInExam(${idx}, -1)" ${idx === 0 ? 'disabled' : ''}>▲</button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="moveQuestionInExam(${idx}, 1)" ${idx === currentGeneratedExam.questions.length - 1 ? 'disabled' : ''}>▼</button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="deleteQuestionFromExam(${idx})" style="color: #ef4444;">✕</button>
        </div>
      </div>
    `;
  }).join('');

  renderMathInDocument(container);
}

function updateQuestionLabelInExam(idx, newLabel) {
  if (currentGeneratedExam && currentGeneratedExam.questions[idx]) {
    currentGeneratedExam.questions[idx].questionLabel = newLabel.trim();
  }
}

function moveQuestionInExam(idx, direction) {
  const targetIdx = idx + direction;
  if (targetIdx < 0 || targetIdx >= currentGeneratedExam.questions.length) return;
  const temp = currentGeneratedExam.questions[idx];
  currentGeneratedExam.questions[idx] = currentGeneratedExam.questions[targetIdx];
  currentGeneratedExam.questions[targetIdx] = temp;
  renderEditExamQuestionsList();
}

function deleteQuestionFromExam(idx) {
  currentGeneratedExam.questions.splice(idx, 1);
  currentGeneratedExam.totalQuestions = currentGeneratedExam.questions.length;
  document.getElementById("editExamQCount").innerText = currentGeneratedExam.questions.length;
  renderEditExamQuestionsList();
}

function handleSaveExamMetadata(e) {
  e.preventDefault();
  if (!currentGeneratedExam) return;

  currentGeneratedExam.title = document.getElementById("editExamTitle").value;
  currentGeneratedExam.code = document.getElementById("editExamCode").value;
  currentGeneratedExam.grade = document.getElementById("editExamGrade").value;
  currentGeneratedExam.duration = parseInt(document.getElementById("editExamDuration").value, 10);

  currentExamList = dataManager.saveOrUpdateExam(currentGeneratedExam);

  closeEditExamModal();
  displayGeneratedExamPreview(currentGeneratedExam);
  showToast("💾 Đã lưu toàn bộ thay đổi đề thi thành công!", "success");
}

/**
 * Xóa vĩnh viễn đề thi khỏi hệ thống
 */
function handleDeleteExamFromList(examId) {
  if (confirm("Bạn có chắc chắn muốn XÓA VĨNH VIỄN đề thi này khỏi hệ thống không? Khi xóa và reload lại sẽ KHÔNG còn hiện đề này nữa.")) {
    currentExamList = dataManager.deleteSavedExam(examId);

    if (currentGeneratedExam && currentGeneratedExam.id === examId) {
      if (currentExamList.length > 0) {
        currentGeneratedExam = currentExamList[0];
        displayGeneratedExamPreview(currentGeneratedExam);
      } else {
        currentGeneratedExam = null;
        document.getElementById("latestExamPreview").innerHTML = `
          <p style="color: var(--text-muted);">Chưa có đề thi nào. Hãy bấm "Sinh Đề Thi Ngay" để tạo đề mới!</p>
        `;
        document.getElementById("essayCustomizerCard").style.display = "none";
      }
    }

    showExamSelectScreen();
    showToast("Đã xóa đề thi khỏi hệ thống vĩnh viễn!", "danger");
  }
}

/**
 * Chuẩn bị và in đề thi (Print Sheet / PDF)
 */
function prepareAndPrintExam(exam, includeSolutions = false) {
  document.getElementById("printExamTitle").innerText = exam.title.toUpperCase();
  document.getElementById("printExamSubtitle").innerText = `Thời gian làm bài: ${exam.duration} phút (Không kể thời gian phát đề)`;
  document.getElementById("printExamCode").innerText = `Mã đề thi: ${exam.code}`;

  const qList = document.getElementById("printQuestionsList");
  qList.innerHTML = exam.questions.map((q, idx) => {
    const label = q.questionLabel || `Câu ${idx + 1}`;
    let optHtml = '';
    if (q.questionType === 'choice' || q.type === 'choice') {
      optHtml = `
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin: 6px 0 12px 20px;">
          ${(q.options || []).map((opt, oIdx) => `
            <div><strong>${String.fromCharCode(65 + oIdx)}.</strong> ${opt}</div>
          `).join('')}
        </div>
      `;
    } else {
      optHtml = `
        <div style="margin: 8px 0 14px 20px; font-style: italic;">
          Đáp số: ............................................................................
        </div>
      `;
    }

    return `
      <div style="margin-bottom: 12px;">
        <div><strong>${label}:</strong> ${q.content}</div>
        ${optHtml}
      </div>
    `;
  }).join('');

  const ansSection = document.getElementById("printAnswerKeySection");
  const ansContent = document.getElementById("printAnswerKeyContent");

  if (includeSolutions) {
    ansSection.style.display = "block";
    ansContent.innerHTML = exam.questions.map((q, idx) => {
      const label = q.questionLabel || `Câu ${idx + 1}`;
      return `
        <div style="margin-bottom: 12px; border-bottom: 1px dotted #ccc; padding-bottom: 8px;">
          <strong>${label}:</strong> ${q.questionType === 'choice' ? `Đáp án [ ${String.fromCharCode(65 + q.correctAnswer)} ]` : `Đáp số [ ${q.correctAnswer} ]`}
          <div style="margin-top: 4px; white-space: pre-line;">${q.solution || ''}</div>
        </div>
      `;
    }).join('');
  } else {
    ansSection.style.display = "none";
  }

  renderMathInDocument(document.getElementById("printSheet"));

  setTimeout(() => {
    window.print();
  }, 300);
}

// ==================== PHÂN HỆ 2: PHÒNG THI TRỰC TUYẾN ====================

function showExamSelectScreen() {
  document.getElementById("examSelectScreen").style.display = "block";
  document.getElementById("examRoomActiveScreen").style.display = "none";
  document.getElementById("examResultScreen").style.display = "none";

  const grid = document.getElementById("availableExamsGrid");
  
  if (!currentExamList || currentExamList.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-muted); background: var(--bg-card); border-radius: var(--radius-lg); border: 1px dashed var(--border-color);">
        <h3>📭 Chưa có đề thi nào trong danh sách</h3>
        <p style="margin-top: 0.5rem;">Hãy chuyển sang tab <strong>"📚 Ngân hàng & Tạo Đề"</strong> để tạo hoặc thêm đề thi mới!</p>
        <button class="btn btn-primary" style="margin-top: 1rem;" onclick="switchModule('creator')">
          <span>⚡</span> Tạo Đề Ngay
        </button>
      </div>
    `;
    return;
  }

  grid.innerHTML = currentExamList.map((exam, idx) => `
    <div class="card" style="display: flex; flex-direction: column; justify-content: space-between; border-left: 4px solid var(--primary);">
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <span class="badge badge-grade">Khối ${exam.grade}</span>
          <span class="badge badge-type">Mã đề: ${exam.code}</span>
        </div>
        <h3 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--text-main);">${exam.title}</h3>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.2rem;">
          ⏳ <strong>${exam.duration} phút</strong> • 
          📝 <strong>${exam.questions.length} câu</strong> (${exam.questions.filter(q => q.questionType === 'choice').length} trắc nghiệm + ${exam.questions.filter(q => q.questionType === 'essay').length} tự luận)
        </p>
      </div>

      <div style="display: flex; flex-direction: column; gap: 0.5rem;">
        <button class="btn btn-success" style="width: 100%; font-size: 0.95rem;" onclick="launchExamSessionByIndex(${idx})">
          <span>🚀</span> Bắt Đầu Làm Bài
        </button>
        <div style="display: flex; gap: 0.5rem;">
          <button class="btn btn-secondary btn-sm" style="flex: 1;" onclick="editExamFromList(${idx})">
            <span>🛠️</span> Chỉnh Sửa
          </button>
          <button class="btn btn-secondary btn-sm" style="color: #ef4444;" onclick="handleDeleteExamFromList('${exam.id}')" title="Xóa vĩnh viễn đề này">
            <span>🗑️</span> Xóa Đề
          </button>
        </div>
      </div>
    </div>
  `).join('');

  renderMathInDocument(grid);
}

function editExamFromList(idx) {
  const exam = currentExamList[idx];
  if (!exam) return;
  currentGeneratedExam = exam;
  switchModule('creator');
  openEditExamModal();
}

function launchExamSessionByIndex(idx) {
  const exam = currentExamList[idx];
  if (exam) launchExamSession(exam);
}

function launchExamSession(exam) {
  switchModule('exam');

  document.getElementById("examSelectScreen").style.display = "none";
  document.getElementById("examRoomActiveScreen").style.display = "block";
  document.getElementById("examResultScreen").style.display = "none";

  document.getElementById("activeExamTitle").innerText = exam.title;
  document.getElementById("activeExamGrade").innerText = exam.grade;
  document.getElementById("activeExamTotalQ").innerText = `${exam.questions.length} câu`;
  document.getElementById("activeExamCode").innerText = exam.code;

  // Khởi chạy runner
  examRunner.startExam(exam);

  // Render câu hỏi làm bài
  renderActiveExamQuestions(exam);
  renderExamNavGrid(exam);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderActiveExamQuestions(exam) {
  const container = document.getElementById("activeExamQuestionsList");
  container.innerHTML = exam.questions.map((q, idx) => {
    const isBookmarked = examRunner.bookmarks.has(q.id);
    const qNum = idx + 1;
    const label = q.questionLabel || `Câu ${qNum}`;

    let inputAreaHtml = '';
    if (q.questionType === 'choice' || q.type === 'choice') {
      inputAreaHtml = `
        <div class="options-list">
          ${(q.options || []).map((opt, oIdx) => `
            <div class="option-item" id="opt_${q.id}_${oIdx}" onclick="handleSelectOption('${q.id}', ${oIdx}, ${qNum})">
              <span class="option-letter">${String.fromCharCode(65 + oIdx)}</span>
              <span class="option-content">${opt}</span>
            </div>
          `).join('')}
        </div>
      `;
    } else {
      // Tự luận điền số
      inputAreaHtml = `
        <div class="essay-input-area">
          <label class="form-label" style="color: #38bdf8; font-size: 0.95rem;">
            ✍️ Nhập đáp số của bạn (Học sinh điền số/kết quả):
          </label>
          <input type="text" class="essay-answer-field" id="essay_input_${q.id}" placeholder="Nhập đáp số (VD: 12, 1/2, 3.5...)" oninput="handleTypeEssayAnswer('${q.id}', ${qNum})">
        </div>
      `;
    }

    return `
      <div class="question-card" id="exam_card_${qNum}">
        <div class="question-card-head">
          <span class="question-number">${label}:</span>
          <button class="bookmark-btn ${isBookmarked ? 'bookmarked' : ''}" id="bm_btn_${q.id}" onclick="handleToggleBookmark('${q.id}', ${qNum})">
            <span>★</span> ${isBookmarked ? 'Đã đánh dấu' : 'Đánh dấu xem lại'}
          </button>
        </div>
        <div class="question-text">${q.content}</div>
        ${inputAreaHtml}
      </div>
    `;
  }).join('');

  renderMathInDocument(container);
}

function renderExamNavGrid(exam) {
  const grid = document.getElementById("examNavGrid");
  grid.innerHTML = exam.questions.map((q, idx) => {
    const qNum = idx + 1;
    const isAnswered = examRunner.userAnswers[q.id] !== undefined && examRunner.userAnswers[q.id] !== '';
    const isBookmarked = examRunner.bookmarks.has(q.id);
    
    let shortLabel = (q.questionLabel || `${qNum}`).replace(/^Câu\s*/i, '');

    return `
      <button class="grid-num-btn ${isAnswered ? 'answered' : ''} ${isBookmarked ? 'bookmarked' : ''}" id="nav_btn_${qNum}" onclick="scrollToQuestion(${qNum})" title="${q.questionLabel || `Câu ${qNum}`}">
        ${shortLabel}
      </button>
    `;
  }).join('');
}

function handleSelectOption(questionId, optionIndex, qNum) {
  const card = document.getElementById(`exam_card_${qNum}`);
  if (card) {
    card.querySelectorAll('.option-item').forEach(el => el.classList.remove('selected'));
    const selectedElem = document.getElementById(`opt_${questionId}_${optionIndex}`);
    if (selectedElem) selectedElem.classList.add('selected');
  }

  examRunner.recordAnswer(questionId, optionIndex);

  const navBtn = document.getElementById(`nav_btn_${qNum}`);
  if (navBtn) navBtn.classList.add('answered');
}

function handleTypeEssayAnswer(questionId, qNum) {
  const val = document.getElementById(`essay_input_${questionId}`).value.trim();
  examRunner.recordAnswer(questionId, val);

  const navBtn = document.getElementById(`nav_btn_${qNum}`);
  if (navBtn) {
    if (val) navBtn.classList.add('answered');
    else navBtn.classList.remove('answered');
  }
}

function handleToggleBookmark(questionId, qNum) {
  examRunner.toggleBookmark(questionId);
  const isBookmarked = examRunner.bookmarks.has(questionId);

  const btn = document.getElementById(`bm_btn_${questionId}`);
  if (btn) {
    if (isBookmarked) {
      btn.classList.add('bookmarked');
      btn.innerHTML = `<span>★</span> Đã đánh dấu`;
    } else {
      btn.classList.remove('bookmarked');
      btn.innerHTML = `<span>★</span> Đánh dấu xem lại`;
    }
  }

  const navBtn = document.getElementById(`nav_btn_${qNum}`);
  if (navBtn) {
    if (isBookmarked) navBtn.classList.add('bookmarked');
    else navBtn.classList.remove('bookmarked');
  }
}

function scrollToQuestion(qNum) {
  const card = document.getElementById(`exam_card_${qNum}`);
  if (card) {
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    card.classList.add('active-focus');
    setTimeout(() => card.classList.remove('active-focus'), 1000);
  }
}

function confirmSubmitExam() {
  const total = examRunner.currentExam.questions.length;
  const answered = Object.keys(examRunner.userAnswers).filter(k => examRunner.userAnswers[k] !== '' && examRunner.userAnswers[k] !== undefined).length;
  const unanswered = total - answered;

  let msg = "Bạn có chắc chắn muốn nộp bài thi không?";
  if (unanswered > 0) {
    msg = `Bạn còn ${unanswered} câu chưa hoàn thành. Bạn có chắc chắn muốn nộp bài ngay bây giờ?`;
  }

  if (confirm(msg)) {
    examRunner.submitExam(false);
  }
}

function handleExamFinished(result) {
  document.getElementById("examRoomActiveScreen").style.display = "none";
  document.getElementById("examResultScreen").style.display = "block";

  document.getElementById("resScoreNum").innerText = result.score.toFixed(1);
  document.getElementById("resExamSubtitle").innerText = `${result.exam.title} (Mã đề: ${result.exam.code})`;
  document.getElementById("resCorrectCount").innerText = `${result.correctCount}/${result.totalQuestions}`;

  const minutes = Math.floor(result.timeSpentSeconds / 60);
  const seconds = result.timeSpentSeconds % 60;
  document.getElementById("resTimeSpent").innerText = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const accuracy = ((result.correctCount / result.totalQuestions) * 100).toFixed(0);
  document.getElementById("resAccuracy").innerText = `${accuracy}%`;

  let gradeText = "Xuất sắc";
  if (result.score < 5) gradeText = "Cần cố gắng";
  else if (result.score < 6.5) gradeText = "Trung bình";
  else if (result.score < 8) gradeText = "Khá";
  else if (result.score < 9) gradeText = "Giỏi";

  document.getElementById("resGradeLevel").innerText = gradeText;

  // Render xem lại từng câu
  const reviewContainer = document.getElementById("resultQuestionsReviewList");
  reviewContainer.innerHTML = result.details.map(item => {
    const q = item.question;
    const isCorrect = item.isCorrect;
    const label = q.questionLabel || `Câu ${item.questionNumber}`;

    let userAnsText = item.userAnswer;
    if (q.questionType === 'choice' || q.type === 'choice') {
      if (typeof item.userAnswer === 'number') {
        userAnsText = `${String.fromCharCode(65 + item.userAnswer)}. ${q.options[item.userAnswer] || ''}`;
      }
    }

    let correctAnsText = q.correctAnswer;
    if (q.questionType === 'choice' || q.type === 'choice') {
      correctAnsText = `${String.fromCharCode(65 + q.correctAnswer)}. ${q.options[q.correctAnswer] || ''}`;
    }

    return `
      <div class="question-card" style="border-left: 4px solid ${isCorrect ? 'var(--success)' : 'var(--danger)'};">
        <div class="question-card-head">
          <span class="question-number" style="color: ${isCorrect ? 'var(--success)' : 'var(--danger)'};">
            ${label}: ${isCorrect ? '✓ ĐÚNG' : '✕ SAI'}
          </span>
          <span class="badge ${isCorrect ? 'badge-nb' : 'badge-vdc'}">
            ${isCorrect ? '+ Điểm' : '0 Điểm'}
          </span>
        </div>

        <div class="question-text">${q.content}</div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin: 1rem 0; font-size: 0.95rem;">
          <div style="padding: 0.75rem; border-radius: var(--radius-md); background: ${isCorrect ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'};">
            <strong>Câu trả lời của bạn:</strong><br>
            <span>${userAnsText}</span>
          </div>
          <div style="padding: 0.75rem; border-radius: var(--radius-md); background: rgba(16, 185, 129, 0.1);">
            <strong>Đáp án chuẩn:</strong><br>
            <span>${correctAnsText}</span>
          </div>
        </div>

        <div style="margin-top: 1rem; padding: 1rem; background: rgba(99, 102, 241, 0.05); border-radius: var(--radius-md); border-left: 3px solid var(--primary);">
          <strong style="color: var(--primary);">💡 Lời giải chi tiết:</strong>
          <div style="margin-top: 0.5rem; white-space: pre-line;">${item.solution}</div>
        </div>
      </div>
    `;
  }).join('');

  renderMathInDocument(reviewContainer);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openImportExportModal() {
  const jsonStr = JSON.stringify(dataManager.getAllQuestions(), null, 2);
  const choice = prompt("Chọn hành động:\n1. Sao chép toàn bộ JSON CSDL (Gõ 'copy')\n2. Khôi phục CSDL mặc định (Gõ 'reset')", "copy");

  if (choice === 'reset') {
    if (confirm("Khôi phục toàn bộ CSDL về mặc định ban đầu?")) {
      dataManager.resetToDefault();
      renderQuestionBankList();
      showToast("Đã khôi phục CSDL câu hỏi mặc định!", "success");
    }
  } else if (choice === 'copy') {
    navigator.clipboard.writeText(jsonStr).then(() => {
      showToast("Đã sao chép toàn bộ JSON câu hỏi vào Clipboard!", "success");
    }).catch(() => {
      alert("JSON CSDL:\n" + jsonStr.substring(0, 500) + "...");
    });
  }
}
