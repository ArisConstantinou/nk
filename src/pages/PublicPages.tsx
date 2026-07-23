import {Fragment, useEffect, useRef, useState} from 'react';
import {Link, useLocation, useParams, useSearchParams} from 'react-router-dom';
import {AnimatePresence, motion} from 'framer-motion';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import {team} from '../content';
import {useContent} from '../context/ContentContext';
import type {Product, Project} from '../types';
import {publicAsset} from '../utils/assets';
import {CmsSections} from '../components/CmsSections';
import {ResponsiveImage} from '../components/ResponsiveImage';
import {ManagedPublicForm} from '../components/ManagedPublicForm';
import {ProductShareActions} from '../components/ProductShareActions';
import {ContactCommandCenter} from '../components/ContactCommandCenter';
import {ContactSignalPlayer} from '../components/ContactSignalPlayer';
import {AboutHeritageExperience} from '../components/AboutHeritageExperience';
import {pageVisualForPath} from '../pageVisuals';

const pageFocusByEyebrow: Record<string, [string, string, string]> = {
  'The people behind every installation': ['Engineering', 'Design', 'Installations'],
  'Complete installed project archive': ['Planned', 'Installed', 'Documented'],
  'Electrical installations': ['Load study', 'Protection', 'Certification'],
  'Lighting and appliance discovery': ['Purpose', 'Season', 'Room'],
  'Dedicated lighting department': ['Ambience', 'Specification', 'Supply'],
  'Electrical appliances': ['Select', 'Connect', 'Support'],
  'Electrical enquiry': ['Describe', 'Direct', 'Respond'],
};

const pageContextByEyebrow: Record<string, {index: string; brief: string}> = {
  'The people behind every installation': {
    index: 'COMPANY / PEOPLE & RESPONSIBILITIES',
    brief: 'Company overview',
  },
  'Complete installed project archive': {
    index: 'PROJECTS / COMPLETED INSTALLATIONS',
    brief: 'Archive overview',
  },
  'Electrical installations': {
    index: 'INSTALLATIONS / POWER & PROTECTION',
    brief: 'Installation scope',
  },
  'Lighting and appliance discovery': {
    index: 'DISCOVERY / LIGHTING & APPLIANCES',
    brief: 'How to browse',
  },
  'Dedicated lighting department': {
    index: 'LIGHTING / DESIGN & SUPPLY',
    brief: 'Lighting scope',
  },
  'Electrical appliances': {
    index: 'APPLIANCES / SELECT & CONNECT',
    brief: 'Product scope',
  },
  'Electrical enquiry': {
    index: 'CONTACT / DIRECT TO SPECIALIST',
    brief: 'Enquiry routing',
  },
};

function HeroWords({text, breakAfter = []}: {text: string; breakAfter?: number[]}) {
  const words = text.trim().split(/\s+/);
  const breaks = new Set(breakAfter);
  return <>{words.map((word, index) => <Fragment key={`${word}-${index}`}><span className="system-page-title__word" data-word-index={index}>{word}{index < words.length - 1 ? ' ' : null}</span>{breaks.has(index) && <br className="system-page-title__break" aria-hidden="true"/>}</Fragment>)}</>;
}

