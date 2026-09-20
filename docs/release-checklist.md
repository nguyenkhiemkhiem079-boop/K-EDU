# Release checklist

- Run `npm ci` and `npm test` in a Node environment with npm available.
- Verify login-free local student profile, Math/KHTN/V-ACT generation, upload, save/reload, submit/review and teacher results.
- Verify the student lobby does not eagerly load the optional Math/KHTN/document-bank modules; exercise teacher generation to confirm retry-safe lazy loading.
- Check desktop, tablet and mobile exam layout.
- Test offline creation/submission and reconnect cloud queue recovery.
- Confirm no student answer key appears before submission and no answer-bearing public Firestore payload is written.
- Deploy `firebase/firestore.rules` and `firebase/storage.rules`; enable Firebase Authentication and provision the teacher custom claim before cloud release.
- Treat `MathExamPlatform/` as compatibility-only and verify no main-page production path imports it.
