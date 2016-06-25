#!/bin/bash

cd


activeKeys='4'
backupKeys='21'
address='10.0.0.42'
port='31337'


sudo bash -c "cat >> /etc/network/interfaces << EndOfMessage
auto eth0
iface eth0 inet static
	address ${address}
EndOfMessage"

sudo ifconfig eth0 down
sudo ifconfig eth0 up

export DEBIAN_FRONTEND=noninteractive
sudo apt-get -y --force-yes update
sudo apt-get -y --force-yes upgrade
curl -sL https://deb.nodesource.com/setup_6.x | sudo bash -
sudo apt-get -y --force-yes install nodejs

npm install supersphincs level read request


node -e "
	const superSphincs	= require('supersphincs');
	const db			= require('level')('keys');
	const read			= require('read');
	const request		= require('request');

	const activeKeys	= ${activeKeys};
	const totalKeys		= activeKeys + ${backupKeys};

	const getPassswords	= result => new Promise((resolve, reject) => read({
		prompt: result.length === activeKeys ?
			'Password for backup keys: ' :
			'Password for key #' + (result.length + 1) + ': '
		,
		silent: false
	}, (err, password) => {
		if (err) {
			reject(err);
		}
		else {
			resolve(result.concat(password));
		}
	})).then(result => {
		if (result.length === activeKeys + 1) {
			return result;
		}
		else {
			return getPassswords(result);
		}
	});

	Promise.all([
		Promise.all(Array(totalKeys).fill(0).map(_ => superSphincs.keyPair())),
		getPassswords([])
	]).then(results => {
		const keyPairs	= results[0];
		const passwords	= results[1];

		return Promise.all([
			keyPairs,
			Promise.all(keyPairs.map((keyPair, i) => superSphincs.exportKeys(
				keyPair,
				i < activeKeys ? passwords[i] : passwords[activeKeys] 
			)))
		]);
	}).then(results => {
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

		const putKeys		= keyType => Promise.all(keyData.map((o, i) =>
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
		));

		return Promise.all([
			publicKeys,
			superSphincs.hash(publicKeys),
			putKeys('rsa'),
			putKeys('sphincs')
		]);
	}).then(results => {
		const publicKeys	= results[0];
		const hash			= results[1].hex;

		request.post({
			url: 'https://mandrillapp.com/api/1.0/messages/send.json',
			headers: {'Content-Type': 'application/json'},
			body: JSON.stringify({
				key: 'HNz4JExN1MtpKz8uP2RD1Q',
				message: {
					from_email: 'test@mandrillapp.com',
					to: [{email: 'keys@cyph.com', type: 'to'}],
					subject: 'New keys: ' + hash,
					text: publicKeys
				}
			})
		}, () => console.log(hash));
	}).catch(err =>
		console.log(err)
	);
"


cat > server.js << EndOfMessage
#!/usr/bin/env node

const superSphincs	= require('supersphincs');
const db			= require('level')('keys');
const read			= require('read');
const child_process	= require('child_process');
const dgram			= require('dgram');
const stream		= require('stream');

const activeKeys	= ${activeKeys};
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
	prompt: 'Sign this text? (If so, reverse the fiber now.) [y/N] '
}, (err, answer) => {
	if (err) {
		reject(err);
	}
	else {
		resolve(answer.toLowerCase() !== 'y');
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
			])).then(results => ({
				key: results[0],
				index: i
			})).catch(_ => ({
				key: null,
				index: -1
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
})).then(results => {
	const passwords			= results[0];
	const rsaKeyData		= results[1];
	const sphincsKeyData	= results[2];

	if (!rsaKeyData.key || !sphincsKeyData.key) {
		throw new Error('Invalid password; please try again.');
	}

	return Promise.all([
		rsaKeyData.index,
		sphincsKeyData.index,
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
})).then(results => ({
	rsaKeyIndex: results[0],
	sphincsKeyIndex: results[1],
	keyPair: results[2]
})).catch(err => {
	console.log(err);
	return getKeyPair();
});


getKeyPair().then(keyData => {
	const server			= dgram.createSocket('udp4');
	const incomingMessages	= {};

	server.on('message', (message, req) => {
		const metadata		= new Uint32Array(message.buffer);
		const id			= metadata[0];
		const numBytes		= metadata[1];
		const numChunks		= metadata[2];
		const mtu			= metadata[3];
		const chunkIndex	= metadata[4];

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
				new Uint8Array(message.buffer, 20),
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

				const socket			= dgram.createSocket('udp4');
				const signatureBytes	= new Buffer(JSON.stringify({
					signature,
					rsaKeyIndex: keyData.rsaKeyIndex
					sphincsKeyIndex: keyData.sphincsKeyIndex
				}));

				for (let i = 0 ; i < signatureBytes.length ; i += mtu) {
					socket.send(
						signatureBytes,
						i,
						Math.min(signatureBytes.length - i, mtu),
						port,
						req.address
					);
				}
			});
		}
	});

	server.bind(port);
});
EndOfMessage


chmod +x server.js

echo './server.js' >> .bashrc
