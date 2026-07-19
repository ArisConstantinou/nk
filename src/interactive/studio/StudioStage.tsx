import {useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent, type KeyboardEvent, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent} from 'react';
import {createPortal} from 'react-dom';
import {ExperienceStage, getArrowHeadPathData, getDirectionalLineEndpoints} from '../engine/ExperienceStage';
import {
  assetAspectRatio,
  createStableId,
  createTransform,
  findAsset,
  normalizeDrawing,
  type ExperienceDocument,
  type ExperienceLayer,
  type ExperiencePoint,
  type ExperienceSection,
  type ExperienceSurface,
  type ExperienceTool,
  type LayerTransform,
} from '../engine/schema';
import {createVisibleRouteExtensionPoint} from '../parametric/routeEditing';
import {
  hasPointBoundedGeometry,
  hasResizeDragStarted,
  normalizePointLayerGeometry,
  resizePointLayerGeometry,
} from './pointLayerEditing';
import {
  adaptTransformToSurface,
  constrainTransformToSurface,
  findSurfaceAtPoint,
  fitTransformToSurface,
  surfaceBounds,
  surfaceCentroid,
} from '../surfaces/roomSurfaceCalibration';

type TransformInteraction = {
  kind: 'move' | 'resize' | 'rotate' | 'skew';
  layerId: string;
  start: ExperiencePoint;
  startClient: ExperiencePoint;
  initial: LayerTransform;
  initialPoints?: ExperiencePoint[];
  layers: Array<{
    id: string;
    initial: LayerTransform;
  }>;
  resizeFrom?: {
    x: -1 | 1;
    y: -1 | 1;
  };
};

type DrawInteraction = {
  kind: 'draw';
  tool: Exclude<ExperienceTool, 'select' | 'text'>;
  start: ExperiencePoint;
  points: ExperiencePoint[];
  surfaceId?: string;
};

const wideWallFixtureFit = {widthCoverage: 1, heightCoverage: 1, marginScale: 0} as const;
const surfaceFitOptionsForAsset = (assetId?: string) => (
  assetId === 'asset-wood-structure-no-led' ? wideWallFixtureFit : undefined
);

type PointInteraction = {
  kind: 'point';
  layerId: string;
  pointIndex: number;
  start: ExperiencePoint;
  initial: ExperiencePoint[];
  transform: LayerTransform;
};

type MarqueeInteraction = {
  kind: 'marquee';
  start: ExperiencePoint;
  current: ExperiencePoint;
  initialSelection: string[];
  additive: boolean;
};

type Interaction = TransformInteraction | DrawInteraction | PointInteraction | MarqueeInteraction;

type PanInteraction = {
  pointerId: number;
  start: ExperiencePoint;
  initial: StageView;
  viewport: {
    width: number;
    height: number;
  };
};

type StageView = {
  scale: number;
  x: number;
  y: number;
};

type Props = {
  document: ExperienceDocument;
  section: ExperienceSection;
  tool: ExperienceTool;
  selectedLayerIds: string[];
  editingTextLayerId: string | null;
  selectedSurfaceId?: string | null;
  onSelectLayers: (ids: string[]) => void;
  onEditingTextLayerIdChange: (layerId: string | null) => void;
  onSelectSurface?: (surfaceId: string) => void;
  onAddLayer: (layer: ExperienceLayer) => void;
  onUpdateLayer: (id: string, patch: Partial<ExperienceLayer>) => void;
  onUpdateLayers: (updates: Array<{id: string; patch: Partial<ExperienceLayer>}>) => void;
  onRemoveLayers: (ids: string[]) => void;
  onInteractionStart?: (layer: ExperienceLayer, kind: TransformInteraction['kind'] | PointInteraction['kind'], layerIds?: string[]) => void;
  onInteractionEnd?: () => void;
  onExitTool?: () => void;
  zoomControlsHost?: HTMLDivElement | null;
};

type SvgViewportMapping = {
  bounds: DOMRect;
  fromScreen: (point: ExperiencePoint) => ExperiencePoint;
  toScreen: (point: ExperiencePoint) => ExperiencePoint;
};

const svgViewportMapping = (element: SVGSVGElement): SvgViewportMapping | null => {
  const bounds = element.getBoundingClientRect();
  const viewBox = element.viewBox.baseVal;
  if (!bounds.width || !bounds.height || !viewBox.width || !viewBox.height) return null;

  const preserveAspectRatio = element.getAttribute('preserveAspectRatio') || 'xMidYMid meet';
  const [alignment = 'xMidYMid', sizing = 'meet'] = preserveAspectRatio.trim().split(/\s+/);
  let scaleX = bounds.width / viewBox.width;
  let scaleY = bounds.height / viewBox.height;
  let offsetX = 0;
  let offsetY = 0;

  if (alignment !== 'none') {
    const scale = sizing === 'slice'
      ? Math.max(scaleX, scaleY)
      : Math.min(scaleX, scaleY);
    scaleX = scale;
    scaleY = scale;
    const remainingX = bounds.width - viewBox.width * scale;
    const remainingY = bounds.height - viewBox.height * scale;
    offsetX = alignment.includes('xMax') ? remainingX : alignment.includes('xMid') ? remainingX / 2 : 0;
    offsetY = alignment.includes('YMax') ? remainingY : alignment.includes('YMid') ? remainingY / 2 : 0;
  }

  return {
    bounds,
    fromScreen: point => ({
      x: viewBox.x + (point.x - bounds.left - offsetX) / scaleX,
      y: viewBox.y + (point.y - bounds.top - offsetY) / scaleY,
    }),
    toScreen: point => ({
      x: bounds.left + offsetX + (point.x - viewBox.x) * scaleX,
      y: bounds.top + offsetY + (point.y - viewBox.y) * scaleY,
    }),
  };
};

const pointFromEvent = (event: Pick<PointerEvent, 'clientX' | 'clientY'>, element: SVGGraphicsElement) => {
  if (element.tagName.toLowerCase() === 'svg') {
    const mapping = svgViewportMapping(element as SVGSVGElement);
    if (mapping) return mapping.fromScreen({x: event.clientX, y: event.clientY});
  }
  const point = element.ownerSVGElement?.createSVGPoint() ?? (element as SVGSVGElement).createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  const matrix = element.getScreenCTM()?.inverse();
  const transformed = matrix ? point.matrixTransform(matrix) : point;
  return {x: transformed.x, y: transformed.y};
};