export function PageIntro({eyebrow, title, italic, body}: {eyebrow: string; title: string; italic?: string; body: string}) {
  const location = useLocation();
  const {pageForRoute} = useContent();
  const cmsPage = pageForRoute(location.pathname);
  const visibleEyebrow = cmsPage?.eyebrow || eyebrow;
  const visibleTitle = cmsPage?.introTitle || cmsPage?.heroTitle || title;
  const visibleItalic = cmsPage?.introAccent || italic;
  const visibleBody = cmsPage?.introBody || cmsPage?.heroBody || body;
  const pageVisual = pageVisualForPath(location.pathname);
  const focus = pageVisual?.focus || pageFocusByEyebrow[visibleEyebrow] || ['Scope', 'Coordinate', 'Deliver'];
  const context = pageContextByEyebrow[visibleEyebrow] || {
    index: `${visibleEyebrow.toUpperCase()} / NK ELECTRICAL`,
    brief: 'Page overview',
  };
  const [indexParent, ...indexCurrentParts] = context.index.split(/\s+\/\s+/);
  const indexCurrent = indexCurrentParts.join(' / ');
  const breadcrumbBackPath = location.pathname.startsWith('/services/')
    ? '/services'
    : location.pathname.startsWith('/shop/')
      ? '/shop'
      : location.pathname.startsWith('/projects/')
        ? '/projects'
        : '/';
  return <><section className="system-page-intro" data-hero-composition={pageVisual?.composition}>
    <div className="system-page-index">
      <nav aria-label="Breadcrumb" data-visual-no-edit>
        {pageVisual && <span className="system-page-index__serial">{pageVisual.serial}</span>}
        <Link to={breadcrumbBackPath} aria-label={`Back to ${indexParent.toLowerCase()}`}>{indexParent}</Link>
        {indexCurrent && <><b aria-hidden="true">/</b><span aria-current="page">{indexCurrent}</span></>}
      </nav>
    </div>
    <div className="system-page-title"><span {...(cmsPage ? {'data-visual-kind': 'page', 'data-visual-slug': cmsPage.slug, 'data-visual-path': 'eyebrow', 'data-visual-edit': 'text', 'data-visual-label': 'Page eyebrow'} : {})}>{visibleEyebrow}</span><h1 aria-label={`${visibleTitle}${visibleItalic ? ` ${visibleItalic}` : ''}`}><span className="system-page-title__line" {...(cmsPage ? {'data-visual-kind': 'page', 'data-visual-slug': cmsPage.slug, 'data-visual-path': 'introTitle', 'data-visual-edit': 'text', 'data-visual-label': 'Page title'} : {})}><HeroWords text={visibleTitle} breakAfter={pageVisual?.composition === 'gallery' ? [1, 3] : undefined}/></span>{visibleItalic && <em className="system-page-title__accent" {...(cmsPage ? {'data-visual-kind': 'page', 'data-visual-slug': cmsPage.slug, 'data-visual-path': 'introAccent', 'data-visual-edit': 'text', 'data-visual-label': 'Page title accent'} : {})}><HeroWords text={visibleItalic}/></em>}</h1></div>
    <aside className="system-page-brief"><small>{pageVisual?.briefLabel || context.brief}</small><p {...(cmsPage ? {'data-visual-kind': 'page', 'data-visual-slug': cmsPage.slug, 'data-visual-path': 'introBody', 'data-visual-edit': 'text', 'data-visual-label': 'Page introduction', 'data-visual-multiline': 'true'} : {})}>{visibleBody}</p><div aria-label={`${visibleEyebrow} focus`}><span>{focus[0]}</span><i/><span>{focus[1]}</span><i/><span>{focus[2]}</span></div></aside>
    {pageVisual && <figure className="system-page-art">
      <ResponsiveImage src={publicAsset(pageVisual.image)} alt={pageVisual.alt} loading="eager" fetchPriority="high" style={{objectPosition: pageVisual.position}}/>
      <span className="system-page-art__wash" aria-hidden="true"/>
      <figcaption><small>{pageVisual.label}</small><strong>{pageVisual.signal}</strong></figcaption>
    </figure>}
    {pageVisual?.composition === 'signal' && <ContactSignalPlayer/>}
    {pageVisual && <div className="system-page-ornament" aria-hidden="true"><span>{pageVisual.serial}</span><i/><i/><i/><b/></div>}
    <div className="system-page-trace" aria-hidden="true"><i/><i/><i/><b/></div>
  </section>{cmsPage&&<CmsSections sections={cmsPage.sections} pageSlug={cmsPage.slug}/>}</>;
}

