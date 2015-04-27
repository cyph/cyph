#!/bin/bash

dir="$(pwd)"
cd $(cd "$(dirname "$0")"; pwd)/..

cd default
go install geoip2
cd ..

fake_sqs &
dev_appserver.py default/app.yaml cyph.com/cyph-com.yaml cyph.im/cyph-im.yaml cyph.me/cyph-me.yaml &
scripts/build.sh --watch

cat # infinite sleep
trap 'jobs -p | xargs kill' EXIT
