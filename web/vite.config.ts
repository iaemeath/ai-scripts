import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// API port override — mirrors the server's own `PORT ?? 8792`.
const apiPort = process.env.SCRIPTS_API_PORT ?? '8792';

export default defineConfig({
  plugins: [vue()],
  server: {
    host: true,
    port: 5175,
    strictPort: true,
    proxy: {
      '/api': {
        target: `http://localhost:${apiPort}`,
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
  },
});
