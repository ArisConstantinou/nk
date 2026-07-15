import {defineConfig, loadEnv} from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), '');
  const adminApiTarget = env.ADMIN_API_TARGET || 'http://127.0.0.1:5192';

  return {
    base: mode === 'github-pages' ? '/nk/' : '/',
    plugins: [react()],
    server: {
      host: '127.0.0.1',
      port: 5191,
      strictPort: true,
      proxy: {'/api/admin': {target: adminApiTarget, changeOrigin: false}},
    },
    preview: {host: '127.0.0.1', port: 5191, strictPort: true},
    build: {target: 'es2022'},
  };
});
