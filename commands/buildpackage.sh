#!/bin/bash


eval "$(parseArgs \
	--opt-bool beta-prod \
	--opt branch-dir \
	--opt cache-busted-projects \
	--opt-bool cache-busted-projects-override \
	--opt compiled-projects \
	--opt-bool compiled-projects-override \
	--opt-bool debug \
	--opt-bool debug-prod-build \
	--opt environment \
	--opt main-version \
	--opt-bool pack \
	--opt-bool prod-and-beta \
	--opt-bool simple \
	--opt-bool simple-prod-build \
	--opt-bool simple-web-sign-build \
	--opt site \
	--opt-bool skip-website \
	--opt-bool test \
	--opt version \
	--opt-bool websign \
	--opt-bool wp-promote \
)"


cd $(cd "$(dirname "$0")" ; pwd)/..
dir="$PWD"


source ./commands/deployvars.sh

betaProd="$(getBoolArg ${_arg_beta_prod})"
branchDir="${_arg_branch_dir}"
debug="$(getBoolArg ${_arg_debug})"
debugProdBuild="$(getBoolArg ${_arg_debug_prod_build})"
environment="${_arg_environment}"
mainVersion="${_arg_main_version}"
pack="$(getBoolArg ${_arg_pack})"
prodAndBeta="$(getBoolArg ${_arg_prod_and_beta})"
simple="$(getBoolArg ${_arg_simple})"
simpleProdBuild="$(getBoolArg ${_arg_simple_prod_build})"
simpleWebSignBuild="$(getBoolArg ${_arg_simple_web_sign_build})"
site="${_arg_site}"
skipWebsite="$(getBoolArg ${_arg_skip_website})"
test="$(getBoolArg ${_arg_test})"
version="${_arg_version}"
websign="$(getBoolArg ${_arg_websign})"
wpPromote="$(getBoolArg ${_arg_wp_promote})"

if [ "$(getBoolArg ${_arg_cache_busted_projects_override})" ] ; then
	cacheBustedProjects="${_arg_cache_busted_projects}"
fi

if [ "$(getBoolArg ${_arg_compiled_projects_override})" ] ; then
	compiledProjects="${_arg_compiled_projects}"
fi

if [ ! "${mainVersion}" ] ; then
	mainVersion="${version}"
fi

if [ "${site}" == 'sdk' ] ; then
	cacheBustedProjects=''
	compiledProjects=''
fi


# TODO: Factor out from here and deploy.sh

getVersion () {
	if [ ! "${1}" ] || [ "${1}" == '~/.build' ] || [ "${1}" == "${HOME}/.build" ] ; then
		echo "${mainVersion}"
	else
		echo "$(test "${simple}" && echo 'simple-')$(echo "${1}" | perl -pe 's/.*\///')"
	fi
}

projectname () {
	projectnameVersion="$(getVersion ${2})"

	if [ "${prodAndBeta}" ] && [ "${projectnameVersion}" == 'beta' ] ; then
		echo "beta.${1}"
	elif [ "${simple}" ] || [ "${1}" == 'cyph.com' ] ; then
		echo "${projectnameVersion}-dot-$(echo "${1}" | tr '.' '-')-dot-cyphme.appspot.com"
	elif [ "${test}" ] || [ "${betaProd}" ] || [ "${debug}" ] ; then
		echo "${projectnameVersion}.${1}"
	else
		echo "${1}"
	fi
}


cd ${branchDir}


if [ -d test ] ; then
	sed -i "s|setOnerror()|$(cat test/setonerror.js | tr '\n' ' ')|g" test/test.js
fi

