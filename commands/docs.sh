#!/bin/bash


cd $(cd "$(dirname "$0")" ; pwd)/..
dir="$PWD"


./commands/copyworkspace.sh ~/docs
cd ~/docs/cyph.ws

cp ../README.md ../LICENSE ./
rm -rf src/js/cyph.com src/js/native src/js/tslint-rules "${dir}/shared/js/docs"
compodoc -n 'Cyph Docs' -p src/tsconfig.app.json --disablePrivateOrInternalSupport
mv documentation "${dir}/shared/js/docs"
