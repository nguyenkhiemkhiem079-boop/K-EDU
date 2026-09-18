/**
 * K-EDU V-ACT Coverage & Quality Reporting Tool
 * Computes coverage, deduplication, and profile readiness from actual repository data.
 * Emits console summary table and saves machine-readable tools/vact-coverage-report.json.
 */
const fs = require('node:fs');
const path = require('node:path');
const vact = require('../js/vact');

console.log('Calculating V-ACT Question Bank Coverage & Quality Audit...\n');

const coverageEngine = vact.VACTCoverage;
const summary = coverageEngine.getSummary({ refresh: true });
const fullReadiness = coverageEngine.getProfileReadiness('vact_full');
const miniReadiness = coverageEngine.getProfileReadiness('vact_mini_100');

// 1. Output Global Bank Status
console.log('========================================================================================');
console.log('                             V-ACT QUESTION BANK COVERAGE');
console.log('========================================================================================');
console.log(`Raw Records Inspected:          ${summary.totalRaw}`);
console.log(`Valid & Mapped Records:         ${summary.totalMapped}`);
console.log(`Duplicate Records Removed:      ${summary.duplicatesCount} (across ${summary.duplicateGroupsCount} groups)`);
console.log(`TOTAL UNIQUE USABLE QUESTIONS:  ${summary.totalUniqueUsable}`);
console.log(`Unsupported Records Excluded:   ${summary.unsupportedCount} (Middle school Grades 6-9)`);
console.log(`Malformed Records Rejected:     ${summary.invalidCount}`);
console.log('----------------------------------------------------------------------------------------');

// 2. Output Section Summary Table
console.log(
  'Section'.padEnd(26) +
  'Easy'.padStart(8) +
  'Medium'.padStart(10) +
  'Hard'.padStart(8) +
  'Total'.padStart(10)
);
console.log('----------------------------------------------------------------------------------------');

const secNames = {
  vietnamese: 'Vietnamese (Tiếng Việt)',
  english: 'English (Tiếng Anh)',
  math: 'Math (Toán học)',
  logic_data: 'Logic & Data Analysis',
  scientific_reasoning: 'Scientific Reasoning'
};

for (const [secKey, secName] of Object.entries(secNames)) {
  const data = summary.sections[secKey] || { total: 0, difficulty: { easy: 0, medium: 0, hard: 0 } };
  const d = data.difficulty;
  console.log(
    secName.padEnd(26) +
    String(d.easy).padStart(8) +
    String(d.medium).padStart(10) +
    String(d.hard).padStart(8) +
    String(data.total).padStart(10)
  );
}
console.log('----------------------------------------------------------------------------------------');

// 3. Output Scientific Reasoning Breakdown
console.log('\nScientific Reasoning Breakdown:');
const sciSkills = summary.sections.scientific_reasoning.skills;
for (const [skill, count] of Object.entries(sciSkills)) {
  const capSkill = skill.charAt(0).toUpperCase() + skill.slice(1);
  console.log(`  - ${capSkill.padEnd(22)}: ${count}`);
}

// 4. Output Readiness Checks
console.log('\n========================================================================================');
console.log('                               EXAM PROFILE READINESS');
console.log('========================================================================================');

function printProfileReadiness(r) {
  console.log(`\nProfile: [${r.profileId}] ${r.profileName}`);
  console.log(`Status:  ${r.ready ? '>>> READY <<<' : '>>> NOT READY (Shortages exist) <<<'}`);
  console.log(`Total:   Required ${r.totalRequired} | Available ${r.totalAvailable} | Missing ${r.totalMissing}`);
  console.log('\nSection Breakdown:');
  for (const [sec, s] of Object.entries(r.sections)) {
    const secLabel = secNames[sec] || sec;
    const statusMark = s.ready ? 'OK' : `MISSING ${s.missing} (${s.reason})`;
    console.log(`  * ${secLabel.padEnd(26)}: Req ${String(s.required).padStart(2)} | Avail ${String(s.available).padStart(5)} | ${statusMark}`);
  }
}

printProfileReadiness(miniReadiness);
printProfileReadiness(fullReadiness);

// 5. Save Machine-Readable JSON
const machineReport = {
  generatedAt: new Date().toISOString(),
  bankSummary: summary,
  mini100Readiness: miniReadiness,
  fullReadiness: fullReadiness
};

const reportPath = path.resolve(__dirname, 'vact-coverage-report.json');
fs.writeFileSync(reportPath, JSON.stringify(machineReport, null, 2), 'utf8');
console.log(`\nMachine-readable report generated: ${reportPath}`);
console.log('========================================================================================');
