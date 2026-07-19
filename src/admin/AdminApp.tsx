import {Component, useEffect, useState, type ErrorInfo, type ReactNode} from 'react';
import {Navigate, Outlet, Route, Routes, useLocation} from 'react-router-dom';
import {AdminAuthProvider, useAdminAuth} from './auth/AdminAuth';
import {LoginPage, ServiceUnavailablePage, SetupPage} from './auth/AuthPages';
import {AdminError, AdminLoading, PageHeading} from './components/AdminStates';
import {RecordManager} from './content/RecordManager';
import {VisualEditor} from './content/VisualEditor';
import {AdminLayout} from './layout/AdminLayout';
import {ensureAdminSeed} from './seed';
import {canManageEnquiries, canManageInteractive, canManageUsers, canReadForms, canReadKind, canReadMedia, canReadNavigation} from './permissions';
import type {ContentKind} from './types';
import {AuditPage} from './pages/AuditPage';
import {DashboardPage} from './pages/DashboardPage';
import {EnquiriesPage} from './pages/EnquiriesPage';
import {MediaPage} from './pages/MediaPage';
import {ProfilePage} from './pages/ProfilePage';
import {UsersPage} from './pages/UsersPage';
import {FormsPage} from './pages/FormsPage';
import {SettingsPage} from './pages/SettingsPage';
import {InteractiveStudioPage} from './pages/InteractiveStudioPage';
import './admin.css';
import './productivity.css';
import {isPagesAdminMode} from './pagesMode';
import {AdminLanguageProvider} from './i18n/AdminLanguage';
import {AdminConfirmProvider} from './components/ConfirmDialog';

class AdminErrorBoundary extends Component<{children: ReactNode}, {error: Error | null}> {
  state = {error: null as Error | null};
  static getDerivedStateFromError(error: Error) { return {error}; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Admin UI error', error, info); }
  render() { return this.state.error ? <AdminError message="The admin interface encountered an unexpected error. Reload the page to restore a safe state." retry={() => window.location.reload()}/> : this.props.children; }
}

const visualEditorHeadings: Partial<Record<ContentKind, {title: string; description: string}>> = {
  page: {
    title: 'Website Editor',
    description: 'Create and edit pages, then place them across every website menu from the same workspace.',
  },
  service: {
    title: 'Services',
    description: 'Define service-only content, deliverables and suitable applications.',
  },
  product: {
    title: 'Products',
    description: 'Manage products separately from installation and design services.',
  },
  catalogue: {
    title: 'Catalogues',
    description: 'Manage official brand PDFs and external catalogue links.',
  },
  project: {
    title: 'Projects',
    description: 'Maintain the completed project archive, filters and verified dates.',
  },
  company: {
    title: 'Company',
    description: 'Keep the history and partnership narrative in one accountable source.',
  },
};

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
  if (!user || !canReadKind(user.role, kind)) return <Navigate to="/admin/dashboard" replace/>;
  if (kind === 'seo') return <RecordManager kind={kind}/>;
  const heading = visualEditorHeadings[kind] || {
    title: 'Visual editor',
    description: 'Edit this content directly against the live website preview.',
  };
  return <>
    <PageHeading eyebrow="VISUAL WEBSITE EDITOR" title={heading.title} description={heading.description}/>
    <VisualEditor kind={kind}/>
  </>;
}

function PageManagementRoute() {
  const {user} = useAdminAuth();
  return user && canReadKind(user.role, 'page') ? <RecordManager kind="page"/> : <Navigate to="/admin/dashboard" replace/>;
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
  const location = useLocation();
  if (!user || !canReadNavigation(user.role)) return <Navigate to="/admin/dashboard" replace/>;
  const current = new URLSearchParams(location.search);
  const next = new URLSearchParams({navigation: '1'});
  if (current.get('item')) next.set('navItem', String(current.get('item')));
  if (current.get('new')) next.set('newNav', String(current.get('new')));
  return <Navigate to={`/admin/site-pages?${next}`} replace/>;
}

function FormsRoute() {
  const {user} = useAdminAuth();
  return user && canReadForms(user.role) ? <FormsPage/> : <Navigate to="/admin/dashboard" replace/>;
}

function OwnerRoute({children}: {children: ReactNode}) {
  const {user} = useAdminAuth();
  return user && canManageUsers(user.role) ? children : <Navigate to="/admin/dashboard" replace/>;
}

function InteractiveRoute() {
  const {user} = useAdminAuth();
  return user && canManageInteractive(user.role) ? <InteractiveStudioPage/> : <Navigate to="/admin/dashboard" replace/>;
}

function AdminRoutes() {
  const {phase} = useAdminAuth();
  if (phase === 'loading') return <AdminLoading label="Connecting to secure admin…"/>;
  if (phase === 'unavailable') return <ServiceUnavailablePage/>;
  return <Routes>
    <Route path="login" element={<LoginPage/>}/>
    <Route path="setup" element={isPagesAdminMode ? <Navigate to="/admin/dashboard" replace/> : <SetupPage/>}/>
    <Route element={<ProtectedRoot/>}>
      <Route element={<AdminLayout/>}>
        <Route index element={<Navigate to="dashboard" replace/>}/>
        <Route path="dashboard" element={<DashboardPage/>}/>
        <Route path="pages" element={<ContentRoute kind="page"/>}/>
        <Route path="site-pages" element={<PageManagementRoute/>}/>
        <Route path="services" element={<ContentRoute kind="service"/>}/>
        <Route path="products" element={<ContentRoute kind="product"/>}/>
        <Route path="catalogues" element={<ContentRoute kind="catalogue"/>}/>
        <Route path="projects" element={<ContentRoute kind="project"/>}/>
        <Route path="company" element={<ContentRoute kind="company"/>}/>
        <Route path="seo" element={<ContentRoute kind="seo"/>}/>
        <Route path="settings" element={<SettingsRoute/>}/>
        <Route path="enquiries" element={<EnquiriesRoute/>}/>
        <Route path="media" element={<MediaRoute/>}/>
        <Route path="interactive" element={<InteractiveRoute/>}/>
        <Route path="navigation" element={<NavigationRoute/>}/>
        <Route path="forms" element={<FormsRoute/>}/>
        <Route path="users" element={isPagesAdminMode ? <Navigate to="/admin/dashboard" replace/> : <OwnerRoute><UsersPage/></OwnerRoute>}/>
        <Route path="audit" element={<AuditPage/>}/>
        <Route path="profile" element={isPagesAdminMode ? <Navigate to="/admin/dashboard" replace/> : <ProfilePage/>}/>
        <Route path="*" element={<div className="nk-admin-not-found"><span>ADMIN / 404</span><h1>Section not found.</h1><a href="/admin/dashboard">Return to dashboard</a></div>}/>
      </Route>
    </Route>
  </Routes>;
}

export default function AdminApp() {
  return <AdminErrorBoundary><AdminLanguageProvider><AdminAuthProvider><AdminConfirmProvider><AdminRoutes/></AdminConfirmProvider></AdminAuthProvider></AdminLanguageProvider></AdminErrorBoundary>;
}
