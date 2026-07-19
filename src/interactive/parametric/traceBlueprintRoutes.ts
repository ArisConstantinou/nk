import type {ExperiencePoint} from '../engine/schema';

export type BlueprintTraceResult = {
  sourceWidth: number;
  sourceHeight: number;
  guidePixelRatio: number;
  paths: ExperiencePoint[][];
};

type PixelPoint = {
  x: number;
  y: number;
};

const neighbours = [
  [0, -1],
  [1, -1],
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
] as const;

const loadImage = (source: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error('The blueprint image could not be loaded. Check that the media file is publicly readable.'));
  image.src = source;
});

const closeSmallGaps = (source: Uint8Array, width: number, height: number) => {
  const dilated = new Uint8Array(source.length);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x;
      if (source[index]) {
        dilated[index] = 1;
        for (const [dx, dy] of neighbours) dilated[(y + dy) * width + x + dx] = 1;
      }
    }
  }
  const closed = new Uint8Array(source.length);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      let keep = 1;
      for (let dy = -1; dy <= 1 && keep; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (!dilated[(y + dy) * width + x + dx]) {
            keep = 0;
            break;
          }
        }
      }
      closed[y * width + x] = keep;
    }
  }
  return closed;
};

const transitions = (values: number[]) => values.reduce((total, value, index) => (
  total + (value === 0 && values[(index + 1) % values.length] === 1 ? 1 : 0)
), 0);

const thinMask = (source: Uint8Array, width: number, height: number) => {
  const mask = new Uint8Array(source);
  const removable: number[] = [];
  let changed = true;
  let iteration = 0;

  while (changed && iteration < 48) {
    changed = false;
    iteration += 1;
    for (let pass = 0; pass < 2; pass += 1) {
      removable.length = 0;
      for (let y = 1; y < height - 1; y += 1) {
        for (let x = 1; x < width - 1; x += 1) {
          const index = y * width + x;
          if (!mask[index]) continue;
          const p2 = mask[index - width];
          const p3 = mask[index - width + 1];
          const p4 = mask[index + 1];
          const p5 = mask[index + width + 1];
          const p6 = mask[index + width];
          const p7 = mask[index + width - 1];
          const p8 = mask[index - 1];
          const p9 = mask[index - width - 1];
          const ring = [p2, p3, p4, p5, p6, p7, p8, p9];
          const count = ring.reduce((total, value) => total + value, 0);
          if (count < 2 || count > 6 || transitions(ring) !== 1) continue;
          const firstGuard = pass === 0 ? p2 * p4 * p6 : p2 * p4 * p8;
          const secondGuard = pass === 0 ? p4 * p6 * p8 : p2 * p6 * p8;
          if (firstGuard === 0 && secondGuard === 0) removable.push(index);
        }
      }
      if (removable.length) {
        changed = true;
        for (const index of removable) mask[index] = 0;
      }
    }
  }
  return mask;
};

const pixelNeighbours = (mask: Uint8Array, width: number, height: number, index: number) => {
  const x = index % width;
  const y = Math.floor(index / width);
  const result: number[] = [];
  for (const [dx, dy] of neighbours) {
    const nextX = x + dx;
    const nextY = y + dy;
    if (nextX < 0 || nextY < 0 || nextX >= width || nextY >= height) continue;
    const next = nextY * width + nextX;
    if (mask[next]) result.push(next);
  }
  return result;
};

const edgeKey = (from: number, to: number) => from < to ? `${from}:${to}` : `${to}:${from}`;

const pathLength = (points: PixelPoint[]) => points.slice(1).reduce((total, point, index) => {
  const previous = points[index];
  return total + Math.hypot(point.x - previous.x, point.y - previous.y);
}, 0);

type TracedGuideCandidate = {
  name: string;
  pixels: number;
  paths: ExperiencePoint[][];
};

const traceCandidateScore = (candidate: TracedGuideCandidate) => {
  const lengths = candidate.paths.map(path => pathLength(path));
  if (!lengths.length) return Number.NEGATIVE_INFINITY;
  const total = lengths.reduce((sum, length) => sum + length, 0);
  const longest = Math.max(...lengths);
  const average = total / lengths.length;
  const hasSubstantialGreenGuide = candidate.name === 'green' && (longest >= .18 || total >= .55);
  const fragmentationPenalty = Math.max(0, lengths.length - 8) * .018;

  return longest * 2.5
    + average * 1.25
    + Math.min(total, 2) * .1
    + (hasSubstantialGreenGuide ? .28 : 0)
    - fragmentationPenalty;
};

export const selectTraceCandidate = <Candidate extends TracedGuideCandidate>(candidates: Candidate[]) => (
  [...candidates].sort((left, right) => traceCandidateScore(right) - traceCandidateScore(left))[0]
);

const pointSegmentDistance = (point: PixelPoint, start: PixelPoint, end: PixelPoint) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (dx === 0 && dy === 0) return Math.hypot(point.x - start.x, point.y - start.y);
  const ratio = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(point.x - (start.x + ratio * dx), point.y - (start.y + ratio * dy));
};

