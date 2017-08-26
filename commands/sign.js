#!/usr/bin/env node


const crypto		= require('crypto');
const dgram			= require('dgram');
const fs			= require('fs');
const os			= require('os');
const sodium		= require('libsodium-wrappers');
const superSphincs	= require('supersphincs');


const sign	= async (items) => {


const remoteAddress	= '10.0.0.42';
const port			= 31337;
const chunkSize		= 576;

const interfaces	= os.networkInterfaces();
const macAddress	= Buffer.from(
	fs.readFileSync(
		`${process.env.HOME}/.cyph/agse.local.mac`
	).toString().trim()
);

const publicKeysJS	= fs.readFileSync(
	`${__dirname}/../../websign/js/keys.js`
).toString();
const publicKeys	= JSON.parse(
	publicKeysJS.
		substring(publicKeysJS.indexOf('=') + 1).
		split(';')[0].
		trim().
		replace(/\/\*.*?\*\//g, '')
);

const dataToSign	= Buffer.from(JSON.stringify(items));

const id			= new Uint32Array(crypto.randomBytes(4).buffer)[0];
const client		= dgram.createSocket('udp4');
const server		= dgram.createSocket('udp4');


let incoming;
server.on('message', async (message) => {
	const metadata		= new Uint32Array(message.buffer, 0, 3);

	if (metadata[0] !== id) {
		return;
	}

	const numBytes		= metadata[1];
	const chunkIndex	= metadata[2];

	const numChunks		= Math.ceil(numBytes / chunkSize);

	if (!incoming) {
		console.log('Receiving signature data.');

		incoming	= {
			chunksReceived: {},
			data: new Uint8Array(numBytes)
		};
	}

	if (!incoming.chunksReceived[chunkIndex]) {
		incoming.data.set(
			new Uint8Array(message.buffer, 12),
			chunkIndex
		);

		incoming.chunksReceived[chunkIndex]	= true;
	}

	if (Object.keys(incoming.chunksReceived).length === numChunks) {
		server.close();

		const signatureData	= JSON.parse(
			Buffer.from(incoming.data.buffer).toString()
		);

		const rsaIndex		= publicKeys.rsa.indexOf(signatureData.rsa);
		const sphincsIndex	= publicKeys.sphincs.indexOf(signatureData.sphincs);

		const signedItems	= items.map((item, i) =>
			Buffer.concat([
				Buffer.from(signatureData.signatures[i], 'base64'),
				Buffer.from(item)
			]).toString('base64').replace(/\s+/g, '')
		);

		try {
			const keyPair		= await superSphincs.importKeys({
				public: {
					rsa: publicKeys.rsa[rsaIndex],
					sphincs: publicKeys.sphincs[sphincsIndex]
				}
			});

			const openedItems	= await Promise.all(
				signedItems.map(async (signed) => superSphincs.openString(
					signed,
					keyPair.publicKey
				))
			);

			if (items.filter((item, i) => openedItems[i] !== item).length > 0) {
				throw new Error('Incorrect signed data.');
			}

			console.log('Signing complete.');
			return {rsaIndex, signedItems, sphincsIndex};
		}
		catch (err) {
			console.error('Invalid signatures.');
			throw err;
		}
		finally {
			server.close();
		}
	}
});

server.bind(port);


const sendData	= i => {
	if (incoming) {
		return;
	}
	else if (i >= dataToSign.length) {
		i	= 0;
	}

	const data	= Buffer.concat([
		Buffer.from(
			new Uint32Array([
				id,
				dataToSign.length,
				chunkSize,
				i
			]).buffer
		),
		macAddress,
		dataToSign.slice(
			i,
			Math.min(i + chunkSize, dataToSign.length)
		)
	]);

	client.send(
		data,
		0,
		data.length,
		port,
		remoteAddress
	);

	setTimeout(() => sendData(i + chunkSize), 10);
};

sendData(0);


};


if (require.main === module) {
	console.log(sign(JSON.parse(process.argv[2])));
}
else {
	module.exports	= sign;
}
