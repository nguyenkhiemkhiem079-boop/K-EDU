/**
 * KhiemEdu Document Question Bank Extractor
 * Pipeline trích xuất câu hỏi THẬT từ 147 file PDF trong TÀI LIỆU
 *
 * Chế độ chạy:
 * 1. Chế độ Review (mặc định):
 *    node tools/extract-questions.js --dir "TÀI LIỆU"
 *    -> Xuất toàn bộ câu hỏi vào tools/extracted-review.json (gồm cả high & low confidence)
 *    -> Ghi log các file scan bỏ qua vào tools/skipped-pdfs.log
 *
 * 2. Chế độ Commit vào Ngân Hàng Câu Hỏi:
 *    node tools/extract-questions.js --dir "TÀI LIỆU" --commit
 *    -> Lọc các câu đạt confidence: 'high', định dạng ID chuẩn, append vào js/documentQuestionBank.js
 *    -> Bảo toàn nguyên vẹn 32 câu hỏi thủ công có sẵn
 */

const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');

// ================= CẤU HÌNH & THAM SỐ =================
const args = process.argv.slice(2);

function getArgVal(flag, def) {
  const idx = args.indexOf(flag);
  if (idx !== -1 && idx + 1 < args.length) return args[idx + 1];
  return def;
}

const TARGET_DIR = getArgVal('--dir', 'TÀI LIỆU');
const OUTPUT_REVIEW = getArgVal('--output', path.join('tools', 'extracted-review.json'));
const LOG_SKIPPED = getArgVal('--log', path.join('tools', 'skipped-pdfs.log'));
const DO_COMMIT = args.includes('--commit');
const MAX_PER_FILE = parseInt(getArgVal('--max-per-file', '50'), 10); // Tối đa 50 câu/file để đảm bảo chất lượng tinh hoa

// ================= TIỆN ÍCH HỖ TRỢ =================
function getAllPdfs(dir) {
  let files = [];
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllPdfs(full));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.pdf')) {
      files.push(full);
    }
  }
  return files;
}

function slugify(text) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toUpperCase()
    .slice(0, 16);
}

// Suy ra Khối lớp (grade) và Chủ đề mặc định từ đường dẫn thư mục
function inferGradeAndTopic(filePath, text) {
  const normPath = filePath.replace(/\\/g, '/');
  let grade = '10';
  let topic = 'toan10';

  if (/DGNL/i.test(normPath)) {
    grade = 'DGNL';
    topic = 'dgnl';
  } else if (/LỚP\s*12|LOP\s*12/i.test(normPath)) {
    grade = '12';
    topic = 'toan12';
  } else if (/LỚP\s*11|LOP\s*11/i.test(normPath)) {
    grade = '11';
    topic = 'toan11';
  } else if (/LỚP\s*10|LOP\s*10/i.test(normPath)) {
    grade = '10';
    topic = 'toan10';
  } else if (/LỚP\s*9|LOP\s*9/i.test(normPath)) {
    grade = '9';
    topic = 'toan9';
  } else if (/LỚP\s*8|LOP\s*8/i.test(normPath)) {
    grade = '8';
    topic = 'toan8';
  } else if (/LỚP\s*7|LOP\s*7/i.test(normPath)) {
    grade = '7';
    topic = 'toan7';
  } else if (/LỚP\s*6|LOP\s*6/i.test(normPath)) {
    grade = '6';
    topic = 'toan6';
  }

  // Suy luận subtopic chi tiết từ nội dung câu hỏi
  let subtopic = topic;
  const sample = (text || '').toLowerCase().slice(0, 500);

  if (grade === 'DGNL') {
    if (/logic|suy luận|mệnh đề|thứ tự|xếp hàng/i.test(sample)) subtopic = 'dgnl_logic';
    else if (/số liệu|biểu đồ|phần trăm|thống kê|bảng số/i.test(sample)) subtopic = 'dgnl_data';
    else if (/tiếng việt|ngữ pháp|tác phẩm|đoạn trích/i.test(sample)) subtopic = 'dgnl_tiengviet';
    else subtopic = 'dgnl_logic';
  } else {
    if (/hàm số|đồng biến|nghịch biến|cực trị|tiệm cận|đạo hàm|bảng biến thiên|parabol/i.test(sample)) subtopic = 'ham_so';
    else if (/vectơ|tọa độ|tích vô hướng|oxy|oxyz/i.test(sample)) subtopic = 'vecto';
    else if (/hình học|tam giác|hình vuông|hình chóp|lăng trụ|mặt cầu|thể tích|khoảng cách/i.test(sample)) subtopic = 'hinh_hoc';
    else if (/lượng giác|sin|cos|tan|cotan/i.test(sample)) subtopic = 'luong_giac';
    else if (/xác suất|biến cố|tổ hợp|chỉnh hợp|hoán vị/i.test(sample)) subtopic = 'xac_suat';
    else if (/tích phân|nguyên hàm|diện tích hình phẳng/i.test(sample)) subtopic = 'tich_phan';
    else if (/logarit|mũ|lũy thừa/i.test(sample)) subtopic = 'mu_logarit';
    else if (/số học|ước|bội|số nguyên|phân số/i.test(sample)) subtopic = 'so_hoc';
    else if (/đại số|phương trình|bất phương trình|hệ phương trình|vi-ét/i.test(sample)) subtopic = 'dai_so';
    else subtopic = 'dai_so';
  }

  return { grade, topic, subtopic };
}

