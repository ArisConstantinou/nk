import {lazy, Suspense, useState} from 'react';
import type {MotionPreference} from '../../../core/types';
import {GsapExperience} from './GsapExperience';
import {SceneEditor, type PreviewDevice} from './SceneEditor';
import {useLiveAnimationBuild} from './useLiveAnimationBuild';
import {useSceneBlueprint} from './useSceneBlueprint';

const ThreeExperience = lazy(() => import('./ThreeExperience').then(module => ({default: module.ThreeExperience})));
type Engine = 'launcher' | 'gsap' | 'three';

export function ElectricalExperienceV3({motion}: {motion: MotionPreference}) {
  const [engine, setEngine] = useState<Engine>('launcher');
  const [editorOpen, setEditorOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('desktop');
  const blueprint = useSceneBlueprint();
  const liveBuild = useLiveAnimationBuild(blueprint.objects, blueprint.replaceBlueprint);
  const rendererMode = engine === 'three' ? 'three' : 'gsap';

  return <section
    className="ei-v3"
    data-engine={engine}
    data-editor-open={editorOpen}
    data-preview-device={previewDevice}
    data-build-phase={liveBuild.state.phase}
  >
    {engine === 'launcher' ? <div className="ei-v3-launcher">
      <div className="ei-v3-launcher__grid" aria-hidden="true"/>
      <header>
        <span><i/> NK ELECTRICAL / INTERACTIVE INSTALLATION LAB</span>
        <h2>Choose the<br/><em>rendering engine.</em></h2>
        <p>One technically controlled installation sequence. Two independent production renderers. Every visible object remains selectable, replaceable and editable.</p>
      </header>
      <div className="ei-v3-launcher__choices">
        <button type="button" onClick={() => setEngine('gsap')}>
          <span>ENGINE / 01</span>
          <strong>GSAP<br/>&amp; ScrollTrigger</strong>
          <p>Photoreal layers, editable SVG construction geometry, scroll-synchronised workers and effects.</p>
          <b>OPEN GSAP VERSION →</b>
        </button>
        <button type="button" onClick={() => setEngine('three')}>
          <span>ENGINE / 02</span>
          <strong>Three.js<br/>&amp; WebGPU</strong>
          <p>True 3D depth, physical lights, shadow maps, selectable meshes and WebGL2 fallback.</p>
          <b>OPEN WEBGPU VERSION →</b>
        </button>
      </div>
      <footer>
        <span>13 CONSTRUCTION STAGES</span>
        <span>UK / CYPRUS PRACTICE</span>
        <button type="button" onClick={() => {setEngine('gsap'); setEditorOpen(true);}}>OPEN LIVE PREVIEW STUDIO</button>
      </footer>
    </div> : engine === 'gsap' ? <GsapExperience
      motion={motion}
      objects={blueprint.objects}
      selectedId={blueprint.selectedId}
      onSelect={blueprint.setSelectedId}
      onMoveObject={editorOpen ? (id, x, y) => blueprint.update2d(id, {x, y}) : undefined}
      onBack={() => setEngine('launcher')}
      onEdit={() => setEditorOpen(true)}
    /> : <Suspense fallback={<div className="ei-v3-loading"><i/><span>INITIALISING WEBGPU SCENE</span></div>}>
      <ThreeExperience
        motion={motion}
        objects={blueprint.objects}
        selectedId={blueprint.selectedId}
        onSelect={blueprint.setSelectedId}
        onBack={() => setEngine('launcher')}
        onEdit={() => setEditorOpen(true)}
      />
    </Suspense>}

    {editorOpen && <SceneEditor
      open={editorOpen}
      mode={rendererMode}
      objects={blueprint.objects}
      selected={blueprint.selected}
      onClose={() => setEditorOpen(false)}
      onSelect={blueprint.setSelectedId}
      onUpdate={blueprint.update}
      onUpdate2d={blueprint.update2d}
      onUpdate3d={blueprint.update3d}
      onReset={blueprint.reset}
      onExport={blueprint.exportBlueprint}
      onImport={blueprint.importBlueprint}
      build={liveBuild.state}
      previewDevice={previewDevice}
      onPreviewDevice={setPreviewDevice}
      onRebuild={liveBuild.rebuild}
    />}
  </section>;
}