const simplify = (points: PixelPoint[], tolerance: number): PixelPoint[] => {
  if (points.length <= 2) return points;
  let farthest = 0;
  let farthestIndex = 0;
  for (let index = 1; index < points.length - 1; index += 1) {
    const distance = pointSegmentDistance(points[index], points[0], points[points.length - 1]);
    if (distance > farthest) {
      farthest = distance;
      farthestIndex = index;
    }
  }
  if (farthest <= tolerance) return [points[0], points[points.length - 1]];
  const before = simplify(points.slice(0, farthestIndex + 1), tolerance);
  const after = simplify(points.slice(farthestIndex), tolerance);
  return [...before.slice(0, -1), ...after];
};

const endpointVector = (points: PixelPoint[], fromStart: boolean) => {
  const sampleOffset = Math.min(6, points.length - 1);
  if (fromStart) {
    return {
      x: points[sampleOffset].x - points[0].x,
      y: points[sampleOffset].y - points[0].y,
    };
  }
  const end = points.length - 1;
  return {
    x: points[end].x - points[end - sampleOffset].x,
    y: points[end].y - points[end - sampleOffset].y,
  };
};

const continuationScore = (left: PixelPoint[], right: PixelPoint[], maximumGap: number) => {
  const leftEnd = left[left.length - 1];
  const rightStart = right[0];
  const gap = Math.hypot(rightStart.x - leftEnd.x, rightStart.y - leftEnd.y);
  if (gap > maximumGap) return -1;
  const incoming = endpointVector(left, false);
  const outgoing = endpointVector(right, true);
  const incomingLength = Math.hypot(incoming.x, incoming.y);
  const outgoingLength = Math.hypot(outgoing.x, outgoing.y);
  if (!incomingLength || !outgoingLength) return -1;
  const alignment = (incoming.x * outgoing.x + incoming.y * outgoing.y) / (incomingLength * outgoingLength);
  return alignment - gap / Math.max(1, maximumGap) * .14;
};

const mergeAlignedPaths = (source: PixelPoint[][], maximumGap = 13) => {
  const paths = source.map(path => path.map(point => ({...point})));
  let guard = 0;
  while (guard < 200) {
    guard += 1;
    let best: {leftIndex: number; rightIndex: number; left: PixelPoint[]; right: PixelPoint[]; score: number} | null = null;
    for (let leftIndex = 0; leftIndex < paths.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < paths.length; rightIndex += 1) {
        const left = paths[leftIndex];
        const right = paths[rightIndex];
        const orientations: Array<[PixelPoint[], PixelPoint[]]> = [
          [left, right],
          [[...left].reverse(), right],
          [left, [...right].reverse()],
          [[...left].reverse(), [...right].reverse()],
          [right, left],
          [[...right].reverse(), left],
          [right, [...left].reverse()],
          [[...right].reverse(), [...left].reverse()],
        ];
        for (const [orientedLeft, orientedRight] of orientations) {
          const score = continuationScore(orientedLeft, orientedRight, maximumGap);
          if (score < .68 || (best && score <= best.score)) continue;
          best = {leftIndex, rightIndex, left: orientedLeft, right: orientedRight, score};
        }
      }
    }
    if (!best) break;
    const leftEnd = best.left[best.left.length - 1];
    const rightStart = best.right[0];
    const sharesEndpoint = leftEnd.x === rightStart.x && leftEnd.y === rightStart.y;
    const merged = [...best.left, ...best.right.slice(sharesEndpoint ? 1 : 0)];
    paths[best.leftIndex] = merged;
    paths.splice(best.rightIndex, 1);
  }
  return paths;
};

const traceSkeleton = (mask: Uint8Array, width: number, height: number) => {
  const nodes = new Set<number>();
  for (let index = 0; index < mask.length; index += 1) {
    if (!mask[index]) continue;
    if (pixelNeighbours(mask, width, height, index).length !== 2) nodes.add(index);
  }

  const visited = new Set<string>();
  const paths: PixelPoint[][] = [];
  const walk = (start: number, first: number) => {
    const indexes = [start, first];
    visited.add(edgeKey(start, first));
    let previous = start;
    let current = first;
    let guard = 0;
    while (!nodes.has(current) && guard < mask.length) {
      guard += 1;
      const candidates = pixelNeighbours(mask, width, height, current).filter(next => next !== previous);
      const next = candidates.find(candidate => !visited.has(edgeKey(current, candidate))) ?? candidates[0];
      if (next === undefined) break;
      visited.add(edgeKey(current, next));
      indexes.push(next);
      previous = current;
      current = next;
    }
    return indexes.map(index => ({x: index % width, y: Math.floor(index / width)}));
  };

  for (const node of nodes) {
    for (const next of pixelNeighbours(mask, width, height, node)) {
      if (visited.has(edgeKey(node, next))) continue;
      paths.push(walk(node, next));
    }
  }

  for (let index = 0; index < mask.length; index += 1) {
    if (!mask[index]) continue;
    const next = pixelNeighbours(mask, width, height, index).find(candidate => !visited.has(edgeKey(index, candidate)));
    if (next !== undefined) paths.push(walk(index, next));
  }
  return paths;
};

