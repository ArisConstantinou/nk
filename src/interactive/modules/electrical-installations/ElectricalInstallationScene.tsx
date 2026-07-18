import {useId, type CSSProperties} from 'react';
import {AccessibleSvg} from '../../components/AccessibleSvg';
import {publicAsset} from '../../../utils/assets';

export type InstallationLights = Readonly<{
  shelves: boolean;
  lower: boolean;
}>;

type SceneProps = Readonly<{
  scene: 'desktop' | 'mobile';
  stage?: number;
  lights: InstallationLights;
  onToggleLights: (circuit: keyof InstallationLights) => void;
}>;

const assets = {
  wall: publicAsset('assets/generated/electrical-installation-blueprint/scene-base-wall.webp'),
  wood: publicAsset('assets/generated/electrical-installation-blueprint/dark-oak-texture.webp'),
  cabinet: publicAsset('assets/generated/electrical-installation-blueprint/cabinet-interior.webp'),
  marking: publicAsset('assets/generated/electrical-installation-blueprint/electrician-marking.webp'),
  chasing: publicAsset('assets/generated/electrical-installation-blueprint/builder-chasing.webp'),
  boxes: publicAsset('assets/generated/electrical-installation-blueprint/electrician-boxes.webp'),
  conduit: publicAsset('assets/generated/electrical-installation-blueprint/electrician-conduit.webp'),
  cables: publicAsset('assets/generated/electrical-installation-blueprint/electrician-cables.webp'),
  switch: publicAsset('assets/generated/electrical-installation-blueprint/electrician-switch.webp'),
} as const;

const shelfRoutes = [
  'M270 706 V186 Q270 151 305 151 H494',
  'M288 706 V316 Q288 291 313 291 H494',
  'M306 706 V456 Q306 431 331 431 H494',
  'M324 706 V596 Q324 571 349 571 H494',
] as const;

const lowerRoute = 'M342 706 V661 Q342 626 377 626 H392';
const mainsRoute = 'M102 390 H151 Q180 390 180 419 V676 Q180 706 210 706 H266';
const allRoutes = [...shelfRoutes, lowerRoute, mainsRoute];

const mobileStyle = (
  scene: SceneProps['scene'],
  stage: number | undefined,
  from: number,
  to = 12,
): CSSProperties | undefined => {
  if (scene !== 'mobile') return undefined;
  const visible = (stage ?? 0) >= from && (stage ?? 0) <= to;
  return {opacity: visible ? 1 : 0, visibility: visible ? 'visible' : 'hidden'};
};

function SetOutLayer({scene, stage}: Pick<SceneProps, 'scene' | 'stage'>) {
  return <g className="ei-layer ei-setout" data-layer="setout" style={mobileStyle(scene, stage, 1, 1)}>
    <g className="ei-setout__routes">
      {allRoutes.map((route, index) => <path key={route} d={route} data-draw-path data-route={index}/>)}
    </g>
    <g className="ei-setout__geometry">
      {[132, 272, 412, 552].map(y => <path key={y} d={`M180 ${y} H514`} data-draw-path/>)}
      <path d="M199 638 V838 H370 V638" data-draw-path/>
      <path d="M370 608 H1538" data-draw-path/>
      <rect x="55" y="350" width="86" height="82" rx="5"/>
    </g>
  </g>;
}

function ChasesLayer({scene, stage, roughFilter}: Pick<SceneProps, 'scene' | 'stage'> & {roughFilter: string}) {
  return <g
    className="ei-layer ei-chases"
    data-layer="chases"
    style={{...mobileStyle(scene, stage, 2, 5), filter: `url(#${roughFilter})`}}
  >
    {allRoutes.map((route, index) =>
      <path className="ei-chase-cut" d={route} data-draw-path data-route={index} key={route}/>,
    )}
    <g className="ei-chase-dust" aria-hidden="true">
      <circle cx="270" cy="186" r="5"/><circle cx="288" cy="316" r="4"/>
      <circle cx="306" cy="456" r="6"/><circle cx="324" cy="596" r="4"/>
      <circle cx="377" cy="626" r="5"/><circle cx="270" cy="706" r="6"/>
    </g>
  </g>;
}

