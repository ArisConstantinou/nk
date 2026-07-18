import path from 'node:path';
import sharp from 'sharp';

const workspace = process.cwd();
const sourceRoot = path.join(workspace, 'output', 'imagegen', 'electrical-v3-workers');
const destinationRoot = path.join(workspace, 'public', 'assets', 'generated', 'electrical-installation-v3');
const workerAssets = [
  'electrician-marking-v3',
  'electrician-boxes-v3',
  'electrician-conduit-v3',
  'electrician-cables-v3',
  'electrician-switch-v3',
];

function hueDegrees(red, green, blue) {
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const delta = maximum - minimum;
  if (delta === 0) return 0;
  if (maximum === red) return 60 * (((green - blue) / delta) % 6);
  if (maximum === green) return 60 * ((blue - red) / delta + 2);
  return 60 * ((red - green) / delta + 4);
}

async function removeMagenta(source, destination) {
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
    const magenta = hue >= 285 && hue <= 350
      && saturation > .2
      && red > green * 1.15
      && blue > green * 1.04;
    if (magenta) data[offset + 3] = 0;
  }

  await sharp(data, {raw: info})
    .trim({background: {r: 0, g: 0, b: 0, alpha: 0}})
    .webp({quality: 92, alphaQuality: 100, effort: 6})
    .toFile(destination);
}

for (const asset of workerAssets) {
  const source = path.join(sourceRoot, `${asset}.png`);
  const destination = path.join(destinationRoot, `${asset}.webp`);
  await removeMagenta(source, destination);
  const metadata = await sharp(destination).metadata();
  console.log(`${asset}: ${metadata.width}x${metadata.height}`);
}
