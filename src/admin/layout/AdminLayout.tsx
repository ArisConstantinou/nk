import {useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent} from 'react';
import {Activity, BookOpen, Boxes, BriefcaseBusiness, Building2, ChevronRight, ClipboardList, ExternalLink, FileInput, FolderKanban, HelpCircle, Image, LayoutDashboard, ListTree, LogOut, Menu, Package, Search, Settings, ShieldCheck, ShoppingBag, UserRound, Users, X} from 'lucide-react';
import {NavLink, Outlet, useLocation, useNavigate} from 'react-router-dom';
import {useAdminAuth} from '../auth/AdminAuth';
import {canManageEnquiries, canManageUsers, canReadForms, canReadKind, canReadMedia, canReadNavigation} from '../permissions';
import {CommandPalette} from './CommandPalette';
import {AdminGuide} from './AdminGuide';
import {publicAsset} from '../../utils/assets';

const overview = [
  {to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard},
  {to: '/admin/pages', label: 'Website Editor', icon: Boxes},
] as const;

const content = [
  {to: '/admin/services', label: 'Services', icon: BriefcaseBusiness},
  {to: '/admin/projects', label: 'Projects', icon: FolderKanban},
  {to: '/admin/company', label: 'Company', icon: Building2},
] as const;

const shop = [
  {to: '/admin/products', label: 'Products', icon: ShoppingBag},
  {to: '/admin/catalogues', label: 'Catalogues', icon: BookOpen},
] as const;

const settings = [
  {to: '/admin/settings', label: 'Site Settings', icon: Settings},
  {to: '/admin/navigation', label: 'Navigation', icon: ListTree},
  {to: '/admin/seo', label: 'SEO', icon: Search},
] as const;

function NavItem({to, label, icon: Icon, close}: {to: string; label: string; icon: typeof Package; close: () => void}) {
  return <NavLink to={to} onClick={close} data-admin-tour={to} className={({isActive}) => isActive ? 'active' : ''}><Icon/><span>{label}</span><ChevronRight/></NavLink>;
}

