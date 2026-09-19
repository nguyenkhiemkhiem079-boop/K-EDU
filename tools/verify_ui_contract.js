const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),css=fs.readFileSync(path.join(root,'css/style.css'),'utf8');
for(const id of ['studentJoinName','studentJoinClass','studentProfileSubmitButton','studentPdfViewerFrame','teacherPdfPreviewFrame']) assert.ok(html.includes(`id="${id}"`),`${id} missing`);
assert.ok(html.includes('HỒ SƠ HỌC SINH')); assert.ok(html.includes('student-profile-grid')); assert.ok(!css.includes('.student-account-card')); assert.ok(!css.includes('.account-password-settings')); assert.ok(css.includes('grid-template-columns:minmax(0,7fr) minmax(280px,3fr)')); assert.ok(css.includes('@media (max-width:768px)'));
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]); assert.equal(ids.length,new Set(ids).size,'duplicate IDs');
console.log('UI profile, exam workspace, and responsive structure contract passed.');
