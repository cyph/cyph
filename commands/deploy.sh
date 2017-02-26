#!/bin/bash

cd $(cd "$(dirname "$0")" ; pwd)/..
dir="$PWD"
originalArgs="${*}"


cacheBustedProjects='cyph.com cyph.im'
compiledProjects='cyph.com cyph.im'
allCompiledProjects="${compiledProjects}"
webSignedProject='cyph.im'
prodOnlyProjects='nakedredirect test websign'
shortlinkProjects='io me video audio'
site=''
test=true
websign=true

if [ "${1}" == '--prod' ] ; then
	test=''
	shift
elif [ "${1}" == '--simple' ] ; then
	simple=true
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

	if [ "${site}" != "${webSignedProject}" ] ; then
		websign=''
	fi
fi

if [ "${simple}" ] ; then
	websign=''
else
	cacheBustedProjects="$(echo "${cacheBustedProjects}" | sed "s|${webSignedProject}||")"
	./commands/keycache.sh
fi

echo -e '\n\nInitial setup\n'

# Branch config setup
eval "$(./commands/getgitdata.sh)"

staging=''
if [ "${branch}" == 'prod' ] ; then
	branch='staging'

	if [ "${test}" -a ! "$simple" ] ; then
		staging=true
	fi
elif [ ! "${test}" ] ; then
	echo 'Cannot do prod deploy from test branch'
	exit 1
fi
version="${branch}"
if [ "${test}" -a "${username}" != cyph ] ; then
	version="${username}-${version}"
fi
if [ "${simple}" ] ; then
	version="simple-${version}"
fi


./commands/copyworkspace.sh ~/.build
cd ~/.build

mkdir geoisp.tmp
cd geoisp.tmp
wget "https://download.maxmind.com/app/geoip_download?edition_id=GeoIP2-ISP&suffix=tar.gz&license_key=$(
	cat ~/.cyph/maxmind.key
)" -O geoisp.tar.gz
tar xzf geoisp.tar.gz
mv */*.mmdb GeoIP2-ISP.mmdb
if [ ! -f GeoIP2-ISP.mmdb ] ; then
	echo 'GeoIP2-ISP.mmdb missing'
	exit 1
fi
mv GeoIP2-ISP.mmdb ../default/
cd ..
rm -rf geoisp.tmp

# Secret credentials
cat ~/.cyph/default.vars >> default/app.yaml
cat ~/.cyph/test.vars >> test/test.yaml
cp ~/.cyph/GeoIP2-Country.mmdb default/
if [ "${branch}" == 'staging' ] ; then
	echo '  PROD: true' >> default/app.yaml
	cat ~/.cyph/braintree.prod >> default/app.yaml
else
	cat ~/.cyph/braintree.sandbox >> default/app.yaml
fi

projectname () {
	if [ "${test}" ] ; then
		echo "${version}.${1}"
	else
		echo "${1}"
	fi
}

package="$(projectname cyph.ws)"


if [ -d test ] ; then
	sed -i "s|setOnerror()|$(cat test/setonerror.js | tr '\n' ' ')|g" test/test.js
fi

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
	cyphComCSP="$(cat shared/csp | tr -d '\n' | sed 's|frame-src|frame-src https://*.facebook.com https://*.braintreegateway.com|g' | sed 's|connect-src|connect-src blob:|g')"
	ls cyph.com/*.yaml | xargs -I% sed -i "s|${defaultCSPString}|\"${cyphComCSP}\"|g" %
	ls */*.yaml | xargs -I% sed -i "s|${defaultCSPString}|\"${webSignCSP}\"|g" %
	ls shared/js/cyph/env-deploy.ts | xargs -I% sed -i "s|${defaultCSPString}|${fullCSP}|g" %

	# Expand connect-src and frame-src on wpstatic pages to support social media widgets and stuff

	wpstaticCSPSources="$(cat cyph.com/wpstaticcsp | perl -pe 's/^(.*)$/https:\/\/\1 https:\/\/*.\1/g' | tr '\n' ' ')"

	cat cyph.com/cyph-com.yaml |
		tr '\n' '☁' |
		perl -pe 's/(\/PATH.*?connect-src )(.*?frame-src )(.*?connect-src )(.*?frame-src )(.*?connect-src )(.*?frame-src )/\1☼\2☼\3☼\4☼\5☼\6☼/g' |
		sed "s|☼|${wpstaticCSPSources}|g" |
		tr '☁' '\n' |
		sed "s|Cache-Control: private, max-age=31536000|Cache-Control: public, max-age=31536000|g" \
	> cyph.com/new.yaml
	mv cyph.com/new.yaml cyph.com/cyph-com.yaml
fi

