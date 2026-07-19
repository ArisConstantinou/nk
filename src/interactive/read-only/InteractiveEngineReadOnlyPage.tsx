import {useEffect, useMemo, useRef, useState} from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Expand,
  ExternalLink,
  Layers3,
  Library,
  LockKeyhole,
  ShieldCheck,
} from 'lucide-react';
import {Link, useParams} from 'react-router-dom';
import {ExperienceStage} from '../engine/ExperienceStage';
import {createDocument} from '../engine/schema';
import {usePublishedExperience} from '../engine/usePublishedExperience';
import {electricalInstallationTemplate} from '../templates/electricalInstallation';
import '../engine/engine.css';
import './read-only-engine.css';

const releaseDocumentFor = (slug: string) => {
  if (slug === electricalInstallationTemplate.slug) return electricalInstallationTemplate;
  return createDocument(slug, 'Interactive experience');
};

export default function InteractiveEngineReadOnlyPage() {
  const {slug = electricalInstallationTemplate.slug} = useParams();
  const releaseFallback = useMemo(() => releaseDocumentFor(slug), [slug]);
  const {document, source} = usePublishedExperience(slug, releaseFallback);
  const [activeSectionId, setActiveSectionId] = useState(document.sections[0]?.id || '');
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [hiddenLayerIds, setHiddenLayerIds] = useState<Set<string>>(() => new Set());
  const rootRef = useRef<HTMLElement>(null);

  const activeSection = document.sections.find(section => section.id === activeSectionId) || document.sections[0];
  const activeIndex = Math.max(0, document.sections.findIndex(section => section.id === activeSection?.id));
  const selectedLayer = activeSection?.layers.find(layer => layer.id === selectedLayerId) || null;
  const visibleSection = useMemo(() => activeSection ? {
    ...activeSection,
    layers: activeSection.layers.map(layer => hiddenLayerIds.has(layer.id) ? {...layer, visible: false} : layer),
  } : null, [activeSection, hiddenLayerIds]);

  useEffect(() => {
    if (!document.sections.some(section => section.id === activeSectionId)) {
      setActiveSectionId(document.sections[0]?.id || '');
      setSelectedLayerId(null);
    }
  }, [activeSectionId, document.sections]);

  const selectSection = (sectionId: string) => {
    setActiveSectionId(sectionId);
    setSelectedLayerId(null);
  };

  const stepSection = (direction: -1 | 1) => {
    const nextIndex = Math.max(0, Math.min(document.sections.length - 1, activeIndex + direction));
    const nextSection = document.sections[nextIndex];
    if (nextSection) selectSection(nextSection.id);
  };

  const toggleLocalVisibility = (layerId: string) => {
    setHiddenLayerIds(current => {
      const next = new Set(current);
      if (next.has(layerId)) next.delete(layerId);
      else next.add(layerId);
      return next;
    });
  };

  const fullscreen = async () => {
    if (!globalThis.document.fullscreenElement) await rootRef.current?.requestFullscreen();
    else await globalThis.document.exitFullscreen();
  };

  if (!activeSection || !visibleSection) {
    return <main className="ix-readonly-error" role="alert">
      <LockKeyhole/>
      <h1>No published engine frames are available.</h1>
      <p>This public link can only display a valid published interactive document.</p>
    </main>;
  }

  return <main ref={rootRef} className="ix-readonly-engine">
    <header className="ix-readonly-engine__header">
      <div className="ix-readonly-engine__identity">
        <span>PUBLIC READ-ONLY ENGINE</span>
        <h1>{document.title}</h1>
        <p>Published workspace inspection · no draft or code access</p>
      </div>
      <div className="ix-readonly-engine__status">
        <span className="ix-readonly-badge"><ShieldCheck/>{source === 'published' ? 'Published' : 'Release preview'} · Read only</span>
        <Link to={`/services/${slug}`}><ExternalLink/>Open presentation</Link>
        <button type="button" onClick={() => void fullscreen()}><Expand/>Fullscreen</button>
      </div>
    </header>

    <div className="ix-readonly-engine__notice" role="status">
      <LockKeyhole/>
      <span>You can inspect frames and layers. Visibility changes are local to this browser and reset on refresh.</span>
    </div>

    <div className="ix-readonly-engine__workspace">
      <aside className="ix-readonly-engine__frames">
        <div className="ix-readonly-panel-heading">
          <span><Layers3/><b>Frames</b></span>
          <small>{document.sections.length}</small>
        </div>
        <div className="ix-readonly-frame-list" role="listbox" aria-label="Published frames">
          {document.sections.map((section, index) => <button
            key={section.id}
            type="button"
            className={section.id === activeSection.id ? 'active' : ''}
            aria-selected={section.id === activeSection.id}
            onClick={() => selectSection(section.id)}
          >
            <span>{String(index + 1).padStart(2, '0')}</span>
            <b>{section.name}</b>
          </button>)}
        </div>
      </aside>

      <section className="ix-readonly-engine__canvas">
        <header className="ix-readonly-frame-meta">
          <span>{String(activeIndex + 1).padStart(2, '0')} / {String(document.sections.length).padStart(2, '0')}</span>
          <div>
            <strong>{activeSection.name}</strong>
            <p>{activeSection.description || 'No frame description.'}</p>
          </div>
          <small>{document.stage.width} × {document.stage.height} · SVG</small>
        </header>
        <div className="ix-readonly-stage-shell">
          <ExperienceStage
            document={document}
            section={visibleSection}
            selectedLayerId={selectedLayerId}
          />
        </div>
        <footer className="ix-readonly-stage-footer">
          <button type="button" onClick={() => stepSection(-1)} disabled={activeIndex === 0}><ChevronLeft/>Previous frame</button>
          <span>Frame selection and layer inspection are safe, temporary viewer controls.</span>
          <button type="button" onClick={() => stepSection(1)} disabled={activeIndex === document.sections.length - 1}>Next frame<ChevronRight/></button>
        </footer>
      </section>

      <aside className="ix-readonly-engine__inspector">
        <div className="ix-readonly-panel-heading">
          <span><Layers3/><b>Layers in frame</b></span>
          <small>{activeSection.layers.length}</small>
        </div>
        <div className="ix-readonly-layer-list">
          {activeSection.layers.length === 0 && <p className="ix-readonly-empty">This frame has no layers.</p>}
          {activeSection.layers.map(layer => {
            const locallyHidden = hiddenLayerIds.has(layer.id);
            return <article key={layer.id} className={selectedLayerId === layer.id ? 'active' : ''}>
              <button type="button" className="ix-readonly-layer-main" onClick={() => setSelectedLayerId(layer.id)}>
                <span>{layer.name}</span>
                <small>{layer.type}</small>
              </button>
              <button
                type="button"
                className="ix-readonly-eye"
                onClick={() => toggleLocalVisibility(layer.id)}
                aria-label={`${locallyHidden ? 'Show' : 'Hide'} ${layer.name} locally`}
                aria-pressed={!locallyHidden}
                title="Local viewer visibility only"
              >
                {locallyHidden ? <EyeOff/> : <Eye/>}
              </button>
            </article>;
          })}
        </div>

        <section className="ix-readonly-selection">
          <span>SELECTED LAYER</span>
          {selectedLayer ? <>
            <h2>{selectedLayer.name}</h2>
            <dl>
              <div><dt>Type</dt><dd>{selectedLayer.type}</dd></div>
              <div><dt>Position</dt><dd>{Math.round(selectedLayer.transform.x)}, {Math.round(selectedLayer.transform.y)}</dd></div>
              <div><dt>Size</dt><dd>{Math.round(selectedLayer.transform.width)} × {Math.round(selectedLayer.transform.height)}</dd></div>
              <div><dt>Rotation</dt><dd>{selectedLayer.transform.rotation}°</dd></div>
              {selectedLayer.parametric && <div><dt>Route width</dt><dd>{selectedLayer.parametric.widthMm} mm</dd></div>}
            </dl>
            {selectedLayer.description && <p>{selectedLayer.description}</p>}
          </> : <p>Select a layer to inspect its published properties.</p>}
        </section>

        <section className="ix-readonly-assets">
          <div className="ix-readonly-panel-heading">
            <span><Library/><b>Asset references</b></span>
            <small>{document.assetGroups.reduce((count, group) => count + group.assets.length, 0)}</small>
          </div>
          {document.assetGroups.map(group => <details key={group.id}>
            <summary>{group.name}<span>{group.assets.length}</span></summary>
            {group.assets.length
              ? <ul>{group.assets.map(asset => <li key={asset.id}>{asset.name}<small>{asset.kind}</small></li>)}</ul>
              : <p>No published assets in this group.</p>}
          </details>)}
        </section>
      </aside>
    </div>
  </main>;
}