if [ ! "${simple}" ] || [ "${simpleProdBuild}" ] ; then
	cd websign
	node -e "
		fs.writeFileSync(
			'websign.yaml',
			fs.readFileSync('websign.yaml').toString().
				replace(/\n/g, '☁').
				replace(/([^☁]+SUBRESOURCE.*?☁☁)/, yaml =>
					[
						'well-known/apple-app-site-association',
						'well-known/assetlinks.json',
						'apple-app-site-association',
						...fs.readFileSync('appcache.appcache').toString().
							split('CACHE:')[1].
							split('NETWORK:')[0].
							replace(/\n\//g, '\n').
							split('\n').
							filter(s => s.trim() && s !== 'unsupportedbrowser')
					].
						map(subresource => yaml.replace(/SUBRESOURCE/g, subresource)).
						join('')
				).
				replace(/☁/g, '\n').
				replace(/\/well-known/g, '/.well-known')
		)
	"
	cd ..

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

	cyphComCSPSources="$(cat cyph.com/cspsources |
		perl -pe 's/^(.*)$/https:\/\/\1 https:\/\/*.\1/g' |
		tr '\n' ' '
	)"
	cyphComCheckoutCSPSources="$(cat cyph.com/checkoutcspsources |
		perl -pe 's/^(.*)$/https:\/\/\1 https:\/\/*.\1/g' |
		tr '\n' ' '
	)"
	cyphComCheckoutV1CSPSources="bitcoin: bitcoincash: $(cat cyph.com/checkoutv1cspsources |
		perl -pe 's/^(.*)$/https:\/\/\1 https:\/\/*.\1/g' |
		tr '\n' ' '
	)"
	cyphComCSP="$(cat shared/csp |
		tr -d '\n' |
		perl -pe 's/(child-src )(.*?connect-src )(.*?frame-src )(.*?img-src )/\1☼\2☼\3☼\4☼/g' |
		sed "s|☼|${cyphComCSPSources}|g"
	)"

	ls cyph.com/*.yaml | xargs -I% sed -i "s|${defaultCSPString}|\"${cyphComCSP}\"|g" %
	ls */*.yaml | xargs -I% sed -i "s|${defaultCSPString}|\"${webSignCSP}\"|g" %
	sed -i "s|'${defaultCSPString}'|${fullCSP}|g" shared/js/cyph/env-deploy.ts

	cat cyph.com/cyph-com.yaml |
		tr '\n' '☁' |
		perl -pe 's/(font-src )/\1https:\/\/fonts.googleapis.com /g' |
		perl -pe 's/(font-src )/\1https:\/\/fonts.gstatic.com /g' |
		perl -pe 's/(style-src )/\1https:\/\/fonts.googleapis.com /g' |
		perl -pe 's/(\/\(\.\*\?\)\/amp\[\/\]\?.*?connect-src )/\1https:\/\/google-analytics.com /g' |
		perl -pe 's/(\/\(\.\*\?\)\/amp\[\/\]\?.*?connect-src )/\1https:\/\/*.google-analytics.com /g' |
		perl -pe 's/(\/\(\.\*\?\)\/amp\[\/\]\?.*?style-src )/\1https:\/\/cdn.ampproject.org /g' |
		perl -pe 's/(\/\(\.\*\?\)\/amp\[\/\]\?.*?script-src )/\1https:\/\/cdn.ampproject.org /g' |
		perl -pe 's/(\/pricing\[\/\]\?.*?script-src )/\1'"'"'unsafe-inline'"'"' /g' |
		perl -pe 's/(\/checkout\[\/\]\?.*?child-src )(.*?connect-src )(.*?frame-src )(.*?img-src )(.*?script-src )/\1☼\2☼\3☼\4☼\5☼'"'"'unsafe-inline'"'"' /g' |
		sed "s|☼|${cyphComCheckoutCSPSources}|g" |
		perl -pe 's/(\/checkoutv1\[\/\]\?.*?child-src )(.*?connect-src )(.*?frame-src )(.*?img-src )(.*?script-src )/\1☼\2☼\3☼\4☼\5☼'"'"'unsafe-inline'"'"' /g' |
		sed "s|☼|${cyphComCheckoutV1CSPSources}|g" |
		tr '☁' '\n' |
		sed "s|Cache-Control: private, max-age=31536000|Cache-Control: public, max-age=31536000|g" \
	> cyph.com/new.yaml
	mv cyph.com/new.yaml cyph.com/cyph-com.yaml
fi

defaultHost='${locationData.protocol}//${locationData.hostname}:'
simpleWebSignPackageName=''
homeURL=''

if [ "${site}" == 'sdk' ] ; then
	sed -i 's|isSDK: boolean = false;|isSDK: boolean = true;|g' shared/js/cyph/env-deploy.ts
fi

