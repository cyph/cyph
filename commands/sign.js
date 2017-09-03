#!/usr/bin/env node


const crypto			= require('crypto');
const dgram				= require('dgram');
const fs				= require('fs');
const os				= require('os');
const sodium			= require('libsodium-wrappers');
const superSphincs		= require('supersphincs');
const superSphincsHash	= require('supersphincs/nacl-sha512');


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
	`${__dirname}/../websign/js/keys.js`
).toString();
const publicKeys	= JSON.parse(
	publicKeysJS.
		substring(publicKeysJS.indexOf('=') + 1).
		split(';')[0].
		trim().
		replace(/\/\*.*?\*\//g, '')
);


const sign	= async (inputs) => new Promise(async (resolve, reject) => {


const inputMessages	= inputs.map(({message}) =>
	message instanceof Uint8Array ?
		message :
		Buffer.from(message)
);

const dataToSign	= Buffer.from(JSON.stringify(inputs, (k, v) =>
	v instanceof Uint8Array ?
		k === 'additionalData' ?
			{data: sodium.to_base64(v).replace(/\s+/g, ''), isUint8Array: true} :
			{data: Buffer.from(superSphincsHash(v)).toString('hex'), isBinaryHash: true}
		:
		v
));

const id			= new Uint32Array(crypto.randomBytes(4).buffer)[0];
const client		= dgram.createSocket('udp4');
const server		= dgram.createSocket('udp4');


let closed, incoming;
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

		const signedInputs	= inputMessages.map((message, i) =>
			Buffer.concat([
				Buffer.from(signatureData.signatures[i], 'base64'),
				message
			]).toString('base64').replace(/\s+/g, '')
		);

		try {
			const keyPair		= await superSphincs.importKeys({
				public: {
					rsa: publicKeys.rsa[rsaIndex],
					sphincs: publicKeys.sphincs[sphincsIndex]
				}
			});

			const openedInputs	= await Promise.all(
				signedInputs.map(async (signed) => superSphincs.open(
					signed,
					keyPair.publicKey
				))
			);

			if (inputMessages.filter((message, i) =>
				openedInputs[i].length !== message.length ||
				!sodium.memcmp(openedInputs[i], message)
			).length > 0) {
				throw new Error('Incorrect signed data.');
			}

			console.log('Signing complete.');
			resolve({rsaIndex, signedInputs, sphincsIndex});
		}
		catch (err) {
			console.error('Invalid signatures.');
			reject(err);
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


});


if (require.main === module) {
	console.log(sign(JSON.parse(process.argv[2])));
}
else {
	module.exports	= {agsePublicSigningKeys: publicKeys, sign};
}
