#!/bin/bash


set -e
cd $(cd "$(dirname "$0")" ; pwd)

test=''
if [ "${1}" == '--test' ] ; then
	echo -e 'TEST BUILD\n\n'
	test=true
	shift
fi

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
	./build.sh --test android "${password}" "${passwordWindows}" || exit 1
	mv cordova-build cordova-build.android-test

	./build.sh electron "${password}" "${passwordWindows}" || exit 1
	mv cordova-build cordova-build.electron
	./build.sh --test electron "${password}" "${passwordWindows}" || exit 1
	mv cordova-build cordova-build.electron-test

	./build.sh ios "${password}" "${passwordWindows}" || exit 1
	mv cordova-build cordova-build.ios
	./build.sh --test ios "${password}" "${passwordWindows}" || exit 1
	mv cordova-build cordova-build.ios-test

	./build.sh androidDebug || exit 1
	mv cordova-build cordova-build.android-debug
	./build.sh --test androidDebug || exit 1
	mv cordova-build cordova-build.android-debug-test

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

for f in $(ls -a | grep -vP \
	'^(\.|\.\.|cordova-build.*|node_modules|package-lock.json|platforms|plugins)$'
) ; do
	cp -a "${f}" cordova-build/
done

cd cordova-build
mkdir node_modules platforms plugins

echo -e '\n\nADD PLATFORMS\n\n'

sed -i "s|~|${HOME}|g" build.json

packageName='cyph'
iOSDevelopmentIdentity='Apple Development'
iOSDevelopmentProvisioningProfile='d5b45e17-e75d-4d4e-b71d-bd569ccf1eea'
iOSDistributionIdentity='Apple Distribution'
iOSDistributionProvisioningProfile='3391280c-40e8-4d28-8bea-1084460c05c7'

if [ "${test}" ] ; then
	packageName='test.cyph'
	iOSDevelopmentProvisioningProfile='24320152-d3d4-4794-8aa8-597e1808b7f5'
	iOSDistributionProvisioningProfile='339e0323-6399-4e45-a908-263de5fc42dc'

	cat config.xml |
		grep -v cordova-plugin-privacyscreen |
		sed 's|<name>Cyph</name>|<name>Cyph Test</name>|g' |
		perl -pe 's/com\.cyph\.(app|desktop)/com.cyph.test/g' |
		perl -pe 's/(android:largeHeap="true")/\1 android:usesCleartextTraffic="true"/g' |
		perl -pe 's/([":])(cyph|burner)\./\1staging.\2./g' \
	> config.xml.new
	mv config.xml.new config.xml

	if [ "${android}" ] ; then
		cat config.xml |
			grep -v cordova-plugin-ionic-webview \
		> config.xml.new
		mv config.xml.new config.xml
	fi

	cat package.json |
		sed 's|"URL_SCHEME": "cyph"|"URL_SCHEME": "cyph-test"|g' |
		perl -pe 's/"(cyph|burner)\./"staging.\1./g' \
	> package.json.new
	mv package.json.new package.json

	sed -i 's|macOS_Distribution|Test_macOS_Distribution|g' build.json

	mv google-services.test.json google-services.json
	mv GoogleService-Info.test.plist GoogleService-Info.plist
	patch www/js/main.js main.js.test.patch
fi

npm install


