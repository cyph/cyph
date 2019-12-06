#!/bin/bash

# Google Cloud reverse proxy setup script

PROMPT cert
PROMPT key
PROMPT backupHash


cd $(cd "$(dirname "$0")"; pwd)

mkdir /etc/nginx/ssl
chmod 600 /etc/nginx/ssl

echo "${cert}" > /etc/nginx/ssl/cert.pem
echo "${key}" > /etc/nginx/ssl/key.pem
openssl dhparam -out /etc/nginx/ssl/dhparams.pem 2048

keyHash="$(openssl rsa -in /etc/nginx/ssl/key.pem -outform der -pubout | openssl dgst -sha256 -binary | openssl enc -base64)"


read -r -d '' sslconf <<- EOM
	listen 443 ssl http2;
	listen [::]:443 ssl http2;

	ssl_certificate ssl/cert.pem;
	ssl_certificate_key ssl/key.pem;
	ssl_dhparam ssl/dhparams.pem;

	ssl_session_timeout 1d;
	ssl_session_cache shared:SSL:50m;
	ssl_session_tickets off;

	ssl_protocols TLSv1.2 TLSv1.3;
	ssl_ciphers 'ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES128-SHA256:ECDHE-RSA-AES128-SHA256:ECDHE-ECDSA-AES128-SHA:ECDHE-RSA-AES256-SHA384:ECDHE-RSA-AES128-SHA:ECDHE-ECDSA-AES256-SHA384:ECDHE-ECDSA-AES256-SHA:ECDHE-RSA-AES256-SHA:DHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA:DHE-RSA-AES256-SHA256:DHE-RSA-AES256-SHA:ECDHE-ECDSA-DES-CBC3-SHA:ECDHE-RSA-DES-CBC3-SHA:EDH-RSA-DES-CBC3-SHA:AES128-GCM-SHA256:AES256-GCM-SHA384:AES128-SHA256:AES256-SHA256:AES128-SHA:AES256-SHA:DES-CBC3-SHA:!DSS';
	ssl_prefer_server_ciphers on;

	add_header Public-Key-Pins 'max-age=5184000; pin-sha256="${keyHash}"; pin-sha256="${backupHash}"';
	add_header Strict-Transport-Security 'max-age=31536000; includeSubdomains; preload';

	ssl_stapling on;
	ssl_stapling_verify on;
EOM


proxysite () {
	cat <<- EOM
		location / {
			rewrite /(.*) /\$1 break;
			proxy_pass ${1}/;
			proxy_hide_header Public-Key-Pins;
			proxy_hide_header Strict-Transport-Security;
			add_header Access-Control-Allow-Origin '*';
		}
	EOM
}


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
		${sslconf}
		server_name cyph.com;
		$(proxysite https://prod-dot-nakedredirect-dot-cyphme.appspot.com)
	}
	server {
		${sslconf}
		server_name www.cyph.com;
		$(proxysite https://prod-dot-cyph-com-dot-cyphme.appspot.com)
	}
	server {
		${sslconf}
		server_name api.cyph.com;
		$(proxysite https://prod-dot-cyphme.appspot.com)
	}
}
EndOfMessage
