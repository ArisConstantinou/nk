import {useEffect, useState, type FormEvent} from 'react';
import {Link, useParams, useSearchParams} from 'react-router-dom';
import {AnimatePresence, motion} from 'framer-motion';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import {team} from '../content';
import {useContent} from '../context/ContentContext';
import {useTheme} from '../context/ThemeContext';
import type {Product} from '../types';
import {publicAsset} from '../utils/assets';

const pageFocusByEyebrow: Record<string, [string, string, string]> = {
  'The people behind every installation': ['Engineering', 'Design', 'Installations'],
  'Complete installed project archive': ['Planned', 'Installed', 'Documented'],
  'Electrical installations': ['Load study', 'Protection', 'Certification'],
  'Lighting and appliance discovery': ['Purpose', 'Season', 'Room'],
  'Dedicated lighting department': ['Ambience', 'Specification', 'Supply'],
  'Electrical appliances': ['Select', 'Connect', 'Support'],
  'Electrical enquiry': ['Describe', 'Direct', 'Respond'],
};

const pageContextByEyebrow: Record<string, {index: string; status: string; brief: string}> = {
  'The people behind every installation': {
    index: 'COMPANY / PEOPLE & RESPONSIBILITIES',
    status: 'FAMILY-FOUNDED SINCE 1985',
    brief: 'Company overview',
  },
  'Complete installed project archive': {
    index: 'PROJECTS / COMPLETED INSTALLATIONS',
    status: '25 PROJECTS DOCUMENTED',
    brief: 'Archive overview',
  },
  'Electrical installations': {
    index: 'INSTALLATIONS / POWER & PROTECTION',
    status: 'PLANNING · WIRING · TESTING · MAINTENANCE',
    brief: 'Installation scope',
  },
  'Lighting and appliance discovery': {
    index: 'DISCOVERY / LIGHTING & APPLIANCES',
    status: 'FILTERED BY REAL USE',
    brief: 'How to browse',
  },
  'Dedicated lighting department': {
    index: 'LIGHTING / DESIGN & SUPPLY',
    status: 'DEDICATED DEPARTMENT',
    brief: 'Lighting scope',
  },
  'Electrical appliances': {
    index: 'APPLIANCES / SELECT & CONNECT',
    status: 'PRACTICAL PRODUCT SUPPORT',
    brief: 'Product scope',
  },
  'Electrical enquiry': {
    index: 'CONTACT / DIRECT TO SPECIALIST',
    status: 'STROVOLOS / CYPRUS',
    brief: 'Enquiry routing',
  },
};

export function PageIntro({eyebrow, title, italic, body}: {eyebrow: string; title: string; italic?: string; body: string}) {
  const {experienceTheme} = useTheme();
  const focus = pageFocusByEyebrow[eyebrow];
  const context = pageContextByEyebrow[eyebrow];
  if (experienceTheme === 'tech') return <section className="system-page-intro">
    <div className="system-page-index"><span>{context.index}</span><i>{context.status}</i></div>
    <div className="system-page-title"><span>{eyebrow}</span><h1>{title}{italic && <><br/><em>{italic}</em></>}</h1></div>
    <aside className="system-page-brief"><small>{context.brief}</small><p>{body}</p><div aria-label={`${eyebrow} focus`}><span>{focus[0]}</span><i/><span>{focus[1]}</span><i/><span>{focus[2]}</span></div></aside>
    <div className="system-page-trace" aria-hidden="true"><i/><i/><i/><b/></div>
  </section>;
  return <section className="page-intro section"><div><span className="eyebrow">{eyebrow}</span><h1>{title}{italic && <><br/><em>{italic}</em></>}</h1></div><p>{body}</p></section>;
}

