#!/bin/bash

dir="$PWD"
cd $(cd "$(dirname "$0")" ; pwd)/..


eval "$(./commands/getgitdata.sh)"

ngserve () {
	cd "${1}"
	shift
	../commands/ngprojectinit.sh
	ng serve --host '0.0.0.0' ${*}
}


node /node_modules/.bin/firebase-server -p 44000 &

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
	--port 5000 \
	--admin_port 6000 \
	--host 0.0.0.0 \
	--storage_path /tmp/cyph0 \
	backend/.build.yaml \
&

ngserve cyph.ws --port 5002 &
sleep 60000

ngserve cyph.com --port 5001 &

sleep Infinity
