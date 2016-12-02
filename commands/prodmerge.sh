#!/bin/bash

cd $(cd "$(dirname "$0")"; pwd)/..


merge () {
	source="$1"
	target="$2"
	sourceSplit="$(if ( echo $source | grep -q / ) ; then echo $source | tr / ' ' ; fi)"
	targetSplit="$(if ( echo $target | grep -q / ) ; then echo $target | tr / ' ' ; fi)"

	git checkout $source
	git pull $sourceSplit
	git checkout $target
	git pull $targetSplit
	git merge $source
	git commit -S -a -m merge
	git push $(echo -n $targetSplit | sed 's/ / HEAD:/')
}

rm .git/index.lock 2> /dev/null

./commands/keycache.sh

branch="$(git branch | awk '/^\*/{print $2}')"

git remote add internal git@github.com:cyph/internal.git 2> /dev/null
git remote add public git@github.com:cyph/cyph.git 2> /dev/null
git fetch --all
merge internal/master internal/prod
merge internal/prod public/master
merge internal/prod internal/master

git checkout $branch
