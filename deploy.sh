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

for d in cyph.im ; do
	cd $d

	# Cache bust
	for f in `find . -type f` ; do
		safeF=$(echo "$f" | sed 's/\.\///g' | sed 's/\//\\\//g' | sed 's/ /\\ /g' | sed 's/\_/\\_/g')

		for g in index.html js/*.js css/*.css ; do
			if ( grep -o $safeF $g ) ; then
				cat $g | perl -pe "s/(\\/$safeF)/\1?`md5 "$f" | perl -pe 's/.* = //g'`/g" > $g.new
				mv $g.new $g
			fi
		done
	done

	cp index.html en.html
	../translate.py
	sed -i.bak "s/{BALLS: true}/`cat ../languages.json | perl -pe 's/\s+//g' | sed 's/\\\\{/\\\\\\\\{/g' | sed 's/\\\\}/\\\\\\\\}/g'`/" \
		js/translate.js
	cd ..
done

echo 'JS Minify'
find . -name '*.js' | grep -v lib/bower_components/otr | grep -v '\.min\.js' | xargs -I% uglifyjs '%' -o '%'
echo 'CSS Minify'
find . -name '*.css' | xargs -I% cleancss -o '%' '%'
echo 'HTML Minify'
find . -name '*.html' | xargs -I% html-minifier --minify-js --minify-css --remove-comments --collapse-whitespace '%' -o '%'

ls */*.yaml | xargs -I% sed -i.bak 's/max-age=0/max-age=604800/g' %

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

../git.sh translations

cd "${dir}"
