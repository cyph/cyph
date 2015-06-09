#!/bin/bash

source ~/.bashrc

cd "$(cd "$(dirname "$0")"; pwd)/../${1}"

rm .bootstrapText.tmp 2> /dev/null

for path in $( \
	cat websign/index.html | \
	tr '\n' ' ' | \
	perl -pe 's/\s+//g' | \
	perl -pe 's/.*?\[('"'"'index.html'"'"',.*?)\].*/\1,/g' | \
	tr ',' '\n' | \
	sed "s/'//g \
"); do
	file=''

	if [ "$path" == 'index.html' ] ; then
		path='/'
	fi

	echo -e "$path:\n" >> .bootstrapText.tmp

	if [ "$path" == '/' ] ; then
		file='websign/index.html'
		cat "$file" | sed "s/\\\$PROJECT/$1/g" >> .bootstrapText.tmp
	else
		file="$(echo $path | cut -c 2-)"
		cat "$file" >> .bootstrapText.tmp
	fi

	echo -e '\n\n\n\n\n' >> .bootstrapText.tmp
done

cat .bootstrapText.tmp | shasum -p -a 256 | perl -pe 's/(.*) .*/\1/'

rm .bootstrapText.tmp
