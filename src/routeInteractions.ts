export type RouteMotion =
  | 'conductor'
  | 'circuit'
  | 'scan'
  | 'frame'
  | 'timeline'
  | 'radar'
  | 'connector'
  | 'lighting'
  | 'automation'
  | 'security'
  | 'diagnostic';

export type RouteInteractionProfile = {
  id: string;
  label: string;
  motion: RouteMotion;
  accent: string;
  secondary: string;
  deep: string;
};

const brandRoutePalette = {accent: '#D8A467', secondary: '#E06B4D', deep: '#17343A'} as const;

const profiles = {
  home: {id: 'home', label: 'Home', motion: 'conductor', ...brandRoutePalette},
  services: {id: 'services', label: 'Services', motion: 'circuit', ...brandRoutePalette},
  installations: {id: 'installations', label: 'Electrical installations', motion: 'circuit', ...brandRoutePalette},
  lighting: {id: 'lighting', label: 'Lighting design', motion: 'lighting', ...brandRoutePalette},
  automation: {id: 'automation', label: 'Smart-home automation', motion: 'automation', ...brandRoutePalette},
  security: {id: 'security', label: 'Security systems', motion: 'security', ...brandRoutePalette},
  maintenance: {id: 'maintenance', label: 'Maintenance', motion: 'diagnostic', ...brandRoutePalette},
  shop: {id: 'shop', label: 'Shop', motion: 'scan', ...brandRoutePalette},
  shopLighting: {id: 'shop-lighting', label: 'Lighting shop', motion: 'lighting', ...brandRoutePalette},
  appliances: {id: 'shop-appliances', label: 'Appliances', motion: 'scan', ...brandRoutePalette},
  offers: {id: 'shop-offers', label: 'Offers', motion: 'connector', ...brandRoutePalette},
  catalogues: {id: 'shop-catalogues', label: 'Catalogues', motion: 'frame', ...brandRoutePalette},
  product: {id: 'product', label: 'Product', motion: 'scan', ...brandRoutePalette},
  projects: {id: 'projects', label: 'Projects', motion: 'frame', ...brandRoutePalette},
  about: {id: 'about', label: 'About', motion: 'timeline', ...brandRoutePalette},
  contact: {id: 'contact', label: 'Contact', motion: 'radar', ...brandRoutePalette},
  quote: {id: 'quote', label: 'Request a quote', motion: 'connector', ...brandRoutePalette},
  editorial: {id: 'editorial', label: 'Page', motion: 'timeline', ...brandRoutePalette},
} satisfies Record<string, RouteInteractionProfile>;

export function routeInteractionForPath(pathname: string): RouteInteractionProfile {
  const path = pathname.split(/[?#]/)[0].replace(/\/+$/, '') || '/';

  if (path === '/') return profiles.home;
  if (path === '/services/electrical-installations') return profiles.installations;
  if (path === '/services/lighting-design') return profiles.lighting;
  if (path === '/services/smart-home-automation') return profiles.automation;
  if (path === '/services/security-systems') return profiles.security;
  if (path === '/services/maintenance') return profiles.maintenance;
  if (path === '/services' || path.startsWith('/services/')) return profiles.services;
  if (path.startsWith('/shop/product/')) return profiles.product;
  if (path === '/shop/catalogues') return profiles.catalogues;
  if (path === '/shop/lighting') return profiles.shopLighting;
  if (path === '/shop/appliances') return profiles.appliances;
  if (path === '/shop/offers') return profiles.offers;
  if (path === '/shop' || path.startsWith('/shop/')) return profiles.shop;
  if (path === '/projects' || path.startsWith('/projects/')) return profiles.projects;
  if (path === '/about') return profiles.about;
  if (path === '/contact') return profiles.contact;
  if (path === '/request-a-quote') return profiles.quote;
  return profiles.editorial;
}
