import {createServer} from 'node:http';
import {accessSync, constants as fsConstants, copyFileSync, createReadStream, existsSync, mkdirSync, readFileSync, statSync, unlinkSync, writeFileSync} from 'node:fs';
import {extname, resolve, sep} from 'node:path';
import {isIP} from 'node:net';
import {URL} from 'node:url';
import {audit, contentRecord, db, enquiryRecord, formRecord, mediaRecord, navigationRecord, newId, nowIso, publicUser, safeJson, submissionRecord, transaction} from './db.mjs';
import {CONTENT_KINDS, validateContentInput, validatePublishReady} from './content-validation.mjs';
import {NAVIGATION_MENUS, SUBMISSION_STATUSES, validateFormInput, validateNavigationInput, validateSubmission} from './cms-validation.mjs';
import {ApiError, cleanText, hashPassword, normalizeEmail, randomToken, readCookies, safeEqual, sha256, validatePassword, verifyPassword} from './security.mjs';
import {requestGuideProposal} from './ai-guide.mjs';
import sharp from 'sharp';

const HOST = process.env.ADMIN_API_HOST || '127.0.0.1';
const PORT = Number(process.env.ADMIN_API_PORT || 5192);
const API_PREFIX = '/api/admin';
const configuredSessionHours = Number(process.env.ADMIN_SESSION_HOURS || 8);
const SESSION_HOURS = Number.isFinite(configuredSessionHours) ? Math.min(168, Math.max(1, configuredSessionHours)) : 8;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const ALLOW_LOOPBACK_SETUP = !IS_PRODUCTION && process.env.ADMIN_ALLOW_LOOPBACK_SETUP === 'true';
const MEDIA_DIR = resolve(process.env.ADMIN_MEDIA_PATH || resolve('.data', 'media'));
const DIST_DIR = resolve(process.env.ADMIN_DIST_PATH || 'dist');
const SERVE_SITE = process.env.ADMIN_SERVE_SITE === 'true';
const ALLOWED_ORIGINS = new Set((process.env.ADMIN_ALLOWED_ORIGINS || 'http://127.0.0.1:5191,http://localhost:5191,http://127.0.0.1:5192').split(',').map(value => value.trim()).filter(Boolean));
const TRUST_LOOPBACK_PROXY = process.env.ADMIN_TRUST_LOOPBACK_PROXY === 'true';
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || '';
const FIREBASE_ALLOWED_EMAILS = new Set(String(process.env.FIREBASE_ADMIN_EMAILS || process.env.VITE_FIREBASE_ADMIN_EMAILS || '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean));
const FIREBASE_IDENTITY_LOOKUP_URL = process.env.FIREBASE_IDENTITY_TOOLKIT_URL || 'https://identitytoolkit.googleapis.com/v1/accounts:lookup';
const ROLES = ['owner', 'editor', 'shop', 'projects', 'sales', 'viewer'];
const ENQUIRY_TYPES = ['contact', 'quote', 'product', 'catalogue', 'project', 'phone'];
const ENQUIRY_STATUSES = ['new', 'in_progress', 'waiting', 'won', 'closed', 'spam'];
const MEDIA_TYPES = {'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'application/pdf': '.pdf', 'video/mp4': '.mp4', 'video/webm': '.webm'};
const mediaFamily = mimeType => String(mimeType || '').startsWith('image/') ? 'image' : String(mimeType || '').startsWith('video/') ? 'video' : mimeType === 'application/pdf' ? 'document' : 'unknown';
const MEDIA_SIGNATURES = {
  'image/jpeg': value => value.length >= 3 && value[0] === 0xff && value[1] === 0xd8 && value[2] === 0xff,
  'image/png': value => value.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/webp': value => value.subarray(0, 4).toString('ascii') === 'RIFF' && value.subarray(8, 12).toString('ascii') === 'WEBP',
  'application/pdf': value => value.subarray(0, 5).toString('ascii') === '%PDF-',
  'video/mp4': value => value.length >= 12 && value.subarray(4, 8).toString('ascii') === 'ftyp',
  'video/webm': value => value.length >= 4 && value.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])),
};
const loginAttempts = new Map();
const loginIpAttempts = new Map();
const submissionAttempts = new Map();

mkdirSync(MEDIA_DIR, {recursive: true});

const jsonHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
};

function sendJson(res, status, payload, extraHeaders = {}) {
  res.writeHead(status, {...jsonHeaders, ...extraHeaders});
  res.end(JSON.stringify(payload));
}

function serveSite(pathname, res) {
  if (!SERVE_SITE) return false;
  const contentTypes = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.pdf': 'application/pdf'};
  let decodedPath;
  try { decodedPath = decodeURIComponent(pathname); }
  catch { throw new ApiError(400, 'invalid_path', 'The requested path is not valid.'); }
  const requested = resolve(DIST_DIR, `.${decodedPath}`);
  const safe = requested === DIST_DIR || requested.startsWith(`${DIST_DIR}${sep}`);
  let file = safe && existsSync(requested) && statSync(requested).isFile() ? requested : resolve(DIST_DIR, 'index.html');
  if (!existsSync(file)) return false;
  const bytes = readFileSync(file);
  const cache = extname(file) === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable';
  res.writeHead(200, {'Content-Type': contentTypes[extname(file).toLowerCase()] || 'application/octet-stream', 'Content-Length': bytes.length, 'Cache-Control': cache, 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin'});
  res.end(bytes);
  return true;
}

function socketIp(req) {
  return String(req.socket.remoteAddress || '').replace(/^::ffff:/, '');
}

function requestIp(req) {
  const direct = socketIp(req);
  if (!TRUST_LOOPBACK_PROXY || !['127.0.0.1', '::1'].includes(direct)) return direct;
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim().replace(/^::ffff:/, '');
  return isIP(forwarded) ? forwarded : direct;
}

function isLoopback(req) {
  return ['127.0.0.1', '::1', 'localhost'].includes(requestIp(req));
}

function verifyOrigin(req) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method || 'GET')) return;
  const origin = req.headers.origin;
  if (!origin || !ALLOWED_ORIGINS.has(origin)) throw new ApiError(403, 'origin_denied', 'The request origin is not allowed.');
}

async function readJson(req, limit = 1_000_000) {
  const declared = Number(req.headers['content-length'] || 0);
  if (declared > limit) throw new ApiError(413, 'body_too_large', 'The request is too large.');
  const chunks = [];
  let length = 0;
  for await (const chunk of req) {
    length += chunk.length;
    if (length > limit) throw new ApiError(413, 'body_too_large', 'The request is too large.');
    chunks.push(chunk);
  }
  if (!length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new ApiError(400, 'invalid_json', 'The request body is not valid JSON.');
  }
}

function sessionCookie(token, expiresAt) {
  const secure = IS_PRODUCTION ? '; Secure' : '';
  return `nk_admin_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=${API_PREFIX}; Expires=${new Date(expiresAt).toUTCString()}${secure}`;
}

function clearSessionCookie() {
  const secure = IS_PRODUCTION ? '; Secure' : '';
  return `nk_admin_session=; HttpOnly; SameSite=Strict; Path=${API_PREFIX}; Max-Age=0${secure}`;
}

