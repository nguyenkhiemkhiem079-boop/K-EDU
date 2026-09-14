(function () {
  const element = id => document.getElementById(id);
  const accounts = {
    auth: null, user: null, profile: null, busy: false, unsubscribe: null, mode: 'login',
    get uid() { return this.user?.uid || null; },
    get ready() { return !!this.user && !!this.profile && this.profile.uid === this.user.uid; },
    message(text, error = false) {
      const target = element('studentAccountStatus');
      if (target) { target.textContent = text; target.classList.toggle('account-error', error); }
    },
    errorMessage(error) {
      const messages = {
        'auth/operation-not-allowed': 'Dịch vụ tài khoản chưa được bật. Vui lòng liên hệ giáo viên.',
        'auth/email-already-in-use': 'Tên đăng nhập này đã được sử dụng. Hãy chọn tên khác.',
        'auth/invalid-email': 'Tên đăng nhập không hợp lệ.',
        'auth/invalid-credential': 'Tên đăng nhập hoặc mật khẩu không đúng.',
        'auth/wrong-password': 'Tên đăng nhập hoặc mật khẩu không đúng.',
        'auth/user-not-found': 'Tên đăng nhập hoặc mật khẩu không đúng.',
        'auth/weak-password': 'Mật khẩu chưa đáp ứng chính sách của hệ thống.',
        'auth/network-request-failed': 'Không kết nối được dịch vụ tài khoản. Kiểm tra mạng và thử lại.',
        'auth/too-many-requests': 'Có quá nhiều lần thử. Vui lòng thử lại sau.',
        'permission-denied': 'Chưa có quyền lưu hồ sơ học sinh. Cần cấu hình Rules cho students/{uid}.'
      };
      return messages[error.code] || error.message || 'Không thực hiện được thao tác tài khoản.';
    },
    async init() {
      if (this.auth) return;
      if (!window.FirebaseEngine?.app || !window.firebase?.auth) throw new Error('Dịch vụ tài khoản chưa sẵn sàng. Cần bật Firebase và tải SDK Authentication.');
      this.auth = window.FirebaseEngine.app.auth();
      this.auth.languageCode = 'vi';
      this.unsubscribe = this.auth.onAuthStateChanged(user => {
        if (!this.busy) this.restore(user).catch(error => { this.profile = null; this.render(); this.message(this.errorMessage(error), true); });
      });
    },
    async restore(user) {
      this.user = user; this.profile = null; this.render();
      if (!user) return;
      const snapshot = await window.FirebaseEngine.db.collection('students').doc(user.uid).get();
      if (this.auth.currentUser?.uid !== user.uid) return;
      if (!snapshot.exists) {
        this.message('Tài khoản đã tồn tại nhưng chưa có hồ sơ. Nhập họ tên và lớp, rồi bấm Hoàn thiện hồ sơ.', true);
        element('studentAccountProfileFields')?.classList.remove('hidden');
        element('studentCompleteProfileButton')?.classList.remove('hidden');
        return;
      }
      const profile = snapshot.data();
      if (profile.uid !== user.uid || !profile.name || !profile.className) throw new Error('Hồ sơ tài khoản không hợp lệ.');
      this.profile = profile; this.render();
      this.message('Đã đăng nhập. Bạn có thể chọn đề để làm bài.');
    },
    render() {
      element('studentAccountCredentials')?.classList.toggle('hidden', this.ready);
      element('studentAccountSignedIn')?.classList.toggle('hidden', !this.ready);
      if (element('studentAccountIdentity')) element('studentAccountIdentity').textContent = this.ready ? `${this.profile.name} · Lớp ${this.profile.className}` : '';
      for (const [id, value] of [['studentJoinName', this.profile?.name], ['studentJoinClass', this.profile?.className]]) {
        const input = element(id);
        if (input) { input.value = value || ''; input.readOnly = true; }
      }
      if (typeof updatePersonalizedExamFeed === 'function') updatePersonalizedExamFeed();
      if (this.ready && typeof GamificationEngine !== 'undefined') {
        const profile = GamificationEngine.getUserProfile();
        profile.name = this.profile.name; profile.className = this.profile.className;
        GamificationEngine.saveUserProfile(profile);
      }
      if (typeof updateGamifyBar === 'function') updateGamifyBar();
    },
    setMode(mode) {
      this.mode = mode;
      element('studentAccountProfileFields')?.classList.toggle('hidden', mode !== 'register');
      element('studentAccountRegisterButton')?.classList.toggle('hidden', mode !== 'register');
      element('studentAccountLoginButton')?.classList.toggle('hidden', mode === 'register');
      element('studentAccountConfirmGroup')?.classList.toggle('hidden', mode !== 'register');
      element('studentCompleteProfileButton')?.classList.add('hidden');
      this.message(mode === 'register' ? 'Chọn tên đăng nhập riêng và mật khẩu ít nhất 8 ký tự.' : 'Đăng nhập bằng tên và mật khẩu của bạn.');
      if (element('studentAccountPassword')) element('studentAccountPassword').autocomplete = mode === 'register' ? 'new-password' : 'current-password';
    },
    submit() { return this.mode === 'register' ? this.register() : this.login(); },
    readUsername() {
      const username = (element('studentAccountUsername')?.value || '').normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
      if (!/^[\p{L}\p{N}_. -]{3,40}$/u.test(username)) throw new Error('Tên đăng nhập cần 3–40 ký tự: chữ, số, dấu cách, dấu chấm, gạch dưới hoặc gạch ngang.');
      return username;
    },
    async loginAddress(username) {
      // Firebase uses a private deterministic identifier; students never enter an email.
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('kedu-username-v1:' + username));
      const key = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('').slice(0, 40);
      return key + '@students.kedu.invalid';
    },
    readProfile() {
      const name = (element('studentAccountName')?.value || '').trim();
      const className = (element('studentAccountClass')?.value || '').trim();
      if (!name || name.length > 100 || !className || className.length > 40) throw new Error('Nhập họ tên (tối đa 100 ký tự) và lớp (tối đa 40 ký tự).');
      return { name, className };
    },
    async run(action) {
      if (this.busy) return false;
      this.busy = true;
      document.querySelectorAll('[data-account-action]').forEach(button => button.disabled = true);
      try { await this.init(); await action(); return true; }
      catch (error) { this.message(this.errorMessage(error), true); return false; }
      finally {
        this.busy = false;
        for (const id of ['studentAccountPassword', 'studentAccountConfirm', 'studentCurrentPassword', 'studentNewPassword']) if (element(id)) element(id).value = '';
        document.querySelectorAll('[data-account-action]').forEach(button => button.disabled = false);
      }
    },
    async login() {
      return this.run(async () => {
        const email = await this.loginAddress(this.readUsername());
        const password = element('studentAccountPassword')?.value || '';
        if (!password) throw new Error('Nhập tên đăng nhập và mật khẩu.');
        const credential = await this.auth.signInWithEmailAndPassword(email, password);
        await this.restore(credential.user);
      });
    },
    async register() {
      return this.run(async () => {
        const profile = this.readProfile();
        const email = await this.loginAddress(this.readUsername());
        const password = element('studentAccountPassword')?.value || '';
        if (password.length < 8) throw new Error('Nhập mật khẩu ít nhất 8 ký tự.');
        if (password !== element('studentAccountConfirm')?.value) throw new Error('Hai mật khẩu chưa khớp.');
        const credential = await this.auth.createUserWithEmailAndPassword(email, password);
        this.user = credential.user;
        // Nếu ghi hồ sơ lỗi, giữ tài khoản và cho phép hoàn thiện hồ sơ sau khi đăng nhập.
        await this.saveProfile(profile);
      });
    },
    async saveProfile(profile) {
      const user = this.auth.currentUser;
      if (!user) throw new Error('Cần đăng nhập trước khi lưu hồ sơ.');
      const username = this.readUsername();
      if (await this.loginAddress(username) !== user.email) throw new Error('Tên đăng nhập không khớp tài khoản hiện tại. Nhập lại tên bạn đã đăng ký.');
      const data = { uid: user.uid, email: user.email, username, ...profile, role: 'student', createdAt: new Date().toISOString() };
      try { await window.FirebaseEngine.db.collection('students').doc(user.uid).set(data); }
      catch (error) {
        await this.restore(user).catch(() => {});
        element('studentAccountProfileFields')?.classList.remove('hidden');
        element('studentCompleteProfileButton')?.classList.remove('hidden');
        throw error;
      }
      await this.restore(user);
      element('studentCompleteProfileButton')?.classList.add('hidden');
    },
    completeProfile() { return this.run(async () => this.saveProfile(this.readProfile())); },
    resetPassword() {
      this.message('Nếu quên mật khẩu, hãy liên hệ giáo viên. Tài khoản này không khôi phục bằng email.');
      return false;
    },
    changePassword() {
      return this.run(async () => {
        const user = this.auth.currentUser;
        const current = element('studentCurrentPassword')?.value || '';
        const next = element('studentNewPassword')?.value || '';
        if (!user || !current || next.length < 8) throw new Error('Nhập mật khẩu hiện tại và mật khẩu mới ít nhất 8 ký tự.');
        await user.reauthenticateWithCredential(window.firebase.auth.EmailAuthProvider.credential(user.email, current));
        await user.updatePassword(next);
        this.message('Đã đổi mật khẩu.');
      });
    },
    logout() {
      return this.run(async () => {
        const exam = element('studentExamSection');
        if (exam && !exam.classList.contains('hidden')) throw new Error('Hãy nộp bài hoặc thoát bài thi trước khi đăng xuất.');
        await this.auth.signOut();
        await this.restore(null);
        this.setMode('login');
        this.message('Đã đăng xuất.');
      });
    }
  };
  window.StudentAccounts = accounts;
})();
