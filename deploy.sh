#!/bin/bash

dir="$(pwd)"
cd $(cd "$(dirname "$0")"; pwd) # $(dirname `readlink -f "${0}" || realpath "${0}"`)

# TODO: Find a more robust way of handling arguments

all=''
nobackend=''
test=true
if [ "${1}" == '--prod' ] ; then
	test=''
	shift
elif [ "${1}" == '--prodnobackend' ] ; then
	test=''
	nobackend=true
	shift
elif [ "${1}" == '--all' ] ; then
	all=true
	test=''
	shift
fi

site=''
if [ "${1}" == '--site' ] ; then
	shift
	site="${1}"
	shift
fi

comment="${*}"
test "${comment}" == "" && comment=deploy
./git.sh "${comment}"

rm -rf .build
mkdir .build
cp -rf * .build/
cd .build


# Branch config setup
branch="$(git branch | awk '/^\*/{print $2}')"
if [ $branch == 'prod' ] ; then
	branch='staging'
fi
ls */*.yaml | xargs -I% sed -i.bak "s/version: master/version: ${branch}/g" %


for d in cyph.im cyph.com ; do
	cd $d

	# Cache bust
	find . -type f -print0 | while read -d $'\0' f ; do
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
find . -name '*.js' | grep -v '\.oldbower' | grep -v cryptolib | grep -v '\.min\.js' | xargs -I% uglifyjs '%' -o '%'
echo 'CSS Minify'
find . -name '*.css' | xargs -I% cleancss -o '%' '%'
echo 'HTML Minify'
find . -name '*.html' | xargs -I% html-minifier --minify-js --minify-css --remove-comments --collapse-whitespace '%' -o '%'

ls */*.yaml | xargs -I% sed -i.bak 's/max-age=0/max-age=604800/g' %

if [ $test ] ; then
	ls cyph.im/js/*.js | xargs -I% sed -i.bak "s/api.cyph.com/${branch}-dot-cyphme.appspot.com/g" %

	# ls */*.yaml | xargs -I% sed -i.bak 's/version: prod/version: staging/g' %
	for yaml in `ls */cyph*.yaml` ; do
		cat $yaml | perl -pe 's/(- url: .*)/\1\n  login: admin/g' > $yaml.new
		mv $yaml.new $yaml
	done
else
	ls */*.yaml | xargs -I% sed -i.bak 's/version: staging/version: prod/g' %
fi

if [ "${nobackend}" == '' ] ; then
	cd default

	mkdir -p github.com/gorilla
	cd github.com/gorilla
	git clone git://github.com/gorilla/mux.git
	cd ../..

	# mkdir -p github.com/oschwald
	# cd github.com/oschwald
	# git clone git://github.com/oschwald/maxminddb-golang.git
	# git clone git://github.com/oschwald/geoip2-golang.git
	# cd ../..

	cd ..
	goapp deploy default/app.yaml
fi

if [ $site ] ; then
	goapp deploy $site/*.yaml
else
	# ls */*.yaml | xargs -I% appcfg.py rollback %
	goapp deploy cyph.com/cyph-com.yaml cyph.im/cyph-im.yaml cyph.me/cyph-me.yaml
	# goapp deploy default/app.yaml `ls !(default)/*.yaml | tr '\n' ' '`
fi

appcfg.py update_dispatch .
ls */cron.yaml | sed 's/cron.yaml//g' | xargs -I% appcfg.py update_cron %

if [ $all ] ; then
	../deploy.sh
else
	../git.sh translations
fi

cd "${dir}"