export function AboutPage() {
  const {content, company} = useContent();
  return <div className="about-page">
    <AboutHeritageExperience
      title={content.aboutTitle}
      heroBody={content.aboutBody}
      introduction={company.introduction}
      summary={company.heading || content.aboutBody}
      history={company.history}
      companySlug={company.slug}
      members={team}
    />
    <section className="ia-partnerships section">
      <header><span>PARTNERSHIPS / PRODUCT ECOSYSTEM</span><h2>Specialist relationships that support the work.</h2><p>NK Electrical combines its installation team with established lighting brands, product suppliers and project collaborators.</p></header>
      <div>{(company.partnerships.length ? company.partnerships : ['ACA Lighting', 'Nova Luce', 'VIOKEF', 'Architects, designers & contractors']).map((partner, index) => <article key={`${partner}-${index}`}><small>{String(index + 1).padStart(2, '0')} / PARTNER</small><h3 data-visual-kind="company" data-visual-slug={company.slug} data-visual-path={`partnerships@line.${index}`} data-visual-edit="text" data-visual-label={`Partnership ${index + 1}`}>{partner}</h3><p>{index < 3 ? 'Lighting and product expertise available through the NK Electrical project and showroom ecosystem.' : 'Project collaboration that keeps power, lighting, equipment and controls aligned before installation.'}</p></article>)}</div>
    </section>
  </div>;
}

