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
if [ "${android}" ] || [ "${electron}" ] ; then
	echo -n 'Password (leave blank for Android-only debug mode): '
	read -s password
	export CSC_KEY_PASSWORD="${password}"
	echo
fi

export CSC_KEYCHAIN="${HOME}/.cyph/nativereleasesigning/apple/cyph.keychain"

rm -rf ../cyph-phonegap-build 2> /dev/null || true
mkdir -p ../cyph-phonegap-build/build

for f in $(ls -a | grep -v '^\.$' | grep -v '^\.\.$') ; do
	cp -a "${f}" ../cyph-phonegap-build/
done

cd ../cyph-phonegap-build

echo -e '\n\nADD PLATFORMS\n\n'

sed -i "s|~|${HOME}|g" build.json

npm install


if [ "${android}" ] ; then
	npx cordova platform add android
fi

if [ "${electron}" ] ; then
	npx cordova platform add electron
fi

if [ "${iOS}" ] ; then
	if ! which gem > /dev/null ; then
		brew install ruby
	fi

	if ! which pod > /dev/null ; then
		gem install cocoapods
	fi

	npm install xcode
	npx cordova platform add ios
	pod install --project-directory=platforms/ios
fi


echo -e '\n\nBUILD\n\n'

if [ "${iOSEmulator}" ] ; then
	npx cordova build --debug --emulator || exit 1
	exit
fi

if [ "${password}" == "" ] ; then
	npx cordova build --debug --device || exit 1
	cp platforms/android/app/build/outputs/apk/debug/app-debug.apk build/cyph.debug.apk
	exit
fi


if [ "${android}" ] ; then
	npx cordova build android --release --device -- \
		--keystore="${HOME}/.cyph/nativereleasesigning/android/cyph.jks" \
		--alias=cyph \
		--storePassword="${password}" \
		--password="${password}"

	cp platforms/android/app/build/outputs/apk/release/app-release.apk build/cyph.apk || exit 1
fi

if [ "${electron}" ] ; then
	cp -f electron.js platforms/electron/platform_www/cdv-electron-main.js

	# npx cordova build electron --release

	# Workaround for Cordova and/or Electron and/or Parallels bug
	cp build.json build.json.bak
	node -e "
		const buildConfig = JSON.parse(fs.readFileSync('build.json').toString());
		const {windows} = buildConfig.electron;

		const build = () => {
			fs.writeFileSync('build.json', JSON.stringify(buildConfig));

			child_process.spawnSync(
				'npx',
				['cordova', 'build', 'electron', '--release'],
				{stdio: 'inherit'}
			);
		};

		// Workraound for Cordova oversight
		const originalOptionsSet = 'this.options = (0, _builderUtil().deepAssign)({}, this.packager.platformSpecificBuildOptions, this.packager.config.appx);';
		fs.writeFileSync(
			'node_modules/app-builder-lib/out/targets/AppxTarget.js',
			fs.readFileSync(
				'node_modules/app-builder-lib/out/targets/AppxTarget.js'
			).toString().replace(
				originalOptionsSet,
				originalOptionsSet + '\n' +
					'this.options.applicationId = \'' + windows.applicationId + '\';\n' +
					'this.options.identityName = this.options.applicationId;\n' +
					'this.options.publisher = \'' + windows.publisher + '\';\n'
			)
		);

		delete buildConfig.electron.windows;
		build();
		buildConfig.electron = {windows};
		build();
	"
	cp -f build.json.bak build.json

	cp -a platforms/electron/build/mas/*.pkg build/cyph.pkg || exit 1
	cp platforms/electron/build/*.appx build/cyph.appx || exit 1
	cp platforms/electron/build/*.AppImage build/cyph.AppImage || exit 1
	cp platforms/electron/build/*.dmg build/cyph.dmg || exit 1
	cp platforms/electron/build/*.snap build/cyph.snap || exit 1

	node -e "
		const buildConfig = JSON.parse(fs.readFileSync('build.json').toString());
		const {mac} = buildConfig.electron;
		mac.package = ['dmg'];
		buildConfig.electron = {mac};
		fs.writeFileSync('build.json', JSON.stringify(buildConfig));
	"
	npx cordova build electron --debug

	cp platforms/electron/build/*.dmg build/cyph.debug.dmg || exit 1
	mv build.json.bak build.json
fi

if [ "${iOS}" ] ; then
	# npx cordova build ios --buildFlag='-UseModernBuildSystem=0' --debug --device \
	# 	--codeSignIdentity='iPhone Developer' \
	# 	--developmentTeam='SXZZ8WLPV2' \
	# 	--packageType='development' \
	# 	--provisioningProfile='861ab366-ee4a-4eb5-af69-5694ab52b6e8'

	# if [ ! -f platforms/ios/build/device/Cyph.ipa ] ; then exit 1 ; fi

	# mv platforms/ios/build/device ios-debug

	npx cordova build ios --buildFlag='-UseModernBuildSystem=0' --release --device \
		--codeSignIdentity='iPhone Distribution' \
		--developmentTeam='SXZZ8WLPV2' \
		--packageType='app-store' \
		--provisioningProfile='a973b22b-73bc-4dfa-b6ec-f60a493dc37f'

	if [ ! -f platforms/ios/build/device/Cyph.ipa ] ; then exit 1 ; fi

	mv platforms/ios/build/device ios-release

	mkdir platforms/ios/build/device
	# mv ios-debug platforms/ios/build/device/debug
	mv ios-release platforms/ios/build/device/release

	# cp platforms/ios/build/device/debug/Cyph.ipa build/cyph.debug.ipa
	cp platforms/ios/build/device/release/Cyph.ipa build/cyph.ipa
fi
