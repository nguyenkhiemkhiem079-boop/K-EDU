# K-EDU V-ACT Core Architecture — Comprehensive Technical Reference

## 1. Executive Overview

The **V-ACT Architecture** within K-EDU provides a rigorous, standardized assessment platform engineered specifically for the **ĐHQG-HCM Đánh Giá Năng Lực (V-ACT)** examination. Designed across 10 progressive engineering phases, it transitions K-EDU from legacy, ad-hoc quiz generation into an authentic, competency-driven assessment, simulation, and analytics ecosystem.

---

## 2. Core Architecture Subsystems

The subsystem layout is completely modular under `js/vact/`:

```
js/vact/
├── taxonomy.js                  # Canonical 5 sections and taxonomy mappings
├── schema.js                    # Question schema, type definitions, legacy difficulty normalizer
├── profiles.js                  # Exam profiles (Mini 100, Full 120, Section Mini)
├── index.js                     # UMD unified namespace entry point
├── quality/
│   ├── signature.js             # Cryptographic question text and option signature engine
│   ├── validator.js             # Canonical schema, taxonomy, and option integrity validator
│   └── deduplicator.js          # Deterministic quality scoring and deduplication
├── bank/
│   ├── adapter.js               # Zero-mutation legacy question bank adapter
│   ├── internalBank.js          # Query engine, caching, and diagnostics for internal items
│   └── coverage.js              # Bank capacity, shortage modeling, and readiness checks
├── generator/
│   ├── sectionTestGenerator.js  # Section Mini Test generator (anti-dup, balanced difficulty)
│   └── examGenerator.js         # Composite exam generator (Mini 100, Full 120)
├── analytics/
│   └── performance.js           # Student attempt persistence, section/skill breakdowns, trends
├── sources/
│   ├── config.js                # Whitelist, security policy, and source configuration
│   ├── internalSource.js        # Internal question source implementation
│   ├── remoteJsonSource.js      # Remote authorized JSON feed ingestion with TTL cache
│   └── sourceManager.js         # Priority-based multi-source coordinator & cross-source dedupe
└── adaptive/
    └── weaknessGenerator.js     # Evidence-based weakness generator with adaptive difficulty
```

---

## 3. Taxonomy & Section Definitions (`taxonomy.js`)

V-ACT is strictly modeled into **5 core sections**:

| Section Key | Name (VI) | Standard Questions (Full 120) | Mini 100 Questions | Standard Duration |
| :--- | :--- | :---: | :---: | :---: |
| `vietnamese` | Sử dụng ngôn ngữ — Tiếng Việt | 30 | 25 | Part 1 |
| `english` | Sử dụng ngôn ngữ — Tiếng Anh | 30 | 25 | Part 2 |
| `math` | Toán học | 30 | 25 | Part 3 |
| `logic_data` | Tư duy logic & Phân tích số liệu | 12 | 10 | Part 4 |
| `scientific_reasoning` | Suy luận khoa học | 18 | 15 | Part 5 |
| **Total** | | **120 câu** | **100 câu** | **150 phút (Full) / 90 phút (Mini)** |

Skills are mapped canonically:
- **Math**: `algebra`, `functions`, `geometry`, `probability_statistics`, `real_world_math`, `data_reading`.
- **Scientific Reasoning**: `physics`, `chemistry`, `biology`, `technology`, `economics`, `society`, `interdisciplinary`.
- **Logic & Data**: `logical_reasoning`, `conditional_reasoning`, `pattern_reasoning`, `table_analysis`, `chart_analysis`, `data_interpretation`.
- **Vietnamese**: `reading_comprehension`, `vocabulary`, `grammar`, `language_usage`, `literary_analysis`, `inference`.
- **English**: `reading_comprehension`, `vocabulary`, `grammar`, `language_usage`, `communication`.

---

## 4. Question Normalization & Quality Engine (`schema.js`, `quality/`)

- **Conservative Difficulty Normalization**: Legacy Vietnamese codes (`NB`, `TH`, `VD`, `VDC`) map deterministically to `easy`, `medium`, or `hard`. The system **never invents unverified IRT scores**.
- **Cryptographic Signature (`signature.js`)**: Normalizes LaTeX delimiters, punctuation, case, and options into a deterministic string representation. Includes in-memory memoization on question objects to prevent expensive recalculations.
- **Validation (`validator.js`)**: Strictly checks ID, section validity, question stem, exactly 4 non-empty options for single-choice questions, and valid correct answer mapping.
- **Deterministic Deduplication (`deduplicator.js`)**: Evaluates duplicate variants against a strict quality scoring hierarchy (validity, answer verified, source verified, reviewed status, provenance richness) to select the single best canonical question.

