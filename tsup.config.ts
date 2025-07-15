// tsup.config.ts
import { defineConfig } from 'tsup';
export default defineConfig({
  entry: ['lib/index.ts'], // или твой путь
  outDir: 'dist',
  format: ['esm', 'cjs'],
  dts: true
});
