# Rà soát K-EDU — 14/09/2026

Phạm vi: mã JavaScript và tài nguyên HTML của ứng dụng chính, MathExamPlatform, công cụ nhập ngân hàng, tạo đề, chấm bài, lưu trữ, thống kê và tích hợp AI. Các sửa đổi đang ở workspace, chưa commit hoặc push.

## Lỗi xác nhận đã sửa

| Nhóm | Lỗi và thay đổi |
|---|---|
| Ngân hàng/tạo đề | Chặn ID và nội dung chuẩn hóa trùng; nhập lại không tăng bản sao; tải ngân hàng theo khối; dùng tập chống trùng chung cho đề độc lập. Hết câu thì cảnh báo, không tạo biến thể giả hoặc lưu bộ đề thiếu câu. |
| DGNL/đề cũ | Bỏ cơ chế chấp nhận câu lặp khi thử quá nhiều; chọn đúng nguồn tài liệu; bộ tạo đề cũ không lấy câu khối khác để bù thiếu. |
| Chấm Toán | Sửa việc biến `1/2` thành `12`, chấp nhận chuỗi rác như `abc5`, bỏ qua đáp án số 0 và phép chia cho 0. Phân bổ tổng điểm chính xác 10 khi số câu không chia hết. |
| Đáp án | Bản HTML KHTN mặc định không kèm bảng đáp án; lọc bảng đáp án trong mẫu HTML cũ khi mở bài. Khóa công khai bỏ đáp án và lời giải. Đây chưa phải bảo vệ đáp án ở phía máy chủ. |
| Lưu đề/tệp | Sửa mất nội dung sau dấu phẩy trong data URL, xử lý Blob và URL tạm, báo lỗi lưu thật, không tạo đề ảo khi tệp lưu thất bại. Kiểm tra đáp án và điểm trước khi xuất bản. |
| Nộp bài | Chỉ khóa lượt nộp sau khi lưu thành công; giữ bài tạm nếu lưu lỗi; phân biệt học sinh cùng tên ở các lớp. Gộp kết quả cục bộ và cloud để tránh mất bài chưa đồng bộ. |
| Điểm/thống kê | Bài tài liệu chưa chấm không tự nhận 10 điểm hoặc XP; loại khỏi trung bình, biểu đồ và xếp hạng. Backfill dùng trường `answerKeys` thực tế. |
| Biên tập/PDF | Giữ câu Đúng/Sai khi sửa đề; không tự gán A/Đúng khi thiếu đáp án. Bảng đáp án không được suy đoán cho tài liệu đánh số lặp. Từ chối tự nhập câu cần hình chưa lấy được. |
| AI | Kiểm tra API key, lỗi HTTP, JSON và cấu trúc câu; báo rõ giới hạn đầu vào thay vì âm thầm cắt. Thay model Claude 3.5 đã ngừng phục vụ bằng model hiện hành; model có thể cấu hình. |
| Công cụ giáo viên | Sửa thao tác hiện đáp án/tự giải dùng trạng thái và nút không tồn tại. QA driver chỉ chạy trên localhost. Bỏ hướng dẫn mở toàn bộ quyền Firebase khi gặp lỗi. |

Model Claude 3.5 Sonnet đã ngừng phục vụ theo [thông báo chính thức Anthropic](https://platform.claude.com/docs/en/about-claude/model-deprecations). Cấu hình Gemini được đối chiếu với [danh sách model Google](https://ai.google.dev/gemini-api/docs/models). Chưa gọi API AI thật để kiểm chứng trên tài khoản người dùng.

## Vấn đề còn lại

| Ưu tiên | Vấn đề | Hướng xử lý |
|---|---|---|
| P1 | PIN/quyền giáo viên được xác minh ở trình duyệt; dữ liệu đáp án và chấm điểm vẫn ở client. Người kiểm soát trình duyệt có thể can thiệp. Repo chưa có cấu hình Firebase Authentication và Rules theo vai trò được kiểm chứng. | Xác thực tài khoản, kiểm tra quyền phía máy chủ, lưu đáp án riêng và chấm bài trên máy chủ. Chưa kiểm tra Rules đang triển khai. |
| P2 | Học kỳ chủ yếu đổi nhãn, chưa lọc câu theo chương trình học kỳ đã xác minh; `levelDistribution` ở bộ tạo đề cũ chưa được áp dụng. | Bổ sung dữ liệu chương/học kỳ chuẩn và bộ chọn theo tỷ lệ độ khó thực tế. |
| P2 | Thiếu độ phủ lớp 6–9: kho không có PDF lớp 6; câu trích xuất lớp 7–9 chưa đủ bằng chứng đáp án để nhập. Kho tự luận/DGNL sinh tự động còn nhỏ. | Duyệt đáp án nguồn, bổ sung tài liệu và mở rộng mẫu; hiện cảnh báo thiếu câu thay vì lặp. |
| P2 | Ba PDF scan chưa OCR; hình/bảng chưa được đưa vào câu tự động. Parser PDF trình duyệt có thể cắt tài liệu nhiều đề tại bảng đáp án đầu tiên. | OCR, lưu hình gắn với câu, tách từng đề và đối chiếu số câu trước nhập. |
| P2 | Độ tin cậy trích xuất không xác nhận đáp án đúng về toán học. Chống trùng hiện dựa trên nội dung chuẩn hóa, chưa phát hiện mọi câu tương đương về ngữ nghĩa. | Duyệt toán học và kiểm tra câu gần giống trước xuất bản. |
| P2 | Hồ sơ XP dùng một khóa localStorage chung trên thiết bị. XP/huy hiệu lịch sử từng nhận từ bài tài liệu chưa được thu hồi. | Thiết kế hồ sơ theo danh tính và migration có kiểm kê dữ liệu. |
| P2 | Gộp cloud/local có thể ưu tiên bản cloud cùng ID dù bản cục bộ sửa mới hơn. | Thêm phiên bản hoặc thời gian cập nhật và giải quyết xung đột đồng bộ. |

Firebase cần phối hợp Authentication với Security Rules để kiểm soát truy cập theo danh tính; PIN giao diện không cung cấp lớp bảo vệ này. Xem [Firebase Rules and Authentication](https://firebase.google.com/docs/rules/rules-and-auth).

## Kiểm chứng và giới hạn

- `npm test`: 12/12 bộ kiểm thử đạt, gồm cú pháp/tài nguyên dự án, tạo đề, ngân hàng, chống trùng, nhập lại, thống kê và hồi quy lưu/chấm bài.
- `npm run bank:audit`: 14.034 câu, 14.034 nội dung chuẩn hóa độc nhất, 0 lỗi cấu trúc được kiểm tra. Trong đó 13.962 Toán và 72 KHTN.
- Chi tiết máy đọc được: `qa-results.json`, `bank-audit.json`.
- Kiểm thử trình duyệt dùng VM với DOM giả lập; chưa chạy E2E Chrome/mobile thật, IndexedDB với PDF lớn, upload cloud thật hoặc API AI thật.
- Không truy cập dữ liệu riêng trên production, không triển khai hoặc thay Rules đang chạy. Kết quả kiểm thử không có nghĩa toàn hệ thống đã hết lỗi.
