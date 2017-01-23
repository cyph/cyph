#!/bin/bash


clientOnly=''
if [ "${1}" == '--client-only' ] ; then
	clientOnly=true
	shift
fi

source="$(cd "$(dirname "$0")/.." ; pwd)/"

sudo umount "${1}/shared/lib/js/node_modules" 2> /dev/null
rm -rf "${1}" 2> /dev/null
mkdir -p "${1}/shared"
dir="$(realpath "${1}")"

rsync -rLq "${source}" "${dir}" \
	--exclude shared/lib/js/libsodium \
	$(test "${clientOnly}" && echo '--exclude default') \
	$(ls -a "${source}" | grep -P '^\.[^\.]+' | xargs -I% echo -n '--exclude % ') \
	$( \
		find "${source}" -maxdepth 4 -name node_modules -not \( \
			-path '*/node_modules/*' \
			-or -path "${source}.*/*" \
		\) |
			sed "s|${source}|--exclude |g"
	)

cd "${dir}/shared/lib/js"
ln -s /node_modules node_modules

sed -i "s|\"../node_modules|\"/node_modules|g" "${dir}/shared/js/typings/libs.d.ts"
