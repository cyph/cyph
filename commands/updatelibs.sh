#!/bin/bash

source ~/.bashrc

dir="$(pwd)"
cd $(cd "$(dirname "$0")"; pwd)/..

rm -rf shared/lib
mkdir -p shared/lib/js
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

cd ../../js
rm config.js package.json
expect -c ' \
	spawn jspm init; \
	expect "Package.json file does not exist"; \
	send "yes\n"; \
	expect "prefix the jspm package.json"; \
	send "yes\n"; \
	expect "server baseURL"; \
	send "./\n"; \
	expect "jspm packages folder"; \
	send "../lib/js\n"; \
	expect "config file path"; \
	send "./config.js\n"; \
	expect "create it?"; \
	send "yes\n"; \
	expect "Enter client baseURL"; \
	send "/js/\n"; \
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

# echo "$(cat config.js | tr '\n' '☁' | rev | cut -c 6- | rev | tr '☁' '\n')"',
#
#   typescriptOptions: {
#     "tsconfig": true
#   },
#
#   "meta": {
#     "*.ts": {
#       "loader": "ts"
#     }
#   },
#
#   packages: {
#     "cyph.im": {
#       "main": "main",
#       "defaultExtension": "ts"
#     }
#   }
# });' > config.js.new
# mv config.js.new config.js

jspm install -y \
	angular \
	angular2 \
	angular-material \
	angular-aria \
	angular-animate \
	npm:dompurify \
	github:markdown-it/markdown-it \
	github:markdown-it/markdown-it-sup \
	github:markdown-it/markdown-it-emoji \
	microlight=github:buu700/microlight \
	github:siddii/angular-timer@1.2.1 \
	github:andyet/simplewebrtc \
	npm:animate.css \
	github:davidchambers/base64.js \
	jquery@^2 \
	jquery-legacy=github:jquery/jquery@^1 \
	npm:magnific-popup \
	npm:nanoscroller \
	npm:unsemantic \
	github:snaptortoise/konami-js \
	github:matthieua/wow \
	github:morr/jquery.appear \
	github:julianlam/tabIndent.js \
	npm:rxjs \
	braintree=github:braintree/braintree-web \
	babel-polyfill \
	npm:mutationobserver-shim \
	crypto/mceliece=github:cyph/mceliece.js \
	crypto/ntru=github:cyph/ntru.js \
	crypto/sidh=github:cyph/sidh.js \
	crypto/supersphincs=github:cyph/supersphincs \
	crypto/isaac=github:rubycon/isaac.js

if (( $? )); then
	exit 1
fi

cd ..

bash -c "$(node -e '
	const basePath = "lib/js/";
	const deps = JSON.parse(
		'"'$(cat js/package.json | tr '\n' ' ')'"'
	).jspm.dependencies;

	console.log(Object.keys(deps).map(k => {
		const path = deps[k].replace(":", "/");
		const pathBase = path.split("@")[0];
		const pathSplit = path.split("/");
		const package = pathSplit.slice(1).join("/").split("@");
		const symlinkParent = k.split("/").map(s => "..").join("/").replace(/..$/, "");

		const findVersionCommand =
			`find ${basePath}${pathSplit[0]} -type d | ` +
			`grep "${package[0]}@" | ` +
			`perl -pe "s/.*@//g" | ` +
			`grep -P "${package[1]}" | ` +
			`grep -v /`
		;

		const mkdirCommand = k.indexOf("/") > -1 ?
			`mkdir -p "${basePath}${k.split("/").slice(0, -1).join("/")}" ; ` :
			``
		;

		return mkdirCommand +
			`ln -s "${symlinkParent}${pathBase}@$(${findVersionCommand})" "${basePath}${k}"`
		;
	}).join(" ; "));'
)"


cd lib/js

sed -i 's/^\/dist$//' jquery*/.gitignore

cd crypto
git clone --recursive https://github.com/jedisct1/libsodium.js libsodium
cd libsodium
make libsodium/configure
sed -i 's|ln |cp |g' Makefile
sed -i 's|TOTAL_MEMORY_SUMO=35000000|TOTAL_MEMORY_SUMO=150000000|g' libsodium/dist-build/emscripten.sh
make
rm -rf .git* *.tmp API.md browsers-test test libsodium
cd ../..

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
echo >> base.js
cat system.js >> base.js

cd ..

rm -rf typings typings.json
typings install --global --save \
	dt~systemjs \
	dt~jquery \
	dt~angular \
	dt~angular-material \
	dt~angular-animate \
	dt~webrtc/mediastream \
	dt~webrtc/rtcpeerconnection \
	dt~dompurify

mkdir blog
cd blog
mkdir hnbutton ; curl --compressed https://hnbutton.appspot.com/static/hn.min.js > hnbutton/hn.min.js
mkdir twitter ; wget https://platform.twitter.com/widgets.js -O twitter/widgets.js
mkdir google ; wget https://apis.google.com/js/plusone.js -O google/plusone.js
wget "https://apis.google.com$(cat google/plusone.js | grep -oP '/_/scs/.*?"' | sed 's|\\u003d|=|g' | sed 's|__features__|plusone/rt=j/sv=1/d=1/ed=1|g' | rev | cut -c 2- | rev)/cb=gapi.loaded_0" -O google/plusone.helper.js
mkdir facebook ; wget https://connect.facebook.net/en_US/sdk.js -O facebook/sdk.js
mkdir disqus ; wget https://cyph.disqus.com/embed.js -O disqus/embed.js
npm install --save simple-jekyll-search
mv node_modules/simple-jekyll-search ./
rm -rf node_modules
cd ..


cd ../../default

rm -rf github.com 2> /dev/null
mkdir github.com
cd github.com

mkdir gorilla
cd gorilla
git clone git://github.com/gorilla/context.git
git clone git://github.com/gorilla/mux.git
cd ..

mkdir lionelbarrow
cd lionelbarrow
git clone git://github.com/lionelbarrow/braintree-go.git
echo '
func (g *Braintree) SetHTTPClient(client *http.Client) {
	g.HttpClient = client
}' >> braintree-go/braintree.go # Temporary workaround for GAE support
cd ..

mkdir microcosm-cc
cd microcosm-cc
git clone git://github.com/microcosm-cc/bluemonday.git
cd ..

cd ..

rm -rf golang.org 2> /dev/null
mkdir -p golang.org/x
cd golang.org/x

git clone git://github.com/golang/net.git
cd net
rm -rf !(AUTHORS|CONTRIBUTING.md|CONTRIBUTORS|LICENSE|PATENTS|README|html)
cd ..

git clone git://github.com/golang/text.git

cd ../..

find . -name .git -exec rm -rf {} \; 2> /dev/null

cd ..


# Remove large collections of extra files that we don't need

cd shared/lib/js

filesToDelete='angular2/es6'
filesToDelete="${filesToDelete} $(find angular2/* -name '*.js' | tr '\n' ' ')"

filesToDelete="${filesToDelete} $(find rxjs/* -name '*.js' | tr '\n' ' ')"

rm -rf $filesToDelete

cd ../../..

find default -type f -name '*_test.go' -exec rm {} \;


commands/commit.sh updatelibs 

cd "${dir}"
