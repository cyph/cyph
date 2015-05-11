#!/bin/bash

source ~/.bashrc

dir="$(pwd)"
cd $(cd "$(dirname "$0")"; pwd)/..
originalDir="$(pwd)"

./commands/docs.sh

tsfiles="$( \
	{ cat */*.html | grep "<script.*'/js/" & grep -ro "importScripts('/js/.*)" shared/js; } | \
		perl -pe "s/.*?'\/(js\/.*)\.js.*/\1/g" | \
		sort | \
		uniq \
)"

cd $dir

if [ -f build.sh ] ; then
	cd ..
fi

if [ -d shared ] ; then
	cd shared
fi

scssfiles="$(find css -name '*.scss' | grep -v bourbon/ | perl -pe 's/(.*)\.scss/\1/g')"


if [ "${1}" == '--watch' ] ; then
	for file in $tsfiles ; do
		tsc --sourceMap $file.ts --out $file.js --watch &
	done

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

	for file in $tsfiles ; do
		output="${output}$(tsc $file.ts --out $file.js)"
	done

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
