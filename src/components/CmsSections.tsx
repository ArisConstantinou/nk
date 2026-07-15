import {ArrowRight, Check, CircuitBoard, GripVertical, Lightbulb, Settings, ShieldCheck, Wrench, Zap, type LucideIcon} from 'lucide-react';
import {Link} from 'react-router-dom';
import type {CSSProperties} from 'react';
import type {PublicPageComponent, PublicPageSection} from '../context/ContentContext';
import {ResponsiveImage} from './ResponsiveImage';

const sectionIcons: Record<string, LucideIcon> = {check: Check, zap: Zap, lightbulb: Lightbulb, shield: ShieldCheck, wrench: Wrench, settings: Settings, circuit: CircuitBoard};

const visual = (pageSlug: string, path: string, edit: string, label: string, extra: Record<string, string> = {}) => ({
  'data-visual-kind': 'page', 'data-visual-slug': pageSlug, 'data-visual-path': path, 'data-visual-edit': edit, 'data-visual-label': label, ...extra,
});

const objectData = (type: 'section' | 'component', id: string, sectionId: string) => ({
  'data-visual-object-type': type, 'data-visual-object-id': id, 'data-visual-section-id': sectionId, 'data-visual-draggable': 'true',
});

function Action({section, pageSlug, index}: {section: PublicPageSection; pageSlug: string; index: number}) {
  if (!section.buttonLabel || !section.buttonUrl) return null;
  const props = visual(pageSlug, `sections.${index}.buttonLabel`, 'text', 'Button label', {'data-visual-link-path': `sections.${index}.buttonUrl`});
  return section.buttonUrl.startsWith('/') ? <Link to={section.buttonUrl} {...props}>{section.buttonLabel}<ArrowRight/></Link> : <a href={section.buttonUrl} target="_blank" rel="noreferrer" {...props}>{section.buttonLabel}<ArrowRight/></a>;
}

function BuilderComponent({component, pageSlug, section, sectionIndex, index}: {component: PublicPageComponent; pageSlug: string; section: PublicPageSection; sectionIndex: number; index: number}) {
  if (!component.enabled) return null;
  const basePath = `sections.${sectionIndex}.components.${index}`;
  const metadata = objectData('component', component.id, section.id);
  const field = (name: string, edit: string, label: string, extra: Record<string, string> = {}) => visual(pageSlug, `${basePath}.${name}`, edit, label, {...metadata, 'data-visual-draggable': 'false', ...extra});
  const Icon = sectionIcons[component.icon] || Check;
  const style = {
    '--cms-component-width': `${component.style.width}%`,
    '--cms-component-padding': `${component.style.padding}px`,
    '--cms-component-radius': `${component.style.radius}px`,
  } as CSSProperties;
  let content;
  if (component.type === 'heading') content = <h2 {...field('text', 'text', component.label || 'Heading', {'data-visual-multiline': 'true'})}>{component.text}</h2>;
  else if (component.type === 'text') content = <p {...field('text', 'text', component.label || 'Text', {'data-visual-multiline': 'true'})}>{component.text}</p>;
  else if (component.type === 'button') {
    const props = field('text', 'text', component.label || 'Button', {'data-visual-link-path': `${basePath}.url`});
    content = !component.url ? <span {...props}>{component.text}</span> : component.url.startsWith('/') ? <Link to={component.url} {...props}>{component.text}<ArrowRight/></Link> : <a href={component.url} target="_blank" rel="noreferrer" {...props}>{component.text}<ArrowRight/></a>;
  } else if (component.type === 'image') content = <div {...field('image', 'image', component.label || 'Image')}>{component.image ? (/.(mp4|webm)(\?|$)/i.test(component.image) ? <video src={component.image} controls preload="metadata"/> : <ResponsiveImage src={component.image} alt={component.alt}/>) : <span className="cms-component-placeholder">Choose an image</span>}</div>;
  else if (component.type === 'icon') content = <span {...field('icon', 'icon', component.label || 'Icon')}><Icon/></span>;
  else content = <hr/>;
  return <article className={`cms-builder-component cms-builder-component--${component.type} tone-${component.style.tone} align-${component.style.align} ${component.groupId ? 'is-grouped' : ''}`} style={style} data-visual-group-id={component.groupId || undefined} {...visual(pageSlug, basePath, 'component', component.label || 'Component', metadata)}><span className="cms-builder-drag-handle" {...visual(pageSlug, basePath, 'component', `Drag ${component.label || 'component'}`, metadata)}><GripVertical/></span>{content}</article>;
}

