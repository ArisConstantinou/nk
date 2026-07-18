import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {AlertTriangle, Check, ChevronDown, Clapperboard, Cloud, Copy, ExternalLink, Group, Image as ImageIcon, Layers3, Link2, LoaderCircle, Monitor, MousePointer2, Move, PanelRightClose, PanelRightOpen, Pencil, Plus, Redo2, Rocket, Save, Smartphone, Tablet, Tags, Trash2, Type, Undo2, Ungroup, X} from 'lucide-react';
import {useLocation, useNavigate} from 'react-router-dom';
import {adminApi, errorMessage} from '../api';
import {useAdminAuth} from '../auth/AdminAuth';
import {canReadKind, canReadMedia, canWriteKind} from '../permissions';
import type {ContentKind, ContentRecord, MediaAsset, PageComponent, PageComponentType, PageSection, ReusableComponent, VisualHistoryAction, VisualHistoryEntry} from '../types';
import {componentLabels, historyFrom, newComponent, newSection, normalizeComponent, reusableFrom, sectionsFrom} from './visualEditorModel';
import {CMS_GUIDE_APPLY_EVENT, CMS_GUIDE_FINISH_EVENT, CMS_GUIDE_START_EVENT, CMS_GUIDE_STEP_EVENT, type CmsGuideAction, type CmsGuideApplyEventDetail, type CmsGuideContext, type CmsGuideFinishEventDetail, type CmsGuideSession, type CmsGuideStartEventDetail, type CmsGuideStepEventDetail} from '../guide/aiGuide';

type ViewportName = 'desktop' | 'tablet' | 'mobile';
type SavePhase = 'saved' | 'unsaved' | 'saving' | 'error';
type VisualSelection = {kind: ContentKind; slug: string; path: string; edit: 'text' | 'image' | 'icon' | 'section' | 'component'; label: string; linkPath: string; sectionId: string; objectType: '' | 'section' | 'component' | 'auto'; objectId: string; positionKey: string; positionX: number; positionY: number; fallbackValue?: string; linkFallbackValue?: string};
type HistorySpec = {objectKey: string; objectLabel: string; action: VisualHistoryAction; path: string; before: unknown; after: unknown; meta?: Record<string, unknown>; coalesce?: boolean};

const allKinds: ContentKind[] = ['page', 'service', 'product', 'catalogue', 'project', 'company', 'settings'];
const viewportOptions = {desktop: {label: 'Desktop', width: 1440, height: 900, icon: Monitor}, tablet: {label: 'Tablet', width: 768, height: 1024, icon: Tablet}, mobile: {label: 'Mobile', width: 390, height: 844, icon: Smartphone}} satisfies Record<ViewportName, {label: string; width: number; height: number; icon: typeof Monitor}>;
const kindLabels: Record<ContentKind, string> = {page: 'Page', service: 'Service', product: 'Product', catalogue: 'Catalogue', project: 'Project', company: 'Company', seo: 'SEO', settings: 'Global settings'};
const iconOptions = ['arrow-right', 'arrow-up-right', 'book-open', 'box', 'check', 'chevron-down', 'circuit', 'circuit-board', 'external-link', 'file-text', 'gauge', 'lightbulb', 'link', 'mail', 'map-pin', 'menu', 'phone', 'plug-zap', 'settings', 'share', 'shield', 'shield-check', 'sliders', 'sliders-horizontal', 'sparkles', 'waves', 'wrench', 'x', 'zap'];
const componentTypes: PageComponentType[] = ['heading', 'text', 'button', 'image', 'gallery', 'icon', 'divider'];
const actionLabels: Record<VisualHistoryAction, string> = {content: 'Content changed', replace: 'Content replaced', style: 'Style changed', resize: 'Size changed', position: 'Position changed', 'move-section': 'Section moved', 'move-component': 'Component moved', 'move-auto': 'Element moved', 'delete-auto': 'Element deleted', 'restore-auto': 'Element restored', 'add-section': 'Section added', 'delete-section': 'Section deleted', 'duplicate-section': 'Section duplicated', 'add-component': 'Component added', 'delete-component': 'Component deleted', 'duplicate-component': 'Component duplicated', group: 'Components grouped', ungroup: 'Components ungrouped', scope: 'Scope changed', reusable: 'Reusable component saved'};
const visualHash = (value: string) => {let hash = 0x811c9dc5; for (let index = 0; index < value.length; index += 1) {hash ^= value.charCodeAt(index); hash = Math.imul(hash, 0x01000193);} return (hash >>> 0).toString(16).padStart(8, '0');};
const positionKeyForObject = (type: 'section' | 'component', id: string) => visualHash(`${type}:${id}`);

function previewRoute(record: ContentRecord) {
  if (record.kind === 'page') return typeof record.draft.route === 'string' ? record.draft.route : record.slug === 'homepage' ? '/' : `/${record.slug}`;
  if (record.kind === 'service') return `/services/${record.slug}`;
  if (record.kind === 'product') return `/shop/product/${record.slug}`;
  if (record.kind === 'catalogue') return '/shop/catalogues';
  if (record.kind === 'project') return '/projects';
  if (record.kind === 'company') return '/about';
  return '/';
}

const cloneRecord = (record: ContentRecord): ContentRecord => ({...record, draft: structuredClone(record.draft), published: record.published ? structuredClone(record.published) : null});
const sameValue = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);

function getPathValue(record: ContentRecord, path: string): unknown {
  if (path === '$title') return record.title;
  const lineMatch = path.match(/^(.+)@line\.(\d+)$/);
  if (lineMatch) return String(record.draft[lineMatch[1]] || '').split('\n')[Number(lineMatch[2])] || '';
  return path.split('.').reduce<unknown>((value, key) => value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined, record.draft);
}

function setPathValue(record: ContentRecord, path: string, value: unknown): ContentRecord {
  const next = cloneRecord(record);
  if (path === '$title') return {...next, title: String(value)};
  const lineMatch = path.match(/^(.+)@line\.(\d+)$/);
  if (lineMatch) {
    const lines = String(next.draft[lineMatch[1]] || '').split('\n');
    while (lines.length <= Number(lineMatch[2])) lines.push('');
    lines[Number(lineMatch[2])] = String(value);
    next.draft[lineMatch[1]] = lines.join('\n');
    return next;
  }
  const parts = path.split('.').filter(Boolean);
  let target: Record<string, unknown> | unknown[] = next.draft;
  parts.forEach((part, index) => {
    const final = index === parts.length - 1;
    if (final) {
      if (Array.isArray(target)) target[Number(part)] = value;
      else target[part] = value;
      return;
    }
    const nextPart = parts[index + 1];
    const current = Array.isArray(target) ? target[Number(part)] : target[part];
    if (!current || typeof current !== 'object') {
      const created: Record<string, unknown> | unknown[] = /^\d+$/.test(nextPart) ? [] : {};
      if (Array.isArray(target)) target[Number(part)] = created;
      else target[part] = created;
      target = created;
    } else target = current as Record<string, unknown> | unknown[];
  });
  return next;
}

function removePathValue(record: ContentRecord, path: string): ContentRecord {
  const next = cloneRecord(record);
  const parts = path.split('.').filter(Boolean);
  let target: Record<string, unknown> | unknown[] = next.draft;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const part = parts[index];
    const child = Array.isArray(target) ? target[Number(part)] : target[part];
    if (!child || typeof child !== 'object') return next;
    target = child as Record<string, unknown> | unknown[];
  }
  const final = parts.at(-1);
  if (!final) return next;
  if (Array.isArray(target)) target.splice(Number(final), 1);
  else delete target[final];
  return next;
}

const previewBasePath = import.meta.env.BASE_URL === '/' ? '' : import.meta.env.BASE_URL.replace(/\/$/, '');

function publicPreviewUrl(path: string) {
  const url = new URL(path, window.location.origin);
  const alreadyUnderBase = !previewBasePath || url.pathname === previewBasePath || url.pathname.startsWith(`${previewBasePath}/`);
  if (url.origin === window.location.origin && !alreadyUnderBase) url.pathname = `${previewBasePath}${url.pathname.startsWith('/') ? url.pathname : `/${url.pathname}`}`;
  return url;
}

function logicalPreviewPath(url: URL) {
  const pathname = previewBasePath && (url.pathname === previewBasePath || url.pathname.startsWith(`${previewBasePath}/`))
    ? url.pathname.slice(previewBasePath.length) || '/'
    : url.pathname;
  return `${pathname}${url.search}${url.hash}`;
}

function previewHref(path: string) {
  const url = publicPreviewUrl(path);
  url.searchParams.delete('visualEditor');
  return `${url.pathname}${url.search}${url.hash}`;
}

function previewSrc(path: string, nonce: string) {
  const url = publicPreviewUrl(path);
  url.searchParams.set('visualEditor', nonce);
  return `${url.pathname}${url.search}${url.hash}`;
}

function previewDocumentKey(path: string) {
  const url = publicPreviewUrl(path);
  url.searchParams.delete('visualEditor');
  return `${url.pathname}${url.search}`;
}

function sectionsForRecord(record: ContentRecord): PageSection[] {
  const rawSections = Array.isArray(record.draft.sections) ? record.draft.sections : [];
  const normalized = sectionsFrom(rawSections);
  if (record.kind !== 'page' || typeof record.draft.route !== 'string' || !record.draft.route.startsWith('/_cms-guide/')) return normalized;
  return normalized.map((section, index) => {
    const raw = rawSections[index];
    if (!raw || typeof raw !== 'object' || !Array.isArray((raw as Partial<PageSection>).components)) return section;
    return {...section, components: (raw as Partial<PageSection>).components!.map(component => normalizeComponent(component))};
  });
}

function normalizeLoadedRecord(record: ContentRecord): ContentRecord {
  if (record.kind !== 'page') return record;
  const next = cloneRecord(record);
  next.draft.sections = sectionsForRecord(next);
  next.draft.componentLibrary = reusableFrom(next.draft.componentLibrary).filter(item => item.scope === 'local');
  next.draft.editorHistory = historyFrom(next.draft.editorHistory);
  return next;
}

function objectContext(record: ContentRecord, path: string, selection?: VisualSelection | null) {
  if (selection?.objectType === 'auto' && selection.objectId) return {objectKey: `auto:${selection.objectId}`, objectLabel: selection.label || 'Page element', meta: {autoId: selection.objectId}};
  const sections = sectionsForRecord(record);
  const componentMatch = path.match(/^sections\.(\d+)\.components\.(\d+)(?:\.(.+))?$/);
  const sectionMatch = path.match(/^sections\.(\d+)(?:\.(.+))?$/);
  const componentId = selection?.objectType === 'component' ? selection.objectId : componentMatch ? sections[Number(componentMatch[1])]?.components[Number(componentMatch[2])]?.id : '';
  const sectionId = selection?.sectionId || (componentMatch ? sections[Number(componentMatch[1])]?.id : sectionMatch ? sections[Number(sectionMatch[1])]?.id : '');
  if (componentId) {
    const component = sections.flatMap(section => section.components).find(item => item.id === componentId);
    return {objectKey: `component:${componentId}`, objectLabel: component?.label || selection?.label || 'Component', meta: {componentId, sectionId, field: componentMatch?.[3] || ''}};
  }
  if (sectionId) {
    const section = sections.find(item => item.id === sectionId);
    return {objectKey: `section:${sectionId}`, objectLabel: section?.title || selection?.label || 'Section', meta: {sectionId, field: sectionMatch?.[2] || ''}};
  }
  return {objectKey: `${record.kind}:${record.slug}:${path}`, objectLabel: selection?.label || path || record.title, meta: {}};
}

function pathForObject(sections: PageSection[], type: 'section' | 'component', id: string, field = '') {
  const sectionIndex = sections.findIndex(section => type === 'section' ? section.id === id : section.components.some(component => component.id === id));
  if (sectionIndex < 0) return '';
  if (type === 'section') return `sections.${sectionIndex}${field ? `.${field}` : ''}`;
  const componentIndex = sections[sectionIndex].components.findIndex(component => component.id === id);
  return `sections.${sectionIndex}.components.${componentIndex}${field ? `.${field}` : ''}`;
}

