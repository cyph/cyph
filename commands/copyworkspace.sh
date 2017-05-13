#!/bin/bash


source="$(cd "$(dirname "$0")/.." ; pwd)"

find "${1}" -type d -name node_modules -not -path '*/node_modules/*' -exec sudo umount "{}" \; 2> /dev/null
rm -rf "${1}" 2> /dev/null
mkdir -p "${1}/shared"
dir="$(realpath "${1}")"

cd "${source}"
cp -a $(ls | grep -vP '^shared$') "${dir}/"
cd shared
cp -a $(ls | grep -vP '^lib$') "${dir}/shared/"

rm "${dir}/shared/js/node_modules"
sed -i "s|\"../node_modules|\"/node_modules|g" "${dir}/shared/js/typings/libs.d.ts"

for d in cyph.com cyph.ws ; do
	cd "${dir}/${d}"
	../commands/cliprojectinit.sh
done
