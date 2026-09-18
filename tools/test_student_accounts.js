/**
 * K-EDU Student Accounts Comprehensive QA Test Suite
 * Tests all 15 required QA criteria for Student Accounts:
 * 1. valid registration
 * 2. duplicate username
 * 3. short password
 * 4. password confirmation mismatch
 * 5. missing full name
 * 6. missing class
 * 7. auth provider disabled error mapping
 * 8. network error
 * 9. Firestore permission denied after Auth success
 * 10. complete profile after failed Firestore write
 * 11. login after successful registration
 * 12. wrong password
 * 13. account session restore
 * 14. Enter-key submission
 * 15. double-click protection
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createStudentAccountsEnvironment() {
  const elements = new Map();
  const get = id => {
    if (!elements.has(id)) {
      elements.set(id, {
        id,
        value: '',
        textContent: '',
        readOnly: false,
        disabled: false,
        classList: {
          classes: new Set(),
          add(c) { this.classes.add(c); },
          remove(c) { this.classes.delete(c); },
          toggle(c, force) {
            if (force === undefined) {
              if (this.classes.has(c)) this.classes.delete(c);
              else this.classes.add(c);
            } else if (force) {
              this.classes.add(c);
            } else {
              this.classes.delete(c);
            }
          },
          contains(c) { return this.classes.has(c); }
        }
      });
    }
    return elements.get(id);
  };

  const users = new Map(); // email -> { uid, email, password }
  const firestoreDocs = new Map(); // uid -> data
  let authStateListener = null;
  let currentUser = null;

  // Flags for error simulation
  const flags = {
    authDisabled: false,
    networkError: false,
    firestorePermissionDenied: false
  };

  const mockAuth = {
    currentUser: null,
    languageCode: 'vi',
    onAuthStateChanged(cb) {
      authStateListener = cb;
      return () => { authStateListener = null; };
    },
    async createUserWithEmailAndPassword(email, password) {
      if (flags.networkError) {
        const err = new Error('Network error');
        err.code = 'auth/network-request-failed';
        throw err;
      }
      if (flags.authDisabled) {
        const err = new Error('Operation not allowed');
        err.code = 'auth/operation-not-allowed';
        throw err;
      }
      if (users.has(email)) {
        const err = new Error('Email in use');
        err.code = 'auth/email-already-in-use';
        throw err;
      }
      if (password.length < 8) {
        const err = new Error('Weak password');
        err.code = 'auth/weak-password';
        throw err;
      }
      const user = { uid: 'uid_' + Math.random().toString(36).slice(2, 10), email };
      users.set(email, { ...user, password });
      currentUser = user;
      mockAuth.currentUser = user;
      return { user };
    },
    async signInWithEmailAndPassword(email, password) {
      if (flags.networkError) {
        const err = new Error('Network error');
        err.code = 'auth/network-request-failed';
        throw err;
      }
      const record = users.get(email);
      if (!record || record.password !== password) {
        const err = new Error('Wrong password');
        err.code = 'auth/wrong-password';
        throw err;
      }
      const user = { uid: record.uid, email: record.email };
      currentUser = user;
      mockAuth.currentUser = user;
      return { user };
    },
    async signOut() {
      currentUser = null;
      mockAuth.currentUser = null;
    }
  };

  const mockDb = {
    collection(name) {
      assert.equal(name, 'students');
      return {
        doc(uid) {
          return {
            async get() {
              if (flags.firestorePermissionDenied) {
                const err = new Error('Permission denied');
                err.code = 'permission-denied';
                throw err;
              }
              const data = firestoreDocs.get(uid);
              return {
                exists: !!data,
                data: () => (data ? JSON.parse(JSON.stringify(data)) : null)
              };
            },
            async set(data) {
              if (flags.firestorePermissionDenied) {
                const err = new Error('Permission denied');
                err.code = 'permission-denied';
                throw err;
              }
              firestoreDocs.set(uid, JSON.parse(JSON.stringify(data)));
            }
          };
        }
      };
    }
  };

  const context = {
    console: {
      log: () => {},
      warn: () => {},
      error: () => {}
    },
    window: {},
    document: {
      getElementById: get,
      querySelectorAll: selector => {
        if (selector === '[data-account-action]') {
          return [
            get('studentAccountLoginButton'),
            get('studentAccountRegisterButton'),
            get('studentCompleteProfileButton')
          ];
        }
        return [];
      }
    },
    TextEncoder,
    unescape,
    encodeURIComponent,
    FirebaseEngine: {
      app: { auth: () => mockAuth },
      db: mockDb
    },
    firebase: {
      auth: {
        EmailAuthProvider: {
          credential: (email, pass) => ({ email, pass })
        }
      }
    }
  };
  context.window = context;
  get('studentExamSection').classList.add('hidden');

  const scriptCode = fs.readFileSync(path.resolve(__dirname, '../js/studentAccounts.js'), 'utf8');
  vm.runInContext(scriptCode, vm.createContext(context));

  return {
    accounts: context.window.StudentAccounts,
    get,
    flags,
    users,
    firestoreDocs,
    triggerAuthState: user => { if (authStateListener) authStateListener(user); }
  };
}

async function runAllTests() {
  console.log('--- Starting Student Accounts Comprehensive QA Suite ---');

  // Test 1: Valid registration
  console.log('1. Testing valid registration...');
  {
    const { accounts, get, firestoreDocs } = createStudentAccountsEnvironment();
    get('studentAccountUsername').value = 'nguyen.van.a';
    get('studentAccountPassword').value = 'securePassword123';
    get('studentAccountConfirm').value = 'securePassword123';
    get('studentAccountName').value = 'Nguyễn Văn A';
    get('studentAccountClass').value = '10A1';

    accounts.setMode('register');
    const ok = await accounts.register();
    assert.equal(ok, true, 'Registration should succeed');
    assert.equal(accounts.ready, true, 'StudentAccounts should be ready');
    assert.equal(get('studentJoinName').value, 'Nguyễn Văn A');
    assert.equal(get('studentJoinClass').value, '10A1');
    assert.equal(get('studentAccountStatus').textContent, 'Đã tạo tài khoản thành công.');

    // Verify Firestore doc integrity
    const saved = [...firestoreDocs.values()][0];
    assert.ok(saved);
    assert.equal(saved.username, 'nguyen.van.a');
    assert.equal(saved.name, 'Nguyễn Văn A');
    assert.equal(saved.className, '10A1');
    assert.equal(saved.role, 'student');
    assert.ok(saved.createdAt);
  }

  // Test 2: Duplicate username
  console.log('2. Testing duplicate username handling...');
  {
    const { accounts, get } = createStudentAccountsEnvironment();
    get('studentAccountUsername').value = 'student.test';
    get('studentAccountPassword').value = 'password123';
    get('studentAccountConfirm').value = 'password123';
    get('studentAccountName').value = 'Student One';
    get('studentAccountClass').value = '10A1';
    await accounts.register();

    // Attempt second registration with same username
    get('studentAccountUsername').value = 'student.test';
    get('studentAccountPassword').value = 'password123';
    get('studentAccountConfirm').value = 'password123';
    get('studentAccountName').value = 'Student Two';
    get('studentAccountClass').value = '10A2';
    const ok2 = await accounts.register();
    assert.equal(ok2, false, 'Duplicate username must fail');
    assert.equal(get('studentAccountStatus').textContent, 'Tên đăng nhập này đã tồn tại. Hãy đăng nhập hoặc chọn tên khác.');
  }

  // Test 3: Short password (< 8 chars)
  console.log('3. Testing short password rejection...');
  {
    const { accounts, get } = createStudentAccountsEnvironment();
    get('studentAccountUsername').value = 'student.shortpass';
    get('studentAccountPassword').value = '12345';
    get('studentAccountConfirm').value = '12345';
    get('studentAccountName').value = 'Student Short';
    get('studentAccountClass').value = '10A1';
    const ok = await accounts.register();
    assert.equal(ok, false);
    assert.equal(get('studentAccountStatus').textContent, 'Mật khẩu cần ít nhất 8 ký tự.');
  }

  // Test 4: Password confirmation mismatch
  console.log('4. Testing password confirmation mismatch...');
  {
    const { accounts, get } = createStudentAccountsEnvironment();
    get('studentAccountUsername').value = 'student.mismatch';
    get('studentAccountPassword').value = 'password123';
    get('studentAccountConfirm').value = 'password456';
    get('studentAccountName').value = 'Student Mismatch';
    get('studentAccountClass').value = '10A1';
    const ok = await accounts.register();
    assert.equal(ok, false);
    assert.equal(get('studentAccountStatus').textContent, 'Hai mật khẩu chưa khớp.');
  }

  // Test 5: Missing full name
  console.log('5. Testing missing full name validation...');
  {
    const { accounts, get } = createStudentAccountsEnvironment();
    get('studentAccountUsername').value = 'student.noname';
    get('studentAccountPassword').value = 'password123';
    get('studentAccountConfirm').value = 'password123';
    get('studentAccountName').value = '   ';
    get('studentAccountClass').value = '10A1';
    const ok = await accounts.register();
    assert.equal(ok, false);
    assert.equal(get('studentAccountStatus').textContent, 'Nhập họ tên (tối đa 100 ký tự) và lớp (tối đa 40 ký tự).');
  }

  // Test 6: Missing class
  console.log('6. Testing missing class validation...');
  {
    const { accounts, get } = createStudentAccountsEnvironment();
    get('studentAccountUsername').value = 'student.noclass';
    get('studentAccountPassword').value = 'password123';
    get('studentAccountConfirm').value = 'password123';
    get('studentAccountName').value = 'Valid Name';
    get('studentAccountClass').value = '';
    const ok = await accounts.register();
    assert.equal(ok, false);
    assert.equal(get('studentAccountStatus').textContent, 'Nhập họ tên (tối đa 100 ký tự) và lớp (tối đa 40 ký tự).');
  }

  // Test 7: Auth provider disabled error mapping
  console.log('7. Testing auth provider disabled mapping (auth/operation-not-allowed)...');
  {
    const { accounts, get, flags } = createStudentAccountsEnvironment();
    flags.authDisabled = true;
    get('studentAccountUsername').value = 'student.disabled';
    get('studentAccountPassword').value = 'password123';
    get('studentAccountConfirm').value = 'password123';
    get('studentAccountName').value = 'Disabled Student';
    get('studentAccountClass').value = '10A1';
    const ok = await accounts.register();
    assert.equal(ok, false);
    assert.equal(get('studentAccountStatus').textContent, 'Chức năng tạo tài khoản chưa được bật trên hệ thống.');
  }

  // Test 8: Network error
  console.log('8. Testing network error mapping (auth/network-request-failed)...');
  {
    const { accounts, get, flags } = createStudentAccountsEnvironment();
    flags.networkError = true;
    get('studentAccountUsername').value = 'student.neterror';
    get('studentAccountPassword').value = 'password123';
    get('studentAccountConfirm').value = 'password123';
    get('studentAccountName').value = 'Net Error';
    get('studentAccountClass').value = '10A1';
    const ok = await accounts.register();
    assert.equal(ok, false);
    assert.equal(get('studentAccountStatus').textContent, 'Không kết nối được máy chủ tài khoản. Kiểm tra mạng và thử lại.');
  }

  // Test 9: Firestore permission denied after Auth success
  console.log('9. Testing Firestore permission denied recovery after Auth success...');
  {
    const { accounts, get, flags, users } = createStudentAccountsEnvironment();
    flags.firestorePermissionDenied = true;
    get('studentAccountUsername').value = 'student.authok.firefail';
    get('studentAccountPassword').value = 'password123';
    get('studentAccountConfirm').value = 'password123';
    get('studentAccountName').value = 'Two Stage Student';
    get('studentAccountClass').value = '10A1';

    const ok = await accounts.register();
    assert.equal(ok, false, 'Registration run should return false when profile write fails');
    // Verify Auth user WAS created and NOT deleted
    assert.equal(users.size, 1, 'Firebase Auth user must be preserved');
    // Verify clear guidance message
    assert.equal(get('studentAccountStatus').textContent, 'Tài khoản đã được tạo nhưng hồ sơ chưa lưu được. Hãy giữ nguyên tên đăng nhập và bấm Hoàn thiện hồ sơ.');
    // Verify complete profile button is exposed
    assert.equal(get('studentCompleteProfileButton').classList.contains('hidden'), false);
    assert.equal(accounts.ready, false);
  }

  // Test 10: Complete profile after failed Firestore write
  console.log('10. Testing complete profile recovery after fixing write error...');
  {
    const { accounts, get, flags } = createStudentAccountsEnvironment();
    flags.firestorePermissionDenied = true;
    get('studentAccountUsername').value = 'student.recovery';
    get('studentAccountPassword').value = 'password123';
    get('studentAccountConfirm').value = 'password123';
    get('studentAccountName').value = 'Recovery Student';
    get('studentAccountClass').value = '10A1';
    await accounts.register();

    // Now restore permissions and complete profile
    flags.firestorePermissionDenied = false;
    const compOk = await accounts.completeProfile();
    assert.equal(compOk, true, 'completeProfile should succeed');
    assert.equal(accounts.ready, true);
    assert.equal(get('studentCompleteProfileButton').classList.contains('hidden'), true);
  }

  // Test 11: Login after successful registration
  console.log('11. Testing login after registration...');
  {
    const { accounts, get } = createStudentAccountsEnvironment();
    get('studentAccountUsername').value = 'student.login';
    get('studentAccountPassword').value = 'password123';
    get('studentAccountConfirm').value = 'password123';
    get('studentAccountName').value = 'Login Student';
    get('studentAccountClass').value = '11B2';
    await accounts.register();
    await accounts.logout();
    assert.equal(accounts.ready, false);

    // Login
    accounts.setMode('login');
    get('studentAccountUsername').value = 'student.login';
    get('studentAccountPassword').value = 'password123';
    const ok = await accounts.login();
    assert.equal(ok, true);
    assert.equal(accounts.ready, true);
    assert.equal(get('studentJoinName').value, 'Login Student');
    assert.equal(get('studentJoinClass').value, '11B2');
  }

  // Test 12: Wrong password
  console.log('12. Testing wrong password on login...');
  {
    const { accounts, get } = createStudentAccountsEnvironment();
    get('studentAccountUsername').value = 'student.wrongpass';
    get('studentAccountPassword').value = 'password123';
    get('studentAccountConfirm').value = 'password123';
    get('studentAccountName').value = 'Wrong Pass';
    get('studentAccountClass').value = '10A1';
    await accounts.register();
    await accounts.logout();

    get('studentAccountUsername').value = 'student.wrongpass';
    get('studentAccountPassword').value = 'wrongPass123';
    const ok = await accounts.login();
    assert.equal(ok, false);
    assert.equal(get('studentAccountStatus').textContent, 'Tên đăng nhập hoặc mật khẩu không đúng.');
  }

  // Test 13: Account session restore
  console.log('13. Testing session restore via onAuthStateChanged...');
  {
    const { accounts, get, triggerAuthState } = createStudentAccountsEnvironment();
    get('studentAccountUsername').value = 'student.restore';
    get('studentAccountPassword').value = 'password123';
    get('studentAccountConfirm').value = 'password123';
    get('studentAccountName').value = 'Restore Student';
    get('studentAccountClass').value = '10A3';
    await accounts.register();
    const registeredUser = accounts.user;

    // Simulate page reload: re-init environment with existing data
    accounts.profile = null;
    accounts.user = null;
    triggerAuthState(registeredUser);

    // Wait microtask for restore
    await new Promise(resolve => setTimeout(resolve, 50));
    assert.equal(accounts.ready, true);
    assert.equal(get('studentJoinName').value, 'Restore Student');
  }

  // Test 14: Enter-key submission triggers submit() cleanly
  console.log('14. Testing Enter-key submission...');
  {
    const { accounts, get } = createStudentAccountsEnvironment();
    get('studentAccountUsername').value = 'student.enterkey';
    get('studentAccountPassword').value = 'password123';
    get('studentAccountConfirm').value = 'password123';
    get('studentAccountName').value = 'Enter Key';
    get('studentAccountClass').value = '12A1';

    accounts.setMode('register');
    // submit() is what onsubmit calls
    const ok = await accounts.submit();
    assert.equal(ok, true);
    assert.equal(accounts.ready, true);
  }

  // Test 15: Double-click protection (busy state)
  console.log('15. Testing double-click protection...');
  {
    const { accounts, get } = createStudentAccountsEnvironment();
    get('studentAccountUsername').value = 'student.doubleclick';
    get('studentAccountPassword').value = 'password123';
    get('studentAccountConfirm').value = 'password123';
    get('studentAccountName').value = 'Double Click';
    get('studentAccountClass').value = '10A1';

    accounts.setMode('register');
    // Launch first request
    const p1 = accounts.register();
    // Immediate second click while p1 is running
    const p2 = accounts.register();

    const [res1, res2] = await Promise.all([p1, p2]);
    assert.equal(res1, true, 'First click should succeed');
    assert.equal(res2, false, 'Second concurrent click must be rejected by busy lock');
    assert.equal(accounts.busy, false, 'Busy flag must be reset after completion');
  }

  console.log('--- ALL 15/15 STUDENT ACCOUNT QA TESTS PASSED SUCCESSFULLY ---');
}

runAllTests().catch(err => {
  console.error('Test failure:', err);
  process.exit(1);
});
