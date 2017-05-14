#!/bin/bash


cd $(cd "$(dirname "$0")" ; pwd)/..


rm .git/index.lock 2> /dev/null
branch="$(git branch | awk '/^\*/{print $2}')"

./commands/keycache.sh

git remote add internal git@github.com:cyph/internal.git 2> /dev/null
git fetch --all

./commands/merge.sh internal/prod internal/beta
./commands/merge.sh internal/beta internal/master
./commands/merge.sh internal/master origin/master

if [ "$branch" != "master" -a "$branch" != "beta" -a "$branch" != "prod" ] ; then
	./commands/merge.sh origin/master origin/$branch
fi

git checkout $branch
