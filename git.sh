#!/bin/bash

dir="$(pwd)"
scriptdir="$(cd "$(dirname "$0")"; pwd)" # $(dirname `readlink -f "${0}" || realpath "${0}"`)
cd "${scriptdir}"

git pull
chmod -R 777 .
git add .
git commit -a -m "${*}"
git push

cd cyph.im/lib
wget https://api.cyph.com/_ah/channel/jsapi -O goog.appengine.Channel.js.new
mv goog.appengine.Channel.js.new goog.appengine.Channel.js
cd ../..
find . -name '*.go' -print0 | xargs -0 -I% gofmt -w "%"
./sassupdate.sh
for d in $(find . -type d -name bower_components | perl -pe 's/(.*)bower_components/\1/g') ; do
	cd "${d}"
	bower update
	cd "${scriptdir}"
done
chmod -R 777 .
git commit -a -m "gofmt, sass compile, lib updates: ${*}"
git push

cd "${dir}"
