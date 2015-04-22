#!/bin/bash

dir="$(pwd)"
cd $(cd "$(dirname "$0")"; pwd) # $(dirname `readlink -f "${0}" || realpath "${0}"`)

files="$( \
	{ cat */*.html | grep "<script.*'/js/" & grep -ro "importScripts('/js/.*)" shared/js; } | \
		perl -pe "s/.*?'\/(js\/.*)\.js.*/\1/g" | \
		sort | \
		uniq \
)"

cd $dir


if [ "${1}" == '--watch' ] ; then
	for file in $files ; do
		tsc --sourceMap shared/$file.ts --out shared/$file.js --watch &
	done
else
	output=''

	for file in $files ; do
		output="${output}$(tsc $file.ts --out $file.js)"
	done

	echo "${output}"

	exit ${#output}
fi

