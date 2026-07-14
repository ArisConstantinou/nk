import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import {Player, type PlayerRef} from '@remotion/player';
import {Activity, Gauge, Lightbulb, Palette, Power, SlidersHorizontal, SunDim} from 'lucide-react';
import {LedSensitivityFilm, type LedRgbEffect} from '../remotion/LedSensitivityFilm';
import {publicAsset} from '../utils/assets';

type Hsv = {h: number; s: number; v: number};

const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));

const hsvToHex = ({h, s, v}: Hsv) => {
  const saturation = s / 100;
  const value = v / 100;
  const chroma = value * saturation;
  const sector = h / 60;
  const second = chroma * (1 - Math.abs((sector % 2) - 1));
  const [red, green, blue] = sector < 1 ? [chroma, second, 0]
    : sector < 2 ? [second, chroma, 0]
      : sector < 3 ? [0, chroma, second]
        : sector < 4 ? [0, second, chroma]
          : sector < 5 ? [second, 0, chroma]
            : [chroma, 0, second];
  const match = value - chroma;
  return `#${[red, green, blue].map(channel => Math.round((channel + match) * 255).toString(16).padStart(2, '0')).join('')}`;
};

const hexToHsv = (hex: string): Hsv => {
  const value = hex.replace('#', '');
  const red = Number.parseInt(value.slice(0, 2), 16) / 255;
  const green = Number.parseInt(value.slice(2, 4), 16) / 255;
  const blue = Number.parseInt(value.slice(4, 6), 16) / 255;
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const delta = maximum - minimum;
  const hue = delta === 0 ? 0
    : maximum === red ? 60 * (((green - blue) / delta) % 6)
      : maximum === green ? 60 * (((blue - red) / delta) + 2)
        : 60 * (((red - green) / delta) + 4);
  return {
    h: (hue + 360) % 360,
    s: maximum === 0 ? 0 : (delta / maximum) * 100,
    v: maximum * 100,
  };
};

const scenes: Array<{
  id: string;
  label: string;
  detail: string;
  color: string;
  brightness: number;
  effect: LedRgbEffect;
}> = [
  {id: 'warm', label: 'Warm', detail: '2700K tone', color: '#ffb35c', brightness: 72, effect: 'static'},
  {id: 'cyan', label: 'Cyan', detail: 'Architectural', color: '#3be8ff', brightness: 90, effect: 'static'},
  {id: 'violet', label: 'Violet', detail: 'Slow breathe', color: '#8064ff', brightness: 82, effect: 'breathe'},
  {id: 'spectrum', label: 'Spectrum', detail: 'Full RGB cycle', color: '#ff3bd4', brightness: 92, effect: 'spectrum'},
];

const effectLabels: Record<LedRgbEffect, string> = {
  static: 'Static colour',
  breathe: 'Slow breathe',
  spectrum: 'Spectrum cycle',
};

