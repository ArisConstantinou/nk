import {useRef, useState, type ChangeEvent, type PointerEvent as ReactPointerEvent} from 'react';
import {ArrowDown, ArrowLeft, ArrowUp, CircuitBoard, Download, Eye, FileText, Grip, ImagePlus, PackagePlus, PanelsTopLeft, RotateCcw, Save, Settings2, Trash2, Upload} from 'lucide-react';
import {Link} from 'react-router-dom';
import {useContent} from '../context/ContentContext';
import type {Catalogue, Product, Project, SiteContent, ThemeContent} from '../types';
import {publicAsset} from '../utils/assets';

const blankProduct: Product = {
  id: 'new-piece', name: 'New collection piece', category: 'Lighting', season: 'All year', space: 'Living', image: publicAsset('assets/products/oia.jpg'), note: 'Describe where this belongs and what makes it useful.',
};

const blankCatalogue: Catalogue = {
  name: 'New catalogue', brand: 'ACA', year: '2026', focus: 'Decorative', url: 'https://',
};

type AdminTab = 'content' | 'products' | 'catalogues' | 'projects' | 'layout';

export default function Admin() {
  const {content, setContent, reset, exportContent, importContent} = useContent();
  const [tab, setTab] = useState<AdminTab>('content');
  const [notice, setNotice] = useState('All edits save automatically in this browser.');
  const fileRef = useRef<HTMLInputElement>(null);
  const techCopy = content.themeContent.tech;

  const setField = <K extends keyof SiteContent>(key: K, value: SiteContent[K]) => setContent(current => ({...current, [key]: value}));
  const setTechField = <K extends keyof ThemeContent>(key: K, value: ThemeContent[K]) => setContent(current => ({...current, themeContent: {...current.themeContent, tech: {...current.themeContent.tech, [key]: value}}}));

  const uploadImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setField('heroImage', String(reader.result));
    reader.readAsDataURL(file);
  };

  const importJson = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try { await importContent(file); setNotice('Content file imported successfully.'); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Import failed.'); }
  };

  const moveProduct = (index: number, direction: -1 | 1) => setContent(current => {
    const items = [...current.products];
    const next = index + direction;
    if (next < 0 || next >= items.length) return current;
    [items[index], items[next]] = [items[next], items[index]];
    return {...current, products: items};
  });

  const updateProduct = (id: string, key: keyof Product, value: string) => setContent(current => ({...current, products: current.products.map(product => product.id === id ? {...product, [key]: value} : product)}));
  const updateCatalogue = (index: number, key: keyof Catalogue, value: string) => setContent(current => ({...current, catalogues: current.catalogues.map((catalogue, itemIndex) => itemIndex === index ? {...catalogue, [key]: value} : catalogue)}));
  const updateProject = <K extends keyof Project>(id: string, key: K, value: Project[K]) => setContent(current => ({...current, projects: current.projects.map(project => project.id === id ? {...project, [key]: value} : project)}));

  const pointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    const rect = target.parentElement!.getBoundingClientRect();
    const move = (pointerEvent: globalThis.PointerEvent) => setField('heroObject', {x: Math.max(0, Math.min(100, (pointerEvent.clientX - rect.left) / rect.width * 100)), y: Math.max(0, Math.min(100, (pointerEvent.clientY - rect.top) / rect.height * 100))});
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const title = tab === 'content' ? 'Systems content' : tab === 'products' ? 'Product manager' : tab === 'catalogues' ? 'Catalogue manager' : tab === 'projects' ? 'Project manager' : 'Layout lab';

  return <div className="admin-shell">
    <aside className="admin-sidebar">
      <Link className="admin-brand" to="/"><span>NK</span><div><b>Content admin</b><small>Systems theme only</small></div></Link>
      <nav>
        <button className={tab === 'content' ? 'active' : ''} onClick={() => setTab('content')}><CircuitBoard/>Site content</button>
        <button className={tab === 'products' ? 'active' : ''} onClick={() => setTab('products')}><PackagePlus/>Shop products</button>
        <button className={tab === 'catalogues' ? 'active' : ''} onClick={() => setTab('catalogues')}><FileText/>Catalogues</button>
        <button className={tab === 'projects' ? 'active' : ''} onClick={() => setTab('projects')}><PanelsTopLeft/>Projects</button>
        <button className={tab === 'layout' ? 'active' : ''} onClick={() => setTab('layout')}><Grip/>Hero layout</button>
      </nav>
      <div className="admin-side-bottom"><Link to="/"><Eye/>View live website</Link><button onClick={() => { reset(); setNotice('Published content restored.'); }}><RotateCcw/>Restore published copy</button></div>
    </aside>

    <main className="admin-main">
      <header><div><span>NK / CONTENT ADMIN</span><h1>{title}</h1></div><div className="admin-actions"><button onClick={() => fileRef.current?.click()}><Upload/>Import</button><input ref={fileRef} hidden type="file" accept="application/json" onChange={importJson}/><button onClick={exportContent}><Download/>Export</button><Link to="/"><ArrowLeft/>Exit admin</Link></div></header>
      <p className="admin-notice"><Save/>{notice}</p>

      {tab === 'content' && <div className="admin-grid">
        <section className="admin-panel"><div className="panel-title"><span>01</span><div><h2>Homepage hero</h2><p>The live Systems homepage. Other themes have been removed from the public site.</p></div></div><label>Eyebrow<input value={techCopy.eyebrow} onChange={event => setTechField('eyebrow', event.target.value)}/></label><label>Headline, line one<input value={techCopy.heroTitle} onChange={event => setTechField('heroTitle', event.target.value)}/></label><label>Headline, accent<input value={techCopy.heroAccent} onChange={event => setTechField('heroAccent', event.target.value)}/></label><label>Supporting line<input value={techCopy.heroTail} onChange={event => setTechField('heroTail', event.target.value)}/></label><label>Introduction<textarea rows={4} value={techCopy.heroBody} onChange={event => setTechField('heroBody', event.target.value)}/></label></section>
        <section className="admin-panel"><div className="panel-title"><span>02</span><div><h2>Services introduction</h2><p>Copy that introduces the service-only path on the homepage.</p></div></div><label>Section heading<textarea rows={3} value={techCopy.sectionTitle} onChange={event => setTechField('sectionTitle', event.target.value)}/></label><label>Section explanation<textarea rows={5} value={techCopy.sectionBody} onChange={event => setTechField('sectionBody', event.target.value)}/></label><div className="admin-theme-preview admin-theme-preview--tech"><small>{techCopy.eyebrow}</small><strong>{techCopy.heroTitle}<br/><em>{techCopy.heroAccent}</em></strong><p>{techCopy.heroBody}</p></div></section>
        <section className="admin-panel media-panel"><div className="panel-title"><span>03</span><div><h2>Homepage media</h2><p>The main Systems hero image.</p></div></div><div className="admin-image"><img src={content.heroImage} alt="Current homepage hero"/></div><label className="upload-button"><ImagePlus/>Choose image<input hidden type="file" accept="image/*" onChange={uploadImage}/></label><label>Image path<input value={content.heroImage} onChange={event => setField('heroImage', event.target.value)}/></label></section>
        <section className="admin-panel admin-shared-copy"><div className="panel-title"><span>04</span><div><h2>Company & contact copy</h2><p>Stable information used on About and Contact.</p></div></div><label>About heading<input value={content.aboutTitle} onChange={event => setField('aboutTitle', event.target.value)}/></label><label>About introduction<textarea rows={5} value={content.aboutBody} onChange={event => setField('aboutBody', event.target.value)}/></label><label>Contact introduction<textarea rows={3} value={content.contactNote} onChange={event => setField('contactNote', event.target.value)}/></label></section>
      </div>}

      {tab === 'products' && <div className="collection-admin"><div className="collection-toolbar"><p><b>{content.products.length} products</b><span>Products are published only under Shop.</span></p><button onClick={() => setContent(current => ({...current, products: [...current.products, {...blankProduct, id: `piece-${Date.now()}`}]}))}><PackagePlus/>Add product</button></div>{content.products.map((product, index) => <article className="product-admin-row" key={product.id}><img src={product.image} alt=""/><div className="product-admin-fields"><input aria-label="Product name" value={product.name} onChange={event => updateProduct(product.id, 'name', event.target.value)}/><input aria-label="Product description" value={product.note} onChange={event => updateProduct(product.id, 'note', event.target.value)}/><input aria-label="Product image path" value={product.image} onChange={event => updateProduct(product.id, 'image', event.target.value)}/><div><select aria-label="Product category" value={product.category} onChange={event => updateProduct(product.id, 'category', event.target.value)}>{['Lighting', 'Coffee', 'Kitchen', 'Cooling', 'Cleaning'].map(value => <option key={value}>{value}</option>)}</select><select aria-label="Product season" value={product.season} onChange={event => updateProduct(product.id, 'season', event.target.value)}>{['All year', 'Summer', 'Winter', 'Christmas'].map(value => <option key={value}>{value}</option>)}</select><select aria-label="Product space" value={product.space} onChange={event => updateProduct(product.id, 'space', event.target.value)}>{['Living', 'Kitchen', 'Outdoor', 'Bedroom', 'Workspace'].map(value => <option key={value}>{value}</option>)}</select></div></div><div className="row-actions"><button disabled={index === 0} onClick={() => moveProduct(index, -1)} aria-label="Move up"><ArrowUp/></button><button disabled={index === content.products.length - 1} onClick={() => moveProduct(index, 1)} aria-label="Move down"><ArrowDown/></button><button onClick={() => setContent(current => ({...current, products: current.products.filter(item => item.id !== product.id)}))} aria-label="Remove product"><Trash2/></button></div></article>)}</div>}

      {tab === 'catalogues' && <div className="collection-admin"><div className="collection-toolbar"><p><b>{content.catalogues.length} catalogues</b><span>PDFs appear only under Shop / Catalogues & Downloads.</span></p><button onClick={() => setContent(current => ({...current, catalogues: [...current.catalogues, {...blankCatalogue}]}))}><FileText/>Add catalogue</button></div>{content.catalogues.map((catalogue, index) => <article className="admin-catalogue-row" key={`${catalogue.url}-${index}`}><FileText/><div><input aria-label="Catalogue name" value={catalogue.name} onChange={event => updateCatalogue(index, 'name', event.target.value)}/><input aria-label="Catalogue URL" value={catalogue.url} onChange={event => updateCatalogue(index, 'url', event.target.value)}/><div><select aria-label="Catalogue brand" value={catalogue.brand} onChange={event => updateCatalogue(index, 'brand', event.target.value)}>{['ACA', 'Nova Luce', 'VIOKEF'].map(value => <option key={value}>{value}</option>)}</select><input aria-label="Catalogue year" value={catalogue.year} onChange={event => updateCatalogue(index, 'year', event.target.value)}/><select aria-label="Catalogue focus" value={catalogue.focus} onChange={event => updateCatalogue(index, 'focus', event.target.value)}>{['Decorative', 'Architectural', 'Kids', 'Natural', 'Fans'].map(value => <option key={value}>{value}</option>)}</select></div></div><button onClick={() => setContent(current => ({...current, catalogues: current.catalogues.filter((_, itemIndex) => itemIndex !== index)}))} aria-label="Remove catalogue"><Trash2/></button></article>)}</div>}

      {tab === 'projects' && <div className="collection-admin"><div className="collection-toolbar"><p><b>{content.projects.length} projects</b><span>Add verified completion dates here. Blank dates remain clearly marked “Date to be confirmed” on the public archive.</span></p></div>{content.projects.map(project => <article className="admin-project-row" key={project.id}><img src={project.image} alt=""/><div><input aria-label={`Project ${project.number} name`} value={project.name} onChange={event => updateProject(project.id, 'name', event.target.value)}/><input aria-label={`Project ${project.number} description`} value={project.type} onChange={event => updateProject(project.id, 'type', event.target.value)}/><div><select aria-label={`Project ${project.number} category`} value={project.category} onChange={event => updateProject(project.id, 'category', event.target.value as Project['category'])}>{['Residential', 'Commercial', 'Retail', 'Mixed use'].map(value => <option key={value}>{value}</option>)}</select><label>Completion date<input aria-label={`Project ${project.number} completion date`} type="date" value={project.completionDate} onChange={event => updateProject(project.id, 'completionDate', event.target.value)}/></label></div></div><span>{project.number}</span></article>)}</div>}

      {tab === 'layout' && <div className="layout-lab"><section><div className="panel-title"><span>01</span><div><h2>Move the signal marker</h2><p>Drag the marker across the Systems hero image.</p></div></div><div className="layout-stage"><img src={content.heroImage} alt="Hero layout preview"/><div className="draggable-object" onPointerDown={pointerDown} style={{left: `${content.heroObject.x}%`, top: `${content.heroObject.y}%`}}><Grip/><span>Signal / 01</span></div></div><div className="position-readout"><span>X {Math.round(content.heroObject.x)}%</span><span>Y {Math.round(content.heroObject.y)}%</span></div></section><aside><Settings2/><h2>Layout guardrails</h2><p>The marker stays inside the image safe frame on smaller screens.</p><ul><li>Percentage-based positioning</li><li>Pointer and touch compatible</li><li>Systems theme only</li></ul></aside></div>}
    </main>
  </div>;
}
