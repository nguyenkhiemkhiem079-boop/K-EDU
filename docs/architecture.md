# K-EDU architecture

K-EDU is local-first. `LocalStudentProfile` stores a stable local `studentId`; the student can use the local exam flow without an account. Firebase is optional secondary sync, but cloud teacher mutations and private answer-key access require Firebase Authentication with a teacher custom claim.

## Canonical exam path

Math, KHTN and V-ACT follow:

`generator → QuizContract(schema v2) → public/private storage split → ExamDocumentRenderer → student submission → grading → review/analytics`

`QuizContract` is the canonical boundary for counts, sections, profile metadata, provenance, diagnostics, answer validation and completeness. Student-facing records are normalized without answer values; teacher/private answer keys are kept separately in IndexedDB and, when configured, `quiz_answer_keys` in Firestore.

`StorageEngine` persists public quiz records in IndexedDB and keeps only a lightweight index in localStorage. Private keys, attachments, sync queues, tombstones and result records have separate persistence paths. Local save completes before cloud sync is queued; failed cloud operations are logged with structured error information and retried when connectivity returns.

`ExamDocumentRenderer` treats generated/uploaded HTML as untrusted, sanitizes it, strips student answer tables, and renders it inside sandboxed iframes. It does not expose private answers through `AppState` or public quiz payloads.

## Optional generation modules and bank loading

The student lobby does not eagerly load the optional Math/KHTN engines or the document bank. `js/runtime/moduleLoader.js` is the one browser loading boundary for those modules. It caches concurrent requests, retries after a failed script load, records load timing, and loads the document-bank grade shard only when generation requests it. The V-ACT source-backed bank has its own strict `sourceBankLoader` and remains independent from the legacy Math bank.

## Legacy boundary

`MathExamPlatform/` is retained as a compatibility fixture for regression tests and historical consumers only. It is not part of the main page's production generation path. New production work belongs in `js/mathGenerator.js`, `js/vact/`, `js/quizContract.js`, and `js/storage.js`; the legacy platform must not be used to satisfy production counts or answer-key flows.
