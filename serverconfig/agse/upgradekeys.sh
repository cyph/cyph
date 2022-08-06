#!/bin/bash

# Upgrades keys to include all supported algorithms
# TODO: Factor out common code with setup.sh

set -e


activeKeys='4'
backupKeys='21'
backupDir="${HOME}/$(date +%s).bak"

if [ ! -f keybackup ] ; then
	echo 'keybackup not found'
	exit 1
fi

mkdir ${backupDir}
mv ${HOME}/*.js ${HOME}/*.json ${HOME}/keys ${HOME}/node_modules ${backupDir}/

cp -a * ${HOME}/

cd ${HOME}

distro="$(sudo lsb_release -c | awk '{print $2}')"
sudo cat /etc/apt/sources.list | grep -v nodesource.com > sources.list
echo "deb https://deb.nodesource.com/node_16.x ${distro} main" >> sources.list
sudo mv sources.list /etc/apt/sources.list
curl https://deb.nodesource.com/gpgkey/nodesource.gpg.key | sudo apt-key add -
sudo apt-get -y --allow-downgrades update
sudo apt-get -y --allow-downgrades upgrade

sudo rm -rf /usr/lib/node_modules.old &> /dev/null
sudo mv /usr/lib/node_modules /usr/lib/node_modules.old
sudo npm -g install npm xkcd-passphrase

mkdir node_modules
npm install \
	fast-sha512 \
	level \
	libsodium-wrappers-sumo \
	node-fetch \
	read \
	safe-compare \
	superdilithium \
	supersphincs-legacy \
	supersphincs \
	validator

eval "$(./getbackuppassword.js)"

if [ ! "${backupPasswordAes}" ] || [ ! "${backupPasswordSodium}" ] ||  ; then
	exit 1
fi

passwords=()
for i in `seq 1 ${activeKeys}` ; do
	echo -n "Password for key #${i}: "
	while [ ! "${passwords[${i}]}" ] ; then
		read passwords[${i}]
	fi
done

./generatekeys.js \
	"${activeKeys}" \
	"${backupKeys}" \
	"${HOME}/keybackup" \
	"${passwords[1]}" \
	"${passwords[2]}" \
	"${passwords[3]}" \
	"${passwords[4]}" \
	"${backupPasswordAes}" \
	"${backupPasswordSodium}"

rm generatekeys.js getbackuppassword.js setup.sh upgradekeys.sh
