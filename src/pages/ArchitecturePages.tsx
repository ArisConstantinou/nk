import {ArrowRight, ArrowUpRight, Check, FileText, Lightbulb, ShieldCheck, SlidersHorizontal, Wrench, Zap} from 'lucide-react';
import type {LucideIcon} from 'lucide-react';
import {Link, useParams, useSearchParams} from 'react-router-dom';
import {PageIntro} from './PublicPages';
import {useContent} from '../context/ContentContext';
import {QuoteScopeComposer} from '../components/QuoteScopeComposer';
import {ServiceSignature} from '../components/ServiceSignature';
import {ModernShopCategoryPage} from './ShopCataloguePage';
import {ExperienceSlot, experienceSlots} from '../interactive';

// Category routes share the CMS catalogue while keeping their own live filters.

type ServiceDefinition = {
  slug: string;
  code: string;
  title: string;
  shortTitle: string;
  heroTitle: string;
  description: string;
  intro: string;
  actionLabel: string;
  nextTitle: string;
  startNeeds: string;
  nextResponse: string;
  interactiveNote: string;
  Icon: LucideIcon;
  deliverables: string[];
  applications: string[];
  audience: string[];
  process: {title: string; body: string}[];
};

const serviceIconMap: Record<string, LucideIcon> = {
  zap: Zap,
  lightbulb: Lightbulb,
  sliders: SlidersHorizontal,
  shield: ShieldCheck,
  wrench: Wrench,
};