const MIN_STAGE_ZOOM = .5;
const MAX_STAGE_ZOOM = 4;
const TRANSFORM_HANDLE_OFFSET = 94;
const TRANSFORM_HANDLE_CLEARANCE = 126;
const TRANSFORM_HANDLE_INSET = 82;

type TransformHandlePositions = {
  rotate: ExperiencePoint;
  skew: ExperiencePoint;
  scale: ExperiencePoint;
};

const insetHandleCoordinate = (size: number, edge: 'start' | 'end') => {
  if (size < TRANSFORM_HANDLE_INSET * 2) return size / 2;
  return edge === 'start' ? TRANSFORM_HANDLE_INSET : size - TRANSFORM_HANDLE_INSET;
};

export const transformHandlePositions = (
  transform: LayerTransform,
  stage: ExperienceDocument['stage'],
): TransformHandlePositions => {
  const {x, y, width, height} = transform;
  const hasTopRoom = y >= TRANSFORM_HANDLE_CLEARANCE;
  const hasLeftRoom = x >= TRANSFORM_HANDLE_CLEARANCE;
  const hasRightRoom = x + width <= stage.width - TRANSFORM_HANDLE_CLEARANCE;
  const hasBottomRoom = y + height <= stage.height - TRANSFORM_HANDLE_CLEARANCE;

  return {
    rotate: {
      x: width / 2,
      y: hasTopRoom
        ? -TRANSFORM_HANDLE_OFFSET
        : hasBottomRoom
          ? height + TRANSFORM_HANDLE_OFFSET
          : insetHandleCoordinate(height, 'start'),
    },
    skew: {
      x: hasLeftRoom
        ? -TRANSFORM_HANDLE_OFFSET
        : hasRightRoom
          ? width + TRANSFORM_HANDLE_OFFSET
          : insetHandleCoordinate(width, 'start'),
      y: height / 2,
    },
    scale: {
      x: width,
      y: height,
    },
  };
};

const snapStageZoomToActualSize = (currentScale: number, nextScale: number) => (
  (currentScale < 1 && nextScale > 1) || (currentScale > 1 && nextScale < 1)
    ? 1
    : nextScale
);

const clampStageView = (view: StageView, viewport: {width: number; height: number}): StageView => {
  const scale = Math.max(MIN_STAGE_ZOOM, Math.min(MAX_STAGE_ZOOM, view.scale));
  const clampAxis = (offset: number, size: number) => {
    if (scale <= 1) return (size - size * scale) / 2;
    return Math.max(size - size * scale, Math.min(0, offset));
  };
  return {
    scale,
    x: clampAxis(view.x, viewport.width),
    y: clampAxis(view.y, viewport.height),
  };
};

const zoomStageAroundPoint = (
  view: StageView,
  nextScale: number,
  point: ExperiencePoint,
  viewport: {width: number; height: number},
) => {
  const scale = Math.max(MIN_STAGE_ZOOM, Math.min(MAX_STAGE_ZOOM, nextScale));
  const contentX = (point.x - view.x) / view.scale;
  const contentY = (point.y - view.y) / view.scale;
  return clampStageView({
    scale,
    x: point.x - contentX * scale,
    y: point.y - contentY * scale,
  }, viewport);
};

const drawingTransform = (start: ExperiencePoint, end: ExperiencePoint) => ({
  x: Math.min(start.x, end.x),
  y: Math.min(start.y, end.y),
  width: Math.max(4, Math.abs(end.x - start.x)),
  height: Math.max(4, Math.abs(end.y - start.y)),
});

type LayerBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const layerSelectionBounds = (layer: ExperienceLayer): LayerBounds => {
  const {x, y, width, height, rotation, skewX, skewY} = layer.transform;
  const localPoints = layer.points?.length
    ? layer.points.map(point => ({x: point.x * width, y: point.y * height}))
    : [{x: 0, y: 0}, {x: width, y: 0}, {x: width, y: height}, {x: 0, y: height}];
  const center = {x: width / 2, y: height / 2};
  const radians = rotation * Math.PI / 180;
  const tangentX = Math.tan(skewX * Math.PI / 180);
  const tangentY = Math.tan(skewY * Math.PI / 180);
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const transformed = localPoints.map(point => {
    const skewedY = point.y + point.x * tangentY;
    const skewedX = point.x + skewedY * tangentX;
    const centeredX = skewedX - center.x;
    const centeredY = skewedY - center.y;
    return {
      x: x + center.x + centeredX * cosine - centeredY * sine,
      y: y + center.y + centeredX * sine + centeredY * cosine,
    };
  });
  const minimumX = Math.min(...transformed.map(point => point.x));
  const maximumX = Math.max(...transformed.map(point => point.x));
  const minimumY = Math.min(...transformed.map(point => point.y));
  const maximumY = Math.max(...transformed.map(point => point.y));
  const padding = Math.max(5, (layer.strokeWidth || 0) / 2, layer.parametric ? 14 : 0);
  return {
    x: minimumX - padding,
    y: minimumY - padding,
    width: Math.max(4, maximumX - minimumX + padding * 2),
    height: Math.max(4, maximumY - minimumY + padding * 2),
  };
};

const boundsIntersect = (first: LayerBounds, second: LayerBounds) => (
  first.x <= second.x + second.width
  && first.x + first.width >= second.x
  && first.y <= second.y + second.height
  && first.y + first.height >= second.y
);

const DRAW_EDGE_SNAP_SCREEN_PX = 16;

