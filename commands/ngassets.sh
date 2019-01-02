#!/bin/bash


cd $(cd "$(dirname "$0")" ; pwd)/..

cp -f shared/favicon.ico cyph.com/src/ 2> /dev/null
cp -f shared/favicon.ico cyph.app/src/ 2> /dev/null
cp -f shared/assets/serviceworker.js websign/manifest.json cyph.app/src/ 2> /dev/null

if [ ! -f cyph.app/src/serviceworker.js ] ; then
	cp -f websign/serviceworker.js cyph.app/src/ 2> /dev/null
fi
