#!/bin/bash

dir="$(pwd)"
scriptdir="$(cd "$(dirname "$0")"; pwd)" # $(dirname `readlink -f "${0}" || realpath "${0}"`)
cd "${scriptdir}"

rm -rf shared/lib shared/cryptolib
mkdir shared/lib shared/cryptolib
cd shared/lib

bower install --save \
	angular-material#0.7.1 \
	markdown-it \
	markdown-it-sup \
	twemoji \
	markdown-it-emoji \
	angular-timer \
	animate.css \
	base64 \
	jquery \
	magnific-popup \
	nanoscroller \
	unsemantic \
	visibilityjs \
	wow \
	morr/jquery.appear \
	julianlam/tabIndent.js

wget https://cdnjs.cloudflare.com/ajax/libs/highlight.js/8.4/styles/default.min.css -O highlight.js.min.css
wget https://cdnjs.cloudflare.com/ajax/libs/highlight.js/8.4/highlight.min.js -O highlight.min.js

cd ../cryptolib

bower install --save \
	mnaamani/otr4-em \
	rubycon/isaac.js
	# openpgp

wget http://crypto-js.googlecode.com/svn/tags/3.1.2/build/rollups/sha512.js

mkdir openpgp
cd openpgp
wget "https://raw.githubusercontent.com/openpgpjs/openpgpjs/master/dist/openpgp.min.js"
wget "https://raw.githubusercontent.com/openpgpjs/openpgpjs/master/dist/openpgp.worker.min.js"

cd "${dir}"