const snapDrawingPointToStage = (
  point: ExperiencePoint,
  element: SVGGraphicsElement,
  stage: {width: number; height: number},
) => {
  const clampedX = Math.max(0, Math.min(stage.width, point.x));
  const clampedY = Math.max(0, Math.min(stage.height, point.y));
  if (element.tagName.toLowerCase() === 'svg') {
    const mapping = svgViewportMapping(element as SVGSVGElement);
    if (mapping) {
      const currentScreen = mapping.toScreen({x: clampedX, y: clampedY});
      const stageLeft = mapping.toScreen({x: 0, y: clampedY}).x;
      const stageRight = mapping.toScreen({x: stage.width, y: clampedY}).x;
      const stageTop = mapping.toScreen({x: clampedX, y: 0}).y;
      const stageBottom = mapping.toScreen({x: clampedX, y: stage.height}).y;
      const horizontalEdgeIsVisible = (screenX: number) => (
        screenX >= mapping.bounds.left - .5
        && screenX <= mapping.bounds.right + .5
      );
      const verticalEdgeIsVisible = (screenY: number) => (
        screenY >= mapping.bounds.top - .5
        && screenY <= mapping.bounds.bottom + .5
      );
      return {
        x: horizontalEdgeIsVisible(stageLeft) && Math.abs(currentScreen.x - stageLeft) <= DRAW_EDGE_SNAP_SCREEN_PX
          ? 0
          : horizontalEdgeIsVisible(stageRight) && Math.abs(currentScreen.x - stageRight) <= DRAW_EDGE_SNAP_SCREEN_PX
            ? stage.width
            : clampedX,
        y: verticalEdgeIsVisible(stageTop) && Math.abs(currentScreen.y - stageTop) <= DRAW_EDGE_SNAP_SCREEN_PX
          ? 0
          : verticalEdgeIsVisible(stageBottom) && Math.abs(currentScreen.y - stageBottom) <= DRAW_EDGE_SNAP_SCREEN_PX
            ? stage.height
            : clampedY,
      };
    }
  }
  const matrix = element.getScreenCTM();
  const scaleX = Math.max(.001, matrix ? Math.hypot(matrix.a, matrix.b) : 1);
  const scaleY = Math.max(.001, matrix ? Math.hypot(matrix.c, matrix.d) : 1);
  const thresholdX = DRAW_EDGE_SNAP_SCREEN_PX / scaleX;
  const thresholdY = DRAW_EDGE_SNAP_SCREEN_PX / scaleY;
  return {
    x: clampedX <= thresholdX ? 0 : stage.width - clampedX <= thresholdX ? stage.width : clampedX,
    y: clampedY <= thresholdY ? 0 : stage.height - clampedY <= thresholdY ? stage.height : clampedY,
  };
};

const constrainDrawingPoint = (
  tool: DrawInteraction['tool'],
  start: ExperiencePoint,
  end: ExperiencePoint,
  constrain: boolean,
) => {
  if (!constrain) return end;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (tool === 'line' || tool === 'arrow') {
    const distance = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);
    const snappedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
    return {
      x: start.x + Math.cos(snappedAngle) * distance,
      y: start.y + Math.sin(snappedAngle) * distance,
    };
  }
  if (tool === 'rectangle' || tool === 'ellipse') {
    const size = Math.max(Math.abs(dx), Math.abs(dy));
    return {
      x: start.x + (dx < 0 ? -size : size),
      y: start.y + (dy < 0 ? -size : size),
    };
  }
  return end;
};

