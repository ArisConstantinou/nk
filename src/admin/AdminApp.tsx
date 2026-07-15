import {Component, useEffect, useState, type ErrorInfo, type ReactNode} from 'react';
import {Navigate, Outlet, Route, Routes} from 'react-router-dom';
import {AdminAuthProvider, useAdminAuth} from './auth/AdminAuth';
import {LoginPage, ServiceUnavailablePage, SetupPage} from './auth/AuthPages';
import {AdminError, AdminLoading} from './components/AdminStates';
import {RecordManager} from './content/RecordManager';
import {VisualEditor} from './content/VisualEditor';
import {AdminLayout} from './layout/AdminLayout';
import {ensureAdminSeed} from './seed';
import {canManageEnquiries, canManageUsers, canReadForms, canReadKind, canReadMedia, canReadNavigation} from './permissions';
import type {ContentKind} from './types';
import {AuditPage} from './pages/AuditPage';
import {DashboardPage} from './pages/DashboardPage';
import {EnquiriesPage} from './pages/EnquiriesPage';
import {MediaPage} from './pages/MediaPage';
import {ProfilePage} from './pages/ProfilePage';
import {UsersPage} from './pages/UsersPage';
import {NavigationPage} from './pages/NavigationPage';
import {FormsPage} from './pages/FormsPage';
import {SettingsPage} from './pages/SettingsPage';
import './admin.css';
import './productivity.css';

class AdminErrorBoundary extends Component<{children: ReactNode}, {error: Error | null}> {
  state = {error: null as Error | null};
  static getDerivedStateFromError(error: Error) { return {error}; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Admin UI error', error, info); }
  render() { return this.state.error ? <AdminError message="The admin interface encountered an unexpected error. Reload the page to restore a safe state." retry={() => window.location.reload()}/> : this.props.children; }
}

function ProtectedRoot() {
  const {phase, user} = useAdminAuth();
  const [seedState, setSeedState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [seedError, setSeedError] = useState('');
  const seed = async () => {
    if (phase !== 'authenticated' || !user) return;
    if (user.role !== 'owner') { setSeedState('ready'); return; }
    setSeedState('loading'); setSeedError('');
    try { await ensureAdminSeed(); setSeedState('ready'); }
    catch (error) { setSeedError(error instanceof Error ? error.message : 'Initial content could not be prepared.'); setSeedState('error'); }
  };
  useEffect(() => { void seed(); }, [phase, user?.id]);
  if (phase === 'loading') return <AdminLoading label="Verifying secure session…"/>;
  if (phase === 'setup') return <Navigate to="/admin/setup" replace/>;
  if (phase !== 'authenticated') return <Navigate to="/admin/login" replace/>;
  if (seedState === 'loading') return <AdminLoading label="Preparing structured content…"/>;
  if (seedState === 'error') return <AdminError message={seedError} retry={() => void seed()}/>;
  return <Outlet/>;
}

function ContentRoute({kind}: {kind: ContentKind}) {
  const {user} = useAdminAuth();
  return user && canReadKind(user.role, kind) ? kind === 'seo' ? <RecordManager kind={kind}/> : <VisualEditor kind={kind}/> : <Navigate to="/admin/dashboard" replace/>;
}

function EnquiriesRoute() {
  const {user} = useAdminAuth();
  return user && canManageEnquiries(user.role) ? <EnquiriesPage/> : <Navigate to="/admin/dashboard" replace/>;
}

function MediaRoute() {
  const {user} = useAdminAuth();
  return user && canReadMedia(user.role) ? <MediaPage/> : <Navigate to="/admin/dashboard" replace/>;
}

function SettingsRoute() {
  const {user} = useAdminAuth();
  return user && canReadKind(user.role, 'settings') ? <SettingsPage/> : <Navigate to="/admin/dashboard" replace/>;
}

function NavigationRoute() {
  const {user} = useAdminAuth();
  return user && canReadNavigation(user.role) ? <NavigationPage/> : <Navigate to="/admin/dashboard" replace/>;
}

function FormsRoute() {
  const {user} = useAdminAuth();
  return user && canReadForms(user.role) ? <FormsPage/> : <Navigate to="/admin/dashboard" replace/>;
}

function OwnerRoute({children}: {children: ReactNode}) {
  const {user} = useAdminAuth();
  return user && canManageUsers(user.role) ? children : <Navigate to="/admin/dashboard" replace/>;
}

function AdminRoutes() {
  const {phase} = useAdminAuth();
  if (phase === 'loading') return <AdminLoading label="Connecting to secure admin…"/>;
  if (phase === 'unavailable') return <ServiceUnavailablePage/>;
  return <Routes>
    <Route path="login" element={<LoginPage/>}/>
    <Route path="setup" element={<SetupPage/>}/>
    <Route element={<ProtectedRoot/>}>
      <Route element={<AdminLayout/>}>
        <Route index element={<Navigate to="dashboard" replace/>}/>
        <Route path="dashboard" element={<DashboardPage/>}/>
        <Route path="pages" element={<ContentRoute kind="page"/>}/>
        <Route path="services" element={<ContentRoute kind="service"/>}/>
        <Route path="products" element={<ContentRoute kind="product"/>}/>
        <Route path="catalogues" element={<ContentRoute kind="catalogue"/>}/>
        <Route path="projects" element={<ContentRoute kind="project"/>}/>
        <Route path="company" element={<ContentRoute kind="company"/>}/>
        <Route path="seo" element={<ContentRoute kind="seo"/>}/>
        <Route path="settings" element={<SettingsRoute/>}/>
        <Route path="enquiries" element={<EnquiriesRoute/>}/>
        <Route path="media" element={<MediaRoute/>}/>
        <Route path="navigation" element={<NavigationRoute/>}/>
        <Route path="forms" element={<FormsRoute/>}/>
        <Route path="users" element={<OwnerRoute><UsersPage/></OwnerRoute>}/>
        <Route path="audit" element={<AuditPage/>}/>
        <Route path="profile" element={<ProfilePage/>}/>
        <Route path="*" element={<div className="nk-admin-not-found"><span>ADMIN / 404</span><h1>Section not found.</h1><a href="/admin/dashboard">Return to dashboard</a></div>}/>
      </Route>
    </Route>
  </Routes>;
}

export default function AdminApp() {
  return <AdminErrorBoundary><AdminAuthProvider><AdminRoutes/></AdminAuthProvider></AdminErrorBoundary>;
}
