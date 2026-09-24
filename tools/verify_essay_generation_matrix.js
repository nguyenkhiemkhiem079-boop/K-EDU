/**
 * K-EDU Math Essay Generation Matrix Regression Suite
 *
 * WHY THIS FILE EXISTS:
 * On 2026-09-23 a production bug was found where essay generation silently
 * returned 0 questions for specific (grade, level) combinations — grade 7
 * VD, grade 8 TH, grade 9 TH, grade 11 TH — in hybrid mode, for ALL 4 terms.
 * Root cause: GradeEngines.getTemplates() silently fell back to templates of
 * the WRONG level when no template of the requested level existed, which
 * then got rejected downstream and misreported as "duplicate content
 * signature" instead of the real cause (missing template content).
 *
 * The existing 54-suite QA run did NOT catch this, because no suite swept
 * every (grade, level, term) combination in isolation. This suite closes
 * that gap: it sweeps the full matrix and fails loudly if any single
 * combination silently produces fewer essay questions than requested.
 *
 * If this suite ever fails again, it means either:
 *   (a) a level-mismatch bug like the original one has resurfaced, or
 *   (b) a grade/level essay template pool has shrunk below what a normal
 *       1-question request needs — check GradeEngines.getGradeXTemplates()
 *       for the affected grade before assuming it's a "known VDC gap".
 */

const assert = require('assert');
require('../js/specializedBankPolicy');
require('../js/documentQuestionBank');
const MathEngine = require('../js/mathGenerator');

console.log('================================================================');
console.log('🧪 VERIFY ESSAY GENERATION MATRIX (grade × level × term)');
console.log('================================================================\n');

const GRADES = ['6', '7', '8', '9', '10', '11', '12'];
const TERMS = ['GK1', 'GK2', 'CK1', 'CK2'];
const LEVELS = ['TH', 'VD']; // VDC is excluded: by design it requires an
// approved specialized-bank source in hybrid mode (SpecializedBankPolicy),
// and the current content bank has 0 approved VDC sources for every grade.
// That is a known, accepted content-coverage gap — not a code defect — so
// asserting VDC would make this suite fail on a non-bug. If VDC content is
// ever added, extend this suite to also assert VDC succeeds.

console.log('👉 [TEST 1] Requesting exactly 1 TH/VD essay question succeeds for every (grade, term)\n');

const failures = [];
for (const grade of GRADES) {
  for (const level of LEVELS) {
    for (const term of TERMS) {
      const matrix = { TH: 0, VD: 0, VDC: 0 };
      matrix[level] = 1;
      const result = MathEngine.generateExam({
        grade, term, topic: 'all', sourceMode: 'hybrid',
        mcqCount: 0, essayMatrix: matrix
      });
      if (!result || result.essayCount !== 1) {
        failures.push({ grade, level, term, essayCount: result?.essayCount ?? null, warning: result?.warning ?? null });
      }
    }
  }
}

if (failures.length) {
  console.error(`  ❌ ${failures.length} combination(s) failed to produce the requested essay question:`);
  failures.forEach(f => console.error(`     grade=${f.grade} level=${f.level} term=${f.term} -> essayCount=${f.essayCount} warning="${f.warning}"`));
}
assert.strictEqual(failures.length, 0, `${failures.length} (grade, level, term) combination(s) silently produced fewer essay questions than requested — see stderr above.`);
console.log(`  => [TEST 1 PASSED] All ${GRADES.length * LEVELS.length * TERMS.length} combinations produced their 1 requested essay question.\n`);

console.log('👉 [TEST 2] The 4 specific combinations from the 2026-09-23 incident stay fixed\n');

const REGRESSION_CASES = [
  { grade: '7', level: 'VD' },
  { grade: '8', level: 'TH' },
  { grade: '9', level: 'TH' },
  { grade: '11', level: 'TH' }
];
for (const { grade, level } of REGRESSION_CASES) {
  for (const term of TERMS) {
    const matrix = { TH: 0, VD: 0, VDC: 0 };
    matrix[level] = 5; // the volume the original bug report used
    const result = MathEngine.generateExam({
      grade, term, topic: 'all', sourceMode: 'hybrid',
      mcqCount: 0, essayMatrix: matrix
    });
    assert.strictEqual(
      result.essayCount, 5,
      `REGRESSION: grade ${grade} level ${level} term ${term} produced ${result.essayCount}/5 essay questions (warning: ${result.warning}). This is the exact bug fixed on 2026-09-23 — check GradeEngines templates and getTemplates() level filtering.`
    );
  }
}
console.log(`  => [TEST 2 PASSED] All 4 previously-broken combinations still produce 5/5 essay questions.\n`);

console.log('👉 [TEST 3] Batch generation (multiple exams) does not regress on the fixed combinations\n');

const batch = MathEngine.generateBatchExams({
  count: 3, grade: '11', term: 'GK1', topic: 'all', sourceMode: 'hybrid',
  mcqCount: 10, essayMatrix: { TH: 1, VD: 0, VDC: 0 }
});
const exams = Array.isArray(batch) ? batch : batch.exams;
exams.forEach((exam, i) => {
  assert.strictEqual(exam.essayCount, 1, `Batch exam #${i + 1} (grade 11 TH) produced ${exam.essayCount}/1 essay question — batch generation regressed on the fixed combination.`);
});
console.log(`  => [TEST 3 PASSED] All ${exams.length} batch exams produced their 1 requested essay question.\n`);

console.log('================================================================');
console.log('✅ ALL ESSAY GENERATION MATRIX TESTS PASSED');
console.log('================================================================');
