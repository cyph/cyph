#!/bin/bash

# Tor server setup script for Ubuntu 14.04

onionaddress='cyphdbyhiddenbhs.onion'
onionkey='ASK RYAN FOR THIS'
conf='dXNlciB3d3ctZGF0YTsKd29ya2VyX3Byb2Nlc3NlcyBhdXRvOwpwaWQgL3J1bi9uZ2lueC5waWQ7CgpldmVudHMgewoJd29ya2VyX2Nvbm5lY3Rpb25zIDc2ODsKCW11bHRpX2FjY2VwdCBvZmY7Cn0KCmh0dHAgewoKCSMjCgkjIEJhc2ljIFNldHRpbmdzCgkjIwoKCXNlbmRmaWxlIG9uOwoJdGNwX25vcHVzaCBvbjsKCXRjcF9ub2RlbGF5IG9uOwoJa2VlcGFsaXZlX3RpbWVvdXQgNjU7Cgl0eXBlc19oYXNoX21heF9zaXplIDIwNDg7CglzZXJ2ZXJfdG9rZW5zIG9mZjsKCXNlcnZlcl9uYW1lc19oYXNoX2J1Y2tldF9zaXplIDY0OwoJaW5jbHVkZSAvZXRjL25naW54L21pbWUudHlwZXM7CglkZWZhdWx0X3R5cGUgYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtOwoKCSMjCgkjIExvZ2dpbmcgU2V0dGluZ3MKCSMjCgoJYWNjZXNzX2xvZyBvZmY7CgllcnJvcl9sb2cgL2Rldi9udWxsIGNyaXQ7CgoJIyMKCSMgR3ppcCBTZXR0aW5ncwoJIyMKCglnemlwIG9uOwoJZ3ppcF9odHRwX3ZlcnNpb24gMS4wOwoJZ3ppcF9zdGF0aWMgYWx3YXlzOwoKCSMjCgkjIFNlcnZlciBTZXR0aW5ncwoJIyMKCglzZXJ2ZXIgewoJCWxpc3RlbiAxMjcuMC4wLjE6ODA4MDsKCgkJcm9vdCAvd3d3OwoKCQlsb2NhdGlvbiAvIHsKCQkJcHJveHlfcGFzcyBodHRwczovL3Byb2QtZG90LWN5cGgtY29tLWRvdC1jeXBobWUuYXBwc3BvdC5jb20vOwoJCX0KCgkJbG9jYXRpb24gL2ltLyB7CgkJCXByb3h5X3Bhc3MgaHR0cHM6Ly9wcm9kLWRvdC1jeXBoLWltLWRvdC1jeXBobWUuYXBwc3BvdC5jb20vOwoJCX0KCgkJbG9jYXRpb24gL21lLyB7CgkJCXByb3h5X3Bhc3MgaHR0cHM6Ly9wcm9kLWRvdC1jeXBoLW1lLWRvdC1jeXBobWUuYXBwc3BvdC5jb20vOwoJCX0KCgkJbG9jYXRpb24gL2FwaS8gewoJCQlwcm94eV9wYXNzIGh0dHBzOi8vcHJvZC1kb3QtZGVmYXVsdC1kb3QtY3lwaG1lLmFwcHNwb3QuY29tLzsKCQl9CgoJCWxvY2F0aW9uIC9jZG4vIHsKCQkJYWRkX2hlYWRlciBDYWNoZS1Db250cm9sICdwdWJsaWMsIG1heC1hZ2U9NjA0ODAwJzsKCQkJYWRkX2hlYWRlciBBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4gJyonOwoJCQlhZGRfaGVhZGVyIEFjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMgJ0dFVCc7CgkJfQoKCQlsb2NhdGlvbiA9IC9waW5nIHsKCQkJcmV0dXJuIDIwMCBwb25nOwoJCX0KCX0KfQo='
script='IyEvYmluL2Jhc2gKCm1rZGlyIC1wIC93d3cubmV3L2NkbgpjZCAvd3d3Lm5ldy9jZG4KCndnZXQgaHR0cHM6Ly9naXRodWIuY29tL2N5cGgvY3lwaC5naXRodWIuaW8vYXJjaGl2ZS9tYXN0ZXIuemlwIC1PIGRvdGhlbW92ZS56aXAKdW56aXAgZG90aGVtb3ZlLnppcApyZXBvPSIkKGxzIHwgZ3JlcCAtdiBkb3RoZW1vdmUuemlwKSIKbXYgJHJlcG8vKiAuLwpybSAtcmYgZG90aGVtb3ZlLnppcCAkcmVwbwpnemlwIC05ciAuCmNobW9kIDc3NyAtUiAuCgpjZCAvCgppZiBbIC1kIC93d3cubmV3L2Nkbi93ZWJzaWduIF0gOyB0aGVuCglybSAtcmYgL3d3dy5vbGQKCW12IC93d3cgL3d3dy5vbGQKCW12IC93d3cubmV3IC93d3cKZWxzZQoJcm0gLXJmIC93d3cubmV3CmZpCgoKaWYgWyAkKHBzIGF1eCB8IGdyZXAgbmdpbnggfCBncmVwIC12IGdyZXAgfCB3YyAtbCkgLWx0IDEgXSA7IHRoZW4KCXNlcnZpY2Ugbmdpbnggc3RvcAoJc2VydmljZSBuZ2lueCBzdGFydApmaQoKaWYgWyAkKHBzIGF1eCB8IGdyZXAgdG9yIHwgZ3JlcCAtdiBncmVwIHwgd2MgLWwpIC1sdCAxIF0gOyB0aGVuCglzZXJ2aWNlIHRvciBzdG9wCglzZXJ2aWNlIHRvciBzdGFydApmaQo='
update='IyEvYmluL2Jhc2gKCmV4cG9ydCBERUJJQU5fRlJPTlRFTkQ9bm9uaW50ZXJhY3RpdmUKYXB0LWdldCAteSAtLWZvcmNlLXllcyB1cGRhdGUKYXB0LWdldCAteSAtLWZvcmNlLXllcyBkaXN0LXVwZ3JhZGUKcmVib290Cg=='


