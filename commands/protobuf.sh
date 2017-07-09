#!/bin/bash


dir="$PWD"
cd $(cd "$(dirname "$0")" ; pwd)/..


rm -rf shared/js/proto 2> /dev/null
mkdir shared/js/proto
pbjs -t static-module types.proto -o shared/js/proto/index.js
checkfail
pbts shared/js/proto/index.js -o shared/js/proto/index.d.ts
checkfail
