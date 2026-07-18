import {Copy, Eye, EyeOff, GripVertical, Layers3, Lock, Plus, Trash2, Unlock} from 'lucide-react';
import {cloneSection, createSection, type ExperienceDocument, type ExperienceLayer} from '../engine/schema';

type SectionsProps = {
  document: ExperienceDocument;
  activeSectionId: string;
  onSelect: (id: string) => void;
  onChange: (document: ExperienceDocument) => void;
};

export function SectionPanel({document, activeSectionId, onSelect, onChange}: SectionsProps) {
  const activeIndex = Math.max(0, document.sections.findIndex(section => section.id === activeSectionId));

  const addBlank = () => {
    const next = createSection(`Frame ${document.sections.length + 1}`);
    const sections = [...document.sections];
    sections.splice(activeIndex + 1, 0, next);
    onChange({...document, sections});
    onSelect(next.id);
  };

  const duplicate = () => {
    const source = document.sections[activeIndex];
    if (!source) return;
    const next = cloneSection(source);
    const sections = [...document.sections];
    sections.splice(activeIndex + 1, 0, next);
    onChange({...document, sections});
    onSelect(next.id);
  };

  const remove = () => {
    if (document.sections.length === 1 || !window.confirm('Remove this frame from the draft timeline? Stable IDs of the remaining frames will not change.')) return;
    const sections = document.sections.filter(section => section.id !== activeSectionId);
    onChange({...document, sections});
    onSelect(sections[Math.max(0, activeIndex - 1)].id);
  };

  const drop = (targetId: string, sourceId: string) => {
    if (targetId === sourceId) return;
    const sections = [...document.sections];
    const sourceIndex = sections.findIndex(item => item.id === sourceId);
    const targetIndex = sections.findIndex(item => item.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const [moved] = sections.splice(sourceIndex, 1);
    sections.splice(targetIndex, 0, moved);
    onChange({...document, sections});
  };

  return <section className="ix-section-panel">
    <header className="ix-panel-heading"><div><Layers3/><span><b>Frames</b><small>Stable IDs · visual order</small></span></div><span>{document.sections.length}</span></header>
    <div className="ix-section-list">
      {document.sections.map((section, index) => <article
        key={section.id}
        draggable
        className={section.id === activeSectionId ? 'active' : ''}
        onDragStart={event => event.dataTransfer.setData('application/x-nk-section', section.id)}
        onDragOver={event => event.preventDefault()}
        onDrop={event => drop(section.id, event.dataTransfer.getData('application/x-nk-section'))}
        onClick={() => onSelect(section.id)}
      >
        <GripVertical/>
        <span>{String(index + 1).padStart(2, '0')}</span>
        <input
          value={section.name}
          aria-label={`Frame ${index + 1} name`}
          onClick={event => event.stopPropagation()}
          onFocus={() => onSelect(section.id)}
          onChange={event => onChange({...document, sections: document.sections.map(item => item.id === section.id ? {...item, name: event.target.value} : item)})}
        />
      </article>)}
    </div>
    <footer>
      <button type="button" onClick={addBlank}><Plus/>Blank</button>
      <button type="button" onClick={duplicate}><Copy/>Duplicate</button>
      <button type="button" onClick={remove} disabled={document.sections.length === 1}><Trash2/>Remove</button>
    </footer>
  </section>;
}

type LayersProps = {
  document: ExperienceDocument;
  activeSectionId: string;
  selectedLayerId: string | null;
  onSelect: (id: string | null) => void;
  onChange: (document: ExperienceDocument) => void;
};

export function LayerPanel({document, activeSectionId, selectedLayerId, onSelect, onChange}: LayersProps) {
  const section = document.sections.find(item => item.id === activeSectionId) || document.sections[0];
  const changeLayers = (layers: ExperienceLayer[]) => onChange({...document, sections: document.sections.map(item => item.id === section.id ? {...item, layers} : item)});
  const update = (id: string, patch: Partial<ExperienceLayer>) => changeLayers(section.layers.map(layer => layer.id === id ? {...layer, ...patch} : layer));
  const remove = (id: string) => {
    changeLayers(section.layers.filter(layer => layer.id !== id));
    if (selectedLayerId === id) onSelect(null);
  };
  const drop = (targetId: string, sourceId: string) => {
    if (!sourceId || targetId === sourceId) return;
    const layers = [...section.layers];
    const sourceIndex = layers.findIndex(item => item.id === sourceId);
    const targetIndex = layers.findIndex(item => item.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const [moved] = layers.splice(sourceIndex, 1);
    layers.splice(targetIndex, 0, moved);
    changeLayers(layers);
  };

  return <section className="ix-layer-panel">
    <header className="ix-panel-heading"><div><Layers3/><span><b>Layers in this frame</b><small>Only these appear together</small></span></div><span>{section.layers.length}</span></header>
    <div className="ix-layer-list">
      {[...section.layers].reverse().map(layer => <article
        key={layer.id}
        className={layer.id === selectedLayerId ? 'active' : ''}
        draggable
        onDragStart={event => event.dataTransfer.setData('application/x-nk-layer', layer.id)}
        onDragOver={event => event.preventDefault()}
        onDrop={event => drop(layer.id, event.dataTransfer.getData('application/x-nk-layer'))}
        onClick={() => onSelect(layer.id)}
      >
        <GripVertical/>
        <button type="button" onClick={event => {event.stopPropagation(); update(layer.id, {visible: !layer.visible});}} aria-label={layer.visible ? 'Hide layer' : 'Show layer'}>{layer.visible ? <Eye/> : <EyeOff/>}</button>
        <input value={layer.name} onClick={event => event.stopPropagation()} onFocus={() => onSelect(layer.id)} onChange={event => update(layer.id, {name: event.target.value})} aria-label="Layer name"/>
        <small>{layer.type}</small>
        <button type="button" onClick={event => {event.stopPropagation(); update(layer.id, {locked: !layer.locked});}} aria-label={layer.locked ? 'Unlock layer' : 'Lock layer'}>{layer.locked ? <Lock/> : <Unlock/>}</button>
        <button type="button" onClick={event => {event.stopPropagation(); remove(layer.id);}} aria-label={`Remove ${layer.name}`}><Trash2/></button>
      </article>)}
      {!section.layers.length && <div className="ix-empty-state"><p>This frame is blank. Draw on the stage or drag an asset from the library.</p></div>}
    </div>
  </section>;
}
