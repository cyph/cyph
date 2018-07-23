#!/bin/bash


cd $(cd "$(dirname "$0")" ; pwd)

echo -n 'Password (leave blank for Android-only debug mode): '
read -s password
echo

rm -rf ../cyph-phonegap-build 2> /dev/null
mkdir -p ../cyph-phonegap-build/build

for f in $(ls -a | grep -vP '^(\.|\.\.)$') ; do
	cp -a "${f}" ../cyph-phonegap-build/
done

cd ../cyph-phonegap-build

echo -e '\n\nADD PLATFORMS\n\n'

if [ "${1}" != 'ios' ] ; then
	cordova platform add android
fi

if [ "${1}" != 'android' ] ; then
	cordova platform add ios
fi

echo -e '\n\nBUILD\n\n'

if [ "${password}" != "" ] ; then
	if [ "${1}" != 'ios' ] ; then
		cordova build android --release --device -- \
			--keystore="${HOME}/.cyph/nativereleasesigning/android/cyph.jks" \
			--alias=cyph \
			--storePassword="${password}" \
			--password="${password}" \
		|| \
			exit 1

		cp platforms/android/app/build/outputs/apk/release/app-release.apk build/cyph.apk
	fi

	if [ "${1}" != 'android' ] ; then
		cordova build ios --debug --device \
			--codeSignIdentity='iPhone Developer' \
			--developmentTeam='SXZZ8WLPV2' \
			--packageType='app-store' \
			--provisioningProfile='5d62676b-6683-44f6-be18-5ee7f1b02fff' \
		|| \
			exit 1

		mv platforms/ios/build/device ios-debug

		cordova build ios --release --device \
			--codeSignIdentity='iPhone Distribution' \
			--developmentTeam='SXZZ8WLPV2' \
			--packageType='app-store' \
			--provisioningProfile='5ed3df4c-a57b-4108-9abf-a8930e12a4f9' \
		|| \
			exit 1

		mv platforms/ios/build/device ios-release

		mkdir platforms/ios/build/device
		mv ios-debug platforms/ios/build/device/debug
		mv ios-release platforms/ios/build/device/release

		cp platforms/ios/build/device/debug/Cyph.ipa build/cyph.debug.ipa
		cp platforms/ios/build/device/release/Cyph.ipa build/cyph.ipa
	fi
else
	cordova build --debug --device || exit 1
	cp platforms/android/app/build/outputs/apk/debug/app-debug.apk build/cyph.debug.apk
fi
