import {useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent} from 'react';
import {createPortal} from 'react-dom';
import {AlignCenter, AlignJustify, AlignLeft, AlignRight, Check, Cloud, History, LoaderCircle, Pencil, Redo2, Rocket, RotateCcw, Type, Undo2, X} from 'lucide-react';
import {useLocation} from 'react-router-dom';
import {canWriteKind} from '../admin/permissions';
import type {AdminRole, ContentKind, ContentRecord, VisualHistoryAction, VisualHistoryEntry} from '../admin/types';
import {historyFrom} from '../admin/content/visualEditorModel';
import {VisualEditingBridge} from './VisualEditingBridge';
import {LIVE_EDITOR_MESSAGE_EVENT, LIVE_EDITOR_NONCE, sendLiveEditorCommand} from './liveEditorEvents';

const isPagesAdminMode = import.meta.env.MODE === 'github-pages';
const allKinds: ContentKind[] = ['page', 'service', 'product', 'catalogue', 'project', 'company', 'seo', 'settings'];
const LIVE_EDIT_BASELINE_KEY = 'nk-live-edit-session-baseline-v1';
type SaveState = 'idle' | 'loading' | 'saving' | 'saved' | 'error';
type HistoryMode = 'object' | 'record';
type VisualFontChoice = '' | 'display' | 'body' | 'mono' | 'serif';
type VisualTextAlignment = 'left' | 'center' | 'right' | 'justify';
type LiveSelection = {kind: ContentKind; slug: string; path: string; edit: string; label: string; linkPath: string; fallbackValue: string; linkFallbackValue: string; sectionId: string; objectType: string; objectId: string; positionKey: string; fontFamily?: string; fontSize?: number; textAlign?: string};

const historyActionLabels: Record<VisualHistoryAction, string> = {content: 'Content changed', replace: 'Content replaced', style: 'Style changed', resize: 'Size changed', position: 'Position changed', 'move-section': 'Section moved', 'move-component': 'Component moved', 'move-auto': 'Element moved', 'delete-auto': 'Element deleted', 'restore-auto': 'Element restored', 'add-section': 'Section added', 'delete-section': 'Section deleted', 'duplicate-section': 'Section duplicated', 'add-component': 'Component added', 'delete-component': 'Component deleted', 'duplicate-component': 'Component duplicated', group: 'Components grouped', ungroup: 'Components ungrouped', scope: 'Scope changed', reusable: 'Reusable component saved'};
const liveHistoryActions = new Set<VisualHistoryAction>(['content', 'replace', 'style', 'resize', 'position', 'move-auto', 'delete-auto', 'restore-auto', 'scope', 'reusable']);
const sameValue = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
const fontChoices: Array<{value: VisualFontChoice; label: string}> = [{value: '', label: 'Theme font'}, {value: 'display', label: 'Display · Manrope'}, {value: 'body', label: 'Body · DM Sans'}, {value: 'mono', label: 'Mono'}, {value: 'serif', label: 'Serif · Georgia'}];
const textAlignments: Array<{value: VisualTextAlignment; label: string; Icon: typeof AlignLeft}> = [{value: 'left', label: 'Align left', Icon: AlignLeft}, {value: 'center', label: 'Align center', Icon: AlignCenter}, {value: 'right', label: 'Align right', Icon: AlignRight}, {value: 'justify', label: 'Justify', Icon: AlignJustify}];
const normalizeAlignment = (value: unknown): VisualTextAlignment => ['center', 'right', 'justify'].includes(String(value)) ? String(value) as VisualTextAlignment : 'left';

const cloneRecord = (record: ContentRecord): ContentRecord => ({...record, draft: structuredClone(record.draft), published: record.published ? structuredClone(record.published) : null});

function sameRestorableRecord(left: ContentRecord, right: ContentRecord) {
  return left.title === right.title
    && left.slug === right.slug
    && left.category === right.category
    && sameValue(left.tags, right.tags)
    && sameValue(left.draft, right.draft);
}

function restoreRecordFromBaseline(current: ContentRecord, baseline: ContentRecord): ContentRecord {
  return {...current, title: baseline.title, slug: baseline.slug, category: baseline.category, tags: [...baseline.tags], draft: structuredClone(baseline.draft)};
}

