#!/bin/bash


eval "$(parseArgs \
	--opt-bool all-branches \
	--opt-bool and-simple \
	--opt-bool debug-prod \
	--opt-bool debug-prod-prod-build \
	--opt-bool fast \
	--opt-bool firebase-backup \
	--opt-bool firebase-local \
	--opt-bool mandatory-update \
	--opt-bool pack \
	--opt-bool prod \
	--opt-bool public-backend-deployment \
	--opt-bool save-build-artifacts \
	--opt-bool simple \
	--opt simple-custom-build \
	--opt-bool simple-prod-build \
	--opt-bool simple-websign-build \
	--opt-bool simple-websign-prod-build \
	--opt site \
	--opt-bool skip-beta \
	--opt-bool skip-firebase \
	--opt-bool skip-website \
	--opt websign-package-name-override \
	--opt-bool wp-promote \
)"


cd $(cd "$(dirname "$0")" ; pwd)/..
dir="$PWD"
originalArgs="${*}"


source ./commands/deployvars.sh

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
mandatoryUpdate=''
betaProd=''
skipBeta=''
prodAndBeta=''
debug=''
debugProdBuild=''
skipFirebase=''
skipWebsite=''
test=true
websign=true
webSignPackageNameOverride=''
assetsFrozen=''

if [ "${_arg_public_backend_deployment}" == 'on' ] ; then
	./commands/updaterepos.js
	touch ~/.noupdaterepos
	cd ~/.cyph/repos/internal
	git checkout public

	if [ -f ${dir}/.public-backend-deployment ] ; then
		mv ${dir}/.public-backend-deployment ./
	else
		fail '.public-backend-deployment not found'
	fi

	./commands/deploy.sh --prod --fast --site backend
	exit ${?}
fi

if [ "${_arg_simple}" == 'on' ] ; then
	simple=true
fi

if [ "${_arg_all_branches}" == 'on' ] ; then
	allBranches=true
fi

if [ "${_arg_firebase_backup}" == 'on' ] ; then
	firebaseBackup=true
fi

if [ "${_arg_firebase_local}" == 'on' ] ; then
	firebaseLocal=true
	site='firebase'
	fast=true
fi

if [ "${_arg_prod}" == 'on' ] ; then
	test=''
elif [ "${_arg_debug_prod}" == 'on' ] ; then
	test=''
	debug=true
	skipBeta=true
elif [ "${_arg_debug_prod_prod_build}" == 'on' ] ; then
	test=''
	debug=true
	debugProdBuild=true
elif [ "${_arg_simple_custom_build}" ] ; then
	simple=true
	customBuild="${_arg_simple_custom_build}"
elif [ "${_arg_simple_prod_build}" == 'on' ] ; then
	simple=true
	simpleProdBuild=true
elif [ "${_arg_simple_websign_build}" == 'on' ] ; then
	simpleWebSignBuild=true
elif [ "${_arg_simple_websign_prod_build}" == 'on' ] ; then
	simpleProdBuild=true
	simpleWebSignBuild=true
elif [ "${_arg_and_simple}" == 'on' ] ; then
	noSimple=''
fi

if [ "${_arg_save_build_artifacts}" == 'on' ] ; then
	saveBuildArtifacts=true
fi

if [ "${_arg_pack}" == 'on' ] ; then
	pack=true
fi

if [ "${_arg_fast}" == 'on' ] ; then
	fast=true
fi

if [ "${_arg_wp_promote}" == 'on' ] ; then
	wpPromote=true
fi

if [ "${_arg_mandatory_update}" == 'on' ] ; then
	mandatoryUpdate=true
fi

if [ "${_arg_site}" ] ; then
	site="${_arg_site}"
fi

if [ "${_arg_websign_package_name_override}" ] ; then
	webSignPackageNameOverride="${_arg_websign_package_name_override}"
elif [ -f "${dir}/.package-name" ] ; then
	webSignPackageNameOverride="$(cat "${dir}/.package-name")"
fi

if [ "${_arg_skip_firebase}" == 'on' ] ; then
	skipFirebase=true
