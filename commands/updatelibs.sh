#!/bin/bash


cd $(cd "$(dirname "$0")" ; pwd)/..
dir="$PWD"


./commands/keycache.sh

sudo npm -g install npm || fail
sudo npm -g install @mapbox/node-pre-gyp || fail
npm config set fetch-retries 10
npm config set fetch-retry-maxtimeout 36000000
npm config set fetch-retry-mintimeout 36000000
npm config set fetch-timeout 216000000
npm config set legacy-peer-deps true
npm config set maxsockets 1
rm -rf ~/.npm


mkdir -p ~/lib/js ~/tmplib/js/node_modules
cd ~/tmplib/js

modules="$(cat ${dir}/packages.list | grep -vP '^#')"
# NATIVESCRIPT: modules="${modules}$(echo ; cat ${dir}/native/plugins.list)"

for i in {1..10} ; do
	npm install -f --ignore-scripts $(echo "${modules}" | tr '\n' ' ') && break
done || fail

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
	-O modules/base-ipfs-gateways.json

./commands/getlibs.sh --skip-node-modules

cyph-prettier --write modules/base-ipfs-gateways.json || fail
cyph-prettier --write shared/lib/js/package.json || fail
cyph-prettier --write shared/lib/js/package-lock.json || fail

firebaseFunctionsTmp=$(mktemp -d)
mkdir -p ${firebaseFunctionsTmp}/functions/node_modules
cd ${firebaseFunctionsTmp}/functions
cp ${dir}/firebase/functions/package.json ./
for i in {1..10} ; do npm install && break ; done || exit 1
mv package-lock.json ${dir}/firebase/functions/
cd ${dir}
rm -rf ${firebaseFunctionsTmp}
cyph-prettier --write firebase/functions/package-lock.json || fail

# Pending GAE Go 1.17+ support, update these by hand for now
# rm */go.mod */go.sum 2> /dev/null
# find . -maxdepth 2 -type f -name .go.mod -exec bash -c '
# 	cd $(echo "{}" | sed "s|/.go.mod||")
# 	cp .go.mod go.mod
# 	go mod tidy
# 	go get -u ./...
# ' \;

./commands/commit.sh --gc --skip-push "${@}" updatelibs
