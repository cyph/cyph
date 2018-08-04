#!/bin/bash


cd $(cd "$(dirname "$0")" ; pwd)/../serverconfig


if [ ! -f "${1}.sh" ] ; then
	fail 'fak u gooby'
fi

script="$(cat "${1}.sh")"

for f in $(echo "${script}" | grep -oP "'BASE64 .*?'" | perl -pe "s/'BASE64 (.*)'/\1/g") ; do
	script="$(echo "${script}" | sed "s|'BASE64 ${f}'|'$(base64 "${f}")'|")"
done

for var in $(echo "${script}" | grep -oP '^PROMPT .*' | sed 's|PROMPT ||g') ; do
	echo -n "${var}: "
	read value
	script="$(echo "${script}" | sed "s|PROMPT ${var}|${var}='${value}'|")"
done

cat > Dockerfile <<- EOM
	FROM ubuntu:18.04

	LABEL Name="${1}"

	RUN echo '$(echo "${script}" | base64 | perl -pe 's/\s//g')' | base64 --decode > script.sh
	RUN sudo bash script.sh
EOM
