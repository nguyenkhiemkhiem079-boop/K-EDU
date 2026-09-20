const STIMULUS_BOUNDARY = /(?:Dựa vào (?:các )?(?:thông tin|đoạn văn|đoạn trích|bảng|biểu đồ|hình)|Đọc (?:đoạn văn|đoạn trích)|Sử dụng (?:thông tin|dữ liệu)|Cho (?:bảng|biểu đồ|hình)|Trả lời (?:các )?câu hỏi? từ)/iu;
const DEPENDENCY = /(?:đoạn văn trên|đoạn trích trên|văn bản trên|thông tin trên|dữ liệu trên|bảng(?: số liệu)? trên|hình(?: vẽ)? trên|biểu đồ trên|sơ đồ trên|theo đoạn văn|theo đoạn trích|theo văn bản|theo thông tin|theo bảng|theo biểu đồ|theo hình|according to the passage|according to the text|according to the information|according to the table|according to the chart|according to the figure|passage above|table above|chart above|figure above)/iu;
const MALFORMED = /^(?:\s*(?:\(TAQ Education\)\s*)?(?:Đáp án\s*[A-D]|Đáp án\s*:|Lời giải|Hướng dẫn giải|Phương pháp giải|Solution(?:\s+[A-D])?|Answer\s*[A-D]|Chọn đáp án|Ta xét các đáp án|Xét phương án))/iu;

// PDF math extraction can produce private-use glyphs from Symbol/embedded fonts
// instead of the visible character. These checks deliberately fail closed: a
// questionable record is quarantined for source review rather than repaired by
// guessing what a glyph was meant to represent.
const PRIVATE_USE_GLYPH = /[\uE000-\uF8FF]/u;
const REPLACEMENT_GLYPH = /\uFFFD/u;
const CONTROL_GLYPH = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u;
const MATH_OPERATOR = /[=+\-−×÷*/^<>≤≥∞π∫√∑∏→↔()[\]{}|]/u;
const MATH_FUNCTION = /\blim\b/iu;

function hasPrivateUseGlyphs(value) {
  return PRIVATE_USE_GLYPH.test(String(value ?? ''));
}

function hasCorruptedMathGlyphs(value) {
  const text = String(value ?? '');
  return hasPrivateUseGlyphs(text) || REPLACEMENT_GLYPH.test(text) || CONTROL_GLYPH.test(text);
}

function hasBrokenMathLayout(value) {
  const text = String(value ?? '');
  if (!text || (!MATH_OPERATOR.test(text) && !MATH_FUNCTION.test(text))) return false;

  // A PDF extraction that stacks numerator/denominator or cases vertically
  // leaves several very short logical lines. Normal prose does not match this
  // shape, so it is a high-signal quarantine condition.
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const shortLines = lines.filter(line => line.length <= 3);
  if (shortLines.length >= 3) return true;

  return /(?:\d+\s*\n\s*\d+\s*\n\s*[A-Za-z]|[A-Za-z]\s*\n\s*[=+\-−]\s*\n\s*\d+)/u.test(text);
}

function fieldText(question, field) {
  const value = question?.[field];
  return Array.isArray(value) ? value.join('\n') : String(value ?? '');
}

function getMathExtractionIssues(question) {
  const byField = {};
  const fields = ['question', 'options', 'stimulus', 'explanation'];
  for (const field of fields) {
    const value = fieldText(question, field);
    const issues = [];
    if (hasPrivateUseGlyphs(value)) issues.push('MATH_PRIVATE_USE_GLYPH');
    if (hasCorruptedMathGlyphs(value)) issues.push('MATH_GLYPH_CORRUPTION');
    if (hasBrokenMathLayout(value)) {
      issues.push('MATH_LAYOUT_CORRUPTION', 'MATH_FORMULA_EXTRACTION_FAILED');
    }
    if (issues.length) byField[field] = [...new Set(issues)];
  }

  const codes = [...new Set(Object.values(byField).flat())];
  const result = [...codes];
  result.codes = codes;
  result.byField = byField;
  result.fields = Object.keys(byField);
  result.studentVisible = ['question', 'options', 'stimulus'].some(field => byField[field]?.length);
  result.explanationOnly = !result.studentVisible && Boolean(byField.explanation?.length);
  return result;
}

