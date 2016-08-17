#!/bin/bash

source ~/.bashrc

dir="$(pwd)"
cd $(cd "$(dirname "$0")"; pwd)/..

shortlinkProjects='io me video audio'
compiledProjects='cyph.com cyph.im'


gcloud auth login

test=true
if [ "${1}" == '--prod' ] ; then
	test=''
	shift
elif [ "${1}" == '--simple' ] ; then
	simple=true
	shift
fi

commit=$test
if [ "${1}" == '--no-commit' ] ; then
	commit=''
	shift
fi

site=''
if [ "${1}" == '--site' ] ; then
	shift
	site="${1}"
	shift
fi

if [ "${commit}" ] ; then
	comment="${*}"
	if [ "${comment}" == "" -a ! "${simple}" ] ; then
		comment=deploy
	fi
	if [ "${comment}" ] ; then
		./commands/commit.sh "${comment}"
	fi
fi

rm -rf .build
mkdir .build
cp -rf * .build/
cd .build

for project in $compiledProjects ; do
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

projectname () {
	if [ $test ] ; then
		echo "${version}.${1}"
	else
		echo "${1}"
	fi
}

package="$(projectname cyph)"

setredirect () {
	cat > "${2}/index.html.tmp" <<- EOM
		<html☁manifest='/appcache.appcache'>
			<body>
				<script>navigator.serviceWorker.register('/serviceworker.js')</script>
				<script>
					var☁path	=
						'${1}' +
						location.toString().split(location.host)[1].replace('#', '').replace(/^\\//, '')
					;

					location	= 'https://${package}.ws' + (path ? ('/#' + path) : '').replace(/\\/\$/, '');
				</script>
			</body>
		</html>
	EOM

	cat > "${2}/appcache.appcache" <<- EOM
		CACHE MANIFEST

		CACHE:
		/
		/appcache.appcache
		/serviceworker.js

		NETWORK:
		*
	EOM

	cat > "${2}/serviceworker.js" <<- EOM
		var files	= [
			'/',
			'/appcache.appcache',
			'/serviceworker.js'
		].map(function (file) {
			return new Request(file);
		});

		var root	= files[0].url.replace(/(.*)\\/\$/, '\$1');

		self.addEventListener('install', function () {
			Promise.all([
				caches.open('cache'),
				Promise.all(files.map(function (file) {
					return fetch(file, {credentials: 'include'});
				}))
			]).then(function (results) {
				var cache		= results[0];
				var responses	= results[1];

				for (var i = 0 ; i < responses.length ; ++i) {
					cache.put(files[i], responses[i]);
				}
			});
		});

		self.addEventListener('fetch', function (e) {
			/* Let requests to other origins pass through */
			if (e.request.url.indexOf(root) !== 0) {
				return;
			}

			return e.respondWith(
				caches.match(e.request).then(function (cachedResponse) {
					if (cachedResponse) {
						return cachedResponse;
					}

					return Promise.all([
						caches.open('cache'),
						fetch(e.request.clone())
					]).then(function (results) {
						var cache		= results[0];
						var response	= results[1];

						cache.put(e.request, response.clone());

						return response;
					});
				})
			);
		});
	EOM

	echo -n '<!DOCTYPE html>' > "${2}/index.html"
	cat "${2}/index.html.tmp" | perl -pe 's/\s+//g' | tr '☁' ' ' >> "${2}/index.html"
	rm "${2}/index.html.tmp"
}


if [ ! $simple ] ; then
	defaultHeadersString='# default_headers'
	defaultHeaders="$(cat shared/headers)"
	ls */*.yaml | xargs -I% sed -ri "s/  ${defaultHeadersString}(.*)/\
		headers=\"\$(cat shared\/headers)\" ; \
		for header in \1 ; do \
			headers=\"\$(echo \"\$headers\" | grep -v \$header:)\" ; \
		done ; \
		echo \"\$headers\" \
	/ge" %
	ls */*.yaml | xargs -I% sed -i 's|###| |g' %

	defaultCSPString='DEFAULT_CSP'
	fullCSP="$(cat shared/csp | tr -d '\n')"
	webSignCSP="$(cat websign/csp | tr -d '\n')"
	cyphComCSP="$(cat shared/csp | tr -d '\n' | sed 's|frame-src|frame-src https://*.facebook.com https://*.braintreegateway.com|g')"
	ls cyph.com/*.yaml | xargs -I% sed -i "s|${defaultCSPString}|\"${cyphComCSP}\"|g" %
	ls */*.yaml | xargs -I% sed -i "s|${defaultCSPString}|\"${webSignCSP}\"|g" %
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

defaultHost='${locationData.protocol}//${locationData.hostname}:'
ls */js/cyph/envdeploy.ts | xargs -I% sed -i "s|${defaultHost}43000|https://cyphme.firebaseio.com|g" %
ls */js/cyph/envdeploy.ts | xargs -I% sed -i 's|isLocalEnv: boolean		= true|isLocalEnv: boolean		= false|g' %

if [ $branch == 'staging' ] ; then
	sed -i "s|false, /* IsProd */|true,|g" default/config.go
fi

if [ $test ] ; then
	sed -i "s|staging|${version}|g" default/config.go
	sed -i "s|http://localhost:42000|https://${version}-dot-cyphme.appspot.com|g" default/config.go
	ls */*.yaml */js/cyph/envdeploy.ts | xargs -I% sed -i "s|api.cyph.com|${version}-dot-cyphme.appspot.com|g" %
	ls */*.yaml */js/cyph/envdeploy.ts | xargs -I% sed -i "s|www.cyph.com|${version}-dot-cyph-com-dot-cyphme.appspot.com|g" %
	ls */js/cyph/envdeploy.ts | xargs -I% sed -i "s|${defaultHost}42000|https://${version}-dot-cyphme.appspot.com|g" %
	ls */js/cyph/envdeploy.ts | xargs -I% sed -i "s|${defaultHost}42001|https://${version}-dot-cyph-com-dot-cyphme.appspot.com|g" %
	ls */js/cyph/envdeploy.ts | xargs -I% sed -i "s|${defaultHost}42002|https://${version}-dot-cyph-im-dot-cyphme.appspot.com|g" %
	ls */js/cyph/envdeploy.ts | xargs -I% sed -i "s|CYPH-IO|https://${version}-dot-cyph-io-dot-cyphme.appspot.com|g" %
	ls */js/cyph/envdeploy.ts | xargs -I% sed -i "s|CYPH-ME|https://${version}-dot-cyph-me-dot-cyphme.appspot.com|g" %
	ls */js/cyph/envdeploy.ts | xargs -I% sed -i "s|CYPH-VIDEO|https://${version}-dot-cyph-video-dot-cyphme.appspot.com|g" %
	ls */js/cyph/envdeploy.ts | xargs -I% sed -i "s|CYPH-AUDIO|https://${version}-dot-cyph-audio-dot-cyphme.appspot.com|g" %

	# Disable caching in test environments
	ls */*.yaml | xargs -I% sed -i 's|max-age=31536000|max-age=0|g' %
else
	sed -i "s|http://localhost:42000|https://api.cyph.com|g" default/config.go
	ls */js/cyph/envdeploy.ts | xargs -I% sed -i "s|${defaultHost}42000|https://api.cyph.com|g" %
	ls */js/cyph/envdeploy.ts | xargs -I% sed -i "s|${defaultHost}42001|https://www.cyph.com|g" %
	ls */js/cyph/envdeploy.ts | xargs -I% sed -i "s|${defaultHost}42002|https://cyph.im|g" %
	ls */js/cyph/envdeploy.ts | xargs -I% sed -i "s|CYPH-IO|https://cyph.io|g" %
	ls */js/cyph/envdeploy.ts | xargs -I% sed -i "s|CYPH-ME|https://cyph.me|g" %
	ls */js/cyph/envdeploy.ts | xargs -I% sed -i "s|CYPH-VIDEO|https://cyph.video|g" %
	ls */js/cyph/envdeploy.ts | xargs -I% sed -i "s|CYPH-AUDIO|https://cyph.audio|g" %

	version=prod
fi


# WebSign project
cd websign
websignHashWhitelist="$(cat hashwhitelist.json)"
cp -rf ../shared/img ./
../commands/websign/pack.js index.html index.html
cd ..


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
for d in $compiledProjects ; do
	project="$(projectname $d)"

	if [ ! $simple ] ; then
		node -e "fs.writeFileSync(
			'$d/js/preload/translations.ts',
			'Translations = ' + JSON.stringify(
				child_process.spawnSync('find', [
					'translations',
					'-name',
					'*.json'
				]).stdout.toString().
					split('\n').
					filter(s => s).
					map(file => ({
						key: file.split('/')[1].split('.')[0],
						value: JSON.parse(fs.readFileSync(file).toString())
					})).
					reduce((translations, o) => {
						translations[o.key]	= o.value;
						return translations;
					}, {})
			) + ';'
		)"
	fi

	cd $d

	../commands/build.sh --prod || exit;

	if [ ! $simple ] ; then
		echo "JS Minify ${project}"
		find js -name '*.js' | xargs -I% uglifyjs '%' \
			-m \
			-r importScripts,Cyph,ui,session,locals,threadSetupVars,self,isaac,onmessage,postMessage,onthreadmessage,WebSign,Translations,IS_WEB,crypto \
			-o '%'

		echo "CSS Minify ${project}"
		find css -name '*.css' | grep -v bourbon/ | xargs -I% cleancss -o '%' '%'

		echo "HTML Minify ${project}"
		html-minifier --minify-js --minify-css --remove-comments --collapse-whitespace index.html -o index.html.new
		mv index.html.new index.html
	fi

	cd ..