// ================= THUẬT TOÁN TRÍCH XUẤT CÂU HỎI & ĐÁP ÁN (PORTED & ENHANCED) =================
function parsePdfQuestions(rawText, filePath, fileName) {
  if (!rawText || rawText.trim().length < 30) return [];

  // 1. Chuẩn hóa text & dọn dẹp các header/footer/page delimiter do pdf-parse sinh ra
  let text = rawText.replace(/\r\n/g, '\n');
  text = text.replace(/^--\s*\d+\s+of\s+\d+\s*--$/gm, '');
  text = text.replace(/^Trang\s+\d+(\/\d+)?.*$/gm, '');
  text = text.replace(/https?:\/\/[^\s]+/g, '');

  // 2. Tách phần Bảng Đáp Án (chỉ quét phần cuối văn bản hoặc sau từ khóa chuyên biệt)
  const answerKeyMap = {};
  
  // Tìm marker bảng đáp án
  const keyMarkerRegex = /(?:^|\n)\s*(?:BẢNG\s+ĐÁP\s+ÁN|ĐÁP\s+ÁN\s*CHI\s+TIẾT|ĐÁP\s+ÁN\s*TRẮC\s+NGHIỆM|HƯỚNG\s+DẪN\s+GIẢI|LỜI\s+GIẢI\s+CHI\s+TIẾT|HƯỚNG\s+DẪN\s+CHẤM|PHẦN\s+ĐÁP\s+ÁN)\b/gi;
  let examBody = text;
  let keySection = '';

  let lastMarkerIdx = -1;
  let m;
  while ((m = keyMarkerRegex.exec(text)) !== null) {
    lastMarkerIdx = m.index;
  }

  if (lastMarkerIdx !== -1) {
    examBody = text.slice(0, lastMarkerIdx);
    keySection = text.slice(lastMarkerIdx);
  } else {
    // Nếu không có header rõ ràng, lấy 25% cuối văn bản
    const cutoff = Math.floor(text.length * 0.75);
    keySection = text.slice(cutoff);
  }

  // Quét các cặp số câu - đáp án: ví dụ "1.A", "1. A", "Câu 1: A", "1-A", "1.D"
  const akRegex = /(?:câu\s*)?(\d+)[\.\s:\-–—\t]+([A-D]|Đúng|Sai)\b/gi;
  let akMatch;
  while ((akMatch = akRegex.exec(keySection)) !== null) {
    const qNum = parseInt(akMatch[1], 10);
    const ansVal = akMatch[2].trim().toUpperCase();
    if (qNum > 0 && qNum <= 300) {
      answerKeyMap[qNum] = ansVal;
    }
  }

  // 3. Loại bỏ phần header / mở đầu trước Câu 1 / Bài 1 đầu tiên (tránh nhận nhầm tiêu đề tài liệu làm câu hỏi)
  const firstQMatch = /(?:^|\n)\s*(?:Câu|Bài)\s*1[\s.:–-]/i.exec(examBody);
  if (!firstQMatch) {
    // Thử tìm bất kỳ câu hỏi nào
    const anyQMatch = /(?:^|\n)\s*(?:Câu|Bài)\s*\d+[\s.:–-]/i.exec(examBody);
    if (!anyQMatch) return [];
    examBody = examBody.slice(anyQMatch.index);
  } else {
    examBody = examBody.slice(firstQMatch.index);
  }

  // 4. Phân chia các khối câu hỏi theo Câu N / Bài N
  const qSplits = examBody.split(/(?=(?:^|\n)\s*(?:Câu|Bài)\s*\d+[\s.:–-])/i);
  const questions = [];
  let currentQNum = 1;

  for (const chunk of qSplits) {
    const trimmed = chunk.trim();
    if (trimmed.length < 20) continue;

    const numMatch = /^\s*(?:Câu|Bài)\s*(\d+)[\s.:–-]/i.exec(trimmed);
    const parsedNum = numMatch ? parseInt(numMatch[1], 10) : currentQNum;
    currentQNum = parsedNum + 1;

    // Tách phần thân câu hỏi (loại bỏ tiền tố Câu N)
    const bodyWithoutHeader = trimmed.replace(/^\s*(?:Câu|Bài)\s*\d+[\s.:–-]\s*/i, '').trim();

    // Kiểm tra xem có phần "Lời giải" hoặc "Hướng dẫn giải" inline trong chunk hay không
    let questionPart = bodyWithoutHeader;
    let explanationPart = '';
    let inlineAnswer = '';

    const solIdx = bodyWithoutHeader.search(/(?:Lời\s+giải|Hướng\s+dẫn\s+giải)[:.\s]/i);
    if (solIdx !== -1) {
      questionPart = bodyWithoutHeader.slice(0, solIdx).trim();
      explanationPart = bodyWithoutHeader.slice(solIdx).trim();

      // Tìm câu trả lời inline trong lời giải (ví dụ: "Chọn A", "Chọn B", "Đáp án A")
      const inlineMatch = /(?:Chọn\s+(?:đáp\s+án\s+)?|Đáp\s+án\s+là\s+|=>\s*Chọn\s+)([A-D])\b/i.exec(explanationPart);
      if (inlineMatch) {
        inlineAnswer = inlineMatch[1].toUpperCase();
      }
    }

    // 5. Tách 4 phương án lựa chọn A, B, C, D
    let type = 'mcq';
    let options = [];
    let title = questionPart;

    // Tìm vị trí của A, B, C, D
    const optRegA = /(?:^|[\n\s])A[\.\)]\s+/i;
    const optRegB = /(?:^|[\n\s])B[\.\)]\s+/i;
    const optRegC = /(?:^|[\n\s])C[\.\)]\s+/i;
    const optRegD = /(?:^|[\n\s])D[\.\)]\s+/i;

    const matchA = optRegA.exec(questionPart);
    const matchB = optRegB.exec(questionPart);
    const matchC = optRegC.exec(questionPart);
    const matchD = optRegD.exec(questionPart);

    if (matchA && matchB && matchC && matchD &&
        matchA.index < matchB.index &&
        matchB.index < matchC.index &&
        matchC.index < matchD.index) {
      
      title = questionPart.slice(0, matchA.index).trim();
      const rawA = questionPart.slice(matchA.index, matchB.index).trim().replace(/^[A-D][\.\)]\s*/i, '');
      const rawB = questionPart.slice(matchB.index, matchC.index).trim().replace(/^[A-D][\.\)]\s*/i, '');
      const rawC = questionPart.slice(matchC.index, matchD.index).trim().replace(/^[A-D][\.\)]\s*/i, '');
      const rawD = questionPart.slice(matchD.index).trim().replace(/^[A-D][\.\)]\s*/i, '');

      if (rawA && rawB && rawC && rawD) {
        options = [rawA, rawB, rawC, rawD];
        type = 'mcq';
      }
    } else {
      // 6. Nhận diện True/False: BẮT BUỘC có cấu trúc Đúng/Sai rõ ràng ngay sau câu hỏi
      const tfPattern = /(?:[\r\n]|\s{2,})(?:(?:A[.)\s]+)?Đúng[.)\s]+(?:B[.)\s]+)?Sai|(?:A[.)\s]+)?Sai[.)\s]+(?:B[.)\s]+)?Đúng|Đúng\s*[\/|\-]\s*Sai|\[\s*\]\s*Đúng\s*\[\s*\]\s*Sai)(?:\s*$|\s*[\r\n])/i;
      if (tfPattern.test(questionPart)) {
        type = 'truefalse';
        options = ['Đúng', 'Sai'];
        title = questionPart.replace(tfPattern, '').trim();
      } else {
        type = 'essay';
      }
    }

    // Xác định đáp án đúng
    let correctAnswer = answerKeyMap[parsedNum] || inlineAnswer || '';
    if (type === 'truefalse' && correctAnswer) {
      correctAnswer = /sai|f/i.test(correctAnswer) ? 'Sai' : 'Đúng';
    }

    // 7. Đánh giá độ tin cậy (Confidence Rating) chặt chẽ
    let confidence = 'high';

    // Bỏ các ký tự điều khiển lạ
    title = title.replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g, '').trim();
    if (explanationPart) {
      explanationPart = explanationPart
        .replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g, '')
        .replace(/\.{4,}/g, '')
        .replace(/^.*(?:GV:|Trang\s+\d+|LỚP TOÁN|THPT|Zalo|SĐT|0\d{9}).*$/gm, '')
        .trim();
    }

    // Điều kiện đánh dấu 'low':
    const hasBadChars = /[\uFFFD\u0000]|\?\?\?/.test(title);
    const isTableOfContents = /mục\s+lục|tóm\s+tắt\s+lý\s+thuyết|bài\s+tập\s+tự\s+luyện\s*\.{3,}/i.test(title);

    if (!correctAnswer || correctAnswer === '') {
      confidence = 'low';
    } else if (isTableOfContents) {
      confidence = 'low';
    } else if (['A', 'B', 'C', 'D'].includes(correctAnswer) && options.length !== 4) {
      // Nếu có đáp án A-D nhưng không tách đủ 4 phương án -> Đánh dấu 'low'
      confidence = 'low';
    } else if (type === 'mcq' && options.length !== 4) {
      confidence = 'low';
    } else if (title.length < 15) {
      confidence = 'low';
    } else if (hasBadChars) {
      confidence = 'low';
    } else if (type === 'mcq' && options.some(opt => !opt || opt.trim().length === 0)) {
      confidence = 'low';
    }

    // Suy luận chủ đề & lớp
    const { grade, topic, subtopic } = inferGradeAndTopic(filePath, title);

    questions.push({
      grade,
      topic: subtopic,
      level: title.length > 200 || /tham số|lớn nhất|nhỏ nhất|thực tế/i.test(title) ? 'VD' : 'TH',
      type,
      source: fileName.replace(/\.pdf$/i, ''),
      sourceFile: path.relative('.', filePath).replace(/\\/g, '/'),
      question: title,
      options: options,
      correctAnswer: correctAnswer,
      explanation: explanationPart || `Trích từ tài liệu: ${fileName.replace(/\.pdf$/i, '')}`,
      confidence
    });
  }

  return questions;
}

