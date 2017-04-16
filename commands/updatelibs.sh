#!/bin/bash

cd $(cd "$(dirname "$0")" ; pwd)/..
dir="$PWD"


./commands/keycache.sh

mkdir -p ~/lib/js ~/tmplib/js
cd ~/tmplib/js

yarn add --ignore-engines --ignore-platform --ignore-scripts \
	@angular/animations \
	@angular/common \
	@angular/compiler \
	@angular/compiler-cli \
	@angular/core \
	@angular/flex-layout@https://github.com/buu700/flex-layout-tmp \
	@angular/forms \
	@angular/http \
	@angular/material \
	@angular/platform-browser \
	@angular/platform-browser-dynamic \
	@angular/platform-server \
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
	angular \
	angular-animate \
	angular-aria \
	animate.css \
	bourbon@4.2.7 \
	braintree-web@^2 \
	check-tslint-all \
	cheerio \
	clean-css-cli \
	clipboard-js \
	codelyzer \
	core-js \
	datauri \
	dompurify \
	fg-loadcss \
	file-saver \
	firebase \
	firebase-server \
	glob \
	google-closure-compiler \
	granim \
	gulp \
	hammerjs \
	highlight.js \
	html-minifier \
	htmlencode \
	htmllint \
	image-type \
	jquery \
	konami-code.js \
	lazy \
	libsodium-wrappers \
	magnific-popup \
	markdown-it \
	markdown-it-emoji \
	markdown-it-sup \
	mceliece \
	microlight-string \
	mkdirp \
	moment \
	nanoscroller \
	nativescript@rc \
	nativescript-angular@rc \
	nativescript-dev-android-snapshot \
	nativescript-dev-typescript \
	nativescript-theme-core \
	node-fetch \
	ntru \
	read \
	reflect-metadata \
	retire \
	rlwe \
	rxjs \
	sidh \
	simplewebrtc \
	sodiumutil \
	sphincs \
	stylelint \
	stylelint-scss \
	supersphincs \
	tab-indent \
	textillate \
	tns-android \
	tns-core-modules \
	tns-core-modules-widgets \
	tns-ios \
	ts-node \
	tslint \
	tslint-microsoft-contrib \
	typedoc \
	typescript \
	uglify-js \
	unsemantic \
	webpack \
	webpack-closure-compiler \
	webrtc-adapter \
	whatwg-fetch \
	wowjs \
	xkcd-passphrase \
	zombie \
	zone.js \
	https://github.com/angular/bower-material \
	https://github.com/buu700/webrtcsupport \
	https://github.com/jefersonestevo/angular-smd \
	https://github.com/morr/jquery.appear \
|| \
	exit 1

cp yarn.lock package.json ~/lib/js/

cat node_modules/tslint/package.json | grep -v tslint-test-config-non-relative > package.json.new
mv package.json.new node_modules/tslint/package.json

node -e '
	const package	= JSON.parse(fs.readFileSync("node_modules/ts-node/package.json").toString());
	package.scripts.prepublish	= undefined;
	fs.writeFileSync("node_modules/ts-node/package.json", JSON.stringify(package));
'

for d in firebase-server ts-node tslint ; do
	mkdir -p ~/lib/js/module_locks/${d}
	cd node_modules/${d}
	mkdir node_modules 2> /dev/null
	sed -i 's|https://https://|https://|g' yarn.lock 2> /dev/null
	yarn install --ignore-engines --ignore-platform || exit 1
	cp yarn.lock package.json ~/lib/js/module_locks/${d}/
	cd ../..
done

cd ~/lib/js

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
rm -rf ~/tmplib

./commands/getlibs.sh
./commands/commit.sh updatelibs
