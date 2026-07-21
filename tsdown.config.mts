import { defineConfig } from 'tsdown'

export default defineConfig({
    clean: true,
    dts: true,
    entry: ['src/index.ts'],
    globalName: 'ipregistry',
    format: ['cjs', 'esm', 'iife'],
    minify: true,
    outExtensions: ctx => {
        switch (ctx.format) {
            case 'cjs':
                return { js: '.js', dts: '.d.ts' }
            default:
                return { js: '.mjs', dts: '.d.mts' }
        }
    },
    outputOptions: (options, format) => {
        if (format === 'iife') {
            // Keep the historical tsup filename referenced by the
            // "browser" field and CDN links (tsdown would emit
            // index.iife.global.js otherwise).
            options.entryFileNames = '[name].global.js'
        }
        return options
    },
    treeshake: true,
})
