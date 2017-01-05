#!/bin/bash

cd $(cd "$(dirname "$0")"; pwd)/..
cd shared/lib/js

if [ "${1}" == '--skip-check' ] || yarn check > /dev/null 2>&1 ; then
	exit 0
fi

rm -rf node_modules 2> /dev/null

yarn install --ignore-platform || exit 1

rm -rf .jshintignore .jshintrc hooks references.d.ts tsconfig.json 2> /dev/null

cd node_modules

cp -a ../libsodium ./

mkdir -p @types/firebase
curl -s https://raw.githubusercontent.com/suhdev/firebase-3-typescript/master/firebase.d.ts | \
	grep -v es6-promise.d.ts > @types/firebase/index.d.ts

uglifyjs whatwg-fetch/fetch.js -m -o whatwg-fetch/fetch.js

cd firebase
cp -f ../../module_locks/firebase/* ./
mkdir node_modules
yarn install
browserify firebase-node.js -o firebase-node.tmp.js -s firebase
cat firebase-node.tmp.js |
	sed 's|https://apis.google.com||g' |
	sed 's|iframe||gi' |
	perl -pe "s/[A-Za-z0-9]+\([\"']\/js\/.*?.js.*?\)/null/g" \
> firebase-node.js
cp -f firebase-node.js firebase-browser.js
rm -rf node_modules firebase-node.tmp.js
cd ..

cd simplewebrtc
cp -f ../../module_locks/simplewebrtc/* ./
mkdir node_modules
yarn install
sed -i "s|require('./socketioconnection')|null|g" simplewebrtc.js
node build.js
rm -rf node_modules
cd ..

cd webrtc-adapter
cp -f ../../module_locks/webrtc-adapter/* ./
mkdir node_modules
yarn install
webpack src/js/adapter_core.js adapter.js
uglifyjs adapter.js -o adapter.js
rm -rf node_modules out src
cd ..
