#!/bin/bash

cd $(cd "$(dirname "$0")" ; pwd)/../..

./commands/protobuf.sh

cd websign/lib

terser /node_modules/comlink/dist/umd/comlink.min.js -o comlink.js
terser /node_modules/dexie/dist/dexie.min.js -o dexie.js
terser /node_modules/whatwg-fetch/dist/fetch.umd.js -o fetch.js
terser /node_modules/protobufjs/dist/minimal/protobuf.min.js -o protobuf.js
terser /node_modules/supersphincs/dist/index.js -o supersphincs.js
terser ../../shared/js/proto/websign/index.web.js -o websign-proto.js

cat > brotli.webpack.cjs <<- EOM
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
		},
		module: {
			rules: [
				{
					exclude: /node_modules/,
					test: /\.m?js$/,
					use: {
						loader: 'babel-loader',
						options: {
							presets: [['@babel/preset-env']],
							plugins: ['@babel/plugin-transform-runtime']
						}
					}
				}
			]
		}
	};
EOM
rm ~/brotli/js/package.json # Workaround for formatting error
webpack --config brotli.webpack.cjs
rm brotli.webpack.cjs

cat >> brotli.js <<- EOM
	var _brotliDecode = brotli.BrotliDecode;
	brotli = undefined;

	self.brotliDecode = function (enc) {
		var dec = _brotliDecode(enc);
		return new Uint8Array(dec.buffer, dec.byteOffset, dec.byteLength);
	};
EOM

babel brotli.js --presets=@babel/preset-env -o brotli.js
terser brotli.js -o brotli.js


# TODO: Automate this
echo 'NOTE: Generate hashes for localforage/dexie mismatches between index.html and serviceworker.js'
