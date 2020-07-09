#!/bin/bash


if [ -d ~/tmpgit ] ; then
	exit
fi

log 'Caching SSH and GPG keys'

ssh-add ~/.ssh/id_rsa

cat > ~/.gnupg/gpg.conf <<- EOM
	use-agent
EOM
cat > ~/.gnupg/gpg-agent.conf <<- EOM
	default-cache-ttl 34560000
	max-cache-ttl 34560000
	pinentry-program /usr/bin/pinentry-curses
EOM
gpg-connect-agent reloadagent /bye

touch ~/.gnupg/keycache

mkdir ~/tmpgit
cd ~/tmpgit
git init
touch balls
git add balls
git commit -S -a -m test

if [ ! -f ~/.ssh/id_rsa_docker ] ; then
	ssh-keygen -t rsa -b 4096 -C 'gibson@docker' -P '' -f ~/.ssh/id_rsa_docker
	log 'Give this public key access to WordPress and then hit enter to continue:'
	cat ~/.ssh/id_rsa_docker.pub
	read
	sleep 30
fi
