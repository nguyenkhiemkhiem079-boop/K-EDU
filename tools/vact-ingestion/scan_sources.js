const fs = require('fs');
const path = require('path');

function getManifestPath() {
  return path.resolve('TÀI LIỆU', 'DGNL', 'V-ACT', 'source-manifest.json');
}

function loadManifest() {
  const p = getManifestPath();
  if (!fs.existsSync(p)) {
    throw new Error(`source-manifest.json not found at ${p}`);
  }
  const manifest = JSON.parse(fs.readFileSync(p, 'utf8'));
  const migration = {};
  for (const source of manifest) {
    if (!source.fileHash) continue;
    const stable = `vact_src_${String(source.fileHash).replace(/[^a-f0-9]/gi, '').slice(0, 16).toLowerCase()}`;
    if (source.sourceId && source.sourceId !== stable) migration[source.sourceId] = stable;
    source.sourceId = stable;
  }
  const out = path.resolve('data', 'vact', 'id-migration.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(migration, null, 2) + '\n', 'utf8');
  return manifest;
}

function getIngestableSources() {
  const manifest = loadManifest();
  // Filter sources usable for question extraction
  return manifest.filter(s => s.usableForQuestionExtraction === true && s.category !== 'DUPLICATE' && s.category !== 'PENDING');
}

function getSourceById(sourceId) {
  const manifest = loadManifest();
  return manifest.find(s => s.sourceId === sourceId) || null;
}

function getPairedSource(source) {
  if (!source || !source.pairedSourceId) return null;
  return getSourceById(source.pairedSourceId);
}

module.exports = {
  loadManifest,
  getIngestableSources,
  getSourceById,
  getPairedSource
};
