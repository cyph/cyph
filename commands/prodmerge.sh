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
git remote add public git@github.com:cyph/cyph.git
git fetch --all
merge internal/master internal prod
git push public master
merge internal/prod internal master

git checkout $branch

cd "${dir}"
