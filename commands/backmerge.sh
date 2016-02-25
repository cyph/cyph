#!/bin/bash

source ~/.bashrc

dir="$(pwd)"
cd $(cd "$(dirname "$0")"; pwd)/..

merge () {
	source="$1"
	target="$2"
	sourceSplit="$(echo $source | tr / ' ')"
	targetSplit="$(echo $target | tr / ' ')"
	pushUArg="$(if [ $(echo $targetSplit | wc -w) == 2 ] ; then echo "-u" ; fi)"

	git checkout $source
	git pull $sourceSplit
	git checkout $target
	git pull $targetSplit
	git merge $source
	git commit -a -m merge
	git push $pushUArg $targetSplit
}

branch="$(git branch | awk '/^\*/{print $2}')"

git remote add internal git@github.com:cyph/internal.git
git fetch --all
git checkout internal/prod
git pull internal prod
merge internal/prod internal/master
merge internal/master master

if [ "$branch" -ne master -a "$branch" -ne prod ] ; then
	merge master $branch
else
	git checkout $branch
fi

cd "${dir}"
