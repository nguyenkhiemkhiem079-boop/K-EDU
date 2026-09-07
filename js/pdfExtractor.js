/**
 * KhiemEdu PDF & Question Extractor Engine
 * Extracts text from PDF files and parses questions via AI API or Smart Offline Parser.
 */

const PdfExtractor = {
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
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + '\n';
    }
    return fullText;
  },

  async parseQuestions(text, apiKey = '', provider = 'offline') {
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

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || 'Lỗi từ Gemini API');
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    const clean = rawText.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  },

  async parseWithClaude(text, apiKey) {
    const prompt = `Trích xuất đề thi Toán thành JSON array. Giữ nguyên công thức LaTeX trong $.
Cấu trúc: [{"type":"mcq","question":"...","options":["A. ...","B. ...","C. ...","D. ..."],"correctAnswer":"A","explanation":"..."}]
Nội dung:
"""${text.slice(0, 16000)}"""`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || 'Lỗi từ Claude API');
    const raw = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    const clean = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
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

    const keyMarkerMatch = /(?:BẢNG\s+ĐÁP\s+ÁN|ĐÁP\s+ÁN|HƯỚNG\s+DẪN\s+CHẤM|PHẦN\s+ĐÁP\s+ÁN)[:\s]/i.exec(normalized);
    if (keyMarkerMatch) {
      examBody = normalized.slice(0, keyMarkerMatch.index);
      answerKeySection = normalized.slice(keyMarkerMatch.index);
    } else {
      // Nếu không có từ khóa, chỉ quét trong 20% cuối văn bản
      const cutoff = Math.floor(normalized.length * 0.8);
      answerKeySection = normalized.slice(cutoff);
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
      let correct = answerKeyMap[parsedNum] || answerKeyMap[qIndex] || '';

      // Tách phần thân câu hỏi (loại bỏ tiền tố Câu X:)
      const bodyWithoutHeader = trimmed.replace(/^(?:Câu|Bài)\s+\d+[:.]\s*/i, '').trim();

      // Kiểm tra các lựa chọn A, B, C, D
      const optA = bodyWithoutHeader.search(/\bA[.)\s]/i);
      const optB = bodyWithoutHeader.search(/\bB[.)\s]/i);
      const optC = bodyWithoutHeader.search(/\bC[.)\s]/i);
      const optD = bodyWithoutHeader.search(/\bD[.)\s]/i);

      if (optA !== -1 && optB !== -1) {
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
            correct = 'Đúng';
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
          explanation: ''
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
