#!/bin/bash

cd $(cd "$(dirname "$0")"; pwd)


command="${1}"
shift

args=''

if [ "${command}" == 'serve' ] ; then
	args='-d -p 42000:8080 -p 42001:8081 -p 42002:8082 -p 42003:8083 -p 43000:4568'

	i=0
	for project in backend cyph.com cyph.im cyph.me ; do
		echo "${project}: http://$(boot2docker ip 2>/dev/null || echo localhost):4200${i}"
		i=$((i+1))
	done

else if [ "${command}" == 'deploy' ] ; then
	args="-v /home/gibson/.gnupg:$HOME/.gnupg -v /home/gibson/.cyph:$HOME/.cyph"

else if [ "${command}" == 'build' ] ; then
else if [ "${command}" == 'commit' ] ; then
else if [ "${command}" == 'updatelibs' ] ; then
else if [ "${command}" == 'websignhash' ] ; then
else
	echo fak u gooby
	exit 1
fi

docker run $args -v $(pwd):/cyph cyph/$(git branch | awk '/^\*/{print $2}') "./${command}.sh" $*