if [ "${test}" ] ; then
	appURL="https://${version}.cyph.app"

	if [ "${simple}" ] ; then
		appURL="https://${version}-dot-cyph-app-dot-cyphme.appspot.com"
	fi
	if [ "${simpleWebSignBuild}" ] ; then
		simpleWebSignPackageName="$(echo "${appURL}" | perl -pe 's/^.*?:\/\///')"
		appURL="https://${version}-dot-websign-dot-cyphme.appspot.com"
	fi

	if [ "${simpleProdBuild}" ] ; then
		sed -i 's|useBaseUrl: boolean\s*= .*;|useBaseUrl: boolean = true;|g' shared/js/cyph/env-deploy.ts
	fi

	if [ -d backend ] ; then
		sed -i "s|staging|${version}|g" backend/config.go
		echo "  APP_URL: '${appURL}'" >> backend/app.yaml
		echo "  BACKEND_URL: 'https://${version}-dot-cyphme.appspot.com'" >> backend/app.yaml
		echo "  WEBSITE_URL: 'https://${version}-dot-cyph-com-dot-cyphme.appspot.com'" >> backend/app.yaml
	fi

	ls */*.yaml shared/js/cyph/env-deploy.ts | xargs -I% sed -i "s|api\.cyph\.com|${version}-dot-cyphme.appspot.com|g" %
	ls */*.yaml shared/js/cyph/env-deploy.ts | xargs -I% sed -i "s|partner-${version}-dot-cyphme\.appspot\.com|partner-api.cyph.com|g" %
	ls */*.yaml shared/js/cyph/env-deploy.ts | xargs -I% sed -i "s|www\.cyph\.com|${version}-dot-cyph-com-dot-cyphme.appspot.com|g" %
	sed -i "s|${defaultHost}42000|https://${version}-dot-cyphme.appspot.com|g" shared/js/cyph/env-deploy.ts
	sed -i "s|${defaultHost}42001|https://${version}-dot-cyph-com-dot-cyphme.appspot.com|g" shared/js/cyph/env-deploy.ts
	sed -i "s|${defaultHost}43000|https://${version}-dot-cyph-com-dot-cyphme.appspot.com|g" shared/js/cyph/env-deploy.ts
	sed -i "s|${defaultHost}42002|${appURL}|g" shared/js/cyph/env-deploy.ts
	sed -i "s|CYPH-AUDIO|https://${version}-dot-cyph-audio-dot-cyphme.appspot.com|g" shared/js/cyph/env-deploy.ts
	sed -i "s|CYPH-DOWNLOAD|https://${version}-dot-cyph-download-dot-cyphme.appspot.com|g" shared/js/cyph/env-deploy.ts
	sed -i "s|CYPH-IM|https://${version}-dot-cyph-im-dot-cyphme.appspot.com|g" shared/js/cyph/env-deploy.ts
	sed -i "s|CYPH-IO|https://${version}-dot-cyph-io-dot-cyphme.appspot.com|g" shared/js/cyph/env-deploy.ts
	sed -i "s|CYPH-ME|https://${version}-dot-cyph-me-dot-cyphme.appspot.com|g" shared/js/cyph/env-deploy.ts
	sed -i "s|CYPH-VIDEO|https://${version}-dot-cyph-video-dot-cyphme.appspot.com|g" shared/js/cyph/env-deploy.ts

	homeURL="https://${version}-dot-cyph-com-dot-cyphme.appspot.com"

	# if [ "${simple}" ] ; then
	# 	for yaml in `ls */cyph*.yaml` ; do
	# 		cat $yaml | perl -pe 's/(- url: .*)/\1\n  login: admin/g' > $yaml.new
	# 		mv $yaml.new $yaml
	# 	done
	# fi
else
	echo > shared/js/standalone/test-environment-setup.ts

	homeURL='https://www.cyph.com'

	if [ "${debug}" ] ; then
		homeURL='https://debug-dot-cyph-com-dot-cyphme.appspot.com'

		sed -i "s|${defaultHost}42002|https://debug.cyph.app|g" shared/js/cyph/env-deploy.ts
		sed -i "s|CYPH-AUDIO|https://debug.cyph.app/#burner/audio|g" shared/js/cyph/env-deploy.ts
		sed -i "s|CYPH-DOWNLOAD|https://debug.cyph.app/#download|g" shared/js/cyph/env-deploy.ts
		sed -i "s|CYPH-IM|https://debug.cyph.app/#burner|g" shared/js/cyph/env-deploy.ts
		sed -i "s|CYPH-IO|https://debug.cyph.app/#burner/io|g" shared/js/cyph/env-deploy.ts
		sed -i "s|CYPH-ME|https://debug.cyph.app|g" shared/js/cyph/env-deploy.ts
		sed -i "s|CYPH-VIDEO|https://debug.cyph.app/#burner/video|g" shared/js/cyph/env-deploy.ts
	# elif [ "${betaProd}" ] ; then
	# 	sed -i "s|${defaultHost}42002|https://beta.cyph.app|g" shared/js/cyph/env-deploy.ts
	# 	sed -i "s|CYPH-AUDIO|https://beta.cyph.app/#burner/audio|g" shared/js/cyph/env-deploy.ts
	# 	sed -i "s|CYPH-DOWNLOAD|https://beta.cyph.app/#download|g" shared/js/cyph/env-deploy.ts
	# 	sed -i "s|CYPH-IM|https://beta.cyph.app/#burner|g" shared/js/cyph/env-deploy.ts
	# 	sed -i "s|CYPH-IO|https://beta.cyph.app/#burner/io|g" shared/js/cyph/env-deploy.ts
	# 	sed -i "s|CYPH-ME|https://beta.cyph.app|g" shared/js/cyph/env-deploy.ts
	# 	sed -i "s|CYPH-VIDEO|https://beta.cyph.app/#burner/video|g" shared/js/cyph/env-deploy.ts
	else
		sed -i "s|${defaultHost}42002|https://cyph.app|g" shared/js/cyph/env-deploy.ts
		sed -i "s|CYPH-AUDIO|https://cyph.audio|g" shared/js/cyph/env-deploy.ts
		sed -i "s|CYPH-DOWNLOAD|https://cyph.download|g" shared/js/cyph/env-deploy.ts
		sed -i "s|CYPH-IM|https://cyph.im|g" shared/js/cyph/env-deploy.ts
		sed -i "s|CYPH-IO|https://cyph.io|g" shared/js/cyph/env-deploy.ts
		sed -i "s|CYPH-ME|https://cyph.me|g" shared/js/cyph/env-deploy.ts
		sed -i "s|CYPH-VIDEO|https://cyph.video|g" shared/js/cyph/env-deploy.ts
	fi

	if [ -d backend ] ; then
		echo "  APP_URL: 'https://cyph.app'" >> backend/app.yaml
		echo "  BACKEND_URL: 'https://api.cyph.com'" >> backend/app.yaml
		echo "  WEBSITE_URL: 'https://www.cyph.com'" >> backend/app.yaml
	fi

	sed -i "s|${defaultHost}42000|https://api.cyph.com|g" shared/js/cyph/env-deploy.ts
	sed -i "s|${defaultHost}42001|${homeURL}|g" shared/js/cyph/env-deploy.ts
	sed -i "s|${defaultHost}43000|${homeURL}|g" shared/js/cyph/env-deploy.ts
	sed -i "s|everflowOfferID: string = '4'|everflowOfferID: string = '5'|g" shared/js/cyph/env-deploy.ts
fi

if [ "${simple}" ] ; then
	sed -i \
		"s|${defaultHost}42001/root/|https://staging-dot-cyph-com-dot-cyphme.appspot.com/|g" \
		shared/js/cyph/env-deploy.ts
	sed -i \
		"s|${defaultHost}43000/root/|https://staging-dot-cyph-com-dot-cyphme.appspot.com/|g" \
		shared/js/cyph/env-deploy.ts
else
	sed -i "s|${defaultHost}42001/root/||g" shared/js/cyph/env-deploy.ts
	sed -i "s|${defaultHost}43000/root/||g" shared/js/cyph/env-deploy.ts
fi


# wpstatic + cache busting
if [ "${cacheBustedProjects}" ] ; then
	bash -c "
		touch .wpstatic.output

		if \
			[ ! '${skipWebsite}' ] && \
			( [ ! '${site}' ] || [ '${site}' == cyph.com ] )
		then
			if [ '${wpPromote}' ] ; then
				log 'Promoting WordPress'
				while true ; do
					./commands/wppromote.sh >> ../.wpstatic.output 2>&1 && break
				done
				log 'WordPress promotion successful'
			fi

			rm -rf wpstatic 2> /dev/null
			mkdir wpstatic
			cp cyph.com/cyph-com.yaml wpstatic/
			cd wpstatic
			../commands/wpstatic.sh $(test ${test} || echo '--prod') '${homeURL}' \
				>> ../.wpstatic.output 2>&1
			cd ..
			mv cyph.com cyph.com.src
			mv wpstatic cyph.com
			cp cyph.com.src/apple-pay cyph.com/
			cp cyph.com.src/robots.txt cyph.com/
			while [ ! -f .build.done ] ; do sleep 1 ; done
			cp -a shared/assets cyph.com/
			if [ ! -d cyph.com/img ] ; then mkdir cyph.com/img ; fi
			cp shared/assets/img/metaimage.png cyph.com/img/
		fi

		while [ ! -f .build.done ] ; do sleep 1 ; done
		rm .build.done

		# Cache bust
		log 'Cache bust' >> .wpstatic.output 2>&1
		for d in ${cacheBustedProjects} ; do
			if [ ! -d \"\${d}\" ] ; then
				continue
			fi
			cd \"\${d}\"
			../commands/cachebust.js >> ../.wpstatic.output 2>&1
			cd ..
		done

		touch .wpstatic.done
	" &
fi


# WebSign project
if [ ! "${site}" ] || ( [ "${site}" == websign ] || [ "${site}" == "${webSignedProject}" ] ) ; then
	cd websign

	if [ ! "${simple}" ] ; then
		rm js/keys.test.js
	else
		mv js/keys.test.js js/keys.js

		sed -i "s|location\.host\s*= .*;||g" js/main.js
		sed -i "s|location\.host|'${simpleWebSignPackageName}'|g" js/main.js
		sed -i "s|config.packageTimestampURL +|config.packageTimestampURL + 'websign/test/' +|" js/main.js
		sed -i "s|config.packageURL +|config.packageURL + 'websign/test/' +|" js/main.js
		sed -i "s|localStorage\.webSignWWWPinned|true|g" js/main.js
		sed -i "s|true\s*= true;||g" js/main.js
	fi

	cp -rf ../shared/favicon.ico ../shared/assets/img ./
	../commands/websign/pack.js index.html index.html

	# special case; add general solution when needed
	node -e "fs.writeFileSync('serviceworker.js', fs.readFileSync('lib/localforage.js').toString().trim() + '\n' + fs.readFileSync('serviceworker.js').toString())"

	cd ..
fi


if [ "${skipWebsite}" ] ; then
	mv cyph.com cyph.com.src
fi

# Compile + translate + minify

if [ ! "${site}" ] || [ "${site}" == 'cyph.app' ] || [ "${site}" == 'cyph.com' ] ; then
	./commands/buildunbundledassets.sh $(
		if [ "${simple}" ] || ( [ "${debug}" ] && [ ! "${debugProdBuild}" ] ) ; then
			if [ "${simpleProdBuild}" ] ; then
				echo '--prod-test --service-worker'
			else
				echo '--test'
			fi
		fi
	) || fail
fi

./commands/ngassets.sh
touch shared/assets/frozen

if [ "${site}" == 'sdk' ] ; then
	log "Build $(projectname sdk ${branchDir})"
	cd sdk
	ng build --source-map false --configuration "${environment}" || fail

	# Temporary workaround to remove unwanted excessively verbose error logging from emscripten
	cat dist/main.js |
		tr '\n' '☁' |
		perl -pe 's/process\.on\("(uncaughtException|unhandledRejection)",(\s*function.*?\}\)|.*?\))/0/g' |
		tr '☁' '\n' \
	> dist/main.js.new
	mv dist/main.js.new dist/main.js

	echo -n 'module.exports=module.exports.default;' >> dist/main.js
	echo -n 'module.exports.default=module.exports;' >> dist/main.js
	exit 0
fi

for d in ${compiledProjects} ; do
	if [ ! -d "${d}" ] ; then
		log "Skip $(projectname "${d}" ${branchDir})"
		continue
	fi

	log "Build $(projectname "${d}" ${branchDir})"

	cd "${d}"

	if [ "${websign}" ] && [ "${d}" == "${webSignedProject}" ] ; then
		# Merge in base64'd images, fonts, video, and audio
		../commands/websign/subresourceinline.js ../pkg/cyph.app-subresources
	fi

	node -e '(async () => console.log(`
		/* tslint:disable */

		(<any> self).translations = ${JSON.stringify(
			(await import("../commands/translations.js")).translations
		)};
	`.trim()))().then(() => process.exit(0))' > src/js/standalone/translations.ts

	if [ "${simple}" ] && [ ! "${simpleProdBuild}" ] ; then
		ng build --configuration "${environment}" --source-map false --vendor-chunk true || fail
		terser dist/vendor.js -o dist/vendor.js
	elif [ "${debug}" ] && [ ! "${debugProdBuild}" ] ; then
		ng build --source-map false --configuration "${environment}" || fail
	else
		../commands/prodbuild.sh --configuration "${environment}" || fail

		if [ "${simple}" ] && [ ! "${simpleWebSignBuild}" ] ; then
			ls dist/*.js | xargs -I% terser % -bo %
		fi
	fi

	mv *.html *.yaml sitemap.xml dist/ 2> /dev/null
	findmnt -t overlay -o TARGET -lun | grep "^${PWD}" | xargs sudo umount

	cd ..

	mv "${d}" "${d}.src"
	mv "${d}.src/dist" "${d}"
done

touch .build.done


# WebSign packaging
if [ "${pack}" ] ; then
	log "Pack $(projectname cyph.app ${branchDir})"

	cd "${webSignedProject}"

	# Merge imported libraries into threads
	find . -type f -name '*.js' | xargs -I% ../commands/websign/threadpack.js % || fail

	../commands/websign/pack.js --sri --minify index.html ../pkg/cyph.app

	cd ..
fi
