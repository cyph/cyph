#!/bin/bash


cd $(cd "$(dirname "$0")" ; pwd)/..
dir="${PWD}"


platform="${1}"

checkfail () {
	if (( $? )) ; then
		echo -e "${1}\n\nFAIL\n\n"
		exit 1
	fi
}


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
	echo -e '\n\nPASS\n\n'
	exit
fi

sudo umount node_modules
rm -rf node_modules
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

cp /node_modules/core-js/client/shim.js starter.js
echo >> starter.js
cat assets/js/standalone/global.js >> starter.js
echo >> starter.js
cat assets/js/cyph/crypto/native-web-crypto-polyfill.js >> starter.js
node -e 'console.log(`
	(function () {
		var exports	= undefined;
		var print	= function (s) { console.log(s); };
		importScripts("/assets/node_modules/libsodium/dist/browsers-sumo/combined/sodium.js");
	})();

	self.translations = ${JSON.stringify(require("../commands/translations"))};
`)' >> starter.js
cat app/starter.js >> starter.js

${dir}/commands/websign/threadpack.js starter.js
mv starter.js app/

echo -e '\n\nPASS\n\n'
