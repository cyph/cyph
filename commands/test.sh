#!/bin/bash


cd $(cd "$(dirname "$0")" ; pwd)/..


firebaseBackup=''
if [ "${1}" == '--firebase-backup' ] ; then
	firebaseBackup=true
	shift
fi

./commands/buildunbundledassets.sh --test
checkfail

export CHROME_BIN="$(node -e 'console.log(require("puppeteer").executablePath())')"

cd cyph.ws
../commands/ngprojectinit.sh

if [ "${1}" != '--e2e' ] ; then
	ng test --browsers ChromeHeadless
	checkfail
fi

if [ "${1}" != '--unit' ] ; then
	if [ "${firebaseBackup}" ] ; then
		../commands/serve.sh --firebase-backup --e2e cyph.ws
	else
		../commands/serve.sh --e2e cyph.ws
	fi
	checkfail
fi

pass
