var path = require('path');

module.exports = {
    mode: 'production',
    entry: './dist/index.js',
    output: {
        library: 'ipregistry',
        libraryTarget: 'umd',
        path: path.resolve(__dirname, 'dist/browser'),
        filename: 'index.js'
    }
};
