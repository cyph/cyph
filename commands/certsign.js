#!/usr/bin/env node


const crypto						= require('crypto');
const fs							= require('fs');
const potassium						= require('../modules/potassium');
const {agsePublicSigningKeys, sign}	= require('./sign');

const {
	AGSEPKICert,
	AGSEPKICSR,
	AGSEPKIIssuanceHistory,
	deserialize,
	serialize
}	= require('../modules/proto');


(async () => {


const args				= {
	/** List of new CSRs to be processed. */
	csrPath: process.argv[2],
	/** Signed issuance history. */
	issuanceHistoryPath: process.argv[3],
	/** Last issuance timestamp. */
	lastIssuanceTimestampPath: process.argv[4],
	/** Output. */
	outputPath: process.argv[5]
};


const getHash			= async bytes => potassium.toHex(await potassium.hash.hash(bytes));


const issuanceHistory	= await (async () => {
	const bytes				= fs.readFileSync(args.issuanceHistoryPath);
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

	if (parseFloat(fs.readFileSync(args.lastIssuanceTimestampPath).toString()) > o.timestamp) {
		throw new Error('Invalid AGSE-PKI history: bad timestamp.');
	}

	return o;
})();

const csrs				= (await Promise.all(JSON.parse(
	fs.readFileSync(args.csrPath).toString()
).map(async s => {
	try {
		const bytes			= potassium.fromBase64(s);
		const csr			= await deserialize(
			AGSEPKICSR,
			new Uint8Array(bytes.buffer, bytes.byteOffset + await potassium.sign.bytes)
		);

		if (
			!csr.publicSigningKey ||
			csr.publicSigningKey.length < 1 ||
			!csr.username ||
			csr.username !== csr.username.toLowerCase().replace(/[^0-9a-z_]/g, '')
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
		process.exit(0);
	}

	issuanceHistory.timestamp	= Date.now();

	const {rsaIndex, signedInputs, sphincsIndex}	= await sign(
		[{
			additionalData: 'AGSEPKIIssuanceHistory',
			message: await serialize(AGSEPKIIssuanceHistory, issuanceHistory)
		}].concat(
			csrs.map(csr => ({
				additionalData: csr.username,
				message: await serialize(AGSEPKICert, {
					agsePKICSR: csr,
					timestamp: issuanceHistory.timestamp
				})
			}))
		)
	);

	fs.writeFileSync(args.lastIssuanceTimestampPath, issuanceHistory.timestamp.toString());

	fs.writeFileSync(args.issuanceHistoryPath, potassium.concatMemory(
		false,
		new Uint32Array([rsaIndex]),
		new Uint32Array([sphincsIndex]),
		signedInputs[0]
	));

	fs.writeFileSync(args.outputPath, JSON.stringify({
		certs: signedInputs.slice(1).reduce(
			(o, cert, i) => {
				const csr			= csrs[i];

				const fullCert		= potassium.concatMemory(
					false,
					new Uint32Array([rsaIndex]),
					new Uint32Array([sphincsIndex]),
					cert
				);

				o[csr.username]	= potassium.toBase64(fullCert);

				potassium.clearMemory(cert);
				potassium.clearMemory(fullCert);

				return o;
			},
			{}
		),
		csrs: await Promise.all(csrs.map(async csr =>
			potassium.toBase64(await serialize(AGSEPKICSR, csr))
		))
	}));

	console.log('Certificate signing complete.');
	process.exit(0);
}
catch (err) {
	console.error(err);
	console.log('Certificate signing failed.');
	process.exit(1);
}


})();
