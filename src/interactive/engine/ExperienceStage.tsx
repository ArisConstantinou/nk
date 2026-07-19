import {useMemo, type CSSProperties, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject} from 'react';
import {assetRenderSource, assetVisibleViewBox, DEFAULT_ROUTE_BEND_RADIUS_MM, findAsset, type ExperienceAsset, type ExperienceDocument, type ExperienceLayer, type ExperiencePoint, type ExperienceSection} from './schema';

type StageProps = {
  document: ExperienceDocument;
  section: ExperienceSection;
  className?: string;
  fit?: 'contain' | 'cover';
  viewBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  selectedLayerId?: string | null;
  selectedLayerIds?: string[];
  contentHiddenLayerIds?: string[];
  interactive?: boolean;
  showCalibrationGuides?: boolean;
  children?: ReactNode;
  onLayerPointerDown?: (event: ReactPointerEvent<SVGGElement>, layer: ExperienceLayer) => void;
  onLayerDoubleClick?: (event: ReactMouseEvent<SVGGElement>, layer: ExperienceLayer) => void;
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

// Edge snapping belongs to the drawing interaction, where it can be measured
// against the actual pointer in screen pixels. Rendering must preserve the
// stored endpoint instead of visibly moving it again.
const LINE_EDGE_SNAP_STAGE_PX = .5;

export const getDirectionalLineEndpoints = (
  layer: ExperienceLayer,
  stage?: {width: number; height: number},
) => {
  const points = absolutePathPoints(layer);
  const endpoints = points.length >= 2
    ? {start: points[0], end: points[points.length - 1]}
    : {
        start: {x: 0, y: 0},
        end: {x: layer.transform.width, y: layer.transform.height},
      };
  if (!stage || layer.transform.rotation || layer.transform.skewX || layer.transform.skewY) return endpoints;
  const snapToStageEdge = (point: ExperiencePoint) => {
    const stageX = layer.transform.x + point.x;
    const stageY = layer.transform.y + point.y;
    return {
      x: stageX <= LINE_EDGE_SNAP_STAGE_PX
        ? -layer.transform.x
        : stage.width - stageX <= LINE_EDGE_SNAP_STAGE_PX
          ? stage.width - layer.transform.x
          : point.x,
      y: stageY <= LINE_EDGE_SNAP_STAGE_PX
        ? -layer.transform.y
        : stage.height - stageY <= LINE_EDGE_SNAP_STAGE_PX
          ? stage.height - layer.transform.y
          : point.y,
    };
  };
  return {
    start: snapToStageEdge(endpoints.start),
    end: snapToStageEdge(endpoints.end),
  };
};

export const getArrowHeadPathData = (
  start: ExperiencePoint,
  end: ExperiencePoint,
  strokeWidth: number,
) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  if (length < .01) return '';
  const unitX = dx / length;
  const unitY = dy / length;
  const normalX = -unitY;
  const normalY = unitX;
  const headLength = Math.min(Math.max(18, strokeWidth * 4), length * .45);
  const halfWidth = headLength * .42;
  const base = {
    x: end.x - unitX * headLength,
    y: end.y - unitY * headLength,
  };
  const left = {
    x: base.x + normalX * halfWidth,
    y: base.y + normalY * halfWidth,
  };
  const right = {
    x: base.x - normalX * halfWidth,
    y: base.y - normalY * halfWidth,
  };
  return `M ${end.x} ${end.y} L ${left.x} ${left.y} L ${right.x} ${right.y} Z`;
};

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
    const radius = trim * tangentScale;
    const travel = {x: -incoming.x, y: -incoming.y};
    const sweep = travel.x * outgoing.y - travel.y * outgoing.x >= 0 ? 1 : 0;
    commands.push(`L ${entry.x.toFixed(2)} ${entry.y.toFixed(2)}`);
    commands.push(`A ${radius.toFixed(2)} ${radius.toFixed(2)} 0 0 ${sweep} ${exit.x.toFixed(2)} ${exit.y.toFixed(2)}`);
  }

  const last = points[points.length - 1];
  commands.push(`L ${last.x.toFixed(2)} ${last.y.toFixed(2)}`);
  return commands.join(' ');
};

// The 1920 px stage represents a typical 3.6–4 m room wall. Keeping the
// physical scale here makes a 40 mm chase and a 20 mm conduit read correctly
// against the room instead of looking like oversized illustration strokes.
const MM_TO_STAGE_PX = .52;