defaultHost='${locationData.protocol}//${locationData.hostname}:'
ls shared/js/cyph/env-deploy.ts | xargs -I% sed -i 's|isLocalEnv: boolean\s*= true|isLocalEnv: boolean\t= false|g' %
ls shared/js/cyph/env-deploy.ts | xargs -I% sed -i "s/ws:\/\/.*:44000/https:\/\/cyphme.firebaseio.com/g" %

if [ "${test}" ] ; then
	newCyphURL="https://${version}.cyph.ws"
	if [ "${simple}" ] ; then
		newCyphURL="https://${version}-dot-cyph-im-dot-cyphme.appspot.com"
	fi

	sed -i "s|staging|${version}|g" default/config.go
	sed -i "s|http://localhost:42000|https://${version}-dot-cyphme.appspot.com|g" default/config.go
	ls */*.yaml shared/js/cyph/env-deploy.ts | xargs -I% sed -i "s|api.cyph.com|${version}-dot-cyphme.appspot.com|g" %
	ls */*.yaml shared/js/cyph/env-deploy.ts | xargs -I% sed -i "s|www.cyph.com|${version}-dot-cyph-com-dot-cyphme.appspot.com|g" %
	ls shared/js/cyph/env-deploy.ts | xargs -I% sed -i "s|${defaultHost}42000|https://${version}-dot-cyphme.appspot.com|g" %
	ls shared/js/cyph/env-deploy.ts | xargs -I% sed -i "s|${defaultHost}42001|https://${version}-dot-cyph-com-dot-cyphme.appspot.com|g" %
	ls shared/js/cyph/env-deploy.ts | xargs -I% sed -i "s|${defaultHost}42002|${newCyphURL}|g" %
	ls shared/js/cyph/env-deploy.ts | xargs -I% sed -i "s|CYPH-IM|https://${version}-dot-cyph-im-dot-cyphme.appspot.com|g" %
	ls shared/js/cyph/env-deploy.ts | xargs -I% sed -i "s|CYPH-IO|https://${version}-dot-cyph-io-dot-cyphme.appspot.com|g" %
	ls shared/js/cyph/env-deploy.ts | xargs -I% sed -i "s|CYPH-ME|https://${version}-dot-cyph-me-dot-cyphme.appspot.com|g" %
	ls shared/js/cyph/env-deploy.ts | xargs -I% sed -i "s|CYPH-VIDEO|https://${version}-dot-cyph-video-dot-cyphme.appspot.com|g" %
	ls shared/js/cyph/env-deploy.ts | xargs -I% sed -i "s|CYPH-AUDIO|https://${version}-dot-cyph-audio-dot-cyphme.appspot.com|g" %

	homeURL="https://${version}-dot-cyph-com-dot-cyphme.appspot.com"

	# Disable caching in test environments
	if [ ! "${staging}" ] ; then
		ls */*.yaml | xargs -I% sed -i 's|max-age=31536000|max-age=0|g' %
	fi

	# if [ "${simple}" ] ; then
	# 	for yaml in `ls */cyph*.yaml` ; do
	# 		cat $yaml | perl -pe 's/(- url: .*)/\1\n  login: admin/g' > $yaml.new
	# 		mv $yaml.new $yaml
	# 	done
	# fi
else
	sed -i "s|http://localhost:42000|https://api.cyph.com|g" default/config.go
	ls shared/js/cyph/env-deploy.ts | xargs -I% sed -i "s|${defaultHost}42000|https://api.cyph.com|g" %
	ls shared/js/cyph/env-deploy.ts | xargs -I% sed -i "s|${defaultHost}42001|https://www.cyph.com|g" %
	ls shared/js/cyph/env-deploy.ts | xargs -I% sed -i "s|${defaultHost}42002|https://cyph.ws|g" %
	ls shared/js/cyph/env-deploy.ts | xargs -I% sed -i "s|CYPH-IM|https://cyph.im|g" %
	ls shared/js/cyph/env-deploy.ts | xargs -I% sed -i "s|CYPH-IO|https://cyph.io|g" %
	ls shared/js/cyph/env-deploy.ts | xargs -I% sed -i "s|CYPH-ME|https://cyph.me|g" %
	ls shared/js/cyph/env-deploy.ts | xargs -I% sed -i "s|CYPH-VIDEO|https://cyph.video|g" %
	ls shared/js/cyph/env-deploy.ts | xargs -I% sed -i "s|CYPH-AUDIO|https://cyph.audio|g" %

	homeURL='https://www.cyph.com'

	version=prod
fi


# wpstatic + cache busting
waitingForWpstatic=''
if [ "${cacheBustedProjects}" ] ; then
	waitingForWpstatic=true
	bash -c "
		touch .wpstatic.output

		if [ '${websign}' ] ; then
			while [ ! -f .build.done ] ; do sleep 1 ; done
		fi

		if [ ! '${site}' ] || ( [ '${site}' == cyph.com ] && [ ! '${simple}' ] ) ; then
			rm -rf cyph.com/blog 2> /dev/null
			mkdir -p cyph.com/blog
			cd cyph.com/blog
			../../commands/wpstatic.sh '${homeURL}' >> ../../.wpstatic.output 2>&1
			cd ../..
		fi

		while [ ! -f .build.done ] ; do sleep 1 ; done
		rm .build.done

		# Cache bust
		echo 'Cache bust' >> .wpstatic.output 2>&1
		for d in ${cacheBustedProjects} ; do
			cd \$d
			../commands/cachebust.ts >> ../.wpstatic.output 2>&1
			cd ..
		done

		touch .wpstatic.done
	" &
fi


# WebSign project
if [ ! "${site}" ] || ( [ "${site}" == websign ] || [ "${site}" == "${webSignedProject}" ] ) ; then
	cd websign
	websignHashWhitelist="$(cat hashwhitelist.json)"
	cp -rf ../shared/img ./
	../commands/websign/pack.ts index.html index.html
	cd ..
fi


# Compile + translate + minify
if [ "${compiledProjects}" ] ; then
	./commands/lint.sh || exit 1
fi
for d in $compiledProjects ; do
	echo "Build $(projectname ${d})"

	for sharedResource in $(ls shared) ; do
		rm -rf ${d}/${sharedResource} 2> /dev/null
		cp -rf shared/${sharedResource} ${d}/
	done

	cd ${d}

	for altD in $allCompiledProjects ; do
		if [ "${d}" == "${altD}" ] ; then
			continue
		fi

		find js -mindepth 1 -maxdepth 1 -type d -name "${altD}" -exec rm -rf {} \;
	done

	if [ "${websign}" -a "${d}" == "${webSignedProject}" ] ; then
		# Block importScripts in Workers in WebSigned environments
		cat js/cyph/thread.ts | \
			tr '\n' '☁' | \
			perl -pe 's/importScripts\s+=.*?;/importScripts = (s: string) => { throw new Error(`Cannot load external script \${s}.`); };/' | \
			tr '☁' '\n' | \
			grep -v oldImportScripts \
		> js/cyph/thread.ts.new
		mv js/cyph/thread.ts.new js/cyph/thread.ts

		# Merge in base64'd images, fonts, video, and audio
		../commands/websign/subresourceinline.ts ../pkg/cyph.ws-subresources
	fi

	../commands/build.sh --prod $(test "${simple}" && echo '--no-minify') || exit 1

	mv .index.html index.html

	rm -rf js/node_modules
	find css -type f \( -name '*.scss' -or -name '*.map' \) -exec rm {} \;
	find js -type f \( -name '*.ts' -or -name '*.map' \) -exec rm {} \;

	if [ ! "${simple}" ] ; then
		html-minifier --minify-js --minify-css --remove-comments --collapse-whitespace index.html -o index.html.new
		mv index.html.new index.html
	fi

	cd ..
done
if [ ! "${test}" ] ; then
	currentDir="$PWD"
	for f in */webpack.json ; do
		cp -f $f "${dir}/${f}"
		chmod 700 "${dir}/${f}"
	done
	cd "${dir}"
	git commit -m 'webpack.json update' */webpack.json
	git push
	cd "${currentDir}"
	currentDir=''
fi
touch .build.done


# WebSign packaging
if [ "${websign}" ] ; then
	for repo in cdn custom-builds ; do
		if [ -d ~/.cyph/${repo} ] ; then
			bash -c "cd ~/.cyph/${repo} ; git reset --hard ; git clean -dfx ; git pull"
			cp -rf ~/.cyph/${repo} ./
		else
			git clone git@github.com:cyph/${repo}.git
			rm -rf ~/.cyph/${repo} 2> /dev/null
			cp -rf ${repo} ~/.cyph/
		fi
	done

	cd "${webSignedProject}"

	echo "WebSign ${package}"

	# Merge imported libraries into threads
	find js -name '*.js' | xargs -I% ../commands/websign/threadpack.ts %

	../commands/websign/pack.ts --sri --minify index.html ../pkg/cyph.ws

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

	cd pkg/cyph.ws-subresources
	mv ../../custom-builds ./
	rm -rf custom-builds/.git custom-builds/reference.json
	for d in $(find custom-builds -mindepth 1 -maxdepth 1 -type d) ; do
		customBuildBase="$(echo "${d}" | perl -pe 's/.*\/(.*)$/\1/')"
		customBuild="$(projectname "${customBuildBase}")"
		customBuildAdditionalStyling="${d}/custom.scss"
		customBuildBackground="${d}/background.png"
		customBuildFavicon="${d}/favicon.png"
		customBuildTheme="${d}/theme.json"
		customBuildStylesheet="custom-builds/${customBuildBase}.css"
		packages="${packages} ${customBuild}"

		../../commands/websign/custombuild.ts \
			"${customBuild}" \
			"${customBuildAdditionalStyling}" \
			"${customBuildBackground}" \
			"${customBuildFavicon}" \
			"${customBuildStylesheet}" \
			"${customBuildTheme}"

		rm -rf ${d}
	done
	cd ../..

	if [ $test ] ; then
		mv pkg/cyph.ws "pkg/${package}"
	fi

	for p in $packages ; do
		rm -rf cdn/${p}
	done

	echo "Starting signing process."

	./commands/websign/sign.ts "${websignHashWhitelist}" $(
		for p in $packages ; do
			echo -n "pkg/${p}=cdn/${p} "
		done
	) || exit 1

	echo -e '\n\nCompressing resources for deployment to CDN\n'

	if [ -d pkg/cyph.ws-subresources ] ; then
		find pkg/cyph.ws-subresources -type f -not -name '*.srihash' -print0 | xargs -0 -P4 -I% bash -c ' \
			zopfli -i1000 %; \
			bro --quality 99 --repeat 99 --input % --output %.br; \
		'
	fi

	for p in $packages ; do
		if [ -d pkg/cyph.ws-subresources ] ; then
			cp -a pkg/cyph.ws-subresources/* cdn/${p}/
		fi

		cd cdn

		plink=$(echo $p | sed 's/\.ws$//')
		if (echo $p | grep -P '\.ws$' > /dev/null) && ! [ -L $plink ] ; then
			ln -s $p $plink
			chmod 700 $plink
			git add $plink
			git commit -S -m $plink $plink > /dev/null 2>&1
		fi

		cp ${p}/current ${p}/pkg.srihash

		find $p -type f -not \( -name '*.srihash' -or -name '*.gz' -or -name '*.br' \) -exec bash -c ' \
			if [ ! -f {}.gz ] ; then \
				zopfli -i1000 {}; \
				bro --quality 99 --repeat 99 --input {} --output {}.br; \
			fi; \
			chmod 700 {}.gz {}.br; \
			git add {}.gz {}.br; \
			git commit -S -m "$(cat {}.srihash 2> /dev/null || date +%s)" {}.gz {}.br > /dev/null 2>&1; \
		' \;

		git push
		cd ..
	done

	# Hydrate CDN cache

	sleep 60
	for node in af as eu na oc sa ; do
		find cdn -type f -name '*.srihash' -exec bash -c "
			curl -s --compressed \
				\"https://${node}.cdn.cyph.com\$(
					echo '{}' | perl -pe 's/^cdn(.*)\.srihash$/\1/'
				)?\$(cat '{}')\" \
			> /dev/null" \
		\;
	done

	# WebSign redirects

	./commands/websign/createredirect.sh '' cyph.im "${package}" "${test}"

	for suffix in $shortlinkProjects ; do
		d=cyph.${suffix}
		project=cyph-${suffix}

		mkdir $d
		cat cyph.im/cyph-im.yaml | sed "s|cyph-im|${project}|g" > ${d}/${project}.yaml
		./commands/websign/createredirect.sh ${suffix} ${d} "${package}" "${test}"
	done
elif [ ! "${site}" ] || [ "${site}" == "${webSignedProject}" ] ; then
	cp websign/js/workerhelper.js "${webSignedProject}/js/"
fi


if [ "${waitingForWpstatic}" ] ; then
	while true ; do
		cat .wpstatic.output
		echo -n > .wpstatic.output
		if [ -f .wpstatic.done ] ; then
			break
		fi
		sleep 1
	done
	rm .wpstatic.done .wpstatic.output
fi


find . -mindepth 1 -maxdepth 1 -type d -not -name shared -exec cp -f shared/favicon.ico {}/ \;


# Temporary workaround for cache-busting reverse proxies
if [ ! "${test}" ] && ( [ ! "${site}" ] || [ "${site}" == cyph.im ] ) ; then
	for project in cyph.im cyph.video ; do
		cat $project/*.yaml | perl -pe 's/(service: cyph.*)/\1-update/' > $project/update.yaml
	done
fi

if [ "${test}" ] ; then
	rm -rf $prodOnlyProjects
fi

gcloud app deploy --quiet --no-promote --project cyphme --version $version $(
	if [ "${site}" ] ; then
		ls $site/*.yaml
	else
		ls */*.yaml
	fi
	if [ ! "${test}" ] ; then
		echo dispatch.yaml
	fi
)

cd "${dir}"
rm -rf .build 2> /dev/null

if [ "${test}" -a ! "${simple}" ] ; then
	mv ~/.build ~/.build.original
	./commands/deploy.sh --simple $originalArgs
elif [ -d ~/.build.original ] ; then
	mv ~/.build  ~/.build.original/simplebuild
	mv ~/.build.original .build
else
	mv ~/.build ./
fi
