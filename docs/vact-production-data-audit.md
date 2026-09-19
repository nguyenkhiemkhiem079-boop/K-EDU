# V-ACT production data audit

This audit is generated from the current committed JSON artifacts after canonical shard refresh. The pipeline is conservative: it removes only structural labels, separates incomplete records for review, and never invents questions, answers, stimuli, or PDFs.

## Current machine-derived counts

| Metric | Value |
|---|---:|
| Raw/available records | 1,258 |
| Unique normalized | 1,258 |
| Production | 854 |
| Review required | 404 |
| Invalid | 0 |
| Exact duplicates removed | 8 |
| Runtime `questions.json` | 854 |
| Production shard total | 854 |

Production by section: Vietnamese 230, English 373, Math 176, Logic/Data 28, Scientific reasoning 47.

Quality gates on `data/vact/questions.json`: option prefixes 0; confirmed spillover 0; malformed fragments 0; placeholder required stimulus 0; missing required stimulus 0; missing visual 0; incomplete content 0; unverified answers 0; unverified sources 0; exact duplicate signatures 0.

Source integrity: 106 stable source IDs, 0 old sequential IDs, 16 paired references, 0 dangling references, 106 migration mappings. Exam artifacts contain 56 records; 5 source-complete, 5 answer-complete, and 0 production-complete original exams.

The full-bank health scan currently checks 854 questions and 364,231 candidate comparisons, reporting 17 probable duplicate pairs and 29 review-required similarity pairs. Fuzzy candidates are retained for review and are not silently deleted.

Run `node tools/repair_vact_bank.js`, `node tools/refresh_vact_generated.js`, then `node tools/verify_vact_production_hardening.js` to refresh the generated artifacts. PDF extraction remains dependency-gated in this environment because npm/pdf-parse is unavailable.

## Acceptance policy

- A production record has stable source-backed identity, four options, a verified A–D answer, and complete required stimulus/visual content.
- Fuzzy duplicate candidates are reported for review and are never auto-deleted.
- Review records retain question text, options, answer and source metadata.
- Original PDFs and user history are not modified or cleared.
