# Production hardening — Phase 7

## Scope

Final QA integrity, fail-closed release gating, browser smoke evidence, and release acceptance reporting.

## Confirmed defects found

1. The repository had many verification scripts but no authoritative classification separating behavioral tests from static source checks.
2. There was no single command that failed release on either the canonical invariant audit or a failed QA suite.
3. The V-ACT 2,000-run property suite could exceed the generic 120-second child-process timeout under a slower workspace runtime, producing a false release failure.
4. Browser smoke testing exposed startup eager-loading and narrow-viewport overflow during Phase 6; those defects were repaired and regression-checked before this gate.

## Changes

- Added `tools/test-integrity-manifest.json`, classifying all 50 `verify_*.js` suites into behavioral, property/fuzz, integration, static-contract, data-quality, persistence, security, browser-bank, and release-gate categories.
- Added `tools/verify_test_integrity.js`, which fails if a verification suite is missing, duplicated, or unclassified and reports static checks separately.
- Added `tools/final_release_gate.js`, which runs the integrity manifest, the eight canonical production invariants, and the complete QA runner. Any failure sets `releaseReady: false` and a non-zero exit code.
- Increased only the measured CPU-heavy V-ACT profile-suite timeout from 120 seconds to 300 seconds; all other suite timeouts remain 120 seconds.
- Updated the runtime regression fixture to model an explicitly authorized teacher when it expects cloud result merging; the production cloud guard remains fail-closed.
- Added release-checklist entries requiring the final gate, integrity manifest, and actual browser smoke evidence.

## Browser evidence

Local browser smoke testing on 2026-09-20 verified:

- Fresh student tab: optional Math, KHTN, and document-bank scripts loaded `0`; horizontal overflow was `false` at the available desktop viewport (`1280px`) and the previously exercised narrow in-app viewport (`332px`).
- Teacher bank-generation view: optional Math and document-bank modules loaded on demand.
- Four teacher profile controls existed with explicit values `vact_mini_30`, `vact_mini_60`, `vact_mini_100`, and `vact_full`.
- Selecting each profile updated the visible button and time to `30/40`, `60/75`, `100/90`, and `120/150` respectively.
- Student and teacher exam iframes exposed `sandbox="allow-same-origin"`.
- No answer-bearing student payload was used in this browser smoke path; contract-level privacy and round-trip tests cover the public/private answer boundary.

The local browser used for this smoke check was not a deployment environment. Firebase warnings about missing teacher authentication, offline persistence ownership, or unavailable anonymous sign-in are deployment/configuration prerequisites and did not bypass or weaken the local public/private boundary.

## Final test results

- `node tools/verify_test_integrity.js` — PASS; 50 suites classified exactly once.
- `node tools/production-invariant-audit.js` — PASS; 8/8 canonical invariants.
- `node tools/run-all-qa.js` — PASS; 50/50 suites.
- `node tools/final_release_gate.js` — PASS after the V-ACT timeout bound was corrected; the gate is fail-closed.
- `git diff --check` and changed-file syntax checks — PASS.

## Phase 7 exit gate

PASS for the repository hardening cycle covered by this audit. No known unresolved P0/P1 generation, grading, persistence, provenance, answer-privacy, or security-boundary defect remains in the tested local architecture.

Cloud release still requires deployment of the canonical Firebase rules, enabling Firebase Authentication, and provisioning a teacher custom claim as listed in the release checklist.