function BoxesLayer({scene, stage}: Pick<SceneProps, 'scene' | 'stage'>) {
  return <g className="ei-layer ei-boxes" data-layer="boxes" style={mobileStyle(scene, stage, 3, 5)}>
    <g className="ei-backbox ei-backbox--switch" data-pop-item>
      <rect x="54" y="349" width="90" height="84" rx="5"/>
      <rect x="62" y="357" width="74" height="68" rx="3"/>
      <circle cx="70" cy="391" r="4"/><circle cx="128" cy="391" r="4"/>
      <path d="M99 357 V425"/>
    </g>
    <g className="ei-backbox ei-backbox--cabinet-feed" data-pop-item>
      <rect x="234" y="676" width="70" height="58" rx="4"/>
      <rect x="242" y="684" width="54" height="42" rx="2"/>
      <circle cx="250" cy="705" r="4"/><circle cx="288" cy="705" r="4"/>
    </g>
    <g className="ei-no-shelf-boxes" aria-hidden="true">
      {[[494,151],[494,291],[494,431],[494,571],[392,626]].map(([cx, cy]) =>
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="8"/>,
      )}
    </g>
  </g>;
}

function ConduitLayer({scene, stage}: Pick<SceneProps, 'scene' | 'stage'>) {
  return <g className="ei-layer ei-conduits" data-layer="conduits" style={mobileStyle(scene, stage, 4, 5)}>
    {shelfRoutes.map((route, index) =>
      <path className="ei-conduit ei-conduit--selv" d={route} key={route} data-draw-path data-route={index}/>,
    )}
    <path className="ei-conduit ei-conduit--selv" d={lowerRoute} data-draw-path/>
    <path className="ei-conduit ei-conduit--mains" d={mainsRoute} data-draw-path/>
    <g className="ei-conduit-terminations" aria-hidden="true">
      {[[494,151],[494,291],[494,431],[494,571],[392,626]].map(([cx, cy]) =>
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="9"/>,
      )}
    </g>
    <g className="ei-pull-outlet" aria-hidden="true">
      <circle cx="494" cy="431" r="12"/>
      <circle cx="494" cy="431" r="7"/>
    </g>
  </g>;
}

function CableLayer({scene, stage, earthPattern}: Pick<SceneProps, 'scene' | 'stage'> & {earthPattern: string}) {
  return <g className="ei-layer ei-cables" data-layer="cables" style={mobileStyle(scene, stage, 5, 5)}>
    {shelfRoutes.map((route, index) => <g key={route}>
      <path className="ei-cable ei-cable--24v-positive" d={route} data-draw-path data-route={index}/>
      <path className="ei-cable ei-cable--24v-negative" d={route} transform="translate(0 7)" data-draw-path/>
    </g>)}
    <path className="ei-cable ei-cable--24v-positive" d={lowerRoute} data-draw-path/>
    <path className="ei-cable ei-cable--24v-negative" d={lowerRoute} transform="translate(0 7)" data-draw-path/>
    <path className="ei-cable ei-cable--line" d={mainsRoute} transform="translate(-6 0)" data-draw-path/>
    <path className="ei-cable ei-cable--neutral" d={mainsRoute} data-draw-path/>
    <path className="ei-cable ei-cable--earth" d={mainsRoute} transform="translate(6 0)" stroke={`url(#${earthPattern})`} data-draw-path/>
    <g className="ei-cable-key" aria-hidden="true">
      <rect x="1190" y="46" width="336" height="70" rx="9"/>
      <circle cx="1218" cy="71" r="6" className="ei-key-line"/><text x="1233" y="76">230V L / N / PE</text>
      <circle cx="1382" cy="71" r="6" className="ei-key-selv"/><text x="1397" y="76">24V SELV</text>
      <text x="1212" y="100">MAINS AND LOW VOLTAGE KEPT SEPARATE</text>
    </g>
  </g>;
}

