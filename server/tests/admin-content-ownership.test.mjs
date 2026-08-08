import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

test('mobile dock keeps its five navigation actions in the approved order', async () => {
  const source = await read('src/admin/layout/AdminLayout.tsx');
  const labels = ["text('Edit'", "text('Gallery'", "text('Add'", "text('Changes'", "text('Search'"];
  const positions = labels.map(label => source.indexOf(label));
  assert.ok(positions.every(position => position >= 0), 'all five dock labels must remain present');
  assert.deepEqual([...positions].sort((a, b) => a - b), positions, 'dock order must remain Edit, Gallery, Add, Changes, Search');
});

test('each everyday action has one owner and content types stay separate', async () => {
  const source = await read('src/admin/layout/AdminLayout.tsx');
  assert.doesNotMatch(source, /to="\/admin\/media\?upload=1"/, 'Add must not duplicate the Gallery uploader');
  assert.doesNotMatch(source, /<MobileExplorerLink to="\/admin\/media"/, 'Edit must not duplicate the Gallery destination');

  for (const [label, route] of [
    ['Add page', '/admin/pages?new=1'],
    ['Add product', '/admin/products?new=1'],
    ['Add service', '/admin/services?new=1'],
    ['Add project', '/admin/projects?new=1'],
    ['Add catalogue', '/admin/catalogues?new=1'],
  ]) {
    assert.match(source, new RegExp(`to="${route.replace(/[?]/g, '\\?')}"[\\s\\S]{0,160}<b>${label}</b>`));
  }

  for (const label of ['Edit pages', 'Edit products', 'Edit services', 'Edit projects', 'Edit catalogues', 'Edit company details']) {
    assert.match(source, new RegExp(`label="${label}"`));
  }
});

test('Gallery is the shared picker for images and PDF catalogues', async () => {
  const [configs, hub, media] = await Promise.all([
    read('src/admin/content/recordConfigs.ts'),
    read('src/admin/pages/ContentHubPage.tsx'),
    read('src/admin/pages/MediaPage.tsx'),
  ]);
  assert.match(hub, /<h2>Gallery<\/h2>/);
  assert.match(configs, /label: 'Product photo', gallery: 'image'/);
  assert.match(configs, /label: 'Project photo', gallery: 'image'/);
  assert.match(configs, /label: 'Catalogue PDF', gallery: 'document'/);
  assert.match(media, />Photos<\/button>/);
  assert.match(media, />Videos<\/button>/);
  assert.match(media, />PDFs & catalogues<\/button>/);
});
