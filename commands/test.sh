#!/bin/bash


cd $(cd "$(dirname "$0")" ; pwd)/..


e2e=''
unit=''
if [ "${1}" == '--e2e' ] ; then
	e2e=true
	shift
elif [ "${1}" == '--unit' ] ; then
	unit=true
	shift
else
	e2e=true
	unit=true
fi

./commands/buildunbundledassets.sh --test
checkfail

export CHROME_BIN="$(node -e 'console.log(require("puppeteer").executablePath())')"

cd cyph.ws
../commands/ngprojectinit.sh

if [ "${unit}" ] ; then
	ng test --browsers ChromeHeadless --single-run
	checkfail
	echo -e '\n\n\n'
fi

if [ "${e2e}" ] ; then
	../commands/serve.sh --e2e "${@}" cyph.ws
	checkfail
fi

pass
