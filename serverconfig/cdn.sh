#!/bin/bash

# CDN node setup script for Ubuntu 16.04

cert='LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUZZekNDQkV1Z0F3SUJBZ0lRQ3NDeituNTlmTTd1YjRxajlpUnJMakFOQmdrcWhraUc5dzBCQVFzRkFEQk4KTVFzd0NRWURWUVFHRXdKVlV6RVZNQk1HQTFVRUNoTU1SR2xuYVVObGNuUWdTVzVqTVNjd0pRWURWUVFERXg1RQphV2RwUTJWeWRDQlRTRUV5SUZObFkzVnlaU0JUWlhKMlpYSWdRMEV3SGhjTk1UWXdPVEl5TURBd01EQXdXaGNOCk1UZ3dNVEEwTVRJd01EQXdXakJmTVFzd0NRWURWUVFHRXdKVlV6RVJNQThHQTFVRUNCTUlSR1ZzWVhkaGNtVXgKRGpBTUJnTlZCQWNUQlVSdmRtVnlNUk13RVFZRFZRUUtFd3BEZVhCb0xDQkpibU11TVJnd0ZnWURWUVFERXc5dQpZUzVqWkc0dVkzbHdhQzVqYjIwd2dnRWlNQTBHQ1NxR1NJYjNEUUVCQVFVQUE0SUJEd0F3Z2dFS0FvSUJBUUM5CnVDYm8rbDA1WUUrVDIxdWJYVTh2eFdZMU44Vjc5dGgrUlVYN0VGVDN1cXRHMDJVUmpOVnBkVUsrdWZnalRoeHoKU0pRWWpvV0tLL3F2enV2M0ZTU2lUQ01rQnBWOXZDSHJJS05rSUF6RXE1WVNia0JDLy94RnlkNi9IeTdRaFlkeQo2Uk1ITGV4SDV4RmFYVmNmZFRTbW5rdVczc3RrMG1HRDBZM3FZQVdFTHJkNjFCT3ZFalZsTHlONVJLdGNuTFgrCjJ5OFNlSmJzeUliSlBTcHRsM0wydTlBYlovc3NhdlVuNStXRFlHZmp2cWxVay9LSWRaUG5BOEIrcVp4Z1grZk8KdUsvMEVZeVl3VFdzRVBLRmZ5KzhBZFRhMklZRGhaZ1NMOXh4bkJpbXl1U0FjVHAzU0IxMU5ldTZJYXY1ditUZgptV3hQYU9CWHV6TFlWb3REWFpMaEFnTUJBQUdqZ2dJck1JSUNKekFmQmdOVkhTTUVHREFXZ0JRUGdHRWNnakZoCjFTOG81NDFHT0xRczRjYlo0akFkQmdOVkhRNEVGZ1FVQmEzUzVrYTliSFJhS2ZjUlMyZytsN2h1STZrd2J3WUQKVlIwUkJHZ3dab0lQYm1FdVkyUnVMbU41Y0dndVkyOXRnZzloWmk1alpHNHVZM2x3YUM1amIyMkNEMkZ6TG1OawpiaTVqZVhCb0xtTnZiWUlQWlhVdVkyUnVMbU41Y0dndVkyOXRnZzl2WXk1alpHNHVZM2x3YUM1amIyMkNEM05oCkxtTmtiaTVqZVhCb0xtTnZiVEFPQmdOVkhROEJBZjhFQkFNQ0JhQXdIUVlEVlIwbEJCWXdGQVlJS3dZQkJRVUgKQXdFR0NDc0dBUVVGQndNQ01Hc0dBMVVkSHdSa01HSXdMNkF0b0N1R0tXaDBkSEE2THk5amNtd3pMbVJwWjJsagpaWEowTG1OdmJTOXpjMk5oTFhOb1lUSXRaelV1WTNKc01DK2dMYUFyaGlsb2RIUndPaTh2WTNKc05DNWthV2RwClkyVnlkQzVqYjIwdmMzTmpZUzF6YUdFeUxXYzFMbU55YkRCTUJnTlZIU0FFUlRCRE1EY0dDV0NHU0FHRy9Xd0IKQVRBcU1DZ0dDQ3NHQVFVRkJ3SUJGaHhvZEhSd2N6b3ZMM2QzZHk1a2FXZHBZMlZ5ZEM1amIyMHZRMUJUTUFnRwpCbWVCREFFQ0FqQjhCZ2dyQmdFRkJRY0JBUVJ3TUc0d0pBWUlLd1lCQlFVSE1BR0dHR2gwZEhBNkx5OXZZM053CkxtUnBaMmxqWlhKMExtTnZiVEJHQmdnckJnRUZCUWN3QW9ZNmFIUjBjRG92TDJOaFkyVnlkSE11WkdsbmFXTmwKY25RdVkyOXRMMFJwWjJsRFpYSjBVMGhCTWxObFkzVnlaVk5sY25abGNrTkJMbU55ZERBTUJnTlZIUk1CQWY4RQpBakFBTUEwR0NTcUdTSWIzRFFFQkN3VUFBNElCQVFDaEY2dzhhWG14L0d0ZXZYaCtnY1JGakV0TG5MTm9rTTVWClJqUXBLTFBBYnBKd3Q0dGFMS3hoR1l1YktGREZwOEZYcGZCMlpEMlNHMjlLRWlXRURRamNPK0o2MFc5RlFHZjQKOWo5VXZwa1EvSHMvZEFSOE1BQXZMdkp3VDEvcFJzM3ZrU1RZV0lpZ0J0QzZLRWZvYkhXNnFMNXR6bXh5amxqZApRT1I1dkhyenlma1ZiakplODRXRXZvcHBPYzJ5YmpCZzJBZUF6SVRMY0VNU2gwS3lpUnVVbFZWT0RoU3VwMENqCkJ4UWg1d29rQXhKSmwwS1NlTHM2V3Y5b29LQWYvVndRTithcE9VcVlYMzh5UXpsUGFGM0I5NThDaVVwWUVOY2QKZ0l1UXdrVGU0VXZzQWlmTVdBTUpnZE5yUmNWNEcwa3RjQ3dyc2EwbEtPNmhNVnh5d3BIUgotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCi0tLS0tQkVHSU4gQ0VSVElGSUNBVEUtLS0tLQpNSUlFbERDQ0EzeWdBd0lCQWdJUUFmMmo2MjdLZGNpSVE0dHlTOCs4a1RBTkJna3Foa2lHOXcwQkFRc0ZBREJoCk1Rc3dDUVlEVlFRR0V3SlZVekVWTUJNR0ExVUVDaE1NUkdsbmFVTmxjblFnU1c1ak1Sa3dGd1lEVlFRTEV4QjMKZDNjdVpHbG5hV05sY25RdVkyOXRNU0F3SGdZRFZRUURFeGRFYVdkcFEyVnlkQ0JIYkc5aVlXd2dVbTl2ZENCRApRVEFlRncweE16QXpNRGd4TWpBd01EQmFGdzB5TXpBek1EZ3hNakF3TURCYU1FMHhDekFKQmdOVkJBWVRBbFZUCk1SVXdFd1lEVlFRS0V3eEVhV2RwUTJWeWRDQkpibU14SnpBbEJnTlZCQU1USGtScFoybERaWEowSUZOSVFUSWcKVTJWamRYSmxJRk5sY25abGNpQkRRVENDQVNJd0RRWUpLb1pJaHZjTkFRRUJCUUFEZ2dFUEFEQ0NBUW9DZ2dFQgpBTnl1V0pCTndjUXdGWkExVzI0OGdoWDFMRnk5NDl2L2NVUDZaQ1dBMU80WW9rM3dadEFLYzI0Um1EWVhaSzgzCm5mMzZRWVN2eDYrTS9ocHpUYzh6bDVDaWxvZFRneXU1cG5WSUxSMVdOM3ZhTVRJYTE2eXJCdlNxWFV1M1IwYmQKS3BQRGtDNTVnSUR2RXdScUZEdTFtNUsrd2dkbFR2emEvUDk2cnR4Y2ZsVXhET2c1QjZUWHZpL1RDMnJTc2Q5ZgovbGQwVXpzMWdOMnVqa1NZczU4TzA5cmcxL1JyS2F0RXAwdFloRzJTUzRIRDJuT0xFcGRJa0FSRmRScmROekdYCmt1ak5WQTA3NU1FL09WNHV1UE5jZmhDT2hrRUFqVVZtUjdDaFpjNmdxaWtKVHZPWDYrZ3Vxdzl5cHpBTytzZjAKL1JSM3c2UmJLRmZDcy9tQy9iZEZXSnNDQXdFQUFhT0NBVm93Z2dGV01CSUdBMVVkRXdFQi93UUlNQVlCQWY4QwpBUUF3RGdZRFZSMFBBUUgvQkFRREFnR0dNRFFHQ0NzR0FRVUZCd0VCQkNnd0pqQWtCZ2dyQmdFRkJRY3dBWVlZCmFIUjBjRG92TDI5amMzQXVaR2xuYVdObGNuUXVZMjl0TUhzR0ExVWRId1IwTUhJd042QTFvRE9HTVdoMGRIQTYKTHk5amNtd3pMbVJwWjJsalpYSjBMbU52YlM5RWFXZHBRMlZ5ZEVkc2IySmhiRkp2YjNSRFFTNWpjbXd3TjZBMQpvRE9HTVdoMGRIQTZMeTlqY213MExtUnBaMmxqWlhKMExtTnZiUzlFYVdkcFEyVnlkRWRzYjJKaGJGSnZiM1JEClFTNWpjbXd3UFFZRFZSMGdCRFl3TkRBeUJnUlZIU0FBTUNvd0tBWUlLd1lCQlFVSEFnRVdIR2gwZEhCek9pOHYKZDNkM0xtUnBaMmxqWlhKMExtTnZiUzlEVUZNd0hRWURWUjBPQkJZRUZBK0FZUnlDTVdIVkx5am5qVVk0dEN6aAp4dG5pTUI4R0ExVWRJd1FZTUJhQUZBUGVVRFZXMFV5N1p2Q2o0aHNidzVleVBkRlZNQTBHQ1NxR1NJYjNEUUVCCkN3VUFBNElCQVFBalB0OUwwakZDcGJaK1Fsd2FSTXhwMFdpMFhVdmdCQ0ZzUytKdHpMSGdsNCttVXduTnFpcGwKNVRsUEhvT2xibHlZb2lRbTV2dWg3WlBITGdMR1RVcS9zRUxmZU5xenFQbHQveUdGVXpaZ1RIYk83RGpjMWxHQQo4TVhXNWRSTkoyU3JtOGMrY2Z0SWw3Z3piY2tUQis2V29oc1lGZlpjVEVEdHM4THMvM0hCNDBmLzFMa0F0RGRDCjJpREo2bTZLN2hRR3JuMmlXWmlJcUJ0dkxmVHl5UlJmSnM4c2pYN3ROOENwMVRtNWdyOFpET28wcndBaGFQaXQKYytMSk10bzRKUXRWMDVvZDhHaUc3UzVCTk85OHBWQWR2enI1MDhFSURPYnRIb3BZSmVTNGQ2MHRidlZTM2JSMApqNnRKTHAwN2t6UW9IM2pPbE9ySHZkUEpiUnplWERMegotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg=='
key='ASK RYAN FOR THIS'


