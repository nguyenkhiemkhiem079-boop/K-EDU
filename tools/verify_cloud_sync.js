const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const storage=fs.readFileSync(path.resolve(__dirname,'..','js/storage.js'),'utf8'),firebase=fs.readFileSync(path.resolve(__dirname,'..','js/firebase.js'),'utf8'),html=fs.readFileSync(path.resolve(__dirname,'..','index.html'),'utf8');
for(const token of ['quiz_sync_queue','result_sync_queue','enqueueSync','processSyncQueues','cloudSync','window.addEventListener?.(\'online\'']) assert.ok(storage.includes(token),token);
assert.ok(storage.includes("status: offline ? 'pending'")); assert.ok(storage.includes("enqueueSync('quiz', quizToSave.id)")); assert.ok(storage.includes("enqueueSync('result', resultKey)")); assert.ok(storage.includes("enqueueSync('quiz', quizId, 'delete')"));
assert.ok(firebase.includes('15000')); assert.ok(!html.includes('firebase-auth-compat.js')); assert.ok(!storage.includes('StudentAccounts'));
console.log('Cloud sync queue, local-first persistence, timeout, and student-auth absence checks passed.');
