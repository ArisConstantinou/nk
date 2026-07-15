import {useState, type FormEvent} from 'react';
import {Check, KeyRound, Save} from 'lucide-react';
import {adminApi, errorMessage} from '../api';
import {useAdminAuth} from '../auth/AdminAuth';
import {PageHeading} from '../components/AdminStates';

export function ProfilePage() {
  const {user} = useAdminAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    if (data.get('newPassword') !== data.get('confirmation')) {
      setError('The new password confirmation does not match.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await adminApi('/profile/password', {method: 'POST', body: JSON.stringify({currentPassword: data.get('currentPassword'), newPassword: data.get('newPassword')})});
      form.reset();
      setNotice('Password changed. All previous session tokens were revoked.');
    } catch (nextError) {
      setError(errorMessage(nextError));
    } finally {
      setBusy(false);
    }
  };

  return <div>
    <PageHeading eyebrow="ACCOUNT / SECURITY" title="Your profile" description="Review your access context and rotate your password securely."/>
    {error && <p className="nk-admin-alert nk-admin-alert--error" role="alert">{error}</p>}
    {notice && <p className="nk-admin-alert" role="status"><Check/>{notice}</p>}
    <div className="nk-admin-profile-grid">
      <section className="nk-admin-panel">
        <header><div><KeyRound/><span>ACTIVE IDENTITY</span></div><b>{user?.displayName}</b></header>
        <dl><div><dt>Email</dt><dd>{user?.email}</dd></div><div><dt>Role</dt><dd>{user?.role}</dd></div><div><dt>Status</dt><dd>{user?.active ? 'Active' : 'Disabled'}</dd></div></dl>
      </section>
      <form className="nk-admin-panel nk-admin-password-form" onSubmit={submit}>
        <header><div><KeyRound/><span>PASSWORD ROTATION</span></div><b>Change password</b></header>
        <label>Current password<input name="currentPassword" type="password" autoComplete="current-password" required/></label>
        <label>New password<input name="newPassword" type="password" autoComplete="new-password" required minLength={12}/><small>At least 12 characters with upper-case, lower-case and a number.</small></label>
        <label>Confirm new password<input name="confirmation" type="password" autoComplete="new-password" required minLength={12}/></label>
        <button className="nk-admin-primary" disabled={busy}><Save/>{busy ? 'Changing…' : 'Change password'}</button>
      </form>
    </div>
  </div>;
}
