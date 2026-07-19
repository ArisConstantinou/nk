import {useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent} from 'react';
import {Activity, BookOpen, Boxes, BriefcaseBusiness, Building2, ChevronRight, ClipboardList, Clapperboard, ExternalLink, FileInput, FileText, FolderKanban, HelpCircle, Image, Languages, LayoutDashboard, LogOut, Menu, Package, Search, Settings, ShieldCheck, ShoppingBag, UserRound, Users, X} from 'lucide-react';
import {NavLink, Outlet as RouterOutlet, useLocation, useNavigate} from 'react-router-dom';
import {useAdminAuth} from '../auth/AdminAuth';
import {canManageEnquiries, canManageInteractive, canManageUsers, canReadForms, canReadKind, canReadMedia} from '../permissions';
import {CommandPalette} from './CommandPalette';
import {BeginnerSiteGuide} from './BeginnerSiteGuide';
import {publicAsset} from '../../utils/assets';
import {isPagesAdminMode} from '../pagesMode';
import {AdminTranslationLayer, useAdminLanguage} from '../i18n/AdminLanguage';
import {AdminLearningPanel, learningForPath, learningText} from '../learning/AdminLearningPanel';

const overview = [
  {to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard},
  {to: '/admin/pages', label: 'Website Editor', icon: Boxes},
] as const;

const content = [
  {to: '/admin/site-pages', label: 'Pages & Navigation', icon: FileText},
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
  {to: '/admin/seo', label: 'SEO', icon: Search},
] as const;

function Outlet() {
  return <><AdminLearningPanel/><RouterOutlet/></>;
}

function NavItem({to, label, icon: Icon, close}: {to: string; label: string; icon: typeof Package; close: () => void}) {
  const {language} = useAdminLanguage();
  const learning = learningForPath(to);
  const localizedLabel = learningText(learning.label, language) || label;
  return <NavLink to={to} onClick={close} title={learningText(learning.purpose, language)} data-admin-tour={to} className={({isActive}) => isActive ? 'active' : ''}><Icon/><span>{localizedLabel}</span><ChevronRight/></NavLink>;
}

