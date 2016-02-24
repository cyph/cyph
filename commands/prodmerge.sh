#!/bin/bash

source ~/.bashrc

dir="$(pwd)"
cd $(cd "$(dirname "$0")"; pwd)/..

branch="$(git describe --tags --exact-match 2> /dev/null || git branch | awk '/^\*/{print $2}')"

git checkout prod
git pull
git merge origin/master
git commit -a -m merge
git push
git checkout master
git pull
git merge origin/prod
git commit -a -m merge
git push
git checkout prod
git pull
git remote add public git@github.com:cyph/cyph.git
git push public master

git checkout $branch

cd "${dir}"
