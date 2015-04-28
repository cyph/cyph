#!/bin/bash

cd $(cd "$(dirname "$0")"; pwd)


image=cyph/$(git branch | awk '/^\*/{print $2}')

command="${1}"
shift

args=''

boot2docker start 2> /dev/null

if [ "${command}" == 'serve' ] ; then
	if [ "${1}" != '--foreground' ] ; then
		args='-d'
		shift
	fi

	args="${args} -p 42000:5000 -p 42001:5001 -p 42002:5002 -p 42003:5003 -p 43000:4568"

	i=0
	for project in backend cyph.com cyph.im cyph.me ; do
		echo "${project}: http://$(boot2docker ip 2>/dev/null || echo localhost):4200${i}"
		i=$((i+1))
	done

elif [ "${command}" == 'kill' ] ; then
	docker ps -a | grep cyph | awk '{print $1}' | xargs -I% bash -c 'docker kill -s 9 % ; docker rm %'
	exit 0

elif [ "${command}" == 'deploy' ] ; then
	args=" \
		-v $HOME/.cyph:/home/gibson/.cyph \
		-v $HOME/.gitconfig:/home/gibson/.gitconfig \
		-v $HOME/.gnupg:/home/gibson/.gnupg \
		-v $HOME/.ssh:/home/gibson/.ssh \
	"

	chmod -R 700 .

	docker run -v $(pwd):/cyph $image gcloud auth login

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

docker run $args -v $(pwd):/cyph $image "./${command}.sh" $*
