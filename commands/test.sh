#!/bin/bash


cd $(cd "$(dirname "$0")" ; pwd)/..


build=''
e2e=''
unit=''
if [ "${1}" == '--build' ] ; then
	build=true
	shift
fi
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

if [ "${build}" ] ; then
	./commands/build.sh
else
	./commands/buildunbundledassets.sh --test
fi
checkfail


# Limit full CircleCI test runs to beta and prod
if [ "${CIRCLECI}" ] && [ "${CIRCLE_BRANCH}" != 'prod' ] && [ "${CIRCLE_BRANCH}" != 'beta' ] ; then
	pass
fi


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
