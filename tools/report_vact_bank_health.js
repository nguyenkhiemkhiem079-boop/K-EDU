/**
 * K-EDU V-ACT Bank Health & Capacity Audit Tool
 * Audits raw, valid, unique, duplicate questions, full exams,
 * section coverage against the 2,400 target model, scientific breakdown,
 * and outputs machine report: tools/vact-bank-health.json
 */
const fs = require('fs');
const path = require('path');
const vact = require('../js/vact');

function generateBankHealthReport() {
  const summary = vact.getSummary({ refresh: true });
  const gaps = vact.VACTCoverage.getGaps();
  const deep = vact.VACTCoverage.getDeepCoverage();
  const examDiag = vact.examBank.getDiagnostics();
  const sources = vact.sourceRegistry.getAllSources();
  const ingestableSources = vact.sourceRegistry.getIngestableSources();
  const pendingReviewSources = vact.sourceRegistry.getPendingReviewSources();
  const blockedSources = vact.sourceRegistry.getBlockedSources();

  // Full 120 and Mini 100 readiness
  const fullReadiness = vact.getProfileReadiness('vact_full');
  const miniReadiness = vact.getProfileReadiness('vact_mini_100');

  // Near duplicate diagnostics on sample
  const sampleForNearDup = summary.totalUniqueUsable > 500
    ? vact.getUniqueUsableQuestions().slice(0, 500)
    : vact.getUniqueUsableQuestions();
  const nearDups = vact.detectNearDuplicates(sampleForNearDup, { maxComparisons: 5000 });
  const probableCount = nearDups.filter(d => d.status === vact.DUPLICATE_STATUS.PROBABLE_DUPLICATE).length;
  const reviewRequiredCount = nearDups.filter(d => d.status === vact.DUPLICATE_STATUS.REVIEW_REQUIRED).length;

  console.log('============================================================');
  console.log('         V-ACT BANK HEALTH & EXPANSION AUDIT REPORT         ');
  console.log('============================================================');
  console.log(`RAW QUESTIONS INSPECTED:          ${summary.totalRaw}`);
  console.log(`VALID MAPPED QUESTIONS:            ${summary.totalMapped}`);
  console.log(`UNIQUE USABLE QUESTIONS:           ${summary.totalUniqueUsable}`);
  console.log(`EXACT DUPLICATES REMOVED:          ${summary.duplicatesCount}`);
  console.log(`PROBABLE DUPLICATES DETECTED:      ${probableCount}`);
  console.log(`REVIEW REQUIRED PAIRS:             ${reviewRequiredCount}`);
  console.log(`COMPLETE FULL EXAMS (120 items):   ${examDiag.completeCanonicalCount}`);
  console.log(`INCOMPLETE EXAMS (<120/Deficit):   ${examDiag.incompleteCount}`);
  console.log(`MIRRORED EXAM COPIES DETECTED:     ${examDiag.mirrorsCount}`);
  console.log('------------------------------------------------------------');
  console.log('SECTION COVERAGE (Target: 2,400 Unique Usable Questions)');
  console.log('------------------------------------------------------------');

  const targets = vact.VACT_BANK_TARGETS;
  const secViet = summary.sections.vietnamese?.total || 0;
  const secEng = summary.sections.english?.total || 0;
  const secMath = summary.sections.math?.total || 0;
  const secLogic = summary.sections.logic_data?.total || 0;
  const secSci = summary.sections.scientific_reasoning?.total || 0;

  console.log(`Vietnamese:             ${secViet.toString().padStart(6)} / ${targets.vietnamese} (${Math.round((secViet / targets.vietnamese) * 100)}%)`);
  console.log(`English:                ${secEng.toString().padStart(6)} / ${targets.english} (${Math.round((secEng / targets.english) * 100)}%)`);
  console.log(`Math:                   ${secMath.toString().padStart(6)} / ${targets.math} (${Math.round((secMath / targets.math) * 100)}%)`);
  console.log(`Logic / Data:           ${secLogic.toString().padStart(6)} / ${targets.logic_data} (${Math.round((secLogic / targets.logic_data) * 100)}%)`);
  console.log(`Scientific Reasoning:   ${secSci.toString().padStart(6)} / ${targets.scientific_reasoning} (${Math.round((secSci / targets.scientific_reasoning) * 100)}%)`);
  console.log('------------------------------------------------------------');
  console.log('SCIENTIFIC REASONING SKILLS BREAKDOWN');
  console.log('------------------------------------------------------------');

  const sciSkills = summary.sections.scientific_reasoning?.skills || {};
  const sciTargets = vact.VACT_SCIENTIFIC_TARGETS;
  for (const [sk, target] of Object.entries(sciTargets)) {
    const avail = sciSkills[sk] || 0;
    const pct = Math.round((avail / target) * 100);
    console.log(`- ${sk.padEnd(20)}: ${avail.toString().padStart(4)} / ${target} (${pct}%)`);
  }

  console.log('------------------------------------------------------------');
  console.log('TOP COVERAGE GAPS (Largest Deficits in Active Bank)');
  console.log('------------------------------------------------------------');
  const topGaps = gaps.slice(0, 8);
  topGaps.forEach((g, idx) => {
    const label = g.skill ? `${g.section} -> ${g.skill}` : `${g.section}`;
    console.log(`${idx + 1}. ${label.padEnd(35)}: Missing ${g.missing.toString().padStart(4)} (Target: ${g.target}, Available: ${g.available}, Deficit: ${g.deficitPct}%)`);
  });

  console.log('------------------------------------------------------------');
  console.log('SOURCE REGISTRY & INGESTION STATUS');
  console.log('------------------------------------------------------------');
  console.log(`Ingestable Sources (approved/owned/licensed): ${ingestableSources.length}`);
  ingestableSources.forEach(s => console.log(`  [INGESTABLE]  id: ${s.sourceId.padEnd(28)} provider: ${s.provider.padEnd(20)} rights: ${s.rights.status}`));
  console.log(`Sources Pending Rights Review:                ${pendingReviewSources.length}`);
  pendingReviewSources.forEach(s => console.log(`  [PENDING]     id: ${s.sourceId.padEnd(28)} provider: ${s.provider.padEnd(20)} rights: ${s.rights.status}`));
  console.log(`Blocked Sources:                              ${blockedSources.length}`);
  blockedSources.forEach(s => console.log(`  [BLOCKED]     id: ${s.sourceId.padEnd(28)} provider: ${s.provider.padEnd(20)} rights: ${s.rights.status}`));
  console.log('============================================================\n');

  // Build machine report JSON
  const machineReport = {
    timestamp: new Date().toISOString(),
    summary: {
      totalRaw: summary.totalRaw,
      totalMapped: summary.totalMapped,
      totalUniqueUsable: summary.totalUniqueUsable,
      duplicatesRemoved: summary.duplicatesCount,
      probableDuplicates: probableCount,
      reviewRequiredPairs: reviewRequiredCount
    },
    coverage: {
      targets: vact.VACT_BANK_TARGETS,
      scientificTargets: vact.VACT_SCIENTIFIC_TARGETS,
      sections: {
        vietnamese: { available: secViet, target: targets.vietnamese, deficit: Math.max(0, targets.vietnamese - secViet) },
        english: { available: secEng, target: targets.english, deficit: Math.max(0, targets.english - secEng) },
        math: { available: secMath, target: targets.math, deficit: Math.max(0, targets.math - secMath) },
        logic_data: { available: secLogic, target: targets.logic_data, deficit: Math.max(0, targets.logic_data - secLogic) },
        scientific_reasoning: {
          available: secSci,
          target: targets.scientific_reasoning,
          deficit: Math.max(0, targets.scientific_reasoning - secSci),
          skills: sciSkills
        }
      }
    },
    duplicates: {
      totalDuplicatesRemoved: summary.duplicatesCount,
      duplicateGroupsCount: summary.duplicateGroupsCount,
      probableDuplicatesCount: probableCount,
      reviewRequiredCount: reviewRequiredCount,
      sampleNearDuplicates: nearDups.slice(0, 10)
    },
    examDuplicates: {
      totalRegisteredExams: examDiag.totalRegistered,
      canonicalExams: examDiag.canonicalCount,
      completeCanonicalExams: examDiag.completeCanonicalCount,
      incompleteExams: examDiag.incompleteCount,
      mirrorsDetected: examDiag.mirrorsCount,
      mirrors: examDiag.mirrors
    },
    sourceCoverage: {
      allSourcesCount: sources.length,
      ingestableSources: ingestableSources.map(s => ({ sourceId: s.sourceId, provider: s.provider, rights: s.rights.status })),
      pendingReviewSources: pendingReviewSources.map(s => ({ sourceId: s.sourceId, provider: s.provider, rights: s.rights.status })),
      blockedSources: blockedSources.map(s => ({ sourceId: s.sourceId, provider: s.provider, rights: s.rights.status }))
    },
    gaps,
    readiness: {
      full120: { ready: fullReadiness.ready, totalRequired: fullReadiness.totalRequired, totalMissing: fullReadiness.totalMissing, shortages: fullReadiness.shortages },
      mini100: { ready: miniReadiness.ready, totalRequired: miniReadiness.totalRequired, totalMissing: miniReadiness.totalMissing, shortages: miniReadiness.shortages }
    }
  };

  const outputPath = path.join(__dirname, 'vact-bank-health.json');
  fs.writeFileSync(outputPath, JSON.stringify(machineReport, null, 2), 'utf8');
  console.log(`Machine health report written to: ${outputPath}`);

  return machineReport;
}

if (require.main === module) {
  generateBankHealthReport();
}

module.exports = {
  generateBankHealthReport
};