// ================= HÀM CHÍNH THỰC THI PIPELINE =================
async function runPipeline() {
  console.log('================================================================');
  console.log('🚀 KHIEMEDU DOCUMENT QUESTION BANK EXTRACTION PIPELINE');
  console.log(`📁 Thư mục nguồn: ${TARGET_DIR}`);
  console.log(`📑 File review: ${OUTPUT_REVIEW}`);
  console.log(`⚠️ File log bỏ qua: ${LOG_SKIPPED}`);
  console.log(`🔒 Chế độ Commit: ${DO_COMMIT ? 'BẬT (Ghi vào documentQuestionBank.js)' : 'TẮT (Chỉ xuất file review)'}`);
  console.log('================================================================\n');

  // Nếu người dùng yêu cầu commit và file review đã tồn tại (không có cờ --re-extract)
  if (DO_COMMIT && fs.existsSync(OUTPUT_REVIEW) && (args.includes('--from-review') || !args.includes('--re-extract'))) {
    console.log(`⚡ Đã tìm thấy dữ liệu trích xuất sẵn trong "${OUTPUT_REVIEW}". Đang thực hiện commit...`);
    const cachedQuestions = JSON.parse(fs.readFileSync(OUTPUT_REVIEW, 'utf8'));
    await commitHighConfidenceQuestions(cachedQuestions);
    return;
  }

  const allPdfs = getAllPdfs(TARGET_DIR);
  console.log(`🔍 Tìm thấy tổng cộng: ${allPdfs.length} file PDF trong "${TARGET_DIR}"\n`);

  const skippedList = [];
  const allExtractedQuestions = [];
  let processedSuccess = 0;

  for (let i = 0; i < allPdfs.length; i++) {
    const filePath = allPdfs[i];
    const fileName = path.basename(filePath);
    const relPath = path.relative('.', filePath).replace(/\\/g, '/');

    try {
      const buffer = fs.readFileSync(filePath);
      const parser = new PDFParse({ data: buffer });
      await parser.load();
      const info = await parser.getInfo();
      const text = (await parser.getText()).text || '';
      await parser.destroy(); // Giải phóng bộ nhớ ngay lập tức

      const numPages = info.total || 1;
      const cleanLen = text.trim().length;
      const charRatio = Math.round(cleanLen / numPages);

      // KIỂM TRA SCAN / ẢNH: nếu không có text layer hoặc text quá ngắn
      if ((numPages > 1 && charRatio < 40) || cleanLen < 80) {
        const reason = `PDF dạng scan/ảnh (không có text layer): ${cleanLen} ký tự trên ${numPages} trang (TB ${charRatio} ký tự/trang)`;
        skippedList.push({ file: relPath, reason });
        console.log(`[${i + 1}/${allPdfs.length}] ⏭️ BỎ QUA (Scan): ${fileName} (${reason})`);
        continue;
      }

      // Trích xuất câu hỏi
      const docQuestions = parsePdfQuestions(text, filePath, fileName);
      processedSuccess++;

      let highCount = docQuestions.filter(q => q.confidence === 'high').length;
      let lowCount = docQuestions.filter(q => q.confidence === 'low').length;

      console.log(`[${i + 1}/${allPdfs.length}] ✅ ${fileName} | Trang: ${numPages} | Trích xuất: ${docQuestions.length} câu (High: ${highCount}, Low: ${lowCount})`);

      // Thêm vào danh sách tổng hợp (giới hạn MAX_PER_FILE câu high confidence mỗi file nếu cần)
      if (MAX_PER_FILE > 0) {
        const highQs = docQuestions.filter(q => q.confidence === 'high').slice(0, MAX_PER_FILE);
        const lowQs = docQuestions.filter(q => q.confidence === 'low').slice(0, 20);
        allExtractedQuestions.push(...highQs, ...lowQs);
      } else {
        allExtractedQuestions.push(...docQuestions);
      }

    } catch (err) {
      const reason = `Lỗi đọc file PDF: ${err.message}`;
      skippedList.push({ file: relPath, reason });
      console.warn(`[${i + 1}/${allPdfs.length}] ❌ LỖI: ${fileName} - ${reason}`);
    }
  }

  // 1. Ghi log các file bỏ qua
  fs.mkdirSync(path.dirname(LOG_SKIPPED), { recursive: true });
  const logContent = [
    `# KHIEMEDU SKIPPED PDFS LOG - ${new Date().toISOString()}`,
    `# Tổng số file bị bỏ qua: ${skippedList.length}/${allPdfs.length}`,
    '',
    ...skippedList.map(item => `[SKIPPED] ${item.file}\n  Lý do: ${item.reason}\n`)
  ].join('\n');
  fs.writeFileSync(LOG_SKIPPED, logContent, 'utf8');

  // 2. Ghi file review JSON
  fs.mkdirSync(path.dirname(OUTPUT_REVIEW), { recursive: true });
  fs.writeFileSync(OUTPUT_REVIEW, JSON.stringify(allExtractedQuestions, null, 2), 'utf8');

  const totalHigh = allExtractedQuestions.filter(q => q.confidence === 'high').length;
  const totalLow = allExtractedQuestions.filter(q => q.confidence === 'low').length;

  console.log('\n=================== KẾT QUẢ EXTRACTION ===================');
  console.log(`📊 Tổng số file PDF quét: ${allPdfs.length}`);
  console.log(`✅ File trích xuất thành công: ${processedSuccess}`);
  console.log(`⏭️ File scan/ảnh bỏ qua an toàn: ${skippedList.length} (Xem log: ${LOG_SKIPPED})`);
  console.log(`📝 Tổng số câu hỏi trích xuất: ${allExtractedQuestions.length}`);
  console.log(`   - 🟢 High Confidence: ${totalHigh} câu`);
  console.log(`   - 🟡 Low Confidence (cần duyệt tay): ${totalLow} câu`);
  console.log(`💾 Đã lưu toàn bộ vào: ${OUTPUT_REVIEW}`);
  console.log('==========================================================\n');

  // 3. Nếu có cờ --commit: Thực hiện Append vào js/documentQuestionBank.js
  if (DO_COMMIT) {
    await commitHighConfidenceQuestions(allExtractedQuestions);
  } else {
    console.log('💡 TIP: Để append các câu "high confidence" vào js/documentQuestionBank.js, hãy chạy:');
    console.log('   node tools/extract-questions.js --commit\n');
  }
}

