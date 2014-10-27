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

for d in cyph.im ; do
	cd $d
	cp index.html en.html
	../translate.py
	cd ..
done

find . -name '*.js' | grep -v lib | xargs -I% uglifyjs "%" -o "%"
find . -name '*.css' | xargs -I% cleancss -o "%" "%"
find . -name '*.html' | xargs -I% html-minifier --minify-js --minify-css --remove-comments --collapse-whitespace "%" -o "%"

ls */*.yaml | xargs -I% appcfg.py rollback %
goapp deploy default/app.yaml cyph.com/cyph-com.yaml cyph.im/cyph-im.yaml cyph.me/cyph-me.yaml
# goapp deploy default/app.yaml `ls !(default)/*.yaml | tr '\n' ' '`

appcfg.py update_dispatch .

cd "${dir}"
