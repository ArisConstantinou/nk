import {useEffect, useRef, useState} from 'react';
import type {MotionPreference} from '../../../core/types';
import {installationStages, type SceneObjectDefinition} from './sceneBlueprint';

type Props = {
  motion: MotionPreference;
  objects: readonly SceneObjectDefinition[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onBack: () => void;
  onEdit: () => void;
};

type RuntimeEntry = {
  object: import('three/webgpu').Object3D;
  definition: SceneObjectDefinition;
  baseX: number;
  materials: import('three/webgpu').Material[];
};

const workerIds = new Set([
  'worker-marking', 'worker-chasing', 'worker-boxes', 'worker-conduit',
  'worker-cables', 'worker-switch',
]);

const workerStage = (id: string) => ({
  'worker-marking': 1,
  'worker-chasing': 2,
  'worker-boxes': 3,
  'worker-conduit': 4,
  'worker-cables': 5,
  'worker-switch': 11,
}[id] ?? -1);

export function ThreeExperience({motion, objects, selectedId, onSelect, onBack, onEdit}: Props) {
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const journeyRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<Map<string, RuntimeEntry>>(new Map());
  const progressRef = useRef({stage: 0, local: 0});
  const selectedRef = useRef(selectedId);
  const onSelectRef = useRef(onSelect);
  const [activeStage, setActiveStage] = useState(0);
  const [shelfLights, setShelfLights] = useState(true);
  const [lowerLight, setLowerLight] = useState(true);
  const [backend, setBackend] = useState('INITIALISING');

  useEffect(() => { selectedRef.current = selectedId; }, [selectedId]);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  useEffect(() => {
    const journey = journeyRef.current;
    if (!journey) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      if (motion === 'reduced' || window.innerWidth <= 1024) return;
      const rect = journey.getBoundingClientRect();
      const travel = Math.max(1, journey.offsetHeight - window.innerHeight);
      const progress = Math.max(0, Math.min(1, -rect.top / travel));
      const scaled = Math.min(12.999, progress * 13);
      const stage = Math.floor(scaled);
      progressRef.current = {stage, local: scaled - stage};
      setActiveStage(current => current === stage ? current : stage);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, {passive: true});
    window.addEventListener('resize', onScroll, {passive: true});
    update();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [motion]);

  useEffect(() => {
    const host = canvasHostRef.current;
    if (!host) return;
    let disposed = false;
    let cleanup = () => undefined;
    void import('three/webgpu').then(async THREE => {
      if (disposed) return;
      const scene = new THREE.Scene();
      scene.background = new THREE.Color('#111820');
      scene.fog = new THREE.Fog('#111820', 7.5, 13);
      const camera = new THREE.PerspectiveCamera(39, host.clientWidth / Math.max(1, host.clientHeight), .1, 40);
      camera.position.set(0, .15, 7.1);
      camera.lookAt(0, -.05, 0);

      const renderer = new THREE.WebGPURenderer({antialias: true, alpha: false});
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
      renderer.setSize(host.clientWidth, host.clientHeight);
      renderer.shadowMap.enabled = true;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.04;
      host.replaceChildren(renderer.domElement);
      await renderer.init();
      if (disposed) {
        renderer.dispose();
        return;
      }
      setBackend('gpu' in navigator ? 'WEBGPU ACTIVE' : 'WEBGL2 FALLBACK');

      const ambient = new THREE.HemisphereLight('#eaf3ff', '#4d443d', 1.9);
      scene.add(ambient);
      const key = new THREE.DirectionalLight('#fff4df', 4.4);
      key.position.set(2.8, 4.3, 5.2);
      key.castShadow = true;
      key.shadow.mapSize.set(2048, 2048);
      key.shadow.camera.left = -4;
      key.shadow.camera.right = 4;
      key.shadow.camera.top = 3;
      key.shadow.camera.bottom = -3;
      scene.add(key);
      const fill = new THREE.DirectionalLight('#c9e4ff', 1.25);
      fill.position.set(-4, 1.8, 3.6);
      scene.add(fill);

      const runtime = new Map<string, RuntimeEntry>();
      runtimeRef.current = runtime;
      const textureLoader = new THREE.TextureLoader();
      const textureCache = new Map<string, import('three/webgpu').Texture>();
      const texture = (url: string | undefined) => {
        if (!url) return undefined;
        let cached = textureCache.get(url);
        if (!cached) {
          cached = textureLoader.load(url);
          cached.colorSpace = THREE.SRGBColorSpace;
          cached.anisotropy = 4;
          textureCache.set(url, cached);
        }
        return cached;
      };
      const materialsOf = (object: import('three/webgpu').Object3D) => {
        const materials: import('three/webgpu').Material[] = [];
        object.traverse(child => {
          if (!(child instanceof THREE.Mesh || child instanceof THREE.Points)) return;
          const material = child.material;
          if (Array.isArray(material)) materials.push(...material);
          else materials.push(material);
        });
        return materials;
      };
      const register = (definition: SceneObjectDefinition, object3d: import('three/webgpu').Object3D) => {
        object3d.name = definition.id;
        object3d.userData.sceneObjectId = definition.id;
        const workerHeight = 1.15 * definition.transform3d.scale;
        const groundedWorkerY = -1.55 + workerHeight / 2 + definition.transform3d.y;
        object3d.position.set(
          definition.transform3d.x,
          workerIds.has(definition.id) ? groundedWorkerY : definition.transform3d.y,
          definition.transform3d.z,
        );
        object3d.rotation.set(definition.transform3d.rotationX, definition.transform3d.rotationY, definition.transform3d.rotationZ);
        object3d.scale.setScalar(definition.transform3d.scale);
        object3d.visible = definition.properties.enabled;
        object3d.traverse(child => {
          child.userData.sceneObjectId = definition.id;
          if (child instanceof THREE.Mesh) {
            child.castShadow = definition.id !== 'room' && !definition.id.includes('light');
            child.receiveShadow = true;
          }
        });
        scene.add(object3d);
        runtime.set(definition.id, {
          object: object3d,
          definition,
          baseX: definition.transform3d.x,
          materials: materialsOf(object3d),
        });
      };
      const standard = (color: string, definition: SceneObjectDefinition, extra: Record<string, unknown> = {}) =>
        new THREE.MeshStandardMaterial({
          color,
          roughness: definition.properties.roughness ?? .72,
          metalness: definition.properties.metalness ?? 0,
          transparent: true,
          opacity: definition.properties.opacity,
          ...extra,
        });
      const box = (definition: SceneObjectDefinition, size: [number, number, number], color: string, map?: import('three/webgpu').Texture) =>
        new THREE.Mesh(new THREE.BoxGeometry(...size), standard(color, definition, map ? {map} : {}));
      const lineTube = (
        definition: SceneObjectDefinition,
        points: readonly [number, number, number][],
        radius: number,
        color: string,
      ) => {
        const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)), false, 'centripetal');
        return new THREE.Mesh(new THREE.TubeGeometry(curve, 80, radius, 10, false), standard(color, definition));
      };
      const makeParticles = (definition: SceneObjectDefinition, color: string, count: number) => {
        const positions = new Float32Array(count * 3);
        for (let index = 0; index < count; index += 1) {
          positions[index * 3] = (Math.random() - .5) * .9;
          positions[index * 3 + 1] = (Math.random() - .5) * .6;
          positions[index * 3 + 2] = Math.random() * .45;
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        return new THREE.Points(geometry, new THREE.PointsMaterial({color, size: .045, transparent: true, opacity: .72, depthWrite: false}));
      };

      objects.forEach(definition => {
        if (!definition.properties.enabled) return;
        let created: import('three/webgpu').Object3D | null = null;
        if (definition.id === 'room') {
          const group = new THREE.Group();
          const back = new THREE.Mesh(
            new THREE.PlaneGeometry(5.6, 3.15),
            new THREE.MeshStandardMaterial({map: texture(definition.asset), roughness: 1}),
          );
          back.position.set(0, 0, -.08);
          back.receiveShadow = true;
          const floor = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 3.4), new THREE.MeshStandardMaterial({color: '#b6b0a6', roughness: .96}));
          floor.rotation.x = -Math.PI / 2;
          floor.position.set(0, -1.55, 1.62);
          floor.receiveShadow = true;
          const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 3.15), new THREE.MeshStandardMaterial({color: '#c9c4ba', roughness: .94}));
          leftWall.rotation.y = Math.PI / 2;
          leftWall.position.set(-2.8, 0, 1.55);
          leftWall.receiveShadow = true;
          group.add(back, floor, leftWall);
          created = group;
        } else if (workerIds.has(definition.id)) {
          const map = texture(definition.asset);
          const aspect = definition.transform2d.width / definition.transform2d.height;
          created = new THREE.Mesh(
            new THREE.PlaneGeometry(1.15 * aspect, 1.15),
            new THREE.MeshStandardMaterial({map, transparent: true, alphaTest: .06, side: THREE.DoubleSide, roughness: .9}),
          );
        } else if (definition.id === 'wall-chases') {
          const group = new THREE.Group();
          const routes: readonly (readonly [number, number, number][])[] = [
            [[-1.05, -1.13, 0], [-1.05, 1.18, 0]],
            [[-1.05, 1.18, 0], [-.15, 1.18, 0]],
            [[-.98, .64, 0], [-.15, .64, 0]],
            [[-.91, .1, 0], [-.15, .1, 0]],
            [[-.84, -.44, 0], [-.15, -.44, 0]],
            [[-.77, -.68, 0], [-.48, -.68, 0]],
          ];
          routes.forEach(points => group.add(lineTube(definition, points, .055, '#4d4037')));
          created = group;
        } else if (definition.id === 'conduits') {
          const group = new THREE.Group();
          const starts = [-1.14, -1.04, -.94, -.84];
          const levels = [1.18, .64, .1, -.44];
          starts.forEach((start, index) => group.add(lineTube(definition, [[start, -1.13, 0], [start, levels[index] - .12, 0], [start + .12, levels[index], 0], [-.15, levels[index], 0]], .034, '#aeb9b8')));
          group.add(lineTube(definition, [[-.74, -1.13, 0], [-.74, -.68, 0], [-.48, -.68, 0]], .034, '#aeb9b8'));
          created = group;
        } else if (definition.id === 'mains-cables' || definition.id === 'led-cables') {
          const group = new THREE.Group();
          if (definition.id === 'mains-cables') {
            ['#6d432a', '#2877ce', '#e7d22e'].forEach((color, index) =>
              group.add(lineTube(definition, [[-2.08, .1 + index * .015, 0], [-1.62, .1 + index * .015, 0], [-1.62, -1.08, 0], [-1.18, -1.08, 0]], .012, color)),
            );
          } else {
            const levels = [1.18, .64, .1, -.44, -.68];
            levels.forEach((level, index) => {
              const start = -1.14 + index * .1;
              group.add(lineTube(definition, [[start, -1.13, 0], [start, level, 0], [-.15 - (index === 4 ? .33 : 0), level, 0]], .01, '#d9453d'));
              group.add(lineTube(definition, [[start + .025, -1.13, .008], [start + .025, level - .025, .008], [-.15 - (index === 4 ? .33 : 0), level - .025, .008]], .01, '#171b1d'));
            });
          }
          created = group;
        } else if (definition.kind === 'effect') {
          created = makeParticles(definition, definition.id === 'spray-cloud' ? '#ed7656' : definition.id === 'mortar-splatter' ? '#a69d8e' : '#b8aa95', definition.id === 'chase-dust' ? 220 : 90);
        } else if (definition.id === 'wall-finish') {
          created = new THREE.Mesh(new THREE.PlaneGeometry(5.25, 3), standard('#ece9e1', definition));
        } else if (definition.id === 'cabinet-interior') {
          created = new THREE.Mesh(new THREE.PlaneGeometry(.68, .72), new THREE.MeshStandardMaterial({map: texture(definition.asset), roughness: .82}));
        } else if (definition.id === 'cabinet-shell') {
          const group = new THREE.Group();
          const oak = texture(definition.asset);
          group.add(box(definition, [.74, .08, .28], '#342921', oak));
          const top = box(definition, [.74, .08, .28], '#342921', oak); top.position.y = .72; group.add(top);
          const left = box(definition, [.08, .72, .28], '#342921', oak); left.position.x = -.33; left.position.y = .36; group.add(left);
          const right = box(definition, [.08, .72, .28], '#342921', oak); right.position.x = .33; right.position.y = .36; group.add(right);
          created = group;
        } else if (definition.id.startsWith('cabinet-door-')) {
          created = box(definition, [.34, .72, .045], '#342921', texture(definition.asset));
        } else if (/^shelf-\d$/.test(definition.id)) {
          created = box(definition, [1.16, .11, .34], '#342921', texture(definition.asset));
        } else if (definition.id === 'shelf-lower') {
          created = box(definition, [3.75, .14, .38], '#342921', texture(definition.asset));
        } else if (definition.id.startsWith('profile-')) {
          created = box(definition, [definition.id === 'profile-lower' ? 3.58 : 1.04, .025, .18], '#aeb9bd');
        } else if (definition.id.startsWith('led-')) {
          const material = new THREE.MeshStandardMaterial({color: '#fff0c5', emissive: '#ffcb6b', emissiveIntensity: .25, roughness: .25});
          created = new THREE.Mesh(new THREE.BoxGeometry(definition.id === 'led-lower' ? 3.5 : 1, .018, .04), material);
        } else if (definition.id === 'switch-back-box' || definition.id === 'cabinet-feed-box') {
          created = box(definition, [definition.id === 'switch-back-box' ? .28 : .24, definition.id === 'switch-back-box' ? .27 : .2, .07], '#333c40');
        } else if (definition.id === 'double-switch') {
          const group = new THREE.Group();
          group.add(box(definition, [.28, .3, .055], '#f4f3ee'));
          const gang1 = box(definition, [.1, .2, .035], '#fbfaf6'); gang1.position.set(-.065, 0, .045); group.add(gang1);
          const gang2 = box(definition, [.1, .2, .035], '#fbfaf6'); gang2.position.set(.065, 0, .045); group.add(gang2);
          created = group;
        } else if (definition.id === 'shelf-light' || definition.id === 'lower-light') {
          created = new THREE.RectAreaLight('#ffd48b', 0, definition.id === 'lower-light' ? 3.8 : 1.2, .4);
          created.rotation.x = Math.PI / 2;
        } else if (definition.id === 'setout') {
          const group = new THREE.Group();
          [-1.05, -.98, -.91, -.84].forEach((x, index) => {
            const mark = box(definition, [.018, 2.25 - index * .5, .012], '#ef6848');
            mark.position.set(x, .05 - index * .25, 0);
            group.add(mark);
          });
          created = group;
        }
        if (created) register(definition, created);
      });

      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();
      const onPointer = (event: PointerEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
        raycaster.setFromCamera(pointer, camera);
        const hit = raycaster.intersectObjects(scene.children, true).find(intersection => intersection.object.userData.sceneObjectId);
        if (hit?.object.userData.sceneObjectId) onSelectRef.current(String(hit.object.userData.sceneObjectId));
      };
      renderer.domElement.addEventListener('pointerdown', onPointer);

      const clock = new THREE.Clock();
      renderer.setAnimationLoop(() => {
        const elapsed = clock.getElapsedTime();
        const {stage, local} = progressRef.current;
        runtime.forEach(entry => {
          const {definition, object: object3d, materials} = entry;
          const exactWorkerStage = workerStage(definition.id);
          const inRange = workerIds.has(definition.id)
            ? stage === exactWorkerStage
            : stage >= definition.stageIn && stage <= definition.stageOut;
          const targetOpacity = inRange && definition.properties.enabled ? definition.properties.opacity : 0;
          materials.forEach(material => {
            if ('opacity' in material && typeof material.opacity === 'number') {
              material.transparent ||= targetOpacity < 1;
              material.opacity += (targetOpacity - material.opacity) * .12;
            }
          });
          object3d.visible = definition.properties.enabled && (inRange || materials.some(material => 'opacity' in material && Number(material.opacity) > .015));
          if (workerIds.has(definition.id)) {
            const direction = definition.animation === 'enter-left' ? -1 : 1;
            const presence = Math.sin(Math.min(1, local) * Math.PI);
            object3d.position.x = entry.baseX + direction * (1 - presence) * 2.4;
          }
          if (definition.kind === 'effect' && object3d.visible) {
            object3d.rotation.z = elapsed * .12;
            object3d.position.y += Math.sin(elapsed * 1.8) * .0008;
          }
          if (definition.id.startsWith('cabinet-door-') && stage >= 7) {
            object3d.rotation.y += ((definition.id.endsWith('left') ? -1.15 : 1.15) - object3d.rotation.y) * .08;
          }
          const isSelected = definition.id === selectedRef.current;
          object3d.scale.setScalar(definition.transform3d.scale * (isSelected ? 1 + Math.sin(elapsed * 4) * .018 : 1));
        });

        const shelfOutput = runtime.get('shelf-light')?.object;
        const lowerOutput = runtime.get('lower-light')?.object;
        if (shelfOutput && 'intensity' in shelfOutput) shelfOutput.intensity = stage === 12 && shelfLights ? 5.2 : 0;
        if (lowerOutput && 'intensity' in lowerOutput) lowerOutput.intensity = stage === 12 && lowerLight ? 6.2 : 0;
        ['led-1', 'led-2', 'led-3', 'led-4'].forEach(id => {
          runtime.get(id)?.materials.forEach(material => {
            if ('emissiveIntensity' in material) material.emissiveIntensity = stage === 12 && shelfLights ? 4 : .18;
          });
        });
        runtime.get('led-lower')?.materials.forEach(material => {
          if ('emissiveIntensity' in material) material.emissiveIntensity = stage === 12 && lowerLight ? 4.5 : .18;
        });
        renderer.render(scene, camera);
      });

      const resize = () => {
        if (!host.clientWidth || !host.clientHeight) return;
        camera.aspect = host.clientWidth / host.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(host.clientWidth, host.clientHeight);
      };
      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(host);

      cleanup = () => {
        resizeObserver.disconnect();
        renderer.domElement.removeEventListener('pointerdown', onPointer);
        renderer.setAnimationLoop(null);
        scene.traverse(child => {
          if (child instanceof THREE.Mesh || child instanceof THREE.Points) {
            child.geometry.dispose();
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            materials.forEach(material => material.dispose());
          }
        });
        textureCache.forEach(item => item.dispose());
        renderer.dispose();
        renderer.domElement.remove();
        runtime.clear();
      };
    }).catch(error => {
      setBackend('WEBGPU INITIALISATION FAILED');
      if (import.meta.env.DEV) console.error('Three.js WebGPU scene failed to initialise', error);
    });
    return () => {
      disposed = true;
      cleanup();
    };
  }, [objects]);

  useEffect(() => {
    progressRef.current.stage = activeStage;
    progressRef.current.local = .5;
  }, [activeStage]);

  const active = installationStages[activeStage];
  return <div className="ei-v3-engine ei-v3-engine--three" ref={journeyRef}>
    <div className="ei-v3-engine__frame">
      <header className="ei-v3-engine__topbar">
        <button type="button" onClick={onBack}>← Engines</button>
        <div><small>NK ELECTRICAL / ENGINE 02</small><strong>THREE.JS + WEBGPU</strong></div>
        <button type="button" onClick={onEdit}>Edit assets</button>
      </header>
      <div className="ei-v3-engine__layout">
        <nav className="ei-v3-stage-nav" aria-label="Installation stages">
          {installationStages.map((stage, index) => <button
            type="button"
            key={stage.id}
            className={activeStage === index ? 'is-active' : ''}
            aria-current={activeStage === index ? 'step' : undefined}
            onClick={() => {
              setActiveStage(index);
              progressRef.current = {stage: index, local: .5};
              if (motion !== 'reduced' && window.innerWidth > 1024 && journeyRef.current) {
                const top = journeyRef.current.getBoundingClientRect().top + window.scrollY;
                const travel = journeyRef.current.offsetHeight - window.innerHeight;
                window.scrollTo({top: top + travel * ((index + .5) / 13), behavior: 'smooth'});
              }
            }}
          ><span>{stage.number}</span><strong>{stage.short}</strong></button>)}
        </nav>
        <div className="ei-v3-three-stage">
          <div className="ei-v3-three-canvas" ref={canvasHostRef}/>
          <div className="ei-v3-three-hud">
            <span>{backend}</span><span>PHYSICAL LIGHTS / REAL SHADOW MAPS</span>
          </div>
          {activeStage === 12 && <div className="ei-v3-three-switches" role="group" aria-label="Lighting circuits">
            <button type="button" aria-pressed={shelfLights} onClick={() => setShelfLights(value => !value)}>01 / FOUR SHELVES</button>
            <button type="button" aria-pressed={lowerLight} onClick={() => setLowerLight(value => !value)}>02 / LOWER LED</button>
          </div>}
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
