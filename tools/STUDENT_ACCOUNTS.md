# Tài khoản học sinh và giao diện giáo viên

Học sinh đăng ký/đăng nhập bằng email và mật khẩu qua Firebase Authentication; email cần nhận được thư để dùng Quên mật khẩu. Mật khẩu không được lưu trong localStorage hoặc Firestore. Đổi mật khẩu yêu cầu xác thực lại bằng mật khẩu hiện tại. Luồng này dựa trên [Firebase Authentication](https://firebase.google.com/docs/auth/web/manage-users).

Hồ sơ nằm tại `students/{uid}` gồm UID, email, tên, lớp, role student và thời điểm tạo. Chỉ học sinh có phiên Firebase và hồ sơ hợp lệ được bắt đầu bài thi. Nếu tạo tài khoản thành công nhưng ghi hồ sơ thất bại, học sinh có thể đăng nhập và Hoàn thiện hồ sơ sau khi lỗi được xử lý.

Kết quả có `studentUid`; lượt nộp, bài tạm dừng và hồ sơ XP cục bộ dùng UID. Dữ liệu cũ theo tên được giữ, không tự gán cho tài khoản mới để tránh nhận nhầm bài/XP. XP và bài tạm vẫn chỉ lưu theo thiết bị, chưa đồng bộ hồ sơ thành tích giữa các máy. Hồ sơ mới bắt đầu từ 0, không nhận thành tích mẫu.

Phần giáo viên tách Tải đề có sẵn và Tạo từ ngân hàng; mỗi lần chỉ hiện khối đang dùng. Sửa đề mở lại khối biên tập. Các tab quản lý đề/lớp, thống kê, đổi thưởng và cài đặt được giữ riêng. Không xóa ngân hàng/PDF hoặc dữ liệu bài nộp.

## Cấu hình trước khi sử dụng thật

1. Firebase Console → Authentication → Sign-in method: bật Email/Password và kiểm tra Authorized domains của website. Thiết lập chính sách mật khẩu phù hợp; giao diện yêu cầu tối thiểu 8 ký tự.
2. Tích hợp quy tắc collection mới trong `firebase/student-profiles.rules` vào bộ Rules đầy đủ đã rà soát. Không thay toàn bộ Rules đang chạy bằng file mẫu này. Quy tắc mở quyền toàn cục nếu đang có sẽ vô hiệu hóa giới hạn này và cần được thay bằng phân quyền đúng.
3. UID/role giáo viên phải được cấp qua backend/Admin SDK nếu dùng custom claim `teacher`; PIN giao diện hiện tại không tạo custom claim này.
4. Kiểm tra đăng ký, tải lại trang, đăng nhập máy khác, quên/đổi mật khẩu và quyền truy cập hồ sơ của người khác bằng Firebase Emulator hoặc tài khoản kiểm thử.

Chưa bật Authentication hay triển khai Rules lên dự án thật trong đợt sửa này. Kiểm thử hiện dùng SDK/DOM giả lập, không tạo tài khoản thật hoặc gửi email thật. Xác thực tài khoản không tự giải quyết chấm điểm/đáp án phía client; cần bảo vệ kết quả và quyền giáo viên trên máy chủ trong bước triển khai phân quyền đầy đủ.
