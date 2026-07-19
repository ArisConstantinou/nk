import {useEffect, useMemo, useRef, useState, type DragEvent, type KeyboardEvent, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent} from 'react';
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

type PointInteraction = {
  kind: 'point';
  layerId: string;
  pointIndex: number;
  start: ExperiencePoint;
  initial: ExperiencePoint[];
  transform: LayerTransform;
};

type Interaction = TransformInteraction | DrawInteraction | PointInteraction;

type Props = {
  document: ExperienceDocument;
  section: ExperienceSection;
  tool: ExperienceTool;
  selectedLayerId: string | null;
  onSelectLayer: (id: string | null) => void;
  onAddLayer: (layer: ExperienceLayer) => void;
  onUpdateLayer: (id: string, patch: Partial<ExperienceLayer>) => void;
  onRemoveLayer: (id: string) => void;
  onInteractionStart?: (layer: ExperienceLayer, kind: TransformInteraction['kind'] | PointInteraction['kind']) => void;
  onInteractionEnd?: () => void;
};

const pointFromEvent = (event: Pick<PointerEvent, 'clientX' | 'clientY'>, element: SVGGraphicsElement) => {
  const point = element.ownerSVGElement?.createSVGPoint() ?? (element as SVGSVGElement).createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  const matrix = element.getScreenCTM()?.inverse();
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

export function StudioStage({
  document,
  section,
  tool,
  selectedLayerId,
  onSelectLayer,
  onAddLayer,
  onUpdateLayer,
  onRemoveLayer,
  onInteractionStart,
  onInteractionEnd,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const interaction = useRef<Interaction | null>(null);
  const previousSelectedLayerId = useRef<string | null>(selectedLayerId);
  const [draftLayer, setDraftLayer] = useState<ExperienceLayer | null>(null);
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const selected = useMemo(() => section.layers.find(layer => layer.id === selectedLayerId) ?? null, [section.layers, selectedLayerId]);
  const selectedRoute = selected?.type === 'parametric-path' && selected.points ? selected : null;

  const updateRoutePoints = (layer: ExperienceLayer, points: ExperiencePoint[]) => {
    if (layer.locked || layer.type !== 'parametric-path' || points.length < 2) return;
    onUpdateLayer(layer.id, {points});
  };

  const extendRoute = (layer: ExperienceLayer, edge: 'start' | 'end') => {
    const points = layer.points;
    if (!points || points.length < 2) return;
    const endpointIndex = edge === 'start' ? 0 : points.length - 1;
    const neighbourIndex = edge === 'start' ? 1 : points.length - 2;
    const endpoint = points[endpointIndex];
    const neighbour = points[neighbourIndex];
    const nextPoint = {
      x: endpoint.x + (endpoint.x - neighbour.x) * .35,
      y: endpoint.y + (endpoint.y - neighbour.y) * .35,
    };
    const nextPoints = edge === 'start'
      ? [nextPoint, ...points.map(point => ({...point}))]
      : [...points.map(point => ({...point})), nextPoint];
    updateRoutePoints(layer, nextPoints);
    setSelectedPointIndex(edge === 'start' ? 0 : nextPoints.length - 1);
  };

  const insertAdjacentRoutePoint = (layer: ExperienceLayer, pointIndex: number, side: 'before' | 'after') => {
    const points = layer.points;
    if (!points || points.length < 2 || pointIndex < 0 || pointIndex >= points.length) return;
    const current = points[pointIndex];
    const neighbourIndex = side === 'before' ? pointIndex - 1 : pointIndex + 1;
    const neighbour = points[neighbourIndex];
    const fallback = side === 'before' ? points[Math.min(1, points.length - 1)] : points[Math.max(0, points.length - 2)];
    const nextPoint = neighbour
      ? {x: (current.x + neighbour.x) / 2, y: (current.y + neighbour.y) / 2}
      : {
          x: current.x + (current.x - fallback.x) * .35,
          y: current.y + (current.y - fallback.y) * .35,
        };
    const insertionIndex = side === 'before' ? pointIndex : pointIndex + 1;
    const nextPoints = points.map(point => ({...point}));
    nextPoints.splice(insertionIndex, 0, nextPoint);
    updateRoutePoints(layer, nextPoints);
    setSelectedPointIndex(insertionIndex);
  };

  const removeRoutePoint = (layer: ExperienceLayer, pointIndex: number | null) => {
    const points = layer.points;
    if (!points || pointIndex === null || points.length <= 2 || pointIndex < 0 || pointIndex >= points.length) return;
    updateRoutePoints(layer, points.filter((_, index) => index !== pointIndex).map(point => ({...point})));
    setSelectedPointIndex(Math.min(pointIndex, points.length - 2));
  };

  const insertRoutePoint = (event: ReactMouseEvent<SVGPathElement>, layer: ExperienceLayer) => {
    if (layer.locked || !layer.points || layer.points.length < 2) return;
    event.preventDefault();
    event.stopPropagation();
    const localPoint = pointFromEvent(event.nativeEvent, event.currentTarget);
    const routePoints = layer.points.map(point => ({
      x: point.x * layer.transform.width,
      y: point.y * layer.transform.height,
    }));
    let nearestSegment = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;
    routePoints.slice(0, -1).forEach((start, index) => {
      const end = routePoints[index + 1];
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const lengthSquared = dx * dx + dy * dy;
      const progress = lengthSquared
        ? Math.max(0, Math.min(1, ((localPoint.x - start.x) * dx + (localPoint.y - start.y) * dy) / lengthSquared))
        : 0;
      const projected = {x: start.x + dx * progress, y: start.y + dy * progress};
      const distance = Math.hypot(localPoint.x - projected.x, localPoint.y - projected.y);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestSegment = index;
      }
    });
    const nextPoint = {
      x: localPoint.x / Math.max(1, layer.transform.width),
      y: localPoint.y / Math.max(1, layer.transform.height),
    };
    const nextPoints = layer.points.map(point => ({...point}));
    nextPoints.splice(nearestSegment + 1, 0, nextPoint);
    updateRoutePoints(layer, nextPoints);
    setSelectedPointIndex(nearestSegment + 1);
  };

  const startTransform = (event: ReactPointerEvent<SVGElement>, kind: TransformInteraction['kind'], layer: ExperienceLayer) => {
    if (layer.locked || !svgRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    onSelectLayer(layer.id);
    rootRef.current?.focus();
    onInteractionStart?.(layer, kind);
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

  const startPointEdit = (event: ReactPointerEvent<SVGCircleElement>, layer: ExperienceLayer, pointIndex: number) => {
    if (layer.locked || !svgRef.current || !layer.points) return;
    if (event.altKey) {
      event.preventDefault();
      event.stopPropagation();
      removeRoutePoint(layer, pointIndex);
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    onSelectLayer(layer.id);
    setSelectedPointIndex(null);
    setSelectedPointIndex(pointIndex);
    rootRef.current?.focus();
    onInteractionStart?.(layer, 'point');
    interaction.current = {
      kind: 'point',
      layerId: layer.id,
      pointIndex,
      start: pointFromEvent(event.nativeEvent, svgRef.current),
      initial: layer.points.map(point => ({...point})),
      transform: {...layer.transform},
    };
    svgRef.current.setPointerCapture(event.pointerId);
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
    if (active.kind === 'point') {
      const dx = (point.x - active.start.x) / active.transform.width;
      const dy = (point.y - active.start.y) / active.transform.height;
      const points = active.initial.map((routePoint, index) => index === active.pointIndex ? {
        x: Math.max(-.25, Math.min(1.25, routePoint.x + dx)),
        y: Math.max(-.25, Math.min(1.25, routePoint.y + dy)),
      } : routePoint);
      onUpdateLayer(active.layerId, {points});
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
    if (active && active.kind !== 'draw') onInteractionEnd?.();
    setDraftLayer(null);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!selected || selected.locked) return;
    if (event.key === 'Escape' && selectedPointIndex !== null) {
      event.preventDefault();
      setSelectedPointIndex(null);
      return;
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      if (selectedRoute && selectedPointIndex !== null) {
        removeRoutePoint(selectedRoute, selectedPointIndex);
        return;
      }
      onRemoveLayer(selected.id);
      return;
    }
    const direction = {ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1]}[event.key] as number[] | undefined;
    if (!direction) return;
    event.preventDefault();
    const amount = event.shiftKey ? 10 : 1;
    if (selectedRoute && selectedPointIndex !== null && selectedRoute.points?.[selectedPointIndex]) {
      const points = selectedRoute.points.map((point, index) => index === selectedPointIndex ? {
        x: point.x + direction[0] * amount / Math.max(1, selectedRoute.transform.width),
        y: point.y + direction[1] * amount / Math.max(1, selectedRoute.transform.height),
      } : {...point});
      updateRoutePoints(selectedRoute, points);
      return;
    }
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

  useEffect(() => {
    if (previousSelectedLayerId.current !== selectedLayerId) {
      previousSelectedLayerId.current = selectedLayerId;
      if (interaction.current?.kind !== 'point') setSelectedPointIndex(null);
    }
    if (!selectedRoute || selectedPointIndex === null) return;
    if (selectedPointIndex >= (selectedRoute.points?.length ?? 0)) setSelectedPointIndex(null);
  }, [selectedLayerId, selectedPointIndex, selectedRoute]);

  const overlay = selected && selected.visible ? <g
    transform={`translate(${selected.transform.x} ${selected.transform.y}) rotate(${selected.transform.rotation} ${selected.transform.width / 2} ${selected.transform.height / 2}) skewX(${selected.transform.skewX}) skewY(${selected.transform.skewY})`}
    className="ix-gizmo"
  >
    <rect width={selected.transform.width} height={selected.transform.height} fill="none" stroke="#43e4f2" strokeWidth="4" vectorEffect="non-scaling-stroke" pointerEvents="none"/>
    <line x1={selected.transform.width / 2} y1="0" x2={selected.transform.width / 2} y2="-72" stroke="#43e4f2" strokeWidth="3" vectorEffect="non-scaling-stroke"/>
    <circle cx={selected.transform.width / 2} cy="-82" r="17" fill="#07131c" stroke="#43e4f2" strokeWidth="4" vectorEffect="non-scaling-stroke" className="ix-gizmo__handle ix-gizmo__handle--rotate" onPointerDown={event => startTransform(event, 'rotate', selected)}/>
    <rect x={selected.transform.width - 20} y={selected.transform.height - 20} width="40" height="40" rx="5" fill="#43e4f2" stroke="#07131c" strokeWidth="4" vectorEffect="non-scaling-stroke" className="ix-gizmo__handle ix-gizmo__handle--resize" onPointerDown={event => startTransform(event, 'resize', selected)}/>
    <path d="M -30 -18 L -12 -36 L 6 -18 L -12 0 Z" fill="#ef8b5b" stroke="#07131c" strokeWidth="4" vectorEffect="non-scaling-stroke" className="ix-gizmo__handle ix-gizmo__handle--skew" onPointerDown={event => startTransform(event, 'skew', selected)}/>
    {selected.type === 'parametric-path' && selected.points && <>
      <path
        d={selected.points.map((point, index) => `${index ? 'L' : 'M'} ${point.x * selected.transform.width} ${point.y * selected.transform.height}`).join(' ')}
        fill="none"
        stroke="transparent"
        strokeWidth="34"
        vectorEffect="non-scaling-stroke"
        pointerEvents="stroke"
        className="ix-gizmo__route-hit-area"
        aria-label="Drag to move the entire channel and conduit route"
        onPointerDown={event => startTransform(event, 'move', selected)}
        onDoubleClick={event => insertRoutePoint(event, selected)}
      />
      <path d={selected.points.map((point, index) => `${index ? 'L' : 'M'} ${point.x * selected.transform.width} ${point.y * selected.transform.height}`).join(' ')} fill="none" stroke="#43e4f2" strokeWidth="3" strokeDasharray="10 9" vectorEffect="non-scaling-stroke" pointerEvents="none"/>
      {selected.points.map((point, index) => <circle
        key={`${selected.id}-point-${index}`}
        cx={point.x * selected.transform.width}
        cy={point.y * selected.transform.height}
        r="17"
        fill={selectedPointIndex === index ? '#ef8b5b' : '#07131c'}
        stroke={selectedPointIndex === index ? '#ffffff' : '#43e4f2'}
        strokeWidth={selectedPointIndex === index ? 6 : 5}
        vectorEffect="non-scaling-stroke"
        className="ix-gizmo__handle ix-gizmo__handle--point"
        onPointerDown={event => startPointEdit(event, selected, index)}
        onContextMenu={event => {
          event.preventDefault();
          event.stopPropagation();
          removeRoutePoint(selected, index);
        }}
      />)}
      {selectedPointIndex !== null && selected.points[selectedPointIndex] && (() => {
        const point = selected.points[selectedPointIndex];
        const pointX = point.x * selected.transform.width;
        const pointY = point.y * selected.transform.height;
        const actionX = Math.max(82, Math.min(selected.transform.width - 82, pointX));
        const actionY = pointY < 105 ? pointY + 68 : pointY - 68;
        const activate = (event: ReactMouseEvent<SVGGElement> | KeyboardEvent<SVGGElement>, action: () => void) => {
          if ('key' in event && event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          event.stopPropagation();
          action();
        };
        return <g className="ix-route-point-actions" aria-label={`Actions for route point ${selectedPointIndex + 1}`}>
          <line x1={pointX} y1={pointY} x2={actionX} y2={actionY} className="ix-route-point-actions__stem" pointerEvents="none"/>
          <g
            role="button"
            tabIndex={0}
            aria-label="Add a point before the selected point"
            className="ix-route-point-action"
            transform={`translate(${actionX - 58} ${actionY})`}
            onPointerDown={event => {event.preventDefault(); event.stopPropagation();}}
            onClick={event => activate(event, () => insertAdjacentRoutePoint(selected, selectedPointIndex, 'before'))}
            onKeyDown={event => activate(event, () => insertAdjacentRoutePoint(selected, selectedPointIndex, 'before'))}
          >
            <title>Add point before</title>
            <circle r="24"/>
            <path d="M -2 -8 V 8 M -10 0 H 6 M -10 12 L -17 6 L -10 0" className="ix-route-point-action__icon"/>
          </g>
          <g
            role="button"
            tabIndex={0}
            aria-label="Remove the selected point"
            aria-disabled={(selected.points?.length ?? 0) <= 2}
            className={`ix-route-point-action ix-route-point-action--remove ${(selected.points?.length ?? 0) <= 2 ? 'is-disabled' : ''}`}
            transform={`translate(${actionX} ${actionY})`}
            onPointerDown={event => {event.preventDefault(); event.stopPropagation();}}
            onClick={event => activate(event, () => removeRoutePoint(selected, selectedPointIndex))}
            onKeyDown={event => activate(event, () => removeRoutePoint(selected, selectedPointIndex))}
          >
            <title>Remove selected point</title>
            <circle r="24"/>
            <path d="M -8 -8 L 8 8 M 8 -8 L -8 8" className="ix-route-point-action__icon"/>
          </g>
          <g
            role="button"
            tabIndex={0}
            aria-label="Add a point after the selected point"
            className="ix-route-point-action"
            transform={`translate(${actionX + 58} ${actionY})`}
            onPointerDown={event => {event.preventDefault(); event.stopPropagation();}}
            onClick={event => activate(event, () => insertAdjacentRoutePoint(selected, selectedPointIndex, 'after'))}
            onKeyDown={event => activate(event, () => insertAdjacentRoutePoint(selected, selectedPointIndex, 'after'))}
          >
            <title>Add point after</title>
            <circle r="24"/>
            <path d="M 2 -8 V 8 M -6 0 H 10 M 10 12 L 17 6 L 10 0" className="ix-route-point-action__icon"/>
          </g>
        </g>;
      })()}
    </>}
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
    {selectedRoute && <div className="ix-route-point-toolbar" role="toolbar" aria-label="Route point controls">
      <span>{selectedPointIndex === null ? 'Drag the route to move the whole channel + conduit pair' : `Point ${selectedPointIndex + 1} selected · drag it to reshape`}</span>
      <button type="button" onClick={() => extendRoute(selectedRoute, 'start')} aria-label="Add a new point at the start of the route">+ Start</button>
      <button type="button" onClick={() => extendRoute(selectedRoute, 'end')} aria-label="Add a new point at the end of the route">+ End</button>
      <button
        type="button"
        className="danger"
        disabled={selectedPointIndex === null || (selectedRoute.points?.length ?? 0) <= 2}
        onClick={() => removeRoutePoint(selectedRoute, selectedPointIndex)}
        aria-label="Remove the selected route point"
      >− Point</button>
    </div>}
    <ExperienceStage
      document={document}
      section={section}
      fit="cover"
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
