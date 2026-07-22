import {useEffect, useRef, useState, type CSSProperties, type ReactNode} from 'react';
import {ArrowRight, ChevronDown, CircuitBoard, FileText, Mail, MapPin, Menu, Monitor, Moon, Phone, Search, Sparkles, Sun, X, Zap} from 'lucide-react';
import {Link, NavLink, useLocation} from 'react-router-dom';
import {useContent, type PublicNavigationItem, type SiteSocialLink} from '../context/ContentContext';
import {serviceLinks, shopLinks} from '../navigation';
import {publicAsset} from '../utils/assets';
import {SeoRouteMeta} from './SeoRouteMeta';
import {ResponsiveImage} from './ResponsiveImage';
import {BrandEnergyMark} from './BrandEnergyMark';
import {LiveSiteEditButton} from './LiveSiteEditButton';
import {HomeHeaderPreview} from './HomeHeaderPreview';
import {GlobalLiveSearch} from './GlobalLiveSearch';
import {applyTheme, getThemePreference, saveThemePreference, themeChangeEvent, watchSystemTheme, type ThemePreference} from '../theme';
import {pageVisualForPath} from '../pageVisuals';
import {routeInteractionForPath} from '../routeInteractions';

type MegaSection = 'services' | 'shop' | null;
type MegaOpenMode = 'hover' | 'click' | null;
type LinkItem = {label: string; description?: string; to?: string; url?: string};

const isInternalUrl = (url: string) => url.startsWith('/') && !url.startsWith('//');
const storedDesktopStoryVisibility = () => window.localStorage.getItem('nk-desktop-header-story-open') === 'true';

const routeLinkAttributes = (to: string) => {
  if (!isInternalUrl(to)) return {};
  const profile = routeInteractionForPath(to);
  return {
    'data-route-profile': profile.id,
    'data-route-motion': profile.motion,
    'data-route-path': to,
  };
};

const navigationPanelMedia = {
  services: {
    image: 'assets/generated/navigation-tabs/services-v2.webp',
    detail: 'Design · Install · Test',
  },
  shop: {
    image: 'assets/generated/navigation-tabs/shop-v2.webp',
    detail: 'Lighting · Controls · Supply',
  },
  projects: {
    image: 'assets/generated/navigation-tabs/projects.webp',
    detail: 'Built · Tested · Delivered',
  },
  about: {
    image: 'assets/generated/navigation-tabs/about-v2.webp',
    detail: 'Experience · Standards · Craft',
  },
  contact: {
    image: 'assets/generated/navigation-tabs/contact.webp',
    detail: 'Enquire · Plan · Visit',
  },
} as const;

const navigationPanelForPath = (to: string) => {
  const segment = to.split('/').filter(Boolean)[0] as keyof typeof navigationPanelMedia | undefined;
  return segment ? navigationPanelMedia[segment] : undefined;
};

const headerStatusForPath = (path: string) => {
  if (path === '/') return 'NEW BUILD / RENOVATION';
  if (path.startsWith('/services/electrical-installations')) return 'INSTALLATIONS / SCROLL STORY';
  if (path.startsWith('/services')) return 'SERVICES / EXPERTISE';
  if (path.startsWith('/shop')) return 'SHOP / PRODUCTS';
  if (path.startsWith('/projects')) return 'PROJECTS / BUILT PROOF';
  if (path.startsWith('/about')) return 'ABOUT / SINCE 1985';
  if (path.startsWith('/contact')) return 'CONTACT / NICOSIA';
  if (path.startsWith('/request-a-quote')) return 'PROJECT / START A BRIEF';
  return 'NK ELECTRICAL / CYPRUS';
};

function NavigationPanelContent({to, label, hasMenu = false}: {to: string; label: string; hasMenu?: boolean}) {
  const media = navigationPanelForPath(to);
  const panelKey = to.split('/').filter(Boolean)[0];

  return <>
    {media && <span className="ia-nav-panel__media" data-nav-panel={panelKey} aria-hidden="true">
      <img src={publicAsset(media.image)} alt=""/>
    </span>}
    <span className="ia-nav-panel__shade" aria-hidden="true"/>
    <span className="ia-nav-panel__effect" aria-hidden="true"/>
    <span className="ia-nav-panel__copy">
      {media && <small>{media.detail}</small>}
      <strong>{label}</strong>
    </span>
    {hasMenu && <ChevronDown className="ia-nav-panel__chevron" aria-hidden="true"/>}
  </>;
}