export function AboutPage() {
  const {content} = useContent();
  return <>
    <PageIntro eyebrow="The people behind every installation" title={content.aboutTitle} body={content.aboutBody}/>
    <section className="story-visual section">
      <div className="story-image"><img src={publicAsset('assets/generated/team-craft.webp')} alt="Electrical designer studying a warmly lit interior"/><span>Family-founded · electrically focused</span></div>
      <div className="story-copy">
        <p className="dropcap">NK Electrical has specialised in electrical installations for private residences, stores, showrooms, restaurants and public spaces since 1985.</p>
        <p>From the store at 72 Makedonitissis in Strovolos, engineers, lighting designers, product specialists and electricians coordinate power, lighting, appliances, smart homes, security, sound and vision.</p>
        <div className="timeline"><div><b>1985</b><span>Ntinos and Eliana establish NK Electrical.</span></div><div><b>Today</b><span>Specialists plan, supply, install, test and support each system.</span></div><div><b>Next</b><span>More connected, energy-aware electrical spaces for Cyprus.</span></div></div>
      </div>
    </section>
    <section className="org-section section">
      <div className="org-heading"><span className="eyebrow">The complete team</span><h2>Different expertise.<br/><em>One electrical standard.</em></h2><p>The team is ordered by responsibility. The electrical installations team is the company’s backbone, and every card shows how each person contributes to the work.</p></div>
      <div className="team-all-grid">
        {team.map((person, index) => <article className={`person-card${person.name === 'Installation team' ? ' person-card--group' : ''}`} key={person.name}>
          <div className="person-portrait"><img src={person.image} alt={`Illustrated role portrait for ${person.name}, ${person.role}`}/><span><b>{String(index + 1).padStart(2, '0')}</b>{person.responsibility}</span></div>
          <div className="person-content"><small>{person.branch}</small><h3>{person.name}</h3><p className="person-role">{person.role}</p><p className="person-area">{person.workArea}</p>{person.credential && <span className="person-credential">{person.credential}</span>}<ul>{person.characteristics.map(item => <li key={item}>{item}</li>)}</ul><div className="person-links">{person.email && <a aria-label={`Email ${person.name}`} href={`mailto:${person.email}`}><Mail/></a>}{person.linkedin && <a aria-label={`${person.name} on LinkedIn`} target="_blank" rel="noreferrer" href={person.linkedin}><ExternalLink/></a>}</div></div>
        </article>)}
      </div>
    </section>
  </>;
}

const archivedProjectNames = [
  'Bank of Cyprus Head Offices',
  'Private Residence',
  'Building Residence + Offices + Stores',
  'Private Residence',
  'Private Residence',
  'Private Residence',
  'Private Residence',
  'Private Residence',
  'Private Residence',
  'Private Residence',
  'Private Residence',
  'Building Residence',
  'Private Residence',
  'Athienitis Supermarket, Pallouriotissa',
  'Building Residence',
  'Building Residence',
  'Private Residence',
  'Building Residence',
  'Private Residence',
  'Private Residence',
  'Private Residence',
  'Private Residence',
  'Private Residence',
  'Private Residence',
  'Building Residence',
];

const projectType = (name: string) => {
  if (name.includes('Bank of Cyprus')) return 'Commercial offices · electrical & LED lighting';
  if (name.includes('Supermarket')) return 'Retail · electrical & LED lighting';
  if (name.includes('Offices + Stores')) return 'Mixed use · residential, offices & retail';
  if (name === 'Building Residence') return 'Residential building · electrical & LED lighting';
  return 'Private residence · electrical & LED lighting';
};

const projectCards = archivedProjectNames.map((name, index) => ({
  id: `archive-${String(index + 1).padStart(2, '0')}`,
  number: String(index + 1).padStart(2, '0'),
  name,
  image: publicAsset(`assets/projects/archive/project-${String(index + 1).padStart(2, '0')}.jpg`),
  type: projectType(name),
  text: 'Electrical and LED lighting installation, with lighting selected through the NK Electrical store.',
  systems: ['Electrical installation', 'LED lighting installation', 'Lighting selection and supply'],
}));

