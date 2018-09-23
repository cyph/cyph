#!/bin/bash


set -e
cd $(cd "$(dirname "$0")" ; pwd)

password='balls'
if [ "${1}" != 'ios' ] && [ "${1}" != 'emulator' ] ; then
	echo -n 'Password (leave blank for Android-only debug mode): '
	read -s password
	echo
fi

rm -rf ../cyph-phonegap-build 2> /dev/null || true
mkdir -p ../cyph-phonegap-build/build

for f in $(ls -a | grep -v '^\.$' | grep -v '^\.\.$') ; do
	cp -a "${f}" ../cyph-phonegap-build/
done

cd ../cyph-phonegap-build

echo -e '\n\nADD PLATFORMS\n\n'

npm -g install cordova

if [ "${1}" != 'ios' ] ; then
	sed -i 's|<plugin name="cordova-plugin-ionic-keyboard" spec="\*" />|<plugin name="cordova-plugin-ionic-keyboard" spec="^1" />|' config.xml
	sed -i 's|<plugin name="cordova-plugin-ionic-webview" spec="\*" />|<plugin name="cordova-plugin-ionic-webview" spec="^1" />|' config.xml

	cordova platform add android
fi

if [ "${1}" != 'android' ] ; then
	if ! which gem > /dev/null ; then
		brew install ruby
	fi

	if ! which pod > /dev/null ; then
		gem install cocoapods
	fi

	npm -g install xcode
	cordova platform add ios
	pod install --project-directory=platforms/ios
fi

echo -e '\n\nBUILD\n\n'

if [ "${1}" == 'emulator' ] ; then
	cordova build --debug --emulator || exit 1
elif [ "${password}" != "" ] ; then
	if [ "${1}" != 'ios' ] ; then
		cordova build android --release --device -- \
			--keystore="${HOME}/.cyph/nativereleasesigning/android/cyph.jks" \
			--alias=cyph \
			--storePassword="${password}" \
			--password="${password}"

		cp platforms/android/app/build/outputs/apk/release/app-release.apk build/cyph.apk || exit 1
	fi

	if [ "${1}" != 'android' ] ; then
		cordova build ios --debug --device \
			--codeSignIdentity='iPhone Developer' \
			--developmentTeam='SXZZ8WLPV2' \
			--packageType='development' \
			--provisioningProfile='5d62676b-6683-44f6-be18-5ee7f1b02fff'

		if [ ! -f platforms/ios/build/device/Cyph.ipa ] ; then exit 1 ; fi

		mv platforms/ios/build/device ios-debug

		cordova build ios --release --device \
			--codeSignIdentity='iPhone Distribution' \
			--developmentTeam='SXZZ8WLPV2' \
			--packageType='app-store' \
			--provisioningProfile='5ed3df4c-a57b-4108-9abf-a8930e12a4f9'

		if [ ! -f platforms/ios/build/device/Cyph.ipa ] ; then exit 1 ; fi

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
