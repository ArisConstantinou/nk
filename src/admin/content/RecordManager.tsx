import {useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent} from 'react';
import {Archive, ArrowDown, ArrowUp, Check, ChevronRight, Clock3, Copy, EyeOff, FilePenLine, GripVertical, History, Link2, ListTree, Plus, RefreshCw, Rocket, Save, Search, Trash2, X} from 'lucide-react';
import {Link, useSearchParams} from 'react-router-dom';
import {adminApi, AdminApiError, errorMessage} from '../api';
import {useAdminAuth} from '../auth/AdminAuth';
import {EmptyState, PageHeading} from '../components/AdminStates';
import {ActionMenu} from '../components/ActionMenu';
import {useAdminConfirm} from '../components/ConfirmDialog';
import {canManageNavigation, canWriteKind} from '../permissions';
import type {ContentRecord, NavigationItem, NavigationMenu, Revision} from '../types';
import {NavigationPage} from '../pages/NavigationPage';
import {recordConfigs, type RecordField} from './recordConfigs';

type EditorState = {id?: string; kind: ContentRecord['kind']; title: string; slug: string; data: Record<string, unknown>; version: number; status: ContentRecord['status']; category: string; tags: string[]};
type PageNavigationMenu = Extract<NavigationMenu, 'primary' | 'services' | 'shop'>;
type NavigationRequest = {itemId?: string; newMenu?: NavigationMenu | null};

function toEditor(record: ContentRecord): EditorState {
  return {id: record.id, kind: record.kind, title: record.title, slug: record.slug, data: structuredClone(record.draft), version: record.version, status: record.status, category: record.category || '', tags: record.tags || []};
}

function fieldValue(data: Record<string, unknown>, field: RecordField) {
  const value = data[field.key];
  if (field.type === 'tags') return Array.isArray(value) ? value.join(', ') : '';
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

const pageRoute = (record: ContentRecord) => String(record.draft.route || (record.slug === 'homepage' ? '/' : `/${record.slug}`));
const pageNavigationLabel = (record: ContentRecord) => String(record.draft.navigationTitle || record.title);
const slugFromTitle = (value: string) => value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100);
const childMenuForNavigationItem = (item: NavigationItem): PageNavigationMenu | null => item.url === '/services' ? 'services' : item.url === '/shop' ? 'shop' : null;

