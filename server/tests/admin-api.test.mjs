import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createServer as createHttpServer} from 'node:http';
import {createServer as createNetServer} from 'node:net';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';

const root = resolve('.');
const temp = mkdtempSync(join(tmpdir(), 'nk-admin-api-'));
const origin = 'http://127.0.0.1:5191';
let base = '';

async function freePort() {
  const probe = createNetServer();
  probe.listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const address = probe.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  probe.close();
  await once(probe, 'close');
  return port;
}

async function waitForApi() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try { const response = await fetch(`${base}/health`); if (response.ok) return; } catch {}
    await new Promise(resolvePromise => setTimeout(resolvePromise, 60));
  }
  throw new Error('Admin API did not start.');
}

async function request(path, {method = 'GET', body, cookie, csrf} = {}) {
  const headers = {Origin: origin};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (cookie) headers.Cookie = cookie;
  if (csrf) headers['X-CSRF-Token'] = csrf;
  const response = await fetch(`${base}${path}`, {method, headers, body: body === undefined ? undefined : JSON.stringify(body)});
  const payload = await response.json();
  return {response, payload};
}

function pageData(overrides = {}) {
  return {
    route: '/test-page',
    navigationTitle: 'Test page',
    eyebrow: 'NK Electrical',
    heroTitle: 'Test page',
    heroAccent: '',
    heroTail: '',
    heroBody: 'A complete page used by the admin integration tests.',
    sectionTitle: '',
    sectionBody: '',
    heroImage: '',
    sections: [],
    componentLibrary: [],
    editorHistory: [],
    ...overrides,
  };
}

