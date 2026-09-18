# K-EDU V-ACT Roadmap — Completed Phases & Future Enhancements

## 1. Completed Phases (Phases 0–10)

| Phase | Milestone | Deliverables & Outcomes | Status |
| :---: | :--- | :--- | :---: |
| **Phase 0** | **Current System Audit** | Analyzed existing question bank, difficulty controls, legacy DGNL code, and defined non-regression baseline. Documented in `docs/vact-phase0-audit.md`. | **COMPLETED** |
| **Phase 1** | **Core Architecture** | Built canonical V-ACT taxonomy (5 sections, canonical skills), question schema, difficulty normalizer, exam profiles, and cryptographic signature generator. | **COMPLETED** |
| **Phase 2** | **Bank Adapter** | Created zero-mutation adapter for legacy `DocumentQuestionBank` items with provenance tracking and rejection of middle-school/malformed records. | **COMPLETED** |
| **Phase 3** | **Coverage & Quality Control** | Implemented deterministic quality scoring, duplicate group analysis, shortage diagnostics, and capacity checks. | **COMPLETED** |
| **Phase 4** | **Section Mini Test Engine** | Built single-section and targeted skill generator with anti-duplication, recent question exclusion, and balanced difficulty demand redistribution. | **COMPLETED** |
| **Phase 5** | **Student Practice UI** | Created Student V-ACT practice lobby with section/skill selection, custom counts, difficulty mode controls, and bubble-sheet exam runner. | **COMPLETED** |
| **Phase 6** | **Mini V-ACT 100** | Created 100-question practice simulation (90 minutes), strict section isolation, Part 1–5 exam paper rendering, and section breakdown analytics. | **COMPLETED** |
| **Phase 7** | **Full V-ACT 120 Simulation** | Implemented authentic 120-question, 150-minute exam simulation, quick section navigation bar, answered item accounting, and deprecated legacy Full 200 labels. | **COMPLETED** |
| **Phase 8** | **Performance Analytics** | Created attempt persistence layer, section/skill competency breakdowns, progress tracking, accuracy progression trends, and wrong question review modal. | **COMPLETED** |
| **Phase 9** | **External Question Sources** | Engineered secure source infrastructure for authorized remote JSON feeds, URL whitelisting, TTL caching, non-fatal fault tolerance, and multi-tier coverage. | **COMPLETED** |
| **Phase 10** | **Adaptive Practice & Hardening** | Implemented weakness practice generator with minimum evidence thresholds, adaptive difficulty scaling, recent-question intelligence, and production hardening. | **COMPLETED** |

---

## 2. Bank Readiness Summary (Current Repository Snapshot)

- **Math (Toán học)**: 13,114 questions — **Sufficient** for all practice and simulation modes.
- **Logic & Data Analysis (Tư duy logic)**: 401 questions — **Sufficient** for all practice and simulation modes.
- **Scientific Reasoning (Suy luận khoa học)**: 68 questions (Physics: 20, Chemistry: 24, Biology: 24) — **Sufficient** for simulations and moderate practice batches.
- **Vietnamese (Tiếng Việt)**: 7 questions — **Shortage** (missing 18 for Mini 100, missing 23 for Full 120).
- **English (Tiếng Anh)**: 0 questions — **Shortage** (missing 25 for Mini 100, missing 30 for Full 120).

---

## 3. Future Enhancements & Recommendations

1. **Phase 11 — Ingestion of Language Feeds**:
   - Ingest authorized open/curated English and Vietnamese question banks using the Phase 9 `remoteJsonSource` infrastructure to satisfy the 53 missing questions for Full 120.
2. **Phase 12 — Stimulus Passage Bundling**:
   - Enhance passage-based reading questions with unified multi-question stimulus group view.
3. **Phase 13 — Teacher Class Analytics**:
   - Aggregate individual student V-ACT competencies into teacher classroom heatmaps for class-wide targeted review.
