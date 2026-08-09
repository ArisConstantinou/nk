import assert from 'node:assert/strict';
import {readdir, readFile} from 'node:fs/promises';
import {extname} from 'node:path';
import test from 'node:test';

const imageExtensions = new Set(['.avif', '.gif', '.jpeg', '.jpg', '.png', '.svg', '.webp']);
const publicRoot = new URL('../../public/', import.meta.url);

async function imageCount(directory) {
  const entries = await readdir(directory, {withFileTypes: true});
  let count = 0;
  for (const entry of entries) {
    const target = new URL(entry.isDirectory() ? `${entry.name}/` : entry.name, directory);
    count += entry.isDirectory() ? await imageCount(target) : Number(imageExtensions.has(extname(entry.name).toLowerCase()));
  }
  return count;
}

test('website media index covers every public image and groups catalogue photos by useful tags', async () => {
  const index = JSON.parse(await readFile(new URL('assets/website-media-index.json', publicRoot), 'utf8'));
  const publicImages = await imageCount(publicRoot);
  assert.equal(index.imageCount, publicImages, 'every public website image must be present in the Photos index');
  assert.equal(index.images.length, publicImages);
  assert.equal(new Set(index.images.map(image => image.path)).size, publicImages, 'website image paths must stay unique');
  assert.ok(index.images.every(image => image.tags.includes('Website') && image.category && image.title && image.mimeType.startsWith('image/')));
  assert.ok(index.images.filter(image => image.tags.includes('Fans')).length >= 47, 'fan images must remain grouped under Fans');
  assert.ok(index.images.filter(image => image.tags.includes('Lighting')).length >= 450, 'lighting images must remain grouped under Lighting');
  assert.ok(index.images.some(image => image.category === 'Exterior Lights'));
  assert.ok(index.images.some(image => image.category === 'Interior Lights'));
});
