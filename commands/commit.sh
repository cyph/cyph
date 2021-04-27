#!/bin/bash


eval "$(parseArgs \
	--opt-bool block-failing-build \
	--opt-bool cleanup \
	--opt-bool gc \
	--pos comment \
)"


cd $(cd "$(dirname "$0")" ; pwd)/..


blockFailingBuild="$(getBoolArg ${_arg_block_failing_build})"
gc="$(getBoolArg ${_arg_gc})"

noCleanup=''
if [ "${_arg_cleanup}" == 'off' ] ; then
	noCleanup=true
fi

comment="${_arg_comment}"
if [ ! "${comment}" ] ; then
	comment='commit.sh'
fi

rm -rf .git/index.lock .git/hooks.tmp 2> /dev/null
mv .git/hooks .git/hooks.tmp

./commands/keycache.sh

git fetch --all
git pull
chmod -R 700 .
git add .
git commit --no-verify -S -a -m "${comment}"

if [ "${noCleanup}" ] ; then
	git push
	exit
fi

# Automated cleanup and beautification

cat packages.list | sort | uniq > packages.list.new
mv packages.list.new packages.list

find . -type f -name '*.go' | grep -v github.com | xargs -I% gofmt -w "%"

find shared/css shared/js \
	-type f \
	-name '*.scss' \
	-exec bash -c '
		cat {} | perl -pe "s/([^\d]0)px/\1/g" | sed 's|word-wrap:|overflow-wrap:|g' > {}.new
		mv {}.new {}
	' \
\;

for f in $(rg -l '/\*\*[^@\.]+\*/' shared/js | grep -P '\.ts$') ; do
	cat "${f}" | perl -pe 's/\/\*\*\s*([^@\.]*[^@\.\s])\s*\*\//\/** \1. *\//g' > "${f}.new"
	mv "${f}.new" "${f}"
done

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
git commit --no-verify -S -a -m "cleanup: ${comment}"

if [ "${blockFailingBuild}" ] ; then
	./commands/build.sh || fail
fi
if [ "${gc}" ] ; then
	git gc --aggressive --prune
fi

git push
mv .git/hooks.tmp .git/hooks
