# K-EDU production-hardening baseline — Phase 0

Date: 2026-09-20  
Baseline: `main` / `b571f924151359fc9946987e832015b3328210ba`  
Repository: `nguyenkhiemkhiem079-boop/K-EDU`

## Baseline execution

- Working tree: clean.
- `HEAD == origin/main` after `git fetch origin main`.
- `npm test`: could not start because `npm` is not available on the shell `PATH`.
- Equivalent runner: bundled Node `v24.19.0`, executing `node tools/run-all-qa.js`.
- Legacy QA result: `43/43` suites passed; result artifact: `tools/qa-results.json`.
- Browser tooling: no Playwright, Puppeteer, Chromium runner, or browser E2E dependency is present in the repository. Existing browser-labelled suites use VM/DOM mocks or static source checks.
- Persistence baseline: `tools/verify_quiz_storage_persistence.js` validates normalization and serialized sizes in memory; it does not perform a real IndexedDB/localStorage save → reload → student → submit → grade round trip.

The green legacy result is therefore a compatibility baseline, not a production-release decision.

## Current production-bank baseline

The active source-backed runtime bank is `data/vact/questions.json`:

| Section | Usable production records | Runtime quota for Full120 |
| --- | ---: | ---: |
| Vietnamese | 230 | 30 |
| English | 373 | 30 |
| Math | 176 | 30 |
| Logic/Data | 28 | 12 |
| Scientific reasoning | 47 | 18 |
| **Total** | **854** | **120** |

All 854 active records currently pass the source-backed loader checks and have registered source IDs, source files, extracted-source flags, verified answers, and source pages. Difficulty and scientific-skill metadata are not classified in the active bank: every section is currently reported as unclassified, and physics/chemistry/biology are each reported as zero classified records. The bank-health report also reports 17 probable duplicate pairs and 30 review-required pairs.

The current profile registry exposes only:

- `vact_mini_100`: 25 / 25 / 25 / 10 / 15, 90 minutes — runtime-ready.
- `vact_full`: 30 / 30 / 30 / 12 / 18, 150 minutes — runtime-ready.

Mini30 and Mini60 do not exist yet. Long-term coverage targets (2,400 records) are separate from runtime readiness and are not treated as the same requirement.

## Canonical production flows

### Math

```text
Teacher UI
→ generator configuration
→ capacity preflight
→ document/template source filtering
→ question selection
→ duplicate prevention
→ option shuffle and answer remapping
→ score assignment
→ generation diagnostics
→ QuizContract normalization
→ local/cloud persistence
→ reload
→ Student Arena public payload
→ submission
→ ExamVault/V-ACT grading
→ review and analytics
```

### V-ACT

```text
source files
→ ingestion and normalization
→ production validation
→ sourceBankLoader
→ VACTInternalBank
→ coverage/readiness
→ explicit profile
→ section generator
→ exam generator
→ quiz formatter
→ QuizContract
→ local/cloud persistence
→ reload
→ Student Arena
→ grading
→ analytics/review
```

## Canonical invariants

### Generation and data quality

- A production question has non-empty content, valid options, a verified answer, and an answer that maps to an available option.
- Production selection rejects invalid, unverified, guessed, review-required, duplicate, or provenance-incomplete records.
- `requested`, `generated`, `missing`, `isComplete`, and structured `shortages` agree at every generator boundary.
- An incomplete requested exam is never saved or presented as complete.
- One exam contains no duplicate canonical signatures; disjoint batches share no signatures.
- The same bank/configuration/seed produces the same canonical question content, order, option order, answer mapping, metadata, and diagnostics.
- Option shuffling preserves the answer value, and scores sum to exactly 10 for Math ten-point exams.

### V-ACT

- The profile ID, section quotas, total, time limit, and completeness state are explicit and registry-resolved.
- All four profiles use the same profile-driven generator and enforce exact section isolation.
- Every production V-ACT record is `status: production`, source-backed, answer-verified, and provenance-complete.
- Stimulus, assets, source, question provenance, solution provenance, quality, and `examSetId` survive generation, formatting, persistence, reload, grading, and review.
- Difficulty diagnostics distinguish requested, classified, unclassified, actual, redistributed, and fallback values without inventing labels.

### Contract, persistence, grading, and privacy

- `totalQuestions === answerKeys.length` and MCQ/essay totals reconcile.
- Question IDs/numbers are unique and contiguous where required; scores are finite and non-negative.
- MCQ answers map to options; essay answers are present and intentionally gradeable.
- Save → reload preserves canonical fields and does not resurrect deleted data.
- Student-visible quiz, storage, cloud, DOM, and iframe payloads contain no private answer key or explanation before submission.
- Grading matches exact MCQ answers and safe mathematical equivalents only; partial numeric substrings never match.
- Cloud synchronization is explicit about pending, success, failure, retry, and deletion state.

## Confirmed pre-change defects

1. `js/mathGenerator.js` falls back to `A` for missing MCQ answers and `12 | x=12` for missing essay answers; both records are marked complete.
2. `difficultyMode` does not filter document MCQs; a `VD` record is accepted as both basic and advanced.
3. Math does not consume `config.seed`; repeated seeded calls differ.
4. Math signatures are weaker than the required canonical normalization and batch capacity uses `templateCount * 12`.
5. `js/vact/profiles.js` and `js/vact/generator/examGenerator.js` define only Mini100/Full120 and resolve profiles with hard-coded branches.
6. V-ACT formatters and review code treat absent `answerVerified`/`sourceVerified` metadata as verified.
7. `js/quizContract.js` accepts missing/invalid answers, duplicate numbers, non-finite scores, and contradictory V-ACT metadata.
8. `StorageEngine.getQuiz()` and `FirebaseEngine.saveQuiz()` operate on full teacher records containing answer keys; no public/private payload split exists.
9. `js/examDocumentRenderer.js` uses regex-only sanitization and the two exam iframes in `index.html` have no sandbox.
10. The repository has no complete ruleset for the runtime `quizzes`, `results`, `roster`, and Storage paths.
11. Critical paths still contain empty catches, including loader/storage/sync-adjacent code.

## Phase 0 audit harness

`tools/production-invariant-audit.js` is a standalone, non-legacy audit command. It records the confirmed failures above without changing production code or weakening the existing QA suite. It is expected to fail on this baseline and becomes a release-gate suite after the corresponding phases repair the root causes.

## Phase 0 exit gate

- Canonical flows documented: PASS.
- Canonical invariants documented: PASS.
- Baseline SHA, QA result, bank counts, readiness, Math evidence, and persistence limitation recorded: PASS.
- Uncontrolled production implementation modifications: NONE.
- Phase 0: **PASS**.
