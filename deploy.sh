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


# Translate + minify
for d in cyph.im cyph.com ; do
	cd $d

	../translate.py

	if [ "${branch}" == 'staging' ] ; then
		# Minify
		echo "JS Minify ${d}"
		ls js/*.js | xargs -I% uglifyjs '%' -o '%' -m
		echo "CSS Minify ${d}"
		ls css/*.css | xargs -I% cleancss -o '%' '%'
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

		for g in index.html js/*.js css/*.css ; do
			if ( grep -o "$safeF" $g ) ; then
				cat $g | perl -pe "s/(\\/$safeF)/\1?`md5 "$f" | perl -pe 's/.* = //g'`/g" > $g.new
				mv $g.new $g
			fi
		done

		cd ..
	done
done


ls */*.yaml | xargs -I% sed -i.bak 's/max-age=0/max-age=31536000/g' %

if [ $test ] ; then
	sed -i.bak "s/staging/${branch}/g" default/config.go
	ls cyph.im/js/*.js | xargs -I% sed -i.bak "s/api.cyph.com/${branch}-dot-cyphme.appspot.com/g" %

	# ls */*.yaml | xargs -I% sed -i.bak 's/version: prod/version: staging/g' %

	# Disabling admin restriction on test environments for now
	# for yaml in `ls */cyph*.yaml` ; do
	# 	cat $yaml | perl -pe 's/(- url: .*)/\1\n  login: admin/g' > $yaml.new
	# 	mv $yaml.new $yaml
	# done
else
	ls */*.yaml | xargs -I% sed -i.bak 's/version: staging/version: prod/g' %

	### WebSign-related stuff
	for d in cyph.im ; do
		cd $d

		echo 'WebSign'

		# Merge in base64'd images and audio, BUT NOT fonts (they add 7mb)
		find img audio -type f -print0 | while read -d $'\0' f ; do
			for g in index.html js/*.js css/*.css ; do
				if ( grep -o "$f" $g ) ; then
					dataURI="data:$(echo -n "$(file --mime-type "$f")" | perl -pe 's/.*\s+(.*?)$/\1/g');base64,$(base64 "$f")"

					echo "s|/$f|$dataURI|g" > $g.tmp
					sed -i.bak -f $g.tmp $g
					rm $g.tmp $g.bak
				fi
			done
		done

		# Merge imported libraries into Worker
		../websignworkerpackager.js js/cryptoWebWorker.js

		../websignpackager.py
		mv index.html $d.pkg
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

		git add .
		chmod -R 777 .
		git commit -a -m 'package update'
		git push
		cd $currentDir

		cd ..
	done
fi


find . -name '*.bak' | xargs rm


if [ "${nobackend}" == '' ] ; then
	# AWS credentials
	cat ~/.config/cyph-jobs.vars >> jobs/jobs.yaml

	goapp deploy default/app.yaml jobs/jobs.yaml
fi

if [ $site ] ; then
	goapp deploy $site/*.yaml
else
	# ls */*.yaml | xargs -I% appcfg.py rollback %
	goapp deploy cyph.com/cyph-com.yaml cyph.im/cyph-im.yaml cyph.me/cyph-me.yaml
	# goapp deploy default/app.yaml `ls !(default)/*.yaml | tr '\n' ' '`
fi

appcfg.py update_dispatch .
appcfg.py -A cyphme update_cron .

if [ $all ] ; then
	../deploy.sh
fi

cd "${dir}"
