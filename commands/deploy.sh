#!/bin/bash


cd $(cd "$(dirname "$0")" ; pwd)/..
dir="$PWD"
originalArgs="${*}"


cacheBustedProjects='cyph.app cyph.com'
compiledProjects='cyph.app'
webSignedProject='cyph.app'
prodOnlyProjects='nakedredirect test websign'
site=''
noSimple=true
simple=''
simpleProdBuild=''
simpleWebSignBuild=''
pack=''
fast=''
mainEnvironment=''
allBranches=''
firebaseBackup=''
customBuild=''
saveBuildArtifacts=''
wpPromote=''
betaProd=''
noBeta=''
prodAndBeta=''
debug=''
debugProdBuild=''
skipWebsite=''
test=true
websign=true

if [ "${1}" == '--simple' ] ; then
	simple=true
	shift
fi

if [ "${1}" == '--all-branches' ] ; then
	allBranches=true
	shift
fi

if [ "${1}" == '--firebase-backup' ] ; then
	firebaseBackup=true
	shift
fi

if [ "${1}" == '--firebase-local' ] ; then
	firebaseLocal=true
	site='firebase'
	fast=true
	shift
fi

if [ "${1}" == '--prod' ] ; then
	test=''
	shift
elif [ "${1}" == '--debug-prod' ] ; then
	test=''
	debug=true
	noBeta=true
	shift
elif [ "${1}" == '--debug-prod-prod-build' ] ; then
	test=''
	debug=true
	debugProdBuild=true
	shift
elif [ "${1}" == '--simple-custom-build' ] ; then
	shift
	simple=true
	customBuild="${1}"
	shift
elif [ "${1}" == '--simple-prod-build' ] ; then
	simple=true
	simpleProdBuild=true
	shift
elif [ "${1}" == '--simple-websign-build' ] ; then
	simpleWebSignBuild=true
	shift
elif [ "${1}" == '--simple-websign-prod-build' ] ; then
	simpleProdBuild=true
	simpleWebSignBuild=true
	shift
elif [ "${1}" == '--and-simple' ] ; then
	noSimple=''
	shift
fi

if [ "${1}" == '--save-build-artifacts' ] ; then
	saveBuildArtifacts=true
	shift
fi

if [ "${1}" == '--pack' ] ; then
	pack=true
	shift
fi

if [ "${1}" == '--fast' ] ; then
	fast=true
	shift
fi

if [ "${1}" == '--wp-promote' ] ; then
	wpPromote=true
	shift
fi

if [ "${1}" == '--site' ] ; then
	shift
	site="${1}"
	shift
fi

if [ "${1}" == '--skip-website' ] ; then
	skipWebsite=true
	site="${webSignedProject}"
	shift
fi

if [ "${1}" == '--no-beta' ] ; then
	noBeta=true
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

if [ "${simple}" ] || [ "${customBuild}" ] ; then
	skipWebsite=true
fi

if [ "${skipWebsite}" ] ; then
	site=''
fi

if [ "${simple}" ] ; then
	websign=''
else
	cacheBustedProjects="$(echo "${cacheBustedProjects}" | sed "s|${webSignedProject}||")"
fi

if [ "${simpleWebSignBuild}" ] ; then
	simple=true
	prodOnlyProjects="$(echo "${prodOnlyProjects}" | sed 's| websign||')"
fi

if \
	( [ "${websign}" ] || [ "${simpleProdBuild}" ] ) && \
	( [ ! "${site}" ] || [ "${site}" == "${webSignedProject}" ] )
then
	pack=true
fi

if [ "${websign}" ] || [ "${site}" == 'backend' ] || [ "${site}" == 'firebase' ] ; then
	./commands/keycache.sh
fi

if [ "${compiledProjects}" ] && [ ! "${test}" ] && [ ! "${debug}" ] ; then
	if [ "${fast}" ] ; then
		log "WARNING: Skipping lint. Make sure you know what you're doing."
	else
		./commands/lint.sh
		checkfail
	fi
fi

log 'Initial setup'

# Branch config setup
eval "$(./commands/getgitdata.sh)"

