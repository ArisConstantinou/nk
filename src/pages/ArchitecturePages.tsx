import {ArrowRight, ArrowUpRight, Check, FileText, Lightbulb, ShieldCheck, SlidersHorizontal, Wrench, Zap} from 'lucide-react';
import type {LucideIcon} from 'lucide-react';
import {lazy, Suspense} from 'react';
import {Link, useParams, useSearchParams} from 'react-router-dom';
import {PageIntro} from './PublicPages';
import {useContent} from '../context/ContentContext';
import {serviceLinks} from '../navigation';
import {ServiceSignature} from '../components/ServiceSignature';
import {QuoteScopeComposer} from '../components/QuoteScopeComposer';
import {ModernShopCategoryPage} from './ShopCataloguePage';
import {ExperienceSlot, experienceSlots} from '../interactive';

const ElectricalInstallationsScrollPage = lazy(() => import('./electrical/ElectricalInstallationsScrollPage')
  .then(module => ({default: module.ElectricalInstallationsScrollPage})));

// Category routes share the CMS catalogue while keeping their own live filters.


type ServiceDefinition = {
  slug: string;
  code: string;
  title: string;
  shortTitle: string;
  description: string;
  intro: string;
  actionSignal: string;
  actionLabel: string;
  Icon: LucideIcon;
  deliverables: string[];
  applications: string[];
};

const serviceIconMap: Record<string, LucideIcon> = {zap: Zap, lightbulb: Lightbulb, sliders: SlidersHorizontal, shield: ShieldCheck, wrench: Wrench};

const serviceDefinitions: ServiceDefinition[] = [
  {
    slug: 'electrical-installations', code: 'SRV-01', title: 'Electrical installations', shortTitle: 'Electrical installations from survey to tested handover.', Icon: Zap,
    description: 'Electrical planning and installation for homes, renovations, workplaces, retail and hospitality projects.',
    intro: 'We assess the supply and loads, plan circuits and protection, install containment and cabling, complete final connections, then inspect, test and hand over the system.',
    actionSignal: 'LOCATION / PLANS / TIMING',
    actionLabel: 'Send your installation brief',
    deliverables: ['Load, circuit and distribution planning', 'Boards, protection and supply coordination', 'Containment, cabling and final connections', 'Inspection, testing and handover'],
    applications: ['Homeowners building or renovating', 'Developers, architects and contractors', 'Workplaces, retail and hospitality', 'Extensions and existing-system upgrades'],
  },
  {
    slug: 'lighting-design', code: 'SRV-02', title: 'Lighting design & specification', shortTitle: 'Lighting design for comfortable, usable spaces.', Icon: Lightbulb,
    description: 'We plan lighting layouts and specify fittings, colour temperature, glare control and scenes for homes, hospitality, retail and outdoor spaces.',
    intro: 'We solve uneven light, glare, poor task lighting and late coordination by aligning lighting layers, luminaires, controls and electrical points before installation.',
    actionSignal: 'PLANS / ROOMS / TIMING',
    actionLabel: 'Send your lighting brief',
    deliverables: ['Room-by-room lighting layouts', 'Fixture and luminaire specification', 'Colour temperature, output and glare review', 'Control scenes and electrical coordination'],
    applications: ['Homeowners and renovation teams', 'Architects and interior designers', 'Hospitality, retail and showroom operators', 'Exterior and landscape project teams'],
  },
  {
    slug: 'smart-home-automation', code: 'SRV-03', title: 'Smart home & automation', shortTitle: 'Smart control for rooms, routines and connected systems.', Icon: SlidersHorizontal,
    description: 'We plan and commission KNX controls for lighting, shading, climate and selected security functions in smart homes, renovations and workplaces.',
    intro: 'We replace fragmented or difficult controls by defining inputs, outputs, scenes, interfaces and responsibilities before cabling and programming begin.',
    actionSignal: 'PLANS / SYSTEMS / ROUTINES',
    actionLabel: 'Send your control brief',
    deliverables: ['KNX inputs, outputs and system plan', 'Lighting, shading and climate control', 'Scenes, schedules and sensor logic', 'Commissioning, training and handover'],
    applications: ['Owners planning a new smart home', 'High-spec residential renovation teams', 'Offices and meeting spaces', 'Properties with fragmented or difficult controls'],
  },
  {
    slug: 'security-systems', code: 'SRV-04', title: 'Security & low-voltage systems', shortTitle: 'Security planned around risks, access and response.', Icon: ShieldCheck,
    description: 'We plan CCTV, intrusion alarms, access control and entry systems for homes, retail, offices and shared buildings.',
    intro: 'We prevent blind spots, misplaced devices and fragmented alerts by coordinating coverage, detection, recording, access, power and data before installation.',
    actionSignal: 'PLANS / ENTRANCES / ZONES',
    actionLabel: 'Send your protection brief',
    deliverables: ['CCTV coverage and recording', 'Intrusion alarm and detection', 'Access control and entry systems', 'Power, data and structured cabling coordination'],
    applications: ['Homeowners and residential developments', 'Retail, stock and storage areas', 'Offices and shared buildings', 'Sites needing controlled entry or remote visibility'],
  },
  {
    slug: 'maintenance', code: 'SRV-05', title: 'Maintenance & fault support', shortTitle: 'Electrical faults diagnosed, repaired and retested.', Icon: Wrench,
    description: 'We diagnose faults, complete agreed repairs and provide planned maintenance for existing homes, rental properties and business premises.',
    intro: 'We trace nuisance trips, failed circuits, lighting faults and control problems from the reported symptom to the tested cause before recommending corrective work.',
    actionSignal: 'SYMPTOM / CIRCUIT / URGENCY',
    actionLabel: 'Send fault details',
    deliverables: ['On-site fault diagnosis', 'Agreed corrective electrical work', 'Planned preventive maintenance', 'Upgrade and replacement recommendations'],
    applications: ['Homeowners and landlords', 'Facility and property managers', 'Retail, hospitality and office operators', 'Owners planning maintenance or upgrades'],
  },
];

