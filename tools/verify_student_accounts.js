const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const read = filename => fs.readFileSync(path.join(__dirname, '..', filename), 'utf8');
function node(hidden = false) {
  const classes = new Set(hidden ? ['hidden'] : []);
  return { value: '', textContent: '', disabled: false, readOnly: false,
    classList: { add: x => classes.add(x), remove: x => classes.delete(x), contains: x => classes.has(x),
      toggle(x, yes) { if (yes === undefined) yes = !classes.has(x); yes ? classes.add(x) : classes.delete(x); } },
    setAttribute() {} };
}
(async () => {
  const nodes = new Map();
  const get = id => { if (!nodes.has(id)) nodes.set(id, node(id === 'studentExamSection')); return nodes.get(id); };
  const profiles = new Map();
  let failWrite = false;
  const calls = [];
  const user = { uid: 'student-1', email: 'student@example.com',
    reauthenticateWithCredential: async value => calls.push(['reauth', value]),
    updatePassword: async value => calls.push(['change', value]) };
  const auth = { currentUser: null,
    onAuthStateChanged() { return () => {}; },
    async createUserWithEmailAndPassword() { calls.push(['register']); this.currentUser = user; return { user }; },
    async signInWithEmailAndPassword() { calls.push(['login']); this.currentUser = user; return { user }; },
    async sendPasswordResetEmail(email) { calls.push(['reset', email]); },
    async signOut() { this.currentUser = null; calls.push(['logout']); } };
  const authFunction = () => auth;
  authFunction.EmailAuthProvider = { credential: (email, password) => ({ email, password }) };
  const firebase = { app: { auth: () => auth }, db: { collection(name) {
    assert.equal(name, 'students');
    return { doc(uid) { return { async get() { return { exists: profiles.has(uid), data: () => profiles.get(uid) }; },
      async set(value) { if (failWrite) throw { code: 'permission-denied' }; profiles.set(uid, value); } }; } };
  } } };
  const ctx = vm.createContext({ crypto: require('node:crypto').webcrypto, TextEncoder, window: { FirebaseEngine: firebase, firebase: { auth: authFunction } },
    document: { getElementById: get, querySelectorAll: () => [], addEventListener() {} } });
  vm.runInContext(read('js/studentAccounts.js'), ctx);
  const accounts = ctx.window.StudentAccounts;
  get('studentAccountUsername').value = 'Nguyễn Văn An';
  const username = accounts.readUsername();
  const address = await accounts.loginAddress(username);
  user.email = address;
  assert.match(address, /^[a-f0-9]{40}@students\.kedu\.invalid$/);
  get('studentAccountUsername').value = '  NGUYỄN   VĂN AN  ';
  assert.equal(await accounts.loginAddress(accounts.readUsername()), address);
  assert.notEqual(await accounts.loginAddress('nguyen van an'), address);
  get('studentAccountName').value = 'An'; get('studentAccountClass').value = '10A1';
  get('studentAccountPassword').value = 'password123'; get('studentAccountConfirm').value = 'different';
  assert.equal(await accounts.register(), false);
  assert.equal(calls.length, 0);
  get('studentAccountPassword').value = get('studentAccountConfirm').value = 'password123';
  assert.equal(await accounts.register(), true);
  assert.equal(accounts.ready, true);
  assert.equal(profiles.get(user.uid).role, 'student');
  assert.equal(JSON.stringify(profiles.get(user.uid)).includes('password'), false);
  assert.equal(get('studentJoinName').value, 'An');
  assert.equal(get('studentJoinName').readOnly, true);
  assert.equal(get('studentAccountPassword').value, '');
  get('studentCurrentPassword').value = 'password123'; get('studentNewPassword').value = 'newpassword123';
  assert.equal(await accounts.changePassword(), true);
  assert.equal(calls.at(-2)[0], 'reauth'); assert.equal(calls.at(-1)[0], 'change');
  assert.equal(accounts.resetPassword(), false);
  assert.equal(calls.some(call => call[0] === 'reset'), false);
  assert.equal(await accounts.logout(), true); assert.equal(accounts.ready, false);
  assert.equal(get('studentJoinName').value, '');
  get('studentAccountPassword').value = 'password123';
  assert.equal(await accounts.login(), true); assert.equal(accounts.ready, true);
  profiles.clear(); failWrite = true;
  get('studentAccountPassword').value = get('studentAccountConfirm').value = 'password123';
  assert.equal(await accounts.register(), false);
  assert.equal(accounts.ready, false);
  assert.equal(get('studentCompleteProfileButton').classList.contains('hidden'), false);
  failWrite = false;
  assert.equal(await accounts.completeProfile(), true); assert.equal(accounts.ready, true);

  vm.runInContext(read('js/teacherWorkspace.js'), ctx);
  ctx.window.selectTeacherCreateSource('bank');
  assert.equal(get('singleExamCreatorSection').classList.contains('hidden'), true);
  assert.equal(get('teacherBankGeneratorCard').classList.contains('hidden'), false);
  ctx.window.selectTeacherCreateSource('upload');
  assert.equal(get('singleExamCreatorSection').classList.contains('hidden'), false);
  assert.equal(get('teacherBankGeneratorCard').classList.contains('hidden'), true);
  const stored = new Map();
  const storageContext = vm.createContext({ console, window: {}, localStorage: { getItem: () => null }, BroadcastChannel: undefined });
  vm.runInContext(read('js/storage.js'), storageContext);
  const storage = storageContext.window.StorageEngine;
  storage.set = async (key, value) => { stored.set(key, value); return true; };
  storage.get = async key => stored.get(key);
  storage.getResultsByQuiz = async () => [...stored.values()].filter(value => value && typeof value === 'object');
  const first = await storage.saveResult({ quizId: 'QUIZ', name: 'An', className: '10A1', studentUid: 'one' });
  const second = await storage.saveResult({ quizId: 'QUIZ', name: 'An', className: '10A1', studentUid: 'two' });
  assert.notEqual(first, second);
  assert.equal(await storage.hasSubmitted('QUIZ', '10A1', 'An', 'one'), true);
  assert.equal(await storage.hasSubmitted('QUIZ', '10A1', 'An', 'three'), false);
  console.log('PASS: account validation, UID profiles, password reset/reauthentication, profile recovery and teacher source selection');
})().catch(error => { console.error(error); process.exitCode = 1; });
