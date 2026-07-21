import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';

const wires = [
  {color: '#2f6fb7', path: 'M-8 5 C34 4 58 7 84 9 S135 12 178 13'},
  {color: '#74412a', path: 'M-8 22 C33 20 57 22 84 24 S135 27 178 28'},
  {color: '#111820', path: 'M-8 40 C31 37 57 37 84 39 S135 42 178 43'},
  {color: '#8b9298', path: 'M-8 57 C34 55 58 52 84 53 S135 56 178 58'},
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
    [0, -184],
    {...clamp, easing: Easing.linear},
  );
  const sparkAt = (second: number, spread: number) => Math.exp(-Math.pow((cycleFrame - second * fps) / (spread * fps), 2));
  const spark = Math.max(
    sparkAt(.86, .055),
    sparkAt(3.58, .045) * .74,
    sparkAt(4.92, .06) * .48,
  );

  return <AbsoluteFill style={{overflow: 'visible', background: 'transparent'}}>
    <svg width="100%" height="100%" viewBox="0 0 180 62" preserveAspectRatio="none" aria-hidden="true">
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
        strokeWidth={index === 2 ? 1.8 : 2.2}
        strokeLinecap="round"
        strokeDasharray="20 72"
        strokeDashoffset={travel - index * 19}
        filter="url(#brand-wire-glow)"
        opacity={.34}
        key={`energy-halo-${wire.color}`}
      />)}

      {wires.map((wire, index) => <path
        d={wire.path}
        fill="none"
        stroke={index === 1 ? '#fff1b8' : '#c8faff'}
        strokeWidth={index === 2 ? 1 : 1.2}
        strokeLinecap="round"
        strokeDasharray="20 72"
        strokeDashoffset={travel - index * 19}
        opacity={.96}
        key={`energy-core-${wire.color}`}
      />)}

      <g transform="translate(176 34)" opacity={spark} filter="url(#brand-wire-glow)">
        <circle r={.65 + spark * .7} fill="#f4feff" opacity=".72"/>
        <path d="M0-1-3-3-6 0M1 0 4 2 7 0M-1 2-4 5" fill="none" stroke="#dffcff" strokeWidth=".72" strokeLinecap="round" strokeLinejoin="round"/>
      </g>
    </svg>
  </AbsoluteFill>;
}
