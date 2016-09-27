#!/bin/bash

source ~/.bashrc

dir="$(pwd)"
cd $(cd "$(dirname "$0")"; pwd)/..
rootDir="$(pwd)"

cacheBustedProjects='cyph.com'
compiledProjects='cyph.com cyph.im'
shortlinkProjects='io me video audio'
site=''
test=true
websign=true


gcloud auth login

echo -e '\n\n\ncaching SSH and GPG keys\n'
eval "$(ssh-agent)"
ssh-add ~/.ssh/id_rsa
mkdir ~/tmpgit
cd ~/tmpgit
git init
touch balls
git add balls
git commit -S -a -m test
cd "$rootDir"


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

if [ "${1}" == '--site' ] ; then
	shift
	site="${1}"
	shift
fi

if [ "${site}" ] ; then
	for var in cacheBustedProjects compiledProjects ; do
		for d in $(eval "echo \$$var") ; do
			if [ "${d}" != "${site}" ] ; then
				eval "$var='$(eval "echo \$$var" | sed "s|$d||")'"
			fi
		done
	done

	if [ "${site}" != cyph.im ] ; then
		websign=''
	fi
fi

if [ "${simple}" ] ; then
	websign=''
	cacheBustedProjects=''
fi

if [ "${commit}" ] ; then
	comment="${*}"
	if [ "${comment}" == "" -a ! "${simple}" ] ; then
		comment=deploy
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
staging=''
branch="$(git describe --tags --exact-match 2> /dev/null || git branch | awk '/^\*/{print $2}')"
if [ "${branch}" == 'prod' ] ; then
	branch='staging'

	if [ "${test}" -a ! "$simple" ] ; then
		staging=true
	fi
fi
version="$branch"
username="$(git config --get remote.origin.url | perl -pe 's/.*:(.*)\/.*/\1/' | tr '[:upper:]' '[:lower:]')"
if [ "${test}" -a "${username}" != cyph ] ; then
	version="${username}-${version}"
fi
if [ "${simple}" ] ; then
	version="simple-${version}"
fi

projectname () {
	if [ "${test}" ] ; then
		echo "${version}.${1}"
	else
		echo "${1}"
	fi
}

package="$(projectname cyph.ws)"

