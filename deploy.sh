#!/bin/bash

dir="$(pwd)"
cd $(cd "$(dirname "$0")"; pwd) # $(dirname `readlink -f "${0}" || realpath "${0}"`)

staging=''
if [ "${1}" == '--staging' ] ; then 
	staging=true
	shift
fi

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

echo 'JS Minify'
find . -name '*.js' | grep -v lib | xargs -I% uglifyjs "%" -o "%"
echo 'CSS Minify'
find . -name '*.css' | xargs -I% cleancss -o "%" "%"
echo 'HTML Minify'
find . -name '*.html' | xargs -I% html-minifier --minify-js --minify-css --remove-comments --collapse-whitespace "%" -o "%"

if [ $staging ] ; then
	ls */*.yaml | xargs -I% sed -i.bak 's/version: prod/version: staging/g' %
fi

# ls */*.yaml | xargs -I% appcfg.py rollback %
goapp deploy default/app.yaml cyph.com/cyph-com.yaml cyph.im/cyph-im.yaml cyph.me/cyph-me.yaml
# goapp deploy default/app.yaml `ls !(default)/*.yaml | tr '\n' ' '`

appcfg.py update_dispatch .

cd "${dir}"
