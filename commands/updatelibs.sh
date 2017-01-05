#!/bin/bash

cd $(cd "$(dirname "$0")"; pwd)/..
dir="$PWD"


clone () {
	repo="${1}"
	outdir="${2}"

	git clone \
		-b $(
			{
				echo master;
				git ls-remote --tags ${repo} |
					grep -v '{}' |
					awk -F'/' '{print $3}' |
					sort -V \
				;
			} | tail -n1
		) \
		--depth 1 \
		--recursive \
		${repo} \
		${outdir}

	rm -rf ${outdir}/.git
}

./commands/keycache.sh

mkdir -p ~/lib/js
cd ~/lib/js

yarn add --flat --ignore-platform \
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
	unsemantic \
	webrtc-adapter \
	whatwg-fetch \
	wowjs \
	zone.js \
	https://github.com/angular/bower-material \
	https://github.com/morr/jquery.appear \
|| \
	exit 1

ln -s node_modules/core-js/client/shim.min.js base.js

mkdir module_locks
for f in firebase simplewebrtc webrtc-adapter ; do
	mkdir "module_locks/${f}"
	cp -a "node_modules/${f}" "module_locks/${f}.tmp"
	cd "module_locks/${f}.tmp"
	mkdir node_modules
	yarn install
	mv yarn.lock package.json "../${f}/"
	cd ../..
	rm -rf "module_locks/${f}.tmp"
done

rm -rf hooks references.d.ts tsconfig.json 2> /dev/null

clone https://github.com/jedisct1/libsodium.js libsodium
cd libsodium
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
find dist -name '*.js' | xargs sed -i 's|use strict||g'
rm -rf .git* *.tmp API.md browsers-test test libsodium
cd ..

cd ..


mkdir ~/golibs
cd ~/golibs

rm -rf github.com 2> /dev/null
mkdir github.com
cd github.com

mkdir gorilla
cd gorilla
clone https://github.com/gorilla/context.git
clone https://github.com/gorilla/mux.git
cd ..

mkdir lionelbarrow
cd lionelbarrow
clone https://github.com/lionelbarrow/braintree-go.git
echo '
func (g *Braintree) SetHTTPClient(client *http.Client) {
	g.HttpClient = client
}' >> braintree-go/braintree.go # Temporary workaround for GAE support
cd ..

mkdir microcosm-cc
cd microcosm-cc
clone https://github.com/microcosm-cc/bluemonday.git
cd ..

cd ..

rm -rf golang.org 2> /dev/null
mkdir -p golang.org/x
cd golang.org/x

clone https://github.com/golang/net.git net.tmp
mkdir net
cd net.tmp
mv AUTHORS CONTRIBUTING.md CONTRIBUTORS LICENSE PATENTS README html context ../net/
cd ..
rm -rf net.tmp

clone https://github.com/golang/text.git

clone https://github.com/golang/tools.git tools-tmp
mkdir -p tools/go
cd tools-tmp
mv AUTHORS CONTRIBUTING.md CONTRIBUTORS LICENSE PATENTS README ../tools
cd go
mv ast buildutil loader ../../tools/go/
cd ../..
rm -rf tools-tmp
find tools -name '*test*' -exec rm -rf {} \; 2> /dev/null

cd ../..

find . -name .git -exec rm -rf {} \; 2> /dev/null
find . -type f -name '*_test.go' -exec rm {} \;
find . -type f -name '*.go' -exec sed -i 's|func main|func functionRemoved|g' {} \;


cd "${dir}"
rm -rf shared/lib
cp -a ~/lib shared/

for d in $(ls ~/golibs) ; do
	rm -rf default/${d} 2> /dev/null
	cp -a ~/golibs/${d} default/
done

commands/getlibs.sh --skip-check
commands/commit.sh updatelibs
