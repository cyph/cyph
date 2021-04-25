#!/bin/bash


cd $(cd "$(dirname "$0")" ; pwd)/..


if [ "${CIRCLECI}" ] ; then
	cat <<- EOM
		branch="${CIRCLE_BRANCH}"
		username="${CIRCLE_PROJECT_USERNAME}"
	EOM

	exit 0
fi


remote="$(
	git branch -vv |
		grep '^*' |
		perl -pe 's/.*\[(.*?)\/.*/\1/'
	)"

cat <<- EOM
	branch="$(
		git describe --tags --exact-match 2> /dev/null || git branch |
			awk '/^\*/{print $2}' |
			tr '[:upper:]' '[:lower:]' |
			sed 's/^public$/prod/'
	)"

	username="$(
		git config --get remote.${remote}.url |
			perl -pe 's/.*:(.*)\/.*/\1/' |
			tr '[:upper:]' '[:lower:]'
	)"
EOM
