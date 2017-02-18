#!/bin/bash

cd $(cd "$(dirname "$0")" ; pwd)/..


blockFailingBuild=''
if [ "${1}" == '--block-failing-build' ] ; then
	blockFailingBuild=true
	shift
fi

comment="${*}"
if [ ! "${comment}" ] ; then
	comment='commit.sh'
fi

rm .git/index.lock 2> /dev/null

./commands/keycache.sh

git pull
chmod -R 700 .
git add .
git commit -S -a -m "${comment}"

# Automated cleanup and beautification

find . -type f -name '*.go' | grep -v github.com | xargs -I% gofmt -w "%"

find shared/css -type f -name '*.scss' | xargs -I% bash -c '
sass-convert --from scss --to scss --dasherize --indent t % | awk "{
if (\$1 != \"/*\")
	gsub(/\"/, \"'"'"'\", \$0)
print \$0
}" > %.new
mv %.new %
'

chmod -R 700 .
git commit -S -a -m "cleanup: ${comment}"

if [ "${blockFailingBuild}" ] ; then
	./commands/build.sh || exit 1
fi

git push
