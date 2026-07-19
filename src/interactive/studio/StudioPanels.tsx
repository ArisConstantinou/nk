import {useEffect, useState, type MouseEvent as ReactMouseEvent} from 'react';
import {ChevronDown, ChevronUp, Copy, Eraser, Eye, EyeOff, FilePlus2, GripVertical, Layers3, ListChecks, Lock, Trash2, Unlock} from 'lucide-react';
import {cloneSection, createSection, type ExperienceDocument, type ExperienceLayer} from '../engine/schema';
import {useAdminConfirm} from '../../admin/components/ConfirmDialog';

type SectionsProps = {
  document: ExperienceDocument;
  activeSectionId: string;
  onSelect: (id: string) => void;
  onChange: (document: ExperienceDocument) => void;
};

export function SectionPanel({document, activeSectionId, onSelect, onChange}: SectionsProps) {
  const activeIndex = Math.max(0, document.sections.findIndex(section => section.id === activeSectionId));
  const [selectedSectionIds, setSelectedSectionIds] = useState<Set<string>>(() => new Set([activeSectionId]));
  const confirm = useAdminConfirm();

  const selectOnly = (sectionId: string) => {
    setSelectedSectionIds(new Set([sectionId]));
    onSelect(sectionId);
  };

  const selectFrame = (event: ReactMouseEvent<HTMLElement>, sectionId: string) => {
    if (event.shiftKey) {
      setSelectedSectionIds(new Set(document.sections.map(section => section.id)));
      onSelect(sectionId);
      return;
    }
    if (event.ctrlKey || event.metaKey) {
      setSelectedSectionIds(current => {
        const next = new Set(current);
        if (next.has(sectionId) && next.size > 1) next.delete(sectionId);
        else next.add(sectionId);
        return next;
      });
      onSelect(sectionId);
      return;
    }
    selectOnly(sectionId);
  };

  useEffect(() => {
    const validIds = new Set(document.sections.map(section => section.id));
    setSelectedSectionIds(current => {
      const validSelection = new Set([...current].filter(id => validIds.has(id)));
      if (validSelection.size) return validSelection;
      return new Set(activeSectionId ? [activeSectionId] : []);
    });
  }, [activeSectionId, document.sections]);

  const addBlank = () => {
    const next = createSection(`Frame ${document.sections.length + 1}`);
    const sections = [...document.sections];
    sections.splice(activeIndex + 1, 0, next);
    onChange({...document, sections});
    selectOnly(next.id);
  };

  const duplicate = () => {
    const source = document.sections[activeIndex];
    if (!source) return;
    const next = cloneSection(source);
    const sections = [...document.sections];
    sections.splice(activeIndex + 1, 0, next);
    onChange({...document, sections});
    selectOnly(next.id);
  };

  const clearAll = async () => {
    const accepted = await confirm({
      eyebrow: 'RESET DRAFT TIMELINE',
      title: 'Start again with one blank frame?',
      description: `This removes all ${document.sections.length} frames from the current draft and creates a clean Frame 1.`,
      detail: 'The published experience stays unchanged until you explicitly save and publish this new draft.',
      confirmLabel: 'Clear draft timeline',
      cancelLabel: 'Keep all frames',
      tone: 'danger',
    });
    if (!accepted) return;
    const blank = createSection('Frame 1');
    onChange({...document, sections: [blank]});
    selectOnly(blank.id);
  };

  const removeSelected = async () => {
    const ids = selectedSectionIds.size ? selectedSectionIds : new Set([activeSectionId]);
    const accepted = await confirm({
      eyebrow: 'TIMELINE CHANGE',
      title: `Remove ${ids.size} selected frame${ids.size === 1 ? '' : 's'}?`,
      description: 'The selected frames and their own layers will be removed from this draft timeline.',
      detail: ids.size >= document.sections.length
        ? 'A new blank Frame 1 will be created automatically so the experience always remains valid.'
        : 'The remaining frames keep their stable internal IDs and will be renumbered visually.',
      confirmLabel: ids.size === 1 ? 'Remove frame' : `Remove ${ids.size} frames`,
      cancelLabel: 'Keep selection',
      tone: 'warning',
    });
    if (!accepted) return;
    if (ids.size >= document.sections.length) {
      const blank = createSection('Frame 1');
      onChange({...document, sections: [blank]});
      selectOnly(blank.id);
      return;
    }
    const sections = document.sections.filter(section => !ids.has(section.id));
    const nextActive = sections[Math.max(0, Math.min(activeIndex, sections.length - 1))];
    onChange({...document, sections});
    selectOnly(nextActive.id);
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
  const move = (sectionId: string, direction: -1 | 1) => {
    const sections = [...document.sections];
    const sourceIndex = sections.findIndex(item => item.id === sectionId);
    const targetIndex = sourceIndex + direction;
    if (sourceIndex < 0 || targetIndex < 0 || targetIndex >= sections.length) return;
    const [moved] = sections.splice(sourceIndex, 1);
    sections.splice(targetIndex, 0, moved);
    onChange({...document, sections});
  };

  return <section className="ix-section-panel">
    <header className="ix-panel-heading"><div><Layers3/><span><b>Frames</b><small>Shift-click selects all</small></span></div><span>{selectedSectionIds.size > 1 ? `${selectedSectionIds.size}/${document.sections.length}` : document.sections.length}</span></header>
    <div className="ix-section-list" role="listbox" aria-label="Timeline frames" aria-multiselectable="true">
      {document.sections.map((section, index) => <article
        key={section.id}
        draggable
        role="option"
        aria-selected={selectedSectionIds.has(section.id)}
        className={`${section.id === activeSectionId ? 'active' : ''} ${selectedSectionIds.has(section.id) ? 'selected' : ''}`.trim()}
        onDragStart={event => event.dataTransfer.setData('application/x-nk-section', section.id)}
        onDragOver={event => event.preventDefault()}
        onDrop={event => drop(section.id, event.dataTransfer.getData('application/x-nk-section'))}
        onClick={event => selectFrame(event, section.id)}
      >
        <GripVertical/>
        <span>{String(index + 1).padStart(2, '0')}</span>
        <input
          value={section.name}
          aria-label={`Frame ${index + 1} name`}
          onClick={event => event.stopPropagation()}
          onFocus={() => selectOnly(section.id)}
          onChange={event => onChange({...document, sections: document.sections.map(item => item.id === section.id ? {...item, name: event.target.value} : item)})}
        />
        <div className="ix-section-order">
          <button type="button" disabled={index === 0} onClick={event => {event.stopPropagation(); move(section.id, -1);}} aria-label={`Move ${section.name} earlier`}><ChevronUp/></button>
          <button type="button" disabled={index === document.sections.length - 1} onClick={event => {event.stopPropagation(); move(section.id, 1);}} aria-label={`Move ${section.name} later`}><ChevronDown/></button>
        </div>
      </article>)}
    </div>
    <footer className="ix-section-actions" aria-label="Frame actions">
      <button type="button" onClick={addBlank} aria-label="Add blank frame" data-tooltip="Add blank frame" title="Add blank frame">
        <FilePlus2 aria-hidden="true"/>
      </button>
      <button type="button" onClick={duplicate} aria-label="Duplicate active frame" data-tooltip="Duplicate frame" title="Duplicate frame">
        <Copy aria-hidden="true"/>
      </button>
      <button
        type="button"
        className={selectedSectionIds.size === document.sections.length ? 'active' : ''}
        onClick={() => setSelectedSectionIds(new Set(document.sections.map(section => section.id)))}
        aria-label="Select all frames"
        aria-pressed={selectedSectionIds.size === document.sections.length}
        data-tooltip="Select all frames"
        title="Select all frames"
      >
        <ListChecks aria-hidden="true"/>
      </button>
      <button
        type="button"
        onClick={() => void removeSelected()}
        aria-label={`Remove ${selectedSectionIds.size || 1} selected frame${selectedSectionIds.size === 1 ? '' : 's'}`}
        data-tooltip="Remove selection"
        title="Remove selected frames"
      >
        <Trash2 aria-hidden="true"/>
        {selectedSectionIds.size > 1 && <span className="ix-section-action-count" aria-hidden="true">{selectedSectionIds.size}</span>}
      </button>
      <button type="button" className="danger" onClick={() => void clearAll()} aria-label="Erase all frames" data-tooltip="Erase all frames" title="Erase all frames">
        <Eraser aria-hidden="true"/>
      </button>
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
