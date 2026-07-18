import {useEffect, useMemo, useRef, useState} from 'react';
import {loadGsap} from '../../../adapters/gsap';
import type {MotionPreference} from '../../../core/types';
import {GsapScene} from './GsapScene';
import {installationStages, type SceneObjectDefinition} from './sceneBlueprint';

type Props = {
  motion: MotionPreference;
  objects: readonly SceneObjectDefinition[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMoveObject?: (id: string, x: number, y: number) => void;
  onBack: () => void;
  onEdit: () => void;
};

export function GsapExperience({motion, objects, selectedId, onSelect, onMoveObject, onBack, onEdit}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [activeStage, setActiveStage] = useState(0);
  const [shelfLights, setShelfLights] = useState(true);
  const [lowerLight, setLowerLight] = useState(true);
  const [scrollRuntime, setScrollRuntime] = useState<{start: number; end: number} | null>(null);
  const timelineKey = useMemo(() => JSON.stringify(objects.map(item => ({
    id: item.id,
    stageIn: item.stageIn,
    stageOut: item.stageOut,
    animation: item.animation,
    enabled: item.properties.enabled,
    opacity: item.properties.opacity,
  }))), [objects]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || motion === 'reduced' || !window.matchMedia('(min-width: 1025px)').matches) return;
    const controller = new AbortController();
    let cleanup = () => undefined;
    void loadGsap(controller.signal).then(({gsap, ScrollTrigger}) => {
      const context = gsap.context(() => {
        const frame = root.querySelector<HTMLElement>('[data-v3-gsap-frame]');
        const sceneObjects = [...root.querySelectorAll<SVGGElement>('[data-object-id]')];
        const stageButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-v3-stage-button]')];
        const drawPaths = [...root.querySelectorAll<SVGPathElement>('[data-draw-path]')];
        if (!frame) return;

        drawPaths.forEach(path => {
          const length = path.getTotalLength();
          gsap.set(path, {strokeDasharray: length, strokeDashoffset: length});
        });
        sceneObjects.forEach(node => {
          const id = node.dataset.objectId;
          const definition = objects.find(item => item.id === id);
          gsap.set(node, {autoAlpha: definition?.stageIn === 0 && definition.properties.enabled ? definition.properties.opacity : 0});
        });

        const timeline = gsap.timeline({
          defaults: {ease: 'none'},
          scrollTrigger: {
            id: 'nk-electrical-v3-gsap',
            trigger: root,
            start: () => `top ${document.querySelector<HTMLElement>('.ia-header')?.getBoundingClientRect().height ?? 0}px`,
            end: () => `+=${Math.max(window.innerHeight * 12.5, 8200)}`,
            pin: frame,
            scrub: .35,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onRefresh(self) { setScrollRuntime({start: self.start, end: self.end}); },
            onUpdate(self) {
              const index = Math.min(12, Math.floor(self.progress * 13));
              setActiveStage(current => current === index ? current : index);
            },
          },
        });

        for (let stage = 0; stage < installationStages.length; stage += 1) {
          timeline.addLabel(`stage-${stage}`, stage);
          const entering = objects.filter(item => item.properties.enabled && item.stageIn === stage && item.stageIn > 0);
          entering.forEach(item => {
            const node = root.querySelector<SVGGElement>(`[data-object-id="${item.id}"]`);
            if (!node) return;
            const at = `stage-${stage}`;
            if (item.animation === 'enter-left' || item.animation === 'enter-right') {
              const offset = item.animation === 'enter-left' ? -560 : 560;
              timeline.fromTo(node, {autoAlpha: 0, x: offset}, {autoAlpha: item.properties.opacity, x: 0, duration: .2, ease: 'power2.out'}, at);
              timeline.to(node, {autoAlpha: 0, x: -offset, duration: .2, ease: 'power2.in'}, `${at}+=.76`);
            } else if (item.animation === 'draw') {
              timeline.set(node, {autoAlpha: item.properties.opacity}, at);
              timeline.to(node.querySelectorAll('[data-draw-path]'), {strokeDashoffset: 0, duration: .72, stagger: .025}, `${at}+=.06`);
            } else if (item.animation === 'particles') {
              const particles = node.querySelectorAll('[data-particle]');
              timeline.set(node, {autoAlpha: item.properties.opacity}, at);
              timeline.fromTo(particles, {autoAlpha: 0, scale: .2, x: 0, y: 0}, {
                autoAlpha: .78,
                scale: 1.4,
                x: () => gsap.utils.random(-80, 110),
                y: () => gsap.utils.random(-70, 75),
                duration: .52,
                stagger: .012,
                ease: 'power1.out',
              }, `${at}+=.12`);
              timeline.to(node, {autoAlpha: 0, duration: .18}, `${at}+=.76`);
            } else if (item.animation === 'wipe') {
              timeline.fromTo(node, {autoAlpha: 1, clipPath: 'inset(0 100% 0 0)'}, {clipPath: 'inset(0 0% 0 0)', duration: .72, ease: 'power1.inOut'}, at);
            } else if (item.animation === 'door-left' || item.animation === 'door-right') {
              timeline.fromTo(node, {autoAlpha: 0, scaleX: 1}, {autoAlpha: 1, scaleX: .16, skewY: item.animation === 'door-left' ? -3 : 3, duration: .58, ease: 'power2.inOut'}, `${at}+=.22`);
            } else if (item.animation === 'glow') {
              timeline.fromTo(node, {autoAlpha: 0}, {autoAlpha: item.properties.opacity, duration: .7, ease: 'power2.out'}, `${at}+=.12`);
            } else {
              timeline.fromTo(node, {autoAlpha: 0, scale: .82}, {autoAlpha: item.properties.opacity, scale: 1, duration: .46, ease: 'back.out(1.35)'}, `${at}+=.08`);
            }
          });

          const leaving = objects.filter(item => item.properties.enabled && item.stageOut === stage && !item.id.startsWith('worker-'));
          leaving.forEach(item => {
            const node = root.querySelector<SVGGElement>(`[data-object-id="${item.id}"]`);
            if (node) timeline.to(node, {autoAlpha: 0, duration: .15}, `stage-${stage}+=.86`);
          });

          if (stage === 6) {
            const firstFix = ['setout', 'wall-chases', 'switch-back-box', 'conduits', 'mains-cables', 'led-cables']
              .map(id => root.querySelector(`[data-object-id="${id}"]`))
              .filter(Boolean);
            timeline.to(firstFix, {autoAlpha: 0, duration: .22}, 'stage-6+=.62');
          }
          timeline.to({}, {duration: 1}, `stage-${stage}`);
        }

        stageButtons.forEach((button, index) => {
          button.onclick = () => {
            const trigger = timeline.scrollTrigger;
            if (!trigger) return;
            const progress = Math.min(.999, (index + .45) / installationStages.length);
            window.scrollTo({top: trigger.start + (trigger.end - trigger.start) * progress, behavior: 'smooth'});
          };
        });

        cleanup = () => {
          timeline.scrollTrigger?.kill();
          timeline.kill();
          stageButtons.forEach(button => { button.onclick = null; });
          context.revert();
        };
      }, root);
      ScrollTrigger.refresh();
      controller.signal.addEventListener('abort', () => context.revert(), {once: true});
    }).catch(error => {
      if (!(error instanceof DOMException && error.name === 'AbortError') && import.meta.env.DEV) console.error(error);
    });
    return () => {
      controller.abort();
      cleanup();
    };
  }, [motion, timelineKey]);

  const chooseStage = (index: number) => {
    setActiveStage(index);
    if (scrollRuntime && window.matchMedia('(min-width: 1025px)').matches) {
      window.scrollTo({top: scrollRuntime.start + (scrollRuntime.end - scrollRuntime.start) * ((index + .45) / 13), behavior: 'smooth'});
    }
  };

  const active = installationStages[activeStage];
  return <div className="ei-v3-engine ei-v3-engine--gsap" ref={rootRef}>
    <div className="ei-v3-engine__frame" data-v3-gsap-frame>
      <header className="ei-v3-engine__topbar">
        <button type="button" onClick={onBack}>← Engines</button>
        <div><small>NK ELECTRICAL / ENGINE 01</small><strong>GSAP + SCROLLTRIGGER</strong></div>
        <button type="button" onClick={onEdit}>Edit assets</button>
      </header>
      <div className="ei-v3-engine__layout">
        <nav className="ei-v3-stage-nav" aria-label="Installation stages">
          {installationStages.map((stage, index) => <button
            type="button"
            key={stage.id}
            className={activeStage === index ? 'is-active' : ''}
            data-v3-stage-button={index}
            aria-current={activeStage === index ? 'step' : undefined}
            onClick={() => chooseStage(index)}
          ><span>{stage.number}</span><strong>{stage.short}</strong></button>)}
        </nav>
        <div className="ei-v3-gsap-stage">
          <GsapScene
            objects={objects}
            selectedId={selectedId}
            activeStage={activeStage}
            shelfLights={shelfLights}
            lowerLight={lowerLight}
            onSelect={onSelect}
            onMoveObject={onMoveObject}
            onToggleShelfLights={() => setShelfLights(value => !value)}
            onToggleLowerLight={() => setLowerLight(value => !value)}
          />
          <div className="ei-v3-stage-readout">
            <span>{active.number} / 13</span>
            <div><small>{active.short}</small><h3>{active.title}</h3><p>{active.detail}</p></div>
            <b>{Math.round((activeStage / 12) * 100)}%</b>
          </div>
        </div>
      </div>
    </div>
  </div>;
}
