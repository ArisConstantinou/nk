import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({mode}) => ({
  base: mode === 'github-pages' ? '/nk/' : '/',
  plugins: [react()],
  server: {host: '127.0.0.1', port: 5191, strictPort: true},
  preview: {host: '127.0.0.1', port: 5191, strictPort: true},
  build: {target: 'es2022'},
}));
