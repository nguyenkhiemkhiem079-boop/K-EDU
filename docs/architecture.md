# K-EDU architecture

K-EDU is local-first. `LocalStudentProfile` stores a stable local `studentId`; student login and Firebase Auth are not used.

`QuizContract` normalizes every quiz to schema version 1. Generators produce DTOs, then the contract supplies counts, document, assignment, settings, metadata, and legacy compatibility.

`StorageEngine` keeps full quiz records in IndexedDB and only a lightweight quiz index in localStorage. `ExamDocumentRenderer` resolves the canonical document and renders generated papers using iframe `srcdoc`; the student audience has answer-key HTML removed.

Firebase is optional secondary sync. Local quiz/result persistence succeeds first; queue entries retry when connectivity returns. Math, KHTN and V-ACT all follow generator → contract → storage → renderer → student result/review/analytics.
