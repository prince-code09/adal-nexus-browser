import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  root: '.',
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      ignored: ['**/release/**', '**/dist/**', '**/data/**', '**/.adal-nexus/**', '**/.git/**'],
    },
  },
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer'),
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    fileParallelism: false,
  },
});
