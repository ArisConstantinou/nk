import {useEffect, useRef, useState, type ReactNode} from 'react';
import {ArrowRight, ChevronDown, CircuitBoard, FileText, Mail, MapPin, Menu, Phone, X} from 'lucide-react';
import {Link, NavLink, useLocation} from 'react-router-dom';
import {serviceLinks, shopLinks} from '../navigation';
import {publicAsset} from '../utils/assets';
import {SeoRouteMeta} from './SeoRouteMeta';

type MegaSection = 'services' | 'shop' | null;

export function ElectricalLayout({children}: {children: ReactNode}) {
  const [megaOpen, setMegaOpen] = useState<MegaSection>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSection, setMobileSection] = useState<MegaSection>('services');
  const headerRef = useRef<HTMLElement>(null);
  const location = useLocation();

  useEffect(() => {
    setMegaOpen(null);
    setMobileOpen(false);
    window.scrollTo({top: 0, behavior: 'instant'});
  }, [location.pathname, location.search]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMegaOpen(null);
        setMobileOpen(false);
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);

  useEffect(() => {
    const previous = document.body.style.overflow;
    if (mobileOpen) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [mobileOpen]);

  useEffect(() => {
    if (!megaOpen) return;
    const closeOutside = (event: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) setMegaOpen(null);
    };
    document.addEventListener('mousedown', closeOutside);
    return () => document.removeEventListener('mousedown', closeOutside);
  }, [megaOpen]);

  const toggleMega = (section: Exclude<MegaSection, null>) => setMegaOpen(current => current === section ? null : section);
  const toggleMobileSection = (section: Exclude<MegaSection, null>) => setMobileSection(current => current === section ? null : section);

  return <div className="electrical-shell ia-shell">
    <SeoRouteMeta/>
    <header className="ia-header" ref={headerRef}>
      <div className="ia-header-bar">
        <Link className="ia-brand" to="/" aria-label="NK Electrical home">
          <img src={publicAsset('assets/nk-logo-transparent.png')} alt="NK Electrical"/>
          <span><strong>NK Electrical</strong><small>Power · Light · Control</small></span>
        </Link>

        <nav className="ia-desktop-nav" aria-label="Primary navigation">
          <button type="button" className={megaOpen === 'services' || location.pathname.startsWith('/services') ? 'active' : ''} aria-expanded={megaOpen === 'services'} aria-controls="services-mega-menu" onClick={() => toggleMega('services')}>Services <ChevronDown/></button>
          <button type="button" className={megaOpen === 'shop' || location.pathname.startsWith('/shop') ? 'active' : ''} aria-expanded={megaOpen === 'shop'} aria-controls="shop-mega-menu" onClick={() => toggleMega('shop')}>Shop <ChevronDown/></button>
          <NavLink to="/projects">Projects</NavLink>
          <NavLink to="/about">About</NavLink>
          <NavLink to="/contact">Contact</NavLink>
        </nav>

        <div className="ia-header-actions">
          <a className="ia-header-phone" href="tel:+35722494145" aria-label="Call NK Electrical"><Phone/><span>+357 22 494145</span></a>
          <Link className="ia-quote-button" to="/request-a-quote">Request a Quote <ArrowRight/></Link>
          <button className="ia-mobile-trigger" type="button" aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={mobileOpen} onClick={() => setMobileOpen(open => !open)}>{mobileOpen ? <X/> : <Menu/>}</button>
        </div>
      </div>

      {megaOpen && <div className={`ia-mega ia-mega--${megaOpen}`} id={`${megaOpen}-mega-menu`}>
        <div className="ia-mega-heading">
          <span>{megaOpen === 'services' ? 'SERVICES / EXPERTISE' : 'SHOP / PRODUCTS'}</span>
          <h2>{megaOpen === 'services' ? 'Work performed by our team.' : 'Products available through NK Electrical.'}</h2>
          <p>{megaOpen === 'services' ? 'Planning, installation, integration and support. No product categories are mixed into this path.' : 'Lighting, appliances and official PDF catalogues. Service enquiries remain under Services.'}</p>
          <Link to={megaOpen === 'services' ? '/services' : '/shop'}>{megaOpen === 'services' ? 'View all services' : 'Browse all products'} <ArrowRight/></Link>
        </div>
        <nav aria-label={`${megaOpen === 'services' ? 'Services' : 'Shop'} menu`}>
          {(megaOpen === 'services' ? serviceLinks : shopLinks).map((item, index) => <Link to={item.to} key={item.to}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{item.label}</strong><small>{item.description}</small></div><ArrowRight/></Link>)}
        </nav>
        <aside>
          {megaOpen === 'services' ? <><CircuitBoard/><small>SERVICE PATH</small><strong>From survey to tested handover.</strong><p>Start with the requirement and the building. Equipment selection follows the scope.</p></> : <><FileText/><small>PRODUCT PATH</small><strong>Products, specifications and downloads.</strong><p>Find the item first, then ask about availability, supply or installation.</p></>}
        </aside>
      </div>}

      {mobileOpen && <nav className="ia-mobile-menu" aria-label="Mobile navigation">
        <div className="ia-mobile-accordion">
          <button type="button" aria-expanded={mobileSection === 'services'} onClick={() => toggleMobileSection('services')}><span>Services</span><ChevronDown/></button>
          {mobileSection === 'services' && <div>{serviceLinks.map(item => <Link to={item.to} key={item.to}><strong>{item.label}</strong><small>{item.description}</small><ArrowRight/></Link>)}</div>}
        </div>
        <div className="ia-mobile-accordion">
          <button type="button" aria-expanded={mobileSection === 'shop'} onClick={() => toggleMobileSection('shop')}><span>Shop</span><ChevronDown/></button>
          {mobileSection === 'shop' && <div>{shopLinks.map(item => <Link to={item.to} key={item.to}><strong>{item.label}</strong><small>{item.description}</small><ArrowRight/></Link>)}</div>}
        </div>
        <NavLink className="ia-mobile-primary" to="/projects">Projects <ArrowRight/></NavLink>
        <NavLink className="ia-mobile-primary" to="/about">About <ArrowRight/></NavLink>
        <NavLink className="ia-mobile-primary" to="/contact">Contact <ArrowRight/></NavLink>
        <div className="ia-mobile-ctas"><a href="tel:+35722494145"><Phone/> Call us</a><Link to="/request-a-quote">Request a Quote <ArrowRight/></Link></div>
      </nav>}
    </header>

    <div className="electrical-stage ia-stage">
      <main className="electrical-main ia-main">{children}</main>

      <footer className="ia-footer">
        <div className="ia-footer-lead"><span>PROJECT LINE / CYPRUS</span><h2>Define the requirement.<br/>Then build it properly.</h2><Link to="/request-a-quote">Request a Quote <ArrowRight/></Link></div>
        <div className="ia-footer-grid">
          <div><b>Services</b>{serviceLinks.map(item => <Link to={item.to} key={item.to}>{item.label}</Link>)}</div>
          <div><b>Shop</b>{shopLinks.map(item => <Link to={item.to} key={item.to}>{item.label}</Link>)}</div>
          <div><b>Company</b><Link to="/projects">Projects</Link><Link to="/about">About</Link><Link to="/contact">Contact</Link><Link to="/request-a-quote">Request a Quote</Link></div>
          <div><b>Contact</b><a href="https://www.google.com/maps/search/?api=1&query=72+Makedonitissis+Strovolos+2057+Cyprus" target="_blank" rel="noreferrer"><MapPin/> 72 Makedonitissis Str.<br/>Strovolos 2057, Cyprus</a><a href="tel:+35722494145"><Phone/> +357 22 494145</a><a href="mailto:info@nk-electrical.com"><Mail/> info@nk-electrical.com</a></div>
        </div>
        <div className="ia-footer-bottom"><span>© {new Date().getFullYear()} NK Electrical Ltd. · Since 1985</span><Link to="/admin">Content admin</Link></div>
      </footer>
    </div>
  </div>;
}
