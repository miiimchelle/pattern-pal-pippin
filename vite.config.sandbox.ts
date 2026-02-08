import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    target: 'es2019',
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: path.resolve(__dirname, 'src/plugin/code.ts'),
      name: 'code',
      formats: ['iife'],
      fileName: () => 'code.js',
    },
    rollupOptions: {
      output: {
        entryFileNames: 'code.js',
        extend: true,
      },
    },
  },
});
