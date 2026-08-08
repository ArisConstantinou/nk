import {ArchiveRestore, CheckCircle2, Clock3, EyeOff, FilePenLine, History, RefreshCw, Search, X} from 'lucide-react';
import {useEffect, useMemo, useState} from 'react';
import {Link} from 'react-router-dom';
import {adminApi, errorMessage} from '../api';
import {useAdminAuth} from '../auth/AdminAuth';
import {EmptyState, PageHeading} from '../components/AdminStates';
import {canReadKind, canWriteKind} from '../permissions';
import type {ContentKind, ContentRecord} from '../types';

type ChangeState = 'pending' | 'offline' | 'live' | 'archived';
type ChangeFilter = 'all' | Exclude<ChangeState, 'live'>;

const contentKinds: ContentKind[] = ['page', 'product', 'service', 'project', 'catalogue', 'company'];
const routes: Partial<Record<ContentKind, string>> = {
  page: '/admin/pages',
  product: '/admin/products',
  service: '/admin/services',
  project: '/admin/projects',
  catalogue: '/admin/catalogues',
  company: '/admin/company',
};
const kindLabels: Partial<Record<ContentKind, string>> = {
  page: 'Page',
  product: 'Product',
  service: 'Service',
  project: 'Project',
  catalogue: 'Catalogue',
  company: 'Company',
};

function changeState(record: ContentRecord): ChangeState {
  if (record.status === 'archived') return 'archived';
  if (record.status === 'draft' && record.published) return 'pending';
  if (record.status === 'draft') return 'offline';
  return 'live';
}

const stateText: Record<ChangeState, {label: string; description: string}> = {
  pending: {label: 'Changes not live', description: 'Visitors still see the previous published version.'},
  offline: {label: 'Offline', description: 'This is not visible on the website.'},
  live: {label: 'Live', description: 'Visitors can see this version.'},
  archived: {label: 'Archived', description: 'Kept safely and available to restore.'},
};

function relativeTime(value: string) {
  const elapsed = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.round(elapsed / 60_000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days < 8) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(value).toLocaleDateString();
}

function StateIcon({state}: {state: ChangeState}) {
  if (state === 'pending') return <FilePenLine/>;
  if (state === 'offline') return <EyeOff/>;
  if (state === 'archived') return <ArchiveRestore/>;
  return <CheckCircle2/>;
}

