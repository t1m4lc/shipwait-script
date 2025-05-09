import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/main.js'),
      name: 'WaitlySnippet',
      fileName: 'waitly-snippet',  // Should generate waitly-snippet.umd.js
      formats: ['umd'],
    },
    rollupOptions: {
      output: {
        file: 'dist/waitly-snippet.umd.js',  // Explicitly set the output file name
      },
    },
  },
});
