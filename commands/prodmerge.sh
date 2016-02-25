#!/bin/bash

source ~/.bashrc

dir="$(pwd)"
cd $(cd "$(dirname "$0")"; pwd)/..

merge () {
	source="$1"
	target="$2"
	sourceSplit="$(echo $source | tr / ' ')"
	targetSplit="$(echo $target | tr / ' ')"

	git checkout $source
	git pull $sourceSplit
	git checkout $target
	git pull $targetSplit
	git merge $source
	git commit -a -m merge
	git push $targetSplit
}

branch="$(git branch | awk '/^\*/{print $2}')"

git remote add internal git@github.com:cyph/internal.git
git remote add public git@github.com:cyph/cyph.git
git fetch --all
merge internal/master internal/prod
git push public master
merge internal/prod internal/master

git checkout $branch

cd "${dir}"
