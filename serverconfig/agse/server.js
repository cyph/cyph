#!/usr/bin/env node

const childProcess = require('child_process');
const dgram = require('dgram');
const level = require('level');
const read = require('read');
const stream = require('stream');
const superSphincs = require('supersphincs');
const validator = require('validator');

(async () => {
	const args = {
		numActiveKeys: parseInt(process.argv[2], 10),
		localAddress: process.argv[3],
		remoteAddress: process.argv[4],
		port: parseInt(process.argv[5], 10)
	};

	const db = level('keys');

	const askQuestion = async (prompt, silent) =>
		new Promise((resolve, reject) =>
			read(
				{
					prompt: `${prompt} `,
					silent: silent === true
				},
				(err, answer) => {
					if (err) {
						reject(err);
					}
					else {
						resolve(answer);
					}
				}
			)
		);
	const reviewText = async text => {
		const s = new stream.Readable();
		s.push(text);
		s.push(null);

		await new Promise((resolve, reject) =>
			s.pipe(
				childProcess
					.spawn('less', [], {
						stdio: ['pipe', process.stdout, process.stderr]
					})
					.on('exit', () => {
						resolve();
					})
					.stdin.on('error', () => {
						reject();
					})
			)
		);

		const answer = await askQuestion(
			'Sign these inputs? (If so, reverse the network direction now.) [y/N]'
		);

		return answer.trim().toLowerCase() === 'y';
	};

	const validateData = (o, binaryHashSupport) =>
		typeof o === 'string' ||
		(o &&
			(o.isUint8Array || (binaryHashSupport && o.isBinaryHash)) &&
			typeof o.data === 'string' &&
			validator.isBase64(o.data));
	let keyData;
	while (!keyData) {
		try {
			const rsaPassword = await askQuestion('RSA Password:', true);
			const sphincsPassword = await askQuestion(
				'SPHINCS Password:',
				true
			);

			if (rsaPassword === sphincsPassword) {
				throw new Error('fak u gooby');
			}

			const allKeys = await Promise.all(
				Array(args.numActiveKeys)
					.fill(0)
					.map(async (_, i) =>
						Promise.all(
							['rsa', 'sphincs'].map(
								async keyType =>
									new Promise((resolve, reject) =>
										db.get(
											keyType + i.toString(),
											(err, val) => {
												if (err) {
													console.log(err);
													reject(err);
												}
												else {
													resolve(val);
												}
											}
										)
									)
							)
						)
					)
			);

			let rsaKeyData;
			let sphincsKeyData;
			for (let i = 0; i < allKeys.length; ++i) {
				const keys = {
					private: {
						rsa: allKeys[i][0],
						sphincs: allKeys[i][1]
					}
				};

				try {
					if (!rsaKeyData) {
						rsaKeyData = {
							privateKey: keys.private.rsa,
							publicKeyString: (
								await superSphincs.exportKeys({
									publicKey: (
										await superSphincs.importKeys(
											keys,
											rsaPassword
										)
									).publicKey
								})
							).public.rsa
						};
					}
				}
				catch (_) {}

				try {
					if (!sphincsKeyData) {
						sphincsKeyData = {
							privateKey: keys.private.sphincs,
							publicKeyString: (
								await superSphincs.exportKeys({
									publicKey: (
										await superSphincs.importKeys(
											keys,
											sphincsPassword
										)
									).publicKey
								})
							).public.sphincs
						};
					}
				}
				catch (_) {}
			}

			if (!rsaKeyData || !sphincsKeyData) {
				throw new Error('Invalid password; please try again.');
			}

			keyData = {
				rsaKeyString: rsaKeyData.publicKeyString,
				sphincsKeyString: sphincsKeyData.publicKeyString,
				keyPair: await superSphincs.importKeys(
					{
						private: {
							rsa: rsaKeyData.privateKey,
							sphincs: sphincsKeyData.privateKey
						}
					},
					{
						rsa: rsaPassword,
						sphincs: sphincsPassword
					}
				)
			};
		}
		catch (err) {
			console.log(err);
		}
	}

	const server = dgram.createSocket('udp4');
	const incomingMessages = {};

	server.on('message', async message => {
		const metadata = new Uint32Array(message.buffer, 0, 4);
		const id = metadata[0];
		const numBytes = metadata[1];
		const chunkSize = metadata[2];
		const chunkIndex = metadata[3];

		const numChunks = Math.ceil(numBytes / chunkSize);

		const macAddress = message.slice(16, 33).toString();

		if (!incomingMessages[id]) {
			incomingMessages[id] = {
				active: true,
				chunksReceived: {},
				data: new Uint8Array(numBytes)
			};
		}

		const o = incomingMessages[id];

		if (!o.active) {
			return;
		}

		if (!o.chunksReceived[chunkIndex]) {
			o.data.set(new Uint8Array(message.buffer, 33), chunkIndex);

			o.chunksReceived[chunkIndex] = true;
		}

		if (Object.keys(o.chunksReceived).length !== numChunks) {
			return;
		}

		const buf = Buffer.from(o.data.buffer);

		const inputs = (() => {
			try {
				const parsed = JSON.parse(buf.toString());

				if (
					parsed instanceof Array &&
					parsed.filter(
						input =>
							input &&
							Object.keys(input) === 2 &&
							validateData(input.message, true) &&
							(validateData(input.additionalData) ||
								(input.additionalData &&
									input.additionalData.none))
					).length === 0
				) {
					return parsed;
				}
			}
			catch (_) {}

			return [];
		})();

		o.active = false;
		o.chunksReceived = null;
		o.data = null;

		buf.fill(0);

		const shouldSign = await reviewText(
			JSON.stringify(inputs, null, '\n\n\t')
		);

		if (!shouldSign) {
			console.log('Input discarded.');
			return;
		}

		const signatures = await Promise.all(
			inputs.map(async ({additionalData, message}) =>
				superSphincs.signDetachedBase64(
					message.isBinaryHash || message.isUint8Array ?
						Buffer.from(message.data, 'base64') :
						message,
					keyData.keyPair.privateKey,
					additionalData.none ?
						undefined :
					additionalData.isUint8Array ?
						Buffer.from(additionalData.data, 'base64') :
						additionalData,
					message.isBinaryHash
				)
			)
		);

		console.log('Signatures generated.');

		childProcess.spawnSync('sudo', [
			'ip',
			'neigh',
			'add',
			args.remoteAddress,
			'lladdr',
			macAddress,
			'dev',
			'eth0'
		]);
		childProcess.spawnSync('sleep', ['1']);

		const client = dgram.createSocket('udp4');
		const signatureBytes = Buffer.from(
			JSON.stringify({
				signatures,
				rsa: keyData.rsaKeyString,
				sphincs: keyData.sphincsKeyString
			})
		);

		for (let tries = 0; tries < 5; ++tries) {
			for (let i = 0; i < signatureBytes.length; i += chunkSize) {
				const data = Buffer.concat([
					Buffer.from(
						new Uint32Array([id, signatureBytes.length, i]).buffer
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
					args.port,
					args.remoteAddress
				);

				await new Promise(resolve => {
					setTimeout(() => {
						resolve();
					}, 10);
				});
			}
		}
	});

	server.bind(args.port, args.localAddress);
	console.log('Ready for input.');
})();
