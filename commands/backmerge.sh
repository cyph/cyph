#!/bin/bash

source ~/.bashrc

dir="$(pwd)"
cd $(cd "$(dirname "$0")"; pwd)/..

merge () {
	git pull
	git merge $1
	git commit -a -m merge
	git push
}

branch="$(git branch | awk '/^\*/{print $2}')"

git remote add internal git@github.com:cyph/internal.git
git fetch --all
git checkout internal/prod
git pull
git checkout internal/master
merge internal/prod
git checkout origin/master
merge internal/master
git checkout $branch
merge master

cd "${dir}"
