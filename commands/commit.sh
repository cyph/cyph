#!/bin/bash

source ~/.bashrc

dir="$(pwd)"
cd $(cd "$(dirname "$0")"; pwd)/..

rm .git/index.lock 2> /dev/null

git pull
git add .
git commit -a -m "${*}"
git push

find . -name '*.go' | grep -v github.com | xargs -I% gofmt -w "%"
git commit -a -m "gofmt: ${*}"
git push

cd "${dir}"
