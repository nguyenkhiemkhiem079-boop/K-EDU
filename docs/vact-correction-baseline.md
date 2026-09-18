# V-ACT Correction Baseline

Baseline branch point: `main@f7bea7ffe9b85271f2c24971b7c1c2a6e2150d53`

This correction pass is restricted to the production blockers specified in the V-ACT hardening request.

## Current generated-bank baseline

- Production: 1,758
- Review required: 3,226
- Invalid: 1,711
- Vietnamese: 415
- English: 421
- Math: 427
- Logic/Data: 209
- Scientific Reasoning: 286
- Mini100 readiness: true
- Full120 mixed-bank readiness: true

## Verified blockers at baseline

1. Browser did not explicitly load `data/vact/questions.json` / `data/vact/sources.json` before generation.
2. Source IDs were sequential (`vact_source_000001`) rather than content-stable.
3. Solution matching keyed only on `questionNumber`.
4. Required visual/stimulus completeness was not a production gate.
5. Original-exam completeness allowed 120 extracted / 100 production to count as complete.
6. Unknown section inference defaulted to Math.
7. Null difficulty was silently treated as medium in generation/review.
8. Generic compaction could remove V-ACT review detail.
9. Scientific skill coverage was largely unclassified.
10. Existing QA did not explicitly prove these blockers were fixed.
