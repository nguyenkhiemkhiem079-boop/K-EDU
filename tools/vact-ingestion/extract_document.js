const fs = require('fs');
const path = require('path');
let PDFParse;
function getPdfParse() {
  if (PDFParse) return PDFParse;
  try { ({ PDFParse } = require('pdf-parse')); return PDFParse; }
  catch (_) { throw new Error('PDF_PARSER_UNAVAILABLE: install pdf-parse before rebuilding the V-ACT bank.'); }
}

const CACHE_DIR = path.resolve('tools', 'vact-ingestion', '.cache');

function getCachePath(fileHash) {
  return path.join(CACHE_DIR, `${fileHash}.json`);
}

async function extractDocument(sourceRecord, options = {}) {
  const force = options.force || false;
  const filePath = path.resolve(sourceRecord.path);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Source file not found: ${filePath}`);
  }

  // Check cache
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }

  const cacheFile = getCachePath(sourceRecord.fileHash);
  if (!force && fs.existsSync(cacheFile)) {
    try {
      const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      return cached;
    } catch (e) {}
  }

  const buffer = fs.readFileSync(filePath);
  const parser = new (getPdfParse())({ data: buffer });
  await parser.load();
  const info = await parser.getInfo();
  const totalPages = info.total || 1;
  const textObj = await parser.getText();
  await parser.destroy();

  const pages = (textObj.pages || []).map((p, idx) => ({
    pageNum: idx + 1,
    text: (p.text || '').replace(/\r\n/g, '\n')
  }));

  const result = {
    sourceId: sourceRecord.sourceId,
    path: sourceRecord.path,
    filename: sourceRecord.filename,
    fileHash: sourceRecord.fileHash,
    totalPages,
    pages,
    fullText: textObj.text || ''
  };

  fs.writeFileSync(cacheFile, JSON.stringify(result), 'utf8');
  return result;
}

module.exports = {
  extractDocument
};
