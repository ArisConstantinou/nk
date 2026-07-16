import type {
  AdminSearchResult,
  AdminUser,
  ContentKind,
  ContentRecord,
  Enquiry,
  FormSubmission,
  MediaAsset,
  NavigationItem,
  Revision,
  SiteForm,
} from './types';

export const isPagesAdminMode = import.meta.env.MODE === 'github-pages';
export const PAGES_ADMIN_STORAGE_KEY = 'nk-pages-admin-workspace-v1';
export const PAGES_ADMIN_CHANGED_EVENT = 'nk-pages-admin:changed';

const createdAt = '2026-01-01T00:00:00.000Z';
export const pagesAdminUser: AdminUser = {
  id: 'pages-device-owner',
  email: 'device@nk-electrical.local',
  displayName: 'Mobile Admin',
  role: 'owner',
  active: true,
  createdAt,
  updatedAt: createdAt,
};

type LocalAudit = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  details: Record<string, unknown>;
  createdAt: string;
};

type PagesState = {
  schema: 1;
  records: ContentRecord[];
  navigation: NavigationItem[];
  forms: SiteForm[];
  submissions: FormSubmission[];
  enquiries: Enquiry[];
  media: MediaAsset[];
  users: AdminUser[];
  audit: LocalAudit[];
  revisions: Record<string, Revision[]>;
  favorites: string[];
};

export type PagesApiResult = {status: number; payload: unknown};

const emptyState = (): PagesState => ({
  schema: 1,
  records: [],
  navigation: [],
  forms: [],
  submissions: [],
  enquiries: [],
  media: [],
  users: [pagesAdminUser],
  audit: [],
  revisions: {},
  favorites: [],
});

const clone = <T,>(value: T): T => structuredClone(value);
const now = () => new Date().toISOString();
const id = () => typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const ok = (payload: unknown, status = 200): PagesApiResult => ({status, payload});
const fail = (status: number, code: string, message: string, fields?: Record<string, string>): PagesApiResult => ({status, payload: {error: {code, message, fields}}});

function readState(): PagesState {
  try {
    const parsed = JSON.parse(localStorage.getItem(PAGES_ADMIN_STORAGE_KEY) || '') as Partial<PagesState>;
    if (parsed.schema !== 1 || !Array.isArray(parsed.records)) return emptyState();
    return {...emptyState(), ...parsed, users: parsed.users?.length ? parsed.users : [pagesAdminUser]};
  } catch {
    return emptyState();
  }
}

