import {useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type RefObject} from 'react';
import {Activity, BookOpen, BriefcaseBusiness, Building2, ChevronRight, ClipboardList, Clapperboard, ExternalLink, FileInput, FileText, FolderKanban, HelpCircle, Image, Languages, LayoutDashboard, LogOut, Menu, Package, Plus, Search, Settings, ShieldCheck, ShoppingBag, UserRound, Users, X} from 'lucide-react';
import {Link, NavLink, Outlet as RouterOutlet, useLocation, useNavigate} from 'react-router-dom';
import {useAdminAuth} from '../auth/AdminAuth';
import {canManageEnquiries, canManageInteractive, canManageMedia, canManageUsers, canReadForms, canReadKind, canReadMedia, canReadNavigation, canWriteKind} from '../permissions';
import type {AdminRole} from '../types';
import {CommandPalette} from './CommandPalette';
import {BeginnerSiteGuide} from './BeginnerSiteGuide';
import {publicAsset} from '../../utils/assets';
import {isPagesAdminMode} from '../pagesMode';
import {AdminTranslationLayer, useAdminLanguage} from '../i18n/AdminLanguage';
import {AdminLearningPanel, learningForPath, learningText} from '../learning/AdminLearningPanel';

const overview = [
  {to: '/admin/dashboard', label: 'Home', icon: LayoutDashboard},
  {to: '/admin/content', label: 'Manage content', icon: FileText},
  {to: '/admin/pages', label: 'Pages', icon: FileText},
  {to: '/admin/products', label: 'Products', icon: ShoppingBag},
] as const;

const content = [
  {to: '/admin/services', label: 'Services', icon: BriefcaseBusiness},
  {to: '/admin/projects', label: 'Projects', icon: FolderKanban},
  {to: '/admin/catalogues', label: 'Catalogues', icon: BookOpen},
  {to: '/admin/company', label: 'Company', icon: Building2},
] as const;

const settings = [
  {to: '/admin/settings', label: 'Site Settings', icon: Settings},
  {to: '/admin/seo', label: 'SEO', icon: Search},
] as const;

function Outlet() {
  return <><AdminLearningPanel/><RouterOutlet/></>;
}

function NavItem({to, label, icon: Icon, close, className = ''}: {to: string; label: string; icon: typeof Package; close: () => void; className?: string}) {
  const {language} = useAdminLanguage();
  const learning = learningForPath(to);
  const localizedLabel = learningText(learning.label, language) || label;
  return <NavLink to={to} onClick={close} title={learningText(learning.purpose, language)} data-admin-tour={to} className={({isActive}) => `${className}${isActive ? ' active' : ''}`.trim()}><Icon/><span>{localizedLabel}</span><ChevronRight/></NavLink>;
}

function MobileExplorerLink({to, label, icon: Icon, active, close}: {to: string; label: string; icon: typeof Package; active: boolean; close: () => void}) {
  return <NavLink to={to} onClick={close} className={() => active ? 'active' : ''} aria-current={active ? 'page' : undefined}><Icon/><span>{label}</span><ChevronRight/></NavLink>;
}

type MobileManageMode = 'edit' | 'remove';