dir="$(pwd)"
cd $(cd "$(dirname "$0")"; pwd) # $(dirname `readlink -f "${0}" || realpath "${0}"`)

sed -i 's/# deb /deb /g' /etc/apt/sources.list
sed -i 's/\/\/.*archive.ubuntu.com/\/\/archive.ubuntu.com/g' /etc/apt/sources.list

export DEBIAN_FRONTEND=noninteractive
apt-add-repository -y ppa:nginx/development
echo "deb http://deb.torproject.org/torproject.org $(lsb_release -c | awk '{print $2}') main" >> /etc/apt/sources.list
gpg --keyserver keys.gnupg.net --recv 886DDD89
gpg --export A3C4F0F979CAA22CDBA8F512EE8CBC9E886DDD89 | apt-key add -
apt-get -y --force-yes update
apt-get -y --force-yes dist-upgrade
apt-get -y --force-yes install nginx openssl unzip deb.torproject.org-keyring tor

echo "${conf}" | base64 --decode | sed "s/worker_connections 768;/worker_connections $(ulimit -n);/g" > /etc/nginx/nginx.conf

echo -e 'HiddenServiceDir /var/lib/tor/hidden_service/\nHiddenServicePort 80 127.0.0.1:8080' >> /etc/tor/torrc
mkdir /var/lib/tor/hidden_service/
echo "${onionaddress}" > /var/lib/tor/hidden_service/hostname
echo "${onionkey}" | base64 --decode > /var/lib/tor/hidden_service/private_key
chown -R debian-tor:debian-tor /var/lib/tor/hidden_service/
chmod -R 0700 /var/lib/tor/hidden_service/

rm -rf /www
echo "${script}" | base64 --decode > /codesync.sh
echo "${update}" | base64 --decode > /update.sh
chmod 700 /codesync.sh
chmod 700 /update.sh
/codesync.sh

updatehour=$RANDOM
let 'updatehour %= 24'
updateday=$RANDOM
let 'updateday %= 7'

crontab -l > /cyphcdn.cron
echo '0,30 * * * * /cyphcdn.sh' >> /cyphcdn.cron
echo "0 ${updatehour} * * ${updateday} /update.sh" >> /cyphcdn.cron
crontab /cyphcdn.cron
rm /cyphcdn.cron

rm cyphonionsetup.sh
reboot
