#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const OUTPUT_FILE = path.resolve(process.cwd(), 'D\u00edvida Zero.apk');

const runEasBuildList = () => {
  const args = [
    'eas-cli',
    'build:list',
    '--platform',
    'android',
    '--status',
    'finished',
    '--build-profile',
    'preview',
    '--limit',
    '20',
    '--json',
    '--non-interactive',
  ];

  const result = spawnSync('npx', args, {
    encoding: 'utf8',
    shell: true,
  });

  if (result.status !== 0) {
    const combinedOutput = [result.stderr, result.stdout].filter(Boolean).join('\n').trim();
    const authHint = /Expo user account is required|Either log in with eas login|EXPO_TOKEN/i.test(combinedOutput)
      ? '\nDica: execute `npx eas-cli login --username SEU_USUARIO` ou configure EXPO_TOKEN.'
      : '';
    throw new Error(`${combinedOutput || 'Falha ao consultar builds no EAS.'}${authHint}`);
  }

  const raw = (result.stdout || '').trim();
  if (!raw) {
    throw new Error('EAS nao retornou nenhum dado de build.');
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('Nao foi possivel interpretar o JSON retornado por `eas-cli build:list`.');
  }
};

const pickDownloadUrl = (build) => {
  const artifacts = build?.artifacts || {};
  return artifacts.applicationArchiveUrl || artifacts.buildUrl || build?.artifactUrl || null;
};

const pickLatestApkBuild = (builds) => {
  if (!Array.isArray(builds) || builds.length === 0) {
    return null;
  }

  const withUrl = builds
    .map((build) => ({ build, url: pickDownloadUrl(build) }))
    .filter((item) => typeof item.url === 'string' && item.url.length > 0);

  if (withUrl.length === 0) return null;

  const apkFirst = withUrl.find((item) => item.url.toLowerCase().includes('.apk'));
  return apkFirst || withUrl[0];
};

const downloadToFile = async (url, destination) => {
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) {
    throw new Error(`Download falhou com status HTTP ${response.status}.`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(destination, buffer);
};

const main = async () => {
  console.log('Consultando ultimo build Android (preview) no EAS...');
  const builds = runEasBuildList();
  const selected = pickLatestApkBuild(builds);

  if (!selected) {
    throw new Error(
      'Nenhum build Android finalizado com artefato para download foi encontrado. Gere um build antes: `npm run build:apk`.'
    );
  }

  console.log(`Baixando artefato para: ${OUTPUT_FILE}`);
  await downloadToFile(selected.url, OUTPUT_FILE);
  console.log('Download concluido com sucesso.');
};

main().catch((error) => {
  console.error(`Erro: ${error.message}`);
  process.exit(1);
});

