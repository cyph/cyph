#!/bin/bash

# Air gapped signing environment setup script for Debian 8.5 on BeagleBone Black

activeKeys='4'
backupKeys='21'
localAddress='10.0.0.42'
remoteAddress='10.0.0.43'
port='31337'
passwords=()


export DEBIAN_FRONTEND=noninteractive
apt-get -y --force-yes update
apt-get -y --force-yes upgrade
export DEBIAN_FRONTEND=text
apt-get install console-data console-setup keyboard-configuration

for i in `seq 1 ${activeKeys}` ; do
	echo -n "Password for key #${i}: "
	read passwords[${i}] 
done

reset

oldhostname=$(hostname)
echo -n 'Hostname: '
read hostname
echo ${hostname} > /etc/hostname
sed -i "s|${oldhostname}|${hostname}|g" /etc/hosts

oldusername=$(ls /home)
echo -n 'Username: '
read username
echo 'FYI, login password must be under 64 characters.'
adduser ${username}
adduser ${username} admin
echo "${username} ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

cat >> /etc/network/interfaces << EndOfMessage
auto eth0
iface eth0 inet static
	address ${localAddress}
	netmask 255.255.0.0
EndOfMessage

export DEBIAN_FRONTEND=noninteractive
apt-get -y --force-yes install curl
curl -sL https://deb.nodesource.com/setup_6.x | bash -
apt-get -y --force-yes update
apt-get -y --force-yes install nodejs ecryptfs-utils lsof
apt-get -y --force-yes remove apache2 openssh-server

npm -g install xkcd-passphrase

backupPasswordAes="$(xkcd-passphrase 256)"
backupPasswordSodium="$(xkcd-passphrase 256)"
echo "Password for backup keys is: ${backupPasswordAes} ${backupPasswordSodium}"
echo -e '\nMemorize this and then hit enter to continue.'
read
reset


cat > /tmp/setup.sh << EndOfMessage
#!/bin/bash

cd /home/${username}

npm install level libsodium-wrappers read request supersphincs
echo


node -e "
	const db				= require('level')('keys');
	const read				= require('read');
	const request			= require('request');
	const sodium			= require('libsodium-wrappers');
	const superSphincs		= require('supersphincs');

	const activeKeys		= ${activeKeys};
	const totalKeys			= activeKeys + ${backupKeys};

	const passwords			= [
		'${passwords[1]}',
		'${passwords[2]}',
		'${passwords[3]}',
		'${passwords[4]}'
	];

	const backupPasswords	= {
		aes: '${backupPasswordAes}',
		sodium: '${backupPasswordSodium}'
	};

	Promise.all(
		Array(totalKeys).fill(0).map(_ => superSphincs.keyPair())
	).then(keyPairs => Promise.all([
		keyPairs,
		Promise.all(keyPairs.map((keyPair, i) => superSphincs.exportKeys(
			keyPair,
			i < activeKeys ? passwords[i] : backupPasswords.aes 
		)))
	])).then(results => {
		const keyPairs	= results[0];
		const keyData	= results[1];

		keyPairs.forEach(keyPair => {
			new Buffer(keyPair.privateKey.buffer).fill(0);
			new Buffer(keyPair.publicKey.buffer).fill(0);
		});

		const publicKeys	= JSON.stringify({
			rsa: keyData.map(o => o.public.rsa),
			sphincs: keyData.map(o => o.public.sphincs)
		});

		const backupKeys	= sodium.crypto_secretbox_easy(
			sodium.from_string(JSON.stringify(
				keyData.slice(activeKeys).map(o => o.private.superSphincs)
			)),
			new Uint8Array(sodium.crypto_secretbox_NONCEBYTES),
			sodium.crypto_pwhash_scryptsalsa208sha256(
				sodium.crypto_secretbox_KEYBYTES,
				backupPasswords.sodium,
				new Uint8Array(sodium.crypto_pwhash_scryptsalsa208sha256_SALTBYTES),
				sodium.crypto_pwhash_scryptsalsa208sha256_OPSLIMIT_SENSITIVE,
				50331648
			),
			'base64'
		).replace(/\\s+/g, '');

		return Promise.all([
			publicKeys,
			backupKeys,
			superSphincs.hash(publicKeys),
			Promise.all(['rsa', 'sphincs'].map(keyType =>
				Promise.all(keyData.slice(0, activeKeys).map((o, i) =>
					new Promise((resolve, reject) =>
						db.put(keyType + i, o.private[keyType], err => {
							if (err) {
								reject(err);
							}
							else {
								resolve();
							}
						})
					)
				))
			))
		]);
	}).then(results => {
		const publicKeys	= results[0];
		const backupKeys	= results[1];
		const publicKeyHash	= results[2].hex;

		request.post({
			url: 'https://mandrillapp.com/api/1.0/messages/send.json',
			headers: {'Content-Type': 'application/json'},
			body: JSON.stringify({
				key: 'HNz4JExN1MtpKz8uP2RD1Q',
				message: {
					from_email: 'test@mandrillapp.com',
					to: [{email: 'keys@cyph.com', type: 'to'}],
					subject: 'New keys: ' + publicKeyHash,
					text:
						'Public keys:\n\n' + publicKeys +
						'\n\n\n\n\n\n' +
						'Encrypted backup private keys:\n\n' + backupKeys
				}
			})
		}, () => console.log(publicKeyHash));
	}).catch(err =>
		console.log(err)
	);