const chaseNoiseSeed = (value: string) => (
  [...value].reduce((seed, character) => (seed * 31 + character.charCodeAt(0)) % 997, 17) + 1
);

const wallChaseMetrics = (layer: ExperienceLayer) => {
  const settings = layer.parametric!;
  const style = settings.chaseStyle ?? 'hand-broken';
  const roughness = settings.roughness ?? (style === 'hand-broken' ? .82 : .08);
  const nominalWidth = Math.max(12, settings.widthMm * MM_TO_STAGE_PX);
  const cutWidth = style === 'hand-broken'
    ? nominalWidth * (1.65 + roughness * .55)
    : nominalWidth * 1.16;
  return {
    style,
    roughness,
    cutWidth,
    edgeWidth: style === 'hand-broken'
      ? cutWidth + Math.max(7, cutWidth * .2)
      : cutWidth + Math.max(5, nominalWidth * .22),
    bevelWidth: style === 'hand-broken'
      ? Math.max(9, cutWidth * .78)
      : Math.max(9, nominalWidth * 1.08),
    floorWidth: style === 'hand-broken'
      ? Math.max(7, cutWidth * .48)
      : nominalWidth,
  };
};

const handBrokenChiselMetrics = (
  layer: ExperienceLayer,
  roughness: number,
  cutWidth: number,
  edgeWidth: number,
) => {
  const seed = chaseNoiseSeed(layer.id);
  const chiselShiftX = ((seed % 5) - 2) * 1.35;
  const chiselShiftY = ((Math.floor(seed / 5) % 5) - 2) * 1.35;
  return {
    seed,
    displacement: 4 + roughness * 11,
    chiselDash: `${cutWidth * 2.15} ${cutWidth * 8.1} ${cutWidth * .72} ${cutWidth * 6.3}`,
    chiselDashOffset: -((seed % 101) / 101) * cutWidth * 9,
    chiselTransform: `translate(${chiselShiftX.toFixed(2)} ${chiselShiftY.toFixed(2)})`,
    chiselOuterWidth: edgeWidth + 6 + roughness * 7,
    chiselBrickWidth: cutWidth + 5 + roughness * 5.5,
  };
};

export const getMinimumWallChaseBendRadiusMm = (layer: ExperienceLayer) => {
  if (layer.parametric?.renderer !== 'wall-channel') return 0;
  const {style, roughness, cutWidth, edgeWidth, floorWidth} = wallChaseMetrics(layer);
  const outerWidth = style === 'hand-broken'
    ? handBrokenChiselMetrics(layer, roughness, cutWidth, edgeWidth).chiselOuterWidth
    : edgeWidth;
  const irregularityClearance = style === 'hand-broken' ? 6 + roughness * 8 : 3;
  const minimumRadiusStagePx = outerWidth / 2
    + Math.max(10, floorWidth * .15)
    + irregularityClearance;
  return Math.ceil(minimumRadiusStagePx / MM_TO_STAGE_PX);
};

export const getEffectiveRouteBendRadiusMm = (
  section: ExperienceSection,
  layer: ExperienceLayer,
) => {
  const settings = layer.parametric;
  if (!settings) return DEFAULT_ROUTE_BEND_RADIUS_MM;
  const routeLayers = section.layers.filter(item => item.parametric?.routeId === settings.routeId);
  const requestedRadius = Math.max(...routeLayers.map(
    item => item.parametric?.bendRadiusMm ?? DEFAULT_ROUTE_BEND_RADIUS_MM,
  ));
  const channel = routeLayers.find(item => item.parametric?.renderer === 'wall-channel');
  return channel
    ? Math.max(requestedRadius, getMinimumWallChaseBendRadiusMm(channel))
    : requestedRadius;
};

