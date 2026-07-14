import {useEffect, useState, type ReactNode} from 'react';
import {Link, NavLink, useLocation} from 'react-router-dom';
import {ArrowUpRight, CircuitBoard, Facebook, Instagram, Linkedin, Menu, Moon, Sun, X} from 'lucide-react';
import {publicAsset} from '../utils/assets';

const nav = [
  ['About', '/about'],
  ['Installations', '/electrical-installations'],
  ['Lighting', '/lighting'],
  ['Appliances', '/appliances'],
  ['Projects', '/projects'],
  ['Contact', '/contact'],
];

function initialDarkTheme() {
  const savedTheme = window.localStorage.getItem('nk-color-theme');
  if (savedTheme === 'dark') return true;
  if (savedTheme === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function initialElectricalTheme() {
  const savedTheme = window.localStorage.getItem('nk-experience-theme');
  if (savedTheme) return savedTheme === 'tech';
  return true;
}

export function Layout({children}: {children: ReactNode}) {
  const [open, setOpen] = useState(false);
  const [darkTheme, setDarkTheme] = useState(initialDarkTheme);
  const [electricalTheme, setElectricalTheme] = useState(initialElectricalTheme);
  const location = useLocation();

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = darkTheme ? 'dark' : 'light';
    root.style.colorScheme = darkTheme ? 'dark' : 'light';
    window.localStorage.setItem('nk-color-theme', darkTheme ? 'dark' : 'light');
  }, [darkTheme]);

  useEffect(() => {
    document.documentElement.dataset.experience = electricalTheme ? 'tech' : 'studio';
    window.localStorage.setItem('nk-experience-theme', electricalTheme ? 'tech' : 'studio');
  }, [electricalTheme]);

  useEffect(() => {
    setOpen(false);
    window.scrollTo({top: 0, behavior: 'instant'});
  }, [location.pathname]);

  return <div className="site-shell">
    <header className="topbar">
      <Link className="brand" to="/" aria-label="NK Electrical Ltd. home">
        <span className="brand-mark"><img src={publicAsset('assets/nk-logo-transparent.png')} alt="NK Electrical" /></span>
        <span className="brand-wordmark"><strong>Electrical</strong><small>Ltd.</small></span>
      </Link>
      <nav className="desktop-nav" aria-label="Primary navigation">
        {nav.map(([label, href]) => <NavLink key={href} to={href}>{label}</NavLink>)}
      </nav>
      <div className="header-tools">
        <div className="theme-controls" role="group" aria-label="Website appearance">
          <button
            className="theme-control"
            type="button"
            aria-label={darkTheme ? 'Switch to light theme' : 'Switch to dark theme'}
            aria-pressed={darkTheme}
            data-tooltip={darkTheme ? 'Light mode' : 'Dark mode'}
            onClick={() => setDarkTheme((current) => !current)}
          >
            {darkTheme ? <Sun aria-hidden="true"/> : <Moon aria-hidden="true"/>}
          </button>
          <button
            className="theme-control theme-control--electrical"
            type="button"
            aria-label={electricalTheme ? 'Switch to studio theme' : 'Switch to electrical tech theme'}
            aria-pressed={electricalTheme}
            data-tooltip={electricalTheme ? 'Studio theme' : 'Electrical theme'}
            onClick={() => setElectricalTheme((current) => !current)}
          >
            <CircuitBoard aria-hidden="true"/>
          </button>
        </div>
        <Link className="header-cta" to="/contact">Start a conversation <ArrowUpRight size={16}/></Link>
        <button className="menu-button" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X/> : <Menu/>}</button>
      </div>
    </header>
    {open && <nav className="mobile-nav" aria-label="Mobile navigation">
      {nav.map(([label, href], i) => <NavLink style={{'--i': i} as React.CSSProperties} key={href} to={href}>{label}<ArrowUpRight/></NavLink>)}
      <NavLink to="/admin">Content studio<ArrowUpRight/></NavLink>
    </nav>}
    <main>{children}</main>
    <footer className="footer">
      <div className="footer-lead">
        <span className="eyebrow light">NK Electrical · Since 1985</span>
        <h2>Plan it. Wire it.<br/><em>Light it.</em></h2>
        <Link className="button copper" to="/contact">Talk to our team <ArrowUpRight/></Link>
      </div>
      <div className="footer-grid">
        <div><b>Visit</b><a href="https://www.google.com/maps/search/?api=1&query=72+Makedonitissis+Strovolos+2057+Cyprus" target="_blank" rel="noreferrer">72 Makedonitissis Str.<br/>Strovolos 2057, Cyprus</a></div>
        <div><b>Speak</b><a href="tel:+35722494145">+357 22 494145</a><a href="mailto:info@nk-electrical.com">info@nk-electrical.com</a></div>
        <div><b>Follow</b><a href="https://www.instagram.com/nk_electrical/" target="_blank" rel="noreferrer"><Instagram/> Instagram</a><a href="https://www.facebook.com/nkelectricalltd" target="_blank" rel="noreferrer"><Facebook/> Facebook</a><a href="https://www.linkedin.com/company/12901535/" target="_blank" rel="noreferrer"><Linkedin/> LinkedIn</a></div>
        <div><b>Manage</b><Link to="/admin">Open content studio</Link><span>© {new Date().getFullYear()} NK Electrical</span></div>
      </div>
    </footer>
  </div>;
}
