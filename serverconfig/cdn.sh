#!/bin/bash

# CDN node setup script for Ubuntu 16.04


cert='ASK RYAN FOR THIS'
key='ASK RYAN FOR THIS'
githubToken='ASK RYAN FOR THIS'


adduser --gecos '' --disabled-password --home /home/cyph cyph || exit 1


cd $(cd "$(dirname "$0")"; pwd)

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
apt-get -y --allow-downgrades install apt cron dpkg nodejs openssl build-essential git
do-release-upgrade -f DistUpgradeViewNonInteractive


cat > /tmp/setup.sh << EndOfMessage
#!/bin/bash

cd /home/cyph

echo '${cert}' | base64 --decode > cert.pem
echo '${key}' | base64 --decode > key.pem
openssl dhparam -out dhparams.pem 2048

keyHash="\$(openssl rsa -in key.pem -outform der -pubout | openssl dgst -sha256 -binary | openssl enc -base64)"
backupHash='V3Khw3OOrzNle8puKasf47gcsFk9QqKP5wy0WWodtgA='

npm install express spdy


cat > server.js <<- EOM
	#!/usr/bin/env node

	const app				= require('express')();
	const child_process		= require('child_process');
	const fs				= require('fs');
	const spdy				= require('spdy');

	const cache				= {
		br: {
			current: {},
			files: {},
			urls: {}
		},
		gzip: {
			current: {},
			files: {},
			urls: {}
		}
	};

	const cdnPath			= './cdn/';
	const certPath			= 'cert.pem';
	const keyPath			= 'key.pem';
	const dhparamPath		= 'dhparams.pem';

	const returnError		= res => res.status(418).end();

	const getFileName		= (req, ext) => () => new Promise((resolve, reject) => {
		if (req.path.indexOf('..') > -1) {
			reject('Invalid path.');
			return;
		}

		fs.realpath(cdnPath + req.path.slice(1) + ext, (err, path) => {
			if (err || !path) {
				reject(err);
				return;
			}

			const fileName	= path.split(process.env['HOME'] + cdnPath.slice(1))[1];

			if (fileName) {
				resolve(fileName);
				return;
			}

			reject(path);
		});
	});

	const git				= (...args) => new Promise((resolve, reject) => {
		let data		= Buffer.from([]);
		const stdout	= child_process.spawn('git', args, {cwd: cdnPath}).stdout;

		stdout.on('data', buf => data = Buffer.concat([data, buf]));

		stdout.on('close', () => {
			stdout.removeAllListeners();
			resolve(data);
		});

		stdout.on('error', () => {
			stdout.removeAllListeners();
			reject();
		});
	});

	app.use((req, res, next) => {
		res.set('Access-Control-Allow-Methods', 'GET');
		res.set('Access-Control-Allow-Origin', '*');
		res.set('Cache-Control', 'public, max-age=31536000');
		res.set('Content-Type', 'application/octet-stream');
		res.set('Public-Key-Pins', 'max-age=5184000; pin-sha256="\${keyHash}"; pin-sha256="\${backupHash}"');
		res.set('Strict-Transport-Security', 'max-age=31536000; includeSubdomains');

		if ((req.get('Accept-Encoding') || '').replace(/\s+/g, '').split(',').indexOf('br') > -1) {
			req.cache		= cache.br;
			req.getFileName	= getFileName(req, '.br');

			res.set('Content-Encoding', 'br');
		}
		else {
			req.cache		= cache.gzip;
			req.getFileName	= getFileName(req, '.gz');

			res.set('Content-Encoding', 'gzip');
		}

		next();
	});

	app.get(/.*\/current/, (req, res) => req.getFileName().then(fileName =>
		new Promise((resolve, reject) =>
			fs.readFile(cdnPath + fileName, (err, data) => {
				if (!err && data) {
					req.cache.current[fileName]	= data;
				}

				if (req.cache.current[fileName]) {
					resolve(req.cache.current[fileName]);
				}
				else {
					reject(err);
				}
			})
		)
	).then(data =>
		res.send(data)
	).catch(() =>
		returnError(res)
	));

	app.get(/\/.*/, (req, res) => (async () => {
		if (req.cache.urls[req.originalUrl]) {
			return;
		}

		const hash		= req.originalUrl.split('?')[1];
		const fileName	= await req.getFileName();

		if (!req.cache.files[fileName]) {
			req.cache.files[fileName]	= {};
		}

		if (!req.cache.files[fileName][hash]) {
			await new Promise((resolve, reject) =>
				fs.stat(cdnPath + fileName, err => {
					if (err) {
						reject(err);
						return;
					}
					resolve();
				})
			);

			const revision	= !hash ? '' : (
				(await git('log', '--pretty=format:%H %s', fileName)).toString().
					split('\n').
					map(s => s.split(' ')).
					filter(arr => arr[1] === hash).
					concat([['HEAD']])
			)[0][0];

			req.cache.files[fileName][hash]	= await git('show', revision + ':' + fileName);
		}

		req.cache.urls[req.originalUrl]	= req.cache.files[fileName][hash];
	})().then(() =>
		res.send(
			req.hostname === 'localhost' ?
				'' :
				req.cache.urls[req.originalUrl]
		)
	).catch(() =>
		returnError(res)
	));

	spdy.createServer({
		cert: fs.readFileSync(certPath),
		key: fs.readFileSync(keyPath),
		dhparam: fs.readFileSync(dhparamPath)
	}, app).listen(31337);
