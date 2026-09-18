# V-ACT Project — Phase 8: Student Performance Analytics Report

## 1. Executive Summary

Phase 8 elevates K-EDU's V-ACT practice from simple test generation into comprehensive, factual **Competency Analytics**. It establishes a normalized attempt persistence layer, section-by-section and skill-by-skill competency breakdowns, historical attempt tracking, accuracy trends across sequential attempts, weakness and strength identification guarded by evidence thresholds, wrong question reviews, and an integrated student performance dashboard.

Adhering strictly to measurement integrity:
- **NO official score fabrication**: No guesses or unverified scaled scores (e.g. 1200 or IRT); analytics rely exclusively on raw correct counts, total questions, percentages, and section accuracies.
- **NO guessed skills**: Questions without verified canonical taxonomy mappings are never assigned to speculative skills.
- **NO weakness declaration without evidence**: Requires configurable minimum evidence (default $\ge 5$ questions) before flagging areas needing improvement, preventing false alarms on single errors.

---

## 2. Analytics Architecture & Storage Mechanism

### 2.1 Analytics Module (`js/vact/analytics/performance.js`)
The performance analytics engine is packaged as a standard UMD module exporting:
- `recordAttempt(params)`
- `getAttempts(studentQuery)`
- `getAttemptById(attemptId, studentQuery)`
- `clearAttempts(studentQuery)`
- `computeSectionAnalytics(attempts)`
- `computeSkillAnalytics(attempts)`
- `getAttemptHistory(studentQuery, limit)`
- `computeTrends(attempts)`
- `detectStrengthsAndWeaknesses(attempts, options)`
- `getWrongQuestions(studentQuery, options)`
- `renderDashboardHtml(studentQuery)`
- `setStorageEngine(storage)`

### 2.2 Attempt Record Schema
For each completed and submitted V-ACT test session, the system records:
```javascript
{
  id: "vact_att_...",
  testId: "vact_full_1789704021...",
  mode: "full_120" | "mini_100" | "section_mini",
  profile: "vact_full" | "vact_mini_100" | null,
  section: "math" | "composite" | ...,
  skill: "algebra" | null,
  requestedCount: 120,
  generatedCount: 120,
  questionIds: ["q1", "q2", ...],
  questionSignatures: ["sig1", "sig2", ...],
  answers: { "1": "A", "2": "B", ... },
  correct: 82,
  incorrect: 30,
  unanswered: 8,
  scoreRaw: 82,
  accuracy: 68, // percentage (0-100)
  startedAt: "2026-09-18T08:00:00.000Z",
  submittedAt: "2026-09-18T10:15:00.000Z",
  duration: 8100, // seconds
  studentName: "Nguyen Van A",
  studentClass: "12A1",
  studentUid: "usr_123",
  review: [
    {
      num: 1,
      id: "q1",
      signature: "sig1",
      section: "math",
      skill: "algebra",
      difficulty: "medium",
      question: "...",
      options: ["A", "B", "C", "D"],
      correctAnswer: "A",
      given: "A",
      isCorrect: true,
      explanation: "..."
    },
    ...
  ]
}
```

### 2.3 Storage Mechanism
- **In-Memory Store**: Fast lookup and unit testing without DOM dependency.
- **Client Storage**: Persistent local storage partitioned by student identity (`vact_attempts_${studentKey}`).
- **K-EDU StorageEngine Integration**: Asynchronously synchronizes with K-EDU's central `StorageEngine` when available (`vact_attempt:${studentKey}:${attempt.id}`).
- **Pluggable Storage Provider**: Supports `setStorageEngine(custom)` for mocking or backend databases.

---

## 3. Core Analytics Capabilities

### 3.1 Section Analytics (`computeSectionAnalytics`)
- Calculates total, correct, incorrect, unanswered counts and accuracy percentages for:
  - Tiếng Việt (Language Usage - Vietnamese)
  - Tiếng Anh (Language Usage - English)
  - Toán học (Mathematics)
  - Tư duy logic & Phân tích số liệu (Logic & Data Interpretation)
  - Suy luận khoa học (Scientific Reasoning)
- **Presence Filter**: Strictly returns only sections that were present in the evaluated attempts (e.g. English is not displayed if the student took a Math Mini test).

