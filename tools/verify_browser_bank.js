const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

(async () => {
  let requests = 0;
  let failNext = false;
  const context = vm.createContext({ window: {} });
  context.document = {
    createElement: () => ({ remove() {} }),
    head: { appendChild(script) {
      requests++;
      setTimeout(() => {
        if (failNext) { failNext = false; script.onerror(); return; }
        const filename = path.resolve(__dirname, '..', script.src.split('?')[0]);
        vm.runInContext(fs.readFileSync(filename, 'utf8'), context);
        script.onload();
      }, 0);
    } }
  };
  vm.runInContext(fs.readFileSync(path.resolve(__dirname, '../js/documentQuestionBank.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.resolve(__dirname, '../js/question-bank/stats.js'), 'utf8'), context);
  const bank = context.window.DocumentQuestionBank;
  assert.equal(bank.questions.length, 1943);
  assert.equal(bank.getStats().total, require('../js/documentQuestionBank').questions.length);
  await Promise.all([bank.ensureGradeLoaded('10'), bank.ensureGradeLoaded('10')]);
  assert.equal(requests, 1);
  assert.ok(bank.query({ grade: '10' }).length > 4000);
  const total = bank.questions.length;
  await bank.ensureGradeLoaded('10');
  assert.equal(bank.questions.length, total);
  failNext = true;
  await assert.rejects(bank.ensureGradeLoaded('11'));
  await bank.ensureGradeLoaded('11');
  assert.equal(requests, 3);
  await bank.ensureGradeLoaded('TS10');
  await bank.ensureGradeLoaded('THPT');
  await bank.ensureGradeLoaded('all');
  assert.equal(bank.questions.length, require('../js/documentQuestionBank').questions.length);
  console.log('PASS: browser lazy loading, concurrent requests, metadata counts and retry after failure');
})().catch(error => { console.error(error); process.exitCode = 1; });
