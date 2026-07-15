import {useEffect} from 'react';
import {useLocation} from 'react-router-dom';
import {useContent} from '../context/ContentContext';

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
  const {seoForRoute, settings} = useContent();
  const managed = seoForRoute(pathname);

  useEffect(() => {
    const fallback = routeMeta.find(item => item.match(pathname));
    const title = managed?.title || fallback?.title || settings.defaultMetaTitle || settings.siteName;
    const descriptionText = managed?.description || fallback?.description || settings.defaultMetaDescription;
    document.title = title;
    document.documentElement.lang = settings.language || 'en';

    const setMeta = (selector: string, attribute: 'name' | 'property', key: string, content: string) => {
      let element = document.querySelector<HTMLMetaElement>(selector);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, key);
        document.head.appendChild(element);
      }
      element.content = content;
    };
    setMeta('meta[name="description"]', 'name', 'description', descriptionText);
    setMeta('meta[name="robots"]', 'name', 'robots', managed?.indexable === false ? 'noindex,nofollow' : 'index,follow');

    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    const publicPath = `${import.meta.env.BASE_URL === '/' ? '' : import.meta.env.BASE_URL.replace(/\/$/, '')}${pathname}`;
    canonical.href = managed?.canonical || new URL(publicPath || '/', window.location.origin).href;

    setMeta('meta[property="og:title"]', 'property', 'og:title', title);
    setMeta('meta[property="og:description"]', 'property', 'og:description', descriptionText);
    setMeta('meta[property="og:url"]', 'property', 'og:url', canonical.href);
    setMeta('meta[property="og:type"]', 'property', 'og:type', 'website');
    setMeta('meta[property="og:site_name"]', 'property', 'og:site_name', settings.siteName);
    setMeta('meta[property="og:locale"]', 'property', 'og:locale', settings.locale);
    const ogImageSource = managed?.ogImage || settings.defaultSocialImage;
    const ogImage = ogImageSource ? new URL(ogImageSource, window.location.origin).href : '';
    setMeta('meta[property="og:image"]', 'property', 'og:image', ogImage);
    setMeta('meta[name="twitter:card"]', 'name', 'twitter:card', ogImage ? 'summary_large_image' : 'summary');
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', descriptionText);
    setMeta('meta[name="twitter:image"]', 'name', 'twitter:image', ogImage);

    let favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (settings.faviconUrl) {
      if (!favicon) {favicon = document.createElement('link'); favicon.rel = 'icon'; document.head.appendChild(favicon);}
      favicon.href = new URL(settings.faviconUrl, window.location.origin).href;
    }
  }, [managed, pathname, settings]);

  return null;
}
