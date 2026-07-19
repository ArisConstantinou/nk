import assert from 'node:assert/strict';
import test from 'node:test';
import {createServer} from 'vite';

let vite;
let createVisibleRouteExtensionPoint;
let hasResizeDragStarted;
let normalizePointLayerGeometry;
let resizePointLayerGeometry;

test.before(async () => {
  vite = await createServer({
    appType: 'custom',
    logLevel: 'silent',
    server: {middlewareMode: true},
  });
  ({createVisibleRouteExtensionPoint} = await vite.ssrLoadModule('/src/interactive/parametric/routeEditing.ts'));
  ({
    hasResizeDragStarted,
    normalizePointLayerGeometry,
    resizePointLayerGeometry,
  } = await vite.ssrLoadModule('/src/interactive/studio/pointLayerEditing.ts'));
});

test.after(async () => {
  await vite?.close();
});

const stage = {width: 1920, height: 1080};
const transform = {
  x: 0,
  y: 0,
  width: 1920,
  height: 1080,
  rotation: 0,
  skewX: 0,
  skewY: 0,
};

test('route extension keeps a new point visible at the bottom-right edge', () => {
  const point = createVisibleRouteExtensionPoint({
    endpoint: {x: 1, y: .66},
    neighbour: {x: 1, y: .12},
    transform,
    stage,
  });

  assert.ok(point.x < 1);
  assert.ok(point.y < 1);
  assert.ok(point.x >= 0 && point.y >= 0);
});

test('route extension keeps a new point visible at the top-left corner', () => {
  const point = createVisibleRouteExtensionPoint({
    endpoint: {x: 0, y: 0},
    neighbour: {x: .4, y: 0},
    transform,
    stage,
  });

  assert.ok(point.x > 0);
  assert.ok(point.y > 0);
  assert.ok(point.x <= 1 && point.y <= 1);
});

test('route extension preserves the forward direction when enough room exists', () => {
  const point = createVisibleRouteExtensionPoint({
    endpoint: {x: .5, y: .5},
    neighbour: {x: .3, y: .5},
    transform,
    stage,
  });

  assert.ok(point.x > .5);
  assert.equal(point.y, .5);
});

test('normalising a corrupted line removes the invisible oversized transform', () => {
  const layer = {
    id: 'wall-corner-guide',
    name: 'Calibration wall corner',
    type: 'line',
    visible: true,
    locked: false,
    opacity: 1,
    transform: {
      x: 166,
      y: 125,
      width: 20,
      height: 3929,
      rotation: 0,
      skewX: 0,
      skewY: 0,
    },
    points: [{x: 0, y: 1}, {x: 0, y: 0}],
  };
  const geometry = normalizePointLayerGeometry(layer, stage);

  assert.equal(geometry.transform.x, 166);
  assert.equal(geometry.transform.y, 125);
  assert.equal(geometry.transform.width, 1);
  assert.ok(Math.abs(geometry.transform.height - 955) < .001);
  assert.deepEqual(geometry.points, [{x: 0, y: 1}, {x: 0, y: 0}]);
});

test('scaling a line stops at the canvas edge', () => {
  const layer = {
    id: 'edge-line',
    name: 'Edge line',
    type: 'line',
    visible: true,
    locked: false,
    opacity: 1,
    transform: {
      x: 166,
      y: 125,
      width: 1,
      height: 955,
      rotation: 0,
      skewX: 0,
      skewY: 0,
    },
    points: [{x: 0, y: 0}, {x: 0, y: 1}],
  };
  const geometry = resizePointLayerGeometry({
    layer,
    scale: 2,
    resizeFrom: {x: 1, y: 1},
    stage,
  });

  assert.ok(geometry.transform.y + geometry.transform.height <= stage.height + .001);
  assert.ok(Math.abs(geometry.transform.y + geometry.transform.height - stage.height) < .001);
});

test('a click or small pointer jitter does not activate line scaling', () => {
  assert.equal(hasResizeDragStarted({x: 400, y: 300}, {x: 400, y: 300}), false);
  assert.equal(hasResizeDragStarted({x: 400, y: 300}, {x: 403, y: 302}), false);
  assert.equal(hasResizeDragStarted({x: 400, y: 300}, {x: 406, y: 300}), true);
});
