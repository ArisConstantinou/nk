import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import type {RouteInteractionProfile} from '../routeInteractions';

type RouteSignalFilmProps = {
  profile: RouteInteractionProfile;
};

const clamp = {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
} as const;

const cornerPath = 'M18 20V7H88 M1112 7h70v13 M1182 12v13 M18 12v13';

export function RouteSignalFilm({profile}: RouteSignalFilmProps) {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = interpolate(frame, [0, .42 * fps], [0, 1], {
    ...clamp,
    easing: Easing.bezier(.16, 1, .3, 1),
  });
  const travel = interpolate(frame, [.12 * fps, 1.35 * fps], [0, 1], {
    ...clamp,
    easing: Easing.bezier(.45, 0, .55, 1),
  });
  const settle = interpolate(frame, [1.22 * fps, 1.72 * fps], [1, 0], {
    ...clamp,
    easing: Easing.in(Easing.cubic),
  });
  const opacity = enter * settle;
  const x = 26 + travel * 1148;
  const dashOffset = 1220 * (1 - travel);
  const pulse = .45 + Math.sin((frame / fps) * Math.PI * 5) * .25;

  const coreLine = <path d="M18 16H1182" fill="none" stroke={profile.accent} strokeWidth="2.4" strokeLinecap="round" strokeDasharray="1220" strokeDashoffset={dashOffset}/>;

  const motif = (() => {
    switch (profile.motion) {
      case 'conductor':
        return <g>
          {[-7, 0, 7].map((offset, index) => <path
            d={`M18 ${16 + offset} C260 ${9 + offset}, 410 ${23 + offset}, 610 ${16 + offset} S970 ${12 + offset},1182 ${16 + offset}`}
            fill="none"
            stroke={index === 1 ? profile.accent : profile.secondary}
            strokeWidth={index === 1 ? 2.5 : 1.15}
            strokeDasharray="42 20"
            strokeDashoffset={-travel * 320 - index * 13}
            opacity={index === 1 ? .95 : .54}
            key={offset}
          />)}
          <circle cx={x} cy="16" r="4.2" fill="#fff"/>
        </g>;
      case 'circuit':
        return <g>
          <path d="M18 16H260l42-9h140l38 9h260l42 9h235l38-9h167" fill="none" stroke={profile.accent} strokeOpacity=".42" strokeWidth="1.5"/>
          <path d="M18 16H260l42-9h140l38 9h260l42 9h235l38-9h167" fill="none" stroke={profile.accent} strokeWidth="2.5" strokeDasharray="1220" strokeDashoffset={dashOffset}/>
          {[302, 442, 480, 742, 977, 1015].map((node, index) => <circle cx={node} cy={index % 3 === 0 ? 7 : index % 3 === 1 ? 16 : 25} r={2 + enter * 1.4} fill={index % 2 ? profile.secondary : profile.accent} key={node}/>)}
        </g>;
      case 'scan':
        return <g>
          <rect x="18" y="8" width="1164" height="16" rx="4" fill={profile.deep} fillOpacity=".32" stroke={profile.accent} strokeOpacity=".34"/>
          <rect x={x - 42} y="5" width="84" height="22" rx="4" fill={profile.accent} opacity=".13"/>
          <path d={`M${x} 4V28`} stroke="#fff" strokeWidth="2.4"/>
          <path d={`M18 16H${x}`} stroke={profile.accent} strokeWidth="2.2"/>
        </g>;
      case 'frame':
        return <g>
          <path d={cornerPath} fill="none" stroke={profile.accent} strokeWidth="2.4" strokeDasharray="240" strokeDashoffset={240 * (1 - enter)}/>
          <path d={`M18 16H${x}`} stroke={profile.secondary} strokeWidth="2"/>
          <path d={`M${x - 10} 8h20v16h-20z`} fill="none" stroke={profile.accent} strokeWidth="2" opacity={travel}/>
        </g>;
      case 'timeline':
        return <g>
          {coreLine}
          {[128, 318, 520, 742, 964, 1130].map((node, index) => {
            const active = interpolate(travel, [index / 6, (index + 1) / 6], [.22, 1], clamp);
            return <g key={node}>
              <circle cx={node} cy="16" r={2 + active * 3} fill={index % 2 ? profile.secondary : profile.accent}/>
              <circle cx={node} cy="16" r={4 + active * 7} fill="none" stroke={profile.accent} strokeOpacity={active * .32}/>
            </g>;
          })}
        </g>;
      case 'radar':
        return <g>
          {coreLine}
          {[0, 1, 2].map(index => {
            const radius = 5 + ((travel * 54 + index * 18) % 54);
            return <circle cx={x} cy="16" r={radius} fill="none" stroke={profile.accent} strokeWidth="1.2" strokeOpacity={Math.max(0, 1 - radius / 58)} key={index}/>;
          })}
          <circle cx={x} cy="16" r="3.8" fill="#fff"/>
        </g>;
      case 'connector':
        return <g>
          <rect x="18" y="7" width="1164" height="18" rx="3" fill={profile.deep} fillOpacity=".4" stroke={profile.accent} strokeOpacity=".35"/>
          {Array.from({length: 18}, (_, index) => {
            const active = travel * 18 > index;
            const left = 33 + index * 63;
            return <path d={`M${left} 10l9 6-9 6h12l9-6-9-6z`} fill={active ? profile.accent : profile.secondary} opacity={active ? .96 : .17} key={left}/>;
          })}
        </g>;
      case 'lighting':
        return <g>
          {coreLine}
          {[180, 400, 620, 840, 1060].map((node, index) => {
            const local = Math.max(0, 1 - Math.abs(travel * 5 - index) * 1.4);
            return <g key={node}>
              <circle cx={node} cy="16" r={3 + local * 7} fill={profile.accent} opacity={.38 + local * .62}/>
              <circle cx={node} cy="16" r={8 + local * 15} fill={profile.accent} opacity={local * .12}/>
            </g>;
          })}
        </g>;
      case 'automation':
        return <g>
          <path d="M18 16H1182" stroke={profile.accent} strokeOpacity=".28"/>
          {Array.from({length: 12}, (_, index) => {
            const active = travel * 12 > index;
            const left = 34 + index * 96;
            return <rect x={left} y={index % 2 ? 10 : 7} width="58" height={index % 2 ? 12 : 18} rx="3" fill={active ? profile.accent : profile.deep} stroke={active ? profile.secondary : profile.accent} opacity={active ? .92 : .3} key={left}/>;
          })}
        </g>;
      case 'security':
        return <g>
          {coreLine}
          <path d={`M${x} 16l-78-14v28z`} fill={profile.accent} opacity=".14"/>
          <path d={`M${x} 2v28`} stroke={profile.secondary} strokeWidth="2"/>
          {[210, 520, 830, 1100].map(node => <circle cx={node} cy="16" r={pulse * 5} fill={profile.secondary} opacity=".7" key={node}/>)}
        </g>;
      case 'diagnostic':
        return <g>
          {Array.from({length: 42}, (_, index) => {
            const left = 18 + index * 28;
            const height = 4 + ((index * 11) % 16);
            const active = travel * 42 > index;
            return <rect x={left} y={16 - height / 2} width="14" height={height} rx="2" fill={active ? profile.accent : profile.secondary} opacity={active ? .96 : .2} key={left}/>;
          })}
        </g>;
    }
  })();

  return <AbsoluteFill style={{overflow: 'hidden', background: 'transparent', opacity}}>
    <svg width="100%" height="100%" viewBox="0 0 1200 32" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <filter id="route-signal-glow" x="-20%" y="-300%" width="140%" height="700%">
          <feGaussianBlur stdDeviation="2.4" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <path d="M0 16H1200" stroke={profile.deep} strokeOpacity=".26"/>
      <g filter="url(#route-signal-glow)">{motif}</g>
    </svg>
  </AbsoluteFill>;
}
