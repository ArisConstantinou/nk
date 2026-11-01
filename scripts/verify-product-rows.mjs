// Compatibility entry point: product details now preserve the grid instead of inserting rows.
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
if (!process.env.CODEX_TEST_OUTPUT) throw new Error('Run through StorageGuard.');
const legacy = join(process.env.CODEX_TEST_OUTPUT, 'product-row-focus');
await mkdir(legacy, {recursive:true});
const result = join(legacy, 'results.json');
await writeFile(result, JSON.stringify({status:'RUNNING', suite:'stable-product-preview'}));
if (!process.env.PLAYWRIGHT_MODULE && process.argv[2]) process.env.PLAYWRIGHT_MODULE = process.argv[2];
process.argv[2] = 'after';
try {
  await import('./verify-product-preview.mjs');
  const report = JSON.parse(await readFile(join(process.env.CODEX_TEST_OUTPUT,'product-grid-stability','after.json'),'utf8'));
  await writeFile(result, JSON.stringify({...report, suite:'stable-product-preview'},null,2));
} catch (error) {
  await writeFile(result, JSON.stringify({status:'FAIL',suite:'stable-product-preview',failure:error.stack},null,2));
  throw error;
}
