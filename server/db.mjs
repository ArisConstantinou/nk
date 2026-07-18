import {mkdirSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';

const configuredPath = process.env.ADMIN_DB_PATH || resolve('.data', 'admin.sqlite');
mkdirSync(dirname(configuredPath), {recursive: true});

export const db = new DatabaseSync(configuredPath);
db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');

db.exec(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS admin_users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner','editor','shop','projects','sales','viewer')),
    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
    password_changed_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS admin_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    csrf_hash TEXT NOT NULL,
    csrf_token TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    user_agent TEXT,
    ip_address TEXT
  );

  CREATE TABLE IF NOT EXISTS content_records (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL CHECK (kind IN ('page','service','product','catalogue','project','company','seo','settings')),
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
    draft_data TEXT NOT NULL,
    published_data TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    created_by TEXT REFERENCES admin_users(id),
    updated_by TEXT REFERENCES admin_users(id),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    published_at TEXT,
    UNIQUE(kind, slug)
  );

  CREATE TABLE IF NOT EXISTS content_revisions (
    id TEXT PRIMARY KEY,
    record_id TEXT NOT NULL REFERENCES content_records(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    status TEXT NOT NULL,
    data TEXT NOT NULL,
    action TEXT NOT NULL,
    created_by TEXT REFERENCES admin_users(id),
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS interactive_experiences (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
    draft_data TEXT NOT NULL,
    published_data TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    created_by TEXT REFERENCES admin_users(id),
    updated_by TEXT REFERENCES admin_users(id),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    published_at TEXT
  );

  CREATE TABLE IF NOT EXISTS interactive_revisions (
    id TEXT PRIMARY KEY,
    experience_id TEXT NOT NULL REFERENCES interactive_experiences(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL,
    data TEXT NOT NULL,
    action TEXT NOT NULL,
    created_by TEXT REFERENCES admin_users(id),
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS enquiries (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('contact','quote','product','catalogue','project','phone')),
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','in_progress','waiting','won','closed','spam')),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'admin',
    assigned_to TEXT REFERENCES admin_users(id),
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS media_assets (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    stored_name TEXT NOT NULL UNIQUE,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    alt_text TEXT NOT NULL,
    scope TEXT NOT NULL DEFAULT 'shared' CHECK (scope IN ('shared','site','shop','projects')),
    created_by TEXT REFERENCES admin_users(id),
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES admin_users(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details TEXT NOT NULL DEFAULT '{}',
    ip_address TEXT,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_token ON admin_sessions(token_hash);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_single_owner ON admin_users(role) WHERE role = 'owner';
  CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON admin_sessions(expires_at);
  CREATE INDEX IF NOT EXISTS idx_content_kind_status ON content_records(kind, status);
  CREATE INDEX IF NOT EXISTS idx_revisions_record ON content_revisions(record_id, version DESC);
  CREATE INDEX IF NOT EXISTS idx_interactive_slug_status ON interactive_experiences(slug, status);
  CREATE INDEX IF NOT EXISTS idx_interactive_revisions ON interactive_revisions(experience_id, version DESC);
  CREATE INDEX IF NOT EXISTS idx_enquiries_status ON enquiries(status, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);
`);

function ensureColumn(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some(item => item.name === column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

ensureColumn('content_records', 'position', 'INTEGER NOT NULL DEFAULT 0');
ensureColumn('content_records', 'category', "TEXT NOT NULL DEFAULT ''");
ensureColumn('content_records', 'tags_json', "TEXT NOT NULL DEFAULT '[]'");
ensureColumn('admin_sessions', 'csrf_token', "TEXT NOT NULL DEFAULT ''");
ensureColumn('media_assets', 'caption', "TEXT NOT NULL DEFAULT ''");
ensureColumn('media_assets', 'active', 'INTEGER NOT NULL DEFAULT 1');
ensureColumn('media_assets', 'position', 'INTEGER NOT NULL DEFAULT 0');
ensureColumn('media_assets', 'updated_at', "TEXT NOT NULL DEFAULT ''");
ensureColumn('media_assets', 'scope', "TEXT NOT NULL DEFAULT 'shared' CHECK (scope IN ('shared','site','shop','projects'))");
ensureColumn('media_assets', 'title', "TEXT NOT NULL DEFAULT ''");
ensureColumn('media_assets', 'folder', "TEXT NOT NULL DEFAULT 'General'");
ensureColumn('media_assets', 'category', "TEXT NOT NULL DEFAULT 'Uncategorised'");
ensureColumn('media_assets', 'metadata_json', "TEXT NOT NULL DEFAULT '{}'");
ensureColumn('media_assets', 'width', 'INTEGER');
ensureColumn('media_assets', 'height', 'INTEGER');
ensureColumn('media_assets', 'variants_json', "TEXT NOT NULL DEFAULT '[]'");
ensureColumn('media_assets', 'replacement_count', 'INTEGER NOT NULL DEFAULT 0');

// Legacy sessions did not retain the CSRF token. Invalidating them makes the
// session read endpoint side-effect free instead of rotating a token on GET.
db.prepare("DELETE FROM admin_sessions WHERE csrf_token = ''").run();

db.exec(`
  CREATE TABLE IF NOT EXISTS navigation_items (
    id TEXT PRIMARY KEY,
    menu TEXT NOT NULL CHECK (menu IN ('primary','services','shop','footer-services','footer-shop','footer-company')),
    label TEXT NOT NULL,
    url TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
    position INTEGER NOT NULL DEFAULT 0,
    created_by TEXT REFERENCES admin_users(id),
    updated_by TEXT REFERENCES admin_users(id),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS site_forms (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    recipient TEXT NOT NULL,
    submit_label TEXT NOT NULL,
    success_message TEXT NOT NULL,
    fields_data TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
    position INTEGER NOT NULL DEFAULT 0,
    created_by TEXT REFERENCES admin_users(id),
    updated_by TEXT REFERENCES admin_users(id),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS form_submissions (
    id TEXT PRIMARY KEY,
    form_id TEXT NOT NULL REFERENCES site_forms(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','in_progress','resolved','spam')),
    payload TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    ip_address TEXT,
    user_agent TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS admin_favorites (
    user_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (user_id, entity_type, entity_id)
  );

  CREATE INDEX IF NOT EXISTS idx_content_position ON content_records(kind, position, updated_at DESC);
  CREATE INDEX IF NOT EXISTS idx_navigation_menu_position ON navigation_items(menu, position);
  CREATE INDEX IF NOT EXISTS idx_forms_position ON site_forms(position);
  CREATE INDEX IF NOT EXISTS idx_submissions_status_created ON form_submissions(status, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_content_updated_by ON content_records(updated_by, updated_at DESC);
  CREATE INDEX IF NOT EXISTS idx_favorites_user_created ON admin_favorites(user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_media_scope_position ON media_assets(scope, position, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_media_updated ON media_assets(updated_at DESC);
  CREATE INDEX IF NOT EXISTS idx_audit_user_created ON audit_log(user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_audit_action_created ON audit_log(action, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_navigation_updated ON navigation_items(updated_at DESC);
  CREATE INDEX IF NOT EXISTS idx_forms_updated ON site_forms(updated_at DESC);
`);

// Record the idempotent schema generations that have already been applied.
// Existing installations are upgraded by the ensureColumn calls above, while
// this ledger gives future migrations a stable, inspectable starting point.
const migrationAppliedAt = new Date().toISOString();
const recordMigration = db.prepare('INSERT OR IGNORE INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)');
recordMigration.run(1, 'initial-admin-schema', migrationAppliedAt);
recordMigration.run(2, 'content-order-and-media-metadata', migrationAppliedAt);
recordMigration.run(3, 'forms-navigation-and-submissions', migrationAppliedAt);
recordMigration.run(4, 'content-taxonomy-and-favorites', migrationAppliedAt);
recordMigration.run(5, 'production-query-indexes', migrationAppliedAt);
recordMigration.run(6, 'interactive-experience-documents', migrationAppliedAt);

export const nowIso = () => new Date().toISOString();
export const newId = () => randomUUID();

export function safeJson(value, fallback) {
  try { return JSON.parse(value ?? JSON.stringify(fallback)); }
  catch { return fallback; }
}

export function transaction(work) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = work();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export function audit({userId = null, action, entityType, entityId = null, details = {}, ipAddress = null}) {
  db.prepare(`INSERT INTO audit_log
    (id, user_id, action, entity_type, entity_id, details, ip_address, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(newId(), userId, action, entityType, entityId, JSON.stringify(details), ipAddress, nowIso());
}

export function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    active: Boolean(row.active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function contentRecord(row) {
  if (!row) return null;
  return {
    id: row.id,
    kind: row.kind,
    slug: row.slug,
    title: row.title,
    status: row.status,
    draft: safeJson(row.draft_data, {}),
    published: row.published_data ? safeJson(row.published_data, {}) : null,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
    position: Number(row.position || 0),
    category: row.category || '',
    tags: (() => { const value = safeJson(row.tags_json, []); return Array.isArray(value) ? value : []; })(),
    updatedById: row.updated_by || null,
  };
}

export function enquiryRecord(row) {
  if (!row) return null;
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    name: row.name,
    email: row.email,
    phone: row.phone,
    subject: row.subject,
    message: row.message,
    source: row.source,
    assignedTo: row.assigned_to,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mediaRecord(row) {
  if (!row) return null;
  const variants = safeJson(row.variants_json, []);
  const metadata = safeJson(row.metadata_json, {});
  return {
    id: row.id,
    filename: row.filename,
    mimeType: row.mime_type,
    size: row.size,
    altText: row.alt_text,
    scope: row.scope || 'shared',
    caption: row.caption || '',
    title: row.title || '',
    folder: row.folder || 'General',
    category: row.category || 'Uncategorised',
    metadata,
    width: row.width ? Number(row.width) : null,
    height: row.height ? Number(row.height) : null,
    variants: variants.map(variant => ({...variant, url: `/api/admin/media/${row.id}/variant/${variant.width}`})),
    replacementCount: Number(row.replacement_count || 0),
    active: Boolean(row.active),
    position: Number(row.position || 0),
    updatedAt: row.updated_at || row.created_at,
    createdAt: row.created_at,
    url: `/api/admin/media/${row.id}/file`,
  };
}

export function navigationRecord(row) {
  if (!row) return null;
  return {
    id: row.id,
    menu: row.menu,
    label: row.label,
    url: row.url,
    description: row.description,
    active: Boolean(row.active),
    position: Number(row.position || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function formRecord(row, {publicView = false} = {}) {
  if (!row) return null;
  const record = {
    id: row.id,
    slug: row.slug,
    name: row.name,
    submitLabel: row.submit_label,
    successMessage: row.success_message,
    fields: safeJson(row.fields_data, []),
    active: Boolean(row.active),
    position: Number(row.position || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  return publicView ? record : {...record, recipient: row.recipient};
}

export function submissionRecord(row) {
  if (!row) return null;
  return {
    id: row.id,
    formId: row.form_id,
    formName: row.form_name || '',
    formSlug: row.form_slug || '',
    status: row.status,
    payload: safeJson(row.payload, {}),
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
