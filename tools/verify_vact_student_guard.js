/**
 * K-EDU V-ACT Student Flow & Partial Save Guard Verification Suite
 * Verifies all 10 requirements from Section 26.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

console.log('================================================================');
console.log('🧪 VERIFY V-ACT STUDENT FLOW & PARTIAL SAVE GUARD SUITE');
console.log('================================================================\n');

// 1. Inspect app.js source code for DOM button disabling on readiness false
console.log('👉 [TEST 1 & 2] Mini and Full buttons disabled when readiness false');
const appCode = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');

assert.ok(appCode.includes('btnStart.disabled = !readiness.ready;'), 'initVactMini100UI & initVactFull120UI must set btnStart.disabled based on readiness.ready');
console.log('  => [TEST 1 & 2 PASSED]\n');

// 3 & 4. Handlers must recheck readiness dynamically
console.log('👉 [TEST 3 & 4] Mini and Full handlers recheck readiness after loader ready');
const miniHandlerIdx = appCode.indexOf('async function handleStartMini100Click()');
assert.ok(miniHandlerIdx > 0, 'handleStartMini100Click must exist in app.js');
const miniHandlerCode = appCode.slice(miniHandlerIdx, appCode.indexOf('function initVactFull120UI()'));
assert.ok(miniHandlerCode.includes('getProfileReadiness'), 'handleStartMini100Click must call getProfileReadiness');
assert.ok(miniHandlerCode.includes('!readiness.ready'), 'handleStartMini100Click must abort if !readiness.ready');

const fullHandlerIdx = appCode.indexOf('async function handleStartFull120Click()');
assert.ok(fullHandlerIdx > 0, 'handleStartFull120Click must exist in app.js');
const fullHandlerCode = appCode.slice(fullHandlerIdx, appCode.indexOf('window.initVactMini100UI = initVactMini100UI;'));
assert.ok(fullHandlerCode.includes('getProfileReadiness'), 'handleStartFull120Click must call getProfileReadiness');
assert.ok(fullHandlerCode.includes('!readiness.ready'), 'handleStartFull120Click must abort if !readiness.ready');
console.log('  => [TEST 3 & 4 PASSED]\n');

// 5 & 6. Partial exams (99/100 and 119/120) must be blocked before format and save
console.log('👉 [TEST 5 & 6] Mini 99/100 and Full 119/120 are blocked from saving');
assert.ok(miniHandlerCode.includes('examResult.requestedTotal !== 100'), 'Mini handler must require requestedTotal === 100');
assert.ok(miniHandlerCode.includes('examResult.generatedTotal !== 100'), 'Mini handler must require generatedTotal === 100');
assert.ok(miniHandlerCode.indexOf('saveQuiz') > miniHandlerCode.indexOf('examResult.isComplete'), 'Mini saveQuiz must only execute after isComplete verification');

assert.ok(fullHandlerCode.includes('examResult.requestedTotal !== 120'), 'Full handler must require requestedTotal === 120');
assert.ok(fullHandlerCode.includes('examResult.generatedTotal !== 120'), 'Full handler must require generatedTotal === 120');
assert.ok(fullHandlerCode.indexOf('saveQuiz') > fullHandlerCode.indexOf('examResult.isComplete'), 'Full saveQuiz must only execute after isComplete verification');
console.log('  => [TEST 5 & 6 PASSED]\n');

// 7 & 8. Complete exams (100/100 and 120/120) are saved
console.log('👉 [TEST 7 & 8] Mini 100/100 and Full 120/120 can be formatted and saved');
const VACTExamGenerator = require('../js/vact/generator/examGenerator');
const loader = require('../js/vact/bank/sourceBankLoader');

(async () => {
  await loader.ready();

  const mini100 = VACTExamGenerator.generateMini100();
  assert.strictEqual(mini100.isComplete, true, 'Mini 100 must be complete');
  assert.strictEqual(mini100.generatedTotal, 100, 'Mini 100 must generate 100 questions');
  assert.strictEqual(mini100.requestedTotal, 100, 'Mini 100 requestedTotal must be 100');
  const miniQuiz = VACTExamGenerator.formatExamAsQuiz(mini100);
  assert.ok(miniQuiz && miniQuiz.id, 'Mini 100 formatExamAsQuiz must produce valid quiz record');

  const full120 = VACTExamGenerator.generateFull120();
  assert.strictEqual(full120.isComplete, true, 'Full 120 must be complete');
  assert.strictEqual(full120.generatedTotal, 120, 'Full 120 must generate 120 questions');
  assert.strictEqual(full120.requestedTotal, 120, 'Full 120 requestedTotal must be 120');
  const fullQuiz = VACTExamGenerator.formatExamAsQuiz(full120);
  assert.ok(fullQuiz && fullQuiz.id, 'Full 120 formatExamAsQuiz must produce valid quiz record');
  console.log('  => [TEST 7 & 8 PASSED]\n');

  // 9. generatedTotal/requestedTotal property names only
  console.log('👉 [TEST 9] generatedTotal and requestedTotal property names used consistently');
  assert.strictEqual(typeof mini100.generatedTotal, 'number');
  assert.strictEqual(typeof mini100.requestedTotal, 'number');
  assert.strictEqual(typeof full120.generatedTotal, 'number');
  assert.strictEqual(typeof full120.requestedTotal, 'number');
  console.log('  => [TEST 9 PASSED]\n');

  // 10. No partial exam start
  console.log('👉 [TEST 10] No startExamWithQuizId if incomplete');
  assert.ok(miniHandlerCode.indexOf('startExamWithQuizId') > miniHandlerCode.indexOf('saveQuiz'), 'startExamWithQuizId only after save');
  assert.ok(fullHandlerCode.indexOf('startExamWithQuizId') > fullHandlerCode.indexOf('saveQuiz'), 'startExamWithQuizId only after save');
  console.log('  => [TEST 10 PASSED]\n');

  console.log('🎉 ALL 10 V-ACT STUDENT FLOW TESTS PASSED SUCCESSFULLY!');
})();
