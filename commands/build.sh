#!/bin/bash

dir="$(pwd)"
cd $(cd "$(dirname "$0")"; pwd)/..

watch=''
test=''
simpletest=''

if [ "${1}" == '--watch' ] ; then
	watch=true
elif [ "${1}" == '--test' ] ; then
	test=true
elif [ "${1}" == '--simpletest' ] ; then
	simpletest=true
fi

tsargs="$(node -e '
	const compilerOptions	= JSON.parse(
		fs.readFileSync("shared/js/tsconfig.json").toString()
	).compilerOptions;

	console.log(Object.keys(compilerOptions).map(k => {
		const v			= compilerOptions[k];
		let argValue	= "";

		if (v === false) {
			return;
		}
		else if (v !== true) {
			argValue	= " " + v.toString();
		}

		return `--${k}${argValue}`;
	}).join(" "));
')"

tsfiles="$( \
	{ \
		find . -name '*.html' -not \( \
			-path './.build/*' \
			-or -path './websign/*' \
			-or -path '*/lib/*' \
		\) -exec cat {} \; | \
		grep -oP "src=(['\"])/js/.*?\1" & \
		grep -roP "importScripts\((['\"])/js/.*\1\)" shared/js & \
		echo cyph/analytics; \
	} | \
		perl -pe "s/.*?['\"]\/js\/(.*)\.js.*/\1/g" | \
		sort | \
		uniq | \
		grep -v 'Binary file' | \
		tr '\n' ' ' \
)"

cd $dir
if [ -f build.sh ] ; then
	cd ..
fi
if [ -d shared ] ; then
	cd shared
fi

scssfiles="$(find css -name '*.scss' | grep -v bourbon/ | perl -pe 's/(.*)\.scss/\1/g' | tr '\n' ' ')"


output=''

modulename () {
	m="$(echo ${1} | perl -pe 's/.*\/([^\/]+)$/\u$1/')"
	classM="$(grep -oiP "class\s+${m}" ${1}.ts | perl -pe 's/class\s+//')"

	if [ "${classM}" ] ; then
		echo "${classM}"
	else
		echo "${m}"
	fi
}

compile () {
	for f in $scssfiles ; do
		command="scss -Icss $f.scss $f.css"
		if [ "${watch}" ] ; then
			$command &
		else
			output="${output}$($command)"
		fi
	done

	cp -a js .js.tmp
	cd .js.tmp

	if [ ! "${simpletest}" ] ; then
		for f in $tsfiles ; do
			node -e "
				const resolveReferences	= f => {
					const path		= fs.realpathSync(f);
					const parent	= path.split('/').slice(0, -1).join('/');

					return fs.readFileSync(path).toString().trim().replace(
						/\/\/\/ <reference path=\"(.*)\".*/g,
						(ref, sub) => sub.match(/\.d\.ts\$/) ?
							ref :
							\`export const _\${crypto.randomBytes(4).toString('hex')} = (() => {
								\${resolveReferences(parent + '/' + sub)}
							})();\`
					);
				};

				fs.writeFileSync(
					'${f}.ts',
					resolveReferences('${f}.ts')
				);
			"
		done
	fi

	output="${output}$(tsc $tsargs preload/global.ts $(for f in $tsfiles ; do echo $f.ts ; done))"

	if [ ! "${simpletest}" ] ; then
		for f in $tsfiles ; do
			webpack \
				--optimize-dedupe \
				--output-library-target var \
				--output-library "$(modulename $f)" \
				$f.js \
				$f.js.tmp
		done
		for f in $tsfiles ; do
			m="$(modulename $f)"

			{
				cat preload/global.js;
				cat $f.js.tmp | sed '0,/var ${m} =/s||self.${m} =|';
				echo "${m} = ${m}.${m} || ${m};";
			} | \
				if [ "${watch}" ] ; then cat - ; else babel --presets es2015 --compact false ; fi | \
				sed 's|use strict||g' \
			> ../js/$f.js
		done
	fi

	cd ..
	rm -rf .js.tmp
}

if [ "${watch}" ] ; then
	while true ; do
		start="$(date +%s)"
		echo -e '\n\n\nBuilding JS/CSS\n\n'
		compile
		echo -e "\n\n\nFinished building JS/CSS ($(expr $(date +%s) - $start)s)\n\n"
		sleep 30
		inotifywait -r --exclude '(node_modules|sed.*|.*\.(html|css|js|map|tmp))$' css js
	done
else
	compile
fi

echo -e "${output}"

if [ "${test}" -o "${simpletest}" ] ; then
	{ \
		find css -name '*.css' & \
		find css -name '*.map' & \
		find js -name '*.js' & \
		find js -name '*.map'; \
	} | xargs -I% rm %
fi

exit ${#output}
