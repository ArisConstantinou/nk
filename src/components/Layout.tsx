import {useEffect, useState, type ReactNode} from 'react';
import {Link, NavLink, useLocation} from 'react-router-dom';
import {ArrowUpRight, Facebook, Instagram, Linkedin, Menu, X} from 'lucide-react';
import {publicAsset} from '../utils/assets';

const nav = [
  ['About', '/about'],
  ['Installations', '/electrical-installations'],
  ['Lighting', '/lighting'],
  ['Appliances', '/appliances'],
  ['Projects', '/projects'],
  ['Contact', '/contact'],
];

export function Layout({children}: {children: ReactNode}) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => {
    setOpen(false);
    window.scrollTo({top: 0, behavior: 'instant'});
  }, [location.pathname]);

  return <div className="site-shell">
    <header className="topbar">
      <Link className="brand" to="/" aria-label="NK Electrical home">
        <span className="brand-mark"><img src={publicAsset('assets/logo.jpg')} alt="NK Electrical" /></span>
      </Link>
      <nav className="desktop-nav" aria-label="Primary navigation">
        {nav.map(([label, href]) => <NavLink key={href} to={href}>{label}</NavLink>)}
      </nav>
      <Link className="header-cta" to="/contact">Start a conversation <ArrowUpRight size={16}/></Link>
      <button className="menu-button" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X/> : <Menu/>}</button>
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
