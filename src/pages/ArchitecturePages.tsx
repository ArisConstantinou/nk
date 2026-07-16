import {ArrowRight, ArrowUpRight, Check, FileText, Lightbulb, ShieldCheck, SlidersHorizontal, Wrench, Zap} from 'lucide-react';
import type {LucideIcon} from 'lucide-react';
import {Link, useParams, useSearchParams} from 'react-router-dom';
import {PageIntro} from './PublicPages';
import {useContent} from '../context/ContentContext';
import {serviceLinks} from '../navigation';
import {ManagedPublicForm} from '../components/ManagedPublicForm';
import {ModernShopCategoryPage} from './ShopCataloguePage';

// Category routes share the CMS catalogue while keeping their own live filters.


type ServiceDefinition = {
  slug: string;
  code: string;
  title: string;
  shortTitle: string;
  description: string;
  intro: string;
  Icon: LucideIcon;
  deliverables: string[];
  applications: string[];
};

const serviceIconMap: Record<string, LucideIcon> = {zap: Zap, lightbulb: Lightbulb, sliders: SlidersHorizontal, shield: ShieldCheck, wrench: Wrench};

const serviceDefinitions: ServiceDefinition[] = [
  {
    slug: 'electrical-installations', code: 'SRV-01', title: 'Electrical installations', shortTitle: 'Power planned and installed safely.', Icon: Zap,
    description: 'Complete electrical planning and installation for residential, commercial, retail and hospitality projects.',
    intro: 'We coordinate loads, distribution, containment, wiring, protection, testing and handover as one accountable installation path.',
    deliverables: ['Load and circuit planning', 'Distribution boards and protection', 'Containment, cabling and final connections', 'Inspection, testing and handover'],
    applications: ['Private residences', 'Offices and workplaces', 'Retail and hospitality', 'Renovations and extensions'],
  },
  {
    slug: 'lighting-design', code: 'SRV-02', title: 'Lighting design & specification', shortTitle: 'Light shaped around the architecture.', Icon: Lightbulb,
    description: 'Lighting concepts, fixture specification and practical coordination for interior, exterior and architectural applications.',
    intro: 'Lighting is treated as a design and technical service—not mixed into the product shop—so ambience, glare, control and installation remain coordinated.',
    deliverables: ['Lighting layers and layouts', 'Luminaire specification', 'Colour temperature and glare review', 'Control scenes and installation coordination'],
    applications: ['Homes and apartments', 'Restaurants and hospitality', 'Retail and showrooms', 'Outdoor and landscape areas'],
  },
  {
    slug: 'smart-home-automation', code: 'SRV-03', title: 'Smart home & automation', shortTitle: 'Control that remains simple to use.', Icon: SlidersHorizontal,
    description: 'KNX and connected-control systems coordinated with power, lighting, shading, security and daily routines.',
    intro: 'The system is planned around how the building is used, with clear controls, dependable scenes and room for future changes.',
    deliverables: ['KNX system planning', 'Lighting and shading control', 'Scenes, schedules and sensors', 'Commissioning and user handover'],
    applications: ['New smart homes', 'High-spec renovations', 'Workplaces and meeting areas', 'Energy-aware control upgrades'],
  },
  {
    slug: 'security-systems', code: 'SRV-04', title: 'Security & low-voltage systems', shortTitle: 'Connected protection without fragmented contractors.', Icon: ShieldCheck,
    description: 'CCTV, alarm, access-control, sound and vision systems integrated with the electrical project.',
    intro: 'Low-voltage systems are planned early so cameras, sensors, panels, data points and user interfaces land in the right places.',
    deliverables: ['CCTV and recording systems', 'Alarm and detection systems', 'Access control and entry systems', 'Sound, vision and structured cabling'],
    applications: ['Private residences', 'Retail and stock areas', 'Offices and shared buildings', 'Remote monitoring requirements'],
  },
  {
    slug: 'maintenance', code: 'SRV-05', title: 'Maintenance & fault support', shortTitle: 'Find the fault. Restore the system.', Icon: Wrench,
    description: 'Electrical fault diagnosis, corrective work and planned maintenance for existing installations.',
    intro: 'Start with the symptoms, equipment and property context. The enquiry is routed to the right technical person before the visit.',
    deliverables: ['Fault diagnosis', 'Corrective electrical work', 'Planned maintenance', 'Upgrade and replacement advice'],
    applications: ['Power and circuit faults', 'Lighting failures', 'Control-system issues', 'Existing installation upgrades'],
  },
];