const serviceDefinitions: ServiceDefinition[] = [
  {
    slug: 'electrical-installations',
    code: 'SRV-01',
    title: 'Electrical installations',
    shortTitle: 'Power planned and installed safely.',
    heroTitle: 'Electrical installations from survey to tested handover.',
    description: 'Complete electrical planning and installation for residential, commercial, retail and hospitality projects.',
    intro: 'We coordinate loads, distribution, containment, wiring, protection, testing and handover as one accountable installation path.',
    actionLabel: 'Start an installation brief',
    nextTitle: 'Send the site basics. We will review the installation route.',
    startNeeds: 'Share the location, property type, project stage, available drawings and target programme.',
    nextResponse: 'We review the brief, identify any missing technical information and arrange a site survey or scope call.',
    interactiveNote: 'Follow a live installation route from supply and distribution to protection and final circuits.',
    Icon: Zap,
    deliverables: ['Load and circuit planning', 'Distribution boards and protection', 'Containment, cabling and final connections', 'Inspection, testing and handover'],
    applications: ['Private residences', 'Offices and workplaces', 'Retail and hospitality', 'Renovations and extensions'],
    audience: ['Homeowners planning a new build or renovation', 'Developers, architects and construction teams', 'Businesses fitting out or upgrading premises', 'Owners extending or correcting an existing installation'],
    process: [
      {title: 'Brief & drawings', body: 'We collect the property details, available plans, expected loads and programme.'},
      {title: 'Site survey', body: 'We confirm the existing supply, routes, access, project stage and coordination needs.'},
      {title: 'Design, scope & quote', body: 'Circuits, loads, protection, responsibilities and price are defined before site work.'},
      {title: 'First & second fix', body: 'Containment, boxes, cabling, boards, accessories and final connections are installed.'},
      {title: 'Test & hand over', body: 'We inspect, test, document and explain the completed installation before handover.'},
    ],
  },
  {
    slug: 'lighting-design',
    code: 'SRV-02',
    title: 'Lighting design & specification',
    shortTitle: 'Light shaped around the architecture.',
    heroTitle: 'Lighting planned for the space, the task and the people using it.',
    description: 'Lighting concepts, fixture specification and practical coordination for interior, exterior and architectural applications.',
    intro: 'We translate the architecture and daily use into lighting layers, layouts, luminaire choices, colour temperature, glare control and control scenes.',
    actionLabel: 'Shape the lighting brief',
    nextTitle: 'Share the rooms, plans and atmosphere you need.',
    startNeeds: 'Send plans or photos, the spaces in scope, project stage, target date and any preferred lighting references.',
    nextResponse: 'We review the material, confirm whether a site visit is needed and define the lighting design and specification scope.',
    interactiveNote: 'Adjust the concealed-lighting study to see output, colour temperature and the architectural response change together.',
    Icon: Lightbulb,
    deliverables: ['Lighting layers and layouts', 'Luminaire specification', 'Colour temperature and glare review', 'Control scenes and installation coordination'],
    applications: ['Homes and apartments', 'Restaurants and hospitality', 'Retail and showrooms', 'Outdoor and landscape areas'],
    audience: ['Homeowners and interior renovation teams', 'Architects and interior designers', 'Restaurants, hotels, retail and showroom operators', 'Landscape and exterior project teams'],
    process: [
      {title: 'Brief & plans', body: 'We learn how each space is used, the desired atmosphere, budget and programme.'},
      {title: 'Architecture review', body: 'Plans, finishes, daylight, ceiling details and installation constraints are reviewed.'},
      {title: 'Lighting layers', body: 'Ambient, task, accent and decorative lighting are placed around real use.'},
      {title: 'Specify & coordinate', body: 'Luminaires, colour temperature, glare, drivers, controls and electrical points are defined.'},
      {title: 'Approve & support', body: 'The final package is agreed and installation, aiming, scenes and testing are coordinated as required.'},
    ],
  },
  {
    slug: 'smart-home-automation',
    code: 'SRV-03',
    title: 'Smart home & automation',
    shortTitle: 'Control that remains simple to use.',
    heroTitle: 'Smart controls designed around real rooms and daily routines.',
    description: 'KNX and connected-control systems coordinated with power, lighting, shading, security and daily routines.',
    intro: 'The system is planned around how the building is used, with clear controls, dependable scenes and room for future changes.',
    actionLabel: 'Map the control strategy',
    nextTitle: 'Tell us what should respond, when and for whom.',
    startNeeds: 'Share plans, the systems to control, project stage and the main scenes or routines you want in daily use.',
    nextResponse: 'We map inputs, outputs, interfaces and system responsibilities before defining the automation scope.',
    interactiveNote: 'Try the room scenes to see lighting, shading, climate and security respond as one coordinated system.',
    Icon: SlidersHorizontal,
    deliverables: ['KNX system planning', 'Lighting and shading control', 'Scenes, schedules and sensors', 'Commissioning and user handover'],
    applications: ['New smart homes', 'High-spec renovations', 'Workplaces and meeting areas', 'Energy-aware control upgrades'],
    audience: ['Owners planning a new smart home', 'High-spec residential renovation teams', 'Workplaces and meeting spaces', 'Properties replacing fragmented or difficult controls'],
    process: [
      {title: 'Use cases', body: 'We map users, rooms, routines, priorities and the systems that need to work together.'},
      {title: 'System inventory', body: 'Lighting, shading, climate, security, metering and network requirements are reviewed.'},
      {title: 'Control strategy', body: 'KNX topology, inputs, outputs, interfaces, scenes and responsibilities are defined.'},
      {title: 'Install & programme', body: 'Cabling, devices, panels and software are coordinated, installed and integrated.'},
      {title: 'Commission & teach', body: 'Scenes and controls are tested with the client, documented and explained at handover.'},
    ],
  },
  {
    slug: 'security-systems',
    code: 'SRV-04',
    title: 'Security & low-voltage systems',
    shortTitle: 'Connected protection without fragmented contractors.',
    heroTitle: 'Security systems planned around risks, access and response.',
    description: 'CCTV, intrusion alarms, access control and entry systems coordinated with the power, data and building layout.',
    intro: 'We plan coverage, detection, recording, access and alerts early enough for cameras, sensors, panels, power and data points to land in the right places.',
    actionLabel: 'Define the protection brief',
    nextTitle: 'Show us what must be protected and who needs access.',
    startNeeds: 'Share the property type, plans or photos, entrances, priority zones, users and any remote-monitoring requirement.',
    nextResponse: 'We review the risks and access needs, then arrange a survey and define the coverage and system brief.',
    interactiveNote: 'Test the coverage planner to see how camera positions, protected zones and response paths are considered.',
    Icon: ShieldCheck,
    deliverables: ['CCTV and recording systems', 'Alarm and detection systems', 'Access control and entry systems', 'Power, data and structured cabling coordination'],
    applications: ['Private residences', 'Retail and stock areas', 'Offices and shared buildings', 'Remote monitoring requirements'],
    audience: ['Homeowners and residential developments', 'Retail, stock and storage areas', 'Offices and shared buildings', 'Sites requiring controlled entry or remote visibility'],
    process: [
      {title: 'Risk & access brief', body: 'We identify the areas, entrances, users, events and responses the system must cover.'},
      {title: 'Site survey', body: 'Views, blind spots, mounting points, lighting, power, data and access routes are checked.'},
      {title: 'System design', body: 'Camera coverage, detection zones, recording, entry control, alerts and scope are defined.'},
      {title: 'Install & configure', body: 'Cabling, devices, panels, recording and user access are installed and integrated.'},
      {title: 'Test & hand over', body: 'Coverage, alarms, recording, entry rules and notifications are verified with the users.'},
    ],
  },
  {
    slug: 'maintenance',
    code: 'SRV-05',
    title: 'Maintenance & fault support',
    shortTitle: 'Find the fault. Restore the system.',
    heroTitle: 'Electrical faults diagnosed, repaired and verified.',
    description: 'Electrical fault diagnosis, corrective work and planned maintenance for existing installations.',
    intro: 'Start with the symptoms, equipment and property context. The enquiry is routed to the right technical person before the visit.',
    actionLabel: 'Describe the fault',
    nextTitle: 'Describe the symptom before we arrange the right response.',
    startNeeds: 'Tell us what stopped working, when it started, which circuit or equipment is affected, what the breaker or RCD does and whether the issue is urgent.',
    nextResponse: 'A technical person reviews the symptoms, confirms the next safe step and arranges a visit when site testing is required.',
    interactiveNote: 'Walk through a fault trace from supply to load and see how measured evidence narrows the likely cause.',
    Icon: Wrench,
    deliverables: ['Fault diagnosis', 'Corrective electrical work', 'Planned maintenance', 'Upgrade and replacement advice'],
    applications: ['Power and circuit faults', 'Lighting failures', 'Control-system issues', 'Existing installation upgrades'],
    audience: ['Homeowners and landlords', 'Facility and property managers', 'Retail, hospitality and office operators', 'Owners planning preventive maintenance or upgrades'],
    process: [
      {title: 'Symptoms & triage', body: 'You share the fault, affected equipment, timing, breaker behaviour, photos and urgency.'},
      {title: 'Safe first response', body: 'We advise on immediate safety and confirm whether a technical visit is required.'},
      {title: 'Isolate & test', body: 'Supply, protection, circuits, connections and loads are tested in a controlled sequence.'},
      {title: 'Agree the remedy', body: 'The cause, corrective work, replacement needs and cost are explained before proceeding.'},
      {title: 'Repair & verify', body: 'The agreed work is completed, the system is retested and prevention advice is recorded.'},
    ],
  },
];

