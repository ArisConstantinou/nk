import assert from 'node:assert/strict';
import test from 'node:test';
import {createServer} from 'vite';

let vite;
let selectTraceCandidate;

test.before(async () => {
  vite = await createServer({
    appType: 'custom',
    logLevel: 'silent',
    server: {middlewareMode: true},
  });
  ({selectTraceCandidate} = await vite.ssrLoadModule('/src/interactive/parametric/traceBlueprintRoutes.ts'));
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
