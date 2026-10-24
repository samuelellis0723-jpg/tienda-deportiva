import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, req) => console.error('[Vite Proxy Error]:', err.message, req.url));
        },
      },
      '/n8n': {
        target: 'http://127.0.0.1:5678',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/n8n/, ''),
        configure: (proxy) => {
          proxy.on('error', (err, req) => console.error('[Vite Proxy Error]:', err.message, req.url));
        },
      },
    },
  },
});
