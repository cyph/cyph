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
expect -c " \
	spawn jspm registry config github; \
	expect \"GitHub credentials\"; \
	send \"yes\n\"; \
	expect \"GitHub username\"; \
	send \"$(head -n1 ~/.cyph/github.token)\n\"; \
	expect \"GitHub password\"; \
	send \"$(tail -n1 ~/.cyph/github.token)\n\"; \
	expect \"test these credentials\"; \
	send \"yes\n\"; \
	interact; \
"
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

echo "$(cat config.js | tr '\n' '☁' | rev | cut -c 6- | rev | tr '☁' '\n')"',

  typescriptOptions: {
    "tsconfig": true
  },

  "meta": {
    "*.ts": {
      "loader": "ts"
    }
  },

  packages: {
    "cyph.im": {
      "main": "main",
      "defaultExtension": "ts"
    }
  }
});' > config.js.new
mv config.js.new config.js

jspm install -y \
	angular \
	angular2 \
	angular-material \
	npm:dompurify \
	npm:markdown-it \
	npm:markdown-it-sup \
	github:twitter/twemoji@1.3.2 \
	npm:markdown-it-emoji \
	github:isagalaev/highlight.js \
	github:siddii/angular-timer@1.2.1 \
	npm:animate.css \
	npm:base64 \
	jquery \
	jquery-legacy=jquery@^1 \
	npm:magnific-popup \
	npm:nanoscroller \
	npm:unsemantic \
	npm:wow \
	github:morr/jquery.appear \
	github:julianlam/tabIndent.js \
	npm:aws-sdk \
	npm:rxjs \
	es5-shim \
	es6-shim \
	crypto/libsodium=github:jedisct1/libsodium.js \
	crypto/ntru=github:cyph/ntru.js \
	crypto/isaac=github:rubycon/isaac.js \
	crypto/cryptojs=cryptojs

cd ../lib/js

cd github/isagalaev/highlight.js@*
sed -i 's/^build$//' .gitignore
npm install
node tools/build.js :common
rm -rf node_modules
cd ../../..

cd ..

rm -rf typings typings.json
typings install --ambient --save \
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
chmod -R 700 .

cd "${dir}"
