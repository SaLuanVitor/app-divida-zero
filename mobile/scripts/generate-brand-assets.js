#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const BRAND_DIR = path.resolve(__dirname, '..', 'assets', 'brand');
const SOURCE_DIR = path.join(BRAND_DIR, 'source');
const MASTER_SVG = path.join(SOURCE_DIR, 'logo-master.svg');
const MONO_SVG = path.join(SOURCE_DIR, 'logo-mono.svg');

const BRAND_ORANGE = { r: 244, g: 140, b: 37, alpha: 1 };
const BRAND_ORANGE_DARK = { r: 233, g: 120, b: 0, alpha: 1 };
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

const TARGETS = {
  appIcon: { file: 'app-icon.png', size: 1024 },
  splashLogo: { file: 'splash-logo.png', size: 1024 },
  adaptiveForeground: { file: 'android-adaptive-foreground.png', size: 432 },
  adaptiveBackground: { file: 'android-adaptive-background.png', size: 432 },
  adaptiveMonochrome: { file: 'android-adaptive-monochrome.png', size: 432 },
  notificationMonochrome: { file: 'notification-icon-monochrome.png', size: 96 },
};

const LEGACY_MIPMAP_SIZE = {
  mdpi: 48,
  hdpi: 72,
  xhdpi: 96,
  xxhdpi: 144,
  xxxhdpi: 192,
};

const ADAPTIVE_MIPMAP_SIZE = {
  mdpi: 108,
  hdpi: 162,
  xhdpi: 216,
  xxhdpi: 324,
  xxxhdpi: 432,
};

const ensureSourceExists = () => {
  if (!fs.existsSync(MASTER_SVG)) {
    throw new Error(`Brand source SVG not found: ${MASTER_SVG}`);
  }
};

const readSvg = (filePath) => fs.readFileSync(filePath, 'utf8');

const renderSvgToPng = async (svgMarkup, size) =>
  sharp(Buffer.from(svgMarkup)).resize(size, size, { fit: 'contain' }).png().toBuffer();

const createCanvas = (size, background) =>
  sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background,
    },
  });

const createRoundedMask = (size, radius) =>
  Buffer.from(
    `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg"><rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="#fff" /></svg>`
  );

const trimAndScaleCentered = async (buffer, size, ratio) => {
  const target = Math.max(1, Math.round(size * ratio));
  const clipped = await sharp(buffer)
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 })
    .resize(target, target, { fit: 'contain' })
    .png()
    .toBuffer();

  return createCanvas(size, { r: 0, g: 0, b: 0, alpha: 0 })
    .composite([{ input: clipped, gravity: 'center' }])
    .png()
    .toBuffer();
};

const toRaw = async (buffer) => sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

const fromRaw = ({ data, width, height }) => sharp(data, { raw: { width, height, channels: 4 } }).png().toBuffer();

const extractWhiteMask = async (buffer, threshold = 216) => {
  const { data, info } = await toRaw(buffer);

  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const alpha = data[i + 3];
    const isWhiteLike = alpha > 20 && r >= threshold && g >= threshold && b >= threshold;

    if (isWhiteLike) {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = 255;
    } else {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 0;
    }
  }

  return fromRaw({ data, width: info.width, height: info.height });
};

const tintMask = async (buffer, color) => {
  const { data, info } = await toRaw(buffer);

  for (let i = 0; i < data.length; i += info.channels) {
    const alpha = data[i + 3];
    if (alpha > 0) {
      data[i] = color.r;
      data[i + 1] = color.g;
      data[i + 2] = color.b;
      data[i + 3] = 255;
    }
  }

  return fromRaw({ data, width: info.width, height: info.height });
};

const alphaCoverage = async (buffer) => {
  const { data, info } = await toRaw(buffer);
  let used = 0;

  for (let i = 3; i < data.length; i += info.channels) {
    if (data[i] > 0) used += 1;
  }

  return used / (info.width * info.height);
};

const resolveMonochromeBase = async (masterPng) => {
  const whiteMask = await extractWhiteMask(masterPng);
  if ((await alphaCoverage(whiteMask)) >= 0.02) {
    return whiteMask;
  }

  if (!fs.existsSync(MONO_SVG)) {
    return whiteMask;
  }

  const fallback = await renderSvgToPng(readSvg(MONO_SVG), 1024);
  return extractWhiteMask(fallback, 180);
};

const writePng = async (targetPath, buffer) => {
  await sharp(buffer).png().toFile(targetPath);
};

const toWebp = async (buffer, size) =>
  sharp(buffer)
    .resize(size, size, { fit: 'cover' })
    .webp({ lossless: true })
    .toBuffer();

