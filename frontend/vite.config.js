import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  // Load .env from parent directory (where backend .env lives)
  const env = loadEnv(mode, resolve(__dirname, '..'), '');

  return {
    plugins: [react()],
    define: {
      __DEV_MODE__: JSON.stringify(env.DEV_MODE === 'true'),
    },
  // This is where the SPA will be hosted in prod
  base: '/app/',

  build: {
    // Put built assets into Flask's static folder
    outDir: resolve(__dirname, '../static/app'),
    emptyOutDir: true,
  },

  server: {
    port: 5173,
    // Open browser at /app/ path
    open: '/app',
    // Proxy API calls and WebSocket connections to Flask backend during development
    proxy: {
      // REST API proxy
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        // Preserve cookies for Flask-Login authentication
        secure: false,
      },
      '/user': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        // Preserve cookies for Flask-Login authentication
        secure: false,
      },
      // Socket.IO WebSocket proxy
      // Socket.IO uses /socket.io/ path for connections
      '/socket.io': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        // Enable WebSocket proxying
        ws: true,
      },
    },
  },

  // Preview server (used after build)
  preview: {
    port: 5173,
  },
  };
});