#!/bin/bash


cd $(cd "$(dirname "$0")" ; pwd)

rm -rf build 2> /dev/null
mkdir build

for f in $(ls -a | grep -vP '^(\.|\.\.|build)$') ; do
	cp -a "${f}" build/
done

cd build

echo -e '\n\nADD PLATFORMS\n\n'

cordova platform add android
# cordova platform add ios

echo -e '\n\nBUILD\n\n'

cordova build --release --device