function ParametricPath({layer, bendRadiusMm}: {layer: ExperienceLayer; bendRadiusMm: number}) {
  const settings = layer.parametric;
  if (!settings) return null;
  const width = settings.widthMm * MM_TO_STAGE_PX;
  if (settings.renderer === 'wall-channel') {
    const depth = settings.depthMm ?? 25;
    const path = roundedPathData(layer, bendRadiusMm);
    const {style, roughness, cutWidth, edgeWidth, bevelWidth, floorWidth} = wallChaseMetrics(layer);
    const safeId = safeSvgId(layer.id);
    const filterId = `ix-channel-depth-${safeId}`;
    if (style === 'hand-broken') {
      const roughFilterId = `ix-channel-rough-${safeId}`;
      const {
        seed,
        displacement,
        chiselDash,
        chiselDashOffset,
        chiselTransform,
        chiselOuterWidth,
        chiselBrickWidth,
      } = handBrokenChiselMetrics(layer, roughness, cutWidth, edgeWidth);
      return <g>
        <defs>
          <filter id={roughFilterId} x="-24%" y="-28%" width="154%" height="166%" colorInterpolationFilters="sRGB">
            <feTurbulence
              type="fractalNoise"
              baseFrequency={`${(.009 + roughness * .007).toFixed(3)} ${(.03 + roughness * .026).toFixed(3)}`}
              numOctaves="2"
              seed={seed}
              result="chaseNoise"
            />
            <feDisplacementMap in="SourceGraphic" in2="chaseNoise" scale={displacement} xChannelSelector="R" yChannelSelector="B" result="roughCut"/>
            <feDropShadow
              in="roughCut"
              dx={Math.max(1.2, depth * .055)}
              dy={Math.max(1.8, depth * .08)}
              stdDeviation={Math.max(.8, depth * .035)}
              floodColor="#211815"
              floodOpacity=".56"
            />
          </filter>
        </defs>
        <path d={path} fill="none" stroke="#c1b7aa" strokeWidth={chiselOuterWidth} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={chiselDash} strokeDashoffset={chiselDashOffset} opacity=".82" filter={`url(#${roughFilterId})`} transform={chiselTransform}/>
        <path d={path} fill="none" stroke="#b9b0a4" strokeWidth={edgeWidth} strokeLinecap="round" strokeLinejoin="round" filter={`url(#${roughFilterId})`}/>
        <path d={path} fill="none" stroke="#a45c40" strokeWidth={chiselBrickWidth} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={chiselDash} strokeDashoffset={chiselDashOffset} opacity=".92" filter={`url(#${roughFilterId})`} transform={chiselTransform}/>
        <path d={path} fill="none" stroke="#9f5539" strokeWidth={cutWidth} strokeLinecap="round" strokeLinejoin="round" filter={`url(#${roughFilterId})`}/>
        <path d={path} fill="none" stroke="#58443a" strokeWidth={bevelWidth} strokeLinecap="round" strokeLinejoin="round" opacity=".9"/>
        <path d={path} fill="none" stroke="#3e302a" strokeWidth={floorWidth} strokeLinecap="round" strokeLinejoin="round" opacity=".82"/>
      </g>;
    }
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
      <path d={path} fill="none" stroke="#c2bbb1" strokeWidth={edgeWidth} strokeLinecap="butt" strokeLinejoin="miter" strokeMiterlimit="3" filter={`url(#${filterId})`}/>
      <path d={path} fill="none" stroke="#9b5b43" strokeWidth={cutWidth + 2} strokeLinecap="butt" strokeLinejoin="miter" strokeMiterlimit="3"/>
      <path d={path} fill="none" stroke="#62483c" strokeWidth={bevelWidth} strokeLinecap="butt" strokeLinejoin="miter" strokeMiterlimit="3"/>
      <path d={path} fill="none" stroke="#3f312c" strokeWidth={floorWidth} strokeLinecap="butt" strokeLinejoin="miter" strokeMiterlimit="3"/>
    </g>;
  }
  const path = roundedPathData(layer, bendRadiusMm);
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

function AssetLayerContent({
  asset,
  layer,
}: {
  asset: ExperienceAsset;
  layer: ExperienceLayer;
}) {
  const {width, height} = layer.transform;
  const integratedObject = layer.description !== 'Frame background asset.';
  const filterId = `ix-object-integration-${safeSvgId(layer.id)}`;
  const isWoodStructure = asset.id === 'asset-wood-structure-no-led';
  const visibleViewBox = assetVisibleViewBox(asset);
  return <g>
    {integratedObject && <defs>
      <filter id={filterId} x="-18%" y="-18%" width="142%" height="148%" colorInterpolationFilters="sRGB">
        <feDropShadow
          dx={Math.max(2, width * .006)}
          dy={Math.max(3, height * .009)}
          stdDeviation={Math.max(2.4, Math.min(11, width * .008))}
          floodColor="#171513"
          floodOpacity=".34"
        />
      </filter>
      {isWoodStructure && <filter id={`${filterId}-contact`} x="-16%" y="-260%" width="132%" height="620%">
        <feGaussianBlur stdDeviation={Math.max(3, Math.min(12, width * .009))}/>
      </filter>}
    </defs>}
    {integratedObject && isWoodStructure && <ellipse
      cx={width / 2}
      cy={height * .975}
      rx={width * .43}
      ry={Math.max(5, height * .018)}
      fill="#171513"
      opacity=".2"
      filter={`url(#${filterId}-contact)`}
    />}
    {visibleViewBox
      ? <g filter={integratedObject ? `url(#${filterId})` : undefined}>
        <svg
          width={width}
          height={height}
          viewBox={`${visibleViewBox.x} ${visibleViewBox.y} ${visibleViewBox.width} ${visibleViewBox.height}`}
          preserveAspectRatio={layer.assetFit === 'cover' ? 'xMidYMid slice' : 'xMidYMid meet'}
          overflow="hidden"
        >
          <image
            href={assetRenderSource(asset)}
            width={visibleViewBox.sourceWidth}
            height={visibleViewBox.sourceHeight}
            aria-label={asset.alt || asset.name}
          />
        </svg>
      </g>
      : <image
        href={assetRenderSource(asset)}
        width={width}
        height={height}
        preserveAspectRatio={layer.assetFit === 'cover' ? 'xMidYMid slice' : 'xMidYMid meet'}
        aria-label={asset.alt || asset.name}
        filter={integratedObject ? `url(#${filterId})` : undefined}
      />}
  </g>;
}

function LayerContent({
  document,
  layer,
  routeBendRadiusMm,
}: {
  document: ExperienceDocument;
  layer: ExperienceLayer;
  routeBendRadiusMm: number;
}) {
  const {width, height} = layer.transform;
  const stroke = layer.stroke || '#39d5e7';
  const strokeWidth = layer.strokeWidth || 5;
  if (layer.type === 'asset') {
    const asset = findAsset(document, layer.assetId);
    return asset
      ? <AssetLayerContent asset={asset} layer={layer}/>
      : <Placeholder layer={{...layer, text: 'Missing asset'}}/>;
  }
  if (layer.type === 'placeholder') return <Placeholder layer={layer}/>;
  if (layer.type === 'parametric-path') return <ParametricPath layer={layer} bendRadiusMm={routeBendRadiusMm}/>;
  if (layer.name === 'Fixed wall background' && layer.type === 'rectangle') return <RoomWall layer={layer}/>;
  if (layer.name === 'Finished floor datum' && layer.type === 'rectangle') return <FinishedFloor layer={layer}/>;
  if (layer.name === 'Room corner datum' && layer.type === 'line') return <RoomCorner layer={layer}/>;
  if (layer.type === 'rectangle') return <rect width={width} height={height} fill={layer.fill || 'transparent'} stroke={stroke} strokeWidth={strokeWidth}/>;
  if (layer.type === 'ellipse') return <ellipse cx={width / 2} cy={height / 2} rx={width / 2} ry={height / 2} fill={layer.fill || 'transparent'} stroke={stroke} strokeWidth={strokeWidth}/>;
  if (layer.type === 'line') {
    const {start, end} = getDirectionalLineEndpoints(layer, document.stage);
    return <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round"/>;
  }
  if (layer.type === 'arrow') {
    const {start, end} = getDirectionalLineEndpoints(layer, document.stage);
    return <g>
      <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round"/>
      <path d={getArrowHeadPathData(start, end, strokeWidth)} fill={stroke}/>
    </g>;
  }
  if (layer.type === 'path') return <path d={pathData(layer)} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>;
  return <text x="0" y={layer.fontSize || 48} fill={layer.fill || '#f4f7f8'} fontSize={layer.fontSize || 48} fontWeight="600">{layer.text || layer.name}</text>;
}

export function ExperienceStage({
  document,
  section,
  className = '',
  fit = 'contain',
  viewBox,
  selectedLayerId,
  selectedLayerIds = [],
  contentHiddenLayerIds = [],
  interactive = false,
  showCalibrationGuides = false,
  children,
  onLayerPointerDown,
  onLayerDoubleClick,
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
      viewBox={viewBox
        ? `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`
        : `0 0 ${document.stage.width} ${document.stage.height}`}
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
      {section.layers.map(layer => layer.visible && (showCalibrationGuides || !layer.calibrationRole) && <g
        key={layer.id}
        data-layer-id={layer.id}
        data-layer-type={layer.type}
        data-selected={(selectedLayerIds.includes(layer.id) || selectedLayerId === layer.id) || undefined}
        transform={layerTransform(layer)}
        opacity={layer.opacity}
        pointerEvents={interactive && !layer.locked ? 'all' : 'none'}
        onPointerDown={event => onLayerPointerDown?.(event, layer)}
        onDoubleClick={event => onLayerDoubleClick?.(event, layer)}
      >
        {!contentHiddenLayerIds.includes(layer.id) && <LayerContent
          document={document}
          layer={layer}
          routeBendRadiusMm={getEffectiveRouteBendRadiusMm(section, layer)}
        />}
      </g>)}
      {children}
    </svg>
  </div>;
}

export function layerSvgMarkup(document: ExperienceDocument, section: ExperienceSection) {
  const escape = (value: string) => value.replace(/[&<>"']/g, character => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'}[character] || character));
  const layers = section.layers.filter(layer => layer.visible && !layer.calibrationRole).map(layer => {
    const {x, y, width, height, rotation, skewX, skewY} = layer.transform;
    const transform = `translate(${x} ${y}) rotate(${rotation} ${width / 2} ${height / 2}) skewX(${skewX}) skewY(${skewY})`;
    const stroke = escape(layer.stroke || '#39d5e7');
    const fill = escape(layer.fill || 'none');
    const strokeWidth = layer.strokeWidth || 5;
    let content = '';
    if (layer.type === 'asset') {
      const asset = findAsset(document, layer.assetId);
      if (asset) {
        const integratedObject = layer.description !== 'Frame background asset.';
        const visibleViewBox = assetVisibleViewBox(asset);
        const filterId = `ix-export-object-integration-${safeSvgId(layer.id)}`;
        const contactFilter = integratedObject && asset.id === 'asset-wood-structure-no-led'
          ? `<filter id="${filterId}-contact" x="-16%" y="-260%" width="132%" height="620%"><feGaussianBlur stdDeviation="${Math.max(3, Math.min(12, width * .009))}"/></filter>`
          : '';
        const contactEllipse = contactFilter
          ? `<ellipse cx="${width / 2}" cy="${height * .975}" rx="${width * .43}" ry="${Math.max(5, height * .018)}" fill="#171513" opacity=".2" filter="url(#${filterId}-contact)"/>`
          : '';
        const integrationFilter = integratedObject
          ? `<filter id="${filterId}" x="-18%" y="-18%" width="142%" height="148%" color-interpolation-filters="sRGB"><feDropShadow dx="${Math.max(2, width * .006)}" dy="${Math.max(3, height * .009)}" stdDeviation="${Math.max(2.4, Math.min(11, width * .008))}" flood-color="#171513" flood-opacity=".34"/></filter>`
          : '';
        const definitions = integrationFilter || contactFilter
          ? `<defs>${integrationFilter}${contactFilter}</defs>`
          : '';
        const imageMarkup = visibleViewBox
          ? `<g${integratedObject ? ` filter="url(#${filterId})"` : ''}><svg width="${width}" height="${height}" viewBox="${visibleViewBox.x} ${visibleViewBox.y} ${visibleViewBox.width} ${visibleViewBox.height}" preserveAspectRatio="${layer.assetFit === 'cover' ? 'xMidYMid slice' : 'xMidYMid meet'}" overflow="hidden"><image href="${escape(assetRenderSource(asset))}" width="${visibleViewBox.sourceWidth}" height="${visibleViewBox.sourceHeight}"/></svg></g>`
          : `<image href="${escape(assetRenderSource(asset))}" width="${width}" height="${height}" preserveAspectRatio="${layer.assetFit === 'cover' ? 'xMidYMid slice' : 'xMidYMid meet'}"${integratedObject ? ` filter="url(#${filterId})"` : ''}/>`;
        content = `${definitions}${contactEllipse}${imageMarkup}`;
      }
    } else if (layer.type === 'parametric-path' && layer.parametric) {
      const pathWidth = layer.parametric.widthMm * MM_TO_STAGE_PX;
      const routeBendRadiusMm = getEffectiveRouteBendRadiusMm(section, layer);
      if (layer.parametric.renderer === 'wall-channel') {
        const path = roundedPathData(layer, routeBendRadiusMm);
        const {style, roughness, cutWidth, edgeWidth, bevelWidth, floorWidth} = wallChaseMetrics(layer);
        if (style === 'hand-broken') {
          const id = safeSvgId(layer.id);
          const filterId = `ix-export-channel-rough-${id}`;
          const {
            seed,
            displacement,
            chiselDash,
            chiselDashOffset,
            chiselTransform,
            chiselOuterWidth,
            chiselBrickWidth,
          } = handBrokenChiselMetrics(layer, roughness, cutWidth, edgeWidth);
          content = `<defs><filter id="${filterId}" x="-24%" y="-28%" width="154%" height="166%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="${(.009 + roughness * .007).toFixed(3)} ${(.03 + roughness * .026).toFixed(3)}" numOctaves="2" seed="${seed}" result="chaseNoise"/><feDisplacementMap in="SourceGraphic" in2="chaseNoise" scale="${displacement}" xChannelSelector="R" yChannelSelector="B" result="roughCut"/><feDropShadow in="roughCut" dx="${Math.max(1.2, (layer.parametric.depthMm ?? 25) * .055)}" dy="${Math.max(1.8, (layer.parametric.depthMm ?? 25) * .08)}" stdDeviation="${Math.max(.8, (layer.parametric.depthMm ?? 25) * .035)}" flood-color="#211815" flood-opacity=".56"/></filter></defs><path d="${path}" fill="none" stroke="#c1b7aa" stroke-width="${chiselOuterWidth}" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="${chiselDash}" stroke-dashoffset="${chiselDashOffset}" opacity=".82" filter="url(#${filterId})" transform="${chiselTransform}"/><path d="${path}" fill="none" stroke="#b9b0a4" stroke-width="${edgeWidth}" stroke-linecap="round" stroke-linejoin="round" filter="url(#${filterId})"/><path d="${path}" fill="none" stroke="#a45c40" stroke-width="${chiselBrickWidth}" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="${chiselDash}" stroke-dashoffset="${chiselDashOffset}" opacity=".92" filter="url(#${filterId})" transform="${chiselTransform}"/><path d="${path}" fill="none" stroke="#9f5539" stroke-width="${cutWidth}" stroke-linecap="round" stroke-linejoin="round" filter="url(#${filterId})"/><path d="${path}" fill="none" stroke="#58443a" stroke-width="${bevelWidth}" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/><path d="${path}" fill="none" stroke="#3e302a" stroke-width="${floorWidth}" stroke-linecap="round" stroke-linejoin="round" opacity=".82"/>`;
        } else {
          content = `<path d="${path}" fill="none" stroke="#c2bbb1" stroke-width="${edgeWidth}" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="3"/><path d="${path}" fill="none" stroke="#9b5b43" stroke-width="${cutWidth + 2}" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="3"/><path d="${path}" fill="none" stroke="#62483c" stroke-width="${bevelWidth}" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="3"/><path d="${path}" fill="none" stroke="#3f312c" stroke-width="${floorWidth}" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="3"/>`;
        }
      } else {
        const path = roundedPathData(layer, routeBendRadiusMm);
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
    else if (layer.type === 'line') {
      const {start, end} = getDirectionalLineEndpoints(layer, document.stage);
      content = `<line x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round"/>`;
    } else if (layer.type === 'arrow') {
      const {start, end} = getDirectionalLineEndpoints(layer, document.stage);
      content = `<line x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round"/><path d="${getArrowHeadPathData(start, end, strokeWidth)}" fill="${stroke}"/>`;
    }
    else if (layer.type === 'path') content = `<path d="${pathData(layer)}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`;
    else content = `<text x="0" y="${layer.fontSize || 48}" fill="${fill === 'none' ? '#f4f7f8' : fill}" font-size="${layer.fontSize || 48}" font-weight="600">${escape(layer.text || layer.name)}</text>`;
    return `<g transform="${transform}" opacity="${layer.opacity}">${content}</g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${document.stage.width}" height="${document.stage.height}" viewBox="0 0 ${document.stage.width} ${document.stage.height}"><rect width="100%" height="100%" fill="${escape(section.background || document.stage.background)}"/>${layers}</svg>`;
}
