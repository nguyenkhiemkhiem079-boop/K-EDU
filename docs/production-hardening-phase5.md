# Production hardening — Phase 5

## Scope

Firebase authorization and collection coverage, answer-key isolation, local-vs-cloud authentication, document iframe isolation, HTML sanitization, and direct-browser AI-key warnings.

## Confirmed defects fixed

- A known teacher/master credential was embedded in the client bundle and accepted by client-controlled storage/session state.
- Firebase rules did not cover the runtime `quizzes`, `quiz_answer_keys`, `results`, `roster`, and `students` topology as one reviewed policy.
- Private answer-key cloud reads/writes were not protected by an authenticated teacher claim.
- Cloud sync retries could pass a full answer-bearing quiz object to an adapter instead of an answer-free public payload.
- The two exam document iframes were not sandboxed.
- HTML filtering did not consistently remove executable tags, event-handler attributes, or unsafe resource URLs.
- Browser-side Gemini/Claude key usage was not clearly marked as exposed to the browser environment.

## Security model after Phase 5

- The teacher PIN and master role are explicitly local-device convenience gates. There is no known default credential and they never authorize Firebase.
- Firebase teacher operations require a non-anonymous Firebase Auth user with `request.auth.token.teacher == true` (or an application-level admin role accepted by the client claim check).
- Public quiz documents are answer-free. `quiz_answer_keys` is teacher-only. The sync adapter receives a public quiz record plus a separate private-key argument.
- Student cloud result writes are owned by the Firebase user ID. Result reads and all roster/teacher mutations are teacher-only.
- Both document frames use `sandbox="allow-same-origin"` without `allow-scripts`; source HTML is sanitized before `srcdoc` assignment.
- `firebase/firestore.rules` and `firebase/storage.rules` are the canonical reviewed rules, wired by `firebase/firebase.json`. They must be deployed to the target Firebase project before enabling production cloud sync.

## Files changed

- `js/firebase.js`
- `js/storage.js`
- `js/app.js`
- `js/examDocumentRenderer.js`
- `js/pdfExtractor.js`
- `index.html`
- `firebase/firestore.rules`
- `firebase/storage.rules`
- `firebase/firebase.json`
- `tools/verify_phase5_security.js`
- `tools/verify_cloud_sync.js`

## Tests executed

- `node tools/verify_phase5_security.js` — PASS
- `node tools/verify_cloud_sync.js` — PASS
- `node tools/verify_phase3_roundtrip.js` — PASS; public answer leak false
- `node tools/verify_exam_document_renderer.js` — PASS
- `node tools/verify_runtime_regressions.js` — PASS
- JavaScript syntax checks for the modified runtime files — PASS

## Phase 5 exit gate

PASS for the repository security boundary and regression suite. Production deployment still requires Firebase Authentication to be enabled, teacher custom claims to be provisioned, and the canonical rules in this phase to be deployed; a local PIN alone is intentionally insufficient.
