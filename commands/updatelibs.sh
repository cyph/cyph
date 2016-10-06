#!/bin/bash

dir="$(pwd)"
cd $(cd "$(dirname "$0")"; pwd)/..

./commands/keycache.sh

rm -rf shared/lib
mkdir -p shared/lib/js/crypto
cd shared/lib/js

echo "sodium = (function () {
	$( \
		curl -s https://raw.githubusercontent.com/jedisct1/libsodium.js/9a8b4f9/wrapper/wrap-template.js | \
		tr '\n' '☁' | \
		perl -pe 's/.*Codecs(.*?)Memory management.*/\1/g' | \
		tr '☁' '\n' \
	)

	return {
		from_base64: from_base64,
		to_base64: to_base64,
		from_hex: from_hex,
		to_hex: to_hex,
		from_string: from_string,
		to_string: to_string
	};
}());" | uglifyjs > sodiumcodecs.js

expect -c ' \
	spawn jspm init; \
	expect "Package.json file does not exist"; \
	send "yes\n"; \
	expect "prefix the jspm package.json"; \
	send "yes\n"; \
	expect "server baseURL"; \
	send "./\n"; \
	expect "jspm packages folder"; \
	send "./\n"; \
	expect "config file path"; \
	send "./config.js\n"; \
	expect "create it?"; \
	send "yes\n"; \
	expect "Enter client baseURL"; \
	send "/\n"; \
	expect "transpiler"; \
	send "yes\n"; \
	expect "transpiler"; \
	send "typescript\n"; \
	interact; \
'
expect -c ' \
	spawn jspm registry config github; \
	expect "GitHub credentials"; \
	send "yes\n"; \
	expect "GitHub username"; \
	send "'"$(head -n1 ~/.cyph/github.token)"'\n"; \
	expect "GitHub password"; \
	send "'"$(tail -n1 ~/.cyph/github.token)"'\n"; \
	expect "test these credentials"; \
	send "yes\n"; \
	interact; \
'
jspm config registries.github.timeouts.download 600

jspm install -y \
	npm:@angular/common \
	npm:@angular/compiler \
	npm:@angular/core \
	npm:@angular/forms \
	npm:@angular/http \
	npm:@angular/platform-browser \
	npm:@angular/platform-browser-dynamic \
	npm:@angular/router \
	npm:@angular/upgrade \
	npm:rxjs \
	angular \
	angular-material \
	angular-aria \
	angular-animate \
	npm:dompurify \
	github:markdown-it/markdown-it \
	github:markdown-it/markdown-it-sup \
	github:markdown-it/markdown-it-emoji \
	microlight=github:buu700/microlight \
	github:siddii/angular-timer@1.2.1 \
	angular-timer=github:siddii/angular-timer \
	moment \
	npm:humanize-duration \
	github:andyet/simplewebrtc \
	npm:animate.css \
	github:davidchambers/base64.js \
	jquery@^2 \
	jquery-legacy=github:jquery/jquery@^1 \
	npm:magnific-popup \
	npm:clipboard-js \
	npm:nanoscroller \
	npm:unsemantic \
	github:snaptortoise/konami-js \
	github:matthieua/wow \
	github:morr/jquery.appear \
	github:julianlam/tabIndent.js \
	braintree=github:braintree/braintree-web@^2 \
	babel-polyfill \
	npm:mutationobserver-shim \
	crypto/mceliece=github:cyph/mceliece.js \
	crypto/ntru=github:cyph/ntru.js \
	crypto/rlwe=github:cyph/rlwe.js \
	crypto/sidh=github:cyph/sidh.js \
	crypto/supersphincs=github:cyph/supersphincs

if (( $? )); then
	exit 1
fi

find jspm_packages -mindepth 1 -maxdepth 1 -type d -exec mv {} ./ \;