function SmartLink({to, className, id, children}: {to: string; className?: string; id?: string; children: ReactNode}) {
  return isInternalUrl(to)
    ? <Link className={className} id={id} to={to} {...routeLinkAttributes(to)}>{children}</Link>
    : <a className={className} id={id} href={to} rel={to.startsWith('http') ? 'noreferrer' : undefined}>{children}</a>;
}

function PrimaryLink({to, children}: {to: string; children: ReactNode}) {
  return isInternalUrl(to)
    ? <NavLink to={to} {...routeLinkAttributes(to)}>{children}</NavLink>
    : <a href={to} rel={to.startsWith('http') ? 'noreferrer' : undefined}>{children}</a>;
}

function SocialIcon({link}: {link: SiteSocialLink}) {
  if (link.iconUrl) return <img src={link.iconUrl} alt=""/>;
  const icon = link.icon.toLowerCase();

  if (icon === 'facebook') return <svg className="ia-social-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13.7 22v-9h3l.45-3.5H13.7V7.26c0-1.01.28-1.7 1.73-1.7h1.85V2.43c-.32-.04-1.42-.14-2.7-.14-2.67 0-4.5 1.63-4.5 4.63V9.5H7.05V13h3.03v9h3.62Z"/></svg>;
  if (icon === 'instagram') return <svg className="ia-social-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2"/><circle cx="17.5" cy="6.5" r="1.15" fill="currentColor"/></svg>;
  if (icon === 'linkedin') return <svg className="ia-social-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6.5 8.2H3.2V21h3.3V8.2ZM4.85 3A1.9 1.9 0 1 0 4.84 6.8 1.9 1.9 0 0 0 4.85 3ZM21 13.65c0-3.86-2.06-5.65-4.82-5.65-2.22 0-3.22 1.22-3.77 2.08V8.2H9.1V21h3.31v-6.34c0-1.67.32-3.3 2.4-3.3 2.05 0 2.08 1.92 2.08 3.41V21H21v-7.35Z"/></svg>;

  return <svg className="ia-social-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5h5v5m0-5-9 9m7 0v5H5V7h5"/></svg>;
}

function SocialLinks({links, placement, className}: {links: SiteSocialLink[]; placement: SiteSocialLink['placements'][number]; className?: string}) {
  const shown = links.filter(link => link.active && link.placements.includes(placement));
  if (!shown.length) return null;
  return <div className={className || 'ia-social-links'}>{shown.map(link => <a href={link.url} target={link.newTab ? '_blank' : undefined} rel={link.newTab ? 'noreferrer' : undefined} aria-label={link.platform} data-platform={link.platform} key={link.id}><SocialIcon link={link}/></a>)}</div>;
}

const themeOptions = [
  {value: 'system', label: 'System', Icon: Monitor},
  {value: 'light', label: 'Light', Icon: Sun},
  {value: 'dark', label: 'Dark', Icon: Moon},
] satisfies {value: ThemePreference; label: string; Icon: typeof Monitor}[];

function ThemeSwitcher({className = ''}: {className?: string}) {
  const [preference, setPreference] = useState<ThemePreference>(() => getThemePreference());
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const active = themeOptions.find(option => option.value === preference) || themeOptions[0];
  const ActiveIcon = active.Icon;

  useEffect(() => {
    const syncPreference = () => setPreference(getThemePreference());
    window.addEventListener(themeChangeEvent, syncPreference);
    return () => window.removeEventListener(themeChangeEvent, syncPreference);
  }, []);

  useEffect(() => watchSystemTheme(() => {
    if (preference === 'system') applyTheme('system');
  }), [preference]);

  return <details className={`ia-theme-selector ${className}`.trim()} ref={detailsRef}>
    <summary aria-label={`Choose appearance. Current mode: ${active.label}`}>
      <ActiveIcon/><span>{active.label}</span><ChevronDown/>
    </summary>
    <div className="ia-theme-menu" role="group" aria-label="Website appearance">
      {themeOptions.map(({value, label, Icon}) => <button
        type="button"
        className={preference === value ? 'active' : ''}
        aria-pressed={preference === value}
        onClick={() => {
          setPreference(value);
          saveThemePreference(value);
          detailsRef.current?.removeAttribute('open');
        }}
        key={value}
      ><Icon/><span>{label}</span></button>)}
    </div>
  </details>;
}

