import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  CircuitBoard,
  Eye,
  FileText,
  Lightbulb,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  Siren,
  Snowflake,
  Sparkles,
  Sun,
  Wrench,
  Zap,
} from 'lucide-react';
import {useMemo, type ReactNode} from 'react';
import {Link} from 'react-router-dom';
import {useContent} from '../context/ContentContext';
import type {Product} from '../types';
import {publicAsset} from '../utils/assets';
import {GlobalLiveSearch} from './GlobalLiveSearch';
import {ResponsiveImage} from './ResponsiveImage';

const OFFER_SHOWCASE_CUTOUTS: Record<string, string> = {
  'led-wall-light-35': publicAsset('assets/products/offers-cutouts/led-wall-light-35-cutout.png'),
  'surface-spot-light': publicAsset('assets/products/offers-cutouts/surface-spot-light-cutout.png'),
  'pothos-1': publicAsset('assets/products/offers-cutouts/pothos-1-cutout.png'),
};

export const HEADER_CAMPAIGNS = [
  {id: '01', slug: 'fault', name: 'Fault Response', short: 'Fault', utility: 'POWER FAILURE HELP'},
  {id: '02', slug: 'summer', name: 'Cyprus Summer', short: 'Heat', utility: 'BEAT THE HEAT'},
  {id: '03', slug: 'offers', name: 'Live Offers', short: 'Offers', utility: 'CURRENT OFFERS'},
  {id: '04', slug: 'security', name: 'Security Watch', short: 'Security', utility: 'SECURITY KNOW-HOW'},
  {id: '05', slug: 'sun-control', name: 'Sun Control', short: 'Sun', utility: 'COOLER HOME GUIDE'},
  {id: '06', slug: 'outdoor', name: 'Summer Nights', short: 'Outdoor', utility: 'OUTDOOR PRODUCT PICKS'},
  {id: '07', slug: 'lighting', name: 'Lighting Clinic', short: 'Lighting', utility: 'LIGHTING KNOW-HOW'},
  {id: '08', slug: 'catalogues', name: '2026 Library', short: 'PDFs', utility: 'PRODUCTS & CATALOGUES'},
  {id: '09', slug: 'installation', name: 'Build It Once', short: 'Build', utility: 'BUILDING ADVICE'},
  {id: '10', slug: 'projects', name: 'Built Proof', short: 'Proof', utility: 'REAL PROJECT PROOF'},
] as const;

export type HeaderCampaignId = typeof HEADER_CAMPAIGNS[number]['id'];

type Action = {label: string; to: string; primary?: boolean; external?: boolean};
type Stat = {value: string; label: string};
type Campaign = {
  id: HeaderCampaignId;
  slug: typeof HEADER_CAMPAIGNS[number]['slug'];
  name: string;
  kicker: string;
  title: string;
  body: string;
  image: string;
  alt: string;
  actions: Action[];
  stats: Stat[];
  points: string[];
  products?: Product[];
};

const serviceImage = (slug: string) => `assets/heroes/${slug}.webp`;

function CampaignHeroImage({campaign}: {campaign: Campaign}) {
  const fallbackSrc = campaign.id === '10' ? publicAsset('assets/projects/residential-exterior.webp') : '';
  return <ResponsiveImage
    src={campaign.image}
    alt={campaign.alt}
    loading="eager"
    decoding="async"
    fetchPriority="high"
    onError={fallbackSrc ? event => {
      const image = event.currentTarget;
      if (image.dataset.fallbackApplied === 'true') return;
      image.dataset.fallbackApplied = 'true';
      image.parentElement?.querySelector('source')?.remove();
      image.src = fallbackSrc;
    } : undefined}
  />;
}

function CampaignLink({action, className = ''}: {action: Action; className?: string}) {
  const classes = `nk-campaign-action ${action.primary ? 'is-primary' : ''} ${className}`.trim();
  const content = <>{action.label}<ArrowRight aria-hidden="true"/></>;
  if (action.external || !action.to.startsWith('/')) return <a className={classes} href={action.to}>{content}</a>;
  return <Link className={classes} to={action.to}>{content}</Link>;
}

