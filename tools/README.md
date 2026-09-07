# KHIEMEDU - Pipeline Trích Xuất Câu Hỏi Từ File PDF (Build-time Pipeline)

Tài liệu hướng dẫn sử dụng công cụ bóc tách câu hỏi trắc nghiệm, tự luận và bảng đáp án từ kho file PDF thật (`TÀI LIỆU/`) vào Ngân hàng câu hỏi (`DocumentQuestionBank`).

---

## 🎯 Giới Thiệu
Pipeline được xây dựng hoàn toàn bằng **Node.js** chạy offline tại terminal (dùng thư viện `pdf-parse`), tuyệt đối **không chạy trong trình duyệt** nhằm bảo đảm hiệu năng tối ưu cho người dùng cuối (kho tài liệu gồm 147 file PDF ~772 MB).

Công cụ thực hiện:
1. Đọc và lọc layer văn bản từ các file PDF.
2. Tự động phát hiện và bỏ qua các file scan ảnh (không có text layer) an toàn, ghi nhật ký vào `tools/skipped-pdfs.log`.
3. Bóc tách câu hỏi, loại bỏ tiêu đề/header tài liệu, tách 4 phương án $A, B, C, D$, nhận diện câu hỏi Đúng/Sai và ghép nối với Bảng Đáp Án hoặc Lời giải chi tiết.
4. Đánh giá độ tin cậy (`confidence`: `'high'` hoặc `'low'`) và lưu toàn bộ kết quả vào `tools/extracted-review.json`.
5. Append các câu hỏi đạt chuẩn (`confidence: 'high'`) vào `js/documentQuestionBank.js` khi được chỉ định (`--commit`).

---

## 💻 Hướng Dẫn Sử Dụng

### 1. Chạy Trích Xuất & Xuất File Review (Khuyên dùng trước khi commit)
Lệnh này quét toàn bộ thư mục `TÀI LIỆU/`, phân tích câu hỏi và xuất ra file `tools/extracted-review.json` để giáo viên xem xét:
```bash
node tools/extract-questions.js --dir "TÀI LIỆU"
```

### 2. Chạy & Tự Động Commit Vào Ngân Hàng Câu Hỏi
Lệnh này sẽ lọc các câu hỏi đạt chuẩn `'high confidence'`, gán mã định danh duy nhất (ví dụ: `TOAN10_DE_ON_TAP_001`), lọc trùng lặp nội dung, và append vào CSDL `js/documentQuestionBank.js` (bảo toàn nguyên vẹn 32 câu hỏi thủ công gốc):
```bash
node tools/extract-questions.js --dir "TÀI LIỆU" --commit
```

### 3. Tùy Chọn Mở Rộng
- Chỉ định thư mục PDF khác:
  ```bash
  node tools/extract-questions.js --dir "DUONG_DAN_THU_MUC"
  ```
- Thay đổi số lượng câu hỏi tối đa trích xuất trên mỗi file (mặc định: 50 câu tinh hoa/file, đặt `0` nếu muốn lấy không giới hạn):
  ```bash
  node tools/extract-questions.js --dir "TÀI LIỆU" --max-per-file 100
  ```
- Tùy chỉnh đường dẫn file review hoặc file log:
  ```bash
  node tools/extract-questions.js --output "tools/my-review.json" --log "tools/my-skipped.log"
  ```

---

## 📂 Cấu Trúc Output
- `tools/extracted-review.json`: Chứa danh sách đầy đủ toàn bộ câu hỏi trích xuất, mỗi câu bao gồm:
  - `id`: Mã định danh.
  - `grade`: Khối lớp (`10`, `11`, `12`, `DGNL`...).
  - `topic`: Chủ đề Toán học (`ham_so`, `vecto`, `hinh_hoc`, `dgnl_logic`...).
  - `type`: Phân loại (`mcq`, `truefalse`, `essay`).
  - `source`: Tên tài liệu gốc để trích dẫn nguồn.
  - `sourceFile`: Đường dẫn tương đối đến file PDF.
  - `question`: Nội dung câu hỏi.
  - `options`: Mảng 4 phương án $A, B, C, D$.
  - `correctAnswer`: Đáp án đúng ($A, B, C, D$ hoặc Đúng/Sai).
  - `explanation`: Lời giải thích hoặc trích dẫn.
  - `confidence`: Độ tin cậy (`'high'` hoặc `'low'`).
- `tools/skipped-pdfs.log`: Danh sách các file PDF bị bỏ qua (file scan ảnh không có text layer) kèm lý do chi tiết.
- `js/documentQuestionBank.js`: CSDL câu hỏi dùng cho ứng dụng web K-EDU.

---

## 🔄 Quy Trình Khi Có Thêm Tài Liệu PDF Mới
1. Copy file PDF mới vào thư mục tương ứng trong `TÀI LIỆU/` (ví dụ: `TÀI LIỆU/TOÁN/LỚP 10/` hoặc `TÀI LIỆU/DGNL/`).
2. Mở terminal tại thư mục gốc của K-EDU và chạy:
   ```bash
   node tools/extract-questions.js --dir "TÀI LIỆU" --commit
   ```
3. Khởi động lại ứng dụng web hoặc tải lại trang, Teacher Hub sẽ tự động cập nhật số liệu thống kê câu hỏi mới trong CSDL!
