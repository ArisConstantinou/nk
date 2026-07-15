import {useState} from 'react';
import {motion} from 'framer-motion';
import {
  ArrowDownRight,
  ArrowRight,
  Box,
  CircuitBoard,
  Gauge,
  Lightbulb,
  PlugZap,
  ShieldCheck,
  Wrench,
  Waves,
} from 'lucide-react';
import {Link} from 'react-router-dom';
import {useContent} from '../../context/ContentContext';
import {publicAsset} from '../../utils/assets';
import {LedSensitivityPanel} from '../../components/LedSensitivityPanel';
import {CmsSections} from '../../components/CmsSections';

const systems = [
  {
    code: 'PWR-01',
    label: 'Electrical installations',
    short: 'Power',
    route: '/services/electrical-installations',
    Icon: PlugZap,
    detail: 'Load planning, distribution, containment, wiring, protection, testing and documented switch-on.',
    signal: 'Survey → plan → install → test',
  },
  {
    code: 'LGT-02',
    label: 'Architectural lighting',
    short: 'Light',
    route: '/services/lighting-design',
    Icon: Lightbulb,
    detail: 'Interior, exterior, decorative and professional lighting selected around the architecture.',
    signal: 'Layer → select → aim → test',
  },
  {
    code: 'AUT-03',
    label: 'Smart home & automation',
    short: 'Control',
    route: '/services/smart-home-automation',
    Icon: CircuitBoard,
    detail: 'KNX, lighting scenes, shading and connected building controls planned around everyday use.',
    signal: 'Connect → automate → monitor → adapt',
  },
  {
    code: 'MNT-04',
    label: 'Maintenance & fault support',
    short: 'Support',
    route: '/services/maintenance',
    Icon: Wrench,
    detail: 'Fault diagnosis, corrective work and planned maintenance for existing electrical systems.',
    signal: 'Inspect → diagnose → repair → verify',
  },
];

const projects = [
  {name: 'Bank of Cyprus Head Offices', type: 'Commercial electrical + LED', image: 'assets/projects/archive/project-01.jpg'},
  {name: 'Private Residence', type: 'Residential systems + lighting', image: 'assets/projects/archive/project-02.jpg'},
  {name: 'Mixed-use Building', type: 'Residential + offices + retail', image: 'assets/projects/archive/project-03.jpg'},
];

