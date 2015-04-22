#!/bin/bash

dir="$(pwd)"
cd $(cd "$(dirname "$0")"; pwd) # $(dirname `readlink -f "${0}" || realpath "${0}"`)

ps ux | grep sass | grep -v grep | awk '{print $2}' | xargs kill -9
ps ux | grep tsc | grep -v grep | awk '{print $2}' | xargs kill -9
ps ux | grep fake_sqs | grep -v grep | awk '{print $2}' | xargs kill -9
ps ux | grep dev_appserver | grep -v grep | awk '{print $2}' | xargs kill -9

sass --watch shared/css &
fake_sqs &
dev_appserver.py default/app.yaml cyph.com/cyph-com.yaml cyph.im/cyph-im.yaml cyph.me/cyph-me.yaml &
./build.sh --watch

cat # infinite sleep
trap 'jobs -p | xargs kill' EXIT
