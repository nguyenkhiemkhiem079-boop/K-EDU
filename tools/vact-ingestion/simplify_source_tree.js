const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const baseDir = path.resolve('TÀI LIỆU', 'DGNL', 'V-ACT');

function getAllFiles(dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getAllFiles(full));
    } else if (entry.name.toLowerCase().endsWith('.pdf')) {
      results.push(full);
    }
  }
  return results;
}

function computeSha256(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function cleanEmptyDirs(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      cleanEmptyDirs(path.join(dir, entry.name));
    }
  }
  const remaining = fs.readdirSync(dir);
  if (remaining.length === 0 && dir !== baseDir) {
    try {
      fs.rmdirSync(dir);
    } catch (e) {}
  }
}

// Target folders
const targetOfficial = path.join(baseDir, '00_OFFICIAL');
const targetFull = path.join(baseDir, '01_FULL_TESTS');
const targetSubjViet = path.join(baseDir, '02_SUBJECT_BANKS', 'VIETNAMESE');
const targetSubjEng = path.join(baseDir, '02_SUBJECT_BANKS', 'ENGLISH');
const targetSubjMath = path.join(baseDir, '02_SUBJECT_BANKS', 'MATH');
const targetSubjLogic = path.join(baseDir, '02_SUBJECT_BANKS', 'LOGIC_DATA');
const targetSubjSci = path.join(baseDir, '02_SUBJECT_BANKS', 'SCIENTIFIC_REASONING');
const targetPending = path.join(baseDir, '90_PENDING');
const targetDuplicates = path.join(baseDir, '99_DUPLICATES');

[targetOfficial, targetFull, targetSubjViet, targetSubjEng, targetSubjMath, targetSubjLogic, targetSubjSci, targetPending, targetDuplicates]
  .forEach(d => fs.mkdirSync(d, { recursive: true }));

const files = getAllFiles(baseDir);
console.log(`Found ${files.length} PDFs to organize...`);

const movedRecords = [];

