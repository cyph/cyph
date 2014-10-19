#!/bin/bash

dir="$(pwd)"
cd $(cd "$(dirname "$0")"; pwd) # $(dirname `readlink -f "${0}" || realpath "${0}"`)

find . -name '*.scss' | perl -pe 's/(.*)\.scss/\1/g' | xargs -I% sass "%.scss" "%.css"

cd "${dir}"
