import {useState, type FormEvent} from 'react';
import {ArrowRight, ArrowUpRight, Check, FileText, Lightbulb, ShieldCheck, SlidersHorizontal, Wrench, Zap} from 'lucide-react';
import type {LucideIcon} from 'lucide-react';
import {Link, useParams, useSearchParams} from 'react-router-dom';
import {PageIntro} from './PublicPages';
import {useContent} from '../context/ContentContext';
import {serviceLinks} from '../navigation';

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
  return <>
    <PageIntro eyebrow="Electrical services" title="Specialist services," italic="one accountable team." body="Explore services only: electrical installations, lighting design, automation, security and maintenance. Products remain in the Shop."/>
    <section className="ia-service-grid section" aria-label="NK Electrical services">
      {serviceDefinitions.map(({slug, code, title, description, Icon}) => <Link className="ia-service-card" to={`/services/${slug}`} key={slug}>
        <span>{code}</span><Icon/><h2>{title}</h2><p>{description}</p><b>Explore service <ArrowRight/></b>
      </Link>)}
    </section>
    <section className="ia-boundary section"><div><small>SERVICES ≠ PRODUCTS</small><h2>Need equipment rather than installation work?</h2><p>The Shop contains lighting products, appliances and downloadable catalogues. Service enquiries stay here.</p></div><Link to="/shop">Go to the Shop <ArrowRight/></Link></section>
  </>;
}

export function ServiceDetailPage() {
  const {service = ''} = useParams();
  const item = serviceDefinitions.find(entry => entry.slug === service);
  if (!item) return <section className="not-found"><span>Service not found</span><h1>This service route has moved.</h1><Link to="/services">View all services</Link></section>;
  const Icon = item.Icon;
  return <>
    <PageIntro eyebrow={item.title} title={item.shortTitle} body={item.description}/>
    <section className="ia-service-detail section">
      <div className="ia-service-summary"><span>{item.code}</span><Icon/><h2>What this service covers</h2><p>{item.intro}</p><Link className="button copper" to={`/request-a-quote?service=${item.slug}`}>Request a quote <ArrowUpRight/></Link></div>
      <div className="ia-service-lists">
        <article><small>DELIVERABLES</small><h3>A clear scope before site work.</h3><ul>{item.deliverables.map(point => <li key={point}><Check/>{point}</li>)}</ul></article>
        <article><small>SUITABLE FOR</small><h3>Projects and existing properties.</h3><ul>{item.applications.map(point => <li key={point}><Check/>{point}</li>)}</ul></article>
      </div>
    </section>
    <section className="ia-conversion-band section"><div><small>NEXT STEP</small><h2>Define the requirement before choosing the equipment.</h2></div><Link to="/request-a-quote">Request a Quote <ArrowRight/></Link></section>
  </>;
}

export function ShopCategoryPage() {
  const {category = ''} = useParams();
  const {content} = useContent();
  const isLighting = category === 'lighting';
  const isAppliances = category === 'appliances';
  if (!isLighting && !isAppliances) return <section className="not-found"><span>Category not found</span><h1>This shop category has moved.</h1><Link to="/shop">View all products</Link></section>;
  const products = content.products.filter(product => isLighting ? product.category === 'Lighting' : product.category !== 'Lighting');
  return <>
    <PageIntro eyebrow="NK Electrical Shop" title={isLighting ? 'Lighting products,' : 'Electrical appliances,'} italic="separate from services." body={isLighting ? 'Browse lighting products available through the NK Electrical showroom. Design and specification services remain under Services.' : 'Browse kitchen, coffee, cooling and household products without mixing them with installation services.'}/>
    <section className="ia-shop-toolbar section"><div><span>{products.length} products</span><h2>{isLighting ? 'Lighting collection' : 'Appliance collection'}</h2></div><Link to="/shop/catalogues"><FileText/> Catalogues & downloads</Link></section>
    <section className="product-grid section">{products.map(product => <Link to={`/shop/product/${product.id}`} className="product-card" key={product.id}><div className="product-image"><img src={product.image} alt={product.name}/><span>View product <ArrowUpRight/></span></div><div className="product-info"><small>{product.category} · {product.season}</small><h3>{product.name}</h3><p>{product.note}</p></div></Link>)}</section>
  </>;
}

