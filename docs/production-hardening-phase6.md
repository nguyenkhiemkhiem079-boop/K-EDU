# Production hardening — Phase 6

## Scope

Optional browser module loading, initial payload reduction, runtime measurements, architecture documentation, and legacy-platform isolation.

## Changes

- Added `js/runtime/moduleLoader.js` as the single cached/retry-safe boundary for `documentQuestionBank.js`, `mathGenerator.js`, and `khtnGenerator.js`.
- Removed those optional generation modules from the initial `index.html` script graph.
- Updated teacher generation, Math capacity, document-bank statistics, and repair flows to await the module boundary.
- Preserved grade-specific shard loading through `DocumentQuestionBank.ensureGradeLoaded()`.
- Added `tools/measure_phase6_runtime.js` for reproducible payload/compile/generation measurements.
- Added `tools/verify_phase6_architecture.js` to prevent accidental reintroduction of eager optional scripts or the legacy platform into the main page.
- Updated architecture and release documentation for QuizContract v2, Firebase Auth, answer-key separation, lazy loading, and `MathExamPlatform/` compatibility-only status.

## Measured result

Measured from the repository's local JavaScript script graph:

| Metric | Before | After |
|---|---:|---:|
| Initial local JavaScript | 2,957,270 bytes | 964,423 bytes |
| Eager optional Math/document-bank/KHTN payload | 1,996,584 bytes | 0 bytes |
| Initial local script count | 39 | 37 |
| Node compile proxy | not recorded in Phase 0 | 71.51 ms |

Deferred compile samples were 44.33 ms for the document bank, 6.82 ms for Math, and 2.47 ms for KHTN on the measurement runtime. Synthetic seeded Math generation completed in 1,134.11 ms and reported complete. Browser network, mobile CPU, and real heap measurements remain deployment/browser-profile checks rather than Node proxies.

## Tests executed

- `node tools/verify_phase6_architecture.js` — PASS
- `node tools/measure_phase6_runtime.js` — PASS; measurements recorded above
- Browser-bank lazy loading/concurrency/retry regression — PASS
- App generation integration regression — PASS (15/15)
- Math production invariants — PASS
- V-ACT profile hardening — PASS (2,000 deterministic runs)
- Phase 3 round-trip, renderer, runtime regression — PASS

## Phase 6 exit gate

PASS for the incremental architecture and loading changes. The legacy `MathExamPlatform/` remains available only for compatibility regression coverage and is not a production dependency of the main page.
