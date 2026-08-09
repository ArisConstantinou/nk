import {readdir, readFile, stat, writeFile} from 'node:fs/promises';
import {extname, join, relative, resolve} from 'node:path';
import sharp from 'sharp';

const root = resolve('public');
const assetsRoot = join(root, 'assets');
const output = join(assetsRoot, 'website-media-index.json');
const catalogueManifestPath = join(assetsRoot, 'catalogue-products', 'manifest.json');
const imageTypes = new Map([
  ['.avif', 'image/avif'], ['.gif', 'image/gif'], ['.jpeg', 'image/jpeg'], ['.jpg', 'image/jpeg'],
  ['.png', 'image/png'], ['.svg', 'image/svg+xml'], ['.webp', 'image/webp'],
]);

const titleCase = value => String(value || '')
  .replace(/\.[^.]+$/, '')
  .replace(/[-_]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .replace(/\b\w/g, letter => letter.toUpperCase());

const addTag = (tags, value) => {
  const clean = String(value || '').replace(/\s+/g, ' ').trim();
  if (clean && !tags.some(tag => tag.toLowerCase() === clean.toLowerCase())) tags.push(clean);
};

const inferredTags = (assetPath, catalogue) => {
  const tags = [];
  const search = `${assetPath} ${catalogue?.name || ''} ${catalogue?.category || ''}`.toLowerCase();
  const segments = assetPath.split('/');
  const section = segments[1] || 'website';
  const category = catalogue?.category || ({
    heroes: 'Heroes', projects: 'Projects', team: 'Team', interactive: 'Interactive',
    generated: segments.includes('header-cables') || segments.includes('header-studio') || segments.includes('header-stories') ? 'Headers' : 'Generated visuals',
    products: 'Products', 'product-cutouts': 'Products', 'catalogue-products': 'Products',
  }[section] || 'Website');

  addTag(tags, category);
  addTag(tags, catalogue?.department && titleCase(catalogue.department));
  addTag(tags, catalogue?.kind && titleCase(catalogue.kind));
  if (/\bfans?\b/.test(search)) addTag(tags, 'Fans');
  if (/\b(light|lighting|lamp|lamps|led|pendant|chandelier|spotlight|lantern)s?\b/.test(search)) addTag(tags, 'Lighting');
  if (/\b(project|projects|residential|commercial)\b/.test(search)) addTag(tags, 'Projects');
  if (/\b(catalogue|catalog|book|books)\b/.test(search)) addTag(tags, 'Catalogues');
  if (/\b(hero|heroes)\b/.test(search)) addTag(tags, 'Heroes');
  if (/\b(team|staff|portrait)\b/.test(search)) addTag(tags, 'Team');
  addTag(tags, 'Website');
  return {category, tags};
};

async function walk(directory) {
  const entries = await readdir(directory, {withFileTypes: true});
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else if (imageTypes.has(extname(entry.name).toLowerCase())) files.push(path);
  }
  return files;
}

const catalogueManifest = JSON.parse(await readFile(catalogueManifestPath, 'utf8'));
const catalogueByPath = new Map(catalogueManifest.products.map(product => [String(product.path).replaceAll('\\', '/'), product]));
const files = await walk(root);
let latestModified = 0;
const images = [];

for (const file of files) {
  const fileStat = await stat(file);
  latestModified = Math.max(latestModified, fileStat.mtimeMs);
  const path = relative(root, file).replaceAll('\\', '/');
  const catalogue = catalogueByPath.get(path);
  const inferred = inferredTags(path, catalogue);
  let width = catalogue?.width || null;
  let height = catalogue?.height || null;
  if (!width || !height) {
    try {
      const metadata = await sharp(file, {animated: false}).metadata();
      width = metadata.width || null;
      height = metadata.height || null;
    } catch {
      // SVGs and future browser-supported formats may not expose raster dimensions.
    }
  }
  images.push({
    id: `website:${path}`,
    path,
    filename: path.split('/').at(-1),
    title: catalogue?.name || titleCase(path.split('/').at(-1)),
    mimeType: imageTypes.get(extname(file).toLowerCase()),
    size: fileStat.size,
    width,
    height,
    folder: `Website / ${titleCase(path.split('/')[1] || 'Assets')}`,
    category: inferred.category,
    tags: inferred.tags,
  });
}

images.sort((left, right) => left.category.localeCompare(right.category) || left.title.localeCompare(right.title) || left.path.localeCompare(right.path));
const groupCounts = new Map();
images.forEach(image => image.tags.forEach(tag => groupCounts.set(tag, (groupCounts.get(tag) || 0) + 1)));
const payload = {
  generatedAt: new Date(latestModified || Date.now()).toISOString(),
  imageCount: images.length,
  groups: [...groupCounts].map(([tag, count]) => ({tag, count})).sort((left, right) => right.count - left.count || left.tag.localeCompare(right.tag)),
  images,
};

await writeFile(output, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Indexed ${images.length} website images across ${payload.groups.length} tags.`);
