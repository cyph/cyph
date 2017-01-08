#!/bin/bash

cd $(cd "$(dirname "$0")"; pwd)


# Backup before doing anything

currentDir="$PWD"

mkdir ~/.cyphbackup 2> /dev/null
rm -rf ~/.cyphbackup/*
cd ~/.cyphbackup
git init > /dev/null
for f in ssh gitconfig gnupg ; do cp -a ~/.$f $f ; done
mkdir cyph ; find ~/.cyph -not -name cdn -mindepth 1 -maxdepth 1 -exec cp -a {} cyph/ \;
git add .
git commit --no-gpg-sign -a -m backup

cd "${currentDir}"


containername () {
	echo "$(echo "${image}_${1}" | sed 's|/|_|g')"
}

defaultsleep () {
	sleep 2
}

killcontainer () {
	docker ps -a | grep "${1}" | awk '{print $1}' | xargs -I% bash -c 'docker kill -s 9 % ; docker rm %'
}

start () {
	if [ "$(uname -s)" == 'Linux' -a "$(ps aux | grep 'docker -d' | grep -v grep)" == '' ] ; then
		sudo echo
		nohup sudo bash -c 'docker -d &' > /dev/null 2>&1
		defaultsleep
	fi
}

stop () {
	killcontainer cyph

	if [ "$(uname -s)" == 'Linux' ] ; then
		sudo killall docker > /dev/null 2>&1
		defaultsleep
	fi
}


image="cyph/$(
	git describe --tags --exact-match 2> /dev/null ||
	git branch | awk '/^\*/{print $2}' | tr '[:upper:]' '[:lower:]'
)"

mounts=" \
	-v $HOME/.cyph:/home/gibson/.cyph \
	-v $HOME/.gitconfig:/home/gibson/.gitconfig \
	-v $HOME/.gnupg:/home/gibson/.gnupg.original \
	-v $HOME/.ssh:/home/gibson/.ssh \
	-v $(echo "$PWD://cyph" | sed 's/\/cygdrive/\//g') \
"

# Foreground by default
processType='--rm=true'

command="${1}"
commandScript="commands/${command}.sh"
shift

args=''

start


if [ "${command}" == 'serve' ] ; then
	if [ "${1}" != '--foreground' ] ; then
		processType='-d'
	else
		shift
	fi

	args='--privileged=true -p 42000:5000 -p 42001:5001 -p 42002:5002 -p 44000:44000'

	base='http://localhost'

	i=0
	for project in backend cyph.com cyph.im ; do
		echo "${project}: ${base}:4200${i}"
		i=$((i+1))
	done

	echo "docs: ${base}:42001/js/docs/index.html"

elif [ "${command}" == 'stopserve' ] ; then
	killcontainer "$(containername serve)"
	rm -rf \
		*/.build.yaml \
		cyph.com/blog \
		shared/js/docs \
		$(find shared/css -name '*.css' -or -name '*.map') \
		$(find shared/js -name '*.js' -or -name '*.map')
	exit 0

elif [ "${command}" == 'kill' ] ; then
	stop
	exit 0

elif [ "${command}" == 'deploy' ] ; then
	args='--privileged=true -p 31337:31337/udp'

	chmod -R 700 .

	agse=true
	if [ "${1}" == '--simple' ] ; then
		agse=''
	elif [ "${1}" == '--site' -a "${2}" != 'cyph.im' ] ; then
		agse=''
	elif [ "${2}" == '--site' -a "${3}" != 'cyph.im' ] ; then
		agse=''
	elif [ "${3}" == '--site' -a "${4}" != 'cyph.im' ] ; then
		agse=''
	fi

	if [ $agse ] ; then
		agseRemoteAddress='10.0.0.42'
		agseLocalAddress='10.0.0.43'
		agseRemoteMAC="$(cat $HOME/.cyph/agse.remote.mac)"
		agseLocalInterface="$(cat $HOME/.cyph/agse.local.interface)"

		echo 'Need root for AGSE connection setup.'
		sudo echo

		sudo ipconfig set ${agseLocalInterface} INFORM ${agseLocalAddress} 2> /dev/null
		sleep 1
		sudo ip addr add ${agseLocalAddress} dev ${agseLocalInterface} 2> /dev/null
		sleep 1

		sudo arp -d ${agseRemoteAddress} 2> /dev/null
		sleep 1
		sudo route delete ${agseRemoteAddress} 2> /dev/null
		sleep 1
		sudo route add -host ${agseRemoteAddress} -interface ${agseLocalInterface} 2> /dev/null
		sleep 1
		sudo arp -s ${agseRemoteAddress} ${agseRemoteMAC} 2> /dev/null
		sleep 1
		sudo ip neigh add ${agseRemoteAddress} lladdr ${agseRemoteMAC} dev ${agseLocalInterface} 2> /dev/null
		sleep 1

		sudo bash -c "
			while [ ! -f /tmp/balls ] ; do sleep 1 ; done
			rm /tmp/balls

			ip addr del ${agseLocalAddress} dev ${agseLocalInterface} 2> /dev/null
			sleep 1
			ipconfig set ${agseLocalInterface} DHCP 2> /dev/null
			sleep 1

			ip link set ${agseLocalInterface} down 2> /dev/null
			sleep 1
			ifconfig ${agseLocalInterface} down 2> /dev/null
			sleep 1

			ip link set ${agseLocalInterface} up 2> /dev/null
			sleep 1
			ifconfig ${agseLocalInterface} up 2> /dev/null
			sleep 1
		" &
		cleanup () {
			touch /tmp/balls
		}
		trap cleanup EXIT
	fi

elif [ "${command}" == 'commit' ] ; then
	chmod -R 700 .

elif [ "${command}" == 'restart' ] ; then
	stop
	start
	exit 0

elif [ "${command}" == 'make' ] ; then
	stop
	start
	docker build -t "${image}_base" .

	interactiveContainer="$(containername interactive)"
	docker run -it \
		$mounts \
		--name="${interactiveContainer}" \
		"${image}_base" \
		/bin/bash -c 'gcloud auth login'
	docker commit "${interactiveContainer}" "${image}"
	docker rm -f "${interactiveContainer}"

	exit 0

elif [ "${command}" == 'makeclean' ] ; then
	stop
	start
	docker images | grep cyph | awk '{print $3}' | xargs -I% docker rmi -f %
	docker images | grep google/cloud-sdk | awk '{print $3}' | xargs -I% docker rmi -f %
	docker images --filter dangling=true --quiet | xargs -I% docker rmi -f %
	exit 0

elif [ ! -f "${commandScript}" ] ; then
	echo fak u gooby
	exit 1
fi

docker run -it \
	$processType \
	$mounts \
	$args \
	--name="$(containername "${command}")" \
	"${image}" \
	bash -c "source ~/.bashrc ; /cyph/${commandScript} $*"

defaultsleep
