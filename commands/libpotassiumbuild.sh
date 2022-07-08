#!/bin/bash


cd $(cd "$(dirname "$0")" ; pwd)/..
dir="$PWD"


./commands/copyworkspace.sh ~/.build
cd ~/.build

./commands/buildunbundledassets.sh --libpotassium || fail

rm -rf ${dir}/libpotassium/dist 2> /dev/null
mkdir ${dir}/libpotassium/dist
cp shared/assets/js/cyph/crypto/potassium/index.js ${dir}/libpotassium/dist/
cp -f LICENSE ${dir}/libpotassium/
