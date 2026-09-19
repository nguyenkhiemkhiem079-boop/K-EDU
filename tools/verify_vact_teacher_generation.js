/**
 * verify_vact_teacher_generation.js
 *
 * 20-test automated verification suite for the K-EDU Teacher Hub V-ACT Exam Generator fix.
 * Run from repo root: node tools/verify_vact_teacher_generation.js
 */

'use strict';

const path = require('path');
const fs = require('fs');

let passed = 0;
let failed = 0;
const failures = [];

function assert(name, condition, detail = '') {
  if (condition) {
    console.log(`  PASS  ${name}`);
    passed++;
  } else {
    console.error(`  FAIL  ${name}${detail ? ' -- ' + detail : ''}`);
    failed++;
    failures.push({ name, detail });
  }
}

function assertEqual(name, actual, expected) {
  const ok = actual === expected;
  assert(name, ok, ok ? '' : 'expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual));
}

function assertAtLeast(name, actual, min) {
  const ok = typeof actual === 'number' && actual >= min;
  assert(name, ok, ok ? '' : 'expected >= ' + min + ', got ' + actual);
}

const ROOT = path.resolve(__dirname, '..');

let taxonomy, profiles, signature, sectionGen, coverage, examGenMod, sourceBankLoader;

try {
  taxonomy = require(path.join(ROOT, 'js/vact/taxonomy'));
  profiles = require(path.join(ROOT, 'js/vact/profiles'));
  signature = require(path.join(ROOT, 'js/vact/quality/signature'));
  sectionGen = require(path.join(ROOT, 'js/vact/generator/sectionTestGenerator'));
  coverage = require(path.join(ROOT, 'js/vact/bank/coverage'));
  examGenMod = require(path.join(ROOT, 'js/vact/generator/examGenerator'));
  sourceBankLoader = require(path.join(ROOT, 'js/vact/bank/sourceBankLoader'));
} catch (err) {
  console.error('Failed to load required modules:', err.message);
  process.exit(1);
}

const VACTExamGenerator = examGenMod.VACTExamGenerator || examGenMod;
const VACTCoverage = coverage.VACTCoverage || coverage;
const loader = sourceBankLoader.sourceBankLoader || sourceBankLoader;

async function main() {
  console.log('\nK-EDU V-ACT Teacher Hub Generation -- Verification Suite (20 Tests)\n');

  console.log('Loading source bank...');
  try {
    await loader.ready();
    console.log('  Source bank status:', loader.getStatus());
  } catch (err) {
    console.error('  Source bank failed to load:', err.message);
    process.exit(1);
  }

  const allQ = VACTCoverage.getUniqueUsableQuestions();

  console.log('\n-- Group 1: Source Bank Capacity');
  assertAtLeast('T01: Source bank has > 0 questions', allQ.length, 1);
  assertAtLeast('T02: Source bank has >= 1758 questions', allQ.length, 1758);

  console.log('\n-- Group 2: Profile Readiness');
  const readinessMini = VACTCoverage.getProfileReadiness('vact_mini_100');
  const readinessFull = VACTCoverage.getProfileReadiness('vact_full');

  assert('T03: Mini100 readiness is true', readinessMini.ready === true,
    'available=' + readinessMini.totalAvailable + ', required=' + readinessMini.totalRequired);
  assert('T04: Full120 readiness is true', readinessFull.ready === true,
    'available=' + readinessFull.totalAvailable + ', required=' + readinessFull.totalRequired);

  console.log('\n-- Group 3: Exam Generation Counts');
  let mini, full;

  try { mini = VACTExamGenerator.generateMini100(); }
  catch (err) { assert('T05: Mini100 generates without error', false, err.message); }

  try { full = VACTExamGenerator.generateFull120(); }
  catch (err) { assert('T07: Full120 generates without error', false, err.message); }

  if (mini) {
    assertEqual('T05: Mini100 generatedTotal === 100', mini.generatedTotal, 100);
    assertEqual('T06: Mini100 requestedTotal === 100', mini.requestedTotal, 100);
  } else {
    assert('T05: Mini100 generatedTotal === 100', false, 'mini exam is null');
    assert('T06: Mini100 requestedTotal === 100', false, 'mini exam is null');
  }

  if (full) {
    assertEqual('T07: Full120 generatedTotal === 120', full.generatedTotal, 120);
    assertEqual('T08: Full120 requestedTotal === 120', full.requestedTotal, 120);
  } else {
    assert('T07: Full120 generatedTotal === 120', false, 'full exam is null');
    assert('T08: Full120 requestedTotal === 120', false, 'full exam is null');
  }

  console.log('\n-- Group 4: Section Distribution Quotas');
  const MINI_QUOTAS = { vietnamese: 25, english: 25, math: 25, logic_data: 10, scientific_reasoning: 15 };
  const FULL_QUOTAS = { vietnamese: 30, english: 30, math: 30, logic_data: 12, scientific_reasoning: 18 };

  if (mini) {
    let t = 9;
    for (const [sec, req] of Object.entries(MINI_QUOTAS)) {
      const actual = mini.sections && mini.sections[sec] ? mini.sections[sec].generated : -1;
      assertEqual('T' + (t++) + ': Mini100 ' + sec + ' === ' + req, actual, req);
    }
  }

  if (full) {
    let t = 14;
    for (const [sec, req] of Object.entries(FULL_QUOTAS)) {
      const actual = full.sections && full.sections[sec] ? full.sections[sec].generated : -1;
      assertEqual('T' + (t++) + ': Full120 ' + sec + ' === ' + req, actual, req);
    }
  }

  console.log('\n-- Group 5: Question Uniqueness');
  if (mini) {
    const miniSigs = mini.questions.map(q => signature.computeVACTQuestionSignature(q));
    assertEqual('T19: Mini100 has 100 unique signatures', new Set(miniSigs).size, 100);
  } else {
    assert('T19: Mini100 has 100 unique signatures', false, 'mini exam is null');
  }

  if (full) {
    const fullSigs = full.questions.map(q => signature.computeVACTQuestionSignature(q));
    assertEqual('T20: Full120 has 120 unique signatures', new Set(fullSigs).size, 120);
  } else {
    assert('T20: Full120 has 120 unique signatures', false, 'full exam is null');
  }

  console.log('\n-- Group 6: Source Provenance & Quality');
  if (mini) {
    const bad = mini.questions.filter(q => q.status !== 'production' || (q.source && q.source.extractedFromSource === false));
    assert('B01: All Mini questions are source-backed', bad.length === 0, bad.length + ' non-production found');
  }
  if (full) {
    const bad = full.questions.filter(q => q.status !== 'production' || (q.source && q.source.extractedFromSource === false));
    assert('B02: All Full questions are source-backed', bad.length === 0, bad.length + ' non-production found');
  }

  console.log('\n-- Group 7: Generator Routing & Correctness');
  const appJs = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');

  const triggerStart = appJs.indexOf('async function triggerAutoGenerateDgnlExam()');
  const triggerEnd = triggerStart !== -1 ? appJs.indexOf('\nasync function ', triggerStart + 10) : -1;
  const triggerFn = triggerStart !== -1 ? appJs.slice(triggerStart, triggerEnd !== -1 ? triggerEnd : triggerStart + 5000) : '';

  assert('B03: triggerAutoGenerateDgnlExam does NOT call MathEngine.generateDgnlExam',
    triggerFn.length > 0 && !triggerFn.includes('MathEngine.generateDgnlExam'));
  assert('B04: triggerAutoGenerateDgnlExam uses VACTExamGenerator',
    triggerFn.includes('VACTExamGenerator') || triggerFn.includes('examGen'));

  assert('B05: Property name is generatedTotal (not totalGenerated)',
    !appJs.includes('examResult.totalGenerated'));
  assert('B06: Property name is requestedTotal (not totalRequested)',
    !appJs.includes('examResult.totalRequested'));
  assert('B07: btnStart.disabled correctly uses !readiness.ready',
    !appJs.includes('readiness.totalAvailable === 0)'));

  if (mini) {
    assert('B08: null difficulty does not cause DIFFICULTY_SHORTAGE',
      !mini.shortages.some(s => s.reason === 'DIFFICULTY_SHORTAGE'));
    assert('B09: Mini100 isComplete === true', mini.isComplete === true);
  }
  if (full) {
    assert('B10: Full120 isComplete === true', full.isComplete === true);
  }

  const total = passed + failed;
  console.log('\n======================================================');
  console.log('  Results: ' + passed + '/' + total + ' passed, ' + failed + ' failed');
  if (failures.length > 0) {
    console.log('\n  Failures:');
    failures.forEach(f => console.log('    FAIL: ' + f.name + (f.detail ? ' -- ' + f.detail : '')));
  }
  console.log('======================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
