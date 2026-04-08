#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const TARGETS = [
  path.join(ROOT, 'mobile', 'src'),
  path.join(ROOT, 'mobile', 'App.tsx'),
  path.join(ROOT, 'backend', 'api_divida_zero', 'app'),
  path.join(ROOT, 'backend', 'api_divida_zero', 'config'),
];
const IGNORE_DIRS = new Set(['node_modules', '.git', 'tmp', 'log', 'vendor', 'coverage', 'dist']);
const FILE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.rb', '.yml', '.yaml', '.md', '.json']);
const PATTERNS = [/Ã./, /Â./, /�/, /•\?•/, /\?•/, /•\?/];

const isApply = process.argv.includes('--apply');

const shouldSkipFile = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  return !FILE_EXTENSIONS.has(ext);
};

const containsSuspicious = (text) => PATTERNS.some((pattern) => pattern.test(text));

const normalizeText = (text) => {
  let next = text;
  next = next.replace(/•\?•/g, '•');
  next = next.replace(/\?•/g, '•');
  next = next.replace(/•\?/g, '•');

  // Tries to recover common UTF-8 interpreted as latin1 issues.
  if (containsSuspicious(next)) {
    const candidate = Buffer.from(next, 'latin1').toString('utf8');
    if (candidate && candidate.length > 0) {
      const originalScore = (next.match(/Ã|Â|�/g) || []).length;
      const candidateScore = (candidate.match(/Ã|Â|�/g) || []).length;
      if (candidateScore < originalScore) {
        next = candidate;
      }
    }
  }

  return next;
};

const findings = [];

const inspectFile = (filePath) => {
  if (shouldSkipFile(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  if (!containsSuspicious(content)) return;

  const fixed = normalizeText(content);
  if (fixed === content) return;

  findings.push(path.relative(ROOT, filePath));
  if (isApply) {
    fs.writeFileSync(filePath, fixed, 'utf8');
  }
};

const walk = (targetPath) => {
  const stats = fs.statSync(targetPath);
  if (stats.isFile()) {
    inspectFile(targetPath);
    return;
  }

  const entries = fs.readdirSync(targetPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(targetPath, entry.name);
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      walk(fullPath);
      continue;
    }
    inspectFile(fullPath);
  }
};

for (const target of TARGETS) {
  if (fs.existsSync(target)) walk(target);
}

if (findings.length === 0) {
  console.log('Nenhum arquivo precisou de normalização.');
  process.exit(0);
}

const mode = isApply ? 'APPLY' : 'DRY-RUN';
console.log(`[${mode}] Arquivos com correção sugerida/aplicada (${findings.length}):`);
for (const file of findings) {
  console.log(`- ${file}`);
}

if (!isApply) {
  console.log('\nExecute com --apply para gravar as correções.');
}
