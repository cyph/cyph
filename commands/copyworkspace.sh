#!/bin/bash


source="$(cd "$(dirname "$0")/.." ; pwd)"

${source}/commands/protobuf.sh

find "${1}" -type d -name node_modules -not -path '*/node_modules/*' -exec unbindmount "{}" \; 2> /dev/null
rm -rf "${1}" 2> /dev/null
mkdir -p "${1}/shared"
dir="$(realpath "${1}")"

cd "${source}"
cp -a $(ls | grep -vP '^shared$') "${dir}/"
cd shared
cp -a $(ls | grep -vP '^(lib|node_modules)$') "${dir}/shared/"

for d in cyph.com cyph.ws ; do
	cd "${dir}/${d}"
	../commands/ngprojectinit.sh
done

cd "${dir}/shared/js/native/js"
for d in $(ls | grep -v standalone) ; do rm ${d} ; cp -a ../../${d} ${d} ; done
cd standalone
for f in * ; do rm ${f} ; cp ../../../standalone/${f} ./ ; done
