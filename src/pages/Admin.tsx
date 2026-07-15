import {useRef, useState, type ChangeEvent, type PointerEvent as ReactPointerEvent} from 'react';
import {ArrowDown, ArrowLeft, ArrowUp, CircuitBoard, Download, Eye, Grip, ImagePlus, Layers3, PackagePlus, Palette, RotateCcw, Route, Save, Settings2, Trash2, Upload} from 'lucide-react';
import {Link} from 'react-router-dom';
import {useContent} from '../context/ContentContext';
import {useTheme, type ExperienceTheme} from '../context/ThemeContext';
import type {Product, SiteContent, ThemeContent} from '../types';
import {publicAsset} from '../utils/assets';

const blankProduct: Product = {
  id: 'new-piece',
  name: 'New collection piece',
  category: 'Lighting',
  season: 'All year',
  space: 'Living',
  image: publicAsset('assets/products/oia.jpg'),
  note: 'Describe where this belongs and what makes it useful.',
};

const themeOptions: Array<{
  id: ExperienceTheme;
  name: string;
  summary: string;
  detail: string;
  Icon: typeof Route;
}> = [
  {id: 'flow', name: 'Flow', summary: 'Task-first', detail: 'Project paths, useful tools and a compact decision system.', Icon: Route},
  {id: 'tech', name: 'Systems', summary: 'Control room', detail: 'Technical system routing with the original command rail.', Icon: CircuitBoard},
  {id: 'studio', name: 'Studio', summary: 'Editorial', detail: 'The original image-led brand and collection experience.', Icon: Layers3},
];

