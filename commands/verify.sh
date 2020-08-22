#!/bin/bash


eval "$(parseArgs \
	--opt version \
)"


cd $(cd "$(dirname "$0")" ; pwd)/..


version="${_arg_version}"

test=''
if [ ! "${version}" ] || [ "${version}" == 'prod' ] ; then
	packageName='cyph.app'
	version='prod'
	versionString='production'
else
	packageName="${version}.cyph.app"
	test=true
	versionString="${version}"
fi


./commands/copyworkspace.sh ~/.build
cd ~/.build

./commands/websign/getreleasedpackage.js "${packageName}" released.pkg

if [ ! -f released.pkg ] ; then
	echo "Failed to fetch ${versionString} package."
	exit 1
fi

echo "Fetched ${versionString} package."
echo
echo 'Building package locally...'

./commands/buildpackage.sh \
	--branch-dir ~/.build \
	--cache-busted-projects-override \
	--environment "${version}" \
	--pack \
	--site "${package}" \
	$(test "${test}" && echo '--test') \
	--version "${version}" \
	--websign \
&> /dev/null

mv pkg/cyph.app local.pkg &> /dev/null

if [ ! -f local.pkg ] ; then
	echo "Failed to build local package."
	exit 1
fi

actualHash="$(sha local.pkg)"
expectedHash="$(sha released.pkg)"

if [ "${actualHash}" == "${expectedHash}" ] ; then
	echo "Expected and actual package hashes match: ${actualHash}"
	echo
	echo 'VERIFICATION SUCCESS'
else
	echo "Local package:"
	cat local.pkg
	echo -e '\n\n\n'

	echo "${versionString} package:"
	cat released.pkg
	echo -e '\n\n\n'

	echo 'WARNING: Package hash mismatch!'
	echo
	echo "Expected package hash (local): ${actualHash}"
	echo "Actual package hash (${versionString}): ${expectedHash}"
	echo
	echo 'Please verify that you have the latest code and try again.'
fi
