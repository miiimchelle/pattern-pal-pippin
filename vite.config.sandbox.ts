import { defineConfig } from 'vite';
import path from 'path';
import fs from 'fs';

const htmlPath = path.resolve(__dirname, 'dist/index.html');
const placeholder = '"__HTML_PLACEHOLDER__"';

function injectHtmlPlugin() {
  let htmlEscaped = '""';
  if (fs.existsSync(htmlPath)) {
    htmlEscaped = JSON.stringify(fs.readFileSync(htmlPath, 'utf-8'));
  }
  return {
    name: 'inject-html',
    generateBundle(_, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (chunk.type === 'chunk' && chunk.code) {
          chunk.code = chunk.code.split(placeholder).join(htmlEscaped);
        }
      }
    },
  };
}

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: path.resolve(__dirname, 'src/plugin/code.ts'),
      name: 'code',
      formats: ['iife'],
      fileName: () => 'code.js',
    },
    rollupOptions: {
      plugins: [injectHtmlPlugin()],
      output: {
        entryFileNames: 'code.js',
        extend: true,
      },
    },
  },
});
