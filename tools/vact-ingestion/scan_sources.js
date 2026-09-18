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
  return JSON.parse(fs.readFileSync(p, 'utf8'));
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
