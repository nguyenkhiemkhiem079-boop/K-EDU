# Production Hardening Phase 4 — Data Bank, PDF Extraction & Ingestion

## Before implementation

PHASE: 4 — Data Bank, PDF Extraction & Ingestion

Scope:

- PDF extraction and offline parsing
- V-ACT source ingestion, normalization, validation, and runtime loading
- Math/document-bank audit tooling
- Production/review-required/invalid data artifacts
- Provenance and source-page preservation

Confirmed defects:

1. The committed V-ACT bank contained four production records with duplicate answer options after normalized comparison.
2. Ingestion validation and runtime source loading did not share the duplicate-option invariant.
3. Offline PDF parsing created placeholder options for questions whose boundaries were not confidently parsed.
4. Duplicate question numbers were silently represented as ordinary records without a structured review diagnostic.
5. The ingestion parser had an out-of-scope `textD` reference that failed real source-pipeline execution.
6. Validation mutated the caller’s nested `quality` object, allowing a failed validation of one view to corrupt a later validation.

Root causes:

1. Runtime eligibility had stronger checks than the committed bank-repair and ingestion pipeline.
2. Parser uncertainty was represented only by empty fields, not explicit quality state and diagnostics.
3. Ingestion validation did not defensively clone nested mutable fields.

## Changes implemented

- Added normalized duplicate-option checks to V-ACT repair, ingestion validation, and source-bank loading.
- Repaired the committed data topology without inventing content:
  - `data/vact/questions.json`: 850 production records.
  - `data/vact/review-required.json`: 408 review records.
  - Four duplicate-option records are explicitly quarantined with `DUPLICATE_OPTIONS`.
  - `data/vact/invalid.json` remains empty because these records are reviewable, not irrecoverably malformed.
- Added `PdfExtractor.extractTextFromPdfDetailed()` with page-level text metadata while preserving the existing string-returning API.
- Offline/AI parser output now carries `status: review_required` and structured `validationIssues`; it never invents placeholder A/B/C/D options.
- Duplicate question text/number, missing answers, invalid option counts, duplicate options, and missing source pages remain visible as diagnostics.
- Added explicit parser diagnostics and source-page propagation through normalization.
- Fixed ingestion pipeline defects in `parseQuestionChunk` and made validation non-mutating for nested quality state.

## Tests added or strengthened

- `tools/verify_phase4_ingestion.js`
  - no placeholder-option generation,
  - missing-answer quarantine,
  - duplicate-number diagnostics,
  - duplicate-option detection,
  - source-loader rejection,
  - production-bank status and provenance audit.
- `tools/test_vact_source_pipeline.js` now executes successfully through parsing, normalization, validation, deduplication, coverage, and Full120 provenance.
- Existing source-loader, runtime-bank, coverage, and profile fuzz suites run against the repaired bank.

## Tests executed

- `tools/verify_phase4_ingestion.js`: PASS.
- `tools/test_vact_source_pipeline.js`: PASS — all 10 pipeline tests.
- `tools/verify_vact_source_loader_hardened.js`: PASS.
- `tools/verify_vact_source_provenance.js`: PASS — all 850 production records.
- `tools/verify_vact_profiles_hardening.js`: PASS — 2,000 deterministic profile runs.
- `tools/verify_vact_runtime_bank.js`: PASS — 17/17.
- `tools/verify_vact_coverage.js`: PASS.

## Remaining known issues

- The source bank remains below the long-term 2,400-question coverage target, but runtime readiness for all four profiles remains separate and sufficient.
- Full browser/security hardening remains in Phase 5.

## Exit gate

PASS. No confirmed invalid or duplicate-option record enters a production V-ACT generator; parser uncertainty is quarantined with diagnostics; source page and provenance are preserved; and the ingestion/source-bank regression suites pass.
