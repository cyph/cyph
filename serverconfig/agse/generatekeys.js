#!/usr/bin/env node

(async () => {
	const fastSHA512 = require('fast-sha512');
	const fs = require('fs');
	const {Level} = require('level');
	const sodium = require('libsodium-wrappers-sumo');
	const fetch = (await import('node-fetch')).default;
	const os = require('os');
	const superDilithium = require('superdilithium');
	const oldSuperSphincs = require('supersphincs-legacy/dist/old-api');
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
		},
		newBackupPasswords: {
			aes: process.argv[11],
			sodium: process.argv[12]
		}
	};

	await sodium.ready;

	const db = new Level('keys');

	const signingKeyrings = await Promise.all(
		!args.keyBackupPath ?
			Array(args.numActiveKeys + args.numBackupKeys)
				.fill(0)
				.map(async () => ({
					/* PotassiumData.SignAlgorithms.V1 */ 2: await oldSuperSphincs.keyPair(),
					/* PotassiumData.SignAlgorithms.V2 */ 5: await superDilithium.keyPair(),
					/* PotassiumData.SignAlgorithms.V2Hardened */ 6: await superSphincs.keyPair()
				})) :
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
			)
				.map(o =>
					typeof o === 'string' ?
						{/* PotassiumData.SignAlgorithms.V1 */ 2: o} :
						o
				)
				.map(async o => ({
					/* PotassiumData.SignAlgorithms.V1 */ 2:
						o[2] !== undefined ? await oldSuperSphincs.importKeys(
								{
									private: {
										combined: o[2]
									}
								},
								args.backupPasswords.aes
							) : await oldSuperSphincs.keyPair(),
					/* PotassiumData.SignAlgorithms.V2 */ 5:
						o[5] !== undefined ? await superDilithium.importKeys(
								{
									private: {
										combined: o[5]
									}
								},
								args.backupPasswords.aes
							) : await superDilithium.keyPair(),
					/* PotassiumData.SignAlgorithms.V2Hardened */ 6:
						o[6] !== undefined ? await superSphincs.importKeys(
								{
									private: {
										combined: o[6]
									}
								},
								args.backupPasswords.aes
							) : await superSphincs.keyPair()
				}))
	);

	const exportKeys = async (keyring, password) => ({
		/* PotassiumData.SignAlgorithms.V1 */ 2: await oldSuperSphincs.exportKeys(
			keyring[2],
			password
		),
		/* PotassiumData.SignAlgorithms.V2 */ 5: await superDilithium.exportKeys(
			keyring[5],
			password
		),
		/* PotassiumData.SignAlgorithms.V2Hardened */ 6: await superSphincs.exportKeys(
			keyring[6],
			password
		)
	});

	const keyData = await Promise.all(
		signingKeyrings
			.slice(0, args.numActiveKeys)
			.map(async (keyring, i) => exportKeys(keyring, args.passwords[i]))
	);

	const backupKeyData = await Promise.all(
		signingKeyrings.map(async keyring =>
			exportKeys(keyring, args.newBackupPasswords.aes)
		)
	);

	for (const keyPair of signingKeyrings.flatMap(o => Object.values(o))) {
		Buffer.from(keyPair.privateKey.buffer).fill(0);
		Buffer.from(keyPair.publicKey.buffer).fill(0);
	}

	const publicKeys = JSON.stringify(
		Object.fromEntries(
			Object.keys(signingKeyrings[0]).map(algorithm => [
				algorithm,
				{
					classical: backupKeyData.map(
						o => o[algorithm].public.classical
					),
					postQuantum: backupKeyData.map(
						o => o[algorithm].public.postQuantum
					)
				}
			])
		)
	);

	const publicKeyHash = (await fastSHA512.hash(publicKeys)).hex;

	for (const [i, keys] of keyData.entries()) {
		for (const algorithm of Object.keys(keys)) {
			for (const subkeyType of ['classical', 'postQuantum']) {
				await new Promise((resolve, reject) =>
					db.put(
						`${algorithm}_${subkeyType}_${i.toString()}`,
						keys[algorithm].private[subkeyType],
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
	}

	const backupKeys = sodium
		.crypto_secretbox_easy(
			sodium.from_string(
				JSON.stringify(
					backupKeyData.map(o =>
						Object.fromEntries(
							Object.keys(signingKeyrings[0]).map(algorithm => [
								algorithm,
								o[algorithm].private.combined
							])
						)
					)
				)
			),
			new Uint8Array(sodium.crypto_secretbox_NONCEBYTES),
			sodium.crypto_pwhash_scryptsalsa208sha256(
				sodium.crypto_secretbox_KEYBYTES,
				args.newBackupPasswords.sodium,
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
