#!/bin/bash

source ~/.bashrc

dir="$(pwd)"
cd $(cd "$(dirname "$0")"; pwd)/..

git pull
chmod -R 700 .
git add .
git commit -a -m "${*}"
git push

find . -name '*.go' -print0 | xargs -0 -I% gofmt -w "%"
chmod -R 700 .
git commit -a -m "gofmt: ${*}"
git push

cd "${dir}"
