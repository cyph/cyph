#!/bin/bash


if [ "$(ls -A node_modules 2> /dev/null)" ] ; then
	exit
fi

rm src/favicon.ico 2> /dev/null
cp ../shared/favicon.ico src/

for arr in \
	'/node_modules node_modules' \
	'../shared/assets src/assets' \
	'../shared/css src/css' \
	'../shared/js src/js' \
	'../shared/templates src/templates'
do
	read -ra arr <<< "${arr}"
	bindmount "${arr[0]}" "${arr[1]}"
done
