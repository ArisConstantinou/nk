import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export type LedRgbEffect = 'static' | 'breathe' | 'spectrum';

export type LedSensitivityFilmProps = {
  color: string;
  brightness: number;
  power: boolean;
  effect: LedRgbEffect;
};

type Rgb = {r: number; g: number; b: number};

const hexToRgb = (hex: string): Rgb => {
  const value = hex.replace('#', '');
  const normalized = value.length === 3 ? value.split('').map(character => `${character}${character}`).join('') : value;
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16) || 0,
    g: Number.parseInt(normalized.slice(2, 4), 16) || 0,
    b: Number.parseInt(normalized.slice(4, 6), 16) || 0,
  };
};

const hslToRgb = (hue: number, saturation: number, lightness: number): Rgb => {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const sector = hue / 60;
  const second = chroma * (1 - Math.abs((sector % 2) - 1));
  const [red, green, blue] = sector < 1 ? [chroma, second, 0]
    : sector < 2 ? [second, chroma, 0]
      : sector < 3 ? [0, chroma, second]
        : sector < 4 ? [0, second, chroma]
          : sector < 5 ? [second, 0, chroma]
            : [chroma, 0, second];
  const match = lightness - chroma / 2;
  return {
    r: Math.round((red + match) * 255),
    g: Math.round((green + match) * 255),
    b: Math.round((blue + match) * 255),
  };
};

const rgb = ({r, g, b}: Rgb) => `rgb(${r}, ${g}, ${b})`;
const rgba = ({r, g, b}: Rgb, alpha: number) => `rgba(${r}, ${g}, ${b}, ${alpha})`;

const spots = [
  {left: 24.915, top: 9.989, width: 19, height: 6},
  {left: 29.892, top: 18.827, width: 15, height: 4},
  {left: 33.016, top: 24.758, width: 12, height: 4},
  {left: 34.366, top: 27.287, width: 10, height: 4},
  {left: 35.468, top: 29.429, width: 8, height: 3},
  {left: 84.392, top: 9.451, width: 19, height: 6},
  {left: 78.434, top: 18.482, width: 15, height: 4},
  {left: 74.383, top: 24.489, width: 12, height: 4},
  {left: 72.869, top: 27.083, width: 11, height: 3},
];

// Measured directly on the six vertical wall luminaires in the source image.
// These are narrow fixture glows, not artificial projected cones.
const wallFixtures = [
  {left: 37.565, top: 36.5, bottom: 64.5, width: 2.4, softEnds: true},
  {left: 69.588, top: 45.9, bottom: 70.5, width: 2.1},
  {left: 72.19, top: 42.5, bottom: 71.7, width: 2.35},
  {left: 75.37, top: 39.5, bottom: 73.0, width: 2.6},
  // The console and foreground chair occlude the lower end of this fixture.
  {left: 79.094, top: 36.1, bottom: 65.0, width: 3.0},
  // This fixture is visible above the artwork, then disappears behind it.
  {left: 83.75, top: 31.9, bottom: 45.0, width: 3.5},
  {left: 89.199, top: 27.0, bottom: 80.0, width: 4.1},
  {left: 96.223, top: 21.0, bottom: 82.0, width: 4.8},
];
const deploymentBase = import.meta.env.BASE_URL.replace(/^\/+|\/+$/g, '');
const ledRoomAsset = staticFile(`${deploymentBase ? `${deploymentBase}/` : ''}assets/generated/led-sensitivity-room.webp`);

