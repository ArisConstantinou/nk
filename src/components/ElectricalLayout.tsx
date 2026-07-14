import {useEffect, useState, type ReactNode} from 'react';
import {
  ArrowRight,
  CircuitBoard,
  Contact,
  House,
  Lightbulb,
  Menu,
  PanelsTopLeft,
  PlugZap,
  Refrigerator,
  UsersRound,
  X,
} from 'lucide-react';
import {Link, NavLink, useLocation} from 'react-router-dom';
import {publicAsset} from '../utils/assets';
import {ThemeControls} from './ThemeControls';

const electricalNav = [
  {label: 'Home', route: '/', code: '00', Icon: House},
  {label: 'Installations', route: '/electrical-installations', code: '01', Icon: PlugZap},
  {label: 'Lighting', route: '/lighting', code: '02', Icon: Lightbulb},
  {label: 'Appliances', route: '/appliances', code: '03', Icon: Refrigerator},
  {label: 'Projects', route: '/projects', code: '04', Icon: PanelsTopLeft},
  {label: 'About', route: '/about', code: '05', Icon: UsersRound},
  {label: 'Contact', route: '/contact', code: '06', Icon: Contact},
];

const routeName = (pathname: string) => electricalNav.find(item => item.route !== '/' && pathname.startsWith(item.route))?.label || (pathname === '/' ? 'Main distribution' : 'System detail');

const workflowByRoute: Record<string, [string, string, string, string]> = {
  '/': ['Survey', 'Engineer', 'Install', 'Maintain'],
  '/electrical-installations': ['Load', 'Protect', 'Wire', 'Certify'],
  '/lighting': ['Layer', 'Specify', 'Aim', 'Commission'],
  '/appliances': ['Select', 'Supply', 'Connect', 'Support'],
  '/projects': ['Scope', 'Coordinate', 'Install', 'Handover'],
  '/about': ['Experience', 'Coordinate', 'Install', 'Support'],
  '/contact': ['Describe', 'Route', 'Review', 'Respond'],
};

const routeWorkflow = (pathname: string) => {
  const route = Object.keys(workflowByRoute).find(item => item !== '/' && pathname.startsWith(item));
  return workflowByRoute[route || '/'];
};

export function ElectricalLayout({children}: {children: ReactNode}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const section = routeName(location.pathname);
  const workflow = routeWorkflow(location.pathname);

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo({top: 0, behavior: 'instant'});
  }, [location.pathname]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);

  return <div className="electrical-shell">
    <aside className="electrical-rail">
      <Link className="electrical-rail-brand" to="/" aria-label="NK Electrical Ltd. systems home">
        <img src={publicAsset('assets/nk-logo-transparent.png')} alt="NK Electrical"/>
        <span className="electrical-rail-wordmark"><strong>Electrical</strong><small>Ltd.</small></span>
      </Link>
      <nav className="electrical-rail-nav" aria-label="Electrical systems navigation">
        {electricalNav.map(({label, route, code, Icon}) => <NavLink to={route} key={route} aria-label={label} data-label={label} end={route === '/'}>
          <small>{code}</small><Icon/><span>{label}</span><i/>
        </NavLink>)}
      </nav>
      <div className="electrical-rail-tools"><ThemeControls className="theme-controls--rail"/></div>
    </aside>

    <div className="electrical-stage">
      <header className="electrical-commandbar">
        <Link className="electrical-command-brand" to="/" aria-label="NK Electrical Ltd. home">
          <img src={publicAsset('assets/nk-logo-transparent.png')} alt="NK Electrical"/>
          <span><strong>Electrical</strong><small>Ltd.</small></span>
        </Link>
        <button className="electrical-menu-trigger" type="button" aria-label={menuOpen ? 'Close systems menu' : 'Open systems menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen(open => !open)}>{menuOpen ? <X/> : <Menu/>}<span>Systems</span></button>
        <div className="electrical-command-location"><strong>NK / {section}</strong></div>
        <div className="electrical-command-flow" aria-label={`${section} workflow`}><span>{workflow[0]}</span><i/><span>{workflow[1]}</span><i/><span>{workflow[2]}</span><i/><span>{workflow[3]}</span></div>
        <ThemeControls className="theme-controls--command"/>
        <Link className="electrical-command-contact" to="/contact"><span>Route an enquiry</span><ArrowRight/></Link>
      </header>

      {menuOpen && <div className="electrical-menu-panel" role="dialog" aria-modal="true" aria-label="Electrical systems menu">
        <div className="electrical-menu-heading"><span>NK / SYSTEM DIRECTORY</span><h2>Where does the<br/>work begin?</h2><p>Choose the discipline. Every route remains connected to the same project team.</p></div>
        <nav>{electricalNav.map(({label, route, code, Icon}) => <NavLink to={route} key={route} end={route === '/'}><small>{code}</small><Icon/><strong>{label}</strong><ArrowRight/></NavLink>)}</nav>
        <div className="electrical-menu-meta"><span>72 Makedonitissis Str.<br/>Strovolos 2057</span><a href="tel:+35722494145">+357 22 494145</a><a href="mailto:info@nk-electrical.com">info@nk-electrical.com</a></div>
      </div>}

      <main className="electrical-main">{children}</main>

      <footer className="electrical-footer">
        <div className="electrical-footer-signal"><CircuitBoard/><span>Project line available</span><i/></div>
        <div className="electrical-footer-title"><small>FROM FIRST LOAD TO FINAL TEST</small><h2>Ready to define<br/>the electrical scope?</h2><Link to="/contact">Start with the building <ArrowRight/></Link></div>
        <div className="electrical-footer-grid">
          <div><b>Visit</b><a href="https://www.google.com/maps/search/?api=1&query=72+Makedonitissis+Strovolos+2057+Cyprus" target="_blank" rel="noreferrer">72 Makedonitissis Str.<br/>Strovolos 2057, Cyprus</a></div>
          <div><b>Connect</b><a href="tel:+35722494145">+357 22 494145</a><a href="mailto:info@nk-electrical.com">info@nk-electrical.com</a></div>
          <div><b>Operations</b><span>Electrical installations</span><span>Lighting + appliances</span><span>Smart building systems</span></div>
          <div><b>System</b><Link to="/admin">Content studio</Link><span>© {new Date().getFullYear()} NK Electrical Ltd.</span></div>
        </div>
      </footer>
    </div>

    <nav className="electrical-mobile-dock" aria-label="Quick navigation">
      {electricalNav.filter(item => ['/', '/electrical-installations', '/projects', '/contact'].includes(item.route)).map(({label, route, Icon}) => <NavLink to={route} key={route} end={route === '/'}><Icon/><span>{label === 'Installations' ? 'Install' : label}</span></NavLink>)}
      <button type="button" aria-label="Open all systems" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}><CircuitBoard/><span>All</span></button>
    </nav>
  </div>;
}
