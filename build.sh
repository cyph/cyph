#!/bin/bash


cd $(cd "$(dirname "$0")" ; pwd)

echo -n 'Password (leave blank for debug mode): '
read -s password
echo

rm -rf ../cyph-phonegap-build 2> /dev/null
mkdir ../cyph-phonegap-build

for f in $(ls -a | grep -vP '^(\.|\.\.)$') ; do
	cp -a "${f}" ../cyph-phonegap-build/
done

cd ../cyph-phonegap-build

echo -e '\n\nADD PLATFORMS\n\n'

cordova platform add android
cordova platform add ios

echo -e '\n\nBUILD\n\n'

if [ "${password}" != "" ] ; then
	cordova build android --release --device -- \
		--keystore="${HOME}/.cyph/nativereleasesigning/android/cyph.jks" \
		--alias=cyph \
		--storePassword="${password}" \
		--password="${password}" \
	|| \
		exit 1

	cordova build ios --release --device \
		--codeSignIdentity='iPhone Distribution' \
		--developmentTeam='SXZZ8WLPV2' \
		--packageType='app-store' \
		--provisioningProfile='5ed3df4c-a57b-4108-9abf-a8930e12a4f9'
else
	cordova build --debug --device
fi
