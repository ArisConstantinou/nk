import assert from 'node:assert/strict';
import test from 'node:test';
import {createServer} from 'vite';

let vite;
let createInteractiveRecoveryRecords;
let pagesAdminRequest;
let electricalInstallationTemplate;
let buildCatalogueProductSeed;
let mergeCatalogueProducts;

test.before(async () => {
  vite = await createServer({
    appType: 'custom',
    logLevel: 'silent',
    server: {middlewareMode: true},
  });
  ({createInteractiveRecoveryRecords, pagesAdminRequest} = await vite.ssrLoadModule('/src/admin/pagesMode.ts'));
  ({buildCatalogueProductSeed} = await vite.ssrLoadModule('/src/admin/seed.ts'));
  ({mergeCatalogueProducts} = await vite.ssrLoadModule('/src/context/ContentContext.tsx'));
  ({electricalInstallationTemplate} = await vite.ssrLoadModule('/src/interactive/templates/electricalInstallation.ts'));
});

test.after(async () => {
  await vite?.close();
});

test('admin catalogue seed contains every canonical website product exactly once', () => {
  const records = buildCatalogueProductSeed();
  assert.equal(records.length, 652);
  assert.equal(new Set(records.map(record => record.slug)).size, 652);
  assert.ok(records.every(record => record.kind === 'product' && record.title && record.data.category && record.data.season && record.data.space && record.data.image && record.data.note));
});

test('managed product catalogue is authoritative and honors admin image changes', () => {
  const fallback = mergeCatalogueProducts();
  assert.equal(fallback.length, 652);
  const source = fallback.find(product => product.id === 'oia');
  assert.ok(source);
  const managed = mergeCatalogueProducts([{...source, image: '/assets/admin/oia-replacement.webp'}], true);
  assert.equal(managed.length, 1);
  assert.equal(managed[0].image, '/assets/admin/oia-replacement.webp');
  const canonicalOrder = mergeCatalogueProducts([fallback[1], fallback[0]], true);
  assert.deepEqual(canonicalOrder.map(product => product.id), [fallback[0].id, fallback[1].id]);
  assert.equal(mergeCatalogueProducts([], true).length, 0);
});

test('mobile recovery removes oversized embedded media but preserves vector editing data', () => {
  const largeAssetId = 'large-mobile-image';
  const smallAssetId = 'small-mobile-image';
  const draft = structuredClone(electricalInstallationTemplate);
  draft.assetGroups[0].assets.push(
    {id: largeAssetId, name: 'Large image', kind: 'image', source: `data:image/jpeg;base64,${'a'.repeat(200_000)}`, alt: ''},
    {id: smallAssetId, name: 'Small image', kind: 'image', source: 'data:image/png;base64,c21hbGw=', alt: ''},
  );
  draft.sections[0].layers.push(
    {id: 'large-layer', name: 'Large image layer', type: 'asset', assetId: largeAssetId, visible: true, locked: false, opacity: 1, transform: {x: 0, y: 0, width: 100, height: 100, rotation: 0, skewX: 0, skewY: 0}},
    {id: 'small-layer', name: 'Small image layer', type: 'asset', assetId: smallAssetId, visible: true, locked: false, opacity: 1, transform: {x: 0, y: 0, width: 100, height: 100, rotation: 0, skewX: 0, skewY: 0}},
  );
  const record = {
    id: 'interactive-record',
    slug: draft.slug,
    title: draft.title,
    status: 'draft',
    draft,
    published: null,
    version: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    publishedAt: null,
  };

  const [recovery] = createInteractiveRecoveryRecords([record]);
  const recoveredAssets = recovery.draft.assetGroups.flatMap(group => group.assets);
  const recoveredLayers = recovery.draft.sections.flatMap(section => section.layers);

  assert.equal(recoveredAssets.some(asset => asset.id === largeAssetId), false);
  assert.equal(recoveredLayers.some(layer => layer.id === 'large-layer'), false);
  assert.equal(recoveredAssets.some(asset => asset.id === smallAssetId), true);
  assert.equal(recoveredLayers.some(layer => layer.id === 'small-layer'), true);
  assert.equal(recoveredLayers.some(layer => layer.name === 'Fixed wall background'), true);
  assert.equal(record.draft.assetGroups[0].assets.some(asset => asset.id === largeAssetId), true);
});

