# 🎓 KhiemEdu — Đấu Trường Học Tập & Luyện Thi Thông Minh

**KhiemEdu** là nền tảng học tập, luyện thi trắc nghiệm & tự luận Toán học thông minh với cơ chế **Gamification** (tích điểm XP, Streak chuỗi ngày học, huy hiệu vinh danh) và hỗ trợ công thức Toán học **LaTeX/KaTeX** chuyên nghiệp.

---

## ✨ Tính năng nổi bật

### 1. 👨‍🏫 Dành cho Giáo viên (Teacher Hub)
- **Trích xuất đề thi từ PDF**: Đọc file PDF đề thi và tự động tách câu hỏi, đáp án bằng AI hoặc bộ nhận diện tích hợp sẵn.
- **Biên tập trực quan & Công thức Toán KaTeX**: Soạn thảo và xem trước công thức Toán ($\sqrt{x}$, phân số $\frac{a}{b}$, tích phân...) sắc nét theo chuẩn LaTeX.
- **Tùy biến đề thi linh hoạt**: Hỗ trợ 3 dạng câu hỏi: Trắc nghiệm (A/B/C/D), Đúng/Sai, Điền đáp án / Tự luận số.
- **Cơ chế chống gian lận**: Phát hiện và đếm số lần học sinh chuyển tab / rời khỏi trang làm bài, chặn sao chép câu hỏi.
- **Quản lý & Xuất kết quả**: Bảng điểm phân loại theo lớp, thống kê ma trận độ khó câu hỏi, xuất file Excel/CSV.

### 2. 🎒 Dành cho Học sinh (Student Arena)
- **Vào thi nhanh bằng mã đề**: Nhập mã đề 6 ký tự, chọn lớp và Avatar cá nhân.
- **Giao diện làm bài hiện đại**:
  - Bản đồ điều hướng câu hỏi (Question Grid Navigation): Đã làm / Chưa làm / Đánh dấu xem lại.
  - Đồng hồ đếm ngược thông minh có cảnh báo đổi màu.
  - Hiển thị công thức Toán học đẹp mắt.
  - Bảng xếp hạng trực tiếp (Live Leaderboard) trong lúc làm bài.
- **Phân tích kết quả sau thi**: Chấm điểm tức thì, xem lại chi tiết từng câu kèm đáp án đúng và lời giải.

### 3. 🏆 Hệ thống Gamification (Tăng Cảm Hứng Học Tập)
- **Tích điểm XP & Thăng cấp**: Tích lũy kinh nghiệm qua mỗi bài thi, thăng tiến từ *Tân Binh* đến *Đại Tông Sư Toán Học*.
- **Chuỗi ngày học (Daily Streak)**: Duy trì học tập liên tục mỗi ngày với biểu tượng ngọn lửa rực cháy.
- **Huy hiệu thành tựu (Badges)**: 12 huy hiệu độc quyền (Thần tốc, Bất bại, Chăm chỉ, Cú đêm, Chiến thần...).
- **Hiệu ứng âm thanh & Pháo hoa Confetti**: Tận hưởng cảm giác chiến thắng khi hoàn thành bài thi với điểm số cao.

---

## 🚀 Hướng dẫn Chạy Ứng dụng

Ứng dụng được đóng gói hoàn chỉnh, sẵn sàng chạy ngay trên mọi trình duyệt hiện đại mà không cần cài đặt phức tạp.

1. Mở file `index.html` trực tiếp bằng trình duyệt (Chrome, Edge, Firefox, Safari).
2. Hoặc sử dụng Live Server trong VS Code / chạy lệnh:
   ```bash
   npx serve .
   ```
3. Bạn cũng có thể đẩy dự án lên **GitHub Pages** để sử dụng online hoàn toàn miễn phí.

---

## 🛠️ Công nghệ Sử dụng
- **Core**: HTML5 Semantic, Modern CSS3 (CSS Variables, Flexbox/Grid, Glassmorphism, Dark/Light mode).
- **Libraries**:
  - [KaTeX](https://katex.org/): Render công thức toán siêu tốc.
  - [PDF.js](https://mozilla.github.io/pdf.js/): Bóc tách nội dung file đề PDF.
  - [Canvas Confetti](https://www.kirilv.com/canvas-confetti/): Hiệu ứng pháo hoa ăn mừng rực rỡ.
  - [Lucide Icons](https://lucide.dev/): Bộ icon vector sắc nét.
  - **Web Audio API**: Hệ thống âm thanh tương tác sống động, tự sinh không cần tải file ngoài.

---
© 2026 KhiemEdu. All rights reserved.
