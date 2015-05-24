#!/bin/bash

source ~/.bashrc

cd "$(cd "$(dirname "$0")"; pwd)/../${1}"

rm .bootstrapText.tmp 2> /dev/null

for path in $( \
	cat websign.html | \
	tr '\n' ' ' | \
	perl -pe 's/\s+//g' | \
	perl -pe 's/.*?\[('"'"'\/'"'"',.*?)\].*/\1,/g' | \
	tr ',' '\n' | \
	sed "s/'//g \
"); do
	file=''

	if [ "$path" == '/' ] ; then
		file='websign.html'
	else
		file="$(echo $path | cut -c 2-)"
	fi

	echo -e "$path:\n" >> .bootstrapText.tmp
	cat "$file" >> .bootstrapText.tmp
	echo -e '\n\n\n\n\n' >> .bootstrapText.tmp
done

cat .bootstrapText.tmp | shasum -p -a 256 | perl -pe 's/(.*) .*/\1/'

rm .bootstrapText.tmp