export function ServicesPage() {
  const {services} = useContent();
  const items = serviceDefinitions.map(item => {const managed = services.find(service => service.slug === item.slug); return {...item, ...managed, Icon: managed ? serviceIconMap[managed.icon] || item.Icon : item.Icon};});
  return <>
    <PageIntro eyebrow="Electrical services in Cyprus" title="Choose the service" italic="that matches the work." body="For homes, project teams and operating businesses: compare electrical installations, lighting design, automation, security and maintenance, then open the relevant page to see the scope and send a brief."/>
    <section className="ia-service-grid section" aria-label="NK Electrical services">
      {items.map(({slug, code, title, description, Icon}) => <Link className="ia-service-card" to={`/services/${slug}`} key={slug}>
        <span data-visual-kind="service" data-visual-slug={slug} data-visual-path="code" data-visual-edit="text" data-visual-label="Service code">{code}</span><span data-visual-kind="service" data-visual-slug={slug} data-visual-path="icon" data-visual-edit="icon" data-visual-label="Service icon"><Icon/></span><h2 data-visual-kind="service" data-visual-slug={slug} data-visual-path="$title" data-visual-edit="text" data-visual-label="Service title">{title}</h2><p data-visual-kind="service" data-visual-slug={slug} data-visual-path="description" data-visual-edit="text" data-visual-label="Service description" data-visual-multiline="true">{description}</p><b>See scope and next steps <ArrowRight/></b>
      </Link>)}
    </section>
    <section className="ia-boundary section"><div><small>SERVICES OR PRODUCTS</small><h2>Need equipment rather than technical work?</h2><p>Browse lighting products, appliances and catalogues in the Shop. For planning, installation or support, choose a service above.</p></div><Link to="/shop">Browse the Shop <ArrowRight/></Link></section>
  </>;
}

export function ServiceDetailPage() {
  const {service = ''} = useParams();
  const [serviceParams] = useSearchParams();
  const {services} = useContent();
  const base = serviceDefinitions.find(entry => entry.slug === service);
  const managed = services.find(entry => entry.slug === service);
  const item = base ? {...base, ...managed, Icon: managed ? serviceIconMap[managed.icon] || base.Icon : base.Icon} : undefined;
  if (!item) return <section className="not-found"><span>Service not found</span><h1>This service route has moved.</h1><Link to="/services">View all services</Link></section>;
  if (item.slug === 'electrical-installations' && serviceParams.get('view') !== 'classic') return <Suspense fallback={<section
    aria-label="Loading installation story"
    style={{minHeight: 'calc(100svh - var(--command-height, 90px))', background: '#080d0e'}}
  />}>
    <ElectricalInstallationsScrollPage
      title={item.title}
      description={item.description}
      actionLabel={item.actionLabel}
    />
  </Suspense>;
  const Icon = item.Icon;
  const ActionIcon = base?.Icon || item.Icon;
  return <>
    <PageIntro eyebrow={item.title} title={item.shortTitle} body={item.description}/>
    {item.slug === 'electrical-installations'
      ? <ExperienceSlot
          slot={experienceSlots.service(item.slug)}
          className="ia-service-experience section"
          label={`${item.title} interactive experience`}
          fallback={<ServiceSignature slug={item.slug}/>}
        />
      : <ServiceSignature slug={item.slug}/>}
    <section className="ia-service-detail section">
      <div className="ia-service-summary">
        <span data-visual-kind="service" data-visual-slug={item.slug} data-visual-path="code" data-visual-edit="text" data-visual-label="Service code">{item.code}</span>
        <span data-visual-kind="service" data-visual-slug={item.slug} data-visual-path="icon" data-visual-edit="icon" data-visual-label="Service icon"><Icon/></span>
        <h2>What we do and the problem it solves</h2>
        <p data-visual-kind="service" data-visual-slug={item.slug} data-visual-path="intro" data-visual-edit="text" data-visual-label="Service introduction" data-visual-multiline="true">{item.intro}</p>
        <Link className="ia-service-action" to={`/request-a-quote?service=${item.slug}`} aria-label={`${item.actionLabel} for ${item.title}`}>
          <span className="ia-service-action__glyph"><ActionIcon/></span>
          <span className="ia-service-action__copy"><small>{item.actionSignal}</small><strong>{item.actionLabel}</strong></span>
          <span className="ia-service-action__go"><i/><ArrowUpRight/></span>
        </Link>
      </div>
      <div className="ia-service-lists">
        <article><small>WHAT WE DO</small><h3>Practical work included in this service.</h3><ul>{item.deliverables.map((point, index) => <li key={`${point}-${index}`}><Check/><span data-visual-kind="service" data-visual-slug={item.slug} data-visual-path={`deliverables.${index}`} data-visual-edit="text" data-visual-label={`Deliverable ${index + 1}`}>{point}</span></li>)}</ul></article>
        <article><small>WHO IT IS FOR</small><h3>People, properties and situations this service supports.</h3><ul>{item.applications.map((point, index) => <li key={`${point}-${index}`}><Check/><span data-visual-kind="service" data-visual-slug={item.slug} data-visual-path={`applications.${index}`} data-visual-edit="text" data-visual-label={`Application ${index + 1}`}>{point}</span></li>)}</ul></article>
      </div>
    </section>
    <section className="ia-conversion-band section">
      <div><small>YOUR NEXT STEP</small><h2>Send the key details so the right specialist can review them.</h2></div>
      <Link className="ia-route-band-action" to={`/request-a-quote?service=${item.slug}`}>
        <ActionIcon/><span><small>{item.code} / NEXT</small><strong>{item.actionLabel}</strong></span><ArrowRight/>
      </Link>
    </section>
  </>;
}