function getContentEncodingIssues(question) {
  const issues = getMathExtractionIssues(question);
  // Formula layout heuristics are intentionally restricted to Math. Other
  // sections can contain ordinary prose line breaks that are not evidence of
  // a broken formula, while glyph/control corruption remains unsafe anywhere
  // in the V-ACT bank.
  if (question?.section !== 'math') {
    const filteredCodes = issues.codes.filter(code => !['MATH_LAYOUT_CORRUPTION', 'MATH_FORMULA_EXTRACTION_FAILED'].includes(code));
    const filteredByField = {};
    for (const [field, fieldIssues] of Object.entries(issues.byField || {})) {
      const kept = fieldIssues.filter(code => !['MATH_LAYOUT_CORRUPTION', 'MATH_FORMULA_EXTRACTION_FAILED'].includes(code));
      if (kept.length) filteredByField[field] = kept;
    }
    const result = [...filteredCodes];
    result.codes = filteredCodes;
    result.byField = filteredByField;
    result.fields = Object.keys(filteredByField);
    result.studentVisible = ['question', 'options', 'stimulus'].some(field => filteredByField[field]?.length);
    result.explanationOnly = !result.studentVisible && Boolean(filteredByField.explanation?.length);
    return result;
  }
  return issues;
}

function stripOptionLabel(value) {
  return String(value ?? '').replace(/^\s*(?:\[[A-D]\]|[A-D])\s*(?:[.:)]|[-–—])\s+/i, '').trim();
}
function stripKnownPublisherNoise(value) {
  return String(value ?? '').replace(/^\s*(?:\(TAQ Education\)|TAQ Education)\s*/iu, '').trim();
}
function isMalformedQuestionText(value) { return MALFORMED.test(stripKnownPublisherNoise(value)); }
function isPlaceholderStimulus(value) {
  if (!value || typeof value !== 'string') return true;
  const s = value.replace(/\s+/g, ' ').trim();
  if (s.length < 80) return true;
  return /^(?:Dựa vào|Đọc|Sử dụng|Cho)\s+(?:các?\s+)?(?:thông tin|đoạn|dữ liệu|bảng|biểu đồ|hình)[^.!?]{0,180}(?:dưới đây|sau đây|trên)?[^.!?]*$/iu.test(s);
}
function questionRequiresStimulus(question, stimulus) { return DEPENDENCY.test(String(question || '')) || (STIMULUS_BOUNDARY.test(String(stimulus || '')) && isPlaceholderStimulus(stimulus)); }
function questionRequiresVisual(question, stimulus) { return /(?:\bhình(?: vẽ)?\b|\bbiểu đồ\b|\bđồ thị\b|\bsơ đồ\b|\bbảng số liệu\b|\bchart\b|\bfigure\b|\btable\b)/iu.test(`${question || ''} ${stimulus || ''}`); }
function hasActualStimulusContent(stimulus) { return !isPlaceholderStimulus(stimulus); }
function hasCriticalOptionSpillover(value) { return STIMULUS_BOUNDARY.test(String(value || '')) || /(?:Câu|Question|Bài)\s+\d+\s*[:.]/iu.test(String(value || '')); }
function splitTrailingContent(value) {
  const text = String(value || '');
  const re = /(?:\s+|^)(?=(?:Dựa vào|Đọc|Sử dụng|Cho (?:bảng|biểu đồ|hình)|Trả lời (?:các )?câu hỏi? từ|PHẦN\s|TIẾNG VIỆT\b|TIẾNG ANH\b|TOÁN HỌC\b|TƯ DUY LOGIC\b|SUY LUẬN KHOA HỌC\b|(?:Câu|Question|Bài)\s+\d+\s*[:.]))/iu;
  const m = re.exec(text);
  return m ? { head: text.slice(0, m.index).trim(), trailingContent: text.slice(m.index).trim() } : { head: text.trim(), trailingContent: '' };
}
module.exports = {
  STIMULUS_BOUNDARY,
  stripOptionLabel,
  stripKnownPublisherNoise,
  isMalformedQuestionText,
  isPlaceholderStimulus,
  questionRequiresStimulus,
  questionRequiresVisual,
  hasActualStimulusContent,
  hasCriticalOptionSpillover,
  splitTrailingContent,
  hasPrivateUseGlyphs,
  hasCorruptedMathGlyphs,
  hasBrokenMathLayout,
  getMathExtractionIssues,
  getContentEncodingIssues
};