function MobileWorkspaceExplorer({role, mode, open, close, panelRef}: {role: AdminRole; mode: MobileManageMode; open: boolean; close: () => void; panelRef: RefObject<HTMLElement | null>}) {
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const active = (to: string) => location.pathname === to || location.pathname.startsWith(`${to}/`);
  const pagesActive = location.pathname.startsWith('/admin/pages') && query.get('navigation') !== '1';
  const navigationActive = location.pathname === '/admin/pages' && query.get('navigation') === '1';
  if (!open) return null;
  const removing = mode === 'remove';
  return <><button className="nk-admin-workspace-map-scrim" type="button" aria-label="Close Manage" onClick={close}/><aside ref={panelRef} id="admin-workspace-map" className={`nk-admin-mobile-workspace-map is-${mode}`} role="dialog" aria-modal="true" aria-label={removing ? 'Hide or remove website content' : 'Manage website content'}>
    <header><div><span>{removing ? 'SAFE REMOVAL' : 'MANAGE WEBSITE'}</span><b>{removing ? 'Hide or remove something' : 'What do you want to edit?'}</b><small>{removing ? 'Choose its type, open the item, then use Take offline or Archive.' : 'Choose a content type, then tap the exact item you want to change.'}</small></div><button type="button" onClick={close} aria-label="Close Manage"><X/></button></header>
    <nav>
      <section><h2>Website content</h2>
        {canReadKind(role, 'page') && <MobileExplorerLink to="/admin/pages" label="Pages" icon={FileText} active={pagesActive} close={close}/>}
        {canReadKind(role, 'product') && <MobileExplorerLink to="/admin/products" label="Products" icon={ShoppingBag} active={active('/admin/products')} close={close}/>}
        {canReadKind(role, 'service') && <MobileExplorerLink to="/admin/services" label="Services" icon={BriefcaseBusiness} active={active('/admin/services')} close={close}/>}
        {canReadKind(role, 'project') && <MobileExplorerLink to="/admin/projects" label="Projects" icon={FolderKanban} active={active('/admin/projects')} close={close}/>}
        {canReadKind(role, 'catalogue') && <MobileExplorerLink to="/admin/catalogues" label="Catalogues" icon={BookOpen} active={active('/admin/catalogues')} close={close}/>}
        {canReadKind(role, 'company') && <MobileExplorerLink to="/admin/company" label="Company" icon={Building2} active={active('/admin/company')} close={close}/>}
        {canReadMedia(role) && <MobileExplorerLink to="/admin/media" label="Photos & files" icon={Image} active={active('/admin/media')} close={close}/>}
      </section>
      {canReadNavigation(role) && <section><h2>Optional website structure</h2><MobileExplorerLink to="/admin/pages?navigation=1" label="Menus & navigation" icon={Menu} active={navigationActive} close={close}/></section>}
    </nav>
    <footer><ShieldCheck/><span><b>{removing ? 'Nothing is deleted immediately' : 'Safe drafts'}</b><small>{removing ? 'Take offline hides it; Archive keeps it recoverable.' : 'Your live content stays protected until you publish.'}</small></span></footer>
  </aside></>;
}