function BuilderSection({section, pageSlug, index}: {section: PublicPageSection; pageSlug: string; index: number}) {
  const props = visual(pageSlug, `sections.${index}`, 'section', `${section.title || 'Builder'} section`, objectData('section', section.id, section.id));
  return <section className={`cms-section cms-builder-section section layout-${section.layout}`} style={{'--cms-section-columns': section.columns} as CSSProperties} {...props}><span className="cms-builder-drag-handle cms-builder-section-handle" {...visual(pageSlug, `sections.${index}`, 'section', `Drag ${section.title || 'section'}`, objectData('section', section.id, section.id))}><GripVertical/></span>
    <div className="cms-builder-dropzone" data-visual-section-id={section.id} data-visual-dropzone="component">
      {section.components.map((component, componentIndex) => <BuilderComponent component={component} pageSlug={pageSlug} section={section} sectionIndex={index} index={componentIndex} key={component.id}/>)}
      {!section.components.length && <div className="cms-builder-empty">Drop a component here</div>}
    </div>
  </section>;
}

export function CmsSections({sections, pageSlug}: {sections: PublicPageSection[]; pageSlug: string}) {
  const active = sections.map((section, index) => ({section, index})).filter(({section}) => section.enabled);
  if (!active.length) return null;
  return <div className="cms-sections" data-visual-sections-root="true">{active.map(({section, index}) => {
    if (section.components.length) return <BuilderSection section={section} pageSlug={pageSlug} index={index} key={section.id}/>;
    const Icon = sectionIcons[section.icon] || Check;
    const sectionProps = visual(pageSlug, `sections.${index}`, 'section', `${section.title || section.type} section`, objectData('section', section.id, section.id));
    const eyebrow = visual(pageSlug, `sections.${index}.eyebrow`, 'text', 'Section eyebrow');
    const title = visual(pageSlug, `sections.${index}.title`, 'text', 'Section heading');
    const body = visual(pageSlug, `sections.${index}.body`, 'text', 'Section text', {'data-visual-multiline': 'true'});
    if (section.type === 'features') return <section className="cms-section cms-section--features section" key={section.id} {...sectionProps}><header><span {...eyebrow}>{section.eyebrow}</span><h2 {...title}>{section.title}</h2><p {...body}>{section.body}</p></header><div>{section.items.map((item, itemIndex) => <article key={`${section.id}-${itemIndex}`}><small>{String(itemIndex + 1).padStart(2, '0')}</small><span {...visual(pageSlug, `sections.${index}.icon`, 'icon', 'Feature icon')}><Icon/></span><h3 {...visual(pageSlug, `sections.${index}.items.${itemIndex}`, 'text', `Feature ${itemIndex + 1}`)}>{item}</h3></article>)}</div><Action section={section} pageSlug={pageSlug} index={index}/></section>;
    if (section.type === 'cta') return <section className="cms-section cms-section--cta section" key={section.id} {...sectionProps}><div><span {...eyebrow}>{section.eyebrow}</span><h2 {...title}>{section.title}</h2><p {...body}>{section.body}</p></div><Action section={section} pageSlug={pageSlug} index={index}/></section>;
    if (section.type === 'media') return <section className="cms-section cms-section--media section" key={section.id} {...sectionProps}><div {...visual(pageSlug, `sections.${index}.image`, 'image', 'Section media')}>{section.image && (/\.(mp4|webm)(\?|$)/i.test(section.image) ? <video src={section.image} controls preload="metadata"/> : <ResponsiveImage src={section.image} alt={section.title}/>)}</div><article><span {...eyebrow}>{section.eyebrow}</span><h2 {...title}>{section.title}</h2><p {...body}>{section.body}</p><Action section={section} pageSlug={pageSlug} index={index}/></article></section>;
    return <section className="cms-section cms-section--text section" key={section.id} {...sectionProps}><span {...eyebrow}>{section.eyebrow}</span><h2 {...title}>{section.title}</h2><p {...body}>{section.body}</p><Action section={section} pageSlug={pageSlug} index={index}/></section>;
  })}</div>;
}
