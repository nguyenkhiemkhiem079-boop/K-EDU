/**
 * K-EDU V-ACT Runtime Question Bank & Loader Verification Suite
 * Tests all 17 required criteria for the V-ACT runtime source bank loader:
 * 1. source loader exists
 * 2. questions.json loads
 * 3. sources.json loads
 * 4. source IDs match
 * 5. production count > 0
 * 6. browser bank receives questions
 * 7. Mini readiness no longer 0/100
 * 8. Full readiness no longer 0/120
 * 9. Mini generates exactly 100
 * 10. Full generates exactly 120
 * 11. correct section quotas
 * 12. unique question IDs/signatures
 * 13. source-backed only
 * 14. loader failure does not use legacy fallback
 * 15. loader failure disables generation
 * 16. UI loading state does not display fake zero shortage
 * 17. retry can recover after initial failure
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const rootDir = path.resolve(__dirname, '..');
const vact = require('../js/vact');

async function runVactRuntimeBankTests() {
  console.log('--- Starting V-ACT Runtime Bank & Loader Verification Suite ---');

  // Test 1: source loader exists
  console.log('1. Verifying source loader exists and exposes API...');
  const loader = vact.sourceBankLoader || vact.bank?.sourceBankLoader;
  assert.ok(loader, 'sourceBankLoader must be exported by V-ACT system');
  assert.equal(typeof loader.ready, 'function', 'loader.ready() must be a function');
  assert.equal(typeof loader.reload, 'function', 'loader.reload() must be a function');
  assert.equal(typeof loader.getStatus, 'function', 'loader.getStatus() must be a function');
  assert.equal(typeof loader.getError, 'function', 'loader.getError() must be a function');

  // Test 2 & 3: questions.json and sources.json load
  console.log('2 & 3. Verifying questions.json and sources.json load from repository...');
  const questionsPath = path.join(rootDir, 'data', 'vact', 'questions.json');
  const sourcesPath = path.join(rootDir, 'data', 'vact', 'sources.json');

  assert.ok(fs.existsSync(questionsPath), 'data/vact/questions.json must exist');
  assert.ok(fs.existsSync(sourcesPath), 'data/vact/sources.json must exist');

  const questionsData = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));
  const sourcesData = JSON.parse(fs.readFileSync(sourcesPath, 'utf8'));

  assert.ok(Array.isArray(questionsData) && questionsData.length > 0, 'questions.json must be a non-empty array');
  assert.ok(Array.isArray(sourcesData) && sourcesData.length > 0, 'sources.json must be a non-empty array');

  // Test 4: source IDs match
  console.log('4. Verifying all question source IDs match sources.json...');
  const validSourceIds = new Set(sourcesData.map(s => s.sourceId || s.id).filter(Boolean));
  assert.ok(validSourceIds.size > 0, 'sources.json must have valid sourceIds');

  const invalidSourceRefs = [];
  for (const q of questionsData) {
    if (!q.source?.sourceId || !validSourceIds.has(q.source.sourceId)) {
      invalidSourceRefs.push({ id: q.id, sourceId: q.source?.sourceId });
    }
  }
  assert.equal(invalidSourceRefs.length, 0, `All question sourceIds must exist in sources.json. Found ${invalidSourceRefs.length} invalid.`);

  // Test 5: production count > 0
  console.log('5. Verifying production questions count > 0...');
  const prodQuestions = questionsData.filter(q => q.status === 'production');
  assert.ok(prodQuestions.length > 0, `Must have production questions. Found: ${prodQuestions.length}`);
  console.log(`   - Verified ${prodQuestions.length} production questions in repository`);

  // Test 6: browser bank receives questions
  console.log('6. Verifying bank receives questions via loader.ready()...');
  const loadResult = await loader.ready();
  assert.equal(loader.getStatus(), 'ready');
  assert.equal(loader.getError(), null);
  assert.ok(loadResult.questionsCount >= prodQuestions.length);

  const rawQuestions = vact.VACTInternalBank.getRawQuestions();
  assert.ok(rawQuestions.length >= prodQuestions.length, 'getRawQuestions() must return loaded questions');

  // Test 7 & 8: Mini and Full readiness no longer 0/100 and 0/120
  console.log('7 & 8. Verifying Mini and Full readiness are no longer 0/100 and 0/120...');
  vact.VACTCoverage.clearCoverageCache();
  const miniReadiness = vact.VACTCoverage.getProfileReadiness('vact_mini_100');
  const fullReadiness = vact.VACTCoverage.getProfileReadiness('vact_full');

  console.log(`   - Mini 100 available: ${miniReadiness.totalAvailable}/${miniReadiness.totalRequired} (ready: ${miniReadiness.ready})`);
  console.log(`   - Full 120 available: ${fullReadiness.totalAvailable}/${fullReadiness.totalRequired} (ready: ${fullReadiness.ready})`);

  assert.notEqual(miniReadiness.totalAvailable, 0, 'Mini readiness must NOT be 0/100');
  assert.notEqual(fullReadiness.totalAvailable, 0, 'Full readiness must NOT be 0/120');
  assert.ok(miniReadiness.totalAvailable >= 100, 'Mini 100 must have at least 100 available questions');
  assert.ok(fullReadiness.totalAvailable >= 120, 'Full 120 must have at least 120 available questions');
  assert.equal(miniReadiness.ready, true, 'Mini 100 should be ready');
  assert.equal(fullReadiness.ready, true, 'Full 120 should be ready');

  // Test 9: Mini generates exactly 100
  console.log('9. Verifying Mini 100 generates exactly 100 questions...');
  const miniExam = vact.VACTExamGenerator.generateMini100({ seed: 'runtime_qa_mini_100' });
  assert.equal(miniExam.requestedTotal, 100);
  assert.equal(miniExam.generatedTotal, 100);
  assert.equal(miniExam.questions.length, 100);
  assert.equal(miniExam.isComplete, true);
  assert.equal(miniExam.missingTotal, 0);

  // Test 10: Full generates exactly 120
  console.log('10. Verifying Full 120 generates exactly 120 questions...');
  const fullExam = vact.VACTExamGenerator.generateFull120({ seed: 'runtime_qa_full_120' });
  assert.equal(fullExam.requestedTotal, 120);
  assert.equal(fullExam.generatedTotal, 120);
  assert.equal(fullExam.questions.length, 120);
  assert.equal(fullExam.isComplete, true);
  assert.equal(fullExam.missingTotal, 0);

  // Test 11: correct section quotas (25/25/25/10/15 for Mini; 30/30/30/12/18 for Full)
  console.log('11. Verifying strict section quotas with no cross-filling...');
  const miniSec = miniExam.sections;
  assert.equal(miniSec.vietnamese.generated, 25, 'Mini Vietnamese must be 25');
  assert.equal(miniSec.english.generated, 25, 'Mini English must be 25');
  assert.equal(miniSec.math.generated, 25, 'Mini Math must be 25');
  assert.equal(miniSec.logic_data.generated, 10, 'Mini Logic must be 10');
  assert.equal(miniSec.scientific_reasoning.generated, 15, 'Mini Science must be 15');

  const fullSec = fullExam.sections;
  assert.equal(fullSec.vietnamese.generated, 30, 'Full Vietnamese must be 30');
  assert.equal(fullSec.english.generated, 30, 'Full English must be 30');
  assert.equal(fullSec.math.generated, 30, 'Full Math must be 30');
  assert.equal(fullSec.logic_data.generated, 12, 'Full Logic must be 12');
  assert.equal(fullSec.scientific_reasoning.generated, 18, 'Full Science must be 18');

  // Test 12: unique question IDs and signatures
  console.log('12. Verifying unique question IDs and signatures in generated exams...');
  const miniSigs = miniExam.questions.map(q => vact.computeVACTQuestionSignature(q));
  assert.equal(new Set(miniSigs).size, 100, 'All 100 Mini questions must have unique signatures');
  assert.equal(new Set(miniExam.questions.map(q => q.id)).size, 100, 'All 100 Mini IDs must be unique');

  const fullSigs = fullExam.questions.map(q => vact.computeVACTQuestionSignature(q));
  assert.equal(new Set(fullSigs).size, 120, 'All 120 Full questions must have unique signatures');
  assert.equal(new Set(fullExam.questions.map(q => q.id)).size, 120, 'All 120 Full IDs must be unique');

  // Test 13: source-backed only
  console.log('13. Verifying mode is strictly source-backed with zero legacy fallback...');
  assert.equal(vact.VACTInternalBank.getMode(), 'source_backed');
  assert.equal(vact.VACTInternalBank.isSourceBacked(), true);

  for (const q of miniExam.questions) {
    assert.equal(q.source?.extractedFromSource, true, `Question ${q.id} must be extractedFromSource`);
    assert.equal(q.quality?.answerVerified, true, `Question ${q.id} must be answerVerified`);
  }
  for (const q of fullExam.questions) {
    assert.equal(q.source?.extractedFromSource, true, `Question ${q.id} must be extractedFromSource`);
    assert.equal(q.quality?.answerVerified, true, `Question ${q.id} must be answerVerified`);
  }

  // Test 14 & 15: Loader failure does not fall back to legacy and disables generation
  console.log('14 & 15. Verifying loader failure aborts and does not fall back to legacy...');
  {
    const isolatedInternalBank = require('../js/vact/bank/internalBank').VACTInternalBank;
    const loaderExport = require('../js/vact/bank/sourceBankLoader');
    const mockFailingFetch = async () => { throw new Error('Simulated network failure'); };
    const isolatedLoader = (loaderExport.createLoader || loaderExport)(isolatedInternalBank, mockFailingFetch);

    isolatedInternalBank.setSourceBackedBank([]);
    isolatedInternalBank.setMode('source_backed');

    let loadError = null;
    try {
      await isolatedLoader.reload();
    } catch (e) {
      loadError = e;
    }
    assert.ok(loadError, 'Loader must throw on fetch failure');
    assert.equal(isolatedLoader.getStatus(), 'error');
    assert.ok(isolatedLoader.getError());

    // In source_backed mode without loaded questions, internalBank must NOT fall back to legacy
    const rawShortage = isolatedInternalBank.getRawQuestions();
    assert.equal(rawShortage.length, 0, 'Must return 0 questions without falling back to legacy doc bank');
  }

  // Test 16: UI loading state does not display fake zero shortage
  console.log('16. Verifying UI loading state does not display fake 0 shortage...');
  {
    const elements = new Map();
    const get = id => {
      if (!elements.has(id)) {
        elements.set(id, {
          id,
          style: { display: '' },
          innerHTML: '',
          textContent: '',
          disabled: false
        });
      }
      return elements.get(id);
    };

    const ctx = {
      window: {},
      document: { getElementById: get },
      console: { warn: () => {}, error: () => {} },
      KEDUVACT: {
        sourceBankLoader: {
          getStatus: () => 'loading',
          getError: () => null
        },
        VACTCoverage: {
          getProfileReadiness: () => ({ totalAvailable: 0, totalRequired: 100, ready: false, sections: {} })
        }
      }
    };
    ctx.window = ctx;

    // Load initVactMini100UI / initVactFull120UI from app.js in context
    const appCode = fs.readFileSync(path.join(rootDir, 'js', 'app.js'), 'utf8');
    // Extract only the V-ACT UI section
    const vactSectionMatch = appCode.match(/\/\* ================= V-ACT RUNTIME INITIALIZATION[\s\S]*?window\.handleStartFull120Click = handleStartFull120Click;/);
    assert.ok(vactSectionMatch, 'Must find V-ACT section in app.js');

    vm.runInContext(vactSectionMatch[0], vm.createContext(ctx));

    // Call initVactMini100UI() while loading
    ctx.initVactMini100UI();

    const warningText = get('vactMini100WarningText').innerHTML;
    assert.ok(!warningText.includes('0/100'), 'Loading state must NOT contain "0/100"');
    assert.ok(!warningText.includes('0/120'), 'Loading state must NOT contain "0/120"');
    assert.ok(warningText.includes('Đang tải ngân hàng V-ACT'), 'Loading state must show loading message');
    assert.equal(get('btnStartMini100').disabled, true, 'Start button must be disabled during loading');

    // Call initVactFull120UI() while loading
    ctx.initVactFull120UI();
    const fullWarningText = get('vactFull120WarningText').innerHTML;
    assert.ok(!fullWarningText.includes('0/100'), 'Loading state must NOT contain "0/100"');
    assert.ok(!fullWarningText.includes('0/120'), 'Loading state must NOT contain "0/120"');
    assert.ok(fullWarningText.includes('Đang tải ngân hàng V-ACT'), 'Loading state must show loading message');
    assert.equal(get('btnStartFull120').disabled, true, 'Start button must be disabled during loading');
  }

  // Test 17: Retry can recover after initial failure
  console.log('17. Verifying retry can recover successfully after initial failure...');
  {
    const isolatedInternalBank = require('../js/vact/bank/internalBank').VACTInternalBank;
    const loaderExport = require('../js/vact/bank/sourceBankLoader');
    const isolatedLoader = (loaderExport.createLoader || loaderExport)(isolatedInternalBank);

    // Initial failure via setFetchFn
    isolatedLoader.setFetchFn(async () => { throw new Error('Initial network timeout'); });
    isolatedInternalBank.setSourceBackedBank([]);
    isolatedInternalBank.setMode('source_backed');

    try { await isolatedLoader.reload(); } catch (_) {}
    assert.equal(isolatedLoader.getStatus(), 'error');

    // Now restore network and retry
    isolatedLoader.setFetchFn(null); // Fallback to standard Node fs/fetch
    const recoverResult = await isolatedLoader.reload();
    assert.equal(isolatedLoader.getStatus(), 'ready');
    assert.ok(recoverResult.questionsCount > 0);
    assert.ok(isolatedInternalBank.getRawQuestions().length > 0);
  }

  console.log('--- ALL 17/17 V-ACT RUNTIME BANK QA TESTS PASSED SUCCESSFULLY ---');
}

runVactRuntimeBankTests().catch(err => {
  console.error('V-ACT Runtime QA Failure:', err);
  process.exit(1);
});
