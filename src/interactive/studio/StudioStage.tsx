import {useEffect, useMemo, useRef, useState, type DragEvent, type KeyboardEvent, type PointerEvent as ReactPointerEvent} from 'react';
import {ExperienceStage} from '../engine/ExperienceStage';
import {
  createStableId,
  createTransform,
  normalizeDrawing,
  type ExperienceDocument,
  type ExperienceLayer,
  type ExperiencePoint,
  type ExperienceSection,
  type ExperienceTool,
  type LayerTransform,
} from '../engine/schema';

type TransformInteraction = {
  kind: 'move' | 'resize' | 'rotate' | 'skew';
  layerId: string;
  start: ExperiencePoint;
  initial: LayerTransform;
};

type DrawInteraction = {
  kind: 'draw';
  tool: Exclude<ExperienceTool, 'select' | 'text'>;
  start: ExperiencePoint;
  points: ExperiencePoint[];
};

type Interaction = TransformInteraction | DrawInteraction;

type Props = {
  document: ExperienceDocument;
  section: ExperienceSection;
  tool: ExperienceTool;
  selectedLayerId: string | null;
  onSelectLayer: (id: string | null) => void;
  onAddLayer: (layer: ExperienceLayer) => void;
  onUpdateLayer: (id: string, patch: Partial<ExperienceLayer>) => void;
  onRemoveLayer: (id: string) => void;
};

const pointFromEvent = (event: Pick<PointerEvent, 'clientX' | 'clientY'>, svg: SVGSVGElement) => {
  const point = svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  const matrix = svg.getScreenCTM()?.inverse();
  const transformed = matrix ? point.matrixTransform(matrix) : point;
  return {x: transformed.x, y: transformed.y};
};

const drawingTransform = (start: ExperiencePoint, end: ExperiencePoint) => ({
  x: Math.min(start.x, end.x),
  y: Math.min(start.y, end.y),
  width: Math.max(4, Math.abs(end.x - start.x)),
  height: Math.max(4, Math.abs(end.y - start.y)),
});

const makeShapeLayer = (tool: DrawInteraction['tool'], start: ExperiencePoint, end: ExperiencePoint, points: ExperiencePoint[]): ExperienceLayer => {
  if (tool === 'freehand') {
    const normalized = normalizeDrawing(points);
    return {
      id: createStableId('layer'),
      name: 'Freehand mockup',
      type: 'path',
      visible: true,
      locked: false,
      opacity: 1,
      transform: normalized.transform,
      points: normalized.points,
      fill: 'none',
      stroke: '#ef6f4d',
      strokeWidth: 8,
    };
  }
  const transform = createTransform(drawingTransform(start, end));
  return {
    id: createStableId('layer'),
    name: tool === 'rectangle' ? 'Rectangle mockup' : tool === 'ellipse' ? 'Ellipse mockup' : tool === 'line' ? 'Line mockup' : 'Arrow mockup',
    type: tool,
    visible: true,
    locked: false,
    opacity: 1,
    transform,
    fill: tool === 'rectangle' || tool === 'ellipse' ? 'rgba(239,111,77,.08)' : 'none',
    stroke: '#ef6f4d',
    strokeWidth: 8,
  };
};