export function ProjectsPage() {
  const {content} = useContent();
  const projectCards = content.projects;
  const [category, setCategory] = useState('All');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [discussionOpen, setDiscussionOpen] = useState(false);
  const modalRef = useRef<HTMLElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  const moveProject = (direction: -1 | 1) => {
    setSelectedProject(current => {
      if (!current) return null;
      const currentIndex = projectCards.findIndex(project => project.id === current.id);
      return projectCards[(currentIndex + direction + projectCards.length) % projectCards.length];
    });
  };

  useEffect(() => {
    if (!selectedProject) return;
    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
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
    window.setTimeout(() => modalRef.current?.querySelector<HTMLElement>('button, a, input, textarea, select')?.focus(), 0);
    window.addEventListener('keydown', handleProjectKeys);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleProjectKeys);
      previouslyFocusedRef.current?.focus();
    };
  }, [selectedProject]);

  useEffect(() => {
    setDiscussionOpen(false);
  }, [selectedProject?.id]);

  useEffect(() => {
    if (!discussionOpen) return;
    document.getElementById('project-discussion-panel')?.scrollIntoView({behavior: 'smooth', block: 'nearest'});
  }, [discussionOpen]);

  const selectedIndex = selectedProject ? projectCards.findIndex(project => project.id === selectedProject.id) : -1;
  const previousProject = selectedIndex >= 0 ? projectCards[(selectedIndex - 1 + projectCards.length) % projectCards.length] : null;
  const nextProject = selectedIndex >= 0 ? projectCards[(selectedIndex + 1) % projectCards.length] : null;
  const filteredProjects = category === 'All' ? projectCards : projectCards.filter(project => project.category === category);

  return <>
    <PageIntro eyebrow="Complete installed project archive" title="Electrical work," italic="shown on site." body="Filter the installed project archive by sector. Each record now includes a visible completion-date field; dates not present in the source archive are clearly marked for confirmation rather than invented."/>
    <section className="ia-project-filters section" aria-label="Project filters"><div><SlidersHorizontal/><span>Filter projects</span></div><div>{['All', 'Residential', 'Commercial', 'Retail', 'Mixed use'].map(value => <button type="button" className={category === value ? 'active' : ''} aria-pressed={category === value} onClick={() => setCategory(value)} key={value}>{value}</button>)}</div><b>{filteredProjects.length} projects</b></section>
    <section className="project-archive-grid section" aria-label="NK Electrical completed projects">{filteredProjects.map(project =>
      <button className="project-archive-card" type="button" aria-haspopup="dialog" onClick={() => setSelectedProject(project)} key={project.id}>
        <span className="project-archive-image"><ResponsiveImage src={project.image} alt={`${project.name} completed installation ${project.number}`} loading="lazy" data-visual-kind="project" data-visual-slug={project.id} data-visual-path="image" data-visual-edit="image" data-visual-label="Project image"/><span>View project <ArrowUpRight/></span></span>
        <span className="project-archive-copy"><small>Project <span data-visual-kind="project" data-visual-slug={project.id} data-visual-path="number" data-visual-edit="text" data-visual-label="Project number">{project.number}</span> · <span data-visual-kind="project" data-visual-slug={project.id} data-visual-path="category" data-visual-edit="text" data-visual-label="Project category">{project.category}</span></small><strong data-visual-kind="project" data-visual-slug={project.id} data-visual-path="$title" data-visual-edit="text" data-visual-label="Project title">{project.name}</strong><span data-visual-kind="project" data-visual-slug={project.id} data-visual-path="type" data-visual-edit="text" data-visual-label="Project type">{project.type}</span><time>Completion date · <span data-visual-kind="project" data-visual-slug={project.id} data-visual-path="completionDate" data-visual-edit="text" data-visual-label="Completion date">{project.completionDate || 'Date to be confirmed'}</span></time></span>
      </button>
    )}</section>
    <section className="project-principle section"><span className="eyebrow light">The electrical method</span><blockquote>“Plan the circuits, coordinate the fittings, test every connection.”</blockquote><div><span>Survey the site</span><ArrowRight/><span>Install the system</span><ArrowRight/><span>Test and support</span></div></section>
    <AnimatePresence>{selectedProject &&
      <motion.div className="project-modal-backdrop" role="presentation" onMouseDown={() => setSelectedProject(null)} initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}}>
        <motion.article ref={modalRef} className="project-modal" role="dialog" aria-modal="true" aria-labelledby="project-modal-title" onMouseDown={event => event.stopPropagation()} initial={{opacity: 0, y: 30, scale: .98}} animate={{opacity: 1, y: 0, scale: 1}} exit={{opacity: 0, y: 20, scale: .98}}>
          <button className="project-modal-close" type="button" aria-label="Close project details" onClick={() => setSelectedProject(null)}><X/></button>
          <div className="project-modal-image">
            <ResponsiveImage key={selectedProject.id} src={selectedProject.image} alt={`${selectedProject.name} completed installation ${selectedProject.number}`}/>
            <div className="project-modal-identity" aria-live="polite"><small>Installed project · {selectedProject.number} of {projectCards.length}</small><h2 id="project-modal-title">{selectedProject.name}</h2><span>{selectedProject.type}</span><time>Completion date · {selectedProject.completionDate || 'Date to be confirmed'}</time></div>
            <button className="project-modal-nav previous" type="button" aria-label={`Previous project: ${previousProject?.name}`} onClick={() => moveProject(-1)}><ChevronLeft/></button>
            <button className="project-modal-nav next" type="button" aria-label={`Next project: ${nextProject?.name}`} onClick={() => moveProject(1)}><ChevronRight/></button>
          </div>
          <div className="project-modal-copy">
            <p>{selectedProject.text}</p><b>Installed scope</b><ul>{selectedProject.systems.map(system => <li key={system}><Check/>{system}</li>)}</ul>
            <button className={`button copper project-discussion-toggle ${discussionOpen ? 'open' : ''}`} type="button" aria-expanded={discussionOpen} aria-controls="project-discussion-panel" onClick={() => setDiscussionOpen(open => !open)}><span>{discussionOpen ? 'Close discussion' : 'Discuss a similar project'}</span><ChevronDown/></button>
            <AnimatePresence initial={false}>{discussionOpen &&
              <motion.div id="project-discussion-panel" initial={{height: 0, opacity: 0}} animate={{height: 'auto', opacity: 1}} exit={{height: 0, opacity: 0}}>
                <ManagedPublicForm slug="project-discussion" className="project-discussion-panel" eyebrow={`Project ${selectedProject.number}`} title="Start the discussion" defaults={{project: `${selectedProject.name} · Project ${selectedProject.number}`}}/>
              </motion.div>
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
  category: ['All', 'Lighting', 'Coffee', 'Kitchen', 'Cooling', 'Cleaning', 'Heating', 'Home', 'Beauty', 'Sound & Vision'],
  season: ['All', 'All year', 'Summer', 'Winter', 'Christmas'],
  space: ['All', 'Living', 'Kitchen', 'Outdoor', 'Bedroom', 'Workspace'],
};

