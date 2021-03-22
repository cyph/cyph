#!/bin/bash


set -e
cd $(cd "$(dirname "$0")" ; pwd)

allPlatforms=''
android=''
debug=''
electron=''
iOS=''
iOSEmulator=''
if [ ! "${1}" ] ; then
	allPlatforms=true
elif [ "${1}" == 'android' ] ; then
	android=true
	shift
elif [ "${1}" == 'androidDebug' ] ; then
	android=true
	debug=true
	shift
elif [ "${1}" == 'electron' ] ; then
	electron=true
	shift
elif [ "${1}" == 'ios' ] ; then
	iOS=true
	shift
elif [ "${1}" == 'iOSEmulator' ] ; then
	iOS=true
	iOSEmulator=true
	shift
else
	echo 'Invalid platform.'
	exit 1
fi

password=''
passwordWindows=''
if [ "${1}" ] ; then
	password="${1}"
	shift
	passwordWindows="${1}"
	shift
elif [ ! "${debug}" ] && ( [ "${allPlatforms}" ] || [ "${android}" ] || [ "${electron}" ] ) ; then
	echo -n 'Password: '
	read -s password
	echo
	echo -n 'Password (Windows): '
	read -s passwordWindows
	echo
fi

if [ "${allPlatforms}" ] ; then
	rm -rf cordova-build* 2> /dev/null
	./build.sh android "${password}" "${passwordWindows}" || exit 1
	mv cordova-build cordova-build.android
	./build.sh electron "${password}" "${passwordWindows}" || exit 1
	mv cordova-build cordova-build.electron
	./build.sh ios "${password}" "${passwordWindows}" || exit 1
	mv cordova-build cordova-build.ios
	mkdir -p cordova-build/build
	cp -a cordova-build.*/build/* cordova-build/build/
	exit
fi


export CSC_KEY_PASSWORD="${passwordWindows}"
export CSC_KEYCHAIN="${HOME}/.cyph/nativereleasesigning/apple/cyph.keychain"

if [ -d cordova-build ] ; then
	rm -rf cordova-build
fi
mkdir -p cordova-build/build

for f in $(ls -a | grep -vP '^(\.|\.\.|cordova-build.*)$') ; do
	cp -a "${f}" cordova-build/
done

cd cordova-build

echo -e '\n\nADD PLATFORMS\n\n'

sed -i "s|~|${HOME}|g" build.json

npm install


initPlatform () {
	platform="${1}"

	cp package.json package.json.old

	npx cordova platform add ${platform}

	sed -i 's/.*<engine.*//g' config.xml

	node -e "console.log(
		Array.from(
			Array.from(
				new (require('xmldom').DOMParser)()
					.parseFromString(fs.readFileSync('config.xml').toString())
					.documentElement.getElementsByTagName('platform')
			).find(elem => elem.getAttribute('name') === '${platform}').childNodes
		)
			.filter(elem => elem.tagName === 'plugin')
			.map(
				elem => \`\${elem.getAttribute('name')}@\${elem.getAttribute('spec')}\`
			)
			.join('\n')
	)" | xargs npx cordova plugin add

	node -e "
		const oldPackageJSON = JSON.parse(fs.readFileSync('package.json.old').toString());
		const packageJSON = JSON.parse(fs.readFileSync('package.json').toString());

		const dependencies = {...packageJSON.dependencies, ...packageJSON.devDependencies};

		const getDependencies = filter => Object.entries(dependencies)
			.filter(filter)
			.reduce((o, [k, v]) => ({...o, [k]: v}), {});

		packageJSON.dependencies =
			getDependencies(([k]) => k in oldPackageJSON.dependencies)
		;
		packageJSON.devDependencies =
			getDependencies(([k]) => !(k in oldPackageJSON.dependencies))
		;

		fs.writeFileSync('package.json', JSON.stringify(packageJSON));
	"

	rm package.json.old
}


if [ "${android}" ] ; then
	initPlatform android
fi

if [ "${electron}" ] ; then
	initPlatform electron
fi

if [ "${iOS}" ] ; then
	if ! which gem > /dev/null ; then
		brew install ruby
	fi

	if ! which pod > /dev/null ; then
		gem install cocoapods
	fi

	npm install xcode
	initPlatform ios

	chmod +x plugins/cordova-plugin-iosrtc/extra/hooks/iosrtc-swift-support.js

	# https://github.com/cordova-rtc/cordova-plugin-iosrtc/blob/master/docs/Building.md#apple-store-submission
	if [ ! "${iOSEmulator}" ] ; then
		cd plugins/cordova-plugin-iosrtc/extra
		node ios_arch.js --extract
		node ios_arch.js --device
		node ios_arch.js --clean
		npx cordova platform remove ios
		npx cordova platform add ios
		cd -
	fi

	# https://github.com/phonegap/phonegap-plugin-push/issues/2872#issuecomment-588179073
	cat >> platforms/ios/Podfile << EndOfMessage
		post_install do |lib|
			lib.pods_project.targets.each do |target|
				target.build_configurations.each do |config|
					config.build_settings.delete 'IPHONEOS_DEPLOYMENT_TARGET'
				end
			end
		end
EndOfMessage

	pod install --project-directory=platforms/ios
fi


echo -e '\n\nBUILD\n\n'

if [ "${iOSEmulator}" ] ; then
	npx cordova build --debug --emulator || exit 1
	exit
fi

if [ "${debug}" ] ; then
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

	mkdir -p platforms/electron/build-res/appx 2> /dev/null
	cp -f res/icon/windows/* platforms/electron/build-res/appx/

	# npx cordova build electron --release

	# https://github.com/electron-userland/electron-builder/issues/4151#issuecomment-520663362
	find . -type f -name 'electronMac.js' -exec sed -i 's|\${helperBundleIdentifier}\.\${postfix}|${helperBundleIdentifier}.${postfix.replace(/[^a-z0-9]/gim,"")}|g' {} \;

	# Workaround for Cordova and/or Electron and/or Parallels bug
	cp build.json build.json.bak
	electronScript="
		const buildConfig = JSON.parse(fs.readFileSync('build.json').toString());
		const {linux, mac, windows} = buildConfig.electron;

		windows.signing.release.certificatePassword = '${passwordWindows}';

		const macDmgDebug = {
			...mac,
			package: ['dmg']
		};

		const windowsExe = {
			...windows,
			package: ['nsis']
		};

		const windowsExeDebug = {
			...windowsExe,
			signing: undefined
		};

		const windowsAppStore = {
			...windows,
			package: ['appx'],
			signing: undefined
		};

		const build = (config, docker = false) => {
			fs.writeFileSync('build.json', JSON.stringify({electron: config}));

			if (docker) {
				child_process.spawnSync(
					'docker',
					[
						'run',
						'-it',
						'--privileged=true',
						...['.cyph', '.ssh', ['.gnupg', '.gnupg.original']].map(dir => [
							'-v',
							\`\${
								path.join(
									os.homedir(),
									typeof dir === 'string' ? dir : dir[0]
								)
							}:/home/gibson/\${
								typeof dir === 'string' ? dir : dir[1]
							}\`
						]).flat(),
						'-v',
						\`\${process.cwd()}:/cyph\`,
						'cyph/dev',
						'bash',
						'-c',
						'cd /cyph ; npx cordova build electron --release'
					],
					{stdio: 'inherit'}
				);
				return;
			}

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
	"

	node -e "
		${electronScript}

		build({linux}, true);
		build({mac});
		build({windows: windowsExe});
		build({windows: windowsAppStore});
	"
	cp -f build.json.bak build.json

	cp -a platforms/electron/build/mas-universal/*.pkg build/cyph.pkg || exit 1
	cp platforms/electron/build/*.appx build/cyph.appx || exit 1
	cp platforms/electron/build/*.AppImage build/cyph.AppImage || exit 1
	cp platforms/electron/build/*.deb build/cyph.deb || exit 1
	cp platforms/electron/build/*.dmg build/cyph.dmg || exit 1
	cp platforms/electron/build/*.exe build/cyph.exe || exit 1
	cp platforms/electron/build/*.rpm build/cyph.rpm || exit 1
	cp platforms/electron/build/*.snap build/cyph.snap || exit 1

	node -e "
		$(echo "${electronScript}" | sed 's|--release|--debug|g')

		build({mac: macDmgDebug});
		build({windows: windowsExeDebug});
	"

	cp platforms/electron/build/*.dmg build/cyph.debug.dmg || exit 1
	cp platforms/electron/build/*.exe build/cyph.debug.exe || exit 1

	mv build.json.bak build.json
fi

if [ "${iOS}" ] ; then
	npx cordova build ios --debug --device \
		--codeSignIdentity='iPhone Developer' \
		--developmentTeam='SXZZ8WLPV2' \
		--packageType='development' \
		--provisioningProfile='99b9abe7-e8b2-4b9c-86f7-eedb84729e38'

	if [ ! -f platforms/ios/build/device/Cyph.ipa ] ; then exit 1 ; fi

	mv platforms/ios/build/device ios-debug

	npx cordova build ios --release --device \
		--codeSignIdentity='iPhone Distribution' \
		--developmentTeam='SXZZ8WLPV2' \
		--packageType='app-store' \
		--provisioningProfile='a973b22b-73bc-4dfa-b6ec-f60a493dc37f'

	if [ ! -f platforms/ios/build/device/Cyph.ipa ] ; then exit 1 ; fi

	mv platforms/ios/build/device ios-release

	mkdir platforms/ios/build/device
	mv ios-debug platforms/ios/build/device/debug
	mv ios-release platforms/ios/build/device/release

	cp platforms/ios/build/device/debug/Cyph.ipa build/cyph.debug.ipa
	cp platforms/ios/build/device/release/Cyph.ipa build/cyph.ipa
fi
