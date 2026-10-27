import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const API = `http://localhost:${process.env.PORT || 8787}`;

export default defineConfig({
  plugins: [react()],
  server: {
    open: true,
    // In development the website runs on Vite (5173) and the API on the Node server (8787).
    proxy: {
      '/api': { target: API, changeOrigin: false },
      '/uploads': { target: API, changeOrigin: false },
    },
  },
  build: { sourcemap: false },
});