EOM
chmod +x server.js


cat > cdnupdate.sh <<- EOM
	#!/bin/bash

	cachePath=" \
		url=\"https://localhost:31337/\\\\\\\$( \
			echo 'PATH' | sed 's|\.br\\\\\\\$||g' \
		)?\\\\\\\$( \
			git log -1 --pretty=format:%s 'PATH' \
		)\"; \
		\
		curl -sk \"\\\\\\\${url}\"; \
		curl -H 'Accept-Encoding: br' -sk \"\\\\\\\${url}\"; \
	"

	cachePaths () {
		echo "\\\${1}" |
			grep -P '\.br\\\$' |
			grep -vP '/current\.br\\\$' |
			xargs -IPATH -P10 bash -c "\\\${cachePath}"
	}

	getHead () {
		git reflog -1 --pretty=format:%H
	}

	while [ ! -d cdn/.git ] ; do
		rm -rf cdn 2> /dev/null
		mkdir cdn
		git clone https://${githubToken}:x-oauth-basic@github.com/cyph/cdn.git || sleep 5
	done

	cd cdn

	head="\\\$(getHead)"

	sleep 60
	cachePaths "\\\$(git ls-files | grep -P '^cyph\.ws/')"
	cachePaths "\\\$(git ls-files | grep -vP '^cyph\.ws/')"

	while true ; do
		sleep 60
		git pull || break

		newHead="\\\$(getHead)"
		if [ "\\\${head}" == "\\\${newHead}" ] ; then
			continue
		fi

		cachePaths "\\\$(git diff --name-only "\\\${newHead}" "\\\${head}")"

		head="\\\${newHead}"
	done

	# Start from scratch when pull fails
	cd ..
	rm -rf cdn
	/home/cyph/cdnupdate.sh &
	while [ ! -d cdn ] ; do sleep 5 ; done
	killall node
	/home/cyph/server.js &
EOM
chmod +x cdnupdate.sh


crontab -l > cdn.cron
echo '@reboot /home/cyph/cdnupdate.sh' >> cdn.cron
echo '@reboot /home/cyph/server.js' >> cdn.cron
crontab cdn.cron
rm cdn.cron
EndOfMessage


chmod 777 /tmp/setup.sh
su cyph -c /tmp/setup.sh
rm /tmp/setup.sh


cat > /portredirect.sh << EndOfMessage
#!/bin/bash

sleep 60
/sbin/iptables -A PREROUTING -t nat -p tcp --dport 443 -j REDIRECT --to-port 31337
EndOfMessage
chmod +x /portredirect.sh


cat > /systemupdate.sh << EndOfMessage
#!/bin/bash

su cyph -c 'cd ; npm update'

export DEBIAN_FRONTEND=noninteractive
apt-get -y --allow-downgrades update
apt-get -y --allow-downgrades -o Dpkg::Options::=--force-confdef upgrade
do-release-upgrade -f DistUpgradeViewNonInteractive

reboot
EndOfMessage
chmod +x /systemupdate.sh


updatehour=$RANDOM
let 'updatehour %= 24'
updateday=$RANDOM
let 'updateday %= 7'

crontab -l > /tmp/cdn.cron
echo "@reboot /portredirect.sh" >> /tmp/cdn.cron
echo "45 ${updatehour} * * ${updateday} /systemupdate.sh" >> /tmp/cdn.cron
crontab /tmp/cdn.cron
rm /tmp/cdn.cron

rm cdn.sh
reboot
