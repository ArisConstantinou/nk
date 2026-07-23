import {useEffect, useState} from 'react';
import {
  ArrowRight,
  Building2,
  CircuitBoard,
  Home,
  Lightbulb,
  PlugZap,
  ShieldCheck,
  Store,
  Wrench,
} from 'lucide-react';
import {Link} from 'react-router-dom';
import {useContent} from '../../context/ContentContext';
import {LedSensitivityPanel} from '../../components/LedSensitivityPanel';
import {publicAsset} from '../../utils/assets';
import {getHomePalette, homePaletteChangeEvent, homePaletteOptions, type HomePaletteId} from '../../homePalettes';

const systems = [
  {
    slug: 'electrical-installations',
    label: 'Electrical installations',
    route: '/services/electrical-installations',
    Icon: PlugZap,
    detail: 'We plan circuits and loads, install distribution and wiring, then inspect, test and hand over the completed system.',
    audience: 'New homes, commercial projects, renovations and extensions.',
  },
  {
    slug: 'lighting-design',
    label: 'Lighting design & specification',
    route: '/services/lighting-design',
    Icon: Lightbulb,
    detail: 'We turn the way each space is used into lighting layers, layouts, fixture specifications and practical controls.',
    audience: 'Homes, hospitality, retail, workplaces and outdoor areas.',
  },
  {
    slug: 'smart-home-automation',
    label: 'Smart home & automation',
    route: '/services/smart-home-automation',
    Icon: CircuitBoard,
    detail: 'We coordinate KNX, lighting, shading, climate and security controls around clear everyday routines.',
    audience: 'New smart homes, high-spec renovations and connected workplaces.',
  },
  {
    slug: 'security-systems',
    label: 'Security & low-voltage systems',
    route: '/services/security-systems',
    Icon: ShieldCheck,
    detail: 'We plan and install CCTV, alarms, access control, entry systems and the power and data routes behind them.',
    audience: 'Homes, retail and stock areas, offices and shared buildings.',
  },
  {
    slug: 'maintenance',
    label: 'Maintenance & fault support',
    route: '/services/maintenance',
    Icon: Wrench,
    detail: 'We trace electrical faults, carry out agreed corrective work and plan upgrades or preventive maintenance.',
    audience: 'Existing homes, rental properties, workplaces and operating businesses.',
  },
];

const projectAudiences = [
  {Icon: Home, title: 'Homeowners & renovators', body: 'New homes, extensions, apartment upgrades and occupied properties.'},
  {Icon: Building2, title: 'Developers & project teams', body: 'Coordinated work with architects, engineers, builders and other trades.'},
  {Icon: Store, title: 'Businesses & operators', body: 'Offices, retail, hospitality, shared buildings and existing premises.'},
];

const homeProcess = [
  {number: '01', title: 'Tell us the requirement', body: 'Share the property, location, plans or photos, project stage and target timing.'},
  {number: '02', title: 'Review the site', body: 'We review the information, identify missing details and arrange a survey when needed.'},
  {number: '03', title: 'Define scope & price', body: 'You receive a clear scope, responsibilities, technical direction and quotation.'},
  {number: '04', title: 'Deliver the work', body: 'Our team coordinates the installation, programming or repair with the project team.'},
  {number: '05', title: 'Test & hand over', body: 'We verify the completed work, explain the system and remain available for support.'},
];

