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
  {left: 25.8, top: 9.8},
  {left: 30.4, top: 18.3},
  {left: 33.6, top: 24.4},
  {left: 35.8, top: 28.6},
  {left: 83.5, top: 9.3},
  {left: 77.6, top: 17.7},
  {left: 73.8, top: 24.5},
  {left: 72.1, top: 26.5},
];

// Measured from the six visible wall-wash fixtures in the source image. Each
// cone begins immediately below its own light instead of following an evenly
// spaced decorative pattern.
const wallWashes = [
  {left: 69.1, top: 45.9, bottom: 70.5, width: 2.1},
  {left: 74.7, top: 39.5, bottom: 73.0, width: 2.6},
  {left: 78.4, top: 36.1, bottom: 75.5, width: 3.0},
  {left: 82.9, top: 31.9, bottom: 78.0, width: 3.5},
  {left: 88.3, top: 27.0, bottom: 80.0, width: 4.1},
  {left: 95.1, top: 21.0, bottom: 82.0, width: 4.8},
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
  const surfaceBrightness = interpolate(intensity, [0, 1], [.38, 1.08]);
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
        filter: `brightness(${surfaceBrightness}) saturate(${.58 + intensity * .55}) contrast(1.08)`,
      }}
    />

    <AbsoluteFill style={{background: `rgba(2, 6, 17, ${interpolate(intensity, [0, 1], [.58, .04])})`}}/>
    <AbsoluteFill style={{
      background: rgba(selectedColor, power ? .08 + intensity * .24 : 0),
      mixBlendMode: 'color',
    }}/>

    <div style={{
      position: 'absolute',
      left: '2%',
      right: '2%',
      top: '-4%',
      height: '40%',
      background: `linear-gradient(180deg, ${rgba(selectedColor, .78)}, ${rgba(selectedColor, .3)} 34%, transparent 76%)`,
      filter: 'blur(38px)',
      mixBlendMode: 'screen',
      opacity: glowOpacity * .55,
    }}/>

    {spots.map((spot) => <div key={`spot-${spot.left}`} style={{
      position: 'absolute',
      left: `${spot.left}%`,
      top: `${spot.top}%`,
      width: 11,
      height: 11,
      borderRadius: '50%',
      background: power ? rgb(selectedColor) : '#26303b',
      boxShadow: `0 0 ${18 + intensity * 42}px ${5 + intensity * 12}px ${rgba(selectedColor, glowOpacity)}`,
      opacity: .25 + intensity * .75,
      transform: 'translate(-50%, -50%)',
    }}/>) }

    <div style={{
      position: 'absolute',
      left: '47.7%',
      top: '43.4%',
      width: '9.1%',
      height: '3.5%',
      border: `${2 + intensity * 4}px solid ${rgba(selectedColor, power ? .38 + intensity * .62 : .1)}`,
      borderRadius: '50%',
      filter: `drop-shadow(0 0 ${8 + intensity * 24}px ${rgba(selectedColor, glowOpacity)})`,
      opacity: .35 + intensity * .65,
    }}/>

    {wallWashes.map((wash, index) => <div key={`wash-${wash.left}`} style={{
      position: 'absolute',
      left: `${wash.left}%`,
      top: `${wash.top}%`,
      width: `${wash.width}%`,
      height: `${wash.bottom - wash.top}%`,
      background: `linear-gradient(180deg, ${rgba(selectedColor, .92)}, ${rgba(selectedColor, .42)} 42%, transparent 92%)`,
      clipPath: 'polygon(49% 0, 82% 100%, 18% 100%)',
      filter: `blur(${8 + intensity * 12}px)`,
      mixBlendMode: 'screen',
      opacity: glowOpacity * (.72 + (index % 2) * .14),
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
