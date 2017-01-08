#!/bin/bash

cd $(cd "$(dirname "$0")"; pwd)/..
dir="$PWD"


./commands/keycache.sh

mkdir -p ~/lib/js ~/tmplib/js
cd ~/tmplib/js

yarn add --ignore-platform \
	@angular/common \
	@angular/compiler \
	@angular/core \
	@angular/forms \
	@angular/http \
	@angular/platform-browser \
	@angular/platform-browser-dynamic \
	@angular/router \
	@angular/upgrade \
	@types/angular \
	@types/angular-material \
	@types/braintree-web \
	@types/clipboard-js \
	@types/dompurify \
	@types/file-saver \
	@types/jquery \
	@types/markdown-it \
	@types/whatwg-fetch \
	@types/whatwg-streams \
	angular@~1.5 \
	angular-animate@~1.5 \
	angular-aria@~1.5 \
	animate.css \
	babel-polyfill \
	Base64 \
	braintree-web@^2 \
	clipboard-js \
	core-js \
	dompurify \
	file-saver \
	firebase \
	jquery \
	konami-code.js \
	magnific-popup \
	markdown-it \
	markdown-it-sup \
	markdown-it-emoji \
	mceliece-js \
	microlight-string \
	nanoscroller \
	nativescript-angular \
	nativescript-dev-android-snapshot \
	nativescript-dev-typescript \
	nativescript-theme-core \
	ntru \
	reflect-metadata \
	rlwe \
	sidh \
	simplewebrtc \
	sphincs \
	supersphincs \
	tab-indent \
	tns-android \
	tns-core-modules \
	tns-core-modules-widgets \
	tns-ios \
	rxjs \
	sodiumutil \
	typescript@2.0.10 \
	unsemantic \
	webrtc-adapter \
	whatwg-fetch \
	wowjs \
	zone.js \
	https://github.com/angular/bower-material \
	https://github.com/morr/jquery.appear \
|| \
	exit 1

cp yarn.lock package.json ~/lib/js/

for f in firebase ; do
	mkdir -p ~/lib/js/module_locks/${f}
	cd node_modules/${f}
	mkdir node_modules
	yarn install
	cp yarn.lock package.json ~/lib/js/module_locks/${f}/
	cd ../..
done

cd ~/lib/js

# Pending TS 2.1: ln -s node_modules/core-js/client/shim.min.js base.js
ln -s node_modules/babel-polyfill/dist/polyfill.min.js base.js

${dir}/commands/libclone.sh https://github.com/jedisct1/libsodium.js libsodium.build
cd libsodium.build
cat > wrapper/symbols/crypto_stream_chacha20.json << EOM
{
	"name": "crypto_stream_chacha20",
	"type": "function",
	"inputs": [
		{
			"name": "outLength",
			"type": "uint"
		},
		{
			"name": "key",
			"type": "buf",
			"size": "libsodium._crypto_stream_chacha20_keybytes()"
		},
		{
			"name": "nonce",
			"type": "buf",
			"size": "libsodium._crypto_stream_chacha20_noncebytes()"
		}
	],
	"outputs": [
		{
			"name": "out",
			"type": "buf",
			"size": "outLength"
		}
	],
	"target": "libsodium._crypto_stream_chacha20(out_address, outLength, 0, nonce_address, key_address) | 0",
	"expect": "=== 0",
	"return": "_format_output(out, outputFormat)"
}
EOM
cat Makefile |
	perl -pe 's/^(\s+).*--browser-tests.*/\1\@echo/g' |
	perl -pe 's/^(\s+).*BROWSERS_TEST_DIR.*/\1\@echo/g' |
	perl -pe 's/^(\s+)ln /\1ln -f /g' \
> Makefile.new
mv Makefile.new Makefile
make libsodium/configure
# sed -i 's|TOTAL_MEMORY_SUMO=35000000|TOTAL_MEMORY_SUMO=150000000|g' libsodium/dist-build/emscripten.sh
make
find dist -type f -name '*.min.js' -exec bash -c 'mv {} "$(echo "{}" | sed "s|\.min||")"' \;
find dist -type f -name '*.js' -exec sed -i 's|use strict||g' {} \;
find dist -type f -not -name '*.js' -exec rm {} \;
cd ..
mkdir libsodium
mv libsodium.build/dist libsodium/
rm -rf libsodium.build


cd "${dir}"
rm -rf shared/lib
mv ~/lib shared/

./commands/getlibs.sh
./commands/commit.sh updatelibs
