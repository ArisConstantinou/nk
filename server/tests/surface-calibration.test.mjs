import assert from 'node:assert/strict';
import test from 'node:test';
import {createServer} from 'vite';

let vite;
let detectRoomSurfaces;
let findSurfaceAtPoint;
let fitTransformToSurface;
let constrainTransformToSurface;
let surfacePlacementRotation;
let surfacePerspectiveOrientation;
let adaptTransformToSurface;
let clearTransformOrientation;
let isTransformSurfaceAdapted;
let isLegacyAutomaticallyOrientedTransform;
let createThreeLineRoomGuides;
let synchronizeCalibratedSurfaces;
let assetAspectRatio;
let assetVisibleViewBox;

test.before(async () => {
  vite = await createServer({
    appType: 'custom',
    logLevel: 'silent',
    server: {middlewareMode: true},
  });
  ({
    detectRoomSurfaces,
    findSurfaceAtPoint,
    fitTransformToSurface,
    constrainTransformToSurface,
    surfacePlacementRotation,
    surfacePerspectiveOrientation,
    adaptTransformToSurface,
    clearTransformOrientation,
    isTransformSurfaceAdapted,
    isLegacyAutomaticallyOrientedTransform,
    createThreeLineRoomGuides,
    synchronizeCalibratedSurfaces,
  } = await vite.ssrLoadModule('/src/interactive/surfaces/roomSurfaceCalibration.ts'));
  ({
    assetAspectRatio,
    assetVisibleViewBox,
  } = await vite.ssrLoadModule('/src/interactive/engine/schema.ts'));
});

test.after(async () => {
  await vite?.close();
});

const stage = {width: 1920, height: 1080};
const baseLayer = {
  name: 'Line mockup',
  type: 'line',
  visible: true,
  locked: false,
  opacity: 1,
  stroke: '#ef6f4d',
  strokeWidth: 8,
};

const screenshotGuides = [
  {
    ...baseLayer,
    id: 'guide-floor-depth',
    transform: {x: 0, y: 837.1049543773833, width: 186.43541829342422, height: 186.43541829342416, rotation: 0, skewX: 0, skewY: 0},
    points: [{x: 0, y: 1}, {x: 1, y: 0}],
  },
  {
    ...baseLayer,
    id: 'guide-wall-corner',
    transform: {x: 185.83850931677028, y: 52.91782350088192, width: 4, height: 785.7778286730311, rotation: 0, skewX: 0, skewY: 0},
    points: [{x: 0, y: 1}, {x: 1.4210854715202004e-14, y: 0}],
  },
  {
    ...baseLayer,
    id: 'guide-wall-floor',
    transform: {x: 187.82608695652183, y: 837.7018633540372, width: 1732.1739130434783, height: 4, rotation: 0, skewX: 0, skewY: 0},
    points: [{x: 0, y: 0}, {x: 1, y: 0}],
  },
];

test('three basic screenshot lines calibrate two walls and a floor', () => {
  const result = detectRoomSurfaces({layers: screenshotGuides, stage});
  assert.equal(result.surfaces.length, 3);
  assert.deepEqual(result.surfaces.map(surface => surface.id), [
    'surface-main-wall',
    'surface-side-wall',
    'surface-floor',
  ]);
  assert.equal(result.guideRoles.get('guide-wall-floor'), 'wall-floor');
  assert.equal(result.guideRoles.get('guide-wall-corner'), 'wall-corner');
  assert.equal(result.guideRoles.get('guide-floor-depth'), 'floor-depth');
});

test('a redrawn untagged wall corner restores missing calibrated surfaces', () => {
  const partiallyTaggedGuides = screenshotGuides.map(layer => ({
    ...layer,
    calibrationRole: layer.id === 'guide-wall-floor'
      ? 'wall-floor'
      : layer.id === 'guide-floor-depth'
        ? 'floor-depth'
        : undefined,
  }));
  const repaired = synchronizeCalibratedSurfaces({
    id: 'frame-1',
    name: 'Empty room',
    description: '',
    layers: partiallyTaggedGuides,
    surfaces: [],
  }, stage);

  assert.deepEqual(repaired.surfaces.map(surface => surface.id), [
    'surface-main-wall',
    'surface-side-wall',
    'surface-floor',
  ]);
  assert.equal(
    repaired.layers.find(layer => layer.id === 'guide-wall-corner')?.calibrationRole,
    'wall-corner',
  );
});

