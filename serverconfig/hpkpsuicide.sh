#!/bin/bash

# WebSign HPKP re-key script, for denying availability after the first use


mkdir -p /etc/nginx/ssl/tmp
cd /etc/nginx/ssl/tmp

if [ -f /dhparams.bak -a ! -f /etc/nginx/ssl/dhparams.pem ] ; then
	cp /dhparams.bak dhparams.pem
else
	openssl dhparam -out dhparams.pem 4096
fi
if [ ! -f /dhparams.bak ] ; then
	cp dhparams.pem /dhparams.bak
fi

openssl genrsa -out backup.pem 4096
openssl req -new -newkey rsa:4096 -nodes -out csr.pem -keyout key.pem -subj 'CSR_SUBJECT'

curl -s -u 'API_KEY' -X POST \
	-H 'X-HTTP-Method-Override: REISSUE' \
	-H 'Content-Type: application/vnd.digicert.rest-v1+json' \
	--data "$(node -e 'console.log(JSON.stringify({
		csr: fs.readFileSync("csr.pem").toString().trim(),
		sans: (() => {
			try {
				return fs.readFileSync("/etc/nginx/sans.json").toString().trim();
			}
			catch (_) {}
		})()
	}))')" \
	'https://api.digicert.com/order/ORDER_ID'

sleep 1m

node -e "
	var o = JSON.parse(
		'$(curl -s -u "API_KEY" "https://api.digicert.com/order/ORDER_ID/certificate")'.
			replace(/\\r/g, '').
			replace(/\\n/g, '\\\\n')
	);

	console.log(Object.keys(o.certs).map(k => o.certs[k]).join(''));
" > cert.pem


certHash="$(openssl x509 -in cert.pem -pubkey -noout | openssl rsa -pubin -outform der | openssl dgst -sha256 -binary | openssl enc -base64)"
keyHash="$(openssl rsa -in key.pem -outform der -pubout | openssl dgst -sha256 -binary | openssl enc -base64)"
backupHash="$(openssl rsa -in backup.pem -outform der -pubout | openssl dgst -sha256 -binary | openssl enc -base64)"


read -r -d '' sslconf <<- EOM
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

	add_header Public-Key-Pins 'max-age=5184000; pin-sha256="${keyHash}"; pin-sha256="${backupHash}"';
	add_header Strict-Transport-Security 'max-age=31536000; includeSubdomains; preload';
	add_header X-XSS-Protection '1; mode=block';

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
		}
	EOM
}

cat > /etc/nginx/nginx.conf.new <<- EOM
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

		NGINX_CONF
	}
EOM


if [ "${certHash}" == "${keyHash}" ] ; then
	mv ../key.pem key.old
	mv ../dhparams.pem dhparams.old
	mv ../cert.pem cert.old

	mv key.pem ../key.pem
	mv dhparams.pem ../dhparams.pem
	mv cert.pem ../cert.pem

	mv /etc/nginx/nginx.conf.new /etc/nginx/nginx.conf

	su -c 'service nginx restart'

	mv key.old key.pem
	mv dhparams.old dhparams.pem
	mv cert.old cert.pem
fi

for f in key.pem backup.pem dhparams.pem cert.pem csr.pem ; do
	for i in {1..10} ; do
		dd if=/dev/urandom of="${f}" bs=1024 count="$(du -k "${f}" | cut -f1)"
	done

	rm "${f}"
done


sleep 12h
/hpkpsuicide.sh &
