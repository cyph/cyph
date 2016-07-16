#!/bin/bash

source ~/.bashrc

project="${1}"
branch="${2}"

cd "$(cd "$(dirname "$0")"; pwd)/../../shared"

if [ "${branch}" ] ; then
	project="${branch}.${project}"
fi

rm .bootstrapText.tmp 2> /dev/null

for path in $( \
	cat websign/js/main.js | \
	tr '\n' ' ' | \
	perl -pe 's/\s+//g' | \
	perl -pe 's/.*?\[('"'"'.\/'"'"',.*?)\].*/\1,/g' | \
	tr ',' '\n' | \
	sed "s/'//g \
"); do
	file=''

	echo -e "$path:\n" >> .bootstrapText.tmp

	if [ "$path" == './' ] ; then
		cat websign/index.html | sed "s/\\\$PROJECT/${project}/g" > .index.html.tmp
		../commands/websign/pack.js .index.html.tmp .index.html.tmp
		cat .index.html.tmp >> .bootstrapText.tmp
		rm .index.html.tmp
	elif [ "$path" == 'serviceworker.js' ] ; then
		cat websign/serviceworker.js >> .bootstrapText.tmp
	elif [ "$path" == 'unsupportedbrowser' ] ; then
		cat websign/unsupportedbrowser.html >> .bootstrapText.tmp
	else
		cat "$path" >> .bootstrapText.tmp
	fi

	echo -e '\n\n\n\n\n' >> .bootstrapText.tmp
done

node -e 'require("supersphincs").hash(
	fs.readFileSync(".bootstrapText.tmp").toString()
).then(hash =>
	console.log(hash.hex)
)'

rm .bootstrapText.tmp
