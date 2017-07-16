#!/bin/bash


dir="$PWD"
cd $(cd "$(dirname "$0")" ; pwd)/..


rm -rf shared/js/proto 2> /dev/null
mkdir shared/js/proto
pbjs -t static-module types.proto -o shared/js/proto/index.js
checkfail

# Temporary workaround for https://github.com/dcodeIO/protobuf.js/issues/863
while \
	[ $({ wc -l shared/js/proto/index.d.ts 2> /dev/null || echo 0; } | awk '{print $1}') -lt 2000 ] && \
	! tsc shared/js/proto/index.d.ts &> /dev/null \
; do
	pbts shared/js/proto/index.js -o shared/js/proto/index.d.ts
	checkfail
done
