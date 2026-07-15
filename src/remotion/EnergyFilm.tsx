import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';

const nodes = [
  {x: 14, y: 66, d: 0}, {x: 32, y: 41, d: 7}, {x: 52, y: 55, d: 14},
  {x: 70, y: 31, d: 21}, {x: 86, y: 50, d: 28},
];

export function EnergyFilm() {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 18, stiffness: 70}});
  const travel = interpolate(frame, [0, 180], [-12, 112], {extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)});
  const rotation = interpolate(frame, [0, 180], [-8, 8]);

  return <AbsoluteFill style={{overflow: 'hidden', background: 'transparent'}}>
    <div style={{position:'absolute', inset:'10% 4%', transform:`perspective(800px) rotateX(58deg) rotateZ(${rotation}deg) scale(${0.86 + enter * .14})`, transformOrigin:'50% 55%'}}>
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="wire" x1="0" x2="1"><stop stopColor="#f2e7d5" stopOpacity=".15"/><stop offset=".48" stopColor="#d97b43"/><stop offset="1" stopColor="#d5ff57" stopOpacity=".35"/></linearGradient>
          <filter id="glow"><feGaussianBlur stdDeviation="1.1" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        <path d="M4 76 C22 76 20 42 34 42 S46 60 56 54 S67 29 76 32 S83 50 96 48" fill="none" stroke="url(#wire)" strokeWidth=".55"/>
        <path d="M5 84 L28 84 L39 63 L62 63 L73 42 L95 42" fill="none" stroke="#fff" strokeOpacity=".18" strokeWidth=".25"/>
        {nodes.map((n, i) => {
          const reveal = spring({frame: frame - n.d, fps, config:{damping: 14}});
          const pulse = .72 + Math.sin((frame - n.d) / 12) * .16;
          return <g key={i} transform={`translate(${n.x} ${n.y}) scale(${Math.max(0, reveal)})`}>
            <circle r="4.6" fill="#161813" stroke="#f2e7d5" strokeOpacity=".2" strokeWidth=".25"/>
            <circle r={1.4 + pulse * .5} fill={i === 3 ? '#d5ff57' : '#d97b43'} filter="url(#glow)"/>
          </g>;
        })}
        <circle cx={travel} cy="52" r="1.2" fill="#fff" filter="url(#glow)"/>
      </svg>
    </div>
    <div style={{position:'absolute', right:'7%', bottom:'8%', color:'#f2e7d5', fontFamily:'Arial, sans-serif', textTransform:'uppercase', letterSpacing:'.24em', fontSize:12, opacity:.58}}>Energy · light · control</div>
  </AbsoluteFill>;
}
