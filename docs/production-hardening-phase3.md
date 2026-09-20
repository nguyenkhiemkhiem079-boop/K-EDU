# Production Hardening Phase 3 — QuizContract, Persistence, Grading

## Before implementation

PHASE: 3 — QuizContract / Save / Reload / Grading

Scope:

- `js/quizContract.js`
- `js/storage.js`
- `js/firebase.js`
- `js/app.js`
- `js/dataRepair.js`
- contract, persistence, grading, and end-to-end QA

Confirmed defects:

1. QuizContract derived counts from the answer-key array and did not validate individual answer keys, finite scores, duplicate IDs/numbers, or MCQ option references.
2. V-ACT source type could be inferred as Mini100 from an ambiguous question count.
3. Local and cloud quiz persistence stored the complete answer key in the same record used by students.
4. Student startup loaded a full quiz before copying keys into the in-memory vault.
5. Sync deletion did not remove a pending save for the same quiz, allowing a reconnect to resurrect deleted data.
6. Legacy migration treated malformed answer-less records as migratable.

Root causes:

1. The contract was a normalization helper rather than an enforcement boundary.
2. Public and private quiz data had no storage topology separation.
3. Sync queues were action-deduplicated only by `(id, action)`, not by the quiz lifecycle.

## Changes implemented

- QuizContract v2 now validates question content, option cardinality and uniqueness, MCQ answer references, essay answers, scores, duplicate numbers/IDs, declared counts, and explicit V-ACT profile metadata.
- Ambiguous V-ACT records resolve to `vact_unclassified` and fail validation rather than being guessed as Mini100.
- Local persistence now uses `quiz_store` for answer-free public records and `quiz_private_store` / `quiz_private:<id>` for private answer keys. IndexedDB schema version is 4.
- Firebase quiz writes now separate `quizzes/{id}` from `quiz_answer_keys/{id}`. Public sync payloads contain no `correct`, `correctAnswer`, `explanation`, `pitfall`, or `keyFormula` fields.
- Student startup keeps the public quiz in `AppState` and loads private keys only through the private storage accessor used by `ExamVault`.
- Legacy full records are migrated into the split representation on read.
- Deletion removes pending saves for the same quiz, writes a tombstone, deletes both public and private local records, and verifies cloud deletion during reconnect.
- Data repair now quarantines invalid quizzes as `review_required` and reads private records when validating existing exams.
- Four malformed source-backed V-ACT records with normalized duplicate options are excluded before capacity and selection.

## Tests added or strengthened

- `tools/verify_phase3_roundtrip.js`
  - Math round trip.
  - Mini30, Mini60, Mini100, and Full120 round trips.
  - Public payload answer-key privacy.
  - Offline save/result queues and reconnect sync.
  - Deletion tombstone and no-resurrection behavior.
- `tools/verify_quiz_contract.js`
- `tools/verify_cross_engine_quiz_contract.js`
- `tools/verify_exam_e2e.js`
- `tools/verify_data_migration.js`
- `tools/verify_quiz_storage_persistence.js`
- `tools/verify_runtime_regressions.js`

## Tests executed

- Syntax checks for `quizContract.js`, `storage.js`, `firebase.js`, and `app.js`.
- `tools/verify_phase3_roundtrip.js`: PASS.
- `tools/verify_vact_profiles_hardening.js`: PASS — 4 profiles × 500 seeds = 2,000 runs.
- `tools/production-invariant-audit.js`: 7/8 checks pass; the remaining check is the pre-existing iframe sandbox requirement assigned to Phase 5.
- `tools/run-all-qa.js`: PASS — 46/46 suites.

## Remaining known issues

- Generated/remote exam iframes still require sandbox hardening; this remains an explicit Phase 5 release blocker.
- Cloud answer-key retrieval for grading must be completed with the Phase 5 authorization model; public student reads are intentionally answer-free now.

## Exit gate

PASS for Phase 3 acceptance: canonical validation, public/private persistence separation, Math and all four V-ACT round trips, offline/reconnect queue behavior, deletion integrity, and grading regression coverage are green. The global release gate remains blocked by the separately tracked Phase 5 iframe/security item.
