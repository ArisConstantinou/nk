import {useEffect, useMemo, useRef, useState, type FormEvent} from 'react';
import {Check, MailPlus, MessageSquareText, Plus, RefreshCw, Save, X} from 'lucide-react';
import {useSearchParams} from 'react-router-dom';
import {adminApi, errorMessage} from '../api';
import {EmptyState, PageHeading} from '../components/AdminStates';
import type {Enquiry} from '../types';

const statuses: Enquiry['status'][] = ['new', 'in_progress', 'waiting', 'won', 'closed', 'spam'];
const types: Enquiry['type'][] = ['phone', 'contact', 'quote', 'product', 'catalogue', 'project'];
type Assignee = {id: string; displayName: string; email: string};

export function EnquiriesPage() {
  const [items, setItems] = useState<Enquiry[]>([]);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<Enquiry | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [params, setParams] = useSearchParams();
  const dialogRef = useRef<HTMLElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const dialogOpen = creating || Boolean(selected);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await adminApi<{enquiries: Enquiry[]; assignees: Assignee[]}>('/enquiries');
      setItems(result.enquiries);
      setAssignees(result.assignees);
    } catch (nextError) {
      setError(errorMessage(nextError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (params.get('new') !== '1') return;
    setCreating(true);
    const next = new URLSearchParams(params);
    next.delete('new');
    setParams(next, {replace: true});
  }, [params, setParams]);
  useEffect(() => {const target = items.find(item => item.id === params.get('enquiry')); if (target && selected?.id !== target.id) setSelected(target);}, [items, params, selected?.id]);
  useEffect(() => {
    if (!dialogOpen || !dialogRef.current) return;
    const dialog = dialogRef.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusable = () => [...dialog.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')];
    (dialog.querySelector<HTMLElement>('[autofocus]') || focusable()[0])?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setCreating(false);
        setSelected(null);
        return;
      }
      if (event.key !== 'Tab') return;
      const controls = focusable();
      if (!controls.length) return;
      const first = controls[0];
      const last = controls.at(-1)!;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    dialog.addEventListener('keydown', onKeyDown);
    return () => {
      dialog.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = bodyOverflow;
      (returnFocusRef.current || previous)?.focus();
      returnFocusRef.current = null;
    };
  }, [dialogOpen]);

  const shown = useMemo(() => filter === 'all' ? items : items.filter(item => item.status === filter), [filter, items]);
  const openCreate = (trigger?: HTMLElement) => { returnFocusRef.current = trigger || null; setCreating(true); };
  const openEnquiry = (item: Enquiry, trigger: HTMLElement) => { returnFocusRef.current = trigger; setSelected(item); };

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    const data = new FormData(event.currentTarget);
    try {
      const result = await adminApi<{enquiry: Enquiry}>('/enquiries', {method: 'POST', body: JSON.stringify(Object.fromEntries(data))});
      setItems(current => [result.enquiry, ...current]);
      setCreating(false);
      setNotice('The enquiry was recorded and is ready for follow-up.');
    } catch (nextError) {
      setError(errorMessage(nextError));
    } finally {
      setBusy(false);
    }
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    setError('');
    const data = new FormData(event.currentTarget);
    try {
      const result = await adminApi<{enquiry: Enquiry}>(`/enquiries/${selected.id}`, {method: 'PATCH', body: JSON.stringify({status: data.get('status'), notes: data.get('notes'), assignedTo: data.get('assignedTo') || null})});
      setItems(current => current.map(item => item.id === result.enquiry.id ? result.enquiry : item));
      setSelected(result.enquiry);
      setNotice('Enquiry assignment, status and notes saved.');
    } catch (nextError) {
      setError(errorMessage(nextError));
    } finally {
      setBusy(false);
    }
  };

  return <div>
    <PageHeading eyebrow="OPERATIONS / CONVERSION INBOX" title="Enquiries" description="Track incoming requests, phone calls and follow-up status without losing context." actions={<button className="nk-admin-primary" type="button" onClick={event => openCreate(event.currentTarget)}><Plus/>Record enquiry</button>}/>
    {error && <p className="nk-admin-alert nk-admin-alert--error" role="alert">{error}</p>}
    {notice && <p className="nk-admin-alert" role="status"><Check/>{notice}<button type="button" onClick={() => setNotice('')} aria-label="Dismiss message"><X/></button></p>}
    <div className="nk-admin-filter-tabs" aria-label="Filter enquiries by status"><button type="button" className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All <span>{items.length}</span></button>{statuses.map(status => <button type="button" className={filter === status ? 'active' : ''} onClick={() => setFilter(status)} key={status}>{status.replace('_', ' ')} <span>{items.filter(item => item.status === status).length}</span></button>)}</div>
    {loading ? <div className="nk-admin-list-loading" role="status"><RefreshCw className="nk-admin-spin"/>Loading enquiries…</div> : shown.length ? <div className="nk-admin-enquiry-list">{shown.map(item => <button type="button" onClick={event => openEnquiry(item, event.currentTarget)} key={item.id}><i className={item.status}/><span><small>{item.type} · {new Date(item.createdAt).toLocaleDateString()}</small><b>{item.subject}</b><em>{item.name}{item.phone ? ` · ${item.phone}` : ''}</em></span><strong>{item.status.replace('_', ' ')}</strong><MessageSquareText/></button>)}</div> : <EmptyState title="No enquiries in this view" body="New enquiries and recorded phone calls will appear here."/>}
    {creating && <div className="nk-admin-editor-backdrop"><section ref={dialogRef} className="nk-admin-editor nk-admin-editor--compact" role="dialog" aria-modal="true" aria-labelledby="new-enquiry-title"><header><div><span>NEW INTAKE</span><h2 id="new-enquiry-title">Record an enquiry</h2></div><button type="button" onClick={() => setCreating(false)} aria-label="Close new enquiry form"><X/></button></header><form onSubmit={create}><div className="nk-admin-editor-fields"><label>Type<select name="type" defaultValue="phone">{types.map(type => <option key={type} value={type}>{type}</option>)}</select></label><label>Name<input name="name" required minLength={2} maxLength={150} autoFocus/></label><label>Email<input name="email" type="email" maxLength={254}/></label><label>Phone<input name="phone" maxLength={80}/></label><label>Subject<input name="subject" required maxLength={250}/></label><label>Details<textarea name="message" rows={6} required maxLength={8000}/></label></div><footer><button className="nk-admin-primary" type="submit" disabled={busy}><MailPlus/>{busy ? 'Recording…' : 'Record enquiry'}</button></footer></form></section></div>}
    {selected && <div className="nk-admin-editor-backdrop"><section ref={dialogRef} className="nk-admin-editor nk-admin-editor--compact" role="dialog" aria-modal="true" aria-labelledby="enquiry-title"><header><div><span>{selected.type} · {new Date(selected.createdAt).toLocaleString()}</span><h2 id="enquiry-title">{selected.subject}</h2></div><button type="button" onClick={() => setSelected(null)} aria-label="Close enquiry"><X/></button></header><div className="nk-admin-enquiry-detail"><dl><div><dt>Name</dt><dd>{selected.name}</dd></div><div><dt>Email</dt><dd>{selected.email || 'Not provided'}</dd></div><div><dt>Phone</dt><dd>{selected.phone || 'Not provided'}</dd></div><div><dt>Source</dt><dd>{selected.source}</dd></div></dl><p>{selected.message}</p></div><form onSubmit={save}><div className="nk-admin-editor-fields"><label>Status<select name="status" defaultValue={selected.status}>{statuses.map(status => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}</select></label><label>Assigned to<select name="assignedTo" defaultValue={selected.assignedTo || ''}><option value="">Unassigned</option>{assignees.map(assignee => <option value={assignee.id} key={assignee.id}>{assignee.displayName} · {assignee.email}</option>)}</select></label><label>Internal notes<textarea name="notes" rows={6} maxLength={8000} defaultValue={selected.notes}/></label></div><footer><button className="nk-admin-primary" type="submit" disabled={busy}><Save/>{busy ? 'Saving…' : 'Save follow-up'}</button></footer></form></section></div>}
  </div>;
}
