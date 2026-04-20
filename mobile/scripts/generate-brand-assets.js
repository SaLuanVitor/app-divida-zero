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

const toRaw = async (buffer) => sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

const fromRaw = ({ data, width, height }) => sharp(data, { raw: { width, height, channels: 4 } }).png().toBuffer();

const stripNearBlackPixels = async (buffer, threshold = 24) => {
  const { data, info } = await toRaw(buffer);
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a > 0 && r <= threshold && g <= threshold && b <= threshold) {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 0;
    }
  }

  return fromRaw({ data, width: info.width, height: info.height });
};

const trimAndScaleCentered = async (buffer, size, ratio) => {
  const target = Math.max(1, Math.round(size * ratio));
  const clippedRaw = await sharp(buffer)
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 })
    .resize(target, target, { fit: 'contain' })
    .png()
    .toBuffer();
  const clipped = await stripNearBlackPixels(clippedRaw);

  return createCanvas(size, { r: 0, g: 0, b: 0, alpha: 0 })
    .composite([{ input: clipped, gravity: 'center' }])
    .png()
    .toBuffer();
};

const removeHorizontalStripeComponents = (data, info) => {
  const width = info.width;
  const height = info.height;
  const channels = info.channels;
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  const toClear = [];

  const alphaAt = (idx) => data[idx * channels + 3];

  for (let i = 0; i < width * height; i += 1) {
    if (visited[i] || alphaAt(i) === 0) {
      continue;
    }

    let head = 0;
    let tail = 0;
    queue[tail++] = i;
    visited[i] = 1;

    const pixels = [];
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;

    while (head < tail) {
      const node = queue[head++];
      pixels.push(node);

      const x = node % width;
      const y = Math.floor(node / width);

      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;

      const neighbors = [node - 1, node + 1, node - width, node + width];
      for (const next of neighbors) {
        if (next < 0 || next >= width * height || visited[next]) {
          continue;
        }

        const nx = next % width;
        const ny = Math.floor(next / width);
        if (Math.abs(nx - x) + Math.abs(ny - y) !== 1) {
          continue;
        }

        if (alphaAt(next) > 0) {
          visited[next] = 1;
          queue[tail++] = next;
        }
      }
    }

    const componentWidth = maxX - minX + 1;
    const componentHeight = maxY - minY + 1;
    const isHorizontalStripe = componentWidth >= width * 0.45 && componentHeight <= height * 0.08;

    if (isHorizontalStripe) {
      toClear.push(...pixels);
    }
  }

  for (const idx of toClear) {
    const base = idx * channels;
    data[base] = 0;
    data[base + 1] = 0;
    data[base + 2] = 0;
    data[base + 3] = 0;
  }
};

const removeHorizontalBandRuns = (data, info) => {
  const width = info.width;
  const height = info.height;
  const channels = info.channels;
  const alpha = (x, y) => data[(y * width + x) * channels + 3];

  let minY = height;
  let maxY = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (alpha(x, y) > 0) {
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (minY >= maxY) return;

  const bandHeight = Math.max(1, Math.floor((maxY - minY + 1) * 0.25));
  const isInBand = (y) => y <= minY + bandHeight || y >= maxY - bandHeight;

  for (let y = minY; y <= maxY; y += 1) {
    if (!isInBand(y)) {
      continue;
    }

    let opaqueCount = 0;
    for (let x = 0; x < width; x += 1) {
      if (alpha(x, y) > 0) {
        opaqueCount += 1;
      }
    }

    if (opaqueCount >= width * 0.45) {
      for (let x = 0; x < width; x += 1) {
        const idx = (y * width + x) * channels;
        data[idx] = 0;
        data[idx + 1] = 0;
        data[idx + 2] = 0;
        data[idx + 3] = 0;
      }
    }
  }
};

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

  removeHorizontalStripeComponents(data, info);
  removeHorizontalBandRuns(data, info);
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
      data[i + 3] = alpha;
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

  const appIconSymbolRaw = await trimAndScaleCentered(whiteSymbol, TARGETS.appIcon.size, 0.68);
  const appIconSymbol = await tintMask(appIconSymbolRaw, WHITE);
  const appIcon = await createCanvas(TARGETS.appIcon.size, BRAND_ORANGE_DARK)
    .composite([{ input: appIconSymbol, gravity: 'center' }])
    .png()
    .toBuffer();

  const splashLogoRaw = await trimAndScaleCentered(orangeSymbol, TARGETS.splashLogo.size, 0.74);
  const splashLogo = await tintMask(splashLogoRaw, BRAND_ORANGE);
  const adaptiveForegroundRaw = await trimAndScaleCentered(whiteSymbol, TARGETS.adaptiveForeground.size, 0.7);
  const adaptiveForeground = await tintMask(adaptiveForegroundRaw, WHITE);
  const adaptiveBackground = await createCanvas(TARGETS.adaptiveBackground.size, BRAND_ORANGE_DARK).png().toBuffer();
  const adaptiveMonochromeRaw = await trimAndScaleCentered(whiteSymbol, TARGETS.adaptiveMonochrome.size, 0.72);
  const adaptiveMonochrome = await tintMask(adaptiveMonochromeRaw, WHITE);
  const notificationMonochromeRaw = await trimAndScaleCentered(whiteSymbol, TARGETS.notificationMonochrome.size, 0.7);
  const notificationMonochrome = await tintMask(notificationMonochromeRaw, WHITE);

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