test('default calibration guides match the generated room background geometry', () => {
  const guides = createThreeLineRoomGuides(stage);
  const corner = guides.find(layer => layer.calibrationRole === 'wall-corner');
  const wallFloor = guides.find(layer => layer.calibrationRole === 'wall-floor');
  const floorDepth = guides.find(layer => layer.calibrationRole === 'floor-depth');
  assert.ok(corner);
  assert.ok(wallFloor);
  assert.ok(floorDepth);
  assert.ok(Math.abs(corner.transform.x - 166) < .001);
  assert.ok(Math.abs(corner.transform.y + corner.transform.height - 930) < .001);
  assert.ok(Math.abs(wallFloor.transform.y - 930) < .001);
  assert.ok(Math.abs(floorDepth.transform.x + floorDepth.transform.width - 166) < .001);
  assert.ok(Math.abs(floorDepth.transform.y - 930) < .001);
});

test('calibrated surfaces resolve the intended placement target at a drop point', () => {
  const {surfaces} = detectRoomSurfaces({layers: screenshotGuides, stage});
  assert.equal(findSurfaceAtPoint(surfaces, {x: 960, y: 400})?.id, 'surface-main-wall');
  assert.equal(findSurfaceAtPoint(surfaces, {x: 85, y: 420})?.id, 'surface-side-wall');
  assert.equal(findSurfaceAtPoint(surfaces, {x: 960, y: 960})?.id, 'surface-floor');
});

test('asset fitting keeps a reusable object inside the selected surface bounds', () => {
  const {surfaces} = detectRoomSurfaces({layers: screenshotGuides, stage});
  const wall = surfaces.find(surface => surface.id === 'surface-main-wall');
  assert.ok(wall);
  const transform = fitTransformToSurface(wall, {
    x: 0,
    y: 0,
    width: 600,
    height: 360,
    rotation: 0,
    skewX: 0,
    skewY: 0,
  });
  assert.ok(transform.x >= 0);
  assert.ok(transform.y >= 0);
  assert.ok(transform.x + transform.width <= stage.width);
  assert.ok(transform.y + transform.height <= 840);
});

test('full-wall fixture fitting uses the calibrated wall instead of leaving a large artificial gap', () => {
  const {surfaces} = detectRoomSurfaces({layers: screenshotGuides, stage});
  const wall = surfaces.find(surface => surface.id === 'surface-main-wall');
  assert.ok(wall);
  const source = {
    x: 0,
    y: 0,
    width: 1596,
    height: 847,
    rotation: 0,
    skewX: 0,
    skewY: 0,
  };
  const standard = fitTransformToSurface(wall, source);
  const fixture = fitTransformToSurface(wall, source, undefined, {
    widthCoverage: 1,
    heightCoverage: 1,
    marginScale: .18,
  });
  assert.ok(fixture.width > standard.width * 1.15);
  assert.ok(Math.abs(fixture.y + fixture.height - 837.7018633540372) < 8);
  assert.ok(wall.points[1].x - (fixture.x + fixture.width) < 100);
});

test('surface constraint lets visible contained artwork touch wall edges', () => {
  const {surfaces} = detectRoomSurfaces({layers: screenshotGuides, stage});
  const wall = surfaces.find(surface => surface.id === 'surface-main-wall');
  assert.ok(wall);
  const constrained = constrainTransformToSurface(wall, {
    x: -500,
    y: 900,
    width: 600,
    height: 480,
    rotation: 0,
    skewX: 0,
    skewY: 0,
  }, 1240 / 850);
  const visibleHeight = constrained.width / (1240 / 850);
  const visibleOffsetY = (constrained.height - visibleHeight) / 2;
  assert.ok(Math.abs(constrained.x - wall.points[0].x) < .001);
  assert.ok(Math.abs(constrained.y + visibleOffsetY + visibleHeight - 837.7018633540372) < .001);
});

