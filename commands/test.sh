#!/bin/bash


cd $(cd "$(dirname "$0")" ; pwd)/..


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
	../commands/serve.sh --e2e cyph.ws
	checkfail
fi

pass
