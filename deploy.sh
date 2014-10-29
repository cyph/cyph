#!/bin/bash

dir="$(pwd)"
cd $(cd "$(dirname "$0")"; pwd) # $(dirname `readlink -f "${0}" || realpath "${0}"`)

staging=true
if [ "${1}" == '--prod' ] ; then 
	staging=''
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

if [ "${staging}" == '' ] ; then
	for d in cyph.im ; do
		cd $d
		cp index.html en.html
		../translate.py
		cd ..
	done
fi

echo 'JS Minify'
find . -name '*.js' | grep -v lib | xargs -I% uglifyjs '%' -o '%'
echo 'CSS Minify'
find . -name '*.css' | xargs -I% cleancss -o '%' '%'
echo 'HTML Minify'
find . -name '*.html' | xargs -I% html-minifier --minify-js --minify-css --remove-comments --collapse-whitespace '%' -o '%'

if [ $staging ] ; then
	ls cyph.im/js/*.js | xargs -I% sed -i.bak 's/api.cyph.com/staging-dot-cyphme.appspot.com/g' %

	ls */*.yaml | xargs -I% sed -i.bak 's/version: prod/version: staging/g' %
	for yaml in `ls */cyph*.yaml` ; do
		cat $yaml | perl -pe 's/(- url: .*)/\1\n  login: admin/g' > $yaml.new
		mv $yaml.new $yaml
	done
fi

# ls */*.yaml | xargs -I% appcfg.py rollback %
goapp deploy default/app.yaml cyph.com/cyph-com.yaml cyph.im/cyph-im.yaml cyph.me/cyph-me.yaml
# goapp deploy default/app.yaml `ls !(default)/*.yaml | tr '\n' ' '`

appcfg.py update_dispatch .

cd "${dir}"
