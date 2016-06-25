#!/bin/bash

# Firebase Storage reverse proxy setup script for Ubuntu 14.04

cd $(cd "$(dirname "$0")"; pwd)
dir="$(pwd)"

sed -i 's/# deb /deb /g' /etc/apt/sources.list
sed -i 's/\/\/.*archive.ubuntu.com/\/\/archive.ubuntu.com/g' /etc/apt/sources.list

export DEBIAN_FRONTEND=noninteractive
apt-add-repository -y ppa:nginx/development
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
ln -s /etc/letsencrypt/live/firebase.cyph.com/cert.pem /etc/nginx/ssl/cert.pem


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
		listen 443 ssl;

		ssl_certificate ssl/cert.pem;
		ssl_certificate_key ssl/key.pem;
		ssl_dhparam ssl/dhparams.pem;

		ssl_session_timeout 1d;
		ssl_session_cache shared:SSL:50m;

		ssl_prefer_server_ciphers on;
		add_header Strict-Transport-Security 'max-age=31536000; includeSubdomains; preload';
		ssl_protocols TLSv1 TLSv1.1 TLSv1.2;
		ssl_ciphers 'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:DHE-DSS-AES128-GCM-SHA256:kEDH+AESGCM:ECDHE-RSA-AES128-SHA256:ECDHE-ECDSA-AES128-SHA256:ECDHE-RSA-AES128-SHA:ECDHE-ECDSA-AES128-SHA:ECDHE-RSA-AES256-SHA384:ECDHE-ECDSA-AES256-SHA384:ECDHE-RSA-AES256-SHA:ECDHE-ECDSA-AES256-SHA:DHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA:DHE-DSS-AES128-SHA256:DHE-RSA-AES256-SHA256:DHE-DSS-AES256-SHA:DHE-RSA-AES256-SHA:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!3DES:!MD5:!PSK';

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


cd "${dir}"
rm firebaseproxy.sh
reboot
