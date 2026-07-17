import {useEffect, useRef, useState, type ReactNode} from 'react';
import {ArrowRight, ChevronDown, CircuitBoard, FileText, Mail, MapPin, Menu, Phone, X} from 'lucide-react';
import {Link, NavLink, useLocation} from 'react-router-dom';
import {useContent, type PublicNavigationItem, type SiteSocialLink} from '../context/ContentContext';
import {serviceLinks, shopLinks} from '../navigation';
import {publicAsset} from '../utils/assets';
import {SeoRouteMeta} from './SeoRouteMeta';
import {ResponsiveImage} from './ResponsiveImage';
import {LiveSiteEditButton} from './LiveSiteEditButton';

type MegaSection = 'services' | 'shop' | null;
type LinkItem = {label: string; description?: string; to?: string; url?: string};

const isInternalUrl = (url: string) => url.startsWith('/') && !url.startsWith('//');

function SmartLink({to, className, children}: {to: string; className?: string; children: ReactNode}) {
  return isInternalUrl(to)
    ? <Link className={className} to={to}>{children}</Link>
    : <a className={className} href={to} rel={to.startsWith('http') ? 'noreferrer' : undefined}>{children}</a>;
}

function PrimaryLink({to, children}: {to: string; children: ReactNode}) {
  return isInternalUrl(to)
    ? <NavLink to={to}>{children}</NavLink>
    : <a href={to} rel={to.startsWith('http') ? 'noreferrer' : undefined}>{children}</a>;
}

function SocialIcon({link}: {link: SiteSocialLink}) {
  if (link.iconUrl) return <img src={link.iconUrl} alt=""/>;
  const labels: Record<string, string> = {facebook: 'f', instagram: 'ig', linkedin: 'in', youtube: 'yt', tiktok: 'tt', x: 'x', whatsapp: 'wa', pinterest: 'p', telegram: 'tg', globe: '↗'};
  return <span aria-hidden="true">{labels[link.icon.toLowerCase()] || link.platform.slice(0, 2).toLowerCase()}</span>;
}

function SocialLinks({links, placement, className}: {links: SiteSocialLink[]; placement: SiteSocialLink['placements'][number]; className?: string}) {
  const shown = links.filter(link => link.active && link.placements.includes(placement));
  if (!shown.length) return null;
  return <div className={className || 'ia-social-links'}>{shown.map(link => <a href={link.url} target={link.newTab ? '_blank' : undefined} rel={link.newTab ? 'noreferrer' : undefined} aria-label={link.platform} data-platform={link.platform} key={link.id}><SocialIcon link={link}/></a>)}</div>;
}

