# K-EDU V-ACT Phase 0 Audit

> **V-ACT Project — Phase 0: Current System Audit**  
> **Date**: September 18, 2026  
> **Repository**: `nguyenkhiemkhiem079-boop/K-EDU`  
> **Target System**: V-ACT / Đánh Giá Năng Lực Đại học Quốc gia TP.HCM (ĐHQG-HCM)

---

## Executive Summary

This document performs an exhaustive audit of the existing Đánh Giá Năng Lực (DGNL) implementation in the K-EDU repository prior to the architectural rollout of the new **V-ACT Exam Engine**. 

The target V-ACT specification is the official 120-question, 150-minute model across 5 balanced sections:
1. **Tiếng Việt (Vietnamese)**: 30 câu
2. **Tiếng Anh (English)**: 30 câu
3. **Toán học (Math)**: 30 câu
4. **Tư duy logic & Phân tích số liệu (Logic & Data)**: 12 câu
5. **Suy luận khoa học (Scientific Reasoning)**: 18 câu (Vật lý, Hóa học, Sinh học)

Currently, K-EDU's DGNL implementation is legacy, tightly coupled to the high-school Math generator (`mathGenerator.js`), assumes a 100-question Mini / 200-question Full model, lacks English completely, possesses only 7 curated Vietnamese questions, and has 0 high-school level science reasoning questions.

---

## 1. Current Architecture

The current DGNL ecosystem in K-EDU is split between synthetic template generation in the math engine and real extracted document questions:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                             Teacher Workspace                            │
│                        (index.html / js/app.js)                          │
└───────────────┬──────────────────────────────────────────┬───────────────┘
                │                                          │
                ▼                                          ▼
