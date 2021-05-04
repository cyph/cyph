#!/bin/bash


cd $(cd "$(dirname "$0")" ; pwd)/..
dir="$PWD"


./commands/keycache.sh

sudo npm -g install npm || fail
sudo npm -g install @mapbox/node-pre-gyp || fail
npm config set legacy-peer-deps true


mkdir -p ~/lib/js ~/tmplib/js/node_modules
cd ~/tmplib/js

modules="$(cat ${dir}/packages.list | grep -vP '^#')"
# NATIVESCRIPT: modules="${modules}$(echo ; cat ${dir}/native/plugins.list)"

npm install -f --ignore-scripts $(echo "${modules}" | tr '\n' ' ') || fail

rm -rf ../node_modules ../package.json ../package-lock.json 2> /dev/null

cp package-lock.json package.json ~/lib/js/

cat node_modules/tslint/package.json | grep -v tslint-test-config-non-relative > package.json.new
mv package.json.new node_modules/tslint/package.json


cd "${dir}"
rm -rf shared/lib
mv ~/lib shared/
rm -rf ~/tmplib

wget \
	https://github.com/ipfs/public-gateway-checker/raw/master/gateways.json \
	-O shared/lib/ipfs-gateways.json

./commands/getlibs.sh

cyph-prettier --write shared/lib/ipfs-gateways.json || fail
cyph-prettier --write shared/lib/js/package.json || fail
cyph-prettier --write shared/lib/js/package-lock.json || fail

rm */go.mod */go.sum 2> /dev/null
find . -maxdepth 2 -type f -name .go.mod -exec bash -c '
	cd $(echo "{}" | sed "s|/.go.mod||")
	cp .go.mod go.mod
	go mod tidy
' \;

./commands/commit.sh --gc "${@}" updatelibs
