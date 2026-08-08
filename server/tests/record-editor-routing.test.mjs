import assert from 'node:assert/strict';
import test from 'node:test';
import {createServer} from 'vite';

let vite;
let withoutRecordEditorSearchParams;

test.before(async () => {
  vite = await createServer({
    appType: 'custom',
    logLevel: 'silent',
    server: {middlewareMode: true},
  });
  ({withoutRecordEditorSearchParams} = await vite.ssrLoadModule('/src/admin/content/recordEditorRouting.ts'));
});

test.after(async () => {
  await vite?.close();
});

test('closing a direct-linked record editor removes the parameters that reopen it', () => {
  const next = withoutRecordEditorSearchParams(new URLSearchParams('record=ceiling-fan-8&new=1&status=published&query=fan'));

  assert.equal(next.has('record'), false);
  assert.equal(next.has('new'), false);
  assert.equal(next.get('status'), 'published');
  assert.equal(next.get('query'), 'fan');
});
