#!/bin/bash

source ~/.bashrc

dir="$(pwd)"
cd $(cd "$(dirname "$0")"; pwd)/..

rm -rf shared/lib
mkdir -p shared/lib/js
cd shared/lib/js

mkdir aws-xml
cd aws-xml
npm install --save xml2js aws-sdk
browserify node_modules/aws-sdk/lib/xml/node_parser.js -s AWS_XML | uglifyjs -o ../aws-xml.js
cd ..
rm -rf aws-xml

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
	github:twitter/twemoji@1.3.2 \
	github:markdown-it/markdown-it-emoji \
	github:isagalaev/highlight.js \
	github:siddii/angular-timer@1.2.1 \
	npm:animate.css \
	github:davidchambers/base64.js \
	jquery \
	jquery-legacy=github:jquery/jquery@^1 \
	npm:magnific-popup \
	npm:nanoscroller \
	npm:unsemantic \
	github:matthieua/wow \
	github:morr/jquery.appear \
	github:julianlam/tabIndent.js \
	github:aws/aws-sdk-js \
	npm:rxjs \
	braintree=github:braintree/braintree-web \
	es5-shim \
	es6-shim \
	crypto/libsodium=github:jedisct1/libsodium.js \
	crypto/ntru=github:cyph/ntru.js \
	crypto/supersphincs=github:cyph/supersphincs.js \
	crypto/isaac=github:rubycon/isaac.js \
	crypto/cryptojs=cryptojs

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

sed -i 's/^\/dist$//' jquery-legacy/.gitignore

cd github/isagalaev/highlight.js@*
sed -i 's/^build$//' .gitignore
npm install
node tools/build.js :common
rm -rf node_modules
cd ../../..

cd ..

rm -rf typings typings.json
typings install --ambient --save \
	systemjs \
	jquery \
	angular \
	angular-material \
	angular-animate \
	highlightjs \
	webrtc/mediastream \
	webrtc/rtcpeerconnection \
	cryptojs \
	dompurify \
	es6-shim

mkdir blog
cd blog
mkdir hnbutton ; curl --compressed https://hnbutton.appspot.com/static/hn.min.js > hnbutton/hn.min.js
mkdir twitter ; wget https://platform.twitter.com/widgets.js -O twitter/widgets.js
mkdir google ; wget https://apis.google.com/js/plusone.js -O google/plusone.js
wget "https://apis.google.com$(cat google/plusone.js | grep -oP '/_/scs/.*?"' | sed 's|\\u003d|=|g' | sed 's|__features__|plusone/rt=j/sv=1/d=1/ed=1|g' | rev | cut -c 2- | rev)/cb=gapi.loaded_0" -O google/plusone.helper.js
mkdir facebook ; wget https://connect.facebook.net/en_US/sdk.js -O facebook/sdk.js
mkdir disqus ; wget https://cyph.disqus.com/embed.js -O disqus/embed.js
cd ..


cd ../../default

rm -rf github.com 2> /dev/null
mkdir github.com
cd github.com

mkdir gorilla
cd gorilla
git clone git://github.com/gorilla/context.git
git clone git://github.com/gorilla/mux.git
git clone git://github.com/gorilla/securecookie.git
cd ..

mkdir go-authboss
cd go-authboss
git clone git://github.com/go-authboss/authboss.git
cd ..

mkdir lionelbarrow
cd lionelbarrow
git clone git://github.com/lionelbarrow/braintree-go.git
echo '
func (g *Braintree) SetHTTPClient(client *http.Client) {
	g.HttpClient = client
}' >> braintree-go/braintree.go # Temporary workaround for GAE support
cd ..

mkdir justinas
cd justinas
git clone git://github.com/justinas/nosurf.git
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
rm -rf !(AUTHORS|CONTRIBUTING.md|CONTRIBUTORS|LICENSE|PATENTS|README|html|context)
cd ..

git clone git://github.com/golang/crypto.git
git clone git://github.com/golang/oauth2.git
git clone git://github.com/golang/text.git

cd ../..

find . -name .git -exec rm -rf {} \; 2> /dev/null

cd ..
chmod -R 700 .

cd "${dir}"