// ================= HÀM COMMIT CÂU HỎI HIGH CONFIDENCE VÀO CSDL =================
async function commitHighConfidenceQuestions(extractedQuestions) {
  const bankFilePath = path.join('js', 'documentQuestionBank.js');
  if (!fs.existsSync(bankFilePath)) {
    console.error(`❌ Không tìm thấy file: ${bankFilePath}`);
    return;
  }

  const highQuestions = extractedQuestions.filter(q => q.confidence === 'high');
  console.log(`🔒 Đang chuẩn bị commit ${highQuestions.length} câu hỏi đạt chuẩn 'high confidence'...`);

  // Đọc nội dung hiện tại của bank
  const currentContent = fs.readFileSync(bankFilePath, 'utf8');

  // Deduplicate: lọc các câu hỏi có nội dung trùng lặp
  const seenContent = new Set();
  const uniqueHigh = [];

  for (const q of highQuestions) {
    const norm = q.question.trim().replace(/\s+/g, ' ');
    if (!seenContent.has(norm)) {
      seenContent.add(norm);
      uniqueHigh.push(q);
    }
  }

  console.log(`🎯 Sau khi lọc trùng lặp nội dung: còn ${uniqueHigh.length} câu hỏi độc nhất.`);

  // Định dạng danh sách câu hỏi mới thành code JavaScript
  const newQuestionObjects = uniqueHigh.map((q, idx) => {
    const gradePrefix = q.grade === 'DGNL' ? 'DGNL' : `TOAN${q.grade}`;
    const slug = slugify(q.source);
    const id = `${gradePrefix}_${slug}_${String(idx + 1).padStart(3, '0')}`;

    return {
      id,
      grade: q.grade,
      topic: q.topic,
      level: q.level,
      type: q.type,
      source: q.source,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation
    };
  });

  // Tìm vị trí đóng của mảng questions trong file:
  // Cấu trúc: questions: [ ... \n  ],
  const insertMarker = /\n\s*\],\s*\n\s*\/\*\*\s*\n\s*\* Truy vấn câu hỏi/;
  const match = insertMarker.exec(currentContent);

  if (!match) {
    console.error('❌ Không tìm thấy điểm chèn (insertion point) trong js/documentQuestionBank.js');
    return;
  }

  const insertIndex = match.index;
  const jsonStringBlock = ',\n\n    // =========================================================================\n' +
    '    // CÂU HỎI TRÍCH XUẤT TỰ ĐỘNG TỪ 147 FILE PDF KHO TÀI LIỆU (HIGH CONFIDENCE)\n' +
    '    // =========================================================================\n' +
    newQuestionObjects.map(obj => '    ' + JSON.stringify(obj, null, 2).replace(/\n/g, '\n    ')).join(',\n');

  let updatedContent = currentContent.slice(0, insertIndex) + jsonStringBlock + currentContent.slice(insertIndex);

  // Đảm bảo phương thức getQuestions có sẵn trong DocumentQuestionBank
  if (!updatedContent.includes('getQuestions(')) {
    const queryMarker = /query\(filters\s*=\s*\{\}\)\s*\{/;
    const queryMatch = queryMarker.exec(updatedContent);
    if (queryMatch) {
      const getQuestionsCode = `\n  /**\n   * API Lấy câu hỏi theo tiêu chí (Hỗ trợ cả positional và object arguments)\n   */\n  getQuestions(grade, topic, level, type, limit) {\n    if (typeof grade === 'object' && grade !== null) {\n      return this.query(grade);\n    }\n    return this.query({ grade, topic, level, type, limit });\n  },\n\n  `;
      updatedContent = updatedContent.slice(0, queryMatch.index) + getQuestionsCode + updatedContent.slice(queryMatch.index);
    }
  }

  // Đảm bảo hỗ trợ export cho cả Browser và Node.js
  if (!updatedContent.includes('typeof module !== \'undefined\'')) {
    updatedContent += `\n\nif (typeof module !== 'undefined' && module.exports) {\n  module.exports = DocumentQuestionBank;\n}\n`;
  }

  fs.writeFileSync(bankFilePath, updatedContent, 'utf8');
  console.log(`🎉 ĐÃ APPEND THÀNH CÔNG ${newQuestionObjects.length} CÂU HỎI THẬT VÀO: ${bankFilePath}!`);
}

// Chạy pipeline
runPipeline().catch(err => {
  console.error('💥 Lỗi không xử lý được trong pipeline:', err);
  process.exit(1);
});
