// Compatibility entry point for inline expansion and shared text readability.
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
if (!process.env.CODEX_TEST_OUTPUT) throw new Error('Run through StorageGuard.');
const legacy = join(process.env.CODEX_TEST_OUTPUT, 'product-row-focus');
await mkdir(legacy, {recursive:true});
const result = join(legacy, 'results.json');
await writeFile(result, JSON.stringify({status:'RUNNING', suite:'inline-readability'}));
if (!process.env.PLAYWRIGHT_MODULE && process.argv[2]) process.env.PLAYWRIGHT_MODULE = process.argv[2];
process.argv[2] = 'after';
try {
  await import('./verify-product-preview.mjs');
  const report = JSON.parse(await readFile(join(process.env.CODEX_TEST_OUTPUT,'product-grid-stability','after.json'),'utf8'));
  await writeFile(result, JSON.stringify({...report, suite:'inline-readability'},null,2));
} catch (error) {
  await writeFile(result, JSON.stringify({status:'FAIL',suite:'inline-readability',failure:error.stack},null,2));
  throw error;
}
