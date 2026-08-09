import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {extname} from 'node:path';
import test from 'node:test';
import {promisify} from 'node:util';

const imageExtensions = new Set(['.avif', '.gif', '.jpeg', '.jpg', '.png', '.svg', '.webp']);
const publicRoot = new URL('../../public/', import.meta.url);
const execFileAsync = promisify(execFile);

async function trackedImageCount() {
  const {stdout} = await execFileAsync('git', ['ls-files', '-z', '--', 'public'], {maxBuffer: 4 * 1024 * 1024});
  return stdout.split('\0').filter(path => imageExtensions.has(extname(path).toLowerCase())).length;
}

test('website media index covers every public image and groups catalogue photos by useful tags', async () => {
  const index = JSON.parse(await readFile(new URL('assets/website-media-index.json', publicRoot), 'utf8'));
  const publicImages = await trackedImageCount();
  assert.equal(index.imageCount, publicImages, 'every public website image must be present in the Photos index');
  assert.equal(index.images.length, publicImages);
  assert.equal(new Set(index.images.map(image => image.path)).size, publicImages, 'website image paths must stay unique');
  assert.ok(index.images.every(image => image.tags.includes('Website') && image.category && image.title && image.mimeType.startsWith('image/')));
  assert.ok(index.images.filter(image => image.tags.includes('Fans')).length >= 47, 'fan images must remain grouped under Fans');
  assert.ok(index.images.filter(image => image.tags.includes('Lighting')).length >= 450, 'lighting images must remain grouped under Lighting');
  assert.ok(index.images.some(image => image.category === 'Exterior Lights'));
  assert.ok(index.images.some(image => image.category === 'Interior Lights'));
});
