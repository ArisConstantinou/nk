import {AbsoluteFill, Easing, Img, interpolate, Sequence, useCurrentFrame, useVideoConfig} from 'remotion';

export const INSTALLATION_STAGE_FRAMES = 72;
export const INSTALLATION_CROSSFADE_FRAMES = 18;
export const INSTALLATION_STORY_DURATION = INSTALLATION_STAGE_FRAMES * 8;

export type ElectricalInstallationFilmProps = {
  images: string[];
  focalPoints: number[];
};

const clamp = {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
} as const;

function InstallationScene({src, index, focalPoint}: {src: string; index: number; focalPoint: number}) {
  const frame = useCurrentFrame();
  const sceneDuration = INSTALLATION_STAGE_FRAMES + (index === 0 ? 0 : INSTALLATION_CROSSFADE_FRAMES);
  const opacity = index === 0 ? 1 : interpolate(
    frame,
    [0, INSTALLATION_CROSSFADE_FRAMES],
    [0, 1],
    {...clamp, easing: Easing.bezier(.45, 0, .55, 1)},
  );
  const scale = interpolate(
    frame,
    [0, sceneDuration],
    [1.015, 1.065],
    {...clamp, easing: Easing.bezier(.45, 0, .55, 1)},
  );

  return <AbsoluteFill style={{opacity, transform: `scale(${scale})`, transformOrigin: `${focalPoint}% 50%`}}>
    <Img
      src={src}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        objectPosition: `${focalPoint}% 50%`,
      }}
    />
  </AbsoluteFill>;
}

export function ElectricalInstallationFilm({images, focalPoints}: ElectricalInstallationFilmProps) {
  const frame = useCurrentFrame();
  const {fps, durationInFrames, width, height} = useVideoConfig();
  const signalProgress = interpolate(frame, [0, durationInFrames - 1], [0, 1], clamp);
  const portrait = height > width;

  return <AbsoluteFill style={{overflow: 'hidden', background: '#090d0e'}}>
    {images.map((src, index) => {
      const from = index === 0 ? 0 : index * INSTALLATION_STAGE_FRAMES - INSTALLATION_CROSSFADE_FRAMES;
      const end = Math.min(durationInFrames, (index + 1) * INSTALLATION_STAGE_FRAMES);
      return <Sequence
        from={from}
        durationInFrames={end - from}
        premountFor={fps}
        key={src}
      >
        <InstallationScene src={src} index={index} focalPoint={focalPoints[index] ?? 50}/>
      </Sequence>;
    })}

    <AbsoluteFill style={{
      background: portrait
        ? 'linear-gradient(180deg,rgba(5,10,11,.8) 0%,rgba(5,10,11,.12) 36%,rgba(5,10,11,.18) 62%,rgba(5,10,11,.86) 100%)'
        : 'linear-gradient(180deg,rgba(5,10,11,.66) 0%,rgba(5,10,11,.06) 38%,rgba(5,10,11,.12) 58%,rgba(5,10,11,.84) 100%)',
    }}/>
    <AbsoluteFill style={{
      background: 'linear-gradient(90deg,rgba(5,10,11,.48) 0%,transparent 24%,transparent 76%,rgba(5,10,11,.4) 100%)',
    }}/>

    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <svg width="100%" height="100%" viewBox="0 0 1920 1080" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="installation-progress" x1="0" x2="1">
            <stop stopColor="#f6b55f"/>
            <stop offset=".54" stopColor="#f4dfb6"/>
            <stop offset="1" stopColor="#f5f0e5"/>
          </linearGradient>
          <filter id="installation-glow" x="-20%" y="-800%" width="140%" height="1700%">
            <feGaussianBlur stdDeviation="4" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <path d="M96 1007H1824" stroke="rgba(255,255,255,.18)" strokeWidth="2"/>
        <path
          d="M96 1007H1824"
          stroke="url(#installation-progress)"
          strokeWidth="4"
          strokeLinecap="round"
          pathLength="1"
          strokeDasharray={`${signalProgress} 1`}
          filter="url(#installation-glow)"
        />
      </svg>
    </AbsoluteFill>
  </AbsoluteFill>;
}
