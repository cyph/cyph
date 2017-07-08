#!/bin/bash

# WebSign reverse proxy server setup script for Ubuntu 16.04


rekeyscript='base64 hpkpsuicide.sh'

apikey='ASK RYAN FOR THIS'
orderid='ASK RYAN FOR THIS'
githubToken='ASK RYAN FOR THIS'
csrSubject='/C=US/ST=Delaware/L=Dover/O=Cyph, Inc./CN=cyph.ws'


sed -i 's/# deb /deb /g' /etc/apt/sources.list
sed -i 's/\/\/.*archive.ubuntu.com/\/\/archive.ubuntu.com/g' /etc/apt/sources.list

export DEBIAN_FRONTEND=noninteractive
apt-get -y --allow-downgrades update
apt-get -y --allow-downgrades install curl lsb-release apt-transport-https
apt-get -y --allow-downgrades purge apache* mysql*
distro="$(lsb_release -c | awk '{print $2}')"
echo "deb https://deb.nodesource.com/node_8.x ${distro} main" >> /etc/apt/sources.list
curl https://deb.nodesource.com/gpgkey/nodesource.gpg.key | apt-key add -
apt-get -y --allow-downgrades update
apt-get -y --allow-downgrades upgrade
apt-get -y --allow-downgrades install apt dpkg nginx openssl nodejs git
do-release-upgrade -f DistUpgradeViewNonInteractive

mkdir /etc/nginx/ssl
chmod 600 /etc/nginx/ssl
echo 'tmpfs /etc/nginx/ssl tmpfs rw,size=50M 0 0' >> /etc/fstab
mount --all

umask 077


cat > /systemupdate.sh << EndOfMessage
#!/bin/bash

export DEBIAN_FRONTEND=noninteractive
apt-get -y --allow-downgrades update
apt-get -y --allow-downgrades -o Dpkg::Options::=--force-confdef upgrade
do-release-upgrade -f DistUpgradeViewNonInteractive

reboot
EndOfMessage


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
	git pull || break

	node -e "console.log([
		'cyph.im',
		'cyph.io',
		'cyph.me',
		'cyph.video',
		'cyph.audio'
	].concat(
		fs.readdirSync('.').filter(f =>
			f !== '.git' &&
			f !== 'websign' &&
			f !== 'cyph' &&
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

# Start from scratch when pull fails
rm -rf /cdn
/certupdate.sh &
EndOfMessage


read -r -d '' nginxconf <<- EOM
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
		server_name cyph.audio www.cyph.audio;
		\$(proxysite https://prod-dot-cyph-audio-dot-cyphme.appspot.com)
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
	echo "${rekeyscript}" | base64 --decode |
	sed "s|API_KEY|${apikey}|g" |
	sed "s|ORDER_ID|${orderid}|g" |
	sed "s|CSR_SUBJECT|${csrSubject}|g"
)"
echo "${rekeyscriptDecoded/NGINX_CONF/$nginxconf}" > /hpkpsuicide.sh


chmod 700 /systemupdate.sh /certupdate.sh /hpkpsuicide.sh
umask 022

updatehour=$RANDOM
let 'updatehour %= 24'
updateday=$RANDOM
let 'updateday %= 7'

crontab -l > /tmp/cyph.cron
echo '@reboot /hpkpsuicide.sh' >> /tmp/cyph.cron
echo '@reboot /certupdate.sh' >> /tmp/cyph.cron
echo "45 ${updatehour} * * ${updateday} /systemupdate.sh" >> /tmp/cyph.cron
crontab /tmp/cyph.cron
rm /tmp/cyph.cron

/certupdate.sh init

rm websign.sh
reboot
