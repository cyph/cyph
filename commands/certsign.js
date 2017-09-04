#!/usr/bin/env node


const gcloudStorage					= require('@google-cloud/storage');
const crypto						= require('crypto');
const firebase						= require('firebase-admin');
const fs							= require('fs');
const os							= require('os');
const potassium						= require('../modules/potassium');
const {agsePublicSigningKeys, sign}	= require('./sign');

const {
	AGSEPKICert,
	AGSEPKICSR,
	AGSEPKIIssuanceHistory,
	deserialize,
	serialize
}	= require('../modules/proto');


const certSign	= async (testSign, standalone) => {


const configDir					= `${os.homedir()}/.cyph`;
const lastIssuanceTimestampPath	= `${configDir}/certsign.timestamp.${testSign ? 'test' : 'prod'}`;
const keyFilename				= `${configDir}/firebase.${testSign ? 'test' : 'prod'}`;
const projectId					= testSign ? 'cyph-test' : 'cyphme';


const getHash	= async bytes => potassium.toBase64(await potassium.hash.hash(bytes));


try {
	firebase.initializeApp({
		credential: firebase.credential.cert(JSON.parse(fs.readFileSync(keyFilename).toString())),
		databaseURL: `https://${projectId}.firebaseio.com`
	});
}
catch (_) {}

const database	= firebase.database();
const storage	= gcloudStorage({keyFilename, projectId}).bucket(`${projectId}.appspot.com`);


const usernames	= (await firebase.database().ref('certificateRequests').once('value')).val();

if (!usernames || Object.keys(usernames).length < 1) {
	console.log('No certificate requests.');
	process.exit(0);
}

const issuanceHistory	= await (async () => {
	const bytes				= (await storage.file('certificateHistory').download())[0];
	const dataView			= potassium.toDataView(bytes);
	const rsaKeyIndex		= dataView.getUint32(0, true);
	const sphincsKeyIndex	= dataView.getUint32(4, true);
	const signed			= potassium.toBytes(bytes, 8);

	if (
		rsaKeyIndex >= agsePublicSigningKeys.rsa.length ||
		sphincsKeyIndex >= agsePublicSigningKeys.sphincs.length
	) {
		throw new Error('Invalid AGSE-PKI history: bad key index.');
	}

	const o	= await util.deserialize(
		AGSEPKIIssuanceHistory,
		await this.potassiumService.sign.open(
			signed,
			await potassium.sign.importSuperSphincsPublicKeys(
				agsePublicSigningKeys.rsa[rsaKeyIndex],
				agsePublicSigningKeys.sphincs[sphincsKeyIndex]
			),
			'AGSEPKIIssuanceHistory'
		)
	);

	if (parseFloat(fs.readFileSync(lastIssuanceTimestampPath).toString()) > o.timestamp) {
		throw new Error('Invalid AGSE-PKI history: bad timestamp.');
	}

	return o;
})().catch(() => ({
	publicSigningKeyHashes: {},
	timestamp: 0,
	usernames: {}
}));

const csrs	= (await Promise.all(Object.keys(usernames).map(async k => {
	try {
		const username	= usernames[k];

		if (!username || username !== username.toLowerCase().replace(/[^0-9a-z_]/g, '')) {
			return;
		}

		const bytes			=
			(await storage.file(`users/${username}/certificateRequest`).download())[0]
		;

		const csr			= await deserialize(
			AGSEPKICSR,
			new Uint8Array(bytes.buffer, bytes.byteOffset + await potassium.sign.bytes)
		);

		if (
			!csr.publicSigningKey ||
			csr.publicSigningKey.length < 1 ||
			!csr.username ||
			csr.username !== username
		) {
			return;
		}

		const publicSigningKeyHash		= await getHash(csr.publicSigningKey);

		/* Validate that CSR data doesn't already belong to an existing user. */
		if (
			issuanceHistory.publicSigningKeyHashes[publicSigningKeyHash] ||
			issuanceHistory.usernames[csr.username]
		) {
			return;
		}

		/* Validate CSR signature. */
		await potassium.sign.open(
			bytes,
			csr.publicSigningKey,
			`users/${csr.username}/certificateRequest`
		);

		issuanceHistory.publicSigningKeyHashes[publicSigningKeyHash]	= true;
		issuanceHistory.usernames[csr.username]	= true;

		return csr;
	}
	catch (_) {}
}))).filter(
	csr => csr
);


try {
	if (csrs.length < 1) {
		console.log('No certificates to sign.');
		if (standalone) {
			process.exit(0);
		}
		else {
			return;
		}
	}

	issuanceHistory.timestamp	= Date.now();

	const {rsaIndex, signedInputs, sphincsIndex}	= await sign(
		[{
			additionalData: 'AGSEPKIIssuanceHistory',
			message: await serialize(AGSEPKIIssuanceHistory, issuanceHistory)
		}].concat(
			await Promise.all(csrs.map(async csr => ({
				additionalData: csr.username,
				message: await serialize(AGSEPKICert, {
					agsePKICSR: csr,
					timestamp: issuanceHistory.timestamp
				})
			})))
		),
		testSign
	);

	fs.writeFileSync(lastIssuanceTimestampPath, issuanceHistory.timestamp.toString());

	await storage.file('certificateHistory').save(potassium.concatMemory(
		false,
		new Uint32Array([rsaIndex]),
		new Uint32Array([sphincsIndex]),
		signedInputs[0]
	));

	await Promise.all(signedInputs.slice(1).map(async (cert, i) => {
		const csr		= csrs[i];

		const fullCert	= potassium.concatMemory(
			false,
			new Uint32Array([rsaIndex]),
			new Uint32Array([sphincsIndex]),
			cert
		);

		const url		= `users/${csr.username}/certificate`;

		await Promise.all([
			storage.file(url).save(fullCert),
			database.ref(url).set({
				hash: await getHash(fullCert),
				timestamp: firebase.database.ServerValue.TIMESTAMP
			})
		]);

		potassium.clearMemory(cert);
		potassium.clearMemory(fullCert);
	}));

	await Promise.all(Object.keys(usernames).map(async k => {
		const url	= `users/${usernames[k]}/certificateRequest`;

		await Promise.all([
			storage.file(url).delete(),
			database.ref(url).remove()
		]);

		await database.ref(`certificateRequests/${k}`).remove();
	}));

	console.log('Certificate signing complete.');
	if (standalone) {
		process.exit(0);
	}
}
catch (err) {
	console.error(err);
	console.log('Certificate signing failed.');
	if (standalone) {
		process.exit(1);
	}
	else {
		throw err;
	}
}


};


if (require.main === module) {
	certSign(process.argv[2] === '--test', true);
}
else {
	module.exports	= certSign;
}
