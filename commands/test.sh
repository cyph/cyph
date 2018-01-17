#!/bin/bash


cd $(cd "$(dirname "$0")" ; pwd)/..


e2e=''
unit=''
if [ "${1}" == '--e2e' ] ; then
	e2e=true
elif [ "${1}" == '--unit' ] ; then
	unit=true
fi

./commands/buildunbundledassets.sh --test
checkfail

export CHROME_BIN="$(node -e 'console.log(require("puppeteer").executablePath())')"

cd cyph.ws
../commands/ngprojectinit.sh

if [ ! "${e2e}" ] ; then
	ng test --browsers ChromeHeadless
	checkfail
fi

if [ ! "${unit}" ] ; then
	../commands/serve.sh "${@}" cyph.ws
	checkfail
fi

pass
