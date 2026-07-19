import {useMemo, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject} from 'react';
import {DEFAULT_ROUTE_BEND_RADIUS_MM, findAsset, type ExperienceDocument, type ExperienceLayer, type ExperiencePoint, type ExperienceSection} from './schema';

type StageProps = {
  document: ExperienceDocument;
  section: ExperienceSection;
  className?: string;
  fit?: 'contain' | 'cover';
  selectedLayerId?: string | null;
  interactive?: boolean;
  children?: ReactNode;
  onLayerPointerDown?: (event: ReactPointerEvent<SVGGElement>, layer: ExperienceLayer) => void;
  onStagePointerDown?: (event: ReactPointerEvent<SVGSVGElement>) => void;
  onStagePointerMove?: (event: ReactPointerEvent<SVGSVGElement>) => void;
  onStagePointerUp?: (event: ReactPointerEvent<SVGSVGElement>) => void;
  onStagePointerCancel?: (event: ReactPointerEvent<SVGSVGElement>) => void;
  svgRef?: RefObject<SVGSVGElement | null>;
};

const layerTransform = (layer: ExperienceLayer) => {
  const {x, y, width, height, rotation, skewX, skewY} = layer.transform;
  const cx = width / 2;
  const cy = height / 2;
  return `translate(${x} ${y}) rotate(${rotation} ${cx} ${cy}) skewX(${skewX}) skewY(${skewY})`;
};

const absolutePathPoints = (layer: ExperienceLayer) => (layer.points ?? []).map(point => ({
  x: point.x * layer.transform.width,
  y: point.y * layer.transform.height,
}));

