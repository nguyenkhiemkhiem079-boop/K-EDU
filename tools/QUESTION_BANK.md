# Ngân hàng câu hỏi Toán

Dữ liệu gốc nằm trong `js/documentQuestionBank.js`. Dữ liệu bổ sung được tách theo khối trong `js/question-bank/toan-*.js`. Trình duyệt chỉ tải khối được chọn khi giáo viên tạo đề; `stats.js` chứa thống kê toàn ngân hàng. Node.js nạp đủ các khối để kiểm kê và chạy kiểm thử.

## Mở rộng từ PDF

1. Cài thư viện: `npm ci --prefix tools`.
2. Trích xuất toàn kho bằng `npm run bank:extract:math`, tạo `tools/math-expanded-review.json`. Hoặc trích xuất từng khối, ví dụ:
   `node tools/extract-questions.js --dir "TÀI LIỆU/TOÁN/LỚP 10" --max-per-file 0 --output tools/math-10-review.json --log tools/math-10-skipped.log`
3. Chạy `npm run bank:prepare:math` để kiểm tra lại phương án. Công cụ ưu tiên file review toàn kho; nếu không có, nó tổng hợp các file review từng khối 6–12.
4. Chạy `npm run bank:import:math` để nhập câu đạt điều kiện và cập nhật thống kê.
5. Chạy `npm test`.

Có thể nhập một file review riêng: `node tools/extract-questions.js --commit --from-review --output tools/my-review.json`, sau đó chạy `npm run bank:audit`.

Nhập lại dữ liệu không thêm bản sao và không tái sử dụng ID đã có. Câu nhập cần nguồn, đáp án, phương án hợp lệ và bằng chứng đáp án (`inline_solution`, `scoped_answer_table`, hoặc `manual_review`). Khi duyệt thủ công, kiểm tra đầy đủ đề và đáp án trước khi đặt `confidence: "high"` và `answerEvidence: "manual_review"`.

Tài liệu đánh số câu lặp lại không được dùng bảng đáp án chung để suy đoán đáp án. Câu cần hình/bảng chưa trích xuất được giữ ở bước duyệt. Lời giải bị lỗi font được bỏ khỏi dữ liệu nhập; đáp án và đường dẫn PDF vẫn được giữ. Độ tin cậy trích xuất không bảo đảm tính đúng đắn toán học của tài liệu gốc.

## Tạo đề

- Hai khu vực: **Cơ bản** chỉ dùng NB/TH; **VDC trường chuyên** chỉ dùng câu VDC được duyệt nguồn tài liệu trường chuyên, độ khó và đáp án. Chế độ này bắt buộc nguồn `document`, kể cả khi API yêu cầu `hybrid`/`synthetic`. Mặc định giao diện là Cơ bản. API engine nhận `difficultyMode: 'basic' | 'advanced'`; giá trị `mixed` giữ tương thích lời gọi cũ.
- KHTN nhận `discipline: 'vat_ly' | 'hoa_hoc' | 'sinh_hoc' | 'all'`. Phân môn được lọc thật trong ngân hàng và mẫu sinh, không lấy môn khác bù thiếu.
- Danh sách đề học sinh lọc theo môn và mức độ. Đề cũ chỉ được đưa vào khu vực Cơ bản/Nâng cao nếu các nhãn câu đều phù hợp; đề hỗn hợp/chưa phân loại vẫn truy cập được ở mục Tất cả.
- Thống kê `byDisciplineDifficulty` ghi số câu cơ bản/nâng cao/chưa phân loại từng môn; giao diện hiển thị bảng tương ứng. Nhãn NB/TH/VD/VDC hiện có chưa thay thế việc duyệt chuyên môn.

## Chọn lọc VDC từ trường chuyên

`node tools/curate-specialized-bank.js` tạo `specialized-school-review.json` và `specialized-school-report.json` từ các file review hiện có. Dấu “THPT CHUYÊN ...” chỉ đưa câu vào danh sách ứng viên; không xác nhận nguồn, không tự nâng cấp độ khó. Chuyên đề, tên trường trong bài toán, sách tuyển tập hoặc nhãn VDC tự động không đủ điều kiện.

Trước khi duyệt, đối chiếu tài liệu gốc của trường: tên trường, trang PDF, dấu nguồn và nội dung đầy đủ; đánh giá lời giải có yêu cầu lập luận nhiều bước, phân trường hợp/tham số hoặc kết hợp kiến thức thực sự ở mức VDC; giải lại và kiểm tra đáp án. Câu thường từ trường chuyên vẫn bị loại. Tuyển tập trích dẫn trường chuyên cần truy về tài liệu gốc, không duyệt toàn bộ tuyển tập.

Bản ghi `curation` cần `status: approved`, `sourceType: specialized_school`, `documentOriginVerified`, `difficultyReviewed`, `answerReviewed` đều true; tên trường, trang PDF, bằng chứng nguồn, ID câu, đường dẫn nguồn và chữ ký nội dung/đáp án phải khớp. Chỉ đặt true sau đối chiếu thực tế. Công cụ không tự đánh dấu các bước này.

`node tools/curate-specialized-bank.js --apply tools/specialized-school-review.json` áp dụng bản ghi đã duyệt vào shard, đổi mức đã duyệt thành VDC. Công cụ kiểm tra toàn bộ trước ghi và từ chối câu trong ngân hàng gốc cần migration riêng. Sau đó chạy `npm run bank:audit` và `npm test`. Chưa có bản ghi nguồn đã duyệt thì khu vực này báo thiếu câu, không bù bằng kho thường.
- Trước khi gọi engine từ trình duyệt, dùng `await DocumentQuestionBank.ensureGradeLoaded('10')` cho khối tương ứng.
- `document` chỉ dùng câu tài liệu; `hybrid` có thể bổ sung câu sinh tự động.
- Hết câu độc nhất thì dừng và cảnh báo; hệ thống không thêm nhãn “Biến thể” vào câu cũ để đủ số lượng.
- Bộ đề thiếu câu sẽ không tự động được lưu. Đề đơn có thể thiếu câu để giáo viên biên tập; đề rỗng bị chặn.
- Chế độ đảo mã đề dùng chung câu hỏi có chủ đích; chế độ độc lập dùng một tập chống trùng chung.

## Kết quả đợt mở rộng

Đã quét 102 PDF Toán lớp 7–12, trích xuất 75.984 mục để sàng lọc. Ngân hàng Toán tăng từ 1.871 lên 13.962 câu, bổ sung 12.091 câu độc nhất theo nội dung chuẩn hóa. Kho chưa có PDF Toán lớp 6. Các câu trích xuất của lớp 7–9 chưa đạt điều kiện đáp án nên chưa được nhập tự động.

`bank-audit.json` ghi thống kê độ phủ theo môn/khối/chủ đề/độ khó/dạng câu, bản sao và lỗi cấu trúc. `math-expansion-report.json` ghi số mục trích xuất và cần duyệt. File review lớn được giữ cục bộ, không đưa vào Git.
