#!/bin/bash


cd $(cd "$(dirname "$0")" ; pwd)/..
dir="$PWD"


checkfail "$(./commands/buildunbundledassets.sh 2>&1)"

if [ "${1}" != '--angular-only' ] ; then
	cd backend
	go build
	checkfail
	cd ..

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
		--build-optimizer false \
		--common-chunk false \
		--optimization false \
		--source-map false \
		--vendor-chunk false
	checkfail
	cd ..
done

pass
