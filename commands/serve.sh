#!/bin/bash

source ~/.bashrc

dir="$(pwd)"
cd $(cd "$(dirname "$0")"; pwd)/..

for project in cyph.com cyph.im cyph.me ; do
	for d in $(find shared -mindepth 1 -maxdepth 1 -type d | sed 's/shared\///g') ; do
		mkdir $project/$d 2> /dev/null
		sudo mount -o bind shared/$d $project/$d
	done
done

ln -s $(pwd)/default/geoip2 $GOPATH/src/geoip2
go install geoip2

fake_sqs &

mkdir /tmp/cyph0
dev_appserver.py --port 5000 --admin_port 6000 --host 0.0.0.0 --storage_path /tmp/cyph0 default/app.yaml &

mkdir /tmp/cyph1
dev_appserver.py --port 5001 --admin_port 6001 --host 0.0.0.0 --storage_path /tmp/cyph1 cyph.com/cyph-com.yaml &

mkdir /tmp/cyph2
dev_appserver.py --port 5002 --admin_port 6002 --host 0.0.0.0 --storage_path /tmp/cyph2 cyph.im/cyph-im.yaml &

mkdir /tmp/cyph3
dev_appserver.py --port 5003 --admin_port 6003 --host 0.0.0.0 --storage_path /tmp/cyph3 cyph.me/cyph-me.yaml &

./commands/build.sh --watch

trap 'jobs -p | xargs kill' EXIT
