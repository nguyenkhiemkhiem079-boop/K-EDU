const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const html = read('index.html');
const loader = read('js/runtime/moduleLoader.js');
const app = read('js/app.js');
const storage = read('js/storage.js');
const architecture = read('docs/architecture.md');
const checklist = read('docs/release-checklist.md');

for (const optional of ['js/documentQuestionBank.js', 'js/mathGenerator.js', 'js/khtnGenerator.js']) {
  assert.equal(html.includes(`src="${optional}`), false, `optional module is still eagerly loaded: ${optional}`);
  assert.match(loader, new RegExp(optional.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}
assert.match(html, /js\/runtime\/moduleLoader\.js/);
assert.match(loader, /pending\.has/);
assert.match(loader, /script\.onerror/);
assert.match(loader, /getMetrics/);
assert.match(app, /ensureLegacyGenerationModules/);
assert.match(app, /await ensureLegacyGenerationModules\(currentSubject, sourceMode\)/);
assert.match(app, /ensureDocumentBank/);
assert.match(app, /Repair is a teacher maintenance operation/);
assert.match(app, /TeacherAuth\.isLoggedIn\(\)/);
assert.match(storage, /const canReadCloudResults = window\.FirebaseEngine/);
assert.match(storage, /await window\.FirebaseEngine\.isTeacherAuthorized\(\)/);
assert.match(architecture, /Optional generation modules and bank loading/);
assert.match(architecture, /compatibility fixture/);
assert.match(checklist, /does not eagerly load/);
assert.match(checklist, /firebase\/firestore\.rules/);
assert.equal(html.includes('MathExamPlatform/'), false, 'legacy platform must not be a main-page script dependency');

new vm.Script(loader, { filename: 'js/runtime/moduleLoader.js' });
console.log('Phase 6 lazy module boundary, legacy isolation, documentation and loader regression checks passed.');
