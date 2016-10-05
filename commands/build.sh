#!/bin/bash

dir="$(pwd)"
cd $(cd "$(dirname "$0")"; pwd)/..
originalDir="$(pwd)"

find . -name node_modules -exec rm -rf {} \;

if [ "${1}" != '--simple' -a "${1}" != '--prod' ] ; then
	./commands/docs.sh
fi

tsargs="$(node -e '
	const compilerOptions	= JSON.parse(
		'"'$(cat shared/js/tsconfig.json | tr '\n' ' ')'"'
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
		find . -name '*.html' -not \( -path './websign/*' -or -path '*/lib/*' \) -exec cat {} \; | \
		grep -oP "src=(['\"])/js/.*?\1" & \
		grep -roP "importScripts\((['\"])/js/.*\1\)" shared/js; \
	} | \
		grep -v js/config.js | \
		perl -pe "s/.*?['\"]\/js\/(.*)\.js.*/\1/g" | \
		sort | \
		uniq | \
		grep -v 'Binary file' | \
		tr '\n' ' ' \
)"

jsbundle () {
	webpack --optimize-dedupe $1.js $1.js.packed
	mv $1.js.packed $1.js
	sed -i 's|use strict||g' $1.js
}
export -f jsbundle

cd $dir

if [ -f build.sh ] ; then
	cd ..
fi

if [ -d shared ] ; then
	cd shared
fi

scssfiles="$(find css -name '*.scss' | grep -v bourbon/ | perl -pe 's/(.*)\.scss/\1/g' | tr '\n' ' ')"


rm -rf js/node_modules 2> /dev/null
mkdir js/node_modules
cp -Lr lib/js/@angular lib/js/rxjs js/node_modules/

if [ "${1}" == '--watch' ] ; then
	bash -c "
		cd js
		while true ; do
			for file in $tsfiles ; do
				tsc $tsargs --sourceMap \$file.ts
				jsbundle \$file
			done
			inotifywait -r --exclude '.*\.(js|map|html)$' .
		done
	" &

	bash -c "
		while true ; do
			for file in $scssfiles ; do
				sass \$file.scss \$file.css
			done
			inotifywait -r --exclude '.*\.(css|map)$' css
		done
	" &

	sleep infinity
else
	output=''

	for file in $scssfiles ; do
		output="${output}$(sass $file.scss $file.css)"
	done

	cd js
	for file in $tsfiles ; do
		output="${output}$(tsc $tsargs $file.ts)"
	done
	if [ "${1}" != '--simple' ] ; then
		find . -name '*.js' -not \( \
			-wholename './config.js' -or \
			-path './node_modules/*' \
		\) -exec bash -c '
			babel --presets es2015 --compact false {} -o {}.babel;
			mv {}.babel {};
		' \;
	fi
	for file in $tsfiles ; do
		jsbundle $file
	done
	cd ..

	echo -e "${output}"

	rm -rf js/node_modules

	if [ "${1}" == '--test' -o "${1}" == '--simple' ] ; then
		cd $originalDir

		rm -rf shared/js/docs

		{ \
			find shared/css -name '*.css' & \
			find shared/css -name '*.map' & \
			find shared/js \( -name '*.js' -and -not -name config.js \) & \
			find shared/js -name '*.map'; \
		} | xargs -I% rm %
	elif [ "${1}" == '--prod' ] ; then
		{ \
			find css -name '*.scss' & \
			find css -name '*.map' & \
			find js -name '*.ts' & \
			find js -name '*.ts.js' & \
			find js -name '*.map'; \
		} | xargs -I% rm %

		rm -rf js/docs
	fi

	exit ${#output}
fi