export default function Admin() {
  const {content, setContent, reset, exportContent, importContent} = useContent();
  const {experienceTheme, setExperienceTheme} = useTheme();
  const [tab, setTab] = useState<'themes' | 'collection' | 'layout'>('themes');
  const [activeTheme, setActiveTheme] = useState<ExperienceTheme>(experienceTheme);
  const [notice, setNotice] = useState('All edits save automatically in this browser.');
  const fileRef = useRef<HTMLInputElement>(null);
  const activeCopy = content.themeContent[activeTheme];

  const setField = <K extends keyof SiteContent>(key: K, value: SiteContent[K]) => setContent(current => ({...current, [key]: value}));
  const setThemeField = <K extends keyof ThemeContent>(key: K, value: ThemeContent[K]) => setContent(current => ({
    ...current,
    themeContent: {...current.themeContent, [activeTheme]: {...current.themeContent[activeTheme], [key]: value}},
  }));

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
    try {
      await importContent(file);
      setNotice('Content file imported successfully.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Import failed.');
    }
  };

  const moveProduct = (index: number, direction: -1 | 1) => setContent(current => {
    const items = [...current.products];
    const next = index + direction;
    if (next < 0 || next >= items.length) return current;
    [items[index], items[next]] = [items[next], items[index]];
    return {...current, products: items};
  });

  const updateProduct = (id: string, key: keyof Product, value: string) => setContent(current => ({
    ...current,
    products: current.products.map(product => product.id === id ? {...product, [key]: value} : product),
  }));

  const pointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    const rect = target.parentElement!.getBoundingClientRect();
    const move = (pointerEvent: globalThis.PointerEvent) => setField('heroObject', {
      x: Math.max(0, Math.min(100, (pointerEvent.clientX - rect.left) / rect.width * 100)),
      y: Math.max(0, Math.min(100, (pointerEvent.clientY - rect.top) / rect.height * 100)),
    });
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const makeThemeLive = () => {
    setExperienceTheme(activeTheme);
    setNotice(`${themeOptions.find(option => option.id === activeTheme)?.name} is now the live website theme.`);
  };

  return <div className="admin-shell">
    <aside className="admin-sidebar">
      <Link className="admin-brand" to="/"><span>NK</span><div><b>Theme admin</b><small>Live site controls</small></div></Link>
      <nav>
        <button className={tab === 'themes' ? 'active' : ''} onClick={() => setTab('themes')}><Palette/>Themes</button>
        <button className={tab === 'collection' ? 'active' : ''} onClick={() => setTab('collection')}><PackagePlus/>Collection</button>
        <button className={tab === 'layout' ? 'active' : ''} onClick={() => setTab('layout')}><Grip/>Layout lab</button>
      </nav>
      <div className="admin-side-bottom">
        <Link to="/"><Eye/>View live website</Link>
        <button onClick={() => { reset(); setNotice('Published content restored for all themes.'); }}><RotateCcw/>Restore published copy</button>
      </div>
    </aside>

    <main className="admin-main">
      <header>
        <div><span>NK / THEME ADMIN</span><h1>{tab === 'themes' ? 'Theme content' : tab === 'collection' ? 'Collection manager' : 'Layout lab'}</h1></div>
        <div className="admin-actions">
          <button onClick={() => fileRef.current?.click()}><Upload/>Import</button>
          <input ref={fileRef} hidden type="file" accept="application/json" onChange={importJson}/>
          <button onClick={exportContent}><Download/>Export</button>
          <Link to="/"><ArrowLeft/>Exit admin</Link>
        </div>
      </header>
      <p className="admin-notice"><Save/>{notice}</p>

      {tab === 'themes' && <>
        <section className="admin-theme-switcher" aria-label="Theme admin panels">
          {themeOptions.map(({id, name, summary, detail, Icon}) => <button className={activeTheme === id ? 'active' : ''} type="button" aria-label={`Edit ${name} theme`} aria-pressed={activeTheme === id} data-theme-admin={id} onClick={() => setActiveTheme(id)} key={id}>
            <Icon/><span><small>{summary}</small><strong>{name}</strong><p>{detail}</p></span><b>{experienceTheme === id ? 'LIVE' : 'EDIT'}</b>
          </button>)}
        </section>

        <div className="admin-theme-heading">
          <div><span>{activeTheme.toUpperCase()} / CONTENT PANEL</span><h2>{themeOptions.find(option => option.id === activeTheme)?.name} theme</h2><p>These fields belong only to this theme. Shared company information and collection data remain consistent across all themes.</p></div>
          <button type="button" onClick={makeThemeLive}><Eye/>Set as live theme</button>
        </div>

        <div className="admin-grid">
          <section className="admin-panel">
            <div className="panel-title"><span>01</span><div><h2>Theme hero</h2><p>The first words visitors see in {activeTheme}.</p></div></div>
            <label>Eyebrow<input value={activeCopy.eyebrow} onChange={event => setThemeField('eyebrow', event.target.value)}/></label>
            <label>Headline, line one<input value={activeCopy.heroTitle} onChange={event => setThemeField('heroTitle', event.target.value)}/></label>
            <label>Headline, accent<input value={activeCopy.heroAccent} onChange={event => setThemeField('heroAccent', event.target.value)}/></label>
            <label>Supporting line<input value={activeCopy.heroTail} onChange={event => setThemeField('heroTail', event.target.value)}/></label>
            <label>Introduction<textarea rows={4} value={activeCopy.heroBody} onChange={event => setThemeField('heroBody', event.target.value)}/></label>
          </section>

          <section className="admin-panel">
            <div className="panel-title"><span>02</span><div><h2>Decision section</h2><p>The theme-specific bridge from message to action.</p></div></div>
            <label>Section heading<textarea rows={3} value={activeCopy.sectionTitle} onChange={event => setThemeField('sectionTitle', event.target.value)}/></label>
            <label>Section explanation<textarea rows={5} value={activeCopy.sectionBody} onChange={event => setThemeField('sectionBody', event.target.value)}/></label>
            <div className={`admin-theme-preview admin-theme-preview--${activeTheme}`}>
              <small>{activeCopy.eyebrow}</small><strong>{activeCopy.heroTitle}<br/><em>{activeCopy.heroAccent}</em></strong><p>{activeCopy.heroBody}</p>
            </div>
          </section>

          <section className="admin-panel media-panel">
            <div className="panel-title"><span>03</span><div><h2>Shared hero media</h2><p>Used across all three themes so brand imagery stays consistent.</p></div></div>
            <div className="admin-image"><img src={content.heroImage} alt="Current shared hero"/></div>
            <label className="upload-button"><ImagePlus/>Choose image<input hidden type="file" accept="image/*" onChange={uploadImage}/></label>
            <label>Image path<input value={content.heroImage} onChange={event => setField('heroImage', event.target.value)}/></label>
          </section>

          <section className="admin-panel admin-shared-copy">
            <div className="panel-title"><span>04</span><div><h2>Shared company copy</h2><p>Stable information used by every theme.</p></div></div>
            <label>Story heading<input value={content.aboutTitle} onChange={event => setField('aboutTitle', event.target.value)}/></label>
            <label>Story paragraph<textarea rows={5} value={content.aboutBody} onChange={event => setField('aboutBody', event.target.value)}/></label>
            <label>Contact introduction<textarea rows={3} value={content.contactNote} onChange={event => setField('contactNote', event.target.value)}/></label>
          </section>
        </div>
      </>}

      {tab === 'collection' && <div className="collection-admin">
        <div className="collection-toolbar"><p><b>{content.products.length} products</b><span>Reorder, edit, remove or add items. Collection changes are shared by every theme.</span></p><button onClick={() => setContent(current => ({...current, products: [...current.products, {...blankProduct, id: `piece-${Date.now()}`}]}))}><PackagePlus/>Add product</button></div>
        {content.products.map((product, index) => <article className="product-admin-row" key={product.id}>
          <img src={product.image} alt=""/>
          <div className="product-admin-fields">
            <input aria-label="Product name" value={product.name} onChange={event => updateProduct(product.id, 'name', event.target.value)}/>
            <input aria-label="Product description" value={product.note} onChange={event => updateProduct(product.id, 'note', event.target.value)}/>
            <input aria-label="Product image path" value={product.image} onChange={event => updateProduct(product.id, 'image', event.target.value)}/>
            <div>
              <select aria-label="Product category" value={product.category} onChange={event => updateProduct(product.id, 'category', event.target.value)}>{['Lighting', 'Coffee', 'Kitchen', 'Cooling', 'Cleaning'].map(value => <option key={value}>{value}</option>)}</select>
              <select aria-label="Product season" value={product.season} onChange={event => updateProduct(product.id, 'season', event.target.value)}>{['All year', 'Summer', 'Winter', 'Christmas'].map(value => <option key={value}>{value}</option>)}</select>
              <select aria-label="Product space" value={product.space} onChange={event => updateProduct(product.id, 'space', event.target.value)}>{['Living', 'Kitchen', 'Outdoor', 'Bedroom', 'Workspace'].map(value => <option key={value}>{value}</option>)}</select>
            </div>
          </div>
          <div className="row-actions">
            <button disabled={index === 0} onClick={() => moveProduct(index, -1)} aria-label="Move up"><ArrowUp/></button>
            <button disabled={index === content.products.length - 1} onClick={() => moveProduct(index, 1)} aria-label="Move down"><ArrowDown/></button>
            <button onClick={() => setContent(current => ({...current, products: current.products.filter(item => item.id !== product.id)}))} aria-label="Remove product"><Trash2/></button>
          </div>
        </article>)}
      </div>}

      {tab === 'layout' && <div className="layout-lab">
        <section>
          <div className="panel-title"><span>01</span><div><h2>Move the signal marker</h2><p>Drag the marker across the shared hero. Its position is saved for themes that use it.</p></div></div>
          <div className="layout-stage"><img src={content.heroImage} alt="Hero layout preview"/><div className="draggable-object" onPointerDown={pointerDown} style={{left: `${content.heroObject.x}%`, top: `${content.heroObject.y}%`}}><Grip/><span>Signal / 01</span></div></div>
          <div className="position-readout"><span>X {Math.round(content.heroObject.x)}%</span><span>Y {Math.round(content.heroObject.y)}%</span></div>
        </section>
        <aside><Settings2/><h2>Layout guardrails</h2><p>The marker stays inside the safe frame so it cannot crop outside the image on smaller screens.</p><ul><li>Percentage-based positioning</li><li>Pointer and touch compatible</li><li>Shared media, theme-specific structure</li></ul></aside>
      </div>}
    </main>
  </div>;
}
