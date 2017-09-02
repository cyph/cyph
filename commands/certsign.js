#!/usr/bin/env node


const crypto	= require('crypto');
const fs		= require('fs');
const potassium	= require('../modules/potassium');
const sign		= require('./sign');

const {
	AGSEPKICert,
	AGSEPKICSR,
	deserialize,
	serialize
}	= require('../modules/proto');


(async () => {


const args			= {
	/** List of new CSRs to be processed. */
	csrPath: process.argv[2],
	/** List of previous CSRs for issued certificates. */
	issuedCertPath: process.argv[3],
	/** Output. */
	outputPath: process.argv[4]
};


const getHash		= async bytes => potassium.toHex(await potassium.hash.hash(bytes));


const issuedCerts	= (await Promise.all(
	JSON.parse(fs.readFileSync(args.issuedCertPath)).map(async s =>
		deserialize(AGSEPKICSR, potassium.fromBase64(s))
	)
)).reduce(
	(o, csr) => {
		o.publicSigningKeys.set(await getHash(csr.publicSigningKey), true);
		o.usernames.set(csr.username, true);
		return o;
	},
	{
		publicSigningKeys: new Map(),
		usernames: new Map()
	}
);

const csrs			= (await Promise.all(JSON.parse(fs.readFileSync(args.csrPath)).map(async s => {
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
			issuedCerts.publicSigningKeys.get(publicSigningKeyHash) ||
			issuedCerts.usernames.get(csr.username)
		) {
			return;
		}

		/* Validate CSR signature. */
		await potassium.sign.open(
			bytes,
			csr.publicSigningKey,
			`users/${csr.username}/certificateRequest`
		);

		issuedCerts.publicSigningKeys.set(publicSigningKeyHash, true);
		issuedCerts.usernames.set(csr.username, true);

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

	const timestamp	= Date.now();

	const {rsaIndex, signedInputs, sphincsIndex}	= await sign(
		csrs.map(csr => ({
			additionalData: csr.username,
			message: {agsePKICSR: csr, timestamp}
		}))
	);

	fs.writeFileSync(args.outputPath, JSON.stringify({
		certs: signedInputs.reduce(
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