const makeShapeLayer = (
  tool: DrawInteraction['tool'],
  start: ExperiencePoint,
  end: ExperiencePoint,
  points: ExperiencePoint[],
  surface?: ExperienceSurface,
): ExperienceLayer => {
  if (tool === 'freehand') {
    const normalized = normalizeDrawing(points);
    const layer: ExperienceLayer = {
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
    if (!surface) return layer;
    const startLocal = {
      x: (start.x - normalized.transform.x) / normalized.transform.width,
      y: (start.y - normalized.transform.y) / normalized.transform.height,
    };
    return {
      ...layer,
      surfaceId: surface.id,
      transform: adaptTransformToSurface(surface, layer.transform, startLocal),
    };
  }
  const transform = createTransform(drawingTransform(start, end));
  const directionalPoints = tool === 'line' || tool === 'arrow'
    ? [start, end].map(point => ({
        x: (point.x - transform.x) / transform.width,
        y: (point.y - transform.y) / transform.height,
      }))
    : undefined;
  const layer: ExperienceLayer = {
    id: createStableId('layer'),
    name: tool === 'rectangle' ? 'Rectangle mockup' : tool === 'ellipse' ? 'Ellipse mockup' : tool === 'line' ? 'Line mockup' : 'Arrow mockup',
    type: tool,
    visible: true,
    locked: false,
    opacity: 1,
    transform,
    points: directionalPoints,
    fill: tool === 'rectangle' || tool === 'ellipse' ? 'rgba(239,111,77,.08)' : 'none',
    stroke: '#ef6f4d',
    strokeWidth: 8,
  };
  if (!surface) return layer;
  const startLocal = {
    x: (start.x - transform.x) / transform.width,
    y: (start.y - transform.y) / transform.height,
  };
  return {
    ...layer,
    surfaceId: surface.id,
    transform: adaptTransformToSurface(surface, transform, startLocal),
  };
};

export function StudioStage({
  document,
  section,
  tool,
  selectedLayerIds,
  editingTextLayerId,
  selectedSurfaceId,
  onSelectLayers,
  onEditingTextLayerIdChange,
  onSelectSurface,
  onAddLayer,
  onUpdateLayer,
  onUpdateLayers,
  onRemoveLayers,
  onInteractionStart,
  onInteractionEnd,
  onExitTool,
  zoomControlsHost,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const interaction = useRef<Interaction | null>(null);
  const panInteraction = useRef<PanInteraction | null>(null);
  const selectedLayerId = selectedLayerIds[selectedLayerIds.length - 1] ?? null;
  const previousSelectedLayerId = useRef<string | null>(selectedLayerId);
  const [draftLayer, setDraftLayer] = useState<ExperienceLayer | null>(null);
  const [marqueeBounds, setMarqueeBounds] = useState<LayerBounds | null>(null);
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [surfaceLabelVisible, setSurfaceLabelVisible] = useState(Boolean(selectedSurfaceId));
  const [stageView, setStageView] = useState<StageView>({scale: 1, x: 0, y: 0});
  const [stageViewport, setStageViewport] = useState({width: 0, height: 0});
  const lastTextPointerDown = useRef<{layerId: string; timeStamp: number; clientX: number; clientY: number} | null>(null);
  const selected = useMemo(() => section.layers.find(layer => layer.id === selectedLayerId) ?? null, [section.layers, selectedLayerId]);
  const selectedLayers = useMemo(
    () => selectedLayerIds.map(id => section.layers.find(layer => layer.id === id)).filter((layer): layer is ExperienceLayer => Boolean(layer)),
    [section.layers, selectedLayerIds],
  );
  const isSingleSelection = selectedLayers.length === 1;
  const selectedRoute = isSingleSelection && selected?.type === 'parametric-path' && selected.points ? selected : null;
  const frameBackgroundAsset = useMemo(() => {
    const layer = section.layers.find(item => (
      item.visible
      && item.type === 'asset'
      && item.description === 'Frame background asset.'
    ));
    return findAsset(document, layer?.assetId);
  }, [document, section.layers]);
  const roomBackdrop = useMemo(() => {
    const wall = section.layers.find(item => item.visible && item.name === 'Fixed wall background');
    const floor = section.layers.find(item => item.visible && item.name === 'Finished floor datum');
    const corner = section.layers.find(item => item.visible && item.name === 'Room corner datum');
    return wall && floor && corner ? {wall, floor, corner} : null;
  }, [section.layers]);
  const renderedSection = useMemo(() => {
    if (!roomBackdrop || frameBackgroundAsset || stageView.scale >= 1) return section;
    const roomBaseNames = new Set(['Fixed wall background', 'Finished floor datum', 'Room corner datum']);
    return {
      ...section,
      background: 'transparent',
      layers: section.layers.filter(layer => !roomBaseNames.has(layer.name)),
    };
  }, [frameBackgroundAsset, roomBackdrop, section, stageView.scale]);
  const stageViewBox = useMemo(() => {
    if (!stageViewport.width || !stageViewport.height) {
      return {
        x: 0,
        y: 0,
        width: document.stage.width,
        height: document.stage.height,
      };
    }
    return {
      x: -stageView.x * document.stage.width / (stageViewport.width * stageView.scale),
      y: -stageView.y * document.stage.height / (stageViewport.height * stageView.scale),
      width: document.stage.width / stageView.scale,
      height: document.stage.height / stageView.scale,
    };
  }, [document.stage.height, document.stage.width, stageView, stageViewport]);

  useEffect(() => {
    if (!selectedSurfaceId) {
      setSurfaceLabelVisible(false);
      return undefined;
    }
    setSurfaceLabelVisible(true);
    const timeout = globalThis.setTimeout(() => setSurfaceLabelVisible(false), 3200);
    return () => globalThis.clearTimeout(timeout);
  }, [selectedSurfaceId]);

  const adjustStageZoom = (factor: number) => {
    const root = rootRef.current;
    if (!root) return;
    const {width, height} = root.getBoundingClientRect();
    setStageView(current => {
      const nextScale = snapStageZoomToActualSize(current.scale, current.scale * factor);
      return zoomStageAroundPoint(
        current,
        nextScale,
        {x: width / 2, y: height / 2},
        {width, height},
      );
    });
  };

  const updateRoutePoints = (layer: ExperienceLayer, points: ExperiencePoint[]) => {
    if (layer.locked || layer.type !== 'parametric-path' || points.length < 2) return;
    onUpdateLayer(layer.id, {points});
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
      : createVisibleRouteExtensionPoint({
          endpoint: current,
          neighbour: fallback,
          transform: layer.transform,
          stage: document.stage,
        });
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

  const startTransform = (
    event: ReactPointerEvent<SVGElement>,
    kind: TransformInteraction['kind'],
    layer: ExperienceLayer,
    requestedLayerIds?: string[],
  ) => {
    if (event.button !== 0 || layer.locked || !svgRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    const transformLayerIds = kind === 'move'
      ? requestedLayerIds || (selectedLayerIds.includes(layer.id) ? selectedLayerIds : [layer.id])
      : [layer.id];
    const transformLayers = transformLayerIds
      .map(id => section.layers.find(item => item.id === id))
      .filter((item): item is ExperienceLayer => Boolean(item && !item.locked));
    const nextSelection = transformLayers.map(item => item.id);
    onSelectLayers(nextSelection);
    rootRef.current?.focus();
    onInteractionStart?.(layer, kind, nextSelection);
    const start = pointFromEvent(event.nativeEvent, svgRef.current);
    const editableGeometry = kind === 'resize' && hasPointBoundedGeometry(layer)
      ? normalizePointLayerGeometry(layer, document.stage)
      : null;
    interaction.current = {
      kind,
      layerId: layer.id,
      start,
      startClient: {x: event.clientX, y: event.clientY},
      initial: editableGeometry ? editableGeometry.transform : {...layer.transform},
      initialPoints: editableGeometry?.points,
      layers: transformLayers.map(item => ({id: item.id, initial: {...item.transform}})),
      resizeFrom: kind === 'resize' ? {
        x: start.x < layer.transform.x + layer.transform.width / 2 ? -1 : 1,
        y: start.y < layer.transform.y + layer.transform.height / 2 ? -1 : 1,
      } : undefined,
    };
    svgRef.current.setPointerCapture(event.pointerId);
  };

  const beginTextEdit = (layer: ExperienceLayer) => {
    if (layer.locked || layer.type !== 'text') return;
    interaction.current = null;
    if (tool !== 'select') onExitTool?.();
    onSelectLayers([layer.id]);
    onEditingTextLayerIdChange(layer.id);
  };

  const onLayerPointerDown = (event: ReactPointerEvent<SVGGElement>, layer: ExperienceLayer) => {
    if (event.button !== 0 || tool !== 'select') return;
    event.preventDefault();
    event.stopPropagation();
    if (event.shiftKey || event.ctrlKey || event.metaKey) {
      onSelectLayers(selectedLayerIds.includes(layer.id)
        ? selectedLayerIds.filter(id => id !== layer.id)
        : [...selectedLayerIds, layer.id]);
      rootRef.current?.focus();
      return;
    }
    if (layer.type === 'text' && !layer.locked) {
      const previous = lastTextPointerDown.current;
      const isDoubleActivation = Boolean(
        previous
        && previous.layerId === layer.id
        && event.timeStamp - previous.timeStamp <= 450
        && Math.hypot(event.clientX - previous.clientX, event.clientY - previous.clientY) <= 10
      );
      lastTextPointerDown.current = isDoubleActivation ? null : {
        layerId: layer.id,
        timeStamp: event.timeStamp,
        clientX: event.clientX,
        clientY: event.clientY,
      };
      if (isDoubleActivation) {
        beginTextEdit(layer);
        return;
      }
    } else {
      lastTextPointerDown.current = null;
    }
    const nextSelection = selectedLayerIds.includes(layer.id) ? selectedLayerIds : [layer.id];
    rootRef.current?.focus();
    startTransform(event, 'move', layer, nextSelection);
  };

  const onLayerDoubleClick = (event: ReactMouseEvent<SVGGElement>, layer: ExperienceLayer) => {
    if (layer.locked || layer.type !== 'text') return;
    event.preventDefault();
    event.stopPropagation();
    beginTextEdit(layer);
  };

  const startPointEdit = (event: ReactPointerEvent<SVGCircleElement>, layer: ExperienceLayer, pointIndex: number) => {
    if (event.button !== 0 || layer.locked || !svgRef.current || !layer.points) return;
    if (event.altKey) {
      event.preventDefault();
      event.stopPropagation();
      removeRoutePoint(layer, pointIndex);
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    onSelectLayers([layer.id]);
    setSelectedPointIndex(null);
    setSelectedPointIndex(pointIndex);
    rootRef.current?.focus();
    onInteractionStart?.(layer, 'point', [layer.id]);
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
    const clickedLayer = event.target !== event.currentTarget
      ? (event.target as Element).closest<SVGGElement>('[data-layer-id]')
      : null;
    if (
      event.button !== 0
      || !svgRef.current
      || (tool === 'select' && clickedLayer)
      || (tool === 'text' && clickedLayer?.dataset.layerType === 'text')
    ) return;
    event.preventDefault();
    rootRef.current?.focus();
    const rawPoint = pointFromEvent(event.nativeEvent, svgRef.current);
    if (tool === 'select') {
      const clickedSurface = findSurfaceAtPoint(section.surfaces, rawPoint);
      if (clickedSurface) onSelectSurface?.(clickedSurface.id);
      const point = snapDrawingPointToStage(rawPoint, svgRef.current, document.stage);
      interaction.current = {
        kind: 'marquee',
        start: point,
        current: point,
        initialSelection: selectedLayerIds,
        additive: event.shiftKey || event.ctrlKey || event.metaKey,
      };
      if (!(event.shiftKey || event.ctrlKey || event.metaKey)) onSelectLayers([]);
      setMarqueeBounds(drawingTransform(point, point));
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }
    if (tool === 'text') {
      const point = snapDrawingPointToStage(rawPoint, svgRef.current, document.stage);
      const surface = findSurfaceAtPoint(section.surfaces, point);
      const freeTransform = createTransform({x: point.x, y: point.y, width: 520, height: 90});
      const next: ExperienceLayer = {
        id: createStableId('layer'),
        name: 'Text note',
        type: 'text',
        visible: true,
        locked: false,
        opacity: 1,
        transform: surface
          ? fitTransformToSurface(surface, freeTransform, point)
          : freeTransform,
        surfaceId: surface?.id,
        fill: '#ef6f4d',
        stroke: '#ef6f4d',
        strokeWidth: 0,
        text: 'Text note',
        fontSize: 48,
      };
      onAddLayer(next);
      onSelectLayers([next.id]);
      onEditingTextLayerIdChange(next.id);
      return;
    }
    const point = snapDrawingPointToStage(rawPoint, svgRef.current, document.stage);
    const surface = findSurfaceAtPoint(section.surfaces, point);
    interaction.current = {kind: 'draw', tool, start: point, points: [point], surfaceId: surface?.id};
    const next = makeShapeLayer(tool, point, {...point, x: point.x + 4, y: point.y + 4}, [point, point], surface);
    setDraftLayer(next);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const constrainLayerTransform = (layerId: string, transform: LayerTransform) => {
    const layer = section.layers.find(candidate => candidate.id === layerId);
    const surface = section.surfaces?.find(candidate => candidate.id === layer?.surfaceId);
    if (!layer || !surface) return transform;
    const asset = layer.type === 'asset' ? findAsset(document, layer.assetId) : null;
    return constrainTransformToSurface(
      surface,
      transform,
      asset ? assetAspectRatio(asset) : undefined,
    );
  };

  const onStagePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const active = interaction.current;
    if (!active || !svgRef.current) return;
    const rawPoint = pointFromEvent(event.nativeEvent, svgRef.current);
    if (active.kind === 'draw') {
      const snappedPoint = snapDrawingPointToStage(rawPoint, svgRef.current, document.stage);
      const point = snapDrawingPointToStage(
        constrainDrawingPoint(active.tool, active.start, snappedPoint, event.shiftKey),
        svgRef.current,
        document.stage,
      );
      if (active.tool === 'freehand') {
        const previous = active.points[active.points.length - 1];
        if (Math.hypot(point.x - previous.x, point.y - previous.y) > 3) active.points.push(point);
      }
      const surface = section.surfaces?.find(candidate => candidate.id === active.surfaceId);
      setDraftLayer(makeShapeLayer(
        active.tool,
        active.start,
        point,
        active.tool === 'freehand' ? active.points : [active.start, point],
        surface,
      ));
      return;
    }
    if (active.kind === 'marquee') {
      const point = snapDrawingPointToStage(rawPoint, svgRef.current, document.stage);
      active.current = point;
      setMarqueeBounds(drawingTransform(active.start, point));
      return;
    }
    const point = rawPoint;
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
      onUpdateLayers(active.layers.map(item => {
        const transform = constrainLayerTransform(item.id, {
          ...item.initial,
          x: item.initial.x + dx,
          y: item.initial.y + dy,
        });
        return {
          id: item.id,
          patch: {transform},
        };
      }));
    } else if (active.kind === 'resize') {
      if (!hasResizeDragStarted(active.startClient, {x: event.clientX, y: event.clientY})) return;
      const resizeFrom = active.resizeFrom || {x: 1, y: 1};
      const normalizedX = dx * resizeFrom.x / Math.max(80, active.initial.width);
      const normalizedY = dy * resizeFrom.y / Math.max(80, active.initial.height);
      const dominantDelta = Math.abs(normalizedX) > Math.abs(normalizedY) ? normalizedX : normalizedY;
      const minimumScale = Math.max(20 / Math.max(1, active.initial.width), 20 / Math.max(1, active.initial.height));
      const scale = Math.max(minimumScale, 1 + dominantDelta * 1.25);
      const sourceLayer = section.layers.find(layer => layer.id === active.layerId);
      if (sourceLayer && active.initialPoints && hasPointBoundedGeometry(sourceLayer)) {
        const geometry = resizePointLayerGeometry({
          layer: {
            ...sourceLayer,
            transform: active.initial,
            points: active.initialPoints,
          },
          scale,
          resizeFrom,
          stage: document.stage,
        });
        onUpdateLayer(active.layerId, {
          transform: geometry.transform,
          points: geometry.points,
        });
        return;
      }
      const width = active.initial.width * scale;
      const height = active.initial.height * scale;
      const nextTransform = {
        ...active.initial,
        x: resizeFrom.x < 0 ? active.initial.x + active.initial.width - width : active.initial.x,
        y: resizeFrom.y < 0 ? active.initial.y + active.initial.height - height : active.initial.y,
        width,
        height,
      };
      onUpdateLayer(active.layerId, {
        transform: constrainLayerTransform(active.layerId, nextTransform),
      });
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
    if (active?.kind === 'draw' && svgRef.current) {
      const rawPoint = pointFromEvent(event.nativeEvent, svgRef.current);
      const snappedPoint = snapDrawingPointToStage(rawPoint, svgRef.current, document.stage);
      const point = snapDrawingPointToStage(
        constrainDrawingPoint(active.tool, active.start, snappedPoint, event.shiftKey),
        svgRef.current,
        document.stage,
      );
      const points = active.tool === 'freehand'
        ? [...active.points, point]
        : [active.start, point];
      const surface = section.surfaces?.find(candidate => candidate.id === active.surfaceId);
      const next = makeShapeLayer(active.tool, active.start, point, points, surface);
      onAddLayer(next);
      onSelectLayers([]);
    }
    if (active?.kind === 'marquee') {
      const bounds = drawingTransform(active.start, active.current);
      const moved = Math.hypot(active.current.x - active.start.x, active.current.y - active.start.y) >= 4;
      const matchedIds = moved
        ? section.layers
            .filter(layer => layer.visible && !layer.locked && boundsIntersect(bounds, layerSelectionBounds(layer)))
            .map(layer => layer.id)
        : [];
      if (active.additive) {
        const next = new Set(active.initialSelection);
        matchedIds.forEach(id => {
          if (next.has(id)) next.delete(id);
          else next.add(id);
        });
        onSelectLayers([...next]);
      } else {
        onSelectLayers(matchedIds);
      }
    }
    if (active && active.kind !== 'draw' && active.kind !== 'marquee') onInteractionEnd?.();
    setDraftLayer(null);
    setMarqueeBounds(null);
  };

  const startStagePan = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 1 || interaction.current || panInteraction.current) return;
    event.preventDefault();
    event.stopPropagation();
    const bounds = event.currentTarget.getBoundingClientRect();
    panInteraction.current = {
      pointerId: event.pointerId,
      start: {x: event.clientX, y: event.clientY},
      initial: stageView,
      viewport: {width: bounds.width, height: bounds.height},
    };
    setIsPanning(true);
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const continueStagePan = (event: ReactPointerEvent<HTMLDivElement>) => {
    const active = panInteraction.current;
    if (!active || active.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    setStageView(clampStageView({
      ...active.initial,
      x: active.initial.x + event.clientX - active.start.x,
      y: active.initial.y + event.clientY - active.start.y,
    }, active.viewport));
  };

  const finishStagePan = (event: ReactPointerEvent<HTMLDivElement>) => {
    const active = panInteraction.current;
    if (!active || active.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    panInteraction.current = null;
    setIsPanning(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && tool !== 'select') {
      event.preventDefault();
      event.stopPropagation();
      interaction.current = null;
      setDraftLayer(null);
      onEditingTextLayerIdChange(null);
      onExitTool?.();
      return;
    }
    if (!selected || selected.locked) return;
    if ((event.key === 'Enter' || event.key === 'F2') && selected.type === 'text') {
      event.preventDefault();
      event.stopPropagation();
      onEditingTextLayerIdChange(selected.id);
      return;
    }
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
      onRemoveLayers(selectedLayers.filter(layer => !layer.locked).map(layer => layer.id));
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
    onUpdateLayers(selectedLayers.filter(layer => !layer.locked).map(layer => {
      const transform = constrainLayerTransform(layer.id, {
        ...layer.transform,
        x: layer.transform.x + direction[0] * amount,
        y: layer.transform.y + direction[1] * amount,
      });
      return {
        id: layer.id,
        patch: {transform},
      };
    }));
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!svgRef.current) return;
    try {
      const payload = JSON.parse(event.dataTransfer.getData('application/x-nk-experience-asset')) as {id: string; name: string; width?: number; height?: number};
      if (!payload.id) return;
      const point = pointFromEvent(event.nativeEvent, svgRef.current);
      const width = 600;
      const height = width / assetAspectRatio(payload);
      const freeTransform = createTransform({x: point.x - width / 2, y: point.y - height / 2, width, height});
      const next: ExperienceLayer = {
        id: createStableId('layer'),
        name: payload.name || 'Asset',
        type: 'asset',
        assetId: payload.id,
        visible: true,
        locked: false,
        opacity: 1,
        transform: freeTransform,
        surfaceId: undefined,
      };
      onAddLayer(next);
      onSelectLayers([next.id]);
    } catch {
      // Ignore unrelated browser drags.
    }
  };

  useEffect(() => {
    const validIds = new Set(section.layers.map(layer => layer.id));
    if (selectedLayerIds.some(id => !validIds.has(id))) {
      onSelectLayers(selectedLayerIds.filter(id => validIds.has(id)));
    }
  }, [onSelectLayers, section.layers, selectedLayerIds]);

  useEffect(() => {
    if (tool === 'select') return;
    interaction.current = null;
    setDraftLayer(null);
    setMarqueeBounds(null);
    setSelectedPointIndex(null);
    onEditingTextLayerIdChange(null);
    onSelectLayers([]);
    rootRef.current?.focus();
  }, [onEditingTextLayerIdChange, onSelectLayers, tool]);

  useEffect(() => {
    if (editingTextLayerId && editingTextLayerId !== selectedLayerId) onEditingTextLayerIdChange(null);
  }, [editingTextLayerId, onEditingTextLayerIdChange, selectedLayerId]);

  useEffect(() => {
    if (previousSelectedLayerId.current !== selectedLayerId) {
      previousSelectedLayerId.current = selectedLayerId;
      if (interaction.current?.kind !== 'point') setSelectedPointIndex(null);
    }
    if (!selectedRoute || selectedPointIndex === null) return;
    if (selectedPointIndex >= (selectedRoute.points?.length ?? 0)) setSelectedPointIndex(null);
  }, [selectedLayerId, selectedPointIndex, selectedRoute]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (interaction.current || panInteraction.current) return;
      const bounds = root.getBoundingClientRect();
      const deltaMultiplier = event.deltaMode === WheelEvent.DOM_DELTA_LINE
        ? 16
        : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
          ? bounds.height
          : 1;
      const delta = event.deltaY * deltaMultiplier;
      const factor = Math.exp(-delta * .0015);
      setStageView(current => {
        const nextScale = snapStageZoomToActualSize(current.scale, current.scale * factor);
        return zoomStageAroundPoint(
          current,
          nextScale,
          {x: event.clientX - bounds.left, y: event.clientY - bounds.top},
          {width: bounds.width, height: bounds.height},
        );
      });
    };
    root.addEventListener('wheel', handleWheel, {passive: false});
    return () => root.removeEventListener('wheel', handleWheel);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(entries => {
      const bounds = entries[0]?.contentRect;
      if (!bounds) return;
      setStageViewport({width: bounds.width, height: bounds.height});
      setStageView(current => clampStageView(current, {width: bounds.width, height: bounds.height}));
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  const overlaySelected = selected && isSingleSelection && hasPointBoundedGeometry(selected)
    ? {...selected, ...normalizePointLayerGeometry(selected, document.stage)}
    : selected;
  const transformHandles = overlaySelected && isSingleSelection
    ? transformHandlePositions(overlaySelected.transform, document.stage)
    : null;
  const editingSelectedText = Boolean(
    selected
    && isSingleSelection
    && selected.type === 'text'
    && editingTextLayerId === selected.id
  );

  const overlay = selected && overlaySelected && selected.visible ? <g
    transform={`translate(${overlaySelected.transform.x} ${overlaySelected.transform.y}) rotate(${overlaySelected.transform.rotation} ${overlaySelected.transform.width / 2} ${overlaySelected.transform.height / 2}) skewX(${overlaySelected.transform.skewX}) skewY(${overlaySelected.transform.skewY})`}
    className="ix-gizmo"
  >
    <rect width={overlaySelected.transform.width} height={overlaySelected.transform.height} fill="none" stroke="#43e4f2" strokeWidth="4" vectorEffect="non-scaling-stroke" pointerEvents="none"/>
    {transformHandles && !editingSelectedText && <>
      <line x1={overlaySelected.transform.width / 2} y1="0" x2={transformHandles.rotate.x} y2={transformHandles.rotate.y} className="ix-gizmo__transform-leader" pointerEvents="none"/>
      <g
        transform={`translate(${transformHandles.rotate.x} ${transformHandles.rotate.y})`}
        className="ix-gizmo__handle ix-gizmo__handle--rotate ix-gizmo__transform-handle"
        aria-label="Rotate selected object"
        onPointerDown={event => startTransform(event, 'rotate', selected)}
      >
        <title>Rotate</title>
        <circle r="27" className="ix-gizmo__transform-handle-bg"/>
        <path d="M -10 -7 A 14 14 0 1 1 -13 9" className="ix-gizmo__transform-icon"/>
        <path d="M -13 -11 H -3 V -1" className="ix-gizmo__transform-icon"/>
      </g>

      <line x1="0" y1="0" x2={transformHandles.skew.x} y2={transformHandles.skew.y} className="ix-gizmo__transform-leader ix-gizmo__transform-leader--skew" pointerEvents="none"/>
      <g
        transform={`translate(${transformHandles.skew.x} ${transformHandles.skew.y})`}
        className="ix-gizmo__handle ix-gizmo__handle--skew ix-gizmo__transform-handle ix-gizmo__transform-handle--skew"
        aria-label="Skew selected object"
        onPointerDown={event => startTransform(event, 'skew', selected)}
      >
        <title>Skew</title>
        <circle r="27" className="ix-gizmo__transform-handle-bg"/>
        <path d="M -10 -10 H 7 L 12 8 H -5 Z" className="ix-gizmo__transform-icon"/>
        <path d="M -14 14 H 14 M -14 14 L -8 9 M -14 14 L -8 19 M 14 14 L 8 9 M 14 14 L 8 19" className="ix-gizmo__transform-icon"/>
      </g>

      <g
        transform={`translate(${transformHandles.scale.x} ${transformHandles.scale.y})`}
        className="ix-gizmo__handle ix-gizmo__handle--resize ix-gizmo__transform-handle"
        aria-label="Scale selected object"
        onPointerDown={event => startTransform(event, 'resize', selected)}
      >
        <title>Scale</title>
        <circle r="46" className="ix-gizmo__transform-hit"/>
        <circle r="27" className="ix-gizmo__transform-handle-bg"/>
        <path d="M -12 -4 V -12 H -4 M 12 4 V 12 H 4 M -10 -10 L 10 10" className="ix-gizmo__transform-icon"/>
      </g>
    </>}
    {isSingleSelection && selected.type === 'parametric-path' && selected.points && <>
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
    {isSingleSelection && selected.type === 'text' && editingTextLayerId === selected.id && <foreignObject
      x="0"
      y="0"
      width={Math.max(180, selected.transform.width)}
      height={Math.max(36, (selected.fontSize || 48) * 1.25)}
      className="ix-gizmo__text-editor"
      onPointerDown={event => event.stopPropagation()}
      onDoubleClick={event => event.stopPropagation()}
    >
      <input
        type="text"
        autoFocus
        aria-label="Edit text note on canvas"
        value={selected.text || ''}
        style={{
          '--ix-live-text-size': `${selected.fontSize || 48}px`,
          color: selected.fill || '#f4f7f8',
        } as CSSProperties}
        onFocus={event => event.currentTarget.select()}
        onChange={event => {
          const value = event.target.value;
          onUpdateLayer(selected.id, {text: value, name: value.trim() || 'Text note'});
        }}
        onBlur={() => onEditingTextLayerIdChange(null)}
        onKeyDown={event => {
          event.stopPropagation();
          if (event.key !== 'Enter' && event.key !== 'Escape') return;
          event.preventDefault();
          if (event.key === 'Escape') onExitTool?.();
          event.currentTarget.blur();
        }}
      />
    </foreignObject>}
  </g> : null;

  const secondarySelectionOverlays = selectedLayers
    .filter(layer => layer.visible && layer.id !== selectedLayerId)
    .map(layer => <g
      key={`selection-${layer.id}`}
      transform={`translate(${layer.transform.x} ${layer.transform.y}) rotate(${layer.transform.rotation} ${layer.transform.width / 2} ${layer.transform.height / 2}) skewX(${layer.transform.skewX}) skewY(${layer.transform.skewY})`}
      pointerEvents="none"
    >
      <rect
        width={layer.transform.width}
        height={layer.transform.height}
        className="ix-gizmo__multi-outline"
        vectorEffect="non-scaling-stroke"
      />
    </g>);
  const marqueeOverlay = marqueeBounds ? <rect
    x={marqueeBounds.x}
    y={marqueeBounds.y}
    width={marqueeBounds.width}
    height={marqueeBounds.height}
    className="ix-marquee-selection"
    vectorEffect="non-scaling-stroke"
    pointerEvents="none"
  /> : null;

  const surfaceOverlay = section.surfaces?.length ? <g className="ix-surface-overlays">
    {section.surfaces.map(surface => {
      const points = surface.points.map(point => `${point.x},${point.y}`).join(' ');
      const label = surfaceCentroid(surface);
      const bounds = surfaceBounds(surface);
      const selectedSurface = surface.id === selectedSurfaceId;
      const rotateLabel = bounds.width < 320 && bounds.height > bounds.width * 1.5;
      return <g
        key={surface.id}
        className={`ix-surface-overlay ix-surface-overlay--${surface.kind} ${surface.geometry === 'curved' ? 'is-curved' : ''} ${selectedSurface ? 'is-selected' : ''}`}
      >
        <polygon points={points} className="ix-surface-overlay__fill" pointerEvents="none"/>
        <polygon
          points={points}
          className="ix-surface-overlay__boundary"
          vectorEffect="non-scaling-stroke"
          pointerEvents="stroke"
          onPointerDown={event => {
            if (event.button !== 0 || tool !== 'select') return;
            event.preventDefault();
            event.stopPropagation();
            onSelectSurface?.(surface.id);
            rootRef.current?.focus();
          }}
        />
        {selectedSurface && surfaceLabelVisible && <text
          x={label.x}
          y={label.y}
          textAnchor="middle"
          className="ix-surface-overlay__label"
          pointerEvents="none"
          transform={rotateLabel ? `rotate(-90 ${label.x} ${label.y})` : undefined}
        >
          TARGET · {surface.name.toUpperCase()}
        </text>}
      </g>;
    })}
  </g> : null;

  const draftLineEndpoints = draftLayer && (draftLayer.type === 'line' || draftLayer.type === 'arrow')
    ? getDirectionalLineEndpoints(draftLayer)
    : null;
  const draftOverlay = draftLayer ? <g
    pointerEvents="none"
    opacity=".8"
    transform={`translate(${draftLayer.transform.x} ${draftLayer.transform.y}) rotate(${draftLayer.transform.rotation} ${draftLayer.transform.width / 2} ${draftLayer.transform.height / 2}) skewX(${draftLayer.transform.skewX}) skewY(${draftLayer.transform.skewY})`}
  >
    {draftLayer.type === 'path'
      ? <path d={(draftLayer.points ?? []).map((point, index) => `${index ? 'L' : 'M'} ${point.x * draftLayer.transform.width} ${point.y * draftLayer.transform.height}`).join(' ')} fill="none" stroke="#ef6f4d" strokeWidth="8" strokeLinecap="round"/>
      : draftLayer.type === 'ellipse'
        ? <ellipse cx={draftLayer.transform.width / 2} cy={draftLayer.transform.height / 2} rx={draftLayer.transform.width / 2} ry={draftLayer.transform.height / 2} fill="rgba(239,111,77,.08)" stroke="#ef6f4d" strokeWidth="8"/>
        : draftLayer.type === 'rectangle'
          ? <rect width={draftLayer.transform.width} height={draftLayer.transform.height} fill="rgba(239,111,77,.08)" stroke="#ef6f4d" strokeWidth="8"/>
          : draftLineEndpoints
            ? <g>
                <line x1={draftLineEndpoints.start.x} y1={draftLineEndpoints.start.y} x2={draftLineEndpoints.end.x} y2={draftLineEndpoints.end.y} stroke="#ef6f4d" strokeWidth="8" strokeLinecap="round"/>
                {draftLayer.type === 'arrow' && <path d={getArrowHeadPathData(draftLineEndpoints.start, draftLineEndpoints.end, 8)} fill="#ef6f4d"/>}
              </g>
            : null}
  </g> : null;

  const workspaceBackdropStyle = {
    '--ix-stage-workspace-background': section.background || document.stage.background,
    '--ix-stage-floor-y': `${stageView.y + stageViewport.height * stageView.scale * ((roomBackdrop?.floor.transform.y ?? document.stage.height) / document.stage.height)}px`,
    '--ix-stage-corner-x': `${stageView.x + stageViewport.width * stageView.scale * ((roomBackdrop?.corner.transform.x ?? 0) / document.stage.width)}px`,
    ...(frameBackgroundAsset ? {
      backgroundImage: `url(${JSON.stringify(frameBackgroundAsset.source)})`,
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundSize: 'cover',
    } : {}),
  } as CSSProperties;

  const zoomControls = <div className={`ix-stage-zoom-controls ${zoomControlsHost ? 'ix-stage-zoom-controls--header' : ''}`} role="group" aria-label="Stage zoom controls">
    <button type="button" onClick={() => adjustStageZoom(1 / 1.2)} disabled={stageView.scale <= MIN_STAGE_ZOOM + .001} aria-label="Zoom out">−</button>
    <button type="button" className="ix-stage-zoom-controls__value" onClick={() => setStageView({scale: 1, x: 0, y: 0})} aria-label={`Reset zoom, currently ${Math.round(stageView.scale * 100)} percent`}>
      {Math.round(stageView.scale * 100)}%
    </button>
    <button type="button" onClick={() => adjustStageZoom(1.2)} disabled={stageView.scale >= MAX_STAGE_ZOOM - .001} aria-label="Zoom in">+</button>
  </div>;

  return <div
    ref={rootRef}
    className={`ix-studio-stage ix-studio-stage--tool-${tool} ${roomBackdrop && !frameBackgroundAsset ? 'ix-studio-stage--room-backdrop' : ''} ${isPanning ? 'ix-studio-stage--panning' : ''}`}
    style={workspaceBackdropStyle}
    tabIndex={0}
    onKeyDown={onKeyDown}
    onPointerDownCapture={startStagePan}
    onPointerMoveCapture={continueStagePan}
    onPointerUpCapture={finishStagePan}
    onPointerCancelCapture={finishStagePan}
    onAuxClick={event => {
      if (event.button === 1) event.preventDefault();
    }}
    onDragOver={event => event.preventDefault()}
    onDrop={onDrop}
    aria-label="Interactive 1920 by 1080 editing stage"
  >
    {zoomControlsHost ? createPortal(zoomControls, zoomControlsHost) : zoomControls}
    <div className="ix-stage-zoom-surface">
      <ExperienceStage
        document={document}
        section={renderedSection}
        fit="cover"
        viewBox={stageViewBox}
        selectedLayerIds={selectedLayerIds}
        contentHiddenLayerIds={editingTextLayerId ? [editingTextLayerId] : []}
        interactive
        showCalibrationGuides
        svgRef={svgRef}
        onLayerPointerDown={onLayerPointerDown}
        onLayerDoubleClick={onLayerDoubleClick}
        onStagePointerDown={onStagePointerDown}
        onStagePointerMove={onStagePointerMove}
        onStagePointerUp={finishInteraction}
        onStagePointerCancel={finishInteraction}
      >
        {surfaceOverlay}
        {draftOverlay}
        {marqueeOverlay}
        {secondarySelectionOverlays}
        {overlay}
      </ExperienceStage>
    </div>
  </div>;
}
