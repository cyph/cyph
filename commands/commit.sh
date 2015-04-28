#!/bin/bash

source ~/.bashrc

dir="$(pwd)"
cd $(cd "$(dirname "$0")"; pwd)/..

git pull
git add .
git commit -a -m "${*}"
git push

find . -name '*.go' -print0 | xargs -0 -I% gofmt -w "%"
git commit -a -m "gofmt: ${*}"
git push

cd "${dir}"