export function traceGuideMask(greenMask: Uint8Array, width: number, height: number): ExperiencePoint[][] {
  const skeleton = thinMask(closeSmallGaps(greenMask, width, height), width, height);
  const minimumLength = Math.max(16, Math.min(width, height) * .035);
  const candidates = traceSkeleton(skeleton, width, height)
    .filter(path => path.length >= 2 && pathLength(path) >= minimumLength * .35);
  return mergeAlignedPaths(candidates)
    .filter(path => pathLength(path) >= minimumLength)
    .sort((left, right) => pathLength(right) - pathLength(left))
    .slice(0, 16)
    .map(path => simplify(path, 1.6))
    .filter(path => path.length >= 2)
    .map(path => path.map(point => ({
      x: Number((point.x / Math.max(1, width - 1)).toFixed(5)),
      y: Number((point.y / Math.max(1, height - 1)).toFixed(5)),
    })));
}

export async function traceLineImageRoutes(source: string): Promise<BlueprintTraceResult> {
  const image = await loadImage(source);
  const sourceWidth = image.naturalWidth;
  const sourceHeight = image.naturalHeight;
  if (!sourceWidth || !sourceHeight) throw new Error('The blueprint image has no readable dimensions.');

  const scale = Math.min(1, 900 / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(2, Math.round(sourceWidth * scale));
  const height = Math.max(2, Math.round(sourceHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', {willReadFrequently: true});
  if (!context) throw new Error('Image analysis is not available in this browser.');
  context.drawImage(image, 0, 0, width, height);

  let pixels: ImageData;
  try {
    pixels = context.getImageData(0, 0, width, height);
  } catch {
    throw new Error('The media server must allow image analysis (CORS) before this blueprint can be traced.');
  }

  const minimumGuidePixels = Math.max(24, width * height * .00004);
  const greenMask = new Uint8Array(width * height);
  const redMask = new Uint8Array(width * height);
  const darkMask = new Uint8Array(width * height);
  let greenPixels = 0;
  let redPixels = 0;
  let darkPixels = 0;
  let luminanceTotal = 0;
  let opaquePixels = 0;
  for (let index = 0; index < greenMask.length; index += 1) {
    const offset = index * 4;
    const red = pixels.data[offset];
    const green = pixels.data[offset + 1];
    const blue = pixels.data[offset + 2];
    const alpha = pixels.data[offset + 3];
    if (alpha > 80) {
      luminanceTotal += red * .2126 + green * .7152 + blue * .0722;
      opaquePixels += 1;
    }
    const looksGreen = alpha > 80
      && green > 62
      && green - red > 28
      && green - blue > 12
      && green > red * 1.22
      && green > blue * 1.08;
    if (looksGreen) {
      greenMask[index] = 1;
      greenPixels += 1;
    }
    const looksRed = alpha > 80
      && red > 68
      && red - green > 30
      && red - blue > 22
      && red > green * 1.22
      && red > blue * 1.14;
    if (looksRed) {
      redMask[index] = 1;
      redPixels += 1;
    }
    const luminance = red * .2126 + green * .7152 + blue * .0722;
    const chroma = Math.max(red, green, blue) - Math.min(red, green, blue);
    const looksDark = alpha > 80 && luminance < 105 && chroma < 72;
    if (looksDark) {
      darkMask[index] = 1;
      darkPixels += 1;
    }
  }

  const maximumGuidePixels = greenMask.length * .2;
  const averageLuminance = opaquePixels ? luminanceTotal / opaquePixels : 0;
  const candidates = [
    {name: 'green', mask: greenMask, pixels: greenPixels, eligible: greenPixels >= minimumGuidePixels && greenPixels <= maximumGuidePixels},
    {name: 'red', mask: redMask, pixels: redPixels, eligible: redPixels >= minimumGuidePixels && redPixels <= maximumGuidePixels},
    {name: 'dark', mask: darkMask, pixels: darkPixels, eligible: averageLuminance > 135 && darkPixels >= minimumGuidePixels && darkPixels <= maximumGuidePixels},
  ].filter(candidate => candidate.eligible);

  if (!candidates.length) {
    throw new Error('No clear route lines were detected. Use a high-contrast green, red or dark line on a plain light background.');
  }

  const tracedCandidates = candidates
    .map(candidate => ({...candidate, paths: traceGuideMask(candidate.mask, width, height)}))
    .filter(candidate => candidate.paths.length);
  const selected = selectTraceCandidate(tracedCandidates);

  if (!selected) throw new Error('Guide pixels were found, but no usable continuous routes could be created.');

  return {
    sourceWidth,
    sourceHeight,
    guidePixelRatio: selected.pixels / greenMask.length,
    paths: selected.paths,
  };
}

export const traceGreenBlueprintRoutes = traceLineImageRoutes;