function FinishLayer({scene, stage, paint}: Pick<SceneProps, 'scene' | 'stage'> & {paint: string}) {
  return <g className="ei-layer ei-finish" data-layer="finish" style={mobileStyle(scene, stage, 6)}>
    <rect x="151" width="1449" height="832" fill={`url(#${paint})`}/>
    <path d="M151 831 H1600" className="ei-finish__floor-line"/>
    <path d="M151 0 V832" className="ei-finish__corner-line"/>
  </g>;
}

function CabinetLayer({scene, stage, woodPattern}: Pick<SceneProps, 'scene' | 'stage'> & {woodPattern: string}) {
  return <g className="ei-layer ei-cabinet" data-layer="cabinet" style={mobileStyle(scene, stage, 7)}>
    <rect className="ei-cabinet__shadow" x="190" y="634" width="188" height="210" rx="3"/>
    <image href={assets.cabinet} x="201" y="648" width="166" height="182" preserveAspectRatio="xMidYMid slice"/>
    <rect className="ei-cabinet__frame" x="191" y="635" width="186" height="208" rx="3" fill={`url(#${woodPattern})`}/>
    <g className="ei-cabinet__door ei-cabinet__door--left" data-cabinet-door="left">
      <rect x="197" y="641" width="87" height="196" rx="2" fill={`url(#${woodPattern})`}/>
      <path d="M207 651 H274 V827 H207 Z"/><circle cx="270" cy="739" r="4"/>
    </g>
    <g className="ei-cabinet__door ei-cabinet__door--right" data-cabinet-door="right">
      <rect x="284" y="641" width="87" height="196" rx="2" fill={`url(#${woodPattern})`}/>
      <path d="M294 651 H361 V827 H294 Z"/><circle cx="298" cy="739" r="4"/>
    </g>
  </g>;
}

function ShelvesLayer({scene, stage, woodPattern}: Pick<SceneProps, 'scene' | 'stage'> & {woodPattern: string}) {
  return <g className="ei-layer ei-shelves" data-layer="shelves" style={mobileStyle(scene, stage, 8)}>
    <rect className="ei-wood-piece ei-wood-spine" x="179" y="82" width="24" height="548" rx="2" fill={`url(#${woodPattern})`} data-build-item/>
    {[132, 272, 412, 552].map((y, index) =>
      <g className="ei-shelf" key={y} data-build-item data-shelf={index + 1}>
        <rect x="180" y={y} width="337" height="29" rx="2" fill={`url(#${woodPattern})`}/>
        <path d={`M202 ${y + 27} H500`}/>
      </g>,
    )}
    <g className="ei-shelf ei-shelf--lower" data-build-item>
      <rect x="370" y="606" width="1168" height="40" rx="2" fill={`url(#${woodPattern})`}/>
      <path d="M395 642 H1516"/>
    </g>
  </g>;
}

function ProfilesLayer({scene, stage}: Pick<SceneProps, 'scene' | 'stage'>) {
  return <g className="ei-layer ei-profiles" data-layer="profiles" style={mobileStyle(scene, stage, 9)}>
    {[158, 298, 438, 578].map((y, index) =>
      <g className="ei-profile" key={y} data-profile={index + 1} data-build-item>
        <rect x="205" y={y} width="295" height="10" rx="3"/>
        <path d={`M211 ${y + 3} H494`}/>
      </g>,
    )}
    <g className="ei-profile ei-profile--lower" data-build-item>
      <rect x="398" y="642" width="1118" height="11" rx="3"/>
      <path d="M407 645 H1507"/>
    </g>
  </g>;
}

