#!/usr/bin/env ts-node


import * as fs from 'fs';
import * as sodium from 'libsodium-wrappers';
import * as read from 'read';
import * as superSphincs from 'supersphincs';


(async () => {


const args			= {
	backupPath: process.argv[2],
	outputPath: process.argv[3]
};


const password	= await new Promise((resolve, reject) => read({
	prompt: 'Backup password: ',
	silent: false
}, (err, answer) => {
	if (err) {
		reject(err);
	}
	else {
		resolve(answer);
	}
}));

const passwordSplit		= password.split(' ');
const passwordMiddle	= passwordSplit.length / 2;

if (passwordSplit.length % 2 !== 0) {
	throw new Error('Password must contain even number of words.');
}

const aesPassword		= passwordSplit.slice(0, passwordMiddle).join(' ');
const sodiumPassword	= passwordSplit.slice(passwordMiddle).join(' ');

const keyPairs	= await Promise.all(
	JSON.parse(
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
	).map(async (superSphincsKeyString) => superSphincs.exportKeys(
		await superSphincs.importKeys(
			{
				private: {
					superSphincs: superSphincsKeyString
				}
			},
			aesPassword
		)
	))
);

fs.writeFileSync(args.outputPath, JSON.stringify(keyPairs));


})();
