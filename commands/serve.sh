#!/bin/bash

dir="$(pwd)"
cd $(cd "$(dirname "$0")"; pwd)/..


prodlike=''
if [ "${1}" == '--prodlike' ] ; then
	prodlike=true
	shift
fi

if [ "${prodlike}" ] ; then
	rm -rf .build 2> /dev/null
	mkdir .build
	cp -rf * .build/
	cd .build
fi


appserver () {
	sudo /google-cloud-sdk/bin/dev_appserver.py $* > /dev/null 2>&1 &
}

go_appserver () {
	yes | sudo ~/go_appengine/dev_appserver.py $* &
}


for project in cyph.com cyph.im ; do
	for d in $(find shared -mindepth 1 -maxdepth 1 -type d | sed 's/shared\///g') ; do
		mkdir $project/$d 2> /dev/null
		sudo mount -o bind shared/$d $project/$d
	done
done

rm -rf $GOPATH/src/*
for f in $(find $(pwd)/default -mindepth 1 -maxdepth 1 -type d) ; do
	ln -s $f $GOPATH/src/$(echo "$f" | perl -pe 's/.*\///g') > /dev/null 2>&1 &
done
for f in $(find default -mindepth 1 -maxdepth 4 -type d) ; do
	go install $(echo "$f" | sed 's|default/||') > /dev/null 2>&1 & 
done

node -e 'new (require("firebase-server"))(44000)' &

cd cyph.com
rm -rf blog 2> /dev/null
mkdir blog
cd blog
../../commands/wpstatic.sh http://localhost:42001/blog > /dev/null 2>&1 &
cd ../..

cp -f default/app.yaml default/.build.yaml
cat ~/.cyph/default.vars >> default/.build.yaml
cat ~/.cyph/braintree.sandbox >> default/.build.yaml
cp ~/.cyph/*.mmdb default/

mkdir /tmp/cyph0
go_appserver --port 5000 --admin_port 6000 --host 0.0.0.0 --storage_path /tmp/cyph0 default/.build.yaml

mkdir /tmp/cyph1
appserver --port 5001 --admin_port 6001 --host 0.0.0.0 --storage_path /tmp/cyph1 cyph.com/cyph-com.yaml

mkdir /tmp/cyph2
appserver --port 5002 --admin_port 6002 --host 0.0.0.0 --storage_path /tmp/cyph2 cyph.im/cyph-im.yaml

if [ "${prodlike}" ] ; then
	./commands/build.sh

	if (( $? )) ; then
		echo -e '\n\nBuild failed\n'
		exit 1
	fi

	cd shared
	find js -name '*.js' | xargs -I% ../commands/websign/threadpack.js %
	cd ..

	for d in cyph.im cyph.com ; do
		cd $d
		../commands/websign/pack.js index.html index.html
		cd ..
	done

	echo -e "\n\n\nLocal env ready\n\n"
	sleep infinity
else
	bash -c 'sleep 90 ; ./commands/docs.sh > /dev/null 2>&1' &
	./commands/build.sh --watch
fi

trap 'jobs -p | xargs kill' EXIT