initPlatform () {
	platform="${1}"

	cp package.json package.json.old

	node -e "
		const document = new (require('xmldom').DOMParser)().
			parseFromString(fs.readFileSync('config.xml').toString());

		const otherPlatforms = Array.from(
			document.documentElement.getElementsByTagName('platform')
		).filter(elem => elem.getAttribute('name') !== '${platform}');

		for (const otherPlatform of otherPlatforms) {
			otherPlatform.parentNode.removeChild(otherPlatform);
		}

		fs.writeFileSync(
			'config.xml',
			new (require('xmldom').XMLSerializer)().serializeToString(document)
		);
	"

	npx cordova platform add ${platform}

	sed -i 's/.*<engine.*//g' config.xml

	for plugin in $(node -e "console.log(
		Array.from(
			new (require('xmldom').DOMParser)().
				parseFromString(fs.readFileSync('config.xml').toString()).
				documentElement.getElementsByTagName('plugin')
		).
			map(
				elem => \`\${elem.getAttribute('name')}@\${elem.getAttribute('spec')}\`
			).
			join('\n')
	)") ; do node -e "process.exit(child_process.spawnSync(
		'npx',
		[
			'cordova',
			'plugin',
			'add',
			'${plugin}',
			...Array.from(
				Object.entries(
					JSON.parse(
						fs.readFileSync('package.json.old').toString()
					).cordova.plugins['${plugin}'.replace(/(.)@.*/g, '\$1')] || {}
				)
			).
				map(([k, v]) => ['--variable', \`\${k}=\${v}\`]).
				reduce((a, b) => a.concat(b), [])
		],
		{stdio: 'inherit'}
	).status)" ; done

	node node_modules/patch-package/index.js

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
	cp platforms/android/app/build/outputs/apk/debug/app-debug.apk build/${packageName}.debug.apk
	exit
fi


if [ "${android}" ] ; then
	npx cordova build android --release --device -- \
		--keystore="${HOME}/.cyph/nativereleasesigning/android/cyph.jks" \
		--alias=cyph \
		--storePassword="${password}" \
		--password="${password}"

	cp platforms/android/app/build/outputs/apk/release/app-release.apk build/${packageName}.apk || exit 1
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

	cp -a platforms/electron/build/mas-universal/*.pkg build/${packageName}.pkg || exit 1
	cp platforms/electron/build/*.appx build/${packageName}.appx || exit 1
	cp platforms/electron/build/*.AppImage build/${packageName}.AppImage || exit 1
	cp platforms/electron/build/*.deb build/${packageName}.deb || exit 1
	cp platforms/electron/build/*.dmg build/${packageName}.dmg || exit 1
	cp platforms/electron/build/*.exe build/${packageName}.exe || exit 1
	cp platforms/electron/build/*.rpm build/${packageName}.rpm || exit 1
	cp platforms/electron/build/*.snap build/${packageName}.snap || exit 1

	node -e "
		$(echo "${electronScript}" | sed 's|--release|--debug|g')

		build({mac: macDmgDebug});
		build({windows: windowsExeDebug});
	"

	cp platforms/electron/build/*.dmg build/${packageName}.debug.dmg || exit 1
	cp platforms/electron/build/*.exe build/${packageName}.debug.exe || exit 1

	mv build.json.bak build.json
fi

if [ "${iOS}" ] ; then
	npx cordova build ios --debug --device \
		--codeSignIdentity="${iOSDevelopmentIdentity}" \
		--developmentTeam='SXZZ8WLPV2' \
		--packageType='development' \
		--provisioningProfile="${iOSDevelopmentProvisioningProfile}"

	if [ ! -f platforms/ios/build/device/Cyph*.ipa ] ; then exit 1 ; fi

	mv platforms/ios/build/device ios-debug

	npx cordova build ios --release --device \
		--codeSignIdentity="${iOSDistributionIdentity}" \
		--developmentTeam='SXZZ8WLPV2' \
		--packageType='app-store' \
		--provisioningProfile="${iOSDistributionProvisioningProfile}"

	if [ ! -f platforms/ios/build/device/Cyph*.ipa ] ; then exit 1 ; fi

	mv platforms/ios/build/device ios-release

	mkdir platforms/ios/build/device
	mv ios-debug platforms/ios/build/device/debug
	mv ios-release platforms/ios/build/device/release

	cp platforms/ios/build/device/debug/Cyph*.ipa build/${packageName}.debug.ipa
	cp platforms/ios/build/device/release/Cyph*.ipa build/${packageName}.ipa
fi
