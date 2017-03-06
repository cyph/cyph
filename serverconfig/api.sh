#!/bin/bash

# Google Cloud reverse proxy setup script for Ubuntu 16.04

cert='ASK RYAN FOR THIS'
key='ASK RYAN FOR THIS'


cd $(cd "$(dirname "$0")"; pwd)

sed -i 's/# deb /deb /g' /etc/apt/sources.list
sed -i 's/\/\/.*archive.ubuntu.com/\/\/archive.ubuntu.com/g' /etc/apt/sources.list

export DEBIAN_FRONTEND=noninteractive
apt-get -y --force-yes update
apt-get -y --force-yes upgrade
apt-get -y --force-yes purge apache* mysql*
apt-get -y --force-yes install apt dpkg nginx openssl
do-release-upgrade -f DistUpgradeViewNonInteractive

mkdir /etc/nginx/ssl
chmod 600 /etc/nginx/ssl

echo "${cert}" | base64 --decode > /etc/nginx/ssl/cert.pem
echo "${key}" | base64 --decode > /etc/nginx/ssl/key.pem
openssl dhparam -out /etc/nginx/ssl/dhparams.pem 2048

keyHash="$(openssl rsa -in /etc/nginx/ssl/key.pem -outform der -pubout | openssl dgst -sha256 -binary | openssl enc -base64)"
backupHash='unPe8YYMLOhkaAWcjfFF1q571QqcrI5NUfP+0eBT/po='


cat > /etc/nginx/nginx.conf << EndOfMessage
user www-data;
worker_processes auto;
pid /run/nginx.pid;

events {
	worker_connections $(ulimit -n);
	multi_accept off;
}

http {
	sendfile on;
	tcp_nopush on;
	tcp_nodelay on;
	keepalive_timeout 65;
	types_hash_max_size 2048;
	server_tokens off;
	server_names_hash_bucket_size 64;
	include /etc/nginx/mime.types;
	default_type application/octet-stream;

	access_log off;
	error_log /dev/null crit;

	gzip on;
	gzip_http_version 1.0;
	gzip_static always;

	server {
		listen 443 ssl http2;
		listen [::]:443 ssl http2;

		ssl_certificate ssl/cert.pem;
		ssl_certificate_key ssl/key.pem;
		ssl_dhparam ssl/dhparams.pem;

		ssl_session_timeout 1d;
		ssl_session_cache shared:SSL:50m;
		ssl_session_tickets off;

		ssl_protocols TLSv1 TLSv1.1 TLSv1.2;
		ssl_ciphers 'ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES128-SHA256:ECDHE-RSA-AES128-SHA256:ECDHE-ECDSA-AES128-SHA:ECDHE-RSA-AES256-SHA384:ECDHE-RSA-AES128-SHA:ECDHE-ECDSA-AES256-SHA384:ECDHE-ECDSA-AES256-SHA:ECDHE-RSA-AES256-SHA:DHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA:DHE-RSA-AES256-SHA256:DHE-RSA-AES256-SHA:ECDHE-ECDSA-DES-CBC3-SHA:ECDHE-RSA-DES-CBC3-SHA:EDH-RSA-DES-CBC3-SHA:AES128-GCM-SHA256:AES256-GCM-SHA384:AES128-SHA256:AES256-SHA256:AES128-SHA:AES256-SHA:DES-CBC3-SHA:!DSS';
		ssl_prefer_server_ciphers on;

		add_header Public-Key-Pins 'max-age=5184000; pin-sha256="${keyHash}"; pin-sha256="${backupHash}"; preload';
		add_header Strict-Transport-Security 'max-age=31536000; includeSubdomains; preload';

		ssl_stapling on;
		ssl_stapling_verify on;

		server_name cyph.com;

		location / {
			rewrite /(.*) /\$1 break;
			proxy_pass https://prod-dot-nakedredirect-dot-cyphme.appspot.com/;
			proxy_hide_header Public-Key-Pins;
			proxy_hide_header Strict-Transport-Security;
		}

		location /v0/b/cyphme.appspot.com {
			add_header 'Access-Control-Allow-Origin' '*';
			proxy_pass https://firebasestorage.googleapis.com;
			proxy_hide_header Public-Key-Pins;
			proxy_hide_header Strict-Transport-Security;
		}
	}
}
EndOfMessage


cat > /systemupdate.sh << EndOfMessage
#!/bin/bash

export DEBIAN_FRONTEND=noninteractive
apt-get -y --force-yes update
apt-get -y --force-yes -o Dpkg::Options::=--force-confdef upgrade
do-release-upgrade -f DistUpgradeViewNonInteractive

reboot
EndOfMessage
chmod +x /systemupdate.sh


updatehour=$RANDOM
let 'updatehour %= 24'
updateday=$RANDOM
let 'updateday %= 7'

crontab -l > /tmp/cyph.cron
echo "45 ${updatehour} * * ${updateday} /systemupdate.sh" >> /tmp/cyph.cron
crontab /tmp/cyph.cron
rm /tmp/cyph.cron


cd "${dir}"
rm api.sh
reboot
