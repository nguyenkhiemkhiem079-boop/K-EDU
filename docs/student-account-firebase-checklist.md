# Hướng Dẫn & Checklist Cấu Hình Firebase Cho Tài Khoản Học Sinh K-EDU

Tài liệu này hướng dẫn quản trị viên / giáo viên kiểm tra và cấu hình Firebase Authentication và Cloud Firestore để tính năng tài khoản học sinh hoạt động ổn định 100%.

---

## 1. Firebase Console Checklist

### A. Bật Firebase Authentication (Email/Password)
Hệ thống K-EDU sử dụng cơ chế định danh ẩn danh an toàn: học sinh nhập tên đăng nhập tự chọn, hệ thống chuyển đổi qua mã băm SHA-256 nội bộ dạng `<sha256_hex_40>@students.kedu.invalid` và xác thực qua Firebase Authentication Email/Password Provider.

1. Truy cập [Firebase Console](https://console.firebase.google.com/).
2. Chọn dự án K-EDU (ví dụ: `k-edu-d2051`).
3. Vào **Build** → **Authentication** → chuyển sang tab **Sign-in method**.
4. Tìm nhà cung cấp **Email/Password**:
   - Trạng thái bắt buộc: **Enabled (Đã bật)**.
   - Không cần bật tính năng "Email link (passwordless sign-in)".
5. Nhấn **Save (Lưu)**.

> **Nếu Email/Password chưa bật:**
> Khi học sinh đăng ký, Firebase sẽ trả về mã lỗi `auth/operation-not-allowed`. K-EDU sẽ hiển thị thông báo rõ ràng:
> *"Chức năng tạo tài khoản chưa được bật trên hệ thống."*

---

### B. Triển khai Firestore Security Rules (`students/{uid}`)
Hồ sơ học sinh được lưu tại đường dẫn tài liệu: `students/{uid}`.

1. Vào **Build** → **Firestore Database** → chuyển sang tab **Rules**.
2. Kiểm tra hoặc sao chép quy tắc từ tệp tham chiếu [`firebase/student-profiles.rules`](../firebase/student-profiles.rules) vào bộ rules chính của dự án:
   ```javascript
   match /students/{uid} {
     allow read: if request.auth != null && (request.auth.uid == uid || request.auth.token.teacher == true);
     allow create: if request.auth != null && request.auth.uid == uid
       && request.resource.data.keys().hasOnly(['uid', 'email', 'username', 'name', 'className', 'role', 'createdAt', 'updatedAt'])
       && request.resource.data.username is string && request.resource.data.username.size() >= 3 && request.resource.data.username.size() <= 40
       && request.resource.data.uid == uid && request.resource.data.email == request.auth.token.email
       && request.resource.data.role == 'student'
       && request.resource.data.name is string && request.resource.data.name.size() > 0 && request.resource.data.name.size() <= 100
       && request.resource.data.className is string && request.resource.data.className.size() > 0 && request.resource.data.className.size() <= 40
       && request.resource.data.createdAt is string;
     allow update: if request.auth != null
       && ((request.auth.uid == uid
         && request.resource.data.keys().hasOnly(['uid', 'email', 'username', 'name', 'className', 'role', 'createdAt', 'updatedAt'])
         && request.resource.data.uid == uid
         && request.resource.data.email == resource.data.email
         && request.resource.data.username == resource.data.username
         && request.resource.data.role == 'student'
         && request.resource.data.createdAt == resource.data.createdAt
         && request.resource.data.name is string && request.resource.data.name.size() > 0 && request.resource.data.name.size() <= 100
         && request.resource.data.className is string && request.resource.data.className.size() > 0 && request.resource.data.className.size() <= 40
         && request.resource.data.updatedAt is string)
       || request.auth.token.teacher == true);
     allow delete: if request.auth != null && request.auth.token.teacher == true;
   }
   ```
3. Bấm **Publish (Xuất bản)** để triển khai rules lên hệ thống.

---

## 2. Nhận Diện & Xử Lý Tình Huống: Auth Thành Công nhưng Firestore Thất Bại

### Triệu chứng
- Trong **Firebase Console → Authentication → Users**: Tài khoản người dùng UID đã được tạo.
- Trong **Firebase Console → Firestore Database**: Bộ sưu tập `students` chưa có document của UID đó, hoặc thao tác lưu bị lỗi (thường do Rules bị chặn `permission-denied` hoặc mất kết nối mạng giữa chừng).

### Cơ chế tự phục hồi hai giai đoạn của K-EDU
K-EDU không xóa Auth user và không báo lỗi chung chung giả vờ tài khoản chưa tồn tại. Thay vào đó:
1. Giao diện hiển thị hướng dẫn:
   *"Tài khoản đã được tạo nhưng hồ sơ chưa lưu được. Hãy giữ nguyên tên đăng nhập và bấm Hoàn thiện hồ sơ."*
2. Nút **[Hoàn thiện hồ sơ]** (`studentCompleteProfileButton`) được kích hoạt.
3. Học sinh giữ nguyên tên đăng nhập và nhấn **Hoàn thiện hồ sơ**: hệ thống gọi `completeProfile()` để ghi lại hồ sơ vào Firestore mà không cần tạo lại Auth user.
4. Console trình duyệt lưu đầy đủ mã lỗi: `[StudentAccounts] permission-denied ...`.

### Khắc phục nhanh cho Giáo viên / Quản trị viên
1. Nếu lỗi là `permission-denied`: Đảm bảo quy tắc `students/{uid}` ở Mục 1.B đã được Publish trên Firebase Console.
2. Nếu học sinh đã thoát trình duyệt trước khi hoàn thiện hồ sơ: Học sinh chỉ cần bấm **Đăng nhập**, nhập tên và mật khẩu. K-EDU sẽ tự động phát hiện tài khoản thiếu hồ sơ và nhắc nhập họ tên, lớp rồi bấm **Hoàn thiện hồ sơ**.