const sharedServiceProcess = [
  {title: 'Choose the service', body: 'Start with the outcome, problem or system you need help with.'},
  {title: 'Send the basics', body: 'Share the property, location, project stage, timing and any plans or photos.'},
  {title: 'Technical review', body: 'The right specialist reviews the requirement and arranges a survey when needed.'},
  {title: 'Scope & delivery', body: 'Responsibilities, technical work, price and programme are agreed before delivery.'},
  {title: 'Test & hand over', body: 'The completed work is checked, explained and supported after handover.'},
];

export function ServicesPage() {
  const {services} = useContent();
  const items = serviceDefinitions.map(item => {
    const managed = services.find(service => service.slug === item.slug);
    const managedIcon = managed?.icon && managed.icon !== 'zap' ? serviceIconMap[managed.icon] : undefined;
    return {...item, ...managed, Icon: managedIcon || item.Icon};
  });

  return <div className="clarity-page clarity-services-index">
    <section className="clarity-hero clarity-services-hero" aria-labelledby="services-title">
      <div className="clarity-hero__copy">
        <span className="clarity-eyebrow">ELECTRICAL SERVICES IN CYPRUS</span>
        <h1 id="services-title">Choose the work you need. See the full route before you start.</h1>
        <p>NK Electrical plans, installs, integrates, tests and supports five specialist service areas for homes, project teams and operating businesses.</p>
        <div className="clarity-actions">
          <a className="clarity-action clarity-action--primary" href="#service-list">Compare the services <ArrowRight/></a>
          <Link className="clarity-action clarity-action--secondary" to="/request-a-quote">Start a project brief <ArrowRight/></Link>
        </div>
      </div>
      <aside className="clarity-hero__summary">
        <small>THIS SECTION IS FOR</small>
        <h2>Work performed by our team.</h2>
        <p>Electrical installations, lighting design, automation, security and maintenance.</p>
        <div><span>Looking only for equipment?</span><Link to="/shop">Go to the Shop <ArrowRight/></Link></div>
      </aside>
    </section>

    <section className="clarity-section" id="service-list" aria-labelledby="service-list-title">
      <header className="clarity-section__header">
        <div><span className="clarity-eyebrow">WHAT WE DO IN PRACTICE</span><h2 id="service-list-title">Five clear scopes—not one mixed list.</h2></div>
        <p>Every service page shows the work included, suitable project types, delivery steps and the information needed to begin.</p>
      </header>
      <div className="clarity-service-grid" aria-label="NK Electrical services">
        {items.map(item => <Link className="clarity-service-card" to={`/services/${item.slug}`} key={item.slug}>
          <span className="clarity-service-card__icon" data-visual-kind="service" data-visual-slug={item.slug} data-visual-path="icon" data-visual-edit="icon" data-visual-label="Service icon"><item.Icon/></span>
          <small>{item.code}</small>
          <h3 data-visual-kind="service" data-visual-slug={item.slug} data-visual-path="$title" data-visual-edit="text" data-visual-label="Service title">{item.title}</h3>
          <p data-visual-kind="service" data-visual-slug={item.slug} data-visual-path="description" data-visual-edit="text" data-visual-label="Service description" data-visual-multiline="true">{item.description}</p>
          <small><b>Best for:</b> {item.audience.slice(0, 2).join(' · ')}</small>
          <span className="clarity-service-card__link">View scope and steps <ArrowRight/></span>
        </Link>)}
      </div>
    </section>

    <section className="clarity-section clarity-process" aria-labelledby="services-process-title">
      <header className="clarity-section__header">
        <div><span className="clarity-eyebrow">FROM START TO FINISH</span><h2 id="services-process-title">The same clear route, adapted to the service.</h2></div>
        <p>The technical work changes, but the customer always knows what information is needed and what happens next.</p>
      </header>
      <ol className="clarity-process-grid">
        {sharedServiceProcess.map((step, index) => <li key={step.title}><span>{String(index + 1).padStart(2, '0')}</span><h3>{step.title}</h3><p>{step.body}</p></li>)}
      </ol>
    </section>

    <section className="clarity-next-step">
      <div><span className="clarity-eyebrow">NEXT STEP</span><h2>Not sure which service fits?</h2><p>Tell us what you are planning, installing or trying to fix. We will route the brief to the right specialist.</p></div>
      <Link className="clarity-action clarity-action--primary" to="/request-a-quote">Start the project brief <ArrowRight/></Link>
    </section>
  </div>;
}

