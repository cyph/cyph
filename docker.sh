#!/bin/bash

cd $(cd "$(dirname "$0")"; pwd)


defaultsleep () {
	sleep 2
}

start () {
	if [ "$(uname -s)" == 'Linux' -a "$(ps aux | grep 'docker -d' | grep -v grep)" == '' ] ; then
		sudo echo
		nohup sudo bash -c 'docker -d &' > /dev/null 2>&1
		defaultsleep
	fi
}

stop () {
	docker ps -a | grep cyph | awk '{print $1}' | xargs -I% bash -c 'docker kill -s 9 % ; docker rm %'

	if [ "$(uname -s)" == 'Linux' ] ; then
		sudo killall docker > /dev/null 2>&1
		defaultsleep
	fi
}


image="cyph/$(git describe --tags --exact-match 2> /dev/null || git branch | awk '/^\*/{print $2}')"

# Foreground by default
processType='--rm=true'

command="${1}"
shift

args=''

start


if [ "${command}" == 'serve' ] ; then
	if [ "${1}" != '--foreground' ] ; then
		processType='-d'
		shift
	fi

	args=" \
		-v $HOME/.cyph:/home/gibson/.cyph \
		--privileged=true \
		-p 42000:5000 \
		-p 42001:5001 \
		-p 42002:5002 \
		-p 43000:4568 \
	"

	base='http://localhost'

	i=0
	for project in backend cyph.com cyph.im ; do
		echo "${project}: ${base}:4200${i}"
		i=$((i+1))
	done

	echo "docs: ${base}:42001/js/docs/index.html"

elif [ "${command}" == 'kill' ] ; then
	stop
	exit 0

elif [ "${command}" == 'deploy' ] ; then
	args=" \
		-it \
		-v $HOME/.cyph:/home/gibson/.cyph \
		-v $HOME/.gitconfig:/home/gibson/.gitconfig \
		-v $HOME/.gnupg:/home/gibson/.gnupg \
		-v $HOME/.ssh:/home/gibson/.ssh \
	"

	chmod -R 700 .

elif [ "${command}" == 'build' ] ; then
	args=''

elif [ "${command}" == 'commit' ] ; then
	args="-v $HOME/.gitconfig:/home/gibson/.gitconfig -v $HOME/.ssh:/home/gibson/.ssh"
	chmod -R 700 .

elif [ "${command}" == 'backmerge' ] ; then
	args="-v $HOME/.gitconfig:/home/gibson/.gitconfig -v $HOME/.ssh:/home/gibson/.ssh"

elif [ "${command}" == 'prodmerge' ] ; then
	args="-v $HOME/.gitconfig:/home/gibson/.gitconfig -v $HOME/.ssh:/home/gibson/.ssh"

elif [ "${command}" == 'docs' ] ; then
	args=''

elif [ "${command}" == 'restart' ] ; then
	stop
	start
	exit 0

elif [ "${command}" == 'updatelibs' ] ; then
	args=" \
		-it \
		-v $HOME/.cyph:/home/gibson/.cyph \
	"

elif [ "${command}" == 'websignhash' ] ; then
	args=''

elif [ "${command}" == 'make' ] ; then
	stop
	start
	docker build -t "${image}" .
	exit 0

elif [ "${command}" == 'makeclean' ] ; then
	stop
	start
	docker images | grep cyph | awk '{print $3}' | xargs -I% docker rmi -f %
	docker images | grep google/cloud-sdk | awk '{print $3}' | xargs -I% docker rmi -f %
	docker images --filter dangling=true --quiet | xargs -I% docker rmi -f %
	exit 0

else
	echo fak u gooby
	exit 1
fi

docker run $processType $args -v "$(echo "$(pwd)://cyph" | sed 's/\/cygdrive/\//g')" "${image}" "/cyph/commands/${command}.sh" $*
defaultsleep
