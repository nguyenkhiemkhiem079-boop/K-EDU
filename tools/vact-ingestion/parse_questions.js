const fs = require('fs');
const quality = require('./content_quality');

/**
 * Parses individual questions from extracted document pages.
 * @param {Object} docData - output from extractDocument
 * @param {Object} sourceRecord - record from source-manifest
 * @returns {Array<Object>} list of raw parsed questions
 */
function parseQuestions(docData, sourceRecord) {
  const pages = docData.pages;
  const questions = [];

  // Build combined text with page boundary markers
  let fullDocText = '';
  const pageOffsets = []; // { pageNum, startChar, endChar }

  for (const p of pages) {
    const startChar = fullDocText.length;
    fullDocText += p.text + '\n';
    pageOffsets.push({
      pageNum: p.pageNum,
      startChar,
      endChar: fullDocText.length
    });
  }

  function getPageForOffset(offset) {
    const found = pageOffsets.find(po => offset >= po.startChar && offset < po.endChar);
    return found ? found.pageNum : (pageOffsets[0] ? pageOffsets[0].pageNum : 1);
  }

  // Regex to match question markers:
  // "Câu 1:", "Câu 1.", "Câu 1 :", "Question 1:", "Bài 1:"
  const qMarkerRegex = /(?:^|\n)\s*(?:Câu|Question|Bài)\s+(\d+)\s*[:.]/gim;

  const matches = [];
  const examHeaders = [];
  const headerRegex = /(?:^|\n)\s*(?:ĐỀ(?:\s+SỐ)?|ĐỀ THI|TEST|MOCK TEST)\s*(\d+)\b/giu;
  let hm;
  while ((hm = headerRegex.exec(fullDocText)) !== null) examHeaders.push({ index: hm.index, set: Number(hm[1]) || 1 });
  let m;
  while ((m = qMarkerRegex.exec(fullDocText)) !== null) {
    matches.push({
      qNum: parseInt(m[1], 10),
      index: m.index + (m[0].startsWith('\n') ? 1 : 0),
      markerLen: m[0].length
    });
  }
  const questionNumberCounts = new Map();
  for (const match of matches) questionNumberCounts.set(match.qNum, (questionNumberCounts.get(match.qNum) || 0) + 1);

  if (matches.length === 0) {
    return questions;
  }

  // Keep track of active stimulus (shared reading passage)
  let currentStimulus = null;
  let pendingStimulus = null;
  let stimulusUntilQNum = 0;

  for (let i = 0; i < matches.length; i++) {
    const cur = matches[i];
    const next = matches[i + 1];
    const rawChunk = fullDocText.slice(cur.index, next ? next.index : undefined);
    const sourcePage = getPageForOffset(cur.index);

    // Look for stimulus in text right before this question
    const prevEnd = i === 0 ? 0 : (matches[i - 1].index + 20);
    const leadText = fullDocText.slice(prevEnd, cur.index).trim();

    const stimulusMatch = leadText.match(/(?:Đọc|Dựa vào|Cho)\s+(?:đoạn trích|thông tin|bảng số liệu|biểu đồ|ngữ liệu)[\s\S]{10,2000}?(?:trả lời|cho biết)(?:[\s\S]{0,80}?(?:từ\s+câu|câu)\s+(\d+)\s*(?:đến|-)\s*(\d+))?/i);
    if (stimulusMatch) {
      currentStimulus = stimulusMatch[0].trim();
      if (stimulusMatch[2]) {
        stimulusUntilQNum = parseInt(stimulusMatch[2], 10);
      } else {
        stimulusUntilQNum = cur.qNum + 4;
      }
    } else if (cur.qNum > stimulusUntilQNum) {
      currentStimulus = null;
    }

    const parsed = parseQuestionChunk(rawChunk, cur.qNum);
    const effectiveStimulus = pendingStimulus && (quality.isPlaceholderStimulus(currentStimulus) || !currentStimulus) ? pendingStimulus : (currentStimulus || pendingStimulus);
    if (pendingStimulus && cur.qNum > stimulusUntilQNum) pendingStimulus = null;
    if (parsed) {
      if (parsed.trailingContent) {
        pendingStimulus = parsed.trailingContent;
        const range = parsed.trailingContent.match(/(?:câu|question)\s+(\d+)\s*(?:đến|-|–)\s*(\d+)/iu);
        stimulusUntilQNum = range ? Number(range[2]) : cur.qNum + 4;
      }
      questions.push({
        questionNumber: cur.qNum,
        sourcePage,
        rawChunk,
        stimulus: effectiveStimulus,
        ...parsed
      });
      questions[questions.length - 1].parseDiagnostics = {
        duplicateQuestionNumber: (questionNumberCounts.get(cur.qNum) || 0) > 1,
        optionCount: Array.isArray(parsed.options) ? parsed.options.length : 0,
        sourcePage: Number.isInteger(sourcePage) && sourcePage > 0 ? sourcePage : null
      };
      const header = [...examHeaders].reverse().find(h => h.index <= cur.index);
      const setIndex = header?.set || 1;
      questions[questions.length - 1].examSetIndex = setIndex;
      questions[questions.length - 1].examSetId = `vact_exam_${sourceRecord.sourceId}${examHeaders.length ? `_set_${String(setIndex).padStart(3, '0')}` : ''}`;
    }
  }

  return questions;
}

/**
 * Robustly extracts question body, options A-D, and solution text from a raw text chunk.
 * Handles both multiline and inline option formatting (e.g. A. ... B. ... C. ... D. ...).
 */
