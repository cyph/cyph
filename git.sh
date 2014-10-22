#!/bin/bash

dir="$(pwd)"
scriptdir="$(cd "$(dirname "$0")"; pwd)" # $(dirname `readlink -f "${0}" || realpath "${0}"`)
cd "${scriptdir}"

git pull
chmod -R 777 .
git add .
git commit -a -m "${*}"
git push

find . -name '*.go' -print0 | xargs -0 -I% gofmt -w "%"
chmod -R 777 .
git commit -a -m "gofmt: ${*}"
git push

./sassupdate.sh
chmod -R 777 .
git commit -a -m "sass compile: ${*}"
git push

for d in $(find . -type d -name bower_components | perl -pe 's/(.*)bower_components/\1/g') ; do
	cd "${d}"
	bower update
	cd "${scriptdir}"
done
chmod -R 777 .
git commit -a -m "bower update: ${*}"
git push

cd "${dir}"
