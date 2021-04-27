#!/bin/bash


cd $(cd "$(dirname "$0")" ; pwd)/..
dir="$PWD"


lib="${1}"

name="$(echo "${lib}" | grep -oP '^.+?(@|$)' | perl -pe 's/@$//')"
packageDirectory="$(echo "${name}" | sed 's|/.*||')"
version="$({ echo "${lib}" | grep -oP '.@.*' || echo '*'; } | perl -pe 's/^.@//')"

echo "${lib}" >> packages.list
cat packages.list | sort | uniq > packages.list.new
mv packages.list.new packages.list
chmod 700 packages.list

if git diff --exit-code packages.list > /dev/null ; then
	echo "Library ${lib} already exists"
	exit 1
fi

git commit --no-verify -S -m "addlib: ${lib}" packages.list

mkdir -p ~/js/node_modules
cd ~/js
bindmount /node_modules node_modules
cp ${dir}/shared/lib/js/*.json ./
npm install ${lib}
mv *.json ${dir}/shared/lib/js/
unbindmount node_modules
cd -
rm -rf ~/js

cyph-prettier --write shared/lib/js/*.json
chmod 700 shared/lib/js/*.json
git commit --no-verify -S -m updatelibs shared/lib/js/*.json

cp -f shared/lib/js/package-lock.json /node_modules/
cp -f shared/lib/js/package-lock.json shared/node_modules/
rm -rf shared/node_modules/${packageDirectory}
cp -a /node_modules/${packageDirectory} shared/node_modules/
