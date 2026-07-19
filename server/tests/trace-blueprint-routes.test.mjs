import assert from 'node:assert/strict';
import test from 'node:test';
import {createServer} from 'vite';

let vite;
let selectTraceCandidate;
let traceGuideMask;

test.before(async () => {
  vite = await createServer({
    appType: 'custom',
    logLevel: 'silent',
    server: {middlewareMode: true},
  });
  ({selectTraceCandidate, traceGuideMask} = await vite.ssrLoadModule('/src/interactive/parametric/traceBlueprintRoutes.ts'));
});

test.after(async () => {
  await vite?.close();
});

const horizontalPath = (y, length, points = 8) => Array.from({length: points}, (_, index) => ({
  x: length * index / (points - 1),
  y,
}));

test('trace selection prefers continuous green routes over fragmented red annotations', () => {
  const green = {
    name: 'green',
    pixels: 8_700,
    paths: [
      horizontalPath(.2, .95, 14),
      horizontalPath(.45, .78, 10),
      horizontalPath(.7, .52, 8),
    ],
  };
  const red = {
    name: 'red',
    pixels: 19_000,
    paths: Array.from({length: 16}, (_, index) => horizontalPath(.05 + index * .05, .18 + index % 3 * .03, 4)),
  };
  const dark = {
    name: 'dark',
    pixels: 6_300,
    paths: Array.from({length: 10}, (_, index) => horizontalPath(.08 + index * .08, index === 0 ? .82 : .2, 5)),
  };

  assert.equal(selectTraceCandidate([red, dark, green]), green);
});

test('trace selection ignores a small accidental green mark when a real dark route exists', () => {
  const accidentalGreen = {
    name: 'green',
    pixels: 80,
    paths: [horizontalPath(.1, .04, 3)],
  };
  const darkRoute = {
    name: 'dark',
    pixels: 2_400,
    paths: [horizontalPath(.5, .86, 12)],
  };

  assert.equal(selectTraceCandidate([accidentalGreen, darkRoute]), darkRoute);
});

const drawMaskLine = (mask, width, from, to) => {
  const steps = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y));
  for (let step = 0; step <= steps; step += 1) {
    const x = Math.round(from.x + (to.x - from.x) * step / Math.max(1, steps));
    const y = Math.round(from.y + (to.y - from.y) * step / Math.max(1, steps));
    mask[y * width + x] = 1;
  }
};

test('trace joins aligned route interruptions and discards short isolated fragments', () => {
  const width = 240;
  const height = 140;
  const mask = new Uint8Array(width * height);
  drawMaskLine(mask, width, {x: 8, y: 70}, {x: 72, y: 71});
  drawMaskLine(mask, width, {x: 82, y: 72}, {x: 151, y: 75});
  drawMaskLine(mask, width, {x: 162, y: 76}, {x: 231, y: 80});
  drawMaskLine(mask, width, {x: 30, y: 18}, {x: 39, y: 18});
  drawMaskLine(mask, width, {x: 188, y: 112}, {x: 199, y: 116});

  const paths = traceGuideMask(mask, width, height);

  assert.equal(paths.length, 1);
  assert.ok(paths[0][0].x < .06);
  assert.ok(paths[0].at(-1).x > .94);
});
