const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const { performance } = require('node:perf_hooks');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const scriptPaths = html => [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)]
  .map(match => match[1].split('?')[0])
  .filter(src => src.endsWith('.js') && !/^(?:https?:)?\/\//i.test(src));
const fileSize = file => fs.statSync(path.join(root, file)).size;
const compileMs = file => {
  const started = performance.now();
  new vm.Script(read(file), { filename: file });
  return Number((performance.now() - started).toFixed(2));
};

const currentHtml = read('index.html');
let baselineHtml = currentHtml;
try {
  baselineHtml = execFileSync('git', ['show', 'HEAD:index.html'], { cwd: root, encoding: 'utf8' });
} catch (error) {
  console.warn('[Phase6] Could not read git baseline; using current index.html.', error.message);
}

const baselineScripts = scriptPaths(baselineHtml);
const currentScripts = scriptPaths(currentHtml);
const optional = ['js/documentQuestionBank.js', 'js/mathGenerator.js', 'js/khtnGenerator.js'];
const sum = list => list.reduce((total, file) => total + (fs.existsSync(path.join(root, file)) ? fileSize(file) : 0), 0);
const currentCompile = currentScripts.filter(file => fs.existsSync(path.join(root, file))).map(file => ({ file, ms: compileMs(file) }));
const optionalCompile = optional.map(file => ({ file, bytes: fileSize(file), compileMs: compileMs(file) }));

let syntheticGenerationMs = null;
try {
  const math = require('../js/mathGenerator');
  const started = performance.now();
  const result = math.generateExam({
    grade: '10', term: 'GK1', sourceMode: 'synthetic', difficultyMode: 'mixed',
    mcqCount: 5, essayMatrix: { TH: 1, VD: 1, VDC: 0 }, seed: 'phase6-measurement'
  });
  syntheticGenerationMs = { ms: Number((performance.now() - started).toFixed(2)), isComplete: result.isComplete, generated: result.generatedTotal };
} catch (error) {
  syntheticGenerationMs = { error: error.message };
}

const report = {
  generatedAt: new Date().toISOString(),
  baseline: {
    initialScriptCount: baselineScripts.length,
    initialLocalJsBytes: sum(baselineScripts),
    optionalEagerBytes: sum(baselineScripts.filter(file => optional.includes(file))),
    optionalScripts: baselineScripts.filter(file => optional.includes(file))
  },
  current: {
    initialScriptCount: currentScripts.length,
    initialLocalJsBytes: sum(currentScripts),
    optionalEagerBytes: sum(currentScripts.filter(file => optional.includes(file))),
    optionalScripts: currentScripts.filter(file => optional.includes(file)),
    moduleLoaderBytes: fileSize('js/runtime/moduleLoader.js'),
    initialCompileMs: Number(currentCompile.reduce((total, item) => total + item.ms, 0).toFixed(2)),
    compileSamples: currentCompile
  },
  deferredOptionalModules: optionalCompile,
  syntheticGeneration: syntheticGenerationMs,
  notes: [
    'Browser network, mobile CPU and real heap measurements require a browser profile; this report measures repository payload and Node parse/generation proxies.',
    'Grade-specific question-bank shards remain demand-loaded by DocumentQuestionBank.ensureGradeLoaded().'
  ]
};

console.log(JSON.stringify(report, null, 2));
