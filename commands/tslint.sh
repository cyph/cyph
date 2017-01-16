#!/bin/bash

cd $(cd "$(dirname "$0")"; pwd)/..


tmpdir="$(mktemp -d)"
./commands/copyworkspace.sh "${tmpdir}"
cd "${tmpdir}/shared"

tsc --skipLibCheck tslint-rules/*.ts || exit 1

node -e "
	const tsconfig	= JSON.parse(
		fs.readFileSync('js/tsconfig.json').toString().
			split('\n').
			filter(s => s.trim()[0] !== '/').
			join('\n')
	);

	tsconfig.files	= [
		'cyph.com/main.ts',
		'cyph.im/main.ts',
		'native/main.ts',
		'typings/index.d.ts'
	];

	fs.writeFileSync(
		'js/tsconfig.json',
		JSON.stringify(tsconfig)
	);
"

output="$(
	tslint \
		-r tslint-rules \
		-r ${NODE_PATH}/codelyzer \
		-r ${NODE_PATH}/tslint-microsoft-contrib \
		--project js/tsconfig.json \
		--type-check \
		${*}
)"

echo -e "${output}"
exit ${#output}