for (const f of files) {
  const relPath = path.relative(baseDir, f).replace(/\\/g, '/');
  const filename = path.basename(f);
  let targetFolder = null;
  let category = '';
  let sectionHint = null;
  let year = 2025;
  let documentRole = 'question';
  let structureVersion = '2025+';
  let official = false;
  let usable = true;
  let notes = '';

  if (relPath.startsWith('00_OFFICIAL')) {
    targetFolder = targetOfficial;
    category = 'OFFICIAL';
    official = true;
    if (/2024/.test(relPath)) {
      year = 2024;
      structureVersion = 'legacy';
    } else {
      year = 2025;
      structureVersion = '2025+';
    }
    if (/SOLUTION/.test(relPath) || /GIẢI/i.test(filename)) {
      documentRole = 'solution';
    } else if (/RECONSTRUCTED/i.test(relPath) || /30-3-2025/.test(filename)) {
      documentRole = 'question';
      official = false;
      sectionHint = 'math';
      notes = 'Đề tái hiện phần Toán & Xử lý số liệu Đợt 1 2025';
    } else {
      documentRole = 'question';
    }
  } else if (relPath.startsWith('01_FULL_TESTS')) {
    targetFolder = targetFull;
    category = 'FULL_TEST';
    if (/LEGACY/i.test(relPath) || /LEGACY/i.test(filename)) {
      year = 2024;
      structureVersion = 'legacy';
      documentRole = 'combined';
    } else if (/2026/i.test(filename)) {
      year = 2026;
      structureVersion = '2025+';
      documentRole = 'combined';
    } else {
      year = 2025;
      structureVersion = '2025+';
      if (/SOLUTION/i.test(relPath) || /GIẢI/i.test(filename)) {
        documentRole = 'solution';
      } else if (/QUESTION/i.test(relPath)) {
        documentRole = 'question';
      } else {
        documentRole = 'combined';
      }
    }
  } else if (relPath.startsWith('02_SUBJECT_BANKS')) {
    category = 'SUBJECT_BANK';
    if (/VIETNAMESE/i.test(relPath)) {
      targetFolder = targetSubjViet;
      sectionHint = 'vietnamese';
    } else if (/ENGLISH/i.test(relPath)) {
      targetFolder = targetSubjEng;
      sectionHint = 'english';
    } else if (/LOGIC_DATA/i.test(relPath)) {
      targetFolder = targetSubjLogic;
      sectionHint = 'logic_data';
    } else if (/SCIENTIFIC_REASONING/i.test(relPath)) {
      targetFolder = targetSubjSci;
      sectionHint = 'scientific_reasoning';
    } else {
      targetFolder = targetSubjMath;
      sectionHint = 'math';
    }

    if (/SOLUTION/i.test(filename) || /KEY/i.test(filename)) {
      documentRole = 'solution';
    } else if (/QUESTION/i.test(filename) || /PHẦN ĐỀ/i.test(filename) || /ĐỀ\)/i.test(filename)) {
      documentRole = 'question';
    } else if (/BOOK/i.test(filename) || /EBOOK/i.test(filename)) {
      documentRole = 'reference';
    } else {
      documentRole = 'combined';
    }

    if (/legacy/i.test(relPath)) {
      structureVersion = 'legacy';
      year = 2024;
    } else {
      structureVersion = '2025+';
      year = 2025;
    }
  } else if (relPath.startsWith('90_PENDING')) {
    targetFolder = targetPending;
    category = 'PENDING';
    usable = false;
    structureVersion = 'unknown';
    if (/2024/i.test(filename)) year = 2024;
    else year = 2025;
    notes = 'Tài liệu đang chờ phân loại / ngoài phạm vi V-ACT chuẩn';
  } else if (relPath.startsWith('99_DUPLICATE')) {
    targetFolder = targetDuplicates;
    category = 'DUPLICATE';
    usable = false;
    notes = 'Tài liệu trùng lặp (SHA-256 byte identical)';
  } else {
    targetFolder = targetPending;
    category = 'PENDING';
    usable = false;
  }

  const targetPath = path.join(targetFolder, filename);
  if (path.resolve(f) !== path.resolve(targetPath)) {
    fs.renameSync(f, targetPath);
    console.log(`Moved: ${relPath} -> ${path.relative(baseDir, targetPath)}`);
  }

  const hash = computeSha256(targetPath);
  movedRecords.push({
    currentPath: targetPath,
    relPath: path.relative(path.resolve('.'), targetPath).replace(/\\/g, '/'),
    filename,
    category,
    year,
    sectionHint,
    documentRole,
    structureVersion,
    official,
    usableForQuestionExtraction: usable,
    rightsStatus: 'review_required',
    fileHash: hash,
    notes
  });
}

// Clean up old gitkeeps and empty directories
function removeGitkeeps(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      removeGitkeeps(full);
    } else if (e.name === '.gitkeep') {
      fs.unlinkSync(full);
    }
  }
}
removeGitkeeps(baseDir);
cleanEmptyDirs(baseDir);

// Sort records deterministically: category (OFFICIAL, FULL_TEST, SUBJECT_BANK, PENDING, DUPLICATE), then path
const catOrder = { 'OFFICIAL': 1, 'FULL_TEST': 2, 'SUBJECT_BANK': 3, 'PENDING': 4, 'DUPLICATE': 5 };
movedRecords.sort((a, b) => {
  const ordA = catOrder[a.category] || 99;
  const ordB = catOrder[b.category] || 99;
  if (ordA !== ordB) return ordA - ordB;
  return a.relPath.localeCompare(b.relPath);
});

// Assign sequential sourceIds
movedRecords.forEach((r, idx) => {
  r.sourceId = `vact_source_${String(idx + 1).padStart(6, '0')}`;
});