function writeState(state: PagesState) {
  try {
    localStorage.setItem(PAGES_ADMIN_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    throw new Error(error instanceof DOMException && error.name === 'QuotaExceededError'
      ? 'This device workspace is full. Remove large media files and try again.'
      : 'Changes could not be saved in this browser.');
  }
  window.dispatchEvent(new CustomEvent(PAGES_ADMIN_CHANGED_EVENT));
}

function bodyOf(init: RequestInit) {
  if (!init.body || typeof init.body !== 'string') return {} as Record<string, unknown>;
  try { return JSON.parse(init.body) as Record<string, unknown>; }
  catch { return {} as Record<string, unknown>; }
}

function recordAudit(state: PagesState, action: string, entityType: string, entityId: string | null = null, details: Record<string, unknown> = {}) {
  state.audit.unshift({id: id(), action, entityType, entityId, details, createdAt: now()});
  state.audit = state.audit.slice(0, 500);
}

function saveRevision(state: PagesState, record: ContentRecord, action: string) {
  const revision: Revision = {
    id: id(), version: record.version, title: record.title, slug: record.slug, status: record.status,
    data: clone(record.draft), action, createdAt: now(), createdBy: pagesAdminUser.displayName,
  };
  state.revisions[record.id] = [revision, ...(state.revisions[record.id] || [])].slice(0, 50);
}

function workItem(record: ContentRecord, favorites: string[]) {
  return {
    id: record.id, type: 'content', kind: record.kind, title: record.title, slug: record.slug,
    status: record.status, version: record.version, category: record.category, tags: record.tags,
    updatedAt: record.updatedAt, publishedAt: record.publishedAt, updatedBy: pagesAdminUser.displayName,
    favorite: favorites.includes(`content:${record.id}`), to: `/admin/${record.kind === 'page' ? 'pages' : record.kind === 'settings' ? 'settings' : record.kind === 'seo' ? 'seo' : `${record.kind}s`}?record=${record.id}`,
  };
}

function searchResults(state: PagesState, query: string): AdminSearchResult[] {
  const needle = query.trim().toLowerCase();
  const content: AdminSearchResult[] = state.records.filter(record => `${record.title} ${record.slug} ${record.kind} ${record.category} ${record.tags.join(' ')}`.toLowerCase().includes(needle)).map(record => ({
    id: record.id, type: 'content', kind: record.kind, title: record.title, description: `/${record.slug}`,
    status: record.status, category: record.category, tags: record.tags, updatedAt: record.updatedAt,
    updatedBy: pagesAdminUser.displayName, favorite: state.favorites.includes(`content:${record.id}`),
    to: workItem(record, state.favorites).to,
  }));
  const media: AdminSearchResult[] = state.media.filter(item => `${item.title} ${item.filename} ${item.altText}`.toLowerCase().includes(needle)).map(item => ({
    id: item.id, type: 'media', kind: 'media', title: item.title || item.filename, description: item.altText || item.filename,
    status: item.active ? 'active' : 'inactive', category: item.category, tags: String(item.metadata.tags || '').split(',').map(value => value.trim()).filter(Boolean),
    updatedAt: item.updatedAt, updatedBy: pagesAdminUser.displayName, favorite: state.favorites.includes(`media:${item.id}`), to: `/admin/media?asset=${item.id}`,
  }));
  return [...content, ...media].slice(0, 40);
}

export function readPagesPublicPayload() {
  if (!isPagesAdminMode) return null;
  const state = readState();
  if (!state.records.length) return null;
  return {
    records: state.records.filter(record => record.status === 'published' && record.published).map(record => ({
      id: record.id, kind: record.kind, slug: record.slug, title: record.title, data: clone(record.published || {}), position: record.position, publishedAt: record.publishedAt || '',
    })),
    navigation: state.navigation.filter(item => item.active),
    forms: state.forms.filter(form => form.active),
    media: state.media.filter(item => item.active),
  };
}

function seedWorkspace(state: PagesState, body: Record<string, unknown>) {
  const stamp = now();
  const seedRecords = Array.isArray(body.records) ? body.records as Array<Record<string, unknown>> : [];
  const seedNavigation = Array.isArray(body.navigation) ? body.navigation as Array<Record<string, unknown>> : [];
  const seedForms = Array.isArray(body.forms) ? body.forms as Array<Record<string, unknown>> : [];
  if (!state.records.length) state.records = seedRecords.map((seed, position) => {
    const draft = clone((seed.data && typeof seed.data === 'object' ? seed.data : {}) as Record<string, unknown>);
    return {id: id(), kind: seed.kind as ContentKind, slug: String(seed.slug || ''), title: String(seed.title || ''), status: 'published', draft, published: clone(draft), version: 1, createdAt: stamp, updatedAt: stamp, publishedAt: stamp, position, category: String(seed.category || ''), tags: Array.isArray(seed.tags) ? seed.tags.map(String) : [], updatedById: pagesAdminUser.id};
  });
  if (!state.navigation.length) state.navigation = seedNavigation.map((seed, position) => ({id: id(), menu: seed.menu as NavigationItem['menu'], label: String(seed.label || ''), url: String(seed.url || ''), description: String(seed.description || ''), active: seed.active !== false, position: Number(seed.position ?? position), createdAt: stamp, updatedAt: stamp}));
  if (!state.forms.length) state.forms = seedForms.map((seed, position) => ({id: id(), slug: String(seed.slug || ''), name: String(seed.name || ''), recipient: String(seed.recipient || ''), submitLabel: String(seed.submitLabel || 'Submit'), successMessage: String(seed.successMessage || 'Thank you.'), fields: clone(Array.isArray(seed.fields) ? seed.fields : []) as SiteForm['fields'], active: seed.active !== false, position: Number(seed.position ?? position), createdAt: stamp, updatedAt: stamp}));
  recordAudit(state, 'cms.seeded', 'cms', null, {content: state.records.length, navigation: state.navigation.length, forms: state.forms.length});
  writeState(state);
}

function contentRequest(state: PagesState, parts: string[], url: URL, method: string, body: Record<string, unknown>): PagesApiResult | null {
  if (parts[1] === 'seed') {
    if (method === 'GET') return ok({needsSeed: !state.records.length || !state.navigation.length || !state.forms.length, content: state.records.length, navigation: state.navigation.length, forms: state.forms.length});
    if (method === 'POST') { seedWorkspace(state, body); return ok({inserted: state.records.length}, 201); }
  }
  if (parts.length === 1 && method === 'GET') {
    const kind = url.searchParams.get('kind');
    const kinds = (url.searchParams.get('kinds') || '').split(',').filter(Boolean);
    const records = state.records.filter(record => !kind || record.kind === kind).filter(record => !kinds.length || kinds.includes(record.kind)).sort((a, b) => a.kind.localeCompare(b.kind) || a.position - b.position);
    return ok({records: clone(records)});
  }
  if (parts[1] === 'reorder' && method === 'PATCH') {
    const ids = Array.isArray(body.ids) ? body.ids.map(String) : [];
    state.records = state.records.map(record => ids.includes(record.id) ? {...record, position: ids.indexOf(record.id), updatedAt: now()} : record);
    recordAudit(state, 'content.reordered', String(body.kind || 'content')); writeState(state); return ok({ok: true});
  }
  if (parts[1] === 'bulk' && method === 'POST') {
    const items = Array.isArray(body.items) ? body.items as Array<Record<string, unknown>> : [];
    const action = String(body.action || ''); const stamp = now(); const changed: ContentRecord[] = [];
    state.records = state.records.map(record => {
      if (!items.some(item => item.id === record.id)) return record;
      let next = {...record, version: record.version + 1, updatedAt: stamp};
      if (action === 'publish') next = {...next, status: 'published', published: clone(record.draft), publishedAt: stamp};
      if (action === 'unpublish') next = {...next, status: 'draft', published: null, publishedAt: null};
      if (action === 'archive') next = {...next, status: 'archived'};
      if (action === 'set-category') next.category = String(body.category || '');
      if (action === 'add-tags') next.tags = [...new Set([...next.tags, ...(Array.isArray(body.tags) ? body.tags.map(String) : [])])].slice(0, 20);
      if (action === 'remove-tags') next.tags = next.tags.filter(tag => !(Array.isArray(body.tags) ? body.tags.map(String) : []).includes(tag));
      changed.push(next); saveRevision(state, next, `bulk:${action}`); return next;
    });
    recordAudit(state, `content.bulk.${action}`, 'content', null, {count: changed.length}); writeState(state); return ok({records: clone(changed), action});
  }
  if (parts.length === 1 && method === 'POST') {
    const stamp = now();
    const record: ContentRecord = {id: id(), kind: body.kind as ContentKind, slug: String(body.slug || ''), title: String(body.title || ''), status: 'draft', draft: clone((body.data || {}) as Record<string, unknown>), published: null, version: 1, createdAt: stamp, updatedAt: stamp, publishedAt: null, position: state.records.filter(item => item.kind === body.kind).length, category: String(body.category || ''), tags: Array.isArray(body.tags) ? body.tags.map(String) : [], updatedById: pagesAdminUser.id};
    if (!record.title || !record.slug) return fail(400, 'validation_failed', 'Complete the required fields.', {title: record.title ? '' : 'Required.', slug: record.slug ? '' : 'Required.'});
    state.records.push(record); saveRevision(state, record, 'created'); recordAudit(state, 'content.created', record.kind, record.id, {title: record.title}); writeState(state); return ok({record: clone(record)}, 201);
  }
  const recordIndex = state.records.findIndex(record => record.id === parts[1]);
  if (recordIndex < 0) return fail(404, 'not_found', 'Content record not found.');
  const current = state.records[recordIndex];
  if (parts.length === 2 && method === 'PUT') {
    const next: ContentRecord = {...current, title: String(body.title || current.title), slug: String(body.slug || current.slug), draft: clone((body.data || current.draft) as Record<string, unknown>), category: String(body.category || ''), tags: Array.isArray(body.tags) ? body.tags.map(String) : [], status: current.published ? 'draft' : current.status === 'archived' ? 'archived' : 'draft', version: current.version + 1, updatedAt: now(), updatedById: pagesAdminUser.id};
    state.records[recordIndex] = next; saveRevision(state, next, 'updated'); recordAudit(state, 'content.updated', next.kind, next.id, {title: next.title}); writeState(state); return ok({record: clone(next)});
  }
  if (parts.length === 2 && method === 'DELETE') {
    state.records.splice(recordIndex, 1); delete state.revisions[current.id]; recordAudit(state, 'content.deleted', current.kind, current.id, {title: current.title}); writeState(state); return ok({ok: true});
  }
  if (parts[2] === 'publish' && method === 'POST') {
    const stamp = now(); const next: ContentRecord = {...current, status: 'published', published: clone(current.draft), publishedAt: stamp, updatedAt: stamp, version: current.version + 1};
    state.records[recordIndex] = next; saveRevision(state, next, 'published'); recordAudit(state, 'content.published', next.kind, next.id, {title: next.title}); writeState(state); return ok({record: clone(next)});
  }
  if (parts[2] === 'unpublish' && method === 'POST') {
    const next: ContentRecord = {...current, status: 'draft', published: null, publishedAt: null, updatedAt: now(), version: current.version + 1};
    state.records[recordIndex] = next; saveRevision(state, next, 'unpublished'); recordAudit(state, 'content.unpublished', next.kind, next.id); writeState(state); return ok({record: clone(next)});
  }
  if (parts[2] === 'archive' && method === 'POST') {
    const next: ContentRecord = {...current, status: 'archived', updatedAt: now(), version: current.version + 1};
    state.records[recordIndex] = next; saveRevision(state, next, 'archived'); recordAudit(state, 'content.archived', next.kind, next.id); writeState(state); return ok({record: clone(next)});
  }
  if (parts[2] === 'duplicate' && method === 'POST') {
    const stamp = now(); const copy: ContentRecord = {...clone(current), id: id(), title: `${current.title} copy`, slug: `${current.slug}-copy-${Date.now().toString(36)}`, status: 'draft', published: null, publishedAt: null, version: 1, createdAt: stamp, updatedAt: stamp, position: state.records.filter(item => item.kind === current.kind).length};
    state.records.push(copy); saveRevision(state, copy, 'duplicated'); recordAudit(state, 'content.duplicated', copy.kind, copy.id, {sourceId: current.id}); writeState(state); return ok({record: clone(copy)}, 201);
  }
  if (parts[2] === 'revisions' && parts.length === 3 && method === 'GET') return ok({revisions: clone(state.revisions[current.id] || [])});
  if (parts[2] === 'revisions' && parts[3] && parts[4] === 'restore' && method === 'POST') {
    const revision = (state.revisions[current.id] || []).find(item => item.id === parts[3]);
    if (!revision) return fail(404, 'not_found', 'Revision not found.');
    const next: ContentRecord = {...current, title: revision.title, slug: revision.slug, status: 'draft', draft: clone(revision.data), version: current.version + 1, updatedAt: now()};
    state.records[recordIndex] = next; saveRevision(state, next, 'restored'); recordAudit(state, 'content.restored', next.kind, next.id, {fromVersion: revision.version}); writeState(state); return ok({record: clone(next)});
  }
  return null;
}

function collectionRequest(state: PagesState, collection: 'navigation' | 'forms', parts: string[], method: string, body: Record<string, unknown>): PagesApiResult | null {
  const list = state[collection] as Array<NavigationItem | SiteForm>;
  const responseKey = collection === 'navigation' ? 'items' : 'forms';
  const itemKey = collection === 'navigation' ? 'item' : 'form';
  if (parts.length === 1 && method === 'GET') return ok({[responseKey]: clone(list)});
  if (parts[1] === 'reorder' && method === 'PATCH') {
    const ids = Array.isArray(body.ids) ? body.ids.map(String) : [];
    state[collection] = list.map(item => ids.includes(item.id) ? {...item, position: ids.indexOf(item.id), updatedAt: now()} : item) as never;
    recordAudit(state, `${collection}.reordered`, collection); writeState(state); return ok({ok: true});
  }
  if (parts.length === 1 && method === 'POST') {
    const stamp = now(); const next = {...clone(body), id: id(), active: body.active !== false, position: list.length, createdAt: stamp, updatedAt: stamp} as NavigationItem | SiteForm;
    (state[collection] as Array<NavigationItem | SiteForm>).push(next); recordAudit(state, `${collection}.created`, collection, next.id); writeState(state); return ok({[itemKey]: clone(next)}, 201);
  }
  const index = list.findIndex(item => item.id === parts[1]);
  if (index < 0) return fail(404, 'not_found', `${collection === 'forms' ? 'Form' : 'Navigation item'} not found.`);
  const current = list[index];
  if (parts.length === 2 && method === 'PATCH') {
    const next = {...current, ...clone(body), id: current.id, createdAt: current.createdAt, updatedAt: now()} as NavigationItem | SiteForm;
    (state[collection] as Array<NavigationItem | SiteForm>)[index] = next; recordAudit(state, `${collection}.updated`, collection, next.id); writeState(state); return ok({[itemKey]: clone(next)});
  }
  if (parts[2] === 'duplicate' && method === 'POST') {
    const stamp = now(); const next = {...clone(current), id: id(), active: false, position: list.length, createdAt: stamp, updatedAt: stamp, ...(collection === 'forms' ? {name: `${(current as SiteForm).name} copy`, slug: `${(current as SiteForm).slug}-copy-${Date.now().toString(36)}`} : {label: `${(current as NavigationItem).label} copy`})} as NavigationItem | SiteForm;
    (state[collection] as Array<NavigationItem | SiteForm>).push(next); recordAudit(state, `${collection}.duplicated`, collection, next.id); writeState(state); return ok({[itemKey]: clone(next)}, 201);
  }
  if (parts.length === 2 && method === 'DELETE') {
    (state[collection] as Array<NavigationItem | SiteForm>).splice(index, 1); recordAudit(state, `${collection}.deleted`, collection, current.id); writeState(state); return ok({ok: true});
  }
  return null;
}

function dashboard(state: PagesState) {
  const statuses = {draft: 0, published: 0, archived: 0};
  const content: Record<string, number> = {};
  state.records.forEach(record => {content[record.kind] = (content[record.kind] || 0) + 1; statuses[record.status] += 1;});
  const items = state.records.map(record => workItem(record, state.favorites));
  const favorites = items.filter(item => item.favorite);
  return {
    content, statuses,
    enquiries: Object.fromEntries(['new', 'in_progress', 'waiting', 'won', 'closed', 'spam'].map(status => [status, state.enquiries.filter(item => item.status === status).length])),
    submissions: Object.fromEntries(['new', 'in_progress', 'resolved', 'spam'].map(status => [status, state.submissions.filter(item => item.status === status).length])),
    recent: state.audit.slice(0, 12).map(entry => ({id: entry.id, action: entry.action, entity_type: entry.entityType, entity_id: entry.entityId, details: entry.details, created_at: entry.createdAt, display_name: pagesAdminUser.displayName})),
    workQueue: items.filter(item => item.status === 'draft').slice(0, 12), drafts: items.filter(item => item.status === 'draft').slice(0, 12), recentlyEdited: items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 12), favorites,
    notifications: [{id: 'device-workspace', level: 'info', title: 'Device workspace', body: 'Changes are saved in this browser on this device.', to: '/admin/settings'}],
    system: [{id: 'pages-mode', label: 'Mobile Pages workspace', status: 'healthy', detail: 'Login-free browser storage is active.'}],
    summary: {content: state.records.length, media: state.media.length, activeUsers: 1, warnings: 0},
  };
}

