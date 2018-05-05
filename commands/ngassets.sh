#!/bin/bash


cd $(cd "$(dirname "$0")" ; pwd)/..

cp -f shared/favicon.ico cyph.com/src/ 2> /dev/null
cp -f shared/favicon.ico cyph.ws/src/ 2> /dev/null
cp -f shared/assets/serviceworker.js websign/manifest.json cyph.ws/src/ 2> /dev/null

if [ -f cyph.ws/src/serviceworker.js ] ; then
	cp -f websign/serviceworker.js cyph.ws/src/ 2> /dev/null
fi