export function LedSensitivityFilm({color, brightness, power, effect}: LedSensitivityFilmProps) {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const loopFrame = frame % (12 * fps);
  const breatheFrame = frame % (6 * fps);
  const breatheLevel = interpolate(
    breatheFrame,
    [0, 3 * fps, 6 * fps],
    [.58, 1, .58],
    {
      easing: Easing.bezier(.45, 0, .55, 1),
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    },
  );
  const spectrumHue = interpolate(loopFrame, [0, 12 * fps], [0, 360], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const selectedColor = effect === 'spectrum' ? hslToRgb(spectrumHue, .92, .58) : hexToRgb(color);
  const requestedIntensity = Math.min(1, Math.max(0, brightness / 100));
  const intensity = power ? requestedIntensity * (effect === 'breathe' ? breatheLevel : 1) : 0;
  const lux = Math.round(interpolate(intensity, [0, 1], [0, 480], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  }));
  const percentage = power ? Math.round(intensity * 100) : 0;
  const glowOpacity = power ? interpolate(intensity, [0, 1], [.03, .82]) : 0;
  const surfaceBrightness = interpolate(intensity, [0, 1], [.7, .92]);
  const ambientShade = interpolate(intensity, [0, 1], [.25, .08]);
  const sensorSweep = interpolate(loopFrame, [0, 12 * fps], [5, 95], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return <AbsoluteFill style={{overflow: 'hidden', backgroundColor: '#020611', color: '#f4f9ff'}}>
    <Img
      src={ledRoomAsset}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        filter: `brightness(${surfaceBrightness}) saturate(.82) contrast(1.06)`,
      }}
    />

    <AbsoluteFill style={{background: `rgba(2, 6, 17, ${ambientShade})`}}/>

    <svg
      aria-hidden="true"
      viewBox="0 0 1600 900"
      preserveAspectRatio="none"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        overflow: 'visible',
        mixBlendMode: 'screen',
        opacity: power ? .18 + intensity * .72 : 0,
        filter: `drop-shadow(0 0 ${6 + intensity * 15}px ${rgba(selectedColor, .7)})`,
      }}
    >
      <path
        d="M 210.5 0 L 519.5 271.3 L 1189 271.3 L 1551.3 0"
        fill="none"
        stroke={rgb(selectedColor)}
        strokeWidth={3 + intensity * 5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>

    <div style={{
      position: 'absolute',
      left: '24%',
      right: '23%',
      top: '4%',
      height: '31%',
      background: `radial-gradient(ellipse at 50% 32%, ${rgba(selectedColor, .18)}, transparent 70%)`,
      filter: 'blur(28px)',
      mixBlendMode: 'screen',
      opacity: glowOpacity * .35,
    }}/>

    {spots.map((spot) => <div key={`spot-${spot.left}`} style={{
      position: 'absolute',
      left: `${spot.left}%`,
      top: `${spot.top}%`,
      width: spot.width,
      height: spot.height,
      borderRadius: 999,
      background: power ? rgb(selectedColor) : '#26303b',
      boxShadow: `0 0 ${10 + intensity * 22}px ${2 + intensity * 5}px ${rgba(selectedColor, glowOpacity)}`,
      opacity: .25 + intensity * .75,
      transform: 'translate(-50%, -50%)',
    }}/>) }

    <div style={{
      position: 'absolute',
      left: '47.851%',
      top: '45.856%',
      width: '9.021%',
      height: '1.937%',
      border: `${1.5 + intensity * 2.5}px solid ${rgba(selectedColor, power ? .38 + intensity * .62 : .1)}`,
      borderRadius: '50%',
      filter: `drop-shadow(0 0 ${6 + intensity * 16}px ${rgba(selectedColor, glowOpacity)})`,
      opacity: .35 + intensity * .65,
    }}/>

    {wallFixtures.map((fixture) => <div key={`fixture-${fixture.left}`} style={{
      position: 'absolute',
      left: `${fixture.left}%`,
      top: `${fixture.top}%`,
      width: `${Math.max(.16, fixture.width * .08)}%`,
      height: `${fixture.bottom - fixture.top}%`,
      background: fixture.softEnds
        ? `linear-gradient(180deg, transparent, ${rgba(selectedColor, .88)} 8%, ${rgba(selectedColor, .62)} 88%, transparent)`
        : `linear-gradient(180deg, ${rgba(selectedColor, .88)}, ${rgba(selectedColor, .62)} 70%, ${rgba(selectedColor, .18)})`,
      boxShadow: fixture.softEnds ? 'none' : `0 0 ${5 + intensity * 14}px ${1 + intensity * 3}px ${rgba(selectedColor, .48)}`,
      filter: fixture.softEnds
        ? `blur(1.1px) drop-shadow(0 0 ${4 + intensity * 10}px ${rgba(selectedColor, .48)})`
        : 'blur(1.2px)',
      borderRadius: '999px',
      mixBlendMode: 'screen',
      opacity: power ? .12 + intensity * .75 : 0,
      transform: 'translateX(-50%)',
    }}/>) }

    <div style={{
      position: 'absolute',
      inset: '5%',
      border: `1px solid ${rgba(selectedColor, .28)}`,
      pointerEvents: 'none',
    }}>
      <span style={{position: 'absolute', left: `${sensorSweep}%`, top: -1, width: 42, height: 1, background: rgb(selectedColor), boxShadow: `0 0 14px ${rgb(selectedColor)}`}}/>
    </div>

    <div style={{
      position: 'absolute',
      left: '7.5%',
      top: '9%',
      width: 250,
      padding: '22px 24px',
      background: 'rgba(2,6,17,.82)',
      borderLeft: `5px solid ${rgb(selectedColor)}`,
      fontFamily: 'Courier New, monospace',
      boxShadow: '0 18px 50px rgba(0,0,0,.34)',
    }}>
      <div style={{fontSize: 18, letterSpacing: '.14em', color: rgb(selectedColor)}}>RGB REMOTE / LIVE</div>
      <div style={{display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 18}}>
        <strong style={{fontSize: 62, lineHeight: .8, letterSpacing: '-.07em'}}>{lux}</strong>
        <span style={{fontSize: 18, letterSpacing: '.12em', color: '#9aa9c2'}}>LUX</span>
      </div>
      <div style={{height: 5, marginTop: 22, background: 'rgba(255,255,255,.14)'}}>
        <span style={{display: 'block', width: `${percentage}%`, height: '100%', background: `linear-gradient(90deg,${rgb(selectedColor)},#ffffff)`}}/>
      </div>
      <div style={{display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 15, letterSpacing: '.08em', color: '#9aa9c2'}}>
        <span>LOW</span><span>LED OUTPUT {percentage}%</span><span>HIGH</span>
      </div>
    </div>

    <div style={{
      position: 'absolute',
      right: '7%',
      bottom: '8%',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '13px 16px',
      background: 'rgba(2,6,17,.76)',
      border: `1px solid ${rgba(selectedColor, .35)}`,
      fontFamily: 'Courier New, monospace',
      fontSize: 16,
      letterSpacing: '.13em',
      textTransform: 'uppercase',
    }}>
      <i style={{width: 8, height: 8, borderRadius: '50%', background: rgb(selectedColor), boxShadow: `0 0 ${8 + intensity * 16}px ${rgb(selectedColor)}`}}/>
      {!power ? 'RGB output off' : effect === 'spectrum' ? 'Spectrum cycle' : `${effect} · ${color}`}
    </div>
  </AbsoluteFill>;
}