const generateAssets = async () => {
  ensureSourceExists();
  fs.mkdirSync(BRAND_DIR, { recursive: true });

  const master = await renderSvgToPng(readSvg(MASTER_SVG), 1024);
  const whiteBase = await resolveMonochromeBase(master);
  const orangeSymbol = await tintMask(whiteBase, BRAND_ORANGE);
  const whiteSymbol = await tintMask(whiteBase, WHITE);

  const appIconRaw = await trimAndScaleCentered(master, TARGETS.appIcon.size, 0.86);
  const appIcon = await createCanvas(TARGETS.appIcon.size, { r: 0, g: 0, b: 0, alpha: 0 })
    .composite([
      { input: appIconRaw, gravity: 'center' },
      { input: createRoundedMask(TARGETS.appIcon.size, 230), blend: 'dest-in' },
    ])
    .png()
    .toBuffer();

  const splashLogo = await trimAndScaleCentered(orangeSymbol, TARGETS.splashLogo.size, 0.74);
  const adaptiveForeground = await trimAndScaleCentered(whiteSymbol, TARGETS.adaptiveForeground.size, 0.7);
  const adaptiveBackground = await createCanvas(TARGETS.adaptiveBackground.size, BRAND_ORANGE_DARK).png().toBuffer();
  const adaptiveMonochrome = await trimAndScaleCentered(whiteSymbol, TARGETS.adaptiveMonochrome.size, 0.72);
  const notificationMonochrome = await trimAndScaleCentered(whiteSymbol, TARGETS.notificationMonochrome.size, 0.7);

  await Promise.all([
    writePng(path.join(BRAND_DIR, TARGETS.appIcon.file), appIcon),
    writePng(path.join(BRAND_DIR, TARGETS.splashLogo.file), splashLogo),
    writePng(path.join(BRAND_DIR, TARGETS.adaptiveForeground.file), adaptiveForeground),
    writePng(path.join(BRAND_DIR, TARGETS.adaptiveBackground.file), adaptiveBackground),
    writePng(path.join(BRAND_DIR, TARGETS.adaptiveMonochrome.file), adaptiveMonochrome),
    writePng(path.join(BRAND_DIR, TARGETS.notificationMonochrome.file), notificationMonochrome),
  ]);
};

const syncAndroidLauncherResources = async () => {
  const appIcon = await sharp(path.join(BRAND_DIR, TARGETS.appIcon.file)).png().toBuffer();
  const foreground = await sharp(path.join(BRAND_DIR, TARGETS.adaptiveForeground.file)).png().toBuffer();
  const background = await sharp(path.join(BRAND_DIR, TARGETS.adaptiveBackground.file)).png().toBuffer();
  const monochrome = await sharp(path.join(BRAND_DIR, TARGETS.adaptiveMonochrome.file)).png().toBuffer();

  const androidRes = path.resolve(__dirname, '..', 'android', 'app', 'src', 'main', 'res');

  for (const density of Object.keys(LEGACY_MIPMAP_SIZE)) {
    const mipmapDir = path.join(androidRes, `mipmap-${density}`);
    const launcherSize = LEGACY_MIPMAP_SIZE[density];
    const adaptiveSize = ADAPTIVE_MIPMAP_SIZE[density];

    await sharp(await toWebp(appIcon, launcherSize)).toFile(path.join(mipmapDir, 'ic_launcher.webp'));
    await sharp(await toWebp(appIcon, launcherSize)).toFile(path.join(mipmapDir, 'ic_launcher_round.webp'));
    await sharp(await toWebp(foreground, adaptiveSize)).toFile(path.join(mipmapDir, 'ic_launcher_foreground.webp'));
    await sharp(await toWebp(background, adaptiveSize)).toFile(path.join(mipmapDir, 'ic_launcher_background.webp'));
    await sharp(await toWebp(monochrome, adaptiveSize)).toFile(path.join(mipmapDir, 'ic_launcher_monochrome.webp'));
  }
};

const checkBrandAssets = async () => {
  for (const target of Object.values(TARGETS)) {
    const filePath = path.join(BRAND_DIR, target.file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing required asset: ${filePath}`);
    }

    const metadata = await sharp(filePath).metadata();
    if (metadata.width !== target.size || metadata.height !== target.size) {
      throw new Error(`Invalid size for ${target.file}. Expected ${target.size}x${target.size}, got ${metadata.width}x${metadata.height}.`);
    }
  }

  const monoFiles = [TARGETS.adaptiveMonochrome.file, TARGETS.notificationMonochrome.file];
  for (const file of monoFiles) {
    const coverage = await alphaCoverage(await sharp(path.join(BRAND_DIR, file)).png().toBuffer());
    if (coverage < 0.01) {
      throw new Error(`Monochrome coverage is too low for ${file}.`);
    }
  }
};

const runCli = async () => {
  const checkOnly = process.argv.includes('--check');

  if (!checkOnly) {
    console.log('Generating brand assets...');
    await generateAssets();
    console.log('Syncing native Android launcher resources...');
    await syncAndroidLauncherResources();
  }

  console.log('Validating brand assets...');
  await checkBrandAssets();
  console.log('Brand assets are ready.');
};

if (require.main === module) {
  runCli().catch((error) => {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  BRAND_DIR,
  MASTER_SVG,
  MONO_SVG,
  TARGETS,
  generateAssets,
  syncAndroidLauncherResources,
  checkBrandAssets,
  extractWhiteMask,
  tintMask,
};
