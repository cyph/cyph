#!/bin/bash


cd $(cd "$(dirname "$0")" ; pwd)/..


cd backend
go build
checkfail
cd ..

output="$(./commands/buildunbundledassets.sh 2>&1)"
checkfail "${output}"

./commands/lint.sh
checkfail

log 'Starting Angular AOT build'
for d in cyph.com cyph.ws ; do
	cd "${d}"
	../commands/ngprojectinit.sh
	ng build --aot --sourcemaps=false --environment=prod
	checkfail
	cd ..
done

pass
