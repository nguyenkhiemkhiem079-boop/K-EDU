(function () {
  const element = id => document.getElementById(id);

  // Deterministic Pure-JS SHA-256 fallback (produces bit-identical output to crypto.subtle)
  function fallbackSha256(ascii) {
    function rightRotate(value, amount) {
      return (value >>> amount) | (value << (32 - amount));
    }
    const mathPow = Math.pow;
    const maxWord = mathPow(2, 32);
    let lengthProperty = 'length';
    let i, j;
    let result = '';
    const words = [];
    const asciiBitLength = ascii[lengthProperty] * 8;
    let hash = [];
    const k = [];
    let primeCounter = 0;
    const isComposite = {};
    for (let candidate = 2; primeCounter < 64; candidate++) {
      if (!isComposite[candidate]) {
        for (i = 0; i < 313; i += candidate) {
          isComposite[i] = candidate;
        }
        hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
        k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      }
    }
    hash = hash.slice(0, 8);
    ascii += '\x80';
    while ((ascii[lengthProperty] % 64) !== 56) ascii += '\x00';
    for (i = 0; i < ascii[lengthProperty]; i++) {
      j = ascii.charCodeAt(i);
      words[i >> 2] |= j << ((3 - i % 4) * 8);
    }
    words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0;
    words[words[lengthProperty]] = asciiBitLength | 0;
    for (j = 0; j < words[lengthProperty];) {
      const w = words.slice(j, j += 16);
      const oldHash = hash;
      hash = hash.slice(0, 8);
      for (i = 0; i < 64; i++) {
        const w15 = w[i - 15], w2 = w[i - 2];
        const a = hash[0], e = hash[4];
        const temp1 = (hash[7]
          + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
          + ((e & hash[5]) ^ ((~e) & hash[6]))
          + k[i]
          + (w[i] = (i < 16) ? w[i] : (
              w[i - 16]
              + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
              + w[i - 7]
              + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
            ) | 0
          )) | 0;
        const temp2 = ((rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
          + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]))) | 0;
        hash = [(temp1 + temp2) | 0].concat(hash);
        hash[4] = (hash[4] + temp1) | 0;
      }
      for (i = 0; i < 8; i++) {
        hash[i] = (hash[i] + oldHash[i]) | 0;
      }
    }
    for (i = 0; i < 8; i++) {
      for (j = 3; j + 1; j--) {
        const b = (hash[i] >> (j * 8)) & 255;
        result += ((b < 16) ? '0' : '') + b.toString(16);
      }
    }
    return result;
  }

  const accounts = {
    auth: null,
    user: null,
    profile: null,
    busy: false,
    unsubscribe: null,
    mode: 'login',

    get uid() { return this.user?.uid || null; },
    get ready() {
      return !!this.user &&
             !!this.profile &&
             this.profile.uid === this.user.uid &&
             !!this.profile.name &&
             !!this.profile.className &&
             !!this.profile.username;
    },

    message(text, error = false) {
      const target = element('studentAccountStatus');
      if (target) {
        target.textContent = text;
        target.classList.toggle('account-error', error);
      }
    },

    errorMessage(error) {
      if (!error) return 'Không thực hiện được thao tác tài khoản.';
      const code = error.code || '';
      const messages = {
        'auth/operation-not-allowed': 'Chức năng tạo tài khoản chưa được bật trên hệ thống.',
        'auth/email-already-in-use': 'Tên đăng nhập này đã tồn tại. Hãy đăng nhập hoặc chọn tên khác.',
        'auth/invalid-email': 'Tên đăng nhập không hợp lệ.',
        'auth/invalid-credential': 'Tên đăng nhập hoặc mật khẩu không đúng.',
        'auth/wrong-password': 'Tên đăng nhập hoặc mật khẩu không đúng.',
        'auth/user-not-found': 'Tên đăng nhập hoặc mật khẩu không đúng.',
        'auth/weak-password': 'Mật khẩu cần ít nhất 8 ký tự.',
        'auth/network-request-failed': 'Không kết nối được máy chủ tài khoản. Kiểm tra mạng và thử lại.',
        'auth/too-many-requests': 'Có quá nhiều lần thử. Vui lòng đợi rồi thử lại.',
        'permission-denied': 'Tài khoản đã được xác thực nhưng hệ thống chưa có quyền lưu hồ sơ học sinh.',
        'FIREBASE_APP_NOT_READY': 'Dịch vụ tài khoản chưa sẵn sàng. Vui lòng tải lại trang.',
        'AUTH_SDK_NOT_READY': 'Dịch vụ tài khoản chưa sẵn sàng. Vui lòng tải lại trang.',
        'FIRESTORE_NOT_READY': 'Dịch vụ tài khoản chưa sẵn sàng. Vui lòng tải lại trang.'
      };
      return messages[code] || error.message || 'Không thực hiện được thao tác tài khoản.';
    },

    async init() {
      if (this.auth) return;

      if (!window.FirebaseEngine?.app) {
        const err = new Error('Dịch vụ tài khoản chưa sẵn sàng. Vui lòng tải lại trang.');
        err.code = 'FIREBASE_APP_NOT_READY';
        console.error('[StudentAccounts]', err.code, err);
        throw err;
      }
      if (!window.firebase?.auth) {
        const err = new Error('Dịch vụ tài khoản chưa sẵn sàng. Vui lòng tải lại trang.');
        err.code = 'AUTH_SDK_NOT_READY';
        console.error('[StudentAccounts]', err.code, err);
        throw err;
      }
      if (!window.FirebaseEngine?.db) {
        const err = new Error('Dịch vụ tài khoản chưa sẵn sàng. Vui lòng tải lại trang.');
        err.code = 'FIRESTORE_NOT_READY';
        console.error('[StudentAccounts]', err.code, err);
        throw err;
      }

      this.auth = window.FirebaseEngine.app.auth();
      this.auth.languageCode = 'vi';
      this.unsubscribe = this.auth.onAuthStateChanged(user => {
        if (!this.busy) {
          this.restore(user).catch(error => {
            console.error('[StudentAccounts]', error.code || 'restore-error', error);
            this.profile = null;
            this.render();
            this.message(this.errorMessage(error), true);
          });
        }
      });
    },

    async restore(user) {
      this.user = user;
      this.profile = null;
      this.render();
      if (!user) return;

      const snapshot = await window.FirebaseEngine.db.collection('students').doc(user.uid).get();
      if (this.auth?.currentUser?.uid !== user.uid) return;

      if (!snapshot.exists) {
        this.message('Tài khoản đã tồn tại nhưng chưa có hồ sơ. Nhập họ tên và lớp, rồi bấm Hoàn thiện hồ sơ.', true);
        element('studentAccountProfileFields')?.classList.remove('hidden');
        element('studentCompleteProfileButton')?.classList.remove('hidden');
        return;
      }

      const profile = snapshot.data();
      if (!profile || profile.uid !== user.uid || !profile.name || !profile.className || !profile.username) {
        throw new Error('Hồ sơ tài khoản không hợp lệ.');
      }

      this.profile = profile;
      this.render();
      this.message('Đã đăng nhập. Bạn có thể chọn đề để làm bài.');
    },

    render() {
      const isReady = this.ready;
      element('studentAccountCredentials')?.classList.toggle('hidden', isReady);
      element('studentAccountSignedIn')?.classList.toggle('hidden', !isReady);

      if (element('studentAccountIdentity')) {
        element('studentAccountIdentity').textContent = isReady
          ? `${this.profile.name} · Lớp ${this.profile.className}`
          : '';
      }

      for (const [id, value] of [['studentJoinName', this.profile?.name], ['studentJoinClass', this.profile?.className]]) {
        const input = element(id);
        if (input) {
          input.value = value || '';
          input.readOnly = true;
        }
      }

      if (typeof updatePersonalizedExamFeed === 'function') updatePersonalizedExamFeed();
      if (isReady && typeof GamificationEngine !== 'undefined') {
        const profile = GamificationEngine.getUserProfile();
        profile.name = this.profile.name;
        profile.className = this.profile.className;
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
      if (element('studentAccountPassword')) {
        element('studentAccountPassword').autocomplete = mode === 'register' ? 'new-password' : 'current-password';
      }
    },

    submit() {
      if (this.busy) return false;
      return this.mode === 'register' ? this.register() : this.login();
    },

    readUsername() {
      const raw = element('studentAccountUsername')?.value || '';
      const username = raw.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
      if (!/^[\p{L}\p{N}_. -]{3,40}$/u.test(username)) {
        throw new Error('Tên đăng nhập cần 3–40 ký tự: chữ, số, dấu cách, dấu chấm, gạch dưới hoặc gạch ngang.');
      }
      return username;
    },

    async loginAddress(username) {
      // Deterministic SHA-256 mapping: backward compatible with existing student accounts
      const prefix = 'kedu-username-v1:' + username;
      let hexDigest = '';

      if (typeof window !== 'undefined' && window.crypto?.subtle?.digest) {
        try {
          const encoded = new TextEncoder().encode(prefix);
          const buffer = await window.crypto.subtle.digest('SHA-256', encoded);
          hexDigest = Array.from(new Uint8Array(buffer), byte => byte.toString(16).padStart(2, '0')).join('');
        } catch (_) {
          hexDigest = '';
        }
      }

      if (!hexDigest) {
        // Pure-JS deterministic SHA-256 fallback
        const utf8 = unescape(encodeURIComponent(prefix));
        hexDigest = fallbackSha256(utf8);
      }

      const key = hexDigest.slice(0, 40);
      return key + '@students.kedu.invalid';
    },

    readProfile() {
      const name = (element('studentAccountName')?.value || '').trim();
      const className = (element('studentAccountClass')?.value || '').trim();
      if (!name || name.length > 100 || !className || className.length > 40) {
        throw new Error('Nhập họ tên (tối đa 100 ký tự) và lớp (tối đa 40 ký tự).');
      }
      return { name, className };
    },

    async run(action, busyText) {
      if (this.busy) return false;
      this.busy = true;
      const buttons = document.querySelectorAll('[data-account-action]');
      buttons.forEach(button => { button.disabled = true; });
      if (busyText) this.message(busyText);

      try {
        await this.init();
        await action();
        return true;
      } catch (error) {
        console.error('[StudentAccounts]', error.code || 'action-error', error);
        if (error._customMessageHandled) {
          // Custom message already displayed by action (e.g. two-stage profile failure)
        } else {
          this.message(this.errorMessage(error), true);
        }
        return false;
      } finally {
        this.busy = false;
        for (const id of ['studentAccountPassword', 'studentAccountConfirm', 'studentCurrentPassword', 'studentNewPassword']) {
          if (element(id)) element(id).value = '';
        }
        buttons.forEach(button => { button.disabled = false; });
      }
    },

    async login() {
      return this.run(async () => {
        const email = await this.loginAddress(this.readUsername());
        const password = element('studentAccountPassword')?.value || '';
        if (!password) throw new Error('Nhập tên đăng nhập và mật khẩu.');
        const credential = await this.auth.signInWithEmailAndPassword(email, password);
        await this.restore(credential.user);
        this.message('Đăng nhập thành công.');
      }, 'Đang đăng nhập...');
    },

    async register() {
      return this.run(async () => {
        const profile = this.readProfile();
        const username = this.readUsername();
        const email = await this.loginAddress(username);
        const password = element('studentAccountPassword')?.value || '';
        if (password.length < 8) {
          const err = new Error('Mật khẩu cần ít nhất 8 ký tự.');
          err.code = 'auth/weak-password';
          throw err;
        }
        if (password !== element('studentAccountConfirm')?.value) {
          throw new Error('Hai mật khẩu chưa khớp.');
        }

        // STAGE 1: Firebase Auth user creation
        let credential;
        try {
          credential = await this.auth.createUserWithEmailAndPassword(email, password);
          this.user = credential.user;
          this.profile = null;
        } catch (authError) {
          console.error('[StudentAccounts]', authError.code || 'auth-error', authError);
          throw authError; // Displays auth-specific message via run()
        }

        // STAGE 2: Firestore profile creation
        try {
          await this.saveProfile(profile, credential.user);
          this.message('Đã tạo tài khoản thành công.');
        } catch (profileError) {
          console.error('[StudentAccounts]', profileError.code || 'profile-error', profileError);
          // Preserve account, do NOT delete user or pretend account doesn't exist
          element('studentAccountProfileFields')?.classList.remove('hidden');
          element('studentAccountRegisterButton')?.classList.add('hidden');
          element('studentAccountLoginButton')?.classList.add('hidden');
          element('studentCompleteProfileButton')?.classList.remove('hidden');
          this.message('Tài khoản đã được tạo nhưng hồ sơ chưa lưu được. Hãy giữ nguyên tên đăng nhập và bấm Hoàn thiện hồ sơ.', true);
          profileError._customMessageHandled = true;
          throw profileError;
        }
      }, 'Đang tạo tài khoản...');
    },

    async saveProfile(profile, userOverride) {
      const user = userOverride || this.auth?.currentUser || this.user;
      if (!user) throw new Error('Cần đăng nhập trước khi lưu hồ sơ.');

      const username = this.readUsername();
      if (await this.loginAddress(username) !== user.email) {
        throw new Error('Tên đăng nhập không khớp tài khoản hiện tại. Nhập lại tên bạn đã đăng ký.');
      }

      // Preserve existing createdAt if profile document already exists
      let createdAt = new Date().toISOString();
      let hasExisting = false;
      try {
        const existingSnap = await window.FirebaseEngine.db.collection('students').doc(user.uid).get();
        if (existingSnap.exists) {
          hasExisting = true;
          const ex = existingSnap.data();
          if (ex?.createdAt) {
            createdAt = ex.createdAt;
          }
        }
      } catch (_) {}

      const data = {
        uid: user.uid,
        email: user.email,
        username,
        ...profile,
        role: 'student',
        createdAt
      };
      if (hasExisting) {
        data.updatedAt = new Date().toISOString();
      }

      // Write to Firestore
      try {
        await window.FirebaseEngine.db.collection('students').doc(user.uid).set(data);
      } catch (writeErr) {
        console.error('[StudentAccounts]', writeErr.code || 'firestore-write-error', writeErr);
        element('studentAccountProfileFields')?.classList.remove('hidden');
        element('studentCompleteProfileButton')?.classList.remove('hidden');
        throw writeErr;
      }

      // Read back verification (A5)
      const verifySnap = await window.FirebaseEngine.db.collection('students').doc(user.uid).get();
      if (!verifySnap.exists) {
        throw new Error('Không đọc lại được hồ sơ sau khi lưu.');
      }
      const verified = verifySnap.data();
      if (verified.uid !== user.uid || !verified.name || !verified.className || !verified.username) {
        throw new Error('Hồ sơ học sinh lưu chưa đầy đủ các trường bắt buộc.');
      }

      this.user = user;
      this.profile = verified;
      this.render();
      element('studentCompleteProfileButton')?.classList.add('hidden');
    },

    completeProfile() {
      return this.run(async () => {
        await this.saveProfile(this.readProfile());
        this.message('Đã hoàn thiện hồ sơ học sinh.');
      }, 'Đang hoàn thiện hồ sơ...');
    },

    resetPassword() {
      this.message('Nếu quên mật khẩu, hãy liên hệ giáo viên. Tài khoản này không khôi phục bằng email.');
      return false;
    },

    changePassword() {
      return this.run(async () => {
        const user = this.auth?.currentUser;
        const current = element('studentCurrentPassword')?.value || '';
        const next = element('studentNewPassword')?.value || '';
        if (!user || !current || next.length < 8) {
          throw new Error('Nhập mật khẩu hiện tại và mật khẩu mới ít nhất 8 ký tự.');
        }
        await user.reauthenticateWithCredential(window.firebase.auth.EmailAuthProvider.credential(user.email, current));
        await user.updatePassword(next);
        this.message('Đã đổi mật khẩu.');
      }, 'Đang đổi mật khẩu...');
    },

    logout() {
      return this.run(async () => {
        const exam = element('studentExamSection');
        if (exam && !exam.classList.contains('hidden')) {
          throw new Error('Hãy nộp bài hoặc thoát bài thi trước khi đăng xuất.');
        }
        await this.auth.signOut();
        await this.restore(null);
        this.setMode('login');
        this.message('Đã đăng xuất.');
      }, 'Đang đăng xuất...');
    }
  };

  window.StudentAccounts = accounts;
})();