export async function pagesAdminRequest(path: string, init: RequestInit = {}): Promise<PagesApiResult> {
  const method = String(init.method || 'GET').toUpperCase();
  const url = new URL(path, window.location.origin);
  const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  const body = bodyOf(init);
  const state = readState();

  if (parts[0] === 'setup') return ok(method === 'GET' ? {needsSetup: false, requiresBootstrapToken: false} : {user: pagesAdminUser, csrfToken: 'pages-device'});
  if (parts[0] === 'session' || parts[0] === 'login') return ok({user: pagesAdminUser, csrfToken: 'pages-device'});
  if (parts[0] === 'logout') return ok({ok: true});
  if (parts[0] === 'dashboard') return ok(dashboard(state));
  if (parts[0] === 'content') return contentRequest(state, parts, url, method, body) || fail(404, 'not_found', 'Content action not found.');
  if (parts[0] === 'navigation') return collectionRequest(state, 'navigation', parts, method, body) || fail(404, 'not_found', 'Navigation action not found.');
  if (parts[0] === 'forms') return collectionRequest(state, 'forms', parts, method, body) || fail(404, 'not_found', 'Form action not found.');
  if (parts[0] === 'submissions') {
    if (parts.length === 1 && method === 'GET') return ok({submissions: clone(state.submissions)});
    const index = state.submissions.findIndex(item => item.id === parts[1]);
    if (index < 0) return fail(404, 'not_found', 'Submission not found.');
    if (method === 'PATCH') {state.submissions[index] = {...state.submissions[index], status: body.status as FormSubmission['status'], notes: String(body.notes || ''), updatedAt: now()}; recordAudit(state, 'submission.updated', 'submission', parts[1]); writeState(state); return ok({submission: clone(state.submissions[index])});}
    if (method === 'DELETE') {state.submissions.splice(index, 1); writeState(state); return ok({ok: true});}
  }
  if (parts[0] === 'enquiries') {
    if (parts.length === 1 && method === 'GET') return ok({enquiries: clone(state.enquiries), assignees: [{id: pagesAdminUser.id, displayName: pagesAdminUser.displayName, email: pagesAdminUser.email}]});
    if (parts.length === 1 && method === 'POST') {const stamp = now(); const enquiry: Enquiry = {id: id(), type: String(body.type || 'phone') as Enquiry['type'], status: 'new', name: String(body.name || ''), email: String(body.email || ''), phone: String(body.phone || ''), subject: String(body.subject || ''), message: String(body.message || ''), source: 'Admin mobile workspace', assignedTo: null, notes: '', createdAt: stamp, updatedAt: stamp}; state.enquiries.unshift(enquiry); recordAudit(state, 'enquiry.created', 'enquiry', enquiry.id); writeState(state); return ok({enquiry: clone(enquiry)}, 201);}
    const index = state.enquiries.findIndex(item => item.id === parts[1]);
    if (index >= 0 && method === 'PATCH') {state.enquiries[index] = {...state.enquiries[index], status: body.status as Enquiry['status'], notes: String(body.notes || ''), assignedTo: body.assignedTo ? String(body.assignedTo) : null, updatedAt: now()}; recordAudit(state, 'enquiry.updated', 'enquiry', parts[1]); writeState(state); return ok({enquiry: clone(state.enquiries[index])});}
  }
  if (parts[0] === 'media') {
    if (parts.length === 1 && method === 'GET') return ok({media: clone(state.media)});
    if (parts.length === 1 && method === 'POST') {
      const stamp = now(); const base64 = String(body.base64 || ''); const mimeType = String(body.mimeType || 'application/octet-stream');
      if (base64.length > 4_500_000) return fail(413, 'device_storage_limit', 'For the mobile workspace, choose a file smaller than 3 MB.');
      const media: MediaAsset = {id: id(), filename: String(body.filename || 'upload'), mimeType, size: Math.round(base64.length * .75), altText: String(body.altText || ''), scope: 'shared', caption: String(body.caption || ''), title: String(body.title || body.filename || 'Upload'), folder: String(body.folder || 'General'), category: String(body.category || 'Uncategorised'), metadata: clone((body.metadata || {}) as MediaAsset['metadata']), width: null, height: null, variants: [], replacementCount: 0, active: true, position: state.media.length, updatedAt: stamp, createdAt: stamp, url: `data:${mimeType};base64,${base64}`};
      state.media.push(media); recordAudit(state, 'media.created', 'media', media.id); writeState(state); return ok({media: clone(media)}, 201);
    }
    const index = state.media.findIndex(item => item.id === parts[1]);
    if (index < 0) return fail(404, 'not_found', 'Media asset not found.');
    const current = state.media[index];
    if (parts[2] === 'usage' && method === 'GET') return ok({usage: []});
    if (parts[2] === 'duplicate' && method === 'POST') {const copy = {...clone(current), id: id(), title: `${current.title} copy`, filename: `copy-${current.filename}`, active: false, position: state.media.length, createdAt: now(), updatedAt: now()}; state.media.push(copy); writeState(state); return ok({media: clone(copy)}, 201);}
    if (parts[2] === 'replace' && method === 'POST') {const base64 = String(body.base64 || ''); const mimeType = String(body.mimeType || current.mimeType); if (base64.length > 4_500_000) return fail(413, 'device_storage_limit', 'For the mobile workspace, choose a file smaller than 3 MB.'); const next = {...current, filename: String(body.filename || current.filename), mimeType, size: Math.round(base64.length * .75), url: `data:${mimeType};base64,${base64}`, replacementCount: current.replacementCount + 1, updatedAt: now()}; state.media[index] = next; writeState(state); return ok({media: clone(next)});}
    if (parts.length === 2 && method === 'PATCH') {const next = {...current, ...clone(body), id: current.id, createdAt: current.createdAt, metadata: {...current.metadata, ...((body.metadata || {}) as MediaAsset['metadata'])}, updatedAt: now()} as MediaAsset; state.media[index] = next; writeState(state); return ok({media: clone(next)});}
    if (parts.length === 2 && method === 'DELETE') {state.media.splice(index, 1); writeState(state); return ok({ok: true});}
  }
  if (parts[0] === 'users') {
    if (method === 'GET') return ok({users: clone(state.users)});
    return fail(400, 'pages_device_mode', 'User accounts are unavailable while login is disabled on GitHub Pages.');
  }
  if (parts[0] === 'profile') return fail(400, 'pages_device_mode', 'There is no password in the login-free GitHub Pages workspace.');
  if (parts[0] === 'audit') {
    const entries = state.audit.map(entry => ({...entry, ipAddress: null, userId: pagesAdminUser.id, user: pagesAdminUser.displayName}));
    return ok({entries, total: entries.length, offset: 0, limit: 100, hasMore: false, users: [pagesAdminUser], actions: [...new Set(entries.map(entry => entry.action))], entityTypes: [...new Set(entries.map(entry => entry.entityType))]});
  }
  if (parts[0] === 'search') return ok({results: searchResults(state, url.searchParams.get('q') || '')});
  if (parts[0] === 'favorites' && parts[1] && parts[2] && method === 'PUT') {
    const key = `${parts[1]}:${parts[2]}`; const active = body.active !== false;
    state.favorites = active ? [...new Set([...state.favorites, key])] : state.favorites.filter(value => value !== key); writeState(state); return ok({active, favorites: dashboard(state).favorites});
  }
  if (parts[0] === 'guide') return fail(503, 'ai_service_unavailable', 'The AI guide requires an online admin service. Manual editing remains available.');
  return fail(404, 'not_found', 'This action is unavailable in the mobile device workspace.');
}

export function savePagesSubmission(formSlug: string, values: Record<string, string | boolean>) {
  const state = readState();
  const form = state.forms.find(item => item.slug === formSlug && item.active);
  if (!form) throw new Error('This form is not available.');
  const stamp = now();
  const submission: FormSubmission = {id: id(), formId: form.id, formName: form.name, formSlug: form.slug, status: 'new', payload: clone(values), notes: '', createdAt: stamp, updatedAt: stamp};
  state.submissions.unshift(submission); recordAudit(state, 'submission.received', 'submission', submission.id, {form: form.slug}); writeState(state);
  return form.successMessage;
}
