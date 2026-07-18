import {useEffect, useRef, useState} from 'react';
import {
  ArrowDownToLine,
  ArrowUpRight,
  Check,
  Circle,
  Copy,
  Expand,
  Eye,
  Focus,
  ImageDown,
  MousePointer2,
  MoveDown,
  MoveUp,
  Pencil,
  Save,
  Send,
  Square,
  Type,
} from 'lucide-react';
import {AdminError, AdminLoading} from '../components/AdminStates';
import {ExperiencePresentation} from '../../interactive/engine/ExperiencePresentation';
import {
  createStableId,
  createTransform,
  type ExperienceAsset,
  type ExperienceDocument,
  type ExperienceLayer,
  type ExperienceTool,
} from '../../interactive/engine/schema';
import {electricalInstallationTemplate} from '../../interactive/templates/electricalInstallation';
import {AssetManager} from '../../interactive/studio/AssetManager';
import {copyAiPrompt, exportSectionPng, exportSectionSvg} from '../../interactive/studio/exportMockup';
import {SectionPanel, LayerPanel} from '../../interactive/studio/StudioPanels';
import {StudioStage} from '../../interactive/studio/StudioStage';
import {useInteractiveDraft} from '../../interactive/studio/useInteractiveDraft';
import {isPagesAdminMode} from '../pagesMode';
import './interactive-studio.css';

const tools: Array<{id: ExperienceTool; label: string; icon: typeof MousePointer2}> = [
  {id: 'select', label: 'Select', icon: MousePointer2},
  {id: 'freehand', label: 'Freehand', icon: Pencil},
  {id: 'rectangle', label: 'Rectangle', icon: Square},
  {id: 'ellipse', label: 'Circle', icon: Circle},
  {id: 'line', label: 'Line', icon: ArrowDownToLine},
  {id: 'arrow', label: 'Arrow', icon: ArrowUpRight},
  {id: 'text', label: 'Text', icon: Type},
];

const updateSection = (document: ExperienceDocument, sectionId: string, change: (section: ExperienceDocument['sections'][number]) => ExperienceDocument['sections'][number]) => ({
  ...document,
  sections: document.sections.map(section => section.id === sectionId ? change(section) : section),
});