function LedLayer({scene, stage}: Pick<SceneProps, 'scene' | 'stage'>) {
  return <g className="ei-layer ei-led-strips" data-layer="led-strips" style={mobileStyle(scene, stage, 10)}>
    {[163, 303, 443, 583].map((y, index) =>
      <g className="ei-led-strip" key={y} data-strip={index + 1} data-build-item>
        <path d={`M211 ${y} H494`}/>
        {Array.from({length: 14}, (_, diode) => <circle key={diode} cx={220 + diode * 20} cy={y} r="2.1"/>)}
      </g>,
    )}
    <g className="ei-led-strip ei-led-strip--lower" data-build-item>
      <path d="M407 648 H1507"/>
      {Array.from({length: 36}, (_, diode) => <circle key={diode} cx={420 + diode * 30} cy="648" r="2.1"/>)}
    </g>
  </g>;
}

function StaticSwitchLayer({scene, stage}: Pick<SceneProps, 'scene' | 'stage'>) {
  return <g className="ei-layer ei-switch" data-layer="switch" style={mobileStyle(scene, stage, 11)}>
    <rect x="53" y="348" width="92" height="86" rx="7" data-build-item/>
    <rect x="63" y="360" width="34" height="62" rx="4" data-build-item/>
    <rect x="101" y="360" width="34" height="62" rx="4" data-build-item/>
    <path d="M68 391 H92 M106 391 H130"/>
    <circle cx="59" cy="391" r="2.5"/><circle cx="139" cy="391" r="2.5"/>
  </g>;
}

function PowerLayer({scene, stage, glowFilter, lights}: Pick<SceneProps, 'scene' | 'stage' | 'lights'> & {glowFilter: string}) {
  return <g className="ei-layer ei-power" data-layer="power" style={mobileStyle(scene, stage, 12)}>
    <g className={`ei-glow-bank ${lights.shelves ? 'is-lit' : ''}`} data-light-circuit="shelves" filter={`url(#${glowFilter})`}>
      {[168, 308, 448, 588].map(y => <path key={y} d={`M205 ${y} H502 L478 ${y + 84} H226 Z`} data-glow/>)}
    </g>
    <g className={`ei-glow-bank ${lights.lower ? 'is-lit' : ''}`} data-light-circuit="lower" filter={`url(#${glowFilter})`}>
      <path d="M398 653 H1518 L1465 816 H435 Z" data-glow/>
    </g>
    <g className="ei-live-indicator" aria-hidden="true">
      <circle cx="267" cy="662" r="5"/><path d="M267 662 H285"/>
    </g>
  </g>;
}

function WorkerLayer({scene, stage}: Pick<SceneProps, 'scene' | 'stage'>) {
  const workers = [
    {name: 'marking', asset: assets.marking, x: 430, y: 228, width: 309, height: 650, stage: 1},
    {name: 'chasing', asset: assets.chasing, x: 400, y: 228, width: 415, height: 650, stage: 2},
    {name: 'boxes', asset: assets.boxes, x: 78, y: 448, width: 410, height: 430, stage: 3},
    {name: 'conduit', asset: assets.conduit, x: 260, y: 428, width: 452, height: 450, stage: 4},
    {name: 'cables', asset: assets.cables, x: 486, y: 294, width: 472, height: 584, stage: 5},
    {name: 'switch', asset: assets.switch, x: 68, y: 358, width: 377, height: 520, stage: 11},
  ] as const;
  return <g className="ei-workers" data-layer="workers">
    {workers.map(worker =>
      <image
        className="ei-worker"
        data-worker={worker.name}
        href={worker.asset}
        x={worker.x}
        y={worker.y}
        width={worker.width}
        height={worker.height}
        preserveAspectRatio="xMidYMid meet"
        data-floor-baseline="878"
        key={worker.name}
        style={mobileStyle(scene, stage, worker.stage, worker.stage)}
      />,
    )}
  </g>;
}

function SwitchControls({scene, stage, lights, onToggleLights}: SceneProps) {
  const disabled = scene === 'mobile' && stage !== 12;
  return <foreignObject x="49" y="344" width="100" height="94" className="ei-switch-controls" data-interactive-switches>
    <div className="ei-switch-controls__plate">
      <button
        type="button"
        aria-label="Toggle all four shelf LED strips"
        aria-pressed={lights.shelves}
        disabled={disabled}
        onClick={() => onToggleLights('shelves')}
      ><span>1</span><i/></button>
      <button
        type="button"
        aria-label="Toggle the LED under the long lower shelf"
        aria-pressed={lights.lower}
        disabled={disabled}
        onClick={() => onToggleLights('lower')}
      ><span>2</span><i/></button>
    </div>
  </foreignObject>;
}

