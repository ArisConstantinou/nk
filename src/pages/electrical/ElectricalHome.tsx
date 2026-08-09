import {useEffect, useState} from 'react';
import {motion} from 'framer-motion';
import {
  ArrowDownRight,
  ArrowRight,
  Box,
  CircuitBoard,
  Gauge,
  Lightbulb,
  Palette,
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
import {getHomePalette, homePaletteChangeEvent, homePaletteOptions, saveHomePalette, type HomePaletteId} from '../../homePalettes';

const systems = [
  {
    code: 'PWR-01',
    label: 'Electrical installations',
    short: 'Power',
    route: '/services/electrical-installations',
    Icon: PlugZap,
    detail: 'Loads, distribution, wiring, protection, testing and handover.',
    image: 'assets/heroes/electrical-installations-cyprus-v3.webp',
    imageAlt: 'Electrical installation work in progress in Cyprus',
    signal: 'Survey → scope → install → test',
  },
  {
    code: 'LGT-02',
    label: 'Architectural lighting',
    short: 'Light',
    route: '/services/lighting-design',
    Icon: Lightbulb,
    detail: 'Layouts, fittings, colour temperature, glare control and scenes.',
    image: 'assets/heroes/lighting-design.webp',
    imageAlt: 'Architectural lighting design in a completed interior',
    signal: 'Review → plan → specify → coordinate',
  },
  {
    code: 'AUT-03',
    label: 'Smart home & automation',
    short: 'Control',
    route: '/services/smart-home-automation',
    Icon: CircuitBoard,
    detail: 'KNX controls for lighting, shading, climate and daily routines.',
    image: 'assets/heroes/smart-home-automation.webp',
    imageAlt: 'Smart home controls coordinating lighting and daily routines',
    signal: 'Map → connect → programme → test',
  },
  {
    code: 'SEC-04',
    label: 'Security systems',
    short: 'Safety',
    route: '/services/security-systems',
    Icon: ShieldCheck,
    detail: 'CCTV, alarms, access control and entry systems.',
    image: 'assets/heroes/security-systems.webp',
    imageAlt: 'Security system monitoring and access control equipment',
    signal: 'Review → cover → install → test',
  },
  {
    code: 'MNT-05',
    label: 'Maintenance & fault support',
    short: 'Support',
    route: '/services/maintenance',
    Icon: Wrench,
    detail: 'Fault finding, corrective repairs, retesting and planned maintenance.',
    image: 'assets/heroes/maintenance.webp',
    imageAlt: 'Electrical maintenance and diagnostic work',
    signal: 'Report → diagnose → repair → retest',
  },
];

const compactServicesTitle = 'Five services. One accountable team.';
const compactServicesBody = 'We plan, install and support electrical, lighting, automation, security and maintenance systems.';
const previousServicesTitles = new Set([
  'Specialist services. One accountable team.',
  'Choose the electrical work you need.',
]);
const previousServicesBodies = new Set([
  'Services stay focused on planning, installation and support. Products and PDF catalogues follow a separate Shop path.',
  'Each service page explains the practical scope, who it is for, the problem it solves and the details to send first.',
]);

const projects = [
  {name: 'Bank of Cyprus Head Offices', type: 'Commercial electrical + LED', image: 'assets/projects/archive/project-01.jpg'},
  {name: 'Private Residence', type: 'Residential systems + lighting', image: 'assets/projects/archive/project-02.jpg'},
  {name: 'Mixed-use Building', type: 'Residential + offices + retail', image: 'assets/projects/archive/project-03.jpg'},
];

export default function ElectricalHome() {
  const {content, pageForRoute} = useContent();
  const theme = content.themeContent.tech;
  const homepage = pageForRoute('/');
  const servicesTitle = previousServicesTitles.has(theme.sectionTitle.trim()) ? compactServicesTitle : theme.sectionTitle;
  const servicesBody = previousServicesBodies.has(theme.sectionBody.trim()) ? compactServicesBody : theme.sectionBody;
  const [activePaletteId, setActivePaletteId] = useState<HomePaletteId>(() => getHomePalette());
  const [activeService, setActiveService] = useState(0);
  const visualPalettes = homePaletteOptions.map(palette => ({...palette, image: palette.image ? publicAsset(palette.image) : content.heroImage}));
  const activePalette = Math.max(0, visualPalettes.findIndex(palette => palette.id === activePaletteId));
  const active = visualPalettes[activePalette];

  useEffect(() => {
    const syncPalette = () => setActivePaletteId(getHomePalette());
    window.addEventListener(homePaletteChangeEvent, syncPalette);
    return () => window.removeEventListener(homePaletteChangeEvent, syncPalette);
  }, []);

  const previewPalette = (palette: HomePaletteId) => {
    setActivePaletteId(palette);
  };

  return <div className="power-home" data-home-palette={active.id}>
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
          <Link className="power-action power-action--live" to="/services/electrical-installations"><span>Plan an electrical installation</span><ArrowDownRight/></Link>
          <Link className="power-action" to="/projects"><span>View completed projects</span><ArrowRight/></Link>
          <a className="power-action power-action--led" href="#led-lab"><span>Try the RGB lighting lab</span><Lightbulb/></a>
        </div>
        <dl className="power-hero-facts">
          <div><dt>Operating since</dt><dd>1985</dd></div>
          <div><dt>Project route</dt><dd>Survey → handover</dd></div>
          <div><dt>Your first step</dt><dd>Send plans or photos</dd></div>
        </dl>
      </div>

      <div className="power-field">
        <motion.img key={active.id} initial={{opacity: .25, scale: 1.035}} animate={{opacity: 1, scale: 1}} transition={{duration: .55}} src={active.image} alt={active.alt} data-visual-kind="page" data-visual-slug="homepage" data-visual-path="heroImage" data-visual-edit="image" data-visual-label="Hero image"/>
        <div className="power-field-shade"/>
        <div className="power-field-coordinate power-field-coordinate--top">35.165° N / 33.365° E</div>
        <div className="power-field-coordinate power-field-coordinate--bottom">STROVOLOS / CYPRUS</div>
        <div className="power-core" aria-hidden="true"><span/><i/><b/></div>
        <div className="power-system-readout" aria-live="polite">
          <span key={active.id}><Palette/> {`${active.code} / ${active.context}`}</span>
          <h2>{active.label}</h2>
          <p>{active.detail}</p>
          <div className="power-palette-swatches" aria-label={`${active.label} colour palette`}>{active.colors.map(color => <i style={{backgroundColor: color}} title={color} key={color}/>)}</div>
          <small>{active.colors.join(' · ')}</small>
          <Link to={active.route}>View the completed project <ArrowRight/></Link>
        </div>
        {visualPalettes.length > 1 && <div className="power-palette-switcher" aria-label="Homepage visual palettes" onMouseLeave={() => setActivePaletteId(getHomePalette())}>
          {visualPalettes.map((palette, index) => <button
            type="button"
            className={activePalette === index ? 'active' : ''}
            aria-pressed={activePalette === index}
            aria-label={`Show ${palette.label} palette`}
            onMouseEnter={() => previewPalette(palette.id)}
            onFocus={() => previewPalette(palette.id)}
            onClick={() => saveHomePalette(palette.id)}
            key={palette.id}
          ><img src={palette.image} alt=""/><span>{palette.label}</span><small>{String(index + 1).padStart(2, '0')}</small></button>)}
        </div>}
      </div>
    </section>

    <LedSensitivityPanel/>

    {homepage && <CmsSections sections={homepage.sections} pageSlug={homepage.slug}/>}

    <section className="ia-home-split" aria-label="Services and shop paths">
      <Link to="/services"><small>01 / SERVICES</small><h2>Need planning, installation or support?</h2><p>Choose Services for electrical installations, lighting design, automation, security or maintenance delivered by the NK team.</p><span>Choose a service <ArrowRight/></span></Link>
      <Link to="/shop"><small>02 / SHOP</small><h2>Need a product or catalogue?</h2><p>Choose the Shop for lighting products, appliances and official catalogues.</p><span>Browse products and catalogues <ArrowRight/></span></Link>
    </section>

    <section className="power-routing power-routing--selector" aria-labelledby="home-services-title">
      <header><span>01 / SERVICES</span><h2 id="home-services-title" data-visual-kind="page" data-visual-slug="homepage" data-visual-path="sectionTitle" data-visual-edit="text" data-visual-label="Capabilities heading" data-visual-multiline="true">{servicesTitle}</h2><p data-visual-kind="page" data-visual-slug="homepage" data-visual-path="sectionBody" data-visual-edit="text" data-visual-label="Capabilities description" data-visual-multiline="true">{servicesBody}</p></header>
      <div className="power-service-selector" data-active-service={activeService}>
        <div className="power-service-stage" aria-live="polite">
          <motion.img
            key={systems[activeService].code}
            src={publicAsset(systems[activeService].image)}
            alt={systems[activeService].imageAlt}
            initial={{opacity: .2, scale: 1.035}}
            animate={{opacity: 1, scale: 1}}
            transition={{duration: .46, ease: 'easeOut'}}
          />
          <span className="power-service-stage__shade" aria-hidden="true"/>
          <div className="power-service-stage__readout">
            <small>{systems[activeService].code} / {systems[activeService].short}</small>
            <strong>{systems[activeService].label}</strong>
            <span>{systems[activeService].signal}</span>
          </div>
        </div>
        <div className="power-service-options">
          {systems.map((system, index) => {
            const isActive = activeService === index;
            const detailId = `home-service-${system.code.toLowerCase()}`;
            return <article className={`power-service-option ${isActive ? 'is-active' : ''}`} key={system.code}>
              <button
                type="button"
                aria-expanded={isActive}
                aria-controls={detailId}
                onClick={() => setActiveService(index)}
              >
                <span className="power-service-option__index">{String(index + 1).padStart(2, '0')}</span>
                <span className="power-service-option__icon"><system.Icon/></span>
                <span className="power-service-option__title"><small>{system.code}</small><strong>{system.label}</strong></span>
                <span className="power-service-option__toggle" aria-hidden="true">{isActive ? '−' : '+'}</span>
              </button>
              <div className="power-service-option__detail" id={detailId} aria-hidden={!isActive}>
                <div>
                  <p>{system.detail}</p>
                  <span>{system.signal}</span>
                  <Link to={system.route} tabIndex={isActive ? undefined : -1}>Explore this service <ArrowRight/></Link>
                </div>
              </div>
            </article>;
          })}
        </div>
      </div>
    </section>

    <section className="power-project-feed">
      <div className="power-section-id"><span>03 / COMPLETED PROJECTS</span><b>25 documented projects</b></div>
      <div className="power-project-lead"><h2>Work completed.<br/><em>Systems in use.</em></h2><p>Browse electrical and LED lighting work completed across homes, offices, retail and mixed-use buildings.</p><Link to="/projects">View all projects <ArrowRight/></Link></div>
      <div className="power-project-grid">{projects.map((project, index) => <Link to="/projects" className="power-project" key={`${project.name}-${index}`}>
        <img src={publicAsset(project.image)} alt={project.name}/>
        <span className="power-project-scan"/>
        <small>PROJECT / {String(index + 1).padStart(2, '0')}</small>
        <div><strong>{project.name}</strong><span>{project.type}</span></div>
        <ArrowDownRight/>
      </Link>)}</div>
    </section>

    <section className="power-assurance">
      <div className="power-assurance-title"><span>04 / HOW WE WORK</span><h2>Clear responsibility<br/>from survey to support.</h2></div>
      <div className="power-assurance-grid">
        <div><Gauge/><b>40+</b><span>Years supporting homes and businesses</span></div>
        <div><Box/><b>50+</b><span>Projects coordinated each year</span></div>
        <div><ShieldCheck/><b>5</b><span>Service routes shown above</span></div>
        <div><Waves/><b>1</b><span>Team from first survey to aftercare</span></div>
      </div>
    </section>
  </div>;
}
