export type PageVisual = {
  id: string;
  image: string;
  alt: string;
  label: string;
  signal: string;
  composition: string;
  serial: string;
  briefLabel: string;
  focus: [string, string, string];
  position?: string;
};

/*
 * Residential visual standard: Cyprus/EAC 230V 50Hz, predominantly TT,
 * BS 1363 Type G accessories and IEC/BS EN protection. Finished homes keep
 * wiring concealed; show at most one proportionate domestic consumer unit.
 */
const heroIdentities = {
  services: {composition: 'constellation', serial: '00 / 05', briefLabel: 'Five disciplines · one handover', focus: ['Plan', 'Build', 'Connect']},
  installations: {composition: 'blueprint', serial: '01 / POWER', briefLabel: 'Installation brief', focus: ['Survey', 'Distribute', 'Certify']},
  'lighting-design': {composition: 'gallery', serial: '02 / LIGHT', briefLabel: 'Design note', focus: ['Mood', 'Layer', 'Specify']},
  automation: {composition: 'console', serial: '03 / LOGIC', briefLabel: 'Scene logic', focus: ['Sense', 'Orchestrate', 'Control']},
  security: {composition: 'scan', serial: '04 / GUARD', briefLabel: 'Protection perimeter', focus: ['Deter', 'Detect', 'Record']},
  maintenance: {composition: 'diagnostic', serial: '05 / FAULT', briefLabel: 'Diagnostic protocol', focus: ['Trace', 'Repair', 'Prevent']},
  shop: {composition: 'runway', serial: 'SHOP / 00', briefLabel: 'Showroom map', focus: ['Browse', 'Compare', 'Ask']},
  'shop-lighting': {composition: 'orbit', serial: 'SHOP / LIGHT', briefLabel: 'Lighting collection', focus: ['Decorative', 'Task', 'Architectural']},
  'shop-appliances': {composition: 'domestic', serial: 'SHOP / HOME', briefLabel: 'Everyday collection', focus: ['Coffee', 'Kitchen', 'Home']},
  'shop-offers': {composition: 'sale-poster', serial: 'SHOP / LIVE', briefLabel: 'Current edit', focus: ['Live', 'Limited', 'Local']},
  'shop-catalogues': {composition: 'folio', serial: 'FOLIO / 09', briefLabel: 'Open the collection', focus: ['Browse', 'Compare', 'Download']},
  projects: {composition: 'archive', serial: 'ARCHIVE / 01', briefLabel: 'Proof in place', focus: ['Design', 'Install', 'Handover']},
  about: {composition: 'manifesto', serial: 'SINCE / 1985', briefLabel: 'The NK thread', focus: ['Experience', 'Family', 'Team']},
  contact: {composition: 'signal', serial: 'DIRECT / NK', briefLabel: 'Fastest route to the right person', focus: ['Call', 'Visit', 'Email']},
  quote: {composition: 'plan', serial: 'START / 01', briefLabel: 'Before we price', focus: ['Property', 'Scope', 'Timing']},
  product: {composition: 'product-focus', serial: 'OBJECT / 01', briefLabel: 'Product detail', focus: ['Detail', 'Availability', 'Support']},
  editorial: {composition: 'editorial', serial: 'NK / FIELD', briefLabel: 'Field note', focus: ['Discover', 'Define', 'Deliver']},
} satisfies Record<string, Pick<PageVisual, 'composition' | 'serial' | 'briefLabel' | 'focus'>>;

const visual = (
  id: keyof typeof heroIdentities,
  image: string,
  alt: string,
  label: string,
  signal: string,
  position = 'center',
): PageVisual => ({id, image: `assets/heroes/${image}.webp`, alt, label, signal, position, ...heroIdentities[id]});