---

## 5. Bank Adapter & Coverage Engine (`bank/`)

- **Zero-Mutation Adapter (`adapter.js`, `internalBank.js`)**: Adapts legacy `DocumentQuestionBank` items on-the-fly without mutating raw data.
- **Audited Coverage (`coverage.js`)**: Reports question availability based strictly on **VALID + UNIQUE + USABLE** questions:
  - Total Raw Inspected: 14,034
  - Valid & Mapped: 13,596
  - Unique Usable Questions: 13,590
  - Unsupported (Middle School): 385
  - Malformed Rejected: 53
- **Capacity & Shortage Modeling**: `checkShortage()` truthfully returns shortage diagnostics (`POOL_SHORTAGE`, `DIFFICULTY_SHORTAGE`) instead of crashing or fabricating dummy questions.

---

## 6. Exam Generators (`generator/`)

- **Section Mini Test Generator (`sectionTestGenerator.js`)**:
  - Supports practice for single sections or specific skills with no arbitrary question cap.
  - Implements anti-duplication, recent question exclusion with graceful fallback, and demand redistribution across difficulty tiers.
- **Composite Exam Generator (`examGenerator.js`)**:
  - **Mini V-ACT 100 (`VACT_MINI_100_PROFILE`)**: 100 questions, 90 minutes.
  - **Full V-ACT 120 (`VACT_FULL_PROFILE`)**: 120 questions, 150 minutes.
  - **Strict Section Isolation**: Language shortages are never masked by adding more Math questions.
  - Generates HTML exam papers with clear part headers and converts exams to K-EDU quiz records.

---

## 7. Performance Analytics & Student Dashboard (`analytics/`)

- **Attempt Persistence**: Every submitted exam is recorded with normalized metadata, raw scores, percentage accuracy, duration, answer sheet, and detailed review items.
- **No Official Score Fabrication**: Strictly outputs raw counts, percentages, and section accuracy. No fabricated 1200 scaled scores.
- **Competency Tracking**: Section-by-section breakdown (only present sections displayed) and taxonomy-verified skill competency.
- **Evidence-Based Weakness Identification**: Enforces a minimum question threshold ($\ge 5$ questions) before declaring weaknesses ($< 60\%$), preventing false alarms on 1-2 mistakes.
- **Wrong Question Review (`#vactWrongQuestionsModal`)**: Displays student choices, correct answers, and explanations.

---

## 8. External Question Sources (`sources/`)

- **Source Infrastructure Only**: Designed strictly for authorized feeds. No commercial website scraping (e.g. vn-exams.com), no paywall bypass, no unauthorized copying.
- **Security Whitelist (`config.js`)**: Restricts URLs to approved hostnames (`*.k-edu.vn`, `*.githubusercontent.com`, `localhost`) via `https:` or local file fixtures.
- **Resilient Fault Tolerance**: Network failures, timeouts, or 500 errors log `REMOTE_SOURCE_UNAVAILABLE` and fall back seamlessly to the internal bank without crashing K-EDU.
- **Multi-Tier Coverage**: Reports Internal, Remote, and Combined unique question counts.

---

## 9. Adaptive Practice & Production Hardening (`adaptive/`)

- **Weakness Test Generation (`weaknessGenerator.js`)**: Automatically identifies verified weak skills ($\ge 5$ questions, $< 60\%$ accuracy) and allocates quotas across weak topics.
- **Adaptive Difficulty**:
  - High accuracy ($> 75\%$): challenge profile (20% easy, 50% medium, 30% hard).
  - Low accuracy ($< 50\%$): reinforcement profile (50% easy, 40% medium, 10% hard).
  - Standard: balanced (30% easy, 50% medium, 20% hard).
- **Recent-Question Intelligence**: Tiers question selection into Unseen $\rightarrow$ Seen long ago $\rightarrow$ Recently seen fallback, preventing permanent pool starvation.
- **Session Recovery**: Progress during active test sessions is persisted to `localStorage` periodically, allowing students to resume if browser refresh occurs.

---

## 10. Known Limitations

1. **Bank Coverage Shortages (Internal Bank)**:
   - English: 0 questions currently in the internal bank (requires remote feed or Phase 11 bank ingestion).
   - Vietnamese: 7 questions currently in the internal bank (requires 23 additional questions for Full 120).
   - Live Full V-ACT 120 produces 67/120 questions from internal bank alone, flagged clearly with `isComplete: false`.
2. **Scoring Model**: Official ĐHQG-HCM Item Response Theory (IRT) parameter weights are not publicly disclosed; K-EDU deliberately uses factual raw scores and percentages to preserve measurement integrity.
