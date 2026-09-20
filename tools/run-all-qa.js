const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const results = [];
for (const filename of fs.readdirSync(__dirname).filter(name => /^verify_.*\.js$/.test(name)).sort()) {
  // The production V-ACT profile suite runs 2,000 deterministic generations
  // (500 seeds × 4 profiles) and needs a bounded but realistic timeout.
  const result = spawnSync(process.execPath, [path.join(__dirname, filename)], { cwd: root, encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024 });
  const passed = result.status === 0 && !result.error;
  results.push({ test: filename, passed, error: result.error?.message || (passed ? null : (result.stderr || result.stdout).slice(-2500)) });
  console.log(`${passed ? 'PASS' : 'FAIL'} ${filename}`);
  if (!passed) console.error(results.at(-1).error);
}
fs.writeFileSync(path.join(__dirname, 'qa-results.json'), JSON.stringify(results, null, 2));
console.log(`${results.filter(r => r.passed).length}/${results.length} QA suites passed`);
if (results.some(r => !r.passed)) process.exitCode = 1;
