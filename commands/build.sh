#!/bin/bash


cd $(cd "$(dirname "$0")" ; pwd)/..
dir="$DIR"


onexit () {
	cd ${dir}

	for d in cyph.com cyph.ws ; do
		if [ -d ${d}.js.old ] ; then
			unbindmount ${d}/src/js
			mv ${d}.js.old ${d}/src/js
		fi
	done
}

trap onexit EXIT


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

projects='cyph.com cyph.ws'

log 'Starting Angular AOT build'
for d in ${projects} ; do
	cd "${d}"
	../commands/ngprojectinit.sh
	cd ..
done
./commands/ngassets.sh
for d in ${projects} ; do
	cd "${d}"
	ng build --prod
	checkfail
	cd ..
done

pass