done


if [ ! $simple ] ; then
	# Cache bust

	cd cyph.com

	echo "Cache bust $(projectname cyph.com)"

	node -e '
		const superSphincs		= require("supersphincs");

		const filesToCacheBust	= child_process.spawnSync("find", [
			".",
			"-type",
			"f"
		]).stdout.toString().split("\n").filter(s => s).map(s => s.slice(2));

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
		]).stdout.toString().split("\n").filter(s => s);

		const cacheBustedFiles	= {};


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
					cacheBustedFiles[subresource]	= true;
					fs.writeFileSync(file, content);
				}
			});
		}), Promise.resolve()).

		/* To save space, remove unused subresources under lib directory */
		then(() => {
			for (let subresource of filesToCacheBust) {
				if (subresource.startsWith("lib/") && !cacheBustedFiles[subresource]) {
					fs.unlinkSync(subresource);
				}
			}
		});
	'

	cd ..


	# WebSign packaging

	git clone git@github.com:cyph/cdn.git

	cd cyph.im

	echo "WebSign ${package}"

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
		]).stdout.toString().split("\n").filter(s => s);

		const filesToModify	= ["js", "css"].reduce((arr, ext) =>
			arr.concat(
				child_process.spawnSync("find", [
					ext,
					"-name",
					"*." + ext,
					"-type",
					"f"
				]).stdout.toString().split("\n")
			),
			["index.html"]
		).filter(s => s);


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

	../commands/websign/pack.js --sri --minify index.html pkg

	find . \
		-mindepth 1 -maxdepth 1 \
		-not -name 'pkg*' \
		-not -name '*.html' \
		-not -name '*.js' \
		-not -name '*.yaml' \
		-not -name 'img' \
		-not -name 'favicon.ico' \
		-exec rm -rf {} \;

	cd ..

	rm -rf cdn/${package}

	echo "Starting signing process."

	./commands/websign/sign.js "${websignHashWhitelist}" "cyph.im/pkg=cdn/${package}" || exit 1

	rm cyph.im/pkg

	if [ -d cyph.im/pkg-subresources ] ; then
		mv cyph.im/pkg-subresources/* cdn/${package}/
		rm -rf cyph.im/pkg-subresources
	fi

	cd cdn
	find ${package} -type f -not -name '*.srihash' -exec bash -c ' \
		zopfli -i1000 {}; \
		chmod 777 {}.gz; \
		git add {}.gz; \
		git commit -S -m "$(cat {}.srihash 2> /dev/null || date +%s)" {}.gz > /dev/null 2>&1; \
	' \;
	git push
	cd ..
fi


# WebSign redirects

setredirect '' cyph.im

for suffix in $shortlinkProjects ; do
	d=cyph.${suffix}
	project=cyph-${suffix}

	mkdir $d
	cat cyph.im/cyph-im.yaml | sed "s|cyph-im|${project}|g" > ${d}/${project}.yaml
	setredirect ${suffix}/ ${d}
done


find . -mindepth 1 -maxdepth 1 -type d -not -name shared -exec cp -f shared/favicon.ico {}/ \;


if [ ! $test ] ; then
	rm -rf */lib/js/crypto
fi


# Secret credentials
cat ~/.cyph/default.vars >> default/app.yaml
cat ~/.cyph/jobs.vars >> jobs/jobs.yaml
cp ~/.cyph/*.mmdb default/
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
