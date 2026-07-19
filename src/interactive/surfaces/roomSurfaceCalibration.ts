import {
  createStableId,
  createTransform,
  type ExperienceCalibrationRole,
  type ExperienceLayer,
  type ExperiencePoint,
  type ExperienceSection,
  type ExperienceSurface,
  type LayerTransform,
} from '../engine/schema';

type StageSize = {
  width: number;
  height: number;
};

type Segment = {
  layer: ExperienceLayer;
  points: ExperiencePoint[];
  start: ExperiencePoint;
  end: ExperiencePoint;
  length: number;
  midpoint: ExperiencePoint;
  horizontalness: number;
  verticalness: number;
};

export type RoomSurfaceDetection = {
  surfaces: ExperienceSurface[];
  guideRoles: Map<string, ExperienceCalibrationRole>;
  guideLayerIds: string[];
  message: string;
};

const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));
const distance = (first: ExperiencePoint, second: ExperiencePoint) => Math.hypot(first.x - second.x, first.y - second.y);
const pointKey = (point: ExperiencePoint) => `${point.x.toFixed(3)},${point.y.toFixed(3)}`;
const lerpPoint = (start: ExperiencePoint, end: ExperiencePoint, progress: number): ExperiencePoint => ({
  x: start.x + (end.x - start.x) * progress,
  y: start.y + (end.y - start.y) * progress,
});

const transformLocalPoint = (point: ExperiencePoint, layer: ExperienceLayer): ExperiencePoint => {
  const {x, y, width, height, rotation, skewX, skewY} = layer.transform;
  const local = {x: point.x * width, y: point.y * height};
  const center = {x: width / 2, y: height / 2};
  const tangentX = Math.tan(skewX * Math.PI / 180);
  const tangentY = Math.tan(skewY * Math.PI / 180);
  const skewedY = local.y + local.x * tangentY;
  const skewedX = local.x + skewedY * tangentX;
  const centeredX = skewedX - center.x;
  const centeredY = skewedY - center.y;
  const radians = rotation * Math.PI / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return {
    x: x + center.x + centeredX * cosine - centeredY * sine,
    y: y + center.y + centeredX * sine + centeredY * cosine,
  };
};

export const calibrationLayerStagePoints = (layer: ExperienceLayer): ExperiencePoint[] => {
  const points = layer.points?.length
    ? layer.points
    : [{x: 0, y: 0}, {x: 1, y: 1}];
  return points.map(point => transformLocalPoint(point, layer));
};

const toSegment = (layer: ExperienceLayer): Segment | null => {
  const points = calibrationLayerStagePoints(layer);
  if (points.length < 2) return null;
  const start = points[0];
  const end = points[points.length - 1];
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  if (length < 12) return null;
  return {
    layer,
    points,
    start,
    end,
    length,
    midpoint: {x: (start.x + end.x) / 2, y: (start.y + end.y) / 2},
    horizontalness: Math.abs(dy) / length,
    verticalness: Math.abs(dx) / length,
  };
};

const lineIntersection = (first: Segment, second: Segment): ExperiencePoint | null => {
  const x1 = first.start.x;
  const y1 = first.start.y;
  const x2 = first.end.x;
  const y2 = first.end.y;
  const x3 = second.start.x;
  const y3 = second.start.y;
  const x4 = second.end.x;
  const y4 = second.end.y;
  const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denominator) < .0001) return null;
  return {
    x: ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / denominator,
    y: ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / denominator,
  };
};

const fartherEndpoint = (segment: Segment, point: ExperiencePoint) => (
  distance(segment.start, point) >= distance(segment.end, point) ? segment.start : segment.end
);

const nearestEndpointDistance = (segment: Segment, point: ExperiencePoint) => (
  Math.min(distance(segment.start, point), distance(segment.end, point))
);

const surfaceArea = (points: ExperiencePoint[]) => Math.abs(points.reduce((area, point, index) => {
  const next = points[(index + 1) % points.length];
  return area + point.x * next.y - next.x * point.y;
}, 0) / 2);

