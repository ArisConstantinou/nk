import {useEffect, useRef, type ChangeEvent} from 'react';
import type {AnimationPreset, SceneObjectDefinition, Transform2D, Transform3D} from './sceneBlueprint';
import type {LiveBuildState} from './useLiveAnimationBuild';

export type PreviewDevice = 'desktop' | 'tablet' | 'mobile';

type Props = {
  open: boolean;
  mode: 'gsap' | 'three';
  objects: readonly SceneObjectDefinition[];
  selected: SceneObjectDefinition | null;
  onClose: () => void;
  onSelect: (id: string) => void;
  onUpdate: (id: string, patch: Partial<SceneObjectDefinition>) => void;
  onUpdate2d: (id: string, patch: Partial<Transform2D>) => void;
  onUpdate3d: (id: string, patch: Partial<Transform3D>) => void;
  onReset: () => void;
  onExport: () => void;
  onImport: (text: string) => void;
  build: LiveBuildState;
  previewDevice: PreviewDevice;
  onPreviewDevice: (device: PreviewDevice) => void;
  onRebuild: () => void;
};

const animations: AnimationPreset[] = ['none', 'enter-left', 'enter-right', 'draw', 'pop', 'wipe', 'door-left', 'door-right', 'glow', 'particles'];

function NumberField({label, value, step = 1, onChange}: {label: string; value: number; step?: number; onChange: (value: number) => void}) {
  return <label><span>{label}</span><input type="number" value={Number(value.toFixed(3))} step={step} onChange={event => onChange(Number(event.target.value))}/></label>;
}