export function StudioStage({document, section, tool, selectedLayerId, onSelectLayer, onAddLayer, onUpdateLayer, onRemoveLayer}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const interaction = useRef<Interaction | null>(null);
  const [draftLayer, setDraftLayer] = useState<ExperienceLayer | null>(null);
  const selected = useMemo(() => section.layers.find(layer => layer.id === selectedLayerId) ?? null, [section.layers, selectedLayerId]);

  const startTransform = (event: ReactPointerEvent<SVGElement>, kind: TransformInteraction['kind'], layer: ExperienceLayer) => {
    if (layer.locked || !svgRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    onSelectLayer(layer.id);
    rootRef.current?.focus();
    interaction.current = {
      kind,
      layerId: layer.id,
      start: pointFromEvent(event.nativeEvent, svgRef.current),
      initial: {...layer.transform},
    };
    svgRef.current.setPointerCapture(event.pointerId);
  };

  const onLayerPointerDown = (event: ReactPointerEvent<SVGGElement>, layer: ExperienceLayer) => {
    if (tool !== 'select') return;
    event.stopPropagation();
    onSelectLayer(layer.id);
    rootRef.current?.focus();
    startTransform(event, 'move', layer);
  };

  const onStagePointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!svgRef.current || (tool === 'select' && event.target !== event.currentTarget && (event.target as Element).closest('[data-layer-id]'))) return;
    rootRef.current?.focus();
    const point = pointFromEvent(event.nativeEvent, svgRef.current);
    if (tool === 'select') {
      onSelectLayer(null);
      return;
    }
    if (tool === 'text') {
      const next: ExperienceLayer = {
        id: createStableId('layer'),
        name: 'Text note',
        type: 'text',
        visible: true,
        locked: false,
        opacity: 1,
        transform: createTransform({x: point.x, y: point.y, width: 520, height: 90}),
        fill: '#ef6f4d',
        stroke: '#ef6f4d',
        strokeWidth: 0,
        text: 'Text note',
        fontSize: 48,
      };
      onAddLayer(next);
      onSelectLayer(next.id);
      return;
    }
    interaction.current = {kind: 'draw', tool, start: point, points: [point]};
    const next = makeShapeLayer(tool, point, {...point, x: point.x + 4, y: point.y + 4}, [point, point]);
    setDraftLayer(next);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onStagePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const active = interaction.current;
    if (!active || !svgRef.current) return;
    const point = pointFromEvent(event.nativeEvent, svgRef.current);
    if (active.kind === 'draw') {
      if (active.tool === 'freehand') {
        const previous = active.points[active.points.length - 1];
        if (Math.hypot(point.x - previous.x, point.y - previous.y) > 3) active.points.push(point);
      }
      setDraftLayer(makeShapeLayer(active.tool, active.start, point, active.tool === 'freehand' ? active.points : [active.start, point]));
      return;
    }
    const dx = point.x - active.start.x;
    const dy = point.y - active.start.y;
    if (active.kind === 'move') {
      onUpdateLayer(active.layerId, {transform: {...active.initial, x: active.initial.x + dx, y: active.initial.y + dy}});
    } else if (active.kind === 'resize') {
      onUpdateLayer(active.layerId, {transform: {...active.initial, width: Math.max(20, active.initial.width + dx), height: Math.max(20, active.initial.height + dy)}});
    } else if (active.kind === 'skew') {
      onUpdateLayer(active.layerId, {transform: {...active.initial, skewX: Math.max(-60, Math.min(60, active.initial.skewX + dx / 8)), skewY: Math.max(-60, Math.min(60, active.initial.skewY + dy / 8))}});
    } else {
      const center = {x: active.initial.x + active.initial.width / 2, y: active.initial.y + active.initial.height / 2};
      const startAngle = Math.atan2(active.start.y - center.y, active.start.x - center.x);
      const angle = Math.atan2(point.y - center.y, point.x - center.x);
      onUpdateLayer(active.layerId, {transform: {...active.initial, rotation: active.initial.rotation + (angle - startAngle) * 180 / Math.PI}});
    }
  };

  const finishInteraction = (event: ReactPointerEvent<SVGSVGElement>) => {
    const active = interaction.current;
    interaction.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (active?.kind === 'draw' && draftLayer) {
      onAddLayer(draftLayer);
      onSelectLayer(draftLayer.id);
    }
    setDraftLayer(null);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!selected || selected.locked) return;
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      onRemoveLayer(selected.id);
      return;
    }
    const direction = {ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1]}[event.key] as number[] | undefined;
    if (!direction) return;
    event.preventDefault();
    const amount = event.shiftKey ? 10 : 1;
    onUpdateLayer(selected.id, {transform: {...selected.transform, x: selected.transform.x + direction[0] * amount, y: selected.transform.y + direction[1] * amount}});
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!svgRef.current) return;
    try {
      const payload = JSON.parse(event.dataTransfer.getData('application/x-nk-experience-asset')) as {id: string; name: string};
      if (!payload.id) return;
      const point = pointFromEvent(event.nativeEvent, svgRef.current);
      const next: ExperienceLayer = {
        id: createStableId('layer'),
        name: payload.name || 'Asset',
        type: 'asset',
        assetId: payload.id,
        visible: true,
        locked: false,
        opacity: 1,
        transform: createTransform({x: point.x - 300, y: point.y - 180, width: 600, height: 360}),
      };
      onAddLayer(next);
      onSelectLayer(next.id);
    } catch {
      // Ignore unrelated browser drags.
    }
  };

  useEffect(() => {
    if (selectedLayerId && !section.layers.some(layer => layer.id === selectedLayerId)) onSelectLayer(null);
  }, [onSelectLayer, section.layers, selectedLayerId]);

  const overlay = selected && selected.visible ? <g
    transform={`translate(${selected.transform.x} ${selected.transform.y}) rotate(${selected.transform.rotation} ${selected.transform.width / 2} ${selected.transform.height / 2}) skewX(${selected.transform.skewX}) skewY(${selected.transform.skewY})`}
    className="ix-gizmo"
  >
    <rect width={selected.transform.width} height={selected.transform.height} fill="none" stroke="#43e4f2" strokeWidth="4" vectorEffect="non-scaling-stroke" pointerEvents="none"/>
    <line x1={selected.transform.width / 2} y1="0" x2={selected.transform.width / 2} y2="-72" stroke="#43e4f2" strokeWidth="3" vectorEffect="non-scaling-stroke"/>
    <circle cx={selected.transform.width / 2} cy="-82" r="17" fill="#07131c" stroke="#43e4f2" strokeWidth="4" vectorEffect="non-scaling-stroke" className="ix-gizmo__handle ix-gizmo__handle--rotate" onPointerDown={event => startTransform(event, 'rotate', selected)}/>
    <rect x={selected.transform.width - 20} y={selected.transform.height - 20} width="40" height="40" rx="5" fill="#43e4f2" stroke="#07131c" strokeWidth="4" vectorEffect="non-scaling-stroke" className="ix-gizmo__handle ix-gizmo__handle--resize" onPointerDown={event => startTransform(event, 'resize', selected)}/>
    <path d="M -30 -18 L -12 -36 L 6 -18 L -12 0 Z" fill="#ef8b5b" stroke="#07131c" strokeWidth="4" vectorEffect="non-scaling-stroke" className="ix-gizmo__handle ix-gizmo__handle--skew" onPointerDown={event => startTransform(event, 'skew', selected)}/>
  </g> : null;

  const draftOverlay = draftLayer ? <g pointerEvents="none" opacity=".8">
    {draftLayer.type === 'path'
      ? <path d={(draftLayer.points ?? []).map((point, index) => `${index ? 'L' : 'M'} ${draftLayer.transform.x + point.x * draftLayer.transform.width} ${draftLayer.transform.y + point.y * draftLayer.transform.height}`).join(' ')} fill="none" stroke="#ef6f4d" strokeWidth="8" strokeLinecap="round"/>
      : draftLayer.type === 'ellipse'
        ? <ellipse cx={draftLayer.transform.x + draftLayer.transform.width / 2} cy={draftLayer.transform.y + draftLayer.transform.height / 2} rx={draftLayer.transform.width / 2} ry={draftLayer.transform.height / 2} fill="rgba(239,111,77,.08)" stroke="#ef6f4d" strokeWidth="8"/>
        : draftLayer.type === 'rectangle'
          ? <rect x={draftLayer.transform.x} y={draftLayer.transform.y} width={draftLayer.transform.width} height={draftLayer.transform.height} fill="rgba(239,111,77,.08)" stroke="#ef6f4d" strokeWidth="8"/>
          : <line x1={draftLayer.transform.x} y1={draftLayer.transform.y} x2={draftLayer.transform.x + draftLayer.transform.width} y2={draftLayer.transform.y + draftLayer.transform.height} stroke="#ef6f4d" strokeWidth="8"/>}
  </g> : null;

  return <div
    ref={rootRef}
    className={`ix-studio-stage ix-studio-stage--tool-${tool}`}
    tabIndex={0}
    onKeyDown={onKeyDown}
    onDragOver={event => event.preventDefault()}
    onDrop={onDrop}
    aria-label="Interactive 1920 by 1080 editing stage"
  >
    <ExperienceStage
      document={document}
      section={section}
      selectedLayerId={selectedLayerId}
      interactive
      svgRef={svgRef}
      onLayerPointerDown={onLayerPointerDown}
      onStagePointerDown={onStagePointerDown}
      onStagePointerMove={onStagePointerMove}
      onStagePointerUp={finishInteraction}
      onStagePointerCancel={finishInteraction}
    >
      {draftOverlay}
      {overlay}
    </ExperienceStage>
  </div>;
}
