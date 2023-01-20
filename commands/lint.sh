#!/bin/bash


eval "$(parseArgs \
	--opt-bool fast \
	--opt-bool fix \
	--opt-bool html-only \
)"


cd $(cd "$(dirname "$0")" ; pwd)/..
dir="$PWD"

fast="$(getBoolArg ${_arg_fast})"
fix="$(getBoolArg ${_arg_fix})"

htmlOnly=''
if [ ! "${fast}" ] ; then
	htmlOnly="$(getBoolArg ${_arg_html_only})"
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

	grep $(../commands/websign/bootstraphash.sh) ../modules/websign-hash-whitelist.json > /dev/null
	checkfail 'WebSign hash whitelist check fail'

	# Validate component template/stylesheet count consistency

	componentConsistency="$(
		node -e '
			const glob = require("glob");

			const componentFiles = glob.sync("js/cyph/components/**", {nodir: true});

			const webTemplates = componentFiles.filter(s =>
				s.endsWith(".html") && !s.endsWith(".native.html")
			);

			const nativeTemplates = componentFiles.filter(s =>
				s.endsWith(".native.html")
			);

			const webStylesheets = componentFiles.filter(s =>
				s.endsWith(".scss") && !s.endsWith(".native.scss")
			);

			const nativeStylesheets = componentFiles.filter(s =>
				s.endsWith(".native.scss")
			);

			console.log(
				[webTemplates, nativeTemplates, webStylesheets, nativeStylesheets].
					map(a => a.length).
					reduce((a, b) => a === b ? a : -1)
				!== -1
			);
		'
	)"

	# Disable for now because there are legitimate uses for this
	# if [ "${componentConsistency}" != true ] ; then
	# 	fail 'Component template/stylesheet count mismatch'
	# fi

	# eslint

	# Workarounds for completed-docs bugs
	sed -i \
		's|PropertySignature|PropertyDeclaration|g' \
		/node_modules/tslint/lib/rules/completedDocsRule.js
	sed -i \
		's| this.contentTags| this.contentTags \&\& this.contentTags|g'\
		/node_modules/tslint/lib/rules/completed-docs/tagExclusion.js

	cd js
	cp ${dir}/shared/lib/js/package.json ./

	output="$(
		eslint \
			-c eslintrc.json \
			--ignore-path .eslintignore \
			$(if [ "${fix}" ] ; then echo '--fix' ; fi) \
			'**/*.ts' \
		2>&1
	)"

	if [ "${fix}" ] ; then
		find . \
			-name '*.ts' \
			-exec bash -c "cp -f '{}' \"\$(echo '{}' | sed 's|^\\.|${dir}/shared/js|g')\"" \
		\;
	fi

	cd ..
fi

# htmllint

output="${output}$({
	find js \
		-type f \
		-name '*.html' \
		-not -name '*.native.html' \
		-not -name account-compose.component.html \
		-not -name dynamic-form.html \
		-exec node -e '(async () => {
			const result = await require("htmllint")(
				fs.readFileSync("{}").toString().
					replace(/accept='"'"'[^'"'"']+'"'"'/g, "").
					replace(/\[([A-Za-z0-9]+)\.([A-Za-z0-9]+)\]='"'"'[^'"'"']+'"'"'/g, "").
					// replace(/\[([A-Za-z0-9\.]+)\]='"'"'[^'"'"']+'"'"'/g, "$1='"'"'balls'"'"'").
					replace(/\(([A-Za-z0-9\.]+)\)/g, "$1").
					replace(/\[([A-Za-z0-9\.]+)\]/g, "$1")
				,
				JSON.parse(fs.readFileSync("js/htmllint.json").toString())
			);

			if (result.length === 0) {
				return;
			}

			console.log("{}: " + JSON.stringify(result, undefined, "\t") + "\n\n");
		})().catch(err => {
			console.error({file: "{}", err});
			process.exit(1);
		})' \
	\;;
} 2>&1)"

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
					acc[k] = k === "path" ? `/node_modules/${o[k]}` : o[k];
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

	cd shared/lib/js
	cp ../../../npmauditignore.json ./.nsprc
	npmAuditOutput="$(better-npm-audit audit)"
	if (( $? )) ; then
		output="${output}${npmAuditOutput}$(npm audit)"
	fi
	rm .nsprc
	cd ../../..
fi

echo -e "${output}" | perl -pe 's/js\/\*\*\*\*\//js\/cyph\//g'

if [ ${#output} -gt 0 ] ; then
	fail
else
	pass
fi