export function ServicesPage() {
  const {services} = useContent();
  const items = serviceDefinitions.map(item => {const managed = services.find(service => service.slug === item.slug); return {...item, ...managed, Icon: managed ? serviceIconMap[managed.icon] || item.Icon : item.Icon};});
  return <>
    <PageIntro eyebrow="Electrical services" title="Specialist services," italic="one accountable team." body="Explore services only: electrical installations, lighting design, automation, security and maintenance. Products remain in the Shop."/>
    <section className="ia-service-grid section" aria-label="NK Electrical services">
      {items.map(({slug, code, title, description, Icon}) => <Link className="ia-service-card" to={`/services/${slug}`} key={slug}>
        <span data-visual-kind="service" data-visual-slug={slug} data-visual-path="code" data-visual-edit="text" data-visual-label="Service code">{code}</span><span data-visual-kind="service" data-visual-slug={slug} data-visual-path="icon" data-visual-edit="icon" data-visual-label="Service icon"><Icon/></span><h2 data-visual-kind="service" data-visual-slug={slug} data-visual-path="$title" data-visual-edit="text" data-visual-label="Service title">{title}</h2><p data-visual-kind="service" data-visual-slug={slug} data-visual-path="description" data-visual-edit="text" data-visual-label="Service description" data-visual-multiline="true">{description}</p><b>Explore service <ArrowRight/></b>
      </Link>)}
    </section>
    <section className="ia-boundary section"><div><small>SERVICES ≠ PRODUCTS</small><h2>Need equipment rather than installation work?</h2><p>The Shop contains lighting products, appliances and downloadable catalogues. Service enquiries stay here.</p></div><Link to="/shop">Go to the Shop <ArrowRight/></Link></section>
  </>;
}

export function ServiceDetailPage() {
  const {service = ''} = useParams();
  const {services} = useContent();
  const base = serviceDefinitions.find(entry => entry.slug === service);
  const managed = services.find(entry => entry.slug === service);
  const item = base ? {...base, ...managed, Icon: managed ? serviceIconMap[managed.icon] || base.Icon : base.Icon} : undefined;
  if (!item) return <section className="not-found"><span>Service not found</span><h1>This service route has moved.</h1><Link to="/services">View all services</Link></section>;
  const Icon = item.Icon;
  return <>
    <PageIntro eyebrow={item.title} title={item.shortTitle} body={item.description}/>
    <section className="ia-service-detail section">
      <div className="ia-service-summary"><span data-visual-kind="service" data-visual-slug={item.slug} data-visual-path="code" data-visual-edit="text" data-visual-label="Service code">{item.code}</span><span data-visual-kind="service" data-visual-slug={item.slug} data-visual-path="icon" data-visual-edit="icon" data-visual-label="Service icon"><Icon/></span><h2>What this service covers</h2><p data-visual-kind="service" data-visual-slug={item.slug} data-visual-path="intro" data-visual-edit="text" data-visual-label="Service introduction" data-visual-multiline="true">{item.intro}</p><Link className="button copper" to={`/request-a-quote?service=${item.slug}`}>Request a quote <ArrowUpRight/></Link></div>
      <div className="ia-service-lists">
        <article><small>DELIVERABLES</small><h3>A clear scope before site work.</h3><ul>{item.deliverables.map((point, index) => <li key={`${point}-${index}`}><Check/><span data-visual-kind="service" data-visual-slug={item.slug} data-visual-path={`deliverables.${index}`} data-visual-edit="text" data-visual-label={`Deliverable ${index + 1}`}>{point}</span></li>)}</ul></article>
        <article><small>SUITABLE FOR</small><h3>Projects and existing properties.</h3><ul>{item.applications.map((point, index) => <li key={`${point}-${index}`}><Check/><span data-visual-kind="service" data-visual-slug={item.slug} data-visual-path={`applications.${index}`} data-visual-edit="text" data-visual-label={`Application ${index + 1}`}>{point}</span></li>)}</ul></article>
      </div>
    </section>
    <section className="ia-conversion-band section"><div><small>NEXT STEP</small><h2>Define the requirement before choosing the equipment.</h2></div><Link to="/request-a-quote">Request a Quote <ArrowRight/></Link></section>
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
    <PageIntro eyebrow="Request a quote" title="Give us the useful details." italic="We will route the request." body="Share the property, location, requirement and preferred timing. NK Electrical will direct the request to the appropriate specialist."/>
    <section className="ia-quote-layout section"><aside><small>WHAT HAPPENS NEXT</small><h2>A practical first response.</h2><ol><li><b>01</b><span>We review the requirement and route it internally.</span></li><li><b>02</b><span>We identify missing drawings, site details or product information.</span></li><li><b>03</b><span>The appropriate specialist continues the conversation.</span></li></ol><p>For urgent electrical faults, call <a href="tel:+35722494145">+357 22 494145</a>.</p></aside><ManagedPublicForm slug="quote" eyebrow="PROJECT INTAKE" title="Request a Quote" defaults={{'work-type': defaultWorkType}}/></section>
  </>;
}