export function ChangesPage() {
  const {user} = useAdminAuth();
  const [records, setRecords] = useState<ContentRecord[]>([]);
  const [filter, setFilter] = useState<ChangeFilter>('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const visibleKinds = contentKinds.filter(kind => canReadKind(user.role, kind));
      const responses = await Promise.all(visibleKinds.map(kind => adminApi<{records: ContentRecord[]}>(`/content?kind=${kind}`)));
      setRecords(responses.flatMap(response => response.records).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)));
    } catch (nextError) {
      setError(errorMessage(nextError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [user?.id, user?.role]);

  const counts = useMemo(() => records.reduce((result, record) => {
    result[changeState(record)] += 1;
    return result;
  }, {pending: 0, offline: 0, live: 0, archived: 0}), [records]);

  const matching = useMemo(() => records.filter(record => {
    const state = changeState(record);
    const matchesFilter = filter === 'all' || state === filter;
    const matchesQuery = !query.trim() || `${record.title} ${record.slug} ${kindLabels[record.kind] || record.kind}`.toLowerCase().includes(query.trim().toLowerCase());
    return matchesFilter && matchesQuery;
  }), [filter, query, records]);
  const shown = matching.slice(0, 40);

  const restore = async (record: ContentRecord) => {
    if (!user || !canWriteKind(user.role, record.kind)) return;
    setBusyId(record.id);
    setError('');
    try {
      const response = await adminApi<{record: ContentRecord}>(`/content/${record.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          kind: record.kind,
          title: record.title,
          slug: record.slug,
          data: record.draft,
          category: record.category,
          tags: record.tags,
          expectedVersion: record.version,
        }),
      });
      setRecords(current => current.map(item => item.id === record.id ? response.record : item));
      setNotice(`${record.title} was restored as an offline draft. Open it when you are ready to publish.`);
    } catch (nextError) {
      setError(errorMessage(nextError));
    } finally {
      setBusyId('');
    }
  };

  if (!user) return null;

  return <div className="nk-admin-changes-page">
    <PageHeading eyebrow="SAFE HISTORY" title="Changes" description="See what changed, what is not live, and anything you can safely restore." actions={<button type="button" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? 'nk-admin-spin' : ''}/>Refresh</button>}/>

    {error && <p className="nk-admin-alert nk-admin-alert--error" role="alert">{error}<button type="button" onClick={() => setError('')} aria-label="Dismiss error"><X/></button></p>}
    {notice && <p className="nk-admin-alert" role="status">{notice}<button type="button" onClick={() => setNotice('')} aria-label="Dismiss message"><X/></button></p>}

    <section className="nk-admin-change-summary" aria-label="Website change summary">
      <button type="button" className={filter === 'pending' ? 'active is-pending' : 'is-pending'} onClick={() => setFilter(current => current === 'pending' ? 'all' : 'pending')}><FilePenLine/><span><b>{counts.pending}</b><small>Changes not live</small></span></button>
      <button type="button" className={filter === 'offline' ? 'active is-offline' : 'is-offline'} onClick={() => setFilter(current => current === 'offline' ? 'all' : 'offline')}><EyeOff/><span><b>{counts.offline}</b><small>Offline</small></span></button>
      <button type="button" className={filter === 'archived' ? 'active is-archived' : 'is-archived'} onClick={() => setFilter(current => current === 'archived' ? 'all' : 'archived')}><ArchiveRestore/><span><b>{counts.archived}</b><small>Archived</small></span></button>
    </section>

    <section className="nk-admin-change-toolbar" aria-label="Find changes">
      <label><Search/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Find a page, product or service" aria-label="Search changes"/></label>
      <span>{filter === 'all' ? 'Recent website activity' : stateText[filter].label}{matching.length > shown.length ? ` · showing ${shown.length} of ${matching.length}` : ''}</span>
      {(filter !== 'all' || query) && <button type="button" onClick={() => {setFilter('all'); setQuery('');}}><X/>Clear</button>}
    </section>

    {loading && !records.length ? <div className="nk-admin-list-loading"><RefreshCw className="nk-admin-spin"/>Loading changes…</div> : shown.length ? <section className="nk-admin-change-list" aria-label="Recent changes">
      {shown.map(record => {
        const state = changeState(record);
        const route = routes[record.kind] || '/admin/content';
        const canRestore = state === 'archived' && canWriteKind(user.role, record.kind);
        return <article key={record.id} className={`is-${state}`}>
          <div className="nk-admin-change-icon"><StateIcon state={state}/></div>
          <div className="nk-admin-change-copy"><span>{kindLabels[record.kind] || record.kind}</span><b>{record.title}</b><small>{stateText[state].description}</small><time dateTime={record.updatedAt}><Clock3/>{relativeTime(record.updatedAt)}</time></div>
          <div className="nk-admin-change-actions">
            {canRestore && <button type="button" onClick={() => void restore(record)} disabled={busyId === record.id}><ArchiveRestore/>{busyId === record.id ? 'Restoring…' : 'Restore'}</button>}
            <Link to={`${route}?record=${encodeURIComponent(record.id)}`}>{state === 'archived' ? 'Open' : 'Review'}</Link>
          </div>
        </article>;
      })}
    </section> : <EmptyState title="Nothing found" body={filter !== 'all' || query ? 'Clear the filters to see the complete recent history.' : 'Website changes will appear here as soon as content is edited.'}/>}

    <footer className="nk-admin-change-safety"><History/><span><b>Your work is recoverable</b><small>Taking something offline or archiving it does not permanently delete it.</small></span></footer>
  </div>;
}