export function ProjectsPage() {
  const [selectedProject, setSelectedProject] = useState<(typeof projectCards)[number] | null>(null);
  const [discussionOpen, setDiscussionOpen] = useState(false);
  const [discussionPrepared, setDiscussionPrepared] = useState(false);

  const moveProject = (direction: -1 | 1) => {
    setSelectedProject(current => {
      if (!current) return null;
      const currentIndex = projectCards.findIndex(project => project.id === current.id);
      return projectCards[(currentIndex + direction + projectCards.length) % projectCards.length];
    });
  };

  useEffect(() => {
    if (!selectedProject) return;
    const previousOverflow = document.body.style.overflow;
    const handleProjectKeys = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedProject(null);
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        moveProject(-1);
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        moveProject(1);
      }
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleProjectKeys);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleProjectKeys);
    };
  }, [selectedProject]);

  useEffect(() => {
    setDiscussionOpen(false);
    setDiscussionPrepared(false);
  }, [selectedProject?.id]);

  useEffect(() => {
    if (!discussionOpen) return;
    document.getElementById('project-discussion-panel')?.scrollIntoView({behavior: 'smooth', block: 'nearest'});
  }, [discussionOpen]);

  const selectedIndex = selectedProject ? projectCards.findIndex(project => project.id === selectedProject.id) : -1;
  const previousProject = selectedIndex >= 0 ? projectCards[(selectedIndex - 1 + projectCards.length) % projectCards.length] : null;
  const nextProject = selectedIndex >= 0 ? projectCards[(selectedIndex + 1) % projectCards.length] : null;

  const prepareProjectDiscussion = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedProject) return;
    const data = new FormData(event.currentTarget);
    const subject = encodeURIComponent(`Project discussion: ${selectedProject.name} · Project ${selectedProject.number}`);
    const body = encodeURIComponent(`Project: ${selectedProject.name} · Project ${selectedProject.number}\nWork type: ${selectedProject.type}\n\nName: ${data.get('name')}\nPhone: ${data.get('phone')}\n\nDiscussion notes:\n${data.get('message')}`);
    window.location.href = `mailto:info@nk-electrical.com?subject=${subject}&body=${body}`;
    setDiscussionPrepared(true);
  };

  return <>
    <PageIntro eyebrow="Complete installed project archive" title="Electrical work," italic="shown on site." body="Every completed installation published in NK Electrical’s original project archive, now organised as a clear, clickable two-column collection."/>
    <section className="project-archive-grid section" aria-label="NK Electrical completed projects">{projectCards.map(project =>
      <button className="project-archive-card" type="button" aria-haspopup="dialog" onClick={() => setSelectedProject(project)} key={project.id}>
        <span className="project-archive-image"><img src={project.image} alt={`${project.name} completed installation ${project.number}`} loading="lazy"/><span>View project <ArrowUpRight/></span></span>
        <span className="project-archive-copy"><small>Project {project.number}</small><strong>{project.name}</strong><span>{project.type}</span></span>
      </button>
    )}</section>
    <section className="project-principle section"><span className="eyebrow light">The electrical method</span><blockquote>“Plan the circuits, coordinate the fittings, test every connection.”</blockquote><div><span>Survey the site</span><ArrowRight/><span>Install the system</span><ArrowRight/><span>Test and support</span></div></section>
    <AnimatePresence>{selectedProject &&
      <motion.div className="project-modal-backdrop" role="presentation" onMouseDown={() => setSelectedProject(null)} initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}}>
        <motion.article className="project-modal" role="dialog" aria-modal="true" aria-labelledby="project-modal-title" onMouseDown={event => event.stopPropagation()} initial={{opacity: 0, y: 30, scale: .98}} animate={{opacity: 1, y: 0, scale: 1}} exit={{opacity: 0, y: 20, scale: .98}}>
          <button className="project-modal-close" type="button" aria-label="Close project details" onClick={() => setSelectedProject(null)}><X/></button>
          <div className="project-modal-image">
            <img key={selectedProject.id} src={selectedProject.image} alt={`${selectedProject.name} completed installation ${selectedProject.number}`}/>
            <div className="project-modal-identity" aria-live="polite"><small>Installed project · {selectedProject.number} of {projectCards.length}</small><h2 id="project-modal-title">{selectedProject.name}</h2><span>{selectedProject.type}</span></div>
            <button className="project-modal-nav previous" type="button" aria-label={`Previous project: ${previousProject?.name}`} onClick={() => moveProject(-1)}><ChevronLeft/></button>
            <button className="project-modal-nav next" type="button" aria-label={`Next project: ${nextProject?.name}`} onClick={() => moveProject(1)}><ChevronRight/></button>
          </div>
          <div className="project-modal-copy">
            <p>{selectedProject.text}</p><b>Installed scope</b><ul>{selectedProject.systems.map(system => <li key={system}><Check/>{system}</li>)}</ul>
            <button className={`button copper project-discussion-toggle ${discussionOpen ? 'open' : ''}`} type="button" aria-expanded={discussionOpen} aria-controls="project-discussion-panel" onClick={() => { setDiscussionOpen(open => !open); setDiscussionPrepared(false); }}><span>{discussionOpen ? 'Close discussion' : 'Discuss a similar project'}</span><ChevronDown/></button>
            <AnimatePresence initial={false}>{discussionOpen &&
              <motion.form id="project-discussion-panel" className="project-discussion-panel" onSubmit={prepareProjectDiscussion} initial={{height: 0, opacity: 0}} animate={{height: 'auto', opacity: 1}} exit={{height: 0, opacity: 0}}>
                <div className="project-discussion-heading"><div><small>Project {selectedProject.number}</small><strong>Start the discussion</strong></div><button type="button" aria-label="Close discussion panel" onClick={() => setDiscussionOpen(false)}><X/></button></div>
                <p>Leave the essentials here and NK Electrical can continue with the right project context.</p>
                <label>Your name<input required name="name" autoComplete="name"/></label>
                <label>Phone<input required name="phone" autoComplete="tel" inputMode="tel"/></label>
                <label>What would you like to discuss?<textarea required name="message" rows={4}/></label>
                <button className="button cream" type="submit">Prepare discussion email <ArrowUpRight/></button>
                {discussionPrepared && <p className="project-discussion-note"><Check/> Your email app should now be open with this project attached.</p>}
              </motion.form>
            }</AnimatePresence>
          </div>
        </motion.article>
      </motion.div>
    }</AnimatePresence>
  </>;
}

