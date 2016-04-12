#!/bin/bash

source ~/.bashrc

dir="$(pwd)"
cd $(cd "$(dirname "$0")"; pwd)/..

rm -rf shared/lib shared/cryptolib
mkdir shared/lib shared/cryptolib
cd shared/lib

bower install --save \
	angularjs \
	angular2=angular/angular#builds-js \
	angular-material \
	dompurify \
	markdown-it \
	markdown-it-sup \
	twemoji#1.3.2 \
	markdown-it-emoji \
	isagalaev/highlight.js \
	angular-timer#1.2.1 \
	animate.css \
	base64 \
	jquery \
	jquery-legacy=jquery#^1 \
	magnific-popup \
	nanoscroller \
	unsemantic \
	wow \
	morr/jquery.appear \
	julianlam/tabIndent.js \
	aws-sdk-js \
	ReactiveX/RxJS \
	es5-shim \
	es6-shim

mkdir -p bower_components/highlight.js
cd bower_components/highlight.js
sed -i 's/^build$//' .gitignore
npm install
node tools/build.js :common
cd ../..

cd bower_components/RxJS
sed -i 's/^dist\/$//' .gitignore
sed -i 's/.*"ghooks".*//' package.json
npm install
npm run build_global
cd ..
mv RxJS RxJS.old
mkdir rxjs
mv RxJS.old/dist/cjs/*.ts rxjs/
mv RxJS.old/spec/es5.d.ts rxjs/
mv RxJS.old/dist/global rxjs/
rm -rf RxJS.old
cd ..

mkdir aws-xml
cd aws-xml
npm install --save xml2js aws-sdk
browserify node_modules/aws-sdk/lib/xml/node_parser.js -s AWS_XML | uglifyjs -o ../aws-xml.js
cd ..
rm -rf aws-xml

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
wget 'https://apis.google.com/_/scs/apps-static/_/js/k=oz.gapi.en_US.oO8S-egwhbo.O/m=plusone/rt=j/sv=1/d=1/ed=1/am=AQ/rs=AGLTcCMTmhp2qDg1r4JcSsKYaexs1H-FGA/t=zcms/cb=gapi.loaded_0' -O google/plusone.helper.js
mkdir facebook ; wget https://connect.facebook.net/en_US/sdk.js -O facebook/sdk.js
mkdir disqus ; wget https://cyph.disqus.com/embed.js -O disqus/embed.js
cd ..

cd ../cryptolib

bower install --save \
	libsodium.js#master \
	rubycon/isaac.js \
	cyph/ntru.js

wget https://crypto-js.googlecode.com/svn/tags/3.1.2/build/rollups/hmac-sha256.js


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
