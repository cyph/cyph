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
	highlight.js \
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

bower install --save mnaamani/otr4-em

cd "${dir}"