const solutions = [
  {id: 'plan', icon: Zap, title: 'Electrical planning', body: 'Coordinated load, circuit and equipment planning for homes, retail, hospitality and public spaces.', points: ['Load and circuit planning', 'Distribution-board specification', 'Project and trade coordination']},
  {id: 'install', icon: Wrench, title: 'Electrical installations', body: 'Complete electrical installation for private residences, stores, showrooms, restaurants and public spaces.', points: ['Containment, cabling and wiring', 'Distribution and final connections', 'Inspection, testing and handover']},
  {id: 'support', icon: ShieldCheck, title: 'Maintenance & fault support', body: 'Electrical fault-finding, repairs and planned maintenance for completed residential and commercial installations.', points: ['Electrical fault diagnosis', 'Planned maintenance', 'Repair and corrective work']},
  {id: 'smart', icon: SlidersHorizontal, title: 'Smart home & low-voltage systems', body: 'KNX smart-home control, security, sound and vision integrated with the electrical installation.', points: ['Lighting and shutter control', 'Security and remote access', 'Sound, vision and system integration']},
];

const installationDelivery = [
  {icon: Zap, title: 'Installed to the plan', body: 'Containment, cabling, distribution boards and final connections completed as one coordinated installation.'},
  {icon: ShieldCheck, title: 'Protection verified', body: 'Circuits, protective devices and loads checked before the electrical system is energised.'},
  {icon: FileText, title: 'Tested before handover', body: 'Final inspection and functional testing confirm that the installation is ready for everyday use.'},
  {icon: Wrench, title: 'Supported afterwards', body: 'Planned maintenance, fault diagnosis and corrective electrical work remain available after handover.'},
];