const linePathData = (points: ExperiencePoint[]) => points
  .map((point, index) => `${index ? 'L' : 'M'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
  .join(' ');

const pathData = (layer: ExperienceLayer) => linePathData(absolutePathPoints(layer));

const roundedPathData = (layer: ExperienceLayer, bendRadiusMm = DEFAULT_ROUTE_BEND_RADIUS_MM) => {
  const points = absolutePathPoints(layer);
  if (points.length < 3) return linePathData(points);
  const requestedRadius = Math.max(0, bendRadiusMm * MM_TO_STAGE_PX);
  const commands = [`M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`];

  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = points[index - 1];
    const corner = points[index];
    const next = points[index + 1];
    const toPrevious = {x: previous.x - corner.x, y: previous.y - corner.y};
    const toNext = {x: next.x - corner.x, y: next.y - corner.y};
    const incomingLength = Math.hypot(toPrevious.x, toPrevious.y);
    const outgoingLength = Math.hypot(toNext.x, toNext.y);
    if (incomingLength < .01 || outgoingLength < .01 || requestedRadius < .01) {
      commands.push(`L ${corner.x.toFixed(2)} ${corner.y.toFixed(2)}`);
      continue;
    }
    const incoming = {x: toPrevious.x / incomingLength, y: toPrevious.y / incomingLength};
    const outgoing = {x: toNext.x / outgoingLength, y: toNext.y / outgoingLength};
    const cosine = Math.max(-1, Math.min(1, incoming.x * outgoing.x + incoming.y * outgoing.y));
    const interiorAngle = Math.acos(cosine);
    const tangentScale = Math.tan(interiorAngle / 2);
    if (!Number.isFinite(tangentScale) || tangentScale < .01 || Math.abs(Math.PI - interiorAngle) < .015) {
      commands.push(`L ${corner.x.toFixed(2)} ${corner.y.toFixed(2)}`);
      continue;
    }
    const trim = Math.min(requestedRadius / tangentScale, incomingLength * .46, outgoingLength * .46);
    if (trim < .35) {
      commands.push(`L ${corner.x.toFixed(2)} ${corner.y.toFixed(2)}`);
      continue;
    }
    const entry = {x: corner.x + incoming.x * trim, y: corner.y + incoming.y * trim};
    const exit = {x: corner.x + outgoing.x * trim, y: corner.y + outgoing.y * trim};
    commands.push(`L ${entry.x.toFixed(2)} ${entry.y.toFixed(2)}`);
    commands.push(`Q ${corner.x.toFixed(2)} ${corner.y.toFixed(2)} ${exit.x.toFixed(2)} ${exit.y.toFixed(2)}`);
  }

  const last = points[points.length - 1];
  commands.push(`L ${last.x.toFixed(2)} ${last.y.toFixed(2)}`);
  return commands.join(' ');
};

// The 1920 px stage represents a typical 3.6–4 m room wall. Keeping the
// physical scale here makes a 40 mm chase and a 20 mm conduit read correctly
// against the room instead of looking like oversized illustration strokes.
const MM_TO_STAGE_PX = .52;

function ParametricPath({layer}: {layer: ExperienceLayer}) {
  const settings = layer.parametric;
  if (!settings) return null;
  const width = settings.widthMm * MM_TO_STAGE_PX;
  if (settings.renderer === 'wall-channel') {
    const depth = settings.depthMm ?? 25;
    const path = roundedPathData(layer, settings.bendRadiusMm ?? DEFAULT_ROUTE_BEND_RADIUS_MM);
    const filterId = `ix-channel-depth-${layer.id}`;
    const cutWidth = Math.max(12, width);
    const cutEdgeWidth = cutWidth + Math.max(4, cutWidth * .18);
    const bevelWidth = Math.max(9, cutWidth - 2);
    const floorWidth = Math.max(7, cutWidth - 6);
    return <g>
      <defs>
        <filter id={filterId} x="-12%" y="-16%" width="130%" height="138%" colorInterpolationFilters="sRGB">
          <feDropShadow
            dx={Math.max(.8, depth * .035)}
            dy={Math.max(1, depth * .05)}
            stdDeviation={Math.max(.6, depth * .025)}
            floodColor="#211d19"
            floodOpacity=".38"
          />
        </filter>
      </defs>
      <path d={path} fill="none" stroke="#d3cec6" strokeWidth={cutEdgeWidth} strokeLinecap="butt" strokeLinejoin="miter" strokeMiterlimit="3" filter={`url(#${filterId})`}/>
      <path d={path} fill="none" stroke="#756e66" strokeWidth={cutWidth + 2} strokeLinecap="butt" strokeLinejoin="miter" strokeMiterlimit="3"/>
      <path d={path} fill="none" stroke="#514b45" strokeWidth={bevelWidth} strokeLinecap="butt" strokeLinejoin="miter" strokeMiterlimit="3"/>
      <path d={path} fill="none" stroke="#625b54" strokeWidth={floorWidth} strokeLinecap="butt" strokeLinejoin="miter" strokeMiterlimit="3"/>
      <path d={path} fill="none" stroke="#89827a" strokeWidth={Math.max(1, floorWidth * .12)} strokeLinecap="butt" strokeLinejoin="miter" strokeMiterlimit="3" opacity=".48" transform="translate(-.7 -.7)"/>
    </g>;
  }
  const path = roundedPathData(layer, settings.bendRadiusMm ?? DEFAULT_ROUTE_BEND_RADIUS_MM);
  const color = settings.color || '#b7bbb7';
  const corrugationPitch = Math.max(1.8, (settings.corrugationMm ?? 4) * MM_TO_STAGE_PX);
  const ribWidth = Math.max(.55, corrugationPitch * .28);
  const ribGap = Math.max(1.1, corrugationPitch - ribWidth);
  const filterId = `ix-conduit-shadow-${layer.id}`;
  return <g>
    <defs>
      <filter id={filterId} x="-18%" y="-24%" width="142%" height="154%" colorInterpolationFilters="sRGB">
        <feDropShadow dx="1.4" dy="2.2" stdDeviation="1.3" floodColor="#17191a" floodOpacity=".48"/>
      </filter>
    </defs>
    <path d={path} fill="none" stroke="#515754" strokeWidth={width + 3} strokeLinecap="round" strokeLinejoin="round" filter={`url(#${filterId})`}/>
    <path d={path} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round"/>
    <path d={path} fill="none" stroke="#5d6460" strokeWidth={width + 1.2} strokeLinecap="butt" strokeLinejoin="round" strokeDasharray={`${ribWidth} ${ribGap}`} opacity=".78"/>
    <path d={path} fill="none" stroke="#eef0ed" strokeWidth={Math.max(1, width * .16)} strokeLinecap="round" strokeLinejoin="round" opacity=".42" transform="translate(-.8 -.9)"/>
    <path d={path} fill="none" stroke="#d7dad6" strokeWidth={Math.max(.8, width * .42)} strokeLinecap="butt" strokeLinejoin="round" strokeDasharray={`${Math.max(.4, ribWidth * .55)} ${Math.max(1.25, corrugationPitch - Math.max(.4, ribWidth * .55))}`} strokeDashoffset={corrugationPitch * .12} opacity=".34" transform="translate(-.45 -.55)"/>
  </g>;
}

