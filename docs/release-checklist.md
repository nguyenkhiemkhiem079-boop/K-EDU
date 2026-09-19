# Release checklist

- Run `npm ci` and `npm test` in a Node environment with npm available.
- Verify login-free local student profile, Math/KHTN/V-ACT generation, upload, save/reload, submit/review and teacher results.
- Check desktop, tablet and mobile exam layout.
- Test offline creation/submission and reconnect cloud queue recovery.
- Confirm no student answer key appears before submission and no Firebase Auth SDK is loaded.