"


echo
echo "Before committing, you must validate that the SHA-512 of the public key JSON you've been emailed matches the above."
echo "Hit enter to continue after you've either done so or written the down the hash for validation at a later time."
read


cat > server.js <<- EOM
	#!/usr/bin/env node

	const child_process	= require('child_process');
	const db			= require('level')('keys');
	const dgram			= require('dgram');
	const read			= require('read');
	const stream		= require('stream');
	const superSphincs	= require('supersphincs');

	const activeKeys	= ${activeKeys};
	const localAddress	= '${localAddress}';
	const remoteAddress	= '${remoteAddress}';
	const port			= ${port};

	const reviewText	= text => new Promise(resolve => {
		const s	= new stream.Readable();
		s.push(text);
		s.push(null);

		s.pipe(child_process.spawn('less', [], {stdio: [
			'pipe',
			process.stdout,
			process.stderr
		]}).on(
			'exit',
			() => resolve()
		).stdin.on(
			'error',
			() => {}
		));
	}).then(() => new Promise((resolve, reject) => read({
		prompt: 'Sign this text? (If so, reverse the network direction now.) [y/N] '
	}, (err, answer) => {
		if (err) {
			reject(err);
		}
		else {
			resolve(answer.trim().toLowerCase() === 'y');
		}
	})));

	const getKeyPair	= () => new Promise((resolve, reject) => read({
		prompt: 'RSA Password: ',
		silent: true
	}, (err, rsa) => {
		if (err) {
			reject(err);
			return;
		}

		read({
			prompt: 'SPHINCS Password: ',
			silent: true
		}, (err, sphincs) => {
			if (err) {
				reject(err);
				return;
			}

			resolve({rsa, sphincs});
		})
	})).then(passwords => {
		if (passwords.rsa === passwords.sphincs) {
			throw new Error('fak u gooby');
		}

		const tryDecryptAll	= keyType => Promise.all(
			Array(activeKeys).fill(0).map((_, i) =>
				Promise.all(['rsa', 'sphincs'].map(kt =>
					new Promise((resolve, reject) =>
						db.get(kt + i, (err, val) => {
							if (err) {
								console.log(err);
								reject(err);
							}
							else {
								resolve(val);
							}
						})
					)
				)).then(results => Promise.all([
					results[keyType === 'rsa' ? 0 : 1],
					superSphincs.importKeys(
						{
							private: {
								rsa: results[0],
								sphincs: results[1]
							}
						},
						passwords[keyType]
					)
				])).then(results => Promise.all([
					results[0],
					superSphincs.exportKeys(
						{publicKey: results[1].publicKey}
					)
				])).then(results => ({
					key: results[0],
					publicKeyString: results[1].public[keyType]
				})).catch(_ => ({
					key: null,
					publicKeyString: null
				}))
			)
		).then(results => results.reduce((a, b) =>
			a.key ? a : b
		));

		return Promise.all([
			passwords,
			tryDecryptAll('rsa'),
			tryDecryptAll('sphincs')
		]);
	}).then(results => {
		const passwords			= results[0];
		const rsaKeyData		= results[1];
		const sphincsKeyData	= results[2];

		if (!rsaKeyData.key || !sphincsKeyData.key) {
			throw new Error('Invalid password; please try again.');
		}

		return Promise.all([
			rsaKeyData.publicKeyString,
			sphincsKeyData.publicKeyString,
			superSphincs.importKeys(
				{
					private: {
						rsa: rsaKeyData.key,
						sphincs: sphincsKeyData.key
					}
				},
				passwords
			)
		]);
	}).then(results => ({
		rsaKeyString: results[0],
		sphincsKeyString: results[1],
		keyPair: results[2]
	})).catch(err => {
		console.log(err);
		return getKeyPair();
	});


	getKeyPair().then(keyData => {
		const server			= dgram.createSocket('udp4');
		const incomingMessages	= {};

		server.on('message', message => {
			const metadata		= new Uint32Array(message.buffer, 0, 4);
			const id			= metadata[0];
			const numBytes		= metadata[1];
			const chunkSize		= metadata[2];
			const chunkIndex	= metadata[3];

			const numChunks		= Math.ceil(numBytes / chunkSize);

			const macAddress	= message.slice(16, 33).toString();

			if (!incomingMessages[id]) {
				incomingMessages[id]	= {
					active: true,
					chunksReceived: {},
					data: new Uint8Array(numBytes)
				};
			}

			const o	= incomingMessages[id];

			if (!o.active) {
				return;
			}

			if (!o.chunksReceived[chunkIndex]) {
				o.data.set(
					new Uint8Array(message.buffer, 33),
					chunkIndex
				);

				o.chunksReceived[chunkIndex]	= true;
			}

			if (Object.keys(o.chunksReceived).length === numChunks) {
				const buf		= new Buffer(o.data.buffer);
				const text		= buf.toString();

				o.active			= false;
				o.chunksReceived	= null;
				o.data				= null;

				buf.fill(0);

				reviewText(text).then(shouldSign =>
					!shouldSign ?
						null :
						superSphincs.signDetached(
							text,
							keyData.keyPair.privateKey
						)
				).then(signature => {
					if (!signature) {
						console.log('Text discarded.');
						return;
					}

					console.log('Signature generated.');

					child_process.spawnSync('sudo', [
						'ip',
						'neigh',
						'add',
						remoteAddress,
						'lladdr',
						macAddress,
						'dev',
						'eth0'
					]);
					child_process.spawnSync('sleep', ['5']);

					const client			= dgram.createSocket('udp4');
					const signatureBytes	= new Buffer(JSON.stringify({
						signature,
						rsa: keyData.rsaKeyString,
						sphincs: keyData.sphincsKeyString
					}));

					let i	= 0;
					let j	= 0;
					const interval	= setInterval(() => {
						if (++j > 5) {
							clearInterval(interval);
							return;
						}
						else if (i >= signatureBytes.length) {
							i	= 0;
						}

						const data	= Buffer.concat([
							new Buffer(
								new Uint32Array([
									id,
									signatureBytes.length,
									i
								]).buffer
							),
							signatureBytes.slice(
								i,
								Math.min(i + chunkSize, signatureBytes.length)
							)
						]);

						client.send(
							data,
							0,
							data.length,
							port,
							remoteAddress
						);

						i += chunkSize;
					}, 50);
				});
			}
		});

		server.bind(port, localAddress);
		console.log('Ready for input.');
	});
EOM


chmod +x server.js
cat >> .bashrc <<- EOM
	if [ -f /autostart ] ; then
		if [ -d /home/${oldusername} ] ; then
			sudo deluser --remove-home ${oldusername}
		fi

		setterm -blank 0

		sleep 5
		sudo service networking restart 2> /dev/null
		sudo systemctl daemon-reload 2> /dev/null

		while [ ! "\\\$(node -e 'console.log(
			(os.networkInterfaces().eth0 || []).filter(o =>
				o.address === "${localAddress}"
			)[0] || ""
		)')" ] ; do
			sleep 1
		done

		./server.js
	fi
EOM
EndOfMessage


chmod 777 /tmp/setup.sh
su ${username} -c /tmp/setup.sh
rm /tmp/setup.sh

modprobe ecryptfs
ecryptfs-migrate-home -u ${username}
su ${username} -c echo
rm -rf /home/${username}.*
touch /autostart
chmod 444 /autostart

echo 'Setup complete; hit enter to shut down now.'
read
halt
