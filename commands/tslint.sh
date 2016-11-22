#!/bin/bash

cd $(cd "$(dirname "$0")"; pwd)/..


tslint \
	-r /usr/lib/node_modules/tslint-microsoft-contrib \
	-r /usr/lib/node_modules/codelyzer \
	--project shared/js/tsconfig.json \
	--type-check \
	--noUnusedLocals \
	--noUnusedParameters \
	${*}