function createSession(user, req) {
  const token = randomToken();
  const csrf = randomToken(24);
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000).toISOString();
  db.prepare('DELETE FROM admin_sessions WHERE expires_at <= ?').run(createdAt);
  db.prepare(`INSERT INTO admin_sessions
    (id, user_id, token_hash, csrf_hash, csrf_token, expires_at, created_at, last_seen_at, user_agent, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(newId(), user.id, sha256(token), sha256(csrf), csrf, expiresAt, createdAt, createdAt, String(req.headers['user-agent'] || '').slice(0, 500), requestIp(req));
  return {token, csrf, expiresAt};
}

function authenticate(req) {
  const token = readCookies(req.headers.cookie).nk_admin_session;
  if (!token) return null;
  const row = db.prepare(`SELECT s.*, u.email, u.display_name, u.role, u.active, u.created_at AS user_created_at, u.updated_at AS user_updated_at
    FROM admin_sessions s JOIN admin_users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > ? AND u.active = 1`).get(sha256(token), nowIso());
  if (!row) return null;
  if (Date.now() - new Date(row.last_seen_at).getTime() > 5 * 60 * 1000) db.prepare('UPDATE admin_sessions SET last_seen_at = ? WHERE id = ?').run(nowIso(), row.id);
  return {
    session: row,
    user: {
      id: row.user_id,
      email: row.email,
      displayName: row.display_name,
      role: row.role,
      active: true,
      createdAt: row.user_created_at,
      updatedAt: row.user_updated_at,
    },
  };
}

function requireAuth(req) {
  const auth = authenticate(req);
  if (!auth) throw new ApiError(401, 'authentication_required', 'Sign in to continue.');
  return auth;
}

function requireCsrf(req, auth) {
  const token = req.headers['x-csrf-token'];
  if (!token || !safeEqual(sha256(token), auth.session.csrf_hash)) throw new ApiError(403, 'csrf_failed', 'The security token expired. Refresh and try again.');
}

function requireOwner(user) {
  if (user.role !== 'owner') throw new ApiError(403, 'permission_denied', 'Owner access is required.');
}

function canWriteContent(user, kind) {
  if (user.role === 'owner') return true;
  if (user.role === 'editor') return ['page', 'service', 'company', 'seo', 'settings'].includes(kind);
  if (user.role === 'shop') return ['product', 'catalogue'].includes(kind);
  if (user.role === 'projects') return kind === 'project';
  return false;
}

function canReadContent(user, kind) {
  if (['owner', 'editor', 'viewer'].includes(user.role)) return true;
  if (user.role === 'shop') return ['product', 'catalogue'].includes(kind);
  if (user.role === 'projects') return kind === 'project';
  return false;
}

function requireContentRead(user, kind) {
  if (!canReadContent(user, kind)) throw new ApiError(403, 'permission_denied', 'You do not have permission to view this section.');
}

function requireContentWrite(user, kind) {
  if (!canWriteContent(user, kind)) throw new ApiError(403, 'permission_denied', 'You do not have permission to change this section.');
}

function requireEnquiries(user) {
  if (!['owner', 'sales'].includes(user.role)) throw new ApiError(403, 'permission_denied', 'Sales access is required.');
}

function requireMediaWrite(user) {
  if (!['owner', 'editor', 'shop', 'projects'].includes(user.role)) throw new ApiError(403, 'permission_denied', 'You do not have permission to manage media.');
}

function mediaScopeForRole(role) {
  return {owner: 'shared', editor: 'site', shop: 'shop', projects: 'projects'}[role] || null;
}

function canReadMedia(user, row) {
  if (['owner', 'viewer'].includes(user.role)) return true;
  const scope = mediaScopeForRole(user.role);
  return Boolean(scope && (row.scope === 'shared' || row.scope === scope));
}

function readableMediaScopes(user) {
  if (['owner', 'viewer'].includes(user.role)) return null;
  const scope = mediaScopeForRole(user.role);
  return scope ? ['shared', scope] : [];
}

function mediaScopeClause(user, column = 'scope') {
  const scopes = readableMediaScopes(user);
  if (scopes === null) return {sql: '', values: []};
  if (!scopes.length) return {sql: '1 = 0', values: []};
  return {sql: `${column} IN (${scopes.map(() => '?').join(',')})`, values: scopes};
}

function requireMediaRowWrite(user, row) {
  requireMediaWrite(user);
  if (user.role === 'owner') return;
  if (row.scope !== mediaScopeForRole(user.role)) throw new ApiError(403, 'permission_denied', 'You cannot change media owned by another workspace.');
}

function requireSiteStructure(user) {
  if (!['owner', 'editor'].includes(user.role)) throw new ApiError(403, 'permission_denied', 'Content editor access is required.');
}

function requireFormsRead(user) {
  if (!['owner', 'editor', 'sales', 'viewer'].includes(user.role)) throw new ApiError(403, 'permission_denied', 'You do not have permission to view forms.');
}

function requireFormsWrite(user) {
  if (!['owner', 'editor'].includes(user.role)) throw new ApiError(403, 'permission_denied', 'Content editor access is required to manage forms.');
}

function requireSubmissions(user) {
  if (!['owner', 'sales'].includes(user.role)) throw new ApiError(403, 'permission_denied', 'Sales access is required to manage submissions.');
}

function checkLoginRate(req, email) {
  const ip = requestIp(req);
  const key = `${ip}|${email}`;
  const now = Date.now();
  const ipCurrent = loginIpAttempts.get(ip);
  if (!ipCurrent || now - ipCurrent.startedAt > 15 * 60 * 1000) {
    setRateLimit(loginIpAttempts, ip, {startedAt: now, count: 1});
  } else {
    ipCurrent.count += 1;
    if (ipCurrent.count > 30) throw new ApiError(429, 'too_many_attempts', 'Too many sign-in attempts. Try again later.');
  }
  const current = loginAttempts.get(key);
  if (!current || now - current.startedAt > 15 * 60 * 1000) {
    setRateLimit(loginAttempts, key, {startedAt: now, count: 1});
    return;
  }
  current.count += 1;
  if (current.count > 7) throw new ApiError(429, 'too_many_attempts', 'Too many sign-in attempts. Try again later.');
}

function clearLoginRate(req, email) {
  loginAttempts.delete(`${requestIp(req)}|${email}`);
}

async function verifyFirebaseAdminToken(rawToken) {
  if (!FIREBASE_API_KEY || !FIREBASE_ALLOWED_EMAILS.size) {
    throw new ApiError(503, 'firebase_not_configured', 'Firebase Authentication is not configured for the local admin service.');
  }
  const idToken = String(rawToken || '').trim();
  if (!idToken || idToken.length > 20_000) throw new ApiError(401, 'firebase_invalid_token', 'Firebase sign-in could not be verified.');
  const endpoint = new URL(FIREBASE_IDENTITY_LOOKUP_URL);
  endpoint.searchParams.set('key', FIREBASE_API_KEY);
  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({idToken}),
      signal: AbortSignal.timeout(7000),
    });
  } catch {
    throw new ApiError(503, 'firebase_unavailable', 'Firebase could not be reached. Use the original local login.');
  }
  const payload = await response.json().catch(() => ({}));
  const firebaseUser = Array.isArray(payload.users) ? payload.users[0] : null;
  if (!response.ok || !firebaseUser?.localId || !firebaseUser?.email) {
    throw new ApiError(401, 'firebase_invalid_token', 'Firebase sign-in could not be verified.');
  }
  const email = normalizeEmail(firebaseUser.email);
  if (firebaseUser.emailVerified !== true) throw new ApiError(403, 'firebase_email_unverified', 'Verify this Firebase email address before using the admin panel.');
  if (!FIREBASE_ALLOWED_EMAILS.has(email)) throw new ApiError(403, 'firebase_account_denied', 'This Firebase account is not authorised for the NK Electrical admin.');
  return {uid: String(firebaseUser.localId), email};
}

function checkSubmissionRate(req) {
  const key = requestIp(req);
  const now = Date.now();
  const current = submissionAttempts.get(key);
  if (!current || now - current.startedAt > 60 * 60 * 1000) {
    setRateLimit(submissionAttempts, key, {startedAt: now, count: 1});
    return;
  }
  current.count += 1;
  if (current.count > 20) throw new ApiError(429, 'too_many_submissions', 'Too many submissions were received. Try again later.');
}

function setRateLimit(store, key, value) {
  const maxEntries = 5000;
  if (!store.has(key) && store.size >= maxEntries) store.delete(store.keys().next().value);
  store.set(key, value);
}

function saveRevision(record, action, userId) {
  db.prepare(`INSERT INTO content_revisions
    (id, record_id, version, title, slug, status, data, action, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(newId(), record.id, record.version, record.title, record.slug, record.status, record.draft_data, action, userId, nowIso());
}

function assertPublishReady(record) {
  const data = safeJson(record.draft_data, {});
  validatePublishReady(record.kind, data);
  const mediaIds = [...new Set([...JSON.stringify(data).matchAll(/\/api\/admin\/media\/([a-f0-9-]{36})\/(?:file|variant)/gi)].map(match => match[1]))];
  if (!mediaIds.length) return;
  const rows = db.prepare(`SELECT id, stored_name, active FROM media_assets WHERE id IN (${mediaIds.map(() => '?').join(',')})`).all(...mediaIds);
  const available = new Set(rows.filter(row => row.active && (() => { try { return existsSync(safeMediaPath(row.stored_name)); } catch { return false; } })()).map(row => row.id));
  const missing = mediaIds.filter(id => !available.has(id));
  if (missing.length) throw new ApiError(409, 'publish_media_unavailable', `The draft references ${missing.length} unavailable media asset${missing.length === 1 ? '' : 's'}. Replace or reactivate them before publishing.`);
}

async function expectedVersion(req) {
  const body = await readJson(req, 10_000);
  const version = Number(body.expectedVersion);
  if (!Number.isInteger(version) || version < 1) throw new ApiError(400, 'invalid_version', 'The record version is missing. Refresh and try again.');
  return version;
}

function pathParts(pathname) {
  try { return pathname.slice(API_PREFIX.length).split('/').filter(Boolean).map(decodeURIComponent); }
  catch { throw new ApiError(400, 'invalid_path', 'The requested API path is not valid.'); }
}

function parseTags(value) {
  try {
    const tags = JSON.parse(value || '[]');
    return Array.isArray(tags) ? tags.filter(tag => typeof tag === 'string').slice(0, 20) : [];
  } catch { return []; }
}

function contentAdminRoute(kind, id) {
  const sections = {page: 'site-pages', service: 'services', product: 'products', catalogue: 'catalogues', project: 'projects', company: 'company', seo: 'seo', settings: 'settings'};
  return `/admin/${sections[kind] || 'dashboard'}?record=${encodeURIComponent(id)}`;
}

function favoriteKeysForUser(userId) {
  return new Set(db.prepare('SELECT entity_type, entity_id FROM admin_favorites WHERE user_id = ?').all(userId).map(row => `${row.entity_type}:${row.entity_id}`));
}

function contentWorkItem(row, favoriteKeys = new Set()) {
  return {
    id: row.id,
    type: 'content',
    kind: row.kind,
    title: row.title,
    slug: row.slug,
    status: row.status,
    version: Number(row.version),
    category: row.category || '',
    tags: parseTags(row.tags_json),
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
    updatedBy: row.updated_by_name || 'System',
    updatedById: row.updated_by || null,
    favorite: favoriteKeys.has(`content:${row.id}`),
    to: contentAdminRoute(row.kind, row.id),
  };
}

function resolveFavorites(user) {
  const rows = db.prepare('SELECT entity_type, entity_id, created_at FROM admin_favorites WHERE user_id = ? ORDER BY created_at DESC LIMIT 24').all(user.id);
  const favoriteKeys = new Set(rows.map(row => `${row.entity_type}:${row.entity_id}`));
  const contentIds = rows.filter(row => row.entity_type === 'content').map(row => row.entity_id);
  const mediaIds = rows.filter(row => row.entity_type === 'media').map(row => row.entity_id);
  const contentRows = contentIds.length ? db.prepare(`SELECT c.*, u.display_name AS updated_by_name FROM content_records c LEFT JOIN admin_users u ON u.id = c.updated_by WHERE c.id IN (${contentIds.map(() => '?').join(',')})`).all(...contentIds) : [];
  const mediaRows = mediaIds.length ? db.prepare(`SELECT * FROM media_assets WHERE id IN (${mediaIds.map(() => '?').join(',')})`).all(...mediaIds) : [];
  const contentById = new Map(contentRows.map(row => [row.id, row]));
  const mediaById = new Map(mediaRows.map(row => [row.id, row]));
  const resolved = [];
  for (const favorite of rows) {
    if (favorite.entity_type === 'content') {
      const row = contentById.get(favorite.entity_id);
      if (row && canReadContent(user, row.kind)) resolved.push({...contentWorkItem(row, favoriteKeys), pinnedAt: favorite.created_at});
    } else if (favorite.entity_type === 'media') {
      const row = mediaById.get(favorite.entity_id);
      if (row && canReadMedia(user, row)) resolved.push({id: row.id, type: 'media', kind: 'media', title: row.title || row.filename, slug: row.filename, status: row.active ? 'active' : 'inactive', category: row.category || '', tags: String(parseMediaJson(row.metadata_json, {}).tags || '').split(',').map(tag => tag.trim()).filter(Boolean), updatedAt: row.updated_at || row.created_at, updatedBy: '', favorite: true, to: `/admin/media?asset=${encodeURIComponent(row.id)}`, pinnedAt: favorite.created_at});
    }
  }
  return resolved;
}

function dashboardNotifications(user, readableKinds, statuses, submissions) {
  const notifications = [];
  const placeholders = readableKinds.map(() => '?').join(',');
  if (readableKinds.length) {
    const staleDrafts = db.prepare(`SELECT COUNT(*) AS count FROM content_records WHERE kind IN (${placeholders}) AND status = 'draft' AND updated_at < ?`).get(...readableKinds, new Date(Date.now() - 14 * 86400000).toISOString()).count;
    if (staleDrafts) notifications.push({id: 'stale-drafts', level: 'warning', title: `${staleDrafts} draft${staleDrafts === 1 ? '' : 's'} waiting over 14 days`, body: 'Review, publish or archive them to keep the content queue clear.', to: '/admin/dashboard?status=draft&age=stale'});
  }
  if (['owner', 'editor', 'shop', 'projects', 'viewer'].includes(user.role)) {
    const scope = mediaScopeClause(user);
    const scopeWhere = scope.sql ? ` AND ${scope.sql}` : '';
    const missingAlt = db.prepare(`SELECT COUNT(*) AS count FROM media_assets WHERE active = 1 AND mime_type LIKE 'image/%' AND trim(alt_text) = ''${scopeWhere}`).get(...scope.values).count;
    if (missingAlt) notifications.push({id: 'missing-alt', level: 'warning', title: `${missingAlt} active image${missingAlt === 1 ? '' : 's'} missing alt text`, body: 'Add descriptions to protect accessibility and search quality.', to: '/admin/media'});
    const missingFiles = db.prepare(`SELECT stored_name FROM media_assets${scope.sql ? ` WHERE ${scope.sql}` : ''}`).all(...scope.values).filter(row => { try { return !existsSync(safeMediaPath(row.stored_name)); } catch { return true; } }).length;
    if (missingFiles) notifications.push({id: 'missing-files', level: 'critical', title: `${missingFiles} media file${missingFiles === 1 ? '' : 's'} missing from storage`, body: 'Replace the affected assets before the next publish.', to: '/admin/media'});
  }
  if (submissions.new) notifications.push({id: 'new-submissions', level: 'info', title: `${submissions.new} new form submission${submissions.new === 1 ? '' : 's'}`, body: 'Open the inbox and assign the next action.', to: '/admin/forms'});
  if (!notifications.length) notifications.push({id: 'all-clear', level: 'success', title: 'No urgent website warnings', body: 'Content, media and incoming work have no detected blockers.', to: '/admin/dashboard'});
  return notifications;
}

function systemStatus(user, readableKinds) {
  let mediaWritable = true;
  try { accessSync(MEDIA_DIR, fsConstants.R_OK | fsConstants.W_OK); } catch { mediaWritable = false; }
  const activeForms = ['owner', 'editor', 'sales', 'viewer'].includes(user.role) ? Number(db.prepare('SELECT COUNT(*) AS count FROM site_forms WHERE active = 1').get().count) : 0;
  const published = readableKinds.length ? Number(db.prepare(`SELECT COUNT(*) AS count FROM content_records WHERE kind IN (${readableKinds.map(() => '?').join(',')}) AND status = 'published' AND published_data IS NOT NULL`).get(...readableKinds).count) : 0;
  return [
    {id: 'database', label: 'Content database', status: 'healthy', detail: 'SQLite is reachable and transactional writes are enabled.'},
    {id: 'media', label: 'Media storage', status: mediaWritable ? 'healthy' : 'error', detail: mediaWritable ? 'Upload storage is readable and writable.' : 'The media directory is not writable.'},
    {id: 'optimizer', label: 'Image optimization', status: 'healthy', detail: 'Sharp responsive image processing is available.'},
    {id: 'website', label: 'Public content delivery', status: published ? 'healthy' : 'warning', detail: `${published} published record${published === 1 ? '' : 's'} available to the website.`},
    {id: 'forms', label: 'Forms integration', status: activeForms ? 'healthy' : 'warning', detail: activeForms ? `${activeForms} active form${activeForms === 1 ? '' : 's'} storing submissions.` : 'No active public forms are configured.'},
  ];
}

function searchPayload(user, rawQuery, rawType = 'all', rawSort = 'relevance') {
  const query = cleanText(rawQuery, 'query', {max: 120, optional: true}).trim();
  const type = ['all', 'content', 'media', 'navigation', 'forms', 'enquiries', 'users'].includes(rawType) ? rawType : 'all';
  const sort = ['relevance', 'updated', 'title'].includes(rawSort) ? rawSort : 'relevance';
  if (query.length < 2) return {query, results: [], total: 0};
  const escaped = query.toLowerCase().replace(/[\\%_]/g, value => `\\${value}`);
  const like = `%${escaped}%`;
  const results = [];
  const favoriteKeys = favoriteKeysForUser(user.id);
  const include = candidate => type === 'all' || type === candidate;
  if (include('content')) {
    const readableKinds = CONTENT_KINDS.filter(kind => canReadContent(user, kind));
    if (readableKinds.length) {
      const placeholders = readableKinds.map(() => '?').join(',');
      const rows = db.prepare(`SELECT c.*, u.display_name AS updated_by_name FROM content_records c LEFT JOIN admin_users u ON u.id = c.updated_by WHERE c.kind IN (${placeholders}) AND (lower(c.title) LIKE ? ESCAPE '\\' OR lower(c.slug) LIKE ? ESCAPE '\\' OR lower(c.category) LIKE ? ESCAPE '\\' OR lower(c.tags_json) LIKE ? ESCAPE '\\' OR lower(c.draft_data) LIKE ? ESCAPE '\\') ORDER BY c.updated_at DESC LIMIT 35`).all(...readableKinds, like, like, like, like, like);
      rows.forEach(row => results.push({id: row.id, type: 'content', kind: row.kind, title: row.title, description: `${row.kind} · /${row.slug}${row.category ? ` · ${row.category}` : ''}`, status: row.status, category: row.category || '', tags: parseTags(row.tags_json), updatedAt: row.updated_at, updatedBy: row.updated_by_name || 'System', favorite: favoriteKeys.has(`content:${row.id}`), to: contentAdminRoute(row.kind, row.id)}));
    }
  }
  if (include('media') && canReadMedia(user, {scope: 'shared'})) {
    const scope = mediaScopeClause(user);
    const rows = db.prepare(`SELECT * FROM media_assets WHERE ${scope.sql ? `${scope.sql} AND ` : ''}(lower(filename) LIKE ? ESCAPE '\\' OR lower(title) LIKE ? ESCAPE '\\' OR lower(alt_text) LIKE ? ESCAPE '\\' OR lower(caption) LIKE ? ESCAPE '\\' OR lower(folder) LIKE ? ESCAPE '\\' OR lower(category) LIKE ? ESCAPE '\\' OR lower(metadata_json) LIKE ? ESCAPE '\\') ORDER BY updated_at DESC LIMIT 25`).all(...scope.values, like, like, like, like, like, like, like);
    rows.forEach(row => results.push({id: row.id, type: 'media', kind: 'media', title: row.title || row.filename, description: `${row.folder || 'General'} · ${row.category || 'Uncategorised'} · ${row.filename}`, status: row.active ? 'active' : 'inactive', category: row.category || '', tags: String(parseMediaJson(row.metadata_json, {}).tags || '').split(',').map(tag => tag.trim()).filter(Boolean), updatedAt: row.updated_at || row.created_at, updatedBy: '', favorite: favoriteKeys.has(`media:${row.id}`), to: `/admin/media?asset=${encodeURIComponent(row.id)}`}));
  }
  if (include('navigation') && ['owner', 'editor', 'viewer'].includes(user.role)) {
    db.prepare(`SELECT * FROM navigation_items WHERE lower(label) LIKE ? ESCAPE '\\' OR lower(url) LIKE ? ESCAPE '\\' OR lower(description) LIKE ? ESCAPE '\\' ORDER BY updated_at DESC LIMIT 15`).all(like, like, like).forEach(row => results.push({id: row.id, type: 'navigation', kind: row.menu, title: row.label, description: `${row.menu} · ${row.url}`, status: row.active ? 'active' : 'inactive', category: row.menu, tags: [], updatedAt: row.updated_at, updatedBy: '', favorite: false, to: `/admin/navigation?item=${encodeURIComponent(row.id)}`}));
  }
  if (include('forms') && ['owner', 'editor', 'sales', 'viewer'].includes(user.role)) {
    db.prepare(`SELECT * FROM site_forms WHERE lower(name) LIKE ? ESCAPE '\\' OR lower(slug) LIKE ? ESCAPE '\\' OR lower(recipient) LIKE ? ESCAPE '\\' ORDER BY updated_at DESC LIMIT 15`).all(like, like, like).forEach(row => results.push({id: row.id, type: 'forms', kind: 'form', title: row.name, description: `Form · /${row.slug} · ${row.recipient}`, status: row.active ? 'active' : 'inactive', category: 'Forms', tags: [], updatedAt: row.updated_at, updatedBy: '', favorite: false, to: `/admin/forms?form=${encodeURIComponent(row.id)}`}));
  }
  if (include('enquiries') && ['owner', 'sales'].includes(user.role)) {
    db.prepare(`SELECT * FROM enquiries WHERE lower(name) LIKE ? ESCAPE '\\' OR lower(email) LIKE ? ESCAPE '\\' OR lower(phone) LIKE ? ESCAPE '\\' OR lower(subject) LIKE ? ESCAPE '\\' OR lower(message) LIKE ? ESCAPE '\\' ORDER BY updated_at DESC LIMIT 20`).all(like, like, like, like, like).forEach(row => results.push({id: row.id, type: 'enquiries', kind: row.type, title: row.subject, description: `${row.name} · ${row.email || row.phone || row.source}`, status: row.status, category: row.type, tags: [], updatedAt: row.updated_at, updatedBy: '', favorite: false, to: `/admin/enquiries?enquiry=${encodeURIComponent(row.id)}`}));
  }
  if (include('users') && user.role === 'owner') {
    db.prepare(`SELECT * FROM admin_users WHERE lower(display_name) LIKE ? ESCAPE '\\' OR lower(email) LIKE ? ESCAPE '\\' OR lower(role) LIKE ? ESCAPE '\\' ORDER BY updated_at DESC LIMIT 15`).all(like, like, like).forEach(row => results.push({id: row.id, type: 'users', kind: 'user', title: row.display_name, description: `${row.email} · ${row.role}`, status: row.active ? 'active' : 'inactive', category: row.role, tags: [], updatedAt: row.updated_at, updatedBy: '', favorite: false, to: `/admin/users?user=${encodeURIComponent(row.id)}`}));
  }
  const score = item => `${item.title} ${item.description}`.toLowerCase().startsWith(query.toLowerCase()) ? 0 : item.title.toLowerCase().includes(query.toLowerCase()) ? 1 : 2;
  results.sort((a, b) => a.favorite !== b.favorite ? Number(b.favorite) - Number(a.favorite) : sort === 'title' ? a.title.localeCompare(b.title) : sort === 'updated' ? String(b.updatedAt).localeCompare(String(a.updatedAt)) : score(a) - score(b) || String(b.updatedAt).localeCompare(String(a.updatedAt)));
  return {query, results: results.slice(0, 60), total: results.length};
}

function assertFavoriteTarget(user, entityType, entityId) {
  if (entityType === 'content') {
    const row = db.prepare('SELECT * FROM content_records WHERE id = ?').get(entityId);
    if (!row || !canReadContent(user, row.kind)) throw new ApiError(404, 'not_found', 'Content item not found.');
    return;
  }
  if (entityType === 'media') {
    const row = db.prepare('SELECT * FROM media_assets WHERE id = ?').get(entityId);
    if (!row || !canReadMedia(user, row)) throw new ApiError(404, 'not_found', 'Media item not found.');
    return;
  }
  throw new ApiError(400, 'invalid_favorite', 'Only content and media items can be pinned.');
}

function dashboardPayload(user) {
  const readableKinds = CONTENT_KINDS.filter(kind => canReadContent(user, kind));
  const content = Object.fromEntries(readableKinds.map(kind => [kind, 0]));
  const statuses = {draft: 0, published: 0, archived: 0};
  if (readableKinds.length) {
    const placeholders = readableKinds.map(() => '?').join(',');
    for (const row of db.prepare(`SELECT kind, status, COUNT(*) AS count FROM content_records WHERE kind IN (${placeholders}) GROUP BY kind, status`).all(...readableKinds)) {
      if (row.status !== 'archived') content[row.kind] = (content[row.kind] || 0) + row.count;
      statuses[row.status] += row.count;
    }
  }
  const canSeeOperations = ['owner', 'sales'].includes(user.role);
  const enquiries = canSeeOperations ? Object.fromEntries(ENQUIRY_STATUSES.map(status => [status, 0])) : {};
  const submissions = canSeeOperations ? Object.fromEntries(SUBMISSION_STATUSES.map(status => [status, 0])) : {};
  if (canSeeOperations) {
    for (const row of db.prepare('SELECT status, COUNT(*) AS count FROM enquiries GROUP BY status').all()) enquiries[row.status] = row.count;
    for (const row of db.prepare('SELECT status, COUNT(*) AS count FROM form_submissions GROUP BY status').all()) submissions[row.status] = row.count;
  }
  const recentRows = user.role === 'owner'
    ? db.prepare(`SELECT a.id, a.action, a.entity_type, a.entity_id, a.details, a.created_at, u.display_name FROM audit_log a LEFT JOIN admin_users u ON u.id = a.user_id ORDER BY a.created_at DESC LIMIT 12`).all()
    : db.prepare(`SELECT a.id, a.action, a.entity_type, a.entity_id, a.details, a.created_at, u.display_name FROM audit_log a LEFT JOIN admin_users u ON u.id = a.user_id WHERE a.user_id = ? ORDER BY a.created_at DESC LIMIT 12`).all(user.id);
  const recent = recentRows.map(row => ({...row, details: safeJson(row.details, {})}));
  let workQueue = [];
  const favoriteKeys = favoriteKeysForUser(user.id);
  if (readableKinds.length) {
    const placeholders = readableKinds.map(() => '?').join(',');
    workQueue = db.prepare(`SELECT c.*, u.display_name AS updated_by_name FROM content_records c LEFT JOIN admin_users u ON u.id = c.updated_by WHERE c.kind IN (${placeholders}) ORDER BY c.updated_at DESC LIMIT 160`).all(...readableKinds).map(row => contentWorkItem(row, favoriteKeys));
  }
  const drafts = workQueue.filter(item => item.status === 'draft').slice(0, 12);
  const recentlyEdited = (user.role === 'owner' ? workQueue : workQueue.filter(item => item.updatedById === user.id)).slice(0, 10);
  const favorites = resolveFavorites(user);
  const notifications = dashboardNotifications(user, readableKinds, statuses, submissions);
  const system = systemStatus(user, readableKinds);
  const mediaScope = mediaScopeClause(user);
  const summary = {
    content: statuses.draft + statuses.published,
    media: canReadMedia(user, {scope: 'shared'}) ? Number(db.prepare(`SELECT COUNT(*) AS count FROM media_assets${mediaScope.sql ? ` WHERE ${mediaScope.sql}` : ''}`).get(...mediaScope.values).count) : 0,
    activeUsers: user.role === 'owner' ? Number(db.prepare('SELECT COUNT(*) AS count FROM admin_users WHERE active = 1').get().count) : 0,
    warnings: notifications.filter(item => ['warning', 'critical'].includes(item.level)).length,
  };
  return {content, statuses, enquiries, submissions, recent, workQueue, workQueueTotal: statuses.draft + statuses.published + statuses.archived, drafts, recentlyEdited, favorites, notifications, system, summary};
}

function resolveGlobalComponents(data, globals) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.sections) || !globals.size) return data;
  return {...data, sections: data.sections.map(section => {
    if (!section || typeof section !== 'object' || !Array.isArray(section.components)) return section;
    return {...section, components: section.components.map(instance => {
      if (!instance || typeof instance !== 'object' || instance.scope !== 'global' || !instance.reusableId) return instance;
      const definition = globals.get(instance.reusableId);
      if (!definition) return instance;
      return {...definition, id: instance.id, enabled: instance.enabled !== false, scope: 'global', reusableId: instance.reusableId, groupId: instance.groupId || ''};
    })};
  })};
}

