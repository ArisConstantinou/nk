import {mkdir, readFile, stat, writeFile} from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const repositoryRoot = path.resolve(import.meta.dirname, '..');
const productsPath = path.join(repositoryRoot, 'src', 'data', 'legacy-products.json');
const publicRoot = path.join(repositoryRoot, 'public');
const catalogueRoot = path.join(publicRoot, 'assets', 'catalogue-products');
const manifestPath = path.join(catalogueRoot, 'manifest.json');
const refresh = process.argv.includes('--refresh');

const curatedExtensions = new Map([
  ['oia', 'jpg'],
  ['fame', 'jpg'],
  ['neri', 'webp'],
  ['polo', 'jpg'],
  ['el-led', 'webp'],
  ['ragno', 'jpg'],
  ['filomena-black', 'jpg'],
  ['filomena-gold', 'jpg'],
  ['nova', 'jpg'],
  ['zoella', 'jpg'],
  ['ceiling-fan', 'jpg'],
  ['izzy-coffee', 'webp'],
  ['matestar-coffee', 'jpg'],
  ['bosch-tassimo', 'webp'],
  ['nespresso', 'webp'],
  ['delonghi', 'png'],
  ['blaupunkt', 'webp'],
  ['ufesa-barista', 'jpg'],
  ['ufesa-espresso', 'jpg'],
  ['kenwood-multipro', 'jpg'],
  ['izzy-kitchen', 'webp'],
  ['bosch-multitalent', 'webp'],
  ['kenwood-chef', 'jpeg'],
  ['steba-airfryer', 'webp'],
]);

const curatedCutoutIds = new Set(['blaupunkt', 'bosch-multitalent', 'el-led', 'nespresso']);

const toDepartment = product => (
  product.department === 'lighting' || product.category === 'Lighting'
    ? 'lighting'
    : 'appliances'
);

const wixOriginalUrl = url => (
  /static\.wixstatic\.com\/media\//i.test(url)
    ? url.replace(/\/v1\/.*$/i, '')
    : url
);

const extensionFrom = value => {
  const clean = value.split(/[?#]/, 1)[0];
  const extension = path.extname(clean).slice(1).toLowerCase();
  if (extension === 'jpeg' || extension === 'jpg' || extension === 'png' || extension === 'webp') return extension;
  return 'webp';
};

const fetchImage = async url => {
  const response = await fetch(url, {
    headers: {
      accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      'user-agent': 'Mozilla/5.0 NK-Electrical-Product-Archive/1.0',
    },
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.startsWith('image/')) throw new Error(`Unexpected content type ${contentType || 'unknown'}`);
  return Buffer.from(await response.arrayBuffer());
};

const fetchBestRemoteImage = async sourceUrl => {
  const originalUrl = wixOriginalUrl(sourceUrl);
  try {
    return {buffer: await fetchImage(originalUrl), fetchedUrl: originalUrl};
  } catch (originalError) {
    try {
      return {buffer: await fetchImage(sourceUrl), fetchedUrl: sourceUrl};
    } catch (fallbackError) {
      throw new Error(`Original failed (${originalError.message}); fallback failed (${fallbackError.message})`);
    }
  }
};

const runPool = async (items, concurrency, worker) => {
  const results = new Array(items.length);
  let nextIndex = 0;
  const runners = Array.from({length: Math.min(concurrency, items.length)}, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
};

const products = JSON.parse(await readFile(productsPath, 'utf8'));
const existingManifest = await readFile(manifestPath, 'utf8')
  .then(value => JSON.parse(value))
  .catch(() => null);
const existingById = new Map((existingManifest?.products || []).map(product => [product.id, product]));
const isLocalized = product => (
  product.image.startsWith('assets/catalogue-products/')
  && existingById.has(product.id)
);
const sourceFor = product => (
  curatedExtensions.has(product.id)
    ? `assets/products/${product.id}.${curatedExtensions.get(product.id)}`
    : (existingById.get(product.id)?.source || product.image)
);
const remoteCache = new Map();
const remoteUrls = [...new Set(products
  .filter(product => refresh || !isLocalized(product))
  .map(sourceFor)
  .filter(source => /^https?:\/\//i.test(source)))];

console.log(`Downloading ${remoteUrls.length} new or refreshed remote product images at their best available source resolution...`);
await runPool(remoteUrls, 8, async (url, index) => {
  const downloaded = await fetchBestRemoteImage(url);
  remoteCache.set(url, downloaded);
  if ((index + 1) % 25 === 0 || index + 1 === remoteUrls.length) {
    console.log(`Downloaded ${index + 1}/${remoteUrls.length}`);
  }
});

const manifest = [];

for (const product of products) {
  if (!refresh && isLocalized(product)) {
    manifest.push(existingById.get(product.id));
    continue;
  }

  const existing = existingById.get(product.id);
  const department = toDepartment(product);
  const curatedExtension = curatedExtensions.get(product.id);
  const source = sourceFor(product);
  const sourceIsCutout = existing?.kind === 'cutout' || source.includes('/product-cutouts/');
  const kind = curatedExtension
    ? (curatedCutoutIds.has(product.id) ? 'cutouts' : 'photos')
    : (sourceIsCutout ? 'cutouts' : 'photos');
  const extension = curatedExtension || extensionFrom(source);
  const relativePath = `assets/catalogue-products/${department}/${kind}/${product.id}.${extension}`;
  const destination = path.join(publicRoot, ...relativePath.split('/'));

  let buffer;
  let fetchedUrl = null;
  if (/^https?:\/\//i.test(source)) {
    const downloaded = remoteCache.get(source);
    if (!downloaded) throw new Error(`Remote image was not downloaded for ${product.id}: ${source}`);
    buffer = downloaded.buffer;
    fetchedUrl = downloaded.fetchedUrl;
  } else {
    buffer = await readFile(path.join(publicRoot, ...source.split('/')));
  }

  await mkdir(path.dirname(destination), {recursive: true});
  await writeFile(destination, buffer);
  const metadata = await sharp(buffer).metadata();
  const fileStats = await stat(destination);

  product.image = relativePath;
  manifest.push({
    id: product.id,
    name: product.name,
    department,
    category: product.legacyCategory || product.category,
    kind: kind === 'cutouts' ? 'cutout' : 'photo',
    path: relativePath,
    source,
    fetchedUrl,
    width: metadata.width || null,
    height: metadata.height || null,
    format: metadata.format || extension,
    bytes: fileStats.size,
    enhanced: false,
  });
}

await mkdir(catalogueRoot, {recursive: true});
await writeFile(productsPath, `${JSON.stringify(products, null, 2)}\n`);
await writeFile(manifestPath, `${JSON.stringify({
  ...(!refresh && existingManifest ? existingManifest : {}),
  generatedAt: new Date().toISOString(),
  productCount: manifest.length,
  remoteSourceCount: new Set(manifest.map(product => product.source).filter(source => /^https?:\/\//i.test(source))).size,
  products: manifest,
}, null, 2)}\n`);

console.log(`Localized ${manifest.length} product images under ${path.relative(repositoryRoot, catalogueRoot)}.`);
if (!refresh) console.log(`Reused ${products.filter(isLocalized).length} already-localized product images without overwriting enhancements.`);
console.log(`Manifest written to ${path.relative(repositoryRoot, manifestPath)}.`);
