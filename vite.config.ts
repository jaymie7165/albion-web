import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Albion World je samostatná frontend aplikace servírovaná Expressem
// pod cestou /albion-world/ (viz server.js — express.static + SPA fallback).
export default defineConfig({
  plugins: [react()],
  base: '/albion-world/',
  server: {
    port: 5174,
    proxy: {
      '/api': 'http://localhost:3000',
      '/logo.png': 'http://localhost:3000',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