┌───────────────────────────────┐          ┌───────────────────────────────┐
│     MathEngine Generator      │          │     Document Question Bank    │
│     (js/mathGenerator.js)     │          │ (js/documentQuestionBank.js)  │
├───────────────────────────────┤          ├───────────────────────────────┤
│ - MathEngine.generateDgnlExam │          │ - 14,034 total questions      │
│ - GradeEngines.getDgnlTemplates│         │ - 413 Grade 'DGNL' questions  │
│ - 24 Synthetic Templates      │          │ - Split across 14 chunks      │
│ - Mini 100 (90 min)           │          │ - Extracted from raw PDFs     │
│ - Full 200 (150 min)          │          │   via tools/extract-questions │
└───────────────────────────────┘          └───────────────────────────────┘
```

### Key Architectural Characteristics:
1. **Synthetic Generation Dominance**: `MathEngine.generateDgnlExam` synthesizes questions using purely numeric variations across 24 fixed algorithmic templates (8 quantitative, 8 logic, 8 data analysis). It completely lacks linguistic (Vietnamese/English) and scientific comprehension.
2. **Subservience to Math Generator**: In `index.html`, DGNL is merely a secondary tab (`tabMathModeDgnl`) within the "Bộ Đề Toán Tự Động" panel rather than an independent exam system.
3. **Dual Package Architecture (Mini 100 vs Full 200)**:
   - Mini 100: 100 questions, 90 minutes (40 Math, 30 Logic, 30 Data Analysis).
   - Full 200: 200 questions, 150 minutes (80 Math, 60 Logic, 60 Data Analysis).
   - *Note*: Neither corresponds to the official ĐHQG-HCM V-ACT 120-question format.
4. **Student Experience Disconnection**: The student exam taker (`js/app.js`) consumes quizzes indiscriminately through generic quiz objects. There is no section navigation, passage-based grouping, or per-section timing designed specifically for V-ACT students.

---

## 2. Existing DGNL Functions

Below is an audit of all key functions in the codebase related to DGNL generation, document ingestion, and formatting:

| Function Name | File Path | Purpose | Dependencies | Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| `MathEngine.generateDgnlExam(config)` | [`js/mathGenerator.js`](file:///c:/Users/khiem.nguyen/Documents/GitHub/K-EDU/js/mathGenerator.js#L2371) | Main entry point for generating synthetic DGNL exams (Mini 100 or Full 200). Uses fixed ratios (40% math, 30% logic, 30% data). | `GradeEngines.getDgnlTemplates`, `pickUniqueQuestions`, `normalizeDgnlType` | **DEPRECATE / REPLACE** with dedicated V-ACT engine supporting the 5 standard sections. |
| `GradeEngines.getDgnlTemplates(type, level)` | [`js/mathGenerator.js`](file:///c:/Users/khiem.nguyen/Documents/GitHub/K-EDU/js/mathGenerator.js#L2251) | Returns 24 algorithmic question generator functions across `quant`, `logic`, `data`. | Math utility helpers, `seedrandom` | **REUSE** for adaptive practice & synthetic fallback in Math and Logic/Data sections. |
| `normalizeDgnlType(rawType)` | [`js/mathGenerator.js`](file:///c:/Users/khiem.nguyen/Documents/GitHub/K-EDU/js/mathGenerator.js#L2354) | Maps arbitrary strings to `quant`, `logic`, or `data`. | None | **ADAPT** to map V-ACT section IDs (`vietnamese`, `english`, `math`, `logic_data`, `scientific_reasoning`). |
| `switchMathGenMode(mode)` | [`js/app.js`](file:///c:/Users/khiem.nguyen/Documents/GitHub/K-EDU/js/app.js#L2275) | Toggles UI state between Standard SGK Math generator (`standard`) and DGNL mode (`dgnl`). | DOM elements (`mathGenStandardPanel`, `mathGenDgnlPanel`, etc.) | **ADAPT** to separate V-ACT into a standalone first-class module while keeping legacy toggle intact. |
| `selectDgnlPackage(pkg)` | [`js/app.js`](file:///c:/Users/khiem.nguyen/Documents/GitHub/K-EDU/js/app.js#L2308) | Selects package `'mini100'` or `'full200'` and updates UI badges and time limits. | DOM elements (`dgnlPkgMini100Btn`, `dgnlPkgFull200Btn`) | **DEPRECATE** in favor of V-ACT 120 and targeted Section Mini Tests. |
| `triggerAutoGenerateDgnlExam()` | [`js/app.js`](file:///c:/Users/khiem.nguyen/Documents/GitHub/K-EDU/js/app.js#L2347) | Reads teacher form controls, calls `MathEngine.generateDgnlExam`, registers the quiz in storage, and refreshes the UI. | `MathEngine.generateDgnlExam`, `state.quizzes`, `saveAppState` | **ADAPT** into `triggerAutoGenerateVactExam()` supporting section balance and document question retrieval. |
| `previewDgnlExamDocument()` | [`js/app.js`](file:///c:/Users/khiem.nguyen/Documents/GitHub/K-EDU/js/app.js#L2497) | Generates a printable LaTeX/HTML paper test with answer keys and solutions. | `renderMathInElement`, print styles | **REUSE** for V-ACT paper test export and print preview. |
| `renderDgnlCuratedSection()` | [`js/app.js`](file:///c:/Users/khiem.nguyen/Documents/GitHub/K-EDU/js/app.js#L2540) | Renders statistics of DGNL questions in the question bank manager. | `DocumentQuestionBank` | **ADAPT** into a comprehensive 5-section V-ACT Bank Coverage dashboard. |
| `mathQuestionSignature(text)` | [`js/mathGenerator.js`](file:///c:/Users/khiem.nguyen/Documents/GitHub/K-EDU/js/mathGenerator.js#L355) | Computes normalized signature for question text to detect duplicate content. | String normalization regex | **KEEP / REUSE** across all V-ACT banks. |
| `extractQuestionsFromPdf(file)` | [`tools/extract-questions.js`](file:///c:/Users/khiem.nguyen/Documents/GitHub/K-EDU/tools/extract-questions.js#L80) | Parses exam PDFs using regex to extract question blocks, answers, and solutions. | `pdf-parse` | **ADAPT** to fix hardcoded `subject: "toan"` and correctly tag Vietnamese, English, and Science. |

---

## 3. Existing UI

### Teacher-Facing UI
- **Location**: Located inside `#teacherMathGeneratorModal` in [`index.html`](file:///c:/Users/khiem.nguyen/Documents/GitHub/K-EDU/index.html#L975).
- **Navigation**: Secondary tab buttons `#tabMathModeStandard` and `#tabMathModeDgnl`.
- **DGNL Control Panel (`#mathGenDgnlPanel`)**:
  - Package Selector: 2 cards for **Mini DGNL (100 câu - 90 phút)** and **Full DGNL (200 câu - 150 phút)**.
  - Distribution breakdown labels showing hardcoded synthetic counts (e.g. Mini: 40 Toán, 30 Logic, 30 Phân tích số liệu).
  - Target Audience: 3 radio buttons for Class 10, Class 11, Class 12.
  - Difficulty distribution inputs: 3 numeric fields for Nhận biết, Thông hiểu, Vận dụng.
  - Source Mode Selector: Dropdown with options:
    - *Chỉ dùng ngân hàng tài liệu (Tài Liệu Chuan)*
    - *Ưu tiên ngân hàng tài liệu + Bổ sung sinh tự động*
    - *Hoàn toàn sinh tự động (Algorithmic)*
  - Action buttons: "Tạo Đề ĐGNL Ngay", "Xem Trước Bản In", "Lưu Đề".

