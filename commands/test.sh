#!/bin/bash


cd $(cd "$(dirname "$0")" ; pwd)/..


./commands/buildunbundledassets.sh --test
checkfail

export CHROME_BIN="$(node -e 'console.log(require("puppeteer").executablePath())')"

cd cyph.ws
../commands/ngprojectinit.sh
ng test --browsers ChromeHeadless
checkfail

pass
