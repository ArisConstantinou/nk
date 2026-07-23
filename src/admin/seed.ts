import {defaultContent} from '../content';
import {adminApi} from './api';
import type {ContentKind} from './types';

type SeedRecord = {kind: ContentKind; slug: string; title: string; data: Record<string, unknown>};

const services: SeedRecord[] = [
  {kind: 'service', slug: 'electrical-installations', title: 'Electrical installations', data: {code: 'SRV-01', shortTitle: 'Electrical installations from survey to tested handover.', description: 'Electrical planning and installation for homes, renovations, workplaces, retail and hospitality projects.', intro: 'We assess the supply and loads, plan circuits and protection, install containment and cabling, complete final connections, then inspect, test and hand over the system.', deliverables: ['Load, circuit and distribution planning', 'Boards, protection and supply coordination', 'Containment, cabling and final connections', 'Inspection, testing and handover'], applications: ['Homeowners building or renovating', 'Developers, architects and contractors', 'Workplaces, retail and hospitality', 'Extensions and existing-system upgrades']}},
  {kind: 'service', slug: 'lighting-design', title: 'Lighting design & specification', data: {code: 'SRV-02', shortTitle: 'Lighting design for comfortable, usable spaces.', description: 'We plan lighting layouts and specify fittings, colour temperature, glare control and scenes for homes, hospitality, retail and outdoor spaces.', intro: 'We solve uneven light, glare, poor task lighting and late coordination by aligning lighting layers, luminaires, controls and electrical points before installation.', deliverables: ['Room-by-room lighting layouts', 'Fixture and luminaire specification', 'Colour temperature, output and glare review', 'Control scenes and electrical coordination'], applications: ['Homeowners and renovation teams', 'Architects and interior designers', 'Hospitality, retail and showroom operators', 'Exterior and landscape project teams']}},
  {kind: 'service', slug: 'smart-home-automation', title: 'Smart home & automation', data: {code: 'SRV-03', shortTitle: 'Smart control for rooms, routines and connected systems.', description: 'We plan and commission KNX controls for lighting, shading, climate and selected security functions in smart homes, renovations and workplaces.', intro: 'We replace fragmented or difficult controls by defining inputs, outputs, scenes, interfaces and responsibilities before cabling and programming begin.', deliverables: ['KNX inputs, outputs and system plan', 'Lighting, shading and climate control', 'Scenes, schedules and sensor logic', 'Commissioning, training and handover'], applications: ['Owners planning a new smart home', 'High-spec residential renovation teams', 'Offices and meeting spaces', 'Properties with fragmented or difficult controls']}},
  {kind: 'service', slug: 'security-systems', title: 'Security & low-voltage systems', data: {code: 'SRV-04', shortTitle: 'Security planned around risks, access and response.', description: 'We plan CCTV, intrusion alarms, access control and entry systems for homes, retail, offices and shared buildings.', intro: 'We prevent blind spots, misplaced devices and fragmented alerts by coordinating coverage, detection, recording, access, power and data before installation.', deliverables: ['CCTV coverage and recording', 'Intrusion alarm and detection', 'Access control and entry systems', 'Power, data and structured cabling coordination'], applications: ['Homeowners and residential developments', 'Retail, stock and storage areas', 'Offices and shared buildings', 'Sites needing controlled entry or remote visibility']}},
  {kind: 'service', slug: 'maintenance', title: 'Maintenance & fault support', data: {code: 'SRV-05', shortTitle: 'Electrical faults diagnosed, repaired and retested.', description: 'We diagnose faults, complete agreed repairs and provide planned maintenance for existing homes, rental properties and business premises.', intro: 'We trace nuisance trips, failed circuits, lighting faults and control problems from the reported symptom to the tested cause before recommending corrective work.', deliverables: ['On-site fault diagnosis', 'Agreed corrective electrical work', 'Planned preventive maintenance', 'Upgrade and replacement recommendations'], applications: ['Homeowners and landlords', 'Facility and property managers', 'Retail, hospitality and office operators', 'Owners planning maintenance or upgrades']}},
];

