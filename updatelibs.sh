#!/bin/bash

dir="$(pwd)"
scriptdir="$(cd "$(dirname "$0")"; pwd)" # $(dirname `readlink -f "${0}" || realpath "${0}"`)
cd "${scriptdir}"

cd shared/lib

rm -rf .oldbower
mkdir .oldbower
mv bower* .oldbower/

bower install --save \
	angular-material \
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
	showdown \
	unsemantic \
	visibilityjs \
	wow \
	rubycon/isaac.js \
	morr/jquery.appear \
	julianlam/tabIndent.js

wget https://cdnjs.cloudflare.com/ajax/libs/highlight.js/8.4/styles/default.min.css -O highlight.js.min.css
wget https://cdnjs.cloudflare.com/ajax/libs/highlight.js/8.4/highlight.min.js

cd ../cryptolib

rm -rf .oldbower
mkdir .oldbower
mv bower* .oldbower/

bower install --save mnaamani/otr4-em

cd "${dir}"
