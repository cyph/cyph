#!/bin/bash

cd $(cd "$(dirname "$0")" ; pwd)/..


tmpDir="$(mktemp -d)"
./commands/copyworkspace.sh --client-only "${tmpDir}"
cd "${tmpDir}/shared"

# tslint and htmllint

cd js
ln -s /node_modules node_modules
checkTslintAllOutput="$(check-tslint-all 2>&1)"
if (( $? )) ; then
	echo "${checkTslintAllOutput}"
	exit 1
fi
rm node_modules
cd ..

/node_modules/tslint/node_modules/.bin/tsc --skipLibCheck tslint-rules/*.ts || exit 1

node -e "
	const tsconfig	= JSON.parse(
		fs.readFileSync('js/tsconfig.json').toString().
			split('\n').
			filter(s => s.trim()[0] !== '/').
			join('\n')
	);

	tsconfig.files	=
		'$(cd js ; find . -type f -name '*.ts' | tr '\n' ' ')typings/index.d.ts'.split(' ')
	;

	fs.writeFileSync(
		'js/tsconfig.tslint.json',
		JSON.stringify(tsconfig)
	);
"

output="$({
	tslint \
		-r tslint-rules \
		-r /node_modules/codelyzer \
		-r /node_modules/tslint-microsoft-contrib \
		--project js/tsconfig.tslint.json \
		--type-check \
	;
	find templates -type f -name '*.html' -not -path 'templates/native/*' -exec node -e '
		require("htmllint")(
			fs.readFileSync("{}").toString(),
			JSON.parse(fs.readFileSync("templates/htmllint.json").toString())
		).then(result => {
			if (result.length !== 0) {
				console.log("{}: " + JSON.stringify(result, undefined, "\t") + "\n\n");
			}
		})
	' \;;
})"

# Retire.js

cd ..

node -e 'fs.writeFileSync(
	".retireignore.json",
	JSON.stringify(
		JSON.parse(
			fs.readFileSync("retireignore.json").toString()
		).map(o => !o.path ?
			[o] :
			[o, Object.keys(o).reduce((acc, k) => {
				acc[k]	= k === "path" ? `/node_modules/${o[k]}` : o[k];
				return acc;
			}, {})]
		).reduce(
			(acc, arr) => acc.concat(arr),
			[]
		)
	)
)'

retireOutput="$(retire --path /node_modules 2>&1)"
if (( $? )) ; then
	output="${output}${retireOutput}"
fi

echo -e "${output}"
exit ${#output}
