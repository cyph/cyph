#!/bin/bash

# Tor server setup script
# TODO: Update/rewrite this


rekeyscript='BASE64 hpkpsuicide.sh'

PROMPT apikey
PROMPT orderid
PROMPT onionkey
PROMPT cert
PROMPT key

onionaddress='cyphdbyhiddenbhs.onion'
csrSubject="/C=US/ST=Delaware/L=Claymont/O=Cyph, Inc./CN=${onionaddress}"


cd $(cd "$(dirname "$0")"; pwd)

distro="$(lsb_release -c | awk '{print $2}')"
echo "deb http://deb.torproject.org/torproject.org ${distro} main" >> /etc/apt/sources.list
gpg --keyserver keys.gnupg.net --recv 886DDD89
gpg --export A3C4F0F979CAA22CDBA8F512EE8CBC9E886DDD89 | apt-key add -

apt-get -y --allow-downgrades update

apt-get -y --allow-downgrades install deb.torproject.org-keyring tor

mkdir -p /etc/nginx/ssl/websign
chmod 600 -R /etc/nginx/ssl
echo "${cert}" > /etc/nginx/ssl/cert.pem
echo "${key}" > /etc/nginx/ssl/key.pem
openssl dhparam -out /etc/nginx/ssl/dhparams.pem 2048
echo 'tmpfs /etc/nginx/ssl/websign tmpfs rw,size=50M 0 0' >> /etc/fstab
mount --all

echo "*.${onionaddress}" > /etc/nginx/sans.json

echo '
	HiddenServiceDir /var/lib/tor/hidden_service/
	HiddenServicePort 80 127.0.0.1:8080
	HiddenServicePort 443 127.0.0.1:8081
' >> /etc/tor/torrc

mkdir /var/lib/tor/hidden_service/
echo "${onionaddress}" > /var/lib/tor/hidden_service/hostname
echo "${onionkey}" > /var/lib/tor/hidden_service/private_key
chown -R debian-tor:debian-tor /var/lib/tor/hidden_service/
chmod -R 0700 /var/lib/tor/hidden_service/

umask 077


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
		server_name ${onionaddress};
		return 301 https://www.${onionaddress}\\\$request_uri;
	}

	server {
		${staticSSL}
		server_name www.${onionaddress};
		\$(proxysite https://prod-dot-cyph-com-dot-cyphme.appspot.com)
	}
	server {
		${staticSSL}
		server_name api.${onionaddress};
		\$(proxysite https://prod-dot-default-dot-cyphme.appspot.com)
	}

	server {
		${staticSSL}
		server_name cdn.${onionaddress};

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
		server_name ping.${onionaddress};

		location = / {
			add_header Content-Type 'text/plain';
			add_header Access-Control-Allow-Origin '*';
			add_header Access-Control-Allow-Methods 'GET';
			return 200 pong;
		}
	}

	server {
		\${sslconf}
		server_name audio.${onionaddress};
		\$(proxysite https://prod-dot-cyph-audio-dot-cyphme.appspot.com)
	}
	server {
		\${sslconf}
		server_name burner.${onionaddress};
		\$(proxysite https://prod-dot-burner-cyph-app-dot-cyphme.appspot.com)
	}
	server {
		\${sslconf}
		server_name download.${onionaddress};
		\$(proxysite https://prod-dot-cyph-download-dot-cyphme.appspot.com)
	}
	server {
		\${sslconf}
		server_name im.${onionaddress};
		\$(proxysite https://prod-dot-cyph-im-dot-cyphme.appspot.com)
	}
	server {
		\${sslconf}
		server_name io.${onionaddress};
		\$(proxysite https://prod-dot-cyph-io-dot-cyphme.appspot.com)
	}
	server {
		\${sslconf}
		server_name me.${onionaddress};
		\$(proxysite https://prod-dot-cyph-me-dot-cyphme.appspot.com)
	}
	server {
		\${sslconf}
		server_name video.${onionaddress};
		\$(proxysite https://prod-dot-cyph-video-dot-cyphme.appspot.com)
	}
	server {
		\${sslconf}
		server_name ws.${onionaddress};
		\$(proxysite https://prod-dot-cyph-ws-dot-cyphme.appspot.com)
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
	echo "${rekeyscript}" |
	sed "s|API_KEY|${apikey}|g" |
	sed "s|ORDER_ID|${orderid}|g" |
	sed "s|CSR_SUBJECT|${csrSubject}|g" |
	sed 's|ssl/|ssl/websign/|g'
)"
echo "${rekeyscriptDecoded/NGINX_CONF/$nginxconf}" | sed 's|443|8081|g' > /hpkpsuicide.sh


chmod 700 /hpkpsuicide.sh
umask 022

echo '/hpkpsuicide.sh &' >> /init.sh
