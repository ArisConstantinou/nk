import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export type LedSensitivityMode = 'auto' | 'low' | 'high';

export type LedSensitivityFilmProps = {
  mode: LedSensitivityMode;
};

const spots = [25.5, 31, 36.5, 67, 73.5, 80];
const wallWashes = [68.5, 74.4, 80.3, 86.2, 92.1, 97.2];
const deploymentBase = import.meta.env.BASE_URL.replace(/^\/+|\/+$/g, '');
const ledRoomAsset = staticFile(`${deploymentBase ? `${deploymentBase}/` : ''}assets/generated/led-sensitivity-room.webp`);

export function LedSensitivityFilm({mode}: LedSensitivityFilmProps) {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const loopFrame = frame % (12 * fps);
  const automaticIntensity = interpolate(
    loopFrame,
    [0, 2 * fps, 5 * fps, 7 * fps, 10 * fps, 12 * fps],
    [.16, .16, .96, .96, .16, .16],
    {
      easing: Easing.bezier(.45, 0, .55, 1),
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    },
  );
  const intensity = mode === 'auto' ? automaticIntensity : mode === 'low' ? .18 : .96;
  const lux = Math.round(interpolate(intensity, [.16, .96], [42, 420], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  }));
  const percentage = Math.round(intensity * 100);
  const glowOpacity = interpolate(intensity, [.16, .96], [.08, .76]);
  const surfaceBrightness = interpolate(intensity, [.16, .96], [.57, 1.08]);
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
        filter: `brightness(${surfaceBrightness}) saturate(${.72 + intensity * .38}) contrast(1.08)`,
      }}
    />

    <AbsoluteFill style={{background: `rgba(2, 6, 17, ${interpolate(intensity, [.16, .96], [.42, .04])})`}}/>

    <div style={{
      position: 'absolute',
      left: '2%',
      right: '2%',
      top: '-4%',
      height: '40%',
      background: 'linear-gradient(180deg, rgba(59,232,255,.72), rgba(128,100,255,.28) 34%, transparent 76%)',
      filter: 'blur(38px)',
      mixBlendMode: 'screen',
      opacity: glowOpacity * .55,
    }}/>

    {spots.map((left, index) => <div key={`spot-${left}`} style={{
      position: 'absolute',
      left: `${left}%`,
      top: `${9 + (index % 3) * 7}%`,
      width: 11,
      height: 11,
      borderRadius: '50%',
      background: '#e9fbff',
      boxShadow: `0 0 ${18 + intensity * 42}px ${5 + intensity * 12}px rgba(59,232,255,${glowOpacity})`,
      opacity: .25 + intensity * .75,
      transform: 'translate(-50%, -50%)',
    }}/>) }

    <div style={{
      position: 'absolute',
      left: '47.5%',
      top: '40.5%',
      width: '9.5%',
      height: '5.2%',
      border: `${2 + intensity * 4}px solid rgba(236,252,255,${.38 + intensity * .62})`,
      borderRadius: '50%',
      filter: `drop-shadow(0 0 ${8 + intensity * 24}px rgba(59,232,255,${glowOpacity}))`,
      opacity: .35 + intensity * .65,
    }}/>

    {wallWashes.map((left, index) => <div key={`wash-${left}`} style={{
      position: 'absolute',
      left: `${left}%`,
      top: `${20 + (index % 2) * 1.5}%`,
      width: '4.8%',
      height: '61%',
      background: 'linear-gradient(180deg, rgba(228,250,255,.86), rgba(59,232,255,.35) 42%, transparent 92%)',
      clipPath: 'polygon(47% 0, 100% 100%, 0 100%)',
      filter: `blur(${8 + intensity * 12}px)`,
      mixBlendMode: 'screen',
      opacity: glowOpacity * (.72 + (index % 2) * .14),
      transform: 'translateX(-50%)',
    }}/>) }

    <div style={{
      position: 'absolute',
      inset: '5%',
      border: '1px solid rgba(59,232,255,.24)',
      pointerEvents: 'none',
    }}>
      <span style={{position: 'absolute', left: `${sensorSweep}%`, top: -1, width: 42, height: 1, background: '#3be8ff', boxShadow: '0 0 14px #3be8ff'}}/>
    </div>

    <div style={{
      position: 'absolute',
      left: '7.5%',
      top: '9%',
      width: 250,
      padding: '22px 24px',
      background: 'rgba(2,6,17,.82)',
      borderLeft: '5px solid #3be8ff',
      fontFamily: 'Courier New, monospace',
      boxShadow: '0 18px 50px rgba(0,0,0,.34)',
    }}>
      <div style={{fontSize: 18, letterSpacing: '.14em', color: '#3be8ff'}}>DAYLIGHT SENSOR / LIVE</div>
      <div style={{display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 18}}>
        <strong style={{fontSize: 62, lineHeight: .8, letterSpacing: '-.07em'}}>{lux}</strong>
        <span style={{fontSize: 18, letterSpacing: '.12em', color: '#9aa9c2'}}>LUX</span>
      </div>
      <div style={{height: 5, marginTop: 22, background: 'rgba(255,255,255,.14)'}}>
        <span style={{display: 'block', width: `${percentage}%`, height: '100%', background: 'linear-gradient(90deg,#3be8ff,#8064ff)'}}/>
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
      border: '1px solid rgba(59,232,255,.28)',
      fontFamily: 'Courier New, monospace',
      fontSize: 16,
      letterSpacing: '.13em',
      textTransform: 'uppercase',
    }}>
      <i style={{width: 8, height: 8, borderRadius: '50%', background: '#3be8ff', boxShadow: `0 0 ${8 + intensity * 16}px #3be8ff`}}/>
      {mode === 'auto' ? 'Adaptive cycle' : `${mode} output locked`}
    </div>
  </AbsoluteFill>;
}