const safeSvgId = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '-');

function RoomWall({layer}: {layer: ExperienceLayer}) {
  const {width, height} = layer.transform;
  const id = safeSvgId(layer.id);
  const wallLightId = `ix-room-wall-light-${id}`;
  const cornerShadeId = `ix-room-corner-shade-${id}`;
  const cornerX = width * (166 / 1920);
  return <g>
    <defs>
      <linearGradient id={wallLightId} x1="0" y1="0" x2=".15" y2="1">
        <stop offset="0" stopColor="#eeeae3"/>
        <stop offset=".42" stopColor={layer.fill || '#dedbd4'}/>
        <stop offset="1" stopColor="#d5d1ca"/>
      </linearGradient>
      <linearGradient id={cornerShadeId} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#6f6a63" stopOpacity=".24"/>
        <stop offset=".3" stopColor="#817b73" stopOpacity=".11"/>
        <stop offset="1" stopColor="#817b73" stopOpacity="0"/>
      </linearGradient>
    </defs>
    <rect width={width} height={height} fill={`url(#${wallLightId})`}/>
    <rect width={cornerX} height={height} fill="#cbc7bf" opacity=".5"/>
    <rect x={cornerX} width={Math.max(26, width * .022)} height={height} fill={`url(#${cornerShadeId})`}/>
    <line x1={cornerX} y1="0" x2={cornerX} y2={height} stroke="#a9a39a" strokeWidth="2" opacity=".65"/>
    <line x1="0" y1={height - 2} x2={width} y2={height - 2} stroke="#c3beb6" strokeWidth="4" opacity=".72"/>
  </g>;
}

function FinishedFloor({layer}: {layer: ExperienceLayer}) {
  const {width, height} = layer.transform;
  const id = safeSvgId(layer.id);
  const floorId = `ix-room-floor-${id}`;
  return <g>
    <defs>
      <linearGradient id={floorId} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#bbb7b0"/>
        <stop offset=".2" stopColor={layer.fill || '#aaa69f'}/>
        <stop offset="1" stopColor="#97938d"/>
      </linearGradient>
    </defs>
    <rect width={width} height={height} fill={`url(#${floorId})`}/>
    <rect width={width} height={Math.max(12, height * .13)} fill="#d2cec6" opacity=".92"/>
    <line x1="0" y1={Math.max(12, height * .13)} x2={width} y2={Math.max(12, height * .13)} stroke="#88847e" strokeWidth="3" opacity=".72"/>
    <line x1="0" y1={height * .7} x2={width} y2={height * .7} stroke="#77736d" strokeWidth="2" opacity=".1"/>
  </g>;
}

function RoomCorner({layer}: {layer: ExperienceLayer}) {
  const {height} = layer.transform;
  const width = layer.strokeWidth || 8;
  return <g>
    <line x1="0" y1="0" x2="0" y2={height} stroke="#716c65" strokeWidth={width * 1.7} opacity=".12" transform="translate(5 0)"/>
    <line x1="0" y1="0" x2="0" y2={height} stroke={layer.stroke || '#aaa49c'} strokeWidth={Math.max(3, width * .55)} opacity=".82"/>
    <line x1="0" y1="0" x2="0" y2={height} stroke="#f1eee8" strokeWidth="1.5" opacity=".52" transform="translate(-2 0)"/>
  </g>;
}

function Placeholder({layer}: {layer: ExperienceLayer}) {
  const {width, height} = layer.transform;
  const label = layer.text || layer.name;
  return <g>
    <rect width={width} height={height} rx={Math.min(width, height) * 0.035} fill={layer.fill || 'rgba(15,31,42,.64)'} stroke={layer.stroke || '#48d7ea'} strokeWidth={layer.strokeWidth || 4} strokeDasharray="18 12"/>
    <path d={`M 0 ${height * .73} C ${width * .23} ${height * .63}, ${width * .34} ${height * .84}, ${width * .56} ${height * .69} S ${width * .83} ${height * .72}, ${width} ${height * .59}`} fill="none" stroke={layer.stroke || '#48d7ea'} strokeWidth={Math.max(3, (layer.strokeWidth || 4) * .65)} opacity=".34"/>
    <text x={width / 2} y={height / 2 - 10} textAnchor="middle" dominantBaseline="middle" fill="#f5f8fa" fontSize={Math.max(24, Math.min(64, width / 12))} fontWeight="700">{label}</text>
    <text x={width / 2} y={height / 2 + 48} textAnchor="middle" dominantBaseline="middle" fill="#9eb2bd" fontSize={Math.max(18, Math.min(30, width / 22))}>PLACEHOLDER · REPLACE FROM ASSET LIBRARY</text>
  </g>;
}

