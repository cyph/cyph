#!/bin/bash

source ~/.bashrc

dir="$(pwd)"
cd $(cd "$(dirname "$0")"; pwd)/..

gcloud auth login

test=true
if [ "${1}" == '--prod' ] ; then
	test=''
	shift
elif [ "${1}" == '--simple' ] ; then
	simple=true
	shift
fi

site=''
if [ "${1}" == '--site' ] ; then
	shift
	site="${1}"
	shift
fi

comment="${*}"
if [ "${comment}" == "" -a ! "${simple}" ] ; then
	comment=deploy
fi
if [ "${comment}" ] ; then
	./commands/commit.sh "${comment}"
fi

rm -rf .build
mkdir .build
cp -rf * .build/
cd .build

for project in cyph.com cyph.im cyph.video cyph.audio ; do
	cp -rf shared/* $project/
done


# Branch config setup
branch="$(git describe --tags --exact-match 2> /dev/null || git branch | awk '/^\*/{print $2}')"
if [ $branch == 'prod' ] ; then
	branch='staging'
fi
version="$branch"
if [ $test ] ; then
	version="$(git config --get remote.origin.url | perl -pe 's/.*:(.*)\/.*/\1/' | tr '[:upper:]' '[:lower:]')-${version}"
fi
if [ $simple ] ; then
	version="simple-${version}"
fi


if [ ! $simple ] ; then
	defaultHeadersString='# default_headers'
	defaultHeaders="$(cat headers.yaml)"
	ls */*.yaml | xargs -I% sed -ri "s/  ${defaultHeadersString}(.*)/\
		headers=\"\$(cat headers.yaml)\" ; \
		for header in \1 ; do \
			headers=\"\$(echo \"\$headers\" | grep -v \$header:)\" ; \
		done ; \
		echo \"\$headers\" \
	/ge" %
	ls */*.yaml | xargs -I% sed -i 's|###| |g' %

	defaultCSPString='DEFAULT_CSP'
	fullCSP="$(cat shared/websign/csp | tr -d '\n')"
	coreCSP="$(cat shared/websign/csp | grep -P 'referrer|script-src|style-src|upgrade-insecure-requests' | tr -d '\n')"
	cyphComCSP="$(cat shared/websign/csp | tr -d '\n' | sed 's|frame-src|frame-src https://*.facebook.com https://*.braintreegateway.com|g')"
	ls cyph.com/*.yaml | xargs -I% sed -i "s|${defaultCSPString}|\"${cyphComCSP}\"|g" %
	ls */*.yaml | xargs -I% sed -i "s|${defaultCSPString}|\"${coreCSP}\"|g" %
	ls */js/cyph/envdeploy.ts | xargs -I% sed -i "s|${defaultCSPString}|${fullCSP}|g" %

	# Expand connect-src and frame-src on blog to support social media widgets and stuff

	blogCSPSources="$(cat cyph.com/blog/csp | perl -pe 's/^(.*)$/https:\/\/\1 https:\/\/*.\1/g' | tr '\n' ' ')"

	cat cyph.com/cyph-com.yaml | \
		tr '\n' '☁' | \
		perl -pe 's/(\/blog.*?connect-src '"'"'self'"'"' )(.*?frame-src )(.*?connect-src '"'"'self'"'"' )(.*?frame-src )(.*?connect-src '"'"'self'"'"' )(.*?frame-src )/\1☼ \2☼ \3☼ \4☼ \5☼ \6☼ /g' | \
		sed "s|☼|${blogCSPSources}|g" | \
		tr '☁' '\n' | \
		sed "s|Cache-Control: private, max-age=31536000|Cache-Control: public, max-age=31536000|g" \
	> cyph.com/new.yaml
	mv cyph.com/new.yaml cyph.com/cyph-com.yaml
fi