test('device catalogue sync is additive, idempotent, and preserves product deletions', async () => {
  let stored = '';
  Object.defineProperties(globalThis, {
    window: {configurable: true, value: {location: {origin: 'https://example.test'}, dispatchEvent() {}}},
    localStorage: {configurable: true, value: {
      getItem: () => stored || null,
      setItem: (_key, value) => { stored = value; },
    }},
    sessionStorage: {configurable: true, value: {getItem: () => null, setItem() {}, removeItem() {}}},
  });
  const product = (slug, title) => ({kind: 'product', slug, title, data: {category: 'Lighting', season: 'All year', space: 'Living', image: `/assets/${slug}.png`, note: `${title} note`}});
  try {
    const first = await pagesAdminRequest('/content/catalogue-sync', {method: 'POST', body: JSON.stringify({records: [product('device-a', 'Device A'), product('device-b', 'Device B')]})});
    assert.equal(first.status, 200);
    assert.equal(first.payload.inserted, 2);
    const listed = await pagesAdminRequest('/content?kind=product');
    assert.equal(listed.payload.records.length, 2);
    const deviceA = listed.payload.records.find(record => record.slug === 'device-a');
    const repeated = await pagesAdminRequest('/content/catalogue-sync', {method: 'POST', body: JSON.stringify({records: [product('device-a', 'Must not overwrite'), product('device-b', 'Must not overwrite')]})});
    assert.equal(repeated.payload.inserted, 0);
    const preserved = await pagesAdminRequest('/content?kind=product');
    assert.equal(preserved.payload.records.find(record => record.slug === 'device-a').title, deviceA.title);
    const removed = await pagesAdminRequest(`/content/${deviceA.id}`, {method: 'DELETE'});
    assert.equal(removed.status, 200);
    const afterDelete = await pagesAdminRequest('/content/catalogue-sync', {method: 'POST', body: JSON.stringify({records: [product('device-a', 'Device A'), product('device-b', 'Device B')]})});
    assert.equal(afterDelete.payload.inserted, 0);
    assert.equal(afterDelete.payload.skippedDeleted, 1);
    const state = JSON.parse(stored);
    assert.equal(state.catalogueManaged, true);
    assert.deepEqual(state.productTombstones, ['device-a']);
  } finally {
    delete globalThis.window;
    delete globalThis.localStorage;
    delete globalThis.sessionStorage;
  }
});

test('interactive studio opens in temporary safe mode when localStorage quota is exhausted', async () => {
  const storedState = {
    schema: 1,
    records: [], navigation: [], forms: [], submissions: [], enquiries: [], media: [], audit: [], revisions: {}, favorites: [], interactive: [],
    users: [],
  };
  const sessionValues = new Map();
  Object.defineProperties(globalThis, {
    window: {configurable: true, value: {location: {origin: 'https://example.test'}, dispatchEvent() {}}},
    localStorage: {configurable: true, value: {
      getItem: () => JSON.stringify(storedState),
      setItem: () => {throw new DOMException('Storage full', 'QuotaExceededError');},
    }},
    sessionStorage: {configurable: true, value: {
      getItem: key => sessionValues.get(key) || null,
      setItem: (key, value) => sessionValues.set(key, value),
      removeItem: key => sessionValues.delete(key),
    }},
  });

  try {
    const created = await pagesAdminRequest('/interactive', {
      method: 'POST',
      body: JSON.stringify({
        slug: electricalInstallationTemplate.slug,
        title: electricalInstallationTemplate.title,
        document: electricalInstallationTemplate,
      }),
    });
    assert.equal(created.status, 201);
    assert.equal(created.payload.storageMode, 'temporary');

    const loaded = await pagesAdminRequest(`/interactive/${electricalInstallationTemplate.slug}`);
    assert.equal(loaded.status, 200);
    assert.equal(loaded.payload.storageMode, 'temporary');
    assert.equal(loaded.payload.record.slug, electricalInstallationTemplate.slug);
    assert.ok([...sessionValues.values()].some(value => value.includes(electricalInstallationTemplate.slug)));
  } finally {
    delete globalThis.window;
    delete globalThis.localStorage;
    delete globalThis.sessionStorage;
  }
});
