#!/bin/bash


dir="$PWD"
cd $(cd "$(dirname "$0")" ; pwd)/..


eval "$(./commands/getgitdata.sh)"

site=''
if [ "${1}" == 'cyph.ws' ] || [ "${1}" == 'cyph.com' ] ; then
	site="${1}"
	shift
fi
args="${@}"

blockoomkiller () {
	sudo bash -c "echo -17 > /proc/${1}/oom_adj ; renice -20 ${1}" > /dev/null
}

ngserve () {
	cd "${1}"
	../commands/ngprojectinit.sh
	echo -e '\n\n\n'
	ng serve --host '0.0.0.0' --live-reload false --no-aot --port "${2}" --sourcemaps ${args}
}


# node /node_modules/.bin/firebase-server -p 44000 &
# blockoomkiller ${!}

cp -f backend/app.yaml backend/.build.yaml

cat ~/.cyph/backend.vars >> backend/.build.yaml
if [ "${branch}" == 'prod' ] ; then
	echo '  PROD: true' >> backend/.build.yaml
	cat ~/.cyph/braintree.prod >> backend/.build.yaml
else
	cat ~/.cyph/braintree.sandbox >> backend/.build.yaml
fi

mkdir /tmp/cyph0
dev_appserver.py \
	--skip_sdk_update_check \
	--port 42000 \
	--admin_port 6000 \
	--host 0.0.0.0 \
	--storage_path /tmp/cyph0 \
	backend/.build.yaml \
&
blockoomkiller ${!}

./commands/buildunbundledassets.sh

log 'Starting ng serve'

for arr in 'cyph.ws 42002' 'cyph.com 42001' ; do
	read -ra arr <<< "${arr}"

	if [ ! "${site}" ] || [ "${site}" == "${arr[0]}" ] ; then
		ngserve "${arr[0]}" "${arr[1]}" &
		blockoomkiller ${!}
		sleep 60
	fi
done

sleep Infinity
