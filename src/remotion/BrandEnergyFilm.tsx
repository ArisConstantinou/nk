import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';

const wires = [
  {color: '#2f6fb7', path: 'M-8 8 C34 7 57 9 82 16 S132 24 178 25'},
  {color: '#74412a', path: 'M-8 23 C33 21 56 23 82 28 S132 30 178 31'},
  {color: '#111820', path: 'M-8 38 C31 35 56 34 83 35 S133 36 178 37'},
  {color: '#8b9298', path: 'M-8 53 C34 50 57 44 83 42 S134 42 178 43'},
];

const clamp = {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
} as const;

export function BrandEnergyFilm() {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const cycleFrames = Math.round(2.4 * fps);
  const cycleFrame = frame % cycleFrames;
  const phase = cycleFrame / cycleFrames;
  const travel = interpolate(
    cycleFrame,
    [0, cycleFrames],
    [0, -92],
    {...clamp, easing: Easing.linear},
  );
  const primarySpark = Math.pow((Math.sin(phase * Math.PI * 8 - Math.PI / 2) + 1) / 2, 10);
  const secondarySpark = Math.pow((Math.sin(phase * Math.PI * 8 + Math.PI / 3) + 1) / 2, 14) * .56;
  const spark = .16 + Math.max(primarySpark, secondarySpark) * .84;
  const sparkRotation = phase * 360;

  return <AbsoluteFill style={{overflow: 'visible', background: 'transparent'}}>
    <svg width="100%" height="100%" viewBox="0 0 180 62" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <filter id="brand-wire-shadow" x="-30%" y="-80%" width="170%" height="260%">
          <feDropShadow dx="0" dy="1.2" stdDeviation="1.25" floodColor="#020611" floodOpacity=".48"/>
        </filter>
        <filter id="brand-wire-glow" x="-80%" y="-160%" width="280%" height="420%">
          <feGaussianBlur stdDeviation="1.8" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      <g filter="url(#brand-wire-shadow)">
        {wires.map(wire => <g key={wire.color}>
          <path d={wire.path} fill="none" stroke="#02050a" strokeOpacity=".5" strokeWidth="5.4" strokeLinecap="round"/>
          <path d={wire.path} fill="none" stroke={wire.color} strokeWidth="3.8" strokeLinecap="round"/>
          <path d={wire.path} fill="none" stroke="#fff" strokeOpacity=".24" strokeWidth=".65" strokeLinecap="round"/>
        </g>)}
      </g>

      {wires.map((wire, index) => <path
        d={wire.path}
        fill="none"
        stroke={index === 1 ? '#fff4d5' : '#dffbff'}
        strokeWidth={index === 2 ? 1.05 : 1.3}
        strokeLinecap="round"
        strokeDasharray="10 36"
        strokeDashoffset={travel - index * 11.5}
        filter="url(#brand-wire-glow)"
        opacity={.8}
        key={`energy-${wire.color}`}
      />)}

      <g transform={`translate(176 34) rotate(${sparkRotation})`} opacity={spark} filter="url(#brand-wire-glow)">
        <circle r={2.2 + spark * 2.1} fill="#fff" opacity=".94"/>
        <path d="M-2-4 0-11 2-4M4-2 10-5 5 1M4 3 9 8 1 5M-4 2-9 6-5-1" fill="none" stroke="#c9fbff" strokeWidth="1.35" strokeLinecap="round"/>
      </g>
    </svg>
  </AbsoluteFill>;
}