function publicRecordData(kind, data, globals) {
  if (!data || typeof data !== 'object') return {};
  const {editorHistory: _editorHistory, ...withoutHistory} = data;
  if (kind === 'page') {
    const {componentLibrary: _library, ...publicData} = withoutHistory;
    return resolveGlobalComponents(publicData, globals);
  }
  if (kind === 'settings') {
    const {globalComponents: _globalComponents, ...publicData} = withoutHistory;
    return publicData;
  }
  return withoutHistory;
}

function publicSitePayload() {
  const rows = db.prepare(`SELECT id, kind, slug, title, published_data, position, published_at, updated_at
    FROM content_records WHERE status = 'published' AND published_data IS NOT NULL ORDER BY kind, position, updated_at DESC`).all();
  const settings = rows.find(row => row.kind === 'settings');
  const settingsData = settings ? safeJson(settings.published_data, {}) : {};
  const globalComponents = new Map((Array.isArray(settingsData.globalComponents) ? settingsData.globalComponents : []).flatMap(item => item && typeof item === 'object' && item.id && item.component ? [[String(item.id), item.component]] : []));
  const records = rows.map(row => ({id: row.id, kind: row.kind, slug: row.slug, title: row.title, data: publicRecordData(row.kind, safeJson(row.published_data, {}), globalComponents), position: Number(row.position || 0), publishedAt: row.published_at}));
  const navigation = db.prepare('SELECT * FROM navigation_items WHERE active = 1 ORDER BY menu, position, created_at').all().map(navigationRecord);
  const forms = db.prepare('SELECT * FROM site_forms WHERE active = 1 ORDER BY position, created_at').all().map(row => formRecord(row, {publicView: true}));
  const media = db.prepare('SELECT * FROM media_assets WHERE active = 1 ORDER BY position, created_at').all().map(mediaRecord);
  return {records, navigation, forms, media, generatedAt: nowIso()};
}

