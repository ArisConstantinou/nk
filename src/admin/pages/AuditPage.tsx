import {useCallback, useEffect, useMemo, useState} from 'react';
import {Activity, Download, RefreshCw, Search, ShieldCheck, UserRound, X} from 'lucide-react';
import {adminApi, errorMessage} from '../api';
import {useAdminAuth} from '../auth/AdminAuth';
import {EmptyState, PageHeading} from '../components/AdminStates';

type AuditEntry = {id: string; action: string; entityType: string; entityId: string | null; details: Record<string, unknown>; ipAddress: string | null; createdAt: string; userId: string | null; user: string};
type AuditUser = {id: string; displayName: string; email: string; role: string; active: boolean};
type AuditPayload = {entries: AuditEntry[]; total: number; offset: number; limit: number; hasMore: boolean; users: AuditUser[]; actions: string[]; entityTypes: string[]};

function eventLabel(value: string) {return value.replaceAll('.', ' ').replaceAll('-', ' ').replace(/\b\w/g, letter => letter.toUpperCase());}
function detailText(details: Record<string, unknown>) {return Object.entries(details).filter(([, value]) => !Array.isArray(value)).map(([key, value]) => `${key.replaceAll(/([A-Z])/g, ' $1')}: ${String(value)}`).join(' · ') || 'No additional details';}

export function AuditPage() {
  const {user} = useAdminAuth();
  const [data, setData] = useState<AuditPayload>({entries: [], total: 0, offset: 0, limit: 100, hasMore: false, users: [], actions: [], entityTypes: []});
  const [query, setQuery] = useState('');
  const [userId, setUserId] = useState('');
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (offset = 0) => {
    setLoading(true); setError('');
    const params = new URLSearchParams({limit: '100', offset: String(offset), sort});
    if (query.trim()) params.set('q', query.trim());
    if (userId && user?.role === 'owner') params.set('userId', userId);
    if (action) params.set('action', action);
    if (entityType) params.set('entityType', entityType);
    try {
      const result = await adminApi<AuditPayload>(`/audit?${params}`);
      setData(current => offset ? {...result, entries: [...current.entries, ...result.entries]} : result);
    }
    catch (nextError) {setError(errorMessage(nextError));}
    finally {setLoading(false);}
  }, [action, entityType, query, sort, user?.role, userId]);

  useEffect(() => {const timer = window.setTimeout(() => void load(0), query ? 220 : 0); return () => window.clearTimeout(timer);}, [load, query]);
  const hasFilters = Boolean(query || userId || action || entityType || sort !== 'newest');
  const clear = () => {setQuery(''); setUserId(''); setAction(''); setEntityType(''); setSort('newest');};
  const selectedUser = useMemo(() => data.users.find(item => item.id === userId), [data.users, userId]);

  const exportCsv = () => {
    const cells = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const rows = [['Time', 'User', 'Action', 'Entity', 'Entity ID', 'Details', 'IP'], ...data.entries.map(entry => [entry.createdAt, entry.user, entry.action, entry.entityType, entry.entityId || '', detailText(entry.details), entry.ipAddress || ''])];
    const blob = new Blob([rows.map(row => row.map(cells).join(',')).join('\n')], {type: 'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `nk-audit-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url);
  };

  return <div className="nk-audit-page">
    <PageHeading eyebrow="SECURITY / ACCOUNTABILITY" title={user?.role === 'owner' ? 'Activity & audit log' : 'My activity'} description={user?.role === 'owner' ? 'Filter every accountable change by user, action and entity.' : 'Review the changes and security events recorded for your account.'} actions={<><button type="button" onClick={exportCsv} disabled={!data.entries.length}><Download/>Export loaded CSV</button><button type="button" onClick={() => void load(0)} disabled={loading}><RefreshCw className={loading ? 'nk-admin-spin' : ''}/>Refresh</button></>}/>
    {error && <p className="nk-admin-alert nk-admin-alert--error" role="alert">{error}<button type="button" onClick={() => setError('')} aria-label="Dismiss error"><X/></button></p>}
    <section className="nk-audit-summary"><div><ShieldCheck/><span><b>{data.total}</b><small>matching events</small></span></div><div><UserRound/><span><b>{selectedUser?.displayName || (user?.role === 'owner' ? 'All users' : user?.displayName)}</b><small>{selectedUser?.role || (user?.role === 'owner' ? 'complete team history' : 'personal audit trail')}</small></span></div><div><Activity/><span><b>{data.entries[0] ? new Date(data.entries[0].createdAt).toLocaleDateString() : '—'}</b><small>{sort === 'newest' ? 'latest recorded activity' : 'oldest matching activity'}</small></span></div></section>
    <section className="nk-audit-filters" aria-label="Audit filters"><label><Search/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search actions, details, users or entities" aria-label="Search audit history"/></label>{user?.role === 'owner' && <select value={userId} onChange={event => setUserId(event.target.value)} aria-label="Filter audit by user"><option value="">All users</option>{data.users.map(item => <option value={item.id} key={item.id}>{item.displayName} · {item.role}{item.active ? '' : ' · inactive'}</option>)}</select>}<select value={action} onChange={event => setAction(event.target.value)} aria-label="Filter by action"><option value="">All actions</option>{data.actions.map(value => <option value={value} key={value}>{eventLabel(value)}</option>)}</select><select value={entityType} onChange={event => setEntityType(event.target.value)} aria-label="Filter by entity type"><option value="">All entity types</option>{data.entityTypes.map(value => <option value={value} key={value}>{eventLabel(value)}</option>)}</select><select value={sort} onChange={event => setSort(event.target.value as typeof sort)} aria-label="Sort audit history"><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select>{hasFilters && <button type="button" onClick={clear}><X/>Clear</button>}</section>
    {loading && !data.entries.length ? <div className="nk-admin-list-loading"><RefreshCw className="nk-admin-spin"/>Loading accountable history…</div> : data.entries.length ? <><div className="nk-admin-audit nk-admin-audit--detailed"><header><span>Event</span><span>User</span><span>Entity</span><span>Time</span></header>{data.entries.map(entry => <article key={entry.id}><div><Activity/><span><b>{eventLabel(entry.action)}</b><small>{detailText(entry.details)}</small></span></div><span><b>{entry.user}</b>{entry.ipAddress && <small>{entry.ipAddress}</small>}</span><span><b>{eventLabel(entry.entityType)}</b>{entry.entityId && <small>{entry.entityId.slice(0, 12)}</small>}</span><time dateTime={entry.createdAt}><b>{new Date(entry.createdAt).toLocaleDateString()}</b><small>{new Date(entry.createdAt).toLocaleTimeString()}</small></time></article>)}</div>{data.hasMore && <div className="nk-audit-load-more"><span>Showing {data.entries.length} of {data.total}</span><button type="button" onClick={() => void load(data.entries.length)} disabled={loading}>{loading ? <RefreshCw className="nk-admin-spin"/> : <Activity/>}Load more</button></div>}</> : <EmptyState title="No matching audit entries" body={hasFilters ? 'Clear one or more filters to inspect the complete history.' : 'Security and content events will appear here as soon as changes are made.'}/>}
  </div>;
}
