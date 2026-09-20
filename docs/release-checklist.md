# Release checklist

- Run `npm ci` and `npm test` in a Node environment with npm available.
- Run `node tools/final_release_gate.js`; it must report `releaseReady: true` and `50/50 QA suites passed`.
- Run `node tools/verify_test_integrity.js`; static suites must remain separately classified from browser/behavioral evidence.
- Verify login-free local student profile, Math/KHTN/V-ACT generation, upload, save/reload, submit/review and teacher results.
- Verify the student lobby does not eagerly load the optional Math/KHTN/document-bank modules; exercise teacher generation to confirm retry-safe lazy loading.
- Check desktop, tablet and mobile exam layout.
- Record an actual browser smoke result for fresh student startup and teacher profile selection; do not substitute source-string checks for this evidence.
- Test offline creation/submission and reconnect cloud queue recovery.
- Confirm no student answer key appears before submission and no answer-bearing public Firestore payload is written.
- Deploy `firebase/firestore.rules` and `firebase/storage.rules`; enable Firebase Authentication and provision the teacher custom claim before cloud release.
- Treat `MathExamPlatform/` as compatibility-only and verify no main-page production path imports it.
