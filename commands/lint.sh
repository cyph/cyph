#!/bin/bash


cd $(cd "$(dirname "$0")" ; pwd)/..
dir="$PWD"

fast=''
htmlOnly=''
if [ "${1}" == '--fast' ] ; then
	fast=true
	shift
elif [ "${1}" == '--html-only' ] ; then
	htmlOnly=true
	shift
fi

log 'Starting lint'

if [ "${fast}" ] ; then
	./commands/protobuf.sh
	checkfail
elif [ ! "${htmlOnly}" ] ; then
	output="$(./commands/buildunbundledassets.sh 2>&1)"
	checkfail "${output}"
fi

tmpDir="$(mktemp -d)"
./commands/copyworkspace.sh "${tmpDir}"
cd "${tmpDir}/shared"

if [ ! "${htmlOnly}" ] ; then
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

			const nativeStylesheets	= glob.sync(
				"css/native/components/**",
				{nodir: true}
			).filter(s =>
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

	# tslint

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

	cp ${dir}/shared/lib/js/package.json ./
	cp -rf css templates js/

	output="$(
		tslint \
			-e '/node_modules/**' \
			--project js/tsconfig.tslint.json \
		2>&1 |
			if [ "${fast}" ] ; then grep -v js/native/js ; else cat - ; fi |
			grep -vP "Warning: Cannot read property '.*?' of undefined"
	)"
fi

if [ "${htmlOnly}" ] || [ ! "${fast}" ] ; then
	# htmllint

	output="${output}$({
		find templates \
			-type f \
			-name '*.html' \
			-not -path 'templates/native/*' \
			-not -name dynamic-form.html \
			-exec node -e '(async () => {
				const result	= await require("htmllint")(
					fs.readFileSync("{}").toString().replace(/\[([A-Za-z0-9]+)\]/g, "$1")
					JSON.parse(fs.readFileSync("templates/htmllint.json").toString())
				);

				if (result.length === 0) {
					return;
				}

				console.log("{}: " + JSON.stringify(result, undefined, "\t") + "\n\n");
			})()' \
		\;;
	} 2>&1)"
fi
if [ ! "${htmlOnly}" ] && [ ! "${fast}" ] ; then
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
fi

echo -e "${output}"
log 'Lint complete'
exit ${#output}