function resolveHistoryPath(record: ContentRecord, entry: VisualHistoryEntry) {
  const sections = sectionsForRecord(record);
  const componentId = typeof entry.meta.componentId === 'string' ? entry.meta.componentId : '';
  const sectionId = typeof entry.meta.sectionId === 'string' ? entry.meta.sectionId : '';
  const field = typeof entry.meta.field === 'string' ? entry.meta.field : '';
  if (componentId) return pathForObject(sections, 'component', componentId, field);
  if (sectionId && field) return pathForObject(sections, 'section', sectionId, field);
  return entry.path;
}

function historyAffectsObject(entry: VisualHistoryEntry, objectKey: string) {
  if (entry.objectKey === objectKey) return true;
  const objectId = objectKey.startsWith('component:') || objectKey.startsWith('section:') || objectKey.startsWith('auto:') ? objectKey.split(':').slice(1).join(':') : '';
  return Boolean(objectId && Array.isArray(entry.meta.affectedObjectIds) && entry.meta.affectedObjectIds.includes(objectId));
}

function reorderSections(sections: PageSection[], order: unknown): PageSection[] {
  if (!Array.isArray(order)) return sections;
  const byId = new Map(sections.map(section => [section.id, section]));
  const sorted = order.flatMap(id => typeof id === 'string' && byId.has(id) ? [byId.get(id)!] : []);
  sections.forEach(section => {if (!sorted.includes(section)) sorted.push(section);});
  return sorted;
}

function moveComponentTo(sections: PageSection[], componentId: string, destination: unknown): PageSection[] {
  if (!destination || typeof destination !== 'object') return sections;
  const sectionId = String((destination as Record<string, unknown>).sectionId || '');
  const index = Math.max(0, Number((destination as Record<string, unknown>).index) || 0);
  const next = structuredClone(sections);
  let moving: PageComponent | undefined;
  next.forEach(section => {const current = section.components.findIndex(component => component.id === componentId); if (current >= 0) moving = section.components.splice(current, 1)[0];});
  const target = next.find(section => section.id === sectionId);
  if (moving && target) target.components.splice(Math.min(index, target.components.length), 0, moving);
  return next;
}

function applyHistoryValue(record: ContentRecord, entry: VisualHistoryEntry, forward: boolean): ContentRecord {
  const value = forward ? entry.after : entry.before;
  let next = cloneRecord(record);
  let sections = sectionsForRecord(next);
  if (['content', 'replace', 'style', 'resize', 'position', 'scope', 'reusable', 'move-auto', 'delete-auto', 'restore-auto'].includes(entry.action)) {
    const path = resolveHistoryPath(next, entry);
    if ((entry.action === 'move-auto' || entry.action === 'position') && value == null) return path ? removePathValue(next, path) : next;
    return path ? setPathValue(next, path, structuredClone(value)) : next;
  }
  if (entry.action === 'move-section') sections = reorderSections(sections, value);
  else if (entry.action === 'move-component') sections = moveComponentTo(sections, String(entry.meta.componentId || ''), value);
  else if (['add-section', 'duplicate-section'].includes(entry.action)) {
    const payload = entry.after as {section?: PageSection; index?: number};
    if (forward && payload?.section && !sections.some(section => section.id === payload.section!.id)) sections.splice(Math.min(Number(payload.index) || 0, sections.length), 0, structuredClone(payload.section));
    if (!forward && payload?.section) sections = sections.filter(section => section.id !== payload.section!.id);
  } else if (entry.action === 'delete-section') {
    const payload = entry.before as {section?: PageSection; index?: number};
    if (!forward && payload?.section && !sections.some(section => section.id === payload.section!.id)) sections.splice(Math.min(Number(payload.index) || 0, sections.length), 0, structuredClone(payload.section));
    if (forward && payload?.section) sections = sections.filter(section => section.id !== payload.section!.id);
  } else if (['add-component', 'duplicate-component'].includes(entry.action)) {
    const payload = entry.after as {component?: PageComponent; sectionId?: string; index?: number};
    const target = sections.find(section => section.id === payload?.sectionId);
    if (forward && target && payload?.component && !sections.some(section => section.components.some(component => component.id === payload.component!.id))) target.components.splice(Math.min(Number(payload.index) || 0, target.components.length), 0, structuredClone(payload.component));
    if (!forward && payload?.component) sections.forEach(section => {section.components = section.components.filter(component => component.id !== payload.component!.id);});
  } else if (entry.action === 'delete-component') {
    const payload = entry.before as {component?: PageComponent; sectionId?: string; index?: number};
    const target = sections.find(section => section.id === payload?.sectionId);
    if (!forward && target && payload?.component && !sections.some(section => section.components.some(component => component.id === payload.component!.id))) target.components.splice(Math.min(Number(payload.index) || 0, target.components.length), 0, structuredClone(payload.component));
    if (forward && payload?.component) sections.forEach(section => {section.components = section.components.filter(component => component.id !== payload.component!.id);});
  } else if (entry.action === 'group' || entry.action === 'ungroup') {
    if (Array.isArray(value)) value.forEach(item => {
      if (!item || typeof item !== 'object') return;
      const id = String((item as Record<string, unknown>).id || '');
      const component = sections.flatMap(section => section.components).find(current => current.id === id);
      if (component) component.groupId = String((item as Record<string, unknown>).groupId || '');
    });
  }
  next.draft.sections = sections;
  return next;
}

