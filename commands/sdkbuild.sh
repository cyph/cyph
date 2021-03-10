#!/bin/bash


eval "$(parseArgs \
	--opt version \
)"


cd $(cd "$(dirname "$0")" ; pwd)/..
dir="$PWD"


version="${_arg_version}"

test=''
if [ ! "${version}" ] || [ "${version}" == 'prod' ] ; then
	version='prod'
else
	test=true
fi


./commands/copyworkspace.sh ~/.build
cd ~/.build

./commands/buildpackage.sh \
	--branch-dir ~/.build \
	--environment "${version}" \
	--site sdk \
	$(test "${test}" && echo '--test') \
	--version "${version}" \
|| fail

rm -rf ${dir}/sdk/dist 2> /dev/null
cp -a sdk/dist ${dir}/sdk/
cp -f LICENSE ${dir}/sdk/
