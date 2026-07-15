import {useEffect} from 'react';
import {useLocation} from 'react-router-dom';

const routeMeta: Array<{match: (path: string) => boolean; title: string; description: string}> = [
  {match: path => path === '/', title: 'NK Electrical | Electrical Services, Lighting & Appliances in Cyprus', description: 'Electrical installations, lighting design, smart-home systems, products and project support from NK Electrical in Strovolos, Cyprus.'},
  {match: path => path === '/services', title: 'Electrical Services in Cyprus | NK Electrical', description: 'Explore electrical installations, lighting design, smart automation, security systems, maintenance and fault support.'},
  {match: path => path.includes('/services/electrical-installations'), title: 'Electrical Installations in Cyprus | NK Electrical', description: 'Electrical planning, distribution, wiring, protection, testing and handover for residential and commercial projects.'},
  {match: path => path.includes('/services/lighting-design'), title: 'Lighting Design & Specification | NK Electrical', description: 'Architectural, decorative, interior and exterior lighting design and specification for projects in Cyprus.'},
  {match: path => path.includes('/services/smart-home-automation'), title: 'Smart Home & KNX Automation | NK Electrical', description: 'Smart-home controls, KNX automation, lighting scenes and connected building systems designed around daily use.'},
  {match: path => path.includes('/services/security-systems'), title: 'Security & Low-Voltage Systems | NK Electrical', description: 'CCTV, alarms, access control, sound and vision systems coordinated with the electrical installation.'},
  {match: path => path.includes('/services/maintenance'), title: 'Electrical Maintenance & Fault Finding | NK Electrical', description: 'Electrical fault diagnosis, corrective repairs and planned maintenance support across Cyprus.'},
  {match: path => path === '/shop', title: 'Lighting & Electrical Products | NK Electrical Shop', description: 'Browse lighting, appliances and electrical products available through NK Electrical in Strovolos.'},
  {match: path => path === '/shop/lighting', title: 'Lighting Products | NK Electrical Shop', description: 'Browse decorative, architectural, wall, ceiling and outdoor lighting products.'},
  {match: path => path === '/shop/appliances', title: 'Electrical Appliances | NK Electrical Shop', description: 'Browse kitchen, coffee, cooling and household appliances available through NK Electrical.'},
  {match: path => path === '/shop/catalogues', title: 'Lighting Catalogues & PDF Downloads | NK Electrical', description: 'Open official ACA, Nova Luce and VIOKEF lighting catalogues and product PDF downloads.'},
  {match: path => path.startsWith('/shop/product/'), title: 'Product Details | NK Electrical Shop', description: 'Product information and enquiry details from the NK Electrical collection.'},
  {match: path => path === '/projects', title: 'Completed Electrical Projects | NK Electrical Cyprus', description: 'Filter completed residential, commercial, retail and mixed-use electrical and LED lighting projects.'},
  {match: path => path === '/about', title: 'About NK Electrical | History, Team & Partners', description: 'Meet the NK Electrical team, learn the company history since 1985 and explore its product and project partnerships.'},
  {match: path => path === '/contact', title: 'Contact NK Electrical | Strovolos, Cyprus', description: 'Find NK Electrical contact details, opening hours, location, phone, email and enquiry form.'},
  {match: path => path === '/request-a-quote', title: 'Request an Electrical Quote | NK Electrical', description: 'Request a quote for an electrical installation, lighting project, smart system, maintenance or product requirement.'},
];

export function SeoRouteMeta() {
  const {pathname} = useLocation();

  useEffect(() => {
    const meta = routeMeta.find(item => item.match(pathname)) || routeMeta[0];
    document.title = meta.title;

    let description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!description) {
      description = document.createElement('meta');
      description.name = 'description';
      document.head.appendChild(description);
    }
    description.content = meta.description;

    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = `${window.location.origin}${import.meta.env.BASE_URL === '/' ? '' : import.meta.env.BASE_URL.replace(/\/$/, '')}${pathname}`;
  }, [pathname]);

  return null;
}