export default function ElectricalHome() {
  const {content, services} = useContent();
  const [activePaletteId, setActivePaletteId] = useState<HomePaletteId>(() => getHomePalette());
  const visualPalettes = homePaletteOptions.map(palette => ({
    ...palette,
    image: palette.image ? publicAsset(palette.image) : content.heroImage,
  }));
  const activePalette = visualPalettes.find(palette => palette.id === activePaletteId) || visualPalettes[0];
  const featuredProjects = content.projects.slice(0, 3);

  useEffect(() => {
    const syncPalette = () => setActivePaletteId(getHomePalette());
    window.addEventListener(homePaletteChangeEvent, syncPalette);
    return () => window.removeEventListener(homePaletteChangeEvent, syncPalette);
  }, []);

  return <div className="clarity-page clarity-home">
    <section className="clarity-hero clarity-home-hero" aria-labelledby="home-title">
      <div className="clarity-hero__copy">
        <span className="clarity-eyebrow">NK ELECTRICAL · CYPRUS · SINCE 1985</span>
        <h1 id="home-title">Electrical work, from first brief to tested handover.</h1>
        <p>We plan, install, integrate and support electrical, lighting, automation and security systems for homes, project teams and businesses across Cyprus.</p>
        <div className="clarity-actions">
          <Link className="clarity-action clarity-action--primary" to="/request-a-quote">Start your project <ArrowRight/></Link>
          <Link className="clarity-action clarity-action--secondary" to="/services">Choose a service <ArrowRight/></Link>
        </div>
        <dl className="clarity-hero__facts">
          <div><dt>One team</dt><dd>Plan → install → test → support</dd></div>
          <div><dt>Work types</dt><dd>Residential · commercial · existing systems</dd></div>
        </dl>
      </div>
      <figure className="clarity-hero__media">
        <img
          src={activePalette.image}
          alt={activePalette.alt}
          data-visual-kind="page"
          data-visual-slug="homepage"
          data-visual-path="heroImage"
          data-visual-edit="image"
          data-visual-label="Hero image"
        />
        <figcaption><span>From plans and first fix</span><strong>to safe switch-on and support.</strong></figcaption>
      </figure>
    </section>

    <div className="clarity-interactive-block" aria-label="Interactive lighting example">
      <div className="clarity-interactive-block__label"><span>INTERACTIVE EXAMPLE</span><p>Adjust colour, brightness and movement to see how a lighting decision changes the room in real time.</p></div>
      <LedSensitivityPanel/>
    </div>

    <section className="clarity-path-split" aria-label="Services and shop paths">
      <Link to="/services">
        <small>NEED WORK DONE?</small>
        <h2>Services</h2>
        <p>Planning, installation, integration, testing, fault finding and support performed by the NK team.</p>
        <span>Find the right service <ArrowRight/></span>
      </Link>
      <Link to="/shop">
        <small>NEED A PRODUCT?</small>
        <h2>Shop</h2>
        <p>Browse lighting, appliances and official catalogues without mixing product selection into service scopes.</p>
        <span>Browse products <ArrowRight/></span>
      </Link>
    </section>

    <section className="clarity-section" aria-labelledby="home-services-title">
      <header className="clarity-section__header">
        <div><span className="clarity-eyebrow">WHAT WE DO IN PRACTICE</span><h2 id="home-services-title">Five services. One clear point of responsibility.</h2></div>
        <p>Choose the outcome you need. Each route explains the practical scope, who it is for, the delivery steps and exactly how to start.</p>
      </header>
      <div className="clarity-service-grid">
        {systems.map(system => {
          const managed = services.find(service => service.slug === system.slug);
          return <Link className="clarity-service-card" to={system.route} key={system.slug}>
            <span className="clarity-service-card__icon"><system.Icon/></span>
            <h3>{managed?.title || system.label}</h3>
            <p>{system.detail}</p>
            <small><b>For:</b> {system.audience}</small>
            <span className="clarity-service-card__link">View scope and steps <ArrowRight/></span>
          </Link>;
        })}
      </div>
    </section>

    <section className="clarity-section clarity-audience" aria-labelledby="home-audience-title">
      <header className="clarity-section__header">
        <div><span className="clarity-eyebrow">WHO IT IS FOR</span><h2 id="home-audience-title">Built around the property and the people using it.</h2></div>
        <p>We work with the owner, project team or operating business so the finished system fits both the technical requirement and daily use.</p>
      </header>
      <div className="clarity-audience-grid">
        {projectAudiences.map(({Icon, title, body}) => <article key={title}><Icon/><h3>{title}</h3><p>{body}</p></article>)}
      </div>
    </section>

    <section className="clarity-section clarity-process" aria-labelledby="home-process-title">
      <header className="clarity-section__header">
        <div><span className="clarity-eyebrow">FROM START TO FINISH</span><h2 id="home-process-title">A visible path from enquiry to handover.</h2></div>
        <p>No mystery middle. The exact technical work changes by service, but the project route remains clear.</p>
      </header>
      <ol className="clarity-process-grid">
        {homeProcess.map(step => <li key={step.number}><span>{step.number}</span><h3>{step.title}</h3><p>{step.body}</p></li>)}
      </ol>
    </section>

    {featuredProjects.length > 0 && <section className="clarity-section clarity-evidence" aria-labelledby="home-evidence-title">
      <header className="clarity-section__header">
        <div><span className="clarity-eyebrow">WHAT THIS LOOKS LIKE IN PRACTICE</span><h2 id="home-evidence-title">Completed work across homes and commercial spaces.</h2></div>
        <p>These are installed projects from the NK archive—not concept renders. Open the archive to see the wider mix of property types.</p>
      </header>
      <div className="clarity-project-grid">
        {featuredProjects.map(project => <Link to="/projects" className="clarity-project-card" key={project.id || project.name}>
          <img src={project.image} alt={project.name}/>
          <div><small>{project.category || 'Completed project'}</small><h3>{project.name}</h3><p>{project.type}</p><span>View project archive <ArrowRight/></span></div>
        </Link>)}
      </div>
    </section>}
  </div>;
}