function ProductCard({item}: {item: Product}) {
  return <Link to={`/shop/product/${item.id}`} className="product-card"><div className="product-image"><ResponsiveImage src={item.image} alt={item.name} loading="lazy" decoding="async" data-visual-kind="product" data-visual-slug={item.id} data-visual-path="image" data-visual-edit="image" data-visual-label="Product image"/><span>View details <ArrowUpRight/></span></div><div className="product-info"><small><span data-visual-kind="product" data-visual-slug={item.id} data-visual-path="category" data-visual-edit="text" data-visual-label="Product category">{item.category}</span> · <span data-visual-kind="product" data-visual-slug={item.id} data-visual-path="season" data-visual-edit="text" data-visual-label="Product season">{item.season}</span></small><h3 data-visual-kind="product" data-visual-slug={item.id} data-visual-path="$title" data-visual-edit="text" data-visual-label="Product name">{item.name}</h3><p data-visual-kind="product" data-visual-slug={item.id} data-visual-path="note" data-visual-edit="text" data-visual-label="Product description" data-visual-multiline="true">{item.note}</p></div></Link>;
}

export function ExplorePage() {
  const {content} = useContent();
  const [params, setParams] = useSearchParams();
  const category = params.get('category') || 'All';
  const season = params.get('season') || 'All';
  const space = params.get('space') || 'All';
  const viewAll = params.get('view') === 'all';
  const [visibleCount, setVisibleCount] = useState(48);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const set = (key: string, value: string) => { const next = new URLSearchParams(params); value === 'All' ? next.delete(key) : next.set(key, value); setParams(next); };
  const setViewAll = (enabled: boolean) => {
    const next = new URLSearchParams(params);
    enabled ? next.set('view', 'all') : next.delete('view');
    setVisibleCount(48);
    setParams(next);
  };
  const filtered = content.products.filter(product => (category === 'All' || product.category === category) && (season === 'All' || product.season === season) && (space === 'All' || product.space === space));
  const shown = viewAll ? filtered : filtered.slice(0, visibleCount);
  const selectedFilters = {category, season, space};
  const activeFilterCount = Object.values(selectedFilters).filter(value => value !== 'All').length;
  const clearFilters = () => {
    const next = new URLSearchParams(params);
    ['category', 'season', 'space'].forEach(key => next.delete(key));
    setParams(next);
  };
  useEffect(() => setVisibleCount(48), [category, season, space]);
  return <>
    <PageIntro eyebrow="NK Electrical Shop" title="Products organised" italic="for practical browsing." body="Browse products only: lighting, coffee, kitchen, cooling and household equipment. Installation and design expertise remains under Services."/>
    <section className="filter-shell section">
      <div className="filter-top">
        <div><SlidersHorizontal/><b>Refine the collection</b></div>
        <div className="shop-view-controls">
          <span>{filtered.length} considered matches</span>
          <button type="button" className={!viewAll ? 'active' : ''} aria-pressed={!viewAll} onClick={() => setViewAll(false)}>48 at a time</button>
          <button type="button" className={viewAll ? 'active' : ''} aria-pressed={viewAll} onClick={() => setViewAll(true)}>View all</button>
        </div>
      </div>
      <button
        type="button"
        className={`shop-mobile-filter-toggle${filtersOpen ? ' is-open' : ''}`}
        aria-expanded={filtersOpen}
        aria-controls="shop-mobile-filter-panel"
        onClick={() => setFiltersOpen(open => !open)}
      >
        <span className="shop-mobile-filter-toggle__title">
          <SlidersHorizontal/>
          <span><small>Filters &amp; categories</small><strong>{activeFilterCount ? `${activeFilterCount} active` : 'All products'}</strong></span>
        </span>
        <span className="shop-mobile-filter-toggle__result">{filtered.length} results</span>
        <ChevronDown/>
      </button>
      <div id="shop-mobile-filter-panel" className={`shop-filter-panel${filtersOpen ? ' is-mobile-open' : ''}`}>
        {Object.entries(filterValues).map(([key, values]) => {
          const selectedValue = selectedFilters[key as keyof typeof selectedFilters];
          return <div className="filter-row" key={key}>
            <b><span>{key}</span><em>{selectedValue}</em></b>
            <div>{values.map(value => <button type="button" aria-pressed={selectedValue === value} className={selectedValue === value ? 'active' : ''} onClick={() => set(key, value)} key={value}>{value}</button>)}</div>
          </div>;
        })}
        <div className="shop-mobile-view-mode" aria-label="Number of products shown">
          <span>Display</span>
          <button type="button" className={!viewAll ? 'active' : ''} aria-pressed={!viewAll} onClick={() => setViewAll(false)}>48 at a time</button>
          <button type="button" className={viewAll ? 'active' : ''} aria-pressed={viewAll} onClick={() => setViewAll(true)}>View all</button>
        </div>
        <div className="shop-mobile-filter-actions">
          <button type="button" className="shop-mobile-filter-clear" disabled={!activeFilterCount} onClick={clearFilters}>Clear all</button>
          <button type="button" className="shop-mobile-filter-apply" onClick={() => setFiltersOpen(false)}>Show {filtered.length} products <ArrowRight/></button>
        </div>
      </div>
    </section>
    <section className="ia-shop-gateway section"><div><FileText/><span>CATALOGUES / PDF DOWNLOADS</span><h2>Looking for full brand collections?</h2><p>ACA, Nova Luce and VIOKEF PDF catalogues now live exclusively inside the Shop.</p></div><Link to="/shop/catalogues">Open catalogues <ArrowRight/></Link></section>
    <section className="product-grid section">{shown.map(product => <article className="product-card-share-shell" key={product.id}><ProductCard item={product}/><ProductShareActions product={product}/></article>)}</section>
    {!viewAll && shown.length < filtered.length && <section className="catalogue-load-more section"><span>Showing {shown.length} of {filtered.length}</span><div><button type="button" onClick={() => setVisibleCount(count => count + 48)}>Load 48 more <ArrowRight/></button><button type="button" className="secondary" onClick={() => setViewAll(true)}>View all {filtered.length} products</button></div></section>}
    {filtered.length === 0 && <div className="empty-state"><Sparkles/><h2>No exact match—yet.</h2><p>Remove one filter to widen the shortlist.</p><button onClick={() => setParams({})}>Clear filters</button></div>}
  </>;
}

