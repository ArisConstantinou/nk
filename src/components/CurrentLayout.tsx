import {useEffect, useRef, useState, type ReactNode} from 'react';
import {Link, NavLink, useLocation} from 'react-router-dom';
import {ArrowRight, BookOpen, Boxes, Building2, ChevronDown, FolderCheck, Lightbulb, Menu, Phone, PlugZap, Users, X, Zap} from 'lucide-react';
import {publicAsset} from '../utils/assets';
import {ThemeControls} from './ThemeControls';

const pathNav = [
  {label: 'Start', detail: 'Find the right path', route: '/', Icon: Zap},
  {label: 'Plan', detail: 'Scope the electrical work', route: '/electrical-installations', Icon: PlugZap},
  {label: 'Proof', detail: 'See completed projects', route: '/projects', Icon: FolderCheck},
  {label: 'Contact', detail: 'Reach the right person', route: '/contact', Icon: Phone},
];

const utilityNav = [
  {label: 'Live LED test', detail: 'See colour and brightness respond', route: '/#led-lab', Icon: Lightbulb},
  {label: 'Lighting catalogues', detail: 'Browse original brand catalogues', route: '/lighting', Icon: BookOpen},
  {label: 'Products & appliances', detail: 'Explore products by real use', route: '/explore', Icon: Boxes},
  {label: 'Company & team', detail: 'Meet the people responsible', route: '/about', Icon: Users},
];

export function CurrentLayout({children}: {children: ReactNode}) {
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    setLauncherOpen(false);
    setMobileOpen(false);
    if (location.hash) {
      window.requestAnimationFrame(() => document.querySelector(location.hash)?.scrollIntoView({behavior: 'smooth'}));
    } else {
      shellRef.current?.scrollTo({top: 0, behavior: 'auto'});
    }
  }, [location.pathname, location.hash]);

  return <div className="current-shell" ref={shellRef}>
    <header className="current-header">
      <Link className="current-brand" to="/" aria-label="NK Electrical home">
        <img src={publicAsset('assets/nk-logo-transparent.png')} alt="NK Electrical"/>
        <span><strong>NK Electrical</strong><small>Power · light · control</small></span>
      </Link>

      <nav className="current-path-nav" aria-label="Project path">
        {pathNav.map(({label, route}) => <NavLink to={route} end={route === '/'} key={route}>{label}</NavLink>)}
      </nav>

      <div className="current-header-actions">
        <button className="current-explore-trigger" type="button" aria-expanded={launcherOpen} aria-controls="current-launcher" onClick={() => setLauncherOpen(open => !open)}>
          Explore <ChevronDown/>
        </button>
        <ThemeControls className="theme-controls--current"/>
        <Link className="current-brief-cta" to="/contact">Start a brief <ArrowRight/></Link>
        <button className="current-mobile-trigger" type="button" aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={mobileOpen} onClick={() => setMobileOpen(open => !open)}>{mobileOpen ? <X/> : <Menu/>}</button>
      </div>
    </header>

    {launcherOpen && <aside className="current-launcher" id="current-launcher" aria-label="Explore NK Electrical">
      <div className="current-launcher-heading"><span>EXPLORE / 04</span><h2>Tools, products<br/>and people.</h2><p>Everything useful without crowding the project path.</p></div>
      <nav>{utilityNav.map(({label, detail, route, Icon}) => <Link to={route} key={route}><Icon/><span><strong>{label}</strong><small>{detail}</small></span><ArrowRight/></Link>)}</nav>
      <div className="current-launcher-meta"><Building2/><span>72 Makedonitissis Str.<br/>Strovolos 2057, Cyprus</span><Link to="/admin">Open theme admin</Link></div>
    </aside>}

    {mobileOpen && <nav className="current-mobile-menu" aria-label="Mobile project navigation">
      {pathNav.map(({label, detail, route, Icon}) => <NavLink to={route} end={route === '/'} key={route}><Icon/><span><strong>{label}</strong><small>{detail}</small></span><ArrowRight/></NavLink>)}
      <div className="current-mobile-utilities">{utilityNav.map(({label, route}) => <Link to={route} key={route}>{label}</Link>)}</div>
    </nav>}

    <main className="current-main">{children}</main>

    <footer className="current-footer">
      <div className="current-footer-callout">
        <span><i/> PROJECT LINE OPEN</span>
        <h2>A clearer electrical project starts with one useful conversation.</h2>
        <Link to="/contact">Tell us what is changing <ArrowRight/></Link>
      </div>
      <div className="current-footer-details">
        <div><small>Urgent electrical support</small><a href="tel:+35722494145">+357 22 494145</a></div>
        <div><small>Project enquiries</small><a href="mailto:info@nk-electrical.com">info@nk-electrical.com</a></div>
        <div><small>Visit</small><a href="https://www.google.com/maps/search/?api=1&query=72+Makedonitissis+Strovolos+2057+Cyprus" target="_blank" rel="noreferrer">Strovolos, Cyprus</a></div>
        <div><small>Manage</small><Link to="/admin">Theme admin</Link></div>
      </div>
      <p>© {new Date().getFullYear()} NK Electrical Ltd. · Electrical work since 1985.</p>
    </footer>

    <nav className="current-mobile-dock" aria-label="Quick actions">
      <NavLink to="/" end><Zap/><span>Start</span></NavLink>
      <NavLink to="/electrical-installations"><PlugZap/><span>Plan</span></NavLink>
      <Link className="current-mobile-led" to="/#led-lab"><Lightbulb/><span>LED test</span></Link>
      <NavLink to="/projects"><FolderCheck/><span>Proof</span></NavLink>
      <NavLink to="/contact"><Phone/><span>Talk</span></NavLink>
    </nav>
  </div>;
}