export function ServiceDetailPage() {
  const {service = ''} = useParams();
  const {services} = useContent();
  const base = serviceDefinitions.find(entry => entry.slug === service);
  const managed = services.find(entry => entry.slug === service);
  const managedIcon = managed?.icon && managed.icon !== 'zap' ? serviceIconMap[managed.icon] : undefined;
  const item = base ? {...base, ...managed, Icon: managedIcon || base.Icon} : undefined;

  if (!item) return <section className="not-found"><span>Service not found</span><h1>This service route has moved.</h1><Link to="/services">View all services</Link></section>;

  const Icon = item.Icon;
  return <div className={`clarity-page clarity-service-detail clarity-service-detail--${item.slug}`}>
    <section className="clarity-hero clarity-service-hero" aria-labelledby="service-title">
      <div className="clarity-hero__copy">
        <nav className="clarity-breadcrumb" aria-label="Breadcrumb"><Link to="/services">Services</Link><span>/</span><span aria-current="page">{item.title}</span></nav>
        <span className="clarity-eyebrow">{item.code} · {item.title}</span>
        <h1 id="service-title">{item.heroTitle}</h1>
        <p data-visual-kind="service" data-visual-slug={item.slug} data-visual-path="description" data-visual-edit="text" data-visual-label="Service description" data-visual-multiline="true">{item.description}</p>
      </div>
      <aside className="clarity-hero__summary">
        <span className="clarity-hero__icon" data-visual-kind="service" data-visual-slug={item.slug} data-visual-path="icon" data-visual-edit="icon" data-visual-label="Service icon"><Icon/></span>
        <small>THIS SERVICE IS FOR</small>
        <ul>{item.audience.slice(0, 3).map(audience => <li key={audience}><Check/>{audience}</li>)}</ul>
      </aside>
    </section>

    <div className="clarity-interactive-block" aria-label={`${item.title} interactive example`}>
      <div className="clarity-interactive-block__label"><span>INTERACTIVE EXAMPLE</span><p>{item.interactiveNote}</p></div>
      {item.slug === 'electrical-installations'
        ? <ExperienceSlot
            slot={experienceSlots.service(item.slug)}
            className="ia-service-experience section"
            label={`${item.title} interactive experience`}
            fallback={<ServiceSignature slug={item.slug}/>}
          />
        : <ServiceSignature slug={item.slug}/>}
    </div>

    <section className="clarity-section clarity-scope" aria-labelledby="service-scope-title">
      <header className="clarity-section__header">
        <div><span className="clarity-eyebrow">WHAT WE DO IN PRACTICE</span><h2 id="service-scope-title">A defined technical scope, not a vague promise.</h2></div>
        <p data-visual-kind="service" data-visual-slug={item.slug} data-visual-path="intro" data-visual-edit="text" data-visual-label="Service introduction" data-visual-multiline="true">{item.intro}</p>
      </header>
      <div className="clarity-scope-grid">
        <article>
          <small>THE WORK INCLUDED</small>
          <ul>{item.deliverables.map((point, index) => <li key={`${point}-${index}`}><Check/><span data-visual-kind="service" data-visual-slug={item.slug} data-visual-path={`deliverables.${index}`} data-visual-edit="text" data-visual-label={`Deliverable ${index + 1}`}>{point}</span></li>)}</ul>
        </article>
        <article>
          <small>WHO IT IS FOR</small>
          <ul>{item.audience.map(audience => <li key={audience}><Check/><span>{audience}</span></li>)}</ul>
        </article>
      </div>
    </section>

    <section className="clarity-section clarity-process" aria-labelledby="service-process-title">
      <header className="clarity-section__header">
        <div><span className="clarity-eyebrow">FROM START TO FINISH</span><h2 id="service-process-title">What happens after you contact us.</h2></div>
        <p>These are the real delivery stages for {item.title.toLowerCase()}, from the information we need first to the completed handover.</p>
      </header>
      <ol className="clarity-process-grid">
        {item.process.map((step, index) => <li key={step.title}><span>{String(index + 1).padStart(2, '0')}</span><h3>{step.title}</h3><p>{step.body}</p></li>)}
      </ol>
    </section>

    <section className="clarity-next-step">
      <div>
        <span className="clarity-eyebrow">YOUR NEXT STEP</span>
        <h2>{item.nextTitle}</h2>
        <p><strong>Send:</strong> {item.startNeeds}</p>
        <p><strong>Then:</strong> {item.nextResponse}</p>
      </div>
      <Link className="clarity-action clarity-action--primary" to={`/request-a-quote?service=${item.slug}`} aria-label={`${item.actionLabel} for ${item.title}`}>
        {item.actionLabel} <ArrowRight/>
      </Link>
    </section>
  </div>;
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
