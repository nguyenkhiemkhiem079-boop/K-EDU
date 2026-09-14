(function () {
  window.selectTeacherCreateSource = function (source) {
    if (!['upload', 'bank'].includes(source)) return;
    const upload = document.getElementById('singleExamCreatorSection');
    const bank = document.getElementById('teacherBankGeneratorCard');
    const stats = document.getElementById('docBankStatsCard');
    upload?.classList.toggle('hidden', source !== 'upload');
    bank?.classList.toggle('hidden', source !== 'bank');
    stats?.classList.toggle('hidden', source !== 'bank');
    for (const mode of ['upload', 'bank']) {
      const button = document.getElementById(`teacherSource_${mode}`);
      if (button) { button.classList.toggle('active', source === mode); button.setAttribute('aria-pressed', String(source === mode)); }
    }
    const hint = document.getElementById('teacherWorkflowHint');
    if (hint) hint.textContent = source === 'upload'
      ? '1. Tải PDF/ảnh → 2. Kiểm tra câu hỏi, đáp án → 3. Chọn lớp và thời gian → 4. Lưu/giao đề.'
      : '1. Chọn môn, khối và mức độ → 2. Chọn số câu → 3. Tạo đề → 4. Kiểm tra và giao bài.';
  };
  document.addEventListener('DOMContentLoaded', () => window.selectTeacherCreateSource('upload'));
})();
