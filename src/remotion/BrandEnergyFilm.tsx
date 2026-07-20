import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';

const wires = [
  {color: '#2f6fb7', path: 'M-4 8 C18 7 31 10 43 18 S69 25 94 25'},
  {color: '#74412a', path: 'M-4 23 C17 21 28 24 42 29 S68 31 94 31'},
  {color: '#111820', path: 'M-4 38 C16 35 29 34 43 35 S69 37 94 37'},
  {color: '#8b9298', path: 'M-4 53 C18 50 30 44 43 42 S70 43 94 43'},
];

const clamp = {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
} as const;

export function BrandEnergyFilm() {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const travel = interpolate(
    frame,
    [0, 1.55 * fps],
    [76, -34],
    {...clamp, easing: Easing.bezier(0.45, 0, 0.55, 1)},
  );
  const firstSpark = interpolate(
    frame,
    [0, .18 * fps, .26 * fps, .42 * fps, .52 * fps],
    [0, 0, 1, .35, 0],
    clamp,
  );
  const secondSpark = interpolate(
    frame,
    [.72 * fps, .9 * fps, .98 * fps, 1.14 * fps, 1.24 * fps],
    [0, 0, .9, .28, 0],
    clamp,
  );
  const spark = Math.max(firstSpark, secondSpark);

  return <AbsoluteFill style={{overflow: 'visible', background: 'transparent'}}>
    <svg width="100%" height="100%" viewBox="0 0 96 62" preserveAspectRatio="none" aria-hidden="true">
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
        strokeDasharray="9 92"
        strokeDashoffset={travel - index * 7}
        filter="url(#brand-wire-glow)"
        opacity={.72}
        key={`energy-${wire.color}`}
      />)}

      <g transform="translate(92 34)" opacity={spark} filter="url(#brand-wire-glow)">
        <circle r={2.6 + spark * 1.7} fill="#fff" opacity=".92"/>
        <path d="M-2-4 0-11 2-4M4-2 10-5 5 1M4 3 9 8 1 5M-4 2-9 6-5-1" fill="none" stroke="#c9fbff" strokeWidth="1.35" strokeLinecap="round"/>
      </g>
    </svg>
  </AbsoluteFill>;
}
