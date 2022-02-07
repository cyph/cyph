#!/bin/bash


cd $(cd "$(dirname "$0")" ; pwd)/..
dir="$PWD"
source ~/.bashrc


customBuild=''
firebaseBackup=''
includeSyncfusion=''
noLockDown=''
e2e=''
unitTest=''
localSeleniumServer=''
site='cyph.app'
prod=''
prodBuild=''
environment='local'
if [ "${1}" == '--environment' ] ; then
	shift
	environment="${1}"
	shift
fi
if [ "${1}" == '--e2e' ] ; then
	e2e=true
	shift
fi
if [ "${1}" == '--unit-test' ] ; then
	unitTest=true
	shift
fi
if [ "${1}" == '--firebase-backup' ] ; then
	firebaseBackup=true
	shift
fi
if [ "${1}" == '--include-syncfusion' ] ; then
	includeSyncfusion=true
	shift
fi
if [ "${1}" == '--no-lock-down' ] ; then
	noLockDown='--no-lock-down'
	shift
fi
if [ "${1}" == '--poll' ] ; then
	poll=true
	shift
fi
if [ "${1}" == '--prod-build' ] ; then
	prodBuild=true
	shift
fi
if [ "${1}" == '--local-selenium-server' ] ; then
	localSeleniumServer=true
	shift
fi
if [ "${1}" == '--custom-build' ] ; then
	shift
	customBuild="${1}"
	shift
fi
if [ "${1}" == 'all' ] ; then
	site=''
	shift
elif [ "${1}" == 'backend' ] || [ "${1}" == 'cyph.app' ] || [ "${1}" == 'cyph.com' ] ; then
	site="${1}"
	shift
fi
args="${@}"

if [ "${e2e}" ] && [ ! "${site}" ] ; then
	fail 'Must specify a site when serving with --e2e'
fi

if [ "${firebaseBackup}" ] ; then
	environment='localBackup'
elif [ "${e2e}" ] ; then
	environment='e2e'
elif [ "${prod}" ] ; then
	environment='prod'
fi

if [ "${localSeleniumServer}" ] ; then
	log 'On the host OS, run `java -jar selenium-server-standalone-$VERSION.jar -role hub`'
fi

if [ "${customBuild}" ] ; then
	./commands/custombuildtoenvironment.js "${customBuild}" "${environment}" '' "${noLockDown}"
	checkfail
	environment='tmp'
fi


export CHROME_BIN="$(node -e 'console.log(require("puppeteer").executablePath())')"


ngserve () {
	ngserveInternal () {
		if [ "${unitTest}" ] ; then
			ng test --browsers ChromeHeadless --watch true
		elif [ "${e2e}" ] ; then
			ng e2e \
				$(if [ "${localSeleniumServer}" ] ; then
					echo '--protractor-config protractor.local-selenium-server.js'
				fi) \
				"${@}"
		else
			ng serve \
				--configuration "${environment}" \
				--live-reload false \
				--public-host "localhost:${port}" \
				$(if [ "${prodBuild}" ] ; then echo '--watch false' ; fi) \
				"${@}"
		fi
	}

	project="${1}"
	shift
	port="${1}"
	shift

	cd "${project}"
	../commands/ngprojectinit.sh
	echo -e '\n\n\n'

	# if [ ! "${e2e}" ] && [ ! "${unitTest}" ] && [ "${project}" == 'cyph.app' ] ; then
	# 	compodoc \
	# 		-s \
	# 		-t \
	# 		-r 42003 \
	# 		-n 'Cyph Docs' \
	# 		-p src/tsconfig.docs.json \
	# 		--disablePrivate \
	# 		--disableProtected \
	# 		--disableInternal \
	# 	&> /dev/null &
	# fi

	ngserveInternal \
		--host '0.0.0.0' \
		--port "${port}" \
		$(if [ "${prodBuild}" ] ; then
			../commands/prodbuild.sh --no-build |
				grep -vP '(build-optimizer|extract-licenses|named-chunks|output-hashing)'
		fi) \
		${args} \
		"${@}"
}


./commands/copyworkspace.sh ~/.build

node -e "http.createServer((req, res) => {
	child_process.spawn(
		'rsync',
		req.url.endsWith('/backend') ?
			['-a', 'backend', os.homedir() + '/.build/'] :
			['-a', 'shared/js', os.homedir() + '/.build/shared/'],
		{stdio: 'inherit'}
	);

	res.statusCode = 200;
	res.write('');
	res.end();
}).listen(45001)" &

cd ~/.build


# node /node_modules/.bin/firebase-server -p 44000 &

cp -f backend/app.yaml backend/.build.yaml

# External services (e.g. Twilio) unsupported in CircleCI for now, until needed
if [ -d ~/.cyph ] && [ -f ~/.cyph/backend.vars ] && [ ! "${CIRCLECI}" ] ; then
	cat ~/.cyph/backend.vars >> backend/.build.yaml
	if [ "${prod}" ] ; then
		echo '  PROD: true' >> backend/.build.yaml
		cat ~/.cyph/backend.vars.prod >> backend/.build.yaml
	else
		echo "  FIREBASE_PROJECT: 'cyph-test-local'" >> backend/.build.yaml
		cat ~/.cyph/backend.vars.sandbox >> backend/.build.yaml
	fi
fi

rm -rf backend/assets 2> /dev/null
mkdir backend/assets
./commands/backendplans.js backend/assets/plans.json
./commands/cloudfunctions.js backend/assets/cloudfunctions.list

# TODO: Handle host checks
export DATASTORE_EMULATOR_HOST=0.0.0.0:6000
gcloud beta emulators datastore start \
	--host-port ${DATASTORE_EMULATOR_HOST} \
	--no-store-on-disk \
	--project cyphme \
&
bash -c "
	cd backend
	export LOCAL_ENV=true
	export PORT=45000
	$(node -e "console.log(
		fs.existsSync('backend/.build.yaml') ?
			(
				fs.readFileSync('backend/.build.yaml').toString()
					.split('env_variables:')[1] ||
					''
			)
				.trim()
				.split('\n')
				.filter(s => s)
				.map(s => s.trim().split(':'))
				.map(([k, v]) => 'export ' + k + '=' + v.trim()).join('\n') :
			''
	)")
	gin --all -i -l 0.0.0.0 -p 42000 -a \${PORT} run *.go
" &
if [ "${includeSyncfusion}" ] ; then
	bash -c "
		cd syncfusion
		mvn function:run -Drun.port=42004
	" &
fi
if [ "${site}" == 'backend' ] ; then sleep Infinity ; fi

./commands/buildunbundledassets.sh \
	$(if [ ! "${CIRCLECI}" ] && [ ! "${prodBuild}" ] ; then echo -n '--test' ; fi)
checkfail

./commands/ngassets.sh

log 'Starting ng serve'

ports=''
for arr in 'cyph.app 42002' 'cyph.com 42001' ; do
	read -ra arr <<< "${arr}"

	if [ ! "${site}" ] || [ "${site}" == "${arr[0]}" ] ; then
		if [ "${e2e}" ] ; then
			ngserve "${arr[0]}" "${arr[1]}"
			exit $?
		else
			# if [ "${arr[0]}" == 'cyph.app' ] ; then
			# 	ports="${ports} 42003"
			# fi
			ports="${ports} ${arr[1]}"

			ngserve "${arr[0]}" "${arr[1]}" &
			sleep 60
		fi
	fi
done

for p in ${ports} ; do
	while ! curl http://localhost:${p} &> /dev/null ; do sleep 1 ; done
done
echo "${ports}" > ${dir}/serve.ready
notify serve ready

sleep Infinity
