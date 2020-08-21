#!/bin/bash


cd $(cd "$(dirname "$0")" ; pwd)/..


./commands/copyworkspace.sh ~/.build
cd ~/.build

./commands/websign/getprodpackage.js prod.pkg

if [ ! -f prod.pkg ] ; then
	echo 'Failed to fetch production package'
	exit 1
fi

./commands/buildpackage.sh \
	--branch-dir ~/.build \
	--environment prod \
	--pack \
	--site cyph.app \
	--version prod \
	--websign

mv pkg/cyph.app local.pkg

localHash="$(sha local.pkg)"
prodHash="$(sha prod.pkg)"

if [ "${localHash}" == "${prodHash}" ] ; then
	echo "Expected and actual hashes match: ${localHash}"
else
	echo 'WARNING: Package hash mismatch!'
	echo
	echo "Expected package hash (local): ${localHash}"
	echo "Actual package hash (production): ${prodHash}"
	echo
	echo 'Please verify that you have the latest code and try again.'
fi
