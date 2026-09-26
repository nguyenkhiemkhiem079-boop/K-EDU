/**
 * K-EDU — Cấp quyền "teacher" cho tài khoản Firebase Authentication
 * ------------------------------------------------------------------
 * TẠI SAO CẦN SCRIPT NÀY:
 * Cloud Sync (lưu đề lên Firebase để học sinh máy khác tìm được bằng mã)
 * yêu cầu tài khoản giáo viên có custom claim `teacher: true`. Claim này
 * KHÔNG THỂ tự cấp từ giao diện web (đây là quy tắc bảo mật cố ý — xem
 * firebase/firestore.rules dòng 8-11 và 18). Chỉ có thể cấp bằng Firebase
 * Admin SDK, chạy ở máy của BẠN với quyền quản trị dự án — không ai khác
 * (kể cả Claude) có thể chạy hộ vì cần Service Account Key, là thông tin
 * TUYỆT ĐỐI không nên dán vào bất kỳ đâu ngoài máy tính của bạn.
 *
 * CÁCH DÙNG:
 * 1. Vào Firebase Console -> Project Settings -> Service accounts
 *    -> "Generate new private key" -> tải file JSON về máy BẠN (không
 *    upload lên đâu cả, không commit vào Git).
 * 2. Cài thư viện (một lần): npm install firebase-admin
 * 3. Chạy: node grant-teacher-claim.js "duong/dan/tới/serviceAccountKey.json" "email-giao-vien@domain.com"
 * 4. Giáo viên ĐĂNG XUẤT rồi ĐĂNG NHẬP LẠI trên web (mục "Xác thực Giáo
 *    viên cho Cloud" trong Cài đặt) để claim mới có hiệu lực — Firebase
 *    chỉ cập nhật claim vào token ở lần đăng nhập/làm mới token tiếp theo.
 *
 * LƯU Ý: nếu tài khoản email đó CHƯA tồn tại trong Firebase Authentication,
 * hãy tạo trước ở Console -> Authentication -> Add user, rồi mới chạy script.
 */

const path = require('path');

async function main() {
  const [, , keyPathArg, emailArg] = process.argv;
  if (!keyPathArg || !emailArg) {
    console.error('Cách dùng: node grant-teacher-claim.js <đường-dẫn-service-account.json> <email-giáo-viên>');
    process.exit(1);
  }

  let admin;
  try {
    admin = require('firebase-admin');
  } catch (e) {
    console.error('Chưa cài firebase-admin. Chạy trước: npm install firebase-admin');
    process.exit(1);
  }

  const serviceAccount = require(path.resolve(keyPathArg));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  try {
    const user = await admin.auth().getUserByEmail(emailArg);
    await admin.auth().setCustomUserClaims(user.uid, { teacher: true });
    console.log(`✅ Đã cấp claim "teacher: true" cho ${emailArg} (uid: ${user.uid}).`);
    console.log('   Giáo viên cần đăng xuất rồi đăng nhập lại trên web để claim có hiệu lực.');
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.error(`❌ Không tìm thấy tài khoản với email ${emailArg}.`);
      console.error('   Hãy tạo tài khoản trước ở Firebase Console -> Authentication -> Add user.');
    } else {
      console.error('❌ Lỗi:', error.message);
    }
    process.exit(1);
  }

  process.exit(0);
}

main();
