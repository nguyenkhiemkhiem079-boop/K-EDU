# K-EDU V-ACT Phase 2: Legacy Question Bank Migration & Adapter Report

> **V-ACT Project — Phase 2: Legacy Question Bank Adapter**  
> **Date**: September 18, 2026  
> **Repository**: `nguyenkhiemkhiem079-boop/K-EDU`  
> **Architecture**: Zero-duplication adapter layer over `DocumentQuestionBank`

---

## 1. Executive Summary

Phase 2 implements the **V-ACT Legacy Question Bank Adapter** (`js/vact/bank/adapter.js` and `js/vact/bank/internalBank.js`), creating a non-destructive query and normalization pipeline. 

Crucially, **no question records were duplicated into copy files**. Instead, the adapter reads from the existing 14,034-item `DocumentQuestionBank`, applies strict eligibility rules, maps legacy taxonomy to canonical V-ACT sections and skills, normalizes schemas, verifies choice and answer integrity, and caches valid questions for sub-millisecond querying.

---

## 2. Ingestion & Migration Statistics

### Global Pipeline Breakdown
- **Total Raw Records Inspected**: **14,034**
- **Successfully Mapped & Validated**: **13,596** (96.88%)
- **Unsupported / Excluded**: **385** (Middle-school mathematics: Grades 6–9 excluded from high-school aptitude V-ACT)
- **Invalid / Malformed Rejected**: **53** (Options with empty strings, malformed choices, or missing answer keys)

### Detailed Breakdown by Legacy Source & Mapped Section

| Legacy Source / Category | Raw Inspected | Mapped Valid | Rejected / Unsupported | Mapped V-ACT Section | Assigned Skill |
| :--- | :---: | :---: | :---: | :--- | :--- |
| **`dgnl_logic`** | 364 | **362** | 2 (empty options) | `logic_data` | `logical_reasoning` |
| **`dgnl_data`** | 39 | **39** | 0 | `logic_data` | `data_interpretation` |
| **`dgnl_tiengviet`** | 7 | **7** | 0 | `vietnamese` | `language_usage` |
| **`vat_ly` (KHTN)** | 24 | **20** | 4 (empty options) | `scientific_reasoning` | `physics` |
| **`hoa_hoc` (KHTN)** | 24 | **24** | 0 | `scientific_reasoning` | `chemistry` |
| **`sinh_hoc` (KHTN)** | 24 | **24** | 0 | `scientific_reasoning` | `biology` |
| **High School Math (Grade 10–12, DGNL)** | 13,167 | **13,120** | 47 (malformed choices) | `math` | `algebra`, `functions`, `geometry`, `probability_statistics` |
| **Middle School Math (Grade 6–9)** | 385 | **0** | 385 (excluded by eligibility) | *None* | *None* |
| **English Questions** | **0** | **0** | 0 | `english` | *None* |
| **TOTAL** | **14,034** | **13,596** | **438** | — | — |

---

## 3. Scientific Reasoning Breakdown

Current scientific reasoning questions in the repository originate from GDPT 2018 KHTN modules:
- **Vật lý (Physics)**: 20 mapped (4 rejected due to empty options)
- **Hóa học (Chemistry)**: 24 mapped
- **Sinh học (Biology)**: 24 mapped
- **Total Scientific Reasoning**: **68 questions**

> [!NOTE]
> All 68 scientific reasoning questions in the current bank are middle school level (Grades 6–9 KHTN). They pass the structural validator and can be queried, but they are insufficient in difficulty for standard Grade 12 V-ACT exams. High-school science papers from `TÀI LIỆU/DGNL/` must be ingested in Phase 3.

---

## 4. Known Critical Data Gaps

1. **Tiếng Anh (English) — Zero Coverage**:
   - The repository currently contains **0 English questions**.
   - `VACTInternalBank.query({ section: 'english' })` returns `[]` cleanly and safely.
   - For a full 120-question V-ACT test (requiring 30 English questions), official English question banks or PDF extractions must be added in Phase 3.
2. **Tiếng Việt (Vietnamese) — Severe Deficit**:
   - Only **7 questions** are available in the bank. Target per full exam is 30 questions.
3. **High-School Scientific Reasoning — Severe Deficit**:
   - Only 68 middle-school questions exist; 0 high-school level physics, chemistry, or biology questions exist in the curated bank.
4. **Logic & Data Analysis — Sufficient for MVP**:
   - 401 high-quality questions mapped (362 Logic + 39 Data).
   - Can support ~33 full exams (12 questions per exam) before duplicate repetition.
5. **Mathematics — Abundant**:
   - 13,120 verified high-school questions mapped across algebra, functions, geometry, and probability.

---

## 5. Architectural Integrity & Validation Rules

1. **Zero Data Duplication**:
   - No large JSON or JS files copied. All questions remain in their original files and are adapted on-demand.
2. **Original Record Traceability**:
   - Every adapted question retains its original identifier as `legacy:<id>` and stores `source.originalId`, `source.originalGrade`, `source.originalTopic`, and `source.originalSubject`.
3. **Strict Truth in Quality Flags**:
   - `quality.sourceVerified`, `quality.answerVerified`, and `quality.reviewed` are mapped directly from `raw.curation`. No verification status is fabricated.
   - `difficultyScore` remains `null`.
4. **Multi-Criteria Querying**:
   - `VACTInternalBank.query({ section, skill, difficulty, limit })` supports single or compound filters with automatic rejection of malformed records.

---
*Migration audit complete for Phase 2.*