test('moving or scaling a fitted layer never changes its rotation or skew', () => {
  const {surfaces} = detectRoomSurfaces({layers: screenshotGuides, stage});
  const sideWall = surfaces.find(surface => surface.id === 'surface-side-wall');
  assert.ok(sideWall);
  const fitted = fitTransformToSurface(sideWall, {
    x: 0,
    y: 0,
    width: 180,
    height: 120,
    rotation: 0,
    skewX: 0,
    skewY: 0,
  }, {x: 90, y: 430});
  const edited = constrainTransformToSurface(sideWall, {
    ...fitted,
    x: fitted.x + 30,
    y: fitted.y + 60,
    width: fitted.width * 1.35,
    height: fitted.height * 1.35,
  });
  assert.equal(edited.rotation, fitted.rotation);
  assert.equal(edited.skewX, fitted.skewX);
  assert.equal(edited.skewY, fitted.skewY);
});

test('a nearly flat main wall does not add visible rotation or skew to an image', () => {
  const {surfaces} = detectRoomSurfaces({layers: screenshotGuides, stage});
  const mainWall = surfaces.find(surface => surface.id === 'surface-main-wall');
  assert.ok(mainWall);
  const slightlyImperfectWall = {
    ...mainWall,
    points: mainWall.points.map((point, index) => ({
      x: point.x + (index === 0 ? -8 : index === 3 ? 5 : 0),
      y: point.y + (index === 1 ? 7 : 0),
    })),
  };
  const fitted = fitTransformToSurface(slightlyImperfectWall, {
    x: 0,
    y: 0,
    width: 1400,
    height: 760,
    rotation: 0,
    skewX: 0,
    skewY: 0,
  });
  assert.equal(fitted.rotation, 0);
  assert.equal(fitted.skewX, 0);
  assert.equal(fitted.skewY, 0);
  const bounds = {
    x: Math.min(...slightlyImperfectWall.points.map(point => point.x)),
    y: Math.min(...slightlyImperfectWall.points.map(point => point.y)),
    right: Math.max(...slightlyImperfectWall.points.map(point => point.x)),
    bottom: Math.max(...slightlyImperfectWall.points.map(point => point.y)),
  };
  assert.ok(fitted.x >= bounds.x);
  assert.ok(fitted.y >= bounds.y);
  assert.ok(fitted.x + fitted.width <= bounds.right);
  assert.ok(fitted.y + fitted.height <= bounds.bottom);
});

test('wood fixture fitting uses the visible pixels instead of transparent padding', () => {
  const asset = {
    id: 'asset-wood-structure-no-led',
    source: '/assets/interactive/wood-structure-no-led-wide-v2.png',
    width: 1596,
    height: 847,
  };
  assert.deepEqual(assetVisibleViewBox(asset), {
    x: 8,
    y: 8,
    width: 1580,
    height: 831,
    sourceWidth: 1596,
    sourceHeight: 847,
  });
  assert.equal(assetAspectRatio(asset), 1580 / 831);
});

test('legacy automatic image perspective can be removed without moving its visual centre', () => {
  const {surfaces} = detectRoomSurfaces({layers: screenshotGuides, stage});
  const sideWall = surfaces.find(surface => surface.id === 'surface-side-wall');
  assert.ok(sideWall);
  const fitted = fitTransformToSurface(sideWall, {
    x: 0,
    y: 0,
    width: 128,
    height: 128,
    rotation: 0,
    skewX: 0,
    skewY: 0,
  }, {x: 90, y: 520});
  assert.equal(isTransformSurfaceAdapted(sideWall, fitted), true);
  const cleared = clearTransformOrientation(fitted);
  assert.equal(cleared.rotation, 0);
  assert.equal(cleared.skewX, 0);
  assert.equal(cleared.skewY, 0);
  assert.ok(Math.abs((cleared.x + cleared.width / 2) - (fitted.x + fitted.width / 2)) < 80);
  assert.ok(Math.abs((cleared.y + cleared.height / 2) - (fitted.y + fitted.height / 2)) < 80);
});

