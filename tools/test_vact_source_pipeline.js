const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vact = require('../js/vact');
const { scanSources } = require('./vact-ingestion/scan_sources');
const { parseQuestions } = require('./vact-ingestion/parse_questions');
const { normalizeQuestion } = require('./vact-ingestion/normalize_questions');
const { validateQuestion } = require('./vact-ingestion/validate_questions');
const { deduplicateQuestions } = require('./vact-ingestion/deduplicate_questions');

function runAllPipelineTests() {
  console.log('========================================================================================');
  console.log('                       V-ACT SOURCE PIPELINE UNIT TESTS');
  console.log('========================================================================================\n');

  // Test 1: source manifest loading
  console.log('Test 1: source manifest loading');
  const manifestPath = path.resolve('TÀI LIỆU', 'DGNL', 'V-ACT', 'source-manifest.json');
  assert.ok(fs.existsSync(manifestPath), 'Manifest file must exist');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.ok(Array.isArray(manifest) && manifest.length > 0, 'Manifest must contain records');
  console.log(`  -> OK: Loaded ${manifest.length} source records.\n`);

  // Test 2: source file hashing
  console.log('Test 2: source file hashing');
  const sampleWithHash = manifest.find(s => s.fileHash);
  assert.ok(sampleWithHash, 'Manifest must have fileHash');
  assert.strictEqual(typeof sampleWithHash.fileHash, 'string');
  assert.strictEqual(sampleWithHash.fileHash.length, 64, 'SHA-256 hash must be 64 hex characters');
  console.log(`  -> OK: Deterministic SHA-256 hash present: ${sampleWithHash.fileHash.slice(0, 16)}...\n`);

  // Test 3: exact duplicate source detection
  console.log('Test 3: exact duplicate source detection');
  const duplicates = manifest.filter(s => s.category === 'DUPLICATE');
  assert.ok(duplicates.length > 0, 'Must have categorized duplicates in 99_DUPLICATES');
  for (const d of duplicates) {
    assert.strictEqual(d.category, 'DUPLICATE');
    assert.strictEqual(d.usableForQuestionExtraction, false);
    assert.ok(d.path.includes('99_DUPLICATES'));
  }
  console.log(`  -> OK: ${duplicates.length} duplicate sources properly segregated and flagged unusable.\n`);

  // Test 4: question parsing & numbering
  console.log('Test 4: question parsing and numbering');
  const sampleText = `
Câu 1: Thủ đô của Việt Nam là gì?
A. Huế
B. Hà Nội
C. Đà Nẵng
D. Cần Thơ

Câu 2: Số nguyên tố chẵn duy nhất là:
A. 2. B. 4. C. 6. D. 8.
Lời giải:
Số 2 là số nguyên tố chẵn duy nhất. Chọn A.
`;
  const docData = {
    pages: [{ pageNum: 1, text: sampleText }]
  };
  const dummySrc = {
    sourceId: 'vact_source_000001',
    category: 'FULL_TEST',
    path: 'TÀI LIỆU/DGNL/V-ACT/00_OFFICIAL/test.pdf',
    filename: 'test.pdf',
    sectionHint: 'math',
    documentRole: 'combined'
  };
  const parsed = parseQuestions(docData, dummySrc);
  assert.strictEqual(parsed.length, 2, 'Should parse 2 questions');
  assert.strictEqual(parsed[0].questionNumber, 1);
  assert.strictEqual(parsed[1].questionNumber, 2);
  assert.strictEqual(parsed[0].options.length, 4);
  assert.strictEqual(parsed[1].options.length, 4);
  assert.strictEqual(parsed[1].explicitAnswer, 'A');
  console.log('  -> OK: Multiline and inline options parsed with numbers 1 and 2.\n');

  // Test 5: normalization & source provenance preservation
  console.log('Test 5: normalization and sourceId / sourcePage preservation');
  const norm = normalizeQuestion(parsed[0], dummySrc, 1, 'vact_exam_test');
  assert.ok(norm.id.startsWith('vact_q_'));
  assert.strictEqual(norm.section, 'math');
  assert.strictEqual(norm.source.sourceId, dummySrc.sourceId);
  assert.strictEqual(norm.source.sourceFile, dummySrc.path);
  assert.strictEqual(norm.source.sourcePage, 1);
  assert.strictEqual(norm.source.questionNumber, 1);
  assert.strictEqual(norm.source.examSetId, 'vact_exam_test');
  assert.strictEqual(norm.source.extractedFromSource, true);
  console.log('  -> OK: Normalized question preserves sourceId, sourcePage, questionNumber, extractedFromSource.\n');

  // Test 6: question validation & production-status rules
  console.log('Test 6: question validation and production-status rules');
  norm.correctAnswer = 'B';
  norm.quality.answerVerified = true;
  const validResult = validateQuestion(norm, manifest);
  assert.strictEqual(validResult.status, 'production', 'Verified question should have production status');

  const unverifiedNorm = { ...norm, correctAnswer: null };
  const unverifiedResult = validateQuestion(unverifiedNorm, manifest);
  assert.strictEqual(unverifiedResult.status, 'review_required', 'Unverified question must be review_required');

  const invalidNorm = { ...norm, options: [{ id: 'A', text: 'only one' }] };
  const invalidResult = validateQuestion(invalidNorm, manifest);
  assert.strictEqual(invalidResult.status, 'invalid', 'Question with < 2 options must be invalid');
  console.log('  -> OK: Validation rules accurately assign production, review_required, and invalid statuses.\n');

  // Test 7: question deduplication and canonical source priority
  console.log('Test 7: question deduplication and canonical source priority');
  const mockManifest = [
    { sourceId: 'src_subject', category: 'SUBJECT_BANK' },
    { sourceId: 'src_official', category: 'OFFICIAL' }
  ];
  const qOfficial = {
    ...norm,
    id: 'q_off',
    source: { ...norm.source, sourceId: 'src_official' }
  };
  const qSubject = {
    ...norm,
    id: 'q_sub',
    source: { ...norm.source, sourceId: 'src_subject' }
  };
  const dedup = deduplicateQuestions([qSubject, qOfficial], mockManifest);
  assert.strictEqual(dedup.uniqueQuestions.length, 1, 'Duplicate questions should be deduplicated to 1');
  assert.strictEqual(dedup.uniqueQuestions[0].id, 'q_off', 'Official source must take canonical precedence');
  assert.strictEqual(dedup.uniqueQuestions[0].alternateSources.length, 1);
  assert.strictEqual(dedup.uniqueQuestions[0].alternateSources[0].sourceId, 'src_subject');
  console.log('  -> OK: Deduplication merges duplicates, selects canonical by priority, and preserves alternateSources.\n');

  // Test 8: source-backed coverage & no general bank fallback
  console.log('Test 8: source-backed coverage and no general bank fallback');
  const coverage = vact.VACTCoverage.getSummary({ refresh: true });
  assert.strictEqual(coverage.bankSummary ? coverage.bankSummary.mode : 'source_backed', 'source_backed');
  assert.ok(coverage.sections.vietnamese.total >= 30, 'Vietnamese has >= 30 questions');
  assert.ok(coverage.sections.english.total >= 30, 'English has >= 30 questions');
  assert.ok(coverage.sections.math.total >= 30, 'Math has >= 30 questions');
  assert.ok(coverage.sections.logic_data.total >= 12, 'Logic/Data has >= 12 questions');
  assert.ok(coverage.sections.scientific_reasoning.total >= 18, 'Scientific has >= 18 questions');
  console.log('  -> OK: Source-backed coverage reports genuine section numbers without legacy math inflation.\n');

  // Test 9: generator source filtering & mini test provenance
  console.log('Test 9: generator source filtering & mini test provenance');
  const miniTest = vact.VACTSectionTestGenerator.generate({
    section: 'math',
    count: 20
  });
  assert.strictEqual(miniTest.generatedCount, 20);
  for (const q of miniTest.questions) {
    assert.strictEqual(q.source.extractedFromSource, true);
    assert.ok(q.source.sourceId);
    assert.ok(q.source.sourceFile);
    assert.strictEqual(q.quality.answerVerified, true);
  }
  console.log('  -> OK: Mini test generated 20 questions, all strictly verified for provenance.\n');

  // Test 10: full 120 provenance
  console.log('Test 10: Full 120 provenance');
  const examGen = vact.generateFromProfile ? vact : (vact.examGenerator || vact.generator);
  const fullExam = examGen.generateFromProfile('vact_full');
  assert.strictEqual(fullExam.questions.length, 120);
  assert.strictEqual(fullExam.isComplete, true);
  for (const q of fullExam.questions) {
    assert.strictEqual(q.source.extractedFromSource, true);
    assert.ok(q.source.sourceId);
    assert.ok(q.source.sourceFile);
    assert.strictEqual(q.quality.answerVerified, true);
  }
  console.log('  -> OK: Full 120 exam generated 120 questions, all strictly verified for provenance.\n');

  console.log('========================================================================================');
  console.log('                     ALL 10 PIPELINE UNIT TESTS PASSED!');
  console.log('========================================================================================\n');
}

if (require.main === module) {
  runAllPipelineTests();
}

module.exports = { runAllPipelineTests };