export function ElectricalInstallationsPage() {
  const [active, setActive] = useState('plan');
  const activeSolution = solutions.find(solution => solution.id === active);
  const ActiveIcon = activeSolution?.icon;
  return <>
    <PageIntro eyebrow="Electrical installations" title="Planned correctly." italic="Installed safely." body="Electrical planning, wiring, distribution, testing, maintenance and fault support—kept distinct from lighting selection and appliances."/>
    <section className="solutions-stack section">
      {solutions.map(solution => {
        const Icon = solution.icon;
        const isActive = active === solution.id;
        return <article id={solution.id} className={`solution-row ${isActive ? 'open' : ''}`} key={solution.id}>
          <button aria-expanded={isActive} aria-controls={`${solution.id}-details`} onClick={() => setActive(isActive ? '' : solution.id)}><Icon/><h2>{solution.title}</h2><ChevronDown/></button>
          <AnimatePresence initial={false}>{isActive && <motion.div id={`${solution.id}-details`} className="solution-detail solution-detail--mobile" initial={{height: 0, opacity: 0}} animate={{height: 'auto', opacity: 1}} exit={{height: 0, opacity: 0}} transition={{height: {duration: .34, ease: [.22, 1, .36, 1]}, opacity: {duration: .2}}}><p>{solution.body}</p><ul>{solution.points.map(point => <li key={point}><Check/>{point}</li>)}</ul><Link to="/contact">Discuss this installation <ArrowUpRight/></Link></motion.div>}</AnimatePresence>
        </article>;
      })}
      <AnimatePresence initial={false}>{activeSolution && ActiveIcon && <motion.aside key="desktop-solution-panel" className="solution-expanded" initial={{height: 0, opacity: 0}} animate={{height: 'auto', opacity: 1}} exit={{height: 0, opacity: 0}} transition={{height: {duration: .42, ease: [.22, 1, .36, 1]}, opacity: {duration: .22}}}>
        <motion.div key={activeSolution.id} className="solution-detail solution-detail--desktop" initial={{opacity: 0, y: 8}} animate={{opacity: 1, y: 0}} transition={{duration: .24, ease: 'easeOut'}}>
          <div className="solution-detail-heading"><ActiveIcon/><span>Selected service</span><h3>{activeSolution.title}</h3></div>
          <p>{activeSolution.body}</p><ul>{activeSolution.points.map(point => <li key={point}><Check/>{point}</li>)}</ul><Link to="/contact">Discuss this installation <ArrowUpRight/></Link>
        </motion.div>
      </motion.aside>}</AnimatePresence>
    </section>
    <section className="installation-delivery section">
      <div className="installation-delivery-panel">
        <header className="installation-delivery-heading"><span className="eyebrow">The NK installation standard</span><h2>What leaves the site<br/><em>complete.</em></h2><p>Every electrical installation is built around practical site work, verified protection and dependable support after handover.</p></header>
        <div className="installation-delivery-grid">{installationDelivery.map(({icon: Icon, title, body}, index) => <article key={title}><span>{String(index + 1).padStart(2, '0')}</span><Icon/><h3>{title}</h3><p>{body}</p></article>)}</div>
      </div>
    </section>
  </>;
}

const filterValues = {
  category: ['All', 'Lighting', 'Coffee', 'Kitchen', 'Cooling', 'Cleaning'],
  season: ['All', 'All year', 'Summer', 'Winter', 'Christmas'],
  space: ['All', 'Living', 'Kitchen', 'Outdoor', 'Bedroom', 'Workspace'],
};

function ProductCard({item}: {item: Product}) {
  return <Link to={`/product/${item.id}`} className="product-card"><div className="product-image"><img src={item.image} alt={item.name}/><span>View details <ArrowUpRight/></span></div><div className="product-info"><small>{item.category} · {item.season}</small><h3>{item.name}</h3><p>{item.note}</p></div></Link>;
}

