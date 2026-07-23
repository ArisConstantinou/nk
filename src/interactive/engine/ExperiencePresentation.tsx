import {useCallback, useEffect, useRef, useState, type CSSProperties} from 'react';
import {ChevronLeft, ChevronRight, Expand, Focus, Minimize2} from 'lucide-react';
import type {MotionPreference} from '../core/types';
import {ExperienceStage} from './ExperienceStage';
import type {ExperienceDocument, ExperienceViewMode} from './schema';
import './engine.css';

type Props = {
  document: ExperienceDocument;
  motion?: MotionPreference;
  initialSection?: number;
  editingPreview?: boolean;
  onExitPreview?: () => void;
};

export function ExperiencePresentation({document, motion = 'full', initialSection = 0, editingPreview = false, onExitPreview}: Props) {
  const [activeIndex, setActiveIndex] = useState(Math.min(initialSection, document.sections.length - 1));
  const [mode, setMode] = useState<ExperienceViewMode>('page');
  const rootRef = useRef<HTMLElement>(null);
  const wheelLock = useRef(0);
  const active = document.sections[activeIndex] || document.sections[0];
  const go = useCallback((next: number) => setActiveIndex(Math.max(0, Math.min(document.sections.length - 1, next))), [document.sections.length]);

  useEffect(() => {
    if (activeIndex >= document.sections.length) setActiveIndex(Math.max(0, document.sections.length - 1));
  }, [activeIndex, document.sections.length]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const handleWheel = (event: globalThis.WheelEvent) => {
      const direction = event.deltaY > 0 ? 1 : -1;
      const next = activeIndex + direction;
      if (next < 0 || next >= document.sections.length) return;

      // Keep the page anchored while a valid frame transition is available.
      // React delegates wheel events passively, so this must be a native listener.
      event.preventDefault();
      if (Math.abs(event.deltaY) < 12 || Date.now() < wheelLock.current) return;
      wheelLock.current = Date.now() + (motion === 'reduced' ? 180 : 620);
      go(next);
    };

    root.addEventListener('wheel', handleWheel, {passive: false});
    return () => root.removeEventListener('wheel', handleWheel);
  }, [activeIndex, document.sections.length, go, motion]);

  const toggleFullscreen = async () => {
    if (!globalThis.document.fullscreenElement && rootRef.current?.requestFullscreen) {
      await rootRef.current.requestFullscreen();
      setMode('fullscreen');
    } else if (globalThis.document.fullscreenElement) {
      await globalThis.document.exitFullscreen();
      setMode('focus');
    }
  };

  return <section
    ref={rootRef}
    className={`ix-presentation ix-presentation--${mode} ${editingPreview ? 'ix-presentation--preview' : ''}`}
    data-motion={motion}
    aria-label={document.title}
  >
    <header className="ix-presentation__bar">
      <div><small>INSTALLATION PROCESS</small><strong>{document.title}</strong></div>
      <div className="ix-presentation__modes" role="group" aria-label="Stage view">
        {editingPreview && <button type="button" onClick={onExitPreview}>Back to editor</button>}
        <button type="button" className={mode === 'page' ? 'active' : ''} onClick={() => setMode('page')} aria-label="Page view"><Minimize2/><span>Page</span></button>
        <button type="button" className={mode === 'focus' ? 'active' : ''} onClick={() => setMode('focus')} aria-label="Focus view"><Focus/><span>Focus</span></button>
        <button type="button" onClick={() => void toggleFullscreen()} aria-label="Browser fullscreen"><Expand/><span>Fullscreen</span></button>
      </div>
    </header>
    <div className="ix-presentation__viewport">
      <ExperienceStage document={document} section={active} fit="contain"/>
      <div className="ix-presentation__caption" aria-live="polite">
        <span>{String(activeIndex + 1).padStart(2, '0')} / {String(document.sections.length).padStart(2, '0')}</span>
        <div><small>{active.name}</small><p>{active.description}</p></div>
      </div>
    </div>
    {document.settings.showProgress && <nav
      className="ix-presentation__timeline"
      aria-label="Experience timeline"
      style={{'--section-count': document.sections.length} as CSSProperties}
    >
      {document.sections.map((section, index) => <button
        key={section.id}
        type="button"
        className={index === activeIndex ? 'active' : ''}
        onClick={() => go(index)}
        aria-current={index === activeIndex ? 'step' : undefined}
        aria-label={`Go to step ${index + 1}: ${section.name}`}
      ><span>{String(index + 1).padStart(2, '0')}</span><i/></button>)}
    </nav>}
    <div className="ix-presentation__mobile-nav">
      <button type="button" onClick={() => go(activeIndex - 1)} disabled={activeIndex === 0}><ChevronLeft/>Previous</button>
      <span>{activeIndex + 1} / {document.sections.length}</span>
      <button type="button" onClick={() => go(activeIndex + 1)} disabled={activeIndex === document.sections.length - 1}>Next<ChevronRight/></button>
    </div>
  </section>;
}