test('secure admin lifecycle', async t => {
  const port = await freePort();
  const firebasePort = await freePort();
  const firebaseServer = createHttpServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
    const users = body.idToken === 'firebase-owner-token'
      ? [{localId: 'firebase-owner', email: 'owner@example.com', emailVerified: true}]
      : body.idToken === 'firebase-outsider-token'
        ? [{localId: 'firebase-outsider', email: 'outsider@example.com', emailVerified: true}]
        : [];
    res.writeHead(users.length ? 200 : 400, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(users.length ? {users} : {error: {message: 'INVALID_ID_TOKEN'}}));
  });
  firebaseServer.listen(firebasePort, '127.0.0.1');
  await once(firebaseServer, 'listening');
  t.after(async () => {
    firebaseServer.close();
    await once(firebaseServer, 'close');
  });
  base = `http://127.0.0.1:${port}/api/admin`;
  const child = spawn(process.execPath, ['server/admin-server.mjs'], {
    cwd: root,
    env: {...process.env, OPENAI_API_KEY: '', ADMIN_API_PORT: String(port), ADMIN_DB_PATH: join(temp, 'admin.sqlite'), ADMIN_MEDIA_PATH: join(temp, 'media'), ADMIN_ALLOWED_ORIGINS: origin, ADMIN_ALLOW_LOOPBACK_SETUP: 'true', FIREBASE_API_KEY: 'test-api-key', FIREBASE_ADMIN_EMAILS: 'owner@example.com', FIREBASE_IDENTITY_TOOLKIT_URL: `http://127.0.0.1:${firebasePort}/v1/accounts:lookup`, NODE_ENV: 'development'},
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(async () => {
    child.kill();
    if (child.exitCode === null) await once(child, 'exit');
    rmSync(temp, {recursive: true, force: true, maxRetries: 5, retryDelay: 50});
  });
  await waitForApi();
  const health = await request('/health');
  assert.equal(health.response.status, 200);
  assert.ok(health.payload.schemaVersion >= 5);
  assert.equal(health.payload.database, 'ok');

  const initial = await request('/setup');
  assert.equal(initial.response.status, 200);
  assert.equal(initial.payload.needsSetup, true);

  const setup = await request('/setup', {method: 'POST', body: {displayName: 'Test Owner', email: 'owner@example.com', password: 'SecureAdmin1234'}});
  assert.equal(setup.response.status, 201);
  assert.equal(setup.payload.user.role, 'owner');
  let cookie = setup.response.headers.get('set-cookie').split(';')[0];
  let csrf = setup.payload.csrfToken;

  const missingFirebaseToken = await request('/firebase-login', {method: 'POST', body: {}});
  assert.equal(missingFirebaseToken.response.status, 401);
  assert.equal(missingFirebaseToken.payload.error.code, 'firebase_invalid_token');
  const deniedFirebaseAccount = await request('/firebase-login', {method: 'POST', body: {idToken: 'firebase-outsider-token'}});
  assert.equal(deniedFirebaseAccount.response.status, 403);
  assert.equal(deniedFirebaseAccount.payload.error.code, 'firebase_account_denied');
  const firebaseLogin = await request('/firebase-login', {method: 'POST', body: {idToken: 'firebase-owner-token'}});
  assert.equal(firebaseLogin.response.status, 200);
  assert.equal(firebaseLogin.payload.user.email, 'owner@example.com');
  const firebaseCookie = firebaseLogin.response.headers.get('set-cookie').split(';')[0];
  const firebaseSession = await request('/session', {cookie: firebaseCookie});
  assert.equal(firebaseSession.response.status, 200);
  assert.equal(firebaseSession.payload.user.role, 'owner');

  const session = await request('/session', {cookie});
  assert.equal(session.response.status, 200);
  csrf = session.payload.csrfToken;
  const repeatedSession = await request('/session', {cookie});
  assert.equal(repeatedSession.payload.csrfToken, csrf, 'reading a session must not rotate its CSRF token');

  const guideWithoutKey = await request('/guide/next', {method: 'POST', cookie, csrf, body: {language: 'en', context: {page: {id: 'home', slug: 'homepage', title: 'Homepage', route: '/', sections: []}, availableMedia: []}}});
  assert.equal(guideWithoutKey.response.status, 503);
  assert.equal(guideWithoutKey.payload.error.code, 'ai_not_configured');

  const seedStatusBefore = await request('/content/seed', {cookie});
  assert.equal(seedStatusBefore.response.status, 200);
  assert.equal(seedStatusBefore.payload.needsSeed, true);

  const seed = await request('/content/seed', {method: 'POST', cookie, csrf, body: {
    records: [{kind: 'page', slug: 'homepage', title: 'Homepage', data: {route: '/', navigationTitle: 'Home', eyebrow: 'NK Electrical', heroTitle: 'Power planned.', heroAccent: 'Systems connected.', heroTail: 'Buildings switched on.', heroBody: 'Electrical services and products from one accountable team.', sectionTitle: 'Specialist services.', sectionBody: 'Plan, install, test and support.', heroImage: '/assets/generated/cyprus-lighting-hero.webp', sections: []}}],
    navigation: [{menu: 'primary', label: 'Services', url: '/services', description: 'Our services', active: true, position: 0}],
    forms: [{slug: 'contact', name: 'Contact form', recipient: 'info@example.com', submitLabel: 'Send enquiry', successMessage: 'Submission received.', active: true, position: 0, fields: [{id: 'name', name: 'name', label: 'Name', type: 'text', required: true, active: true, placeholder: '', options: []}, {id: 'email', name: 'email', label: 'Email', type: 'email', required: true, active: true, placeholder: '', options: []}]}],
  }});
  assert.equal(seed.response.status, 201);
  assert.equal(seed.payload.inserted, 1);
  assert.equal(seed.payload.navigationInserted, 1);
  assert.equal(seed.payload.formsInserted, 1);
  const seedStatusAfter = await request('/content/seed', {cookie});
  assert.equal(seedStatusAfter.payload.needsSeed, false);

  const list = await request('/content?kind=page', {cookie});
  assert.equal(list.response.status, 200);
  assert.equal(list.payload.records.length, 1);
  const record = list.payload.records[0];
  const batchedContent = await request('/content?kinds=page,settings', {cookie});
  assert.equal(batchedContent.response.status, 200);
  assert.ok(batchedContent.payload.records.some(item => item.id === record.id));

  const denied = await request(`/content/${record.id}`, {method: 'PUT', cookie, csrf: 'wrong-token', body: {kind: 'page', slug: 'homepage', title: 'Homepage', expectedVersion: record.version, data: record.draft}});
  assert.equal(denied.response.status, 403);
  assert.equal(denied.payload.error.code, 'csrf_failed');

  const update = await request(`/content/${record.id}`, {method: 'PUT', cookie, csrf, body: {kind: 'page', slug: 'homepage', title: 'Updated homepage', expectedVersion: record.version, data: {
    ...record.draft,
    heroTitle: 'Updated safely.',
    visualOverrides: {a1b2c3d4: {text: 'Edited automatically.', href: '/contact', icon: 'zap', hidden: false, label: 'Automatic test element', x: 37, y: -18}},
    visualPlacements: {a1b2c3d4: {target: 'deadbeef', position: 'after'}},
    editorHistory: [{id: 'visual-history-test', objectKey: 'auto:a1b2c3d4', objectLabel: 'Automatic test element', action: 'move-auto', path: 'visualPlacements.a1b2c3d4', before: null, after: {target: 'deadbeef', position: 'after'}, meta: {}, timestamp: new Date().toISOString(), active: true}, {id: 'visual-position-history-test', objectKey: 'auto:a1b2c3d4', objectLabel: 'Automatic test element', action: 'position', path: 'visualOverrides.a1b2c3d4', before: null, after: {x: 37, y: -18}, meta: {}, timestamp: new Date().toISOString(), active: true}],
  }}});
  assert.equal(update.response.status, 200);
  assert.equal(update.payload.record.status, 'draft');
  assert.equal(update.payload.record.version, record.version + 1);
  assert.equal(update.payload.record.draft.visualOverrides.a1b2c3d4.text, 'Edited automatically.');
  assert.deepEqual({x: update.payload.record.draft.visualOverrides.a1b2c3d4.x, y: update.payload.record.draft.visualOverrides.a1b2c3d4.y}, {x: 37, y: -18});
  assert.equal(update.payload.record.draft.visualPlacements.a1b2c3d4.target, 'deadbeef');
  const staleUpdate = await request(`/content/${record.id}`, {method: 'PUT', cookie, csrf, body: {kind: 'page', slug: 'homepage', title: 'Stale edit', expectedVersion: record.version, data: {...record.draft, heroTitle: 'Must not overwrite.'}}});
  assert.equal(staleUpdate.response.status, 409);
  assert.equal(staleUpdate.payload.error.code, 'version_conflict');

  const invalidRoute = await request(`/content/${record.id}`, {method: 'PUT', cookie, csrf, body: {kind: 'page', slug: 'homepage', title: 'Updated homepage', expectedVersion: update.payload.record.version, data: {...update.payload.record.draft, route: '//evil.example'}}});
  assert.equal(invalidRoute.response.status, 400);
  const privateApiImage = await request(`/content/${record.id}`, {method: 'PUT', cookie, csrf, body: {kind: 'page', slug: 'homepage', title: 'Updated homepage', expectedVersion: update.payload.record.version, data: {...update.payload.record.draft, heroImage: '/api/admin/session'}}});
  assert.equal(privateApiImage.response.status, 400);
  const unsafeVisualLink = await request(`/content/${record.id}`, {method: 'PUT', cookie, csrf, body: {kind: 'page', slug: 'homepage', title: 'Updated homepage', expectedVersion: update.payload.record.version, data: {...update.payload.record.draft, visualOverrides: {...update.payload.record.draft.visualOverrides, a1b2c3d4: {...update.payload.record.draft.visualOverrides.a1b2c3d4, href: 'javascript:alert(1)'}}}}});
  assert.equal(unsafeVisualLink.response.status, 400);

  const publish = await request(`/content/${record.id}/publish`, {method: 'POST', cookie, csrf, body: {expectedVersion: update.payload.record.version}});
  assert.equal(publish.response.status, 200);
  assert.equal(publish.payload.record.status, 'published');
  assert.equal(publish.payload.record.published.heroTitle, 'Updated safely.');

  const publicSite = await request('/public/site');
  assert.equal(publicSite.response.status, 200);
  assert.equal(publicSite.payload.records[0].data.heroTitle, 'Updated safely.');
  assert.equal(publicSite.payload.records[0].data.visualOverrides.a1b2c3d4.text, 'Edited automatically.');
  assert.deepEqual({x: publicSite.payload.records[0].data.visualOverrides.a1b2c3d4.x, y: publicSite.payload.records[0].data.visualOverrides.a1b2c3d4.y}, {x: 37, y: -18});
  assert.equal(publicSite.payload.records[0].data.visualPlacements.a1b2c3d4.position, 'after');
  assert.equal(publicSite.payload.records[0].data.editorHistory, undefined);
  assert.equal(publicSite.payload.navigation[0].label, 'Services');
  assert.equal(publicSite.payload.forms[0].slug, 'contact');
  assert.equal(publicSite.payload.forms[0].recipient, undefined);

  const invalidPublishDraft = await request('/content', {method: 'POST', cookie, csrf, body: {
    kind: 'page', slug: 'publish-readiness-test', title: 'Publish readiness test', data: pageData({
      route: '/publish-readiness-test',
      sections: [{id: 'invalid-section', type: 'text', enabled: true, title: 'Incomplete CTA', body: '', components: [{id: 'invalid-button', type: 'button', enabled: true, label: 'Button', text: '', url: '', scope: 'local'}]}],
    }),
  }});
  assert.equal(invalidPublishDraft.response.status, 201);
  const invalidPublish = await request(`/content/${invalidPublishDraft.payload.record.id}/publish`, {method: 'POST', cookie, csrf, body: {expectedVersion: invalidPublishDraft.payload.record.version}});
  assert.equal(invalidPublish.response.status, 400);
  assert.equal(invalidPublish.payload.error.code, 'publish_validation_failed');

  const globalSettings = await request('/content', {method: 'POST', cookie, csrf, body: {
    kind: 'settings', slug: 'global-settings-test', title: 'Global settings test', data: {
      address: '72 Test Avenue, Nicosia', phone: '+357 22000000', email: 'info@example.com', hours: 'Monday to Friday, 08:00-17:00',
      mapsUrl: 'https://maps.google.com/', enquiryRecipient: 'info@example.com',
      globalComponents: [{
        id: 'global-cta-test', name: 'Global CTA test', scope: 'global', updatedAt: new Date().toISOString(),
        component: {id: 'global-template', type: 'button', enabled: true, label: 'Global CTA', text: 'Published global label', url: '/contact', image: '', alt: '', icon: 'check', scope: 'global', reusableId: 'global-cta-test', groupId: '', style: {width: 100, align: 'stretch', tone: 'accent', padding: 0, radius: 0}},
      }],
    },
  }});
  assert.equal(globalSettings.response.status, 201);
  const publishedSettings = await request(`/content/${globalSettings.payload.record.id}/publish`, {method: 'POST', cookie, csrf, body: {expectedVersion: globalSettings.payload.record.version}});
  assert.equal(publishedSettings.response.status, 200);

  const globalPage = await request('/content', {method: 'POST', cookie, csrf, body: {
    kind: 'page', slug: 'global-component-test', title: 'Global component test', data: pageData({
      route: '/global-component-test',
      sections: [{id: 'global-section', type: 'text', enabled: true, title: 'Global section', body: '', components: [{id: 'global-instance', type: 'button', enabled: true, label: 'Global CTA', text: 'Stale local label', url: '/contact', scope: 'global', reusableId: 'global-cta-test'}]}],
      componentLibrary: [{id: 'local-heading-test', name: 'Local heading test', scope: 'local', updatedAt: new Date().toISOString(), component: {id: 'local-heading-template', type: 'heading', enabled: true, label: 'Heading', text: 'Private editor template', scope: 'local'}}],
      editorHistory: [{id: 'history-test', objectKey: 'component:global-instance', objectLabel: 'Global CTA', action: 'content', path: 'text', before: 'Old', after: 'Stale local label', meta: {}, timestamp: new Date().toISOString(), active: true}],
    }),
  }});
  assert.equal(globalPage.response.status, 201);
  const publishedGlobalPage = await request(`/content/${globalPage.payload.record.id}/publish`, {method: 'POST', cookie, csrf, body: {expectedVersion: globalPage.payload.record.version}});
  assert.equal(publishedGlobalPage.response.status, 200);
  const resolvedPublicSite = await request('/public/site');
  const publicGlobalPage = resolvedPublicSite.payload.records.find(item => item.id === globalPage.payload.record.id);
  const publicGlobalSettings = resolvedPublicSite.payload.records.find(item => item.id === globalSettings.payload.record.id);
  assert.equal(publicGlobalPage.data.sections[0].components[0].text, 'Published global label');
  assert.equal(publicGlobalPage.data.editorHistory, undefined);
  assert.equal(publicGlobalPage.data.componentLibrary, undefined);
  assert.equal(publicGlobalSettings.data.globalComponents, undefined);

  const duplicate = await request(`/content/${record.id}/duplicate`, {method: 'POST', cookie, csrf});
  assert.equal(duplicate.response.status, 201);
  assert.equal(duplicate.payload.record.status, 'draft');
  const staleUnpublish = await request(`/content/${record.id}/unpublish`, {method: 'POST', cookie, csrf, body: {expectedVersion: update.payload.record.version}});
  assert.equal(staleUnpublish.response.status, 409);
  assert.equal(staleUnpublish.payload.error.code, 'version_conflict');
  const unpublish = await request(`/content/${record.id}/unpublish`, {method: 'POST', cookie, csrf, body: {expectedVersion: publish.payload.record.version}});
  assert.equal(unpublish.response.status, 200);
  assert.equal(unpublish.payload.record.published, null);
  const republish = await request(`/content/${record.id}/publish`, {method: 'POST', cookie, csrf, body: {expectedVersion: unpublish.payload.record.version}});
  assert.equal(republish.response.status, 200);
  const reorder = await request('/content/reorder', {method: 'PATCH', cookie, csrf, body: {kind: 'page', ids: [duplicate.payload.record.id, record.id]}});
  assert.equal(reorder.response.status, 200);

  const pinContent = await request(`/favorites/content/${record.id}`, {method: 'PUT', cookie, csrf, body: {active: true}});
  assert.equal(pinContent.response.status, 200);
  assert.equal(pinContent.payload.active, true);
  assert.ok(pinContent.payload.favorites.some(item => item.id === record.id));
  const globalSearch = await request('/search?q=updated%20homepage', {cookie});
  assert.equal(globalSearch.response.status, 200);
  assert.ok(globalSearch.payload.results.some(item => item.id === record.id && item.type === 'content'));
  const bulkCategory = await request('/content/bulk', {method: 'POST', cookie, csrf, body: {action: 'set-category', items: [{id: duplicate.payload.record.id, version: duplicate.payload.record.version}], category: 'Priority'}});
  assert.equal(bulkCategory.response.status, 200);
  assert.equal(bulkCategory.payload.records[0].category, 'Priority');
  const bulkTags = await request('/content/bulk', {method: 'POST', cookie, csrf, body: {action: 'add-tags', items: [{id: duplicate.payload.record.id, version: bulkCategory.payload.records[0].version}], tags: ['urgent', 'homepage']}});
  assert.equal(bulkTags.response.status, 200);
  assert.deepEqual(bulkTags.payload.records[0].tags, ['urgent', 'homepage']);
  const bulkConflict = await request('/content/bulk', {method: 'POST', cookie, csrf, body: {action: 'archive', items: [{id: duplicate.payload.record.id, version: duplicate.payload.record.version}]}});
  assert.equal(bulkConflict.response.status, 409);
  const productivityDashboard = await request('/dashboard', {cookie});
  assert.equal(productivityDashboard.response.status, 200);
  assert.ok(productivityDashboard.payload.workQueue.length >= 2);
  assert.ok(productivityDashboard.payload.favorites.some(item => item.id === record.id));
  assert.ok(productivityDashboard.payload.system.some(item => item.id === 'database' && item.status === 'healthy'));
  assert.ok(Array.isArray(productivityDashboard.payload.notifications));

  const navigation = await request('/navigation', {cookie});
  assert.equal(navigation.response.status, 200);
  const navigationCopy = await request(`/navigation/${navigation.payload.items[0].id}/duplicate`, {method: 'POST', cookie, csrf});
  assert.equal(navigationCopy.response.status, 201);
  assert.equal(navigationCopy.payload.item.active, false);
  const invalidNavigation = await request('/navigation', {method: 'POST', cookie, csrf, body: {menu: 'primary', label: 'Unsafe', url: '//evil.example', description: '', active: true}});
  assert.equal(invalidNavigation.response.status, 400);
  const privateNavigation = await request('/navigation', {method: 'POST', cookie, csrf, body: {menu: 'primary', label: 'Private API', url: '/api/admin/session', description: '', active: true}});
  assert.equal(privateNavigation.response.status, 400);

  const invalidForm = await request('/forms', {method: 'POST', cookie, csrf, body: {slug: 'unsafe-form', name: 'Unsafe form', recipient: 'info@example.com', submitLabel: 'Send', successMessage: 'Sent.', active: true, fields: [{id: 'website', name: 'website', label: 'Website', type: 'text', required: false, active: true, placeholder: '', options: []}]}});
  assert.equal(invalidForm.response.status, 400);

  const publicSubmission = await request('/public/submissions', {method: 'POST', body: {formSlug: 'contact', website: '', values: {name: 'Site Visitor', email: 'visitor@example.com'}}});
  assert.equal(publicSubmission.response.status, 201);
  const submissions = await request('/submissions', {cookie});
  assert.equal(submissions.response.status, 200);
  assert.equal(submissions.payload.submissions[0].payload.name, 'Site Visitor');
  const submissionUpdate = await request(`/submissions/${submissions.payload.submissions[0].id}`, {method: 'PATCH', cookie, csrf, body: {status: 'in_progress', notes: 'Called customer.'}});
  assert.equal(submissionUpdate.response.status, 200);
  assert.equal(submissionUpdate.payload.submission.status, 'in_progress');

  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  const invalidUpload = await request('/media', {method: 'POST', cookie, csrf, body: {filename: 'bad.png', mimeType: 'image/png', base64: '%%%not-base64%%%', altText: '', caption: ''}});
  assert.equal(invalidUpload.response.status, 400);
  const upload = await request('/media', {method: 'POST', cookie, csrf, body: {filename: 'test.png', mimeType: 'image/png', base64: pngBase64, altText: 'Test image', caption: 'Test caption'}});
  assert.equal(upload.response.status, 201);
  assert.equal(upload.payload.media.scope, 'shared');
  assert.equal(upload.payload.media.width, 1);
  const usage = await request(`/media/${upload.payload.media.id}/usage`, {cookie});
  assert.equal(usage.response.status, 200);
  assert.equal(usage.payload.count, 0);
  const publicMedia = await fetch(`${base}/media/${upload.payload.media.id}/file`);
  assert.equal(publicMedia.status, 200);
  const rangedMedia = await fetch(`${base}/media/${upload.payload.media.id}/file`, {headers: {Range: 'bytes=0-0'}});
  assert.equal(rangedMedia.status, 206);
  assert.equal(rangedMedia.headers.get('accept-ranges'), 'bytes');
  assert.match(rangedMedia.headers.get('content-range') || '', /^bytes 0-0\/\d+$/);
  assert.equal((await rangedMedia.arrayBuffer()).byteLength, 1);
  const incompatibleReplacement = await request(`/media/${upload.payload.media.id}/replace`, {method: 'POST', cookie, csrf, body: {filename: 'replacement.pdf', mimeType: 'application/pdf', base64: Buffer.from('%PDF-1.4\n%%EOF').toString('base64')}});
  assert.equal(incompatibleReplacement.response.status, 400);
  assert.equal(incompatibleReplacement.payload.error.code, 'incompatible_media_replacement');
  const replacement = await request(`/media/${upload.payload.media.id}/replace`, {method: 'POST', cookie, csrf, body: {filename: 'replacement.png', mimeType: 'image/png', base64: pngBase64}});
  assert.equal(replacement.response.status, 200);
  assert.equal(replacement.payload.media.id, upload.payload.media.id);
  assert.equal(replacement.payload.media.url, upload.payload.media.url);
  assert.equal(replacement.payload.media.replacementCount, 1);
  const mediaUpdate = await request(`/media/${upload.payload.media.id}`, {method: 'PATCH', cookie, csrf, body: {filename: 'test-renamed.png', title: 'Test asset', altText: 'Updated test image', caption: '', folder: 'Tests', category: 'Fixtures', metadata: {credit: 'Test suite', tags: 'fixture'}, active: false}});
  assert.equal(mediaUpdate.response.status, 200);
  assert.equal(mediaUpdate.payload.media.active, false);
  const disabledMedia = await fetch(`${base}/media/${upload.payload.media.id}/file`);
  assert.equal(disabledMedia.status, 404);
  const mediaSearch = await request('/search?q=test%20asset&type=media', {cookie});
  assert.ok(mediaSearch.payload.results.some(item => item.id === upload.payload.media.id && item.category === 'Fixtures'));
  const pinMedia = await request(`/favorites/media/${upload.payload.media.id}`, {method: 'PUT', cookie, csrf, body: {active: true}});
  assert.equal(pinMedia.response.status, 200);
  assert.ok(pinMedia.payload.favorites.some(item => item.id === upload.payload.media.id));

  const createUser = await request('/users', {method: 'POST', cookie, csrf, body: {displayName: 'Shop Manager', email: 'shop@example.com', role: 'shop', password: 'SecureShop1234'}});
  assert.equal(createUser.response.status, 201);
  assert.equal(createUser.payload.user.role, 'shop');
  const createSales = await request('/users', {method: 'POST', cookie, csrf, body: {displayName: 'Sales Manager', email: 'sales@example.com', role: 'sales', password: 'SecureSales1234'}});
  assert.equal(createSales.response.status, 201);
  const createEditor = await request('/users', {method: 'POST', cookie, csrf, body: {displayName: 'Content Editor', email: 'editor@example.com', role: 'editor', password: 'SecureEditor1234'}});
  assert.equal(createEditor.response.status, 201);

  const enquiry = await request('/enquiries', {method: 'POST', cookie, csrf, body: {type: 'quote', name: 'Test Customer', email: 'customer@example.com', phone: '', subject: 'New project', message: 'Please contact me about an installation.'}});
  assert.equal(enquiry.response.status, 201);
  const invalidAssignee = await request(`/enquiries/${enquiry.payload.enquiry.id}`, {method: 'PATCH', cookie, csrf, body: {status: 'in_progress', notes: '', assignedTo: createUser.payload.user.id}});
  assert.equal(invalidAssignee.response.status, 400);
  assert.equal(invalidAssignee.payload.error.code, 'invalid_assignee');
  const invalidEnquiryStatus = await request('/enquiries?status=not-a-status', {cookie});
  assert.equal(invalidEnquiryStatus.response.status, 400);
  const enquiryList = await request('/enquiries', {cookie});
  assert.ok(enquiryList.payload.assignees.some(assignee => assignee.id === createSales.payload.user.id));
  const assignedEnquiry = await request(`/enquiries/${enquiry.payload.enquiry.id}`, {method: 'PATCH', cookie, csrf, body: {status: 'in_progress', notes: 'Assigned for follow-up.', assignedTo: createSales.payload.user.id}});
  assert.equal(assignedEnquiry.response.status, 200);
  assert.equal(assignedEnquiry.payload.enquiry.assignedTo, createSales.payload.user.id);
  const filteredAudit = await request(`/audit?userId=${setup.payload.user.id}&q=bulk&sort=oldest`, {cookie});
  assert.equal(filteredAudit.response.status, 200);
  assert.ok(filteredAudit.payload.entries.every(entry => entry.userId === setup.payload.user.id && entry.action.includes('bulk')));
  assert.ok(filteredAudit.payload.users.some(auditUser => auditUser.id === createSales.payload.user.id));
  const auditPageOne = await request('/audit?limit=20&offset=0', {cookie});
  assert.equal(auditPageOne.response.status, 200);
  assert.equal(auditPageOne.payload.entries.length, 20);
  assert.equal(auditPageOne.payload.hasMore, true);
  const auditPageTwo = await request('/audit?limit=20&offset=20', {cookie});
  assert.equal(auditPageTwo.response.status, 200);
  assert.equal(auditPageTwo.payload.offset, 20);
  assert.ok(auditPageTwo.payload.entries.length > 0);
  const firstPageIds = new Set(auditPageOne.payload.entries.map(entry => entry.id));
  assert.ok(auditPageTwo.payload.entries.every(entry => !firstPageIds.has(entry.id)));

  const ownerHistory = await request(`/content/${record.id}/revisions`, {cookie});
  assert.equal(ownerHistory.response.status, 200);
  assert.ok(ownerHistory.payload.revisions.length >= 4);
  const restore = await request(`/content/${record.id}/revisions/${ownerHistory.payload.revisions.at(-1).id}/restore`, {method: 'POST', cookie, csrf, body: {expectedVersion: republish.payload.record.version}});
  assert.equal(restore.response.status, 200);
  const archive = await request(`/content/${record.id}/archive`, {method: 'POST', cookie, csrf, body: {expectedVersion: restore.payload.record.version}});
  assert.equal(archive.response.status, 200);
  assert.equal(archive.payload.record.status, 'archived');

  const malformedCookie = await request('/session', {cookie: 'nk_admin_session=%E0%A4%A'});
  assert.equal(malformedCookie.response.status, 401);

  const previousCookie = cookie;
  const passwordChange = await request('/profile/password', {method: 'POST', cookie, csrf, body: {currentPassword: 'SecureAdmin1234', newPassword: 'RotatedAdmin5678'}});
  assert.equal(passwordChange.response.status, 200);
  cookie = passwordChange.response.headers.get('set-cookie').split(';')[0];
  csrf = passwordChange.payload.csrfToken;
  const revokedClone = await request('/session', {cookie: previousCookie});
  assert.equal(revokedClone.response.status, 401, 'a clone of the previous current-session token must be revoked');
  const rotatedSession = await request('/session', {cookie});
  assert.equal(rotatedSession.response.status, 200);
  assert.equal(rotatedSession.payload.csrfToken, csrf);

  const logout = await request('/logout', {method: 'POST', cookie, csrf});
  assert.equal(logout.response.status, 200);
  const protectedRequest = await request('/dashboard', {cookie});
  assert.equal(protectedRequest.response.status, 401);

  const shopLogin = await request('/login', {method: 'POST', body: {email: 'shop@example.com', password: 'SecureShop1234'}});
  assert.equal(shopLogin.response.status, 200);
  const shopCookie = shopLogin.response.headers.get('set-cookie').split(';')[0];
  const shopCsrf = shopLogin.payload.csrfToken;
  const deniedServices = await request('/content?kind=service', {cookie: shopCookie});
  assert.equal(deniedServices.response.status, 403);
  const deniedMixedBatch = await request('/content?kinds=product,page', {cookie: shopCookie});
  assert.equal(deniedMixedBatch.response.status, 403);
  const allowedProducts = await request('/content?kind=product', {cookie: shopCookie});
  assert.equal(allowedProducts.response.status, 200);
  const deniedEnquiries = await request('/enquiries', {cookie: shopCookie});
  assert.equal(deniedEnquiries.response.status, 403);
  const shopHistory = await request(`/content/${record.id}/revisions`, {cookie: shopCookie});
  assert.equal(shopHistory.response.status, 403);
  const shopDashboard = await request('/dashboard', {cookie: shopCookie});
  assert.deepEqual(Object.keys(shopDashboard.payload.content).sort(), ['catalogue', 'product']);
  assert.deepEqual(shopDashboard.payload.submissions, {});
  const shopAudit = await request('/audit', {cookie: shopCookie});
  assert.equal(shopAudit.response.status, 200);
  assert.ok(shopAudit.payload.entries.every(entry => entry.userId === createUser.payload.user.id));
  assert.deepEqual(shopAudit.payload.users, []);
  const shopMedia = await request('/media', {cookie: shopCookie});
  assert.equal(shopMedia.response.status, 200);
  assert.ok(shopMedia.payload.media.some(asset => asset.id === upload.payload.media.id), 'shared media remains readable');
  const shopPatchSharedMedia = await request(`/media/${upload.payload.media.id}`, {method: 'PATCH', cookie: shopCookie, csrf: shopCsrf, body: {filename: 'cross-role.png', altText: 'Changed', caption: '', active: true}});
  assert.equal(shopPatchSharedMedia.response.status, 403);
  const shopDeleteSharedMedia = await request(`/media/${upload.payload.media.id}`, {method: 'DELETE', cookie: shopCookie, csrf: shopCsrf});
  assert.equal(shopDeleteSharedMedia.response.status, 403);
  const shopUpload = await request('/media', {method: 'POST', cookie: shopCookie, csrf: shopCsrf, body: {filename: 'shop.png', mimeType: 'image/png', base64: pngBase64, altText: 'Shop image', caption: ''}});
  assert.equal(shopUpload.response.status, 201);
  assert.equal(shopUpload.payload.media.scope, 'shop');
  const shopOwnUpdate = await request(`/media/${shopUpload.payload.media.id}`, {method: 'PATCH', cookie: shopCookie, csrf: shopCsrf, body: {filename: 'shop-updated.png', altText: 'Updated shop image', caption: '', active: true}});
  assert.equal(shopOwnUpdate.response.status, 200);

  const editorLogin = await request('/login', {method: 'POST', body: {email: 'editor@example.com', password: 'SecureEditor1234'}});
  assert.equal(editorLogin.response.status, 200);
  const editorCookie = editorLogin.response.headers.get('set-cookie').split(';')[0];
  const editorDeleteNavigation = await request(`/navigation/${navigation.payload.items[0].id}`, {method: 'DELETE', cookie: editorCookie, csrf: editorLogin.payload.csrfToken});
  assert.equal(editorDeleteNavigation.response.status, 403);

  const salesLogin = await request('/login', {method: 'POST', body: {email: 'sales@example.com', password: 'SecureSales1234'}});
  assert.equal(salesLogin.response.status, 200);
  const salesCookie = salesLogin.response.headers.get('set-cookie').split(';')[0];
  const salesHistory = await request(`/content/${record.id}/revisions`, {cookie: salesCookie});
  assert.equal(salesHistory.response.status, 403);
  const salesDashboard = await request('/dashboard', {cookie: salesCookie});
  assert.deepEqual(salesDashboard.payload.content, {});
  assert.equal(salesDashboard.payload.submissions.in_progress, 1);
});

