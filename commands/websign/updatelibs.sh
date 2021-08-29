#!/bin/bash

cd $(cd "$(dirname "$0")" ; pwd)/../..

cd websign/lib

terser /node_modules/comlink/dist/umd/comlink.min.js -o comlink.js
terser /node_modules/dexie/dist/dexie.min.js -o dexie.js
terser /node_modules/whatwg-fetch/dist/fetch.umd.js -o fetch.js
terser /node_modules/localforage/dist/localforage.min.js -o localforage.js
terser ~/oldsupersphincs/node_modules/supersphincs/dist/supersphincs.js -o supersphincs.js

cat > brotli.webpack.js <<- EOM
	const os = require('os');

	module.exports = {
		entry: {
			app: os.homedir() + '/brotli/js/decode.min.js'
		},
		mode: 'none',
		output: {
			filename: 'brotli.js',
			library: 'brotli',
			libraryTarget: 'var',
			path: process.cwd()
		}
	};
EOM
webpack --config brotli.webpack.js
rm brotli.webpack.js
echo 'var BrotliDecode = brotli.BrotliDecode; brotli = undefined;' >> brotli.js
terser brotli.js -o brotli.js


# TODO: Automate this
echo 'NOTE: Generate hashes for localforage/dexie mismatches between index.html and serviceworker.js'