if [ "${branch}" == 'prod' ] ; then
	branch='staging'
elif [ "${branch}" == 'beta' ] && [ ! "${simple}" ] ; then
	if [ "${test}" ] ; then
		branch='beta-staging'
	else
		betaProd=true
	fi
elif [ ! "${test}" ] ; then
	fail 'Cannot do prod deploy from test branch'
elif [ "${allBranches}" ] ; then
	fail 'Cannot do allBranches deploy from test branch'
fi
if [ "${allBranches}" ] ; then
	if [ ! "${test}" ] ; then
		fail 'Cannot do non-test allBranches deploy'
	fi
	if [ "${customBuild}" ] ; then
		fail 'Cannot do customBuild allBranches deploy'
	fi
fi
if [ "${test}" ] && [ "${wpPromote}" ] ; then
	fail 'Cannot do WordPress promotion during test deploy'
fi
mainVersion="${branch}"
if [ "${simple}" ] ; then
	if [ "${username}" != 'cyph' ] ; then
		mainVersion="${username}-${mainVersion}"
	fi

	mainVersion="simple-${mainVersion}"
fi
if [ ! "${test}" ] && [ ! "${betaProd}" ] && [ ! "${debug}" ] ; then
	mainVersion=prod
fi
if [ "${debug}" ] ; then
	if [ "${test}" ] ; then
		mainVersion="debug-${mainVersion}"
	else
		mainVersion=debug
	fi
fi

if [ "${betaProd}" ] ; then
	site="${webSignedProject}"
elif [ ! "${test}" ] && [ ! "${noBeta}" ] && [ "${websign}" ] ; then
	prodAndBeta=true
fi

processEnvironmentName () {
	if [ "${simple}" ] && [ ! "${simpleProdBuild}" ] ; then
		echo "local$(echo "${1}" | perl -pe 's/^([a-z])/\u$1/')"
	else
		echo "${1}"
	fi
}

if [ "${firebaseBackup}" ] ; then
	if [ ! "${test}" ] ; then
		fail 'Cannot use backup Firebase environment in prod'
	fi

	mainEnvironment="$(processEnvironmentName backup)"
elif [ ! "${test}" ] ; then
	if [ "${betaProd}" ] ; then
		mainEnvironment="$(processEnvironmentName betaProd)"
	elif [ "${debug}" ] ; then
		mainEnvironment="$(processEnvironmentName debugProd)"
	else
		mainEnvironment="$(processEnvironmentName prod)"
	fi
elif [ "${branch}" == 'beta-staging' ] ; then
	mainEnvironment="$(processEnvironmentName beta)"
elif \
	[ "${branch}" == 'staging' ] || \
	[ "${branch}" == 'beta' ] || \
	[ "${branch}" == 'master' ]
then
	mainEnvironment="$(processEnvironmentName "${branch}")"
else
	mainEnvironment="$(processEnvironmentName dev)"
fi

if [ "${customBuild}" ] ; then
	./commands/custombuildtoenvironment.js "${customBuild}" "${mainEnvironment}" "${mainVersion}"
	checkfail
	mainEnvironment='tmp'
	mainVersion="$(echo "${mainVersion}" | sed 's|^simple-||')-$(echo "${customBuild}" | tr '.' '-')"
fi


if [ ! "${simple}" ] && [ -f shared/assets/frozen ] ; then
	if [ "${fast}" ] ; then
		log "WARNING: Assets frozen. Make sure you know what you're doing."
	else
		rm shared/assets/frozen
	fi
fi

./commands/copyworkspace.sh ~/.build
cd ~/.build

if [ ! "${site}" ] || [ "${site}" == 'backend' ] ; then
	./commands/updaterepos.js
	cp ~/.cyph/repos/chat-widget/dist/index.js backend/chat-widget.js
fi