const uniquePoints = (points: ExperiencePoint[]) => {
  const seen = new Set<string>();
  return points.filter(point => {
    const key = pointKey(point);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const preservedSurface = (
  id: string,
  fallback: Omit<ExperienceSurface, 'id'>,
  existing: ExperienceSurface[],
): ExperienceSurface => {
  const previous = existing.find(surface => surface.id === id);
  return {
    ...fallback,
    id,
    name: previous?.name || fallback.name,
    geometry: previous?.geometry || fallback.geometry,
  };
};

const eligibleGuide = (layer: ExperienceLayer) => (
  layer.visible
  && !layer.parametric
  && layer.name !== 'Room corner datum'
  && (
    layer.type === 'line'
    || (layer.type === 'path' && (layer.points?.length ?? 0) >= 2)
  )
);

export const detectRoomSurfaces = ({
  layers,
  stage,
  selectedLayerIds = [],
  existingSurfaces = [],
  taggedOnly = false,
}: {
  layers: ExperienceLayer[];
  stage: StageSize;
  selectedLayerIds?: string[];
  existingSurfaces?: ExperienceSurface[];
  taggedOnly?: boolean;
}): RoomSurfaceDetection => {
  const selected = new Set(selectedLayerIds);
  const allCandidates = layers.filter(eligibleGuide);
  const taggedCandidates = allCandidates.filter(layer => layer.calibrationRole);
  const selectedCandidates = allCandidates.filter(layer => selected.has(layer.id));
  const sourceLayers = taggedOnly
    ? taggedCandidates
    : selectedCandidates.length >= 2
      ? selectedCandidates
      : allCandidates;
  const segments = sourceLayers.map(toSegment).filter((segment): segment is Segment => Boolean(segment));
  const byRole = (role: ExperienceCalibrationRole) => segments.find(segment => segment.layer.calibrationRole === role);

  const floorBoundary = byRole('wall-floor') || segments
    .filter(segment => segment.horizontalness <= .22 && segment.midpoint.y >= stage.height * .28)
    .sort((left, right) => (
      right.length + right.midpoint.y * .28
      - left.length - left.midpoint.y * .28
    ))[0];

  if (!floorBoundary) {
    return {
      surfaces: [],
      guideRoles: new Map(),
      guideLayerIds: [],
      message: 'Add or select a long wall–floor line before detecting surfaces.',
    };
  }

  const cornerCandidates = segments.filter(segment => (
    segment.layer.id !== floorBoundary.layer.id
    && segment.verticalness <= .24
  ));
  const cornerBoundary = byRole('wall-corner') || cornerCandidates
    .map(segment => ({segment, intersection: lineIntersection(floorBoundary, segment)}))
    .filter(item => item.intersection)
    .sort((left, right) => {
      const leftIntersection = left.intersection as ExperiencePoint;
      const rightIntersection = right.intersection as ExperiencePoint;
      const leftScore = nearestEndpointDistance(left.segment, leftIntersection) - left.segment.length * .08;
      const rightScore = nearestEndpointDistance(right.segment, rightIntersection) - right.segment.length * .08;
      return leftScore - rightScore;
    })[0]?.segment;

  if (!cornerBoundary) {
    return {
      surfaces: [],
      guideRoles: new Map([[floorBoundary.layer.id, 'wall-floor']]),
      guideLayerIds: [floorBoundary.layer.id],
      message: 'Add or select a vertical wall-corner line that meets the wall–floor line.',
    };
  }

  const rawJunction = lineIntersection(floorBoundary, cornerBoundary);
  if (!rawJunction) {
    return {
      surfaces: [],
      guideRoles: new Map([
        [floorBoundary.layer.id, 'wall-floor'],
        [cornerBoundary.layer.id, 'wall-corner'],
      ]),
      guideLayerIds: [floorBoundary.layer.id, cornerBoundary.layer.id],
      message: 'The wall-corner and wall–floor guides need to intersect.',
    };
  }

  const junction = {
    x: clamp(rawJunction.x, 0, stage.width),
    y: clamp(rawJunction.y, 0, stage.height),
  };
  const diagonalCandidates = segments.filter(segment => (
    segment.layer.id !== floorBoundary.layer.id
    && segment.layer.id !== cornerBoundary.layer.id
  ));
  const floorSideBoundary = byRole('floor-depth') || diagonalCandidates
    .map(segment => ({
      segment,
      score: nearestEndpointDistance(segment, junction)
        + Math.min(segment.horizontalness, segment.verticalness) * stage.width * .16,
    }))
    .filter(item => item.score <= Math.hypot(stage.width, stage.height) * .28)
    .sort((left, right) => left.score - right.score)[0]?.segment;

  const floorFar = fartherEndpoint(floorBoundary, junction);
  const mainDirection = Math.sign(floorFar.x - junction.x) || 1;
  const mainEdgeX = mainDirection > 0 ? stage.width : 0;
  const sideEdgeX = mainDirection > 0 ? 0 : stage.width;
  const cornerTop = fartherEndpoint(cornerBoundary, junction);
  const topJunction = {
    x: clamp(cornerTop.x, 0, stage.width),
    y: 0,
  };
  const mainWallPoints = uniquePoints([
    topJunction,
    {x: mainEdgeX, y: 0},
    {x: clamp(floorFar.x, 0, stage.width), y: clamp(floorFar.y, 0, stage.height)},
    junction,
  ]);
  const surfaces: ExperienceSurface[] = [];
  const guideRoles = new Map<string, ExperienceCalibrationRole>([
    [floorBoundary.layer.id, 'wall-floor'],
    [cornerBoundary.layer.id, 'wall-corner'],
  ]);

  if (mainWallPoints.length >= 3 && surfaceArea(mainWallPoints) >= 500) {
    surfaces.push(preservedSurface('surface-main-wall', {
      name: 'Main wall',
      kind: 'wall',
      geometry: 'flat',
      points: mainWallPoints,
      guideLayerIds: [cornerBoundary.layer.id, floorBoundary.layer.id],
    }, existingSurfaces));
  }

  let sideFar: ExperiencePoint | null = null;
  if (floorSideBoundary) {
    guideRoles.set(floorSideBoundary.layer.id, 'floor-depth');
    sideFar = fartherEndpoint(floorSideBoundary, junction);
    const sideWallPoints = uniquePoints([
      {x: sideEdgeX, y: 0},
      topJunction,
      junction,
      {x: clamp(sideFar.x, 0, stage.width), y: clamp(sideFar.y, 0, stage.height)},
    ]);
    if (sideWallPoints.length >= 3 && surfaceArea(sideWallPoints) >= 500) {
      surfaces.push(preservedSurface('surface-side-wall', {
        name: 'Side wall',
        kind: 'wall',
        geometry: 'flat',
        points: sideWallPoints,
        guideLayerIds: [cornerBoundary.layer.id, floorSideBoundary.layer.id],
      }, existingSurfaces));
    }
  }

  const floorPoints = mainDirection > 0
    ? uniquePoints([
        junction,
        {x: clamp(floorFar.x, 0, stage.width), y: clamp(floorFar.y, 0, stage.height)},
        {x: stage.width, y: stage.height},
        {x: 0, y: stage.height},
        ...(sideFar ? [{x: clamp(sideFar.x, 0, stage.width), y: clamp(sideFar.y, 0, stage.height)}] : []),
      ])
    : uniquePoints([
        junction,
        ...(sideFar ? [{x: clamp(sideFar.x, 0, stage.width), y: clamp(sideFar.y, 0, stage.height)}] : []),
        {x: stage.width, y: stage.height},
        {x: 0, y: stage.height},
        {x: clamp(floorFar.x, 0, stage.width), y: clamp(floorFar.y, 0, stage.height)},
      ]);
  if (floorPoints.length >= 3 && surfaceArea(floorPoints) >= 500) {
    surfaces.push(preservedSurface('surface-floor', {
      name: 'Floor',
      kind: 'floor',
      geometry: 'flat',
      points: floorPoints,
      guideLayerIds: [
        floorBoundary.layer.id,
        ...(floorSideBoundary ? [floorSideBoundary.layer.id] : []),
      ],
    }, existingSurfaces));
  }

  const guideLayerIds = [...guideRoles.keys()];
  return {
    surfaces,
    guideRoles,
    guideLayerIds,
    message: surfaces.length >= 3
      ? 'Detected main wall, side wall and floor.'
      : surfaces.length === 2
        ? 'Detected one wall and the floor. Add a diagonal floor-depth guide for a side wall.'
        : `Detected ${surfaces.length} calibrated surface${surfaces.length === 1 ? '' : 's'}.`,
  };
};

const calibrationLine = (
  name: string,
  role: ExperienceCalibrationRole,
  start: ExperiencePoint,
  end: ExperiencePoint,
  stroke: string,
): ExperienceLayer => {
  const transform = createTransform({
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.max(4, Math.abs(end.x - start.x)),
    height: Math.max(4, Math.abs(end.y - start.y)),
  });
  return {
    id: createStableId('guide'),
    name,
    type: 'line',
    visible: true,
    locked: false,
    opacity: 1,
    transform,
    points: [start, end].map(point => ({
      x: (point.x - transform.x) / transform.width,
      y: (point.y - transform.y) / transform.height,
    })),
    fill: 'none',
    stroke,
    strokeWidth: 8,
    calibrationRole: role,
  };
};

export const createThreeLineRoomGuides = (stage: StageSize): ExperienceLayer[] => {
  const junction = {
    x: stage.width * (166 / 1920),
    y: stage.height * (930 / 1080),
  };
  return [
    calibrationLine(
      'Calibration · wall corner',
      'wall-corner',
      {x: junction.x, y: stage.height * .04},
      junction,
      '#41d8e8',
    ),
    calibrationLine(
      'Calibration · wall/floor',
      'wall-floor',
      junction,
      {x: stage.width, y: junction.y},
      '#ff7755',
    ),
    calibrationLine(
      'Calibration · floor depth',
      'floor-depth',
      {x: 0, y: stage.height},
      junction,
      '#b78cff',
    ),
  ];
};

export const synchronizeCalibratedSurfaces = (
  section: ExperienceSection,
  stage: StageSize,
): ExperienceSection => {
  if (!section.layers.some(layer => layer.calibrationRole)) return section;
  const calibrationRoles = new Set(
    section.layers
      .map(layer => layer.calibrationRole)
      .filter((role): role is ExperienceCalibrationRole => Boolean(role)),
  );
  const detection = detectRoomSurfaces({
    layers: section.layers,
    stage,
    existingSurfaces: section.surfaces || [],
    // A replacement guide starts life as a normal line. Include untagged
    // candidates until all three calibration roles have been recovered.
    taggedOnly: calibrationRoles.size >= 3,
  });
  const validSurfaceIds = new Set(detection.surfaces.map(surface => surface.id));
  return {
    ...section,
    surfaces: detection.surfaces,
    layers: section.layers.map(layer => {
      const calibrationRole = detection.guideRoles.get(layer.id) || layer.calibrationRole;
      return {
        ...layer,
        ...(calibrationRole ? {calibrationRole} : {}),
        ...(layer.surfaceId && !validSurfaceIds.has(layer.surfaceId) ? {surfaceId: undefined} : {}),
      };
    }),
  };
};

export const surfaceBounds = (surface: ExperienceSurface) => {
  const xs = surface.points.map(point => point.x);
  const ys = surface.points.map(point => point.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return {
    x,
    y,
    width: Math.max(1, Math.max(...xs) - x),
    height: Math.max(1, Math.max(...ys) - y),
  };
};

export const surfaceCentroid = (surface: ExperienceSurface): ExperiencePoint => {
  const bounds = surfaceBounds(surface);
  return {x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2};
};

export const surfaceContainsPoint = (surface: ExperienceSurface, point: ExperiencePoint) => {
  let inside = false;
  for (let index = 0, previous = surface.points.length - 1; index < surface.points.length; previous = index++) {
    const currentPoint = surface.points[index];
    const previousPoint = surface.points[previous];
    const intersects = (
      (currentPoint.y > point.y) !== (previousPoint.y > point.y)
      && point.x < (
        (previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)
        / ((previousPoint.y - currentPoint.y) || .000001)
        + currentPoint.x
      )
    );
    if (intersects) inside = !inside;
  }
  return inside;
};

export const findSurfaceAtPoint = (
  surfaces: ExperienceSurface[] | undefined,
  point: ExperiencePoint,
) => (surfaces || [])
  .filter(surface => surfaceContainsPoint(surface, point))
  .sort((left, right) => surfaceArea(left.points) - surfaceArea(right.points))[0] || null;

const normalizeSurfaceRotation = (degrees: number) => {
  let normalized = degrees;
  while (normalized > 90) normalized -= 180;
  while (normalized < -90) normalized += 180;
  return Math.abs(normalized) < .001 ? 0 : normalized;
};

const removeImperceptiblePerspective = (degrees: number) => (
  Math.abs(degrees) < 2 ? 0 : degrees
);

export type SurfacePerspectiveOrientation = {
  rotation: number;
  skewX: number;
  skewY: number;
};

export const surfacePerspectiveOrientation = (
  surface: ExperienceSurface,
  anchor: ExperiencePoint = surfaceCentroid(surface),
): SurfacePerspectiveOrientation => {
  if (surface.points.length < 4 || surface.kind !== 'wall') {
    return {rotation: 0, skewX: 0, skewY: 0};
  }

  // Room calibration stores wall quadrilaterals in plane order:
  // top-near, top-far, bottom-far, bottom-near. Interpolating those
  // opposing edges gives the projected horizontal and vertical axes at the
  // object's position. A side wall therefore gains the same receding slope
  // as the wall/floor datum instead of being rotated as a rigid picture.
  const [topNear, topFar, bottomFar, bottomNear] = surface.points;
  const topMidpoint = lerpPoint(topNear, topFar, .5);
  const bottomMidpoint = lerpPoint(bottomNear, bottomFar, .5);
  const verticalSpan = bottomMidpoint.y - topMidpoint.y;
  const progress = clamp(
    Math.abs(verticalSpan) < .001 ? .5 : (anchor.y - topMidpoint.y) / verticalSpan,
    0,
    1,
  );
  const horizontalStart = lerpPoint(topNear, bottomNear, progress);
  const horizontalEnd = lerpPoint(topFar, bottomFar, progress);
  const verticalStart = lerpPoint(topNear, topFar, .5);
  const verticalEnd = lerpPoint(bottomNear, bottomFar, .5);
  const horizontalAngle = Math.atan2(
    horizontalEnd.y - horizontalStart.y,
    horizontalEnd.x - horizontalStart.x,
  ) * 180 / Math.PI;
  const verticalAngle = Math.atan2(
    verticalEnd.y - verticalStart.y,
    verticalEnd.x - verticalStart.x,
  ) * 180 / Math.PI;
  const rotation = removeImperceptiblePerspective(
    normalizeSurfaceRotation(verticalAngle - 90),
  );
  return {
    rotation,
    skewX: 0,
    skewY: removeImperceptiblePerspective(
      clamp(normalizeSurfaceRotation(horizontalAngle - rotation), -60, 60),
    ),
  };
};

export const surfacePlacementRotation = (surface: ExperienceSurface) => (
  surfacePerspectiveOrientation(surface).rotation
);

const transformPointWithinLayer = (
  transform: LayerTransform,
  point: ExperiencePoint,
): ExperiencePoint => {
  const center = {x: transform.width / 2, y: transform.height / 2};
  const tangentX = Math.tan(transform.skewX * Math.PI / 180);
  const tangentY = Math.tan(transform.skewY * Math.PI / 180);
  const skewedY = point.y + point.x * tangentY;
  const skewedX = point.x + skewedY * tangentX;
  const centeredX = skewedX - center.x;
  const centeredY = skewedY - center.y;
  const radians = transform.rotation * Math.PI / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return {
    x: transform.x + center.x + centeredX * cosine - centeredY * sine,
    y: transform.y + center.y + centeredX * sine + centeredY * cosine,
  };
};

export const clearTransformOrientation = (
  initial: LayerTransform,
  anchorLocal: ExperiencePoint = {x: .5, y: .5},
): LayerTransform => {
  const localPoint = {
    x: initial.width * anchorLocal.x,
    y: initial.height * anchorLocal.y,
  };
  const fixedPoint = transformPointWithinLayer(initial, localPoint);
  const cleared = {
    ...initial,
    rotation: 0,
    skewX: 0,
    skewY: 0,
  };
  const clearedPoint = transformPointWithinLayer(cleared, localPoint);
  return {
    ...cleared,
    x: cleared.x + fixedPoint.x - clearedPoint.x,
    y: cleared.y + fixedPoint.y - clearedPoint.y,
  };
};

export const isTransformSurfaceAdapted = (
  surface: ExperienceSurface,
  transform: LayerTransform,
  tolerance = .25,
) => {
  if (surface.kind !== 'wall') return false;
  const anchor = transformPointWithinLayer(transform, {
    x: transform.width / 2,
    y: transform.height / 2,
  });
  const orientation = surfacePerspectiveOrientation(surface, anchor);
  return Math.abs(transform.rotation - orientation.rotation) <= tolerance
    && Math.abs(transform.skewX - orientation.skewX) <= tolerance
    && Math.abs(transform.skewY - orientation.skewY) <= tolerance;
};

export const isLegacyAutomaticallyOrientedTransform = (
  surface: ExperienceSurface,
  transform: LayerTransform,
  tolerance = .25,
) => {
  if (isTransformSurfaceAdapted(surface, transform, tolerance)) return true;
  // Older Studio versions wrote the wall perspective directly into an image.
  // The calibration guides could then be edited, so comparing against only the
  // current surface misses transforms generated from the previous geometry.
  return surface.kind === 'wall'
    && Math.abs(transform.skewX) <= tolerance
    && (
      Math.abs(transform.rotation) > tolerance
      || Math.abs(transform.skewY) > tolerance
    );
};

export const adaptTransformToSurface = (
  surface: ExperienceSurface,
  initial: LayerTransform,
  anchorLocal: ExperiencePoint = {x: .5, y: .5},
): LayerTransform => {
  if (surface.kind !== 'wall') return initial;
  const localPoint = {
    x: initial.width * anchorLocal.x,
    y: initial.height * anchorLocal.y,
  };
  const fixedPoint = transformPointWithinLayer(initial, localPoint);
  const orientation = surfacePerspectiveOrientation(surface, fixedPoint);
  const adapted = {
    ...initial,
    ...orientation,
  };
  const adaptedPoint = transformPointWithinLayer(adapted, localPoint);
  return {
    ...adapted,
    x: adapted.x + fixedPoint.x - adaptedPoint.x,
    y: adapted.y + fixedPoint.y - adaptedPoint.y,
  };
};

export const constrainTransformToSurface = (
  surface: ExperienceSurface,
  initial: LayerTransform,
  contentAspectRatio?: number,
): LayerTransform => {
  const bounds = surfaceBounds(surface);
  const contentBox = (width: number, height: number) => {
    if (!contentAspectRatio || !Number.isFinite(contentAspectRatio) || contentAspectRatio <= 0) {
      return {x: 0, y: 0, width, height};
    }
    const transformRatio = width / Math.max(1, height);
    if (transformRatio > contentAspectRatio) {
      const contentWidth = height * contentAspectRatio;
      return {x: (width - contentWidth) / 2, y: 0, width: contentWidth, height};
    }
    const contentHeight = width / contentAspectRatio;
    return {x: 0, y: (height - contentHeight) / 2, width, height: contentHeight};
  };
  const transformedContentBox = (width: number, height: number) => {
    const content = contentBox(width, height);
    const candidate = {...initial, x: 0, y: 0, width, height};
    const corners = [
      {x: content.x, y: content.y},
      {x: content.x + content.width, y: content.y},
      {x: content.x + content.width, y: content.y + content.height},
      {x: content.x, y: content.y + content.height},
    ].map(point => transformPointWithinLayer(candidate, point));
    const minimumX = Math.min(...corners.map(point => point.x));
    const maximumX = Math.max(...corners.map(point => point.x));
    const minimumY = Math.min(...corners.map(point => point.y));
    const maximumY = Math.max(...corners.map(point => point.y));
    return {
      x: minimumX,
      y: minimumY,
      width: maximumX - minimumX,
      height: maximumY - minimumY,
    };
  };
  let width = Math.max(20, initial.width);
  let height = Math.max(20, initial.height);
  let content = transformedContentBox(width, height);
  const scale = Math.min(1, bounds.width / Math.max(1, content.width), bounds.height / Math.max(1, content.height));
  width *= scale;
  height *= scale;
  content = transformedContentBox(width, height);
  const minimumX = bounds.x - content.x;
  const minimumY = bounds.y - content.y;
  const maximumX = Math.max(minimumX, bounds.x + bounds.width - content.x - content.width);
  const maximumY = Math.max(minimumY, bounds.y + bounds.height - content.y - content.height);
  return {
    ...initial,
    x: clamp(initial.x, minimumX, maximumX),
    y: clamp(initial.y, minimumY, maximumY),
    width,
    height,
  };
};

export const fitTransformToSurface = (
  surface: ExperienceSurface,
  initial: LayerTransform = createTransform({x: 0, y: 0, width: 600, height: 360}),
  anchor?: ExperiencePoint,
  options: {
    widthCoverage?: number;
    heightCoverage?: number;
    marginScale?: number;
  } = {},
): LayerTransform => {
  const bounds = surfaceBounds(surface);
  const ratio = Math.max(.1, initial.width / Math.max(1, initial.height));
  const marginScale = clamp(options.marginScale ?? 1, 0, 2);
  const marginX = Math.min(48, bounds.width * .08) * marginScale;
  const marginY = Math.min(38, bounds.height * .08) * marginScale;
  const availableWidth = Math.max(24, bounds.width - marginX * 2);
  const availableHeight = Math.max(24, bounds.height - marginY * 2);
  const widthCoverage = clamp(options.widthCoverage ?? (surface.kind === 'floor' ? .58 : .82), .1, 1);
  const heightCoverage = clamp(options.heightCoverage ?? .88, .1, 1);
  let width = Math.min(Math.max(80, initial.width), availableWidth * widthCoverage);
  let height = width / ratio;
  if (height > availableHeight * heightCoverage) {
    height = availableHeight * heightCoverage;
    width = height * ratio;
  }
  const target = anchor || surfaceCentroid(surface);
  const minimumX = bounds.x + marginX;
  const maximumX = bounds.x + bounds.width - marginX - width;
  const x = clamp(target.x - width / 2, minimumX, Math.max(minimumX, maximumX));
  const naturalY = anchor
    ? target.y - height / 2
    : surface.kind === 'floor'
      ? target.y - height
      : bounds.y + bounds.height - marginY - height;
  const minimumY = bounds.y + marginY;
  const maximumY = bounds.y + bounds.height - marginY - height;
  const placed = adaptTransformToSurface(surface, {
    ...initial,
    x,
    y: clamp(naturalY, minimumY, Math.max(minimumY, maximumY)),
    width,
    height,
    rotation: 0,
    skewX: 0,
    skewY: 0,
  });
  return constrainTransformToSurface(surface, placed);
};