export function AdminLayout() {
  const {user, logout} = useAdminAuth();
  const {language, setLanguage, text} = useAdminLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const sidebarNavRef = useRef<HTMLElement>(null);
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
  const currentLabel = useMemo(() => learningText(learningForPath(location.pathname).label, language), [language, location.pathname]);
  const currentGroup = location.pathname.includes('dashboard') || location.pathname === '/admin/pages' ? text('Overview', 'Επισκόπηση') : location.pathname.includes('products') || location.pathname.includes('catalogues') ? text('Shop', 'Κατάστημα') : location.pathname.includes('media') ? text('Media', 'Πολυμέσα') : location.pathname.includes('forms') || location.pathname.includes('enquiries') ? text('Customers', 'Πελάτες') : location.pathname.includes('users') || location.pathname.includes('audit') ? text('Administration', 'Διαχείριση') : location.pathname.includes('navigation') || location.pathname.includes('settings') || location.pathname.includes('seo') ? text('Settings', 'Ρυθμίσεις') : text('Content', 'Περιεχόμενο');
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
      <div className="nk-admin-logo"><img src={publicAsset('assets/nk-logo-transparent-v2.png')} alt=""/><div><b>NK Electrical</b><small>Administration</small></div><button type="button" onClick={close} aria-label="Close admin navigation"><X/></button></div>
      <button className="nk-admin-sidebar-search" type="button" onClick={openCommand} data-admin-tour="search"><Search/><span>Search admin</span><kbd>Ctrl K</kbd></button>
      <nav ref={sidebarNavRef} aria-label="Admin navigation">
        <NavItem {...overview[0]} close={close}/>
        {canReadKind(user.role, 'page') && <NavItem {...overview[1]} close={close}/>}

        {(canReadKind(user.role, 'service') || canReadKind(user.role, 'project') || canReadKind(user.role, 'company')) && <small data-admin-tour="group-content">{text('CONTENT', 'ΠΕΡΙΕΧΟΜΕΝΟ')}</small>}
        {content.filter(item => canReadKind(user.role, item.to === '/admin/site-pages' ? 'page' : item.to === '/admin/services' ? 'service' : item.to === '/admin/projects' ? 'project' : 'company')).map(item => <NavItem {...item} close={close} key={item.to}/>)}

        {(canReadKind(user.role, 'product') || canReadKind(user.role, 'catalogue')) && <small>{text('SHOP', 'ΚΑΤΑΣΤΗΜΑ')}</small>}
        {shop.filter(item => canReadKind(user.role, item.to === '/admin/products' ? 'product' : 'catalogue')).map(item => <NavItem {...item} close={close} key={item.to}/>)}

        {(canReadForms(user.role) || canManageEnquiries(user.role)) && <small data-admin-tour="group-operations">{text('CUSTOMERS', 'ΠΕΛΑΤΕΣ')}</small>}
        {canReadForms(user.role) && <NavItem to="/admin/forms" label="Form Submissions" icon={FileInput} close={close}/>}
        {canManageEnquiries(user.role) && <NavItem to="/admin/enquiries" label="Enquiries" icon={ClipboardList} close={close}/>}

        {canReadMedia(user.role) && <NavItem to="/admin/media" label="Media" icon={Image} close={close}/>}
        {canManageInteractive(user.role) && <NavItem to="/admin/interactive" label="Interactive Studio" icon={Clapperboard} close={close}/>}

        {(canReadKind(user.role, 'settings') || canReadKind(user.role, 'seo')) && <small data-admin-tour="group-system">{text('SETTINGS', 'ΡΥΘΜΙΣΕΙΣ')}</small>}
        {settings.filter(item => canReadKind(user.role, item.to === '/admin/seo' ? 'seo' : 'settings')).map(item => <NavItem {...item} close={close} key={item.to}/>)}

        <small>{text('ADMINISTRATION', 'ΔΙΑΧΕΙΡΙΣΗ')}</small>
        {!isPagesAdminMode && canManageUsers(user.role) && <NavItem to="/admin/users" label="Users" icon={Users} close={close}/>}
        <NavItem to="/admin/audit" label={user.role === 'owner' ? 'Audit Log' : 'My Activity'} icon={Activity} close={close}/>
      </nav>
      <div className="nk-admin-sidebar-language" role="group" aria-label={text('Admin language', 'Γλώσσα διαχείρισης')}><Languages/><span>{text('Language', 'Γλώσσα')}</span><button type="button" className={language === 'en' ? 'active' : ''} onClick={() => setLanguage('en')} aria-pressed={language === 'en'}>EN</button><button type="button" className={language === 'el' ? 'active' : ''} onClick={() => setLanguage('el')} aria-pressed={language === 'el'}>ΕΛ</button></div>
      <button className="nk-admin-guide-trigger" type="button" onClick={openGuide} data-admin-tour="guide"><HelpCircle/><span>Guide / Οδηγός</span></button>
      <div className="nk-admin-sidebar-user">{isPagesAdminMode ? <><div className="nk-admin-device-user"><UserRound/><span><b>{user.displayName}</b><small>Firebase · {user.email}</small></span></div><button type="button" onClick={() => void signOut()} data-admin-tour="signout"><LogOut/>Sign out</button></> : <><NavLink to="/admin/profile" onClick={close} data-admin-tour="profile"><UserRound/><span><b>{user.displayName}</b><small>{user.role} · {user.email}</small></span></NavLink><button type="button" onClick={() => void signOut()} data-admin-tour="signout"><LogOut/>Sign out</button></>}</div>
    </aside>
    {mobileOpen && <button className="nk-admin-scrim" type="button" aria-label="Close navigation" onClick={close}/>}
    <section ref={workspaceRef} className="nk-admin-workspace">
      <header className="nk-admin-topbar"><button ref={mobileTriggerRef} className="nk-admin-menu-trigger" type="button" onClick={() => setMobileOpen(true)} aria-label="Open admin navigation" aria-expanded={mobileOpen} aria-controls="admin-navigation"><Menu/></button><nav aria-label="Breadcrumb"><NavLink to="/admin/dashboard">Admin</NavLink><ChevronRight/><span>{currentGroup}</span><ChevronRight/><b>{currentLabel}</b></nav><div className="nk-admin-topbar-actions"><button className="nk-admin-topbar-guide" type="button" onClick={openGuide} aria-label="Open Guide / Οδηγός"><HelpCircle/><span className="nk-admin-guide-label-full">Guide / Οδηγός</span><span className="nk-admin-guide-label-compact">Guide</span></button><button ref={commandTriggerRef} className="nk-admin-global-search" type="button" aria-label="Search admin" onClick={() => setCommandOpen(true)}><Search/><span>Search</span><kbd>Ctrl K</kbd></button><NavLink className="nk-admin-site-edit-link" to="/?liveEdit=1" aria-label="Visit the live site in edit mode"><span>Visit site</span><ExternalLink/></NavLink>{isPagesAdminMode ? <span className="nk-admin-topbar-avatar" aria-label="Mobile device admin">{user.displayName.split(/\s+/).slice(0,2).map(part => part[0]).join('').toUpperCase()}</span> : <NavLink className="nk-admin-topbar-avatar" to="/admin/profile" aria-label="Open your profile">{user.displayName.split(/\s+/).slice(0,2).map(part => part[0]).join('').toUpperCase()}</NavLink>}</div></header>
      <main id="admin-main" tabIndex={-1}><div className={`nk-admin-security-line ${isPagesAdminMode ? 'nk-admin-security-line--device' : ''}`}><ShieldCheck/><span>{isPagesAdminMode ? 'Firebase-authenticated workspace' : 'Secure workspace'}</span><i/>{isPagesAdminMode ? 'Changes are saved in this browser on this device' : 'Changes are recorded in the audit log'}</div><Outlet/></main>
      <nav className="nk-admin-mobile-nav" aria-label={text('Mobile admin navigation', 'Κύρια πλοήγηση διαχείρισης')}>
        <NavLink to="/admin/dashboard" className={({isActive}) => isActive ? 'active' : ''}><LayoutDashboard/><span>{text('Home', 'Αρχική')}</span></NavLink>
        {canReadKind(user.role, 'page') && <NavLink to="/admin/pages" className={({isActive}) => isActive ? 'active' : ''}><Boxes/><span>{text('Website', 'Ιστότοπος')}</span></NavLink>}
        {canManageInteractive(user.role) && <NavLink to="/admin/interactive" className={({isActive}) => isActive ? 'active' : ''}><Clapperboard/><span>Studio</span></NavLink>}
        <button type="button" onClick={() => setMobileOpen(true)} aria-label={text('Open all admin areas', 'Άνοιγμα όλων των περιοχών')} aria-expanded={mobileOpen} aria-controls="admin-navigation"><Menu/><span>{text('More', 'Περισσότερα')}</span></button>
      </nav>
    </section>
    <CommandPalette open={commandOpen} onClose={closeCommand} role={user.role} fallbackFocusRef={commandTriggerRef} guided={false}/>
    <BeginnerSiteGuide open={guideOpen && !commandOpen} onClose={closeGuide} onNavigate={to => navigate(to)}/>
  </div>;
}
