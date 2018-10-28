#!/bin/bash


cd $(cd "$(dirname "$0")" ; pwd)/..


blockFailingBuild=''
gc=''
noCleanup=''
if [ "${1}" == '--block-failing-build' ] ; then
	blockFailingBuild=true
	shift
fi
if [ "${1}" == '--gc' ] ; then
	gc=true
	shift
fi
if [ "${1}" == '--no-cleanup' ] ; then
	noCleanup=true
	shift
fi

comment="${*}"
if [ ! "${comment}" ] ; then
	comment='commit.sh'
fi

rm .git/index.lock 2> /dev/null

./commands/keycache.sh

git fetch --all
git pull
chmod -R 700 .
git add .
git commit -S -a -m "${comment}"

if [ "${noCleanup}" ] ; then
	git push
	exit
fi

# Automated cleanup and beautification

find . -type f -name '*.go' | grep -v github.com | xargs -I% gofmt -w "%"

find shared/css shared/js \
	-type f \
	-name '*.scss' \
	-exec bash -c '
		cat {} | perl -pe "s/([^\d]0)px/\1/g" > {}.new
		mv {}.new {}
	' \
\;

find shared/css shared/js \
	-type f \
	-name '*.scss' \
	-not -name theme.scss \
	-not -name mixins.scss \
	-not -path 'shared/css/themes/*' \
| xargs -I% bash -c '
sed -i "s|>>>|::ng-deep|g" %
sed -i "s|/deep/|::ng-deep|g" %
sass-convert --from scss --to scss --dasherize --indent t % | awk "{
if (\$1 != \"/*\")
	gsub(/\"/, \"'"'"'\", \$0)
print \$0
}" > %.new
mv %.new %
'

find commands serverconfig types.proto shared/css shared/js -type f -exec sed -i 's/\s*$//g' {} \;

chmod -R 700 .
git commit -S -a -m "cleanup: ${comment}"

if [ "${blockFailingBuild}" ] ; then
	./commands/build.sh || fail
fi
if [ "${gc}" ] ; then
	git gc --aggressive --prune
fi

git push
