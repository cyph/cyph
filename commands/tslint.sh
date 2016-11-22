#!/bin/bash

cd $(cd "$(dirname "$0")"; pwd)/..


tsc shared/tslint-rules/*.ts || exit 1

tslint \
	-r shared/tslint-rules \
	-r /usr/lib/node_modules/codelyzer \
	-r /usr/lib/node_modules/tslint-microsoft-contrib \
	--project shared/js/tsconfig.json \
	--type-check \
	--noUnusedLocals \
	--noUnusedParameters \
	${*}

rm shared/tslint-rules/*.js
