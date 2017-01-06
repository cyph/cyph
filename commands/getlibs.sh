#!/bin/bash

cd $(cd "$(dirname "$0")"; pwd)/..
cd shared/lib/js

if diff yarn.lock node_modules/yarn.lock > /dev/null 2>&1 ; then
	exit 0
fi

rm -rf node_modules ../.js.tmp 2> /dev/null

cd ..
cp -a js .js.tmp
cd .js.tmp

git init
mkdir node_modules
yarn install --ignore-platform || exit 1

cd node_modules

cp -a ../libsodium ./

mkdir -p @types/libsodium
cat > @types/libsodium/index.d.ts << EOM
export interface ISodium {
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
	from_base64 (s: string) : Uint8Array;
	from_hex (s: string) : Uint8Array;
	from_string (s: string) : Uint8Array;
	memcmp (a: Uint8Array, b: Uint8Array) : boolean;
	memzero (a: Uint8Array) : void;
	to_base64 (a: Uint8Array) : string;
	to_hex (a: Uint8Array) : string;
	to_string (a: Uint8Array) : string;
};

export const sodium: ISodium;
EOM

for anyType in konami-code.js markdown-it-emoji markdown-it-sup simplewebrtc tab-indent wowjs ; do
	mkdir -p "@types/${anyType}"
	echo "
		declare module '${anyType}' {
			declare const balls: any;
			export = balls;
		}
	" > "@types/${anyType}/index.d.ts"
done

echo 'declare module "braintree-web" { export = braintree; }' >> @types/braintree-web/index.d.ts

mv angular/angular.min.js angular/angular.js
mv angular-animate/angular-animate.min.js angular-animate/angular-animate.js
mv angular-aria/angular-aria.min.js angular-aria/angular-aria.js
mv angular-material/angular-material.min.js angular-material/angular-material.js
mv jquery/dist/jquery.min.js jquery/dist/jquery.js
mv libsodium/dist/browsers/combined/sodium.min.js libsodium/dist/browsers/combined/sodium.js
mv libsodium/dist/browsers-sumo/combined/sodium.min.js libsodium/dist/browsers-sumo/combined/sodium.js
mv magnific-popup/dist/jquery.magnific-popup.min.js magnific-popup/dist/jquery.magnific-popup.js
mv angular-material/angular-material.min.css angular-material/angular-material.css
mv animate.css/animate.min.css animate.css/animate.css

uglifyjs Base64/base64.js -m -o Base64/base64.js
uglifyjs jquery.appear/jquery.appear.js -m -o jquery.appear/jquery.appear.js
uglifyjs nanoscroller/bin/javascripts/jquery.nanoscroller.js -m -o nanoscroller/bin/javascripts/jquery.nanoscroller.js
uglifyjs whatwg-fetch/fetch.js -m -o whatwg-fetch/fetch.js

echo "module.exports = Konami;" >> konami-code.js/konami.js
echo "module.exports = tabIndent;" >> tab-indent/tabIndent.js
echo "module.exports = this.WOW;" >> wowjs/dist/wow.js

sed -i "s|require('./socketioconnection')|null|g" simplewebrtc/simplewebrtc.js

cd firebase
cp -f ../../module_locks/firebase/* ./
mkdir node_modules
yarn install
browserify firebase-node.js -o firebase-node.tmp.js -s firebase
cat firebase-node.tmp.js |
	sed 's|https://apis.google.com||g' |
	sed 's|iframe||gi' |
	perl -pe "s/[A-Za-z0-9]+\([\"']\/js\/.*?.js.*?\)/null/g" \
> firebase-node.js
cp -f firebase-node.js firebase-browser.js
rm -rf node_modules firebase-node.tmp.js
cd ..

cd webrtc-adapter
cp -f ../../module_locks/webrtc-adapter/* ./
mkdir node_modules
yarn install
webpack src/js/adapter_core.js adapter.js
uglifyjs adapter.js -o adapter.js
rm -rf node_modules out src
cd ..

cd ../..

mv .js.tmp/node_modules js/
rm -rf .js.tmp
cp js/yarn.lock js/node_modules/
