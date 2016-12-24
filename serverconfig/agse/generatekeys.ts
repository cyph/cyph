#!/usr/bin/env ts-node


import * as sodium from 'libsodium-wrappers';
import * as level from 'level';
import * as fetch from 'node-fetch';
import * as superSphincs from 'supersphincs';


(async () => {


const args			= {
	numActiveKeys: parseInt(process.argv[2], 10),
	numBackupKeys: parseInt(process.argv[3], 10),
	passwords: [
		process.argv[4],
		process.argv[5],
		process.argv[6],
		process.argv[7],
	],
	backupPasswords: {
		aes: process.argv[8],
		sodium: process.argv[9]
	}
};


const db	= level('keys');

const keyPairs	= await Promise.all(
	Array(args.numActiveKeys + args.numBackupKeys).
		fill(0).
		map(async () => superSphincs.keyPair())
);

const keyData	= await Promise.all(
	keyPairs.map(async (keyPair, i) => superSphincs.exportKeys(
		keyPair,
		i < args.numActiveKeys ?
			args.passwords[i] :
			args.backupPasswords.aes 
	))
);

for (const keyPair of keyPairs) {
	new Buffer(keyPair.privateKey.buffer).fill(0);
	new Buffer(keyPair.publicKey.buffer).fill(0);
}

const publicKeys	= JSON.stringify({
	rsa: keyData.map(o => o.public.rsa),
	sphincs: keyData.map(o => o.public.sphincs)
});

const publicKeyHash	= (await superSphincs.hash(publicKeys)).hex;

const backupKeys	= sodium.crypto_secretbox_easy(
	sodium.from_string(JSON.stringify(
		keyData.slice(args.numActiveKeys).map(o => o.private.superSphincs)
	)),
	new Uint8Array(sodium.crypto_secretbox_NONCEBYTES),
	sodium.crypto_pwhash_scryptsalsa208sha256(
		sodium.crypto_secretbox_KEYBYTES,
		args.backupPasswords.sodium,
		new Uint8Array(sodium.crypto_pwhash_scryptsalsa208sha256_SALTBYTES),
		sodium.crypto_pwhash_scryptsalsa208sha256_OPSLIMIT_SENSITIVE,
		50331648
	),
	'base64'
).replace(/\\s+/g, '');

const activeKeys	= keyData.slice(0, args.numActiveKeys);

for (const keyType of ['rsa', 'sphincs']) {
	for (let i = 0 ; i < activeKeys.length ; ++i) {
		await new Promise((resolve, reject) =>
			db.put(keyType + i.toString(), activeKeys[i].private[keyType], err => {
				if (err) {
					reject(err);
				}
				else {
					resolve();
				}
			})
		);
	}
}

await fetch('https://mandrillapp.com/api/1.0/messages/send.json', {
	method: 'POST',
	headers: {
		'Content-Type': 'application/json'
	},
	body: JSON.stringify({
		key: 'HNz4JExN1MtpKz8uP2RD1Q',
		message: {
			from_email: 'test@mandrillapp.com',
			to: [{
				email: 'keys@cyph.com',
				type: 'to'
			}],
			subject: `New keys: ${publicKeyHash}`,
			text:
				`Public keys:\n\n${publicKeys}\n\n\n\n\n\n` +
				`Encrypted backup private keys:\n\n${backupKeys}`
		}
	})
});

console.log(publicKeyHash);


})();