cp -a backend/shared/* firebase/functions/

# Secret credentials
cat ~/.cyph/backend.vars >> backend/app.yaml
cat ~/.cyph/test.vars >> test/test.yaml
cp ~/.cyph/GeoIP2-*.mmdb backend/
./commands/setanalgeotargets.js

# mkdir geoisp.tmp
# cd geoisp.tmp
# wget "https://download.maxmind.com/app/geoip_download?edition_id=GeoIP2-ISP&suffix=tar.gz&license_key=$(
# 	cat ~/.cyph/maxmind.key
# )" -O geoisp.tar.gz
# tar xzf geoisp.tar.gz
# mv */*.mmdb GeoIP2-ISP.mmdb
# if [ -f GeoIP2-ISP.mmdb ] ; then
# 	cp -f GeoIP2-ISP.mmdb ~/.cyph/
# else
# 	log 'GeoIP2-ISP.mmdb missing'
# 	cp ~/.cyph/GeoIP2-ISP.mmdb ./
# fi
# mv GeoIP2-ISP.mmdb ../backend/
# cd ..
# rm -rf geoisp.tmp

# Remove serve artifacts
rm backend/.build.yaml 2> /dev/null
rm backend/index.yaml 2> /dev/null

branchDirs=''
if [ "${allBranches}" ] ; then
	./commands/updaterepos.js
	mkdir ~/.build/branches
	cd ~/.cyph/repos/internal

	for gitBranch in $(git branch | sed 's/^\*//' | grep -vP '^\s*prod$') ; do
		branchDir="${HOME}/.build/branches/$(
			echo "${gitBranch}" | perl -pe 's/^beta$/beta-staging/'
		)"
		branchDirs="${branchDir} ${branchDirs}"

		git checkout ${gitBranch}
		./commands/copyworkspace.sh ${branchDir}
		git clean -dfx
		rm -rf ${branchDir}/backend ${branchDir}/firebase
		cp -a ~/.build/backend ${branchDir}/
		cat ~/.cyph/backend.vars.sandbox >> ${branchDir}/backend/app.yaml

		backendFirebaseProject='cyph-test'
		if [ "${gitBranch}" == 'beta' ] || [ "${gitBranch}" == 'master' ] ; then
			backendFirebaseProject="cyph-test-${branch}"
		elif [ "${gitBranch}" == 'prod' ] ; then
			backendFirebaseProject='cyph-test-staging'
		fi
		echo "  FIREBASE_PROJECT: '${backendFirebaseProject}'" >> ${branchDir}/backend/app.yaml
	done
elif [ "${prodAndBeta}" ] ; then
	branchDir="${HOME}/.build/branches/beta"
	branchDirs="${branchDir}"
	./commands/updaterepos.js
	mkdir ~/.build/branches
	cd ~/.cyph/repos/internal
	git checkout beta
	./commands/copyworkspace.sh ${branchDir}
	git clean -dfx
	rm -rf ${branchDir}/backend ${branchDir}/firebase ${branchDir}/nakedredirect
fi

cd ~/.build

if [ ! "${test}" ] ; then
	echo '  PROD: true' >> backend/app.yaml
	cat ~/.cyph/backend.vars.prod >> backend/app.yaml
else
	cat ~/.cyph/backend.vars.sandbox >> backend/app.yaml
fi


getEnvironment () {
	version="$(getVersion ${1})"

	if [ "${prodAndBeta}" ] && [ "${version}" == 'beta' ] ; then
		echo betaProd
	elif [ "${version}" == "${mainVersion}" ] ; then
		echo "${mainEnvironment}"
	elif [ "${version}" == 'beta-staging' ] ; then
		processEnvironmentName beta
	elif \
		[ "${version}" == 'staging' ] || \
		[ "${version}" == 'beta' ] || \
		[ "${version}" == 'master' ]
	then
		processEnvironmentName "${version}"
	else
		processEnvironmentName dev
	fi
}

getVersion () {
	if [ ! "${1}" ] || [ "${1}" == '~/.build' ] || [ "${1}" == "${HOME}/.build" ] ; then
		echo "${mainVersion}"
	else
		echo "$(test "${simple}" && echo 'simple-')$(echo "${1}" | perl -pe 's/.*\///')"
	fi
}

