const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const files = [];
for (const folder of ['js', 'tools', 'MathExamPlatform/js']) {
  const visit = directory => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === 'node_modules') continue;
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (file.endsWith('.js')) files.push(file);
    }
  };
  visit(path.join(root, folder));
}
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8', timeout: 10000 });
  assert.equal(result.status, 0, result.stderr);
}
for (const filename of ['index.html', 'MathExamPlatform/index.html']) {
  const file = path.join(root, filename);
  const html = fs.readFileSync(file, 'utf8');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, new Set(ids).size, 'Duplicate HTML IDs: ' + filename);
  for (const match of html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"/g)) {
    const url = match[1];
    if (/^(https?:|\/\/|data:)/.test(url)) continue;
    assert.ok(fs.existsSync(path.resolve(path.dirname(file), url.split('?')[0])), 'Missing local asset: ' + url);
  }
}
console.log(`PASS: syntax of ${files.length} JavaScript files, local assets and unique HTML IDs`);