test('legacy image perspective is recognised after the calibration guides are edited', () => {
  const {surfaces} = detectRoomSurfaces({layers: screenshotGuides, stage});
  const sideWall = surfaces.find(surface => surface.id === 'surface-side-wall');
  assert.ok(sideWall);
  const fitted = fitTransformToSurface(sideWall, {
    x: 0,
    y: 0,
    width: 128,
    height: 128,
    rotation: 0,
    skewX: 0,
    skewY: 0,
  }, {x: 90, y: 520});
  const recalibrated = {
    ...sideWall,
    points: sideWall.points.map((point, index) => ({
      x: point.x + (index < 2 ? 90 : 0),
      y: point.y + (index === 1 || index === 2 ? 120 : 0),
    })),
  };
  assert.equal(isTransformSurfaceAdapted(recalibrated, fitted), false);
  assert.equal(isLegacyAutomaticallyOrientedTransform(recalibrated, fitted), true);
});

test('side-wall placement follows the receding plane instead of rotating like a flat picture', () => {
  const {surfaces} = detectRoomSurfaces({layers: screenshotGuides, stage});
  const mainWall = surfaces.find(surface => surface.id === 'surface-main-wall');
  const sideWall = surfaces.find(surface => surface.id === 'surface-side-wall');
  assert.ok(mainWall);
  assert.ok(sideWall);
  assert.equal(surfacePlacementRotation(mainWall), 0);
  assert.equal(surfacePlacementRotation(sideWall), 0);
  assert.equal(surfacePerspectiveOrientation(mainWall).skewY, 0);
  const upperOrientation = surfacePerspectiveOrientation(sideWall, {x: 90, y: 220});
  const lowerOrientation = surfacePerspectiveOrientation(sideWall, {x: 90, y: 760});
  assert.ok(upperOrientation.skewY < -5);
  assert.ok(lowerOrientation.skewY < upperOrientation.skewY);
  const transform = fitTransformToSurface(sideWall, {
    x: 0,
    y: 0,
    width: 120,
    height: 120,
    rotation: 18,
    skewX: 12,
    skewY: -8,
  }, {x: 90, y: 520});
  assert.equal(transform.rotation, 0);
  assert.equal(transform.skewX, 0);
  assert.ok(transform.skewY < -15);
  assert.equal(transform.width, transform.height);
});

test('the same side-wall perspective adapter works for text, shapes and image transforms', () => {
  const {surfaces} = detectRoomSurfaces({layers: screenshotGuides, stage});
  const sideWall = surfaces.find(surface => surface.id === 'surface-side-wall');
  assert.ok(sideWall);
  const inputs = [
    {x: 42, y: 260, width: 110, height: 70, rotation: 0, skewX: 0, skewY: 0},
    {x: 50, y: 470, width: 95, height: 56, rotation: 18, skewX: 12, skewY: -8},
    {x: 35, y: 680, width: 125, height: 90, rotation: -12, skewX: -6, skewY: 4},
  ];
  const adapted = inputs.map(transform => adaptTransformToSurface(sideWall, transform));
  assert.ok(adapted.every(transform => transform.rotation === 0));
  assert.ok(adapted.every(transform => transform.skewX === 0));
  assert.ok(adapted.every(transform => transform.skewY < 0));
  assert.ok(adapted[2].skewY < adapted[0].skewY);
});

test('manual curved-wall calibration survives guide movement recalculation', () => {
  const first = detectRoomSurfaces({layers: screenshotGuides, stage});
  const existingSurfaces = first.surfaces.map(surface => (
    surface.id === 'surface-side-wall' ? {...surface, geometry: 'curved'} : surface
  ));
  const second = detectRoomSurfaces({layers: screenshotGuides, stage, existingSurfaces});
  assert.equal(second.surfaces.find(surface => surface.id === 'surface-side-wall')?.geometry, 'curved');
});
