# V-ACT Project — Phase 7: Full V-ACT 120 Simulation Report

## 1. Executive Summary

Phase 7 implements the **Full V-ACT 120 Simulation** module within the K-EDU standardized assessment architecture. It provides an authentic 150-minute simulation of the official V-ACT examination (ĐHQG-HCM), building strictly upon the established composite exam generator and deduplication engine without duplicating question-selection logic.

Key deliverables:
- **Canonical 120-question profile**: Implemented `VACT_FULL_PROFILE` with 150-minute official timing.
- **Removed deprecated Full 200 labels**: Removed legacy 200-question DGNL labels across teacher generator forms and package selectors, replacing them with Full V-ACT 120 while preserving unrelated high-volume answer key imports.
- **Section Isolation & Truthful Shortage Reporting**: Shortages in any section (Vietnamese: 23 missing, English: 30 missing) are truthfully isolated; Math never fills language gaps.
- **Incomplete Simulation Policy**: Output of 67 questions from the current live bank is clearly flagged with `isComplete: false` and accompanied by a detailed readiness audit.
- **Enhanced Test Session**: Features 150-minute countdown, automatic timeout submission, manual submit confirmation with unanswered item accounting, top section navigation quick-bar, and answer sheet section counters.
- **Unbiased Analytics**: Displays raw scores and percentages across all 5 sections without inventing unverified official scaled scores.

---

## 2. Profile Breakdown & Readiness Audit

### 2.1 Profile Breakdown (`VACT_FULL_PROFILE`)
- **Total Questions**: 120
- **Official Duration**: 150 minutes
- **Canonical Structure**:
  1. Phần 1 — Sử dụng ngôn ngữ Tiếng Việt: 30 câu
  2. Phần 2 — Sử dụng ngôn ngữ Tiếng Anh: 30 câu
  3. Phần 3 — Toán học: 30 câu
  4. Phần 4 — Tư duy logic & Phân tích số liệu: 12 câu
  5. Phần 5 — Suy luận khoa học: 18 câu

### 2.2 Live Bank Availability & Shortage Report
| Phần thi | Yêu cầu (Requested) | Khả dụng trong kho (Available) | Đã tạo (Generated) | Còn thiếu (Missing) | Trạng thái (Status) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Phần 1 — Tiếng Việt** | 30 | 7 | **7** | 23 | `POOL_SHORTAGE` |
| **Phần 2 — Tiếng Anh** | 30 | 0 | **0** | 30 | `POOL_SHORTAGE` |
| **Phần 3 — Toán học** | 30 | 13,114 | **30** | 0 | Đầy đủ |
| **Phần 4 — Logic & Phân tích số liệu** | 12 | 401 | **12** | 0 | Đầy đủ |
| **Phần 5 — Suy luận khoa học** | 18 | 68 | **18** | 0 | Đầy đủ |
| **Tổng cộng** | **120** | **13,590** | **67** | **53** | `isComplete: false` |

- **Strict isolation verified**: Math generates exactly 30 questions, not 30 + 23 + 30 = 83 questions.
- **Global deduplication verified**: All 67 generated questions possess unique cryptographic signatures.

---

## 3. UX & Session Improvements

1. **Student Lobby**:
   - Added card `🏆 FULL V-ACT` (120 câu, 150 phút, mô phỏng cấu trúc V-ACT) with per-section composition grid.
   - Dynamic readiness banner: Directly informs students that the bank currently has 67/120 questions (missing 23 Vietnamese, 30 English) before the exam begins.
2. **Exam Runner & Navigation**:
   - Quick section jump bar at the top of the bubble sheet: `P1: TV`, `P2: TA`, `P3: Toán`, `P4: Logic`, `P5: Khoa học`.
   - Live answered counters on each section banner: e.g. `(Đã làm: 14/30 câu)`.
   - Official 150-minute timer (`9000s`) with warning pulses at 2 minutes and 1 minute.
   - Idempotent submission with manual confirmation prompt warning if unanswered questions remain.
   - Automatic submission on timer expiration (`isAuto: true`).
3. **Score Breakdown**:
   - Displays overall `Đúng` / `Sai` / `Chưa điền` and elapsed time.
   - Details raw count and percentage accuracy for each section.

---

## 4. Verification Suite

`tools/verify_vact_full120.js` covers 9 automated test suites:
1. `VACT_FULL_PROFILE` constants & 150-minute duration.
2. Live bank partial generation (67/120, missing 53, `isComplete === false`).
3. Strict section isolation (0 cross-section question movement).
4. Anti-duplication by cryptographic signature across composite test.
5. Sequential global numbering (1..N) and section metadata.
6. Complete Full 120 generation simulation on a fully populated mock bank (120/120, `isComplete === true`).
7. Quiz conversion: 150-minute timeLimit, HTML paper rendering with 5 sections, ExamVault alignment.
8. Section breakdown analytics without invented scaled formulas.
9. Timeout auto-submit vs manual submit confirmation invariants.