export function LedSensitivityPanel() {
  const [color, setColor] = useState('#3be8ff');
  const [brightness, setBrightness] = useState(90);
  const [power, setPower] = useState(true);
  const [effect, setEffect] = useState<LedRgbEffect>('static');
  const [activeScene, setActiveScene] = useState('cyan');
  const playerRef = useRef<PlayerRef>(null);
  const selectedHsv = useMemo(() => hexToHsv(color), [color]);
  const thumbPosition = useMemo(() => {
    const radians = selectedHsv.h * Math.PI / 180;
    const radius = selectedHsv.s / 100 * 46;
    return {
      left: `${50 + Math.sin(radians) * radius}%`,
      top: `${50 - Math.cos(radians) * radius}%`,
    };
  }, [selectedHsv]);

  useEffect(() => {
    const playTimer = window.setTimeout(() => playerRef.current?.play(), 120);
    return () => window.clearTimeout(playTimer);
  }, [color, brightness, effect, power]);

  const updateFromWheel = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const deltaX = event.clientX - (rect.left + rect.width / 2);
    const deltaY = event.clientY - (rect.top + rect.height / 2);
    const hue = (Math.atan2(deltaX, -deltaY) * 180 / Math.PI + 360) % 360;
    const saturation = clamp(Math.hypot(deltaX, deltaY) / (rect.width / 2) * 100, 0, 100);
    setColor(hsvToHex({h: hue, s: saturation, v: 100}));
    setEffect('static');
    setActiveScene('custom');
    setPower(true);
  };

  const handleWheelPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    updateFromWheel(event);
  };

  const handleWheelKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const direction = event.key === 'ArrowLeft' || event.key === 'ArrowDown' ? -1
      : event.key === 'ArrowRight' || event.key === 'ArrowUp' ? 1 : 0;
    if (!direction) return;
    event.preventDefault();
    setColor(hsvToHex({h: (selectedHsv.h + direction * 5 + 360) % 360, s: selectedHsv.s, v: 100}));
    setEffect('static');
    setActiveScene('custom');
    setPower(true);
  };

  const selectScene = (scene: typeof scenes[number]) => {
    setColor(scene.color);
    setBrightness(scene.brightness);
    setEffect(scene.effect);
    setActiveScene(scene.id);
    setPower(true);
  };

  return <section
    className="led-lab"
    id="led-lab"
    aria-labelledby="led-lab-title"
    style={{'--rgb-color': color} as CSSProperties}
  >
    <div className="led-rgb-console">
      <div className="led-lab-heading">
        <div><span>LIVE / RGB LIGHTING CONTROL</span><i><Activity/> REMOTE LINKED</i></div>
        <h2 id="led-lab-title">Set the colour.<br/><em>See the room respond.</em></h2>
        <p>The remote and installed LED layers now work as one live control desk. Adjust colour, brightness or movement and see the complete room react beside it.</p>
      </div>

      <div className="rgb-remote-stage">
        <div className="rgb-remote-stage-label"><Palette/> NK RGB REMOTE <span>{power ? 'LINK ACTIVE' : 'OUTPUT OFF'}</span></div>
        <div className={`rgb-remote-shell${power ? '' : ' is-off'}`}>
          <img src={publicAsset('assets/generated/nk-rgb-remote-shell.webp')} alt="NK architectural RGB LED remote"/>
          <button
            className="rgb-remote-power"
            type="button"
            aria-label={power ? 'Turn RGB lighting off' : 'Turn RGB lighting on'}
            aria-pressed={power}
            onClick={() => setPower(current => !current)}
          ><Power/><span>{power ? 'ON' : 'OFF'}</span></button>
          <div
            className="rgb-color-wheel"
            role="slider"
            tabIndex={0}
            aria-label="RGB colour wheel"
            aria-valuemin={0}
            aria-valuemax={359}
            aria-valuenow={Math.round(selectedHsv.h)}
            aria-valuetext={`${color.toUpperCase()}, ${Math.round(selectedHsv.s)} percent saturation`}
            onPointerDown={handleWheelPointerDown}
            onPointerMove={event => { if (event.buttons === 1) updateFromWheel(event); }}
            onKeyDown={handleWheelKeyDown}
          >
            <span className="rgb-color-wheel-thumb" style={thumbPosition}/>
          </div>
          <div className="rgb-remote-scenes" role="group" aria-label="RGB scene presets">
            {scenes.map((scene, index) => <button
              type="button"
              className={activeScene === scene.id ? 'active' : ''}
              aria-pressed={activeScene === scene.id}
              onClick={() => selectScene(scene)}
              key={scene.id}
            >
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{scene.label}</strong>
              <small>{scene.detail}</small>
            </button>)}
          </div>
        </div>
      </div>

      <div className="led-lab-player">
        <Player
          ref={playerRef}
          component={LedSensitivityFilm}
          inputProps={{color, brightness, power, effect}}
          durationInFrames={360}
          compositionWidth={1600}
          compositionHeight={900}
          fps={30}
          loop
          autoPlay
          initiallyMuted
          controls={false}
          clickToPlay={false}
          acknowledgeRemotionLicense
          style={{width: '100%', height: '100%'}}
        />
        <div className="led-lab-fixtures" aria-label="RGB LED layers shown">
          <span><SunDim/> RGB cove</span>
          <span><Lightbulb/> Colour-tuned spots</span>
          <span><Gauge/> Wall-light fixtures</span>
        </div>
      </div>

      <div className="rgb-control-panel">
        <div className="rgb-control-intro">
          <span className="rgb-control-kicker"><SlidersHorizontal/> LIVE OUTPUT CONTROL</span>
          <p>Cove, recessed spots, ring and wall-light fixtures inherit the same live colour and output.</p>
        </div>

        <div className="rgb-live-readout">
          <label className="rgb-colour-readout">
            <input
              type="color"
              value={color}
              aria-label="Choose an exact RGB colour"
              onChange={event => {
                setColor(event.target.value);
                setEffect('static');
                setActiveScene('custom');
                setPower(true);
              }}
            />
            <span style={{background: color}}/>
            <small>Selected colour</small>
            <strong>{effect === 'spectrum' ? 'LIVE RGB' : color.toUpperCase()}</strong>
          </label>
          <div><small>Output</small><strong>{power ? `${brightness}%` : 'OFF'}</strong></div>
          <div><small>Scene</small><strong>{effectLabels[effect]}</strong></div>
        </div>

        <label className="rgb-brightness-control">
          <span><b>Brightness</b><output>{brightness}%</output></span>
          <input
            type="range"
            min="5"
            max="100"
            step="1"
            value={brightness}
            aria-label="RGB brightness"
            onChange={event => {
              setBrightness(Number(event.target.value));
              setPower(true);
            }}
          />
        </label>

        <div className="rgb-effect-controls" role="group" aria-label="RGB animation effect">
          {(['static', 'breathe', 'spectrum'] as LedRgbEffect[]).map(value => <button
            type="button"
            className={effect === value ? 'active' : ''}
            aria-pressed={effect === value}
            onClick={() => {
              setEffect(value);
              setActiveScene(value === 'spectrum' ? 'spectrum' : 'custom');
              setPower(true);
            }}
            key={value}
          >{effectLabels[value]}</button>)}
        </div>

        <p className="rgb-control-note">Use the remote wheel or presets, then fine-tune brightness and movement here. Every change is visible in the room above.</p>
      </div>
    </div>
  </section>;
}