function LayerContent({document, layer}: {document: ExperienceDocument; layer: ExperienceLayer}) {
  const {width, height} = layer.transform;
  const stroke = layer.stroke || '#39d5e7';
  const strokeWidth = layer.strokeWidth || 5;
  if (layer.type === 'asset') {
    const asset = findAsset(document, layer.assetId);
    return asset
      ? <image href={asset.source} width={width} height={height} preserveAspectRatio={layer.assetFit === 'cover' ? 'xMidYMid slice' : 'xMidYMid meet'} aria-label={asset.alt || asset.name}/>
      : <Placeholder layer={{...layer, text: 'Missing asset'}}/>;
  }
  if (layer.type === 'placeholder') return <Placeholder layer={layer}/>;
  if (layer.type === 'parametric-path') return <ParametricPath layer={layer}/>;
  if (layer.name === 'Fixed wall background' && layer.type === 'rectangle') return <RoomWall layer={layer}/>;
  if (layer.name === 'Finished floor datum' && layer.type === 'rectangle') return <FinishedFloor layer={layer}/>;
  if (layer.name === 'Room corner datum' && layer.type === 'line') return <RoomCorner layer={layer}/>;
  if (layer.type === 'rectangle') return <rect width={width} height={height} fill={layer.fill || 'transparent'} stroke={stroke} strokeWidth={strokeWidth}/>;
  if (layer.type === 'ellipse') return <ellipse cx={width / 2} cy={height / 2} rx={width / 2} ry={height / 2} fill={layer.fill || 'transparent'} stroke={stroke} strokeWidth={strokeWidth}/>;
  if (layer.type === 'line') return <line x1="0" y1="0" x2={width} y2={height} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round"/>;
  if (layer.type === 'arrow') return <g><line x1="0" y1="0" x2={width} y2={height} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round"/><path d={`M ${width} ${height} L ${width - 32} ${height - 8} L ${width - 10} ${height - 34} Z`} fill={stroke}/></g>;
  if (layer.type === 'path') return <path d={pathData(layer)} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>;
  return <text x="0" y={layer.fontSize || 48} fill={layer.fill || '#f4f7f8'} fontSize={layer.fontSize || 48} fontWeight="600">{layer.text || layer.name}</text>;
}

export function ExperienceStage({
  document,
  section,
  className = '',
  fit = 'contain',
  selectedLayerId,
  interactive = false,
  children,
  onLayerPointerDown,
  onStagePointerDown,
  onStagePointerMove,
  onStagePointerUp,
  onStagePointerCancel,
  svgRef,
}: StageProps) {
  const labelId = useMemo(() => `experience-stage-${section.id}`, [section.id]);
  const style = {'--stage-background': section.background || document.stage.background} as CSSProperties;
  return <div className={`ix-stage-frame ix-stage-frame--${fit} ${className}`.trim()} style={style}>
    <svg
      ref={svgRef}
      className="ix-stage"
      viewBox={`0 0 ${document.stage.width} ${document.stage.height}`}
      preserveAspectRatio={fit === 'cover' ? 'xMidYMid slice' : 'xMidYMid meet'}
      role="img"
      aria-labelledby={labelId}
      onPointerDown={onStagePointerDown}
      onPointerMove={onStagePointerMove}
      onPointerUp={onStagePointerUp}
      onPointerCancel={onStagePointerCancel}
    >
      <title id={labelId}>{section.name}</title>
      <defs>
        <filter id="ix-stage-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="12" stdDeviation="14" floodOpacity=".18"/>
        </filter>
      </defs>
      <rect width={document.stage.width} height={document.stage.height} fill={section.background || document.stage.background}/>
      {section.layers.map(layer => layer.visible && <g
        key={layer.id}
        data-layer-id={layer.id}
        data-layer-type={layer.type}
        data-selected={selectedLayerId === layer.id || undefined}
        transform={layerTransform(layer)}
        opacity={layer.opacity}
        pointerEvents={interactive && !layer.locked ? 'all' : 'none'}
        onPointerDown={event => onLayerPointerDown?.(event, layer)}
      >
        <LayerContent document={document} layer={layer}/>
      </g>)}
      {children}
    </svg>
  </div>;
}

