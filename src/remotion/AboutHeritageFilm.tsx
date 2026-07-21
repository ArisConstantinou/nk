import {AbsoluteFill, Easing, Img, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';

export type AboutHeritageFilmProps = {
  images: [string, string, string];
};

const clamp = {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
} as const;

const sceneCentres = [0, 120, 240];

const circularDistance = (frame: number, centre: number, duration: number) => {
  const direct = Math.abs(frame - centre);
  return Math.min(direct, duration - direct);
};

export function AboutHeritageFilm({images}: AboutHeritageFilmProps) {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const circuitProgress = interpolate(
    frame,
    [0, durationInFrames - 1],
    [0, 1],
    {...clamp, easing: Easing.bezier(.16, 1, .3, 1)},
  );

  return <AbsoluteFill style={{overflow: 'hidden', background: '#06111c'}}>
    {images.map((image, index) => {
      const distance = circularDistance(frame, sceneCentres[index], durationInFrames);
      const opacity = interpolate(distance, [26, 58], [1, 0], clamp);
      const scale = interpolate(distance, [0, 60], [1.015, 1.085], clamp);
      const drift = interpolate(frame, [0, durationInFrames], [-1.5 + index, 1.5 - index], clamp);
      return <AbsoluteFill
        key={image}
        style={{
          opacity,
          transform: `scale(${scale}) translate3d(${drift}%, 0, 0)`,
          transformOrigin: index === 0 ? '38% 55%' : '50% 50%',
        }}
      >
        <Img
          src={image}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: index === 0 ? '46% 50%' : index === 1 ? '50% 45%' : '55% 50%',
          }}
        />
      </AbsoluteFill>;
    })}

    <AbsoluteFill style={{
      background: 'linear-gradient(90deg, rgba(3,10,18,.9) 0%, rgba(3,10,18,.34) 48%, rgba(3,10,18,.2) 72%, rgba(3,10,18,.7) 100%)',
    }}/>
    <AbsoluteFill style={{
      background: 'linear-gradient(0deg, rgba(3,10,18,.94) 0%, transparent 48%, rgba(3,10,18,.35) 100%)',
    }}/>

    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <svg width="100%" height="100%" viewBox="0 0 1920 1080" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="about-signal" x1="0" x2="1">
            <stop stopColor="#f47c4f"/>
            <stop offset=".55" stopColor="#f2c277"/>
            <stop offset="1" stopColor="#50e5ef"/>
          </linearGradient>
          <filter id="about-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="8" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <path
          d="M-40 846 C300 790 454 916 748 816 S1230 650 1540 746 S1770 872 1960 770"
          fill="none"
          stroke="rgba(255,255,255,.16)"
          strokeWidth="2"
        />
        <path
          d="M-40 846 C300 790 454 916 748 816 S1230 650 1540 746 S1770 872 1960 770"
          fill="none"
          stroke="url(#about-signal)"
          strokeWidth="5"
          strokeLinecap="round"
          pathLength="1"
          strokeDasharray={`${circuitProgress} 1`}
          filter="url(#about-glow)"
        />
        {[300, 960, 1600].map((x, index) => {
          const pulse = .72 + Math.sin((frame - index * 10) / 12) * .18;
          return <g key={x} transform={`translate(${x} ${index === 1 ? 760 : index === 2 ? 762 : 812})`}>
            <circle r="18" fill="rgba(3,10,18,.72)" stroke="rgba(255,255,255,.34)" strokeWidth="2"/>
            <circle r={5 + pulse * 3} fill={index === 2 ? '#50e5ef' : '#f2c277'} filter="url(#about-glow)"/>
          </g>;
        })}
      </svg>
    </AbsoluteFill>

    <div style={{
      position: 'absolute',
      right: 48,
      top: 40,
      fontFamily: 'Arial, sans-serif',
      fontSize: 13,
      letterSpacing: '.2em',
      color: 'rgba(255,255,255,.82)',
      textTransform: 'uppercase',
    }}>Continuity / 1985 → now → next</div>
  </AbsoluteFill>;
}
