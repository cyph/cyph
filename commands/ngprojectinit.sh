#!/bin/bash


circleCI=''
if [ -f ~/.circleci ] ; then
	circleCI=true
fi

rm src/favicon.ico 2> /dev/null
cp ../shared/favicon.ico src/

for arr in \
	'node_modules /node_modules' \
	'src/assets ../shared/assets' \
	'src/css ../shared/css' \
	'src/js ../shared/js' \
	'src/templates ../shared/templates'
do
	read -ra arr <<< "${arr}"

	if [ "${circleCI}" ] ; then
		rm -rf "${arr[0]}" 2> /dev/null
		cp -a "${arr[1]}" "${arr[0]}"
	else
		rm "${arr[0]}" 2> /dev/null
		mkdir "${arr[0]}" 2> /dev/null
		sudo mount --bind "${arr[1]}" "${arr[0]}"
	fi
done
