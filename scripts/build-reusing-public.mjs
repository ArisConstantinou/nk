import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {readdir, readFile, mkdir, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';

const cwd = process.cwd();
const require = createRequire(join(cwd, 'package.json'));
if (!process.env.CODEX_BUILD_OUTPUT || !process.env.CODEX_TEST_OUTPUT) throw new Error('Run through StorageGuard with the registered project layout.');
const report = join(process.env.CODEX_TEST_OUTPUT, 'product-row-focus', 'build.json');
await mkdir(join(process.env.CODEX_TEST_OUTPUT, 'product-row-focus'), {recursive:true});
await writeFile(report, JSON.stringify({status:'RUNNING'}));
try {
  execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), '--noEmit', '--incremental', 'false'], {stdio:'inherit'});
  // Verify unchanged public assets before reusing their existing canonical build copies.
  let reused = 0;
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const verify = async (relative = '') => {
    for (const entry of await readdir(join(cwd,'public',relative), {withFileTypes:true})) {
      const path = join(relative,entry.name);
      if (entry.isDirectory()) await verify(path);
      else {
        const [source, built] = await Promise.all([readFile(join(cwd,'public',path)), readFile(join(process.env.CODEX_BUILD_OUTPUT,path))]);
        if (hash(source) !== hash(built)) throw new Error(`Existing public build asset differs; preserve and review: ${path}`);
        reused += source.length;
      }
    }
  };
  await verify();
  const {build} = await import(pathToFileURL(require.resolve('vite')).href);
  await build({build:{outDir:process.env.CODEX_BUILD_OUTPUT,emptyOutDir:false,copyPublicDir:false}});
  await writeFile(report, JSON.stringify({status:'PASS',publicAssetBytesReused:reused,typecheck:'PASS',build:'PASS',preservedUnknownFiles:true},null,2));
} catch(error) {
  await writeFile(report, JSON.stringify({status:'FAIL',error:error.stack},null,2));
  throw error;
}
