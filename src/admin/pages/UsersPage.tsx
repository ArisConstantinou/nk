import {useEffect, useState, type FormEvent} from 'react';
import {Check, Plus, RefreshCw, Shield, UserPlus, X} from 'lucide-react';
import {useSearchParams} from 'react-router-dom';
import {adminApi, errorMessage} from '../api';
import {PageHeading} from '../components/AdminStates';
import {useAdminConfirm} from '../components/ConfirmDialog';
import type {AdminRole, AdminUser} from '../types';

const roles: AdminRole[] = ['editor', 'shop', 'projects', 'sales', 'viewer'];
const roleMatrix: Array<{role: AdminRole; access: string; rights: string}> = [
  {role: 'owner', access: 'Everything, including users and permanent deletion', rights: 'Read · create · edit · publish · delete'},
  {role: 'editor', access: 'Pages, services, company, SEO, settings, menus, forms and media', rights: 'Read · create · edit · publish'},
  {role: 'shop', access: 'Products, catalogues and media', rights: 'Read · create · edit · publish'},
  {role: 'projects', access: 'Projects and media', rights: 'Read · create · edit · publish'},
  {role: 'sales', access: 'Enquiries and form submissions', rights: 'Read · follow up · resolve'},
  {role: 'viewer', access: 'Content, menus, forms and media', rights: 'Read only'},
];

export function UsersPage() {
  const confirm = useAdminConfirm();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [params] = useSearchParams();
  const requestedUserId = params.get('user') || '';

  const load = async () => {
    setLoading(true);
    try {
      const result = await adminApi<{users: AdminUser[]}>('/users');
      setUsers(result.users);
    } catch (nextError) {
      setError(errorMessage(nextError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (!requestedUserId || !users.some(user => user.id === requestedUserId)) return;
    document.getElementById(`admin-user-${requestedUserId}`)?.scrollIntoView({block: 'center', behavior: 'smooth'});
  }, [requestedUserId, users]);
  useEffect(() => {
    if (!creating) return;
    const closeDialog = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) setCreating(false);
    };
    window.addEventListener('keydown', closeDialog);
    return () => window.removeEventListener('keydown', closeDialog);
  }, [busy, creating]);

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    const data = new FormData(event.currentTarget);
    try {
      const result = await adminApi<{user: AdminUser}>('/users', {method: 'POST', body: JSON.stringify(Object.fromEntries(data))});
      setUsers(current => [...current, result.user]);
      setCreating(false);
      setNotice('User created. Share the password through a secure channel.');
    } catch (nextError) {
      setError(errorMessage(nextError));
    } finally {
      setBusy(false);
    }
  };

  const update = async (user: AdminUser, role: AdminRole, active: boolean) => {
    if (!active && user.active && !await confirm({
      eyebrow: 'ACCOUNT ACCESS',
      title: `Disable access for ${user.displayName}?`,
      description: 'This user will no longer be able to enter the administration workspace.',
      detail: 'Their active sessions will be closed. You can enable the account again later.',
      confirmLabel: 'Disable access',
      cancelLabel: 'Keep active',
      tone: 'warning',
    })) return;
    setBusy(true);
    setError('');
    try {
      const result = await adminApi<{user: AdminUser}>(`/users/${user.id}`, {method: 'PATCH', body: JSON.stringify({role, active})});
      setUsers(current => current.map(item => item.id === result.user.id ? result.user : item));
      setNotice(`${result.user.displayName} updated.`);
    } catch (nextError) {
      setError(errorMessage(nextError));
    } finally {
      setBusy(false);
    }
  };

  return <div>
    <PageHeading eyebrow="ACCESS / LEAST PRIVILEGE" title="Users & roles" description="Create accountable access and restrict each user to the work they perform." actions={<button className="nk-admin-primary" onClick={() => setCreating(true)}><Plus/>Add user</button>}/>
    {error && <p className="nk-admin-alert nk-admin-alert--error" role="alert">{error}</p>}
    {notice && <p className="nk-admin-alert" role="status"><Check/>{notice}<button onClick={() => setNotice('')} aria-label="Dismiss message"><X/></button></p>}
    <section className="nk-admin-role-matrix" aria-labelledby="role-matrix-title">
      <header><div><Shield/><span>PERMISSION MODEL</span></div><h2 id="role-matrix-title">What each role can access</h2></header>
      <div role="list">{roleMatrix.map(item => <article role="listitem" key={item.role}><strong>{item.role}</strong><span>{item.access}</span><small>{item.rights}</small></article>)}</div>
    </section>
    {loading ? <div className="nk-admin-list-loading"><RefreshCw className="nk-admin-spin"/>Loading users…</div> : <div className="nk-admin-users">{users.map(user => <article id={`admin-user-${user.id}`} className={`${!user.active ? 'inactive ' : ''}${requestedUserId === user.id ? 'is-requested' : ''}`} key={user.id}><div className="nk-admin-user-avatar"><Shield/></div><div><b>{user.displayName}</b><span>{user.email}</span><small>Created {new Date(user.createdAt).toLocaleDateString()}</small></div>{user.role === 'owner' ? <strong>owner</strong> : <><select aria-label={`Role for ${user.displayName}`} value={user.role} disabled={busy} onChange={event => void update(user, event.target.value as AdminRole, user.active)}>{roles.map(role => <option key={role}>{role}</option>)}</select><label><input type="checkbox" checked={user.active} disabled={busy} onChange={event => void update(user, user.role, event.target.checked)}/><span>{user.active ? 'Active' : 'Disabled'}</span></label></>}</article>)}</div>}
    {creating && <div className="nk-admin-editor-backdrop"><section className="nk-admin-editor nk-admin-editor--compact" role="dialog" aria-modal="true" aria-label="Create admin user"><header><div><span>ACCOUNTABLE ACCESS</span><h2>Create user</h2></div><button onClick={() => setCreating(false)} aria-label="Close user form"><X/></button></header><form onSubmit={create}><div className="nk-admin-editor-fields"><label>Display name<input name="displayName" required minLength={2} autoFocus/></label><label>Email<input name="email" type="email" required/></label><label>Role<select name="role" defaultValue="editor">{roles.map(role => <option key={role}>{role}</option>)}</select></label><label>Initial password<input name="password" type="password" required minLength={12}/><small>At least 12 characters with upper-case, lower-case and a number.</small></label></div><footer><button className="nk-admin-primary" disabled={busy}><UserPlus/>{busy ? 'Creating…' : 'Create user'}</button></footer></form></section></div>}
  </div>;
}
