#!/bin/bash

# Tor server setup script for Ubuntu 16.04


rekeyscript='base64 hpkpsuicide.sh'

apikey='ASK RYAN FOR THIS'
orderid='ASK RYAN FOR THIS'
csrSubject='/C=US/ST=Delaware/L=Dover/O=Cyph, Inc./CN=cyphdbyhiddenbhs.onion'

onionaddress='cyphdbyhiddenbhs.onion'
onionkey='ASK RYAN FOR THIS'
cert='ASK RYAN FOR THIS'
key='ASK RYAN FOR THIS'


cd $(cd "$(dirname "$0")"; pwd)

sed -i 's/# deb /deb /g' /etc/apt/sources.list
sed -i 's/\/\/.*archive.ubuntu.com/\/\/archive.ubuntu.com/g' /etc/apt/sources.list

export DEBIAN_FRONTEND=noninteractive
apt-get -y --allow-downgrades update
apt-get -y --allow-downgrades install curl lsb-release apt-transport-https
apt-get -y --allow-downgrades purge apache* mysql*
distro="$(lsb_release -c | awk '{print $2}')"
echo "
	deb http://deb.torproject.org/torproject.org ${distro} main
	deb https://deb.nodesource.com/node_8.x ${distro} main
" >> /etc/apt/sources.list
gpg --keyserver keys.gnupg.net --recv 886DDD89
gpg --export A3C4F0F979CAA22CDBA8F512EE8CBC9E886DDD89 | apt-key add -
curl https://deb.nodesource.com/gpgkey/nodesource.gpg.key | apt-key add -
apt-get -y --allow-downgrades update
apt-get -y --allow-downgrades upgrade
apt-get -y --allow-downgrades install apt cron dpkg nginx openssl nodejs deb.torproject.org-keyring tor
do-release-upgrade -f DistUpgradeViewNonInteractive

mkdir -p /etc/nginx/ssl/websign
chmod 600 -R /etc/nginx/ssl
echo "${cert}" | base64 --decode > /etc/nginx/ssl/cert.pem
echo "${key}" | base64 --decode > /etc/nginx/ssl/key.pem
openssl dhparam -out /etc/nginx/ssl/dhparams.pem 2048
echo 'tmpfs /etc/nginx/ssl/websign tmpfs rw,size=50M 0 0' >> /etc/fstab
mount --all

echo '
	HiddenServiceDir /var/lib/tor/hidden_service/
	HiddenServicePort 80 127.0.0.1:8080
	HiddenServicePort 443 127.0.0.1:8081
' >> /etc/tor/torrc

mkdir /var/lib/tor/hidden_service/
echo "${onionaddress}" > /var/lib/tor/hidden_service/hostname
echo "${onionkey}" | base64 --decode > /var/lib/tor/hidden_service/private_key
chown -R debian-tor:debian-tor /var/lib/tor/hidden_service/
chmod -R 0700 /var/lib/tor/hidden_service/

umask 077


cat > /systemupdate.sh << EndOfMessage
#!/bin/bash

export DEBIAN_FRONTEND=noninteractive
apt-get -y --allow-downgrades update
apt-get -y --allow-downgrades -o Dpkg::Options::=--force-confdef upgrade
do-release-upgrade -f DistUpgradeViewNonInteractive

reboot
EndOfMessage


staticSSL='$(
	echo "${sslconf}" |
	sed "s|ssl/websign|ssl|g" |
	sed "s|${keyHash}|L8VDNR3M39gVmkDK8uGIc5Qx9Cms3fh8/hw5rWqPEbA=|g" |
	sed "s|${backupHash}|qkfPaU8MSHYMoMxAH8DGToHOQJNW8NgpNvx+EtIPCbw=|g"
)'

read -r -d '' nginxconf <<- EOM
	proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=cdn:50m max_size=5g inactive=24h;

	server {
		${staticSSL}
		server_name cyphdbyhiddenbhs.onion;
		return 301 https://www.cyphdbyhiddenbhs.onion\\\$request_uri;
	}

	server {
		${staticSSL}
		server_name www.cyphdbyhiddenbhs.onion;
		\$(proxysite https://prod-dot-cyph-com-dot-cyphme.appspot.com)
	}
	server {
		${staticSSL}
		server_name api.cyphdbyhiddenbhs.onion;
		\$(proxysite https://prod-dot-default-dot-cyphme.appspot.com)
	}

	server {
		${staticSSL}
		server_name cdn.cyphdbyhiddenbhs.onion;

		location / {
			rewrite /(.*) /\\\$1 break;
			proxy_pass https://eu.cdn.cyph.com/;
			proxy_cache cdn;
			proxy_hide_header Public-Key-Pins;
			proxy_hide_header Strict-Transport-Security;
		}
	}

	server {
		${staticSSL}
		server_name ping.cyphdbyhiddenbhs.onion;

		location = / {
			add_header Content-Type 'text/plain';
			add_header Access-Control-Allow-Origin '*';
			add_header Access-Control-Allow-Methods 'GET';
			return 200 pong;
		}
	}

	server {
		\${sslconf}
		server_name im.cyphdbyhiddenbhs.onion;
		\$(proxysite https://prod-dot-cyph-im-dot-cyphme.appspot.com)
	}
	server {
		\${sslconf}
		server_name io.cyphdbyhiddenbhs.onion;
		\$(proxysite https://prod-dot-cyph-io-dot-cyphme.appspot.com)
	}
	server {
		\${sslconf}
		server_name me.cyphdbyhiddenbhs.onion;
		\$(proxysite https://prod-dot-cyph-me-dot-cyphme.appspot.com)
	}
	server {
		\${sslconf}
		server_name video.cyphdbyhiddenbhs.onion;
		\$(proxysite https://prod-dot-cyph-video-dot-cyphme.appspot.com)
	}
	server {
		\${sslconf}
		server_name audio.cyphdbyhiddenbhs.onion;
		\$(proxysite https://prod-dot-cyph-audio-dot-cyphme.appspot.com)
	}

	server {
		\${sslconf}
		server_name ~.*\\.cyphdbyhiddenbhs\\.onion;
		\$(proxysite https://prod-dot-websign-dot-cyphme.appspot.com)
	}

	server {
		listen 127.0.0.1:8080 default_server;
		server_name _;
		return 301 https://\\\$host\\\$request_uri;
	}
EOM


rekeyscriptDecoded="$(
	echo "${rekeyscript}" | base64 --decode |
	sed "s|API_KEY|${apikey}|g" |
	sed "s|ORDER_ID|${orderid}|g" |
	sed "s|CSR_SUBJECT|${csrSubject}|g" |
	sed 's|ssl/|ssl/websign/|g'
)"
echo "${rekeyscriptDecoded/NGINX_CONF/$nginxconf}" | sed 's|443|8081|g' > /hpkpsuicide.sh


chmod 700 /systemupdate.sh /hpkpsuicide.sh
umask 022

updatehour=$RANDOM
let 'updatehour %= 24'
updateday=$RANDOM
let 'updateday %= 7'

crontab -l > /tmp/cyph.cron
echo '@reboot /hpkpsuicide.sh' >> /tmp/cyph.cron
echo "45 ${updatehour} * * ${updateday} /systemupdate.sh" >> /tmp/cyph.cron
crontab /tmp/cyph.cron
rm /tmp/cyph.cron

rm tor.sh
reboot
