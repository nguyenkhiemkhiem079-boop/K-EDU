const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const manifestPath = path.join(__dirname, 'test-integrity-manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const discovered = fs.readdirSync(__dirname)
  .filter(name => /^verify_.*\.js$/.test(name))
  .sort();
const listed = Object.keys(manifest.tests || {}).sort();
const allowedCategories = new Set(manifest.categories || []);

assert.equal(manifest.schemaVersion, 1, 'Unsupported test integrity manifest schema');
assert.deepEqual(listed, discovered, 'Every verify_*.js suite must be classified exactly once');

for (const filename of discovered) {
  const entry = manifest.tests[filename];
  assert.ok(entry && typeof entry === 'object', `${filename} is missing its integrity classification`);
  assert.ok(allowedCategories.has(entry.category), `${filename} uses an unknown integrity category`);
  assert.ok(typeof entry.scope === 'string' && entry.scope.trim(), `${filename} needs a human-readable scope`);
}

const counts = {};
for (const { category } of Object.values(manifest.tests)) counts[category] = (counts[category] || 0) + 1;
console.log(JSON.stringify({
  suites: discovered.length,
  categories: counts,
  staticSuites: Object.entries(manifest.tests).filter(([, entry]) => entry.category === 'static_contract').map(([name]) => name).sort(),
  note: 'Static contract checks are reported separately and are not treated as browser behavior tests.'
}, null, 2));
console.log('Test integrity manifest covers every verification suite exactly once.');