function serveMediaFile(row, req, res, {publicCache = false, storedName = row?.stored_name, mimeType = row?.mime_type, filename = row?.filename} = {}) {
  if (!row) throw new ApiError(404, 'not_found', 'Media file not found.');
  const file = safeMediaPath(storedName);
  if (!existsSync(file)) throw new ApiError(404, 'media_file_missing', 'The stored media file is missing. Upload it again or remove the asset record.');
  const size = statSync(file).size;
  const downloadName = encodeURIComponent(filename).replace(/[!'()*]/g, character => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
  const headers = {'Content-Type': mimeType, 'Content-Disposition': `inline; filename*=UTF-8''${downloadName}`, 'Cache-Control': publicCache ? 'public, max-age=300' : 'private, max-age=300', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'SAMEORIGIN', 'Cross-Origin-Resource-Policy': 'same-origin', 'Accept-Ranges': 'bytes'};
  const range = String(req.headers.range || '');
  if (range) {
    const match = range.match(/^bytes=(\d*)-(\d*)$/);
    if (!match || (!match[1] && !match[2])) {
      res.writeHead(416, {...headers, 'Content-Range': `bytes */${size}`});
      return res.end();
    }
    let start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
    let end = match[2] && match[1] ? Number(match[2]) : size - 1;
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || start >= size) {
      res.writeHead(416, {...headers, 'Content-Range': `bytes */${size}`});
      return res.end();
    }
    end = Math.min(end, size - 1);
    res.writeHead(206, {...headers, 'Content-Length': end - start + 1, 'Content-Range': `bytes ${start}-${end}/${size}`});
    return createReadStream(file, {start, end}).pipe(res);
  }
  res.writeHead(200, {...headers, 'Content-Length': size});
  return createReadStream(file).pipe(res);
}

function safeMediaPath(storedName) {
  if (!/^[a-f0-9-]{36}(?:-[0-9]{2,4})?\.(?:jpg|png|webp|pdf|mp4|webm)$/i.test(String(storedName || ''))) throw new ApiError(500, 'invalid_media_record', 'The stored media record is invalid.');
  const file = resolve(MEDIA_DIR, storedName);
  if (!file.startsWith(`${MEDIA_DIR}${sep}`)) throw new ApiError(500, 'invalid_media_record', 'The stored media record is invalid.');
  return file;
}

function parseMediaJson(value, fallback) {
  try { return JSON.parse(value || JSON.stringify(fallback)); } catch { return fallback; }
}

function cleanMediaMetadata(value = {}, current = {}) {
  const input = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return {
    credit: cleanText(input.credit ?? current.credit, 'credit', {max: 180, optional: true}),
    copyright: cleanText(input.copyright ?? current.copyright, 'copyright', {max: 240, optional: true}),
    license: cleanText(input.license ?? current.license, 'license', {max: 180, optional: true}),
    tags: cleanText(input.tags ?? current.tags, 'tags', {max: 600, optional: true}),
  };
}

function decodeMediaBody(body) {
  const extension = MEDIA_TYPES[body.mimeType];
  if (!extension) throw new ApiError(400, 'invalid_media_type', 'Upload a JPG, PNG, WEBP, PDF, MP4 or WEBM file.');
  const encoded = String(body.base64 || '');
  if (!encoded || encoded.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) throw new ApiError(400, 'invalid_media_encoding', 'The uploaded file is not valid base64 data.');
  const buffer = Buffer.from(encoded, 'base64');
  if (!buffer.length || buffer.length > 25 * 1024 * 1024) throw new ApiError(413, 'invalid_media_size', 'Files must be between 1 byte and 25 MB.');
  if (!MEDIA_SIGNATURES[body.mimeType](buffer)) throw new ApiError(400, 'invalid_media_signature', 'The file contents do not match the selected file type.');
  return {buffer, extension, mimeType: body.mimeType};
}

async function prepareMediaFiles(body, storageBase) {
  const decoded = decodeMediaBody(body);
  if (!decoded.mimeType.startsWith('image/')) return {...decoded, width: null, height: null, variants: []};
  try {
    const source = sharp(decoded.buffer, {failOn: 'error'}).rotate();
    const info = await source.metadata();
    let pipeline = source.resize({width: 2560, withoutEnlargement: true});
    if (decoded.mimeType === 'image/jpeg') pipeline = pipeline.jpeg({quality: 86, mozjpeg: true});
    else if (decoded.mimeType === 'image/png') pipeline = pipeline.png({compressionLevel: 9, adaptiveFiltering: true});
    else pipeline = pipeline.webp({quality: 84, effort: 5});
    const buffer = await pipeline.toBuffer();
    const optimized = await sharp(buffer).metadata();
    const variants = [];
    for (const width of [480, 960, 1440]) {
      if (!optimized.width || optimized.width <= width) continue;
      const variantBuffer = await sharp(buffer).resize({width, withoutEnlargement: true}).webp({quality: 80, effort: 5}).toBuffer();
      variants.push({width, height: optimized.height && optimized.width ? Math.round(optimized.height * width / optimized.width) : null, storedName: `${storageBase}-${width}.webp`, mimeType: 'image/webp', size: variantBuffer.length, buffer: variantBuffer});
    }
    return {...decoded, buffer, width: optimized.width || info.width || null, height: optimized.height || info.height || null, variants};
  } catch {
    throw new ApiError(400, 'invalid_image', 'The image could not be decoded or optimized.');
  }
}

function writePreparedMedia(prepared, storedName) {
  const written = [];
  try {
    writeFileSync(safeMediaPath(storedName), prepared.buffer, {flag: 'wx'});
    written.push(storedName);
    prepared.variants.forEach(variant => { writeFileSync(safeMediaPath(variant.storedName), variant.buffer, {flag: 'wx'}); written.push(variant.storedName); });
    return written;
  } catch (error) {
    written.forEach(name => { try { unlinkSync(safeMediaPath(name)); } catch {} });
    throw error;
  }
}

function removeStoredMedia(row) {
  const names = [row.stored_name, ...parseMediaJson(row.variants_json, []).map(item => item.storedName)].filter(Boolean);
  names.forEach(name => { try { unlinkSync(safeMediaPath(name)); } catch (error) { if (error.code !== 'ENOENT') console.error('[admin-api] Media file cleanup failed.', error); } });
}

function mediaUsage(row) {
  const needles = [row.id, `/api/admin/media/${row.id}/file`];
  const usages = [];
  const visit = (value, path, add) => {
    if (typeof value === 'string' && needles.some(needle => value.includes(needle))) add(path);
    else if (Array.isArray(value)) value.forEach((item, index) => visit(item, `${path}[${index}]`, add));
    else if (value && typeof value === 'object') Object.entries(value).forEach(([key, item]) => visit(item, path ? `${path}.${key}` : key, add));
  };
  db.prepare('SELECT id, kind, slug, title, status, draft_data, published_data FROM content_records').all().forEach(record => {
    for (const [state, encoded] of [['draft', record.draft_data], ['published', record.published_data]]) {
      if (!encoded || !needles.some(needle => encoded.includes(needle))) continue;
      const paths = new Set();
      try { visit(JSON.parse(encoded), '', path => paths.add(path || 'content')); } catch {}
      paths.forEach(path => usages.push({source: 'content', id: record.id, kind: record.kind, slug: record.slug, title: record.title, state, path}));
    }
  });
  return usages.slice(0, 200);
}

async function handleRequest(req, res) {
  const url = new URL(req.url || '/', `http://${HOST}:${PORT}`);
  if (!url.pathname.startsWith(API_PREFIX)) {
    if (req.method === 'GET' && serveSite(url.pathname, res)) return;
    return sendJson(res, 404, {error: {code: 'not_found', message: 'API route not found.'}});
  }
  if (req.method === 'OPTIONS') return sendJson(res, 204, {});
  verifyOrigin(req);
  const parts = pathParts(url.pathname);

  if (req.method === 'GET' && parts[0] === 'health') {
    const schemaVersion = Number(db.prepare('SELECT COALESCE(MAX(version), 0) AS version FROM schema_migrations').get().version);
    return sendJson(res, 200, {ok: true, service: 'nk-admin-api', schemaVersion, database: 'ok', media: existsSync(MEDIA_DIR) ? 'ok' : 'unavailable', time: nowIso()});
  }

  if (req.method === 'GET' && parts[0] === 'public' && parts[1] === 'site') {
    return sendJson(res, 200, publicSitePayload(), {'Cache-Control': 'public, max-age=30, stale-while-revalidate=120'});
  }

  if (req.method === 'POST' && parts[0] === 'public' && parts[1] === 'submissions') {
    checkSubmissionRate(req);
    const body = await readJson(req, 250_000);
    const form = db.prepare('SELECT * FROM site_forms WHERE slug = ? AND active = 1').get(String(body.formSlug || ''));
    if (!form) throw new ApiError(404, 'form_unavailable', 'This form is not currently accepting submissions.');
    const payload = validateSubmission(form, body);
    const id = newId();
    const createdAt = nowIso();
    transaction(() => {
      db.prepare(`INSERT INTO form_submissions
        (id, form_id, status, payload, notes, ip_address, user_agent, created_at, updated_at)
        VALUES (?, ?, 'new', ?, '', ?, ?, ?, ?)`)
        .run(id, form.id, JSON.stringify(payload), requestIp(req), String(req.headers['user-agent'] || '').slice(0, 500), createdAt, createdAt);
      audit({action: 'submission.created', entityType: 'submission', entityId: id, details: {form: form.slug}, ipAddress: requestIp(req)});
    });
    return sendJson(res, 201, {ok: true, submissionId: id, message: form.success_message});
  }

  if (req.method === 'GET' && parts[0] === 'media' && parts[1] && parts[2] === 'file') {
    const row = db.prepare('SELECT * FROM media_assets WHERE id = ? AND active = 1').get(parts[1]);
    return serveMediaFile(row, req, res, {publicCache: true});
  }

  if (req.method === 'GET' && parts[0] === 'media' && parts[1] && parts[2] === 'variant' && parts[3]) {
    const row = db.prepare('SELECT * FROM media_assets WHERE id = ? AND active = 1').get(parts[1]);
    if (!row) throw new ApiError(404, 'not_found', 'Media file not found.');
    const variant = parseMediaJson(row.variants_json, []).find(item => String(item.width) === parts[3]);
    if (!variant) throw new ApiError(404, 'not_found', 'Responsive image variant not found.');
    return serveMediaFile(row, req, res, {publicCache: true, storedName: variant.storedName, mimeType: variant.mimeType, filename: `${row.filename.replace(/\.[^.]+$/, '')}-${variant.width}.webp`});
  }

  if (req.method === 'GET' && parts[0] === 'setup') {
    const userCount = db.prepare('SELECT COUNT(*) AS count FROM admin_users').get().count;
    return sendJson(res, 200, {needsSetup: userCount === 0, requiresBootstrapToken: !ALLOW_LOOPBACK_SETUP});
  }

  if (req.method === 'POST' && parts[0] === 'setup') {
    const userCount = db.prepare('SELECT COUNT(*) AS count FROM admin_users').get().count;
    if (userCount > 0) throw new ApiError(409, 'already_configured', 'The admin owner has already been configured.');
    const body = await readJson(req);
    if ((!ALLOW_LOOPBACK_SETUP || !isLoopback(req)) && (!process.env.ADMIN_BOOTSTRAP_TOKEN || !safeEqual(body.bootstrapToken, process.env.ADMIN_BOOTSTRAP_TOKEN))) {
      throw new ApiError(403, 'bootstrap_denied', 'A valid server bootstrap token is required.');
    }
    const email = normalizeEmail(body.email);
    const displayName = cleanText(body.displayName, 'displayName', {min: 2, max: 100});
    const passwordHash = hashPassword(body.password);
    const userId = newId();
    const createdAt = nowIso();
    transaction(() => {
      db.prepare(`INSERT INTO admin_users
        (id, email, display_name, password_hash, role, active, password_changed_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'owner', 1, ?, ?, ?)`)
        .run(userId, email, displayName, passwordHash, createdAt, createdAt, createdAt);
      audit({userId, action: 'owner.created', entityType: 'user', entityId: userId, details: {email}, ipAddress: requestIp(req)});
    });
    const user = publicUser(db.prepare('SELECT * FROM admin_users WHERE id = ?').get(userId));
    const session = createSession(user, req);
    return sendJson(res, 201, {user, csrfToken: session.csrf}, {'Set-Cookie': sessionCookie(session.token, session.expiresAt)});
  }

  if (req.method === 'POST' && parts[0] === 'login') {
    const body = await readJson(req);
    const email = normalizeEmail(body.email);
    checkLoginRate(req, email);
    const row = db.prepare('SELECT * FROM admin_users WHERE email = ? COLLATE NOCASE').get(email);
    if (!row || !row.active || !verifyPassword(String(body.password || ''), row.password_hash)) {
      throw new ApiError(401, 'invalid_credentials', 'The email or password is incorrect.');
    }
    clearLoginRate(req, email);
    const user = publicUser(row);
    let session;
    transaction(() => {
      session = createSession(user, req);
      audit({userId: user.id, action: 'session.login', entityType: 'session', details: {}, ipAddress: requestIp(req)});
    });
    return sendJson(res, 200, {user, csrfToken: session.csrf}, {'Set-Cookie': sessionCookie(session.token, session.expiresAt)});
  }

  if (req.method === 'POST' && parts[0] === 'firebase-login') {
    const body = await readJson(req, 50_000);
    const firebaseUser = await verifyFirebaseAdminToken(body.idToken);
    checkLoginRate(req, firebaseUser.email);
    const row = db.prepare('SELECT * FROM admin_users WHERE email = ? COLLATE NOCASE').get(firebaseUser.email);
    if (!row || !row.active) throw new ApiError(403, 'firebase_account_unlinked', 'This Firebase email is not linked to an active local administrator. Use the original local login.');
    clearLoginRate(req, firebaseUser.email);
    const user = publicUser(row);
    let session;
    transaction(() => {
      session = createSession(user, req);
      audit({userId: user.id, action: 'session.firebase_login', entityType: 'session', details: {firebaseUid: firebaseUser.uid}, ipAddress: requestIp(req)});
    });
    return sendJson(res, 200, {user, csrfToken: session.csrf}, {'Set-Cookie': sessionCookie(session.token, session.expiresAt)});
  }

  const auth = requireAuth(req);

  if (req.method === 'GET' && parts[0] === 'session') {
    return sendJson(res, 200, {user: auth.user, csrfToken: auth.session.csrf_token});
  }

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method || '')) requireCsrf(req, auth);

  if (req.method === 'POST' && parts[0] === 'logout') {
    transaction(() => {
      db.prepare('DELETE FROM admin_sessions WHERE id = ?').run(auth.session.id);
      audit({userId: auth.user.id, action: 'session.logout', entityType: 'session', ipAddress: requestIp(req)});
    });
    return sendJson(res, 200, {ok: true}, {'Set-Cookie': clearSessionCookie()});
  }

  if (req.method === 'POST' && parts[0] === 'guide' && parts[1] === 'next') {
    requireContentWrite(auth.user, 'page');
    const body = await readJson(req, 250_000);
    const result = await requestGuideProposal({context: body.context, language: body.language === 'el' ? 'el' : 'en'});
    return sendJson(res, 200, result);
  }

  if (req.method === 'GET' && parts[0] === 'dashboard') return sendJson(res, 200, dashboardPayload(auth.user));

  if (req.method === 'GET' && parts[0] === 'search') {
    return sendJson(res, 200, searchPayload(auth.user, url.searchParams.get('q') || '', url.searchParams.get('type') || 'all', url.searchParams.get('sort') || 'relevance'));
  }

  if (parts[0] === 'favorites' && parts.length === 1 && req.method === 'GET') {
    return sendJson(res, 200, {favorites: resolveFavorites(auth.user)});
  }

  if (parts[0] === 'favorites' && parts[1] && parts[2] && req.method === 'PUT') {
    const entityType = cleanText(parts[1], 'entityType', {max: 40});
    const entityId = cleanText(parts[2], 'entityId', {max: 100});
    assertFavoriteTarget(auth.user, entityType, entityId);
    const body = await readJson(req);
    const active = body.active !== false;
    transaction(() => {
      if (active) db.prepare('INSERT INTO admin_favorites (user_id, entity_type, entity_id, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, entity_type, entity_id) DO UPDATE SET created_at = excluded.created_at').run(auth.user.id, entityType, entityId, nowIso());
      else db.prepare('DELETE FROM admin_favorites WHERE user_id = ? AND entity_type = ? AND entity_id = ?').run(auth.user.id, entityType, entityId);
      audit({userId: auth.user.id, action: active ? 'favorite.pinned' : 'favorite.unpinned', entityType, entityId, details: {}, ipAddress: requestIp(req)});
    });
    return sendJson(res, 200, {active, favorites: resolveFavorites(auth.user)});
  }

  if (parts[0] === 'content' && parts[1] === 'seed' && req.method === 'GET') {
    requireOwner(auth.user);
    const content = db.prepare('SELECT COUNT(*) AS count FROM content_records').get().count;
    const navigation = db.prepare('SELECT COUNT(*) AS count FROM navigation_items').get().count;
    const forms = db.prepare('SELECT COUNT(*) AS count FROM site_forms').get().count;
    return sendJson(res, 200, {needsSeed: content === 0 || navigation === 0 || forms === 0, content, navigation, forms});
  }

  if (parts[0] === 'content' && parts[1] === 'seed' && req.method === 'POST') {
    requireOwner(auth.user);
    const contentExisting = db.prepare('SELECT COUNT(*) AS count FROM content_records').get().count;
    const navigationExisting = db.prepare('SELECT COUNT(*) AS count FROM navigation_items').get().count;
    const formsExisting = db.prepare('SELECT COUNT(*) AS count FROM site_forms').get().count;
    if (contentExisting > 0 && navigationExisting > 0 && formsExisting > 0) return sendJson(res, 200, {inserted: 0, navigationInserted: 0, formsInserted: 0, skipped: true});
    const body = await readJson(req, 5_000_000);
    if (!Array.isArray(body.records) || body.records.length > 250) throw new ApiError(400, 'invalid_seed', 'The seed content is invalid.');
    if (body.navigation != null && (!Array.isArray(body.navigation) || body.navigation.length > 100)) throw new ApiError(400, 'invalid_seed', 'The navigation seed is invalid.');
    if (body.forms != null && (!Array.isArray(body.forms) || body.forms.length > 20)) throw new ApiError(400, 'invalid_seed', 'The forms seed is invalid.');
    const records = body.records.map(record => validateContentInput(record));
    const navigation = (body.navigation || []).map(validateNavigationInput);
    const forms = (body.forms || []).map(validateFormInput);
    let inserted = 0;
    let navigationInserted = 0;
    let formsInserted = 0;
    transaction(() => {
      const createdAt = nowIso();
      if (contentExisting === 0) {
        const insert = db.prepare(`INSERT INTO content_records
          (id, kind, slug, title, status, draft_data, published_data, version, position, category, tags_json, created_by, updated_by, created_at, updated_at, published_at)
          VALUES (?, ?, ?, ?, 'published', ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?)`);
        records.forEach((record, index) => {
          const id = newId();
          const data = JSON.stringify(record.data);
          insert.run(id, record.kind, record.slug, record.title, data, data, index, record.category, JSON.stringify(record.tags), auth.user.id, auth.user.id, createdAt, createdAt, createdAt);
          inserted += 1;
        });
      }
      if (navigationExisting === 0) {
        const insertNavigation = db.prepare(`INSERT INTO navigation_items
          (id, menu, label, url, description, active, position, created_by, updated_by, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        navigation.forEach((item, index) => { insertNavigation.run(newId(), item.menu, item.label, item.url, item.description, item.active ? 1 : 0, item.position || index, auth.user.id, auth.user.id, createdAt, createdAt); navigationInserted += 1; });
      }
      if (formsExisting === 0) {
        const insertForm = db.prepare(`INSERT INTO site_forms
          (id, slug, name, recipient, submit_label, success_message, fields_data, active, position, created_by, updated_by, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        forms.forEach((form, index) => { insertForm.run(newId(), form.slug, form.name, form.recipient, form.submitLabel, form.successMessage, JSON.stringify(form.fields), form.active ? 1 : 0, form.position || index, auth.user.id, auth.user.id, createdAt, createdAt); formsInserted += 1; });
      }
      audit({userId: auth.user.id, action: 'cms.seeded', entityType: 'cms', details: {content: inserted, navigation: navigationInserted, forms: formsInserted}, ipAddress: requestIp(req)});
    });
    return sendJson(res, 201, {inserted, navigationInserted, formsInserted});
  }

  if (parts[0] === 'content' && parts.length === 1 && req.method === 'GET') {
    const kind = url.searchParams.get('kind');
    const requestedKinds = (url.searchParams.get('kinds') || '').split(',').map(value => value.trim()).filter(Boolean);
    if (kind && requestedKinds.length) throw new ApiError(400, 'invalid_kind', 'Choose either one content type or a list of content types.');
    if (kind && !CONTENT_KINDS.includes(kind)) throw new ApiError(400, 'invalid_kind', 'Unsupported content type.');
    if (requestedKinds.some(value => !CONTENT_KINDS.includes(value)) || new Set(requestedKinds).size !== requestedKinds.length) throw new ApiError(400, 'invalid_kind', 'One or more content types are invalid.');
    if (kind) requireContentRead(auth.user, kind);
    requestedKinds.forEach(value => requireContentRead(auth.user, value));
    if (!kind && !requestedKinds.length && !['owner', 'editor', 'viewer'].includes(auth.user.role)) throw new ApiError(403, 'permission_denied', 'Choose an authorised content section.');
    const rows = kind
      ? db.prepare('SELECT * FROM content_records WHERE kind = ? ORDER BY status = ? ASC, position, updated_at DESC').all(kind, 'archived')
      : requestedKinds.length
        ? db.prepare(`SELECT * FROM content_records WHERE kind IN (${requestedKinds.map(() => '?').join(',')}) ORDER BY kind, position, updated_at DESC`).all(...requestedKinds)
        : db.prepare('SELECT * FROM content_records ORDER BY kind, position, updated_at DESC').all();
    return sendJson(res, 200, {records: rows.map(contentRecord)});
  }

  if (parts[0] === 'content' && parts[1] === 'reorder' && req.method === 'PATCH') {
    const body = await readJson(req);
    if (!CONTENT_KINDS.includes(body.kind) || !Array.isArray(body.ids) || body.ids.length > 250 || body.ids.some(id => typeof id !== 'string')) throw new ApiError(400, 'invalid_order', 'The content order is invalid.');
    requireContentWrite(auth.user, body.kind);
    const rows = db.prepare(`SELECT id FROM content_records WHERE kind = ? AND id IN (${body.ids.map(() => '?').join(',') || "''"})`).all(body.kind, ...body.ids);
    if (rows.length !== body.ids.length) throw new ApiError(400, 'invalid_order', 'One or more records do not belong to this section.');
    transaction(() => {
      body.ids.forEach((id, position) => db.prepare('UPDATE content_records SET position = ?, updated_at = ?, updated_by = ? WHERE id = ?').run(position, nowIso(), auth.user.id, id));
      audit({userId: auth.user.id, action: 'content.reordered', entityType: body.kind, details: {count: body.ids.length}, ipAddress: requestIp(req)});
    });
    return sendJson(res, 200, {ok: true});
  }

  if (parts[0] === 'content' && parts[1] === 'bulk' && req.method === 'POST') {
    const body = await readJson(req, 500_000);
    const action = String(body.action || '');
    const allowed = ['publish', 'unpublish', 'archive', 'set-category', 'add-tags', 'remove-tags'];
    if (!allowed.includes(action) || !Array.isArray(body.items) || body.items.length < 1 || body.items.length > 100) throw new ApiError(400, 'invalid_bulk_action', 'Choose between 1 and 100 records and a valid bulk action.');
    const items = body.items.map(item => ({id: cleanText(item?.id, 'id', {max: 100}), version: Number(item?.version)}));
    if (items.some(item => !Number.isInteger(item.version) || item.version < 1) || new Set(items.map(item => item.id)).size !== items.length) throw new ApiError(400, 'invalid_bulk_action', 'The selected record versions are invalid. Refresh and try again.');
    const placeholders = items.map(() => '?').join(',');
    const rows = db.prepare(`SELECT * FROM content_records WHERE id IN (${placeholders})`).all(...items.map(item => item.id));
    if (rows.length !== items.length) throw new ApiError(404, 'not_found', 'One or more selected records no longer exist.');
    rows.forEach(row => requireContentWrite(auth.user, row.kind));
    if (action === 'publish') rows.forEach(assertPublishReady);
    const category = action === 'set-category' ? cleanText(body.category, 'category', {max: 100, optional: true}) : '';
    const inputTags = ['add-tags', 'remove-tags'].includes(action) ? (Array.isArray(body.tags) ? body.tags : []).map(tag => cleanText(tag, 'tag', {max: 80})).filter(Boolean) : [];
    if (['add-tags', 'remove-tags'].includes(action) && (!inputTags.length || inputTags.length > 20)) throw new ApiError(400, 'invalid_bulk_tags', 'Choose between 1 and 20 valid tags.');
    const changedAt = nowIso();
    const changed = [];
    transaction(() => {
      for (const row of rows) {
        const expected = items.find(item => item.id === row.id).version;
        let result;
        if (action === 'publish') result = db.prepare(`UPDATE content_records SET status = 'published', published_data = draft_data, published_at = ?, version = version + 1, updated_at = ?, updated_by = ? WHERE id = ? AND version = ?`).run(changedAt, changedAt, auth.user.id, row.id, expected);
        else if (action === 'unpublish') result = db.prepare(`UPDATE content_records SET status = 'draft', published_data = NULL, published_at = NULL, version = version + 1, updated_at = ?, updated_by = ? WHERE id = ? AND version = ?`).run(changedAt, auth.user.id, row.id, expected);
        else if (action === 'archive') result = db.prepare(`UPDATE content_records SET status = 'archived', version = version + 1, updated_at = ?, updated_by = ? WHERE id = ? AND version = ?`).run(changedAt, auth.user.id, row.id, expected);
        else if (action === 'set-category') result = db.prepare(`UPDATE content_records SET category = ?, version = version + 1, updated_at = ?, updated_by = ? WHERE id = ? AND version = ?`).run(category, changedAt, auth.user.id, row.id, expected);
        else {
          const currentTags = parseTags(row.tags_json);
          const tags = action === 'add-tags' ? [...new Set([...currentTags, ...inputTags])].slice(0, 20) : currentTags.filter(tag => !inputTags.includes(tag));
          result = db.prepare(`UPDATE content_records SET tags_json = ?, version = version + 1, updated_at = ?, updated_by = ? WHERE id = ? AND version = ?`).run(JSON.stringify(tags), changedAt, auth.user.id, row.id, expected);
        }
        if (result.changes !== 1) throw new ApiError(409, 'version_conflict', `“${row.title}” changed while the bulk action was running. Refresh and try again.`);
        const updated = db.prepare('SELECT * FROM content_records WHERE id = ?').get(row.id);
        saveRevision(updated, `bulk:${action}`, auth.user.id);
        changed.push(contentRecord(updated));
      }
      audit({userId: auth.user.id, action: `content.bulk.${action}`, entityType: 'content', details: {count: changed.length, ids: changed.map(record => record.id)}, ipAddress: requestIp(req)});
    });
    return sendJson(res, 200, {records: changed, action});
  }

  if (parts[0] === 'content' && parts.length === 1 && req.method === 'POST') {
    const input = validateContentInput(await readJson(req));
    requireContentWrite(auth.user, input.kind);
    const id = newId();
    const createdAt = nowIso();
    const position = db.prepare('SELECT COALESCE(MAX(position), -1) + 1 AS position FROM content_records WHERE kind = ?').get(input.kind).position;
    let row;
    transaction(() => {
      db.prepare(`INSERT INTO content_records
        (id, kind, slug, title, status, draft_data, version, position, category, tags_json, created_by, updated_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'draft', ?, 1, ?, ?, ?, ?, ?, ?, ?)`)
        .run(id, input.kind, input.slug, input.title, JSON.stringify(input.data), position, input.category, JSON.stringify(input.tags), auth.user.id, auth.user.id, createdAt, createdAt);
      row = db.prepare('SELECT * FROM content_records WHERE id = ?').get(id);
      saveRevision(row, 'created', auth.user.id);
      audit({userId: auth.user.id, action: 'content.created', entityType: input.kind, entityId: id, details: {title: input.title, slug: input.slug}, ipAddress: requestIp(req)});
    });
    return sendJson(res, 201, {record: contentRecord(row)});
  }

  if (parts[0] === 'content' && parts[1] && parts.length === 2 && req.method === 'PUT') {
    const input = validateContentInput(await readJson(req), {partial: true});
    const current = db.prepare('SELECT * FROM content_records WHERE id = ?').get(parts[1]);
    if (!current) throw new ApiError(404, 'not_found', 'Content record not found.');
    if (input.kind !== current.kind) throw new ApiError(400, 'kind_immutable', 'The content type cannot be changed.');
    requireContentWrite(auth.user, current.kind);
    const status = current.published_data ? 'draft' : current.status === 'archived' ? 'archived' : 'draft';
    let row;
    transaction(() => {
      const result = db.prepare(`UPDATE content_records SET title = ?, slug = ?, status = ?, draft_data = ?, category = ?, tags_json = ?, version = version + 1, updated_by = ?, updated_at = ?
        WHERE id = ? AND version = ?`)
        .run(input.title, input.slug, status, JSON.stringify(input.data), input.category, JSON.stringify(input.tags), auth.user.id, nowIso(), current.id, input.expectedVersion);
      if (result.changes !== 1) throw new ApiError(409, 'version_conflict', 'Someone else updated this record. Refresh before saving again.');
      row = db.prepare('SELECT * FROM content_records WHERE id = ?').get(current.id);
      saveRevision(row, 'updated', auth.user.id);
      audit({userId: auth.user.id, action: 'content.updated', entityType: current.kind, entityId: current.id, details: {title: input.title, version: row.version}, ipAddress: requestIp(req)});
    });
    return sendJson(res, 200, {record: contentRecord(row)});
  }

  if (parts[0] === 'content' && parts[1] && parts[2] === 'publish' && req.method === 'POST') {
    const current = db.prepare('SELECT * FROM content_records WHERE id = ?').get(parts[1]);
    if (!current) throw new ApiError(404, 'not_found', 'Content record not found.');
    requireContentWrite(auth.user, current.kind);
    assertPublishReady(current);
    const version = await expectedVersion(req);
    const updatedAt = nowIso();
    let row;
    transaction(() => {
      const result = db.prepare(`UPDATE content_records SET status = 'published', published_data = draft_data, version = version + 1,
        published_at = ?, updated_at = ?, updated_by = ? WHERE id = ? AND version = ?`).run(updatedAt, updatedAt, auth.user.id, current.id, version);
      if (result.changes !== 1) throw new ApiError(409, 'version_conflict', 'Someone else updated this record. Refresh before publishing.');
      row = db.prepare('SELECT * FROM content_records WHERE id = ?').get(current.id);
      saveRevision(row, 'published', auth.user.id);
      audit({userId: auth.user.id, action: 'content.published', entityType: current.kind, entityId: current.id, details: {title: current.title, version: row.version}, ipAddress: requestIp(req)});
    });
    return sendJson(res, 200, {record: contentRecord(row)});
  }

  if (parts[0] === 'content' && parts[1] && parts[2] === 'unpublish' && req.method === 'POST') {
    const current = db.prepare('SELECT * FROM content_records WHERE id = ?').get(parts[1]);
    if (!current) throw new ApiError(404, 'not_found', 'Content record not found.');
    requireContentWrite(auth.user, current.kind);
    const version = await expectedVersion(req);
    let row;
    transaction(() => {
      const result = db.prepare(`UPDATE content_records SET status = 'draft', published_data = NULL, published_at = NULL, version = version + 1, updated_at = ?, updated_by = ? WHERE id = ? AND version = ?`).run(nowIso(), auth.user.id, current.id, version);
      if (result.changes !== 1) throw new ApiError(409, 'version_conflict', 'Someone else updated this record. Refresh before taking it offline.');
      row = db.prepare('SELECT * FROM content_records WHERE id = ?').get(current.id);
      saveRevision(row, 'unpublished', auth.user.id);
      audit({userId: auth.user.id, action: 'content.unpublished', entityType: current.kind, entityId: current.id, details: {title: current.title}, ipAddress: requestIp(req)});
    });
    return sendJson(res, 200, {record: contentRecord(row)});
  }

  if (parts[0] === 'content' && parts[1] && parts[2] === 'duplicate' && req.method === 'POST') {
    const current = db.prepare('SELECT * FROM content_records WHERE id = ?').get(parts[1]);
    if (!current) throw new ApiError(404, 'not_found', 'Content record not found.');
    requireContentWrite(auth.user, current.kind);
    let suffix = 2;
    let slug = `${current.slug}-copy`;
    while (db.prepare('SELECT 1 FROM content_records WHERE kind = ? AND slug = ?').get(current.kind, slug)) slug = `${current.slug}-copy-${suffix++}`;
    const id = newId();
    const createdAt = nowIso();
    const position = db.prepare('SELECT COALESCE(MAX(position), -1) + 1 AS position FROM content_records WHERE kind = ?').get(current.kind).position;
    let row;
    transaction(() => {
      db.prepare(`INSERT INTO content_records
        (id, kind, slug, title, status, draft_data, published_data, version, position, category, tags_json, created_by, updated_by, created_at, updated_at, published_at)
        VALUES (?, ?, ?, ?, 'draft', ?, NULL, 1, ?, ?, ?, ?, ?, ?, ?, NULL)`)
        .run(id, current.kind, slug, `${current.title} copy`, current.draft_data, position, current.category || '', current.tags_json || '[]', auth.user.id, auth.user.id, createdAt, createdAt);
      row = db.prepare('SELECT * FROM content_records WHERE id = ?').get(id);
      saveRevision(row, 'duplicated', auth.user.id);
      audit({userId: auth.user.id, action: 'content.duplicated', entityType: current.kind, entityId: id, details: {sourceId: current.id}, ipAddress: requestIp(req)});
    });
    return sendJson(res, 201, {record: contentRecord(row)});
  }

  if (parts[0] === 'content' && parts[1] && parts[2] === 'archive' && req.method === 'POST') {
    const current = db.prepare('SELECT * FROM content_records WHERE id = ?').get(parts[1]);
    if (!current) throw new ApiError(404, 'not_found', 'Content record not found.');
    requireContentWrite(auth.user, current.kind);
    const version = await expectedVersion(req);
    let row;
    transaction(() => {
      const result = db.prepare(`UPDATE content_records SET status = 'archived', version = version + 1, updated_at = ?, updated_by = ? WHERE id = ? AND version = ?`).run(nowIso(), auth.user.id, current.id, version);
      if (result.changes !== 1) throw new ApiError(409, 'version_conflict', 'Someone else updated this record. Refresh before archiving.');
      row = db.prepare('SELECT * FROM content_records WHERE id = ?').get(current.id);
      saveRevision(row, 'archived', auth.user.id);
      audit({userId: auth.user.id, action: 'content.archived', entityType: current.kind, entityId: current.id, details: {title: current.title}, ipAddress: requestIp(req)});
    });
    return sendJson(res, 200, {record: contentRecord(row)});
  }

  if (parts[0] === 'content' && parts[1] && parts.length === 2 && req.method === 'DELETE') {
    requireOwner(auth.user);
    const current = db.prepare('SELECT * FROM content_records WHERE id = ?').get(parts[1]);
    if (!current) throw new ApiError(404, 'not_found', 'Content record not found.');
    transaction(() => {
      db.prepare("DELETE FROM admin_favorites WHERE entity_type = 'content' AND entity_id = ?").run(current.id);
      db.prepare('DELETE FROM content_records WHERE id = ?').run(current.id);
      audit({userId: auth.user.id, action: 'content.deleted', entityType: current.kind, entityId: current.id, details: {title: current.title, slug: current.slug}, ipAddress: requestIp(req)});
    });
    return sendJson(res, 200, {ok: true});
  }

  if (parts[0] === 'content' && parts[1] && parts[2] === 'revisions' && parts.length === 3 && req.method === 'GET') {
    const current = db.prepare('SELECT * FROM content_records WHERE id = ?').get(parts[1]);
    if (!current) throw new ApiError(404, 'not_found', 'Content record not found.');
    requireContentRead(auth.user, current.kind);
    const revisions = db.prepare(`SELECT r.*, u.display_name FROM content_revisions r LEFT JOIN admin_users u ON u.id = r.created_by
      WHERE r.record_id = ? ORDER BY r.version DESC LIMIT 50`).all(current.id).map(row => ({id: row.id, version: row.version, title: row.title, slug: row.slug, status: row.status, data: JSON.parse(row.data), action: row.action, createdAt: row.created_at, createdBy: row.display_name || 'System'}));
    return sendJson(res, 200, {revisions});
  }

  if (parts[0] === 'content' && parts[1] && parts[2] === 'revisions' && parts[3] && parts[4] === 'restore' && req.method === 'POST') {
    const current = db.prepare('SELECT * FROM content_records WHERE id = ?').get(parts[1]);
    const revision = db.prepare('SELECT * FROM content_revisions WHERE id = ? AND record_id = ?').get(parts[3], parts[1]);
    if (!current || !revision) throw new ApiError(404, 'not_found', 'Revision not found.');
    requireContentWrite(auth.user, current.kind);
    const version = await expectedVersion(req);
    let row;
    transaction(() => {
      const result = db.prepare(`UPDATE content_records SET title = ?, slug = ?, status = 'draft', draft_data = ?, version = version + 1, updated_at = ?, updated_by = ? WHERE id = ? AND version = ?`)
        .run(revision.title, revision.slug, revision.data, nowIso(), auth.user.id, current.id, version);
      if (result.changes !== 1) throw new ApiError(409, 'version_conflict', 'Someone else updated this record. Refresh before restoring a revision.');
      row = db.prepare('SELECT * FROM content_records WHERE id = ?').get(current.id);
      saveRevision(row, 'restored', auth.user.id);
      audit({userId: auth.user.id, action: 'content.restored', entityType: current.kind, entityId: current.id, details: {fromVersion: revision.version}, ipAddress: requestIp(req)});
    });
    return sendJson(res, 200, {record: contentRecord(row)});
  }

  if (parts[0] === 'navigation' && parts.length === 1 && req.method === 'GET') {
    if (!['owner', 'editor', 'viewer'].includes(auth.user.role)) throw new ApiError(403, 'permission_denied', 'You do not have permission to view navigation.');
    const menu = url.searchParams.get('menu');
    if (menu && !NAVIGATION_MENUS.includes(menu)) throw new ApiError(400, 'invalid_menu', 'Choose a valid navigation menu.');
    const rows = menu ? db.prepare('SELECT * FROM navigation_items WHERE menu = ? ORDER BY position, created_at').all(menu) : db.prepare('SELECT * FROM navigation_items ORDER BY menu, position, created_at').all();
    return sendJson(res, 200, {items: rows.map(navigationRecord)});
  }

  if (parts[0] === 'navigation' && parts.length === 1 && req.method === 'POST') {
    requireSiteStructure(auth.user);
    const input = validateNavigationInput(await readJson(req));
    const id = newId();
    const createdAt = nowIso();
    const position = db.prepare('SELECT COALESCE(MAX(position), -1) + 1 AS position FROM navigation_items WHERE menu = ?').get(input.menu).position;
    transaction(() => {
      db.prepare(`INSERT INTO navigation_items (id, menu, label, url, description, active, position, created_by, updated_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, input.menu, input.label, input.url, input.description, input.active ? 1 : 0, position, auth.user.id, auth.user.id, createdAt, createdAt);
      audit({userId: auth.user.id, action: 'navigation.created', entityType: 'navigation', entityId: id, details: {menu: input.menu, label: input.label}, ipAddress: requestIp(req)});
    });
    return sendJson(res, 201, {item: navigationRecord(db.prepare('SELECT * FROM navigation_items WHERE id = ?').get(id))});
  }

  if (parts[0] === 'navigation' && parts[1] === 'reorder' && req.method === 'PATCH') {
    requireSiteStructure(auth.user);
    const body = await readJson(req);
    if (!NAVIGATION_MENUS.includes(body.menu) || !Array.isArray(body.ids) || body.ids.length > 100 || body.ids.some(id => typeof id !== 'string')) throw new ApiError(400, 'invalid_order', 'The navigation order is invalid.');
    const rows = db.prepare(`SELECT id FROM navigation_items WHERE menu = ? AND id IN (${body.ids.map(() => '?').join(',') || "''"})`).all(body.menu, ...body.ids);
    if (rows.length !== body.ids.length) throw new ApiError(400, 'invalid_order', 'One or more links do not belong to this menu.');
    transaction(() => {
      body.ids.forEach((id, position) => db.prepare('UPDATE navigation_items SET position = ?, updated_by = ?, updated_at = ? WHERE id = ?').run(position, auth.user.id, nowIso(), id));
      audit({userId: auth.user.id, action: 'navigation.reordered', entityType: 'navigation', details: {menu: body.menu}, ipAddress: requestIp(req)});
    });
    return sendJson(res, 200, {ok: true});
  }

  if (parts[0] === 'navigation' && parts[1] && parts.length === 2 && req.method === 'PATCH') {
    requireSiteStructure(auth.user);
    const current = db.prepare('SELECT * FROM navigation_items WHERE id = ?').get(parts[1]);
    if (!current) throw new ApiError(404, 'not_found', 'Navigation item not found.');
    const input = validateNavigationInput({...current, ...(await readJson(req))});
    transaction(() => {
      db.prepare(`UPDATE navigation_items SET menu = ?, label = ?, url = ?, description = ?, active = ?, updated_by = ?, updated_at = ? WHERE id = ?`)
        .run(input.menu, input.label, input.url, input.description, input.active ? 1 : 0, auth.user.id, nowIso(), current.id);
      audit({userId: auth.user.id, action: 'navigation.updated', entityType: 'navigation', entityId: current.id, details: {menu: input.menu, active: input.active}, ipAddress: requestIp(req)});
    });
    return sendJson(res, 200, {item: navigationRecord(db.prepare('SELECT * FROM navigation_items WHERE id = ?').get(current.id))});
  }

  if (parts[0] === 'navigation' && parts[1] && parts[2] === 'duplicate' && req.method === 'POST') {
    requireSiteStructure(auth.user);
    const current = db.prepare('SELECT * FROM navigation_items WHERE id = ?').get(parts[1]);
    if (!current) throw new ApiError(404, 'not_found', 'Navigation item not found.');
    const id = newId(); const createdAt = nowIso();
    const position = db.prepare('SELECT COALESCE(MAX(position), -1) + 1 AS position FROM navigation_items WHERE menu = ?').get(current.menu).position;
    transaction(() => {
      db.prepare(`INSERT INTO navigation_items (id, menu, label, url, description, active, position, created_by, updated_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)`).run(id, current.menu, `${current.label} copy`, current.url, current.description, position, auth.user.id, auth.user.id, createdAt, createdAt);
      audit({userId: auth.user.id, action: 'navigation.duplicated', entityType: 'navigation', entityId: id, details: {sourceId: current.id}, ipAddress: requestIp(req)});
    });
    return sendJson(res, 201, {item: navigationRecord(db.prepare('SELECT * FROM navigation_items WHERE id = ?').get(id))});
  }

  if (parts[0] === 'navigation' && parts[1] && parts.length === 2 && req.method === 'DELETE') {
    requireOwner(auth.user);
    const current = db.prepare('SELECT * FROM navigation_items WHERE id = ?').get(parts[1]);
    if (!current) throw new ApiError(404, 'not_found', 'Navigation item not found.');
    transaction(() => {
      db.prepare('DELETE FROM navigation_items WHERE id = ?').run(current.id);
      audit({userId: auth.user.id, action: 'navigation.deleted', entityType: 'navigation', entityId: current.id, details: {label: current.label}, ipAddress: requestIp(req)});
    });
    return sendJson(res, 200, {ok: true});
  }

  if (parts[0] === 'forms' && parts.length === 1 && req.method === 'GET') {
    requireFormsRead(auth.user);
    return sendJson(res, 200, {forms: db.prepare('SELECT * FROM site_forms ORDER BY position, created_at').all().map(formRecord)});
  }

  if (parts[0] === 'forms' && parts.length === 1 && req.method === 'POST') {
    requireFormsWrite(auth.user);
    const input = validateFormInput(await readJson(req));
    const id = newId(); const createdAt = nowIso();
    const position = db.prepare('SELECT COALESCE(MAX(position), -1) + 1 AS position FROM site_forms').get().position;
    transaction(() => {
      db.prepare(`INSERT INTO site_forms (id, slug, name, recipient, submit_label, success_message, fields_data, active, position, created_by, updated_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, input.slug, input.name, input.recipient, input.submitLabel, input.successMessage, JSON.stringify(input.fields), input.active ? 1 : 0, position, auth.user.id, auth.user.id, createdAt, createdAt);
      audit({userId: auth.user.id, action: 'form.created', entityType: 'form', entityId: id, details: {slug: input.slug}, ipAddress: requestIp(req)});
    });
    return sendJson(res, 201, {form: formRecord(db.prepare('SELECT * FROM site_forms WHERE id = ?').get(id))});
  }

  if (parts[0] === 'forms' && parts[1] === 'reorder' && req.method === 'PATCH') {
    requireFormsWrite(auth.user);
    const body = await readJson(req);
    if (!Array.isArray(body.ids) || body.ids.length > 50 || body.ids.some(id => typeof id !== 'string')) throw new ApiError(400, 'invalid_order', 'The form order is invalid.');
    const rows = db.prepare(`SELECT id FROM site_forms WHERE id IN (${body.ids.map(() => '?').join(',') || "''"})`).all(...body.ids);
    if (rows.length !== body.ids.length) throw new ApiError(400, 'invalid_order', 'One or more forms are invalid.');
    transaction(() => {
      body.ids.forEach((id, position) => db.prepare('UPDATE site_forms SET position = ?, updated_by = ?, updated_at = ? WHERE id = ?').run(position, auth.user.id, nowIso(), id));
      audit({userId: auth.user.id, action: 'forms.reordered', entityType: 'form', details: {count: body.ids.length}, ipAddress: requestIp(req)});
    });
    return sendJson(res, 200, {ok: true});
  }

  if (parts[0] === 'forms' && parts[1] && parts.length === 2 && req.method === 'PATCH') {
    requireFormsWrite(auth.user);
    const current = db.prepare('SELECT * FROM site_forms WHERE id = ?').get(parts[1]);
    if (!current) throw new ApiError(404, 'not_found', 'Form not found.');
    const body = await readJson(req);
    const input = validateFormInput({...formRecord(current), ...body, fields: body.fields || JSON.parse(current.fields_data)});
    transaction(() => {
      db.prepare(`UPDATE site_forms SET slug = ?, name = ?, recipient = ?, submit_label = ?, success_message = ?, fields_data = ?, active = ?, updated_by = ?, updated_at = ? WHERE id = ?`)
        .run(input.slug, input.name, input.recipient, input.submitLabel, input.successMessage, JSON.stringify(input.fields), input.active ? 1 : 0, auth.user.id, nowIso(), current.id);
      audit({userId: auth.user.id, action: 'form.updated', entityType: 'form', entityId: current.id, details: {slug: input.slug, active: input.active}, ipAddress: requestIp(req)});
    });
    return sendJson(res, 200, {form: formRecord(db.prepare('SELECT * FROM site_forms WHERE id = ?').get(current.id))});
  }

  if (parts[0] === 'forms' && parts[1] && parts[2] === 'duplicate' && req.method === 'POST') {
    requireFormsWrite(auth.user);
    const current = db.prepare('SELECT * FROM site_forms WHERE id = ?').get(parts[1]);
    if (!current) throw new ApiError(404, 'not_found', 'Form not found.');
    let suffix = 2; let slug = `${current.slug}-copy`;
    while (db.prepare('SELECT 1 FROM site_forms WHERE slug = ?').get(slug)) slug = `${current.slug}-copy-${suffix++}`;
    const id = newId(); const createdAt = nowIso(); const position = db.prepare('SELECT COALESCE(MAX(position), -1) + 1 AS position FROM site_forms').get().position;
    transaction(() => {
      db.prepare(`INSERT INTO site_forms (id, slug, name, recipient, submit_label, success_message, fields_data, active, position, created_by, updated_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)`).run(id, slug, `${current.name} copy`, current.recipient, current.submit_label, current.success_message, current.fields_data, position, auth.user.id, auth.user.id, createdAt, createdAt);
      audit({userId: auth.user.id, action: 'form.duplicated', entityType: 'form', entityId: id, details: {sourceId: current.id}, ipAddress: requestIp(req)});
    });
    return sendJson(res, 201, {form: formRecord(db.prepare('SELECT * FROM site_forms WHERE id = ?').get(id))});
  }

  if (parts[0] === 'forms' && parts[1] && parts.length === 2 && req.method === 'DELETE') {
    requireOwner(auth.user);
    const current = db.prepare('SELECT * FROM site_forms WHERE id = ?').get(parts[1]);
    if (!current) throw new ApiError(404, 'not_found', 'Form not found.');
    const submissionCount = db.prepare('SELECT COUNT(*) AS count FROM form_submissions WHERE form_id = ?').get(current.id).count;
    if (submissionCount > 0) throw new ApiError(409, 'form_has_submissions', 'Deactivate this form instead. Forms with submissions cannot be permanently deleted.');
    transaction(() => {
      db.prepare('DELETE FROM site_forms WHERE id = ?').run(current.id);
      audit({userId: auth.user.id, action: 'form.deleted', entityType: 'form', entityId: current.id, details: {slug: current.slug}, ipAddress: requestIp(req)});
    });
    return sendJson(res, 200, {ok: true});
  }

  if (parts[0] === 'submissions' && parts.length === 1 && req.method === 'GET') {
    requireSubmissions(auth.user);
    const status = url.searchParams.get('status');
    if (status && !SUBMISSION_STATUSES.includes(status)) throw new ApiError(400, 'invalid_status', 'Choose a valid submission status.');
    const rows = db.prepare(`SELECT s.*, f.name AS form_name, f.slug AS form_slug FROM form_submissions s JOIN site_forms f ON f.id = s.form_id
      ${status ? 'WHERE s.status = ?' : ''} ORDER BY s.created_at DESC LIMIT 500`).all(...(status ? [status] : []));
    return sendJson(res, 200, {submissions: rows.map(submissionRecord)});
  }

  if (parts[0] === 'submissions' && parts[1] && parts.length === 2 && req.method === 'PATCH') {
    requireSubmissions(auth.user);
    const current = db.prepare('SELECT * FROM form_submissions WHERE id = ?').get(parts[1]);
    if (!current) throw new ApiError(404, 'not_found', 'Submission not found.');
    const body = await readJson(req);
    if (!SUBMISSION_STATUSES.includes(body.status)) throw new ApiError(400, 'invalid_status', 'Choose a valid submission status.');
    const notes = cleanText(body.notes, 'notes', {max: 8000, optional: true});
    transaction(() => {
      db.prepare('UPDATE form_submissions SET status = ?, notes = ?, updated_at = ? WHERE id = ?').run(body.status, notes, nowIso(), current.id);
      audit({userId: auth.user.id, action: 'submission.updated', entityType: 'submission', entityId: current.id, details: {status: body.status}, ipAddress: requestIp(req)});
    });
    const row = db.prepare(`SELECT s.*, f.name AS form_name, f.slug AS form_slug FROM form_submissions s JOIN site_forms f ON f.id = s.form_id WHERE s.id = ?`).get(current.id);
    return sendJson(res, 200, {submission: submissionRecord(row)});
  }

  if (parts[0] === 'submissions' && parts[1] && parts.length === 2 && req.method === 'DELETE') {
    requireOwner(auth.user);
    const current = db.prepare('SELECT * FROM form_submissions WHERE id = ?').get(parts[1]);
    if (!current) throw new ApiError(404, 'not_found', 'Submission not found.');
    transaction(() => {
      db.prepare('DELETE FROM form_submissions WHERE id = ?').run(current.id);
      audit({userId: auth.user.id, action: 'submission.deleted', entityType: 'submission', entityId: current.id, ipAddress: requestIp(req)});
    });
    return sendJson(res, 200, {ok: true});
  }

  if (parts[0] === 'users' && req.method === 'GET') {
    requireOwner(auth.user);
    return sendJson(res, 200, {users: db.prepare('SELECT * FROM admin_users ORDER BY created_at').all().map(publicUser)});
  }

  if (parts[0] === 'users' && parts.length === 1 && req.method === 'POST') {
    requireOwner(auth.user);
    const body = await readJson(req);
    const email = normalizeEmail(body.email);
    const displayName = cleanText(body.displayName, 'displayName', {min: 2, max: 100});
    if (!ROLES.includes(body.role) || body.role === 'owner') throw new ApiError(400, 'invalid_role', 'Choose a supported non-owner role.');
    const passwordHash = hashPassword(body.password);
    const id = newId();
    const createdAt = nowIso();
    transaction(() => {
      db.prepare(`INSERT INTO admin_users (id, email, display_name, password_hash, role, active, password_changed_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)`).run(id, email, displayName, passwordHash, body.role, createdAt, createdAt, createdAt);
      audit({userId: auth.user.id, action: 'user.created', entityType: 'user', entityId: id, details: {email, role: body.role}, ipAddress: requestIp(req)});
    });
    return sendJson(res, 201, {user: publicUser(db.prepare('SELECT * FROM admin_users WHERE id = ?').get(id))});
  }

  if (parts[0] === 'users' && parts[1] && req.method === 'PATCH') {
    requireOwner(auth.user);
    const current = db.prepare('SELECT * FROM admin_users WHERE id = ?').get(parts[1]);
    if (!current) throw new ApiError(404, 'not_found', 'User not found.');
    if (current.role === 'owner') throw new ApiError(400, 'owner_immutable', 'The owner account cannot be disabled or reassigned.');
    const body = await readJson(req);
    if (!ROLES.includes(body.role) || body.role === 'owner') throw new ApiError(400, 'invalid_role', 'Choose a supported role.');
    const active = body.active === false ? 0 : 1;
    transaction(() => {
      db.prepare('UPDATE admin_users SET role = ?, active = ?, updated_at = ? WHERE id = ?').run(body.role, active, nowIso(), current.id);
      if (!active) db.prepare('DELETE FROM admin_sessions WHERE user_id = ?').run(current.id);
      audit({userId: auth.user.id, action: 'user.updated', entityType: 'user', entityId: current.id, details: {role: body.role, active: Boolean(active)}, ipAddress: requestIp(req)});
    });
    return sendJson(res, 200, {user: publicUser(db.prepare('SELECT * FROM admin_users WHERE id = ?').get(current.id))});
  }

  if (parts[0] === 'profile' && parts[1] === 'password' && req.method === 'POST') {
    const body = await readJson(req);
    const current = db.prepare('SELECT * FROM admin_users WHERE id = ?').get(auth.user.id);
    if (!verifyPassword(String(body.currentPassword || ''), current.password_hash)) throw new ApiError(400, 'invalid_current_password', 'The current password is incorrect.', {currentPassword: 'Incorrect password.'});
    const nextPassword = validatePassword(body.newPassword);
    const passwordHash = hashPassword(nextPassword);
    const changedAt = nowIso();
    let nextSession;
    transaction(() => {
      db.prepare('UPDATE admin_users SET password_hash = ?, password_changed_at = ?, updated_at = ? WHERE id = ?').run(passwordHash, changedAt, changedAt, auth.user.id);
      db.prepare('DELETE FROM admin_sessions WHERE user_id = ?').run(auth.user.id);
      nextSession = createSession(auth.user, req);
      audit({userId: auth.user.id, action: 'user.password_changed', entityType: 'user', entityId: auth.user.id, ipAddress: requestIp(req)});
    });
    return sendJson(res, 200, {ok: true, csrfToken: nextSession.csrf}, {'Set-Cookie': sessionCookie(nextSession.token, nextSession.expiresAt)});
  }

  if (parts[0] === 'enquiries' && parts.length === 1 && req.method === 'GET') {
    requireEnquiries(auth.user);
    const status = url.searchParams.get('status');
    if (status && !ENQUIRY_STATUSES.includes(status)) throw new ApiError(400, 'invalid_status', 'Choose a valid enquiry status.');
    const rows = status
      ? db.prepare('SELECT * FROM enquiries WHERE status = ? ORDER BY created_at DESC').all(status)
      : db.prepare('SELECT * FROM enquiries ORDER BY created_at DESC').all();
    const assignees = db.prepare("SELECT id, display_name, email FROM admin_users WHERE active = 1 AND role IN ('owner','sales') ORDER BY display_name").all()
      .map(user => ({id: user.id, displayName: user.display_name, email: user.email}));
    return sendJson(res, 200, {enquiries: rows.map(enquiryRecord), assignees});
  }

  if (parts[0] === 'enquiries' && parts.length === 1 && req.method === 'POST') {
    requireEnquiries(auth.user);
    const body = await readJson(req);
    if (!ENQUIRY_TYPES.includes(body.type)) throw new ApiError(400, 'invalid_type', 'Choose a valid enquiry type.');
    const id = newId();
    const createdAt = nowIso();
    const name = cleanText(body.name, 'name', {min: 2, max: 150});
    const subject = cleanText(body.subject, 'subject', {max: 250});
    const message = cleanText(body.message, 'message', {max: 8000});
    const email = body.email ? normalizeEmail(body.email) : '';
    const phone = cleanText(body.phone, 'phone', {max: 80, optional: true});
    transaction(() => {
      db.prepare(`INSERT INTO enquiries (id, type, status, name, email, phone, subject, message, source, created_at, updated_at)
        VALUES (?, ?, 'new', ?, ?, ?, ?, ?, 'admin', ?, ?)`).run(id, body.type, name, email, phone, subject, message, createdAt, createdAt);
      audit({userId: auth.user.id, action: 'enquiry.created', entityType: 'enquiry', entityId: id, details: {type: body.type, subject}, ipAddress: requestIp(req)});
    });
    return sendJson(res, 201, {enquiry: enquiryRecord(db.prepare('SELECT * FROM enquiries WHERE id = ?').get(id))});
  }

  if (parts[0] === 'enquiries' && parts[1] && req.method === 'PATCH') {
    requireEnquiries(auth.user);
    const current = db.prepare('SELECT * FROM enquiries WHERE id = ?').get(parts[1]);
    if (!current) throw new ApiError(404, 'not_found', 'Enquiry not found.');
    const body = await readJson(req);
    if (!ENQUIRY_STATUSES.includes(body.status)) throw new ApiError(400, 'invalid_status', 'Choose a valid enquiry status.');
    const notes = cleanText(body.notes, 'notes', {max: 8000, optional: true});
    const assignedTo = body.assignedTo ? String(body.assignedTo) : null;
    if (assignedTo) {
      const assignee = db.prepare("SELECT id FROM admin_users WHERE id = ? AND active = 1 AND role IN ('owner','sales')").get(assignedTo);
      if (!assignee) throw new ApiError(400, 'invalid_assignee', 'Assign enquiries only to an active owner or sales user.', {assignedTo: 'Choose an active sales user.'});
    }
    transaction(() => {
      db.prepare('UPDATE enquiries SET status = ?, notes = ?, assigned_to = ?, updated_at = ? WHERE id = ?')
        .run(body.status, notes, assignedTo, nowIso(), current.id);
      audit({userId: auth.user.id, action: 'enquiry.updated', entityType: 'enquiry', entityId: current.id, details: {status: body.status, assignedTo}, ipAddress: requestIp(req)});
    });
    return sendJson(res, 200, {enquiry: enquiryRecord(db.prepare('SELECT * FROM enquiries WHERE id = ?').get(current.id))});
  }

  if (parts[0] === 'media' && parts.length === 1 && req.method === 'GET') {
    if (!['owner', 'editor', 'shop', 'projects', 'viewer'].includes(auth.user.role)) throw new ApiError(403, 'permission_denied', 'You do not have permission to view media.');
    const rows = db.prepare('SELECT * FROM media_assets ORDER BY position, created_at DESC').all().filter(row => canReadMedia(auth.user, row));
    return sendJson(res, 200, {media: rows.map(mediaRecord)});
  }

  if (parts[0] === 'media' && parts[1] === 'reorder' && req.method === 'PATCH') {
    requireMediaWrite(auth.user);
    const body = await readJson(req);
    if (!Array.isArray(body.ids) || body.ids.length > 500 || body.ids.some(id => typeof id !== 'string')) throw new ApiError(400, 'invalid_order', 'The media order is invalid.');
    const rows = db.prepare(`SELECT * FROM media_assets WHERE id IN (${body.ids.map(() => '?').join(',') || "''"})`).all(...body.ids);
    if (rows.length !== body.ids.length) throw new ApiError(400, 'invalid_order', 'One or more media assets are invalid.');
    rows.forEach(row => requireMediaRowWrite(auth.user, row));
    transaction(() => {
      body.ids.forEach((id, position) => db.prepare('UPDATE media_assets SET position = ?, updated_at = ? WHERE id = ?').run(position, nowIso(), id));
      audit({userId: auth.user.id, action: 'media.reordered', entityType: 'media', details: {count: body.ids.length}, ipAddress: requestIp(req)});
    });
    return sendJson(res, 200, {ok: true});
  }

  if (parts[0] === 'media' && parts.length === 1 && req.method === 'POST') {
    requireMediaWrite(auth.user);
    const body = await readJson(req, 36_000_000);
    const id = newId();
    const prepared = await prepareMediaFiles(body, id);
    const filename = cleanText(body.filename, 'filename', {max: 180}).replace(/[\\/:*?"<>|]/g, '-');
    const altText = body.mimeType.startsWith('image/') ? cleanText(body.altText, 'altText', {max: 300}) : cleanText(body.altText, 'altText', {max: 300, optional: true});
    const caption = cleanText(body.caption, 'caption', {max: 1000, optional: true});
    const title = cleanText(body.title, 'title', {max: 240, optional: true});
    const folder = cleanText(body.folder, 'folder', {max: 100, optional: true}) || 'General';
    const category = cleanText(body.category, 'category', {max: 100, optional: true}) || 'Uncategorised';
    const metadata = cleanMediaMetadata(body.metadata);
    const scope = mediaScopeForRole(auth.user.role);
    const storedName = `${id}${prepared.extension}`;
    const createdAt = nowIso();
    const position = db.prepare('SELECT COALESCE(MAX(position), -1) + 1 AS position FROM media_assets').get().position;
    const written = writePreparedMedia(prepared, storedName);
    try {
      transaction(() => {
        db.prepare(`INSERT INTO media_assets (id, filename, stored_name, mime_type, size, alt_text, caption, title, folder, category, metadata_json, width, height, variants_json, scope, active, position, created_by, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`).run(id, filename || `asset${prepared.extension}`, storedName, body.mimeType, prepared.buffer.length, altText, caption, title, folder, category, JSON.stringify(metadata), prepared.width, prepared.height, JSON.stringify(prepared.variants.map(({buffer: _buffer, ...variant}) => variant)), scope, position, auth.user.id, createdAt, createdAt);
        audit({userId: auth.user.id, action: 'media.created', entityType: 'media', entityId: id, details: {filename, size: prepared.buffer.length, scope, optimized: body.mimeType.startsWith('image/'), variants: prepared.variants.length}, ipAddress: requestIp(req)});
      });
    } catch (error) {
      written.forEach(name => { try { unlinkSync(safeMediaPath(name)); } catch {} });
      throw error;
    }
    return sendJson(res, 201, {media: mediaRecord(db.prepare('SELECT * FROM media_assets WHERE id = ?').get(id))});
  }

  if (parts[0] === 'media' && parts[1] && parts[2] === 'usage' && req.method === 'GET') {
    const row = db.prepare('SELECT * FROM media_assets WHERE id = ?').get(parts[1]);
    if (!row || !canReadMedia(auth.user, row)) throw new ApiError(404, 'not_found', 'Media file not found.');
    const usage = mediaUsage(row);
    return sendJson(res, 200, {usage, count: usage.length});
  }

  if (parts[0] === 'media' && parts[1] && parts[2] === 'replace' && req.method === 'POST') {
    requireMediaWrite(auth.user);
    const current = db.prepare('SELECT * FROM media_assets WHERE id = ?').get(parts[1]);
    if (!current) throw new ApiError(404, 'not_found', 'Media file not found.');
    requireMediaRowWrite(auth.user, current);
    const body = await readJson(req, 36_000_000);
    if (mediaFamily(body.mimeType) !== mediaFamily(current.mime_type)) throw new ApiError(400, 'incompatible_media_replacement', 'Replace the asset with the same media family so existing layouts remain valid.');
    const storageBase = newId();
    const prepared = await prepareMediaFiles(body, storageBase);
    const filename = cleanText(body.filename || current.filename, 'filename', {max: 180}).replace(/[\\/:*?"<>|]/g, '-');
    const storedName = `${storageBase}${prepared.extension}`;
    const written = writePreparedMedia(prepared, storedName);
    try {
      transaction(() => {
        db.prepare(`UPDATE media_assets SET filename = ?, stored_name = ?, mime_type = ?, size = ?, width = ?, height = ?, variants_json = ?, replacement_count = replacement_count + 1, updated_at = ? WHERE id = ?`)
          .run(filename, storedName, prepared.mimeType, prepared.buffer.length, prepared.width, prepared.height, JSON.stringify(prepared.variants.map(({buffer: _buffer, ...variant}) => variant)), nowIso(), current.id);
        audit({userId: auth.user.id, action: 'media.replaced', entityType: 'media', entityId: current.id, details: {previousType: current.mime_type, mimeType: prepared.mimeType, variants: prepared.variants.length}, ipAddress: requestIp(req)});
      });
    } catch (error) {
      written.forEach(name => { try { unlinkSync(safeMediaPath(name)); } catch {} });
      throw error;
    }
    removeStoredMedia(current);
    return sendJson(res, 200, {media: mediaRecord(db.prepare('SELECT * FROM media_assets WHERE id = ?').get(current.id))});
  }

  if (parts[0] === 'media' && parts[1] && parts[2] === 'duplicate' && req.method === 'POST') {
    requireMediaWrite(auth.user);
    const current = db.prepare('SELECT * FROM media_assets WHERE id = ?').get(parts[1]);
    if (!current) throw new ApiError(404, 'not_found', 'Media file not found.');
    requireMediaRowWrite(auth.user, current);
    const id = newId(); const createdAt = nowIso(); const extension = extname(current.stored_name);
    const storedName = `${id}${extension}`; const position = db.prepare('SELECT COALESCE(MAX(position), -1) + 1 AS position FROM media_assets').get().position;
    const sourceFile = safeMediaPath(current.stored_name); const targetFile = safeMediaPath(storedName);
    if (!existsSync(sourceFile)) throw new ApiError(409, 'media_file_missing', 'The source file is missing and cannot be duplicated.');
    const copiedVariants = [];
    try {
      copyFileSync(sourceFile, targetFile);
      for (const variant of parseMediaJson(current.variants_json, [])) {
        const storedVariant = `${id}-${variant.width}.webp`;
        copyFileSync(safeMediaPath(variant.storedName), safeMediaPath(storedVariant));
        copiedVariants.push({...variant, storedName: storedVariant});
      }
      transaction(() => {
        db.prepare(`INSERT INTO media_assets (id, filename, stored_name, mime_type, size, alt_text, caption, title, folder, category, metadata_json, width, height, variants_json, scope, active, position, created_by, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`).run(id, `Copy of ${current.filename}`, storedName, current.mime_type, current.size, current.alt_text, current.caption || '', current.title || '', current.folder || 'General', current.category || 'Uncategorised', current.metadata_json || '{}', current.width, current.height, JSON.stringify(copiedVariants), current.scope, position, auth.user.id, createdAt, createdAt);
        audit({userId: auth.user.id, action: 'media.duplicated', entityType: 'media', entityId: id, details: {sourceId: current.id, scope: current.scope}, ipAddress: requestIp(req)});
      });
    } catch (error) {
      try { unlinkSync(targetFile); } catch {}
      copiedVariants.forEach(variant => { try { unlinkSync(safeMediaPath(variant.storedName)); } catch {} });
      throw error;
    }
    return sendJson(res, 201, {media: mediaRecord(db.prepare('SELECT * FROM media_assets WHERE id = ?').get(id))});
  }

  if (parts[0] === 'media' && parts[1] && parts.length === 2 && req.method === 'PATCH') {
    requireMediaWrite(auth.user);
    const current = db.prepare('SELECT * FROM media_assets WHERE id = ?').get(parts[1]);
    if (!current) throw new ApiError(404, 'not_found', 'Media file not found.');
    requireMediaRowWrite(auth.user, current);
    const body = await readJson(req);
    const filename = cleanText(body.filename ?? current.filename, 'filename', {max: 180}).replace(/[\\/:*?"<>|]/g, '-');
    const altText = current.mime_type.startsWith('image/') ? cleanText(body.altText ?? current.alt_text, 'altText', {max: 300}) : cleanText(body.altText ?? current.alt_text, 'altText', {max: 300, optional: true});
    const caption = cleanText(body.caption ?? current.caption, 'caption', {max: 1000, optional: true});
    const title = cleanText(body.title ?? current.title, 'title', {max: 240, optional: true});
    const folder = cleanText(body.folder ?? current.folder, 'folder', {max: 100, optional: true}) || 'General';
    const category = cleanText(body.category ?? current.category, 'category', {max: 100, optional: true}) || 'Uncategorised';
    const metadata = cleanMediaMetadata(body.metadata, parseMediaJson(current.metadata_json, {}));
    const active = body.active === false ? 0 : 1;
    transaction(() => {
      db.prepare('UPDATE media_assets SET filename = ?, alt_text = ?, caption = ?, title = ?, folder = ?, category = ?, metadata_json = ?, active = ?, updated_at = ? WHERE id = ?').run(filename, altText, caption, title, folder, category, JSON.stringify(metadata), active, nowIso(), current.id);
      audit({userId: auth.user.id, action: 'media.updated', entityType: 'media', entityId: current.id, details: {active: Boolean(active)}, ipAddress: requestIp(req)});
    });
    return sendJson(res, 200, {media: mediaRecord(db.prepare('SELECT * FROM media_assets WHERE id = ?').get(current.id))});
  }

  if (parts[0] === 'media' && parts[1] && parts.length === 2 && req.method === 'DELETE') {
    requireOwner(auth.user);
    const row = db.prepare('SELECT * FROM media_assets WHERE id = ?').get(parts[1]);
    if (!row) throw new ApiError(404, 'not_found', 'Media file not found.');
    const usage = mediaUsage(row);
    if (usage.length) throw new ApiError(409, 'media_in_use', `This asset is used in ${usage.length} website location${usage.length === 1 ? '' : 's'}. Replace it or remove those references before deleting it.`);
    transaction(() => {
      db.prepare("DELETE FROM admin_favorites WHERE entity_type = 'media' AND entity_id = ?").run(row.id);
      db.prepare('DELETE FROM media_assets WHERE id = ?').run(row.id);
      audit({userId: auth.user.id, action: 'media.deleted', entityType: 'media', entityId: row.id, details: {filename: row.filename}, ipAddress: requestIp(req)});
    });
    removeStoredMedia(row);
    return sendJson(res, 200, {ok: true});
  }

  if (parts[0] === 'audit' && req.method === 'GET') {
    const query = cleanText(url.searchParams.get('q') || '', 'query', {max: 120, optional: true}).trim();
    const action = cleanText(url.searchParams.get('action') || '', 'action', {max: 100, optional: true}).trim();
    const entityType = cleanText(url.searchParams.get('entityType') || '', 'entityType', {max: 80, optional: true}).trim();
    const requestedUser = cleanText(url.searchParams.get('userId') || '', 'userId', {max: 100, optional: true}).trim();
    const sort = url.searchParams.get('sort') === 'oldest' ? 'ASC' : 'DESC';
    const limit = Math.min(200, Math.max(20, Number(url.searchParams.get('limit')) || 100));
    const offset = Math.min(100_000, Math.max(0, Number(url.searchParams.get('offset')) || 0));
    const clauses = [];
    const values = [];
    if (auth.user.role !== 'owner') { clauses.push('a.user_id = ?'); values.push(auth.user.id); }
    else if (requestedUser) { clauses.push('a.user_id = ?'); values.push(requestedUser); }
    if (action) { clauses.push('a.action = ?'); values.push(action); }
    if (entityType) { clauses.push('a.entity_type = ?'); values.push(entityType); }
    if (query) {
      const escaped = `%${query.toLowerCase().replace(/[\\%_]/g, value => `\\${value}`)}%`;
      clauses.push(`(lower(a.action) LIKE ? ESCAPE '\\' OR lower(a.entity_type) LIKE ? ESCAPE '\\' OR lower(a.details) LIKE ? ESCAPE '\\' OR lower(COALESCE(u.display_name, '')) LIKE ? ESCAPE '\\' OR lower(COALESCE(u.email, '')) LIKE ? ESCAPE '\\')`);
      values.push(escaped, escaped, escaped, escaped, escaped);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const total = Number(db.prepare(`SELECT COUNT(*) AS count FROM audit_log a LEFT JOIN admin_users u ON u.id = a.user_id ${where}`).get(...values).count);
    const rows = db.prepare(`SELECT a.*, u.display_name, u.email FROM audit_log a LEFT JOIN admin_users u ON u.id = a.user_id ${where} ORDER BY a.created_at ${sort} LIMIT ? OFFSET ?`).all(...values, limit, offset).map(row => ({id: row.id, action: row.action, entityType: row.entity_type, entityId: row.entity_id, details: safeJson(row.details, {}), ipAddress: auth.user.role === 'owner' ? row.ip_address : null, createdAt: row.created_at, userId: row.user_id, user: row.display_name || row.email || 'System'}));
    const users = auth.user.role === 'owner' ? db.prepare('SELECT id, display_name, email, role, active FROM admin_users ORDER BY display_name').all().map(row => ({id: row.id, displayName: row.display_name, email: row.email, role: row.role, active: Boolean(row.active)})) : [];
    const actions = db.prepare(`SELECT DISTINCT action FROM audit_log ${auth.user.role === 'owner' ? '' : 'WHERE user_id = ?'} ORDER BY action`).all(...(auth.user.role === 'owner' ? [] : [auth.user.id])).map(row => row.action);
    const entityTypes = db.prepare(`SELECT DISTINCT entity_type FROM audit_log ${auth.user.role === 'owner' ? '' : 'WHERE user_id = ?'} ORDER BY entity_type`).all(...(auth.user.role === 'owner' ? [] : [auth.user.id])).map(row => row.entity_type);
    return sendJson(res, 200, {entries: rows, total, offset, limit, hasMore: offset + rows.length < total, users, actions, entityTypes});
  }

  throw new ApiError(404, 'not_found', 'API route not found.');
}

export const server = createServer((req, res) => {
  handleRequest(req, res).catch(error => {
    if (error instanceof ApiError) return sendJson(res, error.status, {error: {code: error.code, message: error.message, fields: error.fields}});
    if (String(error?.message || '').includes('UNIQUE constraint failed')) return sendJson(res, 409, {error: {code: 'duplicate', message: 'A record with that email or slug already exists.'}});
    console.error('[admin-api]', error);
    return sendJson(res, 500, {error: {code: 'internal_error', message: 'The admin service could not complete the request.'}});
  });
});

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, HOST, () => console.log(`NK admin API listening on http://${HOST}:${PORT}${API_PREFIX}`));
}
