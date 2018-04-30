#!/bin/bash


cd $(cd "$(dirname "$0")" ; pwd)/..


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

log 'Starting Angular AOT build'
for d in cyph.com cyph.ws ; do
	cd "${d}"
	../commands/ngprojectinit.sh
	ng build --prod
	checkfail
	cd ..
done

pass