### Student-Facing UI
- Currently, student users take DGNL exams through the generic quiz interface `#quizExamInterfaceModal`.
- **Deficiencies for V-ACT**:
  - No V-ACT banner or section progress indicator (cannot jump between Section 1: Tiếng Việt, Section 2: Tiếng Anh, etc.).
  - No passage display area for reading comprehension or data table prompts shared by groups of 3–4 sub-questions.
  - Timer is generic countdown; does not provide recommended pacing per section (e.g. ~1.25 min/câu).

---

## 4. Existing Bank Coverage

An exhaustive scan of `DocumentQuestionBank` (14,034 total questions loaded via `js/documentQuestionBank.js` and `js/question-bank/chunk-*.js`) reveals the following actual counts:

### Total Bank Breakdown
| Category / Field | Count | Notes |
| :--- | :--- | :--- |
| **Total Questions in System** | **14,034** | Curated questions from PDF documents |
| Subject: `toan` (Math) | 13,962 | High school & middle school math |
| Subject: `khtn` (Natural Sciences) | 72 | Grades 6–9 basic natural sciences only |
| Grade: `DGNL` | 413 | Specifically tagged for DGNL |
| Grade: `12` | 8,065 | Grade 12 high school exams |
| Grade: `10` | 4,828 | Grade 10 high school exams |
| Other Grades (6, 7, 8, 9, 11) | 728 | Middle school & Grade 11 |

### Target V-ACT 5-Section Bank Coverage
| V-ACT Target Section | Target per Exam | Current Bank Count | Raw Extracted (`extracted-review.json`) | Status & Evaluation |
| :--- | :---: | :---: | :---: | :--- |
| **1. Tiếng Việt (Vietnamese)** | 30 | **7** | 53 | **CRITICAL SHORTAGE**: Needs at least 300+ questions for decent test generation. |
| **2. Tiếng Anh (English)** | 30 | **0** | 0 | **ZERO COVERAGE**: Completely absent from both the bank and raw extraction files. Must ingest official V-ACT English banks. |
| **3. Toán học (Math)** | 30 | **>13,900** | 4,800+ | **ABUNDANT**: Massive coverage across all grade 10–12 topics and DGNL quantitative templates. |
| **4. Tư duy logic & Phân tích số liệu** | 12 | **403** | 410 | **SUFFICIENT FOR INITIAL MVP**: 364 Logic + 39 Data Analysis. Can generate ~33 unique 12-question sections without repeating. |
| **5. Suy luận khoa học (Scientific Reasoning)** | 18 | **72 (Middle school only)** | 0 | **CRITICAL GAP**: Current science questions are Grade 6–9 KHTN (24 Physics, 24 Chemistry, 24 Biology). **Zero** high-school/V-ACT level questions in current bank. |
| *• Vật lý (Physics)* | *6* | *24 (Grade 6–9)* | 0 | Incompatible with Grade 12 DGNL |
| *• Hóa học (Chemistry)* | *6* | *24 (Grade 6–9)* | 0 | Incompatible with Grade 12 DGNL |
| *• Sinh học (Biology)* | *6* | *24 (Grade 6–9)* | 0 | Incompatible with Grade 12 DGNL |

