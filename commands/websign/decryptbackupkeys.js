#!/usr/bin/env node

const fs			= require('fs');
const sodium		= require('libsodium-wrappers');
const superSphincs	= require('supersphincs');

const args			= {
	backupPath: process.argv[2],
	outputPath: process.argv[3]
};


new Promise((resolve, reject) => read({
	prompt: 'Backup password: ',
	silent: false
}, (err, answer) => {
	if (err) {
		reject(err);
	}
	else {
		resolve(answer);
	}
})).then(password => {
	const passwordSplit		= password.split(' ');
	const passwordMiddle	= passwordSplit.length / 2;

	if (passwordSplit.length % 2 !== 0) {
		throw 'Password must contain even number of words.'
	}

	const aesPassword		= passwordSplit(0, passwordMiddle);
	const sodiumPassword	= passwordSplit(passwordMiddle);

	return Promise.all(JSON.parse(
		sodium.crypto_secretbox_open_easy(
			sodium.from_base64(fs.readFileSync(args.backupPath).toString()),
			new Uint8Array(sodium.crypto_secretbox_NONCEBYTES),
			sodium.crypto_pwhash_scryptsalsa208sha256(
				sodium.crypto_secretbox_KEYBYTES,
				sodiumPassword,
				new Uint8Array(sodium.crypto_pwhash_scryptsalsa208sha256_SALTBYTES),
				sodium.crypto_pwhash_scryptsalsa208sha256_OPSLIMIT_SENSITIVE,
				50331648
			),
			'text'
		)
	).map(s => superSphincs.importKeys(
		{
			private: {
				superSphincs: s
			}
		},
		aesPassword
	)));
}).then(keyPairs => Promise.all(
	keyPairs.map(keyPair => superSphincs.exportKeys(keyPair))
)).then(keyData => fs.writeFileSync(
	args.outputPath,
	JSON.stringify(keyData)
)).catch(err => {
	console.error(err);
	process.exit(1);
});