export function ExplorePage() {
  const {content} = useContent();
  const [params, setParams] = useSearchParams();
  const category = params.get('category') || 'All';
  const season = params.get('season') || 'All';
  const space = params.get('space') || 'All';
  const set = (key: string, value: string) => { const next = new URLSearchParams(params); value === 'All' ? next.delete(key) : next.set(key, value); setParams(next); };
  const filtered = content.products.filter(product => (category === 'All' || product.category === category) && (season === 'All' || product.season === season) && (space === 'All' || product.space === space));
  return <>
    <PageIntro eyebrow="Lighting and appliance discovery" title="Filter by purpose," italic="season and room." body="A structured way to explore products without throwing every item into one endless library."/>
    <section className="filter-shell section"><div className="filter-top"><div><SlidersHorizontal/><b>Refine the collection</b></div><span>{filtered.length} considered matches</span></div>{Object.entries(filterValues).map(([key, values]) => <div className="filter-row" key={key}><b>{key}</b><div>{values.map(value => <button className={(key === 'category' ? category : key === 'season' ? season : space) === value ? 'active' : ''} onClick={() => set(key, value)} key={value}>{value}</button>)}</div></div>)}</section>
    <section className="product-grid section">{filtered.map(product => <ProductCard item={product} key={product.id}/>)}</section>
    {filtered.length === 0 && <div className="empty-state"><Sparkles/><h2>No exact match—yet.</h2><p>Remove one filter to widen the shortlist.</p><button onClick={() => setParams({})}>Clear filters</button></div>}
  </>;
}

export function ProductPage() {
  const {id} = useParams();
  const {content} = useContent();
  const item = content.products.find(product => product.id === id);
  if (!item) return <section className="not-found"><span>Not found</span><h1>That product has moved.</h1><Link to="/explore">Return to the collection</Link></section>;
  return <section className="product-detail section"><Link className="back-link" to="/explore">← Back to explore</Link><div className="product-detail-image"><img src={item.image} alt={item.name}/></div><div className="product-detail-copy"><span className="eyebrow">{item.category} · {item.space}</span><h1>{item.name}</h1><p>{item.note}</p><dl><div><dt>Best considered for</dt><dd>{item.space}</dd></div><div><dt>Seasonal edit</dt><dd>{item.season}</dd></div><div><dt>Available through</dt><dd>NK Electrical, Strovolos</dd></div></dl><a className="button copper" href={`mailto:info@nk-electrical.com?subject=${encodeURIComponent(`Product enquiry: ${item.name}`)}`}>Ask about this product <ArrowUpRight/></a></div></section>;
}

export function LightingPage() {
  const {content} = useContent();
  const [brand, setBrand] = useState('All');
  const [focus, setFocus] = useState('All');
  const shown = content.catalogues.filter(catalogue => (brand === 'All' || catalogue.brand === brand) && (focus === 'All' || catalogue.focus === focus));
  return <>
    <PageIntro eyebrow="Dedicated lighting department" title="Lighting has its own" italic="specification process." body="Browse original catalogues by brand and lighting purpose. Lighting selection stays separate from electrical installation work and appliance sales."/>
    <section className="catalogue-controls section"><div><b>Brand</b>{['All', 'ACA', 'Nova Luce', 'VIOKEF'].map(value => <button className={brand === value ? 'active' : ''} onClick={() => setBrand(value)} key={value}>{value}</button>)}</div><div><b>Focus</b>{['All', 'Decorative', 'Architectural', 'Kids', 'Natural', 'Fans'].map(value => <button className={focus === value ? 'active' : ''} onClick={() => setFocus(value)} key={value}>{value}</button>)}</div></section>
    <section className="catalogue-grid section">{shown.map((catalogue, index) => <a className={`catalogue-card tone-${index % 4}`} target="_blank" rel="noreferrer" href={catalogue.url} key={catalogue.url}><div className="catalogue-cover"><span>NK / LIGHTING</span><b>{catalogue.brand}</b><strong>{catalogue.year}</strong><i/><small>{catalogue.focus}</small></div><div><FileText/><h3>{catalogue.name}</h3><span>Open original catalogue <ArrowUpRight/></span></div></a>)}</section>
    <section className="catalogue-help section"><div><BookOpen/><h2>Found a fitting?</h2></div><p>Email the catalogue name, product code and quantity. Add your name and phone number so the lighting team can respond with the right context.</p><a className="button copper" href="mailto:thelma@nk-electrical.com?subject=Lighting%20catalogue%20enquiry">Email the lighting team <ArrowUpRight/></a></section>
  </>;
}

