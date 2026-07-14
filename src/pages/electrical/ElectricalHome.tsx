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
  Refrigerator,
  ShieldCheck,
  Waves,
} from 'lucide-react';
import {Link} from 'react-router-dom';
import {useContent} from '../../context/ContentContext';
import {publicAsset} from '../../utils/assets';
import {LedSensitivityPanel} from '../../components/LedSensitivityPanel';

const systems = [
  {
    code: 'PWR-01',
    label: 'Electrical installations',
    short: 'Power',
    route: '/electrical-installations',
    Icon: PlugZap,
    detail: 'Load planning, distribution, containment, wiring, protection, testing and documented switch-on.',
    signal: 'Survey → plan → install → test',
  },
  {
    code: 'LGT-02',
    label: 'Architectural lighting',
    short: 'Light',
    route: '/lighting',
    Icon: Lightbulb,
    detail: 'Interior, exterior, decorative and professional lighting selected around the architecture.',
    signal: 'Layer → select → aim → commission',
  },
  {
    code: 'APL-03',
    label: 'Appliances',
    short: 'Equip',
    route: '/appliances',
    Icon: Refrigerator,
    detail: 'Practical appliance selection with the electrical requirements and installation considered together.',
    signal: 'Compare → specify → supply → support',
  },
  {
    code: 'CTL-04',
    label: 'Smart control',
    short: 'Control',
    route: '/electrical-installations#smart',
    Icon: CircuitBoard,
    detail: 'KNX, security, sound and vision coordinated as one dependable building-control layer.',
    signal: 'Connect → automate → monitor → adapt',
  },
];

const projects = [
  {name: 'Bank of Cyprus Head Offices', type: 'Commercial electrical + LED', image: 'assets/projects/archive/project-01.jpg'},
  {name: 'Private Residence', type: 'Residential systems + lighting', image: 'assets/projects/archive/project-02.jpg'},
  {name: 'Mixed-use Building', type: 'Residential + offices + retail', image: 'assets/projects/archive/project-03.jpg'},
];

export default function ElectricalHome() {
  const {content} = useContent();
  const [activeSystem, setActiveSystem] = useState(0);
  const active = systems[activeSystem];
  const ActiveIcon = active.Icon;

  return <div className="power-home">
    <section className="power-hero">
      <div className="power-hero-copy">
        <div className="power-kicker"><span>NK / ELECTRICAL OPERATIONS</span></div>
        <motion.h1 initial={{opacity: 0, y: 28}} animate={{opacity: 1, y: 0}} transition={{duration: .75}}>
          <span>Power planned.</span>
          <strong>Systems connected.</strong>
          <em>Buildings switched on.</em>
        </motion.h1>
        <p>{content.heroBody}</p>
        <div className="power-primary-actions">
          <Link className="power-action power-action--live" to="/electrical-installations"><span>Plan an installation</span><ArrowDownRight/></Link>
          <Link className="power-action" to="/projects"><span>Inspect completed work</span><ArrowRight/></Link>
          <a className="power-action power-action--led" href="#led-lab"><span>Watch the live LED response</span><Lightbulb/></a>
        </div>
        <dl className="power-hero-facts">
          <div><dt>Operating since</dt><dd>1985</dd></div>
          <div><dt>Project coverage</dt><dd>Plan → support</dd></div>
          <div><dt>Emergency response</dt><dd>24h</dd></div>
        </dl>
      </div>

      <div className="power-field">
        <img src={content.heroImage} alt="Completed architectural electrical and lighting installation"/>
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

    <section className="power-routing">
      <header><span>01 / CAPABILITY ROUTING</span><h2>One project.<br/>Four connected layers.</h2><p>Each discipline has its own specialist path. The paths meet before anything reaches the site.</p></header>
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
        <div><ShieldCheck/><b>24h</b><span>Electrical emergency support</span></div>
        <div><Waves/><b>1</b><span>Team from survey to support</span></div>
      </div>
    </section>
  </div>;
}
