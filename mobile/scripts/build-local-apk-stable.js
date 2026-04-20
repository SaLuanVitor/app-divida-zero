#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const MOBILE_ROOT = process.cwd();
const ANDROID_ROOT = path.join(MOBILE_ROOT, 'android');
const GRADLEW = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
const RELEASE_APK = path.join(ANDROID_ROOT, 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
const NAMED_APK = path.join(MOBILE_ROOT, 'D\u00EDvida Zero.apk');

const run = (command, args, cwd) => {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    throw new Error(`Failed to run: ${command} ${args.join(' ')}`);
  }
};

const ensureExists = (filePath, message) => {
  if (!fs.existsSync(filePath)) {
    throw new Error(message);
  }
};

const main = () => {
  console.log('1/4 Generating brand assets...');
  run('node', ['scripts/generate-brand-assets.js'], MOBILE_ROOT);

  console.log('2/4 Stopping old Gradle daemons...');
  run(GRADLEW, ['--stop'], ANDROID_ROOT);

  console.log('3/4 Building release APK...');
  run(GRADLEW, ['assembleRelease'], ANDROID_ROOT);

  console.log('4/4 Copying APK with final name...');
  ensureExists(RELEASE_APK, 'Release APK not found after build.');
  fs.copyFileSync(RELEASE_APK, NAMED_APK);

  console.log(`APK ready: ${NAMED_APK}`);
};

try {
  main();
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
