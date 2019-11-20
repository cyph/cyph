#!/bin/bash


init=true
if [ "${1}" == '--deinit' ] ; then
	init=''
	shift
fi

if [ "${init}" ] && [ "$(ls -A node_modules 2> /dev/null)" ] ; then
	exit
fi

rm src/favicon.ico 2> /dev/null
if [ "${init}" ] ; then
	cp ../shared/favicon.ico src/
fi

for arr in \
	'/node_modules node_modules' \
	'../shared/assets src/assets' \
	'../shared/css src/css' \
	'../shared/js src/js'
do
	read -ra arr <<< "${arr}"
	if [ "${init}" ] ; then
		bindmount "${arr[0]}" "${arr[1]}"
	else
		unbindmount "${arr[1]}"
		git checkout "${arr[1]}" &> /dev/null
	fi
done