export function AppliancesPage() {
  const {content} = useContent();
  const [season, setSeason] = useState('All');
  const appliances = content.products.filter(product => product.category !== 'Lighting' && (season === 'All' || product.season === season));
  return <>
    <PageIntro eyebrow="Electrical appliances" title="Practical products," italic="grouped around real use." body="Coffee, kitchen and cooling appliances presented separately from lighting and electrical installation services."/>
    <section className="appliance-controls section"><div><SlidersHorizontal/><b>Choose a season or occasion</b></div><div>{['All', 'All year', 'Summer', 'Winter', 'Christmas'].map(value => <button className={season === value ? 'active' : ''} onClick={() => setSeason(value)} key={value}>{value}</button>)}</div><span>{appliances.length} appliances</span></section>
    <section className="product-grid section">{appliances.map(product => <ProductCard item={product} key={product.id}/>)}</section>
  </>;
}

export function ContactPage() {
  const {content} = useContent();
  const [params] = useSearchParams();
  const project = params.get('project');
  const [sent, setSent] = useState(false);
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); const subject = encodeURIComponent(`${data.get('subject')} — ${data.get('name')}`); const body = encodeURIComponent(`Name: ${data.get('name')}\nPhone: ${data.get('phone')}\n\n${data.get('message')}`); window.location.href = `mailto:info@nk-electrical.com?subject=${subject}&body=${body}`; setSent(true); };
  const defaultMessage = project ? `I would like to discuss the ${project} project and a related electrical requirement.\n\nProject or property details:` : '';
  return <>
    <PageIntro eyebrow="Electrical enquiry" title="Your enquiry," italic="sent to the right specialist." body={content.contactNote}/>
    <section className="contact-layout section"><div className="contact-details"><div><MapPin/><span><b>Visit the store</b>72 Makedonitissis Str.<br/>Strovolos 2057, Cyprus<a target="_blank" rel="noreferrer" href="https://www.google.com/maps/search/?api=1&query=72+Makedonitissis+Strovolos+2057+Cyprus">Open in maps <ArrowUpRight/></a></span></div><div><Phone/><span><b>Call</b><a href="tel:+35722494145">+357 22 494145</a><small>Electrical installation, fault and maintenance enquiries</small></span></div><div><Mail/><span><b>Write</b><a href="mailto:info@nk-electrical.com">info@nk-electrical.com</a></span></div><div className="hours"><b>Store hours</b><p><span>Mon · Tue · Thu · Fri</span>09:00–18:00</p><p><span>Wednesday · Saturday</span>09:00–14:00</p><p><span>Sunday</span>Closed</p></div></div>
      <form className="contact-form" onSubmit={submit}><div className="form-intro"><span>{project ? 'Project discussion' : 'Electrical enquiry'}</span><h2>What needs powering,<br/>installing or controlling?</h2></div><label>Your name<input required name="name" autoComplete="name"/></label><label>Phone<input required name="phone" autoComplete="tel"/></label><label>Starting point<select name="subject" defaultValue={project ? 'Project discussion' : 'New electrical project'}>{project && <option>Project discussion</option>}<option>New electrical project</option><option>Electrical installation</option><option>Lighting selection</option><option>Appliance enquiry</option><option>Smart home system</option><option>Electrical support</option></select></label><label>Tell us about the work<textarea required name="message" rows={6} defaultValue={defaultMessage}/></label><button className="button copper" type="submit">Prepare email <ArrowUpRight/></button>{sent && <p className="form-note"><Check/> Your email app should now be open with the details prepared.</p>}</form></section>
  </>;
}

export function NotFound() {
  return <section className="not-found"><span>Not found</span><h1>This circuit ends here.</h1><p>The page may have moved, but the useful paths are still close.</p><Link className="button copper" to="/">Return home <ArrowUpRight/></Link></section>;
}