export function InteractiveStudioPage() {
  const studio = useInteractiveDraft('electrical-installations', electricalInstallationTemplate);
  const [activeSectionId, setActiveSectionId] = useState(electricalInstallationTemplate.sections[0].id);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [tool, setTool] = useState<ExperienceTool>('select');
  const [preview, setPreview] = useState(false);
  const [focus, setFocus] = useState(false);
  const [copyStatus, setCopyStatus] = useState('');
  const rootRef = useRef<HTMLElement>(null);

  const document = studio.document;
  const activeSection = document.sections.find(section => section.id === activeSectionId) || document.sections[0];
  const selectedLayer = activeSection?.layers.find(layer => layer.id === selectedLayerId) || null;

  useEffect(() => {
    if (!document.sections.some(section => section.id === activeSectionId)) {
      setActiveSectionId(document.sections[0]?.id || '');
      setSelectedLayerId(null);
    }
  }, [activeSectionId, document.sections]);

  if (studio.phase === 'loading') return <AdminLoading label={isPagesAdminMode ? 'Loading interactive device workspace…' : 'Loading secure interactive draft…'}/>;
  if (studio.phase === 'error' && !studio.record) return <AdminError message={studio.message} retry={() => window.location.reload()}/>;
  if (!activeSection) return <AdminError message="The draft does not contain a valid frame." retry={() => window.location.reload()}/>;

  const change = studio.setDocument;
  const changeActiveLayers = (layers: ExperienceLayer[]) => change(updateSection(document, activeSection.id, section => ({...section, layers})));
  const addLayer = (layer: ExperienceLayer) => {
    changeActiveLayers([...activeSection.layers, layer]);
    setSelectedLayerId(layer.id);
    setTool('select');
  };
  const updateLayer = (id: string, patch: Partial<ExperienceLayer>) => changeActiveLayers(activeSection.layers.map(layer => layer.id === id ? {...layer, ...patch} : layer));
  const removeLayer = (id: string) => {
    changeActiveLayers(activeSection.layers.filter(layer => layer.id !== id));
    if (selectedLayerId === id) setSelectedLayerId(null);
  };
  const applyAsset = (asset: ExperienceAsset) => addLayer({
    id: createStableId('layer'),
    name: asset.name,
    type: 'asset',
    assetId: asset.id,
    visible: true,
    locked: false,
    opacity: 1,
    transform: createTransform({x: 660, y: 300, width: 600, height: 480}),
  });
  const reorderSelected = (direction: -1 | 1) => {
    if (!selectedLayer) return;
    const layers = [...activeSection.layers];
    const index = layers.findIndex(layer => layer.id === selectedLayer.id);
    const target = Math.max(0, Math.min(layers.length - 1, index + direction));
    if (target === index) return;
    const [moved] = layers.splice(index, 1);
    layers.splice(target, 0, moved);
    changeActiveLayers(layers);
  };
  const fullscreen = async () => {
    if (!globalThis.document.fullscreenElement) await rootRef.current?.requestFullscreen();
    else await globalThis.document.exitFullscreen();
  };
  const copyPrompt = async () => {
    try {
      await copyAiPrompt(document, activeSection);
      setCopyStatus('AI prompt copied');
    } catch {
      setCopyStatus('Clipboard unavailable');
    }
    window.setTimeout(() => setCopyStatus(''), 2200);
  };

  if (preview) return <ExperiencePresentation document={document} editingPreview onExitPreview={() => setPreview(false)}/>;

  return <section ref={rootRef} className={`ix-studio ${focus ? 'ix-studio--focus' : ''}`}>
    <header className="ix-studio__header">
      <div>
        <span>INTERACTIVE ENGINE / TEMPLATE</span>
        <input value={document.title} onChange={event => change({...document, title: event.target.value})} aria-label="Interactive experience title"/>
        <small>{isPagesAdminMode ? 'Device workspace · ' : ''}Generic 1920×1080 frame document · electrical demo data only</small>
      </div>
      <div className="ix-studio__save-actions">
        <span className={`ix-save-state ix-save-state--${studio.phase}`} aria-live="polite">{studio.dirty ? '● ' : '✓ '}{studio.message}</span>
        <button type="button" onClick={() => void studio.save()} disabled={!studio.record || studio.phase === 'saving' || studio.phase === 'publishing'}><Save/>Save draft</button>
        <button type="button" onClick={() => void studio.publish()} disabled={!studio.record || studio.phase === 'saving' || studio.phase === 'publishing'}><Send/>Publish</button>
        <button className="primary" type="button" onClick={() => setPreview(true)}><Eye/>Done / Preview</button>
      </div>
    </header>

    <div className="ix-studio__toolbar" role="toolbar" aria-label="Mockup drawing tools">
      <div className="ix-tool-group">
        {tools.map(item => {
          const Icon = item.icon;
          return <button key={item.id} type="button" className={tool === item.id ? 'active' : ''} onClick={() => setTool(item.id)} aria-pressed={tool === item.id}><Icon/><span>{item.label}</span></button>;
        })}
      </div>
      <div className="ix-tool-group ix-tool-group--view">
        <button type="button" className={!focus ? 'active' : ''} onClick={() => setFocus(false)}><Square/><span>Page</span></button>
        <button type="button" className={focus ? 'active' : ''} onClick={() => setFocus(true)}><Focus/><span>Theater</span></button>
        <button type="button" onClick={() => void fullscreen()}><Expand/><span>Fullscreen</span></button>
      </div>
      <div className="ix-tool-group ix-tool-group--export">
        <button type="button" onClick={() => exportSectionSvg(document, activeSection)}><ArrowDownToLine/><span>SVG</span></button>
        <button type="button" onClick={() => void exportSectionPng(document, activeSection)}><ImageDown/><span>PNG</span></button>
        <button type="button" onClick={() => void copyPrompt()}><Copy/><span>{copyStatus || 'Copy AI prompt'}</span></button>
      </div>
    </div>

    <div className="ix-studio__workspace">
      <aside className="ix-studio__left">
        <SectionPanel document={document} activeSectionId={activeSection.id} onSelect={id => {setActiveSectionId(id); setSelectedLayerId(null);}} onChange={change}/>
        <LayerPanel document={document} activeSectionId={activeSection.id} selectedLayerId={selectedLayerId} onSelect={setSelectedLayerId} onChange={change}/>
      </aside>

      <main className="ix-studio__canvas">
        <div className="ix-frame-meta">
          <span>{String(document.sections.findIndex(section => section.id === activeSection.id) + 1).padStart(2, '0')} / {String(document.sections.length).padStart(2, '0')}</span>
          <div>
            <input value={activeSection.name} onChange={event => change(updateSection(document, activeSection.id, section => ({...section, name: event.target.value})))} aria-label="Current frame name"/>
            <textarea value={activeSection.description} onChange={event => change(updateSection(document, activeSection.id, section => ({...section, description: event.target.value})))} aria-label="Current frame description" placeholder="Describe what changes in this frame…"/>
          </div>
          <strong>1920 × 1080 · SVG</strong>
        </div>
        <div className="ix-stage-shell">
          <StudioStage
            document={document}
            section={activeSection}
            tool={tool}
            selectedLayerId={selectedLayerId}
            onSelectLayer={setSelectedLayerId}
            onAddLayer={addLayer}
            onUpdateLayer={updateLayer}
            onRemoveLayer={removeLayer}
          />
        </div>
        <div className="ix-stage-help">
          <span><b>Move:</b> drag or arrow keys</span>
          <span><b>Resize:</b> cyan corner</span>
          <span><b>Rotate:</b> round handle</span>
          <span><b>Skew:</b> orange diamond</span>
          <span><b>Fine move:</b> 1 px · Shift = 10 px</span>
        </div>
        {selectedLayer && <div className="ix-selected-strip">
          <div><Check/><span><b>{selectedLayer.name}</b><small>{selectedLayer.type} · selected only in this frame</small></span></div>
          {selectedLayer.type === 'text' && <label>Text<input value={selectedLayer.text || ''} onChange={event => updateLayer(selectedLayer.id, {text: event.target.value})}/></label>}
          <label>Colour<input type="color" value={(selectedLayer.stroke || selectedLayer.fill || '#ef6f4d').slice(0, 7)} onChange={event => updateLayer(selectedLayer.id, {stroke: event.target.value, fill: selectedLayer.type === 'text' ? event.target.value : selectedLayer.fill})}/></label>
          <label>Opacity<input type="range" min="0" max="1" step=".05" value={selectedLayer.opacity} onChange={event => updateLayer(selectedLayer.id, {opacity: Number(event.target.value)})}/></label>
          <button type="button" onClick={() => reorderSelected(1)}><MoveUp/>Forward</button>
          <button type="button" onClick={() => reorderSelected(-1)}><MoveDown/>Backward</button>
        </div>}
      </main>

      <aside className="ix-studio__right">
        <AssetManager document={document} onChange={change} onApplyAsset={applyAsset}/>
      </aside>
    </div>
  </section>;
}