function readStoredBaseline(): ContentRecord[] | null {
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(LIVE_EDIT_BASELINE_KEY) || 'null') as unknown;
    return Array.isArray(parsed) && parsed.every(record => record && typeof record === 'object' && typeof (record as ContentRecord).id === 'string')
      ? (parsed as ContentRecord[]).map(cloneRecord)
      : null;
  } catch { return null; }
}

function storeBaseline(records: ContentRecord[]) {
  try { window.sessionStorage.setItem(LIVE_EDIT_BASELINE_KEY, JSON.stringify(records)); }
  catch { /* The in-memory restore point remains available when storage is blocked. */ }
}

function clearStoredBaseline() {
  try { window.sessionStorage.removeItem(LIVE_EDIT_BASELINE_KEY); }
  catch { /* Storage may be blocked. */ }
}

function getPathValue(record: ContentRecord | undefined, path: string): unknown {
  if (!record || !path) return '';
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

function selectionObjectKey(selection: LiveSelection) {
  if (selection.objectId && ['auto', 'component', 'section'].includes(selection.objectType)) return `${selection.objectType}:${selection.objectId}`;
  return `${selection.kind}:${selection.slug}:${selection.path}`;
}

function historyAffectsObject(entry: VisualHistoryEntry, objectKey: string) {
  if (entry.objectKey === objectKey) return true;
  const objectId = /^(?:auto|component|section):/.test(objectKey) ? objectKey.split(':').slice(1).join(':') : '';
  return Boolean(objectId && Array.isArray(entry.meta.affectedObjectIds) && entry.meta.affectedObjectIds.includes(objectId));
}

function changeRecordWithHistory(record: ContentRecord, selection: LiveSelection, path: string, value: unknown, action: VisualHistoryAction): ContentRecord {
  const before = getPathValue(record, path);
  if (sameValue(before, value)) return record;
  const next = setPathValue(record, path, value);
  const objectKey = selectionObjectKey(selection);
  const now = new Date().toISOString();
  let history = historyFrom(record.draft.editorHistory).filter(entry => entry.active || entry.objectKey !== objectKey);
  const last = history.at(-1);
  const meta: Record<string, unknown> = {objectType: selection.objectType, objectId: selection.objectId, sectionId: selection.sectionId};
  const fallback = path === selection.linkPath ? selection.linkFallbackValue : selection.fallbackValue;
  if (before == null && fallback) meta.renderedFallback = fallback;
  if (last?.active && ['content', 'style'].includes(action) && last.action === action && last.objectKey === objectKey && last.path === path && Date.now() - Date.parse(last.timestamp) < 1400) {
    history[history.length - 1] = {...last, after: structuredClone(value), timestamp: now};
  } else {
    history.push({id: crypto.randomUUID(), objectKey, objectLabel: selection.label || 'Website element', action, path, before: structuredClone(before), after: structuredClone(value), meta, timestamp: now, active: true});
  }
  next.draft.editorHistory = history.slice(-160);
  return next;
}

function applyLiveHistory(record: ContentRecord, entry: VisualHistoryEntry, forward: boolean): ContentRecord {
  const value = forward ? entry.after : entry.before;
  return value === undefined ? removePathValue(record, entry.path) : setPathValue(record, entry.path, structuredClone(value));
}

export function LiveSiteEditButton() {
  const location = useLocation();
  const insideVisualEditor = new URLSearchParams(location.search).has('visualEditor');
  const requestedLiveEdit = new URLSearchParams(location.search).get('liveEdit') === '1';
  const [role, setRole] = useState<AdminRole | null>(null);
  const [editing, setEditing] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [historyMode, setHistoryMode] = useState<HistoryMode>('object');
  const [records, setRecords] = useState<ContentRecord[]>([]);
  const [sessionBaseline, setSessionBaseline] = useState<ContentRecord[] | null>(null);
  const [restoreRetryIds, setRestoreRetryIds] = useState<string[]>([]);
  const [restoring, setRestoring] = useState(false);
  const [fontSizeDraft, setFontSizeDraft] = useState('16');
  const [selection, setSelection] = useState<LiveSelection | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [status, setStatus] = useState('Select any text, image, button or section.');
  const recordsRef = useRef<ContentRecord[]>([]);
  const roleRef = useRef<AdminRole | null>(null);
  const editingRef = useRef(false);
  const saveQueuesRef = useRef(new Map<string, Promise<void>>());
  const autoStartedRef = useRef(false);
  const canEditWebsite = role ? allKinds.some(kind => canWriteKind(role, kind)) : false;

  const updateRecords = useCallback((next: ContentRecord[]) => {
    recordsRef.current = next;
    setRecords(next);
  }, []);

  const sendRecords = useCallback((next = recordsRef.current, enabled = editingRef.current, nextRole = roleRef.current) => {
    const editableKinds = nextRole ? allKinds.filter(kind => canWriteKind(nextRole, kind)) : [];
    sendLiveEditorCommand({
      type: 'nk-visual-editor:records', mode: 'replace', editingEnabled: enabled, editableKinds,
      records: next.map(record => ({id: record.id, kind: record.kind, slug: record.slug, title: record.title, data: record.draft, position: record.position, publishedAt: record.publishedAt || ''})),
    });
  }, []);

  useEffect(() => {
    if (insideVisualEditor) return;
    let active = true;
    const checkAccess = async () => {
      try {
        if (isPagesAdminMode) {
          const {currentFirebaseAdmin} = await import('../admin/auth/firebaseAuth');
          const user = await currentFirebaseAdmin();
          if (active) {roleRef.current = user?.role || null; setRole(user?.role || null);}
          return;
        }
        const response = await fetch('/api/admin/session', {credentials: 'same-origin', headers: {Accept: 'application/json'}});
        const payload = response.ok ? await response.json() as {user?: {role?: AdminRole}} : null;
        const nextRole = payload?.user?.role || null;
        if (active) {roleRef.current = nextRole; setRole(nextRole);}
      } catch {
        if (active) {roleRef.current = null; setRole(null);}
      }
    };
    void checkAccess();
    return () => {active = false;};
  }, [insideVisualEditor]);

  const persistRecord = useCallback((id: string) => {
    const prior = saveQueuesRef.current.get(id) || Promise.resolve();
    const operation = prior.catch(() => undefined).then(async () => {
      const record = recordsRef.current.find(item => item.id === id);
      if (!record) return;
      setSaveState('saving'); setStatus('Saving draft…');
      const {adminApi} = await import('../admin/api');
      const result = await adminApi<{record: ContentRecord}>(`/content/${record.id}`, {method: 'PUT', body: JSON.stringify({kind: record.kind, title: record.title, slug: record.slug, data: record.draft, category: record.category, tags: record.tags, expectedVersion: record.version})});
      const next = recordsRef.current.map(item => item.id === id ? {...item, version: result.record.version, status: result.record.status, published: result.record.published, publishedAt: result.record.publishedAt, updatedAt: result.record.updatedAt} : item);
      updateRecords(next); sendRecords(next, true);
      setSaveState('saved'); setStatus('Draft saved.');
    }).catch(error => {setSaveState('error'); setStatus(error instanceof Error ? error.message : 'Draft could not be saved.');});
    saveQueuesRef.current.set(id, operation);
    return operation;
  }, [sendRecords, updateRecords]);

  const persistRestoredRecord = useCallback((id: string) => {
    const operation = (async () => {
      const record = recordsRef.current.find(item => item.id === id);
      if (!record) return;
      const {adminApi} = await import('../admin/api');
      const result = await adminApi<{record: ContentRecord}>(`/content/${record.id}`, {method: 'PUT', body: JSON.stringify({kind: record.kind, title: record.title, slug: record.slug, data: record.draft, category: record.category, tags: record.tags, expectedVersion: record.version})});
      const next = recordsRef.current.map(item => item.id === id ? {...item, version: result.record.version, status: result.record.status, published: result.record.published, publishedAt: result.record.publishedAt, updatedAt: result.record.updatedAt} : item);
      updateRecords(next); sendRecords(next, true);
    })();
    saveQueuesRef.current.set(id, operation);
    return operation;
  }, [sendRecords, updateRecords]);

  const startEditing = useCallback(async () => {
    if (!roleRef.current || !allKinds.some(kind => canWriteKind(roleRef.current!, kind)) || editingRef.current) return;
    setSaveState('loading'); setStatus('Loading website drafts…');
    try {
      const {adminApi} = await import('../admin/api');
      const session = await adminApi<{user: {role: AdminRole}}>('/session');
      roleRef.current = session.user.role; setRole(session.user.role);
      const result = await adminApi<{records: ContentRecord[]}>(`/content?kinds=${encodeURIComponent(allKinds.join(','))}`);
      const next = result.records.sort((left, right) => left.kind.localeCompare(right.kind) || left.position - right.position);
      const storedBaseline = requestedLiveEdit ? readStoredBaseline() : null;
      const baseline = storedBaseline || next.map(cloneRecord);
      if (!storedBaseline) storeBaseline(baseline);
      setSessionBaseline(baseline); setRestoreRetryIds([]);
      updateRecords(next); editingRef.current = true; setEditing(true); setPanelOpen(true); setSaveState('saved'); setStatus('Live editing is on. Select anything on the website.');
      window.setTimeout(() => sendRecords(next, true, session.user.role), 0);
    } catch (error) {
      setSaveState('error'); setStatus(error instanceof Error ? error.message : 'Live editing could not start.');
    }
  }, [requestedLiveEdit, sendRecords, updateRecords]);

  const stopEditing = useCallback(() => {
    sendRecords(recordsRef.current, false);
    editingRef.current = false; setEditing(false); setPanelOpen(false); setSelection(null); setSaveState('idle');
    setSessionBaseline(null); setRestoreRetryIds([]); clearStoredBaseline();
    setStatus('Select any text, image, button or section.');
    if (requestedLiveEdit) {
      const url = new URL(window.location.href); url.searchParams.delete('liveEdit'); window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    }
  }, [requestedLiveEdit, sendRecords]);

  const changedRecordIds = useMemo(() => {
    if (!sessionBaseline || !role) return [];
    const baselineById = new Map(sessionBaseline.map(record => [record.id, record]));
    return records.filter(record => {
      const baseline = baselineById.get(record.id);
      return baseline && canWriteKind(role, record.kind) && !sameRestorableRecord(record, baseline);
    }).map(record => record.id);
  }, [records, role, sessionBaseline]);
  const restorableIds = useMemo(() => [...new Set([...changedRecordIds, ...restoreRetryIds])], [changedRecordIds, restoreRetryIds]);

  const restoreAll = useCallback(async () => {
    if (!sessionBaseline || !roleRef.current || !restorableIds.length || restoring) return;
    setRestoring(true); setSaveState('saving'); setStatus('Restoring the Edit start point...');
    try {
      await Promise.allSettled([...saveQueuesRef.current.values()]);
      const baselineById = new Map(sessionBaseline.map(record => [record.id, record]));
      const changedAfterPendingSaves = recordsRef.current.filter(record => {
        const baseline = baselineById.get(record.id);
        return baseline && canWriteKind(roleRef.current!, record.kind) && !sameRestorableRecord(record, baseline);
      }).map(record => record.id);
      const ids = [...new Set([...restorableIds, ...changedAfterPendingSaves])];
      const restored = recordsRef.current.map(record => {
        const baseline = baselineById.get(record.id);
        return baseline && ids.includes(record.id) ? restoreRecordFromBaseline(record, baseline) : record;
      });
      updateRecords(restored); sendRecords(restored, true);
      if (selection?.edit === 'text') {
        const selected = restored.find(record => record.kind === selection.kind && record.slug === selection.slug);
        const value = getPathValue(selected, selection.path);
        sendLiveEditorCommand({type: 'nk-visual-editor:history-sync', value: typeof value === 'string' ? value : selection.fallbackValue});
      }
      const outcomes = await Promise.allSettled(ids.map(persistRestoredRecord));
      const failedIds = outcomes.flatMap((outcome, index) => outcome.status === 'rejected' ? [ids[index]] : []);
      setRestoreRetryIds(failedIds);
      if (failedIds.length) {
        setSaveState('error'); setStatus(`${failedIds.length} ${failedIds.length === 1 ? 'record' : 'records'} could not be restored. Select Restore All to retry.`);
      } else {
        setSaveState('saved'); setStatus(`Restored ${ids.length} ${ids.length === 1 ? 'record' : 'records'} to the Edit start point.`);
      }
    } catch (error) {
      setSaveState('error'); setStatus(error instanceof Error ? error.message : 'The Edit start point could not be restored.');
    } finally {
      setRestoring(false);
    }
  }, [persistRestoredRecord, restoring, restorableIds, selection, sendRecords, sessionBaseline, updateRecords]);

  const runHistory = useCallback((direction: 'undo' | 'redo', objectOnly = historyMode === 'object') => {
    if (!selection) {setStatus('Select an object before using its history.'); return;}
    const record = recordsRef.current.find(item => item.kind === selection.kind && item.slug === selection.slug);
    if (!record || !roleRef.current || !canWriteKind(roleRef.current, record.kind)) return;
    const history = historyFrom(record.draft.editorHistory);
    const objectKey = selectionObjectKey(selection);
    const candidates = history.map((entry, index) => ({entry, index})).filter(({entry}) => liveHistoryActions.has(entry.action) && Boolean(entry.path) && (!objectOnly || historyAffectsObject(entry, objectKey)) && (direction === 'undo' ? entry.active : !entry.active));
    const target = direction === 'undo' ? candidates.at(-1) : candidates[0];
    if (!target) {setStatus(direction === 'undo' ? 'Nothing to undo for this history.' : 'Nothing to redo for this history.'); return;}
    const changed = applyLiveHistory(record, target.entry, direction === 'redo');
    changed.draft.editorHistory = history.map((entry, index) => index === target.index ? {...entry, active: direction === 'redo'} : entry);
    const next = recordsRef.current.map(item => item.id === record.id ? changed : item);
    updateRecords(next); sendRecords(next, true);
    if (selection.path === target.entry.path && selection.edit === 'text') {
      const value = getPathValue(changed, target.entry.path);
      const fallback = direction === 'undo' && typeof target.entry.meta.renderedFallback === 'string' ? target.entry.meta.renderedFallback : '';
      sendLiveEditorCommand({type: 'nk-visual-editor:history-sync', value: typeof value === 'string' ? value : fallback});
    }
    setPanelOpen(true); setSaveState('saving'); setStatus(`${direction === 'undo' ? 'Undid' : 'Redid'}: ${historyActionLabels[target.entry.action]}.`);
    void persistRecord(record.id);
  }, [historyMode, persistRecord, selection, sendRecords, updateRecords]);

  useEffect(() => {
    if (!canEditWebsite || !requestedLiveEdit || editing || autoStartedRef.current) return;
    autoStartedRef.current = true;
    void startEditing();
  }, [canEditWebsite, editing, requestedLiveEdit, startEditing]);

  useEffect(() => {
    const onLiveMessage = (event: Event) => {
      if (!(event instanceof CustomEvent) || !event.detail || typeof event.detail !== 'object' || event.detail.nonce !== LIVE_EDITOR_NONCE) return;
      const data = event.detail as Record<string, unknown>;
      if (data.type === 'nk-visual-editor:ready') {if (editingRef.current) sendRecords(); return;}
      if (data.type === 'nk-visual-editor:history-shortcut') {runHistory(data.direction === 'redo' ? 'redo' : 'undo', data.objectOnly !== false); return;}
      if (data.type === 'nk-visual-editor:blocked-action') {setStatus('Forms are paused while live editing is on.'); return;}
      if (data.type === 'nk-visual-editor:context-action') {setStatus('Use the live field panel to edit the selected element.'); return;}
      if (data.type === 'nk-visual-editor:change' || data.type === 'nk-visual-editor:select') {
        const kind = String(data.kind || '') as ContentKind;
        const slug = String(data.slug || '');
        const nextSelection: LiveSelection = {kind, slug, path: String(data.path || ''), edit: String(data.edit || 'text'), label: String(data.label || 'Website element'), linkPath: String(data.linkPath || ''), fallbackValue: String(data.fallbackValue || ''), linkFallbackValue: String(data.linkFallbackValue || ''), sectionId: String(data.sectionId || ''), objectType: String(data.objectType || ''), objectId: String(data.objectId || ''), positionKey: String(data.positionKey || ''), fontFamily: String(data.fontFamily || ''), fontSize: Math.round(Number(data.fontSize) || 0), textAlign: String(data.textAlign || '')};
        setSelection(nextSelection); setPanelOpen(true); setStatus(`${nextSelection.label} selected.`);
        if (data.selectOnly || data.type === 'nk-visual-editor:select' || typeof data.path !== 'string') return;
        const record = recordsRef.current.find(item => item.kind === kind && item.slug === slug);
        if (!record || !roleRef.current || !canWriteKind(roleRef.current, record.kind)) return;
        const changed = changeRecordWithHistory(record, nextSelection, data.path, data.value, ['image', 'icon'].includes(nextSelection.edit) ? 'replace' : 'content');
        const next = recordsRef.current.map(item => item.id === record.id ? changed : item);
        updateRecords(next);
        if (data.commit) void persistRecord(record.id);
        return;
      }
      if (data.type === 'nk-visual-editor:position') {
        const record = recordsRef.current.find(item => item.kind === data.kind && item.slug === data.slug);
        const key = String(data.positionKey || '');
        if (!record || !key || !roleRef.current || !canWriteKind(roleRef.current, record.kind)) return;
        const path = `visualOverrides.${key}`;
        const before = getPathValue(record, path);
        const position = before && typeof before === 'object' ? {...before as Record<string, unknown>} : {};
        const positionSelection: LiveSelection = selection && selection.kind === record.kind && selection.slug === record.slug
          ? selection
          : {kind: record.kind, slug: record.slug, path, edit: 'component', label: String(data.label || 'Element'), linkPath: '', fallbackValue: '', linkFallbackValue: '', sectionId: String(data.sectionId || ''), objectType: String(data.objectType || 'auto'), objectId: String(data.objectId || key), positionKey: key};
        const changed = changeRecordWithHistory(record, positionSelection, path, {...position, x: Math.round(Number(data.x) || 0), y: Math.round(Number(data.y) || 0), label: String(data.label || 'Element')}, 'position');
        const next = recordsRef.current.map(item => item.id === record.id ? changed : item);
        updateRecords(next); void persistRecord(record.id);
      }
    };
    window.addEventListener(LIVE_EDITOR_MESSAGE_EVENT, onLiveMessage);
    return () => window.removeEventListener(LIVE_EDITOR_MESSAGE_EVENT, onLiveMessage);
  }, [persistRecord, runHistory, selection, sendRecords, updateRecords]);

  const selectedRecord = selection ? records.find(record => record.kind === selection.kind && record.slug === selection.slug) : undefined;
  const selectedValue = String(getPathValue(selectedRecord, selection?.path || '') ?? selection?.fallbackValue ?? '');
  const selectedLinkValue = String(getPathValue(selectedRecord, selection?.linkPath || '') ?? selection?.linkFallbackValue ?? '');
  const typographyBasePath = selection?.positionKey ? `visualOverrides.${selection.positionKey}` : '';
  const storedFontChoice = typographyBasePath ? String(getPathValue(selectedRecord, `${typographyBasePath}.fontFamily`) || '') : '';
  const selectedFontChoice = fontChoices.some(choice => choice.value === storedFontChoice) ? storedFontChoice as VisualFontChoice : '';
  const storedFontSize = typographyBasePath ? Number(getPathValue(selectedRecord, `${typographyBasePath}.fontSize`)) : 0;
  const selectedFontSize = Math.max(12, Math.min(200, Math.round(storedFontSize || selection?.fontSize || 16)));
  const storedTextAlignment = typographyBasePath ? getPathValue(selectedRecord, `${typographyBasePath}.textAlign`) : '';
  const selectedTextAlignment = normalizeAlignment(storedTextAlignment || selection?.textAlign);
  const hasTypographyOverrides = Boolean(typographyBasePath && ['fontFamily', 'fontSize', 'textAlign'].some(property => getPathValue(selectedRecord, `${typographyBasePath}.${property}`) !== undefined));
  const selectedObjectKey = selection ? selectionObjectKey(selection) : '';
  const recordHistory = selectedRecord ? historyFrom(selectedRecord.draft.editorHistory) : [];
  const shownHistory = historyMode === 'object' ? recordHistory.filter(entry => selectedObjectKey && historyAffectsObject(entry, selectedObjectKey)) : recordHistory;
  const canUndo = shownHistory.some(entry => entry.active && liveHistoryActions.has(entry.action) && Boolean(entry.path));
  const canRedo = shownHistory.some(entry => !entry.active && liveHistoryActions.has(entry.action) && Boolean(entry.path));

  useEffect(() => {setFontSizeDraft(String(selectedFontSize));}, [selectedFontSize, selection?.positionKey]);

  const updateSelected = (value: string, path = selection?.path || '', commit = false) => {
    if (!selection || !selectedRecord || !path) return;
    const changed = changeRecordWithHistory(selectedRecord, selection, path, value, ['image', 'icon'].includes(selection.edit) || path === selection.linkPath ? 'replace' : 'content');
    const next = recordsRef.current.map(record => record.id === selectedRecord.id ? changed : record);
    updateRecords(next); sendRecords(next, true);
    if (selection.edit === 'text' && path === selection.path) sendLiveEditorCommand({type: 'nk-visual-editor:history-sync', value});
    if (commit) void persistRecord(selectedRecord.id);
  };

  const updateTypography = (property: 'fontFamily' | 'fontSize' | 'textAlign', value: unknown, commit = true) => {
    if (!selection || selection.edit !== 'text' || !selectedRecord || !typographyBasePath) return;
    const path = `${typographyBasePath}.${property}`;
    const changed = changeRecordWithHistory(selectedRecord, selection, path, value, 'style');
    const next = recordsRef.current.map(record => record.id === selectedRecord.id ? changed : record);
    updateRecords(next); sendRecords(next, true);
    setStatus(`${selection.label} typography updated.`);
    if (commit) void persistRecord(selectedRecord.id);
  };

  const resetTypography = () => {
    if (!selection || selection.edit !== 'text' || !selectedRecord || !typographyBasePath) return;
    let changed = selectedRecord;
    (['fontFamily', 'fontSize', 'textAlign'] as const).forEach(property => {
      if (getPathValue(changed, `${typographyBasePath}.${property}`) !== undefined) changed = changeRecordWithHistory(changed, selection, `${typographyBasePath}.${property}`, undefined, 'style');
    });
    const next = recordsRef.current.map(record => record.id === selectedRecord.id ? changed : record);
    updateRecords(next); sendRecords(next, true); setStatus(`${selection.label} typography reset to the theme.`);
    void persistRecord(selectedRecord.id);
  };

  const publishSelected = async () => {
    if (!selectedRecord) return;
    await persistRecord(selectedRecord.id);
    const latest = recordsRef.current.find(record => record.id === selectedRecord.id);
    if (!latest) return;
    try {
      setSaveState('saving'); setStatus('Publishing selected content…');
      const {adminApi} = await import('../admin/api');
      const result = await adminApi<{record: ContentRecord}>(`/content/${latest.id}/publish`, {method: 'POST', body: JSON.stringify({expectedVersion: latest.version})});
      const next = recordsRef.current.map(record => record.id === latest.id ? result.record : record);
      updateRecords(next); sendRecords(next, true); setSaveState('saved'); setStatus('Published successfully.');
    } catch (error) {setSaveState('error'); setStatus(error instanceof Error ? error.message : 'Publishing failed.');}
  };

  const field = useMemo(() => {
    if (!selection || !selectedRecord) return null;
    const shared = {value: selectedValue, onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => updateSelected(event.target.value), onBlur: () => updateSelected(selectedValue, selection.path, true)};
    return selectedValue.length > 80 || selection.path.toLowerCase().includes('body') ? <textarea rows={4} {...shared}/> : <input type={selection.edit === 'image' ? 'url' : 'text'} {...shared}/>;
  }, [selectedRecord, selectedValue, selection]);

  const typographyControls = selection?.edit === 'text' && typographyBasePath ? <section className="ia-live-typography" aria-label="Text typography">
    <header><Type/><span><b>Typography</b><small>Styles only this text object</small></span><button type="button" onClick={resetTypography} disabled={!hasTypographyOverrides}>Reset</button></header>
    <div className="ia-live-typography-grid">
      <label><span>Font</span><select aria-label="Font family" value={selectedFontChoice} onChange={event => updateTypography('fontFamily', event.target.value || undefined)}>{fontChoices.map(choice => <option value={choice.value} key={choice.value || 'theme'}>{choice.label}</option>)}</select></label>
      <label><span>Size</span><div className="ia-live-font-size"><input aria-label="Font size" type="number" min="12" max="200" step="1" value={fontSizeDraft} onChange={event => {const value = event.target.value; setFontSizeDraft(value); const number = Number(value); if (number >= 12 && number <= 200) updateTypography('fontSize', Math.round(number), false);}} onBlur={() => {const number = Number(fontSizeDraft); const next = Number.isFinite(number) ? Math.max(12, Math.min(200, Math.round(number))) : selectedFontSize; setFontSizeDraft(String(next)); updateTypography('fontSize', next);}}/><span>px</span></div></label>
    </div>
    <div className="ia-live-text-align" role="group" aria-label="Text alignment">{textAlignments.map(({value, label, Icon}) => <button type="button" className={selectedTextAlignment === value ? 'active' : ''} aria-label={label} aria-pressed={selectedTextAlignment === value} onClick={() => updateTypography('textAlign', value)} key={value}><Icon/></button>)}</div>
  </section> : null;

  if (insideVisualEditor) return <VisualEditingBridge/>;
  return <>
    <VisualEditingBridge localEditing={editing}/>
    {canEditWebsite && <button data-visual-no-edit="true" className={`ia-live-edit-button ${editing ? 'active' : ''}`} type="button" onClick={() => editing ? stopEditing() : void startEditing()} aria-label={editing ? 'Finish editing website' : 'Edit this website'} aria-pressed={editing} title={editing ? 'Finish live editing' : 'Edit this website'} disabled={saveState === 'loading' || restoring}>{saveState === 'loading' ? <LoaderCircle className="ia-live-edit-spin"/> : editing ? <Check/> : <Pencil/>}<span>{editing ? 'Done' : 'Edit'}</span></button>}
    {canEditWebsite && editing && <button data-visual-no-edit="true" className="ia-live-restore-button" type="button" onClick={() => void restoreAll()} aria-label={`Restore all changes to the Edit start point${restorableIds.length ? ` (${restorableIds.length} ${restorableIds.length === 1 ? 'record' : 'records'})` : ''}`} title={restorableIds.length ? `Restore all changes since Edit started (${restorableIds.length})` : 'No changes since Edit started'} disabled={!restorableIds.length || restoring || saveState === 'loading'}>{restoring ? <LoaderCircle className="ia-live-edit-spin"/> : <RotateCcw/>}</button>}
    {editing && panelOpen && createPortal(<aside data-visual-no-edit="true" className="ia-live-editor-dock" aria-label="Live website editor">
      <header><span><b>LIVE EDIT</b><small>{saveState === 'saving' ? 'Saving…' : saveState === 'error' ? 'Needs attention' : 'Draft autosave'}</small></span><button type="button" onClick={event => {event.currentTarget.blur(); setPanelOpen(false);}} aria-label="Close live editor panel"><X/></button></header>
      <p className={saveState === 'error' ? 'error' : ''}>{saveState === 'saving' ? <LoaderCircle className="ia-live-edit-spin"/> : <Cloud/>}{status}</p>
      {selection && selectedRecord ? <div className="ia-live-editor-fields"><label><span>{selection.label}</span>{field}</label>{selection.linkPath && <label><span>Link destination</span><input value={selectedLinkValue} onChange={event => updateSelected(event.target.value, selection.linkPath)} onBlur={() => updateSelected(selectedLinkValue, selection.linkPath, true)}/></label>}{typographyControls}<footer><button type="button" onClick={() => void publishSelected()} disabled={saveState === 'saving'}><Rocket/>Publish selected</button></footer></div> : <div className="ia-live-editor-empty"><Pencil/><b>Click anything on the page</b><span>Text edits in place. Images, links and other values appear here.</span></div>}
      <section className="ia-live-history" aria-label="Object change history">
        <header><span><History/><b>History</b><small>{historyMode === 'object' ? selection?.label || 'Selected object' : selectedRecord?.title || 'Current record'}</small></span><div><button type="button" className={historyMode === 'object' ? 'active' : ''} onClick={() => setHistoryMode('object')} disabled={!selection}>Object</button><button type="button" className={historyMode === 'record' ? 'active' : ''} onClick={() => setHistoryMode('record')} disabled={!selectedRecord}>Record</button></div></header>
        <div className="ia-live-history-actions"><button type="button" onClick={() => runHistory('undo')} disabled={!canUndo}><Undo2/><span>Undo</span><kbd>Ctrl Z</kbd></button><button type="button" onClick={() => runHistory('redo')} disabled={!canRedo}><Redo2/><span>Redo</span><kbd>Ctrl Shift Z</kbd></button></div>
        {shownHistory.length ? <ol>{[...shownHistory].reverse().map(entry => <li className={!entry.active ? 'undone' : ''} key={entry.id}><i/><span><b>{historyActionLabels[entry.action]}</b><small>{entry.objectLabel} · {new Date(entry.timestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}{!entry.active ? ' · undone' : ''}</small></span></li>)}</ol> : <div className="ia-live-history-empty">{historyMode === 'object' && !selection ? 'Select an object to see its independent history.' : 'No changes recorded yet.'}</div>}
      </section>
    </aside>, document.body)}
  </>;
}
