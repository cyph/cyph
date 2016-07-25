#!/bin/bash

# WebSign reverse proxy server setup script for Ubuntu 16.04

rekeyscript='base64 hpkpsuicide.sh'


sed -i 's/# deb /deb /g' /etc/apt/sources.list
sed -i 's/\/\/.*archive.ubuntu.com/\/\/archive.ubuntu.com/g' /etc/apt/sources.list

export DEBIAN_FRONTEND=noninteractive
apt-get -y --force-yes update
apt-get -y --force-yes upgrade
apt-get -y --force-yes install curl
curl -sL https://deb.nodesource.com/setup_6.x | bash -
apt-get -y --force-yes update
apt-get -y --force-yes install aptitude nginx openssl nodejs

mkdir /etc/nginx/ssl
chmod 600 /etc/nginx/ssl
echo 'tmpfs /etc/nginx/ssl tmpfs rw,size=50M 0 0' >> /etc/fstab
mount --all

umask 077


cat > /systemupdate.sh << EndOfMessage
#!/bin/bash

export DEBIAN_FRONTEND=noninteractive
apt-get -y --force-yes update
apt-get -y --force-yes -o Dpkg::Options::=--force-confdef upgrade
do-release-upgrade -f DistUpgradeViewNonInteractive

reboot
EndOfMessage


echo "${rekeyscript}" | base64 --decode > /rekey.sh
chmod 700 /systemupdate.sh /rekey.sh
umask 022

updatehour=$RANDOM
let 'updatehour %= 24'
updateday=$RANDOM
let 'updateday %= 7'

crontab -l > /tmp/cyph.cron
echo '@reboot /rekey.sh' >> /tmp/cyph.cron
echo "45 ${updatehour} * * ${updateday} /systemupdate.sh" >> /tmp/cyph.cron
crontab /tmp/cyph.cron
rm /tmp/cyph.cron

rm websign.sh
reboot
