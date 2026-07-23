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
    detail: 'We plan loads and circuits, coordinate distribution and wiring, then inspect, test and hand over the completed installation.',
    signal: 'Survey → scope → install → test',
  },
  {
    code: 'LGT-02',
    label: 'Architectural lighting',
    short: 'Light',
    route: '/services/lighting-design',
    Icon: Lightbulb,
    detail: 'We plan lighting layers, layouts, fittings, colour temperature and controls so the space works without glare or guesswork.',
    signal: 'Review → plan → specify → coordinate',
  },
  {
    code: 'AUT-03',
    label: 'Smart home & automation',
    short: 'Control',
    route: '/services/smart-home-automation',
    Icon: CircuitBoard,
    detail: 'We coordinate KNX, lighting, shading, climate and security controls so daily routines work from simple scenes.',
    signal: 'Map → connect → programme → test',
  },
  {
    code: 'MNT-04',
    label: 'Maintenance & fault support',
    short: 'Support',
    route: '/services/maintenance',
    Icon: Wrench,
    detail: 'We trace electrical faults, agree the corrective work, retest the system and plan maintenance that reduces repeat failures.',
    signal: 'Report → diagnose → repair → retest',
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
  const [activePaletteId, setActivePaletteId] = useState<HomePaletteId>(() => getHomePalette());
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

    <section className="power-routing">
      <header><span>01 / WHAT WE DO</span><h2 data-visual-kind="page" data-visual-slug="homepage" data-visual-path="sectionTitle" data-visual-edit="text" data-visual-label="Capabilities heading" data-visual-multiline="true">{theme.sectionTitle}</h2><p data-visual-kind="page" data-visual-slug="homepage" data-visual-path="sectionBody" data-visual-edit="text" data-visual-label="Capabilities description" data-visual-multiline="true">{theme.sectionBody}</p></header>
      <div className="power-routing-map">
        {systems.map((system, index) => <Link to={system.route} className="power-route" key={system.code}>
          <span className="power-route-index">{String(index + 1).padStart(2, '0')}</span>
          <span className="power-route-icon"><system.Icon/></span>
          <span className="power-route-copy"><small>{system.code}</small><strong>{system.label}</strong><p>{system.detail}</p></span>
          <span className="power-route-state"><i/>Service page</span>
          <ArrowDownRight/>
        </Link>)}
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
        <div><ShieldCheck/><b>4</b><span>Service routes shown above</span></div>
        <div><Waves/><b>1</b><span>Team from first survey to aftercare</span></div>
      </div>
    </section>
  </div>;
}
