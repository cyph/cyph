#!/bin/bash

cd $(cd "$(dirname "$0")"; pwd)/..


rm -rf "${1}" 2> /dev/null
mkdir -p "${1}/shared"
dir="$(realpath "${1}")"

cp -rf $(ls | grep -v shared) "${dir}/"
cd shared
cp -rf $(ls | grep -v lib) "${dir}/shared/"
rm -rf "${dir}/shared/js/node_modules" 2> /dev/null
mkdir "${dir}/shared/js/node_modules"
cd "${dir}/shared/js/node_modules"

# Perf optimisation for repeated AOT compilation
for d in .bin @angular nativescript-angular ; do
	cp -rf "${NODE_MODULES}/${d}" ./
done

sed -i "s|\"../node_modules|\"${NODE_MODULES}|g" "${dir}/shared/js/typings/libs.d.ts"

for d in $(ls -a "${NODE_MODULES}") ; do
	if [ ! -d "${d}" ] ; then
		ln -s "${NODE_MODULES}/${d}" "${d}"
	fi
done
