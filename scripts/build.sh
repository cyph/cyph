#!/bin/bash

dir="$(pwd)"
cd $(cd "$(dirname "$0")"; pwd)/..
originalDir="$(pwd)"

files="$( \
	{ cat */*.html | grep "<script.*'/js/" & grep -ro "importScripts('/js/.*)" shared/js; } | \
		perl -pe "s/.*?'\/(js\/.*)\.js.*/\1/g" | \
		sort | \
		uniq \
)"

cd $dir

if [ -d shared ] ; then
	cd shared
fi 


if [ "${1}" == '--watch' ] ; then
	sass --watch css &

	for file in $files ; do
		tsc --sourceMap $file.ts --out $file.js --watch &
	done
else
	output=''

	for file in $(find css -name '*.scss' | grep -v bourbon/ | perl -pe 's/(.*)\.scss/\1/g') ; do
		output="${output}$(sass $file.scss $file.css)"
	done

	for file in $files ; do
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
	else
		{ \
			find css -name '*.scss' & \
			find css -name '*.map' & \
			find js -name '*.ts' & \
			find js -name '*.map'; \
		} | xargs -I% rm %
	fi

	exit ${#output}
fi
