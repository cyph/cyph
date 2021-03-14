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
mkdir ${dir}/sdk/dist
cp sdk/dist/main.js ${dir}/sdk/dist/main.cjs
cp -f LICENSE ${dir}/sdk/

cat > ${dir}/sdk/sdk.js <<- EOM
import cyphSDK from './dist/main.cjs';
await cyphSDK.ready;

$(
	cat shared/js/sdk/app.module.ts |
		tr '\n' ' ' |
		perl -pe 's/.*?Object.entries\(\{(.*?)\}\).*/\1/' |
		perl -pe 's/\s+//g' |
		tr ',' '\n' |
		perl -pe 's/^(.*)$/export const \1 = cyphSDK.\1;/g'
)

export default cyphSDK;
EOM

if [ "${version}" != 'prod' ] ; then
	exit
fi

./commands/buildpackage.sh \
	--branch-dir ~/.build \
	--environment prodOptimized \
	--site sdk \
	--version prodOptimized \
|| fail

cp sdk/dist/main.js ${dir}/sdk/dist/main.min.cjs
