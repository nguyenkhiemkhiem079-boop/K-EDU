# V-ACT Source Tree

> **Document Repository**: `TÀI LIỆU/DGNL/V-ACT/`  
> **Target Scope**: V-ACT / Đánh Giá Năng Lực ĐHQG-HCM  
> **Last Updated**: 2026-09-18  
> **Total Source Files**: 45

This directory contains the organized source documents (PDFs) for the V-ACT examination system. All files have been classified with preserved original paths and tracked under [`TÀI LIỆU/DGNL/V-ACT/source-manifest.json`](file:///c:/Users/khiem.nguyen/Documents/GitHub/K-EDU/T%C3%80I%20LI%E1%BB%86U/DGNL/V-ACT/source-manifest.json).

---

## Directory Overview

```text
TÀI LIỆU/DGNL/V-ACT/
├── 00_OFFICIAL/                      # Đề thi & đáp án chính thức từ ĐHQG-HCM
│   ├── STRUCTURE/                    # Tài liệu đặc tả cấu trúc bài thi
│   ├── 2025/
│   │   ├── DOT_1/ (QUESTION, SOLUTION)
│   │   └── DOT_2/ (QUESTION, SOLUTION)
│   └── 2026/ (QUESTION, SOLUTION)
├── 01_FULL_TESTS/                    # Đề thi đầy đủ (120 câu)
│   ├── 2025_PLUS/                    # Đề thi cấu trúc mới 2025+ (30/30/30/12/18)
│   │   ├── TEST_003/ (QUESTION, SOLUTION)
│   │   ├── TEST_004/ (QUESTION, SOLUTION)
│   │   ├── TEST_005/ (QUESTION, SOLUTION)
│   │   └── TEST_006/ (QUESTION, SOLUTION)
│   └── LEGACY_PRE_2025/              # Đề thi cấu trúc cũ pre-2025 (DE SO 1 - 20)
├── 02_SUBJECT_BANKS/                 # Tài liệu chuyên đề theo môn / phân môn
│   ├── VIETNAMESE/
│   ├── ENGLISH/
│   ├── MATH/
│   │   └── MIXED/
│   ├── LOGIC_DATA/
│   │   ├── DATA_INTERPRETATION/
│   │   └── LOGICAL_REASONING/
│   └── SCIENTIFIC_REASONING/
├── 90_PENDING_CLASSIFICATION/        # Đề thi khác (ĐHSP Hà Nội, H-SCA, TSA) chờ xử lý
└── 99_DUPLICATE_REVIEW/              # Bản sao trùng lặp byte-for-byte chờ kiểm tra
```

---

## 1. Official Sources (4 files)

Verified official releases from VNU-HCM (ĐHQG-HCM) for the 2025 examination year.

| Filename | Role | Size | Pages | Description |
| :--- | :--- | :--- | :--- | :--- |
| `00_OFFICIAL/2025/DOT_1/QUESTION/VACT_2025_OFFICIAL_DOT1_QUESTION.pdf` | Question | 657 KB | 38 | Đề thi chính thức ĐGNL ĐHQG-HCM 2025 Đợt 1 (120 câu) |
| `00_OFFICIAL/2025/DOT_1/SOLUTION/VACT_2025_OFFICIAL_DOT1_SOLUTION.pdf` | Solution | 980 KB | 84 | Đáp án & Lời giải chi tiết ĐGNL ĐHQG-HCM 2025 Đợt 1 |
| `00_OFFICIAL/2025/DOT_2/QUESTION/VACT_2025_OFFICIAL_DOT2_QUESTION.pdf` | Question | 1.18 MB | 37 | Đề thi chính thức ĐGNL ĐHQG-HCM 2025 Đợt 2 (120 câu) |
| `00_OFFICIAL/2025/DOT_2/SOLUTION/VACT_2025_OFFICIAL_DOT2_SOLUTION.pdf` | Solution | 1.86 MB | 80 | Đáp án & Lời giải chi tiết ĐGNL ĐHQG-HCM 2025 Đợt 2 |

- **Paired Sets**: 2 complete official question/solution sets.

---

## 2. 2025+ Full Tests (8 files)

Full mock examinations conforming to the 2025+ structure (30 Vietnamese, 30 English, 30 Math, 12 Logic & Data, 18 Scientific Reasoning = 120 questions).

| Test Directory | Question File | Solution File |
| :--- | :--- | :--- |
| `TEST_003` | `QUESTION/VACT_2025_MOCK_003_QUESTION.pdf` (780 KB, 37 pgs) | `SOLUTION/VACT_2025_MOCK_003_SOLUTION.pdf` (1.30 MB, 87 pgs) |
| `TEST_004` | `QUESTION/VACT_2025_MOCK_004_QUESTION.pdf` (806 KB, 40 pgs) | `SOLUTION/VACT_2025_MOCK_004_SOLUTION.pdf` (1.41 MB, 91 pgs) |
| `TEST_005` | `QUESTION/VACT_2025_MOCK_005_QUESTION.pdf` (568 KB, 38 pgs) | `SOLUTION/VACT_2025_MOCK_005_SOLUTION.pdf` (929 KB, 67 pgs) |
| `TEST_006` | `QUESTION/VACT_2025_MOCK_006_QUESTION.pdf` (604 KB, 37 pgs) | `SOLUTION/VACT_2025_MOCK_006_SOLUTION.pdf` (1.20 MB, 70 pgs) |

- **Paired Sets**: 4 complete 2025+ mock question/solution sets.

---

## 3. Legacy Full Tests (20 files)

Full 120-question mock tests created under the pre-2025 3-part format (Part 1: 40 Language, Part 2: 30 Math/Logic/Data, Part 3: 50 Problem Solving). Each PDF contains both the full exam and its comprehensive solution section.

| Filename | Role | Size | Pages | Origin |
| :--- | :--- | :--- | :--- | :--- |
| `01_FULL_TESTS/LEGACY_PRE_2025/VACT_LEGACY_MOCK_001_COMBINED.pdf` | Combined | 1.32 MB | 46 | DE SO 1.pdf |
| `01_FULL_TESTS/LEGACY_PRE_2025/VACT_LEGACY_MOCK_002_COMBINED.pdf` | Combined | 1.59 MB | 50 | DE SO 2.pdf |
| `01_FULL_TESTS/LEGACY_PRE_2025/VACT_LEGACY_MOCK_003_COMBINED.pdf` | Combined | 1.37 MB | 48 | DE SO 3.pdf |
| `01_FULL_TESTS/LEGACY_PRE_2025/VACT_LEGACY_MOCK_004_COMBINED.pdf` | Combined | 1.46 MB | 50 | DE So 4.pdf |
| `01_FULL_TESTS/LEGACY_PRE_2025/VACT_LEGACY_MOCK_005_COMBINED.pdf` | Combined | 1.58 MB | 52 | DE SO 5.pdf |
| `01_FULL_TESTS/LEGACY_PRE_2025/VACT_LEGACY_MOCK_006_COMBINED.pdf` | Combined | 1.35 MB | 55 | DE SO 6.pdf |
| `01_FULL_TESTS/LEGACY_PRE_2025/VACT_LEGACY_MOCK_007_COMBINED.pdf` | Combined | 1.36 MB | 52 | DE SO 7.pdf |
| `01_FULL_TESTS/LEGACY_PRE_2025/VACT_LEGACY_MOCK_008_COMBINED.pdf` | Combined | 1.52 MB | 54 | DE SO 8.pdf |
| `01_FULL_TESTS/LEGACY_PRE_2025/VACT_LEGACY_MOCK_009_COMBINED.pdf` | Combined | 1.58 MB | 52 | DE SO 9.pdf |
| `01_FULL_TESTS/LEGACY_PRE_2025/VACT_LEGACY_MOCK_010_COMBINED.pdf` | Combined | 1.73 MB | 52 | DE SO 10.pdf |
| `01_FULL_TESTS/LEGACY_PRE_2025/VACT_LEGACY_MOCK_011_COMBINED.pdf` | Combined | 1.36 MB | 51 | DE SO 11.pdf |
| `01_FULL_TESTS/LEGACY_PRE_2025/VACT_LEGACY_MOCK_012_COMBINED.pdf` | Combined | 1.67 MB | 52 | DE SO 12.pdf |
| `01_FULL_TESTS/LEGACY_PRE_2025/VACT_LEGACY_MOCK_013_COMBINED.pdf` | Combined | 1.71 MB | 51 | DE SO 13.pdf |
| `01_FULL_TESTS/LEGACY_PRE_2025/VACT_LEGACY_MOCK_014_COMBINED.pdf` | Combined | 1.56 MB | 50 | DE SO 14.pdf |
| `01_FULL_TESTS/LEGACY_PRE_2025/VACT_LEGACY_MOCK_015_COMBINED.pdf` | Combined | 1.65 MB | 54 | DE SO 15.pdf |
| `01_FULL_TESTS/LEGACY_PRE_2025/VACT_LEGACY_MOCK_016_COMBINED.pdf` | Combined | 1.55 MB | 55 | DE SO 16.pdf |
| `01_FULL_TESTS/LEGACY_PRE_2025/VACT_LEGACY_MOCK_017_COMBINED.pdf` | Combined | 1.39 MB | 53 | DE SO 17.pdf |
| `01_FULL_TESTS/LEGACY_PRE_2025/VACT_LEGACY_MOCK_018_COMBINED.pdf` | Combined | 1.39 MB | 54 | DE SO 18.pdf |
| `01_FULL_TESTS/LEGACY_PRE_2025/VACT_LEGACY_MOCK_019_COMBINED.pdf` | Combined | 1.41 MB | 54 | DE SO 19.pdf |
| `01_FULL_TESTS/LEGACY_PRE_2025/VACT_LEGACY_MOCK_020_COMBINED.pdf` | Combined | 1.51 MB | 57 | DE SO 20.pdf |

- **Usage Note**: Eligible strictly as supplemental item sources (Mini Test / Question Bank) tagged `structureVersion: "legacy_pre_2025"`. Not admissible as complete 2025+ Full-Test simulation sources.

---

## 4. Vietnamese Sources (0 files)

- Target directories prepared with `.gitkeep` for future dedicated Vietnamese subject packs:
  - `READING_COMPREHENSION`, `VOCABULARY`, `GRAMMAR_LANGUAGE`, `LITERARY_ANALYSIS`, `INFERENCE`, `MIXED`.

---

## 5. English Sources (0 files)

- Target directories prepared with `.gitkeep` for future dedicated English subject packs:
  - `VOCABULARY`, `GRAMMAR`, `READING_COMPREHENSION`, `COMMUNICATION`, `INFERENCE`, `MIXED`.

---

## 6. Math Sources (2 files)

Specialized subject material focusing on Mathematics for aptitude testing.

| Filename | Role | Size | Pages | Description |
| :--- | :--- | :--- | :--- | :--- |
| `02_SUBJECT_BANKS/MATH/MIXED/VACT_MATH_MIXED_001.pdf` | Combined | 2.47 MB | 45 | Tuyển tập 9 đề thi ĐGNL chuyên đề môn Toán |
| `02_SUBJECT_BANKS/MATH/MIXED/VACT_MATH_MIXED_002.pdf` | Reference | 3.05 MB | 108 | Tài liệu luyện thi V-ACT kiến thức nền tảng môn Toán 11 |

---

## 7. Logic & Data Sources (4 files)

Specialized subject material focusing on Logical Thinking and Data Interpretation.

| Filename | Role | Size | Pages | Sub-Skill |
| :--- | :--- | :--- | :--- | :--- |
| `02_SUBJECT_BANKS/LOGIC_DATA/DATA_INTERPRETATION/VACT_LOGIC_DATA_INTERPRETATION_001.pdf` | Combined | 280 KB | 26 | `data_interpretation` |
| `02_SUBJECT_BANKS/LOGIC_DATA/DATA_INTERPRETATION/VACT_LOGIC_DATA_INTERPRETATION_002.pdf` | Combined | 716 KB | 173 | `data_interpretation` (Mai Thành Luân) |
| `02_SUBJECT_BANKS/LOGIC_DATA/LOGICAL_REASONING/VACT_LOGIC_DATA_LOGICAL_REASONING_001.pdf` | Combined | 232 KB | 38 | `logical_reasoning` |
| `02_SUBJECT_BANKS/LOGIC_DATA/LOGICAL_REASONING/VACT_LOGIC_DATA_LOGICAL_REASONING_002.pdf` | Combined | 1.13 MB | 296 | `logical_reasoning` (Mai Thành Luân) |

---

## 8. Scientific Reasoning Sources (0 files)

- Target directories prepared with `.gitkeep` for each of the 9 scientific skills:
  - `PHYSICS`, `CHEMISTRY`, `BIOLOGY`, `HISTORY`, `GEOGRAPHY`, `ECONOMICS_LAW`, `TECHNOLOGY`, `SOCIETY`, `INTERDISCIPLINARY`.

---

## 9. Pending Classification (6 files)

Documents originating from separate exam formats (ĐHSP Hà Nội, H-SCA, TSA) that do not belong to the official V-ACT / ĐHQG-HCM exam system. Placed here pending administrative review.

| Filename | Exam Type | Subject | Size | Pages |
| :--- | :--- | :--- | :--- | :--- |
| `de-minh-hoa-xet-tuyen-dai-hoc-nam-2025-mon-toan-truong-dhsp-ha-noi-2.pdf` | ĐHSP Hà Nội | Toán | 2.61 MB | 5 |
| `de-tham-khao-dgnl-mon-toan-xet-tuyen-dai-hoc-2025-truong-dhsp-ha-noi.pdf` | ĐHSP Hà Nội | Toán | 1.73 MB | 7 |
| `de-thi-doc-lap-xet-tuyen-dai-hoc-nam-2025-mon-toan-truong-dhsp-ha-noi-2.pdf` | ĐHSP Hà Nội | Toán | 315 KB | 5 |
| `de-thi-spt-mon-toan-nam-2025-truong-dai-hoc-su-pham-ha-noi.pdf` | ĐHSP Hà Nội | Toán | 1.19 MB | 8 |
| `tai-lieu-luyen-thi-h-sca-ky-thi-danh-gia-nang-luc-chuyen-biet-cua-truong-dhsp-tp-hcm.pdf` | H-SCA (ĐHSP TPHCM) | Chuyên biệt | 7.30 MB | 100 |
| `tuyen-tap-10-de-thi-thu-ky-thi-danh-gia-tu-duy-dai-hoc-bach-khoa-ha-noi-tsa.pdf` | TSA (ĐHBK Hà Nội) | Đánh giá tư duy | 2.15 MB | 72 |

---

## 10. Duplicate Review (1 file)

Identified duplicate files awaiting administrative pruning.

| Filename | Size | SHA-256 Hash | Duplicate Of |
| :--- | :--- | :--- | :--- |
| `de-minh-hoa-xet-tuyen-dai-hoc-nam-2025-mon-toan-truong-dhsp-ha-noi-2 (1).pdf` | 2,606,251 B | `1898b15a60aabf7b894027c03f3214b7aef65c15f4230ee913f186bde3e28383` | `de-minh-hoa-xet-tuyen-dai-hoc-nam-2025-mon-toan-truong-dhsp-ha-noi-2.pdf` |

---

## Summary Statistics

- **Total Source Files (Before)**: 45
- **Total Source Files (After)**: 45
- **Net Change**: 0 files lost / deleted
- **Official Exam Pairs**: 2 (2025 Đợt 1, 2025 Đợt 2)
- **Full Mock Pairs (2025+)**: 4 (TEST_003, TEST_004, TEST_005, TEST_006)
- **Legacy Combined Sets**: 20 (DE SO 1 - 20)
- **Subject Packs**: 6 (2 Math, 4 Logic & Data)
- **Pending Review**: 6 (External exam formats)
- **Duplicate Review**: 1 (Byte-identical copy)
