import type {ExperiencePoint, LayerTransform} from '../engine/schema';

type StageSize = {
  width: number;
  height: number;
};

type DirectionCandidate = {
  x: number;
  y: number;
  priority: number;
};

const clamp = (value: number, minimum: number, maximum: number) => (
  Math.max(minimum, Math.min(maximum, value))
);

const normalize = (x: number, y: number) => {
  const length = Math.hypot(x, y);
  return length > .001 ? {x: x / length, y: y / length} : null;
};

export function createVisibleRouteExtensionPoint(options: {
  endpoint: ExperiencePoint;
  neighbour: ExperiencePoint;
  transform: LayerTransform;
  stage: StageSize;
}): ExperiencePoint {
  const {endpoint, neighbour, transform, stage} = options;
  const width = Math.max(1, transform.width);
  const height = Math.max(1, transform.height);
  const endpointStage = {
    x: transform.x + endpoint.x * width,
    y: transform.y + endpoint.y * height,
  };
  const neighbourStage = {
    x: transform.x + neighbour.x * width,
    y: transform.y + neighbour.y * height,
  };
  const forward = normalize(
    endpointStage.x - neighbourStage.x,
    endpointStage.y - neighbourStage.y,
  ) || normalize(stage.width / 2 - endpointStage.x, stage.height / 2 - endpointStage.y) || {x: 1, y: 0};
  const towardCentre = normalize(
    stage.width / 2 - endpointStage.x,
    stage.height / 2 - endpointStage.y,
  ) || {x: -forward.x, y: -forward.y};
  const segmentLength = Math.hypot(
    endpointStage.x - neighbourStage.x,
    endpointStage.y - neighbourStage.y,
  );
  const step = clamp(segmentLength * .35, 56, 140);
  const margin = Math.min(42, stage.width * .1, stage.height * .1);
  const bounds = {
    minimumX: margin,
    maximumX: Math.max(margin, stage.width - margin),
    minimumY: margin,
    maximumY: Math.max(margin, stage.height - margin),
  };
  const perpendicularA = {x: -forward.y, y: forward.x};
  const perpendicularB = {x: forward.y, y: -forward.x};
  const candidates: DirectionCandidate[] = [
    {...forward, priority: 5},
    {...perpendicularA, priority: 3.4},
    {...perpendicularB, priority: 3.4},
    {...towardCentre, priority: 2.2},
    {x: -forward.x, y: -forward.y, priority: 1},
  ];

  const best = candidates
    .map(candidate => {
      const raw = {
        x: endpointStage.x + candidate.x * step,
        y: endpointStage.y + candidate.y * step,
      };
      const point = {
        x: clamp(raw.x, bounds.minimumX, bounds.maximumX),
        y: clamp(raw.y, bounds.minimumY, bounds.maximumY),
      };
      const distance = Math.hypot(point.x - endpointStage.x, point.y - endpointStage.y);
      const boundaryCorrection = Math.hypot(point.x - raw.x, point.y - raw.y);
      return {
        point,
        score: candidate.priority + distance / step - boundaryCorrection / step * 2,
      };
    })
    .filter(candidate => Math.hypot(
      candidate.point.x - endpointStage.x,
      candidate.point.y - endpointStage.y,
    ) >= Math.min(28, step * .45))
    .sort((left, right) => right.score - left.score)[0];

  const point = best?.point || {
    x: clamp(endpointStage.x, bounds.minimumX, bounds.maximumX),
    y: clamp(endpointStage.y, bounds.minimumY, bounds.maximumY),
  };
  return {
    x: (point.x - transform.x) / width,
    y: (point.y - transform.y) / height,
  };
}
