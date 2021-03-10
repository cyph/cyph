#!/bin/bash


cd $(cd "$(dirname "$0")" ; pwd)/..
dir="$PWD"


if [ "${1}" != '--angular-only' ] ; then
	cd backend
	go build
	checkfail
	cd ..

	output="$(./commands/buildunbundledassets.sh 2>&1)"
	checkfail "${output}"

	./commands/lint.sh
	checkfail
else
	./commands/protobuf.sh
fi

projects='cyph.app cyph.com'

log 'Starting Angular AOT build'
for d in ${projects} ; do
	cd "${d}"
	../commands/ngprojectinit.sh
	cd ..
done
./commands/ngassets.sh
for d in ${projects} ; do
	cd "${d}"
	ng build \
		--aot true \
		--common-chunk false \
		--source-map false \
		--vendor-chunk false
	checkfail
	cd ..
done

pass