export function ElectricalLayout({children}: {children: ReactNode}) {
  const {navigation, settings} = useContent();
  const [megaOpen, setMegaOpen] = useState<MegaSection>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSection, setMobileSection] = useState<MegaSection>('services');
  const headerRef = useRef<HTMLElement>(null);
  const mobileNavRef = useRef<HTMLElement>(null);
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);
  const location = useLocation();
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

  useEffect(() => {
    setMegaOpen(null);
    setMobileOpen(false);
    window.scrollTo({top: 0, behavior: 'instant'});
  }, [location.pathname, location.search]);

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setMegaOpen(null);
      if (mobileOpen) {
        setMobileOpen(false);
        window.setTimeout(() => mobileTriggerRef.current?.focus(), 0);
      }
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [mobileOpen]);

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
    if (!megaOpen) return;
    const close = (event: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) setMegaOpen(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [megaOpen]);

  const toggleMega = (section: Exclude<MegaSection, null>) => setMegaOpen(current => current === section ? null : section);
  const toggleMobile = (section: Exclude<MegaSection, null>) => setMobileSection(current => current === section ? null : section);

  return <div className="electrical-shell ia-shell">
    <SeoRouteMeta/>
    <header className={`ia-header ${settings.header.sticky ? '' : 'ia-header--static'}`} ref={headerRef}>
      <div className="ia-header-bar">
        <Link className="ia-brand" to="/" aria-label={`${settings.brandName} home`} aria-hidden={mobileOpen || undefined} tabIndex={mobileOpen ? -1 : undefined}><ResponsiveImage src={settings.logoUrl || publicAsset('assets/nk-logo-transparent-v2.png')} alt={settings.logoAlt}/><span><strong><span className="ia-brand-depth" aria-hidden="true">{settings.brandName}</span><span className="ia-brand-face" data-visual-kind="settings" data-visual-slug="business-details" data-visual-path="brandName" data-visual-edit="text" data-visual-label="Brand name">{settings.brandName}</span></strong>{settings.header.showTagline && <small><span className="ia-brand-depth" aria-hidden="true">{settings.brandTagline}</span><span className="ia-brand-face" data-visual-kind="settings" data-visual-slug="business-details" data-visual-path="brandTagline" data-visual-edit="text" data-visual-label="Brand tagline">{settings.brandTagline}</span></small>}</span></Link>
        <nav className="ia-desktop-nav" aria-label="Primary navigation">{primary.map(item => linkTo(item) === '/services'
          ? <button key="services" type="button" className={megaOpen === 'services' || location.pathname.startsWith('/services') ? 'active' : ''} aria-expanded={megaOpen === 'services'} aria-controls="services-mega-menu" onClick={() => toggleMega('services')}><span>{item.label}</span><ChevronDown/></button>
          : linkTo(item) === '/shop'
            ? <button key="shop" type="button" className={megaOpen === 'shop' || location.pathname.startsWith('/shop') ? 'active' : ''} aria-expanded={megaOpen === 'shop'} aria-controls="shop-mega-menu" onClick={() => toggleMega('shop')}><span>{item.label}</span><ChevronDown/></button>
            : <PrimaryLink to={linkTo(item)} key={`${item.label}-${linkTo(item)}`}>{item.label}</PrimaryLink>)}</nav>
        <div className="ia-header-actions">
          {settings.header.showSocials && <SocialLinks links={settings.socialLinks} placement="header" className="ia-social-links ia-social-links--header"/>}
          <a className="ia-header-phone" href={`tel:${tel}`} aria-label={`Call ${settings.brandName}`}><Phone/><span data-visual-kind="settings" data-visual-slug="business-details" data-visual-path="phone" data-visual-edit="text" data-visual-label="Phone number">{settings.phone}</span></a>
          <SmartLink className="ia-quote-button" to={settings.quoteUrl}><span data-visual-kind="settings" data-visual-slug="business-details" data-visual-path="quoteLabel" data-visual-edit="text" data-visual-label="Quote button" data-visual-link-path="quoteUrl">{settings.quoteLabel}</span><ArrowRight/></SmartLink>
          <LiveSiteEditButton/>
          <button ref={mobileTriggerRef} className="ia-mobile-trigger" type="button" aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={mobileOpen} aria-controls="mobile-navigation" onClick={() => setMobileOpen(open => !open)}>{mobileOpen ? <X/> : <Menu/>}</button>
        </div>
      </div>
      {megaOpen && <div className={`ia-mega ia-mega--${megaOpen}`} id={`${megaOpen}-mega-menu`}>
        <div className="ia-mega-heading"><span>{megaOpen === 'services' ? 'SERVICES / EXPERTISE' : 'SHOP / PRODUCTS'}</span><h2>{megaOpen === 'services' ? 'Work performed by our team.' : 'Products available through NK Electrical.'}</h2><p>{megaOpen === 'services' ? 'Planning, installation, integration and support. No product categories are mixed into this path.' : 'Lighting, appliances and official PDF catalogues. Service enquiries remain under Services.'}</p><Link to={megaOpen === 'services' ? '/services' : '/shop'}><span>{megaOpen === 'services' ? 'View all services' : 'Browse all products'}</span><ArrowRight/></Link></div>
        <nav aria-label={`${megaOpen === 'services' ? 'Services' : 'Shop'} menu`}>{(megaOpen === 'services' ? serviceMenu : shopMenu).map((item, index) => <SmartLink to={linkTo(item)} key={`${item.label}-${linkTo(item)}`}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{item.label}</strong><small>{item.description}</small></div><ArrowRight/></SmartLink>)}</nav>
        <aside>{megaOpen === 'services' ? <><CircuitBoard/><small>SERVICE PATH</small><strong>From survey to tested handover.</strong><p>Start with the requirement and the building. Equipment selection follows the scope.</p></> : <><FileText/><small>PRODUCT PATH</small><strong>Products, specifications and downloads.</strong><p>Find the item first, then ask about availability, supply or installation.</p></>}</aside>
      </div>}
      {mobileOpen && <nav ref={mobileNavRef} className="ia-mobile-menu" id="mobile-navigation" aria-label="Mobile navigation">
        <div className="ia-mobile-accordion"><button type="button" aria-expanded={mobileSection === 'services'} aria-controls="mobile-services" onClick={() => toggleMobile('services')}><span>Services</span><ChevronDown/></button>{mobileSection === 'services' && <div id="mobile-services">{serviceMenu.map(item => <SmartLink to={linkTo(item)} key={`${item.label}-${linkTo(item)}`}><strong>{item.label}</strong><small>{item.description}</small><ArrowRight/></SmartLink>)}</div>}</div>
        <div className="ia-mobile-accordion"><button type="button" aria-expanded={mobileSection === 'shop'} aria-controls="mobile-shop" onClick={() => toggleMobile('shop')}><span>Shop</span><ChevronDown/></button>{mobileSection === 'shop' && <div id="mobile-shop">{shopMenu.map(item => <SmartLink to={linkTo(item)} key={`${item.label}-${linkTo(item)}`}><strong>{item.label}</strong><small>{item.description}</small><ArrowRight/></SmartLink>)}</div>}</div>
        {primary.filter(item => !['/services', '/shop'].includes(linkTo(item))).map(item => <SmartLink className="ia-mobile-primary" to={linkTo(item)} key={`${item.label}-${linkTo(item)}`}><span>{item.label}</span><ArrowRight/></SmartLink>)}
        <div className="ia-mobile-ctas"><a href={`tel:${tel}`}><Phone/><span>Call us</span></a><SmartLink to={settings.quoteUrl}><span>{settings.quoteLabel}</span><ArrowRight/></SmartLink></div>
        <SocialLinks links={settings.socialLinks} placement="mobile" className="ia-social-links ia-social-links--mobile"/>
      </nav>}
    </header>
    <SocialLinks links={settings.socialLinks} placement="footer" className="ia-social-links ia-social-links--dock"/>
    <div className="electrical-stage ia-stage" inert={mobileOpen || undefined} aria-hidden={mobileOpen || undefined}>
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
