#!/bin/bash

source ~/.bashrc

d="${1}"
if [ ! "${d}" ] ; then
	d=shared
fi

cd "$(cd "$(dirname "$0")"; pwd)/../../${d}"

trimcat () {
	node -e "console.log(fs.readFileSync('${1}').toString().trim())"
}

rm .bootstrapText.tmp 2> /dev/null

for path in $( \
	cat websign/js/config.js | \
	tr '\n' ' ' | \
	perl -pe 's/\s+//g' | \
	perl -pe 's/.*?\[('"'"'.\/'"'"',.*?)\].*/\1,/g' | \
	tr ',' '\n' | \
	sed "s/'//g \
") ; do
	file=''

	echo -e "${path}:\n" >> .bootstrapText.tmp

	if [ "${path}" == './' ] ; then
		../commands/websign/pack.js websign/index.html .index.html.tmp
		trimcat .index.html.tmp >> .bootstrapText.tmp
		rm .index.html.tmp
	elif [ "${path}" == 'serviceworker.js' ] ; then
		trimcat websign/serviceworker.js >> .bootstrapText.tmp
	elif [ "${path}" == 'unsupportedbrowser' ] ; then
		trimcat websign/unsupportedbrowser.html >> .bootstrapText.tmp
	else
		trimcat "${path}" >> .bootstrapText.tmp
	fi

	echo -e '\n\n\n\n\n' >> .bootstrapText.tmp
done

node -e 'require("supersphincs").hash(
	fs.readFileSync(".bootstrapText.tmp").toString().trim()
).then(hash =>
	console.log(hash.hex)
)'

rm .bootstrapText.tmp
