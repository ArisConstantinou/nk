import {useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent} from 'react';
import {Activity, BookOpen, BriefcaseBusiness, Building2, ChevronRight, ClipboardList, Clapperboard, ExternalLink, FileInput, FileText, FolderKanban, HelpCircle, Image, Languages, LayoutDashboard, LogOut, Menu, Package, Plus, Search, Settings, ShieldCheck, ShoppingBag, UserRound, Users, X} from 'lucide-react';
import {Link, NavLink, Outlet as RouterOutlet, useLocation, useNavigate} from 'react-router-dom';
import {useAdminAuth} from '../auth/AdminAuth';
import {canManageEnquiries, canManageInteractive, canManageUsers, canReadForms, canReadKind, canReadMedia, canWriteKind} from '../permissions';
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

export function AdminLayout() {
  const {user, logout} = useAdminAuth();
  const {language, setLanguage, text} = useAdminLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const sidebarNavRef = useRef<HTMLElement>(null);
  const workspaceRef = useRef<HTMLElement>(null);
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);
  const mobileNavTriggerRef = useRef<HTMLButtonElement>(null);
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
    if (shouldRestoreFocus) window.setTimeout(() => mobileNavTriggerRef.current?.focus(), 0);
  };
  const openCommand = () => {close(); setCommandOpen(true);};
  const signOut = async () => { await logout(); navigate('/admin/login', {replace: true}); };
  const currentLabel = useMemo(() => learningText(learningForPath(location.pathname).label, language), [language, location.pathname]);
  const currentGroup = location.pathname.includes('dashboard') ? text('Home', 'Αρχική') : location.pathname.includes('users') || location.pathname.includes('audit') || location.pathname.includes('settings') || location.pathname.includes('seo') ? text('Advanced', 'Προηγμένα') : text('Content', 'Περιεχόμενο');
  const visualEditorRoute = location.pathname.endsWith('/editor');
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {event.preventDefault(); setMobileOpen(false); setCommandOpen(true);}
      if (event.key === 'Escape') {
        if (commandOpen) {closeCommand('dismiss'); return;}
        if (mobileOpen) window.setTimeout(() => mobileNavTriggerRef.current?.focus(), 0);
        if (quickAddOpen) setQuickAddOpen(false);
        setMobileOpen(false);
        if (guideOpen) closeGuide();
      }
    };
    const openSearch = () => {setMobileOpen(false); setCommandOpen(true);};
    window.addEventListener('keydown', shortcut);
    window.addEventListener('nk-admin:open-search', openSearch);
    return () => {window.removeEventListener('keydown', shortcut); window.removeEventListener('nk-admin:open-search', openSearch);};
  }, [closeCommand, closeGuide, commandOpen, guideOpen, mobileOpen, quickAddOpen]);
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
    if (workspaceRef.current) workspaceRef.current.inert = mobileOpen || commandOpen;
  }, [commandOpen, guideOpen, mobileOpen]);
  useEffect(() => {
    if (sidebarNavRef.current) sidebarNavRef.current.scrollTop = 0;
  }, [location.pathname, mobileOpen]);
  useEffect(() => {
    document.title = `${currentLabel} — NK Electrical Admin`;
  }, [currentLabel]);
  if (!user) return null;

  return <div className="nk-admin-shell">
    <AdminTranslationLayer/>
    <a className="nk-admin-skip" href="#admin-main">{text('Skip to main content', 'Μετάβαση στο κύριο περιεχόμενο')}</a>
    <aside ref={sidebarRef} id="admin-navigation" className={`nk-admin-sidebar ${mobileOpen ? 'open' : ''}`}>
      <div className="nk-admin-logo"><img src={publicAsset('assets/nk-logo-transparent-v2.png')} alt=""/><span className="nk-admin-logo-wordmark">ELECTRICAL</span><div><b><span className="nk-admin-logo__desktop-title">NK Electrical</span><span className="nk-admin-logo__mobile-title">{text('All admin areas', 'Όλες οι περιοχές')}</span></b><small>Administration</small></div><button type="button" onClick={close} aria-label="Close admin navigation"><X/></button></div>
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
    </aside>
    {mobileOpen && <button className="nk-admin-scrim" type="button" aria-label="Close navigation" onClick={close}/>}
    <section ref={workspaceRef} className="nk-admin-workspace">
      <header className="nk-admin-topbar"><button ref={mobileTriggerRef} className="nk-admin-menu-trigger" type="button" onClick={() => setMobileOpen(true)} aria-label="Open admin navigation" aria-expanded={mobileOpen} aria-controls="admin-navigation"><Menu/></button><nav aria-label="Breadcrumb"><NavLink to="/admin/dashboard">Admin</NavLink><ChevronRight/><span>{currentGroup}</span><ChevronRight/><b>{currentLabel}</b></nav><div className="nk-admin-topbar-actions"><button className="nk-admin-topbar-guide" type="button" onClick={openGuide} aria-label="Open Guide / Οδηγός"><HelpCircle/><span className="nk-admin-guide-label-full">Guide / Οδηγός</span><span className="nk-admin-guide-label-compact">Guide</span></button><button ref={commandTriggerRef} className="nk-admin-global-search" type="button" aria-label="Search admin" onClick={() => setCommandOpen(true)}><Search/><span>Search</span><kbd>Ctrl K</kbd></button><NavLink className="nk-admin-site-edit-link" to="/?liveEdit=1" aria-label="Visit the live site in edit mode"><span>Visit site</span><ExternalLink/></NavLink>{isPagesAdminMode ? <span className="nk-admin-topbar-avatar" aria-label="Mobile device admin">{user.displayName.split(/\s+/).slice(0,2).map(part => part[0]).join('').toUpperCase()}</span> : <NavLink className="nk-admin-topbar-avatar" to="/admin/profile" aria-label="Open your profile">{user.displayName.split(/\s+/).slice(0,2).map(part => part[0]).join('').toUpperCase()}</NavLink>}</div></header>
      <main id="admin-main" className={visualEditorRoute ? 'nk-admin-main--visual-editor' : undefined} tabIndex={-1}><div className={`nk-admin-security-line ${isPagesAdminMode ? 'nk-admin-security-line--device' : ''}`}><ShieldCheck/><span>{isPagesAdminMode ? 'Firebase-authenticated workspace' : 'Secure workspace'}</span><i/>{isPagesAdminMode ? 'Changes are saved in this browser on this device' : 'Changes are recorded in the audit log'}</div><Outlet/></main>
      {quickAddOpen && <><button type="button" className="nk-admin-quick-add-scrim" aria-label="Close add menu" onClick={() => setQuickAddOpen(false)}/><section className="nk-admin-quick-add" aria-label="Add content"><header><div><Plus/><span><b>Add content</b><small>Choose what you want to create</small></span></div><button type="button" onClick={() => setQuickAddOpen(false)} aria-label="Close add menu"><X/></button></header><div>{canWriteKind(user.role, 'page') && <Link to="/admin/pages?new=1" onClick={() => setQuickAddOpen(false)}><FileText/><span><b>New page</b><small>Add a website page</small></span></Link>}{canWriteKind(user.role, 'product') && <Link to="/admin/products?new=1" onClick={() => setQuickAddOpen(false)}><ShoppingBag/><span><b>New product</b><small>Add to the shop catalogue</small></span></Link>}{canWriteKind(user.role, 'service') && <Link to="/admin/services?new=1" onClick={() => setQuickAddOpen(false)}><BriefcaseBusiness/><span><b>New service</b><small>Add a customer service</small></span></Link>}{canWriteKind(user.role, 'project') && <Link to="/admin/projects?new=1" onClick={() => setQuickAddOpen(false)}><FolderKanban/><span><b>New project</b><small>Add completed work</small></span></Link>}</div></section></>}
    </section>
    <nav className="nk-admin-mobile-nav" aria-label={text('Mobile admin navigation', 'Κύρια πλοήγηση διαχείρισης')}>
      <NavLink to="/admin/dashboard" onClick={close} className={({isActive}) => isActive ? 'active' : ''}><LayoutDashboard/><span>{text('Home', 'Αρχική')}</span></NavLink>
      {canReadKind(user.role, 'page') && <NavLink to="/admin/pages" onClick={close} className={({isActive}) => isActive ? 'active' : ''}><FileText/><span>{text('Pages', 'Σελίδες')}</span></NavLink>}
      <button type="button" className="nk-admin-mobile-add" onClick={() => {setMobileOpen(false); setQuickAddOpen(open => !open);}} aria-label={text('Add content', 'Προσθήκη περιεχομένου')} aria-expanded={quickAddOpen}><Plus/><span>{text('Add', 'Προσθήκη')}</span></button>
      {canReadKind(user.role, 'product') && <NavLink to="/admin/products" onClick={close} className={({isActive}) => isActive ? 'active' : ''}><ShoppingBag/><span>{text('Products', 'Προϊόντα')}</span></NavLink>}
      <button ref={mobileNavTriggerRef} type="button" className="nk-admin-mobile-more" onClick={() => mobileOpen ? close() : setMobileOpen(true)} aria-label={text(mobileOpen ? 'Close all admin areas' : 'Open all admin areas', mobileOpen ? 'Κλείσιμο όλων των περιοχών' : 'Άνοιγμα όλων των περιοχών')} aria-expanded={mobileOpen} aria-controls="admin-navigation"><Menu/><span>{text('More', 'Περισσότερα')}</span></button>
    </nav>
    <CommandPalette open={commandOpen} onClose={closeCommand} role={user.role} fallbackFocusRef={commandTriggerRef} guided={false}/>
    <BeginnerSiteGuide open={guideOpen && !commandOpen} onClose={closeGuide} onNavigate={to => navigate(to)}/>
  </div>;
}
