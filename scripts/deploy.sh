#!/bin/bash

dir="$(pwd)"
cd $(cd "$(dirname "$0")"; pwd)

# TODO: Find a more robust way of handling arguments

all=''
test=true
if [ "${1}" == '--prod' ] ; then
	test=''
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
scripts/git.sh "${comment}"

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

ls */js/cyph/env.ts | xargs -I% sed -i.bak "s/http:\/\/localhost:4568//g" %

if [ $test ] ; then
	sed -i.bak "s/staging/${branch}/g" default/config.go
	ls */js/cyph/env.ts | xargs -I% sed -i.bak "s/http:\/\/localhost:8080/https:\/\/${branch}-dot-cyphme.appspot.com/g" %
	ls */js/cyph/env.ts | xargs -I% sed -i.bak "s/http:\/\/localhost:8081/https:\/\/${branch}-dot-cyph-com-dot-cyphme.appspot.com/g" %
	ls */js/cyph/env.ts | xargs -I% sed -i.bak "s/http:\/\/localhost:8082/https:\/\/${branch}-dot-cyph-im-dot-cyphme.appspot.com/g" %
	ls */js/cyph/env.ts | xargs -I% sed -i.bak "s/http:\/\/localhost:8083/https:\/\/${branch}-dot-cyph-me-dot-cyphme.appspot.com/g" %

	for yaml in `ls */cyph*.yaml` ; do
		cat $yaml | perl -pe 's/(- url: .*)/\1\n  login: admin/g' > $yaml.new
		mv $yaml.new $yaml
	done
else
	ls */js/cyph/env.ts | xargs -I% sed -i.bak "s/http:\/\/localhost:8080/https:\/\/api.cyph.com/g" %
	ls */js/cyph/env.ts | xargs -I% sed -i.bak "s/http:\/\/localhost:8081/https:\/\/www.cyph.com/g" %
	ls */js/cyph/env.ts | xargs -I% sed -i.bak "s/http:\/\/localhost:8082/https:\/\/www.cyph.im/g" %
	ls */js/cyph/env.ts | xargs -I% sed -i.bak "s/http:\/\/localhost:8083/https:\/\/www.cyph.me/g" %

	ls */*.yaml | xargs -I% sed -i.bak 's/max-age=0/max-age=31536000/g' %
	ls */*.yaml | xargs -I% sed -i.bak 's/version: staging/version: prod/g' %
fi


# Compile + translate + minify
for d in cyph.im cyph.com ; do
	cd translations

	echo "Translations = { \
		$(echo "$( \
			ls | \
			sed 's/\.json//' | \
			xargs -I% bash -c 'echo -n "\"%\": $(cat %.json | tr "\n" " "),"')" | \
			rev | \
			cut -c 2- | \
			rev \
		) \
	};" >> ../$d/js/preload/translations.ts

	cd ../$d

	../scripts/build.sh || exit;

	if [ "${branch}" == 'staging' ] ; then
		echo "JS Minify ${d}"
		find js -name '*.js' | xargs -I% uglifyjs -r \
			importScripts,Cyph,vars,self,isaac,onmessage,postMessage,onthreadmessage,WebSign,Translations,IS_WEB,crypto \
			'%' -o '%' -m

		echo "CSS Minify ${d}"
		find css -name '*.css' | grep -v bourbon/ | xargs -I% cleancss -o '%' '%'
		echo "HTML Minify ${d}"
		ls index.html | xargs -I% html-minifier --minify-js --minify-css --remove-comments --collapse-whitespace '%' -o '%'
	fi

	cd ..
done

# Cache bust
echo "Cache bust"
find shared ! -wholename '*fonts/*' ! -wholename '*twemoji*' ! -wholename '*websign*' -type f -print0 | while read -d $'\0' f ; do
	f="$(echo "$f" | sed 's/shared\///g')"
	safeF="$(echo "$f" | sed 's/\//\\\//g' | sed 's/ /\\ /g' | sed 's/\_/\\_/g')"

	for d in cyph.com ; do
		cd $d

		for g in index.html $(find js -name '*.js') $(find css -name '*.css') ; do
			if ( grep -o "$safeF" $g ) ; then
				cat $g | perl -pe "s/(\\/$safeF)/\1?`md5 "$f" | perl -pe 's/.* = //g'`/g" > $g.new
				mv $g.new $g
			fi
		done

		cd ..
	done
done


### WebSign-related stuff
for d in cyph.im ; do
	cd $d

	echo 'WebSign'

	# Merge in base64'd images and audio, BUT NOT fonts (they add 7mb)
	find img audio -type f -print0 | while read -d $'\0' f ; do
		for g in index.html $(find js -name '*.js') $(find css -name '*.css') ; do
			if ( grep -o "$f" $g ) ; then
				dataURI="data:$(echo -n "$(file --mime-type "$f")" | perl -pe 's/.*\s+(.*?)$/\1/g');base64,$(base64 "$f")"

				echo "s|/$f|$dataURI|g" > $g.tmp
				sed -i.bak -f $g.tmp $g
				rm $g.tmp $g.bak
			fi
		done
	done

	# Merge imported libraries into threads
	find js -name '*.js' | xargs -I% ../scripts/websign/threadpack.js %

	if [ $test ] ; then
		../scripts/websign/pack.py index.html pkg.html
	else
		../scripts/websign/pack.py index.html $d.pkg
		mv websign.html index.html

		currentDir="$(pwd)"
		cd ../../..
		git clone git@github.com:cyph/cyph.github.io.git github.io
		cd github.io
		git reset --hard
		git clean -f
		git pull

		cp -f $currentDir/$d.pkg websign/

		HASH_TTL=3944620 # 1.5 months
		echo "\
{
	\"hash\": \"$(shasum -p -a 512 websign/$d.pkg | perl -pe 's/(.*) .*/\1/')\",
	\"timestamp\": $(date +%s)000,
	\"expires\": $(($(date +%s)+${HASH_TTL}))000
}" | gpg --clearsign > websign/$d.hash

		# Temporary measure, in preparation for requiring two signatures on each release
		cat websign/$d.hash | gpg --clearsign -u 'Alternate Key' > websign/$d.hash2
		cp -f websign/$d.hash2 websign/$d.hash

		git add .
		chmod -R 777 .
		git commit -a -m 'package update'
		git push
		cd $currentDir
	fi

	cd ..
done


find . -name '*.bak' | xargs rm


# AWS credentials
cat /home/.config/cyph-jobs.vars >> jobs/jobs.yaml

if [ $site ] ; then
	goapp deploy $site/*.yaml
else
	goapp deploy default/app.yaml jobs/jobs.yaml cyph.com/cyph-com.yaml cyph.im/cyph-im.yaml cyph.me/cyph-me.yaml
fi

appcfg.py update_dispatch .
appcfg.py -A cyphme update_cron .

if [ $all ] ; then
	../scripts/deploy.sh
fi

cd "${dir}"