fi

if [ "${_arg_skip_website}" == 'on' ] ; then
	skipWebsite=true
	site="${webSignedProject}"
fi

if [ "${_arg_skip_beta}" == 'on' ] ; then
	skipBeta=true
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

if \
	[ "${websign}" ] || \
	[ "${site}" == 'backend' ] || \
	[ "${site}" == 'firebase' ] || \
	[ "${site}" == 'websign' ]
then
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
elif [ ! "${test}" ] && [ ! "${skipBeta}" ] && [ "${websign}" ] ; then
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


if [ -f shared/assets/frozen ] ; then
	assetsFrozen=true
fi

if [ ! "${simple}" ] && [ "${assetsFrozen}" ] ; then
	if [ "${fast}" ] ; then
		log "WARNING: Assets frozen. Make sure you know what you're doing."
	else
		rm shared/assets/frozen
	fi
fi

./commands/copyworkspace.sh ~/.build
cd ~/.build

if \
	[ "${websign}" ] || \
	[ ! "${site}" ] || \
	[ "${site}" == 'backend' ] || \
	[ "${site}" == 'websign' ]
then
	./commands/updaterepos.js
	cp ~/.cyph/repos/chat-widget/dist/index.js backend/chat-widget.js
fi

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

	for gitBranch in $(git branch | sed 's/^\*//' | grep -vP '^\s*(prod|public)$') ; do
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
	rm -rf \
		${branchDir}/backend \
		${branchDir}/firebase \
		${branchDir}/nakedredirect \
		${branchDir}/syncfusion
fi

cd ~/.build

if [ ! "${test}" ] ; then
	sed -i 's|# instance_class|instance_class|' backend/app.yaml
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

# TODO: Factor out from here and buildpackage.sh

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
	./commands/buildpackage.sh \
		$(test "${betaProd}" && echo '--beta-prod') \
		--branch-dir "${branchDir}" \
		--cache-busted-projects "${cacheBustedProjects}" \
		--cache-busted-projects-override \
		--compiled-projects "${compiledProjects}" \
		--compiled-projects-override \
		$(test "${debug}" && echo '--debug') \
		$(test "${debugProdBuild}" && echo '--debug-prod-build') \
		--environment "$(getEnvironment ${branchDir})" \
		--main-version "${mainVersion}" \
		$(test "${pack}" && echo '--pack') \
		$(test "${prodAndBeta}" && echo '--prod-and-beta') \
		$(test "${simple}" && echo '--simple') \
		$(test "${simpleProdBuild}" && echo '--simple-prod-build') \
		$(test "${simpleWebSignBuild}" && echo '--simple-web-sign-build') \
		--site "${site}" \
		$(test "${skipWebsite}" && echo '--skip-website') \
		$(test "${test}" && echo '--test') \
		--version "$(getVersion ${branchDir})" \
		$(test "${websign}" && echo '--websign') \
		$(test "${wpPromote}" && echo '--wp-promote') \
	||
		fail
done
cd ~/.build

if [ ! "${site}" ] || [ "${site}" == 'cyph.app' ] || [ "${site}" == 'cyph.com' ] ; then
	rm -rf "${dir}/shared/assets"
	cp -a shared/assets "${dir}/shared/"
	if [ "${assetsFrozen}" ] ; then
		touch "${dir}/shared/assets/frozen"
	else
		rm "${dir}/shared/assets/frozen" 2> /dev/null
	fi
fi


