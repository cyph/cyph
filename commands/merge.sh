#!/bin/bash

source="$1"
target="$2"
sourceCamel="$(echo $source | perl -pe 's/\/(.)/\u$1/g')"
targetCamel="$(echo $source | perl -pe 's/\/(.)/\u$1/g')"

if [ ! "$source" -o ! "$target" ] ; then
	echo 'fak u gooby'
	exit 1
fi

git fetch --all
git checkout -b $sourceCamel --track $source
git pull
git checkout -b $targetCamel --track $target
git pull
git merge $source
git commit -S -a -m merge
git push
