/**
 * K-EDU V-ACT Difficulty Estimator (heuristic, v1)
 *
 * WHY THIS EXISTS:
 * Every question ingested so far has difficulty: null ("unclassified") —
 * tools/vact-ingestion/normalize_questions.js never set a real value. This
 * means the "balanced difficulty" selection logic already built into
 * sectionTestGenerator.js has nothing to balance: 100% of the 708 live
 * production questions are unclassified, so every generated exam is
 * effectively random with no actual difficulty curve.
 *
 * THIS IS A HEURISTIC, NOT A VERIFIED LABEL.
 * There is no ground-truth difficulty data anywhere in this bank (no
 * skill/level metadata survived ingestion). Rather than inventing
 * confident-looking labels from nothing, this estimator:
 *   1. Computes an explainable complexity SCORE per question from
 *      observable signals (text length, presence of a reading
 *      stimulus/passage, option length, Math advanced-topic keywords).
 *   2. Buckets each SECTION's questions into three roughly-equal tiers
 *      (easy/medium/hard) by that score, RELATIVE to other questions in
 *      the same section — not against any external, verified standard.
 *   3. Tags every estimated record with `difficultySource: 'heuristic_v1'`
 *      so it is always distinguishable from a real, human-verified label
 *      (which would use `difficultySource: 'reviewed'`).
 *
 * This activates the dormant balanced-difficulty feature with a
 * best-effort approximation. It should be treated as a starting point,
 * not a substitute for actual teacher/reviewer calibration — see
 * data/vact/review-required.json for the bigger, more urgent content gap.
 */

const fs = require('fs');
const path = require('path');

const MATH_ADVANCED_KEYWORDS = [
  'tích phân', 'đạo hàm', 'giới hạn', 'logarit', 'mũ', 'phức', 'nguyên hàm',
  'bất phương trình', 'hệ phương trình', 'cấp số', 'xác suất', 'tổ hợp',
  'hoán vị', 'chỉnh hợp', 'khối đa diện', 'thể tích', 'mặt cầu', 'vectơ'
];

const MATH_BASIC_KEYWORDS = [
  'cộng', 'trừ', 'nhân', 'chia', 'tính giá trị', 'tìm x', 'phương trình bậc nhất'
];

/**
 * Computes an explainable, section-agnostic complexity score for one
 * question. Higher = estimated to be more complex/difficult.
 */
function computeComplexityScore(q) {
  const questionText = (q.question || '').toLowerCase();
  const stimulusText = (q.stimulus || '');
  const optionsText = (q.options || []).join(' ');
  let score = 0;

  // Signal 1: overall reading load (question + stimulus + options length)
  score += questionText.length * 1.0;
  score += stimulusText.length * 1.5; // a reading passage adds more load than question text alone
  score += optionsText.length * 0.3;

  // Signal 2: presence of a stimulus/passage at all is a strong complexity
  // signal on its own (implies comprehension, not just recall)
  if (stimulusText && stimulusText.trim().length > 0) score += 150;

  // Signal 3 (Math only): advanced vs. basic topic keywords
  if (q.section === 'math') {
    const advancedHits = MATH_ADVANCED_KEYWORDS.filter(kw => questionText.includes(kw)).length;
    const basicHits = MATH_BASIC_KEYWORDS.filter(kw => questionText.includes(kw)).length;
    score += advancedHits * 80;
    score -= basicHits * 40;
  }

  // Signal 4: number of options beyond the standard 4 (e.g. multi-select,
  // or options that themselves contain sub-clauses) adds complexity
  const avgOptionLength = (q.options || []).length
    ? optionsText.length / q.options.length
    : 0;
  score += avgOptionLength * 0.5;

  return Math.max(0, score);
}

/**
 * Buckets an array of {id, score} into tertiles -> 'easy' | 'medium' | 'hard'.
 * Ties at a boundary are resolved by original array order (stable).
 */
function bucketIntoTertiles(scored) {
  const sorted = [...scored].sort((a, b) => a.score - b.score);
  const n = sorted.length;
  const result = new Map();
  sorted.forEach((item, i) => {
    const percentile = n > 1 ? i / (n - 1) : 0;
    const level = percentile < (1 / 3) ? 'easy' : percentile < (2 / 3) ? 'medium' : 'hard';
    result.set(item.id, level);
  });
  return result;
}

function estimateDifficulty(questions) {
  const bySection = new Map();
  questions.forEach(q => {
    if (!bySection.has(q.section)) bySection.set(q.section, []);
    bySection.get(q.section).push(q);
  });

  const assignments = new Map();
  for (const [section, qs] of bySection) {
    const scored = qs.map(q => ({ id: q.id, score: computeComplexityScore(q) }));
    const buckets = bucketIntoTertiles(scored);
    for (const [id, level] of buckets) assignments.set(id, level);
  }

  return questions.map(q => {
    // Never overwrite a real, human-verified label if one ever exists.
    if (q.difficultySource === 'reviewed' && q.difficulty) return q;
    return {
      ...q,
      difficulty: assignments.get(q.id) || 'medium',
      difficultySource: 'heuristic_v1'
    };
  });
}

function main() {
  const dataDir = path.resolve(__dirname, '..', '..', 'data', 'vact');
  const questionsPath = path.join(dataDir, 'questions.json');
  const questions = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));

  const updated = estimateDifficulty(questions);

  const summary = {};
  updated.forEach(q => {
    summary[q.section] = summary[q.section] || { easy: 0, medium: 0, hard: 0 };
    summary[q.section][q.difficulty]++;
  });

  fs.writeFileSync(questionsPath, JSON.stringify(updated, null, 2) + '\n');
  console.log('Đã ước lượng độ khó (heuristic_v1) cho', updated.length, 'câu hỏi.');
  console.log(JSON.stringify(summary, null, 2));
  console.log('\n⚠️  Đây là ước lượng dựa trên độ dài văn bản / từ khóa, KHÔNG phải nhãn đã được con người kiểm chứng.');
  console.log('    Mỗi câu đều có difficultySource: "heuristic_v1" để phân biệt với nhãn đã duyệt ("reviewed").');
}

if (require.main === module) {
  main();
}

module.exports = { computeComplexityScore, bucketIntoTertiles, estimateDifficulty };
