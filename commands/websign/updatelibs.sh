#!/bin/bash

cd $(cd "$(dirname "$0")" ; pwd)/../..

terser ~/brotli/js/decode.js -cmo websign/lib/brotli.js
terser /node_modules/comlink/dist/umd/comlink.min.js -o websign/lib/comlink.js
terser /node_modules/whatwg-fetch/dist/fetch.umd.js -o websign/lib/fetch.js
terser /node_modules/localforage/dist/localforage.min.js -o websign/lib/localforage.js
terser ~/oldsupersphincs/node_modules/supersphincs/dist/supersphincs.js -o websign/lib/supersphincs.js

# TODO: Automate this
echo 'NOTE: Generate hashes for localforage mismatches between index.html and serviceworker.js'
