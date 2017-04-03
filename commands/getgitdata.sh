#!/bin/bash

cd $(cd "$(dirname "$0")" ; pwd)/..


remote="$(
	git branch -vv |
	grep '^*' |
	perl -pe 's/.*\[(.*?)\/.*/\1/'
)"

cat <<- EOM
	branch="$(
		git describe --tags --exact-match 2> /dev/null || git branch |
		awk '/^\*/{print $2}' |
		tr '[:upper:]' '[:lower:]'
	)"

	username="$(
		git config --get remote.${remote}.url |
		perl -pe 's/.*:(.*)\/.*/\1/' |
		tr '[:upper:]' '[:lower:]'
	)"
EOM
