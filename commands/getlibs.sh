#!/bin/bash


source ~/.bashrc
cd $(cd "$(dirname "$0")" ; pwd)/..
dir="$PWD"

rm -rf ~/.cache/yarn 2> /dev/null
rm ~/.yarnrc 2> /dev/null

# https://github.com/yarnpkg/yarn/issues/7212#issuecomment-594889917
cd ; yarn policies set-version 1.21.1 ; cd -


installPackages () {
	rm -rf node_modules 2> /dev/null
	mkdir node_modules
	yarn add --ignore-engines --ignore-platform --ignore-scripts --non-interactive \
		$(node -e "
			const package = JSON.parse(
				fs.readFileSync('${dir}/shared/lib/js/package.json').toString()
			);

			for (const k of Object.keys(package.dependencies).filter(package => ${1})) {
				console.log(\`\${k}@\${package.dependencies[k]}\`);
			}
		") \
	|| exit 1
}


rm -rf "${GOPATH}"
go get -u \
	cloud.google.com/go/datastore \
	github.com/buu700/mustache-tmp \
	github.com/gorilla/context \
	github.com/gorilla/mux \
	github.com/buu700/braintree-go-tmp \
	github.com/microcosm-cc/bluemonday \
	github.com/oschwald/geoip2-golang \
	github.com/stripe/stripe-go/v72 \
	google.golang.org/api \
	google.golang.org/api/internal \
	google.golang.org/api/iterator \
	google.golang.org/appengine \
	google.golang.org/appengine/datastore \
	google.golang.org/appengine/mail \
	google.golang.org/appengine/memcache \
	google.golang.org/appengine/urlfetch \
	google.golang.org/grpc


nativePlugins="$(cat native/plugins.list)"

sudo rm -rf \
	/node_modules \
	~/cyph \
	~/lib \
	~/node_modules \
	shared/lib/.js.tmp \
	shared/lib/js/node_modules \
	shared/lib/native \
	shared/node_modules \
2> /dev/null

cp -a shared/lib ~/

cd

installPackages "package === 'nativescript'"
rm package.json yarn.lock
~/node_modules/.bin/tns error-reporting disable
~/node_modules/.bin/tns usage-reporting disable
~/node_modules/.bin/tns create cyph --ng --appid com.cyph.app
cd cyph
git init
for plugin in ${nativePlugins} ; do
	~/node_modules/.bin/tns plugin add ${plugin} < /dev/null || exit 1
done
installPackages "
	package.startsWith('nativescript-dev') ||
	package.startsWith('tns')
"
rm yarn.lock
mv package.json package.json.tmp
sudo mv node_modules ~/native_node_modules
mkdir node_modules
cp ~/lib/js/package.json ~/lib/js/yarn.lock ./
yarn install --ignore-engines --ignore-platform --non-interactive || exit 1

# Temporary workaround for "typings.replace is not a function" bug
sed -i \
	"s/\!typings/\!typings || typeof typings.replace \!== 'function'/g" \
	node_modules/@angular/compiler-cli/ngcc/src/packages/entry_point.js

rm -rf ~/node_modules
mv node_modules ~/
mv ~/native_node_modules ./node_modules
mv package.json.tmp package.json
cd
mv cyph ~/lib/native


cd ~/lib
cp -a js .js.tmp
cd js
mv ~/node_modules ./
cd node_modules

for arr in \
	'localforage https://github.com/buu700/localforage-tmp' \
	'webrtcsupport https://github.com/buu700/webrtcsupport'
do
	read -ra arr <<< "${arr}"
	mv "${arr[0]}" ".${arr[0]}.old"
	git clone --depth 1 "${arr[1]}" "${arr[0]}"
	mv ".${arr[0]}.old/node_modules" "${arr[0]}/" 2> /dev/null
	rm -rf ".${arr[0]}.old"
done

mkdir -p @types/libsodium
cat > @types/libsodium/index.d.ts << EOM
declare module 'libsodium' {
	interface ISodium {
		crypto_aead_xchacha20poly1305_ietf_ABYTES: number;
		crypto_aead_xchacha20poly1305_ietf_KEYBYTES: number;
		crypto_aead_xchacha20poly1305_ietf_NPUBBYTES: number;
		crypto_box_curve25519xchacha20poly1305_NONCEBYTES: number;
		crypto_box_curve25519xchacha20poly1305_PUBLICKEYBYTES: number;
		crypto_box_curve25519xchacha20poly1305_SECRETKEYBYTES: number;
		crypto_onetimeauth_BYTES: number;
		crypto_onetimeauth_KEYBYTES: number;
		crypto_pwhash_ALG_ARGON2ID13: number;
		crypto_pwhash_BYTES_MAX: number;
		crypto_pwhash_BYTES_MIN: number;
		crypto_pwhash_MEMLIMIT_INTERACTIVE: number;
		crypto_pwhash_MEMLIMIT_MAX: number;
		crypto_pwhash_MEMLIMIT_MIN: number;
		crypto_pwhash_MEMLIMIT_MODERATE: number;
		crypto_pwhash_MEMLIMIT_SENSITIVE: number;
		crypto_pwhash_OPSLIMIT_INTERACTIVE: number;
		crypto_pwhash_OPSLIMIT_MAX: number;
		crypto_pwhash_OPSLIMIT_MIN: number;
		crypto_pwhash_OPSLIMIT_MODERATE: number;
		crypto_pwhash_OPSLIMIT_SENSITIVE: number;
		crypto_pwhash_PASSWD_MAX: number;
		crypto_pwhash_PASSWD_MIN: number;
		crypto_pwhash_SALTBYTES: number;
		crypto_pwhash_scryptsalsa208sha256_MEMLIMIT_INTERACTIVE: number;
		crypto_pwhash_scryptsalsa208sha256_OPSLIMIT_INTERACTIVE: number;
		crypto_pwhash_scryptsalsa208sha256_OPSLIMIT_SENSITIVE: number;
		crypto_pwhash_scryptsalsa208sha256_SALTBYTES: number;
		crypto_scalarmult_BYTES: number;
		crypto_scalarmult_SCALARBYTES: number;
		ready: Promise<void>;

		crypto_aead_xchacha20poly1305_ietf_decrypt (
			secretNonce: Uint8Array|undefined,
			cyphertext: Uint8Array,
			additionalData: Uint8Array|undefined,
			publicNonce: Uint8Array,
			key: Uint8Array
		) : Uint8Array;
		crypto_aead_xchacha20poly1305_ietf_encrypt (
			plaintext: Uint8Array,
			additionalData: Uint8Array|undefined,
			secretNonce: Uint8Array|undefined,
			publicNonce: Uint8Array,
			key: Uint8Array
		) : Uint8Array;
		crypto_box_curve25519xchacha20poly1305_keypair () : {
			privateKey: Uint8Array;
			publicKey: Uint8Array;
		};
		crypto_box_curve25519xchacha20poly1305_seal (
			plaintext: Uint8Array,
			publicKey: Uint8Array
		) : Uint8Array;
		crypto_box_curve25519xchacha20poly1305_seal_open (
			cyphertext: Uint8Array,
			publicKey: Uint8Array,
			privateKey: Uint8Array
		) : Uint8Array;
		crypto_generichash (
			outputBytes: number,
			plaintext: Uint8Array,
			key?: Uint8Array
		) : Uint8Array;
		crypto_onetimeauth (
			message: Uint8Array,
			key: Uint8Array
		) : Uint8Array;
		crypto_onetimeauth_verify (
			mac: Uint8Array,
			message: Uint8Array,
			key: Uint8Array
		) : boolean;
		crypto_pwhash (
			keyBytes: number,
			password: Uint8Array,
			salt: Uint8Array,
			opsLimit: number,
			memLimit: number,
			algorithm: number
		) : Uint8Array;
		crypto_pwhash_scryptsalsa208sha256 (
			keyBytes: number,
			password: Uint8Array,
			salt: Uint8Array,
			opsLimit: number,
			memLimit: number
		) : Uint8Array;
		crypto_scalarmult (privateKey: Uint8Array, publicKey: Uint8Array) : Uint8Array;
		crypto_scalarmult_base (privateKey: Uint8Array) : Uint8Array;
		crypto_stream_chacha20 (
			outLength: number,
			key: Uint8Array,
			nonce: Uint8Array
		) : Uint8Array;
		from_base64 (s: string) : Uint8Array;
		from_hex (s: string) : Uint8Array;
		from_string (s: string) : Uint8Array;
		memcmp (a: Uint8Array, b: Uint8Array) : boolean;
		memzero (a: Uint8Array) : void;
		to_base64 (a: Uint8Array) : string;
		to_hex (a: Uint8Array) : string;
		to_string (a: Uint8Array) : string;
	}

	const sodium: ISodium;
}
EOM

mkdir -p @types/lz4
cat > @types/lz4/index.d.ts << EOM
declare module 'lz4' {
	const decode: (a: Uint8Array) => Uint8Array;
	const encode: (a: Uint8Array, opts?: {streamChecksum: boolean}) => Uint8Array;
}
EOM

for anyType in \
	@ignatiusmb/scramble \
	bitauth \
	bitpay-rest \
	braintree-web-drop-in \
	cornerstone-core \
	dwv \
	granim \
	konami \
	lamejs \
	libvorbis.js \
	markdown-it-emoji \
	markdown-it-sup \
	math-expression-evaluator \
	opus-recorder \
	recorder.js \
	recordrtc \
	simplewebrtc \
	tab-indent \
	u2f-api-polyfill \
	videojs-background \
	videojs-brand \
	videojs-hotkeys \
	videojs-playlist \
	videojs-record \
	videojs-theater-mode \
	videojs-wavesurfer \
	watermarkjs \
	wavesurfer.js \
	wowjs
do
	anyTypePackage="$(echo "${anyType}" | sed 's|/|__|g')"
	mkdir -p "@types/${anyTypePackage}"
	echo "
		declare module '${anyType}' {
			const balls: any;
			export = balls;
		}
	" > "@types/${anyTypePackage}/index.d.ts"
done

for anyType in \
	crypto-browserify \
	readable-stream \
	stream-browserify
do
	anyTypePackage="$(echo "${anyType}" | sed 's|/|__|g')"
	mkdir -p "@types/${anyTypePackage}"
	echo "
		declare module '${anyType}' {
			const balls: any;
			export default balls;
		}
	" > "@types/${anyTypePackage}/index.d.ts"
done

for m in \
	simple-peer
do
	rg -l 'module.exports = ' ${m} | xargs sed -i 's|module.exports = |export default |g'
done

mkdir -p @types/fg-loadcss
echo "
	declare module 'fg-loadcss' {
		const loadCSS: (stylesheet: string) => void;
	}
" > @types/fg-loadcss/index.d.ts

for arr in \
	'konami/konami.js Konami' \
	'tab-indent/js/tabIndent.js tabIndent' \
	'wowjs/dist/wow.js this.WOW'
do
	read -ra arr <<< "${arr}"
	echo "module.exports = ${arr[1]};" >> "${arr[0]}"
done

sed -i 's/||!e.sender.track/||!e.sender||!e.sender.track/g' simple-peer/simplepeer.min.js
sed -i \
	's/\&\& transceiver.sender.track/\&\& transceiver.sender \&\& transceiver.sender.track/g' \
	simple-peer/index.js

rm -rf simplewebrtc/node_modules
sed -i "s|require('./socketioconnection')|null|g" simplewebrtc/src/simplewebrtc.js

cat wowjs/dist/wow.js | perl -pe 's/this\.([A-Z][a-z])/self.\1/g' > wowjs/dist/wow.js.new
mv wowjs/dist/wow.js.new wowjs/dist/wow.js

# Temporary workaround pending https://github.com/indutny/brorand/pull/11
sed -i "s|require|eval('require')|g" brorand/index.js

# Temporary workaround for https://github.com/werk85/node-html-to-text/issues/151
for f in $(grep -rl lodash html-to-text) ; do
	cat ${f} | perl -pe "s/(require\(['\"])lodash(\/.*?['\"]\))/\1lodash-es\2.default/g" > ${f}.new
	mv ${f}.new ${f}
done

# Temporary workaround for broken dependency
rm -rf google-auth-library/node_modules/fast-text-encoding &> /dev/null

# Temporary workaround for simple btc rxjs version difference
rm -rf simplebtc/node_modules &> /dev/null

# Temporary workaround for https://github.com/Jamaks/ng-fullcalendar/issues/33
rm -rf ng-fullcalendar/node_modules &> /dev/null

# Temporary workaround for unwanted font import
for f in $(rg -l '@import url' @syncfusion | grep '\.css$') ; do
	cat ${f} | perl -pe "s/\@import url\(.*?\);//g" > ${f}.new
	mv ${f}.new ${f}
done

# Temporary workaround pending https://github.com/syncfusion/ej2-javascript-ui-controls/pull/86
echo 'NSw2YzUsMjAKPCBleHBvcnQgaW50ZXJmYWNlIEFuZ3VsYXJFdmVudEVtaXR0ZXIgewo8ICAgICBzdWJzY3JpYmU/OiAoZ2VuZXJhdG9yT3JOZXh0PzogYW55LCBlcnJvcj86IGFueSwgY29tcGxldGU/OiBhbnkpID0+IGFueTsKLS0tCj4gZXhwb3J0IGludGVyZmFjZSBBbmd1bGFyRXZlbnRFbWl0dGVyPFQ+IHsKPiAgICAgY2xvc2VkOiBib29sZWFuOwo+ICAgICBoYXNFcnJvcjogYm9vbGVhbjsKPiAgICAgaXNTdG9wcGVkOiBib29sZWFuOwo+ICAgICBvYnNlcnZlcnM6IGFueVtdOwo+ICAgICB0aHJvd25FcnJvcjogYW55Owo+ICAgICBfc3Vic2NyaWJlKHN1YnNjcmliZXI6IGFueSk6IGFueTsKPiAgICAgX3RyeVN1YnNjcmliZShzdWJzY3JpYmVyOiBhbnkpOiBhbnk7Cj4gICAgIGFzT2JzZXJ2YWJsZSgpOiBhbnk7Cj4gICAgIGNvbXBsZXRlKCk6IHZvaWQ7Cj4gICAgIGVtaXQodmFsdWU/OiBUKTogdm9pZDsKPiAgICAgZXJyb3IoZXJyOiBhbnkpOiB2b2lkOwo+ICAgICBsaWZ0PF9SPihvcGVyYXRvcjogYW55KTogYW55Owo+ICAgICBuZXh0KHZhbHVlPzogVCk6IHZvaWQ7Cj4gICAgIHN1YnNjcmliZShnZW5lcmF0b3JPck5leHQ/OiBhbnksIGVycm9yPzogYW55LCBjb21wbGV0ZT86IGFueSk6IGFueTsKPiAgICAgdW5zdWJzY3JpYmUoKTogdm9pZDsKOGMyMgo8IGV4cG9ydCBkZWNsYXJlIHR5cGUgRW1pdFR5cGU8VD4gPSBBbmd1bGFyRXZlbnRFbWl0dGVyICYgKChhcmc/OiBULCAuLi5yZXN0OiBhbnlbXSkgPT4gdm9pZCk7Ci0tLQo+IGV4cG9ydCBkZWNsYXJlIHR5cGUgRW1pdFR5cGU8VD4gPSBBbmd1bGFyRXZlbnRFbWl0dGVyPFQ+ICYgKChhcmc/OiBULCAuLi5yZXN0OiBhbnlbXSkgPT4gdm9pZCk7Cg==' | base64 --decode | patch @syncfusion/ej2-base/src/base.d.ts

# Workaround for https://github.com/DevExpress/DevExtreme/issues/15570
for f in devextreme/dist/css/*.css ; do
	node -e "fs.writeFileSync('${f}', fs.readFileSync('${f}').toString().
		replace(/^@charset .UTF-8.;\n/, '').
		replace(/[^\\x00-\\x7F]/g, c => \`\\\\\${c.codePointAt(0).toString(16)}\`)
	)"
done

# Temporary workaround for unwanted font imports
for f in devextreme/dist/css/*.css ; do
	cat "${f}" |
		tr '\n' '☁' |
		perl -pe 's/\@import url\(.*?\);//g' |
		perl -pe 's/\@font-face \{.*?\}//g' |
		tr '☁' '\n' \
	> "${f}.new"
	mv "${f}.new" "${f}"
done

# Temporary workaround for https://github.com/pierrec/node-lz4/pull/64#issuecomment-416119077
cp -f lz4/lib/utils-js.js lz4/lib/utils.js

# Temporary workaround for https://github.com/dcodeIO/protobuf.js/issues/863
while true ; do
	for host in raw.githubusercontent.com cdn.rawgit.com rawgit.com ; do
		if [ "$(shasum -a 512 protobufjs/cli/pbts.js | awk '{print $1}')" == '5e0f68e44f1a7a1f0ad64ef36fcaf04f4903e4af75cd403d40a46115d2506e16111a52359a12c93d238db034dc707e4bdd8d5945a9d5aebeaf87bf55fe8a0c59' ] ; then
			break 2
		fi

		wget https://${host}/dcodeIO/protobuf.js/952c7d1b478cc7c6de82475a17a1387992e8651f/cli/pbts.js -O protobufjs/cli/pbts.js
	done

	echo 'fetching protobufjs failed; retrying'
	sleep 30
done

./.bin/pbjs --help &> /dev/null
./.bin/pbts --help &> /dev/null

find firebase @firebase -type f -name '*.node.js' -exec bash -c '
	cp -f {} $(echo "{}" | sed "s|\.node\.js$|.js|")
' \;

cd @types
for d in * ; do if [ ! -f ${d}/package.json ] ; then
cat > ${d}/package.json << EOM
{
	"name": "@types/${d}",
	"version": "1.0.0",
	"license": "Cyph-RSL"
}
EOM
fi ; done
cd ..

cd tslint
cat package.json | grep -v tslint-test-config-non-relative > package.json.new
mv package.json.new package.json
yarn install --ignore-engines --ignore-platform --ignore-scripts --non-interactive
cd ..

# for d in @google-cloud/* firebase-admin firebase-tools nativescript ; do
# 	cd ${d}
# 	yarn install --ignore-engines --ignore-platform --ignore-scripts --non-interactive
# 	cd ..
# done

find . -type d \( \
	-path '*/node_modules/@angular' -o \
	-path '*/node_modules/@angular-devkit' -o \
	-path '*/node_modules/@ngtools' \
\) \
	-exec rm -rf {} \; \
2> /dev/null

cd ../..

mv js/node_modules .js.tmp/
rm -rf js
mv .js.tmp js
cp js/yarn.lock js/node_modules/

cd
if [ -d ${dir}/cyph.app ] ; then
	rm -rf ${dir}/shared/lib ${dir}/shared/node_modules 2> /dev/null
	rsync -rL lib ${dir}/shared/
	mv ${dir}/shared/lib/js/node_modules ${dir}/shared/
	sudo mv lib/js/node_modules /
	sudo chmod -R 777 /node_modules
	rm -rf lib
fi
sudo mv lib/js/node_modules /
sudo chmod -R 777 /node_modules
rm -rf lib

# Temporary workaround pending AGSE update to SuperSPHINCS v6
if [ ! -d oldsupersphincs ] ; then
	mkdir oldsupersphincs
	cd oldsupersphincs
	yarn add supersphincs@old
fi

# https://next.angular.io/guide/migration-ngcc
cd /
rm -rf node_modules/@covalent node_modules/ng2-truncate # entry-point compile errors
ngcc --properties es2015 browser module main --first-only --create-ivy-entry-points

# Quick workaround for incomplete compilation in ngcc command
if [ -d ${dir}/cyph.app ] ; then
	cd ${dir}/cyph.app
else
	git clone --depth 1 https://github.com/cyph/cyph.git ~/cyph.tmp
	cd ~/cyph.tmp/cyph.app
fi

../commands/protobuf.sh
../commands/ngprojectinit.sh
ng build
../commands/ngprojectinit.sh --deinit

rm -rf ~/cyph.tmp 2> /dev/null
