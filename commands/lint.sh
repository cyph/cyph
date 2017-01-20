#!/bin/bash

cd $(cd "$(dirname "$0")"; pwd)/..


tmpDir="$(mktemp -d)"
./commands/copyworkspace.sh --client-only "${tmpDir}"
cd "${tmpDir}/shared"

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
		'js/tsconfig.tslint.json',
		JSON.stringify(tsconfig)
	);
"

output="$(
	tslint \
		-r tslint-rules \
		-r /node_modules/codelyzer \
		-r /node_modules/tslint-microsoft-contrib \
		--project js/tsconfig.tslint.json \
		--type-check
)"

output="${output}$(
	find templates -type f -name '*.html' -not -path 'templates/native/*' -exec node -e '
		require("htmllint")(
			fs.readFileSync("{}").toString(),
			JSON.parse(fs.readFileSync("templates/htmllint.json").toString())
		).then(result => {
			if (result.length !== 0) {
				console.log("{}: " + JSON.stringify(result) + "\n\n");
			}
		})
	' \;
)"

echo -e "${output}"
exit ${#output}