projectname () {
	version="$(getVersion ${2})"

	if [ "${prodAndBeta}" ] && [ "${version}" == 'beta' ] ; then
		echo "beta.${1}"
	elif [ "${simple}" ] || [ "${1}" == 'cyph.com' ] ; then
		echo "${version}-dot-$(echo "${1}" | tr '.' '-')-dot-cyphme.appspot.com"
	elif [ "${test}" ] || [ "${betaProd}" ] || [ "${debug}" ] ; then
		echo "${version}.${1}"
	else
		echo "${1}"
	fi
}



for branchDir in ~/.build ${branchDirs} ; do


version="$(getVersion ${branchDir})"
environment="$(getEnvironment ${branchDir})"
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
	cyphComCheckoutCSPSources="bitcoin: bitcoincash: $(cat cyph.com/checkoutcspsources |
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
		tr '☁' '\n' |
		sed "s|Cache-Control: private, max-age=31536000|Cache-Control: public, max-age=31536000|g" \
	> cyph.com/new.yaml
	mv cyph.com/new.yaml cyph.com/cyph-com.yaml
fi

defaultHost='${locationData.protocol}//${locationData.hostname}:'
simpleWebSignPackageName=''
homeURL=''

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
		sed -i "s|http://localhost:42000|https://${version}-dot-cyphme.appspot.com|g" backend/config.go
	fi

	ls */*.yaml shared/js/cyph/env-deploy.ts | xargs -I% sed -i "s|api.cyph.com|${version}-dot-cyphme.appspot.com|g" %
	ls */*.yaml shared/js/cyph/env-deploy.ts | xargs -I% sed -i "s|www.cyph.com|${version}-dot-cyph-com-dot-cyphme.appspot.com|g" %
	sed -i "s|${defaultHost}42000|https://${version}-dot-cyphme.appspot.com|g" shared/js/cyph/env-deploy.ts
	sed -i "s|${defaultHost}42001|https://${version}-dot-cyph-com-dot-cyphme.appspot.com|g" shared/js/cyph/env-deploy.ts
	sed -i "s|${defaultHost}43000|https://${version}-dot-cyph-com-dot-cyphme.appspot.com|g" shared/js/cyph/env-deploy.ts
	sed -i "s|${defaultHost}42002|${appURL}|g" shared/js/cyph/env-deploy.ts
	sed -i "s|CYPH-AUDIO|https://${version}-dot-cyph-audio-dot-cyphme.appspot.com|g" shared/js/cyph/env-deploy.ts
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
		sed -i "s|CYPH-IM|https://debug.cyph.app/#burner|g" shared/js/cyph/env-deploy.ts
		sed -i "s|CYPH-IO|https://debug.cyph.app/#burner/io|g" shared/js/cyph/env-deploy.ts
		sed -i "s|CYPH-ME|https://debug.cyph.app|g" shared/js/cyph/env-deploy.ts
		sed -i "s|CYPH-VIDEO|https://debug.cyph.app/#burner/video|g" shared/js/cyph/env-deploy.ts
	# elif [ "${betaProd}" ] ; then
	# 	sed -i "s|${defaultHost}42002|https://beta.cyph.app|g" shared/js/cyph/env-deploy.ts
	# 	sed -i "s|CYPH-AUDIO|https://beta.cyph.app/#burner/audio|g" shared/js/cyph/env-deploy.ts
	# 	sed -i "s|CYPH-IM|https://beta.cyph.app/#burner|g" shared/js/cyph/env-deploy.ts
	# 	sed -i "s|CYPH-IO|https://beta.cyph.app/#burner/io|g" shared/js/cyph/env-deploy.ts
	# 	sed -i "s|CYPH-ME|https://beta.cyph.app|g" shared/js/cyph/env-deploy.ts
	# 	sed -i "s|CYPH-VIDEO|https://beta.cyph.app/#burner/video|g" shared/js/cyph/env-deploy.ts
	else
		sed -i "s|${defaultHost}42002|https://cyph.app|g" shared/js/cyph/env-deploy.ts
		sed -i "s|CYPH-AUDIO|https://cyph.audio|g" shared/js/cyph/env-deploy.ts
		sed -i "s|CYPH-IM|https://cyph.im|g" shared/js/cyph/env-deploy.ts
		sed -i "s|CYPH-IO|https://cyph.io|g" shared/js/cyph/env-deploy.ts
		sed -i "s|CYPH-ME|https://cyph.me|g" shared/js/cyph/env-deploy.ts
		sed -i "s|CYPH-VIDEO|https://cyph.video|g" shared/js/cyph/env-deploy.ts
	fi

	if [ -d backend ] ; then
		sed -i "s|http://localhost:42000|https://api.cyph.com|g" backend/config.go
	fi

	sed -i "s|${defaultHost}42000|https://api.cyph.com|g" shared/js/cyph/env-deploy.ts
	sed -i "s|${defaultHost}42001|${homeURL}|g" shared/js/cyph/env-deploy.ts
	sed -i "s|${defaultHost}43000|${homeURL}|g" shared/js/cyph/env-deploy.ts
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

