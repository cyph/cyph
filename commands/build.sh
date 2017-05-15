#!/bin/bash


cd $(cd "$(dirname "$0")" ; pwd)/..


checkfail () {
	if (( $? )) ; then
		echo -e "${1}\n\nFAIL\n\n"
		exit 1
	fi
}


cd backend
go build
checkfail
cd ..

output="$(./commands/buildunbundledassets.sh 2>&1)"
checkfail "${output}"

./commands/lint.sh
checkfail

for d in cyph.com cyph.ws ; do
	cd "${d}"
	../commands/ngprojectinit.sh
	ng build --aot --prod
	checkfail
	cd ..
done

echo -e '\n\nPASS\n\n'
