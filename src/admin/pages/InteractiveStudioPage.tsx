import {useEffect, useRef, useState} from 'react';
import {
  ArrowDownToLine,
  ArrowUpRight,
  Check,
  Circle,
  Copy,
  Expand,
  Eye,
  ExternalLink,
  Focus,
  History,
  ImageDown,
  Layers3,
  Library,
  MousePointer2,
  MoveDown,
  MoveUp,
  Pencil,
  Redo2,
  Save,
  Send,
  Square,
  Type,
  Undo2,
  X,
} from 'lucide-react';
import {useHref} from 'react-router-dom';
import {AdminError, AdminLoading, PageHeading} from '../components/AdminStates';
import {ExperiencePresentation} from '../../interactive/engine/ExperiencePresentation';
import {
  createStableId,
  createTransform,
  DEFAULT_ROUTE_BEND_RADIUS_MM,
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
import {useInteractiveDraft, type InteractiveHistoryOptions} from '../../interactive/studio/useInteractiveDraft';
import {createElectricalRoutePair} from '../../interactive/parametric/electricalRoute';
import {traceLineImageRoutes} from '../../interactive/parametric/traceBlueprintRoutes';
import {isPagesAdminMode} from '../pagesMode';
import {useAdminLanguage} from '../i18n/AdminLanguage';
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

const frameBackgroundDescription = 'Frame background asset.';

const updateSection = (document: ExperienceDocument, sectionId: string, change: (section: ExperienceDocument['sections'][number]) => ExperienceDocument['sections'][number]) => ({
  ...document,
  sections: document.sections.map(section => section.id === sectionId ? change(section) : section),
});

export function InteractiveStudioPage() {
  const {text} = useAdminLanguage();
  const publicEngineHref = useHref('/interactive/electrical-installations/engine');
  const studio = useInteractiveDraft('electrical-installations', electricalInstallationTemplate);
  const [activeSectionId, setActiveSectionId] = useState(electricalInstallationTemplate.sections[0].id);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [tool, setTool] = useState<ExperienceTool>('select');
  const [preview, setPreview] = useState(false);
  const [focus, setFocus] = useState(true);
  const [copyStatus, setCopyStatus] = useState('');
  const [mobilePanel, setMobilePanel] = useState<'canvas' | 'sections' | 'assets'>('canvas');
  const [historyOpen, setHistoryOpen] = useState(true);
  const [historyScope, setHistoryScope] = useState<'all' | 'selected'>('all');
  const rootRef = useRef<HTMLElement>(null);

  const document = studio.document;
  const activeSection = document.sections.find(section => section.id === activeSectionId) || document.sections[0];
  const selectedLayer = activeSection?.layers.find(layer => layer.id === selectedLayerId) || null;
  const selectedHistoryIds = selectedLayer?.parametric?.routeId
    ? activeSection.layers.filter(layer => layer.parametric?.routeId === selectedLayer.parametric?.routeId).map(layer => layer.id)
    : selectedLayer ? [selectedLayer.id] : [];
  const visibleHistory = historyScope === 'selected'
    ? studio.history.filter(entry => entry.objectIds.some(id => selectedHistoryIds.includes(id)))
    : studio.history;

  useEffect(() => {
    if (!document.sections.some(section => section.id === activeSectionId)) {
      setActiveSectionId(document.sections[0]?.id || '');
      setSelectedLayerId(null);
    }
  }, [activeSectionId, document.sections]);

  useEffect(() => {
    if (!focus) return;
    const previousOverflow = globalThis.document.body.style.overflow;
    globalThis.document.body.style.overflow = 'hidden';
    return () => {
      globalThis.document.body.style.overflow = previousOverflow;
    };
  }, [focus]);

  useEffect(() => {
    const handleHistoryShortcut = (event: globalThis.KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key !== 'z' && key !== 'y') return;
      const wantsRedo = key === 'y' || event.shiftKey;
      if (wantsRedo ? !studio.canRedo : !studio.canUndo) return;
      event.preventDefault();
      event.stopPropagation();
      if (wantsRedo) studio.redo();
      else studio.undo();
    };
    globalThis.addEventListener('keydown', handleHistoryShortcut, true);
    return () => globalThis.removeEventListener('keydown', handleHistoryShortcut, true);
  }, [studio.canRedo, studio.canUndo, studio.redo, studio.undo]);

  if (studio.phase === 'loading') return <AdminLoading label={isPagesAdminMode ? 'Loading interactive device workspace…' : 'Loading secure interactive draft…'}/>;
  if (studio.phase === 'error' && !studio.record) return <AdminError message={studio.message} retry={() => window.location.reload()}/>;
  if (!activeSection) return <AdminError message="The draft does not contain a valid frame." retry={() => window.location.reload()}/>;

  const change = studio.setDocument;
  const changeActiveLayers = (layers: ExperienceLayer[], historyOptions?: InteractiveHistoryOptions) => (
    change(updateSection(document, activeSection.id, section => ({...section, layers})), historyOptions)
  );
  const addLayer = (layer: ExperienceLayer) => {
    changeActiveLayers([...activeSection.layers, layer], {
      label: `Add ${layer.name}`,
      objectIds: [layer.id],
    });
    setSelectedLayerId(layer.id);
    setTool('select');
  };
  const updateLayer = (id: string, patch: Partial<ExperienceLayer>) => {
    const source = activeSection.layers.find(layer => layer.id === id);
    const routeId = source?.parametric?.routeId;
    const sharesRouteGeometry = Boolean(routeId && (patch.transform || patch.points));
    const objectIds = routeId
      ? activeSection.layers.filter(layer => layer.parametric?.routeId === routeId).map(layer => layer.id)
      : [id];
    const property = patch.points ? 'route' : patch.transform ? 'position' : 'properties';
    changeActiveLayers(activeSection.layers.map(layer => {
      if (layer.id === id) return {...layer, ...patch};
      if (sharesRouteGeometry && layer.parametric?.routeId === routeId) {
        return {
          ...layer,
          ...(patch.transform ? {transform: {...patch.transform}} : {}),
          ...(patch.points ? {points: patch.points.map(point => ({...point}))} : {}),
        };
      }
      return layer;
    }), {
      label: `${patch.points ? 'Edit' : 'Update'} ${source?.name || 'layer'} ${property}`,
      objectIds,
      coalesceKey: `${routeId || id}:${property}`,
    });
  };
  const removeLayer = (id: string) => {
    const layer = activeSection.layers.find(item => item.id === id);
    changeActiveLayers(activeSection.layers.filter(item => item.id !== id), {
      label: `Remove ${layer?.name || 'layer'}`,
      objectIds: [id],
    });
    if (selectedLayerId === id) setSelectedLayerId(null);
  };
  const applyAsset = (asset: ExperienceAsset, placement: 'object' | 'background' = 'object') => {
    const layer: ExperienceLayer = {
      id: createStableId('layer'),
      name: placement === 'background' ? `${asset.name} · background` : asset.name,
      type: 'asset',
      assetId: asset.id,
      assetFit: placement === 'background' ? 'cover' : 'contain',
      visible: true,
      locked: placement === 'background',
      opacity: 1,
      transform: placement === 'background'
        ? createTransform({x: 0, y: 0, width: document.stage.width, height: document.stage.height})
        : createTransform({x: 660, y: 300, width: 600, height: 480}),
      description: placement === 'background' ? frameBackgroundDescription : undefined,
    };
    if (placement === 'background') {
      const previousBackgroundIds = activeSection.layers
        .filter(item => item.description === frameBackgroundDescription)
        .map(item => item.id);
      const layersWithoutPreviousBackground = activeSection.layers
        .filter(item => item.description !== frameBackgroundDescription);
      const roomBaseNames = new Set(['Fixed wall background', 'Finished floor datum', 'Room corner datum']);
      const lastRoomBaseIndex = layersWithoutPreviousBackground.reduce(
        (lastIndex, item, index) => roomBaseNames.has(item.name) ? index : lastIndex,
        -1,
      );
      const nextLayers = [...layersWithoutPreviousBackground];
      nextLayers.splice(lastRoomBaseIndex + 1, 0, layer);
      changeActiveLayers(nextLayers, {
        label: `Set ${asset.name} as frame background`,
        objectIds: [layer.id, ...previousBackgroundIds],
      });
      setSelectedLayerId(null);
      setTool('select');
      return;
    }
    addLayer(layer);
  };
  const addParametricRoute = () => {
    const pair = createElectricalRoutePair({name: `Route ${activeSection.layers.filter(layer => layer.type === 'parametric-path').length / 2 + 1}`});
    changeActiveLayers([...activeSection.layers, ...pair], {
      label: 'Add wall channel and conduit',
      objectIds: pair.map(layer => layer.id),
    });
    setSelectedLayerId(pair[0].id);
    setTool('select');
    setMobilePanel('canvas');
  };
  const traceAssetRoutes = async (asset: ExperienceAsset, targetGroupId?: string) => {
    const trace = await traceLineImageRoutes(asset.source);
    const knownAsset = document.assetGroups.flatMap(group => group.assets).find(item => item.id === asset.id || item.source === asset.source);
    const routeAsset = knownAsset || asset;
    const existingBlueprint = activeSection.layers.find(layer => layer.type === 'asset' && layer.assetId === routeAsset.id);
    const stageWidth = document.stage.width;
    const stageHeight = document.stage.height;
    const fitScale = Math.min(stageWidth / trace.sourceWidth, stageHeight / trace.sourceHeight);
    const fittedWidth = trace.sourceWidth * fitScale;
    const fittedHeight = trace.sourceHeight * fitScale;
    const blueprintTransform = existingBlueprint?.transform || createTransform({
      x: (stageWidth - fittedWidth) / 2,
      y: (stageHeight - fittedHeight) / 2,
      width: fittedWidth,
      height: fittedHeight,
    });
    const blueprintLayer: ExperienceLayer | null = existingBlueprint ? null : {
      id: createStableId('layer'),
      name: `Blueprint - ${routeAsset.name}`,
      type: 'asset',
      assetId: routeAsset.id,
      visible: true,
      locked: true,
      opacity: 1,
      transform: {...blueprintTransform},
      description: 'Source blueprint used for local guide-line tracing.',
    };
    const routeLayers = trace.paths.flatMap((points, index) => createElectricalRoutePair({
      name: `${routeAsset.name} route ${index + 1}`,
      transform: blueprintTransform,
      points,
    }));
    const nextLayers = [
      ...activeSection.layers,
      ...(blueprintLayer ? [blueprintLayer] : []),
      ...routeLayers,
    ];
    const nextAssetGroups = knownAsset || !targetGroupId
      ? document.assetGroups
      : document.assetGroups.map(group => group.id === targetGroupId ? {...group, assets: [...group.assets, routeAsset]} : group);
    change({
      ...document,
      assetGroups: nextAssetGroups,
      sections: document.sections.map(section => section.id === activeSection.id ? {...section, layers: nextLayers} : section),
    }, {
      label: `Auto-trace ${routeAsset.name}`,
      objectIds: routeLayers.map(layer => layer.id),
    });
    setSelectedLayerId(routeLayers[0]?.id || null);
    setTool('select');
    setMobilePanel('canvas');
    return trace.paths.length;
  };
  const setRouteVisibility = (mode: 'channel' | 'conduit' | 'both') => {
    const routeId = selectedLayer?.parametric?.routeId;
    if (!routeId) return;
    const objectIds = activeSection.layers.filter(layer => layer.parametric?.routeId === routeId).map(layer => layer.id);
    changeActiveLayers(activeSection.layers.map(layer => layer.parametric?.routeId === routeId
      ? {...layer, visible: mode === 'both' || layer.parametric.renderer === (mode === 'channel' ? 'wall-channel' : 'flex-conduit')}
      : layer), {
      label: `Show ${mode} for ${selectedLayer.name}`,
      objectIds,
    });
  };
  const updateParametric = (patch: Partial<NonNullable<ExperienceLayer['parametric']>>) => {
    if (!selectedLayer?.parametric) return;
    if (patch.bendRadiusMm !== undefined) {
      const routeId = selectedLayer.parametric.routeId;
      const objectIds = activeSection.layers.filter(layer => layer.parametric?.routeId === routeId).map(layer => layer.id);
      changeActiveLayers(activeSection.layers.map(layer => layer.parametric?.routeId === routeId
        ? {...layer, parametric: {...layer.parametric, bendRadiusMm: patch.bendRadiusMm}}
        : layer), {
        label: `Change bend radius for ${selectedLayer.name}`,
        objectIds,
        coalesceKey: `${routeId}:bend-radius`,
      });
      return;
    }
    updateLayer(selectedLayer.id, {parametric: {...selectedLayer.parametric, ...patch}});
  };
  const reorderSelected = (direction: -1 | 1) => {
    if (!selectedLayer) return;
    const layers = [...activeSection.layers];
    const index = layers.findIndex(layer => layer.id === selectedLayer.id);
    const target = Math.max(0, Math.min(layers.length - 1, index + direction));
    if (target === index) return;
    const [moved] = layers.splice(index, 1);
    layers.splice(target, 0, moved);
    changeActiveLayers(layers, {
      label: `Reorder ${selectedLayer.name}`,
      objectIds: [selectedLayer.id],
    });
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
  const beginLayerInteraction = (layer: ExperienceLayer, kind: 'move' | 'resize' | 'rotate' | 'skew' | 'point') => {
    const routeId = layer.parametric?.routeId;
    const objectIds = routeId
      ? activeSection.layers.filter(item => item.parametric?.routeId === routeId).map(item => item.id)
      : [layer.id];
    const action = kind === 'point' ? 'Edit route point' : `${kind.charAt(0).toUpperCase()}${kind.slice(1)}`;
    studio.beginHistory({
      label: `${action} ${layer.name}`,
      objectIds,
      coalesceKey: `${routeId || layer.id}:${kind}`,
    });
  };

  if (preview) return <ExperiencePresentation document={document} editingPreview onExitPreview={() => setPreview(false)}/>;

  return <>
  <PageHeading
    eyebrow={text('INTERACTIVE EXPERIENCE ENGINE', 'ΜΗΧΑΝΗ ΔΙΑΔΡΑΣΤΙΚΩΝ ΕΜΠΕΙΡΙΩΝ')}
    title={text('Interactive Studio', 'Interactive Studio')}
    description={text(
      'Build reusable frame-by-frame experiences on one fixed 1920 × 1080 stage, with independent layers, asset groups and a live preview.',
      'Δημιουργήστε επαναχρησιμοποιήσιμες εμπειρίες frame-by-frame σε σταθερή σκηνή 1920 × 1080, με ανεξάρτητα layers, ομάδες assets και live preview.',
    )}
  />
  <section ref={rootRef} className={`ix-studio ${focus ? 'ix-studio--focus' : ''}`}>
    <header className="ix-studio__header">
      <div>
        <span>INTERACTIVE ENGINE / TEMPLATE</span>
        <input value={document.title} onChange={event => change({...document, title: event.target.value})} aria-label="Interactive experience title"/>
        <small>{isPagesAdminMode ? 'Device workspace · ' : ''}Generic 1920×1080 frame document · electrical demo data only</small>
      </div>
      <div className="ix-studio__save-actions">
        <span className={`ix-save-state ix-save-state--${studio.phase}`} aria-live="polite">{studio.dirty ? '● ' : '✓ '}{studio.message}</span>
        <a className="ix-studio__public-link" href={publicEngineHref} target="_blank" rel="noreferrer"><ExternalLink/>Public read-only</a>
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
      <div className="ix-tool-group ix-tool-group--history">
        <button type="button" className={historyOpen ? 'active' : ''} onClick={() => setHistoryOpen(open => !open)} aria-expanded={historyOpen} aria-controls="ix-history-panel"><History/><span>History</span><i>{studio.history.length}</i></button>
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

    <nav className="ix-studio__mobile-tabs" aria-label="Mobile studio panels">
      <button type="button" className={mobilePanel === 'canvas' ? 'active' : ''} onClick={() => setMobilePanel('canvas')} aria-pressed={mobilePanel === 'canvas'}><Pencil/><span>Canvas</span></button>
      <button type="button" className={mobilePanel === 'sections' ? 'active' : ''} onClick={() => setMobilePanel('sections')} aria-pressed={mobilePanel === 'sections'}><Layers3/><span>Sections</span></button>
      <button type="button" className={mobilePanel === 'assets' ? 'active' : ''} onClick={() => setMobilePanel('assets')} aria-pressed={mobilePanel === 'assets'}><Library/><span>Assets</span></button>
    </nav>

    <div className={`ix-studio__workspace ix-studio__workspace--mobile-${mobilePanel}`}>
      <aside className="ix-studio__left">
        <SectionPanel document={document} activeSectionId={activeSection.id} onSelect={id => {setActiveSectionId(id); setSelectedLayerId(null);}} onChange={change}/>
        <LayerPanel document={document} activeSectionId={activeSection.id} selectedLayerId={selectedLayerId} onSelect={setSelectedLayerId} onChange={change}/>
        {historyOpen && <section className="ix-history-panel ix-history-panel--sidebar" id="ix-history-panel" aria-label="Interactive Studio undo history">
          <header>
            <div><History/><span><b>Undo history</b><small>{studio.history.length} recorded change{studio.history.length === 1 ? '' : 's'}</small></span></div>
            <button type="button" onClick={() => setHistoryOpen(false)} aria-label="Close history"><X/></button>
          </header>
          <nav aria-label="History scope">
            <button type="button" className={historyScope === 'all' ? 'active' : ''} onClick={() => setHistoryScope('all')}>All</button>
            <button type="button" className={historyScope === 'selected' ? 'active' : ''} onClick={() => setHistoryScope('selected')} disabled={!selectedLayer}>Selected</button>
          </nav>
          <div className="ix-history-panel__actions">
            <button type="button" onClick={() => studio.undo()} disabled={!studio.canUndo}><Undo2/>Undo <kbd>Ctrl Z</kbd></button>
            <button type="button" onClick={() => studio.redo()} disabled={!studio.canRedo}><Redo2/>Redo <kbd>Ctrl Shift Z</kbd></button>
          </div>
          {visibleHistory.length
            ? <ol>{[...visibleHistory].reverse().map(entry => <li className={entry.active ? '' : 'undone'} key={entry.id}>
              <i/>
              <span><b>{entry.label}</b><small>{new Date(entry.timestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}{entry.active ? '' : ' · undone'}</small></span>
            </li>)}</ol>
            : <p className="ix-history-panel__empty">{historyScope === 'selected' ? 'No changes for this object yet.' : 'Make a change to start the undo history.'}</p>}
        </section>}
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
            onInteractionStart={beginLayerInteraction}
            onInteractionEnd={studio.endHistory}
          />
        </div>
        <div className="ix-stage-help">
          <span><b>Move:</b> drag or arrow keys</span>
          <span><b>Resize:</b> cyan corner</span>
          <span><b>Rotate:</b> round handle</span>
          <span><b>Skew:</b> orange diamond</span>
          <span><b>Edit route:</b> select a node for add-before, add-after and remove icons · drag to move · double-click path to add</span>
          <span><b>Fine move:</b> 1 px · Shift = 10 px</span>
        </div>
        {selectedLayer && <div className="ix-selected-strip">
          <div><Check/><span><b>{selectedLayer.name}</b><small>{selectedLayer.type} · selected only in this frame</small></span></div>
          {selectedLayer.type === 'text' && <label>Text<input value={selectedLayer.text || ''} onChange={event => updateLayer(selectedLayer.id, {text: event.target.value})}/></label>}
          <label>Colour<input type="color" value={(selectedLayer.stroke || selectedLayer.fill || '#ef6f4d').slice(0, 7)} onChange={event => updateLayer(selectedLayer.id, {stroke: event.target.value, fill: selectedLayer.type === 'text' ? event.target.value : selectedLayer.fill})}/></label>
          <label>Opacity<input type="range" min="0" max="1" step=".05" value={selectedLayer.opacity} onChange={event => updateLayer(selectedLayer.id, {opacity: Number(event.target.value)})}/></label>
          <button type="button" onClick={() => reorderSelected(1)}><MoveUp/>Forward</button>
          <button type="button" onClick={() => reorderSelected(-1)}><MoveDown/>Backward</button>
          {selectedLayer.parametric && <div className="ix-parametric-controls">
            <div className="ix-parametric-controls__mode" role="group" aria-label="Parametric route visibility">
              <button type="button" onClick={() => setRouteVisibility('channel')}>Channel</button>
              <button type="button" onClick={() => setRouteVisibility('conduit')}>Conduit</button>
              <button type="button" onClick={() => setRouteVisibility('both')}>Both</button>
            </div>
            <label title="0 mm keeps sharp corners; higher values create clean freeform bends">Bend radius<input type="range" min="0" max="240" step="5" value={selectedLayer.parametric.bendRadiusMm ?? DEFAULT_ROUTE_BEND_RADIUS_MM} onChange={event => updateParametric({bendRadiusMm: Number(event.target.value)})}/><output>{selectedLayer.parametric.bendRadiusMm ?? DEFAULT_ROUTE_BEND_RADIUS_MM} mm</output></label>
            <label>{selectedLayer.parametric.renderer === 'wall-channel' ? 'Channel width' : 'Conduit diameter'}<input type="range" min={selectedLayer.parametric.renderer === 'wall-channel' ? 25 : 10} max="40" step="1" value={selectedLayer.parametric.widthMm} onChange={event => updateParametric({widthMm: Number(event.target.value)})}/><output>{selectedLayer.parametric.widthMm} mm</output></label>
            {selectedLayer.parametric.renderer === 'wall-channel' && <>
              <label>Depth<input type="range" min="5" max="60" step="1" value={selectedLayer.parametric.depthMm ?? 25} onChange={event => updateParametric({depthMm: Number(event.target.value)})}/><output>{selectedLayer.parametric.depthMm ?? 25} mm</output></label>
            </>}
            {selectedLayer.parametric.renderer === 'flex-conduit' && <>
              <label>Corrugation<input type="range" min="2" max="10" step=".5" value={selectedLayer.parametric.corrugationMm ?? 4} onChange={event => updateParametric({corrugationMm: Number(event.target.value)})}/><output>{selectedLayer.parametric.corrugationMm ?? 4} mm</output></label>
              <label>Pipe colour<input type="color" value={selectedLayer.parametric.color || '#b7bbb7'} onChange={event => updateParametric({color: event.target.value})}/></label>
            </>}
          </div>}
        </div>}
      </main>

      <aside className="ix-studio__right">
        <AssetManager
          document={document}
          onChange={change}
          onApplyAsset={(asset, placement) => {applyAsset(asset, placement); setMobilePanel('canvas');}}
          onAddParametricRoute={addParametricRoute}
          onTraceAssetRoutes={traceAssetRoutes}
        />
      </aside>
    </div>
  </section>
  </>;
}
