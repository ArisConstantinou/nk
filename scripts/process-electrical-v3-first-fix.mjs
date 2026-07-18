import path from 'node:path';
import sharp from 'sharp';

const workspace = process.cwd();
const source = path.join(
  workspace,
  'output',
  'imagegen',
  'electrical-v3-first-fix',
  'left-switch-chase-v3.png',
);
const destination = path.join(
  workspace,
  'public',
  'assets',
  'generated',
  'electrical-installation-v3',
  'left-switch-chase-v3.webp',
);

function hueDegrees(red, green, blue) {
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const delta = maximum - minimum;
  if (delta === 0) return 0;
  if (maximum === red) return 60 * (((green - blue) / delta) % 6);
  if (maximum === green) return 60 * ((blue - red) / delta + 2);
  return 60 * ((red - green) / delta + 4);
}

const {data, info} = await sharp(source)
  .ensureAlpha()
  .raw()
  .toBuffer({resolveWithObject: true});

for (let offset = 0; offset < data.length; offset += 4) {
  const red = data[offset] / 255;
  const green = data[offset + 1] / 255;
  const blue = data[offset + 2] / 255;
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const saturation = maximum === 0 ? 0 : (maximum - minimum) / maximum;
  const hue = (hueDegrees(red, green, blue) + 360) % 360;
  const isChromaMagenta = hue >= 285
    && hue <= 350
    && saturation > .22
    && red > green * 1.18
    && blue > green * 1.05;
  if (isChromaMagenta) data[offset + 3] = 0;
}

const keyed = await sharp(data, {raw: info})
  .trim({background: {r: 0, g: 0, b: 0, alpha: 0}})
  .png()
  .toBuffer();

const keyedMetadata = await sharp(keyed).metadata();
const sourceWidth = keyedMetadata.width ?? 184;
const sourceHeight = keyedMetadata.height ?? 702;
const sourceBoxHeight = Math.round(sourceHeight * .31);
const overlap = 8;
const box = await sharp(keyed)
  .extract({left: 0, top: 0, width: sourceWidth, height: sourceBoxHeight})
  .resize(110, 112, {fit: 'fill'})
  .png()
  .toBuffer();
const channel = await sharp(keyed)
  .extract({
    left: 0,
    top: sourceBoxHeight - overlap,
    width: sourceWidth,
    height: sourceHeight - sourceBoxHeight + overlap,
  })
  .resize(110, 366, {fit: 'fill'})
  .png()
  .toBuffer();

await sharp({
  create: {
    width: 110,
    height: 470,
    channels: 4,
    background: {r: 0, g: 0, b: 0, alpha: 0},
  },
})
  .composite([
    {input: channel, left: 0, top: 104},
    {input: box, left: 0, top: 0},
  ])
  .webp({quality: 92, alphaQuality: 100, effort: 6})
  .toFile(destination);

const metadata = await sharp(destination).metadata();
console.log(`left-switch-chase-v3: ${metadata.width}x${metadata.height}`);
