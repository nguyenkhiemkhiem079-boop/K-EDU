/**
 * KhiemEdu PDF & Question Extractor Engine
 * Extracts text from PDF files and parses questions via AI API or Smart Offline Parser.
 */

const PdfExtractor = {
  models: { gemini: 'gemini-3.5-flash-lite', claude: 'claude-sonnet-4-6' },
  async extractTextFromPdf(file) {
    if (typeof pdfjsLib === 'undefined') {
      throw new Error('Thư viện PDF.js chưa được nạp.');
    }
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str + (item.hasEOL ? '\n' : ' ')).join('');
      fullText += pageText + '\n';
    }
    return fullText;
  },

  async parseQuestions(text, apiKey = '', provider = 'offline') {
    if (provider !== 'offline' && !apiKey) throw new Error('Vui lòng nhập API key cho nhà cung cấp AI đã chọn.');
    if (provider !== 'offline' && text.length > 20000) throw new Error('Văn bản quá dài cho một lần nhận diện AI. Hãy chia tài liệu hoặc dùng nhận diện offline; hệ thống không tự cắt bỏ câu hỏi.');
    if (provider === 'gemini' && apiKey) {
      return await this.parseWithGemini(text, apiKey);
    } else if (provider === 'claude' && apiKey) {
      return await this.parseWithClaude(text, apiKey);
    } else {
      return this.parseSmartOffline(text);
    }
  },

  async parseWithGemini(text, apiKey) {
    const prompt = `Bạn là chuyên gia trích xuất đề thi Toán học. Hãy đọc văn bản sau (gồm phần đề và đáp án) và trích xuất danh sách câu hỏi theo định dạng JSON.
Giữ nguyên công thức toán dạng LaTeX kẹp trong dấu $ (ví dụ $x^2 + 5x = 0$).
Quy tắc phân loại:
- "mcq": trắc nghiệm 4 lựa chọn A, B, C, D.
- "truefalse": câu hỏi đúng/sai.
- "essay": câu hỏi điền số/tự luận ngắn.
Chỉ trả về JSON Array thuần, không kèm markdown, không backtick.
Cấu trúc mẫu:
[{"type":"mcq","question":"...","options":["A. ...","B. ...","C. ...","D. ..."],"correctAnswer":"A","explanation":"..."}]

Nội dung:
"""
${text.slice(0, 20000)}
"""`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.models.gemini}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || 'Lỗi từ Gemini API');
    if (!res.ok) throw new Error(`Gemini API trả lỗi HTTP ${res.status}`);
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error('Gemini không trả về nội dung câu hỏi.');
    const clean = rawText.replace(/```json|```/g, '').trim();
    return this.validateQuestions(JSON.parse(clean));
  },

  async parseWithClaude(text, apiKey) {
    const prompt = `Trích xuất đề thi Toán thành JSON array. Giữ nguyên công thức LaTeX trong $.
Cấu trúc: [{"type":"mcq","question":"...","options":["A. ...","B. ...","C. ...","D. ..."],"correctAnswer":"A","explanation":"..."}]
Nội dung:
"""${text}"""`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: this.models.claude,
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || 'Lỗi từ Claude API');
    if (!res.ok) throw new Error(`Claude API trả lỗi HTTP ${res.status}`);
    const raw = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    const clean = raw.replace(/```json|```/g, '').trim();
    return this.validateQuestions(JSON.parse(clean));
  },

  validateQuestions(questions) {
    if (!Array.isArray(questions)) throw new Error('AI phải trả về danh sách câu hỏi.');
    const seen = new Set();
    return questions.filter(q => {
      if (!q || typeof q.question !== 'string' || !['mcq', 'truefalse', 'essay'].includes(q.type)) throw new Error('Cấu trúc câu hỏi AI không hợp lệ.');
      if (q.type === 'mcq' && (!Array.isArray(q.options) || q.options.length !== 4 || q.options.some(o => typeof o !== 'string'))) throw new Error('Câu trắc nghiệm phải có đủ bốn phương án.');
      const signature = q.question.normalize('NFC').trim().replace(/\s+/g, ' ');
      if (!signature || seen.has(signature)) return false;
      seen.add(signature);
      return true;
    });
  },

  // Smart Offline Parser using Regular Expressions & Pattern Recognition
  parseSmartOffline(text) {
    if (!text || text.trim().length < 20) {
      return [];
    }
    // Chuẩn hóa dòng
    const normalized = text.replace(/\r\n/g, '\n');

    // 1. Tách phần bảng đáp án ở cuối văn bản để tránh quét nhầm số trong đề bài hoặc trong các phương án
    let examBody = normalized;
    let answerKeySection = '';

    const keyMarkerMatch = /(?:^|\n)\s*(?:BẢNG\s+ĐÁP\s+ÁN|ĐÁP\s+ÁN|HƯỚNG\s+DẪN\s+CHẤM|PHẦN\s+ĐÁP\s+ÁN)[:\s]/i.exec(normalized);
    if (keyMarkerMatch) {
      examBody = normalized.slice(0, keyMarkerMatch.index);
      answerKeySection = normalized.slice(keyMarkerMatch.index);
    } else {
      answerKeySection = '';
    }

    const answerKeyMap = {};
    const answerKeyRegex = /(?:câu\s*)?(\d+)[\s.:\-–—=]+([A-D]|Đúng|Sai|[^\s\n,;]+)/gi;
    let match;
    while ((match = answerKeyRegex.exec(answerKeySection)) !== null) {
      const qNum = parseInt(match[1], 10);
      const val = match[2].trim();
      answerKeyMap[qNum] = val;
    }

    // 2. Bỏ qua phần văn bản trước chunk "Câu 1" / "Bài 1" đầu tiên (coi là tiêu đề/header của đề thi)
    const firstQMatch = /(?:Câu|Bài)\s+\d+[:.]/i.exec(examBody);
    if (!firstQMatch) {
      return [];
    }

    const questionsOnlyText = examBody.slice(firstQMatch.index);
    const qSplits = questionsOnlyText.split(/(?=(?:Câu|Bài)\s+\d+[:.])/i);
    const numbers = new Map();
    qSplits.forEach(chunk => {
      const match = /^(?:Câu|Bài)\s+(\d+)[:.]/i.exec(chunk.trim());
      if (match) numbers.set(Number(match[1]), (numbers.get(Number(match[1])) || 0) + 1);
    });

    const questions = [];
    let qIndex = 1;

    for (const chunk of qSplits) {
      const trimmed = chunk.trim();
      if (!trimmed || trimmed.length < 10) continue;

      // Bắt buộc chunk phải bắt đầu bằng Câu/Bài
      if (!/^(?:Câu|Bài)\s+\d+[:.]/i.test(trimmed)) continue;

      const numMatch = /^(?:Câu|Bài)\s+(\d+)[:.]/i.exec(trimmed);
      const parsedNum = numMatch ? parseInt(numMatch[1], 10) : qIndex;

      let title = trimmed;
      let opts = [];
      let type = 'mcq';
      let correct = numbers.get(parsedNum) === 1 ? answerKeyMap[parsedNum] || '' : '';

      // Tách phần thân câu hỏi (loại bỏ tiền tố Câu X:)
      let bodyWithoutHeader = trimmed.replace(/^(?:Câu|Bài)\s+\d+[:.]\s*/i, '').trim();
      const solutionIndex = bodyWithoutHeader.search(/Lời\s+giải|Hướng\s+dẫn\s+giải/i);
      let explanation = '';
      if (solutionIndex !== -1) {
        explanation = bodyWithoutHeader.slice(solutionIndex);
        bodyWithoutHeader = bodyWithoutHeader.slice(0, solutionIndex).trim();
        const inline = /(?:Chọn\s+(?:đáp\s+án\s+)?|Đáp\s+án\s+là\s+)([A-D])\b/i.exec(explanation);
        if (inline) correct = inline[1].toUpperCase();
      }

      // Kiểm tra các lựa chọn A, B, C, D
      const optA = bodyWithoutHeader.search(/\bA[.)]\s*/);
      const optB = bodyWithoutHeader.search(/\bB[.)]\s*/);
      const optC = bodyWithoutHeader.search(/\bC[.)]\s*/);
      const optD = bodyWithoutHeader.search(/\bD[.)]\s*/);

      if (optA !== -1 && optB > optA && optC > optB && optD > optC) {
        title = bodyWithoutHeader.slice(0, optA).trim();
        const aText = (optB > optA) ? bodyWithoutHeader.slice(optA, optB).trim() : '';
        const bText = (optC > optB) ? bodyWithoutHeader.slice(optB, optC).trim() : (optD > optB ? bodyWithoutHeader.slice(optB, optD).trim() : bodyWithoutHeader.slice(optB).trim());
        const cText = (optC !== -1 && optD > optC) ? bodyWithoutHeader.slice(optC, optD).trim() : (optC !== -1 ? bodyWithoutHeader.slice(optC).trim() : '');
        const dText = (optD !== -1) ? bodyWithoutHeader.slice(optD).trim() : '';

        if (aText) opts.push(aText);
        if (bText) opts.push(bText);
        if (cText) opts.push(cText);
        if (dText) opts.push(dText);

        type = 'mcq';
        if (correct && /^[a-d]$/i.test(correct)) {
          correct = correct.toUpperCase();
        }
      } else {
        // Kiểm tra phân loại Đúng/Sai: CÓ cấu trúc liệt kê rõ ràng ngay sau phần thân
        const tfPattern = /(?:[\r\n]|\s{2,})(?:(?:A[.)\s]+)?Đúng[.)\s]+(?:B[.)\s]+)?Sai|(?:A[.)\s]+)?Sai[.)\s]+(?:B[.)\s]+)?Đúng|Đúng\s*[./–-]\s*Sai|Sai\s*[./–-]\s*Đúng|Đúng\.\s*Sai\.)(?:\s*$|\s*[\r\n])/i;
        const tfInlinePattern = /(?:^|[\r\n\s])(?:Đúng\.\s*Sai\.|Đúng\s*\/\s*Sai|\[\s*\]\s*Đúng\s*\[\s*\]\s*Sai)(?:\s*$)/i;

        if (tfPattern.test(bodyWithoutHeader) || tfInlinePattern.test(bodyWithoutHeader)) {
          type = 'truefalse';
          opts = ['Đúng', 'Sai'];
          title = bodyWithoutHeader
            .replace(tfPattern, '')
            .replace(tfInlinePattern, '')
            .trim();

          if (!correct) {
            correct = '';
          } else {
            correct = /sai|f/i.test(correct) ? 'Sai' : 'Đúng';
          }
        } else {
          type = 'essay';
          title = bodyWithoutHeader;
        }
      }

      if (title.length > 5) {
        questions.push({
          id: parsedNum,
          type,
          question: title,
          options: opts.length ? opts : (type === 'mcq' ? ['A. ', 'B. ', 'C. ', 'D. '] : (type === 'truefalse' ? ['Đúng', 'Sai'] : [])),
          correctAnswer: correct,
          explanation
        });
        qIndex++;
      }
    }

    return questions;
  }
};

if (typeof window !== 'undefined') {
  window.PdfExtractor = PdfExtractor;
}
