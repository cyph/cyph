#!/bin/bash

# CDN node setup script for Ubuntu 14.04

cert='LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tDQpNSUlIeWpDQ0JyS2dBd0lCQWdJUURJd1VxQ0V0UllibURReXpvSGp5VnpBTkJna3Foa2lHOXcwQkFRc0ZBREIxDQpNUXN3Q1FZRFZRUUdFd0pWVXpFVk1CTUdBMVVFQ2hNTVJHbG5hVU5sY25RZ1NXNWpNUmt3RndZRFZRUUxFeEIzDQpkM2N1WkdsbmFXTmxjblF1WTI5dE1UUXdNZ1lEVlFRREV5dEVhV2RwUTJWeWRDQlRTRUV5SUVWNGRHVnVaR1ZrDQpJRlpoYkdsa1lYUnBiMjRnVTJWeWRtVnlJRU5CTUI0WERURTFNRGd6TVRBd01EQXdNRm9YRFRFMk1URXpNREV5DQpNREF3TUZvd2dmUXhIVEFiQmdOVkJBOE1GRkJ5YVhaaGRHVWdUM0puWVc1cGVtRjBhVzl1TVJNd0VRWUxLd1lCDQpCQUdDTnp3Q0FRTVRBbFZUTVJrd0Z3WUxLd1lCQkFHQ056d0NBUUlUQ0VSbGJHRjNZWEpsTVJBd0RnWURWUVFGDQpFd2MxTmpBd01ETTVNU0l3SUFZRFZRUUpFeGt6TlRBd0lGTnZkWFJvSUVSMWNHOXVkQ0JJYVdkb2QyRjVNUTR3DQpEQVlEVlFRUkV3VXhPVGt3TVRFTE1Ba0dBMVVFQmhNQ1ZWTXhFVEFQQmdOVkJBZ1RDRVJsYkdGM1lYSmxNUTR3DQpEQVlEVlFRSEV3VkViM1psY2pFVE1CRUdBMVVFQ2hNS1EzbHdhQ3dnU1c1akxqRVlNQllHQTFVRUF4TVBibUV1DQpZMlJ1TG1ONWNHZ3VZMjl0TUlJQklqQU5CZ2txaGtpRzl3MEJBUUVGQUFPQ0FROEFNSUlCQ2dLQ0FRRUF2YmdtDQo2UHBkT1dCUGs5dGJtMTFQTDhWbU5UZkZlL2JZZmtWRit4QlU5N3FyUnRObEVZelZhWFZDdnJuNEkwNGNjMGlVDQpHSTZGaWl2NnI4N3I5eFVrb2t3akpBYVZmYndoNnlDalpDQU14S3VXRW01QVF2LzhSY25ldng4dTBJV0hjdWtUDQpCeTNzUitjUldsMVhIM1UwcHA1TGx0N0xaTkpoZzlHTjZtQUZoQzYzZXRRVHJ4STFaUzhqZVVTclhKeTEvdHN2DQpFbmlXN01pR3lUMHFiWmR5OXJ2UUcyZjdMR3IxSitmbGcyQm40NzZwVkpQeWlIV1Q1d1BBZnFtY1lGL256cml2DQo5QkdNbU1FMXJCRHloWDh2dkFIVTJ0aUdBNFdZRWkvY2Nad1lwc3JrZ0hFNmQwZ2RkVFhydWlHcitiL2szNWxzDQpUMmpnVjdzeTJGYUxRMTJTNFFJREFRQUJvNElEMURDQ0E5QXdId1lEVlIwakJCZ3dGb0FVUGROUXBkYWdyZTd6DQpTbUFLWmRNaDFQajQxZzh3SFFZRFZSME9CQllFRkFXdDB1Wkd2V3gwV2luM0VVdG9QcGU0YmlPcE1JR0lCZ05WDQpIUkVFZ1lBd2ZvSVBibUV1WTJSdUxtTjVjR2d1WTI5dGdnOWhaaTVqWkc0dVkzbHdhQzVqYjIyQ0QyRnpMbU5rDQpiaTVqZVhCb0xtTnZiWUlQWlhVdVkyUnVMbU41Y0dndVkyOXRnZzl2WXk1alpHNHVZM2x3YUM1amIyMkNEM05oDQpMbU5rYmk1amVYQm9MbU52YllJV1kzbHdhR1JpZVdocFpHUmxibUpvY3k1dmJtbHZiakFPQmdOVkhROEJBZjhFDQpCQU1DQmFBd0hRWURWUjBsQkJZd0ZBWUlLd1lCQlFVSEF3RUdDQ3NHQVFVRkJ3TUNNSFVHQTFVZEh3UnVNR3d3DQpOS0F5b0RDR0xtaDBkSEE2THk5amNtd3pMbVJwWjJsalpYSjBMbU52YlM5emFHRXlMV1YyTFhObGNuWmxjaTFuDQpNUzVqY213d05LQXlvRENHTG1oMGRIQTZMeTlqY213MExtUnBaMmxqWlhKMExtTnZiUzl6YUdFeUxXVjJMWE5sDQpjblpsY2kxbk1TNWpjbXd3UWdZRFZSMGdCRHN3T1RBM0JnbGdoa2dCaHYxc0FnRXdLakFvQmdnckJnRUZCUWNDDQpBUlljYUhSMGNITTZMeTkzZDNjdVpHbG5hV05sY25RdVkyOXRMME5RVXpDQmlBWUlLd1lCQlFVSEFRRUVmREI2DQpNQ1FHQ0NzR0FRVUZCekFCaGhob2RIUndPaTh2YjJOemNDNWthV2RwWTJWeWRDNWpiMjB3VWdZSUt3WUJCUVVIDQpNQUtHUm1oMGRIQTZMeTlqWVdObGNuUnpMbVJwWjJsalpYSjBMbU52YlM5RWFXZHBRMlZ5ZEZOSVFUSkZlSFJsDQpibVJsWkZaaGJHbGtZWFJwYjI1VFpYSjJaWEpEUVM1amNuUXdEQVlEVlIwVEFRSC9CQUl3QURDQ0FYNEdDaXNHDQpBUVFCMW5rQ0JBSUVnZ0Z1QklJQmFnRm9BSFlBcExrSmtMUVlXQlNIdXhPaXpHZHdDancxbUFUNUc5KzQ0M2ZODQpEc2dOM0JBQUFBRlAwV3FMOFFBQUJBTUFSekJGQWlBc3JnRVVyVVprbXJJQVVQZG5MY0V5Z2tjQkpwc3RvMEJIDQphblVVSnA1SnlBSWhBTks1dWhRa3FRMkNBb2s0b09wUlFwVEhKVEhXNWpNZG92bU9FUW5XUnRGZkFIWUFhUGFZDQorQjlrZ3I0NmpPNjVLQjFNL0hGUlhXZVQxRVRSQ21lc3UwOVArOFFBQUFGUDBXcUwrQUFBQkFNQVJ6QkZBaUVBDQpsZW85Nkx0WG5Va2J3ZnBhZ1VnMXVvL3JNQ3k1cldUOFJuMWhQOWpKRTVrQ0lHUktYWlV4dmY0YVZmZXVhYVNPDQo5Vm15TlEzaHVNZkpPcE1TSmlyQUt3WFdBSFlBVmhRR21pL1h3dXpUOWVHOVJMSSt4MFoydWJ5WkVWekE3NVNZDQpWZGFKME4wQUFBRlAwV3FORFFBQUJBTUFSekJGQWlFQXN3UmdFZUhwYTJIZnVDQzZ3TWg2MFI1TjZ5V1pXZytLDQphVUJVNGN5NkhQNENJRDBuVmVadmNFbFh4MzNXajJDeHJablByWUJzdENLM0FMRHF6NWJMeHhYYU1BMEdDU3FHDQpTSWIzRFFFQkN3VUFBNElCQVFDd09tNUdlMzZjSGRrcnpMa2djMFlyK0YzdVNyZDdyL3ZpNkUxTDFnVVZlK0R2DQpMNk5EL0VOR0QrMUdXc1hiY1RhSnd1amJwUWFiTm1oMnlKcUpXNENLb0hlajBSQWFGMk10WENURmNxNzBDWUM5DQp2WDdqeDlsbk1TL09oQmJOMFJ1Z0wwQWpkSnAyZThVOUU1QXpjbUg3SFlocU9wL3NPNXU3dnphUE14K1N0ci9KDQo3ZkRKT25keFI5ZlBtR1VBNmsvQmlZelpCd0I2RElkZzVISklBTkppYS9IalFmUHArNlRac3BiU2pJa1ZxTTdUDQpUa1lnQnh2UGxPRC9Td3N5djFFSHJWYmNmVVZuVXBCRlJ3eEpyM0hqaTJha2FoQVQ3eHMxY0Q0WE5OaDRmWkloDQpDK05yZWhKTEN0dS9Tald3eVlhb2wzbHJFUWlKNlo1OFFjR0VDQUpJDQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tDQotLS0tLUJFR0lOIENFUlRJRklDQVRFLS0tLS0NCk1JSUV0akNDQTU2Z0F3SUJBZ0lRREhtcFJMQ01FWlVna21GZjRtc2RnekFOQmdrcWhraUc5dzBCQVFzRkFEQnMNCk1Rc3dDUVlEVlFRR0V3SlZVekVWTUJNR0ExVUVDaE1NUkdsbmFVTmxjblFnU1c1ak1Sa3dGd1lEVlFRTEV4QjMNCmQzY3VaR2xuYVdObGNuUXVZMjl0TVNzd0tRWURWUVFERXlKRWFXZHBRMlZ5ZENCSWFXZG9JRUZ6YzNWeVlXNWoNClpTQkZWaUJTYjI5MElFTkJNQjRYRFRFek1UQXlNakV5TURBd01Gb1hEVEk0TVRBeU1qRXlNREF3TUZvd2RURUwNCk1Ba0dBMVVFQmhNQ1ZWTXhGVEFUQmdOVkJBb1RERVJwWjJsRFpYSjBJRWx1WXpFWk1CY0dBMVVFQ3hNUWQzZDMNCkxtUnBaMmxqWlhKMExtTnZiVEUwTURJR0ExVUVBeE1yUkdsbmFVTmxjblFnVTBoQk1pQkZlSFJsYm1SbFpDQlcNCllXeHBaR0YwYVc5dUlGTmxjblpsY2lCRFFUQ0NBU0l3RFFZSktvWklodmNOQVFFQkJRQURnZ0VQQURDQ0FRb0MNCmdnRUJBTmRUcEFSUitKbW1Ga2hMWnllcWswblFPZTBNc0xBQWgvRm5LSWFGakk1ajJyeXhRRGppMC9Yc3BRVVkNCnVEMCt4WmtYTXV3WWpQcnhES1prSVlYTEJ4QTBzRktJS3g5b205S3hqeEt3czlMbmlCOGY3emgzVkZOZmdIay8NCkxocXFxQjVMS3cycnQyTzVOYmQ5Rkx4WlM5OVJTdEtoNGd6aWtJS0hhcTdxMTJUV21GWG8vYThhVUd4VXZCSHkNCi9VcnluYnQvRHZUVnZvNFdpUkpWMk1CeE5PNzIzQzNzeEljbGhvM1lJZVN3VFF5SjNEa21GOTMyMTVTRjJBUWgNCmNKMXZiLzljdWhuaFJjdFdWeWgrSEExQlY2cTN1Q2U3c2VUNkt1OGhJM1VhclMyYmhqV01uSGUxYzYzWWxDM2sNCjh3eWQ3c0ZPWW40WHdIR2VMTjd4K1JBb0dUTUNBd0VBQWFPQ0FVa3dnZ0ZGTUJJR0ExVWRFd0VCL3dRSU1BWUINCkFmOENBUUF3RGdZRFZSMFBBUUgvQkFRREFnR0dNQjBHQTFVZEpRUVdNQlFHQ0NzR0FRVUZCd01CQmdnckJnRUYNCkJRY0RBakEwQmdnckJnRUZCUWNCQVFRb01DWXdKQVlJS3dZQkJRVUhNQUdHR0doMGRIQTZMeTl2WTNOd0xtUnANCloybGpaWEowTG1OdmJUQkxCZ05WSFI4RVJEQkNNRUNnUHFBOGhqcG9kSFJ3T2k4dlkzSnNOQzVrYVdkcFkyVnkNCmRDNWpiMjB2UkdsbmFVTmxjblJJYVdkb1FYTnpkWEpoYm1ObFJWWlNiMjkwUTBFdVkzSnNNRDBHQTFVZElBUTINCk1EUXdNZ1lFVlIwZ0FEQXFNQ2dHQ0NzR0FRVUZCd0lCRmh4b2RIUndjem92TDNkM2R5NWthV2RwWTJWeWRDNWoNCmIyMHZRMUJUTUIwR0ExVWREZ1FXQkJROTAxQ2wxcUN0N3ZOS1lBcGwweUhVK1BqV0R6QWZCZ05WSFNNRUdEQVcNCmdCU3hQc05wQS9pL1J3SFVtQ1lhQ0FMdlkyUXJ3ekFOQmdrcWhraUc5dzBCQVFzRkFBT0NBUUVBbmJiUWtJYmgNCmhnTHR4YUR3TkJ4MHdZMTJ6SVlLcVBCS2lrTFdQOGlwVGExOENLM210bEM0b2hwTmlBZXhLU0hjNTlyR1BDSGcNCjR4RkpjS3g2SFFHa3loRTZWNnQ5VnlwQWRQM1RIWVVZVU45WFIzV2hmVlVnTGtjM1VIS01mNEliMG1LUExRTmENCjJzUElvYzRzVXFJQVkrdHp1bkhJU1NjamwyU0ZuamdPcldOb1BMcFNnVmg1b3l3TTM5NXQ2ekh5dXFCOGJQRXMNCjFPRzlkNFEzQTg0eXRjaWFnUnBLa2s0N1JwcUYvb09pK1o2TW84d05Yck05endSNGp4UVVlektjeHdDbVhNUzENCm9WV05XbFpvcENKd3FqeUJjZG1kcUVVNzlPWDJvbEhkeDN0aTZHOE1kT3U0MnZpL2h3MTVVSkdRbXhnN2tWa24NCjhUVW9FNnNtZnRYM2VnPT0NCi0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0NCg=='
key='ASK RYAN FOR THIS'


