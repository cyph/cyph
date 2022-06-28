#!/bin/bash


cd $(cd "$(dirname "$0")" ; pwd)/..
dir="$PWD"


./commands/keycache.sh

sudo npm -g install npm || fail
sudo npm -g install @mapbox/node-pre-gyp || fail
npm config set fetch-retries 5
npm config set fetch-retry-maxtimeout 36000000
npm config set fetch-timeout 216000000
npm config set legacy-peer-deps true
rm -rf ~/.npm


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
	https://github.com/ipfs/public-gateway-checker/raw/master/src/gateways.json \
	-O shared/lib/ipfs-gateways.json

./commands/getlibs.sh --skip-node-modules

cyph-prettier --write shared/lib/ipfs-gateways.json || fail
cyph-prettier --write shared/lib/js/package.json || fail
cyph-prettier --write shared/lib/js/package-lock.json || fail

firebaseFunctionsTmp=$(mktemp -d)
mkdir -p ${firebaseFunctionsTmp}/functions/node_modules
cd ${firebaseFunctionsTmp}/functions
cp ${dir}/firebase/functions/package.json ./
npm install
mv package-lock.json ${dir}/firebase/functions/
cd ${dir}
rm -rf ${firebaseFunctionsTmp}
cyph-prettier --write firebase/functions/package-lock.json || fail

rm */go.mod */go.sum 2> /dev/null
find . -maxdepth 2 -type f -name .go.mod -exec bash -c '
	cd $(echo "{}" | sed "s|/.go.mod||")
	cp .go.mod go.mod
	go mod tidy
	go get -u ./...
' \;

./commands/commit.sh --gc --skip-push "${@}" updatelibs
