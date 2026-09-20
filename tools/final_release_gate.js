const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const evidence = [];

function run(name, relativeScript, timeout = 120000) {
  const result = spawnSync(process.execPath, [path.join(root, relativeScript)], {
    cwd: root,
    encoding: 'utf8',
    timeout,
    maxBuffer: 16 * 1024 * 1024
  });
  const passed = result.status === 0 && !result.error;
  evidence.push({
    name,
    script: relativeScript,
    passed,
    exitCode: result.status,
    error: result.error?.message || null,
    outputTail: (result.stdout || result.stderr || '').slice(-2000)
  });
  return passed;
}

run('test integrity manifest', 'tools/verify_test_integrity.js');
run('production invariants', 'tools/production-invariant-audit.js');
run('full QA suite', 'tools/run-all-qa.js', 600000);

let qaResults = [];
const qaResultsPath = path.join(__dirname, 'qa-results.json');
try {
  qaResults = JSON.parse(fs.readFileSync(qaResultsPath, 'utf8'));
} catch (error) {
  evidence.push({ name: 'QA result artifact', passed: false, error: error.message });
}

const failedQa = qaResults.filter(item => !item.passed);
const passedChecks = evidence.filter(item => item.passed).length;
const failedChecks = evidence.filter(item => !item.passed).length + failedQa.length;
const report = {
  releaseReady: failedChecks === 0 && qaResults.length > 0,
  generatedAt: new Date().toISOString(),
  checks: evidence,
  qa: {
    suites: qaResults.length,
    passed: qaResults.filter(item => item.passed).length,
    failed: failedQa.length,
    failures: failedQa
  },
  blockers: failedChecks === 0 ? [] : [
    'A release-gate check or QA suite failed; P0/P1 release is blocked until the root cause is repaired.'
  ],
  summary: `${passedChecks} direct release checks passed; ${failedChecks} blockers detected.`
};

console.log(JSON.stringify(report, null, 2));
if (!report.releaseReady) process.exitCode = 1;