export default function ElectricalHome() {
  const {content, pageForRoute} = useContent();
  const theme = content.themeContent.tech;
  const homepage = pageForRoute('/');
  const [activeSystem, setActiveSystem] = useState(0);
  const active = systems[activeSystem];
  const ActiveIcon = active.Icon;

  return <div className="power-home">
    <section className="power-hero">
      <div className="power-hero-copy">
        <div className="power-kicker"><span data-visual-kind="page" data-visual-slug="homepage" data-visual-path="eyebrow" data-visual-edit="text" data-visual-label="Hero eyebrow">{theme.eyebrow}</span></div>
        <motion.h1 initial={{opacity: 0, y: 28}} animate={{opacity: 1, y: 0}} transition={{duration: .75}}>
          <span data-visual-kind="page" data-visual-slug="homepage" data-visual-path="heroTitle" data-visual-edit="text" data-visual-label="Hero title">{theme.heroTitle}</span>
          <strong data-visual-kind="page" data-visual-slug="homepage" data-visual-path="heroAccent" data-visual-edit="text" data-visual-label="Hero accent">{theme.heroAccent}</strong>
          <em data-visual-kind="page" data-visual-slug="homepage" data-visual-path="heroTail" data-visual-edit="text" data-visual-label="Hero final line">{theme.heroTail}</em>
        </motion.h1>
        <p data-visual-kind="page" data-visual-slug="homepage" data-visual-path="heroBody" data-visual-edit="text" data-visual-label="Hero description" data-visual-multiline="true">{theme.heroBody}</p>
        <div className="power-primary-actions">
          <Link className="power-action power-action--live" to="/services/electrical-installations"><span>Plan an installation</span><ArrowDownRight/></Link>
          <Link className="power-action" to="/projects"><span>Inspect completed work</span><ArrowRight/></Link>
          <a className="power-action power-action--led" href="#led-lab"><span>Watch the live LED response</span><Lightbulb/></a>
        </div>
        <dl className="power-hero-facts">
          <div><dt>Operating since</dt><dd>1985</dd></div>
          <div><dt>Project coverage</dt><dd>Plan → support</dd></div>
          <div><dt>Handover standard</dt><dd>Tested</dd></div>
        </dl>
      </div>

      <div className="power-field">
        <img src={content.heroImage} alt="Completed architectural electrical and lighting installation" data-visual-kind="page" data-visual-slug="homepage" data-visual-path="heroImage" data-visual-edit="image" data-visual-label="Hero image"/>
        <div className="power-field-shade"/>
        <div className="power-field-coordinate power-field-coordinate--top">35.165° N / 33.365° E</div>
        <div className="power-field-coordinate power-field-coordinate--bottom">STROVOLOS / CYPRUS</div>
        <div className="power-core" aria-hidden="true"><span/><i/><b/></div>
        <div className="power-system-readout" aria-live="polite">
          <span><ActiveIcon/> {active.code}</span>
          <h2>{active.label}</h2>
          <p>{active.detail}</p>
          <small>{active.signal}</small>
          <Link to={active.route}>Open system <ArrowRight/></Link>
        </div>
        <div className="power-node-switcher" aria-label="Electrical disciplines">
          {systems.map((system, index) => <button
            type="button"
            className={activeSystem === index ? 'active' : ''}
            aria-pressed={activeSystem === index}
            aria-label={`Show ${system.label}`}
            onMouseEnter={() => setActiveSystem(index)}
            onFocus={() => setActiveSystem(index)}
            onClick={() => setActiveSystem(index)}
            key={system.code}
          ><system.Icon/><span>{system.short}</span><small>{String(index + 1).padStart(2, '0')}</small></button>)}
        </div>
      </div>
    </section>

    <LedSensitivityPanel/>

    {homepage && <CmsSections sections={homepage.sections} pageSlug={homepage.slug}/>}

    <section className="ia-home-split" aria-label="Services and shop paths">
      <Link to="/services"><small>01 / SERVICES</small><h2>Need work planned or installed?</h2><p>Electrical installations, lighting design, automation, security and maintenance—performed by the NK team.</p><span>Explore Services <ArrowRight/></span></Link>
      <Link to="/shop"><small>02 / SHOP</small><h2>Looking for a product?</h2><p>Browse lighting, appliances and official catalogues without mixing products into service pages.</p><span>Enter the Shop <ArrowRight/></span></Link>
    </section>

    <section className="power-routing">
      <header><span>01 / CAPABILITY ROUTING</span><h2 data-visual-kind="page" data-visual-slug="homepage" data-visual-path="sectionTitle" data-visual-edit="text" data-visual-label="Capabilities heading" data-visual-multiline="true">{theme.sectionTitle}</h2><p data-visual-kind="page" data-visual-slug="homepage" data-visual-path="sectionBody" data-visual-edit="text" data-visual-label="Capabilities description" data-visual-multiline="true">{theme.sectionBody}</p></header>
      <div className="power-routing-map">
        {systems.map((system, index) => <Link to={system.route} className="power-route" key={system.code}>
          <span className="power-route-index">{String(index + 1).padStart(2, '0')}</span>
          <span className="power-route-icon"><system.Icon/></span>
          <span className="power-route-copy"><small>{system.code}</small><strong>{system.label}</strong><p>{system.detail}</p></span>
          <span className="power-route-state"><i/>Connected</span>
          <ArrowDownRight/>
        </Link>)}
      </div>
    </section>

    <section className="power-project-feed">
      <div className="power-section-id"><span>03 / INSTALLED EVIDENCE</span><b>25 projects in archive</b></div>
      <div className="power-project-lead"><h2>Not concepts.<br/><em>Completed circuits.</em></h2><p>Real electrical and LED lighting work from the NK project archive.</p><Link to="/projects">Open every project <ArrowRight/></Link></div>
      <div className="power-project-grid">{projects.map((project, index) => <Link to="/projects" className="power-project" key={`${project.name}-${index}`}>
        <img src={publicAsset(project.image)} alt={project.name}/>
        <span className="power-project-scan"/>
        <small>PROJECT / {String(index + 1).padStart(2, '0')}</small>
        <div><strong>{project.name}</strong><span>{project.type}</span></div>
        <ArrowDownRight/>
      </Link>)}</div>
    </section>

    <section className="power-assurance">
      <div className="power-assurance-title"><span>04 / SWITCH-ON STANDARD</span><h2>Safe power is<br/>the finished product.</h2></div>
      <div className="power-assurance-grid">
        <div><Gauge/><b>40</b><span>Years of electrical experience</span></div>
        <div><Box/><b>50+</b><span>Projects coordinated each year</span></div>
        <div><ShieldCheck/><b>4</b><span>Electrical disciplines coordinated</span></div>
        <div><Waves/><b>1</b><span>Team from survey to support</span></div>
      </div>
    </section>
  </div>;
}