if [ "${websign}" ] ; then
	package="$(projectname "$(echo "${webSignPackageNameOverride}" | grep . || echo cyph.app)")"

	log "WebSign ${package}"

	websignHashWhitelist=''
	if [ "${simple}" ] ; then
		websignHashWhitelist="{\"$(./commands/websign/bootstraphash.sh)\": true}"
	else
		websignHashWhitelist="$(cat modules/websign-hash-whitelist.json)"
	fi

	./commands/updaterepos.js

	customBuilds=''

	if [ "${username}" == 'cyph' ] && [ "${branch}" == 'staging' ] && [ ! "${debug}" ] ; then
		./commands/websign/custombuilds.js websign.build cyph.app "${mainVersion}"
		checkfail
		customBuilds="$(cat websign.build/.custombuilds.list)"
		rm websign.build/.custombuilds.list
	fi

	branchPackages=""

	if [ "${test}" ] || [ "${betaProd}" ] || [ "${debug}" ] || [ "${prodAndBeta}" ] ; then
		if [ "${package}" != 'cyph.app' ] ; then
			mv websign.build/cyph.app "websign.build/${package}"
		fi

		for branchDir in ${branchDirs} ; do
			branchPackage="$(projectname cyph.app ${branchDir})"
			branchPackages="${branchPackage} ${branchPackages}"

			mv ${branchDir}/websign.build/cyph.app websign.build/${branchPackage}
		done
	fi

	./commands/websign/codesign.js \
		$(if [ "${mandatoryUpdate}" ] ; then echo '--mandatory-update' ; fi) \
		$(if [ "${simple}" ] ; then echo '--test' ; fi) \
		"${websignHashWhitelist}" \
		$(
			for p in ${package} ${customBuilds} ${branchPackages} ; do
				echo -n "websign.build/${p}/.index.html=websign.build/${p} "
			done
		) \
	|| fail

	log 'Compressing resources for deployment to CDN'

	./commands/websign/publishsubresources.js \
		--custom-builds "${customBuilds}" \
		--package-name "${package}" \
		--packages-root 'websign.build' \
		--test "${simple}" \
	|| exit 1

	for branchPackage in ${branchPackages} ; do
		./commands/websign/publishsubresources.js \
			--package-name "${branchPackage}" \
			--packages-root 'websign.build' \
			--test "${simple}" \
		|| exit 1
	done
fi

if \
	[ "${websign}" ] || \
	[ ! "${site}" ] || \
	[ "${site}" == 'backend' ] || \
	[ "${site}" == 'websign' ]
then
	rm -rf backend/assets 2> /dev/null
	mkdir backend/assets

	cp modules/email/email-template.html backend/assets/

	./commands/backendplans.js backend/assets/plans.json
	./commands/cloudfunctions.js backend/assets/cloudfunctions.list
	./commands/ipfsgateways.js backend/assets/ipfs-gateways.json
	./commands/packagedatabase.js backend/assets/packages

	if [ "${allBranches}" ] ; then
		for branchDir in ${branchDirs} ; do
			rm -rf ${branchDir}/backend/assets 2> /dev/null
			cp -a backend/assets ${branchDir}/backend/
		done
	fi
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
	export branchPackage
	export test

	node -e '(async () => {
		const branchPackage = process.env.branchPackage;
		const test = process.env.test;

		for (const [domain, path] of Object.entries(
			(await import("@cyph/sdk")).configService.webSignRedirects
		).map(([k, v]) =>
			[k, v.join("/")]
		)) {
			child_process.spawnSync("bash", ["-c", `
				./commands/websign/createredirect.sh \\
					"${path}" "${domain}" "${branchPackage}" "${test}"
			`], {stdio: "inherit"});
		}

		process.exit(0);
	})()'
fi


done
cd ~/.build



