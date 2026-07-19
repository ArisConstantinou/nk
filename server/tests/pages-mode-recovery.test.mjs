import assert from 'node:assert/strict';
import test from 'node:test';
import {createServer} from 'vite';

let vite;
let createInteractiveRecoveryRecords;
let pagesAdminRequest;
let electricalInstallationTemplate;

test.before(async () => {
  vite = await createServer({
    appType: 'custom',
    logLevel: 'silent',
    server: {middlewareMode: true},
  });
  ({createInteractiveRecoveryRecords, pagesAdminRequest} = await vite.ssrLoadModule('/src/admin/pagesMode.ts'));
  ({electricalInstallationTemplate} = await vite.ssrLoadModule('/src/interactive/templates/electricalInstallation.ts'));
});

test.after(async () => {
  await vite?.close();
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
