#!/usr/bin/env node

import {getMeta} from '../modules/base.js';
const {isCLI} = getMeta(import.meta);

import firebase from 'firebase-admin';
import xkcdPassphrase from 'xkcd-passphrase';
import databaseService from '../modules/database-service.js';
import potassium from '../modules/potassium.js';

export const addProCode = async (
	projectId,
	name,
	password,
	namespace,
	email
) => {
	throw new Error(
		'Non-functional for now. Codes can be obtained via Braintree checkout.'
	);

	if (typeof projectId !== 'string' || projectId.indexOf('cyph') !== 0) {
		throw new Error('Invalid Firebase project ID.');
	}
	if (typeof password !== 'string' || !password) {
		password = await xkcdPassphrase.generateWithWordCount(4);
	}
	if (typeof namespace !== 'string' || !namespace) {
		namespace = 'cyph.ws';
	}

	const {database, processURL} = databaseService(projectId);

	const salt = namespace + 'Eaf60vuVWm67dNISjm6qdTGqgEhIW4Oes+BTsiuNjvs=';
	const passwordHash = potassium.toHex(
		(await potassium.passwordHash.hash(password, salt)).hash
	);

	await database
		.ref(processURL(namespace, `lockdownIDs/${passwordHash}`))
		.set({
			email,
			name,
			timestamp: firebase.database.ServerValue.TIMESTAMP,
			trial: false
		});

	return {name, password};
};

if (isCLI) {
	(async () => {
		const projectId = process.argv[2];
		const name = process.argv[3];
		const password = process.argv[4];
		const namespace = process.argv[5];
		const email = process.argv[6];

		console.log(
			JSON.stringify(
				await addProCode(projectId, name, password, namespace, email)
			)
		);
		process.exit(0);
	})().catch(err => {
		console.error(err);
		process.exit(1);
	});
}
