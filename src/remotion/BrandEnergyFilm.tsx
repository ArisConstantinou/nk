import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';

const wires = [
  {color: '#2f73bd', path: 'M7 2 C7 9 9 14 12 19 S16 28 17 38'},
  {color: '#78442d', path: 'M23 2 C23 9 22 15 24 20 S27 29 27 38'},
  {color: '#10171c', path: 'M41 2 C41 9 39 15 37 20 S35 29 35 38'},
  {color: '#92999e', path: 'M57 2 C57 9 53 14 49 19 S43 28 43 38'},
];

const clamp = {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
} as const;

export function BrandEnergyFilm() {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const cycleFrames = Math.round(6 * fps);
  const cycleFrame = frame % cycleFrames;
  const travel = interpolate(
    cycleFrame,
    [0, cycleFrames],
    [0, -56],
    {...clamp, easing: Easing.linear},
  );
  const sparkAt = (second: number, spread: number) => Math.exp(-Math.pow((cycleFrame - second * fps) / (spread * fps), 2));
  const spark = Math.max(
    sparkAt(.86, .055),
    sparkAt(3.58, .045) * .74,
    sparkAt(4.92, .06) * .48,
  );

  return <AbsoluteFill style={{overflow: 'visible', background: 'transparent'}}>
    <svg width="100%" height="100%" viewBox="0 0 64 48" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <filter id="brand-wire-shadow" x="-30%" y="-80%" width="170%" height="260%">
          <feDropShadow dx="0" dy="1.2" stdDeviation="1.25" floodColor="#020611" floodOpacity=".48"/>
        </filter>
        <filter id="brand-wire-glow" x="-80%" y="-160%" width="280%" height="420%">
          <feGaussianBlur stdDeviation="1.05" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      <g filter="url(#brand-wire-shadow)">
        {wires.map((wire, index) => <g key={wire.color}>
          <path d={wire.path} fill="none" stroke={index === 2 ? '#9ca5aa' : '#02050a'} strokeOpacity={index === 2 ? .62 : .5} strokeWidth="5.4" strokeLinecap="round"/>
          <path d={wire.path} fill="none" stroke={wire.color} strokeWidth="3.8" strokeLinecap="round"/>
          <path d={wire.path} fill="none" stroke="#fff" strokeOpacity=".24" strokeWidth=".65" strokeLinecap="round"/>
        </g>)}
      </g>

      {wires.map((wire, index) => <path
        d={wire.path}
        fill="none"
        stroke={index === 1 ? '#fff4d5' : '#dffbff'}
        strokeWidth={index === 2 ? 1.45 : 1.8}
        strokeLinecap="round"
        strokeDasharray="9 30"
        strokeDashoffset={travel - index * 7}
        filter="url(#brand-wire-glow)"
        opacity={.34}
        key={`energy-halo-${wire.color}`}
      />)}

      {wires.map((wire, index) => <path
        d={wire.path}
        fill="none"
        stroke={index === 1 ? '#fff1b8' : '#c8faff'}
        strokeWidth={index === 2 ? .75 : .9}
        strokeLinecap="round"
        strokeDasharray="9 30"
        strokeDashoffset={travel - index * 7}
        opacity={.96}
        key={`energy-core-${wire.color}`}
      />)}

      {wires.map((_, index) => <circle
        cx={17 + index * 9}
        cy="38"
        r={.45 + spark * .48}
        fill="#f4feff"
        opacity={spark * (.78 - index * .09)}
        filter="url(#brand-wire-glow)"
        key={`terminal-spark-${index}`}
      />)}
    </svg>
  </AbsoluteFill>;
}
