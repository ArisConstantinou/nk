import {defineConfig, loadEnv} from 'vite';
import react from '@vitejs/plugin-react';
import {singlePortAdminPlugin} from './server/vite-admin-plugin.mjs';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    base: mode === 'github-pages' ? '/nk/' : '/',
    plugins: [singlePortAdminPlugin(env), react()],
    server: {
      host: '127.0.0.1',
      port: 5191,
      strictPort: true,
    },
    preview: {host: '127.0.0.1', port: 5191, strictPort: true},
    build: {target: 'es2022'},
  };
});
