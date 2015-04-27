#!/bin/bash

dir="$(pwd)"
cd $(cd "$(dirname "$0")"; pwd)/..

ps ux | grep sass | grep -v grep | awk '{print $2}' | xargs kill -9
ps ux | grep tsc | grep -v grep | awk '{print $2}' | xargs kill -9
ps ux | grep fake_sqs | grep -v grep | awk '{print $2}' | xargs kill -9
ps ux | grep dev_appserver | grep -v grep | awk '{print $2}' | xargs kill -9

fake_sqs &
dev_appserver.py default/app.yaml cyph.com/cyph-com.yaml cyph.im/cyph-im.yaml cyph.me/cyph-me.yaml &
scripts/build.sh --watch

cat # infinite sleep
trap 'jobs -p | xargs kill' EXIT
