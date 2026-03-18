import { defineConfig } from 'tsup';

//

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: {
    resolve: true
  },
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  minify: true,
  tsconfig: './tsconfig.bundle.json',
  external: [
    'react'
  ]
});
