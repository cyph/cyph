#!/bin/bash

cd $(cd "$(dirname "$0")"; pwd)/..


tslintrules='tslint-rules'

if [ "${1}" == '--fix' ] ; then
	cd shared
	tslintrules="$(mktemp -d)"
	cp tslint-rules/*.ts ${tslintrules}/
else
	tmpdir="$(mktemp -d)"
	./commands/copyworkspace.sh --client-only --global-modules "${tmpdir}"
	cd "${tmpdir}/shared"
fi

tsc --skipLibCheck ${tslintrules}/*.ts || exit 1

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
		'js/tsconfig.tslint.json',
		JSON.stringify(tsconfig)
	);
"

output="$(
	tslint \
		-r "${tslintrules}" \
		-r "/node_modules/codelyzer" \
		-r "/node_modules/tslint-microsoft-contrib" \
		--project js/tsconfig.tslint.json \
		--type-check \
		${*}
)"

rm js/tsconfig.tslint.json

echo -e "${output}"
exit ${#output}
