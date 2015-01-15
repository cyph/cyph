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
	angular-markdown-directive \
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
	morr/jquery.appear

cd ../cryptolib

rm -rf .oldbower
mkdir .oldbower
mv bower* .oldbower/

bower install --save \
	mnaamani/otr4-em
	# openpgp

rm -rf openpgp
mkdir openpgp
cd openpgp
openpgpversion="$(curl -s https://github.com/openpgpjs/openpgpjs/releases/latest | perl -pe "s/.*tag\\/(.*?)['\"].*/\1/g")"
wget "https://github.com/openpgpjs/openpgpjs/releases/download/${openpgpversion}/openpgp.min.js"
wget "https://github.com/openpgpjs/openpgpjs/releases/download/${openpgpversion}/openpgp.worker.min.js"

cd "${dir}"