setredirect () {
	cat > "${2}/index.html.tmp" <<- EOM
		<html☁manifest='/appcache.appcache'>
			<body>
				<script>navigator.serviceWorker.register('/serviceworker.js')</script>
				<script>
					var☁path	= (
						'/#' +
						'$(if [ "${1}" ] ; then echo "${1}/" ; fi)' +
						location.toString().
							split(location.host)[1].
							replace('#', '').
							replace(/^\\//, '')
					).replace(/\\/\$/, '');

					var☁host	= '${package}';

					if (location.host.split('.').slice(-1)[0] === 'onion') {
						host	=
							host.replace(/\\.ws\$/, '').replace(/\\./g, '_') +
							'.cyphdbyhiddenbhs.onion'
						;
					}

					location	= 'https://' + host + (path === '/#' ? '' : path);
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


if [ ! "${simple}" ] ; then
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

	blogCSPSources="$(cat cyph.com/blogcsp | perl -pe 's/^(.*)$/https:\/\/\1 https:\/\/*.\1/g' | tr '\n' ' ')"

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
ls */js/cyph/envdeploy.ts | xargs -I% sed -i 's|isLocalEnv: boolean		= true|isLocalEnv: boolean		= false|g' %
ls */js/cyph/envdeploy.ts | xargs -I% sed -i "s|ws://127.0.1:44000|https://cyphme.firebaseio.com|g" %

if [ "${branch}" == 'staging' ] ; then
	sed -i "s|false, /* IsProd */|true,|g" default/config.go
fi

if [ "${test}" ] ; then
	newCyphURL="https://${version}.cyph.ws"
	if [ "${simple}" ] ; then
		newCyphURL="https://${version}-dot-cyph-im-dot-cyphme.appspot.com"
	fi

	sed -i "s|staging|${version}|g" default/config.go
	sed -i "s|http://localhost:42000|https://${version}-dot-cyphme.appspot.com|g" default/config.go
	ls */*.yaml */js/cyph/envdeploy.ts | xargs -I% sed -i "s|api.cyph.com|${version}-dot-cyphme.appspot.com|g" %
	ls */*.yaml */js/cyph/envdeploy.ts | xargs -I% sed -i "s|www.cyph.com|${version}-dot-cyph-com-dot-cyphme.appspot.com|g" %
	ls */js/cyph/envdeploy.ts | xargs -I% sed -i "s|${defaultHost}42000|https://${version}-dot-cyphme.appspot.com|g" %
	ls */js/cyph/envdeploy.ts | xargs -I% sed -i "s|${defaultHost}42001|https://${version}-dot-cyph-com-dot-cyphme.appspot.com|g" %
	ls */js/cyph/envdeploy.ts | xargs -I% sed -i "s|${defaultHost}42002|${newCyphURL}|g" %
	ls */js/cyph/envdeploy.ts | xargs -I% sed -i "s|CYPH-IO|https://${version}-dot-cyph-io-dot-cyphme.appspot.com|g" %
	ls */js/cyph/envdeploy.ts | xargs -I% sed -i "s|CYPH-ME|https://${version}-dot-cyph-me-dot-cyphme.appspot.com|g" %
	ls */js/cyph/envdeploy.ts | xargs -I% sed -i "s|CYPH-VIDEO|https://${version}-dot-cyph-video-dot-cyphme.appspot.com|g" %
	ls */js/cyph/envdeploy.ts | xargs -I% sed -i "s|CYPH-AUDIO|https://${version}-dot-cyph-audio-dot-cyphme.appspot.com|g" %

	homeURL="https://${version}-dot-cyph-com-dot-cyphme.appspot.com"

	if [ ! "${staging}" ] ; then
		# Disable caching in test environments
		ls */*.yaml | xargs -I% sed -i 's|max-age=31536000|max-age=0|g' %
	fi
else
	sed -i "s|http://localhost:42000|https://api.cyph.com|g" default/config.go
	ls */js/cyph/envdeploy.ts | xargs -I% sed -i "s|${defaultHost}42000|https://api.cyph.com|g" %
	ls */js/cyph/envdeploy.ts | xargs -I% sed -i "s|${defaultHost}42001|https://www.cyph.com|g" %
	ls */js/cyph/envdeploy.ts | xargs -I% sed -i "s|${defaultHost}42002|https://cyph.im|g" %
	ls */js/cyph/envdeploy.ts | xargs -I% sed -i "s|CYPH-IO|https://cyph.io|g" %
	ls */js/cyph/envdeploy.ts | xargs -I% sed -i "s|CYPH-ME|https://cyph.me|g" %
	ls */js/cyph/envdeploy.ts | xargs -I% sed -i "s|CYPH-VIDEO|https://cyph.video|g" %
	ls */js/cyph/envdeploy.ts | xargs -I% sed -i "s|CYPH-AUDIO|https://cyph.audio|g" %

	homeURL="https://www.cyph.com"

	version=prod
fi


if [ ! "${site}" -o "${site}" == websign ] ; then
	# WebSign project
	cd websign
	websignHashWhitelist="$(cat hashwhitelist.json)"
	cp -rf ../shared/img ./
	../commands/websign/pack.js index.html index.html
	cd ..
fi


if [ ! "${site}" -o "${site}" == cyph.com ] ; then
	# Blog
	cd cyph.com
	rm -rf blog 2> /dev/null
	mkdir blog
	cd blog
	../../commands/wpstatic.sh "${homeURL}/blog"
	if [ ! -f index.html ] ; then
		exit 1
	fi
	cd ../..
fi


# Compile + translate + minify
for d in $compiledProjects ; do
	project="$(projectname $d)"

	if [ ! "${simple}" ] ; then
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

		# Block importScripts in Workers in WebSigned environments

		cat $d/js/cyph/thread.ts | \
			tr '\n' '☁' | \
			perl -pe 's/importScripts\s+=.*?;/importScripts = (s: string) => { throw new Error(`Cannot load external script \${s}.`) };/' | \
			tr '☁' '\n' \
		> $d/js/cyph/thread.ts.new
		mv $d/js/cyph/thread.ts.new $d/js/cyph/thread.ts
	fi

	cd $d

	../commands/build.sh --prod || exit;

	if [ ! "${simple}" ] ; then
		echo "JS Minify ${project}"
		find js -name '*.js' | xargs -I% uglifyjs '%' \
			-m \
			-r importScripts,Cyph,ui,session,locals,threadSetupVars,self,onmessage,postMessage,onthreadmessage,WebSign,Translations,IS_WEB,crypto \
			-o '%'

		echo "CSS Minify ${project}"
		find css -name '*.css' | grep -v bourbon/ | xargs -I% cleancss -o '%' '%'

		echo "HTML Minify ${project}"
		html-minifier --minify-js --minify-css --remove-comments --collapse-whitespace index.html -o index.html.new
		mv index.html.new index.html
	fi

	cd ..
done


for d in $cacheBustedProjects ; do
	# Cache bust

	cd $d

	echo "Cache bust $(projectname $d)"

	node -e '
		const superSphincs		= require("supersphincs");

		const filesToCacheBust	= child_process.spawnSync("find", [
			"-L",
			".",
			"-type",
			"f",
			"-mindepth",
			"2"
		]).stdout.toString().split("\n").filter(s => s).map(s => s.slice(2));

		const filesToModify		= child_process.spawnSync("find", [
			".",
			"-type",
			"f",
			"-and",
			"\(",
			"-name",
			"*.html",
			"-or",
			"-name",
			"*.js",
			"-or",
			"-name",
			"*.css",
			"\)"
		]).stdout.toString().split("\n").filter(s => s);

		const fileContents		= {};
		const cacheBustedFiles	= {};

		const getFileName		= file => file.split("/").slice(-1)[0];


		Promise.all(filesToModify.map(file =>
			new Promise((resolve, reject) => fs.readFile(file, (err, data) => {
				try {
					fileContents[file]	= data.toString();
					resolve();
				}
				catch (_) {
					reject(err);
				}
			})).then(() =>
				filesToCacheBust.reduce((p, subresource) => p.then(content => {
					if (content.indexOf(subresource) < 0) {
						return content;
					}

					cacheBustedFiles[getFileName(subresource)]	= true;

					return superSphincs.hash(
						fs.readFileSync(subresource)
					).then(hash =>
						content.split(subresource).join(`${subresource}?${hash.hex}`)
					);
				}), Promise.resolve(fileContents[file])).then(content => {
					if (content !== fileContents[file]) {
						fileContents[file]	= content;
						fs.writeFileSync(file, content);
					}
				})
			)
		)).

		/* To save space, remove unused subresources under lib directory */
		then(() => Promise.all(
			filesToCacheBust.filter(subresource =>
				subresource.startsWith("lib/") &&
				!cacheBustedFiles[getFileName(subresource)]
			).map(subresource => new Promise(resolve =>
				fs.unlink(subresource, resolve)
			))
		));
	'

	cd ..
done

if [ "${websign}" ] ; then
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

	mkdir ../pkg
	../commands/websign/pack.js --sri --minify index.html ../pkg/cyph.ws

	find . \
		-mindepth 1 -maxdepth 1 \
		-not -name '*.html' \
		-not -name '*.js' \
		-not -name '*.yaml' \
		-not -name 'img' \
		-not -name 'favicon.ico' \
		-exec rm -rf {} \;

	cd ..

	packages="${package}"

	mkdir -p pkg/cyph.ws-subresources 2> /dev/null
	cd pkg/cyph.ws-subresources
	git clone git@github.com:cyph/custom-builds.git
	rm -rf custom-builds/.git
	for d in $(find custom-builds -mindepth 1 -maxdepth 1 -type d) ; do
		customBuildBase="$(echo "${d}" | perl -pe 's/.*\/(.*)$/\1/')"
		customBuild="$(projectname "${customBuildBase}")"
		customBuildBackground="${d}/background.png"
		customBuildFavicon="${d}/favicon.png"
		customBuildTheme="${d}/theme.json"
		customBuildStylesheet="custom-builds/${customBuildBase}.css"
		packages="${packages} ${customBuild}"

		node -e "
			const cheerio		= require('cheerio');
			const datauri		= require('datauri');
			const htmlencode	= require('htmlencode');
			const superSphincs	= require('supersphincs');

			const \$	= cheerio.load(fs.readFileSync('../cyph.ws').toString());

			const o		= JSON.parse(
				fs.readFileSync('${customBuildTheme}').toString().replace(/\s/g, ' ')
			);

			o.background	= datauri.sync('${customBuildBackground}');

			const css	= child_process.spawnSync('cleancss', [], {input:
				child_process.spawnSync('sass', ['-s', '--scss'], {input: \`
					$(cat ../../shared/css/custom-build.scss.template | sed 's|;| \!important;|g')
				\`}).stdout.toString()
			}).stdout.toString().trim();

			superSphincs.hash(css).then(hash => {
				\$('title').
					attr(
						'ng-bind',
						\$('title').attr('ng-bind').replace(
							htmlencode.htmlDecode(\$('title').text().trim()),
							o.title
						)
					).
					text(htmlencode.htmlEncode(o.title))
				;

				if (o.colors.main) {
					\$('head').find(
						'meta[name=\"theme-color\"],' + 
						'meta[name=\"msapplication-TileColor\"]'
					).
						attr('content', o.colors.main)
					;

					\$('head').append(\`<style>
						#pre-load {
							background-color: \${o.colors.main} !important;
						}
					</style>\`);
				}

				\$('head').find(
					'link[type=\"image/png\"],' + 
					'meta[name=\"msapplication-TileImage\"]'
				).
					removeAttr('websign-sri-path').
					removeAttr('websign-sri-hash').
					removeAttr('href').
					removeAttr('content').
					addClass('custom-build-favicon')
				;

				\$('head').append(\`<script>
					self.customBuild		= '${customBuild}';
					self.customBuildFavicon	= '\${datauri.sync('${customBuildFavicon}')}';

					Array.prototype.slice.apply(
						document.getElementsByClassName('custom-build-favicon')
					).forEach(function (elem) {
						if (elem instanceof HTMLLinkElement) {
							elem.href		= self.customBuildFavicon;
						}
						else if (elem instanceof HTMLMetaElement) {
							elem.content	= self.customBuildFavicon;
						}
					});
				</script>\`);

				\$('body').append(\`
					<link
						rel='stylesheet'
						websign-sri-path='${customBuildStylesheet}'
						websign-sri-hash='\${hash.hex}'
					></link>
				\`);

				fs.writeFileSync('${customBuildStylesheet}', css);
				fs.writeFileSync('${customBuildStylesheet}.srihash', hash.hex);
				fs.writeFileSync('../${customBuild}', \$.html().trim());
			});
		"

		rm -rf ${d}
	done
	cd ../..

	mv pkg/cyph.ws "pkg/${package}"

	for p in $packages ; do
		rm -rf cdn/${p}
	done

	echo "Starting signing process."

	./commands/websign/sign.js "${websignHashWhitelist}" $(
		for p in $packages ; do
			echo -n "pkg/${p}=cdn/${p} "
		done
	) || exit 1

	for p in $packages ; do
		if [ -d pkg/cyph.ws-subresources ] ; then
			cp -a pkg/cyph.ws-subresources/* cdn/${p}/
		fi

		cd cdn

		plink=$(echo $p | sed 's/\.ws$//')
		if (echo $p | grep -P '\.ws$' > /dev/null) && ! [ -L $plink ] ; then
			ln -s $p $plink
			chmod 777 $plink
			git add $plink
			git commit -S -m $plink $plink > /dev/null 2>&1
		fi

		find $p -type f -not -name '*.srihash' -exec bash -c ' \
			zopfli -i1000 {}; \
			chmod 777 {}.gz; \
			git add {}.gz; \
			git commit -S -m "$(cat {}.srihash 2> /dev/null || date +%s)" {}.gz > /dev/null 2>&1; \
		' \;
		git push
		cd ..
	done

	# WebSign redirects

	setredirect '' cyph.im

	for suffix in $shortlinkProjects ; do
		d=cyph.${suffix}
		project=cyph-${suffix}

		mkdir $d
		cat cyph.im/cyph-im.yaml | sed "s|cyph-im|${project}|g" > ${d}/${project}.yaml
		setredirect ${suffix} ${d}
	done
elif [ ! "${site}" -o "${site}" == cyph.im ] ; then
	cp websign/js/workerhelper.js cyph.im/js/
fi


find . -mindepth 1 -maxdepth 1 -type d -not -name shared -exec cp -f shared/favicon.ico {}/ \;


if [ ! "${simple}" ] ; then
	rm -rf */lib/js/crypto
fi


# Secret credentials
cat ~/.cyph/default.vars >> default/app.yaml
cp ~/.cyph/*.mmdb default/
if [ "${branch}" == 'staging' ] ; then
	cat ~/.cyph/braintree.prod >> default/app.yaml
else
	cat ~/.cyph/braintree.sandbox >> default/app.yaml
fi

# Temporary workaround for cache-busting reverse proxies
if [ ! "${test}" ] ; then
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

gcloud app deploy --quiet --no-promote --project cyphme --version $version $(
	if [ "${site}" ] ; then
		ls $site/*.yaml
	else
		ls */*.yaml
	fi
) dispatch.yaml

cd "${dir}"
