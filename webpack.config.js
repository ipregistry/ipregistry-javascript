import path from 'path';

export default {
    mode: 'production',
    entry: './dist/index.js',
    output: {
        library: 'ipregistry',
        libraryTarget: 'umd',
        path: path.resolve(process.cwd(), 'dist/browser'),
        filename: 'index.js'
    }
};
