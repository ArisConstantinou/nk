import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';

const clamp = {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
} as const;

const channels = [
  {label: 'CALL', color: '#42d8ca', path: 'M 38 104 C 210 104, 232 244, 405 244 S 620 194, 850 258', delay: 0},
  {label: 'VISIT', color: '#ffb44f', path: 'M 38 258 C 196 258, 256 258, 405 258 S 622 258, 850 258', delay: .42},
  {label: 'ENQUIRY', color: '#ff704f', path: 'M 38 412 C 205 412, 248 284, 405 274 S 622 322, 850 258', delay: .84},
];

export function ContactSignalFilm() {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const cycle = 8 * fps;
  const cycleFrame = frame % cycle;
  const entrance = interpolate(cycleFrame, [0, 1.25 * fps], [0, 1], {
    ...clamp,
    easing: Easing.bezier(.16, 1, .3, 1),
  });
  const destinationPulse = .58 + Math.sin(cycleFrame / (fps * .17)) * .12;

  return <AbsoluteFill style={{overflow: 'hidden', background: 'transparent'}}>
    <svg viewBox="0 0 900 520" preserveAspectRatio="none" width="100%" height="100%" aria-hidden="true">
      <defs>
        <filter id="contact-signal-soft" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="4.5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <linearGradient id="contact-destination" x1="0" x2="1">
          <stop stopColor="#42d8ca"/>
          <stop offset=".58" stopColor="#f5fff9"/>
          <stop offset="1" stopColor="#ff704f"/>
        </linearGradient>
      </defs>

      <g opacity={.2 * entrance}>
        {Array.from({length: 9}, (_, index) => <line x1={index * 112.5} x2={index * 112.5} y1="0" y2="520" stroke="#42d8ca" strokeWidth=".55" key={`v-${index}`}/>)}
        {Array.from({length: 6}, (_, index) => <line x1="0" x2="900" y1={index * 104} y2={index * 104} stroke="#42d8ca" strokeWidth=".55" key={`h-${index}`}/>)}
      </g>

      {channels.map((channel) => {
        const start = channel.delay * fps;
        const progress = interpolate(cycleFrame, [start, start + 4.4 * fps], [0, 1], {
          ...clamp,
          easing: Easing.bezier(.45, 0, .25, 1),
        });
        const packet = interpolate(cycleFrame, [start, start + 4.4 * fps], [920, 0], clamp);
        const nodeReveal = interpolate(cycleFrame, [start, start + .55 * fps], [0, 1], {
          ...clamp,
          easing: Easing.bezier(.34, 1.56, .64, 1),
        });

        return <g key={channel.label}>
          <path d={channel.path} pathLength="100" fill="none" stroke={channel.color} strokeOpacity=".18" strokeWidth="2"/>
          <path
            d={channel.path}
            pathLength="100"
            fill="none"
            stroke={channel.color}
            strokeWidth="3.4"
            strokeLinecap="round"
            strokeDasharray={`${progress * 100} 100`}
            opacity={.68}
          />
          <path
            d={channel.path}
            fill="none"
            stroke="#f7ffff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="20 900"
            strokeDashoffset={packet}
            filter="url(#contact-signal-soft)"
            opacity={progress < 1 ? .9 : 0}
          />
          <g transform={`translate(38 ${channel.label === 'CALL' ? 104 : channel.label === 'VISIT' ? 258 : 412}) scale(${nodeReveal})`}>
            <rect x="-15" y="-15" width="30" height="30" rx={channel.label === 'VISIT' ? 15 : 3} fill="#063d48" stroke={channel.color} strokeWidth="2"/>
            <circle r="4.5" fill={channel.color}/>
          </g>
          <text x="65" y={channel.label === 'CALL' ? 109 : channel.label === 'VISIT' ? 263 : 417} fill={channel.color} fontFamily="Courier New, monospace" fontSize="13" letterSpacing="3" opacity={nodeReveal}>{channel.label}</text>
        </g>;
      })}

      <g transform={`translate(850 258) scale(${.78 + destinationPulse * .3})`} filter="url(#contact-signal-soft)">
        <circle r="33" fill="#063d48" fillOpacity=".78" stroke="url(#contact-destination)" strokeWidth="2"/>
        <circle r="15" fill="none" stroke="#f7ffff" strokeOpacity=".72" strokeWidth="2"/>
        <circle r="5.5" fill="#ff704f"/>
      </g>
      <text x="805" y="318" fill="#f7ffff" fontFamily="Courier New, monospace" fontSize="12" letterSpacing="2.2" opacity={.72 * entrance}>NK / DESTINATION</text>
    </svg>
  </AbsoluteFill>;
}
