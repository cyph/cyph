#!/bin/bash

# Firebase Storage reverse proxy setup script for Ubuntu 14.04

cd $(cd "$(dirname "$0")"; pwd)
dir="$(pwd)"

sed -i 's/# deb /deb /g' /etc/apt/sources.list
sed -i 's/\/\/.*archive.ubuntu.com/\/\/archive.ubuntu.com/g' /etc/apt/sources.list

export DEBIAN_FRONTEND=noninteractive
apt-add-repository -y ppa:ondrej/nginx
apt-get -y --force-yes update
apt-get -y --force-yes upgrade
apt-get -y --force-yes install aptitude nginx openssl unzip

mkdir /opt/certbot
cd /opt/certbot
wget https://github.com/certbot/certbot/archive/master.zip
unzip master.zip
rm master.zip
certbotdir="$(ls)"
mv $certbotdir/* ./
rm -rf $certbotdir

/opt/certbot/certbot-auto certonly \
	-n \
	--agree-tos \
	--standalone \
	--force-renewal \
	-d firebase.cyph.com \
	--email firebaseproxy@cyph.com

mkdir /etc/nginx/ssl
chmod 600 /etc/nginx/ssl
openssl dhparam -out /etc/nginx/ssl/dhparams.pem 2048
ln -s /etc/letsencrypt/live/firebase.cyph.com/privkey.pem /etc/nginx/ssl/key.pem
ln -s /etc/letsencrypt/live/firebase.cyph.com/fullchain.pem /etc/nginx/ssl/cert.pem

keyHash="$( \
	openssl rsa -in /etc/letsencrypt/live/firebase.cyph.com/privkey.pem -outform der -pubout | \
	openssl dgst -sha256 -binary | \
	openssl enc -base64 \
)"

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

	##
	# Basic Settings
	##

	sendfile on;
	tcp_nopush on;
	tcp_nodelay on;
	keepalive_timeout 65;
	types_hash_max_size 2048;
	server_tokens off;
	server_names_hash_bucket_size 64;
	include /etc/nginx/mime.types;
	default_type application/octet-stream;

	##
	# Logging Settings
	##

	access_log off;
	error_log /dev/null crit;

	##
	# Gzip Settings
	##

	gzip on;
	gzip_http_version 1.0;
	gzip_static always;

	##
	# Server Settings
	##

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

		add_header Public-Key-Pins 'max-age=5184000; includeSubdomains; pin-sha256="${keyHash}"; pin-sha256="${backupHash}"';
		add_header Strict-Transport-Security 'max-age=31536000; includeSubdomains; preload';

		ssl_stapling on;
		ssl_stapling_verify on;

		server_name firebase.cyph.com;

		location /v0/b/cyphme.appspot.com {
			add_header 'Access-Control-Allow-Origin' '*';
			proxy_pass https://firebasestorage.googleapis.com;
		}
	}
}
EndOfMessage


cat > /systemupdate.sh << EndOfMessage
#!/bin/bash

export DEBIAN_FRONTEND=noninteractive
apt-get -y --force-yes update
apt-get -y --force-yes -o Dpkg::Options::=--force-confdef upgrade

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
rm firebaseproxy.sh
reboot
