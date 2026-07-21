import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';

const clamp = {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
} as const;

const signals = [
  {label: 'PROPERTY', x: 58, y: 72, targetY: 154, color: '#45d9d0', delay: 0},
  {label: 'LOCATION', x: 58, y: 178, targetY: 213, color: '#ff7457', delay: .32},
  {label: 'TIMING', x: 58, y: 284, targetY: 272, color: '#ffc763', delay: .64},
  {label: 'REQUIREMENT', x: 58, y: 390, targetY: 331, color: '#9e8cff', delay: .96},
];

export function QuoteScopeFilm() {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const cycleFrame = frame % (8 * fps);
  const reveal = interpolate(cycleFrame, [0, 1.1 * fps], [0, 1], {
    ...clamp,
    easing: Easing.bezier(.16, 1, .3, 1),
  });
  const dossier = interpolate(cycleFrame, [2.35 * fps, 4.6 * fps], [0, 1], {
    ...clamp,
    easing: Easing.bezier(.22, 1, .36, 1),
  });
  const approval = interpolate(cycleFrame, [4.45 * fps, 5.25 * fps], [0, 1], {
    ...clamp,
    easing: Easing.bezier(.34, 1.56, .64, 1),
  });

  return <AbsoluteFill style={{overflow: 'hidden', background: 'transparent'}}>
    <svg viewBox="0 0 900 520" width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="quote-scope-line" x1="0" x2="1">
          <stop stopColor="#45d9d0"/>
          <stop offset=".55" stopColor="#f4fff9"/>
          <stop offset="1" stopColor="#ff7457"/>
        </linearGradient>
        <filter id="quote-scope-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      <g opacity={.16 * reveal}>
        {Array.from({length: 10}, (_, index) => <line key={`v-${index}`} x1={index * 100} x2={index * 100} y1="0" y2="520" stroke="#45d9d0" strokeWidth=".65"/>)}
        {Array.from({length: 7}, (_, index) => <line key={`h-${index}`} x1="0" x2="900" y1={index * 86.6} y2={index * 86.6} stroke="#45d9d0" strokeWidth=".65"/>)}
      </g>

      {signals.map(signal => {
        const start = signal.delay * fps;
        const progress = interpolate(cycleFrame, [start, start + 3.35 * fps], [0, 1], {
          ...clamp,
          easing: Easing.bezier(.45, 0, .25, 1),
        });
        const node = interpolate(cycleFrame, [start, start + .55 * fps], [0, 1], {
          ...clamp,
          easing: Easing.bezier(.34, 1.56, .64, 1),
        });
        const packetX = interpolate(progress, [0, 1], [signal.x + 130, 544]);
        const packetY = interpolate(progress, [0, 1], [signal.y, signal.targetY]);
        const path = `M ${signal.x + 130} ${signal.y} C 300 ${signal.y}, 390 ${signal.targetY}, 544 ${signal.targetY}`;

        return <g key={signal.label}>
          <g transform={`translate(${signal.x} ${signal.y}) scale(${node})`}>
            <rect width="128" height="34" rx="3" fill="#071d29" fillOpacity=".82" stroke={signal.color} strokeWidth="1.5"/>
            <circle cx="17" cy="17" r="4" fill={signal.color}/>
            <text x="31" y="21" fill={signal.color} fontFamily="Courier New, monospace" fontSize="12" letterSpacing="1.2">{signal.label}</text>
          </g>
          <path d={path} pathLength="100" fill="none" stroke={signal.color} strokeOpacity=".22" strokeWidth="2"/>
          <path d={path} pathLength="100" fill="none" stroke={signal.color} strokeWidth="2.6" strokeDasharray={`${progress * 100} 100`} strokeLinecap="round"/>
          <circle cx={packetX} cy={packetY} r="5.5" fill="#f7ffff" opacity={progress < 1 ? .9 : 0} filter="url(#quote-scope-glow)"/>
        </g>;
      })}

      <g transform={`translate(${610 - (1 - dossier) * -26} 92)`} opacity={.18 + dossier * .82}>
        <path d="M0 0 H202 L242 40 V345 H0 Z" fill="#071d29" fillOpacity=".8" stroke="url(#quote-scope-line)" strokeWidth="2"/>
        <path d="M202 0 V40 H242" fill="none" stroke="#ff7457" strokeWidth="2"/>
        <text x="24" y="43" fill="#f7ffff" fontFamily="Courier New, monospace" fontSize="12" letterSpacing="2.4">PROJECT DOSSIER</text>
        <line x1="24" x2="215" y1="63" y2="63" stroke="#45d9d0" strokeOpacity=".45"/>
        {signals.map((signal, index) => <g key={`d-${signal.label}`} opacity={dossier}>
          <circle cx="28" cy={91 + index * 59} r="4" fill={signal.color}/>
          <text x="43" y={95 + index * 59} fill="#d9ebee" fontFamily="Courier New, monospace" fontSize="12" letterSpacing="1.2">{signal.label}</text>
          <line x1="43" x2={95 + dossier * 110} y1={105 + index * 59} y2={105 + index * 59} stroke={signal.color} strokeOpacity=".6" strokeWidth="3"/>
        </g>)}
        <g transform={`translate(164 296) scale(${approval})`} filter="url(#quote-scope-glow)">
          <circle r="27" fill="#45d9d0"/>
          <path d="M-11 0 L-3 8 L13 -10" fill="none" stroke="#071d29" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
        </g>
        <text x="24" y="327" fill="#45d9d0" fontFamily="Courier New, monospace" fontSize="12" letterSpacing="1.6" opacity={approval}>SCOPE / READY</text>
      </g>
    </svg>
  </AbsoluteFill>;
}