export function ProductPage() {
  const {id} = useParams();
  const {content} = useContent();
  const item = content.products.find(product => product.id === id);
  if (!item) return <section className="not-found"><span>Not found</span><h1>That product has moved.</h1><Link to="/shop">Return to the Shop</Link></section>;
  return <section className="product-detail section"><Link className="back-link" to="/shop">← Back to Shop</Link><div className="product-detail-image"><ResponsiveImage src={item.image} alt={item.name} data-visual-kind="product" data-visual-slug={item.id} data-visual-path="image" data-visual-edit="image" data-visual-label="Product image"/></div><div className="product-detail-copy"><span className="eyebrow"><span data-visual-kind="product" data-visual-slug={item.id} data-visual-path="category" data-visual-edit="text" data-visual-label="Product category">{item.category}</span> · <span data-visual-kind="product" data-visual-slug={item.id} data-visual-path="space" data-visual-edit="text" data-visual-label="Product space">{item.space}</span></span><h1 data-visual-kind="product" data-visual-slug={item.id} data-visual-path="$title" data-visual-edit="text" data-visual-label="Product name">{item.name}</h1><p data-visual-kind="product" data-visual-slug={item.id} data-visual-path="note" data-visual-edit="text" data-visual-label="Product description" data-visual-multiline="true">{item.note}</p><dl><div><dt>Best considered for</dt><dd data-visual-kind="product" data-visual-slug={item.id} data-visual-path="space" data-visual-edit="text" data-visual-label="Best space">{item.space}</dd></div><div><dt>Seasonal edit</dt><dd data-visual-kind="product" data-visual-slug={item.id} data-visual-path="season" data-visual-edit="text" data-visual-label="Season">{item.season}</dd></div><div><dt>Available through</dt><dd>NK Electrical, Strovolos</dd></div></dl><a className="button copper" href={`mailto:info@nk-electrical.com?subject=${encodeURIComponent(`Product enquiry: ${item.name}`)}`}>Ask about this product <ArrowUpRight/></a></div></section>;
}