bash -c "$(node -e '
	const deps		= JSON.parse(
		'"'$(cat package.json | tr '\n' ' ')'"'
	).jspm.dependencies;

	const versionSplit	= path => {
		const index	= path.lastIndexOf("@");
		return [path.slice(0, index), path.slice(index + 1)];
	};

	console.log(Object.keys(deps).map(k => {
		const path			= deps[k].replace(":", "/");
		const pathBase		= versionSplit(path)[0];
		const pathSplit		= path.split("/");
		const package		= versionSplit(pathSplit.slice(1).join("/"));
		const symlinkParent	= k.split("/").map(s => "..").join("/").replace(/..$/, "");

		const findVersionCommand	=
			`find ./${pathSplit[0]} -type d | ` +
			`grep "${package[0]}@" | ` +
			`perl -pe "s/.*@//g" | ` +
			`grep -P "${package[1]}" | ` +
			`grep -v /`
		;

		const mkdirCommand	= k.indexOf("/") > -1 ?
			`mkdir -p "${k.split("/").slice(0, -1).join("/")}" ; ` :
			``
		;

		return mkdirCommand +
			`ln -s "${symlinkParent}${pathBase}@$(${findVersionCommand})" "${k}"`
		;
	}).join(" ; "));'
)"

rm -rf config.js package.json jspm_packages 2> /dev/null


sed -i 's/^\/dist$//' jquery*/.gitignore

cd crypto
sodiumrepo='https://github.com/jedisct1/libsodium.js'
git clone \
	-b $(git ls-remote --tags $sodiumrepo | grep -v '{}' | awk -F'/' '{print $3}' | sort -V | tail -n1) \
	--depth 1 \
	--recursive \
	$sodiumrepo \
	libsodium
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
sed -i 's|TOTAL_MEMORY_SUMO=35000000|TOTAL_MEMORY_SUMO=150000000|g' libsodium/dist-build/emscripten.sh
make
find dist -name '*.js' | xargs sed -i 's|use strict||g'
rm -rf .git* *.tmp API.md browsers-test test libsodium
cd ../..

mkdir firebase
cd firebase
npm install firebase --save
cd node_modules/firebase
npm install
browserify firebase-node.js -o ../../firebase.js -s firebase
cd ../..
rm -rf node_modules
cd ..

cd microlight
uglifyjs microlight.js -m -o microlight.min.js
cd ..

cd babel-polyfill
npm install
npm install process
browserify dist/polyfill.min.js -o browser.js
rm -rf node_modules
cd ..

cd github/andyet/simplewebrtc@*
sed -i "s|require('./socketioconnection')|null|g" simplewebrtc.js
npm install
node build.js
rm -rf node_modules
cd ../../..

cp babel-polyfill/browser.js base.js

cd ..

rm -rf typings typings.json
typings install --global --save \
	dt~jquery \
	dt~angular \
	dt~angular-material \
	dt~angular-animate \
	dt~dompurify
	# dt~webrtc/mediastream
	# dt~webrtc/rtcpeerconnection

mkdir typings/globals/firebase
curl -s https://raw.githubusercontent.com/suhdev/firebase-3-typescript/master/firebase.d.ts | \
	grep -v es6-promise.d.ts > typings/globals/firebase/index.d.ts
echo '/// <reference path="globals/firebase/index.d.ts" />' >> typings/index.d.ts


cd ../../default

rm -rf github.com 2> /dev/null
mkdir github.com
cd github.com

mkdir gorilla
cd gorilla
git clone --depth 1 git://github.com/gorilla/context.git
git clone --depth 1 git://github.com/gorilla/mux.git
cd ..

mkdir lionelbarrow
cd lionelbarrow
git clone --depth 1 git://github.com/lionelbarrow/braintree-go.git
echo '
func (g *Braintree) SetHTTPClient(client *http.Client) {
	g.HttpClient = client
}' >> braintree-go/braintree.go # Temporary workaround for GAE support
cd ..

mkdir microcosm-cc
cd microcosm-cc
git clone --depth 1 git://github.com/microcosm-cc/bluemonday.git
cd ..

cd ..

rm -rf golang.org 2> /dev/null
mkdir -p golang.org/x
cd golang.org/x

git clone --depth 1 git://github.com/golang/net.git net.tmp
mkdir net
cd net.tmp
mv AUTHORS CONTRIBUTING.md CONTRIBUTORS LICENSE PATENTS README html context ../net/
cd ..
rm -rf net.tmp

git clone --depth 1 git://github.com/golang/text.git

git clone --depth 1 git://github.com/golang/tools.git tools-tmp
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

cd ..

find default -type f -name '*_test.go' -exec rm {} \;


commands/commit.sh updatelibs

cd "${dir}"