function Brand({compact = false}: {compact?: boolean}) {
  const {settings} = useContent();
  return <Link className={`nk-campaign-brand ${compact ? 'is-compact' : ''}`} to="/" aria-label={`${settings.brandName} home`}>
    <ResponsiveImage src={settings.logoUrl || publicAsset('assets/nk-logo-transparent-v2.png')} alt={settings.logoAlt} loading="eager" decoding="async" fetchPriority="high"/>
    <span><strong>Electrical</strong><small>POWER · LIGHT · CONTROL</small></span>
  </Link>;
}

function StatRow({stats}: {stats: Stat[]}) {
  return <div className="nk-campaign-stats">{stats.map(stat => <span key={`${stat.value}-${stat.label}`}><b>{stat.value}</b><small>{stat.label}</small></span>)}</div>;
}

function PointList({points}: {points: string[]}) {
  return <ul className="nk-campaign-points">{points.map(point => <li key={point}><Check aria-hidden="true"/>{point}</li>)}</ul>;
}

function ProductTile({product, index = 0}: {product: Product; index?: number}) {
  const productImage = OFFER_SHOWCASE_CUTOUTS[product.id] || product.image;
  return <Link className="nk-campaign-product" to={`/shop/product/${encodeURIComponent(product.id)}`}>
    <span className="nk-campaign-product__image"><ResponsiveImage src={productImage} alt="" loading="eager" decoding="async"/></span>
    <span><small>{String(index + 1).padStart(2, '0')} / {product.category}</small><strong>{product.name.replace(/&amp;|&#x27;/g, match => match === '&amp;' ? '&' : "'")}</strong></span>
    <ArrowRight aria-hidden="true"/>
  </Link>;
}

function FaultHeader({campaign, phone}: {campaign: Campaign; phone: string}) {
  return <div className="nk-campaign-design nk-campaign-design--fault">
    <aside className="nk-fault-rail"><Brand compact/><span><Siren/>FAULT SUPPORT</span><small>Maintenance · Diagnosis · Repair</small></aside>
    <section className="nk-fault-copy"><p>{campaign.kicker}</p><h1>{campaign.title}</h1><div className="nk-fault-symptoms"><span>Power loss</span><span>RCD trips</span><span>Lighting fault</span><span>Existing system</span></div></section>
    <aside className="nk-fault-action"><Wrench/><strong>Tell us what failed.</strong><p>{campaign.body}</p><CampaignLink action={campaign.actions[0]}/><a href={`tel:${phone.replace(/[^+\d]/g, '')}`}><Phone/>{phone}</a></aside>
    <div className="nk-fault-process">{['Inspect', 'Diagnose', 'Repair', 'Verify'].map((label, index) => <span key={label}><b>0{index + 1}</b>{label}{index < 3 && <ChevronRight/>}</span>)}</div>
  </div>;
}

function SummerHeader({campaign}: {campaign: Campaign}) {
  const products = campaign.products || [];
  return <div className="nk-campaign-design nk-campaign-design--summer">
    <Brand/>
    <section className="nk-summer-copy"><p><Sun/> {campaign.kicker}</p><h1>{campaign.title}</h1><span>{campaign.body}</span><div className="nk-campaign-actions">{campaign.actions.map(action => <CampaignLink action={action} key={action.label}/>)}</div></section>
    <figure className="nk-summer-visual"><ResponsiveImage src={campaign.image} alt={campaign.alt} loading="eager" decoding="async" fetchPriority="high"/><figcaption><Snowflake/><span><b>{campaign.stats[0].value}</b>{campaign.stats[0].label}</span></figcaption></figure>
    <div className="nk-summer-products">{products.slice(0, 3).map((product, index) => <ProductTile product={product} index={index} key={product.id}/>)}</div>
  </div>;
}

function OffersHeader({campaign}: {campaign: Campaign}) {
  const products = campaign.products || [];
  return <div className="nk-campaign-design nk-campaign-design--offers">
    <header><Brand compact/><span><Sparkles/> LIVE SHOWROOM EDIT</span><strong>{campaign.stats[0].value}</strong><small>ACTIVE OFFERS</small></header>
    <section className="nk-offers-feature"><div><p>{campaign.kicker}</p><h1>{campaign.title}</h1><span>{campaign.body}</span><CampaignLink action={campaign.actions[0]}/></div>{products[0] && <ProductTile product={products[0]}/>}</section>
    <aside className="nk-offers-stack">{products.slice(1, 3).map((product, index) => <ProductTile product={product} index={index + 1} key={product.id}/>)}<CampaignLink action={campaign.actions[1]}/></aside>
    <footer><span>NO INVENTED DISCOUNTS</span><span>REAL OFFER RECORDS</span><span>ASK ABOUT AVAILABILITY</span></footer>
  </div>;
}

function SecurityHeader({campaign}: {campaign: Campaign}) {
  return <div className="nk-campaign-design nk-campaign-design--security">
    <figure><ResponsiveImage src={campaign.image} alt={campaign.alt} loading="eager" decoding="async" fetchPriority="high"/><span><Eye/> PROTECTION / CONNECTED</span></figure>
    <section><Brand compact/><p>{campaign.kicker}</p><h1>{campaign.title}</h1><span>{campaign.body}</span><PointList points={campaign.points}/></section>
    <aside><ShieldCheck/><strong>One protection plan.</strong><p>Cameras, detection and entry systems designed as one system.</p>{campaign.actions.map(action => <CampaignLink action={action} key={action.label}/>)}</aside>
  </div>;
}

function SunControlHeader({campaign}: {campaign: Campaign}) {
  return <div className="nk-campaign-design nk-campaign-design--sun-control">
    <div className="nk-sun-brand"><Brand/><span>SUMMER CONTROL PLAN</span></div>
    <section><p>{campaign.kicker}</p><h1>{campaign.title}</h1><span>{campaign.body}</span><div className="nk-campaign-actions">{campaign.actions.map(action => <CampaignLink action={action} key={action.label}/>)}</div></section>
    <div className="nk-sun-orbit"><Sun/><span>DAYLIGHT</span><b>→</b><CircuitBoard/><span>AUTOMATION</span></div>
    <aside>{campaign.points.map((point, index) => <span key={point}><b>0{index + 1}</b><strong>{point}</strong><small>{index === 0 ? 'Move before heat builds' : index === 1 ? 'Use light only where needed' : 'Repeat the right response'}</small></span>)}</aside>
  </div>;
}

function OutdoorHeader({campaign}: {campaign: Campaign}) {
  const product = campaign.products?.[0];
  return <div className="nk-campaign-design nk-campaign-design--outdoor">
    <figure><ResponsiveImage src={campaign.image} alt={campaign.alt} loading="eager" decoding="async" fetchPriority="high"/><i/></figure>
    <header><Brand compact/><span>SUMMER NIGHTS / OUTDOOR LIGHT</span></header>
    <section><p>{campaign.kicker}</p><h1>{campaign.title}</h1><span>{campaign.body}</span><div className="nk-campaign-actions">{campaign.actions.map(action => <CampaignLink action={action} key={action.label}/>)}</div></section>
    <aside><Lightbulb/>{product && <><ResponsiveImage src={product.image} alt="" loading="eager" decoding="async"/><small>PRODUCT PICK</small><strong>{product.name}</strong></>}<b>{campaign.stats[0].value}<span>{campaign.stats[0].label}</span></b></aside>
  </div>;
}

function LightingHeader({campaign}: {campaign: Campaign}) {
  return <div className="nk-campaign-design nk-campaign-design--lighting">
    <div className="nk-lighting-mast"><Brand compact/><span>LIGHTING CLINIC</span><small>AMBIENCE · TASK · GLARE · CONTROL</small></div>
    <figure><ResponsiveImage src={campaign.image} alt={campaign.alt} loading="eager" decoding="async" fetchPriority="high"/><span>THE ROOM IS FINISHED</span></figure>
    <section>
      <div className="nk-lighting-copy"><p>{campaign.kicker}</p><h1>{campaign.title}</h1><span>{campaign.body}</span></div>
      <div className="nk-lighting-diagnostic" aria-label="Lighting design layers">
        <span className="nk-lighting-diagnostic__status"><i/> LIVE ROOM READ</span>
        <strong>Three layers.<br/>One atmosphere.</strong>
        <div>{campaign.stats.map((stat, index) => <span key={stat.value}>
          <b>0{index + 1}</b><small>{stat.value}</small><em>{stat.label}</em>
        </span>)}</div>
      </div>
      <PointList points={campaign.points}/>
    </section>
    <aside><strong>Fix the feeling, not just the fitting.</strong>{campaign.actions.map(action => <CampaignLink action={action} key={action.label}/>)}</aside>
  </div>;
}

function CatalogueHeader({campaign}: {campaign: Campaign}) {
  return <div className="nk-campaign-design nk-campaign-design--catalogues">
    <header><Brand compact/><span><BookOpen/> SPECIFICATION LIBRARY</span><b>{campaign.stats[1].value} BRANDS</b></header>
    <section><p>{campaign.kicker}</p><h1>{campaign.title}</h1><span>{campaign.body}</span><GlobalLiveSearch className="nk-campaign-search" maxResults={6}/><div className="nk-catalogue-trends"><span>Try:</span><b>fans</b><b>outdoor</b><b>2026</b><b>solar</b></div></section>
    <aside>{['ACA Lighting 2026', 'Nova Luce 2026', 'VIOKEF 2026'].map((name, index) => <Link to="/shop/catalogues" key={name}><FileText/><span><small>PDF / 0{index + 1}</small><strong>{name}</strong></span><ArrowRight/></Link>)}</aside>
  </div>;
}

function InstallationHeader({campaign}: {campaign: Campaign}) {
  return <div className="nk-campaign-design nk-campaign-design--installation">
    <header><Brand compact/><span><Zap/> NEW BUILD / RENOVATION</span></header>
    <section><p>{campaign.kicker}</p><h1>{campaign.title}</h1><span>{campaign.body}</span><div className="nk-campaign-actions">{campaign.actions.map(action => <CampaignLink action={action} key={action.label}/>)}</div></section>
    <div className="nk-installation-board">{campaign.points.map((point, index) => <span key={point}><b>0{index + 1}</b><CircuitBoard/><strong>{point}</strong><small>{index === 0 ? 'Before equipment selection' : index === 1 ? 'Before walls close' : 'Before handover'}</small></span>)}</div>
    <aside><ResponsiveImage src={campaign.image} alt={campaign.alt} loading="eager" decoding="async" fetchPriority="high"/><span><Check/> TESTED HANDOVER</span></aside>
  </div>;
}

function ProjectsHeader({campaign, projects}: {campaign: Campaign; projects: Array<{id: string; name: string; image: string; category: string; systems: string[]}>}) {
  return <div className="nk-campaign-design nk-campaign-design--projects">
    <figure><CampaignHeroImage campaign={campaign}/><span><Check/> DELIVERED / CYPRUS</span><Brand compact/></figure>
    <section><p>{campaign.kicker}</p><h1>{campaign.title}</h1><span>{campaign.body}</span><StatRow stats={campaign.stats}/><div className="nk-campaign-actions">{campaign.actions.map(action => <CampaignLink action={action} key={action.label}/>)}</div></section>
    <aside>{projects.slice(0, 2).map((project, index) => <Link to="/projects" key={project.id}><ResponsiveImage src={project.image} alt="" loading="eager" decoding="async"/><span><small>0{index + 1} / {project.category}</small><strong>{project.name}</strong></span><ArrowRight/></Link>)}</aside>
  </div>;
}

const unifiedStoryDetails: Record<HeaderCampaignId, [string, string, string]> = {
  '01': ['Start with the symptom', 'Trace the actual cause', 'Finish with a verified repair'],
  '02': ['Quiet everyday airflow', 'Portable room relief', 'Flexible cooling options'],
  '03': ['Live website records', 'Images and model names', 'Confirm showroom availability'],
  '04': ['See and record activity', 'Detect before entry', 'Control doors and gates'],
  '05': ['Move before heat builds', 'Use light only where needed', 'Repeat the right response'],
  '06': ['Safe, welcoming arrival', 'Useful light where you sit', 'Low-glare movement routes'],
  '07': ['Build depth and ambience', 'Put light on the task', 'Control comfort and scenes'],
  '08': ['Search the product range', 'Use real product imagery', 'Open original supplier PDFs'],
  '09': ['Before equipment selection', 'Before walls close', 'Before handover'],
  '10': ['Homes and apartments', 'Offices and workplaces', 'Shops and mixed-use spaces'],
};

const unifiedStoryMedia: Record<HeaderCampaignId, string> = {
  '01': 'DIAGNOSED / REPAIRED',
  '02': 'COOLING / READY',
  '03': 'LIVE OFFER RECORDS',
  '04': 'CONNECTED PROTECTION',
  '05': 'AUTOMATION / ACTIVE',
  '06': 'AFTER-SUNSET LIGHT',
  '07': 'ROOM / BALANCED',
  '08': 'ORIGINAL CATALOGUES',
  '09': 'TESTED HANDOVER',
  '10': 'DELIVERED / CYPRUS',
};

const unifiedStoryIcons: Record<HeaderCampaignId, typeof Zap> = {
  '01': Siren,
  '02': Snowflake,
  '03': Sparkles,
  '04': ShieldCheck,
  '05': Sun,
  '06': Lightbulb,
  '07': Lightbulb,
  '08': BookOpen,
  '09': CircuitBoard,
  '10': MapPin,
};

function UnifiedCampaignHeader({campaign}: {campaign: Campaign}) {
  const StoryIcon = unifiedStoryIcons[campaign.id];
  const details = unifiedStoryDetails[campaign.id];
  const offerProducts = campaign.id === '03' ? (campaign.products || []).slice(0, 3) : [];
  return <div className={`nk-campaign-design nk-campaign-design--unified nk-campaign-design--unified-${campaign.slug}`} data-unified-story={campaign.id}>
    <section className="nk-unified-story__copy">
      <p>{campaign.kicker}</p>
      <h1>{campaign.title}</h1>
      <span>{campaign.body}</span>
      <div className="nk-campaign-actions">{campaign.actions.map(action => <CampaignLink action={action} key={action.label}/>)}</div>
    </section>
    <div className="nk-unified-story__board">
      {campaign.points.slice(0, 3).map((point, index) => {
        const offerProduct = offerProducts[index];
        const offerImage = offerProduct ? OFFER_SHOWCASE_CUTOUTS[offerProduct.id] || offerProduct.image : '';
        return <article className={offerProduct ? 'has-offer-preview' : undefined} key={point}>
          <b>0{index + 1}</b>
          {offerProduct
            ? <Link className="nk-unified-story__offer-thumb" to={`/shop/product/${encodeURIComponent(offerProduct.id)}`} aria-label={`View offer: ${offerProduct.name}`}>
                <ResponsiveImage src={offerImage} alt="" loading="eager" decoding="async"/>
              </Link>
            : <StoryIcon aria-hidden="true"/>}
          <strong>{point}</strong>
          <small>{offerProduct ? offerProduct.name.replace(/&amp;|&#x27;/g, match => match === '&amp;' ? '&' : "'") : details[index]}</small>
        </article>;
      })}
    </div>
    <figure className="nk-unified-story__media">
      <CampaignHeroImage campaign={campaign}/>
      <figcaption><Check aria-hidden="true"/>{unifiedStoryMedia[campaign.id]}</figcaption>
    </figure>
  </div>;
}

function LegacyCampaignRenderer({campaign}: {campaign: Campaign}) {
  const {content, settings} = useContent();
  switch (campaign.id) {
    case '01': return <FaultHeader campaign={campaign} phone={settings.phone}/>;
    case '02': return <SummerHeader campaign={campaign}/>;
    case '03': return <OffersHeader campaign={campaign}/>;
    case '04': return <SecurityHeader campaign={campaign}/>;
    case '05': return <SunControlHeader campaign={campaign}/>;
    case '06': return <OutdoorHeader campaign={campaign}/>;
    case '07': return <LightingHeader campaign={campaign}/>;
    case '08': return <CatalogueHeader campaign={campaign}/>;
    case '09': return <InstallationHeader campaign={campaign}/>;
    default: return <ProjectsHeader campaign={campaign} projects={content.projects}/>;
  }
}

function CampaignRenderer({campaign}: {campaign: Campaign}) {
  return <>
    <UnifiedCampaignHeader campaign={campaign}/>
    <div className="nk-campaign-legacy-mobile"><LegacyCampaignRenderer campaign={campaign}/></div>
  </>;
}

export function useHeaderCampaigns(): Campaign[] {
  const {content, settings} = useContent();
  return useMemo(() => {
    const products = content.products;
    const cooling = products.filter(product => product.category === 'Cooling');
    const fans = cooling.filter(product => /fan/i.test(product.name));
    const offers = products.filter(product => product.offer);
    const outdoor = products.filter(product => product.space === 'Outdoor');
    const currentCatalogues = content.catalogues.filter(catalogue => catalogue.year === '2026');
    const phone = settings.phone.replace(/[^+\d]/g, '');
    return [
      {
        id: '01', slug: 'fault', name: 'Fault Response', kicker: 'POWER WENT OUT? DON’T GUESS.', title: 'Tell us what failed.',
        body: 'Share the location, symptoms and what changed. We will route the fault to the right technical person.', image: serviceImage('maintenance'), alt: 'Electrical fault diagnosis',
        actions: [{label: 'Describe the fault', to: '/request-a-quote?service=maintenance', primary: true}, {label: settings.phone, to: `tel:${phone}`, external: true}],
        stats: [{value: '01', label: 'Inspect'}, {value: '02', label: 'Diagnose'}, {value: '03', label: 'Repair'}], points: ['Fault diagnosis', 'Corrective work', 'Upgrade advice'],
      },
      {
        id: '02', slug: 'summer', name: 'Cyprus Summer', kicker: 'CYPRUS HEAT / PRACTICAL RELIEF', title: 'The heat is here. Move the air.',
        body: 'Ceiling, stand and tower fans, air coolers and portable A/C for the rooms that need relief now.', image: 'assets/generated/season-summer.webp', alt: 'Summer cooling at home',
        actions: [{label: 'Fight the heat', to: '/shop/appliances', primary: true}, {label: 'Compare cooling', to: '/shop'}],
        stats: [{value: String(cooling.length), label: 'cooling products'}, {value: String(fans.length), label: 'fan models'}, {value: String(Math.max(0, cooling.length - fans.length)), label: 'coolers / portable A/C'}], points: ['Ceiling fans', 'Air coolers', 'Portable A/C'], products: cooling.slice(0, 3),
      },
      {
        id: '03', slug: 'offers', name: 'Live Offers', kicker: 'CURRENT OFFERS / ONE VISUAL EDIT', title: `${offers.length} offers. No treasure hunt.`,
        body: 'Every current NK Electrical offer collected in one place before you visit the showroom.', image: 'assets/heroes/shop-offers.webp', alt: 'Current NK Electrical offers',
        actions: [{label: `See all ${offers.length} offers`, to: '/shop/offers', primary: true}, {label: 'Ask availability', to: '/contact'}],
        stats: [{value: String(offers.length), label: 'active offers'}, {value: '01', label: 'visual collection'}, {value: '0', label: 'invented prices'}], points: ['Real offer records', 'Product images', 'Availability check'], products: offers.slice(0, 3),
      },
      {
        id: '04', slug: 'security', name: 'Security Watch', kicker: 'LEAVING HOME?', title: 'Keep eyes on it.',
        body: 'Plan cameras, alarms, access control and remote monitoring as one connected protection system.', image: serviceImage('security-systems'), alt: 'Connected home security system',
        actions: [{label: 'Plan my security', to: '/request-a-quote?service=security-systems', primary: true}, {label: 'Explore security', to: '/services/security-systems'}],
        stats: [{value: 'CCTV', label: 'recording'}, {value: 'ALARM', label: 'detection'}, {value: 'ENTRY', label: 'access'}], points: ['CCTV & recording', 'Alarm & detection', 'Access control & entry'],
      },
      {
        id: '05', slug: 'sun-control', name: 'Sun Control', kicker: 'FIGHT THE SUN INTELLIGENTLY', title: 'Before the A/C has to.',
        body: 'Coordinate blinds, lighting, schedules and sensors around the way your home is actually used.', image: serviceImage('smart-home-automation'), alt: 'Automated shading and lighting control',
        actions: [{label: 'Map my smart home', to: '/request-a-quote?service=smart-home-automation', primary: true}, {label: 'See automation', to: '/services/smart-home-automation'}],
        stats: [{value: 'KNX', label: 'planning'}, {value: 'AUTO', label: 'shading'}, {value: 'SCENE', label: 'schedules'}], points: ['Shading control', 'Lighting control', 'Scenes, schedules & sensors'],
      },
      {
        id: '06', slug: 'outdoor', name: 'Summer Nights', kicker: 'AFTER SUNSET / OUTDOOR', title: 'Your garden shouldn’t disappear.',
        body: 'Shape entrances, terraces, paths and landscape areas with practical outdoor light — not random glare.', image: 'assets/projects/residential-exterior.webp', alt: 'Residential exterior lighting after sunset',
        actions: [{label: 'Browse outdoor light', to: '/shop/lighting', primary: true}, {label: 'Plan the lighting', to: '/services/lighting-design'}],
        stats: [{value: String(outdoor.length), label: 'outdoor products'}, {value: 'SOLAR', label: 'options'}, {value: 'SENSOR', label: 'options'}], points: ['Entrances', 'Terraces', 'Paths'], products: outdoor.slice(0, 1),
      },
      {
        id: '07', slug: 'lighting', name: 'Lighting Clinic', kicker: 'WHY DOES THE LIGHT FEEL WRONG?', title: 'The fitting is only half the answer.',
        body: 'Layer ambience, task light, glare control and fixture placement before the ceiling fixes the decision.', image: serviceImage('lighting-design'), alt: 'Designed architectural lighting',
        actions: [{label: 'Shape my lighting', to: '/request-a-quote?service=lighting-design', primary: true}, {label: 'See lighting design', to: '/services/lighting-design'}],
        stats: [{value: 'LAYER', label: 'ambience'}, {value: 'TASK', label: 'function'}, {value: 'GLARE', label: 'control'}], points: ['Lighting layers & layouts', 'Colour temperature & glare', 'Control scenes'],
      },
      {
        id: '08', slug: 'catalogues', name: '2026 Library', kicker: 'THE NEW LIGHTING BOOKS ARE OPEN', title: 'Find the exact product code.',
        body: 'Search products, images and original ACA, Nova Luce and VIOKEF PDF collections in one place.', image: 'assets/heroes/shop-catalogues.webp', alt: 'Official lighting catalogues',
        actions: [{label: 'Open catalogues', to: '/shop/catalogues', primary: true}, {label: 'Browse lighting', to: '/shop/lighting'}],
        stats: [{value: String(content.catalogues.length), label: 'official PDFs'}, {value: '3', label: 'brands'}, {value: String(currentCatalogues.length), label: '2026 books'}], points: ['Products', 'Images', 'PDF catalogues'],
      },
      {
        id: '09', slug: 'installation', name: 'Build It Once', kicker: 'BUILDING OR RENOVATING?', title: 'Plan the power once.',
        body: 'Coordinate loads, circuits, protection, containment and final connections before late changes become expensive.', image: 'assets/heroes/electrical-installations-cyprus-v3.webp', alt: 'Electrical installation planning and delivery',
        actions: [{label: 'Start an installation brief', to: '/request-a-quote?service=electrical-installations', primary: true}, {label: 'See how we install', to: '/services/electrical-installations'}],
        stats: [{value: '01', label: 'plan'}, {value: '02', label: 'install'}, {value: '03', label: 'test'}], points: ['Load & circuit planning', 'Boards, protection & cabling', 'Inspection, testing & handover'],
      },
      {
        id: '10', slug: 'projects', name: 'Built Proof', kicker: 'DON’T TAKE OUR WORD FOR IT', title: 'See where we switched on.',
        body: 'Real electrical and LED-lighting installations across residences, offices, retail and mixed-use buildings.', image: 'assets/heroes/projects-cyprus-v3.webp?v=20260722-2', alt: 'Completed NK Electrical projects in Cyprus',
        actions: [{label: `Explore ${content.projects.length} projects`, to: '/projects', primary: true}, {label: 'Start my project', to: '/request-a-quote'}],
        stats: [{value: String(content.projects.length), label: 'documented projects'}, {value: '4', label: 'building types'}, {value: '1985', label: 'NK since'}], points: ['Residential', 'Commercial', 'Retail'],
      },
    ] as Campaign[];
  }, [content, settings]);
}

export function HeaderCampaignPicker({activeId, onSelect, prefix, suffix}: {activeId: string; onSelect: (id: HeaderCampaignId) => void; prefix?: ReactNode; suffix?: ReactNode}) {
  const active = HEADER_CAMPAIGNS.find(item => item.id === activeId) || HEADER_CAMPAIGNS[0];
  return <div className="nk-campaign-picker" aria-label="Choose a highlight">
    {prefix}
    <span className="nk-campaign-picker__name"><small>HIGHLIGHTS</small><strong>{active.id} · {active.name}</strong></span>
    <nav>{HEADER_CAMPAIGNS.map(item => <button className={item.id === active.id ? 'active' : ''} type="button" onClick={() => onSelect(item.id)} aria-label={`${item.id} ${item.name}`} data-label={item.short} key={item.id}><i/><span>{item.id}</span></button>)}</nav>
    {suffix}
  </div>;
}

export function HeaderCampaignShowcase({campaignId}: {campaignId: string}) {
  const campaigns = useHeaderCampaigns();
  const campaign = campaigns.find(item => item.id === campaignId) || campaigns[0];
  return <div className={`nk-campaign-canvas nk-campaign-canvas--${campaign.slug}`} data-campaign={campaign.id}><CampaignRenderer campaign={campaign}/></div>;
}
