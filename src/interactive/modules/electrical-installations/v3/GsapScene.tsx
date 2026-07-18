import {
  createContext,
  useContext,
  useId,
  useRef,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import {AccessibleSvg} from '../../../components/AccessibleSvg';
import type {SceneObjectDefinition} from './sceneBlueprint';

type Props = {
  objects: readonly SceneObjectDefinition[];
  selectedId: string | null;
  activeStage: number;
  shelfLights: boolean;
  lowerLight: boolean;
  onSelect: (id: string) => void;
  onMoveObject?: (id: string, x: number, y: number) => void;
  onToggleShelfLights: () => void;
  onToggleLowerLight: () => void;
};

const SceneMoveContext = createContext<Props['onMoveObject']>(undefined);

const conduitRoutes = ['M100 800 V438'] as const;
const mainsRoute = conduitRoutes[0];

function ObjectLayer({
  object,
  selectedId,
  onSelect,
  children,
  className = '',
}: {
  object: SceneObjectDefinition;
  selectedId: string | null;
  onSelect: (id: string) => void;
  children: ReactNode;
  className?: string;
}) {
  if (!object.properties.enabled) return null;
  const t = object.transform2d;
  const hidden = object.properties.opacity <= 0;
  const onMoveObject = useContext(SceneMoveContext);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    objectX: number;
    objectY: number;
    nextX: number;
    nextY: number;
    moved: boolean;
  } | null>(null);
  const svgPoint = (event: ReactPointerEvent<SVGGElement>) => {
    const matrix = event.currentTarget.ownerSVGElement?.getScreenCTM();
    if (!matrix) return null;
    return new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
  };
  const click = (event: MouseEvent<SVGGElement>) => {
    event.stopPropagation();
    onSelect(object.id);
  };
  const pointerDown = (event: ReactPointerEvent<SVGGElement>) => {
    if (!onMoveObject || event.button !== 0) return;
    const point = svgPoint(event);
    if (!point) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: point.x,
      startY: point.y,
      objectX: t.x,
      objectY: t.y,
      nextX: t.x,
      nextY: t.y,
      moved: false,
    };
  };
  const pointerMove = (event: ReactPointerEvent<SVGGElement>) => {
    const drag = dragRef.current;
    if (!onMoveObject || !drag || drag.pointerId !== event.pointerId) return;
    const point = svgPoint(event);
    if (!point) return;
    drag.nextX = Math.round((drag.objectX + point.x - drag.startX) * 10) / 10;
    drag.nextY = Math.round((drag.objectY + point.y - drag.startY) * 10) / 10;
    drag.moved ||= Math.abs(point.x - drag.startX) + Math.abs(point.y - drag.startY) > .75;
    const transformLayer = event.currentTarget.querySelector<SVGGElement>('[data-object-transform]');
    transformLayer?.setAttribute('transform', `translate(${drag.nextX} ${drag.nextY}) rotate(${t.rotation}) scale(${t.scale})`);
    event.currentTarget.dataset.dragging = drag.moved ? 'true' : 'false';
  };
  const pointerEnd = (event: ReactPointerEvent<SVGGElement>) => {
    const drag = dragRef.current;
    if (!onMoveObject || !drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    delete event.currentTarget.dataset.dragging;
    if (drag.moved) onMoveObject(object.id, drag.nextX, drag.nextY);
  };
  const keyDown = (event: KeyboardEvent<SVGGElement>) => {
    if (!onMoveObject || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const step = event.shiftKey ? 10 : 1;
    const x = t.x + (event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0);
    const y = t.y + (event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0);
    onMoveObject(object.id, x, y);
  };
  return <g
    className={`ei-v3-object ${hidden ? 'is-stage-hidden' : ''} ${selectedId === object.id ? 'is-selected' : ''} ${className}`.trim()}
    data-object-id={object.id}
    data-stage-in={object.stageIn}
    data-stage-out={object.stageOut}
    data-animation={object.animation}
    opacity={object.properties.opacity}
    onClick={click}
    onPointerDown={pointerDown}
    onPointerMove={pointerMove}
    onPointerUp={pointerEnd}
    onPointerCancel={pointerEnd}
    onKeyDown={keyDown}
    role={hidden ? undefined : 'button'}
    tabIndex={hidden ? -1 : 0}
    aria-hidden={hidden || undefined}
    aria-keyshortcuts={onMoveObject ? 'ArrowLeft ArrowRight ArrowUp ArrowDown' : undefined}
    aria-label={`Select ${object.label}`}
    style={{touchAction: onMoveObject ? 'none' : undefined}}
  ><g data-object-transform transform={`translate(${t.x} ${t.y}) rotate(${t.rotation}) scale(${t.scale})`}>{children}</g></g>;
}

export function GsapScene(props: Props) {
  const rawId = useId().replace(/:/g, '');
  const id = `ei-v3-${rawId}`;
  const object = (objectId: string) => {
    const definition = props.objects.find(item => item.id === objectId)!;
    const visible = props.activeStage >= definition.stageIn && props.activeStage <= definition.stageOut;
    return visible ? definition : {...definition, properties: {...definition.properties, opacity: 0}};
  };
  const workers = props.objects.filter(item => item.id.startsWith('worker-'));
  const shelfObjects = props.objects.filter(item => /^shelf-\d$/.test(item.id));
  const profileObjects = props.objects.filter(item => /^profile-\d$/.test(item.id));
  const ledObjects = props.objects.filter(item => /^led-\d$/.test(item.id));
  const shelfY = [132, 272, 412, 552];

  return <SceneMoveContext.Provider value={props.onMoveObject}><AccessibleSvg
    className="ei-v3-scene"
    data-v3-gsap-scene
    data-active-stage={props.activeStage}
    viewBox="0 0 1600 900"
    preserveAspectRatio="xMidYMax meet"
    title="NK Electrical installation — GSAP version"
    description="A fully layered thirteen-stage electrical installation with selectable workers, channels, conduits, cables, joinery, controls and lighting."
    onClick={() => props.onSelect('room')}
  >
    <defs>
      <filter id={`${id}-soft`} x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="16"/></filter>
      <filter id={`${id}-dust`} x="-30%" y="-30%" width="160%" height="160%">
        <feTurbulence type="fractalNoise" baseFrequency=".025 .12" numOctaves="2" seed="31" result="noise"/>
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="4"/>
      </filter>
      <pattern id={`${id}-oak`} width="360" height="260" patternUnits="userSpaceOnUse">
        <image href={object('cabinet-shell').asset} width="360" height="260" preserveAspectRatio="xMidYMid slice"/>
      </pattern>
      <linearGradient id={`${id}-paint`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f2f0e9"/><stop offset=".7" stopColor="#e9e5dc"/><stop offset="1" stopColor="#ddd8ce"/>
      </linearGradient>
      <linearGradient id={`${id}-aluminium`} x1="0" y1="0" x2="0" y2="1">
        <stop stopColor="#f4f7f7"/><stop offset=".45" stopColor="#8d999d"/><stop offset="1" stopColor="#dce1e1"/>
      </linearGradient>
    </defs>

    <ObjectLayer object={object('room')} selectedId={props.selectedId} onSelect={props.onSelect}>
      <image href={object('room').asset} width={object('room').transform2d.width} height={object('room').transform2d.height} preserveAspectRatio="xMidYMid slice"/>
    </ObjectLayer>

    <ObjectLayer object={object('setout')} selectedId={props.selectedId} onSelect={props.onSelect} className="ei-v3-setout">
      <path d={mainsRoute} data-draw-path/>
      <rect x="49" y="338" width="102" height="104" rx="2"/>
    </ObjectLayer>

    <ObjectLayer object={object('spray-cloud')} selectedId={props.selectedId} onSelect={props.onSelect} className="ei-v3-spray-cloud">
      {Array.from({length: 22}, (_, index) => <circle
        key={index}
        data-particle
        cx={86 + (index % 6) * 8}
        cy={380 + Math.floor(index / 6) * 10}
        r={3 + index % 4}
      />)}
    </ObjectLayer>

    <ObjectLayer object={object('wall-chases')} selectedId={props.selectedId} onSelect={props.onSelect} className="ei-v3-chases">
      <image
        href={object('wall-chases').asset}
        width={object('wall-chases').transform2d.width}
        height={object('wall-chases').transform2d.height}
        preserveAspectRatio="xMidYMax meet"
      />
    </ObjectLayer>

    <ObjectLayer object={object('chase-dust')} selectedId={props.selectedId} onSelect={props.onSelect} className="ei-v3-dust">
      {Array.from({length: 34}, (_, index) => <circle key={index} data-particle cx={68 + (index % 9) * 8} cy={420 + Math.floor(index / 9) * 13} r={2 + index % 5}/>)}
      {Array.from({length: 12}, (_, index) => <rect key={index} data-particle x={72 + index * 5} y={790 + (index % 3) * 7} width={4 + index % 5} height={3 + index % 4}/>)}
    </ObjectLayer>

    <ObjectLayer object={object('switch-back-box')} selectedId={props.selectedId} onSelect={props.onSelect} className="ei-v3-back-box">
      <rect width="92" height="82" rx="4"/>
      <rect x="8" y="8" width="76" height="66" rx="2"/>
      <path d="M46 8V74"/>
    </ObjectLayer>
    <ObjectLayer object={object('mortar-splatter')} selectedId={props.selectedId} onSelect={props.onSelect} className="ei-v3-mortar">
      {Array.from({length: 20}, (_, index) => <circle key={index} data-particle cx={66 + (index % 8) * 11} cy={370 + Math.floor(index / 8) * 18} r={3 + index % 5}/>)}
    </ObjectLayer>

    <ObjectLayer object={object('conduits')} selectedId={props.selectedId} onSelect={props.onSelect} className="ei-v3-conduits">
      {conduitRoutes.map(route => <g key={route}>
        <path d={route} className="ei-v3-conduit__shadow" data-draw-path/>
        <path d={route} className="ei-v3-conduit" data-draw-path/>
        <path d={route} className="ei-v3-conduit__ribs" data-draw-path/>
      </g>)}
      <circle className="ei-v3-conduit-mouth" cx="100" cy="438" r="6"/>
      <circle className="ei-v3-conduit-hole" cx="100" cy="438" r="3"/>
    </ObjectLayer>

    <ObjectLayer object={object('mains-cables')} selectedId={props.selectedId} onSelect={props.onSelect} className="ei-v3-cables">
      <path d={mainsRoute} className="ei-v3-cable ei-v3-cable--brown" transform="translate(-5 0)" data-draw-path/>
      <path d={mainsRoute} className="ei-v3-cable ei-v3-cable--blue" data-draw-path/>
      <path d={mainsRoute} className="ei-v3-cable ei-v3-cable--earth" transform="translate(5 0)" data-draw-path/>
    </ObjectLayer>
    <ObjectLayer object={object('led-cables')} selectedId={props.selectedId} onSelect={props.onSelect} className="ei-v3-cables">
      {conduitRoutes.map(route => <g key={route}>
        <path d={route} className="ei-v3-cable ei-v3-cable--red" transform="translate(-3 -3)" data-draw-path/>
        <path d={route} className="ei-v3-cable ei-v3-cable--black" transform="translate(3 3)" data-draw-path/>
      </g>)}
    </ObjectLayer>

    <ObjectLayer object={object('wall-finish')} selectedId={props.selectedId} onSelect={props.onSelect} className="ei-v3-wall-finish">
      <rect width={object('wall-finish').transform2d.width} height={object('wall-finish').transform2d.height} fill={`url(#${id}-paint)`}/>
    </ObjectLayer>

    <ObjectLayer object={object('cabinet-interior')} selectedId={props.selectedId} onSelect={props.onSelect}>
      <image href={object('cabinet-interior').asset} width={164} height={184} preserveAspectRatio="xMidYMid slice"/>
    </ObjectLayer>
    <ObjectLayer object={object('cabinet-shell')} selectedId={props.selectedId} onSelect={props.onSelect} className="ei-v3-cabinet-shell">
      <rect width={190} height={214} rx="4" fill={`url(#${id}-oak)`}/><rect x="9" y="9" width="172" height="196" rx="2"/>
    </ObjectLayer>
    <ObjectLayer object={object('cabinet-door-left')} selectedId={props.selectedId} onSelect={props.onSelect} className="ei-v3-cabinet-door">
      <rect width={87} height={198} rx="3" fill={`url(#${id}-oak)`}/><circle cx="76" cy="99" r="4"/>
    </ObjectLayer>
    <ObjectLayer object={object('cabinet-door-right')} selectedId={props.selectedId} onSelect={props.onSelect} className="ei-v3-cabinet-door">
      <rect width={87} height={198} rx="3" fill={`url(#${id}-oak)`}/><circle cx="11" cy="99" r="4"/>
    </ObjectLayer>

    {shelfObjects.map((item, index) => <ObjectLayer object={item} selectedId={props.selectedId} onSelect={props.onSelect} className="ei-v3-shelf" key={item.id}>
      <rect width={item.transform2d.width} height={item.transform2d.height} rx="3" fill={`url(#${id}-oak)`}/><path d={`M18 ${item.transform2d.height - 3}H${item.transform2d.width - 18}`}/>
    </ObjectLayer>)}
    <ObjectLayer object={object('shelf-lower')} selectedId={props.selectedId} onSelect={props.onSelect} className="ei-v3-shelf">
      <rect width={object('shelf-lower').transform2d.width} height={40} rx="3" fill={`url(#${id}-oak)`}/>
    </ObjectLayer>

    {profileObjects.map(item => <ObjectLayer object={item} selectedId={props.selectedId} onSelect={props.onSelect} className="ei-v3-profile" key={item.id}>
      <rect width={item.transform2d.width} height={10} rx="3" fill={`url(#${id}-aluminium)`}/>
    </ObjectLayer>)}
    <ObjectLayer object={object('profile-lower')} selectedId={props.selectedId} onSelect={props.onSelect} className="ei-v3-profile">
      <rect width={object('profile-lower').transform2d.width} height={11} rx="3" fill={`url(#${id}-aluminium)`}/>
    </ObjectLayer>

    {ledObjects.map(item => <ObjectLayer object={item} selectedId={props.selectedId} onSelect={props.onSelect} className="ei-v3-led" key={item.id}>
      <path d={`M0 0H${item.transform2d.width}`}/>
    </ObjectLayer>)}
    <ObjectLayer object={object('led-lower')} selectedId={props.selectedId} onSelect={props.onSelect} className="ei-v3-led">
      <path d={`M0 0H${object('led-lower').transform2d.width}`}/>
    </ObjectLayer>

    <ObjectLayer object={object('double-switch')} selectedId={props.selectedId} onSelect={props.onSelect} className="ei-v3-switch">
      <rect width={92} height={86} rx="7"/><rect x="10" y="12" width="34" height="62" rx="4"/><rect x="48" y="12" width="34" height="62" rx="4"/>
    </ObjectLayer>

    <ObjectLayer object={object('shelf-light')} selectedId={props.selectedId} onSelect={props.onSelect} className={`ei-v3-glow ${props.activeStage === 12 && props.shelfLights ? 'is-lit' : ''}`}>
      {shelfY.map((y, index) => <path d={`M205 ${y + 36}H502L478 ${y + 116}H226Z`} key={index} filter={`url(#${id}-soft)`}/>)}
    </ObjectLayer>
    <ObjectLayer object={object('lower-light')} selectedId={props.selectedId} onSelect={props.onSelect} className={`ei-v3-glow ${props.activeStage === 12 && props.lowerLight ? 'is-lit' : ''}`}>
      <path d="M398 654H1518L1465 820H435Z" filter={`url(#${id}-soft)`}/>
    </ObjectLayer>

    {workers.map(item => <ObjectLayer object={object(item.id)} selectedId={props.selectedId} onSelect={props.onSelect} className="ei-v3-worker" key={item.id}>
      <ellipse className="ei-v3-worker-shadow" cx={item.transform2d.width * .5} cy={item.transform2d.height - 4} rx={item.transform2d.width * .28} ry="13"/>
      <image href={item.asset} width={item.transform2d.width} height={item.transform2d.height} preserveAspectRatio="xMidYMid meet"/>
    </ObjectLayer>)}

    <foreignObject
      x="49"
      y="344"
      width="101"
      height="96"
      className={`ei-v3-live-switches ${props.activeStage === 12 ? 'is-active' : ''}`}
      aria-hidden={props.activeStage !== 12 || undefined}
    >
      <div>
        <button type="button" aria-label="Toggle the four shelf LEDs" aria-pressed={props.shelfLights} disabled={props.activeStage !== 12} tabIndex={props.activeStage === 12 ? 0 : -1} onClick={props.onToggleShelfLights}>1</button>
        <button type="button" aria-label="Toggle the lower LED" aria-pressed={props.lowerLight} disabled={props.activeStage !== 12} tabIndex={props.activeStage === 12 ? 0 : -1} onClick={props.onToggleLowerLight}>2</button>
      </div>
    </foreignObject>
  </AccessibleSvg></SceneMoveContext.Provider>;
}
