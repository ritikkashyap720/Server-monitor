import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 4003,
    proxy: {
      '/api': {
        target: 'http://localhost:4002',
        changeOrigin: true,
      },
      '/ws': {
        target: 'http://localhost:4002',
        ws: true,
      },
      '/ws/logs': {
        target: 'http://localhost:4002',
        ws: true,
      },
    },
  },
});
