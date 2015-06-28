#!/bin/bash

source ~/.bashrc

project="${1}"
branch="${2}"

cd "$(cd "$(dirname "$0")"; pwd)/../shared"

if [ "${branch}" ] ; then
	project="${branch}.${project}"
fi

rm .bootstrapText.tmp 2> /dev/null

for path in $( \
	cat websign/index.html | \
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
		../commands/websign/pack.py .index.html.tmp .index.html.tmp
		cat .index.html.tmp >> .bootstrapText.tmp
		rm .index.html.tmp
	elif [ "$path" == 'serviceworker.js' ] ; then
		cat websign/serviceworker.js >> .bootstrapText.tmp
	else
		cat "$path" >> .bootstrapText.tmp
	fi

	echo -e '\n\n\n\n\n' >> .bootstrapText.tmp
done

cat .bootstrapText.tmp | shasum -p -a 256 | perl -pe 's/(.*) .*/\1/'

rm .bootstrapText.tmp
