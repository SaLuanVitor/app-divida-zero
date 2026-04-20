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

const ensureSourceExists = () => {
  if (!fs.existsSync(MASTER_SVG)) {
    throw new Error(`Arquivo de marca não encontrado: ${MASTER_SVG}`);
  }
};

const readSvg = (filePath) => fs.readFileSync(filePath, 'utf8');

const renderSvgBuffer = async (svgMarkup, size) => sharp(Buffer.from(svgMarkup)).resize(size, size, { fit: 'contain' }).png().toBuffer();

const createTransparentCanvas = (size) =>
  sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });

const createSolidCanvas = (size, background) =>
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

const toRaw = async (buffer) => sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

const fromRaw = ({ data, width, height }) => sharp(data, { raw: { width, height, channels: 4 } }).png().toBuffer();

const tintOpaquePixels = async (buffer, color) => {
  const { data, info } = await toRaw(buffer);
  for (let i = 0; i < data.length; i += info.channels) {
    const alpha = data[i + 3];
    if (alpha > 0) {
      data[i] = color.r;
      data[i + 1] = color.g;
      data[i + 2] = color.b;
    }
  }

  return fromRaw({ data, width: info.width, height: info.height });
};

const extractLightSymbol = async (buffer, threshold = 228) => {
  const { data, info } = await toRaw(buffer);
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const alpha = data[i + 3];
    const isLight = r >= threshold && g >= threshold && b >= threshold && alpha > 0;

    if (isLight) {
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

const extractOrangeSymbol = async (buffer) => {
  const { data, info } = await toRaw(buffer);
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const alpha = data[i + 3];
    const isOrangeLike = r >= 170 && g >= 70 && g <= 200 && b <= 120 && alpha > 0;

    if (isOrangeLike) {
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

const alphaCoverageFromBuffer = async (buffer) => {
  const { data, info } = await toRaw(buffer);
  let nonTransparent = 0;

  for (let i = 3; i < data.length; i += info.channels) {
    if (data[i] > 0) nonTransparent += 1;
  }

  return nonTransparent / (info.width * info.height);
};

const centerOnCanvas = async (buffer, size, scale) => {
  const target = Math.max(1, Math.round(size * scale));
  const resized = await sharp(buffer)
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 })
    .resize(target, target, { fit: 'contain' })
    .png()
    .toBuffer();
  return createTransparentCanvas(size).composite([{ input: resized, gravity: 'center' }]).png().toBuffer();
};

const buildMonochromeSymbol = async (masterRendered) => {
  const lightExtracted = await extractLightSymbol(masterRendered);
  const lightCoverage = await alphaCoverageFromBuffer(lightExtracted);

  if (lightCoverage >= 0.005) {
    return lightExtracted;
  }

  const orangeExtracted = await extractOrangeSymbol(masterRendered);
  const orangeCoverage = await alphaCoverageFromBuffer(orangeExtracted);

  if (orangeCoverage >= 0.005) {
    return orangeExtracted;
  }

  if (!fs.existsSync(MONO_SVG)) {
    return lightExtracted;
  }

  const monoRendered = await renderSvgBuffer(readSvg(MONO_SVG), 1024);
  const monoTinted = await tintOpaquePixels(monoRendered, WHITE);
  return monoTinted;
};

const writeBuffer = async (targetPath, buffer) => {
  await sharp(buffer).png().toFile(targetPath);
};

const generateAssets = async () => {
  ensureSourceExists();
  fs.mkdirSync(BRAND_DIR, { recursive: true });

  const masterSvg = readSvg(MASTER_SVG);
  const masterRendered1024 = await renderSvgBuffer(masterSvg, 1024);
  const monochromeBase = await buildMonochromeSymbol(masterRendered1024);
  const orangeSymbol = await tintOpaquePixels(monochromeBase, BRAND_ORANGE);
  const whiteSymbol = await tintOpaquePixels(monochromeBase, WHITE);

  const appLogo = await centerOnCanvas(masterRendered1024, TARGETS.appIcon.size, 0.82);
  const appIcon = await createTransparentCanvas(TARGETS.appIcon.size)
    .composite([
      { input: appLogo, gravity: 'center' },
      { input: createRoundedMask(TARGETS.appIcon.size, 220), blend: 'dest-in' },
    ])
    .png()
    .toBuffer();

  const splashLogo = await centerOnCanvas(orangeSymbol, TARGETS.splashLogo.size, 0.78);
  const adaptiveForeground = await centerOnCanvas(orangeSymbol, TARGETS.adaptiveForeground.size, 0.88);
  const adaptiveBackground = await createSolidCanvas(TARGETS.adaptiveBackground.size, BRAND_ORANGE_DARK).png().toBuffer();
  const adaptiveMonochrome = await centerOnCanvas(whiteSymbol, TARGETS.adaptiveMonochrome.size, 0.9);
  const notificationMonochrome = await centerOnCanvas(whiteSymbol, TARGETS.notificationMonochrome.size, 0.9);

  await Promise.all([
    writeBuffer(path.join(BRAND_DIR, TARGETS.appIcon.file), appIcon),
    writeBuffer(path.join(BRAND_DIR, TARGETS.splashLogo.file), splashLogo),
    writeBuffer(path.join(BRAND_DIR, TARGETS.adaptiveForeground.file), adaptiveForeground),
    writeBuffer(path.join(BRAND_DIR, TARGETS.adaptiveBackground.file), adaptiveBackground),
    writeBuffer(path.join(BRAND_DIR, TARGETS.adaptiveMonochrome.file), adaptiveMonochrome),
    writeBuffer(path.join(BRAND_DIR, TARGETS.notificationMonochrome.file), notificationMonochrome),
  ]);
};

const alphaCoverageFromFile = async (filePath) => {
  const raw = await toRaw(await sharp(filePath).png().toBuffer());
  let nonTransparent = 0;

  for (let i = 3; i < raw.data.length; i += raw.info.channels) {
    if (raw.data[i] > 0) nonTransparent += 1;
  }

  return nonTransparent / (raw.info.width * raw.info.height);
};

const checkBrandAssets = async () => {
  const required = Object.values(TARGETS).map((target) => ({
    filePath: path.join(BRAND_DIR, target.file),
    expected: target.size,
  }));

  for (const item of required) {
    if (!fs.existsSync(item.filePath)) {
      throw new Error(`Asset obrigatório ausente: ${item.filePath}`);
    }

    const metadata = await sharp(item.filePath).metadata();
    if (metadata.width !== item.expected || metadata.height !== item.expected) {
      throw new Error(
        `Dimensão inválida em ${path.basename(item.filePath)}. Esperado ${item.expected}x${item.expected}, recebido ${metadata.width}x${metadata.height}.`
      );
    }
  }

  const monoTargets = [TARGETS.adaptiveMonochrome.file, TARGETS.notificationMonochrome.file];
  for (const file of monoTargets) {
    const coverage = await alphaCoverageFromFile(path.join(BRAND_DIR, file));
    if (coverage < 0.01) {
      throw new Error(`Cobertura visual muito baixa em ${file}. Ajuste a versão monocromática da marca.`);
    }
  }
};

const runCli = async () => {
  const checkOnly = process.argv.includes('--check');

  if (!checkOnly) {
    console.log('Gerando assets de marca...');
    await generateAssets();
  }

  console.log('Validando assets de marca...');
  await checkBrandAssets();
  console.log('Assets de marca prontos e validados.');
};

if (require.main === module) {
  runCli().catch((error) => {
    console.error(`Erro: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  BRAND_DIR,
  MASTER_SVG,
  MONO_SVG,
  TARGETS,
  generateAssets,
  checkBrandAssets,
  extractOrangeSymbol,
  extractLightSymbol,
  tintOpaquePixels,
};
