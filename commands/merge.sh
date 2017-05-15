#!/bin/bash


source="$1"
target="$2"
targetCamel="$(echo $target | perl -pe 's/\/(.)/\u$1/g')"

if [ ! "$source" -o ! "$target" ] ; then
	echo 'fak u gooby'
	exit 1
fi

git config push.default upstream
git checkout $targetCamel 2> /dev/null || git checkout -b $targetCamel --track $target
git pull
git merge $source
git commit -S -a -m merge
git push
