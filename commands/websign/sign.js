#!/usr/bin/env node

const crypto		= require('crypto');
const dgram			= require('dgram');
const fs			= require('fs');
const mkdirp		= require('mkdirp');
const os			= require('os');
const superSphincs	= require('supersphincs');

const args			= {
	hashWhitelist: process.argv[2],
	dataToSignPath: process.argv[3],
	outputDir: process.argv[4]
};

const remoteAddress	= '10.0.0.42';
const port			= 31337;
const chunkSize		= 1400;

const interfaces	= os.networkInterfaces();
const macAddress	= new Buffer(
	fs.readFileSync(
		`${process.env['HOME']}/.cyph/agse.local.mac`
	).toString().trim()
);

const publicKeysJS	= fs.readFileSync(
	`${__dirname}/../../shared/websign/js/keys.js`
).toString();
const publicKeys	= JSON.parse(
	publicKeysJS.substring(publicKeysJS.indexOf('=') + 1).split(';')[0].trim()
);

const signatureTTL	= 2.5; // Months
const timestamp		= Date.now();

const dataToSign	= Buffer.concat([
	new Buffer(JSON.stringify({
		timestamp,
		expires: timestamp + signatureTTL * 2.628e+9,
		hashWhitelist: JSON.parse(args.hashWhitelist)
	}) + '\n'),
	new Buffer(
		fs.readFileSync(args.dataToSignPath).toString().trim()
	)
]);

const id			= new Uint32Array(crypto.randomBytes(4).buffer)[0];
const client		= dgram.createSocket('udp4');
const server		= dgram.createSocket('udp4');


let incoming;
server.on('message', message => {
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

		superSphincs.importKeys({
			public: {
				rsa: publicKeys.rsa[rsaIndex],
				sphincs: publicKeys.sphincs[sphincsIndex]
			}
		}).then(keyPair => superSphincs.verifyDetached(
			signatureData.signature,
			dataToSign.toString(),
			keyPair.publicKey
		)).then(isValid => {
			if (isValid) {
				fs.writeFileSync(`${args.outputDir}/sig`,
					signatureData.signature + '\n' +
					rsaIndex + '\n' +
					sphincsIndex + '\n' + 
					timestamp
				);

				console.log(`${args.outputDir} signed.`);
				process.exit(0);
			}
			else {
				console.error('Invalid signature.');
				process.exit(1);
			}
		});
	}
});

server.bind(port);


mkdirp.sync(args.outputDir);
fs.writeFileSync(`${args.outputDir}/pkg`, dataToSign);

let i			= 0;
const interval	= setInterval(() => {
	if (incoming) {
		clearInterval(interval);
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

	i += chunkSize;
}, 1);
