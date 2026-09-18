# K-EDU V-ACT Phase 3: Coverage, Deduplication & Bank Quality Report

> **V-ACT Project — Phase 3: Coverage, Deduplication and Bank Quality**  
> **Date**: September 18, 2026  
> **Repository**: `nguyenkhiemkhiem079-boop/K-EDU`  
> **Status**: Comprehensive audited bank intelligence established prior to test generator construction.

---

## 1. Executive Summary

Phase 3 establishes the **Quality & Deduplication Engine** (`js/vact/quality/deduplicator.js`) and **Coverage Intelligence Layer** (`js/vact/bank/coverage.js`). 

Rather than counting raw records blindly, coverage calculations are strictly determined from **VALID + UNIQUE + USABLE** questions. Duplicate questions sharing equivalent normalized content and options are detected via canonical signatures and consolidated without losing provenance.

---

## 2. Global Bank Inventory & Deduplication Audit

| Metric | Count | Ratio / Notes |
| :--- | :---: | :--- |
| **Total Raw Records Inspected** | **14,034** | 100% of repository document questions |
| **Mapped & Validated Records** | **13,596** | 96.88% passing canonical schema validation |
| **Duplicates Removed** | **6** | Across 6 distinct signature duplicate groups |
| **TOTAL UNIQUE USABLE QUESTIONS** | **13,590** | Active pool for V-ACT test generation |
| **Unsupported Records Excluded** | **385** | Middle-school mathematics (Grades 6–9) |
| **Malformed Records Rejected** | **53** | Missing answer keys or empty option strings |

### Detected Duplicate Groups
The deduplication engine identified 6 duplicate groups in `TOAN10` and `TOAN12` curated files where identical questions were cataloged with different IDs:
1. `legacy:TOAN10_TUYEN_TAP_CAU_HO_735` & `legacy:TOAN10_TUYEN_TAP_CAU_HO_851` (Hàm số bậc nhất đồng biến)
2. `legacy:TOAN10_TUYEN_TAP_CAU_HO_840` & `legacy:TOAN10_TUYEN_TAP_CAU_HO_4261` (Tương giao Parabol và trục hoành)
3. `legacy:TOAN12_TUYEN_TAP_CAU_HO_1847` & `legacy:TOAN12_TUYEN_TAP_CAU_HO_2445` (Bài toán lãi kép ngân hàng)
4. `legacy:TOAN12_TUYEN_TAP_CAU_HO_3483` & `legacy:TOAN12_TUYEN_TAP_CAU_HO_3625` (Tích phân chuyển động biến đổi đều)
5. `legacy:TOAN12_TUYEN_TAP_CAU_HO_6712` & `legacy:TOAN12_TUYEN_TAP_CAU_HO_6713` (Hình học Oxyz phương trình mặt phẳng)
6. `legacy:TOAN12_TUYEN_TAP_CAU_HO_6864` & `legacy:TOAN12_TUYEN_TAP_CAU_HO_6949` (Hình học Oxyz phương trình đường thẳng)

In each group, the canonical record was selected deterministically based on validation, provenance completeness, and explanation length.

---

## 3. Audited V-ACT Bank Coverage

### Section Breakdown by Difficulty

| Section | Easy | Medium | Hard | Total Unique Usable |
| :--- | :---: | :---: | :---: | :---: |
| **Vietnamese (Tiếng Việt)** | 0 | 7 | 0 | **7** |
| **English (Tiếng Anh)** | 0 | 0 | 0 | **0** |
| **Math (Toán học)** | 3 | 13,111 | 0 | **13,114** |
| **Logic & Data Analysis** | 0 | 400 | 1 | **401** |
| **Scientific Reasoning** | 20 | 48 | 0 | **68** |
| **TOTAL** | **23** | **13,566** | **1** | **13,590** |

### Scientific Reasoning Breakdown by Skill
- **Vật lý (Physics)**: **20** questions
- **Hóa học (Chemistry)**: **24** questions
- **Sinh học (Biology)**: **24** questions
- **Công nghệ / Kinh tế / Xã hội / Liên môn**: **0** questions

---

## 4. Exam Profile Readiness

### 4.1. Mini V-ACT 100 Readiness Check (`vact_mini_100`)
- **Overall Status**: **NOT READY (Shortages Exist)**
- **Total Required**: 100 questions
- **Total Available**: 57 questions (from eligible sections)
- **Total Missing**: 43 questions

| Section | Required | Available | Missing | Status | Shortage Reason |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Vietnamese** | 25 | 7 | **18** | FAILS | `POOL_SHORTAGE` |
| **English** | 25 | 0 | **25** | FAILS | `POOL_SHORTAGE` |
| **Math** | 25 | 13,114 | 0 | READY | — |
| **Logic & Data** | 10 | 401 | 0 | READY | — |
| **Scientific Reasoning** | 15 | 68 | 0 | READY | — |

---

### 4.2. Full V-ACT 120 Readiness Check (`vact_full`)
- **Overall Status**: **NOT READY (Shortages Exist)**
- **Total Required**: 120 questions
- **Total Available**: 67 questions (from eligible sections)
- **Total Missing**: 53 questions

| Section | Required | Available | Missing | Status | Shortage Reason |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Vietnamese** | 30 | 7 | **23** | FAILS | `POOL_SHORTAGE` |
| **English** | 30 | 0 | **30** | FAILS | `POOL_SHORTAGE` |
| **Math** | 30 | 13,114 | 0 | READY | — |
| **Logic & Data** | 12 | 401 | 0 | READY | — |
| **Scientific Reasoning** | 18 | 68 | 0 | READY | — |

---

## 5. Capacity & Shortage Model

The system enforces capacity lookups and structured shortage analysis via `VACTCoverage.getCapacity` and `VACTCoverage.checkShortage`.

Example shortage evaluation for English:
```json
{
  "scope": "section",
  "section": "english",
  "skill": null,
  "difficulty": null,
  "requested": 30,
  "available": 0,
  "missing": 30,
  "fulfilled": false,
  "reason": "POOL_SHORTAGE"
}
```

The generator will never silently fill a missing section with questions from another discipline or fail with generic error messages.

---

## 6. Recommended Bank Expansion Priorities

1. **Priority 1: Ingest English V-ACT Questions (Absolute Zero)**
   - Need at minimum 150–300 English reading comprehension, vocabulary, and grammar items to support test variation.
   - The 45 PDF files in `TÀI LIỆU/DGNL/` contain full English sections that were previously ignored by the math regex extractor.
2. **Priority 2: Ingest Vietnamese V-ACT Questions (Severe Deficit)**
   - Currently only 7 questions exist (need at least 300+ items).
   - High priority: Reading passages (`reading_comprehension`) with compound question groups.
3. **Priority 3: Ingest High-School Level Science Reasoning**
   - Replace or supplement the 68 middle-school KHTN items with genuine Grade 12 Physics, Chemistry, and Biology reasoning questions from official ĐHQG-HCM past papers.
4. **Priority 4: Difficulty Tagging Calibration**
   - The majority of existing high school questions are clustered as `medium`. Calibrating true `easy` and `hard` questions will enable dynamic difficulty balancing.

---
*Report generated automatically from live bank intelligence in tools/vact-coverage-report.json.*