cd $(cd "$(dirname "$0")"; pwd)

sed -i 's/# deb /deb /g' /etc/apt/sources.list
sed -i 's/\/\/.*archive.ubuntu.com/\/\/archive.ubuntu.com/g' /etc/apt/sources.list

export DEBIAN_FRONTEND=noninteractive
apt-get -y --force-yes update
apt-get -y --force-yes upgrade
apt-get -y --force-yes install curl
curl -sL https://deb.nodesource.com/setup_6.x | bash -
apt-get -y --force-yes update
apt-get -y --force-yes install nodejs openssl build-essential git


cat > /tmp/setup.sh << EndOfMessage
#!/bin/bash

cd /home/${SUDO_USER}

echo '${cert}' | base64 --decode > cert.pem
echo '${key}' | base64 --decode > key.pem

keyHash="\$(openssl rsa -in key.pem -outform der -pubout | openssl dgst -sha256 -binary | openssl enc -base64)"
backupHash='V3Khw3OOrzNle8puKasf47gcsFk9QqKP5wy0WWodtgA='

npm install express spdy


cat > server.js <<- EOM
	#!/usr/bin/env node

	const app				= require('express')();
	const child_process		= require('child_process');
	const fs				= require('fs');
	const spdy				= require('spdy');

	const cache				= {};

	const cdnPath			= './cdn/';
	const certPath			= 'cert.pem';
	const keyPath			= 'key.pem';

	const getFileName		= req => req.path.slice(1) + '.gz';
	const returnError		= res => res.status(418).end();

	const git				= (...args) => {
		return new Promise(resolve => {
			let data		= new Buffer([]);
			const stdout	= child_process.spawn('git', args, {cwd: cdnPath}).stdout;

			stdout.on('data', buf => data = Buffer.concat([data, buf]));
			stdout.on('close', () => resolve(data));
		});
	};

	app.use( (req, res, next) => {
		res.set('Access-Control-Allow-Methods', 'GET');
		res.set('Access-Control-Allow-Origin', '*');
		res.set('Cache-Control', 'public, max-age=31536000');
		res.set('Content-Encoding', 'gzip');
		res.set('Content-Type', 'application/octet-stream');
		res.set('Public-Key-Pins', 'max-age=5184000; includeSubdomains; pin-sha256="\${keyHash}"; pin-sha256="\${backupHash}"');
		res.set('Strict-Transport-Security', 'max-age=31536000; includeSubdomains');

		next();
	});

	app.get(/.*\/current/, (req, res) => new Promise( (resolve, reject) =>
		res.sendFile(getFileName(req), {root: cdnPath}, err => {
			if (err) {
				reject(err);
			}
			else {
				resolve();
			}
		})
	).catch(() =>
		returnError(res)
	));

	app.get(/.*\/pkg/, (req, res) => Promise.resolve().then(() => {
		if (cache[req.originalUrl]) {
			return;
		}

		return new Promise( (resolve, reject) =>
			fs.readFile(cdnPath + getFileName(req), (err, data) => {
				if (err) {
					reject(err);
					return;
				}

				cache[req.originalUrl]	= data;

				resolve();
			})
		);
	}).then(() =>
		res.send(cache[req.originalUrl])
	).catch(() =>
		returnError(res)
	));

	app.get(/\/.*/, (req, res) => Promise.resolve().then(() => {
		if (cache[req.originalUrl]) {
			return;
		}

		const file	= getFileName(req);
		const hash	= req.originalUrl.split('?')[1];

		return new Promise( (resolve, reject) =>
			fs.stat(cdnPath + file, err => {
				if (err) {
					reject(err);
					return;
				}

				resolve();
			})
		).then(() =>
			hash ? git('log', file) : ''
		).then(output => {
			const revision	= (
				output.toString().
					replace(/\n/g, ' ').
					replace(/commit /g, '\n').
					split('\n').
					filter(s => s.indexOf(hash) > -1)
				[0] || ''
			).split(' ')[0] || 'HEAD';

			return git('show', revision + ':' + file);
		}).then(data => {
			cache[req.originalUrl]	= data;
		});
	}).then(() =>
		res.send(cache[req.originalUrl])
	).catch(() =>
		returnError(res)
	));

	spdy.createServer({
		cert: fs.readFileSync(certPath),
		key: fs.readFileSync(keyPath),
		dhparam: child_process.spawnSync('openssl', [
			'dhparam',
			/(\d+) bit/.exec(
				child_process.spawnSync('openssl', [
					'rsa',
					'-in',
					keyPath,
					'-text',
					'-noout'
				]).stdout.toString()
			)[1]
		]).stdout.toString()
	}, app).listen(31337);
