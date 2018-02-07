#!/usr/bin/env node


const firebase							= require('firebase-admin');
const fs								= require('fs');
const os								= require('os');
const databaseService					= require('../modules/database-service');
const potassium							= require('../modules/potassium');
const {deserialize, serialize, sleep}	= require('../modules/util');
const {agsePublicSigningKeys, sign}		= require('./sign');

const {
	AGSEPKICert,
	AGSEPKICSR,
	AGSEPKIIssuanceHistory,
	BinaryProto,
	StringProto
}	= require('../modules/proto');


const certSign	= async (projectId, standalone, namespace) => {
try {


if (typeof projectId !== 'string' || !projectId) {
	projectId	= 'cyphme';
}
if (projectId.indexOf('cyph') !== 0) {
	throw new Error('Invalid Firebase project ID.');
}
if (typeof namespace !== 'string' || !namespace) {
	namespace	= 'cyph.ws';
}


const testSign					= projectId !== 'cyphme';
const configDir					= `${os.homedir()}/.cyph`;
const lastIssuanceTimestampPath	= `${configDir}/certsign-timestamps/${projectId}.${namespace}`;
const keyFilename				= `${configDir}/firebase-credentials/${projectId}.json`;

/* Will remain hardcoded as true for the duration of the private beta */
const requireInvite				= true;


const getHash	= async bytes => potassium.toBase64(await potassium.hash.hash(bytes));


const {
	auth,
	database,
	getItem,
	hasItem,
	removeItem,
	setItem,
	storage
}	= databaseService({
	firebase: {
		credential: firebase.credential.cert(JSON.parse(fs.readFileSync(keyFilename).toString())),
		databaseURL: `https://${projectId}.firebaseio.com`
	},
	project: {id: projectId},
	storage: {keyFilename, projectId}
});


const pendingSignupsURL	= `${namespace.replace(/\./g, '_')}/pendingSignups`;
const pendingSignups	= (await database.ref(pendingSignupsURL).once('value')).val() || {};
const usernames			= [];

for (const username of Object.keys(pendingSignups)) {
	const pendingSignup	= pendingSignups[username];

	/* If user has submitted a CSR and has a valid invite (if required), continue */
	if (
		(await hasItem(namespace, `users/${username}/certificateRequest`)) &&
		(
			!requireInvite ||
			(
				await getItem(
					namespace
					`users/${username}/inviterUsernamePlaintext`,
					StringProto
				).catch(() => undefined)
			)
		)
	) {
		usernames.push(username);
	}
	/* Otherwise, if signup has been pending for at least 3 hours, delete the user */
	else if ((Date.now() - pendingSignup.timestamp) > 10800) {
		await Promise.all([
			auth.deleteUser(pendingSignup.uid),
			database.ref(`${pendingSignupsURL}/${username}`).remove(),
			removeItem(namespace, `users/${username}`)
		]);

		/* Avoid {"code":400,"message":"QUOTA_EXCEEDED : Exceeded quota for deleting accounts."} */
		await sleep(1000);
	}
}

if (usernames.length < 1) {
	console.log('No certificate requests.');
	process.exit(0);
}

const issuanceHistory	= await (async () => {
	const bytes				= await getItem(namespace, 'certificateHistory', BinaryProto);
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

	const o	= await deserialize(
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

const csrs	= (await Promise.all(usernames.map(async username => {
	try {
		if (
			!username ||
			username !== username.toLowerCase().replace(/[^0-9a-z_]/g, '').slice(0, 50)
		) {
			return;
		}

		const bytes			= await getItem(
			namespace,
			`users/${username}/certificateRequest`,
			BinaryProto
		);

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

await setItem(namespace, 'certificateHistory', BinaryProto, potassium.concatMemory(
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

	await setItem(namespace, url, BinaryProto, fullCert);

	potassium.clearMemory(cert);
	potassium.clearMemory(fullCert);
}));

await Promise.all(usernames.map(async username => {
	const url	= `users/${username}/certificateRequest`;

	await removeItem(namespace, url);
	await database.ref(`${pendingSignupsURL}/${username}`).remove();
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
	certSign(process.argv[2], true, process.argv[3]);
}
else {
	module.exports	= {certSign};
}
