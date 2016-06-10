#!/bin/bash

source ~/.bashrc

dir="$(pwd)"
cd $(cd "$(dirname "$0")"; pwd)/..
originalDir="$(pwd)"

./commands/docs.sh

babelrc="{'presets': ['es2015'], 'compact': false"

tsargs="$(node -e '
	const compilerOptions = JSON.parse(
		'"'$(cat shared/js/tsconfig.json | tr '\n' ' ')'"'
	).compilerOptions;

	console.log(Object.keys(compilerOptions).map(k => {
		const v = compilerOptions[k];
		var argValue = "";

		if (v === false) {
			return;
		}
		else if (v !== true) {
			argValue = " " + v.toString();
		}

		return `--${k}${argValue}`;
	}).join(" "));
')"

tsfiles="$( \
	{ \
		cat */*.html $(find cyph.com/blog -name '*.html') | \
		grep "<script.*'/js/" & \
		grep -ro "importScripts('/js/.*)" shared/js; \
	} | \
		perl -pe "s/.*?'\/js\/(.*)\.js.*/\1/g" | \
		sort | \
		uniq | \
		tr '\n' ' ' \
)"

jsbundle () {
	# # Temporary workaround for jspm bug
	# if [ "$1" == "global/base" ] ; then
	# 	cat $1.js | \
	# 		tr '\n' '☁' | \
	# 		perl -pe 's/.*var .*?(var .*?;).*execute:.*?\{(.*?)exports.*/\1\n\2/g' | \
	# 		tr '☁' '\n' | \
	# 		perl -pe 's/^ {12}//g' \
	# 	> $1.js.new
	# 	mv $1.js.new $1.js
	# else
	# 	jspm bundle-sfx $1 $1.js
	# 	git checkout HEAD -- config.js
	# fi

	if [ "${1}" != 'global/base' -a "${1}" != 'cyph/session' ] ; then
		echo -e "\n\nSystem.import('${1}');" >> $1.js
	fi

	sed -i 's|use strict||g' $1.js

	# cp ../lib/js/require.js $1.js.new
	# echo >> $1.js.new
	# cat $1.js >> $1.js.new
	# echo -e "\n\nrequire(['${1}']);\ndefine = undefined;\nrequire = undefined;" >> $1.js.new
	# mv $1.js.new $1.js
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


if [ "${1}" == '--watch' ] ; then
	bash -c "
		cd js
		while true ; do
			for file in $tsfiles ; do
				tsc $tsargs --sourceMap \$file.ts --outFile \$file.ts.js
				echo \"$babelrc, 'sourceMaps': true, 'inputSourceMap': '\$file.ts.js'}\" > .babelrc
				babel \$file.ts.js -o \$file.js
				rm .babelrc
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
		output="${output}$(tsc $tsargs $file.ts --outFile $file.ts.js)"
		echo "$babelrc}" > .babelrc
		babel $file.ts.js -o $file.js
		rm .babelrc
		jsbundle $file
	done
	cd ..

	echo -e "${output}"

	if [ "${1}" == '--test' ] ; then
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
			find js -name '*.map'; \
		} | xargs -I% rm %

		rm -rf js/docs
	fi

	exit ${#output}
fi
