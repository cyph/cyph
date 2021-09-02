#!/usr/bin/env node

(async () => {
	const fs = require('fs');
	const level = require('level');
	const sodium = require('libsodium-wrappers-sumo');
	const fetch = await import('node-fetch');
	const os = require('os');
	const superSphincs = require('supersphincs');

	const args = {
		numActiveKeys: parseInt(process.argv[2], 10),
		numBackupKeys: parseInt(process.argv[3], 10),
		keyBackupPath: process.argv[4],
		passwords: [
			process.argv[5],
			process.argv[6],
			process.argv[7],
			process.argv[8]
		],
		backupPasswords: {
			aes: process.argv[9],
			sodium: process.argv[10]
		}
	};

	await sodium.ready;

	const db = level('keys');

	const keyPairs = await Promise.all(
		!args.keyBackupPath ?
			Array(args.numActiveKeys + args.numBackupKeys)
				.fill(0)
				.map(async () => superSphincs.keyPair()) :
			JSON.parse(
				sodium.crypto_secretbox_open_easy(
					sodium.from_base64(
						fs.readFileSync(args.keyBackupPath).toString().trim()
					),
					new Uint8Array(sodium.crypto_secretbox_NONCEBYTES),
					sodium.crypto_pwhash_scryptsalsa208sha256(
						sodium.crypto_secretbox_KEYBYTES,
						args.backupPasswords.sodium,
						new Uint8Array(
							sodium.crypto_pwhash_scryptsalsa208sha256_SALTBYTES
						),
						sodium.crypto_pwhash_scryptsalsa208sha256_OPSLIMIT_SENSITIVE,
						50331648
					),
					'text'
				)
			).map(async superSphincsKeyString => superSphincs.importKeys(
					{
						private: {
							superSphincs: superSphincsKeyString
						}
					},
					args.backupPasswords.aes
				))
	);

	const keyData = await Promise.all(
		keyPairs
			.slice(0, args.numActiveKeys)
			.map(async (keyPair, i) =>
				superSphincs.exportKeys(keyPair, args.passwords[i])
			)
	);

	const backupKeyData = await Promise.all(
		keyPairs.map(async keyPair =>
			superSphincs.exportKeys(keyPair, args.backupPasswords.aes)
		)
	);

	for (const keyPair of keyPairs) {
		Buffer.from(keyPair.privateKey.buffer).fill(0);
		Buffer.from(keyPair.publicKey.buffer).fill(0);
	}

	const publicKeys = JSON.stringify({
		rsa: backupKeyData.map(o => o.public.rsa),
		sphincs: backupKeyData.map(o => o.public.sphincs)
	});

	const publicKeyHash = (await superSphincs.hash(publicKeys)).hex;

	for (const keyType of ['rsa', 'sphincs']) {
		for (let i = 0; i < args.numActiveKeys; ++i) {
			await new Promise((resolve, reject) =>
				db.put(
					keyType + i.toString(),
					keyData[i].private[keyType],
					err => {
						if (err) {
							reject(err);
						}
						else {
							resolve();
						}
					}
				)
			);
		}
	}

	if (args.keyBackupPath) {
		return;
	}

	const backupKeys = sodium
		.crypto_secretbox_easy(
			sodium.from_string(
				JSON.stringify(backupKeyData.map(o => o.private.superSphincs))
			),
			new Uint8Array(sodium.crypto_secretbox_NONCEBYTES),
			sodium.crypto_pwhash_scryptsalsa208sha256(
				sodium.crypto_secretbox_KEYBYTES,
				args.backupPasswords.sodium,
				new Uint8Array(
					sodium.crypto_pwhash_scryptsalsa208sha256_SALTBYTES
				),
				sodium.crypto_pwhash_scryptsalsa208sha256_OPSLIMIT_SENSITIVE,
				50331648
			),
			'base64'
		)
		.replace(/\\s+/g, '');

	await fetch('https://mandrillapp.com/api/1.0/messages/send.json', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			key: 'HNz4JExN1MtpKz8uP2RD1Q',
			message: {
				from_email: 'test@mandrillapp.com',
				to: [
					{
						email: 'keys@cyph.com',
						type: 'to'
					}
				],
				subject: `New keys: ${publicKeyHash}`,
				text:
					`Public keys:\n\n${publicKeys}\n\n\n\n\n\n` +
					`Encrypted backup private keys:\n\n${backupKeys}`
			}
		})
	});

	console.log(publicKeyHash);

	fs.writeFileSync(`${os.homedir()}/agse/.generatekeys-success`, '');
})();
