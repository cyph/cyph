#!/bin/bash

# WebSign reverse proxy server setup script


rekeyscript='BASE64 hpkpsuicide.sh'

PROMPT apikey
PROMPT orderid
PROMPT githubToken
csrSubject='/C=US/ST=Delaware/L=Wilmington/O=Cyph, Inc./CN=cyph.app'


mkdir /etc/nginx/ssl
chmod 600 /etc/nginx/ssl
echo 'tmpfs /etc/nginx/ssl tmpfs rw,size=50M 0 0' >> /etc/fstab
mount --all

umask 077


cat > /certupdate.sh << EndOfMessage
#!/bin/bash

while [ ! -d /cdn/.git ] ; do
	rm -rf /cdn 2> /dev/null
	mkdir /cdn
	git clone https://${githubToken}:x-oauth-basic@github.com/cyph/cdn.git /cdn || sleep 5
done

cd /cdn

sleep 60

while true ; do
	git pull

	node -e "console.log([
		'burner.cyph.app',
		'cyph.audio',
		'cyph.download',
		'cyph.im',
		'cyph.io',
		'cyph.me',
		'cyph.video',
		'cyph.ws'
	].concat(
		fs.readdirSync('.').filter(f =>
			f !== '.git' &&
			f !== 'websign' &&
			f !== 'cyph' &&
			!f.startsWith('simple-') &&
			!fs.lstatSync(f).isSymbolicLink()
		)
	).
		map(s => [s, 'www.' + s]).
		reduce((a, b) => a.concat(b)).
		join(',')
	)" > /etc/nginx/sans.json

	if [ "\${1}" == 'init' ] ; then
		exit 0
	fi

	sleep 90m
done
EndOfMessage


read -r -d '' nginxconf <<- EOM
	server {
		\${sslconf}
		server_name burner.cyph.app www.burner.cyph.app;
		\$(proxysite https://prod-dot-burner-cyph-app-dot-cyphme.appspot.com)
	}
	server {
		\${sslconf}
		server_name cyph.audio www.cyph.audio;
		\$(proxysite https://prod-dot-cyph-audio-dot-cyphme.appspot.com)
	}
	server {
		\${sslconf}
		server_name cyph.download www.cyph.download;
		\$(proxysite https://prod-dot-cyph-download-dot-cyphme.appspot.com)
	}
	server {
		\${sslconf}
		server_name cyph.im www.cyph.im;
		\$(proxysite https://prod-dot-cyph-im-dot-cyphme.appspot.com)
	}
	server {
		\${sslconf}
		server_name cyph.io www.cyph.io;
		\$(proxysite https://prod-dot-cyph-io-dot-cyphme.appspot.com)
	}
	server {
		\${sslconf}
		server_name cyph.me www.cyph.me;
		\$(proxysite https://prod-dot-cyph-me-dot-cyphme.appspot.com)
	}
	server {
		\${sslconf}
		server_name cyph.video www.cyph.video;
		\$(proxysite https://prod-dot-cyph-video-dot-cyphme.appspot.com)
	}
	server {
		\${sslconf}
		server_name cyph.ws www.cyph.ws;
		\$(proxysite https://prod-dot-cyph-ws-dot-cyphme.appspot.com)
	}

	server {
		\$(echo "\${sslconf}" | sed 's|http2|http2 default_server|g')
		server_name _;
		\$(proxysite https://prod-dot-websign-dot-cyphme.appspot.com)
	}

	server {
		listen 80 default_server;
		listen [::]:80 default_server;
		server_name _;
		return 301 https://\\\$host\\\$request_uri;
	}
EOM


rekeyscriptDecoded="$(
	echo "${rekeyscript}" |
	sed "s|API_KEY|${apikey}|g" |
	sed "s|ORDER_ID|${orderid}|g" |
	sed "s|CSR_SUBJECT|${csrSubject}|g"
)"
echo "${rekeyscriptDecoded/NGINX_CONF/$nginxconf}" > /hpkpsuicide.sh


chmod 700 /certupdate.sh /hpkpsuicide.sh
umask 022

echo '/certupdate.sh &' >> /init.sh
echo '/hpkpsuicide.sh &' >> /init.sh

/certupdate.sh init
