import {useMemo, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject} from 'react';
import {findAsset, type ExperienceDocument, type ExperienceLayer, type ExperienceSection} from './schema';

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

const pathData = (layer: ExperienceLayer) => {
  const points = layer.points ?? [];
  if (!points.length) return '';
  return points.map((point, index) => `${index ? 'L' : 'M'} ${point.x * layer.transform.width} ${point.y * layer.transform.height}`).join(' ');
};

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
      ? <image href={asset.source} width={width} height={height} preserveAspectRatio="xMidYMid meet" aria-label={asset.alt || asset.name}/>
      : <Placeholder layer={{...layer, text: 'Missing asset'}}/>;
  }
  if (layer.type === 'placeholder') return <Placeholder layer={layer}/>;
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
      content = asset ? `<image href="${escape(asset.source)}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet"/>` : '';
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