export function QuotePage() {
  const [prepared, setPrepared] = useState(false);
  const [params] = useSearchParams();
  const requestedService = params.get('service');
  const defaultWorkType = requestedService === 'lighting-design' ? 'Lighting design' : requestedService === 'smart-home-automation' ? 'Smart home & automation' : requestedService === 'security-systems' ? 'Security & low voltage' : requestedService === 'maintenance' ? 'Maintenance or fault' : 'Electrical installation';
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const subject = encodeURIComponent(`Quote request: ${data.get('workType')} — ${data.get('name')}`);
    const body = encodeURIComponent(`Name: ${data.get('name')}\nPhone: ${data.get('phone')}\nEmail: ${data.get('email')}\nLocation: ${data.get('location')}\nProperty: ${data.get('propertyType')}\nRequirement: ${data.get('workType')}\nPreferred timeframe: ${data.get('timeframe')}\n\nProject details:\n${data.get('message')}`);
    window.location.href = `mailto:info@nk-electrical.com?subject=${subject}&body=${body}`;
    setPrepared(true);
  };
  return <>
    <PageIntro eyebrow="Request a quote" title="Give us the useful details." italic="We will route the request." body="Share the property, location, requirement and preferred timing. NK Electrical will direct the request to the appropriate service or product specialist."/>
    <section className="ia-quote-layout section">
      <aside><small>WHAT HAPPENS NEXT</small><h2>A practical first response.</h2><ol><li><b>01</b><span>We review the requirement and route it internally.</span></li><li><b>02</b><span>We identify missing drawings, site details or product information.</span></li><li><b>03</b><span>The appropriate specialist continues the conversation.</span></li></ol><p>For urgent electrical faults, call <a href="tel:+35722494145">+357 22 494145</a>.</p></aside>
      <form className="contact-form" onSubmit={submit}>
        <div className="form-intro"><span>PROJECT INTAKE</span><h2>Request a Quote</h2></div>
        <label>Your name<input required name="name" autoComplete="name"/></label>
        <label>Phone<input required name="phone" type="tel" autoComplete="tel"/></label>
        <label>Email<input required name="email" type="email" autoComplete="email"/></label>
        <label>Project location<input required name="location" autoComplete="address-level2" placeholder="City or area"/></label>
        <label>Property type<select name="propertyType" defaultValue="Private residence"><option>Private residence</option><option>Apartment building</option><option>Office</option><option>Retail</option><option>Hospitality</option><option>Public or shared space</option></select></label>
        <label>Requirement<select name="workType" defaultValue={defaultWorkType}><option value="Electrical installation">Electrical installation</option><option value="Lighting design">Lighting design</option><option value="Smart home & automation">Smart home & automation</option><option value="Security & low voltage">Security & low voltage</option><option value="Maintenance or fault">Maintenance or fault</option><option value="Product enquiry">Product enquiry</option></select></label>
        <label>Preferred timeframe<select name="timeframe" defaultValue="Planning stage"><option>Planning stage</option><option>Within 1 month</option><option>Within 3 months</option><option>Within 6 months</option><option>Urgent support</option></select></label>
        <label>Project details<textarea required name="message" rows={7} placeholder="Scope, drawings available, existing installation and anything that affects access or timing"/></label>
        <button className="button copper" type="submit">Prepare quote request <ArrowUpRight/></button>
        {prepared && <p className="form-note"><Check/> Your email application should now be open with the request prepared.</p>}
      </form>
    </section>
  </>;
}
