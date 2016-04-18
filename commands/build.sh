#!/bin/bash

source ~/.bashrc

dir="$(pwd)"
cd $(cd "$(dirname "$0")"; pwd)/..
originalDir="$(pwd)"

./commands/docs.sh

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
		uniq \
)"

jsbundle () {
	# # Temporary workaround for jspm bug
	# if [ "$file" == "global/base" ] ; then
	# 	cat $file.js | \
	# 		tr '\n' '☁' | \
	# 		perl -pe 's/.*var .*?(var .*?;).*execute:.*?\{(.*?)exports.*/\1\n\2/g' | \
	# 		tr '☁' '\n' | \
	# 		perl -pe 's/^ {12}//g' \
	# 	> $file.js.new
	# 	mv $file.js.new $file.js
	# else
	# 	jspm bundle-sfx $file $file.js
	# 	git checkout HEAD -- config.js
	# fi

	cp ../lib/js/require.js $file.js.new
	echo >> $file.js.new
	cat $file.js >> $file.js.new
	echo -e "\n\nrequire(['${file}']);" >> $file.js.new
	mv $file.js.new $file.js
}

cd $dir

if [ -f build.sh ] ; then
	cd ..
fi

if [ -d shared ] ; then
	cd shared
fi

scssfiles="$(find css -name '*.scss' | grep -v bourbon/ | perl -pe 's/(.*)\.scss/\1/g')"


if [ "${1}" == '--watch' ] ; then
	cd js
	tsbuild () {
		while true ; do
			for file in $tsfiles ; do
				tsc $tsargs --sourceMap $file.ts --outFile $file.js
				jsbundle
			done
			sleep 30
		done
	}
	tsbuild &
	cd ..

	# sass --watch isn't working for some reason
	while true ; do
		for file in $scssfiles ; do
			sass $file.scss $file.css
		done
		sleep 30
	done
else
	output=''

	for file in $scssfiles ; do
		output="${output}$(sass $file.scss $file.css)"
	done

	cd js
	for file in $tsfiles ; do
		output="${output}$(tsc $tsargs $file.ts --outFile $file.js)"
		jsbundle
	done
	cd ..

	echo -e "${output}"

	if [ "${1}" == '--test' ] ; then
		cd $originalDir

		{ \
			find shared/css -name '*.css' & \
			find shared/css -name '*.map' & \
			find shared/js -name '*.js' & \
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
