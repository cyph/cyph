#!/bin/bash


cd $(cd "$(dirname "$0")" ; pwd)/..


log 'Starting lint'
tmpDir="$(mktemp -d)"
./commands/copyworkspace.sh "${tmpDir}"
cd "${tmpDir}/shared"

# WebSign hash whitelist check

grep $(../commands/websign/bootstraphash.sh) ../websign/hashwhitelist.json > /dev/null
checkfail 'WebSign hash whitelist check fail'

# Validate component template/stylesheet count consistency

componentConsistency="$(
	node -e '
		const glob	= require("glob");

		/* Used to offset web AppComponents not having component stylesheets */
		const webIndexHtml		= glob.sync("templates/**", {nodir: true}).filter(s =>
			s.endsWith("/index.html") && s.indexOf("/native/") < 0
		);

		const webTemplates		= glob.sync("templates/**", {nodir: true}).filter(s =>
			s.endsWith(".html") && s.indexOf("/native/") < 0
		);

		const nativeTemplates	= glob.sync("templates/native/**", {nodir: true}).filter(s =>
			s.endsWith(".html") && s.indexOf("/app/") < 0
		);

		const webStylesheets	= glob.sync("css/components/**", {nodir: true}).filter(s =>
			s.endsWith(".scss")
		).concat(
			webIndexHtml
		);

		const nativeStylesheets	= glob.sync("css/native/components/**", {nodir: true}).filter(s =>
			s.endsWith(".scss")
		).concat(
			webIndexHtml
		);

		console.log(
			[webTemplates, nativeTemplates, webStylesheets, nativeStylesheets].
				map(a => a.length).
				reduce((a, b) => a === b ? a : -1)
			!== -1
		);
	'
)"

if [ "${componentConsistency}" != true ] ; then
	fail 'Component template/stylesheet count mismatch'
fi

# tslint and htmllint

cd js
bindmount /node_modules node_modules
mv tslint.json tslint.json.old
cat tslint.json.old | grep -v tslint-microsoft-contrib > tslint.json
checkTslintAllOutput="$(check-tslint-all 2>&1)"
checkfail "${checkTslintAllOutput}"
mv tslint.json.old tslint.json
unbindmount node_modules
cd ..

tsc --skipLibCheck js/tslint-rules/*.ts || exit 1

node -e "
	const tsconfig	= JSON.parse(
		fs.readFileSync('js/tsconfig.json').toString().
			split('\n').
			filter(s => s.trim()[0] !== '/').
			join('\n')
	);

	/* Pending Angular AOT fix */
	tsconfig.compilerOptions.noUnusedParameters	= true;

	tsconfig.compilerOptions.paths	= undefined;

	tsconfig.files	=
		'$(cd js ; find . -type f -name '*.ts' | tr '\n' ' ')typings/index.d.ts'.split(' ')
	;

	fs.writeFileSync(
		'js/tsconfig.tslint.json',
		JSON.stringify(tsconfig)
	);
"

cp -rf css templates js/

output="$({
	tslint \
		-e '/node_modules/**' \
		--project js/tsconfig.tslint.json \
		--type-check \
	;
	find templates -type f -name '*.html' -not -path 'templates/native/*' -exec node -e '(async () => {
		const result	= await require("htmllint")(
			fs.readFileSync("{}").toString(),
			JSON.parse(fs.readFileSync("templates/htmllint.json").toString())
		);

		if (result.length === 0) {
			return;
		}

		console.log("{}: " + JSON.stringify(result, undefined, "\t") + "\n\n");
	})()' \;;
} 2>&1 |
	grep -v js/native/js |
	grep -vP "Warning: Cannot read property '.*?' of undefined"
)"

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
log 'Lint complete'
exit ${#output}
