import { defineConfig } from 'tsup';

export default defineConfig({
    clean: true,
    dts: true,
    entry: ['src/index.ts'],
    globalName: 'ipregistry',
    format: ['cjs', 'esm', 'iife'],
    minify: 'terser',
    treeshake: true
});