export function layerSvgMarkup(document: ExperienceDocument, section: ExperienceSection) {
  const escape = (value: string) => value.replace(/[&<>"']/g, character => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'}[character] || character));
  const layers = section.layers.filter(layer => layer.visible).map(layer => {
    const {x, y, width, height, rotation, skewX, skewY} = layer.transform;
    const transform = `translate(${x} ${y}) rotate(${rotation} ${width / 2} ${height / 2}) skewX(${skewX}) skewY(${skewY})`;
    const stroke = escape(layer.stroke || '#39d5e7');
    const fill = escape(layer.fill || 'none');
    const strokeWidth = layer.strokeWidth || 5;
    let content = '';
    if (layer.type === 'asset') {
      const asset = findAsset(document, layer.assetId);
      content = asset ? `<image href="${escape(asset.source)}" width="${width}" height="${height}" preserveAspectRatio="${layer.assetFit === 'cover' ? 'xMidYMid slice' : 'xMidYMid meet'}"/>` : '';
    } else if (layer.type === 'parametric-path' && layer.parametric) {
      const pathWidth = layer.parametric.widthMm * MM_TO_STAGE_PX;
      if (layer.parametric.renderer === 'wall-channel') {
        const path = roundedPathData(layer, layer.parametric.bendRadiusMm ?? DEFAULT_ROUTE_BEND_RADIUS_MM);
        const cutWidth = Math.max(10, pathWidth);
        const cutEdgeWidth = cutWidth + Math.max(4, cutWidth * .18);
        const bevelWidth = Math.max(9, cutWidth - 2);
        const floorWidth = Math.max(7, cutWidth - 6);
        content = `<path d="${path}" fill="none" stroke="#d3cec6" stroke-width="${cutEdgeWidth}" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="3"/><path d="${path}" fill="none" stroke="#756e66" stroke-width="${cutWidth + 2}" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="3"/><path d="${path}" fill="none" stroke="#514b45" stroke-width="${bevelWidth}" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="3"/><path d="${path}" fill="none" stroke="#625b54" stroke-width="${floorWidth}" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="3"/><path d="${path}" fill="none" stroke="#89827a" stroke-width="${Math.max(1, floorWidth * .12)}" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="3" opacity=".48" transform="translate(-.7 -.7)"/>`;
      } else {
        const path = roundedPathData(layer, layer.parametric.bendRadiusMm ?? DEFAULT_ROUTE_BEND_RADIUS_MM);
        const corrugationPitch = Math.max(1.8, (layer.parametric.corrugationMm ?? 4) * MM_TO_STAGE_PX);
        const ribWidth = Math.max(.55, corrugationPitch * .28);
        const ribGap = Math.max(1.1, corrugationPitch - ribWidth);
        const highlightRibWidth = Math.max(.4, ribWidth * .55);
        content = `<path d="${path}" fill="none" stroke="#515754" stroke-width="${pathWidth + 3}" stroke-linecap="round" stroke-linejoin="round"/><path d="${path}" fill="none" stroke="${escape(layer.parametric.color || '#b7bbb7')}" stroke-width="${pathWidth}" stroke-linecap="round" stroke-linejoin="round"/><path d="${path}" fill="none" stroke="#5d6460" stroke-width="${pathWidth + 1.2}" stroke-linecap="butt" stroke-linejoin="round" stroke-dasharray="${ribWidth} ${ribGap}" opacity=".78"/><path d="${path}" fill="none" stroke="#eef0ed" stroke-width="${Math.max(1, pathWidth * .16)}" stroke-linecap="round" stroke-linejoin="round" opacity=".42" transform="translate(-.8 -.9)"/><path d="${path}" fill="none" stroke="#d7dad6" stroke-width="${Math.max(.8, pathWidth * .42)}" stroke-linecap="butt" stroke-linejoin="round" stroke-dasharray="${highlightRibWidth} ${Math.max(1.25, corrugationPitch - highlightRibWidth)}" stroke-dashoffset="${corrugationPitch * .12}" opacity=".34" transform="translate(-.45 -.55)"/>`;
      }
    } else if (layer.name === 'Fixed wall background' && layer.type === 'rectangle') {
      const id = safeSvgId(layer.id);
      const cornerX = width * (166 / 1920);
      content = `<defs><linearGradient id="ix-export-wall-${id}" x1="0" y1="0" x2=".15" y2="1"><stop offset="0" stop-color="#eeeae3"/><stop offset=".42" stop-color="${escape(layer.fill || '#dedbd4')}"/><stop offset="1" stop-color="#d5d1ca"/></linearGradient><linearGradient id="ix-export-corner-${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6f6a63" stop-opacity=".24"/><stop offset=".3" stop-color="#817b73" stop-opacity=".11"/><stop offset="1" stop-color="#817b73" stop-opacity="0"/></linearGradient></defs><rect width="${width}" height="${height}" fill="url(#ix-export-wall-${id})"/><rect width="${cornerX}" height="${height}" fill="#cbc7bf" opacity=".5"/><rect x="${cornerX}" width="${Math.max(26, width * .022)}" height="${height}" fill="url(#ix-export-corner-${id})"/><line x1="${cornerX}" y1="0" x2="${cornerX}" y2="${height}" stroke="#a9a39a" stroke-width="2" opacity=".65"/><line x1="0" y1="${height - 2}" x2="${width}" y2="${height - 2}" stroke="#c3beb6" stroke-width="4" opacity=".72"/>`;
    } else if (layer.name === 'Finished floor datum' && layer.type === 'rectangle') {
      const id = safeSvgId(layer.id);
      const skirtingHeight = Math.max(12, height * .13);
      content = `<defs><linearGradient id="ix-export-floor-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bbb7b0"/><stop offset=".2" stop-color="${escape(layer.fill || '#aaa69f')}"/><stop offset="1" stop-color="#97938d"/></linearGradient></defs><rect width="${width}" height="${height}" fill="url(#ix-export-floor-${id})"/><rect width="${width}" height="${skirtingHeight}" fill="#d2cec6" opacity=".92"/><line x1="0" y1="${skirtingHeight}" x2="${width}" y2="${skirtingHeight}" stroke="#88847e" stroke-width="3" opacity=".72"/><line x1="0" y1="${height * .7}" x2="${width}" y2="${height * .7}" stroke="#77736d" stroke-width="2" opacity=".1"/>`;
    } else if (layer.name === 'Room corner datum' && layer.type === 'line') {
      const cornerWidth = layer.strokeWidth || 8;
      content = `<line x1="0" y1="0" x2="0" y2="${height}" stroke="#716c65" stroke-width="${cornerWidth * 1.7}" opacity=".12" transform="translate(5 0)"/><line x1="0" y1="0" x2="0" y2="${height}" stroke="${stroke}" stroke-width="${Math.max(3, cornerWidth * .55)}" opacity=".82"/><line x1="0" y1="0" x2="0" y2="${height}" stroke="#f1eee8" stroke-width="1.5" opacity=".52" transform="translate(-2 0)"/>`;
    } else if (layer.type === 'rectangle' || layer.type === 'placeholder') content = `<rect width="${width}" height="${height}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
    else if (layer.type === 'ellipse') content = `<ellipse cx="${width / 2}" cy="${height / 2}" rx="${width / 2}" ry="${height / 2}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
    else if (layer.type === 'line') content = `<line x1="0" y1="0" x2="${width}" y2="${height}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round"/>`;
    else if (layer.type === 'arrow') content = `<line x1="0" y1="0" x2="${width}" y2="${height}" stroke="${stroke}" stroke-width="${strokeWidth}"/><path d="M ${width} ${height} L ${width - 32} ${height - 8} L ${width - 10} ${height - 34} Z" fill="${stroke}"/>`;
    else if (layer.type === 'path') content = `<path d="${pathData(layer)}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`;
    else content = `<text x="0" y="${layer.fontSize || 48}" fill="${fill === 'none' ? '#f4f7f8' : fill}" font-size="${layer.fontSize || 48}" font-weight="600">${escape(layer.text || layer.name)}</text>`;
    return `<g transform="${transform}" opacity="${layer.opacity}">${content}</g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${document.stage.width}" height="${document.stage.height}" viewBox="0 0 ${document.stage.width} ${document.stage.height}"><rect width="100%" height="100%" fill="${escape(section.background || document.stage.background)}"/>${layers}</svg>`;
}
