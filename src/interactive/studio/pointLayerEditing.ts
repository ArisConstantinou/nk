import {
  type ExperienceLayer,
  type ExperiencePoint,
  type LayerTransform,
} from '../engine/schema';

export type PointLayerGeometry = {
  transform: LayerTransform;
  points: ExperiencePoint[];
};

const pointBoundedLayerTypes = new Set<ExperienceLayer['type']>(['line', 'arrow', 'path']);

export const hasPointBoundedGeometry = (layer: ExperienceLayer) => (
  pointBoundedLayerTypes.has(layer.type)
  && Boolean(layer.points && layer.points.length >= 2)
);

export const hasResizeDragStarted = (
  start: ExperiencePoint,
  current: ExperiencePoint,
  threshold = 5,
) => Math.hypot(current.x - start.x, current.y - start.y) >= threshold;

const transformLocalPoint = (
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

export const normalizePointLayerGeometry = (
  layer: ExperienceLayer,
  stage?: {width: number; height: number},
): PointLayerGeometry => {
  if (!hasPointBoundedGeometry(layer) || !layer.points) {
    return {
      transform: {...layer.transform},
      points: (layer.points || []).map(point => ({...point})),
    };
  }

  let localPoints = layer.points.map(point => ({
    x: point.x * layer.transform.width,
    y: point.y * layer.transform.height,
  }));
  if (
    stage
    && !layer.transform.rotation
    && !layer.transform.skewX
    && !layer.transform.skewY
  ) {
    localPoints = localPoints.map(point => ({
      x: Math.max(0, Math.min(stage.width, layer.transform.x + point.x)) - layer.transform.x,
      y: Math.max(0, Math.min(stage.height, layer.transform.y + point.y)) - layer.transform.y,
    }));
  }
  const minimumX = Math.min(...localPoints.map(point => point.x));
  const minimumY = Math.min(...localPoints.map(point => point.y));
  const maximumX = Math.max(...localPoints.map(point => point.x));
  const maximumY = Math.max(...localPoints.map(point => point.y));
  const width = Math.max(1, maximumX - minimumX);
  const height = Math.max(1, maximumY - minimumY);
  const points = localPoints.map(point => ({
    x: (point.x - minimumX) / width,
    y: (point.y - minimumY) / height,
  }));
  const transform = {
    ...layer.transform,
    width,
    height,
  };

  // Re-basing the local point box changes the rotation/skew centre. Keep one
  // point fixed in stage coordinates so the complete affine shape stays put.
  const fixedPoint = transformLocalPoint(layer.transform, localPoints[0]);
  const rebasedPoint = transformLocalPoint(transform, {
    x: localPoints[0].x - minimumX,
    y: localPoints[0].y - minimumY,
  });
  transform.x += fixedPoint.x - rebasedPoint.x;
  transform.y += fixedPoint.y - rebasedPoint.y;

  return {transform, points};
};

const resizedTransform = (
  initial: LayerTransform,
  scale: number,
  resizeFrom: {x: -1 | 1; y: -1 | 1},
): LayerTransform => {
  const width = initial.width * scale;
  const height = initial.height * scale;
  return {
    ...initial,
    x: resizeFrom.x < 0 ? initial.x + initial.width - width : initial.x,
    y: resizeFrom.y < 0 ? initial.y + initial.height - height : initial.y,
    width,
    height,
  };
};

const geometryFitsStage = (
  geometry: PointLayerGeometry,
  stage: {width: number; height: number},
) => geometry.points.every(point => {
  const transformed = transformLocalPoint(geometry.transform, {
    x: point.x * geometry.transform.width,
    y: point.y * geometry.transform.height,
  });
  return transformed.x >= -.001
    && transformed.y >= -.001
    && transformed.x <= stage.width + .001
    && transformed.y <= stage.height + .001;
});

export const resizePointLayerGeometry = ({
  layer,
  scale,
  resizeFrom,
  stage,
}: {
  layer: ExperienceLayer;
  scale: number;
  resizeFrom: {x: -1 | 1; y: -1 | 1};
  stage: {width: number; height: number};
}): PointLayerGeometry => {
  const normalized = normalizePointLayerGeometry(layer, stage);
  const requestedScale = Math.max(.01, scale);
  const geometryAt = (candidateScale: number): PointLayerGeometry => ({
    transform: resizedTransform(normalized.transform, candidateScale, resizeFrom),
    points: normalized.points.map(point => ({...point})),
  });
  const requested = geometryAt(requestedScale);
  if (geometryFitsStage(requested, stage)) return requested;
  if (requestedScale <= 1 || !geometryFitsStage(geometryAt(1), stage)) return normalized;

  let minimum = 1;
  let maximum = requestedScale;
  for (let index = 0; index < 32; index += 1) {
    const candidate = (minimum + maximum) / 2;
    if (geometryFitsStage(geometryAt(candidate), stage)) minimum = candidate;
    else maximum = candidate;
  }
  return geometryAt(minimum);
};