function parseQuestionChunk(chunk, qNum) {
  let content = chunk.replace(/^(?:Câu|Question|Bài)\s+\d+\s*[:.]\s*/i, '').trim();

  // Try multiline first
  let optRegex = /(?:^|\n)\s*([A-D])\s*[.:)]\s*/g;
  let optMatches = [];
  let om;
  while ((om = optRegex.exec(content)) !== null) {
    optMatches.push({
      label: om[1].toUpperCase(),
      index: om.index + (om[0].startsWith('\n') ? 1 : 0),
      len: om[0].length
    });
  }

  const hasABCD = (list) => {
    const idxA = list.findIndex(o => o.label === 'A');
    const idxB = list.findIndex(o => o.label === 'B' && o.index > (list[idxA]?.index || 0));
    const idxC = list.findIndex(o => o.label === 'C' && o.index > (list[idxB]?.index || 0));
    const idxD = list.findIndex(o => o.label === 'D' && o.index > (list[idxC]?.index || 0));
    return idxA !== -1 && idxB !== -1 && idxC !== -1 && idxD !== -1;
  };

  // If not all 4 in multiline, try inline options
  if (!hasABCD(optMatches)) {
    optRegex = /(?:^|\n|[\s\t]{2,}|\.\s+|\b)\s*([A-D])\s*[.:)]\s*/g;
    optMatches = [];
    while ((om = optRegex.exec(content)) !== null) {
      optMatches.push({
        label: om[1].toUpperCase(),
        index: om.index,
        len: om[0].length
      });
    }
  }

  let questionText = '';
  let options = [];
  let solutionText = '';
  let explicitAnswer = null;
  let textD = '';

  if (hasABCD(optMatches)) {
    const idxA = optMatches.findIndex(o => o.label === 'A');
    const idxB = optMatches.findIndex(o => o.label === 'B' && o.index > optMatches[idxA].index);
    const idxC = optMatches.findIndex(o => o.label === 'C' && o.index > optMatches[idxB].index);
    const idxD = optMatches.findIndex(o => o.label === 'D' && o.index > optMatches[idxC].index);

    questionText = content.slice(0, optMatches[idxA].index).trim();
    const textA = content.slice(optMatches[idxA].index + optMatches[idxA].len, optMatches[idxB].index).trim();
    const textB = content.slice(optMatches[idxB].index + optMatches[idxB].len, optMatches[idxC].index).trim();
    const textC = content.slice(optMatches[idxC].index + optMatches[idxC].len, optMatches[idxD].index).trim();
    const afterD = content.slice(optMatches[idxD].index + optMatches[idxD].len);

    const solMarkerMatch = afterD.match(/(?:^|\n)\s*(?:Đáp án(?:\s+đúng\s+là|\s*:|\s+là)|Hướng dẫn giải|Phương pháp giải|Lời giải)[\s\S]*/i);
    const boundary = findTrailingContentBoundary(afterD);
    if (solMarkerMatch) {
      textD = afterD.slice(0, Math.min(solMarkerMatch.index, boundary)).trim();
      solutionText = solMarkerMatch[0].trim();
    } else {
      textD = afterD.slice(0, boundary).trim();
    }

    options = [cleanOption(textA), cleanOption(textB), cleanOption(textC), cleanOption(textD)];

    if (solutionText) {
      const ansMatch = solutionText.match(/Đáp\s*án(?:\s+đúng\s+là|\s*:|\s+là)?\s*([A-D])\b/i) ||
                       solutionText.match(/Chọn\s+([A-D])\b/i);
      if (ansMatch) {
        explicitAnswer = ansMatch[1].toUpperCase();
      }
    }
  } else {
    questionText = content;
  }

  const split = quality.splitTrailingContent(textD);
  textD = split.head;
  return {
    questionText: cleanText(questionText),
    options,
    solutionText: cleanText(solutionText),
    explicitAnswer,
    trailingContent: split.trailingContent
  };
}

// A question chunk may contain the next reading passage when PDFs omit a page break.
// Keep the passage in the following question's lead text instead of corrupting option D.
function findTrailingContentBoundary(text) {
  const boundaryPatterns = [
    /(?:\s+|^)(?:Dựa vào (?:các )?(?:thông tin|đoạn|bảng|biểu đồ|hình)[\s\S]*|Đọc (?:đoạn|bảng|biểu đồ|hình)[\s\S]*|Sử dụng (?:thông tin|dữ liệu)[\s\S]*|Trả lời (?:các )?câu hỏi? từ[\s\S]*)/iu,
    /(?:^|\n)\s*(?:Câu|Question|Bài)\s+\d+\s*[:.]/iu,
    /(?:^|\n)\s*(?:PHẦN|TIẾNG VIỆT|TIẾNG ANH|TOÁN HỌC|TƯ DUY LOGIC|SUY LUẬN KHOA HỌC)\b/iu
  ];
  let boundary = text.length;
  for (const re of boundaryPatterns) {
    const m = re.exec(text);
    if (m && m.index < boundary) boundary = m.index + (m[0].startsWith('\n') ? 1 : 0);
  }
  return boundary;
}

function cleanOption(str) {
  return str
    .replace(/^\s*(?:\[[A-D]\]|[A-D])\s*(?:[.:)]|[-–—])\s+/i, '')
    .replace(/--\s*\d+\s+of\s+\d+\s*--/gi, '')
    .replace(/GROUP:\s*GÓC ÔN THI[^\n]*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanText(str) {
  if (!str) return '';
  return str
    .replace(/--\s*\d+\s+of\s+\d+\s*--/gi, '')
    .replace(/GROUP:\s*GÓC ÔN THI[^\n]*/gi, '')
    .replace(/TÌM TÀI LIỆU FREE TẠI[^\n]*/gi, '')
    .replace(/Tài Liệu Ôn Thi Group[^\n]*/gi, '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

module.exports = {
  parseQuestions,
  cleanText,
  cleanOption,
  parseQuestionChunk,
  findTrailingContentBoundary
};
