const STIMULUS_BOUNDARY = /(?:Dựa vào (?:các )?(?:thông tin|đoạn văn|đoạn trích|bảng|biểu đồ|hình)|Đọc (?:đoạn văn|đoạn trích)|Sử dụng (?:thông tin|dữ liệu)|Cho (?:bảng|biểu đồ|hình)|Trả lời (?:các )?câu hỏi? từ)/iu;
const DEPENDENCY = /(?:đoạn văn trên|đoạn trích trên|văn bản trên|thông tin trên|dữ liệu trên|bảng(?: số liệu)? trên|hình(?: vẽ)? trên|biểu đồ trên|sơ đồ trên|theo đoạn văn|theo đoạn trích|theo văn bản|theo thông tin|theo bảng|theo biểu đồ|theo hình|according to the passage|according to the text|according to the information|according to the table|according to the chart|according to the figure|passage above|table above|chart above|figure above)/iu;
const MALFORMED = /^(?:\s*(?:\(TAQ Education\)\s*)?(?:Đáp án\s*[A-D]|Đáp án\s*:|Lời giải|Hướng dẫn giải|Phương pháp giải|Solution(?:\s+[A-D])?|Answer\s*[A-D]|Chọn đáp án|Ta xét các đáp án|Xét phương án))/iu;

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
module.exports = { STIMULUS_BOUNDARY, stripOptionLabel, stripKnownPublisherNoise, isMalformedQuestionText, isPlaceholderStimulus, questionRequiresStimulus, questionRequiresVisual, hasActualStimulusContent, hasCriticalOptionSpillover, splitTrailingContent };
