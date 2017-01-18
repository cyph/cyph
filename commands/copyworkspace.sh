#!/bin/bash


exclude='shared'
globalmodules=''

if [ "${1}" == '--client-only' ] ; then
	exclude="${exclude}|default"
	shift
fi
if [ "${1}" == '--global-modules' ] ; then
	globalmodules='true'
	shift
fi

rm -rf "${1}" 2> /dev/null
mkdir -p "${1}/shared"
dir="$(realpath "${1}")"


cd $(cd "$(dirname "$0")"; pwd)/..


cp -rf $(ls | grep -vP "^(${exclude})\$") "${dir}/"
cd shared
cp -rf $(ls | grep -v lib) "${dir}/shared/"
rm -rf "${dir}/shared/js/node_modules" 2> /dev/null
mkdir -p "${dir}/shared/lib/js"
cp lib/js/base.js "${dir}/shared/lib/js/"
cd "${dir}/shared/lib/js"
ln -s /node_modules node_modules

if [ "${globalmodules}" ] ; then
	sed -i "s|\"../node_modules|\"/node_modules|g" "${dir}/shared/js/typings/libs.d.ts"
fi
