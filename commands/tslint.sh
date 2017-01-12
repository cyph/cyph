#!/bin/bash

cd $(cd "$(dirname "$0")"; pwd)/..

./commands/getlibs.sh


tmpdir="$(mktemp -d)"
cp -rL shared/js shared/tslint-rules "${tmpdir}/"
cd "${tmpdir}"

tsc tslint-rules/*.ts || exit 1

output="$(
	tslint \
		-r tslint-rules \
		-r /usr/lib/node_modules/codelyzer \
		-r /usr/lib/node_modules/tslint-microsoft-contrib \
		--project js/tsconfig.json \
		--type-check \
		${*}
)"

echo -e "${output}"
exit ${#output}
