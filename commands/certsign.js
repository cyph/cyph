#!/usr/bin/env node

import {getMeta} from '../modules/base.js';
const {isCLI} = getMeta(import.meta);

import {
	generateUserCertSignInput,
	processUserCertSignOutput
} from '../modules/user-certs.js';
import {
	generateReleaseSignInput,
	processReleaseSignOutput
} from '../modules/websign-releases.js';
import {addInviteCode} from './addinvitecode.js';
import {sign} from './sign.js';

export const certSign = async (
	projectId,
	standalone,
	namespace,
	upgradeCerts
) => {
	try {
		/* Generate messages to be signed */

		const userCertSignInput = await generateUserCertSignInput({
			namespace,
			projectId,
			upgradeCerts
		});

		const releaseSignInput = await generateReleaseSignInput({
			namespace,
			projectId,
			testSign: userCertSignInput.testSign
		});

		/* Sign messages */

		const certifiedMessagesQueue = await sign(
			[...userCertSignInput.signInputs, ...releaseSignInput.signInputs],
			userCertSignInput.testSign
		);

		/* Process signed messages */

		await processUserCertSignOutput({
			...userCertSignInput,
			addInviteCode,
			certifiedMessages: certifiedMessagesQueue.splice(
				0,
				userCertSignInput.signInputs.length
			)
		});

		await processReleaseSignOutput({
			...releaseSignInput,
			certifiedMessages: certifiedMessagesQueue.splice(
				0,
				releaseSignInput.signInputs.length
			)
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