adduser --gecos '' --disabled-password --home /home/cyph cyph || exit 1


cd $(cd "$(dirname "$0")"; pwd)

sed -i 's/# deb /deb /g' /etc/apt/sources.list
sed -i 's/\/\/.*archive.ubuntu.com/\/\/archive.ubuntu.com/g' /etc/apt/sources.list

export DEBIAN_FRONTEND=noninteractive
apt-get -y --force-yes update
apt-get -y --force-yes install curl lsb-release apt-transport-https
apt-get -y --force-yes purge apache* mysql*
distro="$(lsb_release -c | awk '{print $2}')"
echo "deb https://deb.nodesource.com/node_6.x ${distro} main" >> /etc/apt/sources.list
curl https://deb.nodesource.com/gpgkey/nodesource.gpg.key | apt-key add -
apt-get -y --force-yes update
apt-get -y --force-yes upgrade
apt-get -y --force-yes install apt dpkg nodejs openssl build-essential git
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

	const cache				= {gzip: {}, br: {}};

	const cdnPath			= './cdn/';
	const certPath			= 'cert.pem';
	const keyPath			= 'key.pem';
	const dhparamPath		= 'dhparams.pem';

	const returnError		= res => res.status(418).end();

	const getFileName		= (req, ext) => () => new Promise( (resolve, reject) =>
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
		})
	);

	const git				= (...args) => new Promise( (resolve, reject) => {
		let data		= new Buffer([]);
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

	app.use( (req, res, next) => {
		res.set('Access-Control-Allow-Methods', 'GET');
		res.set('Access-Control-Allow-Origin', '*');
		res.set('Cache-Control', 'public, max-age=31536000');
		res.set('Content-Type', 'application/octet-stream');
		res.set('Public-Key-Pins', 'max-age=5184000; includeSubdomains; pin-sha256="\${keyHash}"; pin-sha256="\${backupHash}"');
		res.set('Strict-Transport-Security', 'max-age=31536000; includeSubdomains');

		if ( (req.get('Accept-Encoding') || '').replace(/\s+/g, '').split(',').indexOf('br') > -1) {
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
		new Promise( (resolve, reject) =>
			res.sendFile(fileName, {root: cdnPath}, err => {
				if (err) {
					reject(err);
				}
				else {
					resolve();
				}
			})
		)
	).catch( () =>
		returnError(res)
	));

	app.get(/.*\/pkg/, (req, res) => Promise.resolve().then( () => {
		if (req.cache[req.originalUrl]) {
			return;
		}

		return req.getFileName().then(fileName => new Promise( (resolve, reject) =>
			fs.readFile(cdnPath + fileName, (err, data) => {
				if (err) {
					reject(err);
					return;
				}

				req.cache[req.originalUrl]	= data;

				resolve();
			})
		));
	}).then( () =>
		res.send(req.cache[req.originalUrl])
	).catch( () =>
		returnError(res)
	));

	app.get(/\/.*/, (req, res) => Promise.resolve().then( () => {
		if (req.cache[req.originalUrl]) {
			return;
		}

		const hash	= req.originalUrl.split('?')[1];

		return req.getFileName().then(fileName => new Promise( (resolve, reject) =>
			fs.stat(cdnPath + fileName, err => {
				if (err) {
					reject(err);
					return;
				}

				resolve();
			})
		).then( () =>
			hash ? git('log', fileName) : ''
		).then(output => {
			const revision	= (
				output.toString().
					replace(/\n/g, ' ').
					replace(/commit /g, '\n').
					split('\n').
					filter(s => s.indexOf(hash) > -1)
				[0] || ''
			).split(' ')[0] || 'HEAD';

			return git('show', revision + ':' + fileName);
		}).then(data => {
			req.cache[req.originalUrl]	= data;
		}));
	}).then( () =>
		res.send(req.cache[req.originalUrl])
	).catch( () =>
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

	while [ ! -d cdn ] ; do
		git clone https://github.com/cyph/cdn.git || sleep 5
	done

	cd cdn

	while true ; do
		git pull
		sleep 60
	done
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

crontab -l > /tmp/cdn.cron
echo "@reboot /portredirect.sh" >> /tmp/cdn.cron
echo "45 ${updatehour} * * ${updateday} /systemupdate.sh" >> /tmp/cdn.cron
crontab /tmp/cdn.cron
rm /tmp/cdn.cron

rm cdn.sh
reboot
