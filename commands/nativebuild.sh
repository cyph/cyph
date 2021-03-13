#!/bin/bash


cd $(cd "$(dirname "$0")" ; pwd)/..
dir="${PWD}"


platform="${1}"


./commands/nativeprojectinit.sh
checkfail

cd native

for p in android ios ; do
	if [ ! "${platform}" ] || [ "${platform}" == "${p}" ] ; then
		npm run ns-bundle "--${p}"
		checkfail
	fi
done

if [ ! "${platform}" ] ; then
	pass
fi

unbindmount node_modules
cp -a ../shared/lib/native/node_modules ./

compiledApp=''
if [ "${platform}" == 'android' ] ; then
	compiledApp='platforms/android/src/main/assets/app'
elif [ "${platform}" == 'ios' ] ; then
	compiledApp='platforms/ios/native/app'
fi

mv app/App_Resources App_Resources.tmp
rm -rf app
cp -rf ${compiledApp} app
rm -rf app/App_Resources
mv App_Resources.tmp app/App_Resources

cp assets/js/standalone/global.js bundle.js
echo >> bundle.js
cat app/bundle.js >> bundle.js

cp /node_modules/core-js-bundle/minified.js starter.js
echo >> starter.js
cat assets/js/standalone/global.js >> starter.js
echo >> starter.js
cat assets/js/cyph/crypto/native-web-crypto-polyfill.js >> starter.js
node -e '(async () => console.log(`
	var crypto = self.crypto;

	(function () {
		var exports = undefined;
		var print = function (s) { console.log(s); };
		importScripts("/assets/node_modules/libsodium-sumo/dist/modules-sumo/libsodium-sumo.js");
		importScripts(
			"/assets/node_modules/libsodium-wrappers-sumo/dist/modules-sumo/libsodium-wrappers.js"
		);
	})();

	self.translations = ${JSON.stringify((await import("../commands/translations")).translations)};
`))().then(() => process.exit())' >> starter.js
cat app/starter.js >> starter.js

${dir}/commands/websign/threadpack.js starter.js || fail
mv bundle.js starter.js app/

pass
