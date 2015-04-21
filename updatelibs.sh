#!/bin/bash

dir="$(pwd)"
scriptdir="$(cd "$(dirname "$0")"; pwd)"
cd "${scriptdir}"

rm -rf shared/lib shared/cryptolib
mkdir shared/lib shared/cryptolib
cd shared/lib

bower install --save \
	angular-material \
	markdown-it \
	markdown-it-sup \
	twemoji#1.3.2 \
	markdown-it-emoji \
	isagalaev/highlight.js \
	angular-timer#1.2.1 \
	animate.css \
	base64 \
	jquery \
	magnific-popup \
	nanoscroller \
	unsemantic \
	wow \
	morr/jquery.appear \
	julianlam/tabIndent.js \
	aws-sdk-js

cd bower_components/highlight.js
python tools/build.py default
cd ../..

mkdir aws-xml
cd aws-xml
npm install --save xml2js aws-sdk
browserify node_modules/aws-sdk/lib/xml/node_parser.js -s AWS_XML | uglifyjs -o ../aws-xml.js
cd ..
rm -rf aws-xml

tsd query --resolve --overwrite --save --action install \
	jquery \
	angularjs \
	angular-material \
	angular-animate \
	aws-sdk \
	cryptojs \
	highlightjs \
	MediaStream \
	RTCPeerConnection

cd ../cryptolib

bower install --save \
	mnaamani/otr4-em \
	rubycon/isaac.js

wget http://crypto-js.googlecode.com/svn/tags/3.1.2/build/rollups/hmac-sha256.js

cd "${dir}"