export function SceneEditor(props: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const {selected} = props;
  const groupedObjects = props.objects.reduce<Record<string, SceneObjectDefinition[]>>((groups, item) => {
    (groups[item.category] ??= []).push(item);
    return groups;
  }, {});
  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    props.onImport(await file.text());
    event.target.value = '';
  };
  const nudge = (deltaX: number, deltaY: number, large = false) => {
    if (!selected) return;
    const step = props.mode === 'gsap' ? (large ? 10 : 1) : (large ? .5 : .05);
    if (props.mode === 'gsap') {
      props.onUpdate2d(selected.id, {
        x: selected.transform2d.x + deltaX * step,
        y: selected.transform2d.y + deltaY * step,
      });
    } else {
      props.onUpdate3d(selected.id, {
        x: selected.transform3d.x + deltaX * step,
        y: selected.transform3d.y + deltaY * step,
      });
    }
  };
  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (!selected || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement || target instanceof HTMLButtonElement) return;
      event.preventDefault();
      nudge(
        event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0,
        event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0,
        event.shiftKey,
      );
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });
  const buildLabel = props.build.phase === 'ready'
    ? 'READY'
    : props.build.phase === 'error'
      ? 'ERROR'
      : props.build.phase === 'generating'
        ? 'CREATING'
        : 'UPDATING';
  return <aside className={`ei-v3-editor ${props.open ? 'is-open' : ''}`} aria-hidden={!props.open}>
    <header>
      <div><small>LIVE EDITOR</small><strong>Changes appear instantly</strong></div>
      <span className="ei-v3-editor__engine">{props.mode === 'gsap' ? 'GSAP' : 'THREE.JS'}</span>
      <button type="button" onClick={props.onClose} aria-label="Close scene editor">×</button>
    </header>
    <section className={`ei-v3-editor__live is-${props.build.phase}`} aria-live="polite">
      <div className="ei-v3-editor__live-state">
        <span><i/>{buildLabel}</span>
        <b>{props.build.message}</b>
        <small>Auto-saved · no refresh needed</small>
      </div>
      <div className="ei-v3-editor__devices" role="group" aria-label="Live preview device">
        {(['desktop', 'tablet', 'mobile'] as const).map(device => <button
          type="button"
          className={props.previewDevice === device ? 'is-active' : ''}
          aria-pressed={props.previewDevice === device}
          onClick={() => props.onPreviewDevice(device)}
          key={device}
        ><i/><span>{device}</span></button>)}
      </div>
      <div className="ei-v3-editor__progress" role="progressbar" aria-label="Animation build progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(props.build.progress)}>
        <span style={{width: `${props.build.progress}%`}}/>
      </div>
      <small className="ei-v3-editor__progress-copy">{Math.round(props.build.progress)}%</small>
    </section>
    <div className="ei-v3-editor__objects">
      <label>
        <span>CHOOSE WHAT TO EDIT</span>
        <select value={selected?.id ?? ''} onChange={event => props.onSelect(event.target.value)}>
          <option value="">Choose an object</option>
          {Object.entries(groupedObjects).map(([category, entries]) =>
            <optgroup label={category} key={category}>
              {entries.map(item => <option value={item.id} key={item.id}>{item.label}</option>)}
            </optgroup>,
          )}
        </select>
      </label>
    </div>
    {selected ? <div className="ei-v3-editor__form">
      <div className="ei-v3-editor__identity"><b>{selected.label}</b><code>{selected.id}</code></div>
      <label className="ei-v3-editor__toggle"><input type="checkbox" checked={selected.properties.enabled} onChange={event => props.onUpdate(selected.id, {properties: {...selected.properties, enabled: event.target.checked}})}/><span>Enabled</span></label>
      <section className="ei-v3-editor__section">
        <h3>Position &amp; size</h3>
        <div className="ei-v3-editor__grid">
          {props.mode === 'gsap' ? <>
            <NumberField label="Left / right" value={selected.transform2d.x} onChange={x => props.onUpdate2d(selected.id, {x})}/>
            <NumberField label="Up / down" value={selected.transform2d.y} onChange={y => props.onUpdate2d(selected.id, {y})}/>
            <NumberField label="Width" value={selected.transform2d.width} onChange={width => props.onUpdate2d(selected.id, {width})}/>
            <NumberField label="Height" value={selected.transform2d.height} onChange={height => props.onUpdate2d(selected.id, {height})}/>
            <NumberField label="Scale" value={selected.transform2d.scale} step={.05} onChange={scale => props.onUpdate2d(selected.id, {scale})}/>
          </> : <>
            <NumberField label="Left / right" value={selected.transform3d.x} step={.05} onChange={x => props.onUpdate3d(selected.id, {x})}/>
            <NumberField label="Up / down" value={selected.transform3d.y} step={.05} onChange={y => props.onUpdate3d(selected.id, {y})}/>
            <NumberField label="Depth" value={selected.transform3d.z} step={.05} onChange={z => props.onUpdate3d(selected.id, {z})}/>
            <NumberField label="Scale" value={selected.transform3d.scale} step={.05} onChange={scale => props.onUpdate3d(selected.id, {scale})}/>
          </>}
        </div>
      </section>
      <div className="ei-v3-editor__nudge" aria-label="Move selected object">
        <span>EASY MOVE</span>
        <button type="button" className="is-up" aria-label="Move up" onClick={() => nudge(0, -1)}>↑</button>
        <button type="button" className="is-left" aria-label="Move left" onClick={() => nudge(-1, 0)}>←</button>
        <button type="button" className="is-centre" aria-label="Drag the selected object directly in the scene" disabled>DRAG</button>
        <button type="button" className="is-right" aria-label="Move right" onClick={() => nudge(1, 0)}>→</button>
        <button type="button" className="is-down" aria-label="Move down" onClick={() => nudge(0, 1)}>↓</button>
        <small>Use the arrows, keyboard arrows, or drag the item directly in the preview.</small>
      </div>
      <details className="ei-v3-editor__advanced">
        <summary>Animation &amp; advanced settings</summary>
        <div className="ei-v3-editor__grid">
          {props.mode === 'gsap' ? <NumberField label="Rotation" value={selected.transform2d.rotation} onChange={rotation => props.onUpdate2d(selected.id, {rotation})}/> : <>
            <NumberField label="Rotate X" value={selected.transform3d.rotationX} step={.05} onChange={rotationX => props.onUpdate3d(selected.id, {rotationX})}/>
            <NumberField label="Rotate Y" value={selected.transform3d.rotationY} step={.05} onChange={rotationY => props.onUpdate3d(selected.id, {rotationY})}/>
            <NumberField label="Rotate Z" value={selected.transform3d.rotationZ} step={.05} onChange={rotationZ => props.onUpdate3d(selected.id, {rotationZ})}/>
          </>}
          <NumberField label="Appears at stage" value={selected.stageIn} onChange={stageIn => props.onUpdate(selected.id, {stageIn})}/>
          <NumberField label="Ends after stage" value={selected.stageOut} onChange={stageOut => props.onUpdate(selected.id, {stageOut})}/>
          <NumberField label="Opacity" value={selected.properties.opacity} step={.05} onChange={opacity => props.onUpdate(selected.id, {properties: {...selected.properties, opacity}})}/>
        </div>
        <label><span>ANIMATION</span><select value={selected.animation} onChange={event => props.onUpdate(selected.id, {animation: event.target.value as AnimationPreset})}>{animations.map(animation => <option key={animation}>{animation}</option>)}</select></label>
        {selected.asset && <label><span>IMAGE / TEXTURE</span><input value={selected.asset} onChange={event => props.onUpdate(selected.id, {asset: event.target.value})}/></label>}
      </details>
    </div> : <p className="ei-v3-editor__empty">Select an item in the list or click it directly in the scene.</p>}
    <footer>
      <button type="button" onClick={props.onReset}>Reset all</button>
      <button type="button" onClick={props.onRebuild}>Refresh preview</button>
      <button type="button" onClick={props.onExport}>Export JSON</button>
      <button type="button" onClick={() => inputRef.current?.click()}>Import JSON</button>
      <input ref={inputRef} type="file" accept="application/json" hidden onChange={importFile}/>
    </footer>
  </aside>;
}
