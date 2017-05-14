#!/bin/bash

cd $(cd "$(dirname "$0")" ; pwd)/..


cd "${1}"
shift
../commands/ngprojectinit.sh
ng "${@}"
