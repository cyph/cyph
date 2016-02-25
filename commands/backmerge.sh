#!/bin/bash

source ~/.bashrc

dir="$(pwd)"
cd $(cd "$(dirname "$0")"; pwd)/..

merge () {
	source="$1"
	targetA="$2$(if [ $3 ] ; then echo / ; fi)$3"
	targetB="$(if [ $3 ] ; then echo $2 $3 ; fi)"

	git checkout $targetA
	git pull $targetB
	git merge $source
	git commit -a -m merge
	git push $targetB
}

branch="$(git branch | awk '/^\*/{print $2}')"

git remote add internal git@github.com:cyph/internal.git
git fetch --all
git checkout internal/prod
git pull internal prod
merge internal/prod internal master
merge internal/master master

if [ "$branch" -ne master -a "$branch" -ne prod ] ; then
	merge master $branch
else
	git checkout $branch
fi

cd "${dir}"
