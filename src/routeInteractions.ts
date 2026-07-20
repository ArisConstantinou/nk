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

const profiles = {
  home: {id: 'home', label: 'Home', motion: 'conductor', accent: '#42ddff', secondary: '#ff7957', deep: '#071421'},
  services: {id: 'services', label: 'Services', motion: 'circuit', accent: '#31d8f5', secondary: '#ff6a3d', deep: '#0c2e73'},
  installations: {id: 'installations', label: 'Electrical installations', motion: 'circuit', accent: '#40c7ff', secondary: '#ff7b2e', deep: '#12366f'},
  lighting: {id: 'lighting', label: 'Lighting design', motion: 'lighting', accent: '#ffc14a', secondary: '#b35cff', deep: '#351345'},
  automation: {id: 'automation', label: 'Smart-home automation', motion: 'automation', accent: '#3ce4f5', secondary: '#9667ff', deep: '#171848'},
  security: {id: 'security', label: 'Security systems', motion: 'security', accent: '#34d3bf', secondary: '#ff465b', deep: '#082f36'},
  maintenance: {id: 'maintenance', label: 'Maintenance', motion: 'diagnostic', accent: '#d3ef48', secondary: '#4b6fff', deep: '#172e67'},
  shop: {id: 'shop', label: 'Shop', motion: 'scan', accent: '#38d4c4', secondary: '#ff6b54', deep: '#6d2930'},
  shopLighting: {id: 'shop-lighting', label: 'Lighting shop', motion: 'lighting', accent: '#d8f34c', secondary: '#4770ff', deep: '#103b8d'},
  appliances: {id: 'shop-appliances', label: 'Appliances', motion: 'scan', accent: '#8addc7', secondary: '#f05a43', deep: '#275f55'},
  offers: {id: 'shop-offers', label: 'Offers', motion: 'connector', accent: '#ffb038', secondary: '#ff3192', deep: '#5d123d'},
  catalogues: {id: 'shop-catalogues', label: 'Catalogues', motion: 'frame', accent: '#36d7ff', secondary: '#ffc250', deep: '#231166'},
  product: {id: 'product', label: 'Product', motion: 'scan', accent: '#76dfd0', secondary: '#ff7157', deep: '#283c76'},
  projects: {id: 'projects', label: 'Projects', motion: 'frame', accent: '#d6a15f', secondary: '#67b47a', deep: '#244d36'},
  about: {id: 'about', label: 'About', motion: 'timeline', accent: '#ff9d69', secondary: '#e35f58', deep: '#672733'},
  contact: {id: 'contact', label: 'Contact', motion: 'radar', accent: '#42d8ca', secondary: '#ff704f', deep: '#063d48'},
  quote: {id: 'quote', label: 'Request a quote', motion: 'connector', accent: '#cce94b', secondary: '#ff684d', deep: '#10274f'},
  editorial: {id: 'editorial', label: 'Page', motion: 'timeline', accent: '#38dcf1', secondary: '#ef5c43', deep: '#1b344c'},
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