// Pair questions with solutions
for (const r of movedRecords) {
  r.pairedSourceId = null;
  if (r.documentRole === 'question') {
    // Look for solution
    let candidate = null;
    if (r.filename.includes('QUESTION')) {
      const solName = r.filename.replace('QUESTION', 'SOLUTION');
      candidate = movedRecords.find(x => x.filename === solName && x.category === r.category);
    } else if (r.filename.includes('(ĐỀ)')) {
      const solName = r.filename.replace('(ĐỀ)', '(KEY)');
      candidate = movedRecords.find(x => x.filename === solName && x.category === r.category);
    } else if (r.filename.includes('PHẦN ĐỀ')) {
      const solName = r.filename.replace('PHẦN ĐỀ', 'PHẦN KEY');
      candidate = movedRecords.find(x => x.filename === solName && x.category === r.category);
    }
    if (candidate) {
      r.pairedSourceId = candidate.sourceId;
      candidate.pairedSourceId = r.sourceId;
    }
  }
}

// Build final manifest array
const manifest = movedRecords.map(r => ({
  sourceId: r.sourceId,
  path: r.relPath,
  filename: r.filename,
  category: r.category,
  year: r.year,
  sectionHint: r.sectionHint,
  documentRole: r.documentRole,
  pairedSourceId: r.pairedSourceId,
  structureVersion: r.structureVersion,
  official: r.official,
  usableForQuestionExtraction: r.usableForQuestionExtraction,
  rightsStatus: r.rightsStatus,
  fileHash: r.fileHash,
  notes: r.notes || ''
}));

const manifestPath = path.join(baseDir, 'source-manifest.json');
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
console.log(`Generated source-manifest.json with ${manifest.length} records.`);

// Create README.md in TÀI LIỆU/DGNL/V-ACT/
const readmeContent = `# V-ACT Source Bank

Kho tài liệu nguồn gốc phục vụ ngân hàng câu hỏi ĐGNL ĐHQG-HCM (V-ACT) của hệ thống K-EDU.

## Cấu trúc thư mục nguồn (Source-First)

\`\`\`
TÀI LIỆU/DGNL/V-ACT/
├── 00_OFFICIAL/                 # Đề thi chính thức ĐHQG-HCM (2024, 2025)
├── 01_FULL_TESTS/               # Bộ đề thi thử 120 câu hoàn chỉnh & các sách tuyển tập đề
├── 02_SUBJECT_BANKS/            # Ngân hàng câu hỏi theo phân môn
│   ├── VIETNAMESE/              # Chuyên đề & bài tập Tiếng Việt
│   ├── ENGLISH/                 # Chuyên đề & bài tập Tiếng Anh
│   ├── MATH/                    # Chuyên đề & bài tập Toán học
│   ├── LOGIC_DATA/              # Chuyên đề Tư duy logic & Phân tích số liệu
│   └── SCIENTIFIC_REASONING/    # Chuyên đề Khoa học Tự nhiên & Xã hội
├── 90_PENDING/                  # Tài liệu ngoài phạm vi / chờ thẩm định
├── 99_DUPLICATES/               # Các bản sao trùng lặp byte (SHA-256 identical)
├── source-manifest.json         # Danh mục định danh & hash toàn bộ tài liệu nguồn
└── README.md                    # Tài liệu hướng dẫn này
\`\`\`

## Quy tắc biên mục & nguồn gốc (Provenance)
1. Mọi câu hỏi trong ngân hàng V-ACT đều phải truy nguyên được đến tệp PDF nguồn có mã định danh \`sourceId\` trong \`source-manifest.json\`.
2. Không sinh câu hỏi ảo hoặc dùng câu hỏi Toán thông thường thay thế câu hỏi V-ACT.
3. Không tự ý chỉnh sửa nội dung byte của các tệp PDF nguồn.
`;

fs.writeFileSync(path.join(baseDir, 'README.md'), readmeContent, 'utf8');
console.log('Created README.md in V-ACT base directory.');
