#!/bin/bash

source ~/.bashrc

dir="$(pwd)"
cd $(cd "$(dirname "$0")"; pwd)/..


appserver () {
	sudo /google-cloud-sdk/bin/dev_appserver.py $*
}

go_appserver () {
	yes | sudo ~/go_appengine/dev_appserver.py $*
}


for project in cyph.com cyph.im ; do
	for d in $(find shared -mindepth 1 -maxdepth 1 -type d | sed 's/shared\///g') ; do
		mkdir $project/$d 2> /dev/null
		sudo mount -o bind shared/$d $project/$d
	done
done

rm -rf cyph.com/blog/theme/_posts 2> /dev/null
mkdir cyph.com/blog/theme/_posts
sudo mount -o bind cyph.com/blog/posts cyph.com/blog/theme/_posts

rm -rf $GOPATH/src/*
for f in $(find $(pwd)/default -mindepth 1 -maxdepth 1 -type d) ; do
	ln -s $f $GOPATH/src/$(echo "$f" | perl -pe 's/.*\///g')
done
for f in $(find default -mindepth 1 -maxdepth 4 -type d) ; do
	go install $(echo "$f" | sed 's|default/||')
done

node -e 'new (require("firebase-server"))(4568)' &

cd cyph.com/blog/theme
rm -rf ../build
jekyll build --watch --destination ../build &
cd ../../..

cp -f default/app.yaml default/.build.yaml
cat ~/.cyph/default.vars >> default/.build.yaml
cat ~/.cyph/braintree.sandbox >> default/.build.yaml
cp ~/.cyph/*.mmdb default/

mkdir /tmp/cyph0
go_appserver --port 5000 --admin_port 6000 --host 0.0.0.0 --storage_path /tmp/cyph0 default/.build.yaml &

mkdir /tmp/cyph1
appserver --port 5001 --admin_port 6001 --host 0.0.0.0 --storage_path /tmp/cyph1 cyph.com/cyph-com.yaml &

mkdir /tmp/cyph2
appserver --port 5002 --admin_port 6002 --host 0.0.0.0 --storage_path /tmp/cyph2 cyph.im/cyph-im.yaml &

./commands/build.sh --watch

trap 'jobs -p | xargs kill' EXIT
