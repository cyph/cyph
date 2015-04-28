#!/bin/bash

cd $(cd "$(dirname "$0")"; pwd)


command="${1}"
shift

args=''

boot2docker start 2> /dev/null

if [ "${command}" == 'serve' ] ; then
	args='-d -p 42000:8080 -p 42001:8081 -p 42002:8082 -p 42003:8083 -p 43000:4568'

	i=0
	for project in backend cyph.com cyph.im cyph.me ; do
		echo "${project}: http://$(boot2docker ip 2>/dev/null || echo localhost):4200${i}"
		i=$((i+1))
	done

elif [ "${command}" == 'deploy' ] ; then
	args="-v $HOME/.gnupg:/home/gibson/.gnupg -v $HOME/.cyph:/home/gibson/.cyph"

	chmod -R 700 .

elif [ "${command}" == 'build' ] ; then
	args=''

elif [ "${command}" == 'commit' ] ; then
	args="-v $HOME/.gitconfig:/home/gibson/.gitconfig -v $HOME/.ssh:/home/gibson/.ssh"

	chmod -R 700 .

elif [ "${command}" == 'updatelibs' ] ; then
	args=''

elif [ "${command}" == 'websignhash' ] ; then
	args=''

else
	echo fak u gooby
	exit 1
fi

docker run $args -v $(pwd):/cyph cyph/$(git branch | awk '/^\*/{print $2}') "./${command}.sh" $*
