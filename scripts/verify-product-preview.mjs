// Existing guarded jobs now verify the inline product-preview contract.
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
const stage=process.argv[2]||'after';
const output=join(process.env.CODEX_TEST_OUTPUT,'product-grid-stability');
await mkdir(output,{recursive:true});
const target=join(output,`${stage}.json`);
await writeFile(target,JSON.stringify({status:'RUNNING',suite:'inline-readability'}));
process.env.PRODUCT_TEST_URL ||= 'http://127.0.0.1:5191';
process.argv[2]=stage;
try{
  await import('./verify-inline-readability.mjs');
  const report=JSON.parse(await readFile(join(process.env.CODEX_TEST_OUTPUT,'inline-readability',`${stage}.json`),'utf8'));
  await writeFile(target,JSON.stringify({...report,suite:'inline-readability'},null,2));
  if(report.status!=='PASS')throw new Error(report.errors.join('\n'));
}catch(error){await writeFile(target,JSON.stringify({status:'FAIL',suite:'inline-readability',error:error.stack},null,2));throw error;}