defaultHost='\${locationData\.protocol}\/\/\${locationData\.hostname}:'
ls */js/cyph/envdeploy.ts | xargs -I% sed -i "s/${defaultHost}43000//g" %
ls */js/cyph/envdeploy.ts | xargs -I% sed -i 's/isLocalEnv: boolean		= true/isLocalEnv: boolean		= false/g' %

if [ $branch == 'staging' ] ; then
	sed -i "s/false, \/\* IsProd \*\//true,/g" default/config.go
fi

if [ $test ] ; then
	sed -i "s/staging/${version}/g" default/config.go
	sed -i "s/http:\/\/localhost:42000/https:\/\/${version}-dot-cyphme.appspot.com/g" default/config.go
	ls */*.yaml */js/cyph/envdeploy.ts | xargs -I% sed -i "s/api.cyph.com/${version}-dot-cyphme.appspot.com/g" %
	ls */*.yaml */js/cyph/envdeploy.ts | xargs -I% sed -i "s/www.cyph.com/${version}-dot-cyph-com-dot-cyphme.appspot.com/g" %
	ls */js/cyph/envdeploy.ts | xargs -I% sed -i "s/${defaultHost}42000/https:\/\/${version}-dot-cyphme.appspot.com/g" %
	ls */js/cyph/envdeploy.ts | xargs -I% sed -i "s/${defaultHost}42001/https:\/\/${version}-dot-cyph-com-dot-cyphme.appspot.com/g" %
	ls */js/cyph/envdeploy.ts | xargs -I% sed -i "s/${defaultHost}42002/https:\/\/${version}-dot-cyph-im-dot-cyphme.appspot.com/g" %
	ls */js/cyph/envdeploy.ts | xargs -I% sed -i "s/CYPH-ME/https:\/\/${version}-dot-cyph-me-dot-cyphme.appspot.com/g" %
	ls */js/cyph/envdeploy.ts | xargs -I% sed -i "s/CYPH-VIDEO/https:\/\/${version}-dot-cyph-video-dot-cyphme.appspot.com/g" %
	ls */js/cyph/envdeploy.ts | xargs -I% sed -i "s/CYPH-AUDIO/https:\/\/${version}-dot-cyph-audio-dot-cyphme.appspot.com/g" %

	# Disable caching and HPKP in test environments
	ls */*.yaml | xargs -I% sed -i 's/Public-Key-Pins: .*/Pragma: no-cache/g' %
	ls */*.yaml | xargs -I% sed -i 's/max-age=31536000/max-age=0/g' %

	for yaml in `ls */cyph*.yaml` ; do
		cat $yaml | perl -pe 's/(- url: .*)/\1\n  login: admin/g' > $yaml.new
		mv $yaml.new $yaml
	done
else
	sed -i "s/http:\/\/localhost:42000/https:\/\/api.cyph.com/g" default/config.go
	ls */js/cyph/envdeploy.ts | xargs -I% sed -i "s/${defaultHost}42000/https:\/\/api.cyph.com/g" %
	ls */js/cyph/envdeploy.ts | xargs -I% sed -i "s/${defaultHost}42001/https:\/\/www.cyph.com/g" %
	ls */js/cyph/envdeploy.ts | xargs -I% sed -i "s/${defaultHost}42002/https:\/\/cyph.im/g" %
	ls */js/cyph/envdeploy.ts | xargs -I% sed -i "s/CYPH-ME/https:\/\/cyph.me/g" %
	ls */js/cyph/envdeploy.ts | xargs -I% sed -i "s/CYPH-VIDEO/https:\/\/cyph.video/g" %
	ls */js/cyph/envdeploy.ts | xargs -I% sed -i "s/CYPH-AUDIO/https:\/\/cyph.audio/g" %

	version=prod
fi


# Blog
cd cyph.com
sed -i 's|blog/build|blog|g' cyph-com.yaml
mv blog blag
rm -rf blag/theme/_posts 2> /dev/null
mv blag/posts blag/theme/_posts
cd blag/theme
jekyll build --destination ../../blog
cd ../..
rm -rf blag
cd ..


# Compile + translate + minify
for d in cyph.com cyph.im ; do
	if [ $simple ] ; then
		cd $d
	else
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
		};" > ../$d/js/preload/translations.ts

		cd ../$d
	fi

	../commands/build.sh --prod || exit;

	if [ ! $simple ] ; then
		echo "JS Minify ${d}"
		find js -name '*.js' | xargs -I% uglifyjs '%' \
			-m \
			-c dead_code=true,unused=true \
			-r importScripts,Cyph,ui,session,locals,threadSetupVars,self,isaac,onmessage,postMessage,onthreadmessage,WebSign,Translations,IS_WEB,crypto \
			-o '%'

		echo "CSS Minify ${d}"
		find css -name '*.css' | grep -v bourbon/ | xargs -I% cleancss -o '%' '%'

		echo "HTML Minify ${d}"
		html-minifier --minify-js --minify-css --remove-comments --collapse-whitespace index.html -o index.html.new
		mv index.html.new index.html
	fi

	cd ..
done


if [ ! $simple ] ; then
	# Cache bust
	for d in cyph.com ; do
		cd $d

		echo 'Cache bust'

		node -e '
			const superSphincs		= require("supersphincs");

			const filesToCacheBust	= child_process.spawnSync("find", [
				".",
				"-type",
				"f",
				"-not",
				"-path",
				"*websign*"
			]).stdout.toString().trim().split("\n").map(s => s.slice(2));

			const filesToModify		= child_process.spawnSync("find", [
				".",
				"-name",
				"*.html",
				"-or",
				"-name",
				"*.js",
				"-or",
				"-name",
				"*.css",
				"-and",
				"-type",
				"f"
			]).stdout.toString().trim().split("\n");


			filesToModify.reduce((promise, file) => promise.then(() => {
				const originalContent	= fs.readFileSync(file).toString();

				return filesToCacheBust.reduce((contentPromise, subresource) =>
					contentPromise.then(content => {
						if (content.indexOf(subresource) < 0) {
							return content;
						}

						return superSphincs.hash(
							fs.readFileSync(subresource).toString()
						).then(hash =>
							content.split(subresource).join(`${subresource}?${hash.hex}`)
						);
					})
				, Promise.resolve(originalContent)).then(content => {
					if (content !== originalContent) {
						fs.writeFileSync(file, content);
					}
				});
			}), Promise.resolve());
		'

		cd ..
	done

	# WebSign preprocessing
	for d in cyph.im cyph.video cyph.audio ; do
		cd $d

		echo 'WebSign'

		# Merge in base64'd images, fonts, video, and audio
		node -e '
			const datauri		= require("datauri");

			const filesToMerge	= child_process.spawnSync("find", [
				"audio",
				"fonts",
				"img",
				"video",
				"-type",
				"f"
			]).stdout.toString().trim().split("\n");

			const filesToModify	= ["js", "css"].reduce((arr, ext) =>
				arr.concat(
					child_process.spawnSync("find", [
						ext,
						"-name",
						"*." + ext,
						"-type",
						"f"
					]).stdout.toString().trim().split("\n")
				),
				["index.html"]
			);


			for (let file of filesToModify) {
				const originalContent	= fs.readFileSync(file).toString();
				let content				= originalContent;

				for (let subresource of filesToMerge) {
					if (content.indexOf(subresource) < 0) {
						continue;
					}

					const dataURI	= datauri.sync(subresource);

					content	= content.
						replace(
							new RegExp(`(src|href)=(\\\\?['"'"'"])/?${subresource}\\\\?['"'"'"]`, "g"),
							`WEBSIGN-SRI-DATA-START☁$2☁☁☁${dataURI}☁WEBSIGN-SRI-DATA-END`
						).replace(
							new RegExp(`/?${subresource}`, "g"),
							dataURI
						).replace(
							/☁☁☁/g,
							`☁${subresource}☁`
						)
					;
				}

				if (content !== originalContent) {
					fs.writeFileSync(file, content);
				}
			}
		'

		# Merge imported libraries into threads
		find js -name '*.js' | xargs -I% ../commands/websign/threadpack.js %

		websignhashes=''
		project="${d}"
		if [ $test ] ; then
			project="${version}.${d}"

			cat websign/js/main.js | \
				tr '\n' '☁' | \
				perl -pe 's/\/\*.*?\/\*/\/\*/' | \
				tr '☁' '\n' \
			> websign/js/main.js.new
			mv websign/js/main.js.new websign/js/main.js

			sed -i "s|location.host|'${project}'|g" websign/js/main.js
			sed -i "s|api.cyph.com|${version}-dot-cyphme.appspot.com|g" websign/js/config.js

			websignhashes="{\"$(../commands/websign/bootstraphash.sh ${d})\": true}"
		else
			websignhashes="$(cat websignhashes.json)"
		fi

		../commands/websign/pack.js --sri --minify index.html pkg

		../commands/websign/pack.js websign/index.html index.html
		mv websign/serviceworker.js ./
		mv websign/unsupportedbrowser.html ./
		rm websign/index.html

		find . \
			-mindepth 1 -maxdepth 1 \
			-not -name 'pkg*' \
			-not -name '*.html' \
			-not -name '*.js' \
			-not -name '*.yaml' \
			-not -name 'websign' \
			-not -name 'img' \
			-not -name 'favicon.ico' \
			-exec rm -rf {} \;

		cd ..

		if [ -d cdn ] ; then
			for repo in cdn github.io ; do
				cd $repo
				git reset --hard
				git clean -f
				git pull
				cd ..
			done
		else
			git clone git@github.com:cyph/cdn.git
			git clone git@github.com:cyph/cyph.github.io.git github.io
		fi

		rm -rf cdn/${project} github.io/${project}

		echo "Press enter to initiate signing process for ${project}."
		read

		./commands/websign/sign.js \
			"${websignhashes}" \
			${d}/pkg \
			cdn/${project} \
		|| exit 1

		if [ -d ${d}/pkg-subresources ] ; then
			mv ${d}/pkg-subresources/* cdn/${project}/
			rm -rf ${d}/pkg-subresources
		fi

		cp -rf cdn/${project} github.io/

		zopfli -i1000 $(find cdn/${project} -type f)
		find cdn/${project} -type f -not -name '*.gz' -exec rm {} \;

		for repo in cdn github.io ; do
			cd $repo
			chmod -R 777 .
			git add .
			git commit -a -m 'package update'
			git push
			cd ..
		done
	done
fi


if [ ! $test ] ; then
	rm -rf */lib/js/crypto
fi


# Secret credentials
cat ~/.cyph/default.vars >> default/app.yaml
cat ~/.cyph/jobs.vars >> jobs/jobs.yaml
if [ $branch == 'staging' ] ; then
	cat ~/.cyph/braintree.prod >> default/app.yaml
else
	cat ~/.cyph/braintree.sandbox >> default/app.yaml
fi

deploy () {
	gcloud preview app deploy --quiet --no-promote --project cyphme --version $version $*
}

# Temporary workaround for cache-busting reverse proxies
if [ ! $test ] ; then
	for project in cyph.im cyph.video ; do
		cat $project/*.yaml | perl -pe 's/(service: cyph.*)/\1-update/' > $project/update.yaml
	done
fi

# Workaround for symlinks doubling up Google's count of the files toward its 10k limit
find . -type l -exec bash -c '
	original="$(readlink "{}")";
	parent="$(echo "{}" | perl -pe "s/(.*)\/.*?$/\1/g")";
	name="$(echo "{}" | perl -pe "s/.*\/(.*?)$/\1/g")"

	cd "${parent}"
	rm "${name}"
	mv "${original}" "${name}"
' \;

if [ $site ] ; then
	deploy $site/*.yaml
else
	deploy */*.yaml
fi

deploy dispatch.yaml cron.yaml

cd "${dir}"
