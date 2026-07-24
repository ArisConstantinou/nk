import {access, readFile} from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const repositoryRoot = path.resolve(import.meta.dirname, '..');
const publicRoot = path.join(repositoryRoot, 'public');
const products = JSON.parse(await readFile(path.join(repositoryRoot, 'src', 'data', 'legacy-products.json'), 'utf8'));
const manifest = JSON.parse(await readFile(path.join(publicRoot, 'assets', 'catalogue-products', 'manifest.json'), 'utf8'));
const manifestById = new Map(manifest.products.map(product => [product.id, product]));
const failures = [];

if (products.length !== manifest.products.length) {
  failures.push(`Product/manifest count mismatch: ${products.length} products, ${manifest.products.length} manifest entries`);
}

if (new Set(products.map(product => product.image)).size !== products.length) {
  failures.push('Every product must have a unique organized local image path');
}

for (const product of products) {
  if (!product.image.startsWith('assets/catalogue-products/')) {
    failures.push(`${product.id}: non-local image reference ${product.image}`);
    continue;
  }

  const imagePath = path.join(publicRoot, ...product.image.split('/'));
  const manifestEntry = manifestById.get(product.id);

  try {
    await access(imagePath);
    const metadata = await sharp(imagePath).metadata();
    if (!metadata.width || !metadata.height) failures.push(`${product.id}: unreadable image dimensions`);
    if (manifestEntry?.enhanced && Math.max(metadata.width || 0, metadata.height || 0) < 1600) {
      failures.push(`${product.id}: enhanced image is below the 1600px long-edge target`);
    }
  } catch (error) {
    failures.push(`${product.id}: ${error.message}`);
  }

  if (!manifestEntry) failures.push(`${product.id}: missing manifest entry`);
  else if (manifestEntry.path !== product.image) failures.push(`${product.id}: manifest path does not match product image`);
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(JSON.stringify({
  products: products.length,
  localImages: products.length,
  remoteReferences: 0,
  missingOrUnreadable: 0,
  enhanced: manifest.products.filter(product => product.enhanced).length,
  minimumEnhancedLongEdge: Math.min(...manifest.products
    .filter(product => product.enhanced)
    .map(product => Math.max(product.width, product.height))),
}, null, 2));
