#!/usr/bin/env node

import {getMeta} from '../modules/base.js';
const {isCLI} = getMeta(import.meta);

import {
	generateUserCertSignInput,
	processUserCertSignOutput
} from '../modules/user-certs.js';
import {addInviteCode} from './addinvitecode.js';
import {sign} from './sign.js';

export const certSign = async (
	projectId,
	standalone,
	namespace,
	upgradeCerts
) => {
	try {
		const userCertSignInput = await generateUserCertSignInput({
			namespace,
			projectId,
			upgradeCerts
		});

		const certifiedMessages = await sign(
			userCertSignInput.signInputs,
			userCertSignInput.testSign
		);

		await processUserCertSignOutput({
			...userCertSignInput,
			addInviteCode,
			certifiedMessages
		});

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

if (isCLI) {
	certSign(
		process.argv[2],
		true,
		process.argv[3],
		process.argv[4] === '--upgrade-certs'
	);
}
