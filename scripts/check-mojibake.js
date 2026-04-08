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
const SUSPICIOUS_PATTERNS = [
  /Ã./,
  /Â./,
  /�/,
  /•\?•/,
  /\?•/,
  /•\?/,
];
const SAFE_LINE_PATTERNS = [
  /LEGACY_MOJIBAKE_/,
  /SUSPICIOUS_PATTERNS/,
];

const findings = [];

const shouldSkipFile = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  return !FILE_EXTENSIONS.has(ext);
};

const inspectFile = (filePath) => {
  if (shouldSkipFile(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    if (SAFE_LINE_PATTERNS.some((pattern) => pattern.test(line))) return;
    if (SUSPICIOUS_PATTERNS.some((pattern) => pattern.test(line))) {
      findings.push({
        file: path.relative(ROOT, filePath),
        line: index + 1,
        sample: line.trim(),
      });
    }
  });
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

if (findings.length > 0) {
  console.error('\nForam encontrados possíveis casos de charset quebrado (mojibake):\n');
  findings.forEach((item) => {
    console.error(`- ${item.file}:${item.line} -> ${item.sample}`);
  });
  console.error('\nCorrija os textos para UTF-8 antes de seguir.\n');
  process.exit(1);
}

console.log('Charset check OK: nenhum mojibake detectado.');
