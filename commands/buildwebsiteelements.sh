#!/bin/bash


dir="$PWD"
cd $(cd "$(dirname "$0")" ; pwd)/..


./commands/protobuf.sh
cd cyph.com
../commands/ngprojectinit.sh
../commands/prodbuild.sh
