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

cyph-prettier --write '**/*.{css,html,js,json,scss,ts,tsx}'

find shared/assets/img -type f \( -name '*.jpg' -or -name '*.png' \) -exec bash -c '
	curl -sf "$(node -e "console.log(JSON.parse('"'"'$(
		curl -s --user api:$(cat ~/.cyph/tinypng.key) --data-binary "@{}" https://api.tinify.com/shrink
	)'"'"').output.url)")" -o "{}.tinypng"

	originalSize="$(stat --printf="%s" {})"
	newSize="$(stat --printf="%s" {}.tinypng)"
	if [ "$(expr "${originalSize}" - "${newSize}")" -gt 256 ] ; then
		mv {}.tinypng {}
	else
		rm {}.tinypng
	fi
' \;

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
