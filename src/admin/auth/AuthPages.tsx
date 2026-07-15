import {useState, type FormEvent} from 'react';
import {ArrowRight, LockKeyhole, RefreshCw, ShieldCheck} from 'lucide-react';
import {Navigate, useNavigate} from 'react-router-dom';
import {errorMessage} from '../api';
import {useAdminAuth} from './AdminAuth';

function AuthShell({children, title, body}: {children: React.ReactNode; title: string; body: string}) {
  return <div className="nk-admin-auth"><aside><div className="nk-admin-auth-mark">NK</div><span>SECURE OPERATIONS</span><h1>{title}</h1><p>{body}</p><div><ShieldCheck/><b>Server-authenticated</b><small>Passwords, permissions and sessions are enforced outside the browser.</small></div></aside><main>{children}<a href="/">← Return to NK Electrical</a></main></div>;
}

export function LoginPage() {
  const {phase, login} = useAdminAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (phase === 'authenticated') return <Navigate to="/admin/dashboard" replace/>;
  if (phase === 'setup') return <Navigate to="/admin/setup" replace/>;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true); setError('');
    try { await login(String(data.get('email')), String(data.get('password'))); navigate('/admin/dashboard', {replace: true}); }
    catch (nextError) { setError(errorMessage(nextError)); }
    finally { setBusy(false); }
  };

  return <AuthShell title="Control the content. Protect the operation." body="Sign in to manage published content, enquiries, media and access controls."><form className="nk-admin-auth-form" onSubmit={submit}><div><LockKeyhole/><span>ADMIN SIGN IN</span><h2>Welcome back</h2></div>{error && <p className="nk-admin-form-error" role="alert">{error}</p>}<label>Email<input name="email" type="email" autoComplete="username" required autoFocus/></label><label>Password<input name="password" type="password" autoComplete="current-password" required minLength={12}/></label><button type="submit" disabled={busy}>{busy ? <><RefreshCw className="nk-admin-spin"/>Signing in…</> : <>Sign in <ArrowRight/></>}</button></form></AuthShell>;
}

export function SetupPage() {
  const {phase, requiresBootstrapToken, setup} = useAdminAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (phase === 'authenticated') return <Navigate to="/admin/dashboard" replace/>;
  if (phase === 'guest') return <Navigate to="/admin/login" replace/>;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const password = String(data.get('password'));
    if (password !== String(data.get('confirmPassword'))) { setError('The password confirmation does not match.'); return; }
    setBusy(true); setError('');
    try {
      await setup({displayName: String(data.get('displayName')), email: String(data.get('email')), password, bootstrapToken: String(data.get('bootstrapToken') || '')});
      navigate('/admin/dashboard', {replace: true});
    } catch (nextError) { setError(errorMessage(nextError)); }
    finally { setBusy(false); }
  };

  return <AuthShell title="Create the first accountable owner." body="This one-time setup creates the owner account and immediately locks the bootstrap route."><form className="nk-admin-auth-form" onSubmit={submit}><div><ShieldCheck/><span>ONE-TIME SETUP</span><h2>Create owner</h2></div>{error && <p className="nk-admin-form-error" role="alert">{error}</p>}<label>Display name<input name="displayName" required minLength={2} maxLength={100} autoFocus/></label><label>Email<input name="email" type="email" autoComplete="username" required/></label><label>Password<input name="password" type="password" autoComplete="new-password" required minLength={12}/><small>At least 12 characters with upper-case, lower-case and a number.</small></label><label>Confirm password<input name="confirmPassword" type="password" autoComplete="new-password" required minLength={12}/></label>{requiresBootstrapToken&&<label>Server bootstrap token<input name="bootstrapToken" type="password" autoComplete="off" required/><small>Required by the server before the first owner can be created.</small></label>}<button type="submit" disabled={busy}>{busy ? <><RefreshCw className="nk-admin-spin"/>Creating owner…</> : <>Create secure admin <ArrowRight/></>}</button></form></AuthShell>;
}

export function ServiceUnavailablePage() {
  const {error, refresh} = useAdminAuth();
  return <AuthShell title="The admin service is offline." body="The public website remains available. The protected workspace fails closed until its server is reachable."><div className="nk-admin-offline"><LockKeyhole/><h2>Secure connection unavailable</h2><p>{error}</p><button type="button" onClick={() => void refresh()}><RefreshCw/>Retry connection</button></div></AuthShell>;
}
