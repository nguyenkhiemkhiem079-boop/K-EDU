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
    const questions = [];
    // Normalize newlines
    const normalized = text.replace(/\r\n/g, '\n');

    // Split text into potential question chunks: "Câu 1:", "Câu 2.", "Bài 1:"
    const qSplits = normalized.split(/(?=(?:Câu|Bài)\s+\d+[:.])/i);

    // Look for answer keys at the bottom like: "1-A 2-B 3-C" or "1.A 2.B 3.C" or "1A 2B 3C"
    const answerKeyMap = {};
    const answerKeyRegex = /(\d+)[\s.:-]+([A-D]|Đúng|Sai|\d+)/gi;
    let match;
    while ((match = answerKeyRegex.exec(normalized)) !== null) {
      answerKeyMap[parseInt(match[1], 10)] = match[2].toUpperCase();
    }

    let qIndex = 1;
    for (const chunk of qSplits) {
      const trimmed = chunk.trim();
      if (!trimmed || trimmed.length < 10) continue;

      // Extract Question title
      let title = trimmed;
      let opts = [];
      let type = 'mcq';
      let correct = answerKeyMap[qIndex] || '';

      // Check if options A, B, C, D exist
      const optA = trimmed.search(/\bA[.)\s]/i);
      const optB = trimmed.search(/\bB[.)\s]/i);
      const optC = trimmed.search(/\bC[.)\s]/i);
      const optD = trimmed.search(/\bD[.)\s]/i);

      if (optA !== -1 && optB !== -1) {
        title = trimmed.slice(0, optA).trim();
        const rawOpts = trimmed.slice(optA);

        const aText = (optB > optA) ? trimmed.slice(optA, optB).trim() : '';
        const bText = (optC > optB) ? trimmed.slice(optB, optC).trim() : (optD > optB ? trimmed.slice(optB, optD).trim() : trimmed.slice(optB).trim());
        const cText = (optC !== -1 && optD > optC) ? trimmed.slice(optC, optD).trim() : (optC !== -1 ? trimmed.slice(optC).trim() : '');
        const dText = (optD !== -1) ? trimmed.slice(optD).trim() : '';

        if (aText) opts.push(aText);
        if (bText) opts.push(bText);
        if (cText) opts.push(cText);
        if (dText) opts.push(dText);

        type = 'mcq';
      } else if (/đúng|sai/i.test(trimmed)) {
        type = 'truefalse';
      } else {
        type = 'essay';
      }

      // Cleanup question title
      title = title.replace(/^(?:Câu|Bài)\s+\d+[:.]\s*/i, '').trim();

      if (title.length > 5) {
        questions.push({
          id: qIndex,
          type,
          question: title,
          options: opts.length ? opts : (type === 'mcq' ? ['A. ', 'B. ', 'C. ', 'D. '] : []),
          correctAnswer: correct,
          explanation: ''
        });
        qIndex++;
      }
    }

    // If parsing yielded nothing (unstructured text), create at least 1 draft item
    if (questions.length === 0) {
      questions.push({
        id: 1,
        type: 'mcq',
        question: normalized.slice(0, 150),
        options: ['A. Lựa chọn 1', 'B. Lựa chọn 2', 'C. Lựa chọn 3', 'D. Lựa chọn 4'],
        correctAnswer: 'A',
        explanation: ''
      });
    }

    return questions;
  }
};

window.PdfExtractor = PdfExtractor;
