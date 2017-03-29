#!/bin/bash

cd $(cd "$(dirname "$0")" ; pwd)/..
dir="$PWD"


nativePlugins="$(cat shared/js/native/plugins.list)"

rm -rf ~/lib shared/lib/go shared/lib/js/base.js shared/lib/js/node_modules 2> /dev/null

cp -a shared/lib ~/lib
cd ~/lib
cp -a js .js.tmp
cd js

git init
mkdir node_modules
yarn install --ignore-platform || exit 1
yarn add --ignore-platform --ignore-scripts ${nativePlugins} || exit 1

cd node_modules

# Workaround for TS >=2.1
echo > @types/whatwg-fetch/index.d.ts
echo > @types/whatwg-streams/index.d.ts

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
};

export const sodium: ISodium;
EOM

for anyType in granim konami-code.js markdown-it-emoji markdown-it-sup simplewebrtc tab-indent wowjs ; do
	mkdir -p "@types/${anyType}"
	echo "
		declare module '${anyType}' {
			declare const balls: any;
			export = balls;
		}
	" > "@types/${anyType}/index.d.ts"
done

mkdir -p @types/fg-loadcss
echo "
	declare module 'fg-loadcss' {
		export const loadCSS: (stylesheet: string) => void;
	}
" > @types/fg-loadcss/index.d.ts

echo 'declare module "braintree-web" { export = braintree; }' >> @types/braintree-web/index.d.ts

find . -type f | grep -P '.*\.min\.[a-z]+$' | xargs -I% bash -c '
	cp -f "%" "$(echo "%" | perl -pe "s/\.min(\.[a-z]+)$/\1/")"
'

for f in \
	Base64/base64.js \
	fg-loadcss/src/*.js \
	jquery.appear/jquery.appear.js \
	nanoscroller/bin/javascripts/jquery.nanoscroller.js \
	whatwg-fetch/fetch.js
do
	./.bin/uglifyjs "${f}" -m -o "${f}"
done

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

for f in $(find firebase -type f -name '*.js') ; do
	cat ${f} |
		sed 's|https://apis.google.com||g' |
		sed 's|iframe||gi' |
		perl -pe "s/[A-Za-z0-9]+\([\"']\/js\/.*?.js.*?\)/null/g" \
	> ${f}.new
	mv ${f}.new ${f}
done

node -e '
	const package	= JSON.parse(fs.readFileSync("ts-node/package.json").toString());
	package.scripts.prepublish	= undefined;
	fs.writeFileSync("ts-node/package.json", JSON.stringify(package));
'

currentDir="${PWD}"
for d in firebase firebase-server ts-node tslint ; do
	tmpDir="$(mktemp -d)"
	mv "${d}" "${tmpDir}/"
	cp -f ../module_locks/${d}/* "${tmpDir}/${d}/"
	cd "${tmpDir}/${d}"
	mkdir node_modules 2> /dev/null
	yarn install --ignore-platform || exit 1

	if [ "${d}" == 'firebase' ] ; then
		"${currentDir}/.bin/browserify" firebase-node.js -o firebase.js -s firebase
		cp -f firebase.js firebase-browser.js
		cp -f firebase.js firebase-node.js
		rm -rf node_modules
	elif [ "${d}" == 'tslint' ] ; then
		# Temporary workaround pending tslint updating to TS >= 2.2
		rm -rf node_modules/typescript
		cp -rf "${currentDir}/typescript" node_modules/
	fi

	cd "${currentDir}"
	mv "${tmpDir}/${d}" ./
done

mv .bin/ts-node .bin/ts-node-original
echo -e '#!/bin/bash\nts-node-original -D "${@}"' > .bin/ts-node
chmod +x .bin/ts-node

# Workaround for lib bugs
rm nodobjc/docs/assets/ir_black.css ref/docs/stylesheets/hightlight.css
cp highlight.js/styles/ir-black.css nodobjc/docs/assets/ir_black.css
cp highlight.js/styles/solarized-light.css ref/docs/stylesheets/hightlight.css

cd ../..

mv js/node_modules .js.tmp/
rm -rf js
mv .js.tmp js
cp js/yarn.lock js/node_modules/

cp js/node_modules/core-js/client/shim.js js/base.js


mkdir go
cd go

for arr in \
	'gorilla/context github.com/gorilla/context' \
	'gorilla/mux github.com/gorilla/mux' \
	'lionelbarrow/braintree-go github.com/lionelbarrow/braintree-go master' \
	'microcosm-cc/bluemonday github.com/microcosm-cc/bluemonday' \
	'oschwald/geoip2-golang github.com/oschwald/geoip2-golang' \
	'oschwald/maxminddb-golang github.com/oschwald/maxminddb-golang' \
	'golang/net golang.org/x/net.tmp' \
	'golang/text golang.org/x/text' \
	'golang/tools golang.org/x/tools.tmp'
do
	read -ra arr <<< "${arr}"
	${dir}/commands/libclone.sh https://github.com/${arr[0]}.git ${arr[1]} ${arr[2]}
done

mkdir -p golang.org/x/net
mv golang.org/x/net.tmp/context golang.org/x/net.tmp/html golang.org/x/net/
rm -rf golang.org/x/net.tmp

mkdir -p golang.org/x/tools/go
mv golang.org/x/tools.tmp/go/ast golang.org/x/tools/go/
mv golang.org/x/tools.tmp/go/buildutil golang.org/x/tools/go/
mv golang.org/x/tools.tmp/go/loader golang.org/x/tools/go/
rm -rf golang.org/x/tools.tmp
find golang.org/x/tools -name '*test*' -exec rm -rf {} \; 2> /dev/null

find . -type f -name '*test.go' -exec rm {} \;
find . -type f -name '*.go' -exec sed -i 's|func main|func functionRemoved|g' {} \;


cd
rm -rf ${dir}/shared/lib
cp -aL lib ${dir}/shared/
sudo rm -rf /node_modules
sudo mv lib/js/node_modules /
sudo chmod -R 777 /node_modules
rm -rf lib