if [ -d nakedredirect ] ; then
	cp backend/config.go nakedredirect/
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
		websignHashWhitelist="$(cat hashwhitelist.json)"
	else
		mv js/keys.test.js js/keys.js

		sed -i "s|location\.host\s*= .*;||g" js/main.js
		sed -i "s|location\.host|'${simpleWebSignPackageName}'|g" js/main.js
		sed -i "s|config.packageUrl +|config.packageUrl + 'websign/test/' +|" js/main.js
		sed -i "s|localStorage\.webSignWWWPinned|true|g" js/main.js
		sed -i "s|true\s*= true;||g" js/main.js

		websignHashWhitelist="{\"$(../commands/websign/bootstraphash.sh)\": true}"
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

./commands/buildunbundledassets.sh $(
	if [ "${simple}" ] || ( [ "${debug}" ] && [ ! "${debugProdBuild}" ] ) ; then
		if [ "${simpleProdBuild}" ] ; then
			echo '--prod-test --service-worker'
		else
			echo '--test'
		fi
	fi
) || fail

./commands/ngassets.sh

rm -rf "${dir}/shared/assets"
cp -a shared/assets "${dir}/shared/"
touch shared/assets/frozen

for d in $compiledProjects ; do
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

	node -e 'console.log(`
		/* tslint:disable */

		(<any> self).translations = ${JSON.stringify(
			require("../commands/translations").translations
		)};
	`.trim())' > src/js/standalone/translations.ts

	if \
		( [ "${debug}" ] && [ ! "${debugProdBuild}" ] ) || \
		( [ "${simple}" ] && [ ! "${simpleProdBuild}" ] )
	then
		ng build --sourceMap false --configuration "${environment}" || fail
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


done
cd ~/.build



if [ "${websign}" ] ; then
	package="$(projectname cyph.app)"

	log "WebSign ${package}"

	./commands/updaterepos.js
	cp -rf ~/.cyph/repos/cdn ./

	customBuilds=''

	if [ "${username}" == 'cyph' ] && [ "${branch}" == 'staging' ] && [ ! "${debug}" ] ; then
		./commands/websign/custombuilds.js pkg/cyph.app pkg "${mainVersion}"
		checkfail
		customBuilds="$(cat pkg/custombuilds.list)"
		rm pkg/custombuilds.list
	fi

	packages="${package} ${customBuilds}"

	if [ "${test}" ] || [ "${betaProd}" ] || [ "${debug}" ] || [ "${prodAndBeta}" ] ; then
		if [ "${package}" != 'cyph.app' ] ; then mv pkg/cyph.app "pkg/${package}" ; fi

		for branchDir in ${branchDirs} ; do
			branchPackage="$(projectname cyph.app ${branchDir})"
			packages="${branchPackage} ${packages}"

			mv ${branchDir}/pkg/cyph.app pkg/${branchPackage}
		done
	fi

	for p in ${packages} ; do
		rm -rf cdn/${p}
	done

	./commands/websign/codesign.js \
		$(if [ "${simple}" ] ; then echo '--test' ; fi) \
		"${websignHashWhitelist}" \
		$(
			for p in ${packages} ; do
				echo -n "pkg/${p}=cdn/${p} "
			done
		) \
	|| fail

	log 'Compressing resources for deployment to CDN'

	if [ -d pkg/cyph.app-subresources ] ; then
		find pkg/cyph.app-subresources -type f -not -name '*.srihash' -print0 | xargs -0 -P4 -I% bash -c ' \
			gzip -k9 %; \
			brotli -Zk %; \
			ipfsAdd %.br > %.ipfs; \
		'

		cp -a pkg/cyph.app-subresources/* cdn/${package}/

		for customBuild in ${customBuilds} ; do
			cd cdn/${customBuild}
			for subresource in $(ls ../../pkg/cyph.app-subresources | grep -vP '\.(css|js)$') ; do
				ln -s ../${package}/${subresource} ${subresource}
				chmod 700 ${subresource}
				git add ${subresource}
			done
			git commit -S -m "${customBuild}" . &> /dev/null
			cd ../..
		done
	fi

	for branchDir in ${branchDirs} ; do
		branchPackage="$(projectname cyph.app ${branchDir})"
		branchSubresources=${branchDir}/pkg/cyph.app-subresources

		if [ -d ${branchSubresources} ] ; then
			mv ${branchSubresources}/* cdn/${branchPackage}/
		fi
	done

	cd cdn

	for p in ${packages} ; do
		if [ "${simple}" ] ; then
			mkdir -p websign/test
			rm -rf websign/test/${p} 2> /dev/null
			mv ${p} websign/test/
			cd websign/test
		fi

		for ext in app ws ; do
			plink=$(echo ${p} | sed "s/\\.${ext}\$//")
			if (echo ${p} | grep -P "\\.${ext}\$" > /dev/null) && ! [ -L ${plink} ] ; then
				ln -s ${p} ${plink}
				chmod 700 ${plink}
				git add ${plink}
				git commit -S -m ${plink} ${plink} &> /dev/null
			fi
		done

		cp ${p}/current ${p}/pkg.srihash

		find ${p} -type f -not \( \
			-name '*.srihash' \
			-or -name '*.ipfs' \
			-or -name '*.gz' \
			-or -name '*.br' \
		\) -exec bash -c ' \
			if [ ! -f {}.ipfs ] ; then \
				gzip -k9 {}; \
				brotli -Zk {}; \
				ipfsAdd {}.br > {}.ipfs; \
			fi; \
			chmod 700 {}.ipfs {}.gz {}.br; \
			git add {}.ipfs {}.gz {}.br; \
			git commit -S -m \
				"$(cat {}.srihash 2> /dev/null || date +%s)" \
				{}.ipfs {}.gz {}.br \
			&> /dev/null; \
		' \;

		if [ "${simple}" ] ; then
			cd ../..
		fi
	done

	git push

	for p in ${packages} ; do
		if [ "${simple}" ] ; then
			cd websign/test
		fi

		ipfsWarmUpAll $(find ${p} -type f -name '*.ipfs')

		if [ "${simple}" ] ; then
			cd ../..
		fi
	done

	cd ..

	# Publish internal prod branch to public repo
	if [ ! "${test}" ] && [ ! "${betaProd}" ] && [ ! "${debug}" ] ; then
		cd "${dir}"
		git remote add public git@github.com:cyph/cyph.git 2> /dev/null
		git push public HEAD:master
		git push origin HEAD:public
		cd -
	fi
fi

if [ ! "${site}" ] || [ "${site}" == 'backend' ] ; then
	./commands/ipfsgateways.js backend/ipfs-gateways.json
	./commands/packagedatabase.js backend/packages.json
fi


if [ "${prodAndBeta}" ] ; then
	branchDirs=''
fi


for branchDir in ~/.build ${branchDirs} ; do
version="$(getVersion ${branchDir})"
environment="$(getEnvironment ${branchDir})"
branchPackage="${package}"
if [ "${branchDir}" != '~/.build' ] ; then
	branchPackage="$(projectname cyph.app ${branchDir})"
fi

cd ${branchDir}


# WebSign redirects
if [ ! "${simple}" ] ; then
	createRedirect () {
		domain="${1}"
		path="${2}"

		./commands/websign/createredirect.sh "${path}" "${domain}" "${branchPackage}" "${test}"
	}

	createRedirect 'burner.cyph.app' 'burner'
	createRedirect 'cyph.audio' 'burner/audio'
	createRedirect 'cyph.im' 'burner'
	createRedirect 'cyph.io' 'burner/io'
	createRedirect 'cyph.me' 'profile'
	createRedirect 'cyph.video' 'burner/video'
	createRedirect 'cyph.ws' 'burner'
fi


done
cd ~/.build



# Firebase deployment
if \
	( [ ! "${site}" ] || [ "${site}" == 'firebase' ] ) && \
	[ ! "${simple}" ] && \
	[ ! "${betaProd}" ] && \
	[ ! "${debug}" ]
then
	if [ ! "${test}" ] ; then
		firebaseProjects='cyphme'
	else
		if [ "${firebaseLocal}" ] ; then
			firebaseProjects='cyph-test-local'
		else
			firebaseProjects='cyph-test cyph-test2 cyph-test-e2e cyph-test-local'

			if [ "${allBranches}" ] ; then
				firebaseProjects="cyph-test-staging cyph-test-beta cyph-test-master ${firebaseProjects}"
			elif [ "${mainEnvironment}" != 'dev' ] ; then
				if [ "${branch}" == 'beta-staging' ] ; then
					firebaseProjects="cyph-test-beta ${firebaseProjects}"
				else
					firebaseProjects="cyph-test-${branch} ${firebaseProjects}"
				fi
			fi
		fi

		# Workaround for https://stackoverflow.com/q/50513374/459881
		cat firebase/functions/index.js |
			tr '\n' '☁' |
			perl -pe 's/exports\.itemRemoved\s.*?exports\./exports\./g' |
			tr '☁' '\n' \
		> firebase/functions/index.new.js
		mv firebase/functions/index.new.js firebase/functions/index.js
	fi

	./commands/buildunbundledassets.sh || fail
	./commands/updaterepos.js

	cd firebase

	sed -i "s|DOMAIN|namespace$(
		{ echo cyph.ws; ls ~/.cyph/repos/custom-builds; } |
			sed 's/[^\.]//g' |
			sort |
			tail -n1 |
			sed "s|\.|.replace('_', '.')|g"
	)|g" database.rules.json

	sed -i "s|DOMAIN|namespace.split('_').join('.')|g" storage.rules

	cd functions

	node -e 'fs.writeFileSync("namespaces.js", `module.exports = ${JSON.stringify(
		require("glob").sync(`${os.homedir()}/.cyph/repos/custom-builds/*/config.json`).
			map(path => ({
				domain: path.split("/").slice(-2)[0],
				...JSON.parse(fs.readFileSync(path).toString())
			})).
			filter(o => !o.useNamespace).
			reduce(
				(namespaces, {burnerOnly, domain}) => {
					namespaces[domain] = {
						accountsURL: `https://${domain}/`,
						burnerURL: `https://${domain}/${burnerOnly ? "" : "#burner/"}`,
						domain
					};
					namespaces[domain.replace(/\./g, "_")] = namespaces[domain];
					return namespaces;
				},
				{
					"cyph.ws": {
						accountsURL: "https://cyph.app/",
						burnerURL: "https://cyph.im/#",
						domain: "cyph.app"
					},
					"cyph_ws": {
						accountsURL: "https://cyph.app/",
						burnerURL: "https://cyph.im/#",
						domain: "cyph.app"
					}
				}
			)
	)};`)'

	npm install
	cp ../../modules/database-service.js ~/.cyph/email-credentials.js ./
	html-minifier --collapse-whitespace --minify-css --remove-comments email.html -o email.html

	cp -rf ../../shared/assets/js ./
	cd ..

	for firebaseProject in ${firebaseProjects} ; do
		getBackendVar () {
			{ grep "${1}" ~/.cyph/backend.vars || grep "${1}" ~/.cyph/backend.vars.$(
				if [ "${firebaseProject}" == 'cyphme' ] ; then
					echo prod
				else
					echo sandbox
				fi
			); } |
				sed "s|${1}: ||"
		}

		cat > functions/cyph-admin-vars.js <<- EOM
			module.exports = {
				cyphAdminKey: $(getBackendVar CYPH_FIREBASE_ADMIN_KEY),
				mailchimpCredentials: {
					apiKey: $(getBackendVar MAILCHIMP_API_KEY),
					listIDs: {
						pendingInvites: $(getBackendVar MAILCHIMP_LIST_ID_PENDING_INVITES),
						users: $(getBackendVar MAILCHIMP_LIST_ID_USERS)
					}
				},
				twilioCredentials: {
					authToken: $(getBackendVar TWILIO_AUTH_TOKEN),
					from: $(getBackendVar TWILIO_FROM),
					id: $(getBackendVar TWILIO_SID)
				}
			};
EOM

		firebaseCLI () {
			./functions/node_modules/node/bin/node functions/node_modules/.bin/firebase "${@}"
		}

		cp -f ~/.cyph/firebase-credentials/${firebaseProject}.fcm functions/fcm-server-key
		firebaseCLI use --add "${firebaseProject}"
		firebaseCLI functions:config:set project.id="${firebaseProject}"
		gsutil cors set storage.cors.json "gs://${firebaseProject}.appspot.com"

		i=0
		while true ; do
			firebaseCLI deploy && break

			i=$((i+1))
			if [ $i -gt 5 ] ; then fail ; fi

			sleep 10
		done
	done

	rm -rf functions/node_modules functions/package-lock.json
	cd ..
fi

backendFirebaseProject='cyphme'
if [ "${test}" ] ; then
	backendFirebaseProject='cyph-test'
	if [ "${branch}" == 'staging' ] || [ "${branch}" == 'master' ] ; then
		backendFirebaseProject="cyph-test-${branch}"
	elif [ "${branch}" == 'beta-staging' ] ; then
		backendFirebaseProject='cyph-test-beta'
	fi
fi
echo "  FIREBASE_PROJECT: '${backendFirebaseProject}'" >> backend/app.yaml


for branchDir in ~/.build ${branchDirs} ; do
version="$(getVersion ${branchDir})"
environment="$(getEnvironment ${branchDir})"
cd ${branchDir}


if [ "${betaProd}" ] || [ "${debug}" ] ; then
	rm -rf ${prodOnlyProjects} backend
elif [ "${test}" ] ; then
	rm -rf ${prodOnlyProjects}
fi

if [ "${cacheBustedProjects}" ] ; then
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

if [ "${simpleWebSignBuild}" ] ; then
	rm -rf "${webSignedProject}" 2> /dev/null
fi

gcloudDeploy () {
	gcloud app deploy --quiet --no-promote --project cyphme --version "${version}" "${@}"
}

if [ "${site}" != 'firebase' ] ; then
	mv test .test 2> /dev/null

	gcloudDeploy $(
		if [ "${site}" ] ; then
			ls ${site}/*.yaml 2> /dev/null

			if [ "${websign}" ] && [ -d websign ] ; then
				ls websign/*.yaml
			fi
		else
			ls */*.yaml | grep -v '\.src/'
		fi
		if [ ! "${test}" ] && [ ! "${betaProd}" ] && [ ! "${debug}" ] ; then
			echo cron.yaml dispatch.yaml
		fi
	)

	mv .test test 2> /dev/null
	# if [ -d test ] && ( [ ! "${site}" ] || [ "${site}" == 'test' ] ) ; then
	# 	gcloud app services delete --quiet --project cyphme test
	# 	gcloudDeploy test/*.yaml
	# fi
fi


done
cd ~/.build



cd "${dir}"

if [ "${saveBuildArtifacts}" ] ; then rm -rf .build 2> /dev/null ; fi

if \
	[ ! "${noSimple}" ] && \
	[ "${test}" ] && \
	[ ! "${simple}" ] && \
	[ "${site}" != 'cyph.com' ] && \
	[ "${site}" != 'firebase' ]
then
	mv ~/.build ~/.build.original
	./commands/deploy.sh --simple $originalArgs
elif [ "${saveBuildArtifacts}" ] && [ -d ~/.build.original ] ; then
	mv ~/.build  ~/.build.original/simplebuild
	cp -rf ~/.build.original .build
elif [ "${saveBuildArtifacts}" ] ; then
	cp -rf ~/.build ./
fi