export function VisualEditor({kind}: {kind: ContentKind}) {
  const {user} = useAdminAuth();
  const editorLocation = useLocation();
  const navigate = useNavigate();
  const editorParams = new URLSearchParams(editorLocation.search);
  const siteView = editorParams.get('siteView') === '1';
  const startEditing = editorParams.get('editMode') === '1';
  const readableKinds = useMemo(() => user ? allKinds.filter(item => canReadKind(user.role, item)) : [], [user]);
  const editableKinds = useMemo(() => user ? allKinds.filter(item => canWriteKind(user.role, item)) : [], [user]);
  const [records, setRecords] = useState<ContentRecord[]>([]);
  const recordsRef = useRef<ContentRecord[]>([]);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeRecordId, setActiveRecordId] = useState('');
  const [selection, setSelection] = useState<VisualSelection | null>(null);
  const [viewport, setViewport] = useState<ViewportName>(() => window.matchMedia('(max-width: 680px)').matches ? 'mobile' : 'desktop');
  const [previewPath, setPreviewPath] = useState('/');
  const [frameReady, setFrameReady] = useState(false);
  const [savePhases, setSavePhases] = useState<Record<string, SavePhase>>({});
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({});
  const [publishing, setPublishing] = useState(false);
  const [notice, setNotice] = useState('');
  const [scale, setScale] = useState(1);
  const [historyMode, setHistoryMode] = useState<'object' | 'page'>('object');
  const [reusableName, setReusableName] = useState('');
  const nonceRef = useRef(crypto.randomUUID());
  const requestedRecordIdRef = useRef(new URLSearchParams(window.location.search).get('record') || '');
  const requestedPreviewPathRef = useRef(new URLSearchParams(window.location.search).get('preview') || '');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const documentMenuRef = useRef<HTMLDetailsElement>(null);
  const saveTimersRef = useRef<Map<string, number>>(new Map());
  const savePromisesRef = useRef<Map<string, Promise<void>>>(new Map());
  const pendingSaveRef = useRef<Set<string>>(new Set());
  const changeSequenceRef = useRef<Map<string, number>>(new Map());
  const savePhasesRef = useRef<Record<string, SavePhase>>({});
  const saveErrorsRef = useRef<Record<string, string>>({});
  const historyCommandRef = useRef<(direction: 'undo' | 'redo', objectOnly?: boolean) => void>(() => undefined);
  const historyEchoGuardRef = useRef<{kind: ContentKind; slug: string; path: string; staleValue: unknown; expiresAt: number} | null>(null);
  const [guideSession, setGuideSession] = useState<{session: CmsGuideSession; returnRecordId: string} | null>(null);
  const [editMode, setEditMode] = useState(() => !siteView || startEditing);
  const [inspectorOpen, setInspectorOpen] = useState(() => !siteView);
  const previousSiteViewRef = useRef(`${siteView}:${startEditing}`);
  const inspectorRef = useRef<HTMLElement>(null);
  const contextActionRef = useRef<(action: string) => void>(() => undefined);

  const replaceRecords = useCallback((updater: (current: ContentRecord[]) => ContentRecord[]) => {
    const next = updater(recordsRef.current);
    recordsRef.current = next;
    setRecords(next);
    return next;
  }, []);

  const postRecords = useCallback((nextRecords = recordsRef.current, changedIds?: string[]) => {
    const changed = changedIds?.length ? new Set(changedIds) : null;
    const payload = changed ? nextRecords.filter(record => changed.has(record.id)) : nextRecords;
    iframeRef.current?.contentWindow?.postMessage({type: 'nk-visual-editor:records', nonce: nonceRef.current, mode: changed ? 'patch' : 'replace', editingEnabled: editMode, editableKinds: editMode ? editableKinds : [], records: payload.map(record => ({id: record.id, kind: record.kind, slug: record.slug, title: record.title, data: record.draft, position: record.position, publishedAt: record.publishedAt || ''}))}, window.location.origin);
  }, [editMode, editableKinds]);

  const transitionPreview = useCallback((nextPath: string) => {
    const requiresDocumentLoad = previewDocumentKey(nextPath) !== previewDocumentKey(previewPath);
    setPreviewPath(nextPath);
    setSelection(null);
    if (requiresDocumentLoad) setFrameReady(false);
    else {
      setFrameReady(true);
      window.requestAnimationFrame(() => postRecords());
    }
  }, [postRecords, previewPath]);

  const handleFrameLoad = useCallback(() => {
    setFrameReady(true);
    window.setTimeout(() => postRecords(), 0);
  }, [postRecords]);

  const persistRecord = useCallback((id: string): Promise<void> => {
    const timer = saveTimersRef.current.get(id);
    if (timer) window.clearTimeout(timer);
    saveTimersRef.current.delete(id);
    const existing = savePromisesRef.current.get(id);
    if (existing) {pendingSaveRef.current.add(id); return existing;}
    const startedSequence = changeSequenceRef.current.get(id) || 0;
    const operation = (async () => {
      const record = recordsRef.current.find(item => item.id === id);
      if (!record) return;
      savePhasesRef.current = {...savePhasesRef.current, [id]: 'saving'};
      saveErrorsRef.current = {...saveErrorsRef.current, [id]: ''};
      setSavePhases(current => ({...current, [id]: 'saving'}));
      setSaveErrors(current => ({...current, [id]: ''}));
      try {
        const result = await adminApi<{record: ContentRecord}>(`/content/${record.id}`, {method: 'PUT', body: JSON.stringify({kind: record.kind, title: record.title, slug: record.slug, data: record.draft, category: record.category, tags: record.tags, expectedVersion: record.version})});
        const changedWhileSaving = (changeSequenceRef.current.get(id) || 0) !== startedSequence;
        replaceRecords(current => current.map(item => item.id !== id ? item : changedWhileSaving ? {...item, version: result.record.version, status: result.record.status, published: result.record.published, publishedAt: result.record.publishedAt, updatedAt: result.record.updatedAt} : normalizeLoadedRecord(result.record)));
        savePhasesRef.current = {...savePhasesRef.current, [id]: changedWhileSaving ? 'unsaved' : 'saved'};
        saveErrorsRef.current = {...saveErrorsRef.current, [id]: ''};
        setSavePhases(current => ({...current, [id]: changedWhileSaving ? 'unsaved' : 'saved'}));
      } catch (error) {
        const message = errorMessage(error);
        savePhasesRef.current = {...savePhasesRef.current, [id]: 'error'};
        saveErrorsRef.current = {...saveErrorsRef.current, [id]: message};
        setSavePhases(current => ({...current, [id]: 'error'}));
        setSaveErrors(current => ({...current, [id]: message}));
      }
    })().finally(() => {
      savePromisesRef.current.delete(id);
      const hasNewerChange = (changeSequenceRef.current.get(id) || 0) !== startedSequence;
      if (pendingSaveRef.current.delete(id) || hasNewerChange) saveTimersRef.current.set(id, window.setTimeout(() => void persistRecord(id), 40));
    });
    savePromisesRef.current.set(id, operation);
    return operation;
  }, [replaceRecords]);

  const scheduleSave = useCallback((id: string) => {
    changeSequenceRef.current.set(id, (changeSequenceRef.current.get(id) || 0) + 1);
    savePhasesRef.current = {...savePhasesRef.current, [id]: 'unsaved'};
    setSavePhases(current => ({...current, [id]: 'unsaved'}));
    const currentTimer = saveTimersRef.current.get(id);
    if (currentTimer) window.clearTimeout(currentTimer);
    saveTimersRef.current.set(id, window.setTimeout(() => void persistRecord(id), 850));
  }, [persistRecord]);

  const commitRecord = useCallback((next: ContentRecord, echo = true) => {
    const nextRecords = replaceRecords(current => current.map(item => item.id === next.id ? next : item));
    scheduleSave(next.id);
    if (echo) window.requestAnimationFrame(() => postRecords(nextRecords, [next.id]));
    return next;
  }, [postRecords, replaceRecords, scheduleSave]);

  const appendHistory = useCallback((record: ContentRecord, nextRecord: ContentRecord, spec: HistorySpec) => {
    let history = historyFrom(record.draft.editorHistory).filter(entry => entry.active || entry.objectKey !== spec.objectKey);
    const now = new Date().toISOString();
    const last = history.at(-1);
    if (spec.coalesce && last?.active && last.objectKey === spec.objectKey && last.path === spec.path && last.action === spec.action && Date.now() - Date.parse(last.timestamp) < 1400) {
      history[history.length - 1] = {...last, after: structuredClone(spec.after), timestamp: now};
    } else {
      history.push({id: crypto.randomUUID(), objectKey: spec.objectKey, objectLabel: spec.objectLabel, action: spec.action, path: spec.path, before: structuredClone(spec.before), after: structuredClone(spec.after), meta: structuredClone(spec.meta || {}), timestamp: now, active: true});
    }
    nextRecord.draft.editorHistory = history.slice(-160);
    return nextRecord;
  }, []);

  const mutateWithHistory = useCallback((record: ContentRecord, nextRecord: ContentRecord, spec: HistorySpec, echo = true) => {
    if (sameValue(spec.before, spec.after)) return record;
    return commitRecord(appendHistory(record, nextRecord, spec), echo);
  }, [appendHistory, commitRecord]);

  const patchRecord = useCallback((record: ContentRecord, path: string, value: unknown, echo = true, selectionOverride?: VisualSelection | null, action?: VisualHistoryAction) => {
    const before = getPathValue(record, path);
    if (sameValue(before, value)) return record;
    const selected = selectionOverride ?? selection;
    const context = objectContext(record, path, selected);
    const renderedFallback = before == null && selected ? (path === selected.linkPath ? selected.linkFallbackValue : selected.fallbackValue) : undefined;
    const historyMeta = typeof renderedFallback === 'string' ? {...context.meta, renderedFallback} : context.meta;
    const inferredAction: VisualHistoryAction = action || (path.includes('.style.width') ? 'resize' : path.includes('.style.') ? 'style' : path.endsWith('.scope') ? 'scope' : selected?.edit === 'image' || selected?.edit === 'icon' ? 'replace' : 'content');
    const next = setPathValue(record, path, value);
    return mutateWithHistory(record, next, {...context, meta: historyMeta, action: inferredAction, path, before, after: value, coalesce: inferredAction === 'content'}, echo);
  }, [mutateWithHistory, selection]);

  const flushSave = useCallback(async (id: string) => {
    const timer = saveTimersRef.current.get(id);
    if (timer) window.clearTimeout(timer);
    saveTimersRef.current.delete(id);
    const running = savePromisesRef.current.get(id);
    if (running) await running;
    if (savePhasesRef.current[id] === 'unsaved' || savePhasesRef.current[id] === 'error') await persistRecord(id);
    const latest = savePromisesRef.current.get(id);
    if (latest) await latest;
    if (saveErrorsRef.current[id]) throw new Error(saveErrorsRef.current[id]);
  }, [persistRecord]);

  const load = useCallback(async () => {
    if (!readableKinds.length) return;
    setLoading(true); setLoadError(''); setSelection(null); setFrameReady(false);
    try {
      const contentResult = await adminApi<{records: ContentRecord[]}>(`/content?kinds=${encodeURIComponent(readableKinds.join(','))}`);
      const nextRecords = contentResult.records.map(normalizeLoadedRecord).sort((a, b) => a.kind.localeCompare(b.kind) || a.position - b.position);
      recordsRef.current = nextRecords; setRecords(nextRecords); setSavePhases(Object.fromEntries(nextRecords.map(record => [record.id, 'saved'])));
      const kindRecords = nextRecords.filter(record => record.kind === kind && record.status !== 'archived');
      const requestedRoute = requestedPreviewPathRef.current;
      const routeRecord = requestedRoute ? nextRecords.find(record => record.status !== 'archived' && previewDocumentKey(previewRoute(record)) === previewDocumentKey(requestedRoute)) : undefined;
      const initial = kindRecords.find(record => record.id === requestedRecordIdRef.current) || routeRecord || kindRecords.find(record => record.slug === 'homepage') || kindRecords[0] || nextRecords[0];
      if (initial) {setActiveRecordId(initial.id); setPreviewPath(previewRoute(initial));}
      if (user && canReadMedia(user.role)) setMedia((await adminApi<{media: MediaAsset[]}>('/media')).media.filter(asset => asset.active));
    } catch (error) {setLoadError(errorMessage(error));}
    finally {setLoading(false);}
  }, [kind, readableKinds, user]);

  useEffect(() => {void load();}, [load]);
  useEffect(() => {
    const presentation = `${siteView}:${startEditing}`;
    if (previousSiteViewRef.current === presentation) return;
    previousSiteViewRef.current = presentation;
    setEditMode(!siteView || startEditing);
    setInspectorOpen(!siteView);
    setSelection(null);
  }, [siteView, startEditing]);
  useEffect(() => {if (frameReady) postRecords();}, [editMode, frameReady, postRecords]);
  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!Object.values(savePhasesRef.current).some(value => value === 'unsaved' || value === 'saving')) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      const pending = [...saveTimersRef.current.keys()];
      saveTimersRef.current.forEach(timer => window.clearTimeout(timer));
      saveTimersRef.current.clear();
      pending.forEach(id => { if (savePhasesRef.current[id] === 'unsaved') void persistRecord(id); });
    };
  }, [persistRecord]);
  useEffect(() => {savePhasesRef.current = savePhases;}, [savePhases]);
  useEffect(() => {saveErrorsRef.current = saveErrors;}, [saveErrors]);
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const updateScale = () => {
      const option = viewportOptions[viewport];
      if (viewport === 'mobile' && window.matchMedia('(max-width: 680px)').matches) {
        setScale(1);
        return;
      }
      const widthScale = Math.max(280, stage.clientWidth - 28) / option.width;
      const heightScale = Math.max(320, stage.clientHeight - 28) / option.height;
      setScale(Math.min(1, widthScale, heightScale));
    };
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [loading, viewport]);

  const runHistory = useCallback((direction: 'undo' | 'redo', objectOnly = historyMode === 'object') => {
    const record = recordsRef.current.find(item => item.id === activeRecordId);
    if (!record || !editableKinds.includes(record.kind)) return;
    const history = historyFrom(record.draft.editorHistory);
    const key = selection ? objectContext(record, selection.path, selection).objectKey : '';
    const candidates = history.map((entry, index) => ({entry, index})).filter(({entry}) => (!objectOnly || (key && historyAffectsObject(entry, key))) && (direction === 'undo' ? entry.active : !entry.active));
    const target = direction === 'undo' ? candidates.at(-1) : candidates[0];
    if (!target) {setNotice(direction === 'undo' ? 'Nothing to undo for this history.' : 'Nothing to redo for this history.'); return;}
    let next = applyHistoryValue(record, target.entry, direction === 'redo');
    const nextHistory = history.map((entry, index) => index === target.index ? {...entry, active: direction === 'redo'} : entry);
    next.draft.editorHistory = nextHistory;
    const syncPath = resolveHistoryPath(next, target.entry);
    const syncValue = syncPath ? getPathValue(next, syncPath) : undefined;
    const renderedFallback = direction === 'undo' && typeof target.entry.meta.renderedFallback === 'string' ? target.entry.meta.renderedFallback : undefined;
    if (syncPath) historyEchoGuardRef.current = {kind: record.kind, slug: record.slug, path: syncPath, staleValue: direction === 'undo' ? target.entry.after : target.entry.before, expiresAt: Date.now() + 1500};
    iframeRef.current?.contentWindow?.postMessage({type: 'nk-visual-editor:history-sync', nonce: nonceRef.current, value: typeof syncValue === 'string' ? syncValue : renderedFallback}, window.location.origin);
    commitRecord(next, true);
    setNotice(`${direction === 'undo' ? 'Undid' : 'Redid'}: ${actionLabels[target.entry.action]}.`);
  }, [activeRecordId, commitRecord, editableKinds, historyMode, selection]);
  historyCommandRef.current = runHistory;

  const handleDrop = useCallback((data: Record<string, unknown>) => {
    const sourceType = String(data.sourceType || '');
    const sourceId = String(data.sourceId || '');
    if (sourceType === 'auto') {
      const record = recordsRef.current.find(item => item.kind === data.sourceKind && item.slug === data.sourceSlug);
      const targetId = String(data.targetId || '');
      if (!record || !editableKinds.includes(record.kind) || !/^[a-f0-9]{8,16}$/i.test(sourceId) || !/^[a-f0-9]{8,16}$/i.test(targetId)) return;
      const currentSelection = selection?.objectType === 'auto' && selection.objectId === sourceId ? selection : {kind: record.kind, slug: record.slug, path: `visualOverrides.${sourceId}`, edit: 'component' as const, label: 'Page element', linkPath: '', sectionId: String(data.targetSectionId || ''), objectType: 'auto' as const, objectId: sourceId, positionKey: sourceId, positionX: 0, positionY: 0};
      patchRecord(record, `visualPlacements.${sourceId}`, {target: targetId, position: data.position === 'after' ? 'after' : 'before'}, true, currentSelection, 'move-auto');
      setActiveRecordId(record.id); setSelection(currentSelection); setNotice('Element moved. The draft layout has been saved.');
      return;
    }
    const record = recordsRef.current.find(item => item.id === activeRecordId);
    if (!record || record.kind !== 'page' || !editableKinds.includes('page')) return;
    const sections = sectionsForRecord(record);
    if (sourceType === 'section') {
      const from = sections.findIndex(section => section.id === sourceId);
      const toTarget = sections.findIndex(section => section.id === String(data.targetId || ''));
      if (from < 0 || toTarget < 0) return;
      const before = sections.map(section => section.id);
      const [moving] = sections.splice(from, 1);
      let to = sections.findIndex(section => section.id === String(data.targetId || ''));
      if (data.position === 'after') to += 1;
      sections.splice(Math.max(0, to), 0, moving);
      const next = cloneRecord(record); next.draft.sections = sections;
      mutateWithHistory(record, next, {objectKey: `section:${sourceId}`, objectLabel: moving.title || 'Section', action: 'move-section', path: 'sections', before, after: sections.map(section => section.id), meta: {sectionId: sourceId}});
      setSelection(current => current?.objectId === sourceId ? {...current, path: pathForObject(sections, 'section', sourceId)} : current);
      return;
    }
    if (sourceType !== 'component') return;
    const sourceSection = sections.find(section => section.components.some(component => component.id === sourceId));
    const sourceIndex = sourceSection?.components.findIndex(component => component.id === sourceId) ?? -1;
    const component = sourceSection?.components[sourceIndex];
    if (!sourceSection || !component) return;
    let targetSectionId = String(data.targetSectionId || data.targetId || '');
    if (data.targetType === 'section') targetSectionId = String(data.targetId || '');
    const targetSection = sections.find(section => section.id === targetSectionId);
    if (!targetSection) return;
    const before = {sectionId: sourceSection.id, index: sourceIndex};
    sourceSection.components.splice(sourceIndex, 1);
    let targetIndex = data.targetType === 'component' ? targetSection.components.findIndex(item => item.id === String(data.targetId || '')) : targetSection.components.length;
    if (targetIndex < 0) targetIndex = targetSection.components.length;
    if (data.position === 'after' && data.targetType === 'component') targetIndex += 1;
    targetSection.components.splice(Math.min(targetIndex, targetSection.components.length), 0, component);
    const after = {sectionId: targetSection.id, index: targetSection.components.findIndex(item => item.id === sourceId)};
    const next = cloneRecord(record); next.draft.sections = sections;
    mutateWithHistory(record, next, {objectKey: `component:${sourceId}`, objectLabel: component.label, action: 'move-component', path: 'sections', before, after, meta: {componentId: sourceId, sectionId: targetSection.id}});
    setSelection(current => current?.objectId === sourceId ? {...current, sectionId: targetSection.id, path: pathForObject(sections, 'component', sourceId)} : current);
  }, [activeRecordId, editableKinds, mutateWithHistory, patchRecord, selection]);

  const handlePosition = useCallback((data: Record<string, unknown>) => {
    const positionKey = String(data.positionKey || '');
    const record = recordsRef.current.find(item => item.kind === data.kind && item.slug === data.slug);
    if (!record || !editableKinds.includes(record.kind) || !/^[a-f0-9]{8,16}$/i.test(positionKey)) return;
    const x = Math.max(-4000, Math.min(4000, Math.round(Number(data.x) || 0)));
    const y = Math.max(-4000, Math.min(4000, Math.round(Number(data.y) || 0)));
    const path = `visualOverrides.${positionKey}`;
    const currentValue = getPathValue(record, path);
    const before = currentValue && typeof currentValue === 'object' && !Array.isArray(currentValue) ? structuredClone(currentValue as Record<string, unknown>) : null;
    const merged: Record<string, unknown> = before ? {...before} : {};
    if (x) merged.x = x; else delete merged.x;
    if (y) merged.y = y; else delete merged.y;
    const after = Object.keys(merged).length ? merged : null;
    const next = after ? setPathValue(record, path, after) : removePathValue(record, path);
    const objectType = ['section', 'component', 'auto'].includes(String(data.objectType || '')) ? String(data.objectType) as VisualSelection['objectType'] : '';
    const objectId = String(data.objectId || '');
    const currentSelection: VisualSelection = selection && selection.kind === record.kind && selection.slug === record.slug
      ? {...selection, positionKey, positionX: x, positionY: y}
      : {kind: record.kind, slug: record.slug, path, edit: 'component', label: String(data.label || 'Page element'), linkPath: '', sectionId: String(data.sectionId || ''), objectType, objectId, positionKey, positionX: x, positionY: y};
    const context = objectContext(record, currentSelection.path, currentSelection);
    mutateWithHistory(record, next, {...context, action: 'position', path, before, after, coalesce: true});
    setActiveRecordId(record.id);
    setSelection(currentSelection);
    setNotice(`Position saved at X ${x}px, Y ${y}px. This position applies to every resolution.`);
  }, [editableKinds, mutateWithHistory, selection]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== iframeRef.current?.contentWindow || !event.data || typeof event.data !== 'object' || event.data.nonce !== nonceRef.current) return;
      if (event.data.type === 'nk-visual-editor:ready') {
        if (typeof event.data.path === 'string') {
          const readyUrl = new URL(event.data.path, window.location.origin);
          readyUrl.searchParams.delete('visualEditor');
          const readyPath = logicalPreviewPath(readyUrl);
          if (readyUrl.origin === window.location.origin && !readyPath.startsWith('/admin') && readyPath !== previewPath) {
            const readyRecord = recordsRef.current.find(record => record.kind === 'page' && previewDocumentKey(previewRoute(record)) === previewDocumentKey(readyPath));
            if (readyRecord) setActiveRecordId(readyRecord.id);
            setPreviewPath(readyPath);
            setSelection(null);
          }
        }
        setFrameReady(true); postRecords(); return;
      }
      if (event.data.type === 'nk-visual-editor:navigate' && typeof event.data.path === 'string') {
        const url = new URL(event.data.path, window.location.origin);
        const nextPath = logicalPreviewPath(url);
        if (url.origin === window.location.origin && !nextPath.startsWith('/admin')) {
          url.searchParams.delete('visualEditor');
          const logicalPath = logicalPreviewPath(url);
          const nextRecord = recordsRef.current.find(record => record.kind === 'page' && previewDocumentKey(previewRoute(record)) === previewDocumentKey(logicalPath));
          if (nextRecord) setActiveRecordId(nextRecord.id);
          transitionPreview(logicalPath);
        }
        return;
      }
      if (event.data.type === 'nk-visual-editor:blocked-action') {setNotice('Form submissions are disabled inside the editor preview. Open the live page to test a real submission.'); return;}
      if (event.data.type === 'nk-visual-editor:context-action') {contextActionRef.current(String(event.data.action || '')); return;}
      if (event.data.type === 'nk-visual-editor:history-shortcut') {historyCommandRef.current(event.data.direction === 'redo' ? 'redo' : 'undo', event.data.objectOnly !== false); return;}
      if (event.data.type === 'nk-visual-editor:position') {handlePosition(event.data as Record<string, unknown>); return;}
      if (event.data.type === 'nk-visual-editor:drop') {handleDrop(event.data as Record<string, unknown>); return;}
      if (event.data.type !== 'nk-visual-editor:change' && event.data.type !== 'nk-visual-editor:select') return;
      const target = recordsRef.current.find(record => record.kind === event.data.kind && record.slug === event.data.slug);
      if (!target) return;
      const nextSelection: VisualSelection = {kind: target.kind, slug: target.slug, path: String(event.data.path || ''), edit: ['text', 'image', 'icon', 'section', 'component'].includes(event.data.edit) ? event.data.edit : 'text', label: String(event.data.label || 'Element'), linkPath: String(event.data.linkPath || ''), sectionId: String(event.data.sectionId || ''), objectType: ['section', 'component', 'auto'].includes(event.data.objectType) ? event.data.objectType : '', objectId: String(event.data.objectId || ''), positionKey: String(event.data.positionKey || event.data.objectId || ''), positionX: Math.round(Number(event.data.positionX) || 0), positionY: Math.round(Number(event.data.positionY) || 0), fallbackValue: String(event.data.fallbackValue || ''), linkFallbackValue: String(event.data.linkFallbackValue || '')};
      setActiveRecordId(target.id); setSelection(nextSelection); if (event.data.selectOnly || event.data.type === 'nk-visual-editor:select') return;
      if (!editableKinds.includes(target.kind) || typeof event.data.path !== 'string') return;
      const guard = historyEchoGuardRef.current;
      if (guard && guard.expiresAt < Date.now()) historyEchoGuardRef.current = null;
      else if (guard && guard.kind === target.kind && guard.slug === target.slug && guard.path === event.data.path && sameValue(guard.staleValue, event.data.value)) return;
      patchRecord(target, event.data.path, event.data.value, Boolean(event.data.commit), nextSelection);
    };
    window.addEventListener('message', onMessage); return () => window.removeEventListener('message', onMessage);
  }, [editableKinds, handleDrop, handlePosition, patchRecord, postRecords, previewPath, transitionPreview]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || !['z', 'y'].includes(event.key.toLowerCase())) return;
      event.preventDefault();
      historyCommandRef.current(event.key.toLowerCase() === 'y' || event.shiftKey ? 'redo' : 'undo', historyMode === 'object');
    };
    window.addEventListener('keydown', onKeyDown); return () => window.removeEventListener('keydown', onKeyDown);
  }, [historyMode]);

  useEffect(() => {
    const closeDocumentMenu = (event: PointerEvent) => {
      const menu = documentMenuRef.current;
      if (menu?.open && event.target instanceof Node && !menu.contains(event.target)) menu.open = false;
    };
    document.addEventListener('pointerdown', closeDocumentMenu);
    return () => document.removeEventListener('pointerdown', closeDocumentMenu);
  }, []);

  const kindRecords = records.filter(record => record.kind === kind && record.status !== 'archived');
  const activeRecord = records.find(record => record.id === activeRecordId) || kindRecords[0];
  const documentOptions = activeRecord && !kindRecords.some(record => record.id === activeRecord.id) ? [activeRecord, ...kindRecords] : kindRecords;
  const selectedRecord = selection ? records.find(record => record.kind === selection.kind && record.slug === selection.slug) : activeRecord;
  const selectedValue = selectedRecord && selection ? getPathValue(selectedRecord, selection.path) ?? selection.fallbackValue ?? '' : '';
  const selectedLinkValue = selectedRecord && selection?.linkPath ? getPathValue(selectedRecord, selection.linkPath) ?? selection.linkFallbackValue ?? '' : '';
  const phase = activeRecord ? savePhases[activeRecord.id] || 'saved' : 'saved';
  const canWriteCurrent = Boolean(user && activeRecord && canWriteKind(user.role, activeRecord.kind));
  const activeSections = activeRecord?.kind === 'page' ? sectionsForRecord(activeRecord) : [];
  const selectedSection = selection?.sectionId ? activeSections.find(section => section.id === selection.sectionId) : selection?.objectType === 'section' ? activeSections.find(section => section.id === selection.objectId) : undefined;
  const selectedComponent = selection?.objectType === 'component' ? activeSections.flatMap(section => section.components).find(component => component.id === selection.objectId) : undefined;
  const settingsRecord = records.find(record => record.kind === 'settings');
  const previewPageRecord = records.find(record => record.kind === 'page' && previewDocumentKey(previewRoute(record)) === previewDocumentKey(previewPath));
  const pageForComponents = activeRecord?.kind === 'page' ? activeRecord : previewPageRecord;
  const reusableComponents = [...(pageForComponents ? reusableFrom(pageForComponents.draft.componentLibrary) : []), ...reusableFrom(settingsRecord?.draft.globalComponents)];
  const activeHistory = activeRecord ? historyFrom(activeRecord.draft.editorHistory) : [];
  const selectedObjectKey = activeRecord && selection ? objectContext(activeRecord, selection.path, selection).objectKey : '';
  const shownHistory = historyMode === 'object' ? activeHistory.filter(entry => historyAffectsObject(entry, selectedObjectKey)) : activeHistory;
  const hiddenAutomaticItems = activeRecord?.draft.visualOverrides && typeof activeRecord.draft.visualOverrides === 'object' && !Array.isArray(activeRecord.draft.visualOverrides) ? Object.entries(activeRecord.draft.visualOverrides as Record<string, unknown>).flatMap(([key, value]) => value && typeof value === 'object' && !Array.isArray(value) && (value as Record<string, unknown>).hidden === true ? [{key, label: String((value as Record<string, unknown>).label || 'Deleted page element')}] : []) : [];

  const chooseRecord = (id: string) => {const record = recordsRef.current.find(item => item.id === id); if (!record) return; setActiveRecordId(id); transitionPreview(previewRoute(record));};
  const updateAdminMeta = (field: 'category' | 'tags', value: string | string[]) => {
    if (!activeRecord || !canWriteCurrent) return;
    const next = cloneRecord(activeRecord);
    if (field === 'category') next.category = String(value).slice(0, 100);
    else next.tags = Array.isArray(value) ? value.slice(0, 20) : [];
    replaceRecords(records => records.map(record => record.id === next.id ? next : record));
    scheduleSave(next.id);
  };
  const publish = async () => {
    if (!activeRecord || !canWriteCurrent) return;
    setPublishing(true); setNotice('');
    try {
      await flushSave(activeRecord.id);
      const current = recordsRef.current.find(record => record.id === activeRecord.id); if (!current) return;
      const result = await adminApi<{record: ContentRecord}>(`/content/${current.id}/publish`, {method: 'POST', body: JSON.stringify({expectedVersion: current.version})});
      const next = replaceRecords(records => records.map(record => record.id === result.record.id ? normalizeLoadedRecord(result.record) : record));
      savePhasesRef.current = {...savePhasesRef.current, [result.record.id]: 'saved'};
      saveErrorsRef.current = {...saveErrorsRef.current, [result.record.id]: ''};
      setSavePhases(current => ({...current, [result.record.id]: 'saved'})); postRecords(next, [result.record.id]); setNotice('Published successfully. The public website now uses this version.');
    } catch (error) {setSaveErrors(current => ({...current, [activeRecord.id]: errorMessage(error)})); setSavePhases(current => ({...current, [activeRecord.id]: 'error'}));}
    finally {setPublishing(false);}
  };

  const updateSelection = (value: unknown, path = selection?.path, action?: VisualHistoryAction) => {if (selectedRecord && path && editableKinds.includes(selectedRecord.kind)) patchRecord(selectedRecord, path, value, true, selection, action);};
  const mutateSections = (record: ContentRecord, sections: PageSection[], spec: HistorySpec) => {const next = cloneRecord(record); next.draft.sections = sections; return mutateWithHistory(record, next, spec);};

  const addSection = () => {
    const page = activeRecord?.kind === 'page' ? activeRecord : recordsRef.current.find(record => record.kind === 'page' && previewDocumentKey(previewRoute(record)) === previewDocumentKey(previewPath));
    if (!page || !editableKinds.includes('page')) return;
    const sections = sectionsForRecord(page); const section = newSection(); const index = sections.length; sections.push(section);
    mutateSections(page, sections, {objectKey: `section:${section.id}`, objectLabel: section.title, action: 'add-section', path: 'sections', before: null, after: {section, index}, meta: {sectionId: section.id}});
    window.dispatchEvent(new CustomEvent('nk-admin-guide:editor-action', {detail: {recordId: page.id, action: 'section', sectionId: section.id}}));
    setActiveRecordId(page.id); setSelection({kind: 'page', slug: page.slug, path: `sections.${index}`, edit: 'section', label: section.title, linkPath: '', sectionId: section.id, objectType: 'section', objectId: section.id, positionKey: positionKeyForObject('section', section.id), positionX: 0, positionY: 0}); setNotice('Section added. Select it in the preview to position it.');
  };

  const addComponent = (type: PageComponentType, reusable?: ReusableComponent) => {
    const page = activeRecord?.kind === 'page' ? activeRecord : recordsRef.current.find(record => record.kind === 'page' && previewDocumentKey(previewRoute(record)) === previewDocumentKey(previewPath));
    if (!page || !editableKinds.includes('page')) return;
    const sections = sectionsForRecord(page); let section = sections.find(item => item.id === selectedSection?.id) || sections[0];
    if (!section) {section = newSection(); section.components = []; sections.push(section);}
    const component = reusable ? normalizeComponent({...structuredClone(reusable.component), id: crypto.randomUUID(), reusableId: reusable.id, scope: reusable.scope, groupId: ''}) : newComponent(type);
    const index = section.components.length; section.components.push(component);
    mutateSections(page, sections, {objectKey: `component:${component.id}`, objectLabel: component.label, action: 'add-component', path: 'sections', before: null, after: {component, sectionId: section.id, index}, meta: {componentId: component.id, sectionId: section.id}});
    window.dispatchEvent(new CustomEvent('nk-admin-guide:editor-action', {detail: {recordId: page.id, action: 'component', componentType: type, componentId: component.id}}));
    setActiveRecordId(page.id);
    setSelection({kind: 'page', slug: page.slug, path: pathForObject(sections, 'component', component.id), edit: 'component', label: component.label, linkPath: '', sectionId: section.id, objectType: 'component', objectId: component.id, positionKey: positionKeyForObject('component', component.id), positionX: 0, positionY: 0});
  };

  const duplicateSelected = () => {
    if (!activeRecord || activeRecord.kind !== 'page' || !selection) return;
    const sections = sectionsForRecord(activeRecord);
    if (selection.objectType === 'section') {
      const index = sections.findIndex(section => section.id === selection.objectId); if (index < 0) return;
      const section = structuredClone(sections[index]);
      const duplicatedGroups = new Map<string, string>();
      section.id = crypto.randomUUID(); section.title = `${section.title} copy`; section.components = section.components.map(component => {
        const groupId = component.groupId ? duplicatedGroups.get(component.groupId) || (() => {const value = crypto.randomUUID(); duplicatedGroups.set(component.groupId, value); return value;})() : '';
        return {...component, id: crypto.randomUUID(), groupId};
      }); sections.splice(index + 1, 0, section);
      mutateSections(activeRecord, sections, {objectKey: `section:${section.id}`, objectLabel: section.title, action: 'duplicate-section', path: 'sections', before: null, after: {section, index: index + 1}, meta: {sectionId: section.id}});
      setSelection({...selection, objectId: section.id, sectionId: section.id, path: `sections.${index + 1}`, label: section.title, positionKey: positionKeyForObject('section', section.id), positionX: 0, positionY: 0});
    } else if (selection.objectType === 'component' && selectedComponent && selectedSection) {
      const section = sections.find(item => item.id === selectedSection.id); if (!section) return;
      const index = section.components.findIndex(component => component.id === selectedComponent.id); const component = normalizeComponent({...structuredClone(selectedComponent), id: crypto.randomUUID(), label: `${selectedComponent.label} copy`, groupId: ''}); section.components.splice(index + 1, 0, component);
      mutateSections(activeRecord, sections, {objectKey: `component:${component.id}`, objectLabel: component.label, action: 'duplicate-component', path: 'sections', before: null, after: {component, sectionId: section.id, index: index + 1}, meta: {componentId: component.id, sectionId: section.id}});
      setSelection({...selection, objectId: component.id, path: pathForObject(sections, 'component', component.id), label: component.label, positionKey: positionKeyForObject('component', component.id), positionX: 0, positionY: 0});
    }
  };

  const deleteSelected = () => {
    if (!activeRecord || !selection) return;
    if (selection.objectType === 'auto' && /^[a-f0-9]{8,16}$/i.test(selection.objectId)) {
      const hiddenPath = `visualOverrides.${selection.objectId}.hidden`;
      let next = setPathValue(activeRecord, hiddenPath, true);
      next = setPathValue(next, `visualOverrides.${selection.objectId}.label`, selection.label || 'Deleted page element');
      mutateWithHistory(activeRecord, next, {objectKey: `auto:${selection.objectId}`, objectLabel: selection.label || 'Page element', action: 'delete-auto', path: hiddenPath, before: Boolean(getPathValue(activeRecord, hiddenPath)), after: true, meta: {autoId: selection.objectId}});
      setNotice('Element deleted from the draft. Restore it below or use Undo.');
      return;
    }
    if (activeRecord.kind !== 'page') return;
    const sections = sectionsForRecord(activeRecord);
    if (selection.objectType === 'section') {
      const index = sections.findIndex(section => section.id === selection.objectId); if (index < 0 || !window.confirm('Delete this entire section from the draft?')) return;
      const section = sections[index]; sections.splice(index, 1); mutateSections(activeRecord, sections, {objectKey: `section:${section.id}`, objectLabel: section.title, action: 'delete-section', path: 'sections', before: {section, index}, after: null, meta: {sectionId: section.id}});
    } else if (selection.objectType === 'component' && selectedComponent && selectedSection) {
      const section = sections.find(item => item.id === selectedSection.id); if (!section) return;
      const index = section.components.findIndex(component => component.id === selectedComponent.id); section.components.splice(index, 1); mutateSections(activeRecord, sections, {objectKey: `component:${selectedComponent.id}`, objectLabel: selectedComponent.label, action: 'delete-component', path: 'sections', before: {component: selectedComponent, sectionId: section.id, index}, after: null, meta: {componentId: selectedComponent.id, sectionId: section.id}});
    }
    setSelection(null);
  };

  const restoreAutomatic = (key: string, label: string) => {
    if (!activeRecord || !/^[a-f0-9]{8,16}$/i.test(key)) return;
    const hiddenPath = `visualOverrides.${key}.hidden`;
    const restoreSelection: VisualSelection = {kind: activeRecord.kind, slug: activeRecord.slug, path: hiddenPath, edit: 'component', label, linkPath: '', sectionId: '', objectType: 'auto', objectId: key, positionKey: key, positionX: 0, positionY: 0};
    patchRecord(activeRecord, hiddenPath, false, true, restoreSelection, 'restore-auto');
    setSelection(null); setNotice(`${label} restored to the draft.`);
  };

  const revealInspector = (area: 'library' | 'properties') => {
    setInspectorOpen(true);
    window.setTimeout(() => inspectorRef.current?.querySelector<HTMLElement>(`[data-visual-inspector-section="${area}"]`)?.scrollIntoView({behavior: 'smooth', block: 'start'}), 0);
  };
  const focusSelectedMove = () => {
    iframeRef.current?.contentWindow?.postMessage({type: 'nk-visual-editor:focus-move', nonce: nonceRef.current}, window.location.origin);
    setNotice('Drag the four-arrow handle on the selected element, or use the arrow keys for precise movement.');
  };
  const openSelectedLink = () => {
    const href = String(selectedLinkValue || '').trim();
    if (!href) return;
    const url = new URL(href, publicPreviewUrl(previewPath));
    if (url.origin === window.location.origin && !logicalPreviewPath(url).startsWith('/admin')) {
      const logicalPath = logicalPreviewPath(url);
      const nextRecord = recordsRef.current.find(record => record.kind === 'page' && previewDocumentKey(previewRoute(record)) === previewDocumentKey(logicalPath));
      if (nextRecord) setActiveRecordId(nextRecord.id);
      transitionPreview(logicalPath);
    }
    else window.open(url.href, '_blank', 'noopener,noreferrer');
  };
  contextActionRef.current = action => {
    if (action === 'add') {revealInspector('library'); return;}
    if (action === 'properties') {revealInspector('properties'); return;}
    if (action === 'duplicate') {duplicateSelected(); return;}
    if (action === 'delete') deleteSelected();
  };

  const groupWith = (otherId: string) => {
    if (!activeRecord || activeRecord.kind !== 'page' || !selectedComponent || !selectedSection) return;
    const sections = sectionsForRecord(activeRecord); const section = sections.find(item => item.id === selectedSection.id); if (!section) return;
    const other = section.components.find(component => component.id === otherId); const current = section.components.find(component => component.id === selectedComponent.id); if (!other || !current) return;
    const before = [current, other].map(component => ({id: component.id, groupId: component.groupId})); const groupId = current.groupId || other.groupId || crypto.randomUUID(); current.groupId = groupId; other.groupId = groupId;
    const after = [current, other].map(component => ({id: component.id, groupId: component.groupId})); mutateSections(activeRecord, sections, {objectKey: `component:${current.id}`, objectLabel: current.label, action: 'group', path: 'sections', before, after, meta: {componentId: current.id, sectionId: section.id, affectedObjectIds: after.map(item => item.id)}});
  };
  const ungroup = () => {
    if (!activeRecord || activeRecord.kind !== 'page' || !selectedComponent?.groupId) return;
    const sections = sectionsForRecord(activeRecord); const grouped = sections.flatMap(section => section.components).filter(component => component.groupId === selectedComponent.groupId); const before = grouped.map(component => ({id: component.id, groupId: component.groupId})); grouped.forEach(component => {component.groupId = '';}); const after = grouped.map(component => ({id: component.id, groupId: ''})); mutateSections(activeRecord, sections, {objectKey: `component:${selectedComponent.id}`, objectLabel: selectedComponent.label, action: 'ungroup', path: 'sections', before, after, meta: {componentId: selectedComponent.id, sectionId: selectedSection?.id || '', affectedObjectIds: after.map(item => item.id)}});
  };

  const saveReusable = () => {
    if (!activeRecord || activeRecord.kind !== 'page' || !selectedComponent) return;
    const name = reusableName.trim() || selectedComponent.label || componentLabels[selectedComponent.type];
    const id = selectedComponent.reusableId || crypto.randomUUID(); const scope = selectedComponent.scope;
    const reusable: ReusableComponent = {id, name, scope, component: normalizeComponent({...structuredClone(selectedComponent), reusableId: id, scope}), updatedAt: new Date().toISOString()};
    const reusablePath = `${pathForObject(activeSections, 'component', selectedComponent.id)}.reusableId`;
    let nextPage = setPathValue(activeRecord, reusablePath, id);
    if (scope === 'global') {
      if (!settingsRecord || !editableKinds.includes('settings')) {setNotice('Your role cannot save global components. Choose Local instead.'); return;}
      const library = reusableFrom(settingsRecord.draft.globalComponents).filter(item => item.id !== id); library.push(reusable); const nextSettings = cloneRecord(settingsRecord); nextSettings.draft.globalComponents = library; commitRecord(nextSettings, false);
      const context = objectContext(activeRecord, reusablePath, selection);
      mutateWithHistory(activeRecord, nextPage, {...context, action: 'reusable', path: reusablePath, before: selectedComponent.reusableId, after: id}, false);
      const affectedIds = [settingsRecord.id, activeRecord.id];
      let syncedPages = 1;
      for (const page of recordsRef.current.filter(record => record.kind === 'page' && record.id !== activeRecord.id)) {
        const pageSections = sectionsForRecord(page);
        let changed = false;
        pageSections.forEach(section => {section.components = section.components.map(instance => {
          if (instance.scope !== 'global' || instance.reusableId !== id) return instance;
          const synced = normalizeComponent({...structuredClone(reusable.component), id: instance.id, enabled: instance.enabled, groupId: instance.groupId, reusableId: id, scope: 'global'});
          if (!sameValue(instance, synced)) changed = true;
          return synced;
        });});
        if (!changed) continue;
        const syncedPage = cloneRecord(page); syncedPage.draft.sections = pageSections; commitRecord(syncedPage, false); affectedIds.push(page.id); syncedPages += 1;
      }
      window.requestAnimationFrame(() => postRecords(recordsRef.current, affectedIds));
      setReusableName(''); setNotice(`${name} synced to ${syncedPages} page draft${syncedPages === 1 ? '' : 's'}. Publish Global settings when the site-wide definition is ready.`);
      return;
    }
    const library = reusableFrom(activeRecord.draft.componentLibrary).filter(item => item.id !== id); library.push(reusable); nextPage.draft.componentLibrary = library;
    const context = objectContext(activeRecord, reusablePath, selection);
    mutateWithHistory(activeRecord, nextPage, {...context, action: 'reusable', path: reusablePath, before: selectedComponent.reusableId, after: id});
    setReusableName(''); setNotice(`${name} saved as a ${scope} reusable component.`);
  };

  useEffect(() => {
    const guidePage = () => guideSession ? recordsRef.current.find(record => record.id === guideSession.session.recordId && record.kind === 'page') : null;
    const structureFor = (page: ContentRecord) => sectionsForRecord(page).map(section => ({
      id: section.id, type: section.type, title: section.title.trim().slice(0, 240), body: section.body.trim().slice(0, 800), layout: section.layout,
      columns: Math.min(4, Math.max(1, Number(section.columns) || 1)), enabled: section.enabled !== false,
      components: section.components.map(component => ({
        id: component.id, type: component.type, label: component.label.trim().slice(0, 120), text: component.text.trim().slice(0, 600), image: component.image.trim().slice(0, 500),
        images: component.images.slice(0, 8).map(image => image.trim().slice(0, 500)).filter(Boolean), width: Math.min(100, Math.max(20, Number(component.style.width) || 100)), tone: component.style.tone, enabled: component.enabled !== false,
      })),
    }));
    const contextFor = (page: ContentRecord) => {
      const ignoredCoreFields = new Set(['sections', 'componentLibrary', 'editorHistory', 'visualOverrides', 'visualPlacements', 'aiGuideSession']);
      if (page.id === guideSession?.session.recordId) {
        ['eyebrow', 'heroTitle', 'heroAccent', 'heroTail', 'heroBody', 'sectionTitle', 'sectionBody', 'heroImage', 'introTitle', 'introAccent', 'introBody'].forEach(field => ignoredCoreFields.add(field));
      }
      const coreContent = Object.fromEntries(Object.entries(page.draft).flatMap(([key, value]) => !ignoredCoreFields.has(key) && ['string', 'number', 'boolean'].includes(typeof value) ? [[key, value as string | number | boolean]] : []));
      const previewDocument = iframeRef.current?.contentDocument;
      const renderedOutline = previewDocument ? [...previewDocument.querySelectorAll<HTMLElement>('main section')].slice(0, 30).map((element, index) => ({
        index, id: element.id || '', role: element.getAttribute('aria-label') || element.getAttribute('data-visual-label') || '', className: element.className.slice(0, 240),
        headings: [...element.querySelectorAll<HTMLElement>('h1,h2,h3')].slice(0, 8).map(heading => (heading.innerText || heading.textContent || '').trim().slice(0, 240)).filter(Boolean),
        textSample: (element.innerText || element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 1200), imageCount: element.querySelectorAll('img,video').length,
        links: [...element.querySelectorAll<HTMLElement>('a,button')].slice(0, 12).map(link => (link.innerText || link.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 180)).filter(Boolean),
        builderSectionId: element.getAttribute('data-visual-section-id') || '',
      })) : [];
      return {
        brief: guideSession?.session.brief,
        page: {id: page.id, slug: page.slug, title: page.title, route: previewRoute(page), sections: structureFor(page)},
        coreContent, renderedOutline,
        availableMedia: media.filter(asset => asset.active && asset.mimeType.startsWith('image/')).slice(0, 30).map(asset => ({id: asset.id, url: asset.url, alt: asset.altText || asset.title || asset.filename})),
        recentChanges: historyFrom(page.draft.editorHistory).slice(-12).map(entry => `${actionLabels[entry.action]}: ${entry.objectLabel}`),
      };
    };
    const runGuideStart = (event: Event) => {
      const detail = (event as CustomEvent<CmsGuideStartEventDetail>).detail;
      if (!detail) return;
      detail.handled();
      void (async () => {
        if (!editableKinds.includes('page')) throw new Error('You do not have permission to create an interactive demo page.');
        const existing = guideSession && recordsRef.current.find(record => record.id === guideSession.session.recordId);
        if (existing) {
          setActiveRecordId(existing.id); transitionPreview(guideSession.session.route); setSelection(null);
          detail.resolve({session: guideSession.session});
          return;
        }
        const token = `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 6)}`;
        const slug = `guided-page-${token}`;
        const route = `/pages/${slug}`;
        const startedAt = new Date().toISOString();
        const title = detail.brief.title.trim().slice(0, 240) || (detail.language === 'el' ? 'Σελίδα από τον AI οδηγό' : 'AI guided page');
        const result = await adminApi<{record: ContentRecord}>('/content', {method: 'POST', body: JSON.stringify({
          kind: 'page', title, slug, category: 'AI guided pages', tags: ['ai-guide', 'temporary', detail.brief.pageType, detail.brief.goal],
          data: {
            eyebrow: detail.language === 'el' ? 'AI ΔΗΜΙΟΥΡΓΙΑ ΣΕΛΙΔΑΣ' : 'AI PAGE BUILD', heroTitle: title,
            heroAccent: '', heroTail: '', heroBody: detail.brief.notes || (detail.language === 'el' ? 'Πρόχειρη σελίδα του διαδραστικού οδηγού.' : 'Interactive guide draft page.'),
            sectionTitle: '', sectionBody: '', heroImage: '', route, navigationTitle: title, introTitle: '', introAccent: '', introBody: '',
            sections: [], componentLibrary: [], editorHistory: [], visualOverrides: {}, visualPlacements: {}, aiGuideSession: {temporary: true, startedAt, brief: detail.brief},
          },
        })});
        const record = normalizeLoadedRecord(result.record);
        const nextRecords = replaceRecords(records => [...records, record].sort((left, right) => left.kind.localeCompare(right.kind) || left.position - right.position));
        savePhasesRef.current = {...savePhasesRef.current, [record.id]: 'saved'};
        setSavePhases(current => ({...current, [record.id]: 'saved'}));
        setActiveRecordId(record.id); setSelection(null); setNotice('AI page workspace ready. This separate draft has not been published.');
        transitionPreview(route); window.requestAnimationFrame(() => postRecords(nextRecords, [record.id]));
        const session = {recordId: record.id, slug, title, route, startedAt, brief: detail.brief};
        setGuideSession({session, returnRecordId: activeRecord?.id || ''});
        detail.resolve({session});
      })().catch(detail.reject);
    };
    const runGuideStep = (event: Event) => {
      const detail = (event as CustomEvent<CmsGuideStepEventDetail>).detail;
      if (!detail) return;
      detail.handled();
      void (async () => {
        const page = guidePage();
        if (!page) throw new Error('Start the interactive guide to create its blank demo page first.');
        const context = contextFor(page);
        const response = await adminApi<{proposal: CmsGuideAction; context: CmsGuideContext}>('/guide/next', {method: 'POST', body: JSON.stringify({language: detail.language, context})});
        detail.resolve({proposal: response.proposal, context: response.context, applied: false, objectLabel: response.proposal.action === 'insert_section' ? response.proposal.section.title : response.proposal.component.label});
      })().catch(detail.reject);
    };
    const applyGuideStep = (event: Event) => {
      const detail = (event as CustomEvent<CmsGuideApplyEventDetail>).detail;
      if (!detail) return;
      detail.handled();
      void (async () => {
        const current = guidePage();
        if (!current) throw new Error('The temporary demo page is no longer available. Start the guide again.');
        if (detail.context.page.id !== current.id || !sameValue(detail.context.page.sections, structureFor(current))) throw new Error('The page changed after the suggestion. Analyse it again so the next action fits the current layout.');
        const proposal = detail.proposal;
        if (proposal.action === 'complete') {detail.resolve({proposal, context: detail.context, applied: false, objectLabel: ''}); return;}
        const currentSections = sectionsForRecord(current);
        if (currentSections.length >= 40 && proposal.action === 'insert_section') throw new Error('The page reached its section limit before the action could be applied.');
        const approvedMedia = new Set(media.filter(asset => asset.active && asset.mimeType.startsWith('image/')).map(asset => asset.url));
        if (proposal.action === 'insert_component' && ((proposal.component.image && !approvedMedia.has(proposal.component.image)) || proposal.component.images.some(image => !approvedMedia.has(image)))) throw new Error('The suggestion references media that is no longer active. Analyse the page again.');
        let sectionId = '';
        let objectType: 'section' | 'component' = 'section';
        let objectId = '';
        let objectLabel = '';
        if (proposal.action === 'insert_section') {
          const afterIndex = currentSections.length ? currentSections.findIndex(section => section.id === proposal.afterSectionId) : -1;
          if (currentSections.length && afterIndex < 0) throw new Error('The suggested section position no longer exists. Analyse the page again.');
          const section = newSection();
          Object.assign(section, proposal.section, {id: crypto.randomUUID(), enabled: true, components: []});
          const index = currentSections.length ? afterIndex + 1 : 0;
          currentSections.splice(index, 0, section);
          mutateSections(current, currentSections, {objectKey: `section:${section.id}`, objectLabel: section.title, action: 'add-section', path: 'sections', before: null, after: {section, index}, meta: {sectionId: section.id, source: 'ai-guide'}});
          sectionId = section.id;
          objectId = section.id;
          objectLabel = section.title;
          setSelection({kind: 'page', slug: current.slug, path: `sections.${index}`, edit: 'section', label: section.title, linkPath: '', sectionId, objectType: 'section', objectId: section.id, positionKey: positionKeyForObject('section', section.id), positionX: 0, positionY: 0});
        } else {
          const section = currentSections.find(item => item.id === proposal.targetSectionId);
          if (!section) throw new Error('The suggested target section no longer exists. Analyse the page again.');
          if (section.components.length >= 80) throw new Error('That section has reached its component limit.');
          const component = newComponent(proposal.component.type, {label: proposal.component.label, text: proposal.component.text, url: proposal.component.url, image: proposal.component.image, images: proposal.component.images, alt: proposal.component.alt, icon: proposal.component.icon});
          const afterIndex = proposal.afterComponentId ? section.components.findIndex(item => item.id === proposal.afterComponentId) : section.components.length - 1;
          if (proposal.afterComponentId && afterIndex < 0) throw new Error('The suggested component position no longer exists. Analyse the page again.');
          const componentIndex = afterIndex + 1;
          section.components.splice(componentIndex, 0, component);
          mutateSections(current, currentSections, {objectKey: `component:${component.id}`, objectLabel: component.label, action: 'add-component', path: 'sections', before: null, after: {component, sectionId: section.id, index: componentIndex}, meta: {componentId: component.id, sectionId: section.id, source: 'ai-guide'}});
          sectionId = section.id;
          objectType = 'component';
          objectId = component.id;
          objectLabel = component.label;
          setSelection({kind: 'page', slug: current.slug, path: pathForObject(currentSections, 'component', component.id), edit: 'component', label: component.label, linkPath: '', sectionId, objectType: 'component', objectId: component.id, positionKey: positionKeyForObject('component', component.id), positionX: 0, positionY: 0});
        }
        setNotice(`${proposal.explanation.summary} Saved only to the guided page draft.`);
        window.setTimeout(() => iframeRef.current?.contentWindow?.postMessage({type: 'nk-visual-editor:guide-highlight', nonce: nonceRef.current, objectType, objectId}, window.location.origin), 120);
        detail.resolve({proposal, context: detail.context, applied: true, objectLabel});
      })().catch(detail.reject);
    };
    const finishGuide = (event: Event) => {
      const detail = (event as CustomEvent<CmsGuideFinishEventDetail>).detail;
      if (!detail) return;
      detail.handled();
      void (async () => {
        const sessionState = guideSession;
        const current = guidePage();
        if (!sessionState || !current) throw new Error('The temporary demo page is no longer available.');
        if (detail.mode === 'keep' || detail.mode === 'publish') {
          const next = cloneRecord(current);
          delete next.draft.aiGuideSession;
          next.category = 'AI guided pages';
          next.tags = next.tags.filter(tag => tag !== 'temporary');
          commitRecord(next);
          await flushSave(next.id);
          const saved = recordsRef.current.find(record => record.id === next.id);
          if (!saved) throw new Error('The guided page could not be reloaded after saving.');
          if (detail.mode === 'publish') {
            const result = await adminApi<{record: ContentRecord}>(`/content/${saved.id}/publish`, {method: 'POST', body: JSON.stringify({expectedVersion: saved.version})});
            const published = normalizeLoadedRecord(result.record);
            const nextRecords = replaceRecords(records => records.map(record => record.id === published.id ? published : record));
            savePhasesRef.current = {...savePhasesRef.current, [published.id]: 'saved'};
            saveErrorsRef.current = {...saveErrorsRef.current, [published.id]: ''};
            setSavePhases(phases => ({...phases, [published.id]: 'saved'}));
            postRecords(nextRecords, [published.id]); setGuideSession(null);
            setNotice('The guided page was published. Its live route now uses this version.');
            detail.resolve({mode: detail.mode, recordId: published.id, route: sessionState.session.route, status: 'published'});
            return;
          }
          setGuideSession(null);
          setNotice('The guided page is now a normal draft. Nothing was published.');
          detail.resolve({mode: detail.mode, recordId: current.id, route: sessionState.session.route, status: 'draft'});
          return;
        }
        const timer = saveTimersRef.current.get(current.id);
        if (timer) window.clearTimeout(timer);
        saveTimersRef.current.delete(current.id);
        const running = savePromisesRef.current.get(current.id);
        if (running) await running;
        const followupTimer = saveTimersRef.current.get(current.id);
        if (followupTimer) window.clearTimeout(followupTimer);
        saveTimersRef.current.delete(current.id); pendingSaveRef.current.delete(current.id);
        await adminApi(`/content/${current.id}`, {method: 'DELETE'});
        const nextRecords = replaceRecords(records => records.filter(record => record.id !== current.id));
        const fallback = nextRecords.find(record => record.id === sessionState.returnRecordId) || nextRecords.find(record => record.kind === 'page' && record.slug === 'homepage') || nextRecords.find(record => record.kind === 'page') || nextRecords[0];
        setGuideSession(null); setSelection(null); setNotice('The temporary demo page and all of its components were deleted.');
        if (fallback) {setActiveRecordId(fallback.id); transitionPreview(previewRoute(fallback));}
        detail.resolve({mode: detail.mode, recordId: current.id, route: sessionState.session.route, status: 'deleted'});
      })().catch(detail.reject);
    };
    window.addEventListener(CMS_GUIDE_START_EVENT, runGuideStart);
    window.addEventListener(CMS_GUIDE_STEP_EVENT, runGuideStep);
    window.addEventListener(CMS_GUIDE_APPLY_EVENT, applyGuideStep);
    window.addEventListener(CMS_GUIDE_FINISH_EVENT, finishGuide);
    return () => {
      window.removeEventListener(CMS_GUIDE_START_EVENT, runGuideStart);
      window.removeEventListener(CMS_GUIDE_STEP_EVENT, runGuideStep);
      window.removeEventListener(CMS_GUIDE_APPLY_EVENT, applyGuideStep);
      window.removeEventListener(CMS_GUIDE_FINISH_EVENT, finishGuide);
    };
  }, [activeRecord?.id, commitRecord, editableKinds, flushSave, guideSession, media, mutateSections, postRecords, replaceRecords, transitionPreview]);

  const option = viewportOptions[viewport];
  if (loading) return <div className="nk-visual-loading"><LoaderCircle className="nk-admin-spin"/><strong>Loading the real website preview…</strong></div>;
  if (loadError) return <div className="nk-visual-error"><AlertTriangle/><h1>The visual editor could not load.</h1><p>{loadError}</p><button type="button" onClick={() => void load()}>Try again</button></div>;
  if (!activeRecord) return <div className="nk-visual-error"><Layers3/><h1>No content is available.</h1><p>Create the first record before opening the visual editor.</p></div>;
  const statusText = phase === 'unsaved' ? 'Unsaved changes' : phase === 'saving' ? 'Saving draft…' : phase === 'error' ? 'Draft not saved' : activeRecord.status === 'published' ? 'Published' : activeRecord.published ? 'Draft saved · published version is live' : 'Draft saved';
  const StatusIcon = phase === 'saving' ? LoaderCircle : phase === 'error' ? AlertTriangle : phase === 'unsaved' ? Cloud : Check;
  const interactiveStudioAvailable = (activeRecord.kind === 'service' && activeRecord.slug === 'electrical-installations')
    || logicalPreviewPath(publicPreviewUrl(previewPath)) === '/services/electrical-installations';

  return <div className={`nk-visual-editor ${siteView ? 'nk-visual-editor--site-view' : ''}`}>
    <header className="nk-visual-toolbar">
      <div className="nk-visual-document"><span>VISUAL WEBSITE EDITOR</span><details ref={documentMenuRef}><summary aria-label={`Choose ${kindLabels[kind].toLowerCase()}`}><b>{kindLabels[activeRecord.kind]}</b><span>{activeRecord.title}{activeRecord.kind !== kind && ' · global element'}</span><ChevronDown/></summary><div role="listbox" aria-label={`${kindLabels[kind]} records`}>{documentOptions.map(record => <button type="button" role="option" aria-selected={record.id === activeRecord.id} className={record.id === activeRecord.id ? 'active' : ''} onClick={() => {chooseRecord(record.id); if (documentMenuRef.current) documentMenuRef.current.open = false;}} key={record.id}><span>{record.title}</span>{record.kind !== kind && <small>Global element</small>}</button>)}</div></details></div>
      <div className="nk-visual-viewports" aria-label="Preview viewport">{(Object.entries(viewportOptions) as [ViewportName, typeof option][]).map(([name, item]) => <button type="button" className={viewport === name ? 'active' : ''} aria-pressed={viewport === name} onClick={() => setViewport(name)} key={name}><item.icon/><span>{item.label}</span><small>{item.width}</small></button>)}</div>
      <div className="nk-visual-publish">{siteView && <div className="nk-visual-mode-controls"><button type="button" className={`nk-visual-mode-toggle ${editMode ? 'active' : ''}`} aria-pressed={editMode} onClick={() => setEditMode(current => !current)}>{editMode ? <Check/> : <Pencil/>}<span><b>Edit mode</b><small>{editMode ? 'ON' : 'OFF'}</small></span></button><button type="button" className="nk-visual-tools-toggle" disabled={!editMode} aria-expanded={inspectorOpen} onClick={() => setInspectorOpen(current => !current)}>{inspectorOpen ? <PanelRightClose/> : <PanelRightOpen/>}<span>Elements</span></button></div>}<div className={`nk-visual-save-state ${phase}`} role="status"><StatusIcon className={phase === 'saving' ? 'nk-admin-spin' : ''}/><span><b>{statusText}</b><small>{activeRecord.title} · v{activeRecord.version}</small></span></div>{interactiveStudioAvailable && <button className="nk-visual-studio-link" type="button" onClick={() => navigate('/admin/interactive')}><Clapperboard/><span>Interactive Studio</span></button>}<a href={previewHref(previewPath)} target="_blank" rel="noreferrer">View live <ExternalLink/></a>{canWriteCurrent && <button className="nk-admin-primary" type="button" disabled={publishing || phase === 'saving' || phase === 'error'} onClick={() => void publish()}><Rocket/>{publishing ? 'Publishing…' : 'Publish'}</button>}</div>
    </header>
    {(saveErrors[activeRecord.id] || notice) && <div className={`nk-visual-notice ${saveErrors[activeRecord.id] ? 'error' : ''}`} role={saveErrors[activeRecord.id] ? 'alert' : 'status'}>{saveErrors[activeRecord.id] ? <AlertTriangle/> : <Check/>}<span>{saveErrors[activeRecord.id] || notice}</span><button type="button" onClick={() => {setNotice(''); setSaveErrors(current => ({...current, [activeRecord.id]: ''}));}}>Dismiss</button></div>}
    <div className={`nk-visual-workspace ${siteView ? 'nk-visual-workspace--site-view' : ''} ${inspectorOpen ? 'inspector-open' : 'inspector-closed'}`}>
      <section className="nk-visual-canvas" aria-label={`${option.label} website preview`}>
        <div className="nk-visual-canvas-hint">{editMode ? <Move/> : <MousePointer2/>}<span className="nk-visual-hint-full">{!editMode ? 'Navigation is active. Turn on Edit Mode when you want to change the site.' : editableKinds.includes(activeRecord.kind) ? 'Click an element to edit. Ctrl/cmd + click or use Open link to navigate while editing.' : 'Read-only preview.'}</span><span className="nk-visual-hint-mobile">{!editMode ? 'Browse normally · Edit Mode is off' : editableKinds.includes(activeRecord.kind) ? 'Tap an element · use Open to navigate' : 'Read-only preview'}</span><b>{option.width} × {option.height}</b></div>
        {siteView && editMode && selection && <div className="nk-visual-live-actions" role="toolbar" aria-label="Selected element quick actions"><strong title={selection.label}>{selection.label}</strong><button type="button" onClick={() => revealInspector('properties')}><Pencil/><span>Edit</span></button><button type="button" onClick={() => revealInspector('library')}><Plus/><span>Add</span></button><button type="button" onClick={focusSelectedMove}><Move/><span>Move</span></button>{['section', 'component'].includes(selection.objectType) && <button type="button" onClick={duplicateSelected}><Copy/><span>Copy</span></button>}<button className="danger" type="button" onClick={deleteSelected}><Trash2/><span>Delete</span></button>{Boolean(selectedLinkValue) && <button type="button" onClick={openSelectedLink}><ExternalLink/><span>Open</span></button>}</div>}
        <div className="nk-visual-stage" ref={stageRef}><div className="nk-visual-frame-sizer" style={{width: option.width * scale, height: option.height * scale}}><iframe ref={iframeRef} title={`${option.label} live website preview`} src={previewSrc(previewPath, nonceRef.current)} onLoad={handleFrameLoad} style={{width: option.width, height: option.height, transform: `scale(${scale})`}}/>{!frameReady && <div className="nk-visual-frame-loading"><LoaderCircle className="nk-admin-spin"/>Rendering live preview…</div>}</div></div>
      </section>
      {siteView && inspectorOpen && <button className="nk-visual-inspector-scrim" type="button" aria-label="Close elements panel" onClick={() => setInspectorOpen(false)}/>}
      <aside ref={inspectorRef} className={`nk-visual-inspector ${siteView ? inspectorOpen ? 'is-open' : 'is-closed' : ''}`} aria-label="Builder tools and selected element properties" aria-hidden={siteView && !inspectorOpen}>
        {siteView && <div className="nk-visual-drawer-header"><span>ELEMENTS &amp; PROPERTIES</span><button type="button" aria-label="Close elements panel" onClick={() => setInspectorOpen(false)}><X/></button></div>}
        <section className="nk-visual-admin-meta"><header><Tags/><span><b>ADMIN ORGANISATION</b><small>Search, filters and work queue</small></span></header><label>Category<input value={activeRecord.category || ''} disabled={!canWriteCurrent} onChange={event => updateAdminMeta('category', event.target.value)} placeholder="e.g. Residential, Campaign"/></label><label>Tags<input value={(activeRecord.tags || []).join(', ')} disabled={!canWriteCurrent} onChange={event => updateAdminMeta('tags', event.target.value.split(',').map(value => value.trim()).filter(Boolean))} placeholder="priority, lighting, showroom"/></label></section>
        {pageForComponents && editableKinds.includes('page') && <section className="nk-visual-builder-library" data-visual-inspector-section="library"><header><span>ADD TO PAGE</span><button type="button" data-guide="add-section" onClick={addSection}><Plus/>Section</button></header><div className="nk-visual-component-palette">{componentTypes.map(type => <button type="button" data-guide={`add-component-${type}`} onClick={() => addComponent(type)} key={type}><Plus/><span>{componentLabels[type]}</span></button>)}</div>{reusableComponents.length > 0 && <div className="nk-visual-reusable-list"><b>Reusable components</b>{reusableComponents.map(item => <button type="button" onClick={() => addComponent(item.component.type, item)} key={`${item.scope}-${item.id}`}><Plus/><span>{item.name}</span><small>{item.scope}</small></button>)}</div>}</section>}
        <header data-visual-inspector-section="properties"><span>PROPERTIES</span><h2>{selection?.label || 'Select an element'}</h2><p>{selection ? `${kindLabels[selection.kind]} · ${selection.slug}` : 'Click directly on the page. The relevant controls appear here.'}</p></header>
        {!selection && <div className="nk-visual-empty-selection"><MousePointer2/><strong>Edit on the page itself</strong><p>Select an element to reveal its four-arrow move handle. Drag freely, or use the keyboard arrows for precise positioning.</p></div>}
        {selection && selectedRecord && !editableKinds.includes(selectedRecord.kind) && <div className="nk-visual-readonly"><AlertTriangle/><b>Read-only element</b><p>Your role can preview this content but cannot change it.</p></div>}
        {selection && selectedRecord && editableKinds.includes(selectedRecord.kind) && <div className="nk-visual-property-stack">
          {selection.edit === 'text' && <label><span><Type/>Text</span>{String(selectedValue || '').length > 70 || selection.path.toLowerCase().includes('body') || selection.path.includes('description') || selection.path.includes('introduction') ? <textarea rows={6} value={String(selectedValue || '')} onChange={event => updateSelection(event.target.value)}/> : <input value={String(selectedValue || '')} onChange={event => updateSelection(event.target.value)}/>}<small>You can also type directly in the preview.</small></label>}
          {selection.edit === 'image' && <><label><span><ImageIcon/>Image or video URL</span><input type="url" value={String(selectedValue || '')} onChange={event => updateSelection(event.target.value)}/></label><div className="nk-visual-media"><span>MEDIA LIBRARY</span>{media.filter(asset => asset.mimeType.startsWith('image/')).length ? <div>{media.filter(asset => asset.mimeType.startsWith('image/')).slice(0, 12).map(asset => <button type="button" className={asset.url === selectedValue ? 'active' : ''} onClick={() => updateSelection(asset.url)} key={asset.id}><img src={asset.url} alt={asset.altText || asset.filename}/><small>{asset.filename}</small></button>)}</div> : <p>No active images. Upload one in Media or paste a public URL.</p>}</div></>}
          {selection.edit === 'icon' && <label><span><Layers3/>Icon</span><select value={String(selectedValue || 'check')} onChange={event => updateSelection(event.target.value)}>{!iconOptions.includes(String(selectedValue || 'check')) && <option value={String(selectedValue || 'check')}>{String(selectedValue || 'check')}</option>}{iconOptions.map(icon => <option value={icon} key={icon}>{icon}</option>)}</select></label>}
          {selection.linkPath && <label><span><Link2/>Link destination</span><input value={String(getPathValue(selectedRecord, selection.linkPath) ?? selection.linkFallbackValue ?? '')} onChange={event => updateSelection(event.target.value, selection.linkPath)} placeholder="/contact or https://…"/></label>}
          {selectedComponent?.type === 'gallery' && <div className="nk-visual-gallery-tools"><label><span><ImageIcon/>Gallery images</span><textarea rows={5} value={selectedComponent.images.join('\n')} onChange={event => updateSelection(event.target.value.split('\n').map(value => value.trim()).filter(Boolean).slice(0, 8), `${pathForObject(activeSections, 'component', selectedComponent.id)}.images`, 'replace')}/><small>One image URL per line, up to 8 images.</small></label><label><span>Alternative text</span><input value={selectedComponent.alt} onChange={event => updateSelection(event.target.value, `${pathForObject(activeSections, 'component', selectedComponent.id)}.alt`)}/><small>Used as the base description for each gallery image.</small></label><div className="nk-visual-media"><span>MEDIA LIBRARY · SELECT 2–8</span>{media.filter(asset => asset.mimeType.startsWith('image/')).length ? <div>{media.filter(asset => asset.mimeType.startsWith('image/')).slice(0, 20).map(asset => {const active = selectedComponent.images.includes(asset.url); return <button type="button" className={active ? 'active' : ''} aria-pressed={active} onClick={() => updateSelection(active ? selectedComponent.images.filter(url => url !== asset.url) : [...selectedComponent.images, asset.url].slice(0, 8), `${pathForObject(activeSections, 'component', selectedComponent.id)}.images`, 'replace')} key={asset.id}><img src={asset.url} alt={asset.altText || asset.filename}/><small>{asset.filename}</small></button>;})}</div> : <p>Upload images in Media before building a gallery.</p>}</div></div>}
          <div className="nk-visual-object-tools nk-visual-position-tools"><p><Move/>Drag the four-arrow control on the selected element. Arrow keys move 1 px; hold Shift to move 10 px.</p><div><span>X <b>{selection.positionX}px</b></span><span>Y <b>{selection.positionY}px</b></span></div><button type="button" disabled={!selection.positionX && !selection.positionY} onClick={() => handlePosition({kind: selection.kind, slug: selection.slug, positionKey: selection.positionKey, x: 0, y: 0, label: selection.label, objectType: selection.objectType, objectId: selection.objectId, sectionId: selection.sectionId})}><Move/>Reset position</button><small>One saved position is shared by Desktop, Tablet and Mobile.</small></div>
          {selectedSection && selection.objectType === 'section' && <div className="nk-visual-object-tools"><label><span><Layers3/>Section layout</span><select value={selectedSection.layout} onChange={event => updateSelection(event.target.value, `${selection.path}.layout`, 'style')}><option value="stack">Stack</option><option value="grid">Grid</option><option value="split">Split</option></select></label><label><span>Columns</span><input type="range" min="1" max="4" value={selectedSection.columns} onChange={event => updateSelection(Number(event.target.value), `${selection.path}.columns`, 'resize')}/><small>{selectedSection.columns} column{selectedSection.columns === 1 ? '' : 's'}</small></label><label className="nk-visual-toggle"><input type="checkbox" checked={selectedSection.enabled} onChange={event => updateSelection(event.target.checked, `${selection.path}.enabled`)}/><span>Visible in this draft</span></label></div>}
          {selectedComponent && <div className="nk-visual-object-tools"><label><span>Component name</span><input value={selectedComponent.label} onChange={event => updateSelection(event.target.value, `${pathForObject(activeSections, 'component', selectedComponent.id)}.label`)}/></label><label><span>Width</span><input type="range" min="20" max="100" step="5" value={selectedComponent.style.width} onChange={event => updateSelection(Number(event.target.value), `${pathForObject(activeSections, 'component', selectedComponent.id)}.style.width`, 'resize')}/><small>{selectedComponent.style.width}%</small></label><div className="nk-visual-property-grid"><label><span>Alignment</span><select value={selectedComponent.style.align} onChange={event => updateSelection(event.target.value, `${pathForObject(activeSections, 'component', selectedComponent.id)}.style.align`, 'style')}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option><option value="stretch">Stretch</option></select></label><label><span>Tone</span><select value={selectedComponent.style.tone} onChange={event => updateSelection(event.target.value, `${pathForObject(activeSections, 'component', selectedComponent.id)}.style.tone`, 'style')}><option value="default">Default</option><option value="accent">Accent</option><option value="muted">Muted</option><option value="dark">Dark</option></select></label></div><div className="nk-visual-property-grid"><label><span>Padding</span><input type="number" min="0" max="64" value={selectedComponent.style.padding} onChange={event => updateSelection(Number(event.target.value), `${pathForObject(activeSections, 'component', selectedComponent.id)}.style.padding`, 'style')}/></label><label><span>Radius</span><input type="number" min="0" max="48" value={selectedComponent.style.radius} onChange={event => updateSelection(Number(event.target.value), `${pathForObject(activeSections, 'component', selectedComponent.id)}.style.radius`, 'style')}/></label></div><label><span>Scope</span><select value={selectedComponent.scope} onChange={event => updateSelection(event.target.value, `${pathForObject(activeSections, 'component', selectedComponent.id)}.scope`, 'scope')}><option value="local">Local to this page</option><option value="global">Global site component</option></select></label><div className="nk-visual-save-reusable"><input value={reusableName} onChange={event => setReusableName(event.target.value)} placeholder="Reusable component name"/><button type="button" onClick={saveReusable}><Save/>{selectedComponent.scope === 'global' ? 'Save & sync global' : 'Save reusable'}</button></div>{selectedComponent.groupId ? <button type="button" onClick={ungroup}><Ungroup/>Ungroup components</button> : selectedSection && selectedSection.components.length > 1 && <label><span><Group/>Group with</span><select value="" onChange={event => groupWith(event.target.value)}><option value="">Choose component…</option>{selectedSection.components.filter(item => item.id !== selectedComponent.id).map(item => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label>}</div>}
          {['section', 'component'].includes(selection.objectType) && <div className="nk-visual-object-actions"><button type="button" onClick={duplicateSelected}><Copy/>Duplicate</button><button className="danger" type="button" onClick={deleteSelected}><Trash2/>Delete</button></div>}
          {selection.objectType === 'auto' && <div className="nk-visual-object-tools nk-visual-auto-tools"><button className="danger" type="button" onClick={deleteSelected}><Trash2/>Delete this element</button></div>}
        </div>}
        {hiddenAutomaticItems.length > 0 && <section className="nk-visual-hidden-items"><header><span>DELETED CONTENT</span><b>{hiddenAutomaticItems.length} restorable element{hiddenAutomaticItems.length === 1 ? '' : 's'}</b></header>{hiddenAutomaticItems.map(item => <button type="button" onClick={() => restoreAutomatic(item.key, item.label)} key={item.key}><Undo2/><span><b>{item.label}</b><small>Restore to this draft</small></span></button>)}</section>}
        {activeRecord && <section className="nk-visual-history"><header><div><span>HISTORY</span><b>{historyMode === 'object' ? selection?.label || 'Selected object' : `Entire ${kindLabels[activeRecord.kind].toLowerCase()}`}</b></div><div><button type="button" className={historyMode === 'object' ? 'active' : ''} onClick={() => setHistoryMode('object')} disabled={!selection}>Object</button><button type="button" className={historyMode === 'page' ? 'active' : ''} onClick={() => setHistoryMode('page')}>Record</button></div></header><div className="nk-visual-history-actions"><button type="button" onClick={() => runHistory('undo')} disabled={!shownHistory.some(entry => entry.active)}><Undo2/>Undo <kbd>Ctrl Z</kbd></button><button type="button" onClick={() => runHistory('redo')} disabled={!shownHistory.some(entry => !entry.active)}><Redo2/>Redo <kbd>Ctrl Shift Z</kbd></button></div>{shownHistory.length ? <ol>{[...shownHistory].reverse().map(entry => <li className={!entry.active ? 'undone' : ''} key={entry.id}><i/><span><b>{actionLabels[entry.action]}</b><small>{entry.objectLabel} · {new Date(entry.timestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}{!entry.active ? ' · undone' : ''}</small></span></li>)}</ol> : <div className="nk-visual-history-empty">{historyMode === 'object' && !selection ? 'Select an object to see its independent history.' : 'No changes recorded yet.'}</div>}</section>}
        <footer><Cloud/><span>Drafts save automatically. The public website changes only when you press <b>Publish</b>.</span></footer>
      </aside>
    </div>
  </div>;
}
