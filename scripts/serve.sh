#!/bin/bash

source ~/.bashrc

dir="$(pwd)"
cd $(cd "$(dirname "$0")"; pwd)/..

ln -s $(pwd)/default/geoip2 $GOPATH/src/geoip2
go install geoip2

fake_sqs &
scripts/build.sh --watch
dev_appserver.py default/app.yaml cyph.com/cyph-com.yaml cyph.im/cyph-im.yaml cyph.me/cyph-me.yaml

trap 'jobs -p | xargs kill' EXIT
