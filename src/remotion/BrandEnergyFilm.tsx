import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';

const wires = [
  {color: '#2f73bd', path: 'M8 -5 C8 7 9 15 9 23 S8 38 8 51'},
  {color: '#78442d', path: 'M24 -5 C24 7 23 15 24 23 S25 38 24 51'},
  {color: '#10171c', path: 'M40 -5 C40 7 41 15 40 23 S39 38 40 51'},
  {color: '#92999e', path: 'M56 -5 C56 7 55 15 56 23 S57 38 56 51'},
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
        cx={8 + index * 16}
        cy="46"
        r={.45 + spark * .48}
        fill="#f4feff"
        opacity={spark * (.78 - index * .09)}
        filter="url(#brand-wire-glow)"
        key={`terminal-spark-${index}`}
      />)}
    </svg>
  </AbsoluteFill>;
}