const seo: SeedRecord[] = [
  ['home', '/', 'NK Electrical | Electrical Services, Lighting & Appliances', 'Electrical installations, lighting design, smart systems and products from NK Electrical in Strovolos, Cyprus.'],
  ['services', '/services', 'Electrical Services in Cyprus | NK Electrical', 'Explore electrical installations, lighting design, automation, security systems, maintenance and fault support.'],
  ['shop', '/shop', 'Lighting & Electrical Products | NK Electrical Shop', 'Browse lighting, appliances and electrical products available through NK Electrical in Strovolos.'],
  ['projects', '/projects', 'Completed Electrical Projects | NK Electrical Cyprus', 'Filter completed residential, commercial, retail and mixed-use electrical and LED lighting projects.'],
  ['about', '/about', 'About NK Electrical | History, Team & Partners', 'Meet the NK Electrical team, learn the company history since 1985 and explore its partnerships.'],
  ['contact', '/contact', 'Contact NK Electrical | Strovolos, Cyprus', 'Find contact details, opening hours, location, phone, email and the enquiry form.'],
  ['request-a-quote', '/request-a-quote', 'Request an Electrical Quote | NK Electrical', 'Request a quote for electrical installation, lighting, smart systems, maintenance or products.'],
].map(([slug, route, metaTitle, metaDescription]) => ({kind: 'seo' as const, slug, title: `${String(slug).replaceAll('-', ' ')} SEO`, data: {route, metaTitle, metaDescription, canonical: '', indexable: true, ogImage: ''}}));

const sitePages: SeedRecord[] = [
  ['services', '/services', 'Electrical services in Cyprus', 'Choose the service', 'that matches the work.', 'For homes, project teams and operating businesses: compare electrical installations, lighting design, automation, security and maintenance, then send the relevant brief.'],
  ['shop', '/shop', 'NK Electrical Shop', 'Products organised', 'for practical browsing.', 'Browse products only: lighting, coffee, kitchen, cooling and household equipment.'],
  ['catalogues', '/shop/catalogues', 'Shop catalogues & downloads', 'Official collections,', 'ready to open.', 'Browse original PDF catalogues by brand and lighting purpose.'],
  ['projects', '/projects', 'Complete installed project archive', 'Electrical work,', 'shown on site.', 'Filter completed electrical projects by sector and open every verified record.'],
  ['about', '/about', 'The people behind every installation', defaultContent.aboutTitle, '', defaultContent.aboutBody],
  ['contact', '/contact', 'Electrical enquiry', 'Your enquiry,', 'sent to the right specialist.', defaultContent.contactNote],
  ['request-a-quote', '/request-a-quote', 'Request a quote', 'Give us the useful details.', 'We will route the request.', 'Share the property, location, requirement and preferred timing.'],
].map(([slug, route, eyebrow, heroTitle, heroAccent, heroBody]) => ({kind: 'page' as const, slug, title: `${String(slug).replaceAll('-', ' ')} page`, data: {route, navigationTitle: String(slug).replaceAll('-', ' '), eyebrow, heroTitle, heroAccent, heroTail: '', heroBody, introTitle: heroTitle, introAccent: heroAccent, introBody: heroBody, sectionTitle: '', sectionBody: '', heroImage: '', sections: []}}));

export const navigationSeed = [
  ...[['Services', '/services'], ['Shop', '/shop'], ['Projects', '/projects'], ['About', '/about'], ['Contact', '/contact']].map(([label, url], position) => ({menu: 'primary', label, url, description: '', active: true, position})),
  ...[
    ['Electrical Installations', '/services/electrical-installations', 'Planning, distribution, wiring, protection and testing.'],
    ['Lighting Design', '/services/lighting-design', 'Interior, exterior and architectural lighting specification.'],
    ['Smart Home & Automation', '/services/smart-home-automation', 'KNX, controls, scenes and connected building systems.'],
    ['Security & Low Voltage', '/services/security-systems', 'CCTV, alarms, access control, sound and vision.'],
    ['Maintenance & Faults', '/services/maintenance', 'Diagnosis, repair and planned electrical maintenance.'],
  ].map(([label, url, description], position) => ({menu: 'services', label, url, description, active: true, position})),
  ...[
    ['All Products', '/shop', 'Browse the complete lighting and appliance collection.'],
    ['Lighting Products', '/shop/lighting', 'Decorative, architectural and practical lighting.'],
    ['Appliances', '/shop/appliances', 'Kitchen, coffee, cooling and household products.'],
    ['Offers', '/shop/offers', 'Browse every current NK Electrical offer in one visual collection.'],
    ['Catalogues & Downloads', '/shop/catalogues', 'Official brand catalogues and product PDFs.'],
  ].map(([label, url, description], position) => ({menu: 'shop', label, url, description, active: true, position})),
  ...[['Electrical Installations', '/services/electrical-installations'], ['Lighting Design', '/services/lighting-design'], ['Smart Home & Automation', '/services/smart-home-automation'], ['Security & Low Voltage', '/services/security-systems'], ['Maintenance & Faults', '/services/maintenance']].map(([label, url], position) => ({menu: 'footer-services', label, url, description: '', active: true, position})),
  ...[['All Products', '/shop'], ['Lighting Products', '/shop/lighting'], ['Appliances', '/shop/appliances'], ['Offers', '/shop/offers'], ['Catalogues & Downloads', '/shop/catalogues']].map(([label, url], position) => ({menu: 'footer-shop', label, url, description: '', active: true, position})),
  ...[['Projects', '/projects'], ['About', '/about'], ['Contact', '/contact'], ['Request a Quote', '/request-a-quote']].map(([label, url], position) => ({menu: 'footer-company', label, url, description: '', active: true, position})),
];

