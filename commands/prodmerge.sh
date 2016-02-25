#!/bin/bash

source ~/.bashrc

dir="$(pwd)"
cd $(cd "$(dirname "$0")"; pwd)/..

merge () {
	git checkout $2$(if [ $3 ] ; then echo / ; fi)$3
	git pull
	git merge $1
	git commit -a -m merge
	git push $(if [ $3 ] ; then echo $2 $3 ; fi)
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
