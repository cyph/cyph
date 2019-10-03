#!/bin/bash

cd $(cd "$(dirname "$0")" ; pwd)/../..

terser /node_modules/whatwg-fetch/dist/fetch.umd.js -o websign/lib/fetch.js
terser /node_modules/localforage/dist/localforage.min.js -o websign/lib/localforage.js
terser ~/oldsupersphincs/node_modules/supersphincs/dist/supersphincs.js -o websign/lib/supersphincs.js