export function AdminLayout() {
  const {user, logout} = useAdminAuth();
  const {language, setLanguage, text} = useAdminLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [explorerOpen, setExplorerOpen] = useState(false);
  const [manageMode, setManageMode] = useState<MobileManageMode>('edit');
  const sidebarRef = useRef<HTMLElement>(null);
  const sidebarNavRef = useRef<HTMLElement>(null);
  const explorerRef = useRef<HTMLElement>(null);
  const workspaceRef = useRef<HTMLElement>(null);
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);
  const mobileNavTriggerRef = useRef<HTMLButtonElement>(null);
  const explorerTriggerRef = useRef<HTMLButtonElement>(null);
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
    setExplorerOpen(false);
    setGuideOpen(true);
  };
  const close = () => {
    const shouldRestoreFocus = mobileOpen;
    setMobileOpen(false);
    if (shouldRestoreFocus) window.setTimeout(() => mobileNavTriggerRef.current?.focus(), 0);
  };
  const closeExplorer = useCallback(() => {
    setExplorerOpen(false);
    window.setTimeout(() => explorerTriggerRef.current?.focus(), 0);
  }, []);
  const openCommand = () => {close(); setExplorerOpen(false); setCommandOpen(true);};
  const signOut = async () => { await logout(); navigate('/admin/login', {replace: true}); };
  const currentLabel = useMemo(() => learningText(learningForPath(location.pathname).label, language), [language, location.pathname]);
  const currentGroup = location.pathname.includes('dashboard') ? text('Home', 'Αρχική') : location.pathname.includes('users') || location.pathname.includes('audit') || location.pathname.includes('settings') || location.pathname.includes('seo') ? text('Advanced', 'Προηγμένα') : text('Content', 'Περιεχόμενο');
  const visualEditorRoute = location.pathname.endsWith('/editor');
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {event.preventDefault(); setMobileOpen(false); setExplorerOpen(false); setCommandOpen(true);}
      if (event.key === 'Escape') {
        if (commandOpen) {closeCommand('dismiss'); return;}
        if (explorerOpen) {closeExplorer(); return;}
        if (mobileOpen) window.setTimeout(() => mobileNavTriggerRef.current?.focus(), 0);
        if (quickAddOpen) setQuickAddOpen(false);
        setMobileOpen(false);
        if (guideOpen) closeGuide();
      }
    };
    const openSearch = () => {setMobileOpen(false); setExplorerOpen(false); setCommandOpen(true);};
    window.addEventListener('keydown', shortcut);
    window.addEventListener('nk-admin:open-search', openSearch);
    return () => {window.removeEventListener('keydown', shortcut); window.removeEventListener('nk-admin:open-search', openSearch);};
  }, [closeCommand, closeExplorer, closeGuide, commandOpen, explorerOpen, guideOpen, mobileOpen, quickAddOpen]);
  useEffect(() => {
    const openManage = (event: Event) => {
      const requestedMode = (event as CustomEvent<{mode?: MobileManageMode}>).detail?.mode;
      setCommandOpen(false);
      setMobileOpen(false);
      setQuickAddOpen(false);
      setManageMode(requestedMode === 'remove' ? 'remove' : 'edit');
      setExplorerOpen(true);
    };
    const openAdd = () => {
      setCommandOpen(false);
      setMobileOpen(false);
      setExplorerOpen(false);
      setQuickAddOpen(true);
    };
    window.addEventListener('nk-admin:open-manage', openManage);
    window.addEventListener('nk-admin:open-add', openAdd);
    return () => {
      window.removeEventListener('nk-admin:open-manage', openManage);
      window.removeEventListener('nk-admin:open-add', openAdd);
    };
  }, []);
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
    if (!explorerOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.setTimeout(() => explorerRef.current?.querySelector<HTMLElement>('button, a')?.focus(), 0);
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !explorerRef.current) return;
      const focusable = [...explorerRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]')];
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
  }, [explorerOpen]);
  useEffect(() => {
    if (sidebarRef.current) sidebarRef.current.inert = commandOpen;
    if (workspaceRef.current) workspaceRef.current.inert = mobileOpen || commandOpen || explorerOpen;
  }, [commandOpen, explorerOpen, guideOpen, mobileOpen]);
  useEffect(() => {
    if (sidebarNavRef.current) sidebarNavRef.current.scrollTop = 0;
    setExplorerOpen(false);
  }, [location.pathname, mobileOpen]);
  useEffect(() => {
    document.title = `${currentLabel} — NK Electrical Admin`;
  }, [currentLabel]);
  if (!user) return null;

  return <div className="nk-admin-shell">
    <AdminTranslationLayer/>
    <a className="nk-admin-skip" href="#admin-main">{text('Skip to main content', 'Μετάβαση στο κύριο περιεχόμενο')}</a>
    <aside ref={sidebarRef} id="admin-navigation" className={`nk-admin-sidebar ${mobileOpen ? 'open' : ''}`}>
      <div className="nk-admin-logo"><img src={publicAsset('assets/nk-logo-transparent-v2.png')} alt=""/><span className="nk-admin-logo-wordmark">ELECTRICAL</span><div><b><span className="nk-admin-logo__desktop-title">NK Electrical</span><span className="nk-admin-logo__mobile-title">{text('Help & account', 'Βοήθεια και λογαριασμός')}</span></b><small>Administration</small></div><button type="button" onClick={close} aria-label="Close help"><X/></button></div>
      <button className="nk-admin-sidebar-search" type="button" onClick={openCommand} data-admin-tour="search"><Search/><span>Search admin</span><kbd>Ctrl K</kbd></button>
      <nav ref={sidebarNavRef} aria-label="Admin navigation">
        <small>{text('EVERYDAY', 'ΚΑΘΗΜΕΡΙΝΑ')}</small>
        <NavItem {...overview[0]} close={close} className="nk-admin-nav-primary"/>
        {(canReadKind(user.role, 'page') || canReadKind(user.role, 'product')) && <NavItem {...overview[1]} close={close} className="nk-admin-nav-primary"/>}
        {canReadKind(user.role, 'page') && <NavItem {...overview[2]} close={close} className="nk-admin-nav-primary"/>}
        {canReadKind(user.role, 'product') && <NavItem {...overview[3]} close={close} className="nk-admin-nav-primary"/>}

        {(canReadKind(user.role, 'service') || canReadKind(user.role, 'project') || canReadKind(user.role, 'catalogue') || canReadKind(user.role, 'company')) && <details className="nk-admin-nav-group nk-admin-nav-row" open={content.some(item => location.pathname.startsWith(item.to))}><summary><span><FolderKanban/>{text('Other content', 'Άλλο περιεχόμενο')}</span><ChevronRight/></summary>{content.filter(item => canReadKind(user.role, item.to === '/admin/services' ? 'service' : item.to === '/admin/projects' ? 'project' : item.to === '/admin/catalogues' ? 'catalogue' : 'company')).map(item => <NavItem {...item} close={close} key={item.to}/>)}</details>}

        {(canReadForms(user.role) || canManageEnquiries(user.role)) && <details className="nk-admin-nav-group nk-admin-nav-row" open={location.pathname.includes('/forms') || location.pathname.includes('/enquiries')}><summary><span><Users/>{text('Customers', 'Πελάτες')}</span><ChevronRight/></summary>{canReadForms(user.role) && <NavItem to="/admin/forms" label="Form Submissions" icon={FileInput} close={close}/>} {canManageEnquiries(user.role) && <NavItem to="/admin/enquiries" label="Enquiries" icon={ClipboardList} close={close}/>}</details>}

        {canReadMedia(user.role) && <NavItem to="/admin/media" label="Media library" icon={Image} close={close} className="nk-admin-nav-row"/>}

        <Link to="/?liveEdit=1" onClick={close} className="nk-admin-nav-row nk-admin-nav-visit" aria-label={text('Visit the live site in edit mode', 'Προβολή της ιστοσελίδας σε λειτουργία επεξεργασίας')}><ExternalLink/><span>{text('Visit live site', 'Προβολή ιστοσελίδας')}</span><ChevronRight/></Link>

        {(canReadKind(user.role, 'settings') || canReadKind(user.role, 'seo') || canManageInteractive(user.role)) && <details className="nk-admin-nav-group nk-admin-nav-row" open={location.pathname.includes('/interactive') || location.pathname.includes('/settings') || location.pathname.includes('/seo')}><summary><span><Settings/>{text('Advanced tools', 'Προηγμένα εργαλεία')}</span><ChevronRight/></summary>{canManageInteractive(user.role) && <NavItem to="/admin/interactive" label="Visual studio" icon={Clapperboard} close={close}/>} {settings.filter(item => canReadKind(user.role, item.to === '/admin/seo' ? 'seo' : 'settings')).map(item => <NavItem {...item} close={close} key={item.to}/>)}</details>}

        <details className="nk-admin-nav-group nk-admin-nav-row" open={location.pathname.includes('/users') || location.pathname.includes('/audit')}><summary><span><ShieldCheck/>{text('Administration', 'Διαχείριση')}</span><ChevronRight/></summary>{!isPagesAdminMode && canManageUsers(user.role) && <NavItem to="/admin/users" label="Users" icon={Users} close={close}/>}<NavItem to="/admin/audit" label={user.role === 'owner' ? 'Audit Log' : 'My Activity'} icon={Activity} close={close}/></details>
      </nav>
      <div className="nk-admin-sidebar-language" role="group" aria-label={text('Admin language', 'Γλώσσα διαχείρισης')}><Languages/><span>{text('Language', 'Γλώσσα')}</span><button type="button" className={language === 'en' ? 'active' : ''} onClick={() => setLanguage('en')} aria-pressed={language === 'en'}>EN</button><button type="button" className={language === 'el' ? 'active' : ''} onClick={() => setLanguage('el')} aria-pressed={language === 'el'}>ΕΛ</button></div>
      <button className="nk-admin-guide-trigger" type="button" onClick={openGuide} data-admin-tour="guide"><HelpCircle/><span>Guide / Οδηγός</span></button>
      <div className="nk-admin-sidebar-user">{isPagesAdminMode ? <><div className="nk-admin-device-user"><UserRound/><span><b>{user.displayName}</b><small>Firebase · {user.email}</small></span></div><button type="button" onClick={() => void signOut()} data-admin-tour="signout"><LogOut/>Sign out</button></> : <><NavLink to="/admin/profile" onClick={close} data-admin-tour="profile"><UserRound/><span><b>{user.displayName}</b><small>{user.role} · {user.email}</small></span></NavLink><button type="button" onClick={() => void signOut()} data-admin-tour="signout"><LogOut/>Sign out</button></>}</div>
      <section className="nk-admin-mobile-help" aria-label={text('Help and account', 'Βοήθεια και λογαριασμός')}>
        <div className="nk-admin-mobile-help__intro"><b>{text('How can we help?', 'Πώς μπορούμε να βοηθήσουμε;')}</b><small>{text('Content actions stay under Manage and Add.', 'Οι ενέργειες περιεχομένου βρίσκονται στα Διαχείριση και Προσθήκη.')}</small></div>
        <button className="nk-admin-mobile-help__action is-guide" type="button" onClick={openGuide}><HelpCircle/><span><b>{text('Guide me', 'Καθοδήγησέ με')}</b><small>{text('Step-by-step help for common changes', 'Βοήθεια βήμα προς βήμα για συνηθισμένες αλλαγές')}</small></span><ChevronRight/></button>
        <Link className="nk-admin-mobile-help__action" to="/?liveEdit=1" onClick={close}><ExternalLink/><span><b>{text('View website', 'Προβολή ιστοσελίδας')}</b><small>{text('See what visitors currently see', 'Δείτε τι βλέπουν τώρα οι επισκέπτες')}</small></span><ChevronRight/></Link>
        {(canReadKind(user.role, 'settings') || canReadKind(user.role, 'seo') || canManageInteractive(user.role) || canManageUsers(user.role)) && <details className="nk-admin-mobile-help__owner"><summary><Settings/><span><b>{text('Owner settings', 'Ρυθμίσεις ιδιοκτήτη')}</b><small>{text('Rarely needed', 'Σπάνια χρειάζονται')}</small></span><ChevronRight/></summary><div>
          {canManageInteractive(user.role) && <NavLink to="/admin/interactive" onClick={close}><Clapperboard/>{text('Visual studio', 'Οπτικό στούντιο')}</NavLink>}
          {canReadKind(user.role, 'settings') && <NavLink to="/admin/settings" onClick={close}><Settings/>{text('Site settings', 'Ρυθμίσεις ιστοσελίδας')}</NavLink>}
          {canReadKind(user.role, 'seo') && <NavLink to="/admin/seo" onClick={close}><Search/>SEO</NavLink>}
          {!isPagesAdminMode && canManageUsers(user.role) && <NavLink to="/admin/users" onClick={close}><Users/>{text('Users', 'Χρήστες')}</NavLink>}
          <NavLink to="/admin/audit" onClick={close}><Activity/>{user.role === 'owner' ? text('Activity history', 'Ιστορικό ενεργειών') : text('My activity', 'Οι ενέργειές μου')}</NavLink>
        </div></details>}
        <div className="nk-admin-mobile-help__account"><UserRound/><span><b>{user.displayName}</b><small>{user.email}</small></span><button type="button" onClick={() => void signOut()} aria-label={text('Sign out', 'Αποσύνδεση')}><LogOut/><span>{text('Sign out', 'Αποσύνδεση')}</span></button></div>
      </section>
    </aside>
    {mobileOpen && <button className="nk-admin-scrim" type="button" aria-label="Close navigation" onClick={close}/>}
    <MobileWorkspaceExplorer role={user.role} mode={manageMode} open={explorerOpen} close={closeExplorer} panelRef={explorerRef}/>
    <section ref={workspaceRef} className="nk-admin-workspace">
      <header className="nk-admin-topbar"><button ref={mobileTriggerRef} className="nk-admin-menu-trigger" type="button" onClick={() => setMobileOpen(true)} aria-label="Open admin navigation" aria-expanded={mobileOpen} aria-controls="admin-navigation"><Menu/></button><nav aria-label="Breadcrumb"><NavLink to="/admin/dashboard">Admin</NavLink><ChevronRight/><span>{currentGroup}</span><ChevronRight/><b>{currentLabel}</b></nav><div className="nk-admin-topbar-actions"><button className="nk-admin-topbar-guide" type="button" onClick={openGuide} aria-label="Open Guide / Οδηγός"><HelpCircle/><span className="nk-admin-guide-label-full">Guide / Οδηγός</span><span className="nk-admin-guide-label-compact">Guide</span></button><button ref={commandTriggerRef} className="nk-admin-global-search" type="button" aria-label="Search admin" onClick={() => setCommandOpen(true)}><Search/><span>Search</span><kbd>Ctrl K</kbd></button><NavLink className="nk-admin-site-edit-link" to="/?liveEdit=1" aria-label="Visit the live site in edit mode"><span>Visit site</span><ExternalLink/></NavLink>{isPagesAdminMode ? <span className="nk-admin-topbar-avatar" aria-label="Mobile device admin">{user.displayName.split(/\s+/).slice(0,2).map(part => part[0]).join('').toUpperCase()}</span> : <NavLink className="nk-admin-topbar-avatar" to="/admin/profile" aria-label="Open your profile">{user.displayName.split(/\s+/).slice(0,2).map(part => part[0]).join('').toUpperCase()}</NavLink>}</div></header>
      <main id="admin-main" className={visualEditorRoute ? 'nk-admin-main--visual-editor' : undefined} tabIndex={-1}><div className={`nk-admin-security-line ${isPagesAdminMode ? 'nk-admin-security-line--device' : ''}`}><ShieldCheck/><span>{isPagesAdminMode ? 'Firebase-authenticated workspace' : 'Secure workspace'}</span><i/>{isPagesAdminMode ? 'Changes are saved in this browser on this device' : 'Changes are recorded in the audit log'}</div><Outlet/></main>
      {quickAddOpen && <><button type="button" className="nk-admin-quick-add-scrim" aria-label="Close add menu" onClick={() => setQuickAddOpen(false)}/><section className="nk-admin-quick-add" aria-label="Add content"><header><div><Plus/><span><b>Add something new</b><small>Choose one type to continue</small></span></div><button type="button" onClick={() => setQuickAddOpen(false)} aria-label="Close add menu"><X/></button></header><div>{canWriteKind(user.role, 'page') && <Link to="/admin/pages?new=1" onClick={() => setQuickAddOpen(false)}><FileText/><span><b>Page</b><small>Add a website page</small></span></Link>}{canWriteKind(user.role, 'product') && <Link to="/admin/products?new=1" onClick={() => setQuickAddOpen(false)}><ShoppingBag/><span><b>Product</b><small>Add to the shop catalogue</small></span></Link>}{canWriteKind(user.role, 'service') && <Link to="/admin/services?new=1" onClick={() => setQuickAddOpen(false)}><BriefcaseBusiness/><span><b>Service</b><small>Add a customer service</small></span></Link>}{canWriteKind(user.role, 'project') && <Link to="/admin/projects?new=1" onClick={() => setQuickAddOpen(false)}><FolderKanban/><span><b>Project</b><small>Add completed work</small></span></Link>}{canWriteKind(user.role, 'catalogue') && <Link to="/admin/catalogues?new=1" onClick={() => setQuickAddOpen(false)}><BookOpen/><span><b>Catalogue</b><small>Add an official PDF</small></span></Link>}{canManageMedia(user.role) && <Link to="/admin/media?upload=1" onClick={() => setQuickAddOpen(false)}><Image/><span><b>Photos & files</b><small>Upload reusable media</small></span></Link>}</div></section></>}
    </section>
    <nav className="nk-admin-mobile-nav" aria-label={text('Mobile admin navigation', 'Κύρια πλοήγηση διαχείρισης')}>
      <NavLink to="/admin/dashboard" onClick={() => {closeCommand('dismiss'); close(); setExplorerOpen(false);}} className={({isActive}) => isActive ? 'active' : ''}><LayoutDashboard/><span>{text('Home', 'Αρχική')}</span></NavLink>
      <button ref={explorerTriggerRef} type="button" className={explorerOpen ? 'active' : ''} onClick={() => {closeCommand('dismiss'); setMobileOpen(false); setQuickAddOpen(false); setManageMode('edit'); setExplorerOpen(open => !open);}} aria-label={text(explorerOpen ? 'Close Manage' : 'Manage website content', explorerOpen ? 'Κλείσιμο διαχείρισης' : 'Διαχείριση περιεχομένου')} aria-expanded={explorerOpen} aria-controls="admin-workspace-map"><FileText/><span>{text('Manage', 'Διαχείριση')}</span></button>
      <button type="button" className="nk-admin-mobile-add" onClick={() => {closeCommand('dismiss'); setMobileOpen(false); setExplorerOpen(false); setQuickAddOpen(open => !open);}} aria-label={text('Add content', 'Προσθήκη περιεχομένου')} aria-expanded={quickAddOpen}><Plus/><span>{text('Add', 'Προσθήκη')}</span></button>
      <button ref={mobileNavTriggerRef} type="button" className="nk-admin-mobile-more" onClick={() => {closeCommand('dismiss'); setExplorerOpen(false); mobileOpen ? close() : setMobileOpen(true);}} aria-label={text(mobileOpen ? 'Close help' : 'Open help and account', mobileOpen ? 'Κλείσιμο βοήθειας' : 'Άνοιγμα βοήθειας και λογαριασμού')} aria-expanded={mobileOpen} aria-controls="admin-navigation"><HelpCircle/><span>{text('Help', 'Βοήθεια')}</span></button>
    </nav>
    <CommandPalette open={commandOpen} onClose={closeCommand} role={user.role} fallbackFocusRef={commandTriggerRef} guided={false}/>
    <BeginnerSiteGuide open={guideOpen && !commandOpen} onClose={closeGuide} onNavigate={to => navigate(to)}/>
  </div>;
}
