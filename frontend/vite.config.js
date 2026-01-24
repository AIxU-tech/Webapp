import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],

  // This is where the SPA will be hosted in prod
  base: '/app/',

  // Path aliases for cleaner imports
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@/components': resolve(__dirname, 'src/components'),
      '@/hooks': resolve(__dirname, 'src/hooks'),
      '@/api': resolve(__dirname, 'src/api'),
      '@/utils': resolve(__dirname, 'src/utils'),
      '@/config': resolve(__dirname, 'src/config'),
      '@/contexts': resolve(__dirname, 'src/contexts'),
      '@/pages': resolve(__dirname, 'src/pages'),
    },
  },

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
});