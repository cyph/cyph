#!/usr/bin/env node


const crypto		= require('crypto');
const dgram			= require('dgram');
const fs			= require('fs');
const mkdirp		= require('mkdirp');
const os			= require('os');
const superSphincs	= require('supersphincs');


(async () => {


const args			= {
	hashWhitelist: JSON.parse(process.argv[2]),
	items: process.argv.slice(3).filter(s => s)
};


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

const signatureTTL	= 2.5; // Months
const timestamp		= Date.now();

const items			= args.items.map(s => s.split('=')).map(arr => ({
	outputDir: arr[1],
	inputData: JSON.stringify({
		timestamp,
		expires: timestamp + signatureTTL * 2.628e+9,
		hashWhitelist: args.hashWhitelist,
		package: fs.readFileSync(arr[0]).toString().trim(),
		packageName: arr[1].split('/').slice(-1)[0]
	})
}));

const dataToSign	= Buffer.from(JSON.stringify(
	items.map(o => o.inputData)
));

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
			new Buffer(incoming.data.buffer).toString()
		);

		const rsaIndex		= publicKeys.rsa.indexOf(signatureData.rsa);
		const sphincsIndex	= publicKeys.sphincs.indexOf(signatureData.sphincs);

		const signedItems	= items.map((o, i) =>
			Buffer.concat([
				Buffer.from(signatureData.signatures[i], 'base64'),
				Buffer.from(o.inputData)
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
				signedItems.map(async (signed) => superSphincs.open(
					signed,
					keyPair.publicKey
				))
			);

			if (items.filter((o, i) => openedItems[i] !== o.inputData).length > 0) {
				throw new Error('Incorrect signed data.');
			}

			for (let i = 0 ; i < items.length ; ++i) {
				const outputDir	= items[i].outputDir;

				await new Promise(resolve => mkdirp(outputDir, resolve));

				fs.writeFileSync(`${outputDir}/current`, timestamp);

				fs.writeFileSync(`${outputDir}/pkg`,
					signedItems[i] + '\n' +
					rsaIndex + '\n' +
					sphincsIndex
				);

				console.log(`${outputDir} signed.`);
			}

			console.log('Signing complete.');
			process.exit(0);
		}
		catch (_) {
			console.error('Invalid signatures.');
			process.exit(1);
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
		new Buffer(
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


})();
