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

mkdir -p ~/lib/js/crypto
cd ~/lib/js

echo "self.sodium = (function () {
	$(
		curl -s https://raw.githubusercontent.com/jedisct1/libsodium.js/9a8b4f9/wrapper/wrap-template.js |
		tr '\n' '☁' |
		perl -pe 's/.*Codecs(.*?)Memory management.*/\1/g' |
		tr '☁' '\n' \
	)

	$(
		curl -s https://raw.githubusercontent.com/jedisct1/libsodium.js/9a8b4f9/wrapper/wrap-template.js |
		tr '\n' ' ' |
		perl -pe 's/\s+/ /g' |
		perl -pe 's/.*(function memzero.*?)\s+function.*/\1/g' \
	)

	return {
		memzero: memzero,
		from_base64: from_base64,
		to_base64: to_base64,
		from_hex: from_hex,
		to_hex: to_hex,
		from_string: from_string,
		to_string: to_string
	};
}());" | uglifyjs > sodiumutil.js

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
	send "no\n"; \
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
	npm:@types/angular \
	npm:@types/angular-material \
	npm:@types/clipboard-js \
	npm:@types/dompurify \
	npm:@types/filesaver \
	npm:@types/jquery \
	npm:@types/markdown-it \
	npm:@types/whatwg-fetch \
	npm:@types/whatwg-streams \
	npm:rxjs \
	angular \
	angular-material@master \
	angular-aria \
	angular-animate \
	npm:dompurify \
	fetch=github:github/fetch \
	github:markdown-it/markdown-it \
	github:markdown-it/markdown-it-sup \
	github:markdown-it/markdown-it-emoji \
	microlight=github:buu700/microlight \
	github:andyet/simplewebrtc \
	npm:webrtc-adapter \
	npm:animate.css \
	github:davidchambers/base64.js \
	jquery \
	npm:magnific-popup \
	npm:file-saver \
	npm:clipboard-js \
	npm:nanoscroller \
	npm:unsemantic \
	github:snaptortoise/konami-js \
	github:matthieua/wow \
	github:morr/jquery.appear \
	github:julianlam/tabIndent.js \
	braintree=github:braintree/braintree-web@^2 \
	babel-polyfill \
	crypto/mceliece=github:cyph/mceliece.js \
	crypto/ntru=github:cyph/ntru.js \
	crypto/rlwe=github:cyph/rlwe.js \
	crypto/sidh=github:cyph/sidh.js \
	crypto/supersphincs=github:cyph/supersphincs

if (( $? )) ; then
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

		return mkdirCommand + `mv "${pathBase}@$(${findVersionCommand})" "${k}"`;
	}).join(" ; "));'
)"

rm -rf github npm config.js package.json jspm_packages 2> /dev/null

find . -name '*@*.js' -type f -exec bash -c '
	cat {} | perl -pe "s/(require\(\".*?):/\1\//g" > {}.new;
	mv {}.new {};
' \;


clone https://github.com/angular/zone.js.git

cd crypto
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
cd ../..

mkdir firebase
cd firebase
mkdir node_modules
npm install firebase --save
cd node_modules/firebase
npm install
browserify firebase-node.js -o ../../firebase.js -s firebase
cd ../..
cat firebase.js |
	sed 's|https://apis.google.com||g' |
	sed 's|iframe||gi' |
	perl -pe "s/[A-Za-z0-9]+\([\"']\/js\/.*?.js.*?\)/null/g" \
> firebase.js.new
mv firebase.js.new firebase.js
rm -rf node_modules
cd ..

mkdir -p @types/firebase
curl -s https://raw.githubusercontent.com/suhdev/firebase-3-typescript/master/firebase.d.ts | \
	grep -v es6-promise.d.ts > @types/firebase/index.d.ts

uglifyjs fetch/fetch.js -m -o fetch/fetch.min.js

uglifyjs microlight/microlight.js -m -o microlight/microlight.min.js

for f in webrtc-adapter/out/*.js ; do
	uglifyjs "${f}" -m -o "$(echo "${f}" | sed 's/\.js$/.min.js/')"
done

cd andyet/simplewebrtc
sed -i "s|require('./socketioconnection')|null|g" simplewebrtc.js
mkdir node_modules
npm install
node build.js
rm -rf node_modules
cd ../..

cd babel-polyfill
mkdir node_modules
npm install
npm install process
browserify dist/polyfill.min.js -o browser.js
rm -rf node_modules
cd ..

cp babel-polyfill/browser.js base.js

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
cd shared/lib/js
ln -s . node_modules
cd ../../..

for d in $(ls ~/golibs) ; do
	rm -rf default/${d} 2> /dev/null
	cp -a ~/golibs/${d} default/
done

commands/commit.sh updatelibs
