#!/bin/bash

# Air Gapped Signing Environment setup script for Debian


activeKeys='4'
backupKeys='21'
localAddress='10.0.0.42'
remoteAddress='10.0.0.43'
port='31337'


# Force IPv4 to work around IPv6 issues in some networking hardware
# https://askubuntu.com/a/38468/15643
echo 'precedence ::ffff:0:0/96 100' >> /etc/gai.conf

export DEBIAN_FRONTEND=noninteractive
apt-get -y --allow-downgrades update
apt-get -y --allow-downgrades upgrade
export DEBIAN_FRONTEND=text

# Optionally comment this out if using the default keyboard layout
apt-get install -y --allow-downgrades console-data console-setup keyboard-configuration
dpkg-reconfigure keyboard-configuration
setupcon

oldhostname=$(hostname)
echo -n 'Hostname: '
read hostname
echo ${hostname} > /etc/hostname
sed -i "s|${oldhostname}|${hostname}|g" /etc/hosts

oldusername=$(ls /home)
echo -n 'Username: '
read username
echo 'FYI, login password must be under 64 characters.'
adduser ${username}
adduser ${username} admin
echo "${username} ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers
agseDir="/home/${username}/agse"

export DEBIAN_FRONTEND=noninteractive
apt-get -y --allow-downgrades update
apt-get -y --allow-downgrades install curl lsb-release apt-transport-https
apt-get -y --allow-downgrades purge apache* mysql* openssh-server
distro="$(lsb_release -c | awk '{print $2}')"
echo "deb https://deb.nodesource.com/node_18.x ${distro} main" >> /etc/apt/sources.list
curl https://deb.nodesource.com/gpgkey/nodesource.gpg.key | apt-key add -
apt-get -y --allow-downgrades update
apt-get -y --allow-downgrades upgrade
apt-get -y --allow-downgrades install ecryptfs-utils less lsof nodejs sudo

npm -g install xkcd-passphrase

mkdir -p ${agseDir}
cp "$(dirname "$0")"/* ${agseDir}/
chmod -R 777 ${agseDir}


cat > ${agseDir}/setup.sh << EndOfMessage
#!/bin/bash

cd /home/${username}

if [ -f ${agseDir}/keybackup ] ; then
	eval "\$(${agseDir}/getbackuppassword.js)"

	if [ ! "\${backupPasswordAes}" ] || [ ! "\${backupPasswordSodium}" ] ; then
		exit 1
	fi

	echo -e '\nRegenerate backup password? [y/N]'
	read regenerateBackupPassword

	if \
		[ "\${regenerateBackupPassword}" == 'y' ] || \
		[ "\${regenerateBackupPassword}" == 'Y' ]
	then
		regenerateBackupPassword=true
	else
		regenerateBackupPassword=''
	fi
fi

passwords=()
for i in \`seq 1 ${activeKeys}\` ; do
	echo -n "Password for key #\${i}: "
	read passwords[\${i}]
done

if [ "\${regenerateBackupPassword}" ] || [ ! -f ${agseDir}/keybackup ] ; then
	newBackupPasswordAes="\$(xkcd-passphrase 256)"
	newBackupPasswordSodium="\$(xkcd-passphrase 256)"
	echo "Password for backup keys is: \${newBackupPasswordAes} \${newBackupPasswordSodium}"
	echo -e '\nMemorize this and then hit enter to continue.'
	read
else
	newBackupPasswordAes="\${backupPasswordAes}"
	newBackupPasswordSodium="\${backupPasswordSodium}"
fi

reset

${agseDir}/generatekeys.js \
	"${activeKeys}" \
	"${backupKeys}" \
	"$(ls ${agseDir}/keybackup 2> /dev/null)" \
	"\${passwords[1]}" \
	"\${passwords[2]}" \
	"\${passwords[3]}" \
	"\${passwords[4]}" \
	"\${backupPasswordAes}" \
	"\${backupPasswordSodium}" \
	"\${newBackupPasswordAes}" \
	"\${newBackupPasswordSodium}"

echo

if [ ! -f ${agseDir}/.generatekeys-success ] ; then
	echo 'ERROR: Key initialization failed.'
	read
	exit 1
fi

if [ -f ${agseDir}/keybackup ] ; then
	echo 'Press enter to continue.'
else
	echo -n "Before committing, you must validate that the SHA-512 of "
	echo -n "the public key JSON you've been emailed matches the above."
	echo
	echo -n "Press enter to continue after you've either done so or "
	echo -n "written down the hash for validation at a later time."
	echo
fi

read

mv ${agseDir}/server.js ./


sudo tee -a /etc/network/interfaces > /dev/null << EOM
auto eth0
iface eth0 inet static
	address ${localAddress}
	netmask 255.255.0.0
EOM

cat >> .bashrc <<- EOM
	if [ -f /autostart ] ; then
		if [ "${oldusername}" ] && [ -d "/home/${oldusername}" ] ; then
			sudo deluser --remove-home "${oldusername}"
		fi

		setterm -blank 0

		sleep 5
		sudo service networking restart 2> /dev/null
		sudo systemctl daemon-reload 2> /dev/null

		while [ ! "\\\$(node -e 'console.log(
			(os.networkInterfaces().eth0 || []).filter(o =>
				o.address === "${localAddress}"
			)[0] || ""
		)')" ] ; do
			sleep 1
		done

		./server.js "${activeKeys}" "${localAddress}" "${remoteAddress}" "${port}"
	fi
EOM
EndOfMessage


cat >> /home/${username}/.bashrc << EndOfMessage
	if [ -d ${agseDir} ] ; then
		${agseDir}/setup.sh

		if (( $? )) ; then
			echo 'Setup failed; hit enter to shut down now. Turn it back on to try again.'
		else
			rm -rf ${agseDir}
			echo 'Setup complete; hit enter to shut down now.'
		fi

		read
		sudo halt
	fi
EndOfMessage


chmod 777 ${agseDir}/setup.sh /home/${username}/.bashrc

su ${username} -c ' \
	cd; \
	npm install \
		fast-sha512 \
		level \
		libsodium-wrappers-sumo \
		read \
		safe-compare \
		superdilithium \
		supersphincs-legacy \
		supersphincs \
		validator \
	; \
'

modprobe ecryptfs
ecryptfs-migrate-home -u ${username}
su ${username} -c echo
rm -rf /home/${username}.*
touch /autostart
chmod 444 /autostart

echo 'First phase of setup complete; hit enter to reboot and continue.'
read
reboot