### Analysis of Available Raw Source PDFs in Repository
Inspection of `TÀI LIỆU/DGNL/` shows **45 official and high-quality mock exam PDFs**, including:
- *Đề thi chính thức ĐHQG-HCM 2025 (Đợt 1, Đợt 2)*
- *Bộ đề luyện thi ĐGNL ĐHQG-HCM Đề 1 đến Đề 20*
- *Chuyên đề Tư duy logic & Phân tích số liệu*
- *Chuyên đề Tiếng Việt & Tiếng Anh DGNL*

**Why did previous extraction only yield 413 DGNL questions and 0 English?**
In [`tools/extract-questions.js`](file:///c:/Users/khiem.nguyen/Documents/GitHub/K-EDU/tools/extract-questions.js#L144):
```javascript
// Line 144 in extract-questions.js
let subject = "toan"; // Hardcoded default subject!
if (sourceFile.includes("KHTN")) subject = "khtn";
```
The extraction script forced `subject = "toan"` on all DGNL exams! Any non-math section (like Tiếng Việt or Reading passages) was either skipped because the regex looked for math patterns or coerced into `dgnl_logic`. English sections were omitted because regex filters required Vietnamese accent characters or math notation.

---

## 5. Existing Question Schemas

### Sample Question 1: Document DGNL Question (`chunk-12.js`)
```javascript
{
  id: "doc_dgnl_chunk12_042",
  grade: "DGNL",
  subject: "toan",                          // INCONSISTENCY: All DGNL are labeled "toan"
  topic: "dgnl_logic",                      // Specific topic under DGNL
  level: "TH",                              // Standard: NB, TH, VD, VDC
  question: "Trong một cuộc thi chạy, An về đích trước Bình nhưng sau Cường...",
  options: [
    "An về nhì",
    "Bình về ba",
    "Cường về nhất",
    "Không xác định được"
  ],
  correctAnswer: 2,                          // Integer index (0, 1, 2, 3)
  solution: "Theo đề bài: Cường -> An -> Bình...",
  sourceFile: "De-luyen-thi-DGNL-HCM-De-05.pdf",
  sourcePage: 4,
  curation: {
    status: "verified",
    verifiedBy: "system_review"
  }
}
```

### Sample Question 2: Algorithmic Synthetic Template (`mathGenerator.js`)
```javascript
{
  id: "dgnl_synth_logic_1726639120_1",
  grade: "12",
  subject: "toan",
  topic: "dgnl_logic",
  level: "VD",
  question: "Có 5 bạn A, B, C, D, E ngồi thành một hàng ngang...",
  options: ["A", "B", "C", "D"],
  answer: 1,                                // INCONSISTENCY: Uses 'answer' instead of 'correctAnswer'
  explanation: "Vị trí của B thỏa mãn...",  // INCONSISTENCY: Uses 'explanation' instead of 'solution'
  synthetic: true
}
```

### Identified Schema Inconsistencies & Deficiencies:
1. **Subject Attribute Overload**: High-level subject is marked as `"toan"` even when `topic` is `"dgnl_tiengviet"` or `"dgnl_logic"`.
2. **Key Name Variance**: Document questions use `correctAnswer` (0-3) and `solution`, whereas synthetic generator outputs use `answer` and `explanation`.
3. **Absence of Passage/Context Grouping**: V-ACT has reading comprehension (Tiếng Việt, Tiếng Anh) and data analysis where 1 passage/table governs questions 41–44. Current schema lacks:
   - `passageId`: string identifier linking questions to a common context.
   - `passageText` or `stimulusHtml`: markdown/html table or text passage.
   - `itemType`: single vs group.
4. **Difficulty Tagging Inconsistency**: Some raw files use numeric ratings (`1, 2, 3, 4`), some use Vietnamese acronyms (`NB, TH, VD, VDC`), and some synthetic templates use English lower-case (`"basic"`, `"advanced"`).

---

## 6. Existing Deduplication System

### How It Works Currently
In [`js/mathGenerator.js`](file:///c:/Users/khiem.nguyen/Documents/GitHub/K-EDU/js/mathGenerator.js#L355):
1. **`mathQuestionSignature(text)`**:
   - Strips LaTeX wrappers `\(`, `\)`, `\[`, `\]`, `$`.
   - Replaces whitespace runs with single space.
   - Converts to lower-case.
   - Strips non-alphanumeric unicode punctuation while retaining math symbols.
2. **In-Memory Tracking Sets**:
   - `seenSignatures`: Tracks signatures during a single exam generation to guarantee 0 intra-exam duplicates.
   - `batchSeenSignatures`: Tracks signatures across batch exports.
3. **Cross-Session Storage**:
   - Uses `localStorage.getItem("khiemedu_recent_doc_question_ids")` storing a sliding window of up to 50,000 recently used question IDs to minimize repetition across exams generated within a 7-day period.

### Reusability for V-ACT
- **Signature Function**: 100% reusable for V-ACT Vietnamese, English, Math, and Logic text.
- **Deduplication State Pattern**: The `Set` and `localStorage` sliding window architecture is robust, efficient, and directly reusable for the new V-ACT generator.

---

## 7. Reusable Components

The following existing components provide strong foundations for V-ACT:

1. **`mathQuestionSignature(text)`** ([`js/mathGenerator.js:355`](file:///c:/Users/khiem.nguyen/Documents/GitHub/K-EDU/js/mathGenerator.js#L355)):
   - Fast, resilient question fingerprinting.
2. **`GradeEngines.getDgnlTemplates`** ([`js/mathGenerator.js:2251`](file:///c:/Users/khiem.nguyen/Documents/GitHub/K-EDU/js/mathGenerator.js#L2251)):
   - 24 parameterized math, logic, and data analysis question templates. Excellent as synthetic fallbacks for adaptive practice.
3. **`DocumentQuestionBank` API & Chunk Architecture** ([`js/documentQuestionBank.js`](file:///c:/Users/khiem.nguyen/Documents/GitHub/K-EDU/js/documentQuestionBank.js)):
   - Lazy-loading chunks (`chunk-*.js`) via script tags or dynamic import. Scalable up to tens of thousands of questions without bloating initial page load.
4. **`previewDgnlExamDocument()` Layout & Print Formatting** ([`js/app.js:2497`](file:///c:/Users/khiem.nguyen/Documents/GitHub/K-EDU/js/app.js#L2497)):
   - Clean, professional 2-column test paper layout with MathJax rendering and watermark support.
5. **Quiz Storage & Result Analytics Baseline** ([`js/app.js`](file:///c:/Users/khiem.nguyen/Documents/GitHub/K-EDU/js/app.js)):
   - Existing student exam submission, auto-grading, and competence tracking (`Student & Teacher Competence Analytics`).

---

## 8. Components To Deprecate

The following legacy components must be phased out or decoupled during the V-ACT rollout:

1. **`MathEngine.generateDgnlExam`** ([`js/mathGenerator.js:2371`](file:///c:/Users/khiem.nguyen/Documents/GitHub/K-EDU/js/mathGenerator.js#L2371)):
   - Assumes DGNL is only Math + Logic + Data Analysis. Lacks language and scientific reasoning dimensions.
2. **`selectDgnlPackage('mini100' | 'full200')`** ([`js/app.js:2308`](file:///c:/Users/khiem.nguyen/Documents/GitHub/K-EDU/js/app.js#L2308)):
   - The 100-question and 200-question formats do not match the real ĐHQG-HCM exam structure.
3. **Hardcoded `subject: "toan"` in PDF extraction** ([`tools/extract-questions.js:144`](file:///c:/Users/khiem.nguyen/Documents/GitHub/K-EDU/tools/extract-questions.js#L144)):
   - Destroys multi-disciplinary classification.
4. **`mathGenDgnlPanel` Sub-tab Placement** ([`index.html:981`](file:///c:/Users/khiem.nguyen/Documents/GitHub/K-EDU/index.html#L981)):
   - Nesting DGNL under the high school Math exam generator causes conceptual confusion and prevents multi-subject question bank configuration.

---

## 9. Migration Risks

| Risk | Severity | Description | Mitigation Strategy |
| :--- | :---: | :--- | :--- |
| **Severe Bank Deficit in Language & Science** | **CRITICAL** | Current bank has 0 English questions, only 7 Vietnamese questions, and 0 high-school level science reasoning questions. Generating a real 120-question V-ACT test is impossible with the current active bank. | In Phase 2 & 3, build a specialized PDF extractor targeting `TÀI LIỆU/DGNL/` with multi-subject tagging to ingest English, Vietnamese, Physics, Chemistry, and Biology. |
| **Passage-Based Question Breakage** | **HIGH** | Reading comprehension and data interpretation have 3–5 questions tied to 1 shared passage/diagram. Flat random sampling breaks the connection, leaving questions without their context. | Introduce `passageId` and compound item structures in the V-ACT schema so passages and their associated sub-items are selected as atomic blocks. |
| **Regression in Math Generator** | **MEDIUM** | Existing teacher users rely on `MathEngine.generateExam` and `generateDgnlExam` for school tests. Modifying legacy generator functions directly risks breaking ongoing classes. | Implement V-ACT as a standalone, modular subsystem (`js/vact/`) without mutating `MathEngine` legacy entry points. |
| **State Bloat & LocalStorage Quotas** | **MEDIUM** | 120-question exams with solutions and rich reading passages can exceed `localStorage` 5MB limit if multiple history copies are kept uncompressed. | Reuse the 7-day retention cleanup and compression mechanisms established in commit `717e146`. |

---

## 10. Recommended Phase 1 Integration Points

To ensure clean architecture, non-destructive migration, and maximum reliability, Phase 1 should integrate as follows:

```
js/vact/
├── vactConstants.js      # Official 5 sections, 120-question profile, scoring weights, time limits
├── vactSchema.js         # Unified V-ACT item schema (single item + passage group)
├── vactBankManager.js    # Multi-subject question bank filter and coverage auditor
└── vactEngine.js         # Core V-ACT generation engine with section balancer and fallback
```

### Immediate Phase 1 Actions:
1. **Define Core Constants & Section Profiles**:
   - `vietnamese` (30 questions)
   - `english` (30 questions)
   - `math` (30 questions)
   - `logic_data` (12 questions)
   - `scientific_reasoning` (18 questions: 6 Physics, 6 Chemistry, 6 Biology)
   - Total: 120 questions, 150 minutes.
2. **Design Passage-Aware V-ACT Schema**:
   - Support `passage`: `{ id, title, content, type: "reading" | "data_table" | "experiment" }`.
   - Link sub-questions via `passageId`.
3. **Implement Non-Destructive Engine**:
   - Export `window.VactEngine` without overriding or modifying `window.MathEngine`.
   - Provide clean hooks for future UI integration in Phase 4–7.

---
*Audit completed in accordance with Phase 0 requirements.*
