#!/bin/bash


cd $(cd "$(dirname "$0")" ; pwd)/..


rm -rf shared/js/docs shared/.js.tmp 2> /dev/null
cp -rf shared/js shared/.js.tmp
cp README.md shared/.js.tmp/
cd shared/.js.tmp

compodoc . -n 'Cyph Docs' -d ../js/docs -p .

cd ..
rm -rf .js.tmp