export const formsSeed = [
  {slug: 'contact', name: 'Contact enquiry', recipient: 'info@nk-electrical.com', submitLabel: 'Send enquiry', successMessage: 'Thank you. Your enquiry has been received and will be routed to the right specialist.', active: true, position: 0, fields: [
    {id: 'name', name: 'name', label: 'Your name', type: 'text', required: true, active: true, placeholder: '', options: []},
    {id: 'phone', name: 'phone', label: 'Phone', type: 'tel', required: true, active: true, placeholder: '', options: []},
    {id: 'subject', name: 'subject', label: 'Starting point', type: 'select', required: true, active: true, placeholder: '', options: ['New electrical project', 'Electrical installation', 'Lighting selection', 'Appliance enquiry', 'Smart home system', 'Electrical support']},
    {id: 'message', name: 'message', label: 'Tell us about the work', type: 'textarea', required: true, active: true, placeholder: '', options: []},
  ]},
  {slug: 'quote', name: 'Request a quote', recipient: 'info@nk-electrical.com', submitLabel: 'Send quote request', successMessage: 'Thank you. Your quote request has been recorded for review.', active: true, position: 1, fields: [
    {id: 'name', name: 'name', label: 'Your name', type: 'text', required: true, active: true, placeholder: '', options: []},
    {id: 'phone', name: 'phone', label: 'Phone', type: 'tel', required: true, active: true, placeholder: '', options: []},
    {id: 'email', name: 'email', label: 'Email', type: 'email', required: true, active: true, placeholder: '', options: []},
    {id: 'location', name: 'location', label: 'Project location', type: 'text', required: true, active: true, placeholder: 'City or area', options: []},
    {id: 'property-type', name: 'property-type', label: 'Property type', type: 'select', required: true, active: true, placeholder: '', options: ['Private residence', 'Apartment building', 'Office', 'Retail', 'Hospitality', 'Public or shared space']},
    {id: 'work-type', name: 'work-type', label: 'Requirement', type: 'select', required: true, active: true, placeholder: '', options: ['Electrical installation', 'Lighting design', 'Smart home & automation', 'Security & low voltage', 'Maintenance or fault', 'Product enquiry']},
    {id: 'timeframe', name: 'timeframe', label: 'Preferred timeframe', type: 'select', required: true, active: true, placeholder: '', options: ['Planning stage', 'Within 1 month', 'Within 3 months', 'Within 6 months', 'Urgent support']},
    {id: 'message', name: 'message', label: 'Project details', type: 'textarea', required: true, active: true, placeholder: 'Scope, drawings available, existing installation and access or timing constraints', options: []},
  ]},
  {slug: 'project-discussion', name: 'Project discussion', recipient: 'info@nk-electrical.com', submitLabel: 'Send discussion request', successMessage: 'Thank you. The project discussion has been recorded.', active: true, position: 2, fields: [
    {id: 'name', name: 'name', label: 'Your name', type: 'text', required: true, active: true, placeholder: '', options: []},
    {id: 'phone', name: 'phone', label: 'Phone', type: 'tel', required: true, active: true, placeholder: '', options: []},
    {id: 'project', name: 'project', label: 'Project', type: 'text', required: true, active: true, placeholder: '', options: []},
    {id: 'message', name: 'message', label: 'What would you like to discuss?', type: 'textarea', required: true, active: true, placeholder: '', options: []},
  ]},
];

