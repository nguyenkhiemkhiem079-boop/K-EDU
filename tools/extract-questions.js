/**
 * KhiemEdu Document Question Bank Extractor
 * Pipeline trích xuất câu hỏi THẬT từ 147 file PDF trong TÀI LIỆU
 *
 * SỬA TẬN GỐC THUẬT TOÁN:
 * 1. Chặn hiện tượng nuốt nội dung câu khác / đoạn ngữ liệu chung vào option D.
 * 2. Giới hạn cứng độ dài phương án (<= 220 ký tự cho mỗi phương án).
 * 3. Dọn dẹp triệt để Watermark, PII (tác giả, giáo viên, SĐT, Zalo, mạng xã hội, số trang)
 *    trên TẤT CẢ các trường: title, options (A-D), explanation.
 * 4. Nhận diện công thức Toán bị vỡ / font MathType lỗi / nhiều ký tự tab (\t) -> confidence: 'low'.
 * 5. Loại bỏ hoàn toàn ký tự tab (\t) khỏi dữ liệu câu hỏi.
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
const MAX_PER_FILE = parseInt(getArgVal('--max-per-file', '50'), 10);
const RE_EXTRACT = args.includes('--re-extract') || !args.includes('--from-review');

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

// ================= SỬA 2: BỘ DỌN DẸP WATERMARK & PII TOÀN DIỆN =================
function stripWatermark(text) {
  if (!text || typeof text !== 'string') return '';

  let cleaned = text;

  // 1. Loại bỏ các dòng chứa thông tin giáo viên, biên soạn, sưu tầm, tác giả
  cleaned = cleaned.replace(/^[^\n]*(?:GV[\s.:]|Giáo\s+viên[\s.:]|Thầy[\s/]|Cô[\s/]|Sưu\s+tầm\s+và\s+biên\s+soạn|Biên\s+soạn\s+bởi|Biên\s+soạn[\s.:]|Tổng\s+hợp[\s.:]|Tác\s+giả[\s.:]|Chủ\s+biên[\s.:]|Hiệu\s+đính[\s.:])[^\n]*$/gmi, '');

  // 2. Loại bỏ các dòng chứa số điện thoại, Zalo, Hotline, Phone
  cleaned = cleaned.replace(/^[^\n]*(?:SĐT|Zalo|Hotline|Điện\s*thoại|Tel|Phone|Mobile)[\s.:]*[^\n]*$/gmi, '');
  // Xóa số điện thoại Việt Nam độc lập (03x, 05x, 07x, 08x, 09x, +84)
  cleaned = cleaned.replace(/(?:\+84|0)[35789]\d{8,9}\b/g, '');
  cleaned = cleaned.replace(/\b\d{4}[.\s]\d{3}[.\s]\d{3}\b/g, '');

  // 3. Mạng xã hội, Fanpage, Group, Website, Email
  cleaned = cleaned.replace(/^[^\n]*(?:Fanpage|Group|Kênh|Website|Email)[\s.:][^\n]*$/gmi, '');
  cleaned = cleaned.replace(/^[^\n]*(?:facebook\.com|fb\.com|zalo\.me|youtube\.com|drive\.google|t\.me)[^\n]*$/gmi, '');
  cleaned = cleaned.replace(/https?:\/\/\S+/gi, '');
  cleaned = cleaned.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '');

  // 4. Tiêu đề tài liệu, watermark lặp lại đầu/cuối trang
  cleaned = cleaned.replace(/^[^\n]*(?:CHINH\s+PHỤC\s+K[IÌ]\s+THI|LỚP\s+TOÁN|NGUYỄN\s+BẢO\s+VƯƠNG|TRẦN\s+ĐÌNH\s+CƯ|TÀI\s+LIỆU\s+ÔN\s+THI|BỘ\s+ĐỀ\s+THI|ĐỀ\s+THI\s+THỬ|CHUYÊN\s+ĐỀ)[^\n]*$/gmi, '');
  cleaned = cleaned.replace(/^[^\n]*(?:Trang\s+\d+|Page\s+\d+|--\s*\d+\s*--|-\s*\d+\s*-|\b\d+\s*\/\s*\d+\b)[^\n]*$/gmi, '');

  // 5. Chuỗi chấm lửng mục lục (. . . . hoặc .....)
  cleaned = cleaned.replace(/\.{4,}/g, '');
  cleaned = cleaned.replace(/(?:\.\s*){4,}/g, '');

  // 6. Chuẩn hóa xuống dòng và khoảng trắng
  cleaned = cleaned.replace(/\r\n/g, '\n');
  cleaned = cleaned.replace(/[ \t]+\n/g, '\n');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return cleaned.trim();
}

/**
 * Kiểm tra xem chuỗi còn sót watermark hoặc PII rò rỉ hay không
 */