test('owner bootstrap is secure by default outside the explicit development runner', async t => {
  const isolatedTemp = mkdtempSync(join(tmpdir(), 'nk-admin-bootstrap-'));
  const isolatedPort = await freePort();
  const isolatedBase = `http://127.0.0.1:${isolatedPort}/api/admin`;
  const isolatedChild = spawn(process.execPath, ['server/admin-server.mjs'], {
    cwd: root,
    env: {...process.env, ADMIN_API_PORT: String(isolatedPort), ADMIN_DB_PATH: join(isolatedTemp, 'admin.sqlite'), ADMIN_MEDIA_PATH: join(isolatedTemp, 'media'), ADMIN_ALLOWED_ORIGINS: origin, ADMIN_ALLOW_LOOPBACK_SETUP: '', NODE_ENV: ''},
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(async () => {
    isolatedChild.kill();
    if (isolatedChild.exitCode === null) await once(isolatedChild, 'exit');
    rmSync(isolatedTemp, {recursive: true, force: true, maxRetries: 5, retryDelay: 50});
  });
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try { if ((await fetch(`${isolatedBase}/health`)).ok) break; } catch {}
    await new Promise(resolvePromise => setTimeout(resolvePromise, 60));
  }
  const setupState = await fetch(`${isolatedBase}/setup`, {headers: {Origin: origin}}).then(response => response.json());
  assert.equal(setupState.requiresBootstrapToken, true);
  const deniedSetup = await fetch(`${isolatedBase}/setup`, {method: 'POST', headers: {Origin: origin, 'Content-Type': 'application/json'}, body: JSON.stringify({displayName: 'Unexpected Owner', email: 'unexpected@example.com', password: 'SecureUnexpected1234'})});
  assert.equal(deniedSetup.status, 403);
  assert.equal((await deniedSetup.json()).error.code, 'bootstrap_denied');
});
