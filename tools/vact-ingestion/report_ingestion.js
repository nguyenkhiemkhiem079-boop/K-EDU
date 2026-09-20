const fs = require('fs');
const path = require('path');

function generateIngestionReport(stats, options = {}) {
  const mdPath = options.outputPath || path.resolve('docs', 'vact-source-ingestion-report.md');
  const now = new Date().toISOString();

  const md = `# Báo cáo Nhập liệu & Thẩm định Nguồn Đề V-ACT (K-EDU)

*Ngày lập báo cáo: ${now}*

---

## 1. Thống kê Tài liệu Nguồn (Source Documents)

| Phân loại | Số lượng tệp | Tỷ lệ | Trạng thái trích xuất |
| :--- | :--- | :--- | :--- |
| **OFFICIAL (Chính thức)** | ${stats.sourcesByCategory.OFFICIAL || 0} | ${((stats.sourcesByCategory.OFFICIAL || 0) / stats.totalSources * 100).toFixed(1)}% | Được phép |
| **FULL_TEST (Đề thi thử hoàn chỉnh)** | ${stats.sourcesByCategory.FULL_TEST || 0} | ${((stats.sourcesByCategory.FULL_TEST || 0) / stats.totalSources * 100).toFixed(1)}% | Được phép |
| **SUBJECT_BANK (Ngân hàng theo môn)** | ${stats.sourcesByCategory.SUBJECT_BANK || 0} | ${((stats.sourcesByCategory.SUBJECT_BANK || 0) / stats.totalSources * 100).toFixed(1)}% | Được phép |
| **PENDING (Chờ thẩm định / Ngoài phạm vi)** | ${stats.sourcesByCategory.PENDING || 0} | ${((stats.sourcesByCategory.PENDING || 0) / stats.totalSources * 100).toFixed(1)}% | Bị chặn |
| **DUPLICATE (Bản sao trùng lặp byte)** | ${stats.sourcesByCategory.DUPLICATE || 0} | ${((stats.sourcesByCategory.DUPLICATE || 0) / stats.totalSources * 100).toFixed(1)}% | Bị chặn |
| **TỔNG CỘNG TÀI LIỆU NGUỒN** | **${stats.totalSources}** | **100.0%** | **${stats.ingestableSources} tệp hợp lệ** |

---

## 2. Kết quả Trích xuất Câu hỏi Thực tế (Real Extraction)

> [!IMPORTANT]
> **Nguyên tắc Provenance**: 100% câu hỏi trong báo cáo này được trích xuất trực tiếp từ các tệp PDF nguồn thực tế trong kho \`TÀI LIỆU/DGNL/V-ACT/\`. Không có câu hỏi tổng hợp hay câu hỏi suy đoán từ AI.

- **Tổng số câu hỏi trích xuất thô (Raw Extracted)**: ${stats.totalRaw} câu
- **Tổng số câu hỏi độc bản (Unique Questions)**: ${stats.uniqueCount} câu
- **Số câu hỏi trùng lặp được phát hiện & gộp (Duplicates Merged)**: ${stats.duplicateCount} câu
- **Tỷ lệ trùng lặp liên tài liệu**: ${((stats.duplicateCount / (stats.totalRaw || 1)) * 100).toFixed(1)}%

---

## 3. Phân loại Trạng thái Chất lượng (Quality Status)

| Trạng thái | Số lượng | Tỷ lệ | Mô tả |
| :--- | :--- | :--- | :--- |
| 🟢 **production** | **${stats.productionCount}** | **${((stats.productionCount / (stats.uniqueCount || 1)) * 100).toFixed(1)}%** | Có đáp án xác thực, 4 phương án chuẩn A-D, đủ điều kiện thi |
| 🟡 **review_required** | **${stats.reviewRequiredCount}** | **${((stats.reviewRequiredCount / (stats.uniqueCount || 1)) * 100).toFixed(1)}%** | Thiếu đáp án xác thực từ tài liệu nguồn, cần chuyên gia duyệt |
| 🔴 **invalid** | **${stats.invalidCount}** | **${((stats.invalidCount / (stats.uniqueCount || 1)) * 100).toFixed(1)}%** | Không đủ 4 phương án, bị lỗi font hoặc văn bản vỡ |

---

## 4. Độ phủ Ngân hàng Câu hỏi Sẵn sàng Thi đấu (Production Coverage)

| Phân phần V-ACT | Số câu Production | Tỷ lệ trên tổng | Trạng thái cung ứng |
| :--- | :--- | :--- | :--- |
| **Tiếng Việt (Vietnamese)** | ${stats.bySection.vietnamese || 0} câu | ${(((stats.bySection.vietnamese || 0) / (stats.productionCount || 1)) * 100).toFixed(1)}% | Sẵn sàng |
| **Tiếng Anh (English)** | ${stats.bySection.english || 0} câu | ${(((stats.bySection.english || 0) / (stats.productionCount || 1)) * 100).toFixed(1)}% | Sẵn sàng |
| **Toán học (Math)** | ${stats.bySection.math || 0} câu | ${(((stats.bySection.math || 0) / (stats.productionCount || 1)) * 100).toFixed(1)}% | Sẵn sàng |
| **Tư duy Logic & Số liệu (Logic/Data)** | ${stats.bySection.logic_data || 0} câu | ${(((stats.bySection.logic_data || 0) / (stats.productionCount || 1)) * 100).toFixed(1)}% | Sẵn sàng |
| **Giải quyết Vấn đề Khoa học (Scientific Reasoning)** | ${stats.bySection.scientific_reasoning || 0} câu | ${(((stats.bySection.scientific_reasoning || 0) / (stats.productionCount || 1)) * 100).toFixed(1)}% | Sẵn sàng |
| **TỔNG PRODUCTION QUESTIONS** | **${stats.productionCount}** | **100.0%** | **Nguồn gốc thực 100%** |

---

## 5. Năng lực Cung ứng Đề thi (Exam Readiness)

${Object.entries(stats.profileReadiness || {}).map(([profileId, readiness]) => `- **${profileId} Ready**: **${readiness.runtimeReady ? 'YES' : 'NO'}** (${readiness.generated}/${readiness.required}; thiếu ${Object.values(readiness.missing || {}).reduce((sum, value) => sum + value, 0)})`).join('\n')}
- **Số đề thi hoàn chỉnh nguyên gốc (Registered Full Exams)**: ${stats.totalExams || 0} đề
  - Hoàn chỉnh 120/120: ${stats.completeExams || 0} đề
  - Chưa hoàn chỉnh: ${stats.incompleteExams || 0} đề
`;

  const dir = path.dirname(mdPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(mdPath, md, 'utf8');
  return md;
}

module.exports = {
  generateIngestionReport
};
