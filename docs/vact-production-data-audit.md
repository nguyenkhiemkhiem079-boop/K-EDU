# V-ACT production data audit

This audit is generated from the committed source-backed shards. The repair step is conservative: it removes only structural option labels and marks incomplete records for review; it never invents questions, answers, stimuli, or PDFs.

Run `node tools/repair_vact_bank.js` followed by `node tools/verify_vact_production_hardening.js` to refresh the audit inputs. The machine report is `data/vact/post-ingestion-hardening.json`; ingestion provenance remains in `data/vact/ingestion-report.json`.

## Acceptance policy

- A production record has stable source-backed identity, four options, a verified A–D answer, and complete required stimulus/visual content.
- Fuzzy duplicate candidates are reported for review and are never auto-deleted.
- Review records retain question text, options, answer and source metadata.
- Original PDFs and user history are not modified or cleared.