export function RecordManager({kind}: {kind: ContentRecord['kind']}) {
  const config = recordConfigs[kind];
  const confirm = useAdminConfirm();
  const {user} = useAdminAuth();
  const canWrite = Boolean(user && canWriteKind(user.role, kind));
  const canWriteNavigation = Boolean(user && canManageNavigation(user.role));
  const [records, setRecords] = useState<ContentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ContentRecord['status']>('all');
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [revisions, setRevisions] = useState<Revision[] | null>(null);
  const [navigationItems, setNavigationItems] = useState<NavigationItem[]>([]);
  const [navigationLoading, setNavigationLoading] = useState(kind === 'page');
  const [draggingPageId, setDraggingPageId] = useState('');
  const [navigationDropActive, setNavigationDropActive] = useState(false);
  const [navigationDropTarget, setNavigationDropTarget] = useState<PageNavigationMenu | ''>('');
  const [navigationWorkspaceOpen, setNavigationWorkspaceOpen] = useState(false);
  const [navigationRequest, setNavigationRequest] = useState<NavigationRequest>({});
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [params, setParams] = useSearchParams();

  const load = async () => {
    setLoading(true); setError('');
    try { const result = await adminApi<{records: ContentRecord[]}>(`/content?kind=${kind}`); setRecords(result.records); }
    catch (nextError) { setError(errorMessage(nextError)); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [kind]);
  const loadNavigation = async () => {
    if (kind !== 'page') return;
    setNavigationLoading(true);
    try { setNavigationItems((await adminApi<{items: NavigationItem[]}>('/navigation')).items); }
    catch (nextError) { setError(errorMessage(nextError)); }
    finally { setNavigationLoading(false); }
  };
  useEffect(() => { void loadNavigation(); }, [kind]);

  const shown = useMemo(() => records.filter(record => (statusFilter === 'all' || record.status === statusFilter) && (!query || `${record.title} ${record.slug} ${record.status} ${Object.values(record.draft).join(' ')}`.toLowerCase().includes(query.toLowerCase()))), [records, query, statusFilter]);
  useEffect(() => { if (editor) window.setTimeout(() => titleInputRef.current?.focus(), 20); }, [editor?.id]);
  const startNew = () => {
    const data = structuredClone(config.defaults);
    if (kind === 'page') data.route = '';
    setEditor({kind, title: '', slug: '', data, version: 1, status: 'draft', category: '', tags: []});
    setDirty(true); setFieldErrors({}); setRevisions(null);
  };
  useEffect(() => {
    if (canWrite && params.get('new') === '1') {
      startNew();
      const next = new URLSearchParams(params); next.delete('new'); setParams(next, {replace: true});
    }
  }, [canWrite, kind, params, setParams]);
  const edit = (record: ContentRecord) => { setEditor(toEditor(record)); setDirty(false); setFieldErrors({}); setNotice(''); setRevisions(null); };
  useEffect(() => {
    const requested = params.get('record');
    if (!requested || !records.length || editor?.id === requested) return;
    const record = records.find(item => item.id === requested);
    if (record) edit(record);
  }, [editor?.id, params, records]);
  const close = async () => {
    if (dirty && !await confirm({
      title: 'Discard unsaved changes?',
      description: 'The edits in this open record have not been saved and will be lost.',
      confirmLabel: 'Discard changes',
      cancelLabel: 'Continue editing',
      tone: 'warning',
    })) return;
    setEditor(null);
  };
  const openNavigationWorkspace = async (request: NavigationRequest = {}) => {
    if (dirty && !await confirm({
      title: 'Leave this unsaved page?',
      description: 'Opening navigation now will discard the unsaved page changes.',
      confirmLabel: 'Discard and continue',
      cancelLabel: 'Stay on page',
      tone: 'warning',
    })) return;
    setEditor(null); setDirty(false); setNavigationWorkspaceOpen(true); setNavigationRequest(request);
    const next = new URLSearchParams(params); next.delete('record'); next.delete('new'); next.set('navigation', '1');
    if (request.itemId) next.set('navItem', request.itemId); else next.delete('navItem');
    if (request.newMenu) next.set('newNav', request.newMenu); else next.delete('newNav');
    setParams(next, {replace: true});
  };
  const closeNavigationWorkspace = () => {
    setNavigationWorkspaceOpen(false); setNavigationRequest({}); void loadNavigation();
    const next = new URLSearchParams(params); next.delete('navigation'); next.delete('navItem'); next.delete('newNav'); setParams(next, {replace: true});
  };
  useEffect(() => {
    if (kind !== 'page' || params.get('navigation') !== '1') return;
    setNavigationWorkspaceOpen(true);
    setNavigationRequest({itemId: params.get('navItem') || undefined, newMenu: params.get('newNav') as NavigationMenu | null});
  }, [kind, params]);

  const patchData = (key: string, value: unknown) => {
    setEditor(current => current ? {...current, data: {...current.data, [key]: value}} : current);
    setDirty(true); setFieldErrors(current => ({...current, [key]: ''}));
  };

  const placePageInNavigation = async (record: ContentRecord, targetMenu: PageNavigationMenu, targetLabel: string) => {
    if (kind !== 'page' || !canWriteNavigation) return;
    if (record.status !== 'published') {
      setNotice(`Publish ${record.title} before adding it to navigation.`);
      return;
    }
    const route = pageRoute(record);
    const alreadyPlaced = navigationItems.find(item => item.menu === targetMenu && item.url === route);
    if (alreadyPlaced) {
      setNotice(`${record.title} is already ${targetMenu === 'primary' ? 'in the primary navigation' : `inside ${targetLabel}`}.`);
      return;
    }
    const existing = navigationItems.find(item => item.menu === 'primary' && item.url === route)
      || navigationItems.find(item => (item.menu === 'services' || item.menu === 'shop') && item.url === route);
    const targetItems = navigationItems.filter(item => item.menu === targetMenu && item.id !== existing?.id).sort((left, right) => left.position - right.position);
    setBusy(true); setError('');
    try {
      const result = existing
        ? await adminApi<{item: NavigationItem}>(`/navigation/${existing.id}`, {method: 'PATCH', body: JSON.stringify({...existing, menu: targetMenu, active: true})})
        : await adminApi<{item: NavigationItem}>('/navigation', {method: 'POST', body: JSON.stringify({menu: targetMenu, label: pageNavigationLabel(record), url: route, description: '', active: true})});
      const orderedIds = [...targetItems.map(item => item.id), result.item.id];
      await adminApi('/navigation/reorder', {method: 'PATCH', body: JSON.stringify({menu: targetMenu, ids: orderedIds})});
      const placed = {...result.item, position: orderedIds.length - 1};
      setNavigationItems(current => [...current.filter(item => item.id !== placed.id), placed].map(item => item.menu === targetMenu ? {...item, position: orderedIds.indexOf(item.id)} : item));
      setNotice(existing
        ? `${record.title} moved ${targetMenu === 'primary' ? 'to the primary navigation' : `inside ${targetLabel}`}.`
        : `${record.title} added ${targetMenu === 'primary' ? 'to the primary navigation' : `inside ${targetLabel}`}.`);
    } catch (nextError) { setError(errorMessage(nextError)); }
    finally { setBusy(false); setDraggingPageId(''); setNavigationDropActive(false); setNavigationDropTarget(''); }
  };

  const addPageToPrimaryNavigation = (record: ContentRecord) => placePageInNavigation(record, 'primary', 'Primary navigation');

  const syncPageNavigation = async (previous: ContentRecord | undefined, next: ContentRecord) => {
    if (kind !== 'page' || !previous || !canWriteNavigation) return 0;
    const previousRoute = pageRoute(previous);
    const nextRoute = pageRoute(next);
    const previousLabels = new Set([pageNavigationLabel(previous), previous.title]);
    const nextLabel = pageNavigationLabel(next);
    const linked = navigationItems.filter(item => item.url === previousRoute);
    if (!linked.length || (previousRoute === nextRoute && previousLabels.has(nextLabel))) return 0;
    const updated = await Promise.all(linked.map(item => adminApi<{item: NavigationItem}>(`/navigation/${item.id}`, {method: 'PATCH', body: JSON.stringify({...item, url: nextRoute, label: previousLabels.has(item.label) ? nextLabel : item.label})}).then(result => result.item)));
    const byId = new Map(updated.map(item => [item.id, item]));
    setNavigationItems(current => current.map(item => byId.get(item.id) || item));
    return updated.length;
  };

  const deactivatePageNavigation = async (record: ContentRecord) => {
    if (kind !== 'page' || !canWriteNavigation) return 0;
    const routes = new Set([pageRoute(record)]);
    if (record.published) routes.add(pageRoute({...record, draft: record.published}));
    const linked = navigationItems.filter(item => routes.has(item.url) && item.active);
    if (!linked.length) return 0;
    const updated = await Promise.all(linked.map(item => adminApi<{item: NavigationItem}>(`/navigation/${item.id}`, {method: 'PATCH', body: JSON.stringify({...item, active: false})}).then(result => result.item)));
    const byId = new Map(updated.map(item => [item.id, item]));
    setNavigationItems(current => current.map(item => byId.get(item.id) || item));
    return updated.length;
  };

  const onPageDragStart = (event: DragEvent<HTMLDivElement>, record: ContentRecord) => {
    if (kind !== 'page' || !canWriteNavigation || record.status !== 'published') return;
    event.dataTransfer.effectAllowed = 'copyMove';
    event.dataTransfer.setData('application/x-nk-page', record.id);
    event.dataTransfer.setData('text/plain', record.id);
    setDraggingPageId(record.id);
  };

  const onNavigationDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    const id = event.dataTransfer.getData('application/x-nk-page') || event.dataTransfer.getData('text/plain') || draggingPageId;
    const record = records.find(item => item.id === id);
    setNavigationDropActive(false);
    if (record) void addPageToPrimaryNavigation(record);
  };

  const onNavigationItemDrop = (event: DragEvent<HTMLElement>, target: NavigationItem) => {
    const targetMenu = childMenuForNavigationItem(target);
    if (!targetMenu) return;
    event.preventDefault(); event.stopPropagation();
    const id = event.dataTransfer.getData('application/x-nk-page') || event.dataTransfer.getData('text/plain') || draggingPageId;
    const record = records.find(item => item.id === id);
    setNavigationDropTarget(''); setNavigationDropActive(false);
    if (record) void placePageInNavigation(record, targetMenu, target.label);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editor) return;
    const isNewRecord = !editor.id;
    setBusy(true); setError(''); setNotice(''); setFieldErrors({});
    try {
      const body = JSON.stringify({kind, title: editor.title, slug: editor.slug, data: editor.data, category: editor.category, tags: editor.tags, expectedVersion: editor.version});
      const result = editor.id
        ? await adminApi<{record: ContentRecord}>(`/content/${editor.id}`, {method: 'PUT', body})
        : await adminApi<{record: ContentRecord}>('/content', {method: 'POST', body});
      setRecords(current => [result.record, ...current.filter(item => item.id !== result.record.id)]);
      setEditor(toEditor(result.record)); setDirty(false); setNotice(`${config.singular} saved as a draft. Navigation remains on the published route until this draft is published.`);
      if (kind === 'page') window.dispatchEvent(new CustomEvent('nk-admin-guide:page-saved', {detail: {id: result.record.id, title: result.record.title, route: pageRoute(result.record), isNew: isNewRecord}}));
    } catch (nextError) {
      if (nextError instanceof AdminApiError) setFieldErrors(nextError.fields);
      setError(errorMessage(nextError));
    } finally { setBusy(false); }
  };

  const publish = async () => {
    if (!editor?.id || dirty) return;
    setBusy(true); setError('');
    try {
      const current = records.find(item => item.id === editor.id);
      const publishedBaseline = current?.published ? {...current, draft: structuredClone(current.published)} : current;
      const result = await adminApi<{record: ContentRecord}>(`/content/${editor.id}/publish`, {method: 'POST', body: JSON.stringify({expectedVersion: editor.version})});
      setRecords(current => current.map(item => item.id === result.record.id ? result.record : item));
      setEditor(toEditor(result.record));
      if (kind === 'page') window.dispatchEvent(new CustomEvent('nk-admin-guide:page-published', {detail: {id: result.record.id, title: result.record.title, route: pageRoute(result.record)}}));
      try {
        const synced = await syncPageNavigation(publishedBaseline, result.record);
        setNotice(`${config.singular} published successfully.${synced ? ` ${synced} connected navigation ${synced === 1 ? 'link was' : 'links were'} updated.` : ''}`);
      } catch (navigationError) {
        setNotice(`${config.singular} published successfully.`);
        setError(`The page is live, but connected navigation could not be updated: ${errorMessage(navigationError)}`);
      }
    } catch (nextError) { setError(errorMessage(nextError)); }
    finally { setBusy(false); }
  };

  const unpublish = async () => {
    if (!editor?.id || editor.status !== 'published' || !await confirm({
      eyebrow: 'PUBLIC VISIBILITY',
      title: `Take “${editor.title}” offline?`,
      description: 'Visitors will no longer be able to access the published record.',
      detail: 'Its content remains safely available in the admin as a draft.',
      confirmLabel: 'Take offline',
      cancelLabel: 'Keep published',
      tone: 'warning',
    })) return;
    setBusy(true); setError('');
    try {
      const result = await adminApi<{record: ContentRecord}>(`/content/${editor.id}/unpublish`, {method: 'POST', body: JSON.stringify({expectedVersion: editor.version})});
      setRecords(current => current.map(item => item.id === result.record.id ? result.record : item));
      setEditor(toEditor(result.record));
      let deactivated = 0;
      try { deactivated = await deactivatePageNavigation(result.record); }
      catch (navigationError) { setError(`The page is offline, but its navigation links could not be deactivated: ${errorMessage(navigationError)}`); }
      setNotice(`${config.singular} is now offline and saved as a draft.${deactivated ? ` ${deactivated} navigation ${deactivated === 1 ? 'link was' : 'links were'} deactivated.` : ''}`);
    } catch (nextError) { setError(errorMessage(nextError)); }
    finally { setBusy(false); }
  };

  const duplicate = async () => {
    if (!editor?.id) return;
    setBusy(true); setError('');
    try {
      const result = await adminApi<{record: ContentRecord}>(`/content/${editor.id}/duplicate`, {method: 'POST'});
      setRecords(current => [...current, result.record].sort((a, b) => a.position - b.position));
      setEditor(toEditor(result.record)); setDirty(false); setNotice(`${config.singular} duplicated as an inactive draft.`);
    } catch (nextError) { setError(errorMessage(nextError)); }
    finally { setBusy(false); }
  };

  const remove = async () => {
    if (!editor?.id || user?.role !== 'owner' || !await confirm({
      title: `Permanently delete “${editor.title}”?`,
      description: 'The record and its complete version history will be removed.',
      detail: 'This action cannot be undone.',
      confirmLabel: 'Delete permanently',
      cancelLabel: 'Keep record',
      tone: 'danger',
    })) return;
    setBusy(true); setError('');
    try {
      const deletingRecord = records.find(item => item.id === editor.id);
      await adminApi(`/content/${editor.id}`, {method: 'DELETE'});
      setRecords(current => current.filter(item => item.id !== editor.id)); setEditor(null);
      let deactivated = 0;
      try { if (deletingRecord) deactivated = await deactivatePageNavigation(deletingRecord); }
      catch (navigationError) { setError(`The page was deleted, but its navigation links could not be deactivated: ${errorMessage(navigationError)}`); }
      setNotice(`${config.singular} permanently deleted.${deactivated ? ` ${deactivated} navigation ${deactivated === 1 ? 'link was' : 'links were'} deactivated.` : ''}`);
    } catch (nextError) { setError(errorMessage(nextError)); }
    finally { setBusy(false); }
  };

  const moveRecord = async (id: string, direction: -1 | 1) => {
    const ordered = [...records].sort((a, b) => a.position - b.position);
    const index = ordered.findIndex(record => record.id === id); const target = index + direction;
    if (index < 0 || target < 0 || target >= ordered.length) return;
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    const next = ordered.map((record, position) => ({...record, position})); setRecords(next); setBusy(true); setError('');
    try { await adminApi('/content/reorder', {method: 'PATCH', body: JSON.stringify({kind, ids: next.map(record => record.id)})}); setNotice('Display order updated.'); }
    catch (nextError) { setError(errorMessage(nextError)); await load(); }
    finally { setBusy(false); }
  };

  const archive = async () => {
    if (!editor?.id || !await confirm({
      title: `Archive “${editor.title}”?`,
      description: 'The record will be removed from active content and kept in the archive.',
      confirmLabel: 'Archive record',
      cancelLabel: 'Keep active',
      tone: 'warning',
    })) return;
    setBusy(true); setError('');
    try {
      const result = await adminApi<{record: ContentRecord}>(`/content/${editor.id}/archive`, {method: 'POST', body: JSON.stringify({expectedVersion: editor.version})});
      setRecords(current => current.map(item => item.id === result.record.id ? result.record : item));
      setEditor(null);
      let deactivated = 0;
      try { deactivated = await deactivatePageNavigation(result.record); }
      catch (navigationError) { setError(`The page was archived, but its navigation links could not be deactivated: ${errorMessage(navigationError)}`); }
      setNotice(`${config.singular} archived.${deactivated ? ` ${deactivated} navigation ${deactivated === 1 ? 'link was' : 'links were'} deactivated.` : ''}`);
    } catch (nextError) { setError(errorMessage(nextError)); }
    finally { setBusy(false); }
  };

  const loadHistory = async () => {
    if (!editor?.id) return;
    setBusy(true); setError('');
    try { const result = await adminApi<{revisions: Revision[]}>(`/content/${editor.id}/revisions`); setRevisions(result.revisions); }
    catch (nextError) { setError(errorMessage(nextError)); }
    finally { setBusy(false); }
  };

  const restore = async (revision: Revision) => {
    if (!editor?.id || !await confirm({
      eyebrow: 'VERSION HISTORY',
      title: `Restore version ${revision.version}?`,
      description: 'This historical version will become a new editable draft.',
      detail: 'The currently published version remains live until you publish the restored draft.',
      confirmLabel: 'Restore as draft',
      cancelLabel: 'Keep current draft',
      tone: 'neutral',
    })) return;
    setBusy(true); setError('');
    try {
      const result = await adminApi<{record: ContentRecord}>(`/content/${editor.id}/revisions/${revision.id}/restore`, {method: 'POST', body: JSON.stringify({expectedVersion: editor.version})});
      setRecords(current => current.map(item => item.id === result.record.id ? result.record : item));
      setEditor(toEditor(result.record)); setDirty(false); setRevisions(null); setNotice(`Version ${revision.version} restored as a new draft.`);
    } catch (nextError) { setError(errorMessage(nextError)); }
    finally { setBusy(false); }
  };

  const recordSummary = (record: ContentRecord) => {
    const data = record.draft;
    if (kind === 'product') return `${String(data.category || 'Product')} · ${String(data.season || '')}`;
    if (kind === 'project') return `${String(data.number || 'Project')} · ${String(data.category || '')}`;
    if (kind === 'service') return String(data.code || 'Service');
    if (kind === 'catalogue') return `${String(data.brand || 'Catalogue')} · ${String(data.year || '')}`;
    if (kind === 'seo') return String(data.route || '/');
    if (kind === 'settings') return 'Shared contact information';
    return config.singular;
  };
  const recordImage = (record: ContentRecord) => String(record.draft.image || record.draft.heroImage || '');
  const updateEditorTitle = (value: string) => {
    setEditor(current => {
      if (!current) return current;
      if (kind !== 'page' || current.id) return {...current, title: value};
      const previousAutoSlug = slugFromTitle(current.title);
      const nextSlug = !current.slug || current.slug === previousAutoSlug ? slugFromTitle(value) : current.slug;
      const currentRoute = String(current.data.route || '');
      const routeWasAutomatic = !currentRoute || currentRoute === `/${current.slug}` || currentRoute === `/${previousAutoSlug}`;
      const navigationTitle = !current.data.navigationTitle || current.data.navigationTitle === current.title ? value : current.data.navigationTitle;
      return {...current, title: value, slug: nextSlug, data: {...current.data, route: routeWasAutomatic && nextSlug ? `/${nextSlug}` : currentRoute, navigationTitle}};
    });
    setDirty(true);
  };
  const updateEditorSlug = (value: string) => {
    const slug = slugFromTitle(value);
    setEditor(current => {
      if (!current) return current;
      const currentRoute = String(current.data.route || '');
      const routeWasAutomatic = kind === 'page' && (!currentRoute || currentRoute === `/${current.slug}`);
      return {...current, slug, data: routeWasAutomatic ? {...current.data, route: slug ? `/${slug}` : ''} : current.data};
    });
    setDirty(true);
  };
  const editorRecord = editor?.id ? records.find(item => item.id === editor.id) : undefined;

  return <div className="nk-admin-record-page">
    <PageHeading eyebrow={config.eyebrow} title={kind === 'page' ? 'Pages & navigation' : config.title} description={kind === 'page' ? 'Create and edit pages, then place them across every website menu from the same workspace.' : config.description} actions={canWrite && (!config.singleton || records.length === 0) ? <button className="nk-admin-primary" data-guide={kind === 'page' ? 'add-page' : undefined} type="button" onClick={startNew}><Plus/>Add {config.singular}</button> : undefined}/>
    {error && <p className="nk-admin-alert nk-admin-alert--error" role="alert">{error}<button type="button" onClick={() => setError('')} aria-label="Dismiss error"><X/></button></p>}
    {notice && <p className="nk-admin-alert" role="status"><Check/>{notice}<button type="button" onClick={() => setNotice('')} aria-label="Dismiss message"><X/></button></p>}
    {kind === 'page' && <section className="nk-admin-page-navigation" aria-labelledby="page-navigation-title">
      <header><span><ListTree/><b id="page-navigation-title">PAGE & NAVIGATION CONNECTION</b><small>Place pages in the main navigation or inside the Services and Shop menus.</small></span><div className="nk-admin-page-navigation-actions">{canWriteNavigation && <button type="button" data-guide="new-primary-navigation-link" onClick={() => openNavigationWorkspace({newMenu: 'primary'})}><Plus/>New navigation link</button>}<button type="button" onClick={() => openNavigationWorkspace()}>Manage all menus <ChevronRight/></button></div></header>
      <div className={`nk-admin-page-navigation-drop ${navigationDropActive ? 'active' : ''}`} onDragEnter={event => {event.preventDefault(); if (canWriteNavigation) setNavigationDropActive(true);}} onDragOver={event => {event.preventDefault(); event.dataTransfer.dropEffect = 'copy';}} onDragLeave={event => {if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setNavigationDropActive(false);}} onDrop={onNavigationDrop}>
        <div className="nk-admin-page-navigation-instruction"><GripVertical/><span><b>{navigationDropTarget ? `Release to place inside ${navigationDropTarget}` : navigationDropActive ? 'Release to add to the main navigation' : 'Drag a published page here'}</b><small>Drop on empty space for a top-level link, or directly on Services or Shop to place the page inside that menu.</small></span></div>
        <div className="nk-admin-page-navigation-links">{navigationLoading ? <span><RefreshCw className="nk-admin-spin"/>Loading menu…</span> : navigationItems.filter(item => item.menu === 'primary').sort((left, right) => left.position - right.position).map(item => {const targetMenu = childMenuForNavigationItem(item); return <button type="button" className={`${item.active ? '' : 'inactive'}${targetMenu ? ' can-nest' : ''}${targetMenu && navigationDropTarget === targetMenu ? ' drop-target' : ''}`} title={targetMenu ? `Edit ${item.label}; drop a page here to place it inside this menu` : 'Edit this navigation link'} onClick={() => openNavigationWorkspace({itemId: item.id})} onDragEnter={event => {if (!targetMenu || !draggingPageId) return; event.preventDefault(); event.stopPropagation(); setNavigationDropTarget(targetMenu);}} onDragOver={event => {if (!targetMenu || !draggingPageId) return; event.preventDefault(); event.stopPropagation(); event.dataTransfer.dropEffect = 'move';}} onDragLeave={event => {if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setNavigationDropTarget('');}} onDrop={event => onNavigationItemDrop(event, item)} key={item.id}><Link2/><span>{item.label}</span><small>{item.url}</small>{targetMenu && draggingPageId && <em>Drop inside</em>}</button>;})}</div>
      </div>
    </section>}
    {kind === 'page' && navigationWorkspaceOpen ? <NavigationPage embedded requestedItemId={navigationRequest.itemId} requestedNewMenu={navigationRequest.newMenu} onItemsChange={setNavigationItems} onClose={closeNavigationWorkspace}/> : <div className={`nk-admin-record-workspace ${editor ? 'editor-open' : ''}`}><section className="nk-admin-record-index" aria-label={`${config.title} records`}><div className="nk-admin-record-toolbar"><label><Search/><input value={query} onChange={event => setQuery(event.target.value)} placeholder={`Search ${config.title.toLowerCase()}`} aria-label={`Search ${config.title.toLowerCase()}`}/></label><select value={statusFilter} onChange={event => setStatusFilter(event.target.value as typeof statusFilter)} aria-label="Filter by publication status"><option value="all">All statuses</option><option value="published">Published</option><option value="draft">Drafts</option><option value="archived">Archived</option></select><span>{shown.length} shown · {records.filter(item => item.status === 'draft').length} drafts</span></div>
    {loading ? <div className="nk-admin-list-loading"><RefreshCw className="nk-admin-spin"/>Loading {config.title.toLowerCase()}…</div> : shown.length ? <div className="nk-admin-record-list"><header><span>Record</span><span>Status</span><span>Last updated</span><span/></header>{shown.map((record, index) => <div className={`nk-admin-record-item ${draggingPageId === record.id ? 'is-dragging' : ''}`} draggable={kind === 'page' && canWriteNavigation && record.status === 'published'} onDragStart={event => onPageDragStart(event, record)} onDragEnd={() => {setDraggingPageId(''); setNavigationDropActive(false);}} key={record.id}><button type="button" aria-current={editor?.id === record.id ? 'true' : undefined} className={`nk-admin-record-row ${record.status}`} onClick={() => edit(record)}>{recordImage(record) ? <img src={recordImage(record)} alt=""/> : <span className="nk-admin-record-symbol">{kind === 'seo' ? 'SEO' : kind.slice(0,2).toUpperCase()}</span>}<span className="nk-admin-record-name"><small>{recordSummary(record)}</small><strong>{record.title}</strong><em>{kind === 'page' ? pageRoute(record) : `/${record.slug}`}</em></span><span className={`nk-admin-status nk-admin-status--${record.status}`}><i/>{record.status}</span><span className="nk-admin-record-date"><b>{new Date(record.updatedAt).toLocaleDateString()}</b><small>Version {record.version}</small></span><span className="nk-admin-row-action">{kind === 'page' && <GripVertical/>}<FilePenLine/><ChevronRight/></span></button>{canWrite && !query && statusFilter === 'all' && <div className="nk-admin-record-order"><ActionMenu compact label={`Reorder ${record.title}`}><button type="button" role="menuitem" onClick={() => void moveRecord(record.id, -1)} disabled={busy || index === 0}><ArrowUp/>Move up</button><button type="button" role="menuitem" onClick={() => void moveRecord(record.id, 1)} disabled={busy || index === shown.length - 1}><ArrowDown/>Move down</button></ActionMenu></div>}</div>)}</div> : <EmptyState title={`No ${config.title.toLowerCase()} found`} body={query || statusFilter !== 'all' ? 'Change the search or status filter to see more records.' : canWrite ? `Add the first ${config.singular} to this section.` : 'There are no records available for this section.'}/>}</section>

    {editor && <section className="nk-admin-editor" role="region" aria-label={`Edit ${config.singular}`}>
      <header><div><span>{editor.id ? `${editor.status} · version ${editor.version}` : `new ${config.singular}`}</span><h2>{editor.title || `New ${config.singular}`}</h2></div><button type="button" onClick={close} aria-label="Close editor"><X/></button></header>
      <form onSubmit={submit}>
        <div className="nk-admin-editor-fields"><div className="nk-admin-field-group-title"><span>Basic information</span><p>The title helps editors find this record. The slug controls its stable URL identifier.</p></div><label>Display title<input ref={titleInputRef} data-guide={kind === 'page' ? 'page-title' : undefined} required maxLength={240} value={editor.title} disabled={!canWrite} onChange={event => updateEditorTitle(event.target.value)}/>{fieldErrors.title && <small className="field-error">{fieldErrors.title}</small>}</label><label>URL slug<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={100} value={editor.slug} disabled={!canWrite} onChange={event => updateEditorSlug(event.target.value)}/>{fieldErrors.slug && <small className="field-error">{fieldErrors.slug}</small>}</label><label>Admin category<input maxLength={100} value={editor.category} disabled={!canWrite} onChange={event => {setEditor({...editor, category: event.target.value}); setDirty(true);}} placeholder="e.g. Campaign, Residential, Support"/></label><label>Admin tags<input maxLength={600} value={editor.tags.join(', ')} disabled={!canWrite} onChange={event => {setEditor({...editor, tags: event.target.value.split(',').map(value => value.trim()).filter(Boolean).slice(0, 20)}); setDirty(true);}} placeholder="priority, summer, showroom"/><small>Used by global search and the dashboard work queue.</small></label><div className="nk-admin-field-group-title"><span>Content</span><p>Complete the fields below. Required information is validated before saving.</p></div>
          {config.fields.map(field => <label className={field.type === 'checkbox' ? 'nk-admin-checkbox' : ''} key={field.key}>{field.type === 'checkbox' ? <><input type="checkbox" checked={editor.data[field.key] !== false} disabled={!canWrite} onChange={event => patchData(field.key, event.target.checked)}/><span>{field.label}</span></> : <><span>{field.label}</span>{field.type === 'textarea' ? <textarea rows={5} required={field.required} disabled={!canWrite} value={fieldValue(editor.data, field)} onChange={event => patchData(field.key, event.target.value)}/> : field.type === 'select' ? <select required={field.required} disabled={!canWrite} value={fieldValue(editor.data, field)} onChange={event => patchData(field.key, event.target.value)}>{field.options?.map(option => <option key={option}>{option}</option>)}</select> : <input type={field.type === 'tags' ? 'text' : field.type || 'text'} required={field.required} disabled={!canWrite} value={fieldValue(editor.data, field)} onChange={event => patchData(field.key, field.type === 'tags' ? event.target.value.split(',').map(value => value.trim()).filter(Boolean) : event.target.value)}/>} {field.help && <small>{field.help}</small>}{fieldErrors[field.key] && <small className="field-error">{fieldErrors[field.key]}</small>}</>}</label>)}
        </div>
        <footer className="nk-admin-editor-footer">{canWrite ? <>
          <div className="nk-admin-editor-primary-actions">
            <button type="submit" className="nk-admin-primary" data-guide={kind === 'page' ? 'create-page' : undefined} disabled={busy || !dirty}><Save/>{busy ? 'Working…' : editor.id ? 'Save draft' : `Create ${config.singular}`}</button>
            {editor.id && <button type="button" data-guide={kind === 'page' ? 'publish-page' : undefined} onClick={() => void publish()} disabled={busy || dirty}><Rocket/>{editor.status === 'archived' ? 'Reactivate & publish' : 'Publish'}</button>}
          </div>
          {editor.id && <ActionMenu placement="top" label={`More actions for ${editor.title}`}>
            {kind === 'page' && editorRecord && <button type="button" role="menuitem" onClick={() => void placePageInNavigation(editorRecord, 'primary', 'Primary navigation')} disabled={busy || dirty || editor.status !== 'published'}><ListTree/>Place in main navigation</button>}
            {kind === 'page' && editorRecord && <button type="button" role="menuitem" onClick={() => void placePageInNavigation(editorRecord, 'services', 'Services')} disabled={busy || dirty || editor.status !== 'published'}><Link2/>Place inside Services</button>}
            {kind === 'page' && editorRecord && <button type="button" role="menuitem" onClick={() => void placePageInNavigation(editorRecord, 'shop', 'Shop')} disabled={busy || dirty || editor.status !== 'published'}><Link2/>Place inside Shop</button>}
            {kind === 'page' && <Link role="menuitem" to={`/admin/pages?record=${encodeURIComponent(editor.id)}`} aria-disabled={dirty} onClick={event => {if (dirty) event.preventDefault();}}><FilePenLine/>Open in Website Editor</Link>}
            {kind === 'page' && canWriteNavigation && <button type="button" role="menuitem" onClick={() => {const record = records.find(item => item.id === editor.id); if (record) void addPageToPrimaryNavigation(record);}} disabled={busy || dirty || editor.status !== 'published' || navigationItems.some(item => item.menu === 'primary' && item.url === String(editor.data.route || `/${editor.slug}`))}><Link2/>{editor.status !== 'published' ? 'Publish before navigation' : navigationItems.some(item => item.menu === 'primary' && item.url === String(editor.data.route || `/${editor.slug}`)) ? 'Already in navigation' : 'Add to navigation'}</button>}
            {editor.status === 'published' && <button type="button" role="menuitem" onClick={() => void unpublish()} disabled={busy || dirty}><EyeOff/>Take offline</button>}
            <button type="button" role="menuitem" onClick={() => void duplicate()} disabled={busy}><Copy/>Duplicate</button>
            <button type="button" role="menuitem" onClick={() => void loadHistory()} disabled={busy}><History/>Version history</button>
            {editor.status !== 'archived' && <button type="button" role="menuitem" className="danger" onClick={() => void archive()} disabled={busy}><Archive/>Archive</button>}
            {user?.role === 'owner' && <button type="button" role="menuitem" className="danger" onClick={() => void remove()} disabled={busy}><Trash2/>Delete permanently</button>}
          </ActionMenu>}
        </> : <span className="nk-admin-readonly">Read-only access</span>}</footer>
      </form>
      {revisions && <aside className="nk-admin-history"><header><div><Clock3/><b>Version history</b></div><button type="button" onClick={() => setRevisions(null)}><X/></button></header>{revisions.map(revision => <article key={revision.id}><span>v{revision.version}</span><div><b>{revision.action}</b><small>{revision.createdBy} · {new Date(revision.createdAt).toLocaleString()}</small></div>{canWrite && <button type="button" onClick={() => void restore(revision)}>Restore</button>}</article>)}</aside>}
    </section>}</div>}
  </div>;
}