# Firebase deployment
if \
	( [ ! "${site}" ] || [ "${site}" == 'firebase' ] ) && \
	[ ! "${skipFirebase}" ] && \
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

	npm ci
	rm package-lock.json # TODO: Revert after Firebase supports Node.js 18

	cp -rf ../../modules ~/.cyph/email-credentials.json js/
	cp ~/.cyph/*.mmdb ~/.cyph/github.token js/modules/
	html-minifier \
		--collapse-whitespace \
		--minify-css \
		--remove-comments \
		js/modules/email/email-template.html \
		-o js/modules/email/email-template.html

	cd ../..

	for firebaseProject in ${firebaseProjects} ; do {
		if [ ! "${test}" ] ; then
			cd firebase
		else
			cp -a firebase firebase.${firebaseProject}
			cd firebase.${firebaseProject}
		fi

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

		cat > functions/js/cyph-admin-vars.js <<- EOM
			export const cyphAdminKey = $(getBackendVar CYPH_FIREBASE_ADMIN_KEY);

			export const mailchimpCredentials = {
				apiKey: $(getBackendVar MAILCHIMP_API_KEY).split('-')[0],
				apiServer: $(getBackendVar MAILCHIMP_API_KEY).split('-')[1],
				listIDs: {
					pendingInvites: $(getBackendVar MAILCHIMP_LIST_ID_PENDING_INVITES),
					users: $(getBackendVar MAILCHIMP_LIST_ID_USERS)
				}
			};

			export const stripeSecretKey = $(getBackendVar STRIPE_SECRET_KEY);

			export const twilioCredentials = {
				authToken: $(getBackendVar TWILIO_AUTH_TOKEN),
				from: $(getBackendVar TWILIO_FROM),
				id: $(getBackendVar TWILIO_SID)
			};
EOM

		firebaseDomain='master.cyph.app'
		firebaseCustomBuildPrefix='master.'
		firebaseAccountsURL="https://${firebaseDomain}/"
		firebaseBurnerURL="${firebaseAccountsURL}#burner/"
		firebaseBurnerAudioURL="${firebaseBurnerURL}audio/"
		firebaseBurnerVideoURL="${firebaseBurnerURL}video/"
		firebaseTelehealthBurnerURL="${firebaseBurnerURL}"
		firebaseTelehealthBurnerAudioURL="${firebaseBurnerAudioURL}"
		firebaseTelehealthBurnerVideoURL="${firebaseBurnerVideoURL}"

		case "${firebaseProject}" in
			cyph-test-local | cyph-test-e2e)
				firebaseDomain='localhost:42002'
				firebaseCustomBuildPrefix='master.'
				firebaseAccountsURL="http://${firebaseDomain}/"
				firebaseBurnerURL="${firebaseAccountsURL}#burner/"
				firebaseBurnerAudioURL="${firebaseBurnerURL}audio/"
				firebaseBurnerVideoURL="${firebaseBurnerURL}video/"
				firebaseTelehealthBurnerURL="${firebaseBurnerURL}"
				firebaseTelehealthBurnerAudioURL="${firebaseBurnerAudioURL}"
				firebaseTelehealthBurnerVideoURL="${firebaseBurnerVideoURL}"
				;;

			cyph-test-staging)
				firebaseDomain='staging.cyph.app'
				firebaseCustomBuildPrefix='staging.'
				firebaseAccountsURL="https://${firebaseDomain}/"
				firebaseBurnerURL="${firebaseAccountsURL}#burner/"
				firebaseBurnerAudioURL="${firebaseBurnerURL}audio/"
				firebaseBurnerVideoURL="${firebaseBurnerURL}video/"
				firebaseTelehealthBurnerURL='https://staging.chat.cyph.healthcare/#'
				firebaseTelehealthBurnerAudioURL='https://staging.audio.cyph.healthcare/#'
				firebaseTelehealthBurnerVideoURL='https://staging.video.cyph.healthcare/#'
				;;

			cyph-test-beta)
				firebaseDomain='beta-staging.cyph.app'
				firebaseCustomBuildPrefix='beta-staging.'
				firebaseAccountsURL="https://${firebaseDomain}/"
				firebaseBurnerURL="${firebaseAccountsURL}#burner/"
				firebaseBurnerAudioURL="${firebaseBurnerURL}audio/"
				firebaseBurnerVideoURL="${firebaseBurnerURL}video/"
				firebaseTelehealthBurnerURL="${firebaseBurnerURL}"
				firebaseTelehealthBurnerAudioURL="${firebaseBurnerAudioURL}"
				firebaseTelehealthBurnerVideoURL="${firebaseBurnerVideoURL}"
				;;

			cyphme)
				firebaseDomain='cyph.app'
				firebaseCustomBuildPrefix=''
				firebaseAccountsURL="https://${firebaseDomain}/"
				firebaseBurnerURL='https://cyph.im/#'
				firebaseBurnerAudioURL='https://cyph.audio/#'
				firebaseBurnerVideoURL='https://cyph.video/#'
				firebaseTelehealthBurnerURL='https://chat.cyph.healthcare/#'
				firebaseTelehealthBurnerAudioURL='https://audio.cyph.healthcare/#'
				firebaseTelehealthBurnerVideoURL='https://video.cyph.healthcare/#'
				;;
		esac

		node -e "fs.writeFileSync('functions/js/namespaces.js', \`export const namespaces = \${
			JSON.stringify(require('glob').
				sync(\`\${os.homedir()}/.cyph/repos/custom-builds/*/config.json\`).
				map(path => ({
					domain: path.split('/').slice(-2)[0],
					...JSON.parse(fs.readFileSync(path).toString())
				})).
				filter(o => !o.useNamespace).
				reduce(
					(namespaces, {burnerOnly, domain}) => {
						const accountsURL = \`https://${firebaseCustomBuildPrefix}\${domain}/\`;
						const burnerURL = \`${accountsURL}/#\${burnerOnly ? '' : 'burner/'}\`;
						const burnerAudioURL = \`\${burnerURL}audio/\`;
						const burnerVideoURL = \`\${burnerURL}video/\`;

						namespaces[domain] = {
							accountsURL,
							burnerURL,
							burnerAudioURL,
							burnerVideoURL,
							domain,
							telehealthBurnerURL: burnerURL,
							telehealthBurnerAudioURL: burnerAudioURL,
							telehealthBurnerVideoURL: burnerVideoURL
						};
						namespaces[domain.replace(/\\./g, '_')] = namespaces[domain];
						return namespaces;
					},
					{
						'cyph.ws': {
							accountsURL: '${firebaseAccountsURL}',
							burnerURL: '${firebaseBurnerURL}',
							burnerAudioURL: '${firebaseBurnerAudioURL}',
							burnerVideoURL: '${firebaseBurnerVideoURL}',
							domain: '${firebaseDomain}',
							telehealthBurnerURL: '${firebaseTelehealthBurnerURL}',
							telehealthBurnerAudioURL: '${firebaseTelehealthBurnerAudioURL}',
							telehealthBurnerVideoURL: '${firebaseTelehealthBurnerVideoURL}'
						},
						'cyph_ws': {
							accountsURL: '${firebaseAccountsURL}',
							burnerURL: '${firebaseBurnerURL}',
							burnerAudioURL: '${firebaseBurnerAudioURL}',
							burnerVideoURL: '${firebaseBurnerVideoURL}',
							domain: '${firebaseDomain}',
							telehealthBurnerURL: '${firebaseTelehealthBurnerURL}',
							telehealthBurnerAudioURL: '${firebaseTelehealthBurnerAudioURL}',
							telehealthBurnerVideoURL: '${firebaseTelehealthBurnerVideoURL}'
						}
					}
				)
			)
		};\`)"

		firebaseCLI () {
			./functions/node_modules/node/bin/node functions/node_modules/.bin/firebase \
				--project=${firebaseProject} "${@}" |
				tee firebase.out

			# Workaround for Firebase CLI bug (edge case function deployment failure)
			if \
				(( $? )) || \
				cat firebase.out | \
					grep 'Unable to set publicly accessible IAM policy' &> /dev/null
			then
				rm firebase.out 2> /dev/null
				return 1
			fi

			rm firebase.out 2> /dev/null
			return 0
		}

		functionGroups="$(
			cat functions/index.js |
				tr '\n' '☁' |
				perl -pe 's/\/\*.*?\*\///g' |
				tr '☁' '\n' |
				grep 'exports\.' |
				tr '.' ' ' |
				awk '{print $2}' |
				sort |
				uniq |
				perl -pe 's/^(.+)$/functions:\1/g' |
				tr '\n' ',' |
				perl -pe 's/((.*?,){4}.*?),/\1\n/g' |
				perl -pe 's/,$/\n/g'
		)"

		cp -f ~/.cyph/firebase-credentials/${firebaseProject}.fcm functions/js/fcm-server-key
		firebaseCLI functions:config:set project.id="${firebaseProject}"
		gsutil cors set storage.cors.json "gs://${firebaseProject}.appspot.com"

		if [ ! "${test}" ] ; then
			firebaseCLI functions:config:set prod=true
		fi

		i=0
		while true ; do
			firebaseCLI deploy --except functions && break

			i=$((i+1))
			if [ $i -gt 5 ] ; then
				echo fail > result
				fail
			fi

			sleep 60
		done

		for functionGroup in ${functionGroups} ; do
			i=0
			while true ; do
				firebaseCLI deploy --only ${functionGroup} && break

				i=$((i+1))
				if [ $i -gt 5 ] ; then
					echo fail > result
					fail
				fi

				sleep 60
			done
		done

		echo pass > result
	} & done

	for firebaseProject in ${firebaseProjects} ; do
		result=firebase/result
		if [ "${test}" ] ; then
			result=firebase.${firebaseProject}/result
		fi

		while [ ! -f ${result} ] ; do sleep 5 ; done
		if [ "$(cat ${result})" == 'fail' ] ; then fail ; fi
	done

	rm -rf firebase*/functions/node_modules firebase*/functions/package-lock.json
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

if \
	( \
		[ "${websign}" ] || \
		[ ! "${site}" ] || \
		[ "${site}" == 'backend' ] || \
		[ "${site}" == 'websign' ] \
	) && [ ! "${betaProd}" ]
then
	cd backend
	goBuildSuccess=''
	for i in {1..5} ; do
		if go build ; then
			goBuildSuccess=true
			break
		fi
	done
	if [ ! "${goBuildSuccess}" ] ; then
		exit 1
	fi
	cd -
fi

if [ "${site}" != 'firebase' ] ; then
	mv test .test 2> /dev/null

	gcloudDeploy $(
		if [ "${site}" ] ; then
			if ( [ "${websign}" ] || [ "${site}" == 'websign' ] ) && [ ! "${betaProd}" ] ; then
				ls backend/*.yaml
			fi

			ls ${site}/*.yaml 2> /dev/null

			if [ "${websign}" ] && [ -d websign ] ; then
				ls websign/*.yaml
			fi
		else
			ls */*.yaml | grep -v '\.src/'
		fi
		if [ ! "${test}" ] && [ ! "${betaProd}" ] && [ ! "${debug}" ] ; then
			./commands/domain-mappings.js > dispatch.yaml
			echo cron.yaml dispatch.yaml
		fi
	)

	if [ -d syncfusion ] ; then
		cd syncfusion
		gcloud functions deploy $(cat deploy.args)
		cd ..
	fi

	mv .test test 2> /dev/null
	# if [ -d test ] && ( [ ! "${site}" ] || [ "${site}" == 'test' ] ) ; then
	# 	gcloud app services delete --quiet --project cyphme test
	# 	gcloudDeploy test/*.yaml
	# fi
fi


done
cd ~/.build


# Publish internal prod branch to public repo
if [ "${websign}" ] && [ ! "${test}" ] && [ ! "${betaProd}" ] && [ ! "${debug}" ] ; then
	cd "${dir}"
	git remote add public git@github.com:cyph/cyph.git 2> /dev/null
	git push public HEAD:master
	git push origin HEAD:public
	cd -
fi



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

notificationMessage=''
if [ -f .public-backend-deployment ] ; then
	notificationMessage="$(cat .public-backend-deployment)"
	rm .public-backend-deployment
else
	notificationMessage="deploy complete: ${version}$(test "${site}" && echo ", ${site}")"

	# Push out latest package data
	if [ "${websign}" ] && ( [ "${test}" ] || [ "${debug}" ] || [ "${betaProd}" ] ) ; then
		echo "${notificationMessage}" > .public-backend-deployment
		notificationMessage=''
	fi
fi

if [ "${notificationMessage}" ] ; then
	notify --admins "${notificationMessage}"
fi