function hasWatermarkOrPii(str) {
  if (!str || typeof str !== 'string') return false;
  // Số điện thoại Việt Nam
  if (/(?:\+84|0)[35789]\d{8,9}\b/.test(str)) return true;
  // Từ khóa PII / giáo viên / bản quyền
  if (/(?:GV[\s.:]|Giáo\s+viên[\s.:]|Thầy[\s/]|Cô[\s/]|Zalo|SĐT|Hotline|Fanpage|facebook\.com|fb\.com|Chinh\s+phục\s+k[iì]\s+thi|LỚP\s+TOÁN|Nguyễn\s+Bảo\s+Vương|Trần\s+Đình\s+Cư)/i.test(str)) return true;
  // Trang X
  if (/(?:Trang\s+\d+|Page\s+\d+)/i.test(str)) return true;
  return false;
}

// ================= SỬA 3: BỘ NHẬN DIỆN CÔNG THỨC TOÁN BỊ VỠ & TAB =================
function isBrokenFormula(str) {
  if (!str || typeof str !== 'string') return false;

  // 1. Chứa từ 2 ký tự tab (\t) trở lên trong 1 trường
  const tabCount = (str.match(/\t/g) || []).length;
  if (tabCount >= 2) return true;

  // 2. Chứa ký tự Unicode thuộc vùng Private Use Area (Font MathType / Symbol bị vỡ: , , , , , , , etc.)
  if (/[\uE000-\uF8FF]/.test(str)) return true;

  // 3. Mật độ chữ số + khoảng trắng + ký tự đặc biệt cao bất thường so với chữ cái
  const letters = (str.match(/[a-zA-Zà-ỹÀ-Ỹ]/g) || []).length;
  const digitsAndSpaces = (str.match(/[\d\s\t\-_=+\/*\\()\[\]{}^.,;]/g) || []).length;
  if (str.length > 30 && letters > 0 && (digitsAndSpaces / letters) > 3.0) {
    return true;
  }

  // 4. Chuỗi các chữ cái đơn lẻ cách nhau bởi khoảng trắng liên tiếp (vd: "y m x m x mx m", "a b c d e")
  if (/(?:\b[a-zA-Z]\s+){4,}/.test(str)) return true;

  return false;
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

// ================= THUẬT TOÁN TRÍCH XUẤT CÂU HỎI & ĐÁP ÁN ĐÃ NÂNG CẤP =================
function parsePdfQuestions(rawText, filePath, fileName) {
  if (!rawText || rawText.trim().length < 30) return [];

  // 1. Chuẩn hóa text & dọn dẹp các header/footer/page delimiter do pdf-parse sinh ra
  let text = rawText.replace(/\r\n/g, '\n');
  text = text.replace(/^--\s*\d+\s+of\s+\d+\s*--$/gm, '');
  text = text.replace(/^Trang\s+\d+(\/\d+)?.*$/gm, '');
  text = text.replace(/https?:\/\/[^\s]+/g, '');

  // 2. Tách phần Bảng Đáp Án
  const answerKeyMap = {};
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

  // 3. Loại bỏ phần header / mở đầu trước Câu 1 / Bài 1 đầu tiên
  const firstQMatch = /(?:^|\n)\s*(?:Câu|Bài)\s*1[\s.:–-]/i.exec(examBody);
  if (!firstQMatch) {
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

      const inlineMatch = /(?:Chọn\s+(?:đáp\s+án\s+)?|Đáp\s+án\s+là\s+|=>\s*Chọn\s+)([A-D])\b/i.exec(explanationPart);
      if (inlineMatch) {
        inlineAnswer = inlineMatch[1].toUpperCase();
      }
    }

    // 5. Tách 4 phương án lựa chọn A, B, C, D
    let type = 'mcq';
    let options = [];
    let title = questionPart;
    let hasOversizedOption = false;

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

      title = stripWatermark(questionPart.slice(0, matchA.index));
      let rawA = stripWatermark(questionPart.slice(matchA.index, matchB.index).replace(/^[A-D][\.\)]\s*/i, ''));
      let rawB = stripWatermark(questionPart.slice(matchB.index, matchC.index).replace(/^[A-D][\.\)]\s*/i, ''));
      let rawC = stripWatermark(questionPart.slice(matchC.index, matchD.index).replace(/^[A-D][\.\)]\s*/i, ''));
      let rawD = questionPart.slice(matchD.index).replace(/^[A-D][\.\)]\s*/i, '');

      // ================= SỬA 1: CHẶN NUỐT NỘI DUNG CÂU KHÁC VÀO OPTION D =================
      const cutPatterns = [
        /(?:Dựa\s+vào|Căn\s+cứ\s+vào)\s+(?:thông\s+tin|dữ\s+liệu|đoạn\s+văn|bảng)\s+dưới\s+đây/i,
        /trả\s+lời\s+(?:các\s+)?câu\s+(?:hỏi\s+)?(?:từ\s+)?\d+/i,
        /đọc\s+(?:đoạn\s+)?thông\s+tin\s+(?:sau|dưới\s+đây)/i,
        /sử\s+dụng\s+dữ\s+kiện\s+sau/i,
        /(?:\n|[.\s;])(?:Câu|Bài)\s*\d+[\s.:–-]/i,
        /(?:Lời\s+giải|Hướng\s+dẫn\s+giải)[:.\s]/i
      ];

      let cutIndex = -1;
      for (const p of cutPatterns) {
        const pMatch = p.exec(rawD);
        if (pMatch && pMatch.index > 0) {
          if (cutIndex === -1 || pMatch.index < cutIndex) {
            cutIndex = pMatch.index;
          }
        }
      }

      if (cutIndex !== -1) {
        rawD = rawD.slice(0, cutIndex);
      }

      // SỬA 2: Áp dụng stripWatermark cho option D sau khi cắt
      rawD = stripWatermark(rawD);

      // SỬA 1 (tiếp): Kiểm tra giới hạn cứng 220 ký tự cho từng option
      const rawOptions = [rawA, rawB, rawC, rawD];
      if (rawOptions.some(opt => opt.length > 220)) {
        hasOversizedOption = true;
      }

      if (rawA && rawB && rawC && rawD) {
        options = rawOptions;
        type = 'mcq';
      }
    } else {
      // 6. Nhận diện True/False
      const tfPattern = /(?:[\r\n]|\s{2,})(?:(?:A[.)\s]+)?Đúng[.)\s]+(?:B[.)\s]+)?Sai|(?:A[.)\s]+)?Sai[.)\s]+(?:B[.)\s]+)?Đúng|Đúng\s*[\/|\-]\s*Sai|\[\s*\]\s*Đúng\s*\[\s*\]\s*Sai)(?:\s*$|\s*[\r\n])/i;
      if (tfPattern.test(questionPart)) {
        type = 'truefalse';
        options = ['Đúng', 'Sai'];
        title = stripWatermark(questionPart.replace(tfPattern, ''));
      } else {
        type = 'essay';
        title = stripWatermark(questionPart);
      }
    }

    // SỬA 2: Áp dụng stripWatermark cho explanationPart
    if (explanationPart) {
      explanationPart = stripWatermark(explanationPart);
    }

    // Xác định đáp án đúng
    let correctAnswer = answerKeyMap[parsedNum] || inlineAnswer || '';
    if (type === 'truefalse' && correctAnswer) {
      correctAnswer = /sai|f/i.test(correctAnswer) ? 'Sai' : 'Đúng';
    }

    // ================= SỬA 3: ĐÁNH GIÁ CONFIDENCE VÀ LOẠI BỎ TAB / BROKEN FORMULA =================
    let confidence = 'high';

    // Bỏ các ký tự điều khiển lạ (trừ \n)
    title = title.replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g, '').trim();

    // Kiểm tra tab, công thức vỡ, PII trên tất cả các trường
    const allFields = [title, ...options];
    const hasTabs = allFields.some(f => (f.match(/\t/g) || []).length >= 2);
    const hasCorruptedMath = allFields.some(f => isBrokenFormula(f));
    const hasResidualPii = allFields.some(f => hasWatermarkOrPii(f));
    const hasBadChars = /[\uFFFD\u0000]|\?\?\?|[\uE000-\uF8FF]/.test(title) || options.some(opt => /[\uFFFD\u0000]|\?\?\?|[\uE000-\uF8FF]/.test(opt));
    const isTableOfContents = /mục\s+lục|tóm\s+tắt\s+lý\s+thuyết|bài\s+tập\s+tự\s+luyện\s*\.{3,}/i.test(title);

    if (!correctAnswer || correctAnswer === '') {
      confidence = 'low';
    } else if (isTableOfContents) {
      confidence = 'low';
    } else if (['A', 'B', 'C', 'D'].includes(correctAnswer) && options.length !== 4) {
      confidence = 'low';
    } else if (type === 'mcq' && options.length !== 4) {
      confidence = 'low';
    } else if (title.length < 15) {
      confidence = 'low';
    } else if (hasBadChars) {
      confidence = 'low';
    } else if (hasOversizedOption) {
      confidence = 'low';
    } else if (hasTabs) {
      confidence = 'low';
    } else if (hasCorruptedMath) {
      confidence = 'low';
    } else if (hasResidualPii) {
      confidence = 'low';
    } else if (type === 'mcq' && options.some(opt => !opt || opt.trim().length === 0)) {
      confidence = 'low';
    }

    // SỬA 3 (tiếp): Dọn sạch 100% ký tự tab \t bằng khoảng trắng (kể cả câu low confidence)
    title = title.replace(/\t/g, ' ').replace(/[ ]{2,}/g, ' ').trim();
    options = options.map(opt => opt.replace(/\t/g, ' ').replace(/[ ]{2,}/g, ' ').trim());

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
  console.log('🚀 KHIEMEDU DOCUMENT QUESTION BANK EXTRACTION PIPELINE (CLEAN V2)');
  console.log(`📁 Thư mục nguồn: ${TARGET_DIR}`);
  console.log(`📑 File review: ${OUTPUT_REVIEW}`);
  console.log(`⚠️ File log bỏ qua: ${LOG_SKIPPED}`);
  console.log(`🔒 Chế độ Commit: ${DO_COMMIT ? 'BẬT (Ghi vào documentQuestionBank.js)' : 'TẮT (Chỉ xuất file review)'}`);
  console.log('================================================================\n');

  // Nếu người dùng yêu cầu commit từ review đã có sẵn bằng cờ --from-review
  if (DO_COMMIT && !RE_EXTRACT && fs.existsSync(OUTPUT_REVIEW)) {
    console.log(`⚡ Đang thực hiện commit từ file review có sẵn "${OUTPUT_REVIEW}"...`);
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
      await parser.destroy();

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
  console.log(`   - 🟢 High Confidence (ĐÃ LỌC SẠCH PII & LỖI): ${totalHigh} câu`);
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

  // Lọc strictly chỉ các câu đạt chuẩn high confidence
  const highQuestions = extractedQuestions.filter(q => {
    if (q.confidence !== 'high') return false;
    // Kiểm tra an toàn tuyệt đối lần cuối trước khi commit
    const all = [q.question, ...(q.options || [])];
    if (all.some(f => f.includes('\t'))) return false;
    if (all.some(f => hasWatermarkOrPii(f))) return false;
    if ((q.options || []).some(opt => opt.length > 220)) return false;
    if (all.some(f => isBrokenFormula(f))) return false;
    return true;
  });

  console.log(`🔒 Đang chuẩn bị commit ${highQuestions.length} câu hỏi đạt chuẩn 'high confidence' đã kiểm định...`);

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
      sourceFile: q.sourceFile,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation
    };
  });

  // Tìm vị trí đóng của mảng questions trong file
  // Cấu trúc: questions: [ ... \n  ],
  const insertMarker = /\n\s*\],\s*\n\s*\/\*\*\s*\n\s*\* Truy vấn câu hỏi/;
  const match = insertMarker.exec(currentContent);

  if (!match) {
    console.error('❌ Không tìm thấy điểm chèn (insertion point) trong js/documentQuestionBank.js');
    return;
  }

  const insertIndex = match.index;
  const jsonStringBlock = ',\n\n    // =========================================================================\n' +
    '    // CÂU HỎI TRÍCH XUẤT TỰ ĐỘNG TỪ 147 FILE PDF KHO TÀI LIỆU (HIGH CONFIDENCE - ĐÃ DỌN SẠCH)\n' +
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
  console.log(`🎉 ĐÃ COMMIT THÀNH CÔNG ${newQuestionObjects.length} CÂU HỎI SẠCH VÀO: ${bankFilePath}!`);
}

// Chạy pipeline
runPipeline().catch(err => {
  console.error('💥 Lỗi không xử lý được trong pipeline:', err);
  process.exit(1);
});
