#!/bin/bash


if [ -d ~/tmpgit ] ; then
	exit
fi

echo -e '\n\n\nCaching SSH and GPG keys\n'

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

mkdir ~/tmpgit
cd ~/tmpgit
git init
touch balls
git add balls
git commit -S -a -m test

if [ ! -f ~/.ssh/id_rsa_docker ] ; then
	ssh-keygen -t rsa -b 4096 -C 'gibson@docker' -P '' -f ~/.ssh/id_rsa_docker
	echo -e '\n\nGive this public key access to WordPress and then hit enter to continue:\n'
	cat ~/.ssh/id_rsa_docker.pub
	read
	sleep 30
fi