export function LightingPage() {
  const {content} = useContent();
  const [brand, setBrand] = useState('All');
  const [focus, setFocus] = useState('All');
  const shown = content.catalogues.filter(catalogue => (brand === 'All' || catalogue.brand === brand) && (focus === 'All' || catalogue.focus === focus));
  return <>
    <PageIntro eyebrow="Shop catalogues & downloads" title="Official collections," italic="ready to open." body="Browse original PDF catalogues by brand and lighting purpose. These downloads belong to the Shop; lighting design remains a separate service."/>
    <section className="catalogue-controls section"><div><b>Brand</b>{['All', 'ACA', 'Nova Luce', 'VIOKEF'].map(value => <button className={brand === value ? 'active' : ''} onClick={() => setBrand(value)} key={value}>{value}</button>)}</div><div><b>Focus</b>{['All', 'Decorative', 'Architectural', 'Kids', 'Natural', 'Fans'].map(value => <button className={focus === value ? 'active' : ''} onClick={() => setFocus(value)} key={value}>{value}</button>)}</div></section>
    <section className="catalogue-grid section">{shown.map((catalogue, index) => <a className={`catalogue-card tone-${index % 4}`} target="_blank" rel="noreferrer" href={catalogue.url} key={catalogue.url}><div className="catalogue-cover"><span>NK / LIGHTING</span><b data-visual-kind="catalogue" data-visual-slug={catalogue.id || ''} data-visual-path="brand" data-visual-edit="text" data-visual-label="Catalogue brand">{catalogue.brand}</b><strong data-visual-kind="catalogue" data-visual-slug={catalogue.id || ''} data-visual-path="year" data-visual-edit="text" data-visual-label="Catalogue year">{catalogue.year}</strong><i/><small data-visual-kind="catalogue" data-visual-slug={catalogue.id || ''} data-visual-path="focus" data-visual-edit="text" data-visual-label="Catalogue focus">{catalogue.focus}</small></div><div><FileText/><h3 data-visual-kind="catalogue" data-visual-slug={catalogue.id || ''} data-visual-path="$title" data-visual-edit="text" data-visual-label="Catalogue name" data-visual-link-path="url">{catalogue.name}</h3><span>Open original catalogue <ArrowUpRight/></span></div></a>)}</section>
    <section className="catalogue-help section"><div><BookOpen/><h2>Found a product?</h2></div><p>Email the catalogue name, product code and quantity. Add your name and phone number so the Shop team can respond with the right context.</p><a className="button copper" href="mailto:thelma@nk-electrical.com?subject=Shop%20catalogue%20enquiry">Ask about a catalogue product <ArrowUpRight/></a></section>
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
  return <>
    <PageIntro eyebrow="Electrical enquiry" title="Your enquiry," italic="sent to the right specialist." body={content.contactNote}/>
    <ContactCommandCenter project={project}/>
    <section className="ia-conversion-band section"><div><small>READY TO SCOPE THE WORK?</small><h2>Use the structured quote form for project requirements.</h2></div><Link to="/request-a-quote">Request a Quote <ArrowRight/></Link></section>
  </>;
}

export function ManagedPage() {
  const location = useLocation();
  const {pageForRoute} = useContent();
  const page = pageForRoute(location.pathname);
  if (!page) return <NotFound/>;
  return <PageIntro
    eyebrow={page.eyebrow || page.navigationTitle || page.title}
    title={page.introTitle || page.heroTitle || page.title}
    italic={page.introAccent || page.heroAccent}
    body={page.introBody || page.heroBody || `Learn more about ${page.title}.`}
  />;
}

export function NotFound() {
  return <section className="not-found"><span>Not found</span><h1>This circuit ends here.</h1><p>The page may have moved, but the useful paths are still close.</p><Link className="button copper" to="/">Return home <ArrowUpRight/></Link></section>;
}
