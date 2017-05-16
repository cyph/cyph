#!/bin/bash


cd $(cd "$(dirname "$0")" ; pwd)/..
dir="$PWD"


go get \
	github.com/gorilla/mux \
	github.com/lionelbarrow/braintree-go \
	github.com/microcosm-cc/bluemonday \
	github.com/oschwald/geoip2-golang \
	golang.org/x/net/context \
	google.golang.org/appengine \
	google.golang.org/appengine/datastore \
	google.golang.org/appengine/mail \
	google.golang.org/appengine/memcache \
	google.golang.org/appengine/urlfetch


nativePlugins="$(cat native/plugins.list)"

rm -rf ~/cyph ~/lib shared/lib/js/node_modules 2> /dev/null
cp -rf shared/lib ~/lib

cd
tns create cyph --ng --appid com.cyph.app
cd cyph
mv package.json package.json.tmp
cp -rf ~/lib/js/* ./
git init
rm -rf node_modules 2> /dev/null
mkdir node_modules
yarn install --ignore-engines --ignore-platform || exit 1
mv node_modules ~/node_modules.tmp
mkdir node_modules
mv package.json.tmp package.json
for plugin in ${nativePlugins} ; do tns plugin add ${plugin} < /dev/null || exit 1 ; done
# rm hooks/*/nativescript-dev-typescript.js
cd
sudo mv cyph /native
sudo chmod -R 777 /native


cd ~/lib
cp -a js .js.tmp
cd js
mv ~/node_modules.tmp node_modules
cd node_modules

cp -a ../libsodium ./

mkdir -p @types/libsodium
cat > @types/libsodium/index.d.ts << EOM
declare module 'libsodium' {
	interface ISodium {
		crypto_aead_chacha20poly1305_ABYTES: number;
		crypto_aead_chacha20poly1305_KEYBYTES: number;
		crypto_aead_chacha20poly1305_NPUBBYTES: number;
		crypto_box_NONCEBYTES: number;
		crypto_box_PUBLICKEYBYTES: number;
		crypto_box_SECRETKEYBYTES: number;
		crypto_onetimeauth_BYTES: number;
		crypto_onetimeauth_KEYBYTES: number;
		crypto_pwhash_scryptsalsa208sha256_MEMLIMIT_INTERACTIVE: number;
		crypto_pwhash_scryptsalsa208sha256_OPSLIMIT_INTERACTIVE: number;
		crypto_pwhash_scryptsalsa208sha256_OPSLIMIT_SENSITIVE: number;
		crypto_pwhash_scryptsalsa208sha256_SALTBYTES: number;
		crypto_scalarmult_BYTES: number;
		crypto_scalarmult_SCALARBYTES: number;

		crypto_aead_chacha20poly1305_decrypt (
			secretNonce: Uint8Array|undefined,
			cyphertext: Uint8Array,
			additionalData: Uint8Array|undefined,
			publicNonce: Uint8Array,
			key: Uint8Array
		) : Uint8Array;
		crypto_aead_chacha20poly1305_encrypt (
			plaintext: Uint8Array,
			additionalData: Uint8Array|undefined,
			secretNonce: Uint8Array|undefined,
			publicNonce: Uint8Array,
			key: Uint8Array
		) : Uint8Array;
		crypto_box_keypair () : {privateKey: Uint8Array; publicKey: Uint8Array};
		crypto_box_seal (plaintext: Uint8Array, publicKey: Uint8Array) : Uint8Array;
		crypto_box_seal_open (
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

for anyType in \
	braintree-web-drop-in \
	granim \
	konami-code.js \
	markdown-it-emoji \
	markdown-it-sup \
	simplewebrtc \
	tab-indent \
	wowjs
do
	mkdir -p "@types/${anyType}"
	echo "
		declare module '${anyType}' {
			const balls: any;
			export = balls;
		}
	" > "@types/${anyType}/index.d.ts"
done

mkdir -p @types/fg-loadcss
echo "
	declare module 'fg-loadcss' {
		const loadCSS: (stylesheet: string) => void;
	}
" > @types/fg-loadcss/index.d.ts

for arr in \
	'konami-code.js/konami.js Konami' \
	'tab-indent/js/tabIndent.js tabIndent' \
	'wowjs/dist/wow.js this.WOW'
do
	read -ra arr <<< "${arr}"
	echo "module.exports = ${arr[1]};" >> "${arr[0]}"
done

sed -i 's/saveAs\s*||/self.saveAs||/g' file-saver/*.js

sed -i "s|require('./socketioconnection')|null|g" simplewebrtc/simplewebrtc.js

cat wowjs/dist/wow.js | perl -pe 's/this\.([A-Z][a-z])/self.\1/g' > wowjs/dist/wow.js.new
mv wowjs/dist/wow.js.new wowjs/dist/wow.js

cd firebase
for m in $(ls *-node.js | sed 's|-node\.js$||') ; do
	mv ${m}-node.js ${m}.js
	grep -rl "${m}-node" | xargs -I% sed -i "s|${m}-node|${m}|g" %
done
cd ..

currentDir="${PWD}"
for d in firebase-server tslint ; do
	tmpDir="$(mktemp -d)"
	mv "${d}" "${tmpDir}/"
	cp -f ../module_locks/${d}/* "${tmpDir}/${d}/"
	cd "${tmpDir}/${d}"
	mkdir node_modules 2> /dev/null
	yarn install --ignore-engines --ignore-platform || exit 1
	cd "${currentDir}"
	mv "${tmpDir}/${d}" ./
done

cd ../..

mv js/node_modules .js.tmp/
rm -rf js
mv .js.tmp js
cp js/yarn.lock js/node_modules/

cd
rm -rf ${dir}/shared/lib
cp -aL lib ${dir}/shared/
sudo rm -rf /node_modules
sudo mv lib/js/node_modules /
sudo chmod -R 777 /node_modules
rm -rf lib


cd ${dir}
./commands/buildunbundledassets.sh
