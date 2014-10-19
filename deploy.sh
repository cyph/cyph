#!/bin/bash

dir="$(pwd)"
cd $(cd "$(dirname "$0")"; pwd) # $(dirname `readlink -f "${0}" || realpath "${0}"`)

comment="${*}"
test "${comment}" == "" && comment=deploy
./git.sh "${comment}"

rm -rf .build
mkdir .build
cp -rf * .build/
cd .build

cd default
mkdir -p github.com/gorilla
cd github.com/gorilla
git clone git://github.com/gorilla/mux.git
cd ../../..

cd cyph.im/lib
rm goog.appengine.Channel.js
wget https://api.cyph.com/_ah/channel/jsapi -O goog.appengine.Channel.js
cd ../..

find . -name '*.js' | grep -v '.min.js$' | xargs -I% uglifyjs "%" -o "%"

goapp deploy default/app.yaml cyph.com/cyph-com.yaml cyph.im/cyph-im.yaml cyph.me/cyph-me.yaml
# goapp deploy default/app.yaml `ls !(default)/*.yaml | tr '\n' ' '`

appcfg.py update_dispatch .

cd "${dir}"
