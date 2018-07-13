#!/bin/bash


cd $(cd "$(dirname "$0")" ; pwd)

rm -rf ../cyph-phonegap-build 2> /dev/null
mkdir ../cyph-phonegap-build

for f in $(ls -a | grep -vP '^(\.|\.\.)$') ; do
	cp -a "${f}" ../cyph-phonegap-build/
done

cd ../cyph-phonegap-build

echo -e '\n\nADD PLATFORMS\n\n'

cordova platform add android
# cordova platform add ios

echo -e '\n\nBUILD\n\n'

cordova build --release --device
