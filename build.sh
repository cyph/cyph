#!/bin/bash


set -e
cd $(cd "$(dirname "$0")" ; pwd)

android=''
electron=''
iOS=''
iOSEmulator=''
if [ ! "${1}" ] || [ "${1}" == 'android' ] ; then
	android=true
fi
if [ ! "${1}" ] || [ "${1}" == 'electron' ] ; then
	electron=true
fi
if [ ! "${1}" ] || [ "${1}" == 'ios' ] ; then
	iOS=true
fi
if [ "${1}" == 'emulator' ] ; then
	iOS=true
	iOSEmulator=true
fi

password='balls'
if [ "${android}" ] ; then
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

# Temporary workaround for Cordova bugs
npm -g install cordova-common
rm -rf ~/node_modules/*/node_modules/cordova-common


if [ "${android}" ] ; then
	sed -i 's|<plugin name="cordova-plugin-ionic-keyboard" spec="\*" />|<plugin name="cordova-plugin-ionic-keyboard" spec="^1" />|' config.xml
	sed -i 's|<plugin name="cordova-plugin-ionic-webview" spec="\*" />|<plugin name="cordova-plugin-ionic-webview" spec="^1" />|' config.xml

	cordova platform add android
fi

if [ "${electron}" ] ; then
	cordova platform add electron
fi

if [ "${iOS}" ] ; then
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

if [ "${iOSEmulator}" ] ; then
	cordova build --debug --emulator || exit 1
	exit
fi

if [ "${password}" == "" ] ; then
	cordova build --debug --device || exit 1
	cp platforms/android/app/build/outputs/apk/debug/app-debug.apk build/cyph.debug.apk
	exit
fi


if [ "${android}" ] ; then
	cordova build android --release --device -- \
		--keystore="${HOME}/.cyph/nativereleasesigning/android/cyph.jks" \
		--alias=cyph \
		--storePassword="${password}" \
		--password="${password}"

	cp platforms/android/app/build/outputs/apk/release/app-release.apk build/cyph.apk || exit 1
fi

if [ "${electron}" ] ; then
	cordova build electron --release
fi

if [ "${iOS}" ] ; then
	cordova build ios --buildFlag='-UseModernBuildSystem=0' --debug --device \
		--codeSignIdentity='iPhone Developer' \
		--developmentTeam='SXZZ8WLPV2' \
		--packageType='development' \
		--provisioningProfile='861ab366-ee4a-4eb5-af69-5694ab52b6e8'

	if [ ! -f platforms/ios/build/device/Cyph.ipa ] ; then exit 1 ; fi

	mv platforms/ios/build/device ios-debug

	cordova build ios --buildFlag='-UseModernBuildSystem=0' --release --device \
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
