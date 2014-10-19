#!/bin/bash

dir="$(pwd)"
cd $(cd "$(dirname "$0")"; pwd) # $(dirname `readlink -f "${0}" || realpath "${0}"`)

git pull
chmod -R 777 .
git add .
git commit -a -m "${*}"
git push

find . -name '*.go' -print0 | xargs -0 -I% gofmt -w "%"
chmod -R 777 .
git commit -a -m "gofmt: ${*}"
git push

./sassupdate.sh
chmod -R 777 .
git commit -a -m "sass compile: ${*}"
git push

cd "${dir}"