const pageVisuals = {
  services: visual(
    'services',
    'services-overview-cyprus-v3',
    'A completed Cyprus villa with concealed electrical services, lighting, automation and discreet security',
    'One coordinated team',
    'PLAN / BUILD / CONNECT',
    '62% center',
  ),
  installations: visual(
    'installations',
    'electrical-installations-cyprus-v3',
    'An electrician testing one medium domestic consumer unit in a finished Cyprus home',
    'Power made visible',
    'ROUTE / PROTECT / TEST',
    '63% center',
  ),
  lightingDesign: visual(
    'lighting-design',
    'lighting-design',
    'Layered architectural lighting shaping a warm contemporary interior',
    'Atmosphere engineered',
    'AMBIENCE / FOCUS / CONTROL',
    '58% center',
  ),
  automation: visual(
    'automation',
    'smart-home-automation',
    'A home control panel coordinating blinds, lighting and outdoor systems',
    'One touch, many systems',
    'SCENES / COMFORT / CONTROL',
    '66% center',
  ),
  security: visual(
    'security',
    'security-systems',
    'A technician commissioning CCTV, access control and alarm equipment',
    'Protection connected',
    'WATCH / VERIFY / RESPOND',
    '64% center',
  ),
  maintenance: visual(
    'maintenance',
    'maintenance',
    'An electrician tracing a fault with thermal imaging and test instruments',
    'The fault has nowhere to hide',
    'FIND / RESTORE / PREVENT',
    '64% center',
  ),
  shop: visual(
    'shop',
    'shop-overview-awe-v2',
    'A vivid electrical showroom with lighting displays and practical home appliances',
    'The showroom, opened up',
    'LIGHT / HOME / EVERYDAY',
    '61% center',
  ),
  shopLighting: visual(
    'shop-lighting',
    'shop-lighting',
    'A bold lighting gallery filled with pendants, wall lights and architectural fixtures',
    'Every kind of light',
    'DECORATIVE / TASK / ARCHITECTURAL',
    '55% center',
  ),
  appliances: visual(
    'shop-appliances',
    'shop-appliances',
    'A colourful appliance studio with coffee, cooking, cooling and cleaning products',
    'Daily life, better equipped',
    'COFFEE / KITCHEN / HOME',
    '54% center',
  ),
  offers: visual(
    'shop-offers',
    'shop-offers',
    'Lighting and appliance products staged in an energetic sale campaign',
    'The bright side of a better price',
    'LIVE / LIMITED / LOCAL',
    '53% center',
  ),
  catalogues: visual(
    'shop-catalogues',
    'shop-catalogues',
    'Open lighting catalogues surrounded by fixture photographs, finish samples and a glowing lamp',
    'Turn the page. Find the light.',
    'BROWSE / COMPARE / SPECIFY',
    '61% center',
  ),
  projects: visual(
    'projects',
    'projects-cyprus-v3',
    'A completed Cyprus villa with concealed wiring, finished lighting and a discreet EAC-style supply pole',
    'The work, switched on',
    'BUILT / TESTED / WORKING',
    '56% center',
  ),
  about: visual(
    'about',
    'about',
    'A multigenerational electrical team planning together around a project table',
    'Experience around one table',
    'FAMILY / CRAFT / ACCOUNTABILITY',
    '58% center',
  ),
  contact: visual(
    'contact',
    'contact-v2',
    'A customer being welcomed into a warmly lit local electrical showroom',
    'A real team, within reach',
    'CALL / VISIT / CONNECT',
    '63% center',
  ),
  quote: visual(
    'quote',
    'request-quote-cyprus-v3',
    'A Cyprus homeowner and electrician reviewing plans, finishes and a switched Type G socket sample',
    'Your project starts here',
    'DESCRIBE / REVIEW / PRICE',
    '63% center',
  ),
  product: visual(
    'product',
    'shop-overview',
    'A colourful electrical showroom with lighting and home products',
    'One product, clearly considered',
    'DETAIL / AVAILABILITY / SUPPORT',
    '61% center',
  ),
  editorial: visual(
    'editorial',
    'editorial-cyprus-v3',
    'A finished Cyprus home with concealed electrical services, layered lighting and smart controls',
    'Ideas, fully connected',
    'SYSTEM / DETAIL / POSSIBILITY',
    '68% center',
  ),
} satisfies Record<string, PageVisual>;

export function pageVisualForPath(pathname: string): PageVisual | undefined {
  const path = pathname.replace(/\/+$/, '') || '/';

  if (path === '/') return undefined;
  if (path === '/services/electrical-installations') return pageVisuals.installations;
  if (path === '/services/lighting-design') return pageVisuals.lightingDesign;
  if (path === '/services/smart-home-automation') return pageVisuals.automation;
  if (path === '/services/security-systems') return pageVisuals.security;
  if (path === '/services/maintenance') return pageVisuals.maintenance;
  if (path === '/services') return pageVisuals.services;
  if (path.startsWith('/shop/product/')) return pageVisuals.product;
  if (path === '/shop/catalogues') return pageVisuals.catalogues;
  if (path === '/shop/lighting') return pageVisuals.shopLighting;
  if (path === '/shop/appliances') return pageVisuals.appliances;
  if (path === '/shop/offers') return pageVisuals.offers;
  if (path === '/shop') return pageVisuals.shop;
  if (path === '/projects' || path.startsWith('/projects/')) return pageVisuals.projects;
  if (path === '/about') return pageVisuals.about;
  if (path === '/contact') return pageVisuals.contact;
  if (path === '/request-a-quote') return pageVisuals.quote;
  return pageVisuals.editorial;
}