EOM
chmod +x server.js


cat > cdnupdate.sh <<- EOM
	#!/bin/bash

	if [ ! -d cdn ] ; then
		git clone https://github.com/cyph/cdn.git
	fi

	sudo iptables -A PREROUTING -t nat -p tcp --dport 443 -j REDIRECT --to-port 31337

	cd cdn

	while true ; do
		git pull
		sleep 60
	done
EOM
chmod +x cdnupdate.sh


crontab -l > cdn.cron
echo '@reboot /home/${SUDO_USER}/cdnupdate.sh' >> cdn.cron
echo '@reboot /home/${SUDO_USER}/server.js' >> cdn.cron
crontab cdn.cron
rm cdn.cron
EndOfMessage


chmod 777 /tmp/setup.sh
su ${SUDO_USER} -c /tmp/setup.sh
rm /tmp/setup.sh


cat > /portredirect.sh << EndOfMessage
#!/bin/bash

iptables -A PREROUTING -t nat -p tcp --dport 443 -j REDIRECT --to-port 31337
EndOfMessage
chmod +x /portredirect.sh


cat > /systemupdate.sh << EndOfMessage
#!/bin/bash

su ${SUDO_USER} -c 'npm update'

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

crontab -l > /tmp/cdn.cron
echo "@reboot /portredirect.sh" >> /tmp/cdn.cron
echo "45 ${updatehour} * * ${updateday} /systemupdate.sh" >> /tmp/cdn.cron
crontab /tmp/cdn.cron
rm /tmp/cdn.cron

rm cdn.sh
reboot