function catalogueSlug(name: string, index: number) {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${index + 1}`;
}

export function buildAdminSeed(): SeedRecord[] {
  const theme = defaultContent.themeContent.tech;
  return [
    {kind: 'page', slug: 'homepage', title: 'Homepage', data: {...theme, route: '/', navigationTitle: 'Home', introTitle: theme.heroTitle, introAccent: theme.heroAccent, introBody: theme.heroBody, heroImage: defaultContent.heroImage, sections: []}},
    ...sitePages,
    ...services,
    ...defaultContent.products.map(product => ({kind: 'product' as const, slug: product.id, title: product.name, data: {category: product.category, season: product.season, space: product.space, image: product.image, note: product.note}})),
    ...defaultContent.catalogues.map((catalogue, index) => ({kind: 'catalogue' as const, slug: catalogueSlug(catalogue.name, index), title: catalogue.name, data: {brand: catalogue.brand, year: catalogue.year, focus: catalogue.focus, url: catalogue.url}})),
    ...defaultContent.projects.map(project => ({kind: 'project' as const, slug: project.id, title: project.name, data: {number: project.number, image: project.image, type: project.type, category: project.category, completionDate: project.completionDate, text: project.text, systems: project.systems}})),
    {kind: 'company', slug: 'company-overview', title: 'Company overview', data: {heading: defaultContent.aboutTitle, introduction: defaultContent.aboutBody, history: '1985 — Ntinos and Eliana establish NK Electrical.\nToday — Engineering, lighting, sales and installation specialists coordinate each project.\nNext — More connected and energy-aware electrical spaces for Cyprus.', partnerships: 'ACA Lighting\nNova Luce\nVIOKEF\nArchitects, designers and contractors'}},
    ...seo,
    {kind: 'settings', slug: 'business-details', title: 'Business details', data: {address: '72 Makedonitissis Str., Strovolos 2057, Cyprus', phone: '+357 22 494145', email: 'info@nk-electrical.com', hours: 'Mon, Tue, Thu, Fri: 09:00–18:00\nWednesday, Saturday: 09:00–14:00\nSunday: Closed', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=72+Makedonitissis+Strovolos+2057+Cyprus', enquiryRecipient: 'info@nk-electrical.com', brandName: 'NK Electrical', brandTagline: 'Power · Light · Control', logoUrl: '/assets/nk-logo-transparent-v2.png', logoAlt: 'NK Electrical', faviconUrl: '/assets/nk-favicon.png', siteName: 'NK Electrical', language: 'en', locale: 'en_CY', phones: [{id: 'primary-phone', label: 'Main', number: '+357 22 494145', active: true, primary: true}], emails: [{id: 'primary-email', label: 'General', address: 'info@nk-electrical.com', active: true, primary: true}], locations: [{id: 'primary-location', label: 'Main store', address: '72 Makedonitissis Str., Strovolos 2057, Cyprus', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=72+Makedonitissis+Strovolos+2057+Cyprus', active: true, primary: true}], openingHours: [{id: 'store-hours', label: 'Store', hours: 'Mon, Tue, Thu, Fri: 09:00–18:00\nWednesday, Saturday: 09:00–14:00\nSunday: Closed', active: true}], socialLinks: [{id: 'linkedin', platform: 'LinkedIn', icon: 'linkedin', iconUrl: '', url: 'https://www.linkedin.com/company/12901535/', active: true, newTab: true, placements: ['header', 'footer', 'mobile', 'contact']}, {id: 'facebook', platform: 'Facebook', icon: 'facebook', iconUrl: '', url: 'https://www.facebook.com/nkelectricalltd', active: true, newTab: true, placements: ['header', 'footer', 'mobile', 'contact']}, {id: 'instagram-lighting', platform: 'Instagram · Lighting', icon: 'instagram', iconUrl: '', url: 'https://www.instagram.com/nk_electrical/', active: true, newTab: true, placements: ['header', 'footer', 'mobile', 'contact']}, {id: 'instagram-appliances', platform: 'Instagram · Appliances', icon: 'instagram', iconUrl: '', url: 'https://www.instagram.com/nk.electrical.ltd/', active: true, newTab: true, placements: ['header', 'footer', 'mobile', 'contact']}], header: {sticky: true, showTagline: true, showSocials: true}, footer: {showSocials: true, showContact: true, showHours: false}}},
  ];
}

let seeded = false;
let seedRequest: Promise<void> | null = null;
export async function ensureAdminSeed() {
  if (seeded) return;
  if (!seedRequest) {
    seedRequest = adminApi<{needsSeed: boolean}>('/content/seed')
      .then(status => status.needsSeed ? adminApi('/content/seed', {method: 'POST', body: JSON.stringify({records: buildAdminSeed(), navigation: navigationSeed, forms: formsSeed})}) : undefined)
      .then(() => { seeded = true; })
      .finally(() => { seedRequest = null; });
  }
  await seedRequest;
}
