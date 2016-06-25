#!/bin/bash

# WebSign reverse proxy server setup script for Ubuntu 14.04

rekeyscript='base64 hpkpsuicide.sh'


sed -i 's/# deb /deb /g' /etc/apt/sources.list
sed -i 's/\/\/.*archive.ubuntu.com/\/\/archive.ubuntu.com/g' /etc/apt/sources.list

export DEBIAN_FRONTEND=noninteractive
apt-add-repository -y ppa:nginx/development
gpg --keyserver keys.gnupg.net --recv 886DDD89
gpg --export A3C4F0F979CAA22CDBA8F512EE8CBC9E886DDD89 | apt-key add -
apt-get -y --force-yes update
apt-get -y --force-yes upgrade
apt-get -y --force-yes install aptitude nginx openssl nodejs

mkdir /etc/nginx/ssl
chmod 600 /etc/nginx/ssl
echo 'tmpfs /etc/nginx/ssl tmpfs rw,size=50M 0 0' >> /etc/fstab
mount --all

umask 077
echo "${rekeyscript}" | base64 --decode > /rekey.sh
chmod 700 /rekey.sh
umask 022

crontab -l > /tmp/cyph.cron
echo '@reboot /rekey.sh' >> /tmp/cyph.cron
crontab /tmp/cyph.cron
rm /tmp/cyph.cron

rm websign.sh
reboot