export function ShopCategoryPage() {
  return <ModernShopCategoryPage/>;
}

function LegacyShopCategoryPage() {
  const {category = ''} = useParams();
  const {content} = useContent();
  const isLighting = category === 'lighting';
  const isAppliances = category === 'appliances';
  if (!isLighting && !isAppliances) return <section className="not-found"><span>Category not found</span><h1>This shop category has moved.</h1><Link to="/shop">View all products</Link></section>;
  const products = content.products.filter(product => isLighting ? product.category === 'Lighting' : product.category !== 'Lighting');
  return <>
    <PageIntro eyebrow="NK Electrical Shop" title={isLighting ? 'Lighting products,' : 'Electrical appliances,'} italic="separate from services." body={isLighting ? 'Browse lighting products available through the NK Electrical showroom. Design and specification services remain under Services.' : 'Browse kitchen, coffee, cooling and household products without mixing them with installation services.'}/>
    <section className="ia-shop-toolbar section"><div><span>{products.length} products</span><h2>{isLighting ? 'Lighting collection' : 'Appliance collection'}</h2></div><Link to="/shop/catalogues"><FileText/> Catalogues & downloads</Link></section>
    <section className="product-grid section">{products.map(product => <Link to={`/shop/product/${product.id}`} className="product-card" key={product.id}><div className="product-image"><img src={product.image} alt={product.name} data-visual-kind="product" data-visual-slug={product.id} data-visual-path="image" data-visual-edit="image" data-visual-label="Product image"/><span>View product <ArrowUpRight/></span></div><div className="product-info"><small><span data-visual-kind="product" data-visual-slug={product.id} data-visual-path="category" data-visual-edit="text" data-visual-label="Product category">{product.category}</span> · <span data-visual-kind="product" data-visual-slug={product.id} data-visual-path="season" data-visual-edit="text" data-visual-label="Product season">{product.season}</span></small><h3 data-visual-kind="product" data-visual-slug={product.id} data-visual-path="$title" data-visual-edit="text" data-visual-label="Product name">{product.name}</h3><p data-visual-kind="product" data-visual-slug={product.id} data-visual-path="note" data-visual-edit="text" data-visual-label="Product description" data-visual-multiline="true">{product.note}</p></div></Link>)}</section>
  </>;
}

export function QuotePage() {
  const [params] = useSearchParams();
  const requestedService = params.get('service');
  const defaultWorkType = requestedService === 'lighting-design' ? 'Lighting design' : requestedService === 'smart-home-automation' ? 'Smart home & automation' : requestedService === 'security-systems' ? 'Security & low voltage' : requestedService === 'maintenance' ? 'Maintenance or fault' : 'Electrical installation';
  return <>
    <PageIntro eyebrow="Project scope builder" title="Define the work." italic="Build a priceable brief." body="Choose the project route, add the site context and review every useful detail before the request enters the NK Electrical workflow."/>
    <QuoteScopeComposer defaultWorkType={defaultWorkType} preferDefault={Boolean(requestedService)}/>
  </>;
}