export function ElectricalInstallationScene(props: SceneProps) {
  const {scene, stage, lights} = props;
  const rawId = useId().replace(/:/g, '');
  const id = `electrical-blueprint-${rawId}`;
  const ids = {
    paint: `${id}-paint`,
    wood: `${id}-wood`,
    earth: `${id}-earth`,
    glow: `${id}-glow`,
    chaseRough: `${id}-chase-rough`,
  };

  return <AccessibleSvg
    className="ei-scene"
    data-scene={scene}
    data-stage={stage}
    viewBox="0 0 1600 900"
    title="NK Electrical concealed LED installation sequence"
    description="A thirteen-stage, blueprint-based installation showing set-out, wall chasing, back boxes, separate mains and 24-volt containment, wall finishing, cabinetry, LED profiles, a double switch and two interactive lighting circuits."
  >
    <defs>
      <linearGradient id={ids.paint} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f4f2ec" stopOpacity=".95"/>
        <stop offset=".65" stopColor="#eeeae2" stopOpacity=".96"/>
        <stop offset="1" stopColor="#e3dfd7" stopOpacity=".98"/>
      </linearGradient>
      <pattern id={ids.wood} width="310" height="310" patternUnits="userSpaceOnUse">
        <image href={assets.wood} width="310" height="310" preserveAspectRatio="xMidYMid slice"/>
      </pattern>
      <pattern id={ids.earth} width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="7" height="14" fill="#2e9b50"/><rect x="7" width="7" height="14" fill="#f1d534"/>
      </pattern>
      <filter id={ids.glow} x="-30%" y="-30%" width="160%" height="180%">
        <feGaussianBlur stdDeviation="14"/>
      </filter>
      <filter id={`${id}-shadow`} x="-30%" y="-30%" width="160%" height="180%">
        <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#141718" floodOpacity=".32"/>
      </filter>
      <filter id={ids.chaseRough} x="-8%" y="-8%" width="116%" height="116%">
        <feTurbulence type="fractalNoise" baseFrequency=".012 .08" numOctaves="2" seed="17" result="roughness"/>
        <feDisplacementMap in="SourceGraphic" in2="roughness" scale="4.2" xChannelSelector="R" yChannelSelector="G" result="roughCut"/>
        <feDropShadow in="roughCut" dx="2" dy="3" stdDeviation="2.2" floodColor="#2d241e" floodOpacity=".68"/>
      </filter>
    </defs>

    <image className="ei-room" href={assets.wall} width="1600" height="900" preserveAspectRatio="xMidYMid slice"/>
    <SetOutLayer scene={scene} stage={stage}/>
    <ChasesLayer scene={scene} stage={stage} roughFilter={ids.chaseRough}/>
    <BoxesLayer scene={scene} stage={stage}/>
    <ConduitLayer scene={scene} stage={stage}/>
    <CableLayer scene={scene} stage={stage} earthPattern={ids.earth}/>
    <FinishLayer scene={scene} stage={stage} paint={ids.paint}/>
    <CabinetLayer scene={scene} stage={stage} woodPattern={ids.wood}/>
    <ShelvesLayer scene={scene} stage={stage} woodPattern={ids.wood}/>
    <ProfilesLayer scene={scene} stage={stage}/>
    <LedLayer scene={scene} stage={stage}/>
    <StaticSwitchLayer scene={scene} stage={stage}/>
    <PowerLayer scene={scene} stage={stage} glowFilter={ids.glow} lights={lights}/>
    <WorkerLayer scene={scene} stage={stage}/>
    <SwitchControls {...props}/>
  </AccessibleSvg>;
}
