const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const app = read('js/app.js');
const firebase = read('js/firebase.js');
const rendererSource = read('js/examDocumentRenderer.js');
const index = read('index.html');
const firestoreRules = read('firebase/firestore.rules');
const storageRules = read('firebase/storage.rules');
const pdfExtractor = read('js/pdfExtractor.js');

for (const id of ['studentPdfViewerFrame', 'teacherPdfPreviewFrame']) {
  const match = index.match(new RegExp(`<iframe[^>]+id="${id}"[^>]*>`, 'i'));
  assert.ok(match, `${id} exists`);
  assert.match(match[0], /sandbox="allow-same-origin"/i, `${id} is sandboxed`);
  assert.match(match[0], /referrerpolicy="no-referrer"/i, `${id} has a restrictive referrer policy`);
}
assert.match(index, /firebase-auth-compat\.js/);
assert.match(index, /Key được gửi trực tiếp từ trình duyệt/);
assert.match(pdfExtractor, /not a secret-storage[\s\S]+boundary/i);

for (const knownCredential of ["return '130909'", "=== '130909'", "=== 'thaykhiemkedu'"]) {
  assert.equal(app.includes(knownCredential), false, `known credential removed: ${knownCredential}`);
}
assert.match(app, /local-device convenience gate/i);
assert.match(app, /Firebase Auth/);

for (const collection of ['match /quizzes/', 'match /quiz_answer_keys/', 'match /results/', 'match /roster/', 'match /students/']) {
  assert.match(firestoreRules, new RegExp(collection.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}
assert.match(firestoreRules, /match \/quiz_answer_keys[\s\S]*allow read, create, update, delete: if teacher\(\)/);
assert.match(firestoreRules, /match \/\{document=\*\*\}/);
assert.match(storageRules, /match \/quizzes\//);
assert.match(storageRules, /allow write: if teacher\(\)/);

assert.match(firebase, /requireTeacherAuthorization/);
assert.match(firebase, /collection\('quiz_answer_keys'\)/);
assert.match(firebase, /getPrivateAnswerKeys/);
assert.match(firebase, /studentUid/);

const context = { window: {}, Blob, URL, atob, console: { info() {}, warn() {}, error() {} } };
context.window = context;
vm.createContext(context);
vm.runInContext(rendererSource, context);
const renderer = context.ExamDocumentRenderer;
const unsafe = '<div onclick="alert(1)"><script>alert(1)</script><iframe src="javascript:alert(1)"></iframe><img src="javascript:alert(1)"><span class="katex">x</span></div>';
const safe = renderer.sanitizeExamHtml(unsafe);
assert.doesNotMatch(safe, /<script|<iframe|onclick\s*=|javascript:/i);
assert.match(safe, /class="katex"/i);
const student = renderer.sanitizeStudentExamHtml('<div class="section-title">BẢNG ĐÁP ÁN & HƯỚNG DẪN CHẤM THI</div><table class="answer-key-table"><tr><td>A</td></tr></table>');
assert.doesNotMatch(student, /answer-key-table|BẢNG ĐÁP ÁN/i);

(async () => {
  const frame = {
    attrs: {},
    setAttribute(name, value) { this.attrs[name] = value; },
    removeAttribute(name) { delete this.attrs[name]; },
    src: '',
    srcdoc: ''
  };
  const rendered = await renderer.renderIntoFrame(frame, { id: 'security-fixture', examHtml: '<p>safe</p>' }, { audience: 'student' });
  assert.equal(rendered.success, true);
  assert.equal(frame.attrs.sandbox, 'allow-same-origin');
  assert.equal(frame.attrs.referrerpolicy, 'no-referrer');
  console.log('Phase 5 security, auth boundary, rule coverage, HTML sanitization, and iframe sandbox tests passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