### 3.2 Skill Analytics (`computeSkillAnalytics`)
- Maps questions against canonical V-ACT taxonomy skills:
  - **Math**: `algebra`, `geometry`, `functions`, `probability_statistics`, `real_world_math`, `data_reading`.
  - **Scientific Reasoning**: `physics`, `chemistry`, `biology`, `technology`, `economics`, `society`, `interdisciplinary`.
  - **Logic & Data**: `logical_reasoning`, `conditional_reasoning`, `pattern_reasoning`, `table_analysis`, `chart_analysis`, `data_interpretation`.
  - **Vietnamese**: `reading_comprehension`, `vocabulary`, `grammar`, `language_usage`, `literary_analysis`, `inference`.
- **Zero-Guessing Constraint**: Items with unknown, empty, or unverified skills are omitted from skill aggregates without speculation.

### 3.3 Attempt History (`getAttemptHistory`)
- Displays chronological and reverse chronological records with clear, standardized labels:
  - `Math Mini #1  18/30`
  - `Math Mini #2  22/30`
  - `Mini 100      71/100`
  - `Full V-ACT    82/120`
- Provides quick links to review mistakes.

### 3.4 Accuracy Trends (`computeTrends`)
- Calculates chronological accuracy progression across successive attempts:
  - Overall accuracy: `60% → 67% → 75% (+15%)`
  - Section-level accuracy: tracks per-section improvement over time.
- **Guard against overclaiming**: Requires $\ge 2$ attempts; returns explicit message when data is insufficient.

### 3.5 Evidence-Based Strength & Weakness Detection (`detectStrengthsAndWeaknesses`)
- **Thresholds**:
  - Strengths: Accuracy $\ge 80\%$ with $\ge 5$ questions.
  - Weaknesses: Accuracy $< 60\%$ with $\ge 5$ questions.
- **Insufficient Evidence Protection**: Any section or skill with $< 5$ questions is categorized under `insufficientEvidence` with reasons such as `"Chưa đủ bằng chứng (mới làm 3/5 câu)"`. No weakness is ever declared based on 1 question.

### 3.6 Wrong Question Review (`getWrongQuestions` & `#vactWrongQuestionsModal`)
- Filters and displays questions where `isCorrect === false` or `unanswered === true`.
- Shows:
  - Section & Skill badges
  - Question stem
  - Options with student's choice highlighted in red (`✗ Em đã chọn`) and the correct answer in green (`✓ Đáp án đúng`)
  - Full explanation and solution breakdown

---

## 4. Student Dashboard UI Additions

Integrated directly into the Student Lobby (`#vactStudentAnalyticsSection`):
1. **Tiến độ (Progress)**:
   - Đề đã luyện (Total tests completed)
   - Câu đã giải (Total questions attempted)
   - Độ chính xác TB (Average accuracy percentage)
   - Thời gian luyện (Total practice time in minutes)
2. **Tỷ lệ chính xác theo từng phần (Section Breakdown)**:
   - Cards showing correct/total and color-coded accuracy % for each active section.
3. **Điểm mạnh (Strengths $\ge 80\%$)**:
   - Highlighting topics mastered with sufficient question count.
4. **Cần cải thiện (Areas for Improvement $< 60\%$)**:
   - Concrete topics needing targeted practice (only when evidence $\ge 5$ questions).
5. **Lịch sử các bài thi gần nhất (Recent Attempts History)**:
   - Recent attempts list with direct button to open the Wrong Question Review modal.

---

## 5. Verification & Test Suite

All 9 test suites pass:
1. `tools/verify_vact_analytics.js` — Attempt persistence, schema fields, section breakdown, skill breakdown, accuracy math, history formatting, trends, weakness threshold, wrong questions review, dashboard HTML rendering.
2. `tools/verify_vact_full120.js` — Full 120 generation, 150m duration, isolation.
3. `tools/verify_vact_mini100.js` — Mini 100 generation and section boundaries.
4. `tools/verify_vact_section_generator.js` — Section mini tests and shortages.
5. `tools/verify_vact_coverage.js` — Deduplication and usable coverage.
6. `tools/verify_vact_legacy_adapter.js` — Legacy bank adapter and diagnostics.
7. `tools/verify_vact_core.js` — Core taxonomy and validator.
8. `tools/verify_runtime_regressions.js` — Grading, VM isolation, PDF parsing, rewards.
9. `tools/verify_subject_difficulty.js` — Difficulty distribution.
