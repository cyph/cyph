#!/bin/bash

cd $(cd "$(dirname "$0")"; pwd)/..


rm -rf "${1}" 2> /dev/null
mkdir -p "${1}/shared"
dir="$(realpath "${1}")"

cp -rf $(ls | grep -vP "^(shared|$(test "${1}" == '--client-only' && echo default))\$") "${dir}/"
cd shared
cp -rf $(ls | grep -v lib) "${dir}/shared/"
rm -rf "${dir}/shared/js/node_modules" 2> /dev/null

sed -i "s|\"../node_modules|\"/node_modules|g" "${dir}/shared/js/typings/libs.d.ts"