export function ElectricalLayout({children}: {children: ReactNode}) {
  const {navigation, settings} = useContent();
  const [megaOpen, setMegaOpen] = useState<MegaSection>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopStoryOpen, setDesktopStoryOpen] = useState(storedDesktopStoryVisibility);
  const [searchOpen, setSearchOpen] = useState(false);
  const [isDesktopViewport, setIsDesktopViewport] = useState(() => window.matchMedia('(min-width: 901px)').matches);
  const [searchAnchor, setSearchAnchor] = useState({left: 0, width: 0});
  const [menuAnchor, setMenuAnchor] = useState({left: 0, width: 0});
  const [mobileSection, setMobileSection] = useState<MegaSection>('services');
  const headerRef = useRef<HTMLElement>(null);
  const mobileNavRef = useRef<HTMLElement>(null);
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);
  const searchTriggerRef = useRef<HTMLButtonElement>(null);
  const searchDialogRef = useRef<HTMLElement>(null);
  const megaOpenModeRef = useRef<MegaOpenMode>(null);
  const megaOpenTimerRef = useRef<number | null>(null);
  const megaCloseTimerRef = useRef<number | null>(null);
  const location = useLocation();
  const isHomeRoute = location.pathname === '/';
  const showHeaderStory = true;
  const useModernHeader = true;
  const headerStatus = headerStatusForPath(location.pathname);
  const pageVisual = pageVisualForPath(location.pathname);
  const interactionProfile = routeInteractionForPath(location.pathname);

  useEffect(() => {
    window.localStorage.setItem('nk-desktop-header-story-open', String(desktopStoryOpen));
  }, [desktopStoryOpen]);
  const menu = (name: PublicNavigationItem['menu']) => navigation.filter(item => item.menu === name && item.active).sort((a, b) => a.position - b.position);
  const linkTo = (item: LinkItem) => item.url || item.to || '/';
  const primary: LinkItem[] = menu('primary').length ? menu('primary') : [{label: 'Services', url: '/services'}, {label: 'Shop', url: '/shop'}, {label: 'Projects', url: '/projects'}, {label: 'About', url: '/about'}, {label: 'Contact', url: '/contact'}];
  const serviceMenu: LinkItem[] = menu('services').length ? menu('services') : [...serviceLinks];
  const managedShopMenu: LinkItem[] = menu('shop');
  const shopMenu: LinkItem[] = managedShopMenu.length ? [...managedShopMenu, ...shopLinks.filter(fallback => !managedShopMenu.some(item => linkTo(item) === fallback.to))] : [...shopLinks];
  const footerServices: LinkItem[] = menu('footer-services').length ? menu('footer-services') : serviceMenu;
  const managedFooterShop: LinkItem[] = menu('footer-shop');
  const footerShop: LinkItem[] = managedFooterShop.length ? [...managedFooterShop, ...shopLinks.filter(fallback => !managedFooterShop.some(item => linkTo(item) === fallback.to))] : shopMenu;
  const footerCompany: LinkItem[] = menu('footer-company').length ? menu('footer-company') : [{label: 'Projects', url: '/projects'}, {label: 'About', url: '/about'}, {label: 'Contact', url: '/contact'}, {label: 'Request a Quote', url: '/request-a-quote'}];
  const tel = settings.phone.replace(/[^+\d]/g, '');
  const railBrandLabel = settings.brandName.replace(/^NK(?:\s+|[-–—/|·:]*)/i, '').trim() || 'Electrical';

  const clearMegaTimers = () => {
    if (megaOpenTimerRef.current !== null) window.clearTimeout(megaOpenTimerRef.current);
    if (megaCloseTimerRef.current !== null) window.clearTimeout(megaCloseTimerRef.current);
    megaOpenTimerRef.current = null;
    megaCloseTimerRef.current = null;
  };

  const activeSearchTrigger = () => searchTriggerRef.current;

  const closeHeaderSearch = (restoreFocus = true) => {
    setSearchOpen(false);
    if (restoreFocus) window.requestAnimationFrame(() => activeSearchTrigger()?.focus());
  };

  const openHeaderSearch = () => {
    const triggerRect = activeSearchTrigger()?.getBoundingClientRect();
    if (triggerRect) setSearchAnchor({left: triggerRect.left, width: triggerRect.width});
    clearMegaTimers();
    megaOpenModeRef.current = null;
    setMegaOpen(null);
    setMobileOpen(false);
    setSearchOpen(true);
  };

  const toggleHeaderSearch = () => {
    if (searchOpen) {
      closeHeaderSearch(false);
      return;
    }
    openHeaderSearch();
  };

  const closeMobileNavigation = (restoreFocus = true) => {
    setMobileOpen(false);
    if (restoreFocus) window.requestAnimationFrame(() => mobileTriggerRef.current?.focus());
  };

  const openMobileNavigation = () => {
    const triggerRect = mobileTriggerRef.current?.getBoundingClientRect();
    if (triggerRect) setMenuAnchor({left: triggerRect.left, width: triggerRect.width});
    if (searchOpen) setSearchOpen(false);
    setMobileOpen(true);
  };

  const toggleMobileNavigation = () => {
    if (mobileOpen) {
      closeMobileNavigation(false);
      return;
    }
    openMobileNavigation();
  };

  const supportsMenuHover = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const openMegaOnHover = (section: Exclude<MegaSection, null>) => {
    if (!supportsMenuHover()) return;
    clearMegaTimers();
    megaOpenTimerRef.current = window.setTimeout(() => {
      megaOpenModeRef.current = 'hover';
      setMegaOpen(section);
      megaOpenTimerRef.current = null;
    }, 175);
  };

  const keepMegaOpenOnHover = () => {
    if (!supportsMenuHover() || megaCloseTimerRef.current === null) return;
    window.clearTimeout(megaCloseTimerRef.current);
    megaCloseTimerRef.current = null;
  };

  const closeMegaOnHover = () => {
    if (!supportsMenuHover()) return;
    if (megaOpenTimerRef.current !== null) {
      window.clearTimeout(megaOpenTimerRef.current);
      megaOpenTimerRef.current = null;
    }
    if (megaOpenModeRef.current !== 'hover') return;
    if (megaCloseTimerRef.current !== null) window.clearTimeout(megaCloseTimerRef.current);
    megaCloseTimerRef.current = window.setTimeout(() => {
      if (megaOpenModeRef.current === 'hover') {
        megaOpenModeRef.current = null;
        setMegaOpen(null);
      }
      megaCloseTimerRef.current = null;
    }, 275);
  };

  useEffect(() => {
    const desktopQuery = window.matchMedia('(min-width: 901px)');
    const syncViewport = () => setIsDesktopViewport(desktopQuery.matches);
    syncViewport();
    desktopQuery.addEventListener('change', syncViewport);
    return () => desktopQuery.removeEventListener('change', syncViewport);
  }, []);

  useEffect(() => {
    if (useModernHeader && isDesktopViewport) setSearchOpen(false);
  }, [isDesktopViewport, useModernHeader]);

  useEffect(() => {
    clearMegaTimers();
    megaOpenModeRef.current = null;
    setMegaOpen(null);
    setMobileOpen(false);
    setSearchOpen(false);
    window.scrollTo({top: 0, behavior: 'instant'});
  }, [location.pathname, location.search]);

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (searchOpen) {
        closeHeaderSearch();
        return;
      }
      clearMegaTimers();
      megaOpenModeRef.current = null;
      setMegaOpen(null);
      if (mobileOpen) {
        closeMobileNavigation();
      }
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [mobileOpen, searchOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.setTimeout(() => mobileNavRef.current?.querySelector<HTMLElement>('button, a')?.focus(), 0);
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !mobileNavRef.current || !mobileTriggerRef.current) return;
      const focusable = [mobileTriggerRef.current, ...mobileNavRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]')].filter(element => getComputedStyle(element).display !== 'none' && getComputedStyle(element).visibility !== 'hidden');
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {event.preventDefault(); last.focus();}
      else if (!event.shiftKey && document.activeElement === last) {event.preventDefault(); first.focus();}
    };
    document.addEventListener('keydown', trapFocus);
    return () => { document.removeEventListener('keydown', trapFocus); document.body.style.overflow = previous; };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const updateAnchor = () => {
      const triggerRect = mobileTriggerRef.current?.getBoundingClientRect();
      if (triggerRect) setMenuAnchor({left: triggerRect.left, width: triggerRect.width});
    };
    updateAnchor();
    window.addEventListener('resize', updateAnchor);
    window.addEventListener('orientationchange', updateAnchor);
    return () => {
      window.removeEventListener('resize', updateAnchor);
      window.removeEventListener('orientationchange', updateAnchor);
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    const previous = document.body.style.overflow;
    const locksViewport = !useModernHeader || !window.matchMedia('(min-width: 901px)').matches;
    if (locksViewport) document.body.style.overflow = 'hidden';
    const focusTimer = window.setTimeout(() => searchDialogRef.current?.querySelector<HTMLInputElement>('input')?.focus(), 0);
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !searchDialogRef.current) return;
      const focusable = [...searchDialogRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled)')]
        .filter(element => getComputedStyle(element).display !== 'none' && getComputedStyle(element).visibility !== 'hidden');
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {event.preventDefault(); last.focus();}
      else if (!event.shiftKey && document.activeElement === last) {event.preventDefault(); first.focus();}
    };
    document.addEventListener('keydown', trapFocus);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', trapFocus);
      if (locksViewport) document.body.style.overflow = previous;
    };
  }, [searchOpen, useModernHeader]);

  useEffect(() => {
    if (!searchOpen) return;
    const updateAnchor = () => {
      const triggerRect = activeSearchTrigger()?.getBoundingClientRect();
      if (triggerRect) setSearchAnchor({left: triggerRect.left, width: triggerRect.width});
    };
    updateAnchor();
    window.addEventListener('resize', updateAnchor);
    window.addEventListener('orientationchange', updateAnchor);
    return () => {
      window.removeEventListener('resize', updateAnchor);
      window.removeEventListener('orientationchange', updateAnchor);
    };
  }, [searchOpen]);

  useEffect(() => {
    if (!megaOpen) return;
    const close = (event: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        clearMegaTimers();
        megaOpenModeRef.current = null;
        setMegaOpen(null);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [megaOpen]);

  useEffect(() => () => clearMegaTimers(), []);

  const toggleMega = (section: Exclude<MegaSection, null>) => {
    clearMegaTimers();
    setMegaOpen(current => {
      if (current !== section) {
        megaOpenModeRef.current = 'click';
        return section;
      }
      if (megaOpenModeRef.current === 'hover') {
        megaOpenModeRef.current = 'click';
        return current;
      }
      megaOpenModeRef.current = null;
      return null;
    });
  };
  const toggleMobile = (section: Exclude<MegaSection, null>) => setMobileSection(current => current === section ? null : section);
  const interactionStyle = {
    '--route-accent': interactionProfile.accent,
    '--route-secondary': interactionProfile.secondary,
    '--route-deep': interactionProfile.deep,
  } as CSSProperties;

  return <div
    className="electrical-shell ia-shell"
    data-page-theme={pageVisual?.id}
    data-interaction-profile={interactionProfile.id}
    data-interaction-motion={interactionProfile.motion}
    style={interactionStyle}
  >
    <SeoRouteMeta/>
    <header className={`ia-header ${settings.header.sticky ? '' : 'ia-header--static'} ${useModernHeader ? 'ia-header--modern ia-header--home-preview' : ''} ${showHeaderStory ? 'ia-header--has-story' : 'ia-header--route-preview'}`} ref={headerRef}>
      {useModernHeader && <>
        <div className={`nk-home-topbar ${isHomeRoute ? '' : 'nk-home-topbar--route'} ${desktopStoryOpen ? 'is-highlights-open' : ''}`.trim()}>
          <Link className="nk-home-topbar__brand" to="/" {...routeLinkAttributes('/')} aria-label={`${settings.brandName} home`}>
            <ResponsiveImage src={settings.logoUrl || publicAsset('assets/nk-logo-transparent-v2.png')} alt="" aria-hidden="true" loading="eager" decoding="async" fetchPriority="high"/>
            <span><strong>{railBrandLabel}</strong><small>POWER · LIGHT · CONTROL</small></span>
          </Link>
          <div className="nk-home-topbar__search">
            {isDesktopViewport && <GlobalLiveSearch
              className="nk-home-topbar__live-search"
              lockPageScroll
              maxResults={10}
              labels={{input: 'Search products, images, catalogues and PDFs', placeholder: 'Search products, catalogues & PDFs'}}
            />}
          </div>
          {isHomeRoute
            ? <div className="nk-home-topbar__home-tools">
                <span className="nk-home-topbar__status"><Zap aria-hidden="true"/><span>{headerStatus}</span></span>
                <button className="nk-home-topbar__story-toggle" type="button" aria-label={desktopStoryOpen ? 'Hide highlights' : 'Show highlights'} aria-expanded={desktopStoryOpen} aria-controls="nk-desktop-header-story" onClick={() => setDesktopStoryOpen(open => !open)}><span>Highlights</span><ChevronDown aria-hidden="true"/></button>
              </div>
            : <div className="nk-home-topbar__route-tools">
                <span className="nk-home-topbar__status"><Zap aria-hidden="true"/><span>{headerStatus}</span></span>
                <ThemeSwitcher className="ia-theme-selector--header nk-modern-route-theme"/>
                <LiveSiteEditButton/>
                <button className="nk-home-topbar__story-toggle" type="button" aria-label={desktopStoryOpen ? 'Hide highlights' : 'Show highlights'} aria-expanded={desktopStoryOpen} aria-controls="nk-desktop-header-story" onClick={() => setDesktopStoryOpen(open => !open)}><span>Highlights</span><ChevronDown aria-hidden="true"/></button>
              </div>}
        </div>
        {showHeaderStory && <HomeHeaderPreview desktopStoryOpen={desktopStoryOpen}/>}
      </>}
      {!useModernHeader && <div className="ia-header-utility" aria-hidden={mobileOpen || undefined}>
        {settings.header.showTagline && <span data-visual-kind="settings" data-visual-slug="business-details" data-visual-path="brandTagline" data-visual-edit="text" data-visual-label="Brand tagline">{settings.brandTagline}</span>}
        <div>
          <a className="ia-header-phone" href={`tel:${tel}`} aria-label={`Call ${settings.brandName}`}><Phone/><span data-visual-kind="settings" data-visual-slug="business-details" data-visual-path="phone" data-visual-edit="text" data-visual-label="Phone number">{settings.phone}</span></a>
        </div>
      </div>}
      <div className="ia-header-bar">
        <Link className={`ia-brand ${useModernHeader ? 'ia-brand--home-preview ' : ''}${settings.header.showDinRail ? '' : 'ia-brand--no-rail'}`.trim()} to="/" {...routeLinkAttributes('/')} aria-label={`${settings.brandName} home`} aria-hidden={mobileOpen || undefined} tabIndex={mobileOpen ? -1 : undefined}>{settings.header.showDinRail && <span className="ia-brand-rail" aria-hidden="true"/>}<BrandEnergyMark src={settings.logoUrl || publicAsset('assets/nk-logo-transparent-v2.png')} alt={settings.logoAlt} showWires={settings.header.showBrandWires}/><span className="ia-brand-copy"><strong><span className="ia-brand-depth" aria-hidden="true">{railBrandLabel}</span><span className="ia-brand-face" data-visual-kind="settings" data-visual-slug="business-details" data-visual-path="brandName" data-visual-edit="text" data-visual-label="Brand name">{railBrandLabel}</span></strong></span></Link>
        <div className="ia-header-command-dock" role="group" aria-label="Search and navigation">
          <button
            className={`ia-header-command-trigger ia-header-search-trigger ${useModernHeader ? 'ia-header-search-trigger--home' : ''}`.trim()}
            ref={searchTriggerRef}
            type="button"
            aria-label="Search products, images, catalogues and PDFs"
            aria-haspopup="dialog"
            aria-controls="ia-header-search-panel"
            aria-expanded={searchOpen}
            onClick={toggleHeaderSearch}
          ><span>Search</span><Search aria-hidden="true"/></button>
          <button ref={mobileTriggerRef} className={`ia-header-command-trigger ia-mobile-trigger ${useModernHeader ? 'ia-mobile-trigger--home' : ''}`.trim()} type="button" aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={mobileOpen} aria-controls="mobile-navigation" onClick={toggleMobileNavigation}><span>Menu</span><Menu aria-hidden="true"/></button>
        </div>
        <nav className="ia-desktop-nav" aria-label="Primary navigation">{primary.map(item => linkTo(item) === '/services'
          ? <button key="services" type="button" data-route-profile="services" className={megaOpen === 'services' || location.pathname.startsWith('/services') ? 'active' : ''} aria-expanded={megaOpen === 'services'} aria-controls="services-mega-menu" onMouseEnter={() => openMegaOnHover('services')} onMouseLeave={closeMegaOnHover} onClick={() => toggleMega('services')}><NavigationPanelContent to="/services" label={item.label} hasMenu/></button>
          : linkTo(item) === '/shop'
            ? <button key="shop" type="button" data-route-profile="shop" className={megaOpen === 'shop' || location.pathname.startsWith('/shop') ? 'active' : ''} aria-expanded={megaOpen === 'shop'} aria-controls="shop-mega-menu" onMouseEnter={() => openMegaOnHover('shop')} onMouseLeave={closeMegaOnHover} onClick={() => toggleMega('shop')}><NavigationPanelContent to="/shop" label={item.label} hasMenu/></button>
            : <PrimaryLink to={linkTo(item)} key={`${item.label}-${linkTo(item)}`}><NavigationPanelContent to={linkTo(item)} label={item.label}/></PrimaryLink>)}</nav>
        {!useModernHeader && <div className="ia-header-actions">
          <SmartLink className="ia-quote-button" id="ia-primary-quote" to={settings.quoteUrl}><span data-visual-kind="settings" data-visual-slug="business-details" data-visual-path="quoteLabel" data-visual-edit="text" data-visual-label="Quote button" data-visual-link-path="quoteUrl">{settings.quoteLabel}</span><ArrowRight/></SmartLink>
          <ThemeSwitcher className="ia-theme-selector--header"/>
          <LiveSiteEditButton/>
        </div>}
      </div>
      {searchOpen && <div className="ia-header-search-layer" style={{'--ia-search-anchor-left': `${searchAnchor.left}px`, '--ia-search-anchor-width': `${searchAnchor.width}px`} as CSSProperties}>
        <button className="ia-header-search-backdrop" type="button" aria-label="Close search" onClick={() => closeHeaderSearch()}/>
        <section className="ia-header-search-dialog" id="ia-header-search-panel" ref={searchDialogRef} role="dialog" aria-modal="true" aria-labelledby="ia-header-search-title">
          <header>
            <div><Sparkles aria-hidden="true"/><span><small>LIVE PRODUCT FINDER</small><strong id="ia-header-search-title">Products & PDFs</strong></span></div>
            <button type="button" onClick={() => closeHeaderSearch()} aria-label="Close search"><span>Close</span><X aria-hidden="true"/></button>
          </header>
          <GlobalLiveSearch
            autoFocus
            className="ia-header-global-search"
            maxResults={10}
            onDismiss={() => closeHeaderSearch()}
            onNavigate={() => closeHeaderSearch(false)}
            labels={{input: 'Search products, images, catalogues and PDFs', placeholder: 'What are you looking for?'}}
          />
          <p>Type a product, category, brand or catalogue name. Results match while you type.</p>
        </section>
      </div>}
      {megaOpen && <div className={`ia-mega ia-mega--${megaOpen}`} id={`${megaOpen}-mega-menu`} onMouseEnter={keepMegaOpenOnHover} onMouseLeave={closeMegaOnHover}>
        <div className="ia-mega-heading"><span>{megaOpen === 'services' ? 'SERVICES / EXPERTISE' : 'SHOP / PRODUCTS'}</span><h2>{megaOpen === 'services' ? 'Work performed by our team.' : 'Products available through NK Electrical.'}</h2><p>{megaOpen === 'services' ? 'Planning, installation, integration and support. No product categories are mixed into this path.' : 'Lighting, appliances and official PDF catalogues. Service enquiries remain under Services.'}</p><SmartLink to={megaOpen === 'services' ? '/services' : '/shop'}><span>{megaOpen === 'services' ? 'View all services' : 'Browse all products'}</span><ArrowRight/></SmartLink></div>
        <nav aria-label={`${megaOpen === 'services' ? 'Services' : 'Shop'} menu`}>{(megaOpen === 'services' ? serviceMenu : shopMenu).map((item, index) => <SmartLink to={linkTo(item)} key={`${item.label}-${linkTo(item)}`}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{item.label}</strong><small>{item.description}</small></div><ArrowRight/></SmartLink>)}</nav>
        <aside>{megaOpen === 'services' ? <><CircuitBoard/><small>SERVICE PATH</small><strong>From survey to tested handover.</strong><p>Start with the requirement and the building. Equipment selection follows the scope.</p></> : <><FileText/><small>PRODUCT PATH</small><strong>Products, specifications and downloads.</strong><p>Find the item first, then ask about availability, supply or installation.</p></>}</aside>
      </div>}
      {mobileOpen && <div className="ia-mobile-menu-layer" style={{'--ia-menu-anchor-left': `${menuAnchor.left}px`, '--ia-menu-anchor-width': `${menuAnchor.width}px`} as CSSProperties}>
        <button className="ia-mobile-menu-backdrop" type="button" aria-label="Close navigation" onClick={() => closeMobileNavigation()}/>
        <section ref={mobileNavRef} className="ia-mobile-menu" id="mobile-navigation" role="dialog" aria-modal="true" aria-labelledby="ia-mobile-menu-title">
          <header className="ia-mobile-menu__header">
            <div><Menu aria-hidden="true"/><span><small>SITE NAVIGATION</small><strong id="ia-mobile-menu-title">Explore</strong></span></div>
            <button type="button" onClick={() => closeMobileNavigation()} aria-label="Close navigation"><span>Close</span><X aria-hidden="true"/></button>
          </header>
          <nav className="ia-mobile-menu__content" aria-label="Mobile navigation links">
            <div className="ia-mobile-accordion"><button type="button" aria-expanded={mobileSection === 'services'} aria-controls="mobile-services" onClick={() => toggleMobile('services')}><span>Services</span><ChevronDown/></button>{mobileSection === 'services' && <div id="mobile-services">{serviceMenu.map(item => <SmartLink to={linkTo(item)} key={`${item.label}-${linkTo(item)}`}><strong>{item.label}</strong><small>{item.description}</small><ArrowRight/></SmartLink>)}</div>}</div>
            <div className="ia-mobile-accordion"><button type="button" aria-expanded={mobileSection === 'shop'} aria-controls="mobile-shop" onClick={() => toggleMobile('shop')}><span>Shop</span><ChevronDown/></button>{mobileSection === 'shop' && <div id="mobile-shop">{shopMenu.map(item => <SmartLink to={linkTo(item)} key={`${item.label}-${linkTo(item)}`}><strong>{item.label}</strong><small>{item.description}</small><ArrowRight/></SmartLink>)}</div>}</div>
            {primary.filter(item => !['/services', '/shop'].includes(linkTo(item))).map(item => <SmartLink className="ia-mobile-primary" to={linkTo(item)} key={`${item.label}-${linkTo(item)}`}><span>{item.label}</span><ArrowRight/></SmartLink>)}
            <div className="ia-mobile-ctas"><a href={`tel:${tel}`}><Phone/><span>Call us</span></a><SmartLink to={settings.quoteUrl}><span>{settings.quoteLabel}</span><ArrowRight/></SmartLink></div>
            <SocialLinks links={settings.socialLinks} placement="mobile" className="ia-social-links ia-social-links--mobile"/>
          </nav>
        </section>
      </div>}
    </header>
    <SocialLinks links={settings.socialLinks} placement="footer" className="ia-social-links ia-social-links--dock"/>
    <div className="electrical-stage ia-stage" inert={mobileOpen || searchOpen || undefined} aria-hidden={mobileOpen || searchOpen || undefined}>
      <main className="electrical-main ia-main">{children}</main>
      <footer className="ia-footer">
        <div className="ia-footer-lead"><span data-visual-kind="settings" data-visual-slug="business-details" data-visual-path="footerEyebrow" data-visual-edit="text" data-visual-label="Footer eyebrow">{settings.footerEyebrow}</span><h2 data-visual-kind="settings" data-visual-slug="business-details" data-visual-path="footerTitle" data-visual-edit="text" data-visual-label="Footer heading" data-visual-multiline="true">{settings.footerTitle}</h2><SmartLink to={settings.quoteUrl}><span data-visual-kind="settings" data-visual-slug="business-details" data-visual-path="footerCtaLabel" data-visual-edit="text" data-visual-label="Footer button" data-visual-link-path="quoteUrl">{settings.footerCtaLabel}</span><ArrowRight/></SmartLink></div>
        <div className="ia-footer-grid">
          <div><b>Services</b>{footerServices.map(item => <SmartLink to={linkTo(item)} key={`${item.label}-${linkTo(item)}`}>{item.label}</SmartLink>)}</div>
          <div><b>Shop</b>{footerShop.map(item => <SmartLink to={linkTo(item)} key={`${item.label}-${linkTo(item)}`}>{item.label}</SmartLink>)}</div>
          <div><b>Company</b>{footerCompany.map(item => <SmartLink to={linkTo(item)} key={`${item.label}-${linkTo(item)}`}>{item.label}</SmartLink>)}</div>
          {settings.footer.showContact && <div><b>Contact</b><a href={settings.mapsUrl} target="_blank" rel="noreferrer"><MapPin/><span data-visual-kind="settings" data-visual-slug="business-details" data-visual-path="address" data-visual-edit="text" data-visual-label="Address" data-visual-link-path="mapsUrl">{settings.address}</span></a><a href={`tel:${tel}`}><Phone/><span data-visual-kind="settings" data-visual-slug="business-details" data-visual-path="phone" data-visual-edit="text" data-visual-label="Phone number">{settings.phone}</span></a><a href={`mailto:${settings.email}`}><Mail/><span data-visual-kind="settings" data-visual-slug="business-details" data-visual-path="email" data-visual-edit="text" data-visual-label="Email address">{settings.email}</span></a>{settings.footer.showHours && settings.openingHours.filter(item => item.active).slice(0, 1).map(item => <span className="ia-footer-hours" key={item.id}>{item.hours}</span>)}</div>}
        </div>
        {settings.footer.showSocials && <SocialLinks links={settings.socialLinks} placement="footer" className="ia-social-links ia-social-links--footer"/>}
        <div className="ia-footer-bottom"><span>© {new Date().getFullYear()} <span data-visual-kind="settings" data-visual-slug="business-details" data-visual-path="footerCopyright" data-visual-edit="text" data-visual-label="Copyright">{settings.footerCopyright}</span></span><Link to="/admin">Content admin</Link></div>
      </footer>
    </div>
  </div>;
}
