import {useEffect, useMemo, useRef, useState, type FormEvent} from 'react';
import {Archive, ArrowDown, ArrowUp, Check, ChevronRight, Clock3, Copy, EyeOff, FilePenLine, History, Plus, RefreshCw, Rocket, Save, Search, Trash2, X} from 'lucide-react';
import {useSearchParams} from 'react-router-dom';
import {adminApi, AdminApiError, errorMessage} from '../api';
import {useAdminAuth} from '../auth/AdminAuth';
import {EmptyState, PageHeading} from '../components/AdminStates';
import {canWriteKind} from '../permissions';
import type {ContentRecord, Revision} from '../types';
import {recordConfigs, type RecordField} from './recordConfigs';

type EditorState = {id?: string; kind: ContentRecord['kind']; title: string; slug: string; data: Record<string, unknown>; version: number; status: ContentRecord['status']; category: string; tags: string[]};

function toEditor(record: ContentRecord): EditorState {
  return {id: record.id, kind: record.kind, title: record.title, slug: record.slug, data: structuredClone(record.draft), version: record.version, status: record.status, category: record.category || '', tags: record.tags || []};
}

function fieldValue(data: Record<string, unknown>, field: RecordField) {
  const value = data[field.key];
  if (field.type === 'tags') return Array.isArray(value) ? value.join(', ') : '';
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

export function RecordManager({kind}: {kind: ContentRecord['kind']}) {
  const config = recordConfigs[kind];
  const {user} = useAdminAuth();
  const canWrite = Boolean(user && canWriteKind(user.role, kind));
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
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [params, setParams] = useSearchParams();

  const load = async () => {
    setLoading(true); setError('');
    try { const result = await adminApi<{records: ContentRecord[]}>(`/content?kind=${kind}`); setRecords(result.records); }
    catch (nextError) { setError(errorMessage(nextError)); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [kind]);

  const shown = useMemo(() => records.filter(record => (statusFilter === 'all' || record.status === statusFilter) && (!query || `${record.title} ${record.slug} ${record.status} ${Object.values(record.draft).join(' ')}`.toLowerCase().includes(query.toLowerCase()))), [records, query, statusFilter]);
  useEffect(() => { if (editor) window.setTimeout(() => titleInputRef.current?.focus(), 20); }, [editor?.id]);
  const startNew = () => { setEditor({kind, title: '', slug: '', data: structuredClone(config.defaults), version: 1, status: 'draft', category: '', tags: []}); setDirty(true); setFieldErrors({}); setRevisions(null); };
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
  const close = () => { if (!dirty || window.confirm('Discard the unsaved changes?')) setEditor(null); };

  const patchData = (key: string, value: unknown) => {
    setEditor(current => current ? {...current, data: {...current.data, [key]: value}} : current);
    setDirty(true); setFieldErrors(current => ({...current, [key]: ''}));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editor) return;
    setBusy(true); setError(''); setNotice(''); setFieldErrors({});
    try {
      const body = JSON.stringify({kind, title: editor.title, slug: editor.slug, data: editor.data, category: editor.category, tags: editor.tags, expectedVersion: editor.version});
      const result = editor.id
        ? await adminApi<{record: ContentRecord}>(`/content/${editor.id}`, {method: 'PUT', body})
        : await adminApi<{record: ContentRecord}>('/content', {method: 'POST', body});
      setRecords(current => [result.record, ...current.filter(item => item.id !== result.record.id)]);
      setEditor(toEditor(result.record)); setDirty(false); setNotice(`${config.singular} saved as a draft.`);
    } catch (nextError) {
      if (nextError instanceof AdminApiError) setFieldErrors(nextError.fields);
      setError(errorMessage(nextError));
    } finally { setBusy(false); }
  };

  const publish = async () => {
    if (!editor?.id || dirty) return;
    setBusy(true); setError('');
    try {
      const result = await adminApi<{record: ContentRecord}>(`/content/${editor.id}/publish`, {method: 'POST', body: JSON.stringify({expectedVersion: editor.version})});
      setRecords(current => current.map(item => item.id === result.record.id ? result.record : item));
      setEditor(toEditor(result.record)); setNotice(`${config.singular} published successfully.`);
    } catch (nextError) { setError(errorMessage(nextError)); }
    finally { setBusy(false); }
  };

  const unpublish = async () => {
    if (!editor?.id || editor.status !== 'published' || !window.confirm(`Take “${editor.title}” offline? It will remain available as a draft.`)) return;
    setBusy(true); setError('');
    try {
      const result = await adminApi<{record: ContentRecord}>(`/content/${editor.id}/unpublish`, {method: 'POST', body: JSON.stringify({expectedVersion: editor.version})});
      setRecords(current => current.map(item => item.id === result.record.id ? result.record : item));
      setEditor(toEditor(result.record)); setNotice(`${config.singular} is now offline and saved as a draft.`);
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
    if (!editor?.id || user?.role !== 'owner' || !window.confirm(`Permanently delete “${editor.title}” and its version history? This cannot be undone.`)) return;
    setBusy(true); setError('');
    try {
      await adminApi(`/content/${editor.id}`, {method: 'DELETE'});
      setRecords(current => current.filter(item => item.id !== editor.id)); setEditor(null); setNotice(`${config.singular} permanently deleted.`);
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
    if (!editor?.id || !window.confirm(`Archive “${editor.title}”?`)) return;
    setBusy(true); setError('');
    try {
      const result = await adminApi<{record: ContentRecord}>(`/content/${editor.id}/archive`, {method: 'POST', body: JSON.stringify({expectedVersion: editor.version})});
      setRecords(current => current.map(item => item.id === result.record.id ? result.record : item));
      setEditor(null); setNotice(`${config.singular} archived.`);
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
    if (!editor?.id || !window.confirm(`Restore version ${revision.version} as a new draft?`)) return;
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

  return <div className="nk-admin-record-page">
    <PageHeading eyebrow={config.eyebrow} title={config.title} description={config.description} actions={canWrite && (!config.singleton || records.length === 0) ? <button className="nk-admin-primary" type="button" onClick={startNew}><Plus/>Add {config.singular}</button> : undefined}/>
    {error && <p className="nk-admin-alert nk-admin-alert--error" role="alert">{error}<button type="button" onClick={() => setError('')} aria-label="Dismiss error"><X/></button></p>}
    {notice && <p className="nk-admin-alert" role="status"><Check/>{notice}<button type="button" onClick={() => setNotice('')} aria-label="Dismiss message"><X/></button></p>}
    <div className={`nk-admin-record-workspace ${editor ? 'editor-open' : ''}`}><section className="nk-admin-record-index" aria-label={`${config.title} records`}><div className="nk-admin-record-toolbar"><label><Search/><input value={query} onChange={event => setQuery(event.target.value)} placeholder={`Search ${config.title.toLowerCase()}`} aria-label={`Search ${config.title.toLowerCase()}`}/></label><select value={statusFilter} onChange={event => setStatusFilter(event.target.value as typeof statusFilter)} aria-label="Filter by publication status"><option value="all">All statuses</option><option value="published">Published</option><option value="draft">Drafts</option><option value="archived">Archived</option></select><span>{shown.length} shown · {records.filter(item => item.status === 'draft').length} drafts</span></div>
    {loading ? <div className="nk-admin-list-loading"><RefreshCw className="nk-admin-spin"/>Loading {config.title.toLowerCase()}…</div> : shown.length ? <div className="nk-admin-record-list"><header><span>Record</span><span>Status</span><span>Last updated</span><span/></header>{shown.map((record, index) => <div className="nk-admin-record-item" key={record.id}><button type="button" aria-current={editor?.id === record.id ? 'true' : undefined} className={`nk-admin-record-row ${record.status}`} onClick={() => edit(record)}>{recordImage(record) ? <img src={recordImage(record)} alt=""/> : <span className="nk-admin-record-symbol">{kind === 'seo' ? 'SEO' : kind.slice(0,2).toUpperCase()}</span>}<span className="nk-admin-record-name"><small>{recordSummary(record)}</small><strong>{record.title}</strong><em>/{record.slug}</em></span><span className={`nk-admin-status nk-admin-status--${record.status}`}><i/>{record.status}</span><span className="nk-admin-record-date"><b>{new Date(record.updatedAt).toLocaleDateString()}</b><small>Version {record.version}</small></span><span className="nk-admin-row-action"><FilePenLine/><ChevronRight/></span></button>{canWrite && !query && statusFilter === 'all' && <div className="nk-admin-record-order"><button type="button" onClick={() => void moveRecord(record.id, -1)} disabled={busy || index === 0} aria-label={`Move ${record.title} up`}><ArrowUp/></button><button type="button" onClick={() => void moveRecord(record.id, 1)} disabled={busy || index === shown.length - 1} aria-label={`Move ${record.title} down`}><ArrowDown/></button></div>}</div>)}</div> : <EmptyState title={`No ${config.title.toLowerCase()} found`} body={query || statusFilter !== 'all' ? 'Change the search or status filter to see more records.' : canWrite ? `Add the first ${config.singular} to this section.` : 'There are no records available for this section.'}/>}</section>

    {editor && <section className="nk-admin-editor" role="region" aria-label={`Edit ${config.singular}`}>
      <header><div><span>{editor.id ? `${editor.status} · version ${editor.version}` : `new ${config.singular}`}</span><h2>{editor.title || `New ${config.singular}`}</h2></div><button type="button" onClick={close} aria-label="Close editor"><X/></button></header>
      <form onSubmit={submit}>
        <div className="nk-admin-editor-fields"><div className="nk-admin-field-group-title"><span>Basic information</span><p>The title helps editors find this record. The slug controls its stable URL identifier.</p></div><label>Display title<input ref={titleInputRef} required maxLength={240} value={editor.title} disabled={!canWrite} onChange={event => {setEditor({...editor, title: event.target.value}); setDirty(true);}}/>{fieldErrors.title && <small className="field-error">{fieldErrors.title}</small>}</label><label>URL slug<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={100} value={editor.slug} disabled={!canWrite} onChange={event => {setEditor({...editor, slug: event.target.value.toLowerCase().replace(/\s+/g, '-')}); setDirty(true);}}/>{fieldErrors.slug && <small className="field-error">{fieldErrors.slug}</small>}</label><label>Admin category<input maxLength={100} value={editor.category} disabled={!canWrite} onChange={event => {setEditor({...editor, category: event.target.value}); setDirty(true);}} placeholder="e.g. Campaign, Residential, Support"/></label><label>Admin tags<input maxLength={600} value={editor.tags.join(', ')} disabled={!canWrite} onChange={event => {setEditor({...editor, tags: event.target.value.split(',').map(value => value.trim()).filter(Boolean).slice(0, 20)}); setDirty(true);}} placeholder="priority, summer, showroom"/><small>Used by global search and the dashboard work queue.</small></label><div className="nk-admin-field-group-title"><span>Content</span><p>Complete the fields below. Required information is validated before saving.</p></div>
          {config.fields.map(field => <label className={field.type === 'checkbox' ? 'nk-admin-checkbox' : ''} key={field.key}>{field.type === 'checkbox' ? <><input type="checkbox" checked={editor.data[field.key] !== false} disabled={!canWrite} onChange={event => patchData(field.key, event.target.checked)}/><span>{field.label}</span></> : <><span>{field.label}</span>{field.type === 'textarea' ? <textarea rows={5} required={field.required} disabled={!canWrite} value={fieldValue(editor.data, field)} onChange={event => patchData(field.key, event.target.value)}/> : field.type === 'select' ? <select required={field.required} disabled={!canWrite} value={fieldValue(editor.data, field)} onChange={event => patchData(field.key, event.target.value)}>{field.options?.map(option => <option key={option}>{option}</option>)}</select> : <input type={field.type === 'tags' ? 'text' : field.type || 'text'} required={field.required} disabled={!canWrite} value={fieldValue(editor.data, field)} onChange={event => patchData(field.key, field.type === 'tags' ? event.target.value.split(',').map(value => value.trim()).filter(Boolean) : event.target.value)}/>} {field.help && <small>{field.help}</small>}{fieldErrors[field.key] && <small className="field-error">{fieldErrors[field.key]}</small>}</>}</label>)}
        </div>
        <footer>{canWrite ? <><button type="submit" className="nk-admin-primary" disabled={busy || !dirty}><Save/>{busy ? 'Working…' : editor.id ? 'Save draft' : `Create ${config.singular}`}</button>{editor.id && <button type="button" onClick={() => void publish()} disabled={busy || dirty}><Rocket/>{editor.status === 'archived' ? 'Reactivate & publish' : 'Publish'}</button>}{editor.id && editor.status === 'published' && <button type="button" onClick={() => void unpublish()} disabled={busy || dirty}><EyeOff/>Take offline</button>}{editor.id && <button type="button" onClick={() => void duplicate()} disabled={busy}><Copy/>Duplicate</button>}{editor.id && <button type="button" onClick={() => void loadHistory()} disabled={busy}><History/>Version history</button>}{editor.id && editor.status !== 'archived' && <button type="button" className="danger" onClick={() => void archive()} disabled={busy}><Archive/>Archive</button>}{editor.id && user?.role === 'owner' && <button type="button" className="danger" onClick={() => void remove()} disabled={busy}><Trash2/>Delete permanently</button>}</> : <span className="nk-admin-readonly">Read-only access</span>}</footer>
      </form>
      {revisions && <aside className="nk-admin-history"><header><div><Clock3/><b>Version history</b></div><button type="button" onClick={() => setRevisions(null)}><X/></button></header>{revisions.map(revision => <article key={revision.id}><span>v{revision.version}</span><div><b>{revision.action}</b><small>{revision.createdBy} · {new Date(revision.createdAt).toLocaleString()}</small></div>{canWrite && <button type="button" onClick={() => void restore(revision)}>Restore</button>}</article>)}</aside>}
    </section>}</div>
  </div>;
}