export function AdminLayout() {
  const {user, logout} = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const workspaceRef = useRef<HTMLElement>(null);
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);
  const commandTriggerRef = useRef<HTMLButtonElement>(null);
  const guideTriggerRef = useRef<HTMLButtonElement | null>(null);
  const closeCommand = useCallback((reason: 'dismiss' | 'select' = 'dismiss') => {
    setCommandOpen(false);
    if (reason === 'select' && guideOpen) setGuideOpen(false);
  }, [guideOpen]);
  const closeGuide = useCallback(() => {
    setGuideOpen(false);
    window.setTimeout(() => guideTriggerRef.current?.focus(), 0);
  }, []);
  const openGuide = (event: ReactMouseEvent<HTMLButtonElement>) => {
    guideTriggerRef.current = event.currentTarget;
    setMobileOpen(false);
    setGuideOpen(true);
  };
  const close = () => {
    const shouldRestoreFocus = mobileOpen;
    setMobileOpen(false);
    if (shouldRestoreFocus) window.setTimeout(() => mobileTriggerRef.current?.focus(), 0);
  };
  const openCommand = () => {close(); setCommandOpen(true);};
  const signOut = async () => { await logout(); navigate('/admin/login', {replace: true}); };
  const currentLabel = useMemo(() => [...overview, ...content, ...shop, ...settings, {to: '/admin/forms', label: 'Form Submissions'}, {to: '/admin/enquiries', label: 'Enquiries'}, {to: '/admin/media', label: 'Media'}, {to: '/admin/users', label: 'Users'}, {to: '/admin/audit', label: 'Audit Log'}, {to: '/admin/profile', label: 'Your Profile'}].find(item => item.to === location.pathname)?.label || 'Dashboard', [location.pathname]);
  const currentGroup = location.pathname.includes('dashboard') || location.pathname.includes('pages') ? 'Overview' : location.pathname.includes('products') || location.pathname.includes('catalogues') ? 'Shop' : location.pathname.includes('media') ? 'Media' : location.pathname.includes('forms') || location.pathname.includes('enquiries') ? 'Customers' : location.pathname.includes('users') || location.pathname.includes('audit') ? 'Administration' : location.pathname.includes('navigation') || location.pathname.includes('settings') || location.pathname.includes('seo') ? 'Settings' : 'Content';
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {event.preventDefault(); setMobileOpen(false); setCommandOpen(true);}
      if (event.key === 'Escape') {
        if (commandOpen) {closeCommand('dismiss'); return;}
        if (mobileOpen) window.setTimeout(() => mobileTriggerRef.current?.focus(), 0);
        setMobileOpen(false);
        if (guideOpen) closeGuide();
      }
    };
    const openSearch = () => {setMobileOpen(false); setCommandOpen(true);};
    window.addEventListener('keydown', shortcut);
    window.addEventListener('nk-admin:open-search', openSearch);
    return () => {window.removeEventListener('keydown', shortcut); window.removeEventListener('nk-admin:open-search', openSearch);};
  }, [closeCommand, closeGuide, commandOpen, guideOpen, mobileOpen]);
  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.setTimeout(() => sidebarRef.current?.querySelector<HTMLElement>('button, a')?.focus(), 0);
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !sidebarRef.current) return;
      const focusable = [...sidebarRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]')].filter(element => getComputedStyle(element).visibility !== 'hidden');
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {event.preventDefault(); last.focus();}
      else if (!event.shiftKey && document.activeElement === last) {event.preventDefault(); first.focus();}
    };
    document.addEventListener('keydown', trapFocus);
    return () => {
      document.removeEventListener('keydown', trapFocus);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);
  useEffect(() => {
    if (sidebarRef.current) sidebarRef.current.inert = commandOpen;
    if (workspaceRef.current) workspaceRef.current.inert = mobileOpen || commandOpen || guideOpen;
  }, [commandOpen, guideOpen, mobileOpen]);
  useEffect(() => {
    document.title = `${currentLabel} — NK Electrical Admin`;
  }, [currentLabel]);
  if (!user) return null;

  return <div className="nk-admin-shell">
    <a className="nk-admin-skip" href="#admin-main">Skip to main content</a>
    <aside ref={sidebarRef} id="admin-navigation" className={`nk-admin-sidebar ${mobileOpen ? 'open' : ''}`}>
      <div className="nk-admin-logo"><img src={publicAsset('assets/nk-logo-transparent-v2.png')} alt=""/><div><b>NK Electrical</b><small>Administration</small></div><button type="button" onClick={close} aria-label="Close admin navigation"><X/></button></div>
      <button className="nk-admin-sidebar-search" type="button" onClick={openCommand} data-admin-tour="search"><Search/><span>Search admin</span><kbd>Ctrl K</kbd></button>
      <nav aria-label="Admin navigation">
        <NavItem {...overview[0]} close={close}/>
        {canReadKind(user.role, 'page') && <NavItem {...overview[1]} close={close}/>}

        {(canReadKind(user.role, 'service') || canReadKind(user.role, 'project') || canReadKind(user.role, 'company')) && <small data-admin-tour="group-content">CONTENT</small>}
        {content.filter(item => canReadKind(user.role, item.to === '/admin/services' ? 'service' : item.to === '/admin/projects' ? 'project' : 'company')).map(item => <NavItem {...item} close={close} key={item.to}/>)}

        {(canReadKind(user.role, 'product') || canReadKind(user.role, 'catalogue')) && <small>SHOP</small>}
        {shop.filter(item => canReadKind(user.role, item.to === '/admin/products' ? 'product' : 'catalogue')).map(item => <NavItem {...item} close={close} key={item.to}/>)}

        {(canReadForms(user.role) || canManageEnquiries(user.role)) && <small data-admin-tour="group-operations">CUSTOMERS</small>}
        {canReadForms(user.role) && <NavItem to="/admin/forms" label="Form Submissions" icon={FileInput} close={close}/>}
        {canManageEnquiries(user.role) && <NavItem to="/admin/enquiries" label="Enquiries" icon={ClipboardList} close={close}/>}

        {canReadMedia(user.role) && <NavItem to="/admin/media" label="Media" icon={Image} close={close}/>}

        {(canReadKind(user.role, 'settings') || canReadNavigation(user.role) || canReadKind(user.role, 'seo')) && <small data-admin-tour="group-system">SETTINGS</small>}
        {settings.filter(item => item.to === '/admin/navigation' ? canReadNavigation(user.role) : canReadKind(user.role, item.to === '/admin/seo' ? 'seo' : 'settings')).map(item => <NavItem {...item} close={close} key={item.to}/>)}

        <small>ADMINISTRATION</small>
        {canManageUsers(user.role) && <NavItem to="/admin/users" label="Users" icon={Users} close={close}/>}
        <NavItem to="/admin/audit" label={user.role === 'owner' ? 'Audit Log' : 'My Activity'} icon={Activity} close={close}/>
      </nav>
      <button className="nk-admin-guide-trigger" type="button" onClick={openGuide} data-admin-tour="guide"><HelpCircle/><span>Guide / Οδηγός</span></button>
      <div className="nk-admin-sidebar-user"><NavLink to="/admin/profile" onClick={close} data-admin-tour="profile"><UserRound/><span><b>{user.displayName}</b><small>{user.role} · {user.email}</small></span></NavLink><button type="button" onClick={() => void signOut()} data-admin-tour="signout"><LogOut/>Sign out</button></div>
    </aside>
    {mobileOpen && <button className="nk-admin-scrim" type="button" aria-label="Close navigation" onClick={close}/>}
    <section ref={workspaceRef} className="nk-admin-workspace">
      <header className="nk-admin-topbar"><button ref={mobileTriggerRef} className="nk-admin-menu-trigger" type="button" onClick={() => setMobileOpen(true)} aria-label="Open admin navigation" aria-expanded={mobileOpen} aria-controls="admin-navigation"><Menu/></button><nav aria-label="Breadcrumb"><NavLink to="/admin/dashboard">Admin</NavLink><ChevronRight/><span>{currentGroup}</span><ChevronRight/><b>{currentLabel}</b></nav><div className="nk-admin-topbar-actions"><button className="nk-admin-topbar-guide" type="button" onClick={openGuide}><HelpCircle/><span>Guide / Οδηγός</span></button><button ref={commandTriggerRef} className="nk-admin-global-search" type="button" aria-label="Search admin" onClick={() => setCommandOpen(true)}><Search/><span>Search</span><kbd>Ctrl K</kbd></button><a href="/" target="_blank" rel="noreferrer">View site <ExternalLink/></a><NavLink className="nk-admin-topbar-avatar" to="/admin/profile" aria-label="Open your profile">{user.displayName.split(/\s+/).slice(0,2).map(part => part[0]).join('').toUpperCase()}</NavLink></div></header>
      <main id="admin-main" tabIndex={-1}><div className="nk-admin-security-line"><ShieldCheck/><span>Secure workspace</span><i/>Changes are recorded in the audit log</div><Outlet/></main>
    </section>
    <CommandPalette open={commandOpen} onClose={closeCommand} role={user.role} fallbackFocusRef={commandTriggerRef} guided={false}/>
    <AdminGuide open={guideOpen && !commandOpen} onClose={closeGuide} onNavigate={to => navigate(to)}/>
  </div>;
}
