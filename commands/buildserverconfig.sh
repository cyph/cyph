#!/bin/bash


cd $(cd "$(dirname "$0")" ; pwd)/../serverconfig


if [ ! -f "${1}.sh" ] ; then
	fail 'fak u gooby'
fi

script="$(cat "${1}.sh")"

for f in $(echo "${script}" | grep -oP "'BASE64 .*?'" | perl -pe "s/'BASE64 (.*)'/\1/g") ; do
	script="$(echo "${script}" |
		sed "s|'BASE64 ${f}'|\"\$(echo '$(base64 "${f}" | perl -pe 's/\s//g')' ☁ base64 --decode)\"|g"
	)"
done

for var in $(echo "${script}" | grep -oP '^PROMPT .*' | sed 's|PROMPT ||g') ; do
	nano "${var}.var"
	script="$(echo "${script}" |
		sed "s|PROMPT ${var}|${var}=\"\$(echo '$(cat "${var}.var")' ☁ base64 --decode)\"|g"
	)"
	rm "${var}.var"
done

cat > Dockerfile <<- EOM
	FROM ubuntu:18.04

	LABEL Name="cyph-serverconfig-${1}"

	RUN echo '$(echo "${script}" |
		perl -pe 's/☁/|/g' |
		base64 |
		perl -pe 's/\s//g'
	)' | base64 --decode > script.sh
	RUN bash script.sh
EOM
