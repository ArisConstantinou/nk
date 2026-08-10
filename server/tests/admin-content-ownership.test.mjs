import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

test('mobile dock keeps its five navigation actions in the approved order', async () => {
  const source = await read('src/admin/layout/AdminLayout.tsx');
  const labels = ["text('Edit'", "text('Gallery'", "text('Create'", "text('Changes'", "text('Search'"];
  const positions = labels.map(label => source.indexOf(label));
  assert.ok(positions.every(position => position >= 0), 'all five dock labels must remain present');
  assert.deepEqual([...positions].sort((a, b) => a - b), positions, 'dock order must remain Edit, Gallery, Create, Changes, Search');
});

test('mobile admin keeps all three navigation bars pinned to the viewport', async () => {
  const [styles, productivity] = await Promise.all([
    read('src/admin/admin.css'),
    read('src/admin/productivity.css'),
  ]);
  assert.match(styles, /\.nk-admin-workspace\s*>\s*\.nk-admin-topbar\s*\{[\s\S]{0,180}position:\s*fixed;[\s\S]{0,180}top:\s*0;/);
  assert.match(styles, /\.nk-admin-mobile-nav\s*\{[\s\S]{0,180}position:\s*fixed;[\s\S]{0,180}bottom:\s*0;/);
  assert.match(styles, /\.nk-admin-workspace\s*\{\s*padding-top:\s*calc\(70px \+ env\(safe-area-inset-top\)\);/);
  assert.match(productivity, /\.nk-admin-mobile-subnav-slot\s*\{[\s\S]{0,180}position:\s*sticky;[\s\S]{0,180}top:\s*calc\(70px \+ env\(safe-area-inset-top\)\);/);
});

test('mobile admin search does not inherit the desktop white hover state', async () => {
  const styles = await read('src/admin/admin.css');
  assert.match(styles, /\.nk-admin-global-search:hover\s*\{\s*border-color:\s*transparent;\s*background:\s*transparent;/);
});

test('dashboard loading is bounded and failed requests offer a retry', async () => {
  const source = await read('src/admin/pages/DashboardPage.tsx');
  assert.match(source, /const DASHBOARD_LOAD_TIMEOUT_MS = 8_000;/);
  assert.match(source, /adminApi<Dashboard>\("\/dashboard", \{ signal: controller\.signal \}\)/);
  assert.match(source, /loading \? \([\s\S]{0,500}\) : !data \? \(/);
  assert.match(source, /Website status could not be loaded/);
  assert.match(source, /onClick=\{\(\) => void load\(\)\}/);
});

test('mobile dashboard opens directly on the content cards', async () => {
  const source = await read('src/admin/pages/DashboardPage.tsx');
  assert.doesNotMatch(source, /Choose what you want to manage/);
  assert.doesNotMatch(source, /Each button opens one content area/);
  assert.match(source, /className="nk-admin-mobile-home__actions"/);
});

test('mobile search replaces the category rail without a page overlay', async () => {
  const [layout, dashboard, styles] = await Promise.all([
    read('src/admin/layout/AdminLayout.tsx'),
    read('src/admin/pages/DashboardPage.tsx'),
    read('src/admin/productivity.css'),
  ]);
  for (const label of ['Content', 'Customers', 'Tools', 'Activity']) {
    assert.match(layout, new RegExp(`<span>${label}</span>`));
  }
  assert.match(layout, /nk-admin-mobile-subnav-slot[^\n]*is-search-open/);
  assert.match(layout, /commandOpen && commandDocked \? <CommandPalette open/);
  assert.match(layout, /<CommandPalette open=\{commandOpen && !commandDocked\}/);
  assert.match(styles, /\.nk-admin-mobile-subnav-slot > \.nk-admin-command-backdrop--docked\s*\{[\s\S]{0,240}position:\s*relative;[\s\S]{0,240}background:\s*transparent;/);
  assert.doesNotMatch(dashboard, /Your live website stays safe/);
});

test('each everyday action has one owner and content types stay separate', async () => {
  const source = await read('src/admin/layout/AdminLayout.tsx');
  assert.doesNotMatch(source, /to="\/admin\/media\?upload=1"/, 'Create must not duplicate the Gallery uploader');
  assert.doesNotMatch(source, /<MobileExplorerLink to="\/admin\/media"/, 'Edit must not duplicate the Gallery destination');

  for (const [label, route] of [
    ['Create page', '/admin/pages?new=1'],
    ['Create product', '/admin/products?new=1'],
    ['Create service', '/admin/services?new=1'],
    ['Create project', '/admin/projects?new=1'],
    ['Create catalogue', '/admin/catalogues?new=1'],
  ]) {
    assert.match(source, new RegExp(`to="${route.replace(/[?]/g, '\\?')}"[\\s\\S]{0,160}<b>${label}</b>`));
  }

  for (const label of ['Edit pages', 'Edit products', 'Edit services', 'Edit projects', 'Edit catalogues', 'Edit company details']) {
    assert.match(source, new RegExp(`label="${label}"`));
  }
});

test('Gallery is the shared picker for images and PDF catalogues', async () => {
  const [configs, hub, media, styles, layout] = await Promise.all([
    read('src/admin/content/recordConfigs.ts'),
    read('src/admin/pages/ContentHubPage.tsx'),
    read('src/admin/pages/MediaPage.tsx'),
    read('src/admin/admin.css'),
    read('src/admin/layout/AdminLayout.tsx'),
  ]);
  assert.match(hub, /<h2>Gallery<\/h2>/);
  assert.match(configs, /label: 'Product photo', gallery: 'image'/);
  assert.match(configs, /label: 'Project photo', gallery: 'image'/);
  assert.match(configs, /label: 'Catalogue PDF', gallery: 'document'/);
  assert.match(media, />Photos<\/button>/);
  assert.match(media, />Videos<\/button>/);
  assert.match(media, />PDFs(?: & catalogues)?<\/button>/);
  assert.match(media, /website-media-index\.json/);
  assert.match(media, /Organise Photos by tag/);
  assert.match(media, /Browse & filters/);
  assert.match(media, /gallery-browse-panel/);
  assert.match(media, /nk-admin-gallery-top-action--upload/);
  assert.match(media, /nk-admin-gallery-top-action--filters/);
  assert.doesNotMatch(media, /nk-admin-gallery-top-action--help/);
  assert.doesNotMatch(layout, /<AdminLearningPanel/);
  assert.match(styles, /\.nk-admin-media-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});
