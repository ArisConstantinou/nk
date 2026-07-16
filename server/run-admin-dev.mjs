import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const viteEntry = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url));
const developmentEnv = {...process.env, NODE_ENV: 'development', ADMIN_ALLOW_LOOPBACK_SETUP: 'true'};
const children = [
  spawn(process.execPath, ['--watch', 'server/admin-server.mjs'], {stdio: 'inherit', env: developmentEnv}),
  spawn(process.execPath, [viteEntry], {stdio: 'inherit', env: process.env}),
];

let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
  setTimeout(() => process.exit(code), 100).unref();
}

for (const child of children) child.on('exit', code => { if (!stopping && code) stop(code); });
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